import React, { useCallback, useEffect, useState } from 'react';
import { Link, useOutletContext, useNavigate, useParams } from 'react-router-dom';
import { FileText, ShieldCheck, Clock, AlertCircle, CheckCircle2, LoaderCircle, ArrowLeft, FilePlus } from 'lucide-react';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';

const inputClass = 'block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20';

const STATUS_CLASSES = {
  quoted: 'border-amber-200 bg-amber-50 text-amber-700',
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  expired: 'border-red-200 bg-red-50 text-red-700',
  cancelled: 'border-slate-200 bg-slate-100 text-slate-600',
};

const InsurancePage = () => {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const { jobId } = useParams();
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const [coverageAmount, setCoverageAmount] = useState('');
  const [selectedJobId, setSelectedJobId] = useState(jobId || '');
  const [availableJobs, setAvailableJobs] = useState([]);
  const [claims, setClaims] = useState([]);
  const [filingClaim, setFilingClaim] = useState(false);
  const [claimPolicyId, setClaimPolicyId] = useState('');
  const [claimDescription, setClaimDescription] = useState('');
  const [claimAmount, setClaimAmount] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    const [{ data: policyRows }, { data: jobRows }, { data: claimRows }] = await Promise.all([
      supabase
        .from('insurance_policies')
        .select('*, jobs(job_number, title, status)')
        .order('created_at', { ascending: false }),
      supabase
        .from('jobs')
        .select('id, job_number, title, status')
        .eq('client_id', user.id)
        .in('status', ['posted', 'matching', 'offered', 'confirmed'])
        .order('created_at', { ascending: false }),
      supabase
        .from('insurance_claims')
        .select('*, insurance_policies(policy_number, coverage_amount)')
        .eq('filed_by', user.id)
        .order('created_at', { ascending: false }),
    ]);
    setPolicies(policyRows || []);
    setAvailableJobs(jobRows || []);
    setClaims(claimRows || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const requestInsurance = async () => {
    if (!selectedJobId) {
      setError('Please select a job.');
      return;
    }
    const amount = coverageAmount ? parseFloat(coverageAmount) : null;
    setRequesting(true);
    setError('');
    const { data, error: rpcError } = await supabase.rpc('request_job_insurance', {
      target_job_id: selectedJobId,
      coverage_amount: amount,
    });
    if (rpcError) {
      setError(rpcError.message);
      setRequesting(false);
      return;
    }
    setFlash('Insurance quote requested. A compliance officer will review it shortly.');
    setRequesting(false);
    setCoverageAmount('');
    await load();
  };

  const fileInsuranceClaim = async () => {
    if (!claimPolicyId || !claimDescription || !claimAmount) {
      setError('Please fill in all claim fields.');
      return;
    }
    const amount = parseFloat(claimAmount);
    if (!amount || amount <= 0) {
      setError('Please enter a valid claim amount.');
      return;
    }
    setFilingClaim(true);
    setError('');
    const { data, error: rpcError } = await supabase.rpc('file_insurance_claim', {
      target_policy_id: claimPolicyId,
      description: claimDescription.trim(),
      claimed_amount: amount,
    });
    if (rpcError) {
      setError(rpcError.message);
      setFilingClaim(false);
      return;
    }
    setFlash('Insurance claim filed successfully.');
    setFilingClaim(false);
    setClaimPolicyId('');
    setClaimDescription('');
    setClaimAmount('');
    await load();
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-navy">Insurance</h1>
          <p className="mt-1 text-sm text-slate-500">
            Request cargo &amp; liability coverage for your jobs and track policy status.
          </p>
        </div>
        <Link
          to="/dashboard/bookings"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-brand-navy"
        >
          <ArrowLeft className="h-4 w-4" /> Back to bookings
        </Link>
      </header>
      {loading && (
        <div className="py-20 text-center text-sm text-slate-400" role="status">
          <LoaderCircle size={24} className="animate-spin" /> Loading policies…
        </div>
      )}

      {!loading && (
        <>
          <section aria-label="Request insurance" className="rounded-lg border border-slate-200 bg-white p-5 sm:p-7">
            <h2 className="text-lg font-bold text-brand-navy">Request insurance quote</h2>
            <p className="mt-1 text-sm text-slate-500">
              Choose an active job and the coverage amount you need. We’ll generate a quote for review.
            </p>

            {availableJobs.length === 0 && (
              <p className="mt-4 text-sm text-slate-400 italic">
                No active jobs available for insurance. Post or accept a job first.
              </p>
            )}

            <form onSubmit={(e) => { e.preventDefault(); requestInsurance(); }} className="mt-5 space-y-4 grid gap-4 sm:grid-cols-2 sm:items-end">
              <label className="block space-y-1 text-sm font-medium text-slate-700">
                Job
                <select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  disabled={!user || availableJobs.length === 0}
                  className={inputClass}
                >
                  <option value="">Select a job</option>
                  {availableJobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      #{job.job_number} · {job.title} ({job.status})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-1 text-sm font-medium text-slate-700">
                Coverage amount (ETB)
                <input
                  type="number"
                  value={coverageAmount}
                  onChange={(e) => setCoverageAmount(e.target.value)}
                  placeholder="e.g. 50000"
                  disabled={!user || availableJobs.length === 0}
                  className={inputClass}
                />
              </label>

              <div className="col-span-full sm:col-span-2 flex justify-end">
                <Button
                  type="submit"
                  disabled={requesting || !selectedJobId || !user}
                  className="gap-2 w-full sm:w-auto"
                >
                  {requesting ? <LoaderCircle size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                  {requesting ? 'Requesting…' : 'Request quote'}
                </Button>
              </div>
            </form>
          </section>
          <section aria-label="My policies" className="rounded-lg border border-slate-200 bg-white p-5 sm:p-7">
            <h2 className="text-lg font-bold text-brand-navy">My insurance policies</h2>
            {policies.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400 italic">No insurance policies yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {policies.map((policy) => (
                  <div
                    key={policy.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div>
                      <p className="font-semibold text-brand-navy">
                        Job #{policy.jobs?.job_number || 'N/A'} · {policy.jobs?.title || 'Job'}
                      </p>
                      <p className="text-xs text-slate-500">Provider: {policy.provider}</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 text-xs">
                      <span
                        className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${STATUS_CLASSES[policy.status] || STATUS_CLASSES.expired}`}
                      >
                        {policy.status}
                      </span>
                      {policy.policy_number && (
                        <span className="text-slate-500">Policy #{policy.policy_number}</span>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 text-xs mt-2 sm:mt-0">
                      <span className="text-slate-500">Coverage: {new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(policy.coverage_amount)}</span>
                      {policy.premium && <span className="text-slate-500">Premium: {new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(policy.premium)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section aria-label="File insurance claim" className="mt-6 rounded-lg border border-slate-200 bg-white p-5 sm:p-7">
            <h2 className="text-lg font-bold text-brand-navy">File insurance claim</h2>
            <p className="mt-1 text-sm text-slate-500">Submit a claim against an active insurance policy.</p>
            <form onSubmit={(e) => { e.preventDefault(); fileInsuranceClaim(); }} className="mt-5 space-y-4 grid gap-4 sm:grid-cols-2 sm:items-end">
              <label className="block space-y-1 text-sm font-medium text-slate-700">
                Policy
                <select value={claimPolicyId} onChange={(e) => setClaimPolicyId(e.target.value)} className={inputClass}>
                  <option value="">Select a policy</option>
                  {policies.filter((p) => p.status === 'active').map((policy) => (
                    <option key={policy.id} value={policy.id}>
                      Policy #{policy.policy_number} · Job #{policy.jobs?.job_number}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1 text-sm font-medium text-slate-700">
                Claim amount (ETB)
                <input type="number" min="0" step="100" value={claimAmount} onChange={(e) => setClaimAmount(e.target.value)} placeholder="0" className={inputClass} />
              </label>
              <label className="block space-y-1 text-sm font-medium text-slate-700 sm:col-span-2">
                Description
                <textarea value={claimDescription} onChange={(e) => setClaimDescription(e.target.value)} rows={2} placeholder="Describe the incident and damage" className={inputClass} />
              </label>
              <div className="col-span-full sm:col-span-2 flex justify-end">
                <Button type="submit" disabled={filingClaim || !claimPolicyId || !claimDescription || !claimAmount} className="gap-2 w-full sm:w-auto">
                  {filingClaim ? <LoaderCircle size={16} className="animate-spin" /> : <FilePlus size={16} />}
                  {filingClaim ? 'Filing…' : 'File claim'}
                </Button>
              </div>
            </form>
          </section>

          <section aria-label="My claims" className="mt-6 rounded-lg border border-slate-200 bg-white p-5 sm:p-7">
            <h2 className="text-lg font-bold text-brand-navy">My claims</h2>
            {claims.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400 italic">No claims filed yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {claims.map((claim) => (
                  <div key={claim.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div>
                      <p className="font-semibold text-brand-navy">
                        Claim {claim.claimed_amount ? new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(claim.claimed_amount) : 'Claim'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {claim.description} · {new Date(claim.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-slate-500">Policy #{claim.insurance_policies?.policy_number || 'N/A'}</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 text-xs">
                      <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${claim.status === 'approved' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : claim.status === 'rejected' ? 'border-red-200 bg-red-50 text-red-700' : claim.status === 'paid' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                        {claim.status}
                      </span>
                      {claim.approved_amount && (
                        <span className="text-slate-500">Approved: {new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(claim.approved_amount)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {error && (
            <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </p>
          )}
          {flash && (
            <p role="status" className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> {flash}
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default InsurancePage;