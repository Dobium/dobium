import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export default function NotificationsPanel({ isOpen, onClose }) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    if (!session?.user?.id) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/users/${session.user.id}/notifications`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, session?.user?.id]);

  const markAsRead = async (id) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PUT' });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  };

  const markAllAsRead = async () => {
    if (!session?.user?.id) return;
    try {
      await fetch(`/api/users/${session.user.id}/notifications/read-all`, { method: 'PUT' });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Failed to mark all as read', error);
    }
  };

  const clearAllNotifications = async () => {
    if (!session?.user?.id) return;
    try {
      await fetch(`/api/users/${session.user.id}/notifications`, { method: 'DELETE' });
      setNotifications([]);
    } catch (error) {
      console.error('Failed to clear notifications', error);
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    onClose();

    if (notification.link) {
      navigate(notification.link);
    } else {
      navigate(notification.type === 'market_new' ? '/explore' : '/');
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  };

  const getIcon = (type) => {
    switch (type) {
      case 'market_new': return (<div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0"><svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></div>);
      case 'market_resolved': return (<div className="w-10 h-10 rounded-full bg-slate-500/20 text-slate-400 flex items-center justify-center flex-shrink-0"><svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>);
      case 'prediction_won':
      case 'prediction_won_modal': return (<div className="w-10 h-10 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center flex-shrink-0">$</div>);
      case 'prediction_lost':
      case 'prediction_lost_modal': return (<div className="w-10 h-10 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center flex-shrink-0"><svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></div>);
      case 'prediction_placed': return (<div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0">🎯</div>);
      case 'position_sold': return (<div className="w-10 h-10 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0"><svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>);
      case 'position_up_100':
      case 'position_up_50': return (<div className="w-10 h-10 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center flex-shrink-0"><svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg></div>);
      case 'position_down_50':
      case 'position_down_90': return (<div className="w-10 h-10 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center flex-shrink-0"><svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg></div>);
      default: return (<div className="w-10 h-10 rounded-full bg-slate-700/50 text-slate-300 flex items-center justify-center flex-shrink-0">!</div>);
    }
  };

  const newNotifications = notifications.filter(n => !n.is_read);
  const earlierNotifications = notifications.filter(n => n.is_read);

  return (
    <>
      {/* Invisible overlay to close panel when clicking outside */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-transparent"
          onClick={onClose}
        />
      )}

      {/* Sliding Drawer positioned right after the collapsed sidebar (80px) */}
      <div
        className={`fixed top-0 left-[80px] h-full w-[350px] sm:w-[400px] bg-slate-950 border-r border-slate-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="flex flex-col h-full">
          <div className="px-6 py-5 border-b border-slate-800 flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">Notifications</h2>
            <div className="flex gap-3 items-center">
              {newNotifications.length > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-yellow-400 hover:text-yellow-300 transition-colors"
                >
                  Mark all as read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAllNotifications}
                  className="text-xs text-slate-400 hover:text-red-400 transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {loading && notifications.length === 0 ? (
              <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-500"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center p-8 text-slate-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-slate-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
                <p>No notifications yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {newNotifications.length > 0 && (
                  <>
                    <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">New</div>
                    {newNotifications.map(notification => (
                      <div key={notification.id} className="flex items-start gap-3 p-3 bg-slate-900/50 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors border border-slate-700/50" onClick={() => handleNotificationClick(notification)}>
                        {getIcon(notification.type)}
                        <div className="flex-1">
                          <p className="text-sm text-slate-200 whitespace-pre-wrap">{notification.message}</p>
                          <span className="text-xs text-slate-500 mt-1 block">{formatTimeAgo(notification.created_at)}</span>
                        </div>
                        <div className="w-2 h-2 mt-2 rounded-full bg-yellow-500 flex-shrink-0"></div>
                      </div>
                    ))}
                  </>
                )}
                {earlierNotifications.length > 0 && (
                  <>
                    <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider mt-6 mb-2">Earlier</div>
                    {earlierNotifications.map(notification => (
                      <div key={notification.id} className="flex items-start gap-3 p-3 hover:bg-slate-900/50 rounded-lg cursor-pointer transition-colors opacity-75 hover:opacity-100" onClick={() => handleNotificationClick(notification)}>
                        {getIcon(notification.type)}
                        <div>
                          <p className="text-sm text-slate-300 whitespace-pre-wrap">{notification.message}</p>
                          <span className="text-xs text-slate-500 mt-1 block">{formatTimeAgo(notification.created_at)}</span>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}