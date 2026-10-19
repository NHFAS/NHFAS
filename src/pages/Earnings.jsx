import React, { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Banknote, CircleHelp } from 'lucide-react';
import { Link, useOutletContext } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const currencyFormat = (amount, currency) => new Intl.NumberFormat('en', {
  style: 'currency',
  currency: currency || 'ETB',
  maximumFractionDigits: 2,
}).format(Number(amount || 0));

const Earnings = () => {
  const { user, isClientMode } = useOutletContext();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error: queryError } = await supabase
      .from('escrow_accounts')
      .select('id, job_id, currency, funded_amount, released_amount, status, created_at')
      .eq('payee_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (queryError) setError('Escrow activity could not be loaded. Check your connection and try again.');
    else setRecords(data || []);
    setLoading(false);
  }, [user.id]);

  useEffect(() => {
    load();
  }, [load, retry]);

  if (isClientMode) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-8">
        <h1 className="text-2xl font-extrabold text-brand-navy">Earnings</h1>
        <p className="mt-2 text-sm text-slate-600">Switch to Provider workspace to view payments released to you.</p>
      </div>
    );
  }

  const releasedTotal = records.reduce((sum, row) => sum + Number(row.released_amount || 0), 0);
  const heldTotal = records.reduce((sum, row) => sum + Math.max(0, Number(row.funded_amount || 0) - Number(row.released_amount || 0)), 0);
  const currency = records[0]?.currency || 'ETB';

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-green">Provider workspace</p>
        <h1 className="mt-2 text-3xl font-extrabold text-brand-navy">Earnings</h1>
        <p className="mt-2 text-slate-500">Review amounts released from job escrow and amounts still held for active work.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-medium text-slate-500">Released from escrow</p>
          <p className="mt-2 text-3xl font-extrabold text-brand-navy">{currencyFormat(releasedTotal, currency)}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm font-medium text-slate-500">Still held in escrow</p>
          <p className="mt-2 text-3xl font-extrabold text-brand-navy">{currencyFormat(heldTotal, currency)}</p>
        </article>
      </div>

      <aside className="flex items-start gap-3 rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
        <CircleHelp className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <p>This page reports escrow records only. A wallet transfer or instant payout is not available here yet; released escrow should not be interpreted as a completed bank/mobile-wallet payout.</p>
      </aside>

      <section aria-labelledby="earnings-history-heading">
        <div className="mb-4 flex items-center gap-2">
          <Banknote className="h-5 w-5 text-brand-green" aria-hidden="true" />
          <h2 id="earnings-history-heading" className="text-xl font-bold text-brand-navy">Escrow activity</h2>
        </div>
        {loading ? (
          <p className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500" role="status">Loading escrow activity...</p>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-5" role="alert">
            <p className="text-sm text-red-800">{error}</p>
            <button type="button" onClick={() => setRetry((value) => value + 1)} className="mt-3 text-sm font-semibold text-red-800 underline">Try again</button>
          </div>
        ) : records.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white px-6 py-12 text-center">
            <h3 className="font-bold text-brand-navy">No escrow activity yet</h3>
            <p className="mt-2 text-sm text-slate-500">When a client funds a job and a payment is released, the record will appear here.</p>
            <Link to="/dashboard/bookings" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-green">
              View jobs <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <ul className="divide-y divide-slate-100">
              {records.map((record) => (
                <li key={record.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Link to={`/dashboard/jobs/${record.job_id}`} className="font-semibold text-brand-navy hover:text-brand-green">
                      Job {record.job_id.slice(0, 8)} <ArrowRight className="inline h-3.5 w-3.5" />
                    </Link>
                    <p className="mt-1 text-xs text-slate-500">
                      Updated {new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(record.created_at))}
                      {' · '}{record.status.replaceAll('_', ' ')}
                    </p>
                  </div>
                  <dl className="flex gap-6 text-sm">
                    <div><dt className="text-xs text-slate-500">Released</dt><dd className="mt-1 font-bold text-emerald-700">{currencyFormat(record.released_amount, record.currency)}</dd></div>
                    <div><dt className="text-xs text-slate-500">Funded</dt><dd className="mt-1 font-semibold text-slate-700">{currencyFormat(record.funded_amount, record.currency)}</dd></div>
                  </dl>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
};

export default Earnings;
