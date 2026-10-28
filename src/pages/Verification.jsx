import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, BadgeCheck, Camera, CheckCircle2, LoaderCircle, ShieldCheck } from 'lucide-react';
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

const StatusRow = ({ label, record }) => {
  if (!record) return null;
  const badge = statusBadges[record.status] || statusBadges.expired;
  return (
    <div className="flex flex-col gap-2 border-t border-slate-100 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-brand-navy">{label}</p>
        <p className="mt-0.5 text-xs text-slate-500">
          Submitted {new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(record.created_at))}
          {record.expires_at && ` · Expires ${new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(record.expires_at))}`}
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
          className="absolute right-2 top-2 rounded-full bg-white/90 px-3 py-1 text-sm text-slate-700 shadow-sm hover:bg-white"
        >
          Remove
        </button>
      </div>
    ) : (
      <div className="mt-3 flex h-40 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white text-slate-400">
        <Camera className="h-6 w-6" aria-hidden="true" />
        <span className="text-xs">No photo selected</span>
      </div>
    )}
    <div className="mt-3 flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" className="gap-2" onClick={onTakePhoto}>
        <Camera size={14} /> Take photo
      </Button>
      <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border-2 border-brand-navy px-4 text-sm font-medium text-brand-navy transition-colors hover:bg-slate-50">
        Upload
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

