import React, { useEffect, useState } from 'react';
import { Banknote, Bell, CheckCircle2, CircleCheck, LoaderCircle, ShieldCheck, Signature, Smartphone } from 'lucide-react';
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

const MOBILE_MONEY_PROVIDERS = [
  { id: 'telebirr', label: 'Telebirr', icon: Smartphone },
  { id: 'mpesa', label: 'M-Pesa', icon: Smartphone },
];

const JobEscrow = ({ job, user }) => {
  const [escrow, setEscrow] = useState(null);
  const [amount, setAmount] = useState('');
  const [working, setWorking] = useState('');
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const [otp, setOtp] = useState('');
  const [signature, setSignature] = useState('');
  const [releaseMethod, setReleaseMethod] = useState('otp');
  const [mobileMoneyProvider, setMobileMoneyProvider] = useState('telebirr');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [confirmingRelease, setConfirmingRelease] = useState(false);

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
    else setFlash(`Escrow funded via ${mobileMoneyProvider === 'telebirr' ? 'Telebirr' : 'M-Pesa'}. The provider has been notified.`);
    await load();
    setWorking('');
  };

  const releaseWithOTP = async () => {
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP.');
      return;
    }
    setConfirmingRelease(true);
    setError('');
    setFlash('');
    try {
      const { error: releaseError } = await supabase.rpc('release_job_escrow', {
        target_job_id: job.id,
        otp_code: otp,
        release_method: 'otp',
      });
      if (releaseError) setError(releaseError.message);
      else {
        setFlash('Payment released to the provider via OTP confirmation.');
        setOtp('');
        await load();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setConfirmingRelease(false);
    }
  };

  const releaseWithSignature = async () => {
    if (!signature.trim()) {
      setError('Please provide a digital signature before releasing.');
      return;
    }
    setConfirmingRelease(true);
    setError('');
    setFlash('');
    try {
      const { error: releaseError } = await supabase.rpc('release_job_escrow', {
        target_job_id: job.id,
        digital_signature: signature,
        release_method: 'signature',
      });
      if (releaseError) setError(releaseError.message);
      else {
        setFlash('Payment released to the provider via digital signature.');
        setSignature('');
        await load();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setConfirmingRelease(false);
    }
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
        <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Amount (ETB)
              <input type="number" min="1" step="0.01" value={amount || job.agreed_price || ''}
                onChange={(event) => setAmount(event.target.value)}
                placeholder={job.agreed_price ? String(job.agreed_price) : 'Amount to escrow'}
                className={inputClass} />
            </label>
            <div className="flex items-center gap-3 text-sm">
              <span className="font-medium text-slate-700">Pay via:</span>
              <div className="flex gap-2">
                {MOBILE_MONEY_PROVIDERS.map((provider) => (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => setMobileMoneyProvider(provider.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
                      mobileMoneyProvider === provider.id
                        ? 'border-brand-green bg-brand-green/10 text-brand-green'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <provider.icon className="h-4 w-4" />
                    {provider.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="block text-sm font-medium text-slate-700">
              Phone number
              <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+251 9xx xxx xxx"
                className={inputClass} />
            </label>
          </div>
          <Button onClick={fund} disabled={!Number(amount) || !phoneNumber || working === 'fund'} className="w-full gap-2">
            {working === 'fund' ? <LoaderCircle size={16} className="animate-spin" /> : <Banknote size={16} />}
            {working === 'fund' ? 'Funding via mobile money...' : 'Fund escrow'}
          </Button>
          <p className="text-[11px] leading-4 text-slate-400">
            Funds will be held by NHFAS escrow and released only after OTP or digital signature confirmation.
          </p>
        </div>
      )}

      {canRelease && (
        <div className="mt-4 border-t border-slate-100 pt-4 space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Release method</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="releaseMethod" value="otp" checked={releaseMethod === 'otp'}
                  onChange={() => setReleaseMethod('otp')} className="rounded text-brand-green focus:ring-brand-green" />
                OTP confirmation
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="releaseMethod" value="signature" checked={releaseMethod === 'signature'}
                  onChange={() => setReleaseMethod('signature')} className="rounded text-brand-green focus:ring-brand-green" />
                Digital signature
              </label>
            </div>
          </div>

          {releaseMethod === 'otp' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">6-digit OTP</label>
              <input type="text" maxLength="6" value={otp} onChange={(e) => setOtp(e.target.value)}
                placeholder="000000" className={inputClass} />
              <Button onClick={releaseWithOTP} disabled={confirmingRelease || otp.length !== 6} className="w-full gap-2">
                {confirmingRelease ? <LoaderCircle size={16} className="animate-spin" /> : <Bell size={16} />}
                Release via OTP
              </Button>
            </div>
          )}

          {releaseMethod === 'signature' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Digital signature</label>
              <textarea value={signature} onChange={(e) => setSignature(e.target.value)}
                placeholder="Type your full name as digital signature"
                rows={2} className={inputClass} />
              <Button onClick={releaseWithSignature} disabled={confirmingRelease || !signature.trim()} className="w-full gap-2">
                {confirmingRelease ? <LoaderCircle size={16} className="animate-spin" /> : <CircleCheck size={16} />}
                Release via signature
              </Button>
            </div>
          )}
        </div>
      )}

      {error && <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p>}
      {flash && <p role="status" className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">{flash}</p>}
    </section>
  );
};

export default JobEscrow;
