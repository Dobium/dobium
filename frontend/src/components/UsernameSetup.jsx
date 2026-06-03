import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 20);
}

export default function UsernameSetup({ user, initialValue = '', open = true, onComplete, onClose }) {
  const [value, setValue] = useState(initialValue);
  
  // Update value if initialValue changes while modal is closed
  useEffect(() => {
    if (!open && initialValue) {
      setValue(initialValue);
    }
  }, [open, initialValue]);
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const valid = useMemo(() => /^[a-z0-9_]{3,20}$/.test(value), [value]);

  useEffect(() => {
    if (!open || !valid) {
      setAvailable(null);
      return undefined;
    }

    if (value === initialValue) {
      setAvailable(true);
      setMessage('Current username');
      return undefined;
    }

    setChecking(true);
    const timer = setTimeout(() => {
      api.checkUsername(value)
        .then(data => {
          setAvailable(Boolean(data.available));
          setMessage(data.available ? 'Available' : 'Taken');
        })
        .catch(err => {
          setAvailable(false);
          setMessage(err.message);
        })
        .finally(() => setChecking(false));
    }, 350);

    return () => clearTimeout(timer);
  }, [open, valid, value, initialValue]);

  if (!open) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!user?.id || !valid || available === false) return;
    setSaving(true);
    setMessage('');
    try {
      const result = await api.setUsername(user.id, { username: value, email: user.email });
      onComplete?.(result.user);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-950 p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-serif font-bold text-white">Choose Username</h2>
            <p className="mt-1 text-sm text-slate-400">3-20 lowercase characters.</p>
          </div>
          {onClose && (
            <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-800 hover:text-white">
              x
            </button>
          )}
        </div>

        <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Username</label>
        <div className="relative">
          <input
            value={value}
            onChange={event => setValue(normalize(event.target.value))}
            placeholder="market_maker"
            className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 pr-28 text-white outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20"
            autoFocus
          />
          <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold ${available ? 'text-green-400' : available === false ? 'text-red-400' : 'text-slate-500'}`}>
            {checking ? 'Checking' : valid ? message : '3-20 chars'}
          </span>
        </div>

        {message && available === false && (
          <p className="mt-2 text-sm text-red-400">{message}</p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          {onClose && (
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800">
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={!valid || available === false || saving}
            className="rounded-xl bg-gradient-to-r from-yellow-500 to-yellow-600 px-5 py-2 text-sm font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
