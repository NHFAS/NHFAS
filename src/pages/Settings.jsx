import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { Check, LogOut, Save, ShieldCheck } from 'lucide-react';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';

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

  useEffect(() => {
    if (!profile) return;
    setFormData({
      full_name: profile.full_name || '',
      phone: profile.phone || '',
      preferred_language: profile.preferred_language || 'en',
      low_literacy_mode: Boolean(profile.low_literacy_mode),
    });
  }, [profile]);

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setFeedback({ type: '', message: '' });

    if (!user) {
      setFeedback({ type: 'error', message: 'Sign in before updating your profile.' });
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
        </form>
      </section>
    </div>
  );
};

export default SettingsPage;