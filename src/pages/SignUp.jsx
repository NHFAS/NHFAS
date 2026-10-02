import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight, Home, Briefcase, Truck } from 'lucide-react';
import logo from '../assets/logo.png';
import { Button } from '../components/Button';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

const SignUp = () => {
  const navigate = useNavigate();
  const [accountType, setAccountType] = useState('customer');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmationPending, setConfirmationPending] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const resendConfirmation = async () => {
    setError('');
    setIsResending(true);
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: formData.email,
      options: { emailRedirectTo: `${window.location.origin}/login?confirmed=1` },
    });
    if (resendError) setError(resendError.message);
    else setMessage(`A new confirmation email was requested for ${formData.email}. Check your spam folder too.`);
    setIsResending(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsSubmitting(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        emailRedirectTo: `${window.location.origin}/login?confirmed=1`,
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
      navigate('/dashboard');
      return;
    }

    setConfirmationPending(true);
    setMessage(`Account created. A confirmation link was requested for ${formData.email}. Check your spam folder if it does not arrive.`);
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
                onClick={() => setAccountType('customer')}
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
                className={cn(
                  "flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all",
                  accountType === 'operator' ? "border-brand-navy bg-slate-50 text-brand-navy" : "border-slate-100 bg-white text-slate-500 hover:border-slate-200"
                )}
              >
                <Truck className="w-6 h-6" />
                <span className="font-semibold text-xs sm:text-sm">Heavy operator</span>
              </button>
            </div>

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
            {message && <div className="space-y-2 text-sm text-brand-green" role="status"><p>{message}</p>{confirmationPending && <button type="button" onClick={resendConfirmation} disabled={isResending} className="font-semibold underline underline-offset-2 disabled:opacity-60">{isResending ? 'Requesting another email...' : 'Resend confirmation email'}</button>}</div>}

            <Button variant="primary" className="w-full flex justify-center items-center gap-2 py-3" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating account...' : 'Create Account'} <ArrowRight className="w-4 h-4" />
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
