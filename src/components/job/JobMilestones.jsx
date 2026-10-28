import React, { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Bell, CheckCircle2, FileText, LoaderCircle, Signature, Upload } from 'lucide-react';
import { Link, useOutletContext } from 'react-router-dom';
import { Button } from '../Button';
import { supabase } from '../../lib/supabase';

const statusMeta = {
  pending: { label: 'Pending', className: 'text-slate-500' },
  submitted: { label: 'Proof Submitted', className: 'text-brand-green' },
  approved: { label: 'Approved', className: 'text-emerald-700' },
  released: { label: 'Released', className: 'text-emerald-700' },
  rejected: { label: 'Rejected', className: 'text-red-600' },
};

const inputClass = 'block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20';

const DEFAULT_MILESTONE_STAGES = [
  { title: 'Material Sourcing', description: 'Source and procure raw materials for the custom build', sequence: 1 },
  { title: 'Structural Build', description: 'Complete structural construction and assembly', sequence: 2 },
  { title: 'Final Delivery', description: 'Final delivery and handover of completed build', sequence: 3 },
];

const JobMilestones = ({ job, user }) => {
  const [milestones, setMilestones] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const [working, setWorking] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [signoffSignature, setSignoffSignature] = useState('');

  const isClient = job.client_id === user.id;
  const isProvider = job.provider_id === user.id;

  useEffect(() => {
    let isCurrent = true;
    const loadEscrow = async () => {
      if (!job?.id) return;
      setIsLoading(true);
      setError('');
      const { data: escrowRows } = await supabase
        .from('escrow_accounts')
        .select('id')
        .eq('job_id', job.id)
        .maybeSingle();
      if (!isCurrent) return;
      if (escrowRows) {
        const { data: msRows, error: msError } = await supabase
          .from('escrow_milestones')
          .select('*')
          .eq('escrow_id', escrowRows.id)
          .order('sequence_number', { ascending: true });
        if (msError) setError(msError.message);
        else setMilestones(msRows || []);
      }
      setIsLoading(false);
    };
    loadEscrow();
    return () => { isCurrent = false; };
  }, [job]);
  const createDefaultStages = async () => {
    if (milestones.length > 0) {
      setError('Milestones already exist for this job.');
      return;
    }
    setWorking('create');
    setError('');
    const { data: escrowRows } = await supabase
      .from('escrow_accounts')
      .select('id')
      .eq('job_id', job.id)
      .maybeSingle();
    if (!escrowRows) {
      setError('No escrow account found for this job. Fund escrow first.');
      setWorking(null);
      return;
    }
    for (const stage of DEFAULT_MILESTONE_STAGES) {
      const { error: createError } = await supabase.rpc('create_escrow_milestone', {
        target_escrow_id: escrowRows.id,
        milestone_title: stage.title,
        milestone_description: stage.description,
        milestone_amount: 0,
        milestone_sequence: stage.sequence,
      });
      if (createError) {
        setError(createError.message);
        setWorking(null);
        return;
      }
    }
    setFlash('Default milestone stages created (Material Sourcing, Structural Build, Final Delivery).');
    setWorking(null);
    const { data: msRows } = await supabase
      .from('escrow_milestones')
      .select('*')
      .eq('escrow_id', escrowRows.id)
      .order('sequence_number', { ascending: true });
    setMilestones(msRows || []);
  };

  const createMilestone = async () => {
    if (!newTitle.trim() || !newAmount) {
      setError('Title and amount are required.');
      return;
    }
    setWorking('create');
    setError('');
    setFlash('');
    const { data: escrowRows } = await supabase
      .from('escrow_accounts')
      .select('id')
      .eq('job_id', job.id)
      .maybeSingle();
    if (!escrowRows) {
      setError('No escrow account found for this job. Fund escrow first.');
      setWorking(null);
      return;
    }
    const nextSeq = (milestones.length || 0) + 1;
    const { error: createError } = await supabase.rpc('create_escrow_milestone', {
      target_escrow_id: escrowRows.id,
      milestone_title: newTitle.trim(),
      milestone_description: newDescription.trim() || null,
      milestone_amount: Number(newAmount),
      milestone_sequence: nextSeq,
    });
    if (createError) setError(createError.message);
    else {
      setNewTitle(''); setNewAmount(''); setNewDescription('');
      setFlash('Milestone created.');
    }
    setWorking(null);
    const { data: msRows } = await supabase
      .from('escrow_milestones')
      .select('*')
      .eq('escrow_id', escrowRows.id)
      .order('sequence_number', { ascending: true });
    setMilestones(msRows || []);
  };

  const submitProof = async (milestone) => {
    if (!proofFile) return;
    setWorking(milestone.id);
    setError('');
    setFlash('');
    const extension = proofFile.type === 'image/png' ? 'png' : 'jpg';
    const path = `${milestone.id}/proof-${Date.now()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from('job-documents').upload(path, proofFile, {
      contentType: proofFile.type, cacheControl: '3600', upsert: false,
    });
    if (uploadError) {
      setError(uploadError.message);
      setWorking(null);
      return;
    }
    const { data: signedData } = await supabase.storage.from('job-documents').createSignedUrl(path, 300);
    const { error: submitError } = await supabase.rpc('submit_milestone_proof', {
      target_milestone_id: milestone.id,
      proof_document_url: signedData.signedUrl,
      proof_description: `Proof for milestone: ${milestone.title}`,
    });
    if (submitError) {
      await supabase.storage.from('job-documents').remove([path]);
      setError(submitError.message);
    } else {
      setFlash('Proof of work submitted for client review.');
      setProofFile(null);
    }
    setWorking(null);
    const { data: msRows } = await supabase
      .from('escrow_milestones')
      .select('*')
      .eq('escrow_id', milestone.escrow_id)
      .order('sequence_number', { ascending: true });
    setMilestones(msRows || []);
  };

  const approveMilestone = async (milestone) => {
    setWorking(milestone.id);
    setError('');
    setFlash('');
    const { error: approveError } = await supabase.rpc('approve_milestone', {
      target_milestone_id: milestone.id,
    });
    if (approveError) setError(approveError.message);
    else setFlash('Milestone approved. Ready for payment release.');
    setWorking(null);
    const { data: msRows } = await supabase
      .from('escrow_milestones')
      .select('*')
      .eq('escrow_id', milestone.escrow_id)
      .order('sequence_number', { ascending: true });
    setMilestones(msRows || []);
  };

  const rejectMilestone = async (milestone) => {
    const reason = window.prompt('Why is this milestone being rejected? The provider will see your reason.');
    if (!reason || reason.trim().length < 3) return;
    setWorking(milestone.id);
    setError('');
    setFlash('');
    const { error: rejectError } = await supabase.rpc('reject_milestone', {
      target_milestone_id: milestone.id,
      reject_reason: reason.trim(),
    });
    if (rejectError) setError(rejectError.message);
    else setFlash('Milestone rejected. The provider has been notified with your reason.');
    setWorking(null);
    const { data: msRows } = await supabase
      .from('escrow_milestones')
      .select('*')
      .eq('escrow_id', milestone.escrow_id)
      .order('sequence_number', { ascending: true });
    setMilestones(msRows || []);
  };

  const releaseMilestone = async (milestone) => {
    if (!signoffSignature.trim()) {
      setError('Please provide your digital signature to confirm milestone sign-off.');
      return;
    }
    setWorking(milestone.id);
    setError('');
    setFlash('');
    const { error: releaseError } = await supabase.rpc('release_milestone_payment', {
      target_milestone_id: milestone.id,
      client_signature: signoffSignature,
    });
    if (releaseError) setError(releaseError.message);
    else setFlash('Milestone payment released to provider.');
    setWorking(null);
    const { data: msRows } = await supabase
      .from('escrow_milestones')
      .select('*')
      .eq('escrow_id', milestone.escrow_id)
      .order('sequence_number', { ascending: true });
    setMilestones(msRows || []);
  };
  const meta = (m) => statusMeta[m.status] || statusMeta.pending;

  return (
    <section aria-label="Milestone escrow" className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-3 mb-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-brand-green">
          <FileText className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-bold text-brand-navy">Milestone Escrow</h2>
          <p className="text-sm text-slate-500">Multi-stage payment release with proof-of-work capture.</p>
        </div>
      </div>

      {error && <p role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p>}
      {flash && <p role="status" className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">{flash}</p>}

      {!isClient ? (
        <p className="text-sm text-slate-500">Milestones are created and approved by the client.</p>
      ) : (
        <>
          <div className="mb-5 space-y-3 border-t border-slate-100 pt-4">
            <h3 className="text-sm font-bold text-brand-navy">Create Milestone</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block space-y-1 text-sm font-medium text-slate-700">
                Title
                <input type="text" maxLength={200} value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Foundation work" className={inputClass} />
              </label>
              <label className="block space-y-1 text-sm font-medium text-slate-700">
                Amount (ETB)
                <input type="number" min="0.01" step="0.01" value={newAmount} onChange={(e) => setNewAmount(e.target.value)}
                  placeholder="0.00" className={inputClass} />
              </label>
              <label className="block space-y-1 text-sm font-medium text-slate-700">
                Description
                <input type="text" maxLength={500} value={newDescription} onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Optional notes" className={inputClass} />
              </label>
            </div>
            <Button onClick={createMilestone} disabled={working === 'create' || !newTitle.trim() || !newAmount} className="w-full gap-2">
              {working === 'create' ? <LoaderCircle size={16} className="animate-spin" /> : <FileText size={16} />}
              {working === 'create' ? 'Creating...' : 'Create Milestone'}
            </Button>
          </div>
        </>
      )}
            <div className="space-y-3">
        {milestones.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-slate-500 mb-4">No milestones yet.</p>
            {isClient && (
              <div className="flex flex-col gap-3">
                <Button onClick={createDefaultStages} disabled={working === 'create'} className="w-full sm:w-auto gap-2">
                  {working === 'create' ? <LoaderCircle size={16} className="animate-spin" /> : <Bell size={16} />}
                  Create default milestone stages
                </Button>
                <p className="text-[11px] text-slate-400">Material Sourcing → Structural Build → Final Delivery</p>
              </div>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {milestones.map((m) => (
              <li key={m.id} className="py-4 border-b border-slate-50 last:border-b-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-brand-navy">{m.title}</h4>
                    <p className="text-xs text-slate-500">{m.description || 'No description'}</p>
                    <p className="text-xs text-slate-500">#{m.sequence_number} · {Number(m.amount).toLocaleString()} ETB</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${meta(m).className}`}>
                      {meta(m).label}
                    </span>
                  </div>
                </div>

                {m.status === 'submitted' && isClient && (
                  <div className="mt-3 flex flex-col sm:flex-row gap-3">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-700">Proof of work submitted</p>
                      <button type="button" onClick={() => window.open(m.proof_document_url, '_blank', 'noopener,noreferrer')}
                        className="text-xs font-semibold text-brand-green hover:underline">
                        View proof document
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => approveMilestone(m)} disabled={working === m.id} variant="outline" className="gap-2">
                        {working === m.id ? <LoaderCircle size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                        Approve
                      </Button>
                      <Button onClick={() => rejectMilestone(m)} disabled={working === m.id} variant="outline" className="gap-2 border-red-300 text-red-700 hover:bg-red-50">
                        Reject proof
                      </Button>
                    </div>
                  </div>
                )}

                {m.status === 'approved' && isClient && (
                  <div className="mt-3 space-y-2">
                    <label className="block text-sm font-medium text-slate-700">Client digital signature (required for sign-off)</label>
                    <textarea value={signoffSignature} onChange={(e) => setSignoffSignature(e.target.value)}
                      placeholder="Type your full name as digital signature"
                      rows={2} className={inputClass} />
                    <Button onClick={() => releaseMilestone(m)} disabled={working === m.id || !signoffSignature.trim()} className="gap-2">
                      {working === m.id ? <LoaderCircle size={16} className="animate-spin" /> : <Signature size={16} />}
                      Release Payment
                    </Button>
                  </div>
                )}

                {m.status === 'released' && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" /> Payment released to provider
                  </div>
                )}

                {isProvider && m.status === 'pending' && (
                  <div className="mt-3 flex flex-col sm:flex-row gap-3">
                    <label className="block sm:mb-0 text-sm font-medium text-slate-700">
                      Upload proof of work
                    </label>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border-2 border-brand-navy px-4 py-2 text-sm font-semibold text-brand-navy hover:bg-slate-50">
                      <Upload size={14} /> {proofFile ? proofFile.name : 'Choose photo (JPG/PNG)'}
                      <input type="file" accept="image/jpeg,image/png" className="sr-only"
                        onChange={(e) => { setProofFile(e.target.files?.[0] || null); e.target.value = ''; }} />
                    </label>
                    <Button onClick={() => submitProof(m)} disabled={!proofFile || working === m.id} className="gap-2">
                      {working === m.id ? <LoaderCircle size={16} className="animate-spin" /> : <FileText size={16} />}
                      Submit Proof
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

export default JobMilestones;


