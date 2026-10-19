import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Home } from 'lucide-react';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleForgotPassword = async () => {
    if (!formData.email.trim()) {
      setError('Enter your email above, then tap "Forgot password" again.');
      return;
    }
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(formData.email.trim());
    if (resetError) setError(resetError.message);
    else {
      setError('');
      setResetSent(true);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    });

    if (signInError) {
      setError(signInError.message);
      setIsSubmitting(false);
      return;
    }

    navigate(location.state?.from || '/dashboard');
  };

  return (
    <div className="min-h-screen flex bg-slate-100 font-sans">
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 lg:px-24 bg-white relative">
        <Link to="/" className="absolute top-8 left-8 sm:left-12 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-brand-navy">
          <Home className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        <div className="mx-auto w-full max-w-md space-y-8 pt-12 lg:pt-0">
          <div className="text-center lg:text-left">
            <div className="mb-6 flex items-center justify-center gap-3 lg:justify-start">
              <img src="/brand/logo.svg" alt="NHFAS Logo" className="h-11 w-auto object-contain" />
              <span className="text-2xl font-extrabold tracking-tight text-brand-navy">NHFAS</span>
            </div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-green">Welcome back</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">Sign in to your workspace</h1>
            <p className="mt-2 text-slate-500">Access bookings, provider tools, and service requests in one place.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Email</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm text-slate-900 outline-none transition-all focus:border-brand-green focus:bg-white focus:ring-4 focus:ring-brand-green/10"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <button type="button" onClick={handleForgotPassword} className="text-sm font-medium text-brand-green transition-colors hover:text-brand-green/80">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm text-slate-900 outline-none transition-all focus:border-brand-green focus:bg-white focus:ring-4 focus:ring-brand-green/10"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
            {resetSent && (
              <p className="text-sm text-brand-green" role="status">
                Password reset link sent. Check your email inbox.
              </p>
            )}

            <Button variant="primary" className="w-full justify-center gap-2 py-3" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign In'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <div className="text-center text-sm text-slate-500">
            Don't have an account?{' '}
            <Link to="/signup" className="font-semibold text-brand-green transition-colors hover:text-brand-green/80">
              Create one
            </Link>
          </div>
        </div>
      </div>

      <div className="hidden w-1/2 overflow-hidden bg-gradient-to-br from-brand-navy via-[#103d6a] to-[#0b2545] lg:flex lg:items-center lg:justify-center relative">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -left-12 top-20 h-72 w-72 rounded-full bg-brand-green blur-3xl"></div>
          <div className="absolute bottom-16 -right-10 h-80 w-80 rounded-full bg-brand-purple blur-3xl"></div>
        </div>

        <div className="relative z-10 max-w-lg space-y-8 p-12 text-white">
          <div>
            <h2 className="text-4xl font-extrabold leading-tight">Built for a better service experience.</h2>
            <p className="mt-4 text-lg leading-8 text-slate-200">
              Manage jobs, discover service categories, and coordinate with the people involved in your work.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
