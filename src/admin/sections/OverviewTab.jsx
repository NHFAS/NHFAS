import React, { useCallback, useState } from 'react';
import { AlertCircle, Briefcase, Building2, Gavel, Landmark, ShieldCheck, Users as UsersIcon, Wallet } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Card, DataTable, ErrorNote, Spinner, fmtDate, loadProfilesMap } from './adminUi';

// Counts rows in a table, optionally applying one filter.
// `filter` is a single tuple: ['eq', 'status', 'pending'].
const count = async (table, filter = null) => {
  let q = supabase.from(table).select('*', { count: 'exact', head: true });
  if (filter) {
    const [op, col, val] = filter;
    if (typeof q[op] !== 'function') throw new Error(`Unsupported filter "${op}" on ${table}`);
    q = q[op](col, val);
  }
  const { count: n, error } = await q;
  if (error) throw error;
  return n || 0;
};

const OverviewTab = ({ notify }) => {
  const [stats, setStats] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [names, setNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [totalUsers, totalJobs, pendingVerifications, pendingPermits, openIncidents, sosIncidents,
        totalOrgs, openDisputes, pendingPayouts, submittedFinancing, openAuctions, profileNames] = await Promise.all([
        count('profiles'),
        count('jobs'),
        count('provider_verifications', ['eq', 'status', 'pending']),
        count('regulatory_permits', ['eq', 'status', 'pending']),
        count('safety_incidents', ['eq', 'status', 'open']),
        count('safety_incidents', ['eq', 'emergency_sos', true]),
        count('organizations'),
        count('disputes', ['eq', 'status', 'open']),
        count('payouts', ['eq', 'status', 'pending']),
        count('financing_requests', ['eq', 'status', 'submitted']),
        count('auction_listings', ['eq', 'status', 'open']),
        loadProfilesMap(),
      ]);
      setStats({
        totalUsers, totalJobs, pendingVerifications, pendingPermits, openIncidents, sosIncidents,
        totalOrgs, openDisputes, pendingPayouts, submittedFinancing, openAuctions,
      });
      setNames(profileNames);
      const { data: ratingRows, error: ratingError } = await supabase
        .from('ratings')
        .select('id, stars, comment, rater_id, ratee_id, created_at')
        .order('created_at', { ascending: false })
        .limit(10);
      if (ratingError) throw ratingError;
      setRatings(ratingRows || []);
    } catch (e) {
      setError(e.message || String(e));
      if (notify) notify(`Overview could not be loaded: ${e.message}`, 'red');
    }
    setLoading(false);
  }, [notify]);

  React.useEffect(() => { load(); }, [tick]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <Spinner />;
  if (error) return <ErrorNote>{error}</ErrorNote>;

  const cards = [
    { label: 'Total users', value: stats.totalUsers, icon: UsersIcon, color: 'text-red-600' },
    { label: 'Total jobs', value: stats.totalJobs, icon: Briefcase, color: 'text-blue-600' },
    { label: 'Organizations', value: stats.totalOrgs, icon: Building2, color: 'text-purple-600' },
    { label: 'Pending verifications', value: stats.pendingVerifications, icon: ShieldCheck, color: 'text-amber-600' },
    { label: 'Pending permits', value: stats.pendingPermits, icon: ShieldCheck, color: 'text-amber-600' },
    { label: 'Open incidents', value: stats.openIncidents, icon: AlertCircle, color: 'text-red-600' },
    { label: 'SOS alerts', value: stats.sosIncidents, icon: AlertCircle, color: 'text-red-700' },
    { label: 'Open disputes', value: stats.openDisputes, icon: AlertCircle, color: 'text-amber-600' },
    { label: 'Open auctions', value: stats.openAuctions, icon: Gavel, color: 'text-blue-600' },
    { label: 'Pending payouts', value: stats.pendingPayouts, icon: Wallet, color: 'text-amber-600' },
    { label: 'Financing requested', value: stats.submittedFinancing, icon: Landmark, color: 'text-purple-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
        {cards.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-red-100 bg-white p-5">
            <div className="flex items-center justify-between mb-3">
              <span className={`text-xs font-semibold uppercase tracking-wide ${stat.color}`}>{stat.label}</span>
              <stat.icon className="h-5 w-5 text-red-200" aria-hidden="true" />
            </div>
            <p className="text-3xl font-bold text-red-900">{stat.value}</p>
          </div>
        ))}
      </div>

      <Card title="Recent ratings" subtitle="Latest feedback left on completed jobs">
        <DataTable
          columns={[
            { key: 'stars', label: 'Stars', render: (r) => `${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}` },
            { key: 'rater', label: 'From', render: (r) => names[r.rater_id] || '—' },
            { key: 'ratee', label: 'To', render: (r) => names[r.ratee_id] || '—' },
            { key: 'comment', label: 'Comment', render: (r) => <span className="line-clamp-2">{r.comment || '—'}</span> },
            { key: 'created_at', label: 'Date', render: (r) => fmtDate(r.created_at) },
          ]}
          rows={ratings}
          empty="No ratings yet."
        />
      </Card>
    </div>
  );
};

export default OverviewTab;
