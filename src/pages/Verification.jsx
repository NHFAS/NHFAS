import React, { useEffect, useState } from 'react';
import { AlertCircle, BadgeCheck, Camera, CheckCircle2, LoaderCircle, Upload, X } from 'lucide-react';
import { Link, useOutletContext } from 'react-router-dom';
import { Button } from '../components/Button';
import IdentityCameraCapture from '../components/IdentityCameraCapture';
import { supabase } from '../lib/supabase';
import { submitIdentityVerification, submitProviderLicenseVerification } from '../lib/submitIdentityVerification';

const statusBadges = {
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  rejected: 'border-red-200 bg-red-50 text-red-700',
  expired: 'border-slate-200 bg-slate-100 text-slate-600',
};

const PhotoSlot = ({ label, photo, onTakePhoto, onFile, onRemove }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
    <p className="text-sm font-semibold text-slate-700">{label}</p>
    {photo ? (
      <div className="relative mt-3">
        <img src={photo.url} alt={label} className="h-40 w-full rounded-lg object-cover" />
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${label} photo`}
          className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-slate-600 shadow-sm transition-colors hover:bg-white hover:text-slate-900"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    ) : (
      <div className="mt-3 flex h-40 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white text-slate-400">
        <Camera className="h-6 w-6" />
        <span className="text-xs">No photo yet</span>
      </div>
    )}
    <div className="mt-3 flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" className="gap-2" onClick={onTakePhoto}>
        <Camera size={14} /> Take photo
      </Button>
      <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border-2 border-brand-navy px-4 text-sm font-medium text-brand-navy transition-colors hover:bg-slate-50">
        <Upload size={14} /> Upload
        <input
          type="file"
          accept="image/jpeg,image/png"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onFile(file);
            event.target.value = '';
          }}
        />
      </label>
    </div>
  </div>
);

const StatusRow = ({ label, record }) => {
  if (!record) return null;
  const badge = statusBadges[record.status] || statusBadges.expired;
  return (
    <div className="flex flex-col gap-2 border-t border-slate-100 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-brand-navy">{label}</p>
        <p className="mt-0.5 text-xs text-slate-500">
          Submitted {new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(record.created_at))}
        </p>
        {record.status === 'rejected' && record.notes && (
          <p className="mt-1 text-xs text-red-600">Reviewer note: {record.notes}</p>
        )}
      </div>
      <span className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${badge}`}>
        {record.status}
      </span>
    </div>
  );
};
const Verification = () => {
  const { user, isProfileLoading } = useOutletContext();
  const [records, setRecords] = useState({});
  const [photos, setPhotos] = useState({ front: null, back: null });
  const [licensePhoto, setLicensePhoto] = useState(null);
  const [cameraTarget, setCameraTarget] = useState(null); // 'front' | 'back' | 'license'
  const [submitting, setSubmitting] = useState(''); // '' | 'identity' | 'license'
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const refresh = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('provider_verifications')
      .select('verification_type, status, notes, document_url, created_at, expires_at')
      .eq('provider_id', user.id);
    if (error) return;
    const byType = {};
    (data || []).forEach((record) => {
      byType[record.verification_type] = record;
    });
    setRecords(byType);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const assignPhoto = (side, file) => {
    setPhotos((current) => {
      if (current[side]?.url) URL.revokeObjectURL(current[side].url);
      return { ...current, [side]: { file, url: URL.createObjectURL(file) } };
    });
  };

  const removePhoto = (side) => {
    setPhotos((current) => {
      if (current[side]?.url) URL.revokeObjectURL(current[side].url);
      return { ...current, [side]: null };
    });
  };

  const assignLicensePhoto = (file) => {
    if (licensePhoto?.url) URL.revokeObjectURL(licensePhoto.url);
    setLicensePhoto({ file, url: URL.createObjectURL(file) });
  };

  const removeLicensePhoto = () => {
    if (licensePhoto?.url) URL.revokeObjectURL(licensePhoto.url);
    setLicensePhoto(null);
  };

  const handleSubmitIdentity = async () => {
    setSubmitting('identity');
    setFeedback({ type: '', message: '' });
    try {
      await submitIdentityVerification(supabase, user.id, {
        front: photos.front?.file,
        back: photos.back?.file,
      });
      if (photos.front?.url) URL.revokeObjectURL(photos.front.url);
      if (photos.back?.url) URL.revokeObjectURL(photos.back.url);
      setPhotos({ front: null, back: null });
      await refresh();
      setFeedback({ type: 'success', message: 'National ID submitted for review. You will be verified once our team approves it.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Your National ID could not be submitted. Please try again.' });
    } finally {
      setSubmitting('');
    }
  };

  const handleLicense = async () => {
    setSubmitting('license');
    setFeedback({ type: '', message: '' });
    try {
      await submitProviderLicenseVerification(supabase, user.id, licensePhoto.file);
      removeLicensePhoto();
      await refresh();
      setFeedback({ type: 'success', message: 'Provider license submitted for review.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message || 'Your license could not be submitted. Please try again.' });
    } finally {
      setSubmitting('');
    }
  };
  if (!isProfileLoading && !user) {
    return (
      <div className="mx-auto max-w-xl rounded-lg border border-slate-200 bg-white p-10 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-brand-green">
          <BadgeCheck className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-2xl font-extrabold text-brand-navy">Sign in to verify your account</h1>
        <p className="mt-2 text-sm text-slate-500">
          Identity verification is required before you can accept jobs on NHFAS.
        </p>
        <Button as={Link} to="/login" variant="primary" className="mt-6">Sign in</Button>
      </div>
    );
  }

  const identityRecord = records.identity;
  const licenseRecord = records.license;
  const identityReady = Boolean(photos.front && photos.back);
  const licenseReady = Boolean(licensePhoto);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-green">Provider onboarding</p>
        <h1 className="mt-2 text-3xl font-extrabold text-brand-navy">Verification</h1>
        <p className="mt-2 max-w-2xl text-slate-500">
          Upload your Fayda National ID and provider license. You cannot accept jobs until your identity is approved
          by our verification team.
        </p>
      </header>

      {(identityRecord || licenseRecord) && (
        <section aria-label="Verification status" className="rounded-lg border border-slate-200 bg-white px-5 pb-2">
          <h2 className="pt-4 text-xl font-bold text-brand-navy">Current status</h2>
          <StatusRow label="National ID (Fayda)" record={identityRecord} />
          <StatusRow label="Provider license" record={licenseRecord} />
        </section>
      )}

      {feedback.message && (
        <p
          role={feedback.type === 'error' ? 'alert' : 'status'}
          className={`flex items-start gap-2 rounded-lg border p-4 text-sm font-medium ${
            feedback.type === 'error'
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
        >
          {feedback.type === 'error'
            ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
          {feedback.message}
        </p>
      )}

      <section aria-labelledby="identity-heading" className="rounded-lg border border-slate-200 bg-white p-5 sm:p-7">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-brand-green">
            <BadgeCheck className="h-5 w-5" />
          </span>
          <div>
            <h2 id="identity-heading" className="text-lg font-bold text-brand-navy">National ID (Fayda)</h2>
            <p className="mt-0.5 text-sm text-slate-500">JPG or PNG photos under 10 MB — front and back.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <PhotoSlot
            label="Front of ID"
            photo={photos.front}
            onTakePhoto={() => setCameraTarget('front')}
            onFile={(file) => assignPhoto('front', file)}
            onRemove={() => removePhoto('front')}
          />
          <PhotoSlot
            label="Back of ID"
            photo={photos.back}
            onTakePhoto={() => setCameraTarget('back')}
            onFile={(file) => assignPhoto('back', file)}
            onRemove={() => removePhoto('back')}
          />
        </div>
        <div className="mt-5 flex items-center justify-end gap-3">
          <Button
            type="button"
            onClick={handleSubmitIdentity}
            disabled={!identityReady || submitting === 'identity'}
            className="gap-2"
          >
            {submitting === 'identity' ? <LoaderCircle size={16} className="animate-spin" /> : <Upload size={16} />}
            {submitting === 'identity' ? 'Submitting...' : 'Submit National ID'}
          </Button>
        </div>
      </section>
      <section aria-labelledby="license-heading" className="rounded-lg border border-slate-200 bg-white p-5 sm:p-7">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
            <BadgeCheck className="h-5 w-5" />
          </span>
          <div>
            <h2 id="license-heading" className="text-lg font-bold text-brand-navy">Provider license</h2>
            <p className="mt-0.5 text-sm text-slate-500">Trade license or operator permit, JPG or PNG under 10 MB.</p>
          </div>
        </div>
        <div className="max-w-sm">
          <PhotoSlot
            label="License document"
            photo={licensePhoto}
            onTakePhoto={() => setCameraTarget('license')}
            onFile={assignLicensePhoto}
            onRemove={removeLicensePhoto}
          />
        </div>
        <div className="mt-5 flex items-center justify-end gap-3">
          <Button
            type="button"
            onClick={handleLicense}
            disabled={!licenseReady || submitting === 'license'}
            className="gap-2"
          >
            {submitting === 'license' ? <LoaderCircle size={16} className="animate-spin" /> : <Upload size={16} />}
            {submitting === 'license' ? 'Submitting...' : 'Submit license'}
          </Button>
        </div>
      </section>

      {cameraTarget && (
        <IdentityCameraCapture
          side={cameraTarget === 'license' ? 'photo' : cameraTarget}
          documentName={cameraTarget === 'license' ? 'Provider license' : 'Fayda ID'}
          filePrefix={cameraTarget === 'license' ? 'license' : 'fayda'}
          onCapture={(file) => (cameraTarget === 'license' ? assignLicensePhoto(file) : assignPhoto(cameraTarget, file))}
          onClose={() => setCameraTarget(null)}
        />
      )}
    </div>
  );
};

export default Verification;