const Verification = () => {
  const { user, isClientMode, toggleMode } = useOutletContext();
  const [records, setRecords] = useState([]);
  const [photos, setPhotos] = useState({ front: null, back: null, license: null });
  const [camera, setCamera] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [retry, setRetry] = useState(0);
  const photosRef = useRef(photos);
  photosRef.current = photos;

  useEffect(() => () => {
    Object.values(photosRef.current).forEach((photo) => {
      if (photo?.url) URL.revokeObjectURL(photo.url);
    });
  }, []);

  useEffect(() => {
    let isCurrent = true;
    const loadRecords = async () => {
      setLoading(true);
      setError('');
      const { data, error: queryError } = await supabase
        .from('provider_verifications')
        .select('id, verification_type, status, document_url, created_at, notes, expires_at')
        .eq('provider_id', user.id);
      if (!isCurrent) return;
      if (queryError) setError('Your verification status could not be loaded. Please try again.');
      else setRecords(data || []);
      setLoading(false);
    };

    loadRecords();
    return () => { isCurrent = false; };
  }, [user.id, retry]);

  const setPhoto = (slot, file) => {
    setError('');
    setSuccess('');
    if (photos[slot]?.url) URL.revokeObjectURL(photos[slot].url);
    const nextPhoto = { file, url: URL.createObjectURL(file) };
    setPhotos((current) => ({ ...current, [slot]: nextPhoto }));
  };

  const removePhoto = (slot) => {
    if (photos[slot]?.url) URL.revokeObjectURL(photos[slot].url);
    setPhotos((current) => ({ ...current, [slot]: null }));
  };

  const refreshRecords = async () => {
    const { data, error: queryError } = await supabase
      .from('provider_verifications')
      .select('id, verification_type, status, document_url, created_at, notes, expires_at')
      .eq('provider_id', user.id);
    if (queryError) throw queryError;
    setRecords(data || []);
  };

  const submit = async (type) => {
    setError('');
    setSuccess('');
    setSubmitting(type);
    try {
      if (type === 'identity') {
        await submitIdentityVerification(supabase, user.id, {
          front: photos.front?.file,
          back: photos.back?.file,
        });
        removePhoto('front');
        removePhoto('back');
      } else {
        await submitProviderLicenseVerification(supabase, user.id, photos.license?.file);
        removePhoto('license');
      }

      setSuccess(type === 'identity'
        ? 'Your identity documents have been submitted for review.'
        : 'Your provider license has been submitted for review.');
      try {
        await refreshRecords();
      } catch {
        setError('Your documents were submitted, but their current status could not be reloaded. Refresh to check the submission.');
      }
    } catch (submitError) {
      setError(submitError.message || 'The documents could not be submitted. Please try again.');
    } finally {
      setSubmitting('');
    }
  };

  if (isClientMode) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-8">
        <h1 className="text-2xl font-extrabold text-brand-navy">Provider verification</h1>
        <p className="mt-2 text-sm text-slate-600">Switch to Provider workspace to submit or review your verification documents.</p>
        <Button type="button" onClick={toggleMode} className="mt-5">Switch to Provider workspace</Button>
      </div>
    );
  }

  const identityRecord = records.find((record) => record.verification_type === 'identity');
  const licenseRecord = records.find((record) => record.verification_type === 'license');

  return (
    <div className="mx-auto flex min-h-full max-w-5xl flex-col gap-7 pb-8 overflow-y-auto max-h-[calc(100vh-4rem)]">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-green">Provider workspace</p>
        <h1 className="mt-2 flex items-center gap-3 text-3xl font-extrabold text-brand-navy">
          <ShieldCheck className="h-8 w-8 text-brand-green" aria-hidden="true" /> Provider verification
        </h1>
        <p className="mt-2 max-w-2xl text-slate-500">Submit clear photos of your identity document and provider license. Administrators review documents before updating their status.</p>
      </header>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div className="flex-1">{error}</div>
          <button type="button" onClick={() => setRetry((value) => value + 1)} className="shrink-0 font-semibold underline">Retry</button>
        </div>
      )}
      {success && <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800" role="status">{success}</p>}

      {loading ? (
        <p className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500" role="status">Loading your verification status...</p>
      ) : (
        <>
          <section aria-labelledby="identity-verification-heading" className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 sm:p-7">
            <div className="flex items-start gap-3">
              <BadgeCheck className="mt-1 h-5 w-5 text-brand-green" aria-hidden="true" />
              <div>
                <h2 id="identity-verification-heading" className="text-lg font-bold text-brand-navy">Identity verification</h2>
                <p className="mt-1 text-sm text-slate-500">Upload readable photos of the front and back of your Fayda ID. JPG and PNG files under 10 MB are accepted.</p>
              </div>
            </div>
            <StatusRow label="Fayda ID" record={identityRecord} />
            <div className="grid gap-4 md:grid-cols-2">
              <PhotoSlot
                label="Front of Fayda ID"
                photo={photos.front}
                onTakePhoto={() => setCamera({ slot: 'front', side: 'front', documentName: 'Fayda ID' })}
                onFile={(file) => setPhoto('front', file)}
                onRemove={() => removePhoto('front')}
              />
              <PhotoSlot
                label="Back of Fayda ID"
                photo={photos.back}
                onTakePhoto={() => setCamera({ slot: 'back', side: 'back', documentName: 'Fayda ID' })}
                onFile={(file) => setPhoto('back', file)}
                onRemove={() => removePhoto('back')}
              />
            </div>
            <Button type="button" disabled={submitting !== '' || !photos.front || !photos.back} onClick={() => submit('identity')} className="gap-2">
              {submitting === 'identity' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {submitting === 'identity' ? 'Submitting...' : 'Submit identity documents'}
            </Button>
          </section>

          <section aria-labelledby="license-verification-heading" className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 sm:p-7">
            <div className="flex items-start gap-3">
              <BadgeCheck className="mt-1 h-5 w-5 text-brand-green" aria-hidden="true" />
              <div>
                <h2 id="license-verification-heading" className="text-lg font-bold text-brand-navy">Provider license</h2>
                <p className="mt-1 text-sm text-slate-500">If your service requires a license, upload a clear photo for administrator review.</p>
              </div>
            </div>
            <StatusRow label="Provider license" record={licenseRecord} />
            <div className="max-w-xl">
              <PhotoSlot
                label="Provider license"
                photo={photos.license}
                onTakePhoto={() => setCamera({ slot: 'license', side: 'front', documentName: 'provider license' })}
                onFile={(file) => setPhoto('license', file)}
                onRemove={() => removePhoto('license')}
              />
            </div>
            <Button type="button" disabled={submitting !== '' || !photos.license} onClick={() => submit('license')} className="gap-2">
              {submitting === 'license' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {submitting === 'license' ? 'Submitting...' : 'Submit license'}
            </Button>
          </section>
        </>
      )}

      <Link to="/dashboard/services" className="mt-auto inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-brand-green transition-colors hover:border-brand-green/30 hover:bg-emerald-50">
        Manage your provider profile
      </Link>

      {camera && (
        <IdentityCameraCapture
          side={camera.side}
          documentName={camera.documentName}
          filePrefix={camera.slot}
          onCapture={(file) => setPhoto(camera.slot, file)}
          onClose={() => setCamera(null)}
        />
      )}
    </div>
  );
};

export default Verification;
