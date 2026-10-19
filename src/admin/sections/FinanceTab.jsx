import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Card, DataTable, ErrorNote, Spinner, StatusBadge, fmtDate, fmtMoney, loadProfilesMap } from './adminUi';

const FinanceTab = ({ notify }) => {
  const [accounts, setAccounts] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [financing, setFinancing] = useState([]);
  const [names, setNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [working, setWorking] = useState(null);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [profileNames, accRes, payRes, finRes] = await Promise.all([
        loadProfilesMap(),
        supabase.from('payout_accounts').select('id, user_id, provider, account_reference, is_verified, created_at')
          .order('created_at', { ascending: false }).limit(200),
        supabase.from('payouts').select('id, payee_id, amount, currency, status, created_at')
          .order('created_at', { ascending: false }).limit(200),
        supabase.from('financing_requests').select('id, applicant_id, amount, purpose, provider, status, created_at')
          .order('created_at', { ascending: false }).limit(200),
      ]);
      if (accRes.error) throw accRes.error;
      if (payRes.error) throw payRes.error;
      if (finRes.error) throw finRes.error;
      setNames(profileNames);
      setAccounts(accRes.data || []);
      setPayouts(payRes.data || []);
      setFinancing(finRes.data || []);
    } catch (e) {
      setError(e.message || String(e));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (table, id, patch, label) => {
    setWorking(id);
    const { error: updateError } = await supabase.from(table).update(patch).eq('id', id);
    setWorking(null);
    if (updateError) notify(`${label} failed: ${updateError.message}`, 'red');
    else {
      notify(`${label} succeeded.`, 'emerald');
      setTick((t) => t + 1);
    }
  };

  const actionBtn = (id, label, tone, onClick) => (
    <button
      onClick={onClick}
      disabled={working === id}
      className={`rounded-full border px-3 py-1 text-xs font-bold disabled:opacity-50 ${tone}`}
    >
      {label}
    </button>
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNote>{error}</ErrorNote>;

  return (
    <div className="space-y-6">
      <Card title="Payout accounts" subtitle={`${accounts.length} account(s)`}>
        <DataTable
          columns={[
            { key: 'user_id', label: 'User', render: (a) => names[a.user_id] || '—' },
            { key: 'provider', label: 'Provider', render: (a) => a.provider },
            { key: 'account_reference', label: 'Reference', render: (a) => a.account_reference },
            { key: 'is_verified', label: 'Verified', render: (a) => (a.is_verified ? <StatusBadge value="verified" /> : <StatusBadge value="pending" />) },
            { key: 'created_at', label: 'Added', render: (a) => fmtDate(a.created_at) },
            {
              key: 'actions', label: 'Actions', align: 'right',
              render: (a) => actionBtn(
                a.id,
                a.is_verified ? 'Unverify' : 'Verify',
                a.is_verified ? 'border-amber-200 text-amber-700 hover:bg-amber-50' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50',
                () => act('payout_accounts', a.id, { is_verified: !a.is_verified }, a.is_verified ? 'Account unverified' : 'Account verified')
              ),
            },
          ]}
          rows={accounts}
          empty="No payout accounts."
        />
      </Card>
      <Card title="Payouts" subtitle={`${payouts.length} payout(s)`}>
        <DataTable
          columns={[
            { key: 'payee_id', label: 'Payee', render: (p) => names[p.payee_id] || '—' },
            { key: 'amount', label: 'Amount', align: 'right', render: (p) => fmtMoney(p.amount, p.currency) },
            { key: 'status', label: 'Status', render: (p) => <StatusBadge value={p.status} /> },
            { key: 'created_at', label: 'Requested', render: (p) => fmtDate(p.created_at) },
            {
              key: 'actions', label: 'Actions', align: 'right',
              render: (p) => (
                <div className="flex items-center gap-2 justify-end flex-wrap">
                  {p.status === 'pending' && actionBtn(p.id, 'Process', 'border-blue-200 text-blue-700 hover:bg-blue-50',
                    () => act('payouts', p.id, { status: 'processing' }, 'Payout processing'))}
                  {(p.status === 'pending' || p.status === 'processing') && (
                    <>
                      {actionBtn(p.id, 'Mark paid', 'border-emerald-200 text-emerald-700 hover:bg-emerald-50',
                        () => act('payouts', p.id, { status: 'paid' }, 'Payout paid'))}
                      {actionBtn(p.id, 'Fail', 'border-red-200 text-red-600 hover:bg-red-50',
                        () => act('payouts', p.id, { status: 'failed' }, 'Payout failed'))}
                    </>
                  )}
                </div>
              ),
            },
          ]}
          rows={payouts}
          empty="No payouts requested."
        />
      </Card>

      <Card title="Financing requests" subtitle={`${financing.length} request(s)`}>
        <DataTable
          columns={[
            { key: 'applicant_id', label: 'Applicant', render: (f) => names[f.applicant_id] || '—' },
            { key: 'amount', label: 'Amount', align: 'right', render: (f) => fmtMoney(f.amount) },
            { key: 'purpose', label: 'Purpose', render: (f) => <span className="line-clamp-2">{f.purpose}</span> },
            { key: 'provider', label: 'Lender', render: (f) => f.provider || '—' },
            { key: 'status', label: 'Status', render: (f) => <StatusBadge value={f.status} /> },
            {
              key: 'actions', label: 'Actions', align: 'right',
              render: (f) => (
                <div className="flex items-center gap-2 justify-end flex-wrap">
                  {f.status === 'submitted' && actionBtn(f.id, 'Review', 'border-blue-200 text-blue-700 hover:bg-blue-50',
                    () => act('financing_requests', f.id, { status: 'reviewing' }, 'Request reviewing'))}
                  {(f.status === 'submitted' || f.status === 'reviewing') && (
                    <>
                      {actionBtn(f.id, 'Approve', 'border-emerald-200 text-emerald-700 hover:bg-emerald-50',
                        () => act('financing_requests', f.id, { status: 'approved' }, 'Request approved'))}
                      {actionBtn(f.id, 'Reject', 'border-red-200 text-red-600 hover:bg-red-50',
                        () => act('financing_requests', f.id, { status: 'rejected' }, 'Request rejected'))}
                    </>
                  )}
                  {f.status === 'approved' && actionBtn(f.id, 'Disburse', 'border-emerald-200 text-emerald-700 hover:bg-emerald-50',
                    () => act('financing_requests', f.id, { status: 'disbursed' }, 'Request disbursed'))}
                  {f.status === 'disbursed' && actionBtn(f.id, 'Mark repaid', 'border-emerald-200 text-emerald-700 hover:bg-emerald-50',
                    () => act('financing_requests', f.id, { status: 'repaid' }, 'Request repaid'))}
                </div>
              ),
            },
          ]}
          rows={financing}
          empty="No financing requested."
        />
      </Card>

    </div>
  );
};

export default FinanceTab;
