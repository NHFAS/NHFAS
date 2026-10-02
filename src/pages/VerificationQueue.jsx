import React, { useEffect, useState } from 'react';
import { Check, ExternalLink, LoaderCircle, ShieldCheck, X } from 'lucide-react';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';

const VerificationQueue = () => {
  const [role, setRole] = useState('');
  const [records, setRecords] = useState([]);
  const [permits, setPermits] = useState([]);
  const [notes, setNotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(null);
  const [error, setError] = useState('');

  const loadRecords = async () => {
    const [{ data, error: queryError }, { data: permitData, error: permitError }] = await Promise.all([
      supabase.from('provider_verifications').select('id, provider_id, verification_type, status, document_url, created_at')
        .eq('status', 'pending').order('created_at', { ascending: true }),
      supabase.from('regulatory_permits').select('id, job_id, permit_type, permit_number, issuing_authority, valid_until, created_at')
        .eq('status', 'pending').order('created_at', { ascending: true }),
    ]);
    if (queryError || permitError) setError(queryError?.message || permitError?.message);
    else {
      setRecords(data || []);
      setPermits(permitData || []);
    }
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (!mounted) return;
      setRole(profile?.role || '');
      if (profile?.role === 'admin') await loadRecords();
      if (mounted) setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, []);

  const openDocument = async (path) => {
    const { data, error: linkError } = await supabase.storage.from('provider-verification').createSignedUrl(path, 60);
    if (linkError) setError(linkError.message);
    else window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  };

  const review = async (record, decision) => {
    setWorking(record.id);
    setError('');
    const { error: reviewError } = await supabase.rpc('review_provider_verification', {
      target_verification_id: record.id,
      decision,
      reviewer_notes: notes[record.id] || null,
      document_expires_at: null,
    });
    if (reviewError) setError(reviewError.message);
    else await loadRecords();
    setWorking(null);
  };

  const reviewPermit = async (permit, decision) => {
    setWorking(permit.id);
    setError('');
    const { error: reviewError } = await supabase.from('regulatory_permits')
      .update({ status: decision }).eq('id', permit.id);
    if (reviewError) setError(reviewError.message);
    else await loadRecords();
    setWorking(null);
  };

  if (loading) return <div className="py-16 text-sm text-slate-500">Loading verification queue...</div>;
  if (role !== 'admin') return <p className="border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-900">Administrator access is required to review provider documents.</p>;

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-8">
      <header className="border-b border-slate-200 pb-5">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-green">PLATFORM OPERATIONS</p>
        <h1 className="mt-2 flex items-center gap-3 text-3xl font-bold text-brand-navy"><ShieldCheck size={28} />Provider verification</h1>
        <p className="mt-2 text-sm text-slate-600">Review identity documents before granting job acceptance access.</p>
      </header>
      {error && <p className="border-l-4 border-red-600 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</p>}
      {records.length ? (
        <section className="divide-y divide-slate-200 border-y border-slate-200">
          {records.map((record) => (
            <article key={record.id} className="grid gap-4 py-5 md:grid-cols-[1fr_2fr]">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-brand-green">{record.verification_type.replace('_', ' ')}</p>
                <p className="mt-2 break-all text-sm font-semibold text-brand-navy">Account {record.provider_id}</p>
                <p className="mt-1 text-xs text-slate-500">Submitted {new Date(record.created_at).toLocaleString()}</p>
                <Button variant="outline" onClick={() => openDocument(record.document_url)} className="mt-3 h-9 gap-2 px-3 text-sm"><ExternalLink size={15} />Open private document</Button>
              </div>
              <div className="space-y-3">
                <label className="block space-y-1 text-sm font-medium text-slate-700">Review notes<textarea rows={2} value={notes[record.id] || ''} onChange={(event) => setNotes((current) => ({ ...current, [record.id]: event.target.value }))} className="w-full border border-slate-300 px-3 py-2 font-normal focus:border-brand-green focus:outline-none" /></label>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => review(record, 'approved')} disabled={working === record.id} className="h-9 gap-2 px-3 text-sm"><Check size={15} />Approve</Button>
                  <Button variant="outline" onClick={() => review(record, 'rejected')} disabled={working === record.id} className="h-9 gap-2 border-red-300 px-3 text-sm text-red-700 hover:bg-red-50"><X size={15} />Reject</Button>
                  {working === record.id && <LoaderCircle size={18} className="animate-spin self-center text-slate-500" />}
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <p className="border-y border-slate-200 py-12 text-center text-sm text-slate-500">No identity documents are waiting for review.</p>
      )}
      <section>
        <div className="border-b border-slate-200 pb-3"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">COMPLIANCE</p><h2 className="mt-1 text-xl font-bold text-brand-navy">Transport permits</h2></div>
        {permits.length ? <div className="divide-y divide-slate-200 border-b border-slate-200">{permits.map((permit) => <article key={permit.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-brand-navy">{permit.permit_type}{permit.permit_number ? ` · ${permit.permit_number}` : ''}</p><p className="mt-1 text-sm text-slate-600">Job {permit.job_id.slice(0, 8)} · {permit.issuing_authority || 'Issuing authority not provided'} · submitted {new Date(permit.created_at).toLocaleDateString()}</p>{permit.valid_until && <p className="mt-1 text-xs text-slate-500">Expiry: {new Date(permit.valid_until).toLocaleDateString()}</p>}</div><div className="flex gap-2"><Button onClick={() => reviewPermit(permit, 'approved')} disabled={working === permit.id} className="h-9 gap-2 px-3 text-sm"><Check size={15} />Approve</Button><Button variant="outline" onClick={() => reviewPermit(permit, 'rejected')} disabled={working === permit.id} className="h-9 gap-2 border-red-300 px-3 text-sm text-red-700 hover:bg-red-50"><X size={15} />Reject</Button></div></article>)}</div> : <p className="border-b border-slate-200 py-8 text-center text-sm text-slate-500">No transport permits are waiting for review.</p>}
      </section>
    </div>
  );
};

export default VerificationQueue;