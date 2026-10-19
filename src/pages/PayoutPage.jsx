import React, { useCallback, useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { CreditCard, Banknote, AlertCircle, CheckCircle2, LoaderCircle, ArrowLeft, Plus } from 'lucide-react';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';

const inputClass = 'block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20';

const STATUS_CLASSES = {
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  processing: 'border-blue-200 bg-blue-50 text-blue-700',
  paid: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  failed: 'border-red-200 bg-red-50 text-red-700',
  cancelled: 'border-slate-200 bg-slate-100 text-slate-600',
};

const PayoutPage = () => {
  const { user } = useOutletContext();
  const [accounts, setAccounts] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingAccount, setAddingAccount] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const [provider, setProvider] = useState('');
  const [accountReference, setAccountReference] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [payoutAmount, setPayoutAmount] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    const [{ data: accountRows }, { data: payoutRows }] = await Promise.all([
      supabase
        .from('payout_accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('payouts')
        .select('*, payout_accounts(provider, account_reference)')
        .eq('payee_id', user.id)
        .order('created_at', { ascending: false }),
    ]);
    setAccounts(accountRows || []);
    setPayouts(payoutRows || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const addAccount = async (e) => {
    e.preventDefault();
    if (!provider || !accountReference) {
      setError('Provider and account reference are required.');
      return;
    }
    setError('');
    const { error: insertError } = await supabase.from('payout_accounts').insert({
      user_id: user.id,
      provider: provider.trim(),
      account_reference: accountReference.trim(),
    });
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setAddingAccount(false);
    setProvider('');
    setAccountReference('');
    setFlash('Payout account added. It will be verified before you can withdraw.');
    await load();
  };

  const requestPayout = async () => {
    if (!selectedAccountId) {
      setError('Please select a payout account.');
      return;
    }
    const amount = parseFloat(payoutAmount);
    if (!amount || amount <= 0) {
      setError('Enter a valid amount.');
      return;
    }
    setRequesting(true);
    setError('');
    const { data, error: rpcError } = await supabase.rpc('request_payout', {
      target_account_id: selectedAccountId,
      amount,
    });
    if (rpcError) {
      setError(rpcError.message);
      setRequesting(false);
      return;
    }
    setFlash(`Payout of ${new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(amount)} requested.`);
    setRequesting(false);
    setPayoutAmount('');
    setSelectedAccountId('');
    await load();
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-navy">Payouts</h1>
          <p className="mt-1 text-sm text-slate-500">Withdraw your earnings to a verified payout account.</p>
        </div>
        <Link
          to="/dashboard/bookings"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-brand-navy"
        >
          <ArrowLeft className="h-4 w-4" /> Back to bookings
        </Link>
      </header>

      {loading && (
        <div className="py-20 text-center text-sm text-slate-400" role="status">
          <LoaderCircle size={24} className="animate-spin" /> Loading payouts…
        </div>
      )}

      {!loading && (
        <>
          <section aria-label="Payout accounts" className="rounded-lg border border-slate-200 bg-white p-5 sm:p-7">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
              <div>
                <h2 className="text-lg font-bold text-brand-navy">Payout accounts</h2>
                <p className="mt-1 text-sm text-slate-500">Add and verify accounts you can withdraw to.</p>
              </div>
              {!addingAccount && (
                <Button onClick={() => setAddingAccount(true)} className="gap-2">
                  <Plus size={16} /> Add account
                </Button>
              )}
            </div>

            {addingAccount && (
              <form onSubmit={addAccount} className="mt-4 space-y-4 grid gap-4 sm:grid-cols-2 sm:items-end">
                <label className="block space-y-1 text-sm font-medium text-slate-700">
                  Provider
                  <input
                    type="text"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    placeholder="e.g. M-Pesa, Telebirr, Bank"
                    className={inputClass}
                  />
                </label>
                <label className="block space-y-1 text-sm font-medium text-slate-700">
                  Account reference
                  <input
                    type="text"
                    value={accountReference}
                    onChange={(e) => setAccountReference(e.target.value)}
                    placeholder="Phone / account number"
                    className={inputClass}
                  />
                </label>
                <div className="col-span-full sm:col-span-2 flex justify-end gap-3">
                  <Button type="button" onClick={() => { setAddingAccount(false); setProvider(''); setAccountReference(''); }} variant="outline" className="gap-2">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={addingAccount} className="gap-2">
                    {addingAccount ? <LoaderCircle size={16} className="animate-spin" /> : null}
                    Add account
                  </Button>
                </div>
              </form>
            )}

            {accounts.length === 0 && !addingAccount && (
              <p className="mt-4 text-sm text-slate-400 italic">No payout accounts yet. Add one to request a payout.</p>
            )}

            {accounts.length > 0 && !addingAccount && (
              <div className="mt-4 space-y-3">
                {accounts.map((acct) => (
                  <div
                    key={acct.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-brand-navy">{acct.provider}</p>
                      <p className="text-xs text-slate-500">{acct.account_reference}</p>
                      {!acct.is_verified && (
                        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Pending verification</span>
                      )}
                    </div>
                    {acct.is_verified && (
                      <button
                        onClick={() => { setSelectedAccountId(acct.id); }}
                        className="text-xs font-semibold text-brand-green hover:underline"
                      >
                        Select for payout
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section aria-label="Request payout" className="mt-6 rounded-lg border border-slate-200 bg-white p-5 sm:p-7">
            <h2 className="text-lg font-bold text-brand-navy">Request payout</h2>
            <p className="mt-1 text-sm text-slate-500">Withdraw available earnings to your selected payout account.</p>

            {accounts.length === 0 && (
              <p className="mt-4 text-sm text-slate-400 italic">Add a payout account first.</p>
            )}

            {accounts.length > 0 && (
              <form
                onSubmit={(e) => { e.preventDefault(); requestPayout(); }}
                className="mt-5 space-y-4 grid gap-4 sm:grid-cols-2 sm:items-end"
              >
                <label className="block space-y-1 text-sm font-medium text-slate-700">
                  Account
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select an account</option>
                    {accounts.map((acct) => (
                      <option key={acct.id} value={acct.id}>
                        {acct.provider} · {acct.account_reference}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1 text-sm font-medium text-slate-700">
                  Amount (ETB)
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    placeholder="0"
                    className={inputClass}
                  />
                </label>
                <div className="col-span-full sm:col-span-2 flex justify-end">
                  <Button
                    type="submit"
                    disabled={requesting || !selectedAccountId || !payoutAmount}
                    className="gap-2 w-full sm:w-auto"
                  >
                    {requesting ? <LoaderCircle size={16} className="animate-spin" /> : <Banknote size={16} />}
                    {requesting ? 'Requesting…' : 'Request payout'}
                  </Button>
                </div>
              </form>
            )}
          </section>

          <section aria-label="Payout history" className="mt-6 rounded-lg border border-slate-200 bg-white p-5 sm:p-7">
            <h2 className="text-lg font-bold text-brand-navy">Payout history</h2>
            {payouts.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400 italic">No payouts yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {payouts.map((payout) => (
                  <div
                    key={payout.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div>
                      <p className="text-sm font-semibold text-brand-navy">
                        {new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(payout.amount)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {payout.payout_accounts?.provider || 'Account'} · {payout.payout_accounts?.account_reference}
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 text-xs">
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${STATUS_CLASSES[payout.status] || STATUS_CLASSES.pending}`}
                      >
                        {payout.status}
                      </span>
                      {payout.provider_reference && (
                        <span className="text-slate-500">Ref: {payout.provider_reference}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {error && (
            <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </p>
          )}
          {flash && (
            <p role="status" className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {flash}
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default PayoutPage;
