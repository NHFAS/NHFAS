import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, Home, Briefcase, Truck, Camera, FileImage, FileText, LoaderCircle } from 'lucide-react';
import logo from '../assets/logo.png';
import { Button } from '../components/Button';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import {
  submitIdentityVerification,
  submitProviderLicenseVerification,
  validateIdentityPhotos,
  validateProviderLicensePhoto,
} from '../lib/submitIdentityVerification';
import IdentityCameraCapture from '../components/IdentityCameraCapture';
import { getAppUrl } from '../lib/appUrl';

const AUTH_EMAIL_COOLDOWN_MS = 60000;

const getStoredCooldownRemaining = (key) => {
  try {
    const value = Number(localStorage.getItem(key) || '0');
    if (!value) return 0;
    const remaining = value - Date.now();
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
  } catch {
    return 0;
  }
};

const setStoredCooldown = (key) => {
  try {
    localStorage.setItem(key, String(Date.now() + AUTH_EMAIL_COOLDOWN_MS));
  } catch {
    // ignore storage errors
  }
};

const SignUp = () => {
  const navigate = useNavigate();
  const [accountType, setAccountType] = useState('customer');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [identityPhotos, setIdentityPhotos] = useState({ front: null, back: null });
  const [identityConsent, setIdentityConsent] = useState(false);
  const [providerLicensePhoto, setProviderLicensePhoto] = useState(null);
  const [licenseConsent, setLicenseConsent] = useState(false);
  const [cameraTarget, setCameraTarget] = useState(null);
  const [createdUserId, setCreatedUserId] = useState('');
  const [identitySubmitted, setIdentitySubmitted] = useState(false);
  const [licenseSubmitted, setLicenseSubmitted] = useState(false);
  const fileInputs = useRef({});
  const licenseFileInput = useRef(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmationPending, setConfirmationPending] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const licenseDocumentName = 'driving license';
  const requiresLicenseVerification = accountType === 'operator';

  useEffect(() => {
    if (cooldownSeconds <= 0) return;

    const timer = window.setTimeout(() => {
      setCooldownSeconds((current) => (current > 0 ? current - 1 : 0));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [cooldownSeconds]);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) navigate('/dashboard', { replace: true });
    };

    checkSession();
  }, [navigate]);

  const resendConfirmation = async () => {
    const cooldownRemaining = Math.max(cooldownSeconds, getStoredCooldownRemaining('nhfas_resend_signup_cooldown'));
    if (!formData.email || cooldownRemaining > 0) {
      setCooldownSeconds(cooldownRemaining);
      setError(cooldownRemaining > 0 ? `Please wait ${cooldownRemaining}s before requesting another email.` : 'Please enter an email address.');
      return;
    }

    setError('');
    setIsResending(true);
    setStoredCooldown('nhfas_resend_signup_cooldown');
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: formData.email,
      options: { emailRedirectTo: getAppUrl('login?confirmed=1') },
    });

    if (resendError) {
      const message = resendError.message.toLowerCase().includes('rate') || resendError.message.toLowerCase().includes('too many requests')
        ? 'Too many requests. Please wait a moment before requesting another email.'
        : resendError.message;
      setError(message);
      setCooldownSeconds(60);
    } else {
      setMessage(`A new confirmation email was requested for ${formData.email}. Check your spam folder too.`);
      setCooldownSeconds(60);
    }

    setIsResending(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsSubmitting(true);

    if (createdUserId) {
      try {
        if (!identitySubmitted) {
          await submitIdentityVerification(supabase, createdUserId, identityPhotos);
          setIdentitySubmitted(true);
        }
        if (requiresLicenseVerification && !licenseSubmitted) {
          await submitProviderLicenseVerification(supabase, createdUserId, providerLicensePhoto);
          setLicenseSubmitted(true);
        }
        navigate('/dashboard');
      } catch (submitError) {
        setError(submitError.message);
        setIsSubmitting(false);
      }
      return;
    }

    const requiresIdentityVerification = accountType !== 'customer';
    if (requiresIdentityVerification && (!identityPhotos.front || !identityPhotos.back || !identityConsent)) {
      setError('Add both sides of your Fayda ID and confirm consent before creating a provider account.');
      setIsSubmitting(false);
      return;
    }
    if (requiresLicenseVerification && (!providerLicensePhoto || !licenseConsent)) {
      setError(`Add a photo of your ${licenseDocumentName} and confirm consent before creating your account.`);
      setIsSubmitting(false);
      return;
    }
    if (requiresIdentityVerification) {
      const photoError = validateIdentityPhotos(identityPhotos);
      if (photoError) {
        setError(photoError);
        setIsSubmitting(false);
        return;
      }
    }
    if (requiresLicenseVerification) {
      const licensePhotoError = validateProviderLicensePhoto(providerLicensePhoto);
      if (licensePhotoError) {
        setError(licensePhotoError);
        setIsSubmitting(false);
        return;
      }
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        emailRedirectTo: getAppUrl('login?confirmed=1'),
        data: {
          full_name: formData.name,
          role: accountType === 'provider' ? 'service_provider' : accountType === 'operator' ? 'heavy_operator' : 'client',
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setIsSubmitting(false);
      return;
    }

    if (data.user?.identities?.length === 0) {
      setError('An account with this email already exists. Sign in or use account recovery instead.');
      setIsSubmitting(false);
      return;
    }

    if (data.session) {
      if (requiresIdentityVerification) {
        try {
          await submitIdentityVerification(supabase, data.user.id, identityPhotos);
          setIdentitySubmitted(true);
          if (requiresLicenseVerification) {
            await submitProviderLicenseVerification(supabase, data.user.id, providerLicensePhoto);
            setLicenseSubmitted(true);
          }
        } catch (submitError) {
          setCreatedUserId(data.user.id);
          setError(`Your account was created, but the verification photos could not be submitted. ${submitError.message} You can retry here or submit them later in Profile & settings.`);
          setIsSubmitting(false);
          return;
        }
      }
      navigate('/dashboard');
      return;
    }

    setConfirmationPending(true);
    setMessage(requiresIdentityVerification
      ? `Account created. A confirmation link was requested for ${formData.email}. After confirming and signing in, retake and submit both Fayda ID photos${requiresLicenseVerification ? ` and a ${licenseDocumentName} photo` : ''} in Profile & settings. For your privacy, photos are not saved in this browser.`
      : `Account created. A confirmation link was requested for ${formData.email}. Check your spam folder if it does not arrive.`);
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex bg-brand-softBlue font-sans">
      {/* Left side - Image/Decoration */}
      <div className="hidden lg:flex w-1/2 bg-brand-green items-center justify-center p-12 relative overflow-hidden">
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 left-0 w-full h-full opacity-20">
          <div className="absolute w-[40rem] h-[40rem] bg-white rounded-full blur-3xl -top-20 -left-20"></div>
          <div className="absolute w-[40rem] h-[40rem] bg-brand-navy rounded-full blur-3xl bottom-10 -right-20"></div>
        </div>
        
        <div className="relative z-10 max-w-lg text-white space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md mb-4 border border-white/20 shadow-lg">
            <Truck className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-5xl font-extrabold leading-tight tracking-tight">Join the network.</h2>
          <p className="text-white/90 text-xl font-medium leading-relaxed">Whether you need help or provide services, NHFAS connects you to the right people instantly.</p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 lg:px-24 bg-white relative">
        <Link to="/" className="absolute top-8 right-8 sm:right-12 flex items-center gap-2 text-slate-500 hover:text-brand-navy transition-colors">
          <span className="font-medium">Back to Home</span>
          <Home className="w-5 h-5" />
        </Link>

        <div className="max-w-md w-full mx-auto space-y-8 mt-12 lg:mt-0">
          <div className="text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-2 mb-6">
              <img src={logo} alt="NHFAS Logo" className="h-14 w-auto object-contain" />
              <span className="font-extrabold text-2xl text-brand-navy tracking-tight">NHFAS</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Create an account</h1>
            <p className="text-slate-500 mt-2">Create an account to request or provide services.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 mt-8">
            {/* Account Type Selector */}
              <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setAccountType('customer');
                  setIdentityPhotos({ front: null, back: null });
                  setIdentityConsent(false);
                  setProviderLicensePhoto(null);
                  setLicenseConsent(false);
                }}
                disabled={isSubmitting || confirmationPending || Boolean(createdUserId)}
                  className={cn(
                  "flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all",
                  accountType === 'customer' 
                    ? "border-brand-green bg-green-50 text-brand-green" 
                    : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"
                )}
              >
                <User className="w-6 h-6" />
                <span className="font-semibold text-xs sm:text-sm">Customer</span>
              </button>
              <button
                type="button"
                onClick={() => setAccountType('provider')}
                disabled={isSubmitting || confirmationPending || Boolean(createdUserId)}
                  className={cn(
                  "flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all",
                  accountType === 'provider' 
                    ? "border-brand-navy bg-slate-50 text-brand-navy" 
                    : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"
                )}
              >
                <Briefcase className="w-6 h-6" />
                <span className="font-semibold text-xs sm:text-sm">Provider</span>
              </button>
              <button
                type="button"
                onClick={() => setAccountType('operator')}
                disabled={isSubmitting || confirmationPending || Boolean(createdUserId)}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all",
                  accountType === 'operator' ? "border-brand-navy bg-slate-50 text-brand-navy" : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"
                )}
              >
                <Truck className="w-6 h-6" />
                <span className="font-semibold text-xs sm:text-sm">Heavy operator</span>
              </button>
            </div>

            {accountType !== 'customer' && !createdUserId && (
              <section className="space-y-4 rounded-2xl border border-brand-green/20 bg-brand-softBlue/60 p-4" aria-labelledby="fayda-signup-heading">
                <div>
                  <h2 id="fayda-signup-heading" className="text-base font-bold text-brand-navy">Verify your identity with Fayda</h2>
                  <p className="mt-1 text-sm leading-5 text-slate-600">Take a clear photo of both sides of your ID. JPG or PNG, up to 10 MB per photo.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {['front', 'back'].map((side) => (
                    <fieldset key={side} className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
                      <legend className="px-1 text-sm font-semibold capitalize text-brand-navy">{side} of ID</legend>
                      <p className="truncate text-xs text-slate-500">{identityPhotos[side]?.name || 'No photo selected'}</p>
                      <input
                        ref={(input) => { fileInputs.current[side] = input; }}
                        type="file"
                        accept="image/jpeg,image/png"
                        disabled={isSubmitting}
                        onChange={(event) => {
                          setIdentityPhotos((current) => ({ ...current, [side]: event.target.files?.[0] || null }));
                          event.target.value = '';
                        }}
                        className="sr-only"
                        aria-label={`Choose a photo of the ${side} of your Fayda ID`}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => setCameraTarget({ side, documentName: 'Fayda ID', filePrefix: 'fayda' })} className="h-9 gap-2 px-3 text-xs"><Camera size={14} />Take photo</Button>
                        <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => fileInputs.current[side]?.click()} className="h-9 gap-2 px-3 text-xs"><FileImage size={14} />Choose photo</Button>
                      </div>
                    </fieldset>
                  ))}
                </div>
                <label className="flex items-start gap-3 text-xs leading-5 text-slate-600">
                  <input type="checkbox" checked={identityConsent} onChange={(event) => setIdentityConsent(event.target.checked)} className="mt-1 accent-brand-green" />
                  <span>I confirm these are photos of my Fayda ID and consent to NHFAS storing them privately for identity verification.</span>
                </label>
              </section>
            )}
            {requiresLicenseVerification && !createdUserId && (
              <section className="space-y-4 rounded-2xl border border-brand-green/20 bg-brand-softBlue/60 p-4" aria-labelledby="license-signup-heading">
                <div>
                  <h2 id="license-signup-heading" className="text-base font-bold capitalize text-brand-navy">{licenseDocumentName}</h2>
                  <p className="mt-1 text-sm leading-5 text-slate-600">Take a clear photo of your {licenseDocumentName}. JPG or PNG, up to 10 MB.</p>
                </div>
                <fieldset className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
                  <legend className="px-1 text-sm font-semibold capitalize text-brand-navy">{licenseDocumentName} photo</legend>
                  <p className="truncate text-xs text-slate-500">{providerLicensePhoto?.name || 'No photo selected'}</p>
                  <input
                    ref={licenseFileInput}
                    type="file"
                    accept="image/jpeg,image/png"
                    disabled={isSubmitting}
                    onChange={(event) => {
                      setProviderLicensePhoto(event.target.files?.[0] || null);
                      event.target.value = '';
                    }}
                    className="sr-only"
                    aria-label={`Choose a photo of your ${licenseDocumentName}`}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => setCameraTarget({ side: 'front', documentName: `your ${licenseDocumentName}`, filePrefix: 'provider-license' })} className="h-9 gap-2 px-3 text-xs"><Camera size={14} />Take photo</Button>
                    <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => licenseFileInput.current?.click()} className="h-9 gap-2 px-3 text-xs"><FileImage size={14} />Choose photo</Button>
                  </div>
                </fieldset>
                <label className="flex items-start gap-3 text-xs leading-5 text-slate-600">
                  <input type="checkbox" checked={licenseConsent} disabled={isSubmitting} onChange={(event) => setLicenseConsent(event.target.checked)} className="mt-1 accent-brand-green" />
                  <span>I confirm this is a photo of my {licenseDocumentName} and consent to NHFAS storing it privately for verification.</span>
                </label>
              </section>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 block">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  required
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              {cameraTarget && (
                <IdentityCameraCapture
                  side={cameraTarget.side}
                  documentName={cameraTarget.documentName}
                  filePrefix={cameraTarget.filePrefix}
                  onCapture={(photo) => {
                    if (cameraTarget.filePrefix === 'provider-license') setProviderLicensePhoto(photo);
                    else setIdentityPhotos((current) => ({ ...current, [cameraTarget.side]: photo }));
                  }}
                  onClose={() => setCameraTarget(null)}
                />
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 block">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all"
                  placeholder="henok@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 block">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all"
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
            {message && <div className="space-y-2 text-sm text-brand-green" role="status"><p>{message}</p>{confirmationPending && <button type="button" onClick={resendConfirmation} disabled={isResending || cooldownSeconds > 0} className="font-semibold underline underline-offset-2 disabled:opacity-60">{isResending ? 'Requesting another email...' : cooldownSeconds > 0 ? `Wait ${cooldownSeconds}s before retrying` : 'Resend confirmation email'}</button>}</div>}

            <Button variant="primary" className="w-full flex justify-center items-center gap-2 py-3" type="submit" disabled={isSubmitting || confirmationPending}>
              {isSubmitting
                ? <><LoaderCircle className="h-4 w-4 animate-spin" />{createdUserId ? 'Submitting verification photos...' : 'Creating account...'}</>
                : createdUserId
                  ? <><FileText className="h-4 w-4" />Retry verification submission</>
                  : <>Create Account <ArrowRight className="w-4 h-4" /></>}
            </Button>
          </form>

          <div className="text-center text-sm text-slate-500 mt-8">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-brand-navy hover:text-brand-navy/80 transition-colors">
              Log in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
