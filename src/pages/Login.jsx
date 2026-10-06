import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Home } from 'lucide-react';
import logo from '../assets/logo.png';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';
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

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [isMagicLinkMode, setIsMagicLinkMode] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;

    const timer = window.setTimeout(() => {
      setCooldownSeconds((current) => (current > 0 ? current - 1 : 0));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [cooldownSeconds]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));

    if (params.get('confirmed') === '1') setMessage('Email confirmed. You can sign in now.');
    if (params.get('magic') === '1') setMessage('Secure magic link received. Sign in from the link to continue.');
    if (params.get('reset') === '1' || hashParams.get('type') === 'recovery') {
      setIsPasswordRecovery(true);
      setMessage('Create a new password to finish the reset.');
    }

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && window.location.hash.includes('type=recovery')) {
        setIsPasswordRecovery(true);
        setMessage('Create a new password to finish the reset.');
      } else if (session) {
        navigate('/dashboard', { replace: true });
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
        setMessage('Create a new password to finish the reset.');
      }
      if (session) {
        setError('');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const resendConfirmation = async () => {
    const cooldownRemaining = Math.max(cooldownSeconds, getStoredCooldownRemaining('nhfas_resend_signup_cooldown'));
    if (!formData.email || cooldownRemaining > 0) {
      setCooldownSeconds(cooldownRemaining);
      setError(cooldownRemaining > 0 ? `Please wait ${cooldownRemaining}s before requesting another email.` : 'Please enter an email address.');
      return;
    }

    setIsResending(true);
    setError('');
    setStoredCooldown('nhfas_resend_signup_cooldown');
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: formData.email,
      options: { emailRedirectTo: getAppUrl('login?confirmed=1') },
    });

    if (resendError) {
      const message = resendError.message.includes('rate') || resendError.message.toLowerCase().includes('too many requests')
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

    if (isMagicLinkMode) {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: formData.email,
        options: {
          emailRedirectTo: getAppUrl('login?magic=1'),
        },
      });

      if (otpError) {
        setError(otpError.message);
      } else {
        setMessage(`A secure magic link has been sent to ${formData.email}. Use it to continue securely.`);
      }

      setIsSubmitting(false);
      return;
    }

    if (isPasswordRecovery) {
      if (!formData.password || formData.password.length < 6) {
        setError('Choose a new password with at least 6 characters.');
        setIsSubmitting(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: formData.password });
      if (updateError) {
        setError(updateError.message);
        setIsSubmitting(false);
        return;
      }

      setMessage('Password updated successfully. Redirecting to your dashboard...');
      navigate('/dashboard', { replace: true });
      return;
    }

    if (isResetting) {
      const cooldownRemaining = Math.max(cooldownSeconds, getStoredCooldownRemaining('nhfas_reset_password_cooldown'));
      if (cooldownRemaining > 0) {
        setError(`Please wait ${cooldownRemaining}s before requesting another reset email.`);
        setCooldownSeconds(cooldownRemaining);
        setIsSubmitting(false);
        return;
      }

      setStoredCooldown('nhfas_reset_password_cooldown');
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: getAppUrl('login?reset=1'),
      });
      if (resetError) {
        const message = resetError.message.toLowerCase().includes('rate') || resetError.message.toLowerCase().includes('too many requests')
          ? 'Too many reset requests. Please wait a moment before trying again.'
          : resetError.message;
        setError(message);
        setCooldownSeconds(60);
      } else {
        setMessage(`If an account exists for ${formData.email}, a password reset link has been sent to your email.`);
        setCooldownSeconds(60);
        setIsResetting(false);
      }
      setIsSubmitting(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    });

    if (signInError) {
      setError(signInError.message);
      setNeedsConfirmation(signInError.code === 'email_not_confirmed' || signInError.message.toLowerCase().includes('email not confirmed'));
      setIsSubmitting(false);
      return;
    }

    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex bg-brand-softBlue font-sans">
      {/* Left side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 lg:px-24 bg-white relative">
        <Link to="/" className="absolute top-8 left-8 sm:left-12 flex items-center gap-2 text-slate-500 hover:text-brand-navy transition-colors">
          <Home className="w-5 h-5" />
          <span className="font-medium">Back to Home</span>
        </Link>

        <div className="max-w-md w-full mx-auto space-y-8 mt-12 lg:mt-0">
          <div className="text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-2 mb-6">
              <img src={logo} alt="NHFAS Logo" className="h-14 w-auto object-contain" />
              <span className="font-extrabold text-2xl text-brand-navy tracking-tight">NHFAS</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Welcome back</h1>
            <p className="text-slate-500 mt-2">{isPasswordRecovery ? 'Choose a new password.' : isResetting ? 'Request a password recovery link.' : isMagicLinkMode ? 'Send a secure sign-in link instead.' : 'Please enter your details to sign in.'}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 mt-8">
            <div className="space-y-2">
                {!isPasswordRecovery && <label className="text-sm font-medium text-slate-700 block">Email</label>}
                {!isPasswordRecovery && <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  required={!isPasswordRecovery}
                  disabled={isPasswordRecovery}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>}
            </div>

            {!isResetting && !isMagicLinkMode && <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-slate-700 block">{isPasswordRecovery ? 'New password' : 'Password'}</label>
                {!isPasswordRecovery && <button type="button" onClick={() => { setIsResetting(true); setNeedsConfirmation(false); setError(''); setMessage(''); }} className="text-sm font-medium text-brand-green hover:text-brand-green/80">Forgot password?</button>}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  minLength={6}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>}

            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
            {message && <p className="text-sm text-brand-green" role="status">{message}</p>}
            {needsConfirmation && <button type="button" onClick={resendConfirmation} disabled={isResending || !formData.email || cooldownSeconds > 0} className="text-left text-sm font-semibold text-brand-navy underline underline-offset-2 disabled:opacity-60">{isResending ? 'Requesting another email...' : cooldownSeconds > 0 ? `Wait ${cooldownSeconds}s before retrying` : 'Resend confirmation email'}</button>}

            <Button variant="primary" className="w-full flex justify-center items-center gap-2 py-3" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Please wait...' : isPasswordRecovery ? 'Save new password' : isResetting ? 'Send recovery link' : isMagicLinkMode ? 'Send magic link' : 'Sign In'} <ArrowRight className="w-4 h-4" />
            </Button>
            {(isResetting || isPasswordRecovery || isMagicLinkMode) && <button type="button" onClick={() => { setIsResetting(false); setIsPasswordRecovery(false); setIsMagicLinkMode(false); setMessage(''); setError(''); }} className="w-full text-center text-sm font-medium text-slate-600 underline underline-offset-2">Back to sign in</button>}
            {!isPasswordRecovery && !isResetting && !isMagicLinkMode && (
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                <button type="button" onClick={() => { setIsResetting(true); setIsMagicLinkMode(false); setNeedsConfirmation(false); setError(''); setMessage(''); }} className="text-sm font-medium text-brand-green hover:text-brand-green/80">Reset by email</button>
                <button type="button" onClick={() => { setIsMagicLinkMode(true); setIsResetting(false); setNeedsConfirmation(false); setError(''); setMessage(''); }} className="text-sm font-medium text-brand-navy hover:text-brand-navy/80">Use magic link</button>
              </div>
            )}
          </form>

          <div className="text-center text-sm text-slate-500 mt-8">
            Don't have an account?{' '}
            <Link to="/signup" className="font-semibold text-brand-green hover:text-brand-green/80 transition-colors">
              Sign up
            </Link>
          </div>
        </div>
      </div>

      {/* Right side - Image/Decoration */}
      <div className="hidden lg:flex w-1/2 bg-brand-navy items-center justify-center p-12 relative overflow-hidden">
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <div className="absolute w-96 h-96 bg-brand-green rounded-full blur-3xl -top-20 -left-20"></div>
          <div className="absolute w-96 h-96 bg-brand-purple rounded-full blur-3xl bottom-20 -right-20"></div>
        </div>
        
        <div className="relative z-10 max-w-lg text-white space-y-6">
          <h2 className="text-4xl font-bold leading-tight">Manage all your services in one place.</h2>
          <p className="text-slate-300 text-lg">Access a comprehensive suite of handyman, artisan, and haulage services tailored for you.</p>
          
          <div className="flex items-center gap-4 pt-8">
            <div className="flex -space-x-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className={`w-10 h-10 rounded-full border-2 border-brand-navy flex items-center justify-center text-xs font-bold ${
                  i === 0 ? 'bg-brand-green' : i === 1 ? 'bg-brand-orange' : i === 2 ? 'bg-brand-purple' : 'bg-slate-200 text-slate-800'
                }`}>
                  {i === 3 ? '+2k' : (
                    <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="User" className="w-full h-full rounded-full object-cover" />
                  )}
                </div>
              ))}
            </div>
            <p className="text-sm text-slate-300 font-medium">Join thousands of satisfied customers</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
