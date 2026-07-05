import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';

const slides = [
  {
    title: 'Welcome',
    description: 'Trade probabilities, not just prices. Take positions on real-world outcomes using dynamically scaled risk and reward.',
    highlight: 'Probability-based trading',
    icon: '📈',
  },
  {
    title: 'How It Works',
    description: 'Every market has a live probability score. Lower probability positions carry higher exposure, while higher probability positions carry lower exposure.',
    highlight: 'Risk scales with probability',
    icon: '⚙️',
  },
  {
    title: 'Multi-Outcome Markets',
    description: 'Go beyond binary events. Trade on multi-option outcomes, independent events, and build positions across multiple outcomes simultaneously.',
    highlight: 'Flexible market structures',
    icon: '🎯',
  },
  {
    title: 'Structured Risk',
    description: 'Exposure scales with probability instead of all-or-nothing payouts. This creates smoother risk management and more flexible trading behavior.',
    highlight: 'Proportional payouts',
    icon: '💼',
  },
  {
    title: 'Dynamic Pricing',
    description: 'Probabilities update as users trade. Market activity continuously shapes pricing and exposure across outcomes in real time.',
    highlight: 'Live market movements',
    icon: '📊',
  },
  {
    title: 'Portfolio Management',
    description: 'Track positions, manage exposure, and diversify across markets. Designed for probability traders who want strategic position management.',
    highlight: 'Advanced trading tools',
    icon: '💰',
  },
  {
    title: 'Paper Trading Mode',
    description: 'Currently in paper trading mode. Test strategies, explore markets, and learn the platform without risking real money.',
    highlight: 'Risk-free learning',
    icon: '🎓',
  }
];

