import React, { useEffect, useState } from 'react';
import { Banknote, CheckCircle2, LoaderCircle, ShieldCheck } from 'lucide-react';
import { Button } from '../Button';
import { supabase } from '../../lib/supabase';

const statusMeta = {
  pending: { label: 'Not funded yet', className: 'text-slate-500' },
  funded: { label: 'Held safely in escrow', className: 'text-brand-green' },
  partially_released: { label: 'Partially released', className: 'text-brand-green' },
  released: { label: 'Released to provider', className: 'text-emerald-700' },
  refunded: { label: 'Refunded to client', className: 'text-slate-600' },
  disputed: { label: 'Frozen — under dispute', className: 'text-red-600' },
};

const inputClass = 'block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20';

const JobEscrow = ({ job, user }) => {
  const [escrow, setEscrow] = useState(null);
  const [amount, setAmount] = useState('');
  const [working, setWorking] = useState('');
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');

  const isClient = job.client_id === user.id;
  const activeStatus = ['confirmed', 'en_route', 'in_progress'].includes(job.status);

  const load = async () => {
    const { data } = await supabase.from('escrow_accounts').select('*').eq('job_id', job.id).maybeSingle();
    setEscrow(data || null);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.id]);

  const fund = async () => {
    setWorking('fund');
    setError('');
    setFlash('');
    const { error: fundError } = await supabase.rpc('fund_job_escrow', {
      target_job_id: job.id, amount: Number(amount),
    });
    if (fundError) setError(fundError.message);
    else setFlash('Escrow funded. The provider has been notified.');
    await load();
    setWorking('');
  };

  const release = async () => {
    if (!window.confirm('Release the escrowed payment to the provider? This cannot be undone.')) return;
    setWorking('release');
    setError('');
    setFlash('');
    const { error: releaseError } = await supabase.rpc('release_job_escrow', { target_job_id: job.id });
    if (releaseError) setError(releaseError.message);
    else setFlash('Payment released to the provider.');
    await load();
    setWorking('');
  };

  const meta = statusMeta[escrow?.status] || statusMeta.pending;
  const canFund = isClient && job.provider_id && activeStatus && (!escrow || escrow.status === 'pending');
  const canRelease = isClient && escrow?.status === 'funded' && job.status === 'completed';

  return (
    <section aria-label="Payment escrow" className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-brand-green">
          <Banknote className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-bold text-brand-navy">Payment escrow</h2>
          <p className={`text-sm font-medium ${meta.className}`}>{meta.label}</p>
        </div>
      </div>

      {escrow && escrow.funded_amount > 0 && (
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-slate-50 p-3">
            <dt className="text-xs font-medium text-slate-500">Funded</dt>
            <dd className="mt-1 font-bold text-brand-navy">{Number(escrow.funded_amount).toLocaleString()} {escrow.currency}</dd>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <dt className="text-xs font-medium text-slate-500">Released</dt>
            <dd className="mt-1 font-bold text-brand-navy">{Number(escrow.released_amount).toLocaleString()} {escrow.currency}</dd>
          </div>
        </dl>
      )}

      {(!escrow || escrow.status === 'pending') && (
        <p className="mt-4 flex items-start gap-2 text-xs text-slate-500">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          {isClient
            ? 'Funds are held by NHFAS and released only after you confirm the job is complete.'
            : 'Waiting for the client to fund escrow before work begins.'}
        </p>
      )}

      {canFund && (
        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          <label className="block space-y-1 text-sm font-medium text-slate-700">
            Amount (ETB)
            <input type="number" min="1" step="0.01" value={amount || job.agreed_price || ''}
              onChange={(event) => setAmount(event.target.value)}
              placeholder={job.agreed_price ? String(job.agreed_price) : 'Amount to escrow'}
              className={inputClass} />
          </label>
          <Button onClick={fund} disabled={!Number(amount) || working === 'fund'} className="w-full gap-2">
            {working === 'fund' ? <LoaderCircle size={16} className="animate-spin" /> : <Banknote size={16} />}
            {working === 'fund' ? 'Funding...' : 'Fund escrow'}
          </Button>
          <p className="text-[11px] leading-4 text-slate-400">Demo wallet — Telebirr/M-Pesa lands here later.</p>
        </div>
      )}

      {canRelease && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <Button onClick={release} disabled={working === 'release'} className="w-full gap-2">
            {working === 'release' ? <LoaderCircle size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            Release payment
          </Button>
        </div>
      )}

      {error && <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p>}
      {flash && <p role="status" className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">{flash}</p>}
    </section>
  );
};

export default JobEscrow;
