import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function AdminDashboard() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  // Email form state
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailText, setEmailText] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Risk Management & System state
  const [negativeUsers, setNegativeUsers] = useState(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [fixLoading, setFixLoading] = useState(false);
  const [riskMessage, setRiskMessage] = useState('');
  const [health, setHealth] = useState(null);

  // Market Creation state
  const [marketTitle, setMarketTitle] = useState('');
  const [marketDescription, setMarketDescription] = useState('');
  const [marketCategory, setMarketCategory] = useState('technology');
  const [marketType, setMarketType] = useState('binary');
  const [marketCloseDate, setMarketCloseDate] = useState('');
  const [marketOutcomes, setMarketOutcomes] = useState([{ title: 'Yes', probability: 50 }, { title: 'No', probability: 50 }]);
  const [createMarketLoading, setCreateMarketLoading] = useState(false);
  const [createMarketMessage, setCreateMarketMessage] = useState('');

  // Market Resolution state
  const [activeMarkets, setActiveMarkets] = useState([]);
  const [resolvingMarket, setResolvingMarket] = useState(null);
  const [resolveSelections, setResolveSelections] = useState({});
  const [resolveLoading, setResolveLoading] = useState(false);
  const [resolveMessage, setResolveMessage] = useState('');

  // Market Edit state
  const [editingMarket, setEditingMarket] = useState(null);
  const [editMarketLoading, setEditMarketLoading] = useState(false);
  const [editMarketMessage, setEditMarketMessage] = useState('');

  // Users list state
  const [users, setUsers] = useState([]);

  const adminAccount = 'donotreply.dobium@gmail.com';

  useEffect(() => {
    // Verifies admin email against active session
    const userEmail = session?.user?.email;
    if (userEmail === adminAccount) {
      setIsAdmin(true);

      // Fetch system health
      fetch('/api/health')
        .then(res => res.json())
        .then(data => setHealth(data))
        .catch(() => setHealth({ ok: false, error: 'Cannot connect to API' }));

      // Fetch markets for resolution list
      fetch('/api/markets')
        .then(res => res.json())
        .then(data => setActiveMarkets(data.filter(m => m.status === 'active')))
        .catch(console.error);

      // Fetch users list
      fetch(`/api/admin/users?adminEmail=${encodeURIComponent(adminAccount)}`)
        .then(res => res.json())
        .then(data => setUsers(Array.isArray(data) ? data : []))
        .catch(console.error);

    } else if (session) {
      navigate('/'); // Redirect non-admins instantly
    }
  }, [session, navigate]);

  const handleSendEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/admin/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: emailTo,
          subject: emailSubject,
          text: emailText,
          adminEmail: session?.user?.email
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setMessage('Email sent successfully!');
        setEmailTo('');
        setEmailSubject('');
        setEmailText('');
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      setMessage('Failed to send email. Ensure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleScanBalances = async () => {
    setScanLoading(true);
    setRiskMessage('');
    try {
      const res = await fetch('/api/users/negative-buying-power');
      const data = await res.json();
      if (res.ok) {
        setNegativeUsers(data.users || []);
        if (data.count === 0) {
          setRiskMessage('All user balances are healthy (>= $0.00).');
        } else {
          setRiskMessage(`Found ${data.count} user(s) with negative buying power.`);
        }
      } else {
        setRiskMessage(`Error: ${data.error}`);
      }
    } catch (err) {
      setRiskMessage('Failed to connect to server.');
    } finally {
      setScanLoading(false);
    }
  };

  const handleFixBalances = async () => {
    if (!window.confirm('Are you sure you want to auto-cancel trades for these users to restore their balances?')) return;
    setFixLoading(true);
    setRiskMessage('');
    try {
      const res = await fetch('/api/users/fix-negative-buying-power', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setRiskMessage(`Successfully repaired ${data.repaired_users} user(s). Cancelled ${data.removed_predictions} predictions.`);
        setNegativeUsers([]);
      } else {
        setRiskMessage(`Error: ${data.error}`);
      }
    } catch (err) {
      setRiskMessage('Failed to connect to server.');
    } finally {
      setFixLoading(false);
    }
  };

  const handleMarketTypeChange = (e) => {
    const type = e.target.value;
    setMarketType(type);
    if (type === 'binary') {
      setMarketOutcomes([{ title: 'Yes', probability: 50 }, { title: 'No', probability: 50 }]);
    } else {
      setMarketOutcomes([
        { title: '', probability: 25 },
        { title: '', probability: 25 },
        { title: '', probability: 25 },
        { title: '', probability: 25 }
      ]);
    }
  };

  const handleOutcomeChange = (index, field, value) => {
    const newOutcomes = [...marketOutcomes];
    newOutcomes[index][field] = value;
    setMarketOutcomes(newOutcomes);
  };

  const addOutcome = () => {
    setMarketOutcomes([...marketOutcomes, { title: '', probability: 0 }]);
  };

  const removeOutcome = (index) => {
    setMarketOutcomes(marketOutcomes.filter((_, i) => i !== index));
  };

  const handleCreateMarket = async (e) => {
    e.preventDefault();
    setCreateMarketLoading(true);
    setCreateMarketMessage('');

    try {
      const formattedOutcomes = marketOutcomes.map(o => ({
        title: o.title,
        probability: parseFloat(o.probability) || 0
      }));

      const res = await fetch('/api/markets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: marketTitle,
          description: marketDescription,
          category: marketCategory,
          market_type: marketType,
          close_date: marketCloseDate ? new Date(marketCloseDate).toISOString() : null,
          resolution_date: marketCloseDate ? new Date(marketCloseDate).toISOString() : null,
          outcomes: formattedOutcomes
        })
      });

      const data = await res.json();
      if (res.ok) {
        setCreateMarketMessage(`Successfully created market: ${data.title}`);
        setMarketTitle('');
        setMarketDescription('');
        setMarketCloseDate('');
      } else {
        setCreateMarketMessage(`Error: ${data.error}`);
      }
    } catch (err) {
      setCreateMarketMessage('Failed to connect to server.');
    } finally {
      setCreateMarketLoading(false);
    }
  };

  const handleResolveMarket = async (e) => {
    e.preventDefault();
    setResolveLoading(true);
    setResolveMessage('');

    try {
      let winning_outcome_ids = [];

      if (resolvingMarket.market_type === 'multi_multiple') {
        winning_outcome_ids = Object.values(resolveSelections);
        if (winning_outcome_ids.length !== resolvingMarket.outcomes.length / 2) {
          setResolveMessage('Error: Please select Yes or No for all options.');
          setResolveLoading(false);
          return;
        }
      } else {
        if (!resolveSelections.winner) {
          setResolveMessage('Error: Please select a winning outcome.');
          setResolveLoading(false);
          return;
        }
        winning_outcome_ids = [resolveSelections.winner];
      }

      const res = await fetch(`/api/markets/${resolvingMarket.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ winning_outcome_ids })
      });

      const data = await res.json();
      if (res.ok) {
        setResolveMessage('Market resolved successfully!');
        setTimeout(() => {
          setResolvingMarket(null);
          setActiveMarkets(prev => prev.filter(m => m.id !== resolvingMarket.id));
        }, 1500);
      } else {
        setResolveMessage(`Error: ${data.error}`);
      }
    } catch (err) {
      setResolveMessage('Failed to connect to server.');
    } finally {
      setResolveLoading(false);
    }
  };

  const handleEditMarketChange = (field, value) => {
    setEditingMarket(prev => ({ ...prev, [field]: value }));
  };

  const handleEditOutcomeChange = (index, field, value) => {
    const newOutcomes = [...editingMarket.outcomes];
    newOutcomes[index] = { ...newOutcomes[index], [field]: value };
    setEditingMarket(prev => ({ ...prev, outcomes: newOutcomes }));
  };

  const handleUpdateMarket = async (e) => {
    e.preventDefault();
    setEditMarketLoading(true);
    setEditMarketMessage('');
    try {
      const res = await fetch(`/api/markets/${editingMarket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editingMarket.title,
          description: editingMarket.description,
          close_date: editingMarket.close_date ? new Date(editingMarket.close_date).toISOString() : null,
          resolution_date: editingMarket.close_date ? new Date(editingMarket.close_date).toISOString() : null,
          outcomes: editingMarket.outcomes.map(o => ({
            id: o.id,
            title: o.title,
            probability: parseFloat(o.probability)
          }))
        })
      });
      const data = await res.json();
      if (res.ok) {
        setEditMarketMessage('Market updated successfully!');
        setActiveMarkets(prev => prev.map(m => m.id === data.id ? data : m));
        setTimeout(() => {
          setEditingMarket(null);
          setEditMarketMessage('');
        }, 1500);
      } else {
        setEditMarketMessage(`Error: ${data.error}`);
      }
    } catch (err) {
      setEditMarketMessage('Failed to connect to server.');
    } finally {
      setEditMarketLoading(false);
    }
  };

  if (!isAdmin) {
    return <div className="p-8 text-center text-slate-400">Checking permissions...</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left Column: System & Risk */}
        <div className="space-y-6">
          <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-white">System Overview</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-slate-700">
                <span className="text-slate-400">API Status</span>
                {health?.ok ? <span className="text-green-400 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>Online</span> : <span className="text-red-400">Offline</span>}
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-700">
                <span className="text-slate-400">Database</span>
                <span className="text-slate-300 capitalize">{health?.database || 'Unknown'}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-400">Service</span>
                <span className="text-slate-300 font-mono text-sm">{health?.service || '—'}</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-2 text-white">Risk Management</h2>
            <p className="text-sm text-slate-400 mb-4">
              Scan the database for users whose active stakes exceed their available balance, causing negative buying power.
            </p>

            <div className="flex flex-wrap gap-3 mb-4">
              <button
                onClick={handleScanBalances}
                disabled={scanLoading || fixLoading}
                className="bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-4 rounded text-sm transition-colors disabled:opacity-50"
              >
                {scanLoading ? 'Scanning...' : 'Scan Balances'}
              </button>

              {negativeUsers && negativeUsers.length > 0 && (
                <button
                  onClick={handleFixBalances}
                  disabled={fixLoading || scanLoading}
                  className="bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30 font-semibold py-2 px-4 rounded text-sm transition-colors disabled:opacity-50"
                >
                  {fixLoading ? 'Repairing...' : `Fix ${negativeUsers.length} Users`}
                </button>
              )}
            </div>

            {riskMessage && (
              <div className={`p-3 rounded text-sm ${riskMessage.startsWith('Error') || riskMessage.startsWith('Failed') ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'bg-slate-900/50 text-slate-300 border border-slate-700'}`}>
                {riskMessage}
              </div>
            )}

            {negativeUsers && negativeUsers.length > 0 && (
              <div className="mt-4 max-h-64 overflow-y-auto custom-scrollbar border border-slate-700 rounded bg-slate-900/50">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-800/80 text-slate-400 sticky top-0">
                    <tr>
                      <th className="p-2 font-medium border-b border-slate-700">User</th>
                      <th className="p-2 font-medium border-b border-slate-700">Deficit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {negativeUsers.map(u => (
                      <tr key={u.user_id}>
                        <td className="p-2 text-slate-300 truncate max-w-[150px]" title={u.user_id}>{u.username || u.user_id.substring(0, 8)}</td>
                        <td className="p-2 text-red-400">-${Math.abs(u.raw_balance).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Communication */}
        <div className="space-y-6">
          <div className="bg-slate-800 p-6 rounded-lg shadow-lg h-full flex flex-col">
            <h2 className="text-xl font-semibold mb-4 text-white">Send System Email</h2>
            <form onSubmit={handleSendEmail} className="flex flex-col gap-4 flex-1">
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-400">To</label>
                <input
                  type="email"
                  className="w-full bg-slate-900/50 border border-slate-700 rounded p-2 text-white outline-none focus:border-amber-400 transition-colors"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-400">Subject</label>
                <input
                  type="text"
                  className="w-full bg-slate-900/50 border border-slate-700 rounded p-2 text-white outline-none focus:border-amber-400 transition-colors"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  required
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1 text-slate-400">Message</label>
                <textarea
                  className="w-full bg-slate-900/50 border border-slate-700 rounded p-2 text-white h-48 outline-none focus:border-amber-400 resize-none transition-colors"
                  value={emailText}
                  onChange={(e) => setEmailText(e.target.value)}
                  required
                ></textarea>
              </div>
              {message && <p className={message.startsWith('Error') || message.startsWith('Failed') ? "text-red-400 text-sm" : "text-green-400 text-sm"}>{message}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-auto bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-2.5 px-4 rounded transition-colors disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send System Email'}
              </button>
            </form>
          </div>

          <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-white">Registered Users ({users.length})</h2>
            <div className="max-h-96 overflow-y-auto custom-scrollbar border border-slate-700 rounded bg-slate-900/50">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-800/80 text-slate-400 sticky top-0">
                  <tr>
                    <th className="p-3 font-medium border-b border-slate-700">Username</th>
                    <th className="p-3 font-medium border-b border-slate-700">Email</th>
                    <th className="p-3 font-medium border-b border-slate-700 text-right hidden sm:table-cell">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 text-slate-300 truncate max-w-[120px]" title={u.username}>{u.username}</td>
                      <td className="p-3 text-slate-400 truncate max-w-[150px]" title={u.email}>{u.email || 'N/A'}</td>
                      <td className="p-3 text-slate-500 text-right whitespace-nowrap hidden sm:table-cell">{new Date(u.created_at || u.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      {/* Market Creation Section */}
      <div className="mt-6 bg-slate-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-white">Create New Market</h2>
        <form onSubmit={handleCreateMarket} className="flex flex-col md:flex-row gap-6">
          <div className="flex-1 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-400">Title</label>
              <input
                type="text"
                className="w-full bg-slate-900/50 border border-slate-700 rounded p-2 text-white outline-none focus:border-amber-400 transition-colors"
                value={marketTitle}
                onChange={(e) => setMarketTitle(e.target.value)}
                placeholder="e.g. Will SpaceX reach Mars by 2027?"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-400">Description</label>
              <textarea
                className="w-full bg-slate-900/50 border border-slate-700 rounded p-2 text-white h-24 outline-none focus:border-amber-400 resize-none transition-colors"
                value={marketDescription}
                onChange={(e) => setMarketDescription(e.target.value)}
                placeholder="Provide specific resolution criteria and context..."
                required
              ></textarea>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1 text-slate-400">Category</label>
                <select
                  className="w-full bg-slate-900/50 border border-slate-700 rounded p-2 text-white outline-none focus:border-amber-400 transition-colors"
                  value={marketCategory}
                  onChange={(e) => setMarketCategory(e.target.value)}
                >
                  <option value="technology">Technology</option>
                  <option value="politics">Politics</option>
                  <option value="sports">Sports</option>
                  <option value="entertainment">Entertainment</option>
                  <option value="finance">Finance</option>
                  <option value="crypto">Crypto</option>
                  <option value="science">Science</option>
                  <option value="health">Health</option>
                  <option value="environment">Environment</option>
                  <option value="international">International</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1 text-slate-400">Type</label>
                <select
                  className="w-full bg-slate-900/50 border border-slate-700 rounded p-2 text-white outline-none focus:border-amber-400 transition-colors"
                  value={marketType}
                  onChange={handleMarketTypeChange}
                >
                  <option value="binary">Binary (Yes/No)</option>
                  <option value="multi_multiple">Multi (Multiple Choice)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-400">Close / Resolution Date</label>
              <input
                type="datetime-local"
                className="w-full bg-slate-900/50 border border-slate-700 rounded p-2 text-white outline-none focus:border-amber-400 transition-colors [&::-webkit-calendar-picker-indicator]:invert"
                value={marketCloseDate}
                onChange={(e) => setMarketCloseDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex-1 space-y-4 flex flex-col">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-slate-400">Outcomes</label>
              {marketType !== 'binary' && (
                <button
                  type="button"
                  onClick={addOutcome}
                  className="text-xs text-amber-400 hover:text-amber-300 font-semibold transition-colors"
                >
                  + Add Outcome
                </button>
              )}
            </div>
            <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-2 flex-1">
              {marketOutcomes.map((outcome, index) => (
                <div key={index} className="flex gap-2 items-center bg-slate-900/30 p-2 rounded border border-slate-700/50">
                  <input
                    type="text"
                    className="flex-1 bg-slate-900/50 border border-slate-700 rounded p-2 text-white outline-none focus:border-amber-400 transition-colors text-sm"
                    placeholder="Outcome Title"
                    value={outcome.title}
                    onChange={(e) => handleOutcomeChange(index, 'title', e.target.value)}
                    required
                    disabled={marketType === 'binary'}
                  />
                  <div className="relative w-24">
                    <input
                      type="number"
                      className="w-full bg-slate-900/50 border border-slate-700 rounded p-2 pr-6 text-white outline-none focus:border-amber-400 transition-colors text-sm"
                      placeholder="Prob"
                      min="0"
                      max="100"
                      step="0.1"
                      value={outcome.probability}
                      onChange={(e) => handleOutcomeChange(index, 'probability', e.target.value)}
                      required
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-sm">%</span>
                  </div>
                  {marketType !== 'binary' && marketOutcomes.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOutcome(index)}
                      className="text-red-400 hover:text-red-300 p-1 w-6 h-6 flex items-center justify-center rounded transition-colors"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            {createMarketMessage && (
              <p className={`text-sm py-1 ${createMarketMessage.startsWith('Error') || createMarketMessage.startsWith('Failed') ? 'text-red-400' : 'text-green-400'}`}>
                {createMarketMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={createMarketLoading}
              className="w-full mt-auto bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-2.5 px-4 rounded transition-colors disabled:opacity-50"
            >
              {createMarketLoading ? 'Creating...' : 'Publish Market'}
            </button>
          </div>
        </form>
      </div>

      {/* Market Resolution Section */}
      <div className="mt-6 bg-slate-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold mb-4 text-white">Manage Active Markets</h2>
        {!resolvingMarket && !editingMarket ? (
          <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
            {activeMarkets.length === 0 ? (
              <p className="text-slate-400 text-sm">No active markets available to resolve.</p>
            ) : (
              activeMarkets.map(m => (
                <div key={m.id} className="flex justify-between items-center bg-slate-900/50 p-4 rounded border border-slate-700">
                  <div>
                    <h3 className="text-white font-medium">{m.title}</h3>
                    <p className="text-slate-500 text-xs">ID: {m.id} · Type: {m.market_type || 'binary'}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingMarket({
                          ...m,
                          close_date: m.close_date ? new Date(m.close_date).toISOString().slice(0, 16) : ''
                        });
                      }}
                      className="bg-blue-500/20 text-blue-400 border border-blue-500/50 hover:bg-blue-500/30 px-4 py-2 rounded font-semibold text-sm transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setResolvingMarket(m);
                        setResolveSelections({});
                        setResolveMessage('');
                      }}
                      className="bg-amber-500/20 text-amber-400 border border-amber-500/50 hover:bg-amber-500/30 px-4 py-2 rounded font-semibold text-sm transition-colors"
                    >
                      Resolve
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : editingMarket ? (
          <div className="bg-slate-900/50 p-6 rounded border border-slate-700">
            <button
              onClick={() => { setEditingMarket(null); setEditMarketMessage(''); }}
              className="text-slate-400 hover:text-white text-sm mb-4 flex items-center gap-1"
            >
              ← Back to markets
            </button>
            <h3 className="text-lg font-semibold text-white mb-4">Edit Market: {editingMarket.id}</h3>

            <form onSubmit={handleUpdateMarket} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-400">Title</label>
                <input type="text" value={editingMarket.title} onChange={e => handleEditMarketChange('title', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white outline-none focus:border-blue-400 transition-colors" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-400">Description</label>
                <textarea value={editingMarket.description || ''} onChange={e => handleEditMarketChange('description', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white h-24 outline-none focus:border-blue-400 resize-none transition-colors" required></textarea>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-400">Close / Resolution Date</label>
                <input type="datetime-local" value={editingMarket.close_date || ''} onChange={e => handleEditMarketChange('close_date', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white outline-none focus:border-blue-400 transition-colors [&::-webkit-calendar-picker-indicator]:invert" />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium mb-2 text-slate-400">Outcomes</label>
                <div className="space-y-2">
                  {editingMarket.outcomes.map((o, idx) => (
                    <div key={o.id} className="flex gap-2 items-center bg-slate-900/30 p-2 rounded border border-slate-700/50">
                      <input type="text" value={o.title} onChange={e => handleEditOutcomeChange(idx, 'title', e.target.value)} className="flex-1 bg-slate-800/50 border border-slate-700 rounded p-2 text-white text-sm outline-none focus:border-blue-400 transition-colors" required />
                      <div className="relative w-24">
                        <input type="number" step="0.1" value={o.probability} onChange={e => handleEditOutcomeChange(idx, 'probability', e.target.value)} className="w-full bg-slate-800/50 border border-slate-700 rounded p-2 pr-6 text-white text-sm outline-none focus:border-blue-400 transition-colors" required />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-sm">%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {editMarketMessage && <p className={`text-sm py-1 ${editMarketMessage.startsWith('Error') || editMarketMessage.startsWith('Failed') ? 'text-red-400' : 'text-green-400'}`}>{editMarketMessage}</p>}

              <button type="submit" disabled={editMarketLoading} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2.5 px-4 rounded transition-colors disabled:opacity-50 mt-4">
                {editMarketLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-slate-900/50 p-6 rounded border border-slate-700">
            <button
              onClick={() => setResolvingMarket(null)}
              className="text-slate-400 hover:text-white text-sm mb-4 flex items-center gap-1"
            >
              ← Back to markets
            </button>
            <h3 className="text-lg font-semibold text-white mb-2">{resolvingMarket.title}</h3>
            <p className="text-slate-400 text-sm mb-6">Select the winning outcome(s) to finalize this market.</p>

            <form onSubmit={handleResolveMarket} className="space-y-6">
              {resolvingMarket.market_type === 'multi_multiple' ? (
                // Grouped Binary Resolution
                Array.from({ length: Math.ceil(resolvingMarket.outcomes.length / 2) }).map((_, i) => {
                  const yes = resolvingMarket.outcomes[i * 2];
                  const no = resolvingMarket.outcomes[i * 2 + 1];
                  if (!yes || !no) return null;
                  const baseTitle = yes.title.replace(/\s*\(Yes\)$/i, '');
                  return (
                    <div key={yes.id} className="bg-slate-800/50 p-4 rounded border border-slate-700">
                      <p className="text-white font-medium mb-3">{baseTitle}</p>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name={`pair_${i}`} value={yes.id} checked={resolveSelections[i] === yes.id} onChange={() => setResolveSelections(prev => ({ ...prev, [i]: yes.id }))} className="text-amber-500 focus:ring-amber-500" />
                          <span className="text-green-400">Yes Occurred</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" name={`pair_${i}`} value={no.id} checked={resolveSelections[i] === no.id} onChange={() => setResolveSelections(prev => ({ ...prev, [i]: no.id }))} className="text-amber-500 focus:ring-amber-500" />
                          <span className="text-red-400">No / Did Not Occur</span>
                        </label>
                      </div>
                    </div>
                  );
                })
              ) : (
                // Standard single-winner resolution
                <div className="space-y-2">
                  {resolvingMarket.outcomes.map(o => (
                    <label key={o.id} className="flex items-center gap-3 bg-slate-800/50 p-3 rounded border border-slate-700 cursor-pointer hover:bg-slate-800 transition-colors">
                      <input type="radio" name="winner" value={o.id} checked={resolveSelections.winner === o.id} onChange={() => setResolveSelections({ winner: o.id })} className="text-amber-500 focus:ring-amber-500 w-4 h-4" />
                      <span className="text-white">{o.title}</span>
                    </label>
                  ))}
                </div>
              )}

              {resolveMessage && <p className={`text-sm py-1 ${resolveMessage.startsWith('Error') || resolveMessage.startsWith('Failed') ? 'text-red-400' : 'text-green-400'}`}>{resolveMessage}</p>}

              <button type="submit" disabled={resolveLoading} className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-2.5 px-4 rounded transition-colors disabled:opacity-50">
                {resolveLoading ? 'Processing...' : 'Resolve Market'}
              </button>
            </form>
          </div>
        )}
      </div>

    </div>
  );
}