export default function AuthModal() {
  const { session, isAuthModalOpen, closeAuthModal, login, loginWithGoogle, signup, resetPassword, isNewSignup, clearNewSignup } = useAuth();
  const [view, setView] = useState('login'); // login | signup | confirm | reset
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (!isAuthModalOpen) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isAuthModalOpen]);

  useEffect(() => {
    if (isNewSignup) {
      setView('confirm');
    }
  }, [isNewSignup]);

  if (!isAuthModalOpen) return null;

  const clear = () => { setError(''); setInfo(''); };

  const handleLogin = async (e) => {
    e.preventDefault(); clear(); setLoading(true);
    try {
      await login(email, password);
      closeAuthModal();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleReset = async (e) => {
    e.preventDefault(); clear(); setLoading(true);
    try { await resetPassword(email); setInfo('Password reset link sent to your email.'); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleSignup = async (e) => {
    e.preventDefault(); clear();
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      await signup(email, password, fullName);
      setView('confirm');
    }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    clear(); setLoading(true);
    try { await loginWithGoogle(); }
    catch (err) { setError(err.message); setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => { if (view !== 'confirm') closeAuthModal(); }}>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl relative flex flex-col md:flex-row max-h-[90vh] overflow-y-auto md:overflow-hidden custom-scrollbar" onClick={e => e.stopPropagation()}>
        {view !== 'confirm' && (
          <button onClick={closeAuthModal} className="absolute top-4 right-4 z-50 text-slate-400 hover:text-white transition-colors text-2xl leading-none bg-slate-900/50 md:bg-transparent w-8 h-8 flex items-center justify-center rounded-full">&times;</button>
        )}

        {/* Left Side: Form */}
        <div className="w-full md:w-1/2 p-6 md:p-8 md:overflow-y-auto custom-scrollbar flex-shrink-0 flex flex-col">
          <div className="flex justify-center mb-6">
            <img src="/Logo-Title.png" alt="Dobium" style={{ height: 40 }} />
          </div>

          {view === 'login' && (
            <>
              <h1 className="text-2xl font-extrabold text-white text-center mb-1">Welcome back</h1>
              <p className="text-slate-400 text-sm text-center mb-6">Sign in to your account</p>

              <button className="flex items-center justify-center gap-3 w-full py-2.5 rounded-xl bg-white text-slate-900 font-semibold hover:bg-slate-100 transition-colors mb-4" onClick={handleGoogle} disabled={loading}>
                <GoogleIcon />
                <span>Continue with Google</span>
              </button>

              <div className="flex items-center gap-3 mb-4 text-slate-500 text-xs uppercase tracking-wider">
                <div className="flex-1 h-px bg-slate-800"></div>
                <span>or sign in with email</span>
                <div className="flex-1 h-px bg-slate-800"></div>
              </div>

              <form onSubmit={handleLogin} className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Email</label>
                  <input className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-yellow-500 focus:outline-none transition-colors" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required autoFocus />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Password</label>
                  <input className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-yellow-500 focus:outline-none transition-colors" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                </div>
                <button type="button" onClick={() => { clear(); setView('reset'); }} className="text-right text-yellow-500 text-xs font-semibold hover:underline">Forgot password?</button>

                {error && <p className="text-red-400 text-xs">{error}</p>}
                {info && <p className="text-green-400 text-xs">{info}</p>}

                <button className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-slate-950 font-bold py-2.5 rounded-xl transition-all hover:brightness-110 mt-2" type="submit" disabled={loading}>
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>
              </form>
              <div className="mt-6 text-center text-sm text-slate-400">
                Don't have an account?{' '}
                <button className="text-yellow-500 font-semibold hover:underline" onClick={() => { clear(); setView('signup'); }}>Create account</button>
              </div>
            </>
          )}

          {view === 'signup' && (
            <>
              <h1 className="text-2xl font-bold text-white text-center mb-1">Create account</h1>
              <p className="text-slate-400 text-sm text-center mb-6">Join Dobium Prediction Markets</p>

              <button className="flex items-center justify-center gap-3 w-full py-2.5 rounded-xl bg-white text-slate-900 font-semibold hover:bg-slate-100 transition-colors mb-4" onClick={handleGoogle} disabled={loading}>
                <GoogleIcon />
                <span>Sign up with Google</span>
              </button>

              <div className="flex items-center gap-3 mb-4 text-slate-500 text-xs uppercase tracking-wider">
                <div className="flex-1 h-px bg-slate-800"></div>
                <span>or sign up with email</span>
                <div className="flex-1 h-px bg-slate-800"></div>
              </div>

              <form onSubmit={handleSignup} className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Full Name</label>
                  <input className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-yellow-500 focus:outline-none transition-colors" type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jane Doe" required autoFocus />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Email</label>
                  <input className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-yellow-500 focus:outline-none transition-colors" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Password</label>
                  <input className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-yellow-500 focus:outline-none transition-colors" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Confirm Password</label>
                  <input className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-yellow-500 focus:outline-none transition-colors" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" required />
                </div>

                {error && <p className="text-red-400 text-xs">{error}</p>}
                {info && <p className="text-green-400 text-xs">{info}</p>}

                <button className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-slate-950 font-bold py-2.5 rounded-xl transition-all hover:brightness-110 mt-2" type="submit" disabled={loading}>
                  {loading ? 'Creating account…' : 'Create account'}
                </button>
              </form>
              <div className="mt-6 text-center text-sm text-slate-400">
                Already have an account?{' '}
                <button className="text-yellow-500 font-semibold hover:underline" onClick={() => { clear(); setView('login'); }}>Sign in</button>
              </div>
            </>
          )}

          {view === 'confirm' && (
            <div className="text-center">
              <div className="text-5xl mb-4">✉️</div>
              <h1 className="text-2xl font-extrabold text-white mb-2">Check your email</h1>
              <p className="text-slate-400 text-sm mb-4 font-sans font-medium">We sent a confirmation link to</p>
              <p className="text-yellow-500 font-sans font-medium bg-yellow-500/10 py-2 rounded-lg mb-6">{email || session?.user?.email}</p>
              <p className="text-slate-400 text-sm mb-6 font-sans font-medium">Click the link in that email to confirm your account. You must verify your email before accessing the platform.</p>
              {!session && (
                <button className="w-full bg-slate-800 text-white font-sans font-medium py-2.5 rounded-xl transition-all hover:bg-slate-700" onClick={() => { clearNewSignup(); setView('login'); }}>
                  Back to sign in
                </button>
              )}
            </div>
          )}

          {view === 'reset' && (
            <>
              <h1 className="text-2xl font-bold text-white text-center mb-1">Reset password</h1>
              <p className="text-slate-400 text-sm text-center mb-6">We'll send you a reset link</p>
              <form onSubmit={handleReset} className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Email</label>
                  <input className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-yellow-500 focus:outline-none transition-colors" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required autoFocus />
                </div>
                {error && <p className="text-red-400 text-xs">{error}</p>}
                {info && <p className="text-green-400 text-xs">{info}</p>}
                <button className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-slate-950 font-bold py-2.5 rounded-xl transition-all hover:brightness-110 mt-2" type="submit" disabled={loading}>
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
              <div className="mt-6 text-center text-sm text-slate-400">
                <button className="text-yellow-500 font-semibold hover:underline" onClick={() => { clear(); setView('login'); }}>Back to sign in</button>
              </div>
            </>
          )}
        </div>

        {/* Right Side (Bottom on mobile): Slideshow */}
        <div className="flex w-full md:w-1/2 bg-slate-950 p-6 md:p-8 flex-col justify-center border-t md:border-t-0 md:border-l border-slate-800 relative flex-shrink-0 min-h-[350px]">
          <div className="relative w-full h-48 md:h-64">
            {slides.map((slide, idx) => (
              <div key={idx} className={`absolute inset-0 transition-opacity duration-500 ease-in-out flex flex-col justify-center ${idx === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                <div className="text-4xl md:text-5xl mb-4 md:mb-6">{slide.icon}</div>
                <h2 className="text-xl md:text-2xl font-bold text-white mb-2 md:mb-3">{slide.title}</h2>
                <p className="text-slate-400 text-sm mb-3 md:mb-5 leading-relaxed">{slide.description}</p>
                <div className="text-yellow-500 text-xs font-semibold uppercase tracking-wider">{slide.highlight}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-6 md:mt-8">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-1.5 rounded-full transition-all ${idx === currentSlide ? 'w-6 bg-yellow-500' : 'w-2 bg-slate-800 hover:bg-slate-600'}`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}