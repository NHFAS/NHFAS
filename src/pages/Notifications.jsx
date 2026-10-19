import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { Bell, Briefcase, CheckCheck, CircleDot, LoaderCircle, MessageSquareText, Shield, Wallet } from 'lucide-react';
import { supabase } from '../lib/supabase';

const TYPE_ICONS = {
  payment: Wallet,
  message: MessageSquareText,
  job: Briefcase,
  safety: Shield,
};

const formatWhen = (iso) => {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(date);
};

const Notifications = () => {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error: loadError } = await supabase
      .from('notifications')
      .select('id, title, body, notification_type, data, read_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);
    if (loadError) {
      setError(loadError.message);
      setItems([]);
    } else {
      setError('');
      setItems(data || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const unreadCount = useMemo(() => items.filter((item) => !item.read_at).length, [items]);

  const markRead = async (item) => {
    if (item.read_at) return;
    setItems((prev) => prev.map((row) => (row.id === item.id ? { ...row, read_at: new Date().toISOString() } : row)));
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', item.id).eq('user_id', user.id);
  };

  const markAllRead = async () => {
    if (unreadCount === 0 || working) return;
    setWorking(true);
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ read_at: now })
      .eq('user_id', user.id)
      .is('read_at', null);
    if (!updateError) {
      setItems((prev) => prev.map((row) => (row.read_at ? row : { ...row, read_at: now })));
    }
    setWorking(false);
  };

  const openItem = (item) => {
    markRead(item);
    const link = item.data?.link;
    if (typeof link === 'string' && link.startsWith('/dashboard')) {
      navigate(link);
    }
  };

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-brand-navy">Notifications</h1>
          <p className="mt-1 text-sm text-slate-500">
            Job updates, messages and payments — {unreadCount} unread.
          </p>
        </div>
        <button
          type="button"
          onClick={markAllRead}
          disabled={unreadCount === 0 || working}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-brand-navy transition-colors hover:bg-slate-50 disabled:opacity-50"
        >
          {working ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
          Mark all as read
        </button>
      </div>

      {error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>
      )}

      <div className="mt-6 rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500">
            <LoaderCircle className="h-5 w-5 animate-spin" /> Loading notifications…
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-semibold text-brand-navy">You are all caught up</p>
            <p className="mt-1 text-sm text-slate-500">Updates about your jobs, messages and payments will appear here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((item) => {
              const Icon = TYPE_ICONS[item.notification_type] || CircleDot;
              const unread = !item.read_at;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => openItem(item)}
                    className="flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50"
                  >
                    <span
                      className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                        unread ? 'bg-brand-green/10 text-brand-green' : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-3">
                        <span className={`truncate text-sm ${unread ? 'font-bold text-brand-navy' : 'font-semibold text-slate-700'}`}>
                          {item.title}
                        </span>
                        <span className="shrink-0 text-xs text-slate-400">{formatWhen(item.created_at)}</span>
                      </span>
                      {item.body && <span className="mt-1 block text-sm leading-6 text-slate-500">{item.body}</span>}
                    </span>
                    {unread && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-green" aria-label="Unread" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Notifications;
