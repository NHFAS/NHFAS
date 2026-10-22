import React, { useCallback, useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { ShieldCheck, FileText, GraduationCap, AlertCircle, CheckCircle2, LoaderCircle, ArrowLeft } from 'lucide-react';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';

const inputClass = 'block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20';

const CertificatesPage = () => {
  const { user } = useOutletContext();
  const [certificates, setCertificates] = useState([]);
  const [skillCerts, setSkillCerts] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const [certType, setCertType] = useState('completion');
  const [jobIdForCert, setJobIdForCert] = useState('');
  const [skillName, setSkillName] = useState('');
  const [mentorId, setMentorId] = useState('');
  const [availableJobs, setAvailableJobs] = useState([]);
  const [mentors, setMentors] = useState([]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    const [{ data: certRows }, { data: skillRows }, { data: enrollRows }, { data: jobRows }, { data: mentorRows }] = await Promise.all([
      supabase.from('digital_certificates').select('*').eq('owner_id', user.id).order('issued_at', { ascending: false }),
      supabase.from('skill_certifications').select('*').eq('provider_id', user.id).order('issued_at', { ascending: false }),
      supabase.from('apprenticeship_enrollments').select('*, mentor:profiles(full_name)').or(`apprentice_id.eq.${user.id},mentor_id.eq.${user.id}`).order('started_at', { ascending: false }),
      supabase.from('jobs').select('id, job_number, title, status').or(`client_id.eq.${user.id},provider_id.eq.${user.id}`).in('status', ['completed', 'confirmed', 'in_progress']).order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name, role').eq('role', 'provider').limit(20),
    ]);
    setCertificates(certRows || []);
    setSkillCerts(skillRows || []);
    setEnrollments(enrollRows || []);
    setAvailableJobs(jobRows || []);
    setMentors(mentorRows || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const issueCertificate = async () => {
    if (!jobIdForCert) {
      setError('Please select a job.');
      return;
    }
    setIssuing(true);
    setError('');
    const { data, error: rpcError } = await supabase.rpc('issue_job_certificate', {
      target_job_id: jobIdForCert,
      cert_type: certType,
    });
    if (rpcError) {
      setError(rpcError.message);
      setIssuing(false);
      return;
    }
    setFlash(`Certificate ${data.certificate_number} issued.`);
    setIssuing(false);
    setJobIdForCert('');
    await load();
  };

  const enrollApprenticeship = async () => {
    if (!skillName) {
      setError('Please enter a skill name.');
      return;
    }
    setEnrolling(true);
    setError('');
    const { error: rpcError } = await supabase.rpc('enroll_apprenticeship', {
      skill_name: skillName.trim(),
      mentor_id: mentorId || null,
    });
    if (rpcError) {
      setError(rpcError.message);
      setEnrolling(false);
      return;
    }
    setFlash('Apprenticeship enrollment created.');
    setEnrolling(false);
    setSkillName('');
    setMentorId('');
    await load();
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-navy">Certificates & Training</h1>
          <p className="mt-1 text-sm text-slate-500">View digital certificates, request certification, and manage apprenticeships.</p>
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
          <LoaderCircle size={24} className="animate-spin" /> Loading certificates...
        </div>
      )}

      {!loading && (
        <>
          <section aria-label="Request certificate" className="rounded-lg border border-slate-200 bg-white p-5 sm:p-7">
            <h2 className="text-lg font-bold text-brand-navy">Request job certificate</h2>
            <p className="mt-1 text-sm text-slate-500">Issue a digital completion or skill certificate for a finished job.</p>

            {availableJobs.length === 0 && (
              <p className="mt-4 text-sm text-slate-400 italic">No completed jobs available for certification.</p>
            )}

            <form
              onSubmit={(e) => { e.preventDefault(); issueCertificate(); }}
              className="mt-5 space-y-4 grid gap-4 sm:grid-cols-2 sm:items-end"
            >
              <label className="block space-y-1 text-sm font-medium text-slate-700">
                Job
                <select
                  value={jobIdForCert}
                  onChange={(e) => setJobIdForCert(e.target.value)}
                  disabled={availableJobs.length === 0}
                  className={inputClass}
                >
                  <option value="">Select a job</option>
                  {availableJobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      #{job.job_number} · {job.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1 text-sm font-medium text-slate-700">
                Certificate type
                <select
                  value={certType}
                  onChange={(e) => setCertType(e.target.value)}
                  className={inputClass}
                >
                  <option value="completion">Job completion</option>
                  <option value="skill">Skill certification</option>
                  <option value="authenticity">Authenticity</option>
                  <option value="apprenticeship">Apprenticeship</option>
                </select>
              </label>
              <div className="col-span-full sm:col-span-2 flex justify-end">
                <Button
                  type="submit"
                  disabled={issuing || !jobIdForCert}
                  className="gap-2 w-full sm:w-auto"
                >
                  {issuing ? <LoaderCircle size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                  {issuing ? 'Issuing...' : 'Issue certificate'}
                </Button>
              </div>
            </form>
          </section>

          <section aria-label="Digital certificates" className="mt-6 rounded-lg border border-slate-200 bg-white p-5 sm:p-7">
            <h2 className="text-lg font-bold text-brand-navy">My digital certificates</h2>
            {certificates.length === 0 ? (
              <p className="mt-4 text-sm text-slate-400 italic">No digital certificates yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {certificates.map((cert) => (
                  <div
                    key={cert.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div>
                      <p className="text-sm font-semibold text-brand-navy">{cert.certificate_type} certificate</p>
                      <p className="text-xs text-slate-500">Certificate #{cert.certificate_number}</p>
                      {cert.blockchain_anchor && (
                        <p className="text-xs text-emerald-600 flex items-center gap-1">
                          <span className="text-[10px]">⛓</span> Blockchain anchored
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {cert.qr_payload && (
                        <div className="flex flex-col items-center gap-1">
                          <p className="text-xs text-slate-500">Verification QR</p>
                          <div className="w-12 h-12 bg-white border border-slate-200 p-0.5 rounded">
                            <img
                              src={`data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23ffffff"/><path d="M20,20 h20 v20 H20 z M60,20 h20 v20 H60 z M20,60 h20 v20 H20 z M60,60 h20 v20 H60 z" fill="%23000000"/></svg>`}
                              alt="QR code"
                              className="block"
                            />
                          </div>
                        </div>
                      )}
                      <span className="text-slate-500">{new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(cert.issued_at))}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section aria-label="Enroll in apprenticeship" className="mt-6 rounded-lg border border-slate-200 bg-white p-5 sm:p-7">
            <h2 className="text-lg font-bold text-brand-navy">Apprenticeship enrollment</h2>
            <p className="mt-1 text-sm text-slate-500">Enroll in an apprenticeship to learn a trade under a mentor.</p>
            <form
              onSubmit={(e) => { e.preventDefault(); enrollApprenticeship(); }}
              className="mt-5 space-y-4 grid gap-4 sm:grid-cols-2 sm:items-end"
            >
              <label className="block space-y-1 text-sm font-medium text-slate-700">
                Skill name
                <input
                  type="text"
                  value={skillName}
                  onChange={(e) => setSkillName(e.target.value)}
                  placeholder="e.g. Masonry"
                  className={inputClass}
                />
              </label>
              <label className="block space-y-1 text-sm font-medium text-slate-700">
                Mentor
                <select
                  value={mentorId}
                  onChange={(e) => setMentorId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">None (auto-assign)</option>
                  {mentors.map((m) => (
                    <option key={m.id} value={m.id}>{m.full_name}</option>
                  ))}
                </select>
              </label>
              <div className="col-span-full sm:col-span-2 flex justify-end">
                <Button
                  type="submit"
                  disabled={enrolling || !skillName}
                  className="gap-2 w-full sm:w-auto"
                >
                  {enrolling ? <LoaderCircle size={16} className="animate-spin" /> : <GraduationCap size={16} />}
                  {enrolling ? 'Enrolling...' : 'Enroll'}
                </Button>
              </div>
            </form>
          </section>

          {enrollments.length > 0 && (
            <section aria-label="My enrollments" className="mt-6 rounded-lg border border-slate-200 bg-white p-5 sm:p-7">
              <h2 className="text-lg font-bold text-brand-navy">My enrollments</h2>
              <div className="mt-4 space-y-2">
                {enrollments.map((enr) => (
                  <div
                    key={enr.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-brand-navy">{enr.skill_name}</p>
                      <p className="text-xs text-slate-500">Mentor: {enr.mentor?.full_name || 'None'} · Started {new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(enr.started_at))}</p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${enr.status === 'active' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : enr.status === 'completed' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-100 text-slate-600'}`}
                    >
                      {enr.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

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

export default CertificatesPage;

