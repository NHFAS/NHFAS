import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, LoaderCircle, LogIn, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';

const inputClass =
  'block w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-red-500 focus:outline-none focus:ring-4 focus:ring-red-500/10';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);

  // An existing administrator session skips the form entirely.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !active) {
          if (active) setCheckingSession(false);
          return;
        }
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        if (!active) return;
        if (profile?.role === 'admin') navigate('/admin12login/panel', { replace: true });
        else setCheckingSession(false);
      } catch {
        if (active) setCheckingSession(false);
      }
    })();
    return () => { active = false; };
  }, [navigate]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'NHFAS Admin · Sign in';
    return () => { document.title = previousTitle; };
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Enter your administrator email and password.');
      return;
    }
    setSubmitting(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });
      if (signInError) throw new Error(signInError.message);
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();
      if (profileError) throw new Error(profileError.message);
      if (profile?.role !== 'admin') {
        throw new Error('This account does not have administrator privileges.');
      }
      navigate('/admin12login/panel', { replace: true });
    } catch (e) {
      setError(e.message || 'Sign in failed. Please try again.');
      setSubmitting(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0E17]">
        <LoaderCircle className="h-7 w-7 animate-spin text-red-500" aria-label="Checking session" />
      </div>
    );
  }
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0A0E17] px-4 py-12 font-sans">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[46rem] -translate-x-1/2 rounded-full bg-red-600/25 blur-[130px]" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '26px 26px' }}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-600 shadow-lg shadow-red-600/40">
            <ShieldCheck className="h-6 w-6 text-white" aria-hidden="true" />
          </span>
          <div>
            <p className="text-lg font-extrabold tracking-tight text-white">
              NHFAS <span className="text-red-500">Admin</span>
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500">Control center</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white p-7 shadow-2xl shadow-black/50 sm:p-8">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Administrator sign in</h1>
          <p className="mt-1 text-sm text-slate-500">Restricted area — authorized NHFAS administrators only.</p>

          {error && (
            <div className="mt-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700" role="alert">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            <div>
              <label htmlFor="admin-email" className="block text-xs font-bold uppercase tracking-wide text-slate-500">Email address</label>
              <input
                id="admin-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@nhfas.com"
                className={`mt-1.5 ${inputClass}`}
              />
            </div>
            <div>
              <label htmlFor="admin-password" className="block text-xs font-bold uppercase tracking-wide text-slate-500">Password</label>
              <div className="relative mt-1.5">
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className={`pr-11 ${inputClass}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 transition hover:text-slate-600 focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-500/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <LogIn className="h-4 w-4" aria-hidden="true" />}
              {submitting ? 'Signing in…' : 'Sign in to admin panel'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">Authorized personnel only · All access is monitored</p>
      </div>
    </div>
  );
};

export default AdminLogin;