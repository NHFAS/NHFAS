import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { Check, LogOut, Save, ShieldCheck } from 'lucide-react';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';
<<<<<<< HEAD
import {
  submitIdentityVerification,
  submitProviderLicenseVerification,
  validateProviderLicensePhoto,
} from '../lib/submitIdentityVerification';
import IdentityCameraCapture from '../components/IdentityCameraCapture';

const Settings = () => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('client');
  const [profile, setProfile] = useState({ full_name: '', phone: '', preferred_language: 'en', low_literacy_mode: false });
  const [verification, setVerification] = useState(null);
  const [licenseVerification, setLicenseVerification] = useState(null);
  const [kycStatus, setKycStatus] = useState('pending');
  const [vehicles, setVehicles] = useState([]);
  const [vehicleClasses, setVehicleClasses] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [vehicleForm, setVehicleForm] = useState({ plate_number: '', make: '', model: '', vehicle_class_id: '', rated_payload_kg: '' });
  const [maintenanceForm, setMaintenanceForm] = useState({ vehicle_id: '', maintenance_type: '', description: '', scheduled_at: '', cost: '' });
  const [identityPhotos, setIdentityPhotos] = useState({ front: null, back: null });
  const [identityConsent, setIdentityConsent] = useState(false);
  const [licensePhoto, setLicensePhoto] = useState(null);
  const [licenseConsent, setLicenseConsent] = useState(false);
  const fileInputs = useRef({});
  const licenseFileInput = useRef(null);
  const [cameraTarget, setCameraTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const licenseDocumentName = 'driving license';

  const loadFleet = async (currentUser) => {
    const { data: vehicleData } = await supabase.from('vehicles')
      .select('id, plate_number, make, model, rated_payload_kg, status, vehicle_classes(name, rated_payload_kg)')
      .eq('owner_id', currentUser.id)
      .order('created_at', { ascending: false });
    const list = vehicleData || [];
    setVehicles(list);
    if (list.length) {
      const { data: records } = await supabase.from('vehicle_maintenance_records')
        .select('*').in('vehicle_id', list.map((vehicle) => vehicle.id)).order('scheduled_at', { ascending: true });
      setMaintenance(records || []);
    } else {
      setMaintenance([]);
    }
  };
=======

const SettingsPage = () => {
  const navigate = useNavigate();
  const { user, profile, setProfile, profileError, isProfileLoading, isClientMode, toggleMode } = useOutletContext();
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    preferred_language: 'en',
    low_literacy_mode: false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
>>>>>>> 63efae11eb35be3f953ce9543bf7d62b50b2b908

  useEffect(() => {
    if (!profile) return;
    setFormData({
      full_name: profile.full_name || '',
      phone: profile.phone || '',
      preferred_language: profile.preferred_language || 'en',
      low_literacy_mode: Boolean(profile.low_literacy_mode),
    });
  }, [profile]);

<<<<<<< HEAD
      if (['service_provider', 'heavy_operator'].includes(profileData?.role)) {
        const [{ data: verificationData }, { data: licenseData }, { data: providerData }] = await Promise.all([
          supabase.from('provider_verifications').select('status, document_url, created_at, notes, expires_at')
            .eq('provider_id', currentUser.id).eq('verification_type', 'identity').maybeSingle(),
          supabase.from('provider_verifications').select('status, document_url, created_at, notes, expires_at')
            .eq('provider_id', currentUser.id).eq('verification_type', 'license').maybeSingle(),
          supabase.from('provider_profiles').select('kyc_status').eq('user_id', currentUser.id).maybeSingle(),
        ]);
        if (mounted) {
          setVerification(verificationData);
          setLicenseVerification(licenseData);
          setKycStatus(providerData?.kyc_status || 'pending');
        }
      }
      if (profileData?.role === 'heavy_operator' && mounted) await loadFleet(currentUser);
      if (mounted) setLoading(false);
    };
    load();
    return () => { mounted = false; };
  }, []);

  const saveProfile = async (event) => {
=======
  const handleSaveProfile = async (event) => {
>>>>>>> 63efae11eb35be3f953ce9543bf7d62b50b2b908
    event.preventDefault();
    setFeedback({ type: '', message: '' });

<<<<<<< HEAD
  const submitLicenseVerification = async (event) => {
    event.preventDefault();
    if (!user || !licenseConsent) return;
    const photoError = validateProviderLicensePhoto(licensePhoto);
    if (photoError) {
      setError(photoError);
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const data = await submitProviderLicenseVerification(supabase, user.id, licensePhoto);
      setLicenseVerification(data);
      setMessage(`Your ${licenseDocumentName} photo was submitted for review.`);
      setLicensePhoto(null);
      setLicenseConsent(false);
      if (licenseFileInput.current) licenseFileInput.current.value = '';
    } catch (submitError) {
      setError(submitError.message);
    }
    setSaving(false);
  };

  const submitVerification = async (event) => {
    event.preventDefault();
    if (!identityPhotos.front || !identityPhotos.back || !user || !identityConsent) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const data = await submitIdentityVerification(supabase, user.id, identityPhotos);
      setVerification(data);
      setMessage('Both sides of your Fayda ID were submitted for review.');
      setIdentityPhotos({ front: null, back: null });
      setIdentityConsent(false);
      Object.values(fileInputs.current).forEach((input) => { if (input) input.value = ''; });
    } catch (submitError) {
      setError(submitError.message);
    }
    setSaving(false);
  };

  const addVehicle = async (event) => {
    event.preventDefault();
    const selectedClass = vehicleClasses.find((item) => item.id === vehicleForm.vehicle_class_id);
    const payload = Number(vehicleForm.rated_payload_kg || selectedClass?.rated_payload_kg);
    if (!selectedClass || payload > selectedClass.rated_payload_kg) {
      setError('Rated payload cannot exceed the vehicle class payload limit.');
=======
    if (!user) {
      setFeedback({ type: 'error', message: 'Sign in before updating your profile.' });
>>>>>>> 63efae11eb35be3f953ce9543bf7d62b50b2b908
      return;
    }

    setIsSaving(true);
    const updates = {
      full_name: formData.full_name.trim(),
      phone: formData.phone.trim() || null,
      preferred_language: formData.preferred_language,
      low_literacy_mode: formData.low_literacy_mode,
    };

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select('full_name, phone, role, preferred_language, low_literacy_mode, avatar_url')
      .single();

    setIsSaving(false);
    if (error) {
      setFeedback({ type: 'error', message: 'Your profile could not be saved. Please try again.' });
      return;
    }

    setProfile((currentProfile) => ({ ...currentProfile, ...data, email: user.email || '' }));
    setFeedback({ type: 'success', message: 'Your profile settings have been saved.' });
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    setFeedback({ type: '', message: '' });

    if (password.length < 8) {
      setFeedback({ type: 'error', message: 'Use a password with at least 8 characters.' });
      return;
    }
    if (password !== confirmPassword) {
      setFeedback({ type: 'error', message: 'The passwords do not match.' });
      return;
    }

    setIsChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsChangingPassword(false);

    if (error) {
      setFeedback({ type: 'error', message: 'Your password could not be updated. Please try again.' });
      return;
    }

    setPassword('');
    setConfirmPassword('');
    setFeedback({ type: 'success', message: 'Your password has been updated.' });
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setFeedback({ type: 'error', message: 'You could not be signed out. Please try again.' });
      return;
    }
    navigate('/login');
  };

  if (isProfileLoading) {
    return <div className="mx-auto max-w-4xl rounded-lg border border-slate-200 bg-white p-8 text-sm text-slate-500" role="status">Loading your settings...</div>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl rounded-lg border border-slate-200 bg-white p-8 text-center">
        <h1 className="text-2xl font-bold text-brand-navy">Sign in to manage settings</h1>
        <p className="mt-2 text-sm text-slate-500">Your profile and preferences are available after you sign in.</p>
        <Button as={Link} to="/login" variant="primary" className="mt-5">Sign in</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-green">Account</p>
        <h1 className="mt-2 text-3xl font-extrabold text-brand-navy">Settings</h1>
        <p className="mt-2 text-slate-500">Manage your profile, dashboard, and account security.</p>
      </header>

      {profileError && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="status">
          Some profile details could not be loaded. You can still try updating your information.
        </p>
      )}
      {feedback.message && (
        <p className={`rounded-lg border p-4 text-sm ${feedback.type === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`} role={feedback.type === 'error' ? 'alert' : 'status'}>
          {feedback.message}
        </p>
      )}

      <section aria-labelledby="profile-settings-heading" className="rounded-lg border border-slate-200 bg-white p-5 sm:p-7">
        <div className="mb-6">
          <h2 id="profile-settings-heading" className="text-lg font-bold text-brand-navy">Profile information</h2>
          <p className="mt-1 text-sm text-slate-500">These details appear on your NHFAS account.</p>
        </div>
        <form onSubmit={handleSaveProfile} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">
              Full name
              <input
                required
                maxLength={120}
                value={formData.full_name}
                onChange={(event) => setFormData({ ...formData, full_name: event.target.value })}
                className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Phone number
              <input
                type="tel"
                autoComplete="tel"
                value={formData.phone}
                onChange={(event) => setFormData({ ...formData, phone: event.target.value })}
                className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
              Email address
              <input
                type="email"
                value={user.email || ''}
                readOnly
                className="mt-2 block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500"
              />
            </label>
          </div>

          <label className="block max-w-sm text-sm font-medium text-slate-700">
            Preferred language
            <select
              value={formData.preferred_language}
              onChange={(event) => setFormData({ ...formData, preferred_language: event.target.value })}
              className="mt-2 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20"
            >
              <option value="en">English</option>
              <option value="am">Amharic</option>
              <option value="om">Afaan Oromo</option>
              <option value="sw">Swahili</option>
            </select>
          </label>

          <label className="flex items-start gap-3 border-t border-slate-100 pt-5 text-sm">
            <input
              type="checkbox"
              checked={formData.low_literacy_mode}
              onChange={(event) => setFormData({ ...formData, low_literacy_mode: event.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-green focus:ring-brand-green"
            />
            <span>
              <span className="block font-semibold text-slate-800">Use simplified language</span>
              <span className="mt-1 block text-slate-500">Prefer shorter, clearer wording throughout the platform.</span>
            </span>
          </label>

          <div className="flex justify-end border-t border-slate-100 pt-5">
            <Button type="submit" disabled={isSaving} className="inline-flex items-center gap-2">
              {isSaving ? 'Saving...' : 'Save profile'}
              {isSaving ? <Check className="h-4 w-4 opacity-60" /> : <Save className="h-4 w-4" />}
            </Button>
          </div>
        </form>
      </section>

<<<<<<< HEAD
      {['service_provider', 'heavy_operator'].includes(role) && (
        <section className="border-b border-slate-200 pb-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-brand-navy">Identity verification</h2>
              <p className="mt-1 max-w-xl text-sm leading-6 text-slate-600">Providers must be approved before accepting jobs. Photos stay in private storage and are visible only to you and platform administrators.</p>
            </div>
            <span className="inline-flex items-center gap-2 bg-slate-100 px-3 py-2 text-sm font-semibold capitalize text-slate-700"><ShieldCheck size={17} />{verification?.status || kycStatus}</span>
          </div>
          {verification ? (
            <div className="mt-4 flex items-start gap-3 border-l-2 border-slate-300 py-1 pl-4 text-sm text-slate-600">
              <FileText size={18} className="mt-0.5 shrink-0" />
              <div><p>Fayda ID photos submitted {new Date(verification.created_at).toLocaleDateString()}</p>{verification.notes && <p className="mt-1">Review note: {verification.notes}</p>}{verification.expires_at && <p className="mt-1">Expires: {new Date(verification.expires_at).toLocaleDateString()}</p>}</div>
            </div>
          ) : (
            <form onSubmit={submitVerification} className="mt-4 space-y-4">
              <p className="text-sm text-slate-600">Take clear, readable photos of the front and back of your Fayda ID. JPG and PNG images up to 10 MB each are accepted.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {['front', 'back'].map((side) => (
                  <fieldset key={side} className="space-y-3 rounded-xl border border-slate-200 p-4">
                    <legend className="px-1 text-sm font-semibold capitalize text-brand-navy">{side} of ID</legend>
                    <p className="truncate text-sm text-slate-500">{identityPhotos[side]?.name || 'No photo selected'}</p>
                    <input
                      ref={(input) => { fileInputs.current[side] = input; }}
                      type="file"
                      accept="image/jpeg,image/png"
                      onChange={(event) => {
                        setIdentityPhotos((current) => ({ ...current, [side]: event.target.files?.[0] || null }));
                        event.target.value = '';
                      }}
                      className="sr-only"
                      aria-label={`Choose a photo of the ${side} of your Fayda ID`}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" disabled={saving} onClick={() => setCameraTarget({ side, documentName: 'Fayda ID', filePrefix: 'fayda' })} className="h-9 gap-2 px-3 text-sm"><Camera size={15} />Take photo</Button>
                      <Button type="button" variant="outline" disabled={saving} onClick={() => fileInputs.current[side]?.click()} className="h-9 gap-2 px-3 text-sm"><FileImage size={15} />Choose photo</Button>
                    </div>
                  </fieldset>
                ))}
              </div>
              <label className="flex items-start gap-3 text-sm leading-5 text-slate-600">
                <input type="checkbox" checked={identityConsent} onChange={(event) => setIdentityConsent(event.target.checked)} className="mt-1 accent-brand-green" />
                <span>I confirm these are photos of my Fayda ID and consent to NHFAS storing them privately for identity verification.</span>
              </label>
              <Button type="submit" disabled={saving || !identityPhotos.front || !identityPhotos.back || !identityConsent} className="gap-2 self-start">
                {saving ? <LoaderCircle size={16} className="animate-spin" /> : <FileText size={16} />}
                {saving ? 'Submitting photos...' : 'Submit for review'}
              </Button>
            </form>
          )}
        </section>
      )}

      {role === 'heavy_operator' && (
        <section className="border-b border-slate-200 pb-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold capitalize text-brand-navy">{licenseDocumentName}</h2>
              <p className="mt-1 max-w-xl text-sm leading-6 text-slate-600">Submit a clear photo of your {licenseDocumentName} for verification. JPG and PNG images up to 10 MB are accepted.</p>
            </div>
            {licenseVerification && (
              <span className="inline-flex items-center gap-2 bg-slate-100 px-3 py-2 text-sm font-semibold capitalize text-slate-700">
                <ShieldCheck size={17} />{licenseVerification.status}
              </span>
            )}
          </div>
          {licenseVerification ? (
            <div className="mt-4 flex items-start gap-3 border-l-2 border-slate-300 py-1 pl-4 text-sm text-slate-600">
              <FileText size={18} className="mt-0.5 shrink-0" />
              <div>
                <p>{licenseDocumentName} photo submitted {new Date(licenseVerification.created_at).toLocaleDateString()}</p>
                {licenseVerification.notes && <p className="mt-1">Review note: {licenseVerification.notes}</p>}
              </div>
            </div>
          ) : (
            <form onSubmit={submitLicenseVerification} className="mt-4 space-y-4">
              <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4">
                <legend className="px-1 text-sm font-semibold capitalize text-brand-navy">{licenseDocumentName} photo</legend>
                <p className="truncate text-sm text-slate-500">{licensePhoto?.name || 'No photo selected'}</p>
                <input
                  ref={licenseFileInput}
                  type="file"
                  accept="image/jpeg,image/png"
                  disabled={saving}
                  onChange={(event) => {
                    setLicensePhoto(event.target.files?.[0] || null);
                    event.target.value = '';
                  }}
                  className="sr-only"
                  aria-label={`Choose a photo of your ${licenseDocumentName}`}
                />
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" disabled={saving} onClick={() => setCameraTarget({ side: 'front', documentName: `your ${licenseDocumentName}`, filePrefix: 'provider-license' })} className="h-9 gap-2 px-3 text-sm"><Camera size={15} />Take photo</Button>
                  <Button type="button" variant="outline" disabled={saving} onClick={() => licenseFileInput.current?.click()} className="h-9 gap-2 px-3 text-sm"><FileImage size={15} />Choose photo</Button>
                </div>
              </fieldset>
              <label className="flex items-start gap-3 text-sm leading-5 text-slate-600">
                <input type="checkbox" checked={licenseConsent} disabled={saving} onChange={(event) => setLicenseConsent(event.target.checked)} className="mt-1 accent-brand-green" />
                <span>I confirm this is a photo of my {licenseDocumentName} and consent to NHFAS storing it privately for verification.</span>
              </label>
              <Button type="submit" disabled={saving || !licensePhoto || !licenseConsent} className="gap-2 self-start">
                {saving ? <LoaderCircle size={16} className="animate-spin" /> : <FileText size={16} />}
                {saving ? 'Submitting photo...' : 'Submit for review'}
              </Button>
            </form>
          )}
        </section>
      )}

      {role === 'heavy_operator' && (
        <section className="space-y-6 border-b border-slate-200 pb-8">
=======
      <section aria-labelledby="workspace-settings-heading" className="rounded-lg border border-slate-200 bg-white p-5 sm:p-7">
        <div>
          <h2 id="workspace-settings-heading" className="text-lg font-bold text-brand-navy">Dashboard workspace</h2>
          <p className="mt-1 text-sm text-slate-500">Choose which dashboard view to use on this device.</p>
        </div>
        <div className="mt-5 inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1" role="group" aria-label="Dashboard workspace">
          <button
            type="button"
            aria-pressed={!isClientMode}
            onClick={() => isClientMode && toggleMode()}
            className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${!isClientMode ? 'bg-brand-navy text-white' : 'text-slate-600 hover:bg-white'}`}
          >
            Provider
          </button>
          <button
            type="button"
            aria-pressed={isClientMode}
            onClick={() => !isClientMode && toggleMode()}
            className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${isClientMode ? 'bg-brand-navy text-white' : 'text-slate-600 hover:bg-white'}`}
          >
            Client
          </button>
        </div>
      </section>

      <section aria-labelledby="security-settings-heading" className="rounded-lg border border-slate-200 bg-white p-5 sm:p-7">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
            <ShieldCheck className="h-5 w-5" />
          </span>
>>>>>>> 63efae11eb35be3f953ce9543bf7d62b50b2b908
          <div>
            <h2 id="security-settings-heading" className="text-lg font-bold text-brand-navy">Account security</h2>
            <p className="mt-1 text-sm text-slate-500">Update your password or sign out of this device.</p>
          </div>
        </div>
        <form onSubmit={handleChangePassword} className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            New password
            <input
              type="password"
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Confirm new password
            <input
              type="password"
              minLength={8}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Re-enter new password"
              className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20"
            />
          </label>
          <div className="flex flex-wrap justify-between gap-3 border-t border-slate-100 pt-5 sm:col-span-2">
            <button type="button" onClick={handleSignOut} className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-brand-navy">
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
            <Button type="submit" disabled={isChangingPassword || !password || !confirmPassword} className="inline-flex items-center gap-2">
              {isChangingPassword ? 'Updating...' : 'Update password'}
              <ShieldCheck className="h-4 w-4" />
            </Button>
          </div>
<<<<<<< HEAD

          <div>
            <h3 className="text-base font-bold text-brand-navy">Maintenance schedule</h3>
            <form onSubmit={addMaintenance} className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-sm font-medium text-slate-700">Vehicle<select required value={maintenanceForm.vehicle_id} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, vehicle_id: event.target.value })} className="w-full border border-slate-300 bg-white px-3 py-2.5 font-normal"><option value="">Choose a vehicle</option>{vehicles.map((item) => <option key={item.id} value={item.id}>{item.plate_number}</option>)}</select></label>
              <label className="space-y-1 text-sm font-medium text-slate-700">Maintenance type<input required value={maintenanceForm.maintenance_type} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, maintenance_type: event.target.value })} className="w-full border border-slate-300 bg-white px-3 py-2.5 font-normal" placeholder="Inspection, tires, engine service" /></label>
              <label className="space-y-1 text-sm font-medium text-slate-700">Scheduled for<input type="date" value={maintenanceForm.scheduled_at} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, scheduled_at: event.target.value })} className="w-full border border-slate-300 bg-white px-3 py-2.5 font-normal" /></label>
              <label className="space-y-1 text-sm font-medium text-slate-700">Estimated cost (ETB)<input type="number" min="0" value={maintenanceForm.cost} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, cost: event.target.value })} className="w-full border border-slate-300 bg-white px-3 py-2.5 font-normal" /></label>
              <label className="space-y-1 text-sm font-medium text-slate-700 md:col-span-2">Notes<input value={maintenanceForm.description} onChange={(event) => setMaintenanceForm({ ...maintenanceForm, description: event.target.value })} className="w-full border border-slate-300 bg-white px-3 py-2.5 font-normal" /></label>
              <Button type="submit" disabled={saving || !vehicles.length} className="gap-2 self-start"><Plus size={16} />Schedule maintenance</Button>
            </form>
            <div className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
              {maintenance.map((record) => <div key={record.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><div><p className="font-semibold text-brand-navy">{vehicles.find((vehicle) => vehicle.id === record.vehicle_id)?.plate_number} · {record.maintenance_type}</p><p className="mt-1 text-slate-500">{record.scheduled_at ? new Date(record.scheduled_at).toLocaleDateString() : 'Date not set'} · {record.status}</p></div>{record.status !== 'completed' && <Button variant="outline" onClick={() => completeMaintenance(record)} className="h-9 gap-2 px-3 text-xs"><Check size={14} />Mark complete</Button>}</div>)}
              {!maintenance.length && <p className="py-4 text-sm text-slate-500">No maintenance records yet.</p>}
            </div>
          </div>
        </section>
      )}
      {cameraTarget && (
        <IdentityCameraCapture
          side={cameraTarget.side}
          documentName={cameraTarget.documentName}
          filePrefix={cameraTarget.filePrefix}
          onCapture={(photo) => {
            if (cameraTarget.filePrefix === 'provider-license') setLicensePhoto(photo);
            else setIdentityPhotos((current) => ({ ...current, [cameraTarget.side]: photo }));
          }}
          onClose={() => setCameraTarget(null)}
        />
      )}
=======
        </form>
      </section>
>>>>>>> 63efae11eb35be3f953ce9543bf7d62b50b2b908
    </div>
  );
};

export default SettingsPage;