import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Card, DataTable, ErrorNote, Spinner, StatusBadge, fmtDate, fmtMoney, loadJobsMap, loadProfilesMap } from './adminUi';

const InsuranceTab = ({ notify }) => {
  const [policies, setPolicies] = useState([]);
  const [claims, setClaims] = useState([]);
  const [names, setNames] = useState({});
  const [jobs, setJobs] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [working, setWorking] = useState(null);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [profileNames, jobMap, polRes, claimRes] = await Promise.all([
        loadProfilesMap(),
        loadJobsMap(),
        supabase.from('insurance_policies').select('id, job_id, provider, policy_number, coverage_amount, premium, status, starts_at, ends_at')
          .order('created_at', { ascending: false }).limit(200),
        supabase.from('insurance_claims').select('id, policy_id, filed_by, description, claimed_amount, approved_amount, status, created_at')
          .order('created_at', { ascending: false }).limit(200),
      ]);
      if (polRes.error) throw polRes.error;
      if (claimRes.error) throw claimRes.error;
      setNames(profileNames);
      setJobs(jobMap);
      setPolicies(polRes.data || []);
      setClaims(claimRes.data || []);
    } catch (e) {
      setError(e.message || String(e));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateClaim = async (claim, patch, label) => {
    setWorking(claim.id);
    const { error: updateError } = await supabase.from('insurance_claims').update(patch).eq('id', claim.id);
    setWorking(null);
    if (updateError) notify(`${label} failed: ${updateError.message}`, 'red');
    else {
      notify(`${label} succeeded.`, 'emerald');
      setTick((t) => t + 1);
    }
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorNote>{error}</ErrorNote>;

  const jobLabel = (jobId) => {
    const j = jobs[jobId];
    return j ? `#${j.number}` : '—';
  };
  const policyNumber = (policyId) => policies.find((p) => p.id === policyId)?.policy_number || '—';

  return (
    <div className="space-y-6">
      <Card title="Insurance policies" subtitle={`${policies.length} polic(ies)`}>
        <DataTable
          columns={[
            { key: 'job_id', label: 'Job', render: (p) => jobLabel(p.job_id) },
            { key: 'provider', label: 'Insurer', render: (p) => p.provider },
            { key: 'policy_number', label: 'Policy #', render: (p) => p.policy_number || '—' },
            { key: 'coverage_amount', label: 'Coverage', align: 'right', render: (p) => fmtMoney(p.coverage_amount) },
            { key: 'premium', label: 'Premium', align: 'right', render: (p) => fmtMoney(p.premium) },
            { key: 'status', label: 'Status', render: (p) => <StatusBadge value={p.status} /> },
            { key: 'ends_at', label: 'Valid until', render: (p) => fmtDate(p.ends_at) },
          ]}
          rows={policies}
          empty="No insurance policies."
        />
      </Card>
      <Card title="Insurance claims" subtitle={`${claims.length} claim(s)`}>
        <DataTable
          columns={[
            { key: 'policy', label: 'Policy #', render: (c) => policyNumber(c.policy_id) },
            { key: 'filed_by', label: 'Filed by', render: (c) => names[c.filed_by] || '—' },
            { key: 'description', label: 'Description', render: (c) => <span className="line-clamp-2">{c.description}</span> },
            { key: 'claimed_amount', label: 'Claimed', align: 'right', render: (c) => fmtMoney(c.claimed_amount) },
            { key: 'approved_amount', label: 'Approved', align: 'right', render: (c) => fmtMoney(c.approved_amount) },
            { key: 'status', label: 'Status', render: (c) => <StatusBadge value={c.status} /> },
            {
              key: 'actions', label: 'Actions', align: 'right',
              render: (c) => (
                <div className="flex items-center gap-2 justify-end flex-wrap">
                  {c.status === 'submitted' && (
                    <button
                      onClick={() => updateClaim(c, { status: 'reviewing' }, 'Claim moved to reviewing')}
                      disabled={working === c.id}
                      className="rounded-full border border-blue-200 px-3 py-1 text-xs font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                    >
                      Review
                    </button>
                  )}
                  {(c.status === 'submitted' || c.status === 'reviewing') && (
                    <>
                      <button
                        onClick={() => updateClaim(c, { status: 'approved', approved_amount: c.claimed_amount }, 'Claim approved')}
                        disabled={working === c.id}
                        className="rounded-full border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => updateClaim(c, { status: 'rejected' }, 'Claim rejected')}
                        disabled={working === c.id}
                        className="rounded-full border border-red-200 px-3 py-1 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {c.status === 'approved' && (
                    <button
                      onClick={() => updateClaim(c, { status: 'paid' }, 'Claim marked paid')}
                      disabled={working === c.id}
                      className="rounded-full border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                    >
                      Mark paid
                    </button>
                  )}
                </div>
              ),
            },
          ]}
          rows={claims}
          empty="No insurance claims."
        />
      </Card>

    </div>
  );
};

export default InsuranceTab;
