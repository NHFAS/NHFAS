import React, { useCallback, useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { AdminButton as Button } from './adminUi';
import { supabase } from '../../lib/supabase';
import { Badge, DataTable, ErrorNote, Spinner, fmtDate } from './adminUi';

const roleMeta = {
  admin: { label: 'Administrator', tone: 'red' },
  service_provider: { label: 'Service Provider', tone: 'emerald' },
  heavy_operator: { label: 'Heavy Operator', tone: 'amber' },
  fleet_manager: { label: 'Fleet Manager', tone: 'blue' },
  client: { label: 'Client', tone: 'slate' },
};

const statusMeta = {
  active: { label: 'Active', tone: 'emerald' },
  suspended: { label: 'Suspended', tone: 'amber' },
  pending: { label: 'Pending', tone: 'slate' },
  closed: { label: 'Closed', tone: 'slate' },
};

const kycMeta = {
  approved: { label: 'KYC ✓', tone: 'emerald' },
  pending: { label: 'KYC pending', tone: 'amber' },
  rejected: { label: 'KYC rejected', tone: 'red' },
  expired: { label: 'KYC expired', tone: 'slate' },
};

const UsersTab = ({ user, notify }) => {
  const [users, setUsers] = useState([]);
  const [kycByUser, setKycByUser] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [working, setWorking] = useState(null);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [{ data: allUsers }, { data: kycRows }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email, role, status, created_at').order('created_at', { ascending: false }),
      supabase.from('provider_profiles').select('user_id, kyc_status'),
    ]);
    setUsers(allUsers || []);
    const kycMap = {};
    (kycRows || []).forEach((r) => { kycMap[r.user_id] = r.kyc_status; });
    setKycByUser(kycMap);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (label, fn, targetId) => {
    setWorking(targetId);
    const { error: actError } = await fn();
    setWorking(null);
    if (actError) notify(`${label} failed: ${actError.message}`, 'red');
    else {
      notify(`${label} succeeded.`, 'emerald');
      setTick((t) => t + 1);
    }
  };

  const changeRole = (targetId, newRole) =>
    act('Role change', () => supabase.rpc('update_user_role', { target_user_id: targetId, new_role: newRole }), targetId);
  const banUser = (targetId) =>
    act('Suspension', () => supabase.rpc('ban_user', { target_user_id: targetId }), targetId);
  const unbanUser = (targetId) =>
    act('Reinstate', () => supabase.rpc('unban_user', { target_user_id: targetId }), targetId);
  const deleteUser = (targetId) => {
    if (!window.confirm('Delete this user? This cannot be undone.')) return;
    act('Deletion', () => supabase.rpc('delete_user', { target_user_id: targetId }), targetId);
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorNote>{error}</ErrorNote>;
  return (
    <DataTable
      columns={[
        {
          key: 'user', label: 'User',
          render: (u) => (
            <div>
              <p className="font-semibold text-red-900">{u.full_name}</p>
              <p className="text-xs text-red-500">{u.email || '—'}</p>
            </div>
          ),
        },
        {
          key: 'role', label: 'Role',
          render: (u) => {
            const meta = roleMeta[u.role] || roleMeta.client;
            return <Badge tone={meta.tone}>{meta.label}</Badge>;
          },
        },
        {
          key: 'status', label: 'Status',
          render: (u) => {
            const meta = statusMeta[u.status] || statusMeta.pending;
            return <Badge tone={meta.tone}>{meta.label}</Badge>;
          },
        },
        {
          key: 'kyc', label: 'KYC',
          render: (u) => {
            const kyc = kycByUser[u.id];
            if (!kyc) return <span className="text-xs text-slate-400">—</span>;
            const m = kycMeta[kyc] || kycMeta.pending;
            return <Badge tone={m.tone}>{m.label}</Badge>;
          },
        },
        { key: 'created_at', label: 'Joined', render: (u) => fmtDate(u.created_at) },
        {
          key: 'actions', label: 'Actions', align: 'right',
          render: (u) => {
            const isSelf = u.id === user.id;
            return (
              <div className="flex items-center gap-2 justify-end flex-wrap">
                {!isSelf && (
                  <Button
                    onClick={() => changeRole(u.id, u.role === 'admin' ? 'client' : 'admin')}
                    disabled={working === u.id}
                    variant="outline" size="sm"
                    className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
                  >
                    {u.role === 'admin' ? 'Demote' : 'Promote'}
                  </Button>
                )}
                {u.status === 'suspended' ? (
                  <Button
                    onClick={() => unbanUser(u.id)}
                    disabled={working === u.id}
                    variant="outline" size="sm"
                    className="gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                  >
                    Reinstate
                  </Button>
                ) : (
                  <Button
                    onClick={() => banUser(u.id)}
                    disabled={working === u.id || isSelf}
                    variant="outline" size="sm"
                    className="gap-1 text-amber-600 border-amber-200 hover:bg-amber-50"
                  >
                    Suspend
                  </Button>
                )}
                {!isSelf && (
                  <Button
                    onClick={() => deleteUser(u.id)}
                    disabled={working === u.id}
                    variant="outline" size="sm"
                    className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                )}
              </div>
            );
          },
        },
      ]}
      rows={users}
      empty="No users found."
    />
  );
};

export default UsersTab;
