import React, { useEffect, useMemo, useState } from 'react';
import { Bell, CheckCheck, CircleAlert, LoaderCircle, Mail } from 'lucide-react';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';

const sampleNotifications = [
  {
    id: 'sample-1',
    title: 'Job update',
    body: 'Your cargo haulage request was accepted and is now in transit.',
    notification_type: 'job_update',
    created_at: new Date().toISOString(),
    read_at: null,
  },
  {
    id: 'sample-2',
    title: 'Payment released',
    body: 'Escrow for your completed service has been released and sent to the provider.',
    notification_type: 'payment',
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    read_at: null,
  },
  {
    id: 'sample-3',
    title: 'Vehicle maintenance check',
    body: 'A fleet maintenance reminder is due for one of your active vehicles.',
    notification_type: 'maintenance',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    read_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
  },
];

const Notifications = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadNotifications = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (isMounted) {
            setItems(sampleNotifications);
            setLoading(false);
          }
          return;
        }

        const { data, error: notificationsError } = await supabase
          .from('notifications')
          .select('id, title, body, notification_type, created_at, read_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(25);

        if (notificationsError) throw notificationsError;

        if (isMounted) {
          setItems((data && data.length ? data : sampleNotifications).map((item) => ({
            ...item,
            read_at: item.read_at ?? null,
          })));
        }
      } catch (loadError) {
        if (isMounted) {
          setItems(sampleNotifications);
          setError(loadError?.message || 'Notifications could not be loaded.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadNotifications();

    return () => {
      isMounted = false;
    };
  }, []);

  const unreadCount = useMemo(
    () => items.filter((item) => !item.read_at).length,
    [items],
  );

  const markAllRead = () => {
    setItems((current) =>
      current.map((item) => ({
        ...item,
        read_at: item.read_at || new Date().toISOString(),
      })),
    );
  };

  const typeStyles = {
    payment: 'bg-emerald-50 text-emerald-700',
    job_update: 'bg-brand-softBlue text-brand-navy',
    maintenance: 'bg-amber-50 text-amber-700',
    default: 'bg-slate-100 text-slate-700',
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-green">NHFAS / ALERTS</p>
          <h1 className="mt-2 text-3xl font-bold text-brand-navy">Notifications</h1>
          <p className="mt-2 text-sm text-slate-600">Updates about jobs, dispatches, payments, and operational alerts.</p>
        </div>

        <Button variant="outline" className="inline-flex items-center gap-2 self-start" onClick={markAllRead}>
          <CheckCheck size={16} />
          Mark all read
        </Button>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Unread</p>
          <p className="mt-2 text-3xl font-bold text-brand-navy">{loading ? '—' : unreadCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">This week</p>
          <p className="mt-2 text-3xl font-bold text-brand-navy">{loading ? '—' : items.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Delivery alerts</p>
          <p className="mt-2 text-3xl font-bold text-brand-navy">{loading ? '—' : items.filter((item) => item.notification_type === 'job_update').length}</p>
        </div>
      </section>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          <LoaderCircle className="mx-auto mb-3 h-5 w-5 animate-spin" />
          Loading notifications...
        </div>
      ) : (
        <section className="space-y-3">
          {items.map((item) => (
            <article
              key={item.id}
              className={`rounded-2xl border p-4 shadow-sm ${item.read_at ? 'border-slate-200 bg-white' : 'border-brand-green/20 bg-brand-softBlue/60'}`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${typeStyles[item.notification_type] || typeStyles.default}`}>
                    {item.notification_type === 'payment' ? <Mail className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-brand-navy">{item.title}</h2>
                      {!item.read_at && (
                        <span className="rounded-full bg-brand-green px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
                          New
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{item.body}</p>
                  </div>
                </div>

                <time className="text-xs font-medium text-slate-500">
                  {new Date(item.created_at).toLocaleString()}
                </time>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
};

export default Notifications;
