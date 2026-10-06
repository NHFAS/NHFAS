import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Home } from 'lucide-react';
import logo from '../assets/logo.png';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
            <p className="text-slate-500 mt-2">Please enter your details to sign in.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 mt-8">
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
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-slate-700 block">Password</label>
                <a href="#" className="text-sm font-medium text-brand-green hover:text-brand-green/80">Forgot password?</a>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green outline-none transition-all"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

            <Button variant="primary" className="w-full flex justify-center items-center gap-2 py-3" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign In'} <ArrowRight className="w-4 h-4" />
            </Button>
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
