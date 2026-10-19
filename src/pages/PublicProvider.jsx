import React, { useEffect, useState } from 'react';
import { ArrowLeft, BadgeCheck, Briefcase, Star, MapPin } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';

const PublicProvider = () => {
  const { userId } = useParams();
  const [provider, setProvider] = useState(null);
  const [fullName, setFullName] = useState('');
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isCurrent = true;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (isCurrent) {
          setNeedsSignIn(true);
          setIsLoading(false);
        }
        return;
      }
      const [{ data: profile }, { data: details }, { data: reviewRows, error: reviewsError }] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', userId).maybeSingle(),
        supabase.from('provider_profiles').select('bio, years_experience, average_rating, rating_count, kyc_status, is_searchable').eq('user_id', userId).maybeSingle(),
        supabase.from('ratings')
          .select('id, stars, comment, created_at, rater:profiles!ratings_rater_id_fkey(full_name)')
          .eq('ratee_id', userId)
          .order('created_at', { ascending: false })
          .limit(6),
      ]);
      if (!isCurrent) return;
      setReviews(reviewsError ? [] : (reviewRows || []));
      if (!profile) {
        setError('This provider could not be found.');
        setIsLoading(false);
        return;
      }
      setFullName(profile.full_name || 'NHFAS provider');
      setProvider(details || {});
      setIsLoading(false);
    })();
    return () => { isCurrent = false; };
  }, [userId]);

  if (isLoading) {
    return <div className="py-16 text-sm text-slate-500" role="status">Loading provider profile...</div>;
  }

  if (needsSignIn) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-white p-10 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
          <Briefcase className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-2xl font-extrabold text-brand-navy">Sign in to view this provider</h1>
        <p className="mt-2 text-sm text-slate-500">Sign in to view this provider profile and any available rating information.</p>
        <Button as={Link} to="/login" variant="primary" className="mt-6">
          Sign in
        </Button>
      </div>
    );
  }

  if (error || !provider) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-red-200 bg-red-50 p-10 text-center">
        <p className="font-semibold text-red-800">{error || 'This provider is not available right now.'}</p>
        <Link to="/dashboard/search" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-green hover:text-brand-green/80">
          <ArrowLeft className="h-4 w-4" /> Back to search
        </Link>
      </div>
    );
  }
  const stars = Array.from({ length: 5 }, (_, i) => {
    const value = provider.average_rating ?? 0;
    return i < Math.round(value) ? <Star key={i} className='h-4 w-4 fill-amber-400 text-amber-400' /> : <Star key={i} className='h-4 w-4 text-slate-200' />;
  });

  return (
    <div className='mx-auto max-w-4xl space-y-6'>
      <Link to='/dashboard/search' className='inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-brand-navy'>
        <ArrowLeft className='h-4 w-4' /> Back to search
      </Link>

      <article className='overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'>
        <div className='h-2 bg-gradient-to-r from-brand-green via-emerald-300 to-brand-navy' />
        <div className='px-6 py-7'>
          <div className='flex flex-col gap-5 sm:flex-row sm:items-start'>
            <div className='flex flex-col items-center gap-3 sm:flex-1'>
              <div className='flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-navy text-white text-2xl font-extrabold shadow-sm'>
                {fullName.split(' ').map(p => p[0]).join('') || 'P'}
              </div>
              <div className='flex items-center gap-2'>
                {provider.kyc_status === 'approved' ? (
                  <span className='flex items-center gap-1 text-xs font-semibold text-emerald-700'>
                    <BadgeCheck className='h-4 w-4' /> Identity verified
                  </span>
                ) : provider.kyc_status === 'rejected' ? (
                  <span className='text-xs font-medium text-red-600'>Identity verification needs attention</span>
                ) : (
                  <span className='text-xs text-slate-500'>Identity verification pending</span>
                )}
              </div>
            </div>
            <div className='flex-1 space-y-3'>
              <h1 className='text-2xl font-extrabold text-brand-navy'>{fullName}</h1>
              <div className='flex flex-wrap items-center gap-3 text-sm text-slate-500'>
                <span className='inline-flex items-center gap-1.5'>
                  <Star className='h-4 w-4 fill-amber-400 text-amber-400' />
                  <span className='font-bold text-brand-navy'>{provider.average_rating ?? 'No ratings yet'}</span>
                  <span className='text-slate-400'>({provider.rating_count ?? 0})</span>
                </span>
                {provider.years_experience != null && (
                  <span className='inline-flex items-center gap-1 text-slate-400'>
                    <Briefcase className='h-4 w-4' /> {provider.years_experience} years experience
                  </span>
                )}
                {provider.is_searchable === false && <span className='text-xs text-slate-400'>Currently not visible on the map</span>}
              </div>
              {provider.bio && <p className='text-sm leading-6 text-slate-600'>{provider.bio}</p>}
            </div>
          </div>
        </div>
      </article>

      <div className='grid gap-4 sm:grid-cols-3'>
        <div className='rounded-xl border border-slate-200 bg-white p-5'>
          <p className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-400'>Rating</p>
          <p className='mt-2 text-2xl font-extrabold text-brand-navy'>
            {provider.average_rating != null ? Number(provider.average_rating).toFixed(1) : '—'}
            <span className='text-sm font-semibold text-slate-400'> / 5</span>
          </p>
          <p className='mt-1 text-xs text-slate-500'>{provider.rating_count || 0} client review{provider.rating_count === 1 ? '' : 's'}</p>
        </div>
        <div className='rounded-xl border border-slate-200 bg-white p-5'>
          <p className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-400'>Experience</p>
          <p className='mt-2 text-2xl font-extrabold text-brand-navy'>
            {provider.years_experience != null ? provider.years_experience : '—'}
            <span className='text-sm font-semibold text-slate-400'> years</span>
          </p>
          <p className='mt-1 text-xs text-slate-500'>Professional experience</p>
        </div>
        <div className='rounded-xl border border-slate-200 bg-white p-5'>
          <p className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-400'>Availability</p>
          <p className='mt-2 text-sm text-slate-600'>
            {provider.is_searchable === false
              ? 'Currently hidden from the client map. Announce when you are available.'
              : 'Marked searchable — post a job to work with this provider.'}
          </p>
        </div>
      </div>

      <section aria-label='Client reviews' className='rounded-xl border border-slate-200 bg-white p-5 sm:p-7'>
        <h2 className='text-lg font-bold text-brand-navy'>Client reviews</h2>
        {reviews.length === 0 ? (
          <p className='mt-3 text-sm text-slate-500'>No reviews yet. Reviews appear after completed jobs.</p>
        ) : (
          <ul className='mt-4 space-y-4'>
            {reviews.map((review) => (
              <li key={review.id} className='border-b border-slate-100 pb-4 last:border-b-0 last:pb-0'>
                <div className='flex items-center justify-between gap-3'>
                  <span className='flex items-center gap-1' aria-label={`${review.stars} out of 5 stars`}>
                    {Array.from({ length: 5 }, (_, index) => (
                      <Star
                        key={index}
                        className={`h-4 w-4 ${index < review.stars ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
                      />
                    ))}
                  </span>
                  <span className='text-xs text-slate-400'>
                    {new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(review.created_at))}
                  </span>
                </div>
                <p className='mt-2 text-sm font-semibold text-brand-navy'>{review.rater?.full_name || 'Client'}</p>
                {review.comment && <p className='mt-1 text-sm leading-6 text-slate-600'>{review.comment}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className='flex flex-wrap gap-3'>
        <Button as={Link} to='/dashboard/post-job' variant='primary' className='inline-flex items-center gap-2'>
          <Briefcase className='h-4 w-4' /> Request a quote
        </Button>
        <Button as={Link} to='/dashboard' variant='outline' className='inline-flex items-center gap-2'>
          <ArrowLeft className='h-4 w-4' /> Back
        </Button>
      </div>
    </div>
  );
};

export default PublicProvider;
