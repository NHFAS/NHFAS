import React, { useEffect, useState } from 'react';
import { ArrowRight, Eye, EyeOff, Save, Wrench } from 'lucide-react';
import { Link, useOutletContext } from 'react-router-dom';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';

const ProviderServices = () => {
  const { user, isClientMode } = useOutletContext();
  const [form, setForm] = useState({ bio: '', service_radius_km: '15', is_searchable: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    let isCurrent = true;
    const load = async () => {
      const { data, error: loadError } = await supabase
        .from('provider_profiles')
        .select('bio, service_radius_km, is_searchable')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!isCurrent) return;
      if (loadError) {
        setError('Your provider profile could not be loaded. Please try again.');
      } else if (data) {
        setForm({
          bio: data.bio || '',
          service_radius_km: String(data.service_radius_km || 15),
          is_searchable: data.is_searchable,
        });
      }
      setLoading(false);
    };

    load();
    return () => { isCurrent = false; };
  }, [user.id]);

  const saveProfile = async (event) => {
    event.preventDefault();
    setError('');
    setFeedback('');
    const radius = Number(form.service_radius_km);
    if (!Number.isFinite(radius) || radius <= 0 || radius > 500) {
      setError('Enter a service radius between 1 and 500 km.');
      return;
    }

    setSaving(true);
    const { error: saveError } = await supabase
      .from('provider_profiles')
      .upsert({
        user_id: user.id,
        bio: form.bio.trim() || null,
        service_radius_km: radius,
        is_searchable: form.is_searchable,
      }, { onConflict: 'user_id' });
    setSaving(false);

    if (saveError) setError('Your provider profile could not be saved. Please try again.');
    else setFeedback('Your provider profile has been saved.');
  };

  if (isClientMode) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-8">
        <h1 className="text-2xl font-extrabold text-brand-navy">Provider services</h1>
        <p className="mt-2 text-sm text-slate-600">Switch to Provider workspace to manage your public profile.</p>
      </div>
    );
  }

  if (loading) return <p className="py-12 text-sm text-slate-500" role="status">Loading your service profile...</p>;

  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-green">Provider workspace</p>
        <h1 className="mt-2 text-3xl font-extrabold text-brand-navy">Services and profile</h1>
        <p className="mt-2 max-w-2xl text-slate-500">Tell clients what you do and control whether your profile appears in provider searches.</p>
      </header>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {feedback && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{feedback}</p>}

      <form onSubmit={saveProfile} className="space-y-6 rounded-xl border border-slate-200 bg-white p-5 sm:p-7">
        <label className="block space-y-2 text-sm font-semibold text-slate-700">
          About your services
          <textarea
            rows={5}
            maxLength={1200}
            value={form.bio}
            onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
            placeholder="Describe the work you offer, your experience, and useful details for clients."
            className="block w-full rounded-lg border border-slate-300 px-3 py-3 font-normal focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20"
          />
          <span className="block text-xs font-normal text-slate-400">{form.bio.length}/1200 characters</span>
        </label>

        <label className="block max-w-sm space-y-2 text-sm font-semibold text-slate-700">
          Service radius (km)
          <input
            type="number"
            min="1"
            max="500"
            required
            value={form.service_radius_km}
            onChange={(event) => setForm((current) => ({ ...current, service_radius_km: event.target.value }))}
            className="block w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20"
          />
        </label>

        <label className="flex items-start gap-3 rounded-lg border border-slate-200 p-4">
          <input
            type="checkbox"
            checked={form.is_searchable}
            onChange={(event) => setForm((current) => ({ ...current, is_searchable: event.target.checked }))}
            className="mt-1 h-4 w-4 accent-emerald-700"
          />
          <span>
            <span className="flex items-center gap-2 font-semibold text-brand-navy">
              {form.is_searchable ? <Eye className="h-4 w-4 text-emerald-700" /> : <EyeOff className="h-4 w-4 text-slate-500" />}
              Show my profile in provider search
            </span>
            <span className="mt-1 block text-sm leading-5 text-slate-500">
              Turning this off hides your profile from provider search. It does not change active job assignments.
            </span>
          </span>
        </label>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={saving} className="gap-2">
            <Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save profile'}
          </Button>
          <Button as={Link} to="/dashboard/find-me" variant="outline" className="gap-2">
            <Wrench className="h-4 w-4" /> Manage location availability
          </Button>
          <Link to="/dashboard/verification" className="inline-flex items-center gap-2 self-center text-sm font-semibold text-brand-green">
            Verification status <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </form>
    </div>
  );
};

export default ProviderServices;
