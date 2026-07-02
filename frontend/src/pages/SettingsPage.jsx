import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { storage } from '../store/storage';
import { useState } from 'react';
import { api } from '../api/client';

export default function SettingsPage() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const [resetLoading, setResetLoading] = useState(false);

  // Bug report state
  const [showBugModal, setShowBugModal] = useState(false);
  const [bugCategory, setBugCategory] = useState('general');
  const [bugSeverity, setBugSeverity] = useState('medium');
  const [bugTitle, setBugTitle] = useState('');
  const [bugDescription, setBugDescription] = useState('');
  const [bugSteps, setBugSteps] = useState('');
  const [bugSubmitting, setBugSubmitting] = useState(false);
  const [bugResult, setBugResult] = useState(null); // { ok, message }

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  const handleClearData = () => {
    storage.clear();
    window.location.reload();
  };

  const handleResetWallet = async () => {
    if (!session?.user?.id) return;
    if (!window.confirm("Are you sure you want to delete all manual deposits and withdrawals? This will reset your Buying Power to strictly track your $10,000 starting balance and trading P&L.")) return;

    setResetLoading(true);
    try {
      await api.resetDeposits(session.user.id);
      window.location.reload();
    } catch (err) {
      alert(err.message || 'Failed to reset wallet');
    } finally {
      setResetLoading(false);
    }
  };

  const email = session?.user?.email || 'Not logged in';
  const createdAt = session?.user?.created_at ? new Date(session.user.created_at).toLocaleDateString() : '—';

  const rawApiUrl = import.meta.env.VITE_API_URL || '';
  const API_URL = rawApiUrl.endsWith('/') ? rawApiUrl.slice(0, -1) : rawApiUrl;

  const handleBugSubmit = async (e) => {
    e.preventDefault();
    if (!bugTitle.trim() || !bugDescription.trim()) return;
    setBugSubmitting(true);
    setBugResult(null);
    try {
      const res = await fetch(`${API_URL}/api/bug-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session?.user?.id || null,
          userEmail: session?.user?.email || null,
          category: bugCategory,
          severity: bugSeverity,
          title: bugTitle,
          description: bugDescription,
          stepsToReproduce: bugSteps || null
        })
      });
      const data = await res.json();
      if (res.ok) {
        setBugResult({ ok: true, message: 'Report submitted! The team has been notified.' });
        setBugTitle('');
        setBugDescription('');
        setBugSteps('');
        setBugCategory('general');
        setBugSeverity('medium');
        setTimeout(() => { setShowBugModal(false); setBugResult(null); }, 3000);
      } else {
        setBugResult({ ok: false, message: data.error || 'Submission failed.' });
      }
    } catch (err) {
      setBugResult({ ok: false, message: 'Could not reach server. Please try again.' });
    } finally {
      setBugSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-white mb-2">Settings</h1>
        <p className="text-slate-400">Manage your account and preferences</p>
      </div>

      <div className="max-w-2xl">
        {/* Paper Trading Disclaimer Section */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-5 mb-4">
          <h2 className="text-sm font-serif font-bold uppercase tracking-wider text-yellow-400 mb-4">⚠️ Paper Trading Mode</h2>
          <div className="space-y-2 text-sm text-slate-300">
            <p className="font-semibold text-white">Dobium is currently in paper trading mode.</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>All trades use virtual funds only</li>
              <li>No real money or assets are involved</li>
              <li>This is for learning and testing purposes</li>
              <li>Market data may not be real-time</li>
            </ul>
            <p className="text-xs text-slate-400 mt-3">
              When live trading becomes available, you will be notified and real capital will be required.
            </p>
          </div>
        </div>

        {/* Account Section */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 mb-4">
          <h2 className="text-sm font-serif font-bold uppercase tracking-wider text-yellow-400 mb-4">Account</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-3 border-b border-slate-800">
              <div>
                <div className="text-sm font-semibold text-white">Email</div>
                <div className="text-xs text-slate-500 mt-0.5">{email}</div>
              </div>
            </div>
            <div className="flex justify-between items-center py-3">
              <div>
                <div className="text-sm font-semibold text-white">Member Since</div>
                <div className="text-xs text-slate-500 mt-0.5">{createdAt}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Preferences Section */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 mb-4">
          <h2 className="text-sm font-serif font-bold uppercase tracking-wider text-yellow-400 mb-4">Preferences</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-3 border-b border-slate-800">
              <div>
                <div className="text-sm font-semibold text-white">Theme</div>
                <div className="text-xs text-slate-500 mt-0.5">Dark (default)</div>
              </div>
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-400">Dark</span>
            </div>
            <div className="flex justify-between items-center py-3">
              <div>
                <div className="text-sm font-semibold text-white">Currency</div>
                <div className="text-xs text-slate-500 mt-0.5">US Dollar</div>
              </div>
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-700/30 text-slate-400">USD</span>
            </div>
          </div>
        </div>

        {/* Data Section */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 mb-4">
          <h2 className="text-sm font-serif font-bold uppercase tracking-wider text-yellow-400 mb-4">Data Management</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-3 border-b border-slate-800">
              <div>
                <div className="text-sm font-semibold text-white">Clear Local Data</div>
                <div className="text-xs text-slate-500 mt-0.5">Removes favorites and cache</div>
              </div>
              <button
                onClick={handleClearData}
                className="px-4 py-2 text-sm font-semibold bg-slate-800 border border-slate-700 hover:border-slate-600 text-white rounded-lg transition-all"
              >
                Clear
              </button>
            </div>
            <div className="flex justify-between items-center py-3">
              <div>
                <div className="text-sm font-semibold text-white">Reset Wallet Deposits</div>
                <div className="text-xs text-slate-500 mt-0.5">Clears manual funding to sync with chart</div>
              </div>
              <button
                onClick={handleResetWallet}
                disabled={resetLoading}
                className="px-4 py-2 text-sm font-semibold bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 rounded-lg transition-all disabled:opacity-50"
              >
                {resetLoading ? 'Resetting...' : 'Reset'}
              </button>
            </div>
          </div>
        </div>

        {/* Support / Bug Report Section */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 mb-4">
          <h2 className="text-sm font-serif font-bold uppercase tracking-wider text-yellow-400 mb-4">Support</h2>
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm font-semibold text-white">🐛 Report a Problem</div>
              <div className="text-xs text-slate-500 mt-0.5">Encountered a bug? Let the team know.</div>
            </div>
            <button
              id="open-bug-report-btn"
              onClick={() => setShowBugModal(true)}
              className="px-4 py-2 text-sm font-semibold bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 rounded-lg transition-all"
            >
              Report Bug
            </button>
          </div>
        </div>

        {/* Session Section */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-serif font-bold uppercase tracking-wider text-yellow-400 mb-4">Session</h2>
          {session ? (
            <button
              onClick={handleLogout}
              className="w-full px-4 py-3 bg-red-500/20 border border-red-500/30 text-red-400 font-semibold rounded-lg hover:bg-red-500/30 transition-all"
            >
              Log out
            </button>
          ) : (
            <button
              onClick={() => navigate('/auth')}
              className="w-full px-4 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-slate-950 font-semibold rounded-lg hover:brightness-110 transition"
            >
              Sign in
            </button>
          )}
        </div>
      </div>

      {/* ── Bug Report Modal ───────────────────────────────────────────── */}
      {showBugModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowBugModal(false); }}
        >
          <div className="bg-slate-900 border border-red-500/25 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Modal header */}
            <div style={{ height: 3, background: 'linear-gradient(90deg,#7f1d1d,#ef4444,#fca5a5,#ef4444,#7f1d1d)' }} />
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-lg">🐛</div>
                <div>
                  <h3 className="text-white font-bold text-base">Report a Problem</h3>
                  <p className="text-slate-500 text-xs">We'll investigate and follow up via email</p>
                </div>
              </div>
              <button
                onClick={() => setShowBugModal(false)}
                className="text-slate-500 hover:text-white transition-colors text-xl leading-none"
              >&times;</button>
            </div>

            {/* Modal form */}
            <form onSubmit={handleBugSubmit} className="p-6 space-y-4">
              {/* Row: Category + Severity */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Category</label>
                  <select
                    id="bug-category"
                    value={bugCategory}
                    onChange={e => setBugCategory(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-red-400 transition-colors"
                  >
                    <option value="general">General</option>
                    <option value="trading">Trading / Orders</option>
                    <option value="ui">UI / Display</option>
                    <option value="wallet">Wallet / Balance</option>
                    <option value="markets">Markets</option>
                    <option value="auth">Login / Auth</option>
                    <option value="performance">Performance</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Severity</label>
                  <select
                    id="bug-severity"
                    value={bugSeverity}
                    onChange={e => setBugSeverity(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-red-400 transition-colors"
                  >
                    <option value="low">🟡 Low — Minor inconvenience</option>
                    <option value="medium">🟠 Medium — Affects usability</option>
                    <option value="high">🔴 High — Major functionality broken</option>
                    <option value="critical">🚨 Critical — Data loss / security</option>
                  </select>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Title <span className="text-red-400">*</span></label>
                <input
                  id="bug-title"
                  type="text"
                  required
                  value={bugTitle}
                  onChange={e => setBugTitle(e.target.value)}
                  placeholder="e.g. Balance shows wrong after selling position"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-600 outline-none focus:border-red-400 transition-colors"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Description <span className="text-red-400">*</span></label>
                <textarea
                  id="bug-description"
                  required
                  value={bugDescription}
                  onChange={e => setBugDescription(e.target.value)}
                  placeholder="Describe what you expected to happen vs what actually happened..."
                  rows={3}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-600 outline-none focus:border-red-400 resize-none transition-colors"
                />
              </div>

              {/* Steps to reproduce */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
                  Steps to Reproduce <span className="text-slate-600 normal-case font-normal">(optional)</span>
                </label>
                <textarea
                  id="bug-steps"
                  value={bugSteps}
                  onChange={e => setBugSteps(e.target.value)}
                  placeholder="1. Go to Explore&#10;2. Click on a market&#10;3. Try to place a trade..."
                  rows={3}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-600 outline-none focus:border-red-400 resize-none transition-colors"
                />
              </div>

              {/* Result message */}
              {bugResult && (
                <div className={`px-4 py-3 rounded-lg text-sm font-medium ${
                  bugResult.ok
                    ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                    : 'bg-red-500/10 border border-red-500/30 text-red-400'
                }`}>
                  {bugResult.ok ? '✅ ' : '❌ '}{bugResult.message}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowBugModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  id="submit-bug-report-btn"
                  type="submit"
                  disabled={bugSubmitting}
                  className="flex-1 py-2.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 font-bold rounded-xl text-sm transition-colors disabled:opacity-50"
                >
                  {bugSubmitting ? 'Submitting…' : '🐛 Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
