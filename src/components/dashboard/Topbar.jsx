import React, { useEffect, useState } from 'react';
import { ArrowRight, Bell, Mail, Menu, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const Topbar = ({ fullName, user, onOpenNav }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [showPanel, setShowPanel] = useState(false);
  const [notificationError, setNotificationError] = useState('');
  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  useEffect(() => {
    if (!user) return undefined;
    let isCurrent = true;
    const load = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, title, body, data, read_at, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(15);
      if (isCurrent) {
        setNotificationError(error ? `Notifications could not be loaded: ${error.message}` : '');
        if (!error) setNotifications(data || []);
      }
    };
    load();
    const timer = setInterval(load, 20000);
    return () => {
      isCurrent = false;
      clearInterval(timer);
    };
  }, [user]);

  const unreadCount = notifications.filter((item) => !item.read_at).length;

  const markRead = async (notification) => {
    if (!notification.read_at) {
      const now = new Date().toISOString();
      const { error } = await supabase.from('notifications').update({ read_at: now }).eq('id', notification.id);
      if (error) {
        setNotificationError(`Notification could not be updated: ${error.message}`);
        return;
      }
      setNotifications((current) => current.map((item) => (item.id === notification.id ? { ...item, read_at: now } : item)));
    }
    setShowPanel(false);
    const jobId = notification.data?.job_id;
    if (jobId) navigate(`/dashboard/jobs/${jobId}`);
  };

  const markAllRead = async () => {
    const now = new Date().toISOString();
    const { error } = await supabase.from('notifications').update({ read_at: now }).eq('user_id', user.id).is('read_at', null);
    if (error) {
      setNotificationError(`Notifications could not be updated: ${error.message}`);
      return;
    }
    setNotificationError('');
    setNotifications((current) => current.map((item) => ({ ...item, read_at: item.read_at || now })));
  };

  const handleSearch = (event) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    navigate(`/dashboard/search?q=${encodeURIComponent(query)}`);
  };
  return (
    <header className="relative bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
      <div className="flex flex-1 items-center gap-2 sm:gap-4">
        {onOpenNav && (
          <button
            type="button"
            onClick={onOpenNav}
            aria-label="Open main menu"
            title="Open main menu"
            className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-brand-navy rounded-md hover:bg-slate-100"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <form onSubmit={handleSearch} role="search" className="relative w-full max-w-md">
          <Search aria-hidden="true" className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search providers or services"
            aria-label="Search providers or services"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-11 text-sm transition-all focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/50"
          />
          <button type="submit" aria-label="Search" className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:bg-white hover:text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-green">
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setShowPanel((open) => !open)}
            aria-label={`Notifications (${unreadCount} unread)`}
            title="Notifications"
            className="p-2 text-slate-500 hover:text-brand-navy rounded-full hover:bg-slate-100 relative"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white border-2 border-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {showPanel && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-xl z-50">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <p className="text-sm font-bold text-brand-navy">Notifications</p>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs font-semibold text-brand-green hover:underline">Mark all read</button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notificationError && (
                  <p role="alert" className="border-b border-red-100 bg-red-50 px-4 py-3 text-xs text-red-800">
                    {notificationError}
                  </p>
                )}
                {notifications.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-slate-400">No notifications yet.</p>
                ) : (
                  notifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => markRead(notification)}
                      className={`block w-full border-b border-slate-50 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${notification.read_at ? 'opacity-60' : ''}`}
                    >
                      <p className="text-sm font-semibold text-brand-navy">{notification.title}</p>
                      {notification.body && <p className="mt-0.5 text-xs leading-4 text-slate-500">{notification.body}</p>}
                      <p className="mt-1 text-[10px] text-slate-400">{new Date(notification.created_at).toLocaleString()}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
          <button
            onClick={() => navigate('/dashboard/messages')}
            className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-brand-navy"
            aria-label="Job messages"
            title="Your job messages"
          >
            <Mail className="w-5 h-5" />
          </button>
        <div className="h-8 w-px bg-slate-200 mx-1"></div>
        <button
          onClick={() => navigate('/dashboard/settings')}
          className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2"
          aria-label={`${fullName} — account settings`}
          title="Account settings"
        >
          <div className="w-8 h-8 rounded-full bg-brand-green/20 text-brand-green flex items-center justify-center font-bold text-sm">
            {initials || '?'}
          </div>
        </button>
      </div>
    </header>
  );
};

export default Topbar;
