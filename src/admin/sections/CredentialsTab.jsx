import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Card, DataTable, ErrorNote, Spinner, StatusBadge, fmtDate, loadProfilesMap } from './adminUi';

const certTypeLabels = { authenticity: 'Authenticity', completion: 'Completion', skill: 'Skill', apprenticeship: 'Apprenticeship' };

const CredentialsTab = ({ notify }) => {
  const [certificates, setCertificates] = useState([]);
  const [skills, setSkills] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [names, setNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [working, setWorking] = useState(null);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [profileNames, certRes, skillRes, enrRes] = await Promise.all([
        loadProfilesMap(),
        supabase.from('digital_certificates').select('id, owner_id, certificate_type, certificate_number, issued_at, revoked_at')
          .order('issued_at', { ascending: false }).limit(200),
        supabase.from('skill_certifications').select('id, provider_id, skill_name, issuing_body, issued_at, expires_at, status')
          .order('issued_at', { ascending: false }).limit(200),
        supabase.from('apprenticeship_enrollments').select('id, apprentice_id, mentor_id, skill_name, status, started_at, completed_at')
          .order('started_at', { ascending: false }).limit(200),
      ]);
      if (certRes.error) throw certRes.error;
      if (skillRes.error) throw skillRes.error;
      if (enrRes.error) throw enrRes.error;
      setNames(profileNames);
      setCertificates(certRes.data || []);
      setSkills(skillRes.data || []);
      setEnrollments(enrRes.data || []);
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
      <Card title="Digital certificates" subtitle={`${certificates.length} certificate(s)`}>
        <DataTable
          columns={[
            { key: 'certificate_number', label: 'Number', render: (c) => <span className="font-mono text-xs">{c.certificate_number}</span> },
            { key: 'owner', label: 'Owner', render: (c) => names[c.owner_id] || '—' },
            { key: 'certificate_type', label: 'Type', render: (c) => certTypeLabels[c.certificate_type] || c.certificate_type },
            { key: 'issued_at', label: 'Issued', render: (c) => fmtDate(c.issued_at) },
            {
              key: 'revoked', label: 'Status',
              render: (c) => (c.revoked_at ? <StatusBadge value="revoked" /> : <StatusBadge value="active" />),
            },
            {
              key: 'actions', label: 'Actions', align: 'right',
              render: (c) => (c.revoked_at
                ? actionBtn(c.id, 'Restore', 'border-emerald-200 text-emerald-700 hover:bg-emerald-50',
                  () => act('digital_certificates', c.id, { revoked_at: null }, 'Certificate restored'))
                : actionBtn(c.id, 'Revoke', 'border-red-200 text-red-600 hover:bg-red-50',
                  () => act('digital_certificates', c.id, { revoked_at: new Date().toISOString() }, 'Certificate revoked'))),
            },
          ]}
          rows={certificates}
          empty="No certificates issued."
        />
      </Card>
      <Card title="Skill certifications" subtitle={`${skills.length} record(s)`}>
        <DataTable
          columns={[
            { key: 'provider_id', label: 'Provider', render: (s) => names[s.provider_id] || '—' },
            { key: 'skill_name', label: 'Skill', render: (s) => <span className="font-semibold text-red-900">{s.skill_name}</span> },
            { key: 'issuing_body', label: 'Issued by', render: (s) => s.issuing_body || '—' },
            { key: 'expires_at', label: 'Expires', render: (s) => fmtDate(s.expires_at) },
            { key: 'status', label: 'Status', render: (s) => <StatusBadge value={s.status} /> },
            {
              key: 'actions', label: 'Actions', align: 'right',
              render: (s) => (
                <div className="flex items-center gap-2 justify-end flex-wrap">
                  {s.status !== 'verified' && actionBtn(s.id, 'Verify', 'border-emerald-200 text-emerald-700 hover:bg-emerald-50',
                    () => act('skill_certifications', s.id, { status: 'verified' }, 'Skill verified'))}
                  {s.status === 'pending' && actionBtn(s.id, 'Reject', 'border-red-200 text-red-600 hover:bg-red-50',
                    () => act('skill_certifications', s.id, { status: 'rejected' }, 'Skill rejected'))}
                </div>
              ),
            },
          ]}
          rows={skills}
          empty="No skill certifications."
        />
      </Card>

      <Card title="Apprenticeship enrollments" subtitle={`${enrollments.length} enrollment(s)`}>
        <DataTable
          columns={[
            { key: 'apprentice_id', label: 'Apprentice', render: (e) => names[e.apprentice_id] || '—' },
            { key: 'mentor_id', label: 'Mentor', render: (e) => (e.mentor_id ? names[e.mentor_id] || '—' : '—') },
            { key: 'skill_name', label: 'Skill', render: (e) => e.skill_name },
            { key: 'started_at', label: 'Started', render: (e) => fmtDate(e.started_at) },
            { key: 'completed_at', label: 'Completed', render: (e) => fmtDate(e.completed_at) },
            { key: 'status', label: 'Status', render: (e) => <StatusBadge value={e.status} /> },
            {
              key: 'actions', label: 'Actions', align: 'right',
              render: (e) => (e.status === 'active'
                ? actionBtn(e.id, 'Mark completed', 'border-emerald-200 text-emerald-700 hover:bg-emerald-50',
                  () => act('apprenticeship_enrollments', e.id, { status: 'completed', completed_at: new Date().toISOString().slice(0, 10) }, 'Enrollment completed'))
                : '—'),
            },
          ]}
          rows={enrollments}
          empty="No apprenticeship enrollments."
        />
      </Card>

    </div>
  );
};

export default CredentialsTab;
