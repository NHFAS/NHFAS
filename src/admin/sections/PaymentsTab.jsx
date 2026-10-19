import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Card, DataTable, ErrorNote, Spinner, StatusBadge, fmtDate, fmtMoney, loadJobsMap, loadProfilesMap } from './adminUi';

const PaymentsTab = ({ notify }) => {
  const [payments, setPayments] = useState([]);
  const [escrow, setEscrow] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [names, setNames] = useState({});
  const [jobs, setJobs] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [profileNames, jobMap, payRes, escRes, snapRes] = await Promise.all([
        loadProfilesMap(),
        loadJobsMap(),
        supabase.from('payments').select('id, job_id, payer_id, payee_id, amount, currency, status, provider, created_at').order('created_at', { ascending: false }).limit(200),
        supabase.from('escrow_accounts').select('id, job_id, payer_id, payee_id, funded_amount, released_amount, status, created_at').order('created_at', { ascending: false }).limit(200),
        supabase.from('pricing_snapshots').select('id, origin_area, destination_area, base_price, surge_multiplier, fair_price_min, fair_price_max, calculated_at').order('calculated_at', { ascending: false }).limit(50),
      ]);
      if (payRes.error) throw payRes.error;
      if (escRes.error) throw escRes.error;
      if (snapRes.error) throw snapRes.error;
      setNames(profileNames);
      setJobs(jobMap);
      setPayments(payRes.data || []);
      setEscrow(escRes.data || []);
      setSnapshots(snapRes.data || []);
    } catch (e) {
      setError(e.message || String(e));
      if (notify) notify(`Payments could not be loaded: ${e.message}`, 'red');
    }
    setLoading(false);
  }, [notify]);

  useEffect(() => { load(); }, [tick]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <Spinner />;
  if (error) return <ErrorNote>{error}</ErrorNote>;

  const jobLabel = (jobId) => {
    const j = jobs[jobId];
    return j ? `#${j.number} ${j.title}` : '—';
  };

  return (
    <div className="space-y-6">
      <Card title="Payments" subtitle={`${payments.length} payment record(s)`}>
        <DataTable
          columns={[
            { key: 'job_id', label: 'Job', render: (p) => jobLabel(p.job_id) },
            { key: 'payer', label: 'Payer', render: (p) => names[p.payer_id] || '—' },
            { key: 'payee', label: 'Payee', render: (p) => (p.payee_id ? names[p.payee_id] || '—' : '—') },
            { key: 'amount', label: 'Amount', align: 'right', render: (p) => fmtMoney(p.amount, p.currency) },
            { key: 'status', label: 'Status', render: (p) => <StatusBadge value={p.status} /> },
            { key: 'provider', label: 'Provider', render: (p) => p.provider || '—' },
            { key: 'created_at', label: 'Date', render: (p) => fmtDate(p.created_at) },
          ]}
          rows={payments}
          empty="No payments recorded."
        />
      </Card>

      <Card title="Escrow accounts" subtitle={`${escrow.length} escrow account(s) — funded vs released`}>
        <DataTable
          columns={[
            { key: 'job_id', label: 'Job', render: (e) => jobLabel(e.job_id) },
            { key: 'payer', label: 'Payer', render: (e) => names[e.payer_id] || '—' },
            { key: 'payee', label: 'Payee', render: (e) => (e.payee_id ? names[e.payee_id] || '—' : '—') },
            { key: 'funded', label: 'Funded', align: 'right', render: (e) => fmtMoney(e.funded_amount, e.currency) },
            { key: 'released', label: 'Released', align: 'right', render: (e) => fmtMoney(e.released_amount, e.currency) },
            { key: 'status', label: 'Status', render: (e) => <StatusBadge value={e.status} /> },
          ]}
          rows={escrow}
          empty="No escrow accounts."
        />
      </Card>

      <Card title="Pricing snapshots" subtitle="Historic base price / surge / fair-price ranges">
        <DataTable
          columns={[
            { key: 'route', label: 'Route', render: (s) => `${s.origin_area || '—'} → ${s.destination_area || '—'}` },
            { key: 'base_price', label: 'Base', align: 'right', render: (s) => fmtMoney(s.base_price) },
            { key: 'surge_multiplier', label: 'Surge', render: (s) => `×${s.surge_multiplier}` },
            { key: 'fair', label: 'Fair range', render: (s) => (s.fair_price_min != null ? `${fmtMoney(s.fair_price_min)} – ${fmtMoney(s.fair_price_max)}` : '—') },
            { key: 'calculated_at', label: 'Calculated', render: (s) => fmtDate(s.calculated_at) },
          ]}
          rows={snapshots}
          empty="No pricing snapshots."
        />
      </Card>
    </div>
  );
};

export default PaymentsTab;
