import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Card, DataTable, ErrorNote, Spinner, StatusBadge, fmtDate, loadJobsMap, loadProfilesMap } from './adminUi';

const DisputesTab = ({ user, notify }) => {
  const [disputes, setDisputes] = useState([]);
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
      const [profileNames, jobMap, { data, error: resError }] = await Promise.all([
        loadProfilesMap(),
        loadJobsMap(),
        supabase.from('disputes').select('id, job_id, opened_by, reason, status, resolution, resolved_by, created_at, resolved_at')
          .order('created_at', { ascending: false }).limit(200),
      ]);
      if (resError) throw resError;
      setNames(profileNames);
      setJobs(jobMap);
      setDisputes(data || []);
    } catch (e) {
      setError(e.message || String(e));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateDispute = async (id, patch, label) => {
    setWorking(id);
    const { error: updateError } = await supabase.from('disputes').update(patch).eq('id', id);
    setWorking(null);
    if (updateError) notify(`${label} failed: ${updateError.message}`, 'red');
    else {
      notify(`${label} succeeded.`, 'emerald');
      setTick((t) => t + 1);
    }
  };

  const investigate = (d) =>
    updateDispute(d.id, { status: 'investigating' }, 'Dispute moved to investigating');

  const resolve = (d) => {
    const resolution = window.prompt('Resolution note:', '');
    if (resolution === null) return;
    updateDispute(
      d.id,
      {
        status: 'resolved',
        resolution: resolution.trim() || 'Resolved by administrator',
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
      },
      'Dispute resolved'
    );
  };

  const close = (d) => updateDispute(d.id, { status: 'closed' }, 'Dispute closed');

  if (loading) return <Spinner />;
  if (error) return <ErrorNote>{error}</ErrorNote>;

  const jobLabel = (jobId) => {
    const j = jobs[jobId];
    return j ? `#${j.number}` : '—';
  };

  return (
    <Card title="Disputes" subtitle={`${disputes.length} dispute(s) across all jobs`}>
      <DataTable
        columns={[
          { key: 'job_id', label: 'Job', render: (d) => jobLabel(d.job_id) },
          { key: 'opened_by', label: 'Opened by', render: (d) => names[d.opened_by] || '—' },
          { key: 'reason', label: 'Reason', render: (d) => <span className="line-clamp-2">{d.reason}</span> },
          { key: 'status', label: 'Status', render: (d) => <StatusBadge value={d.status} /> },
          {
            key: 'resolution', label: 'Resolution',
            render: (d) => (
              <div>
                <p className="line-clamp-2">{d.resolution || '—'}</p>
                {d.resolved_by && <p className="text-xs text-red-400">by {names[d.resolved_by] || 'admin'} · {fmtDate(d.resolved_at)}</p>}
              </div>
            ),
          },
          { key: 'created_at', label: 'Opened', render: (d) => fmtDate(d.created_at) },
          {
            key: 'actions', label: 'Actions', align: 'right',
            render: (d) => (
              <div className="flex items-center gap-2 justify-end flex-wrap">
                {(d.status === 'open' || d.status === 'investigating') && (
                  <>
                    {d.status === 'open' && (
                      <button
                        onClick={() => investigate(d)}
                        disabled={working === d.id}
                        className="rounded-full border border-blue-200 px-3 py-1 text-xs font-bold text-blue-700 hover:bg-blue-50 disabled:opacity-50"
                      >
                        Investigate
                      </button>
                    )}
                    <button
                      onClick={() => resolve(d)}
                      disabled={working === d.id}
                      className="rounded-full border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                    >
                      Resolve
                    </button>
                  </>
                )}
                {d.status === 'resolved' && (
                  <button
                    onClick={() => close(d)}
                    disabled={working === d.id}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Close
                  </button>
                )}
              </div>
            ),
          },
        ]}
        rows={disputes}
        empty="No disputes opened."
      />
    </Card>
  );
};

export default DisputesTab;
