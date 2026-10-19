import { useCallback, useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { ArrowUpRight, LoaderCircle, Wallet } from 'lucide-react';
import { supabase } from '../lib/supabase';

const money = (value) =>
  new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB', maximumFractionDigits: 2 }).format(Number(value) || 0);

const STATUS_STYLES = {
  pending: 'bg-slate-100 text-slate-600',
  funded: 'bg-brand-green/10 text-brand-green',
  partially_released: 'bg-amber-100 text-amber-700',
  released: 'bg-emerald-100 text-emerald-700',
  refunded: 'bg-sky-100 text-sky-700',
  disputed: 'bg-red-100 text-red-700',
};

const Payments = () => {
  const { user } = useOutletContext();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error: loadError } = await supabase
      .from('escrow_accounts')
      .select('id, job_id, currency, funded_amount, released_amount, status, created_at, jobs:job_id ( id, title, status )')
      .eq('payer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (loadError) {
      setError(loadError.message);
      setRows([]);
    } else {
      setError('');
      setRows(data || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const held = rows
    .filter((row) => ['funded', 'partially_released', 'disputed'].includes(row.status))
    .reduce((sum, row) => sum + (Number(row.funded_amount) - Number(row.released_amount)), 0);
  const releasedTotal = rows.reduce((sum, row) => sum + Number(row.released_amount || 0), 0);
  const fundedTotal = rows.reduce((sum, row) => sum + Number(row.funded_amount || 0), 0);

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6 lg:px-10">
      <div>
        <h1 className="text-3xl font-extrabold text-brand-navy">Payments</h1>
        <p className="mt-1 text-sm text-slate-500">Escrow funds you have secured for your jobs.</p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Held in escrow</p>
          <p className="mt-2 text-2xl font-extrabold text-brand-navy">{money(held)}</p>
          <p className="mt-1 text-xs text-slate-500">Secured, not yet released</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Total funded</p>
          <p className="mt-2 text-2xl font-extrabold text-brand-navy">{money(fundedTotal)}</p>
          <p className="mt-1 text-xs text-slate-500">Across all escrow accounts</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Released to providers</p>
          <p className="mt-2 text-2xl font-extrabold text-brand-green">{money(releasedTotal)}</p>
          <p className="mt-1 text-xs text-slate-500">Paid out after approvals</p>
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>
      )}

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500">
            <LoaderCircle className="h-5 w-5 animate-spin" /> Loading payments…
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <Wallet className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 font-semibold text-brand-navy">No escrow activity yet</p>
            <p className="mt-1 text-sm text-slate-500">When you fund a job, its escrow account appears here.</p>
            <Link
              to="/dashboard/bookings"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-green px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-green/90"
            >
              Go to my bookings
            </Link>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              <tr>
                <th className="px-5 py-3">Job</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Funded</th>
                <th className="px-5 py-3 text-right">Released</th>
                <th className="px-5 py-3 text-right">Remaining</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => {
                const remaining = Math.max(0, Number(row.funded_amount) - Number(row.released_amount));
                return (
                  <tr key={row.id} className="transition-colors hover:bg-slate-50">
                    <td className="max-w-[260px] px-5 py-3.5">
                      <p className="truncate font-semibold text-brand-navy">{row.jobs?.title || 'Untitled job'}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[row.status] || 'bg-slate-100 text-slate-600'}`}>
                        {String(row.status || '').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium text-slate-700">{money(row.funded_amount)}</td>
                    <td className="px-5 py-3.5 text-right font-medium text-slate-700">{money(row.released_amount)}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-brand-navy">{money(remaining)}</td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(row.created_at))}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        to={`/dashboard/jobs/${row.job_id}`}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-brand-green hover:text-brand-green/80"
                      >
                        View job <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Payments;
