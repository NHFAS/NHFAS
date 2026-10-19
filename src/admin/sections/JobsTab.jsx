import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { DataTable, ErrorNote, Spinner, StatusBadge, fmtMoney, loadProfilesMap } from './adminUi';
import JobDetail from './JobDetail';

const typeLabels = { artisan_service: 'Artisan', haulage: 'Haulage', custom_build: 'Custom build' };

const JobsTab = ({ notify }) => {
  const [jobs, setJobs] = useState([]);
  const [names, setNames] = useState({});
  const [categories, setCategories] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [profileNames, { data: catRows }, { data: jobRows, error: jobError }] = await Promise.all([
        loadProfilesMap(),
        supabase.from('service_categories').select('id, name'),
        supabase.from('jobs').select('id, job_number, title, job_type, status, availability_status, agreed_price, currency, client_id, provider_id, category_id, created_at')
          .order('created_at', { ascending: false }).limit(200),
      ]);
      if (jobError) throw jobError;
      const catMap = {};
      (catRows || []).forEach((c) => { catMap[c.id] = c.name; });
      setNames(profileNames);
      setCategories(catMap);
      setJobs(jobRows || []);
    } catch (e) {
      setError(e.message || String(e));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [tick]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <Spinner />;
  if (error) return <ErrorNote>{error}</ErrorNote>;

  return (
    <div className="space-y-4">
      <DataTable
        columns={[
          { key: 'job_number', label: '#', render: (j) => <span className="font-mono text-xs">#{j.job_number}</span> },
          { key: 'title', label: 'Title', render: (j) => <span className="font-semibold text-red-900">{j.title}</span> },
          { key: 'job_type', label: 'Type', render: (j) => typeLabels[j.job_type] || j.job_type },
          { key: 'category', label: 'Category', render: (j) => (j.category_id ? categories[j.category_id] || '—' : '—') },
          { key: 'status', label: 'Status', render: (j) => <StatusBadge value={j.status} /> },
          { key: 'client', label: 'Client', render: (j) => names[j.client_id] || '—' },
          { key: 'provider', label: 'Provider', render: (j) => (j.provider_id ? names[j.provider_id] || '—' : '—') },
          { key: 'price', label: 'Price', align: 'right', render: (j) => fmtMoney(j.agreed_price, j.currency) },
        ]}
        rows={jobs}
        empty="No jobs posted yet."
        onRowClick={(j) => setExpandedId(expandedId === j.id ? null : j.id)}
      />
      {expandedId && (
        <JobDetail jobId={expandedId} names={names} onClose={() => setExpandedId(null)} notify={notify} />
      )}
    </div>
  );
};

export default JobsTab;
