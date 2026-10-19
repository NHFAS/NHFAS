import React, { useCallback, useEffect, useState } from 'react';
import { KeyRound, LoaderCircle, ShieldAlert, ShieldCheck, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

// FR-01 — TOTP enrollment & management for administrator accounts.
// Uses Supabase Auth MFA (enroll / challenge / verify / unenroll) so no
// custom secret storage is needed.
const MfaSetup = ({ notify }) => {
  const [factors, setFactors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [enrollData, setEnrollData] = useState(null); // pending factor to verify
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const loadFactors = useCallback(async () => {
    setLoading(true);
    const { data, error: listError } = await supabase.auth.mfa.listFactors();
    if (listError) setError(listError.message);
    else setFactors(data?.factors || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadFactors(); }, [loadFactors]);

  const startEnroll = async () => {
    setBusy(true);
    setError('');
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
    setBusy(false);
    if (enrollError) { setError(enrollError.message); return; }
    setEnrollData(data);
  };

  const verifyEnroll = async (event) => {
    event.preventDefault();
    if (!enrollData || code.trim().length < 6) return;
    setBusy(true);
    setError('');
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: enrollData.id });
    if (challengeError) { setError(challengeError.message); setBusy(false); return; }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: enrollData.id,
      challengeId: challenge.id,
      code: code.trim(),
    });
    setBusy(false);
    if (verifyError) { setError(`Verification failed: ${verifyError.message}`); return; }
    setEnrollData(null);
    setCode('');
    notify?.('Two-factor authentication is now active on your admin account.', 'emerald');
    loadFactors();
  };

  const removeFactor = async (factorId) => {
    if (!window.confirm('Remove this two-factor device? Your account will be less secure until you enroll again.')) return;
    setBusy(true);
    const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId });
    setBusy(false);
    if (unenrollError) setError(unenrollError.message);
    else { notify?.('Two-factor device removed.', 'emerald'); loadFactors(); }
  };


  return (
    <div className="space-y-6">
      <header className="border-b border-slate-200 pb-5">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-red-600">SECURITY · FR-01</p>
        <h1 className="mt-2 flex items-center gap-3 text-3xl font-bold text-slate-900">
          <ShieldCheck size={28} /> Two-factor authentication
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Administrator sign-in requires a time-based one-time code (TOTP) from an authenticator app
          once a factor is enrolled. Add at least one device before inviting other operators.
        </p>
      </header>

      {error && (
        <p role="alert" className="border-l-4 border-red-600 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading factors…</div>
      ) : (
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <KeyRound className="h-4 w-4" aria-hidden="true" /> Enrolled devices
          </h2>
          {verified.length === 0 ? (
            <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>No two-factor device is enrolled yet. Your admin account currently relies on password alone — enroll a TOTP app now.</span>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {verified.map((factor) => (
                <li key={factor.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{factor.friendly_name || 'Authenticator app'}</p>
                    <p className="text-xs text-slate-500">Added {new Date(factor.created_at).toLocaleDateString()}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFactor(factor.id)}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 rounded-full border border-red-200 px-3 py-1 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!enrollData ? (
            <button
              type="button"
              onClick={startEnroll}
              disabled={busy}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="h-4 w-4" aria-hidden="true" />}
              {busy ? 'Preparing…' : 'Enroll a new device'}
            </button>
          ) : (
            <form onSubmit={verifyEnroll} className="mt-5 space-y-4 border-t border-slate-100 pt-5">
              <p className="text-sm font-semibold text-slate-900">Scan with your authenticator app</p>
              {enrollData.totp?.qr_code && (
                <img src={enrollData.totp.qr_code} alt="TOTP enrollment QR code" className="h-44 w-44 rounded-lg border border-slate-200" />
              )}
              {enrollData.totp?.secret && (
                <p className="text-xs text-slate-500">
                  Manual key: <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">{enrollData.totp.secret}</code>
                </p>
              )}
              <label className="block max-w-xs space-y-1.5 text-sm font-medium text-slate-700">
                Enter the 6-digit code to activate
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 font-mono tracking-[0.3em] text-sm focus:border-red-500 focus:outline-none focus:ring-4 focus:ring-red-500/10"
                />
              </label>
              <div className="flex gap-3">
                <button type="submit" disabled={busy || code.trim().length < 6} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                  {busy ? 'Verifying…' : 'Activate 2FA'}
                </button>
                <button type="button" onClick={() => { setEnrollData(null); setCode(''); }} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>
      )}
    </div>
  );
};

export default MfaSetup;

  const verified = factors.filter((factor) => factor.status === 'verified');
