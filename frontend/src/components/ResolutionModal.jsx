import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export default function ResolutionModal() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [unreadModals, setUnreadModals] = useState([]);

  useEffect(() => {
    if (!session?.user?.id) return;

    const checkModals = async () => {
      try {
        const res = await fetch(`/api/users/${session.user.id}/notifications`);
        if (res.ok) {
          const data = await res.json();
          const modals = data.filter(n =>
            !n.is_read &&
            (n.type === 'prediction_won_modal' || n.type === 'prediction_lost_modal')
          );
          setUnreadModals(modals);
        }
      } catch (error) {
        console.error('Failed to fetch modal notifications', error);
      }
    };

    checkModals();
  }, [session?.user?.id]);

  if (unreadModals.length === 0) return null;

  const currentModal = unreadModals[0];
  const isWin = currentModal.type === 'prediction_won_modal';

  const handleClose = async () => {
    try {
      await fetch(`/api/notifications/${currentModal.id}/read`, { method: 'PUT' });
    } catch (err) {
      console.error('Failed to mark read', err);
    }
    setUnreadModals(prev => prev.slice(1));
  };

  const handleAction = async () => {
    await handleClose();
    if (currentModal.link) {
      navigate(currentModal.link);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md relative p-6 md:p-8 animate-fadeIn">
        <div className="text-center">
          <div className="text-5xl mb-4">{isWin ? '🎉' : '📉'}</div>
          <h2 className="text-2xl font-bold text-white mb-4">{currentModal.title}</h2>
          <div className="text-slate-300 text-sm mb-8 leading-relaxed text-left bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 whitespace-pre-wrap">
            {currentModal.message}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2.5 rounded-xl transition-colors"
            >
              Dismiss
            </button>
            {currentModal.link && (
              <button
                onClick={handleAction}
                className="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:brightness-110 text-slate-950 font-bold py-2.5 rounded-xl transition-all"
              >
                View Market
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}