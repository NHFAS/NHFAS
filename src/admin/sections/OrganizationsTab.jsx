import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Badge, Card, DataTable, ErrorNote, Spinner, StatusBadge, fmtDate, loadProfilesMap } from './adminUi';

const orgTypeLabels = {
  logistics_company: 'Logistics company',
  artisan_guild: 'Artisan guild',
  other: 'Other',
};

const OrganizationsTab = ({ notify }) => {
  const [orgs, setOrgs] = useState([]);
  const [members, setMembers] = useState([]);
  const [names, setNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [working, setWorking] = useState(null);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [profileNames, { data: orgRows, error: orgError }, { data: memberRows, error: memberError }] = await Promise.all([
        loadProfilesMap(),
        supabase.from('organizations').select('id, name, organization_type, registration_number, status, created_by, created_at').order('created_at', { ascending: false }),
        supabase.from('organization_members').select('organization_id, user_id, member_role, joined_at'),
      ]);
      if (orgError) throw orgError;
      if (memberError) throw memberError;
      setNames(profileNames);
      setOrgs(orgRows || []);
      setMembers(memberRows || []);
    } catch (e) {
      setError(e.message || String(e));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const setStatus = async (orgId, status) => {
    setWorking(orgId);
    const { error: updateError } = await supabase.from('organizations').update({ status }).eq('id', orgId);
    setWorking(null);
    if (updateError) notify(`Organization update failed: ${updateError.message}`, 'red');
    else {
      notify(`Organization ${status === 'active' ? 'approved' : status}.`, 'emerald');
      setTick((t) => t + 1);
    }
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorNote>{error}</ErrorNote>;

  const memberCount = (orgId) => members.filter((m) => m.organization_id === orgId).length;

  return (
    <div className="space-y-6">
      <Card title="Organizations" subtitle={`${orgs.length} registered organization(s)`}>
        <DataTable
          columns={[
            {
              key: 'name', label: 'Organization',
              render: (o) => (
                <div>
                  <p className="font-semibold text-red-900">{o.name}</p>
                  <p className="text-xs text-red-500">{orgTypeLabels[o.organization_type] || o.organization_type}</p>
                </div>
              ),
            },
            { key: 'reg', label: 'Registration #', render: (o) => o.registration_number || '—' },
            { key: 'members', label: 'Members', render: (o) => memberCount(o.id) },
            { key: 'status', label: 'Status', render: (o) => <StatusBadge value={o.status} /> },
            { key: 'created_by', label: 'Created by', render: (o) => names[o.created_by] || '—' },
            { key: 'created_at', label: 'Created', render: (o) => fmtDate(o.created_at) },
            {
              key: 'actions', label: 'Actions', align: 'right',
              render: (o) => (
                <div className="flex items-center gap-2 justify-end">
                  {o.status !== 'active' && (
                    <button
                      onClick={() => setStatus(o.id, 'active')}
                      disabled={working === o.id}
                      className="rounded-full border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                    >
                      Approve
                    </button>
                  )}
                  {o.status === 'active' && (
                    <button
                      onClick={() => setStatus(o.id, 'suspended')}
                      disabled={working === o.id}
                      className="rounded-full border border-amber-200 px-3 py-1 text-xs font-bold text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                    >
                      Suspend
                    </button>
                  )}
                </div>
              ),
            },
          ]}
          rows={orgs}
          empty="No organizations registered yet."
        />
      </Card>

      <Card title="Organization members" subtitle={`${members.length} membership record(s)`}>
        <DataTable
          columns={[
            { key: 'organization_id', label: 'Organization', render: (m) => orgs.find((o) => o.id === m.organization_id)?.name || '—' },
            { key: 'user_id', label: 'Member', render: (m) => names[m.user_id] || '—' },
            {
              key: 'member_role', label: 'Role',
              render: (m) => (
                <Badge tone={m.member_role === 'owner' ? 'red' : m.member_role === 'manager' ? 'blue' : 'slate'}>
                  {m.member_role}
                </Badge>
              ),
            },
            { key: 'joined_at', label: 'Joined', render: (m) => fmtDate(m.joined_at) },
          ]}
          rows={members}
          empty="No organization members yet."
          rowKey="user_id"
        />
      </Card>
    </div>
  );
};

export default OrganizationsTab;
