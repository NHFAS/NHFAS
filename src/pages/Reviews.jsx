import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, MessageSquareText, Star } from 'lucide-react';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';

const Reviews = () => {
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isCurrent = true;

    const loadReviews = async () => {
      setIsLoading(true);
      setError('');
      setNeedsSignIn(false);

      try {
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        if (authError) throw authError;

        if (!session?.user) {
          if (isCurrent) setNeedsSignIn(true);
          return;
        }

        const { data, error: reviewsError } = await supabase
          .from('ratings')
          .select('id, stars, comment, created_at, jobs(title), reviewer:profiles!ratings_rater_id_fkey(full_name)')
          .eq('ratee_id', session.user.id)
          .order('created_at', { ascending: false });

        if (reviewsError) throw reviewsError;
        if (isCurrent) setReviews(data || []);
      } catch {
        if (isCurrent) setError('Your reviews could not be loaded. Check your connection and try again.');
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };

    loadReviews();
    return () => {
      isCurrent = false;
    };
  }, [retryCount]);

  const averageRating = reviews.length
    ? reviews.reduce((total, review) => total + review.stars, 0) / reviews.length
    : 0;
  const hasLoadedReviews = !isLoading && !needsSignIn && !error;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-green">Provider profile</p>
          <h1 className="mt-2 text-3xl font-extrabold text-brand-navy">Your reviews</h1>
          <p className="mt-2 max-w-2xl text-slate-500">Feedback from clients who have worked with you.</p>
        </div>
        <Button as={Link} to="/dashboard/services" variant="outline" className="inline-flex items-center gap-2 self-start sm:self-auto">
          Manage services
          <ArrowRight className="h-4 w-4" />
        </Button>
      </header>

      <section aria-label="Review summary" className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <p className="text-sm font-medium text-slate-500">Average rating</p>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-brand-navy">{hasLoadedReviews ? averageRating.toFixed(1) : '--'}</span>
            <span className="text-sm text-slate-500">out of 5</span>
          </div>
          <div className="mt-3 flex items-center gap-1" aria-label={hasLoadedReviews ? `${averageRating.toFixed(1)} out of 5 stars` : 'No rating to display'}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={star} aria-hidden="true" className={`h-4 w-4 ${star <= Math.round(averageRating) && reviews.length ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-6">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <MessageSquareText className="h-6 w-6" />
          </span>
          <div>
            <p className="text-sm font-medium text-slate-500">Reviews received</p>
            <p className="mt-1 text-3xl font-extrabold text-brand-navy">{hasLoadedReviews ? reviews.length : '--'}</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="reviews-list-heading">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">Client feedback</p>
            <h2 id="reviews-list-heading" className="mt-1 text-xl font-bold text-brand-navy">Recent reviews</h2>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-sm text-slate-500" role="status">
            Loading your reviews...
          </div>
        ) : needsSignIn ? (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
            <h3 className="font-bold text-brand-navy">Sign in to view your reviews</h3>
            <p className="mt-2 text-sm text-slate-500">Your client feedback is only available to your account.</p>
            <Button as={Link} to="/login" variant="primary" className="mt-5">Sign in</Button>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-5" role="alert">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
              <div>
                <p className="text-sm font-semibold text-red-900">{error}</p>
                <button onClick={() => setRetryCount((count) => count + 1)} className="mt-3 text-sm font-semibold text-red-800 underline underline-offset-2">
                  Try again
                </button>
              </div>
            </div>
          </div>
        ) : reviews.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white px-6 py-12 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <Star className="h-6 w-6" />
            </span>
            <h3 className="mt-4 font-bold text-brand-navy">No reviews yet</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-5 text-slate-500">When clients leave feedback on completed work, it will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <article key={review.id} className="rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-bold text-brand-navy">{review.jobs?.title || 'Service review'}</h3>
                    <p className="mt-1 text-sm text-slate-500">From {review.reviewer?.full_name || 'NHFAS client'}</p>
                  </div>
                  <time className="text-sm text-slate-500" dateTime={review.created_at}>
                    {new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(review.created_at))}
                  </time>
                </div>
                <div className="mt-3 flex items-center gap-1" aria-label={`${review.stars} out of 5 stars`}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} aria-hidden="true" className={`h-4 w-4 ${star <= review.stars ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                  ))}
                  <span className="ml-2 text-sm font-semibold text-slate-700">{review.stars}.0</span>
                </div>
                {review.comment ? (
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">{review.comment}</p>
                ) : (
                  <p className="mt-4 text-sm italic text-slate-400">No written feedback.</p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Reviews;