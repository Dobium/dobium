import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../hooks/useAuth';
import LeagueCard from '../components/LeagueCard';
import UsernameSetup from '../components/UsernameSetup';

function normalizeUsername(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 20);
}

export default function LeaguesPage() {
  const { session, openAuthModal } = useAuth();
  const navigate = useNavigate();
  const user = session?.user;
  
  const [leagues, setLeagues] = useState([]);
  const [events, setEvents] = useState([]);
  const [globalLeaderboard, setGlobalLeaderboard] = useState([]);
  
  const [dbUser, setDbUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  
  const [showUsername, setShowUsername] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  
  // Create flow
  const [createStep, setCreateStep] = useState(0); // 0: hidden, 1: pick event, 2: name league
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [createForm, setCreateForm] = useState({ name: '' });

  const usernameReady = useMemo(() => Boolean(dbUser?.username_set), [dbUser]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [eventsData, globalScores] = await Promise.all([
        api.getEvents().catch(() => []),
        api.getGlobalLeaderboard().catch(() => [])
      ]);
      setEvents(eventsData);
      setGlobalLeaderboard(globalScores);

      if (user?.id) {
        const [leagueRows, balance] = await Promise.all([
          api.getLeagues(user.id),
          api.getBalance(user.id)
        ]);
        setLeagues(Array.isArray(leagueRows) ? leagueRows : []);
        setDbUser(balance?.user || null);
        setShowUsername(!balance?.user?.username_set);
      }
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStartCreate = () => {
    if (!usernameReady) {
      setShowUsername(true);
      return;
    }
    setCreateStep(1);
    setSelectedEvent(null);
    setCreateForm({ name: '' });
    setMessage('');
  };

  const handleSelectEvent = (event) => {
    setSelectedEvent(event);
    setCreateStep(2);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!usernameReady) {
      setShowUsername(true);
      return;
    }
    setMessage('');
    try {
      const league = await api.createLeague({
        name: createForm.name,
        admin_user_id: user.id,
        event_id: selectedEvent.id
      });
      setCreateStep(0);
      await load();
      navigate(`/leagues/${league.id}`);
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!user) return openAuthModal();
    if (!usernameReady) {
      setShowUsername(true);
      return;
    }
    setMessage('');
    try {
      const result = await api.joinLeagueByCode({
        user_id: user.id,
        invite_code: joinCode
      });
      setJoinCode('');
      await load();
      navigate(`/leagues/${result.league.id}`);
    } catch (err) {
      setMessage(err.message);
    }
  };

  if (!session) {
    return (
      <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center p-6">
        <div className="rounded-2xl border border-dobium-border bg-dobium-panel p-8 text-center">
          <h1 className="text-2xl font-bold text-dobium-text">Forecast Leagues</h1>
          <p className="text-dobium-text-secondary mt-2 mb-6">Sign in to join leagues and compete on the global leaderboard.</p>
          <button onClick={openAuthModal} className="rounded-xl bg-dobium-accent hover:bg-dobium-accent-hover px-6 py-3 font-bold text-white transition-colors">
            Sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
      <UsernameSetup
        user={user}
        initialValue={dbUser?.username}
        open={showUsername}
        onComplete={(updated) => {
          setDbUser(updated);
          setShowUsername(false);
          load();
        }}
        onClose={usernameReady ? () => setShowUsername(false) : undefined}
      />

      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-dobium-accent">Forecast Leagues</p>
          <h1 className="mt-2 text-3xl font-bold text-dobium-text">Prediction Leagues</h1>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={handleStartCreate}
            className="rounded-xl bg-dobium-accent hover:bg-dobium-accent-hover px-5 py-3 text-sm font-bold text-white transition-colors"
          >
            Create League
          </button>
        </div>
      </div>

      {message && (
        <div className="mb-5 rounded-xl border border-red-500/30 bg-red-900/20 px-4 py-3 text-sm text-red-300">
          {message}
        </div>
      )}

      {/* CREATE LEAGUE MODAL / INLINE FLOW */}
      {createStep > 0 && (
        <div className="mb-8 rounded-xl border border-dobium-accent bg-dobium-panel p-6 relative">
          <button 
            onClick={() => setCreateStep(0)} 
            className="absolute top-4 right-4 text-dobium-text-secondary hover:text-white"
          >
            ✕ Close
          </button>
          
          {createStep === 1 && (
            <div>
              <h2 className="text-xl font-bold text-dobium-text mb-2">Step 1: Choose an Event</h2>
              <p className="text-dobium-text-secondary mb-6 text-sm">Select the main event your league will be based on.</p>
              
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {events.map(event => (
                  <button
                    key={event.id}
                    onClick={() => handleSelectEvent(event)}
                    className="flex flex-col items-start p-4 bg-dobium-bg border border-dobium-border hover:border-dobium-accent rounded-xl transition-all text-left group"
                  >
                    <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">{event.icon}</div>
                    <h3 className="font-bold text-dobium-text">{event.name}</h3>
                    <p className="text-xs text-dobium-text-secondary mt-1 line-clamp-2">{event.description}</p>
                  </button>
                ))}
                {events.length === 0 && (
                  <div className="col-span-full p-8 text-center text-dobium-text-secondary border border-dashed border-dobium-border rounded-xl">
                    No upcoming events available to create leagues for.
                  </div>
                )}
              </div>
            </div>
          )}

          {createStep === 2 && selectedEvent && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <button 
                  onClick={() => setCreateStep(1)}
                  className="text-dobium-text-secondary hover:text-white flex items-center justify-center p-2 bg-dobium-bg rounded-lg"
                >
                  ← Back
                </button>
                <div>
                  <h2 className="text-xl font-bold text-dobium-text">Step 2: Name Your League</h2>
                  <p className="text-dobium-text-secondary text-sm">For the {selectedEvent.name} event</p>
                </div>
              </div>

              <form onSubmit={handleCreateSubmit} className="max-w-md">
                <label className="mb-2 block text-sm font-medium text-dobium-text-secondary">League Name</label>
                <input 
                  value={createForm.name} 
                  onChange={e => setCreateForm({ name: e.target.value })} 
                  required 
                  autoFocus
                  placeholder="e.g. Office Pool 2026"
                  className="w-full rounded-lg border border-dobium-border bg-dobium-bg px-4 py-3 text-dobium-text outline-none focus:border-dobium-accent mb-6" 
                />
                
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setCreateStep(0)} className="rounded-xl px-5 py-2 text-sm font-semibold text-dobium-text-secondary hover:text-white transition-colors">Cancel</button>
                  <button type="submit" className="rounded-xl bg-dobium-accent hover:bg-dobium-accent-hover px-6 py-2 text-sm font-bold text-white transition-colors">Create</button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* TWO COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        
        {/* LEFT COLUMN: YOUR LEAGUES & JOIN */}
        <div className="space-y-8">
          
          <form onSubmit={handleJoin} className="flex gap-3">
            <input 
              value={joinCode} 
              onChange={e => setJoinCode(e.target.value.toUpperCase())} 
              placeholder="Got an invite code?" 
              className="flex-1 rounded-xl border border-dobium-border bg-dobium-panel px-4 py-3 text-sm text-dobium-text outline-none focus:border-dobium-accent" 
            />
            <button 
              type="submit" 
              disabled={!joinCode}
              className="rounded-xl bg-dobium-accent/10 hover:bg-dobium-accent/20 border border-dobium-accent/30 px-6 py-3 text-sm font-bold text-dobium-accent transition-colors disabled:opacity-50"
            >
              Join
            </button>
          </form>

          <div>
            <div className="flex items-center justify-between mb-4 border-b border-dobium-border pb-2">
              <h2 className="text-xl font-bold text-dobium-text">Your Leagues</h2>
              <button 
                onClick={() => setShowUsername(true)}
                title={usernameReady ? "Change Username" : "Set Username"}
                className="text-sm font-medium text-dobium-text-secondary bg-dobium-panel hover:bg-dobium-bg px-3 py-1 rounded-lg border border-dobium-border hover:border-dobium-accent hover:text-white transition-colors flex items-center gap-2 group"
              >
                {usernameReady ? dbUser?.username : 'Username required'}
                <span className="text-xs opacity-40 group-hover:opacity-100 transition-opacity">✎</span>
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-2 border-dobium-accent border-t-transparent" /></div>
            ) : leagues.length === 0 ? (
              <div className="rounded-xl border border-dashed border-dobium-border bg-dobium-panel/50 p-10 text-center text-dobium-text-secondary">
                You haven't joined any leagues yet.
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2">
                {leagues.map(league => <LeagueCard key={league.id} league={league} />)}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: GLOBAL LEADERBOARD */}
        <div>
          <div className="bg-dobium-panel border border-dobium-border rounded-xl overflow-hidden sticky top-6">
            <div className="p-4 border-b border-dobium-border bg-gradient-to-r from-dobium-panel to-dobium-accent/5">
              <button onClick={() => navigate('/leagues/leaderboard')} className="w-full text-left text-lg font-bold text-dobium-text flex items-center justify-between group">
                <span className="flex items-center gap-2">
                  <span className="text-yellow-500">🏆</span> Global Top 10
                </span>
                <span className="text-sm font-sans font-medium text-dobium-text-secondary group-hover:text-dobium-accent transition-colors">
                  View All &rarr;
                </span>
              </button>
            </div>
            <div className="divide-y divide-dobium-border">
              {globalLeaderboard.length === 0 ? (
                <div className="p-6 text-center text-sm text-dobium-text-secondary">
                  No points awarded yet.
                </div>
              ) : (
                globalLeaderboard.map((score, idx) => (
                  <div key={score.user_id} className={`flex items-center justify-between p-3 ${score.user_id === user.id ? 'bg-dobium-accent/10' : 'hover:bg-dobium-bg'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                        idx === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                        idx === 1 ? 'bg-slate-400/20 text-slate-300' :
                        idx === 2 ? 'bg-amber-700/20 text-amber-600' :
                        'text-dobium-text-secondary'
                      }`}>
                        {idx + 1}
                      </div>
                      <span className={`text-sm font-medium ${score.user_id === user.id ? 'text-dobium-accent' : 'text-dobium-text'}`}>
                        {score.username}
                      </span>
                    </div>
                    <span className="text-sm font-bold font-mono text-dobium-text">
                      {parseFloat(score.total_points).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
