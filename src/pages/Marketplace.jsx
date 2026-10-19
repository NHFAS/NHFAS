import React, { useEffect, useState } from 'react';
import { ArrowRight, BriefcaseBusiness, MapPinned, Search, Sparkles, Star } from 'lucide-react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { servicesData } from '../data/services';
import { supabase } from '../lib/supabase';

const serviceRoutes = {
  handyman: '/services/handyman',
  artisans: '/services/artisans',
  'heavy-haul': '/services/heavy-haulage',
  auction: '/services/auction',
};

const Marketplace = () => {
  const { isClientMode } = useOutletContext();
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let isCurrent = true;
    const load = async () => {
      const [{ data: categoryRows, error: categoryError }, { data: providerRows, error: providerError }] = await Promise.all([
        supabase.from('service_categories').select('id, name, category_type').eq('is_active', true).order('name').limit(18),
        supabase.from('provider_profiles').select('user_id, bio, average_rating, rating_count').eq('is_searchable', true).limit(20),
      ]);
      if (!isCurrent) return;
      if (categoryError || providerError) setLoadError('Some marketplace sections could not be loaded. Please refresh.');
      setCategories(categoryRows || []);

      const providerList = providerRows || [];
      const rated = providerList
        .filter((row) => row.average_rating !== null)
        .sort((a, b) => Number(b.average_rating) - Number(a.average_rating));
      const candidates = (rated.length ? rated : providerList).slice(0, 6);
      if (candidates.length) {
        const { data: profileRows, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', candidates.map((row) => row.user_id));
        if (!isCurrent) return;
        if (profileError) {
          setLoadError('Featured providers could not be loaded. Please refresh.');
        } else {
          const namesById = new Map((profileRows || []).map((row) => [row.id, row.full_name]));
          setFeatured(candidates.map((row) => ({
            id: row.user_id,
            fullName: namesById.get(row.user_id) || 'Provider',
            bio: row.bio,
            averageRating: row.average_rating,
            ratingCount: row.rating_count || 0,
          })));
        }
      }
    };
    load();
    return () => { isCurrent = false; };
  }, []);

  const handleSearch = (event) => {
    event.preventDefault();
    const query = searchInput.trim();
    navigate(query ? `/dashboard/search?q=${encodeURIComponent(query)}` : '/dashboard/search');
  };

  return (
    <div className="mx-auto max-w-[1600px] space-y-8 px-1 py-2">
      <header className="overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-br from-brand-navy via-[#103d6a] to-[#0e2950] text-white shadow-[0_30px_80px_rgba(11,37,69,0.18)]">
        <div className="grid gap-8 p-8 lg:grid-cols-[1.2fr_0.8fr] lg:p-10">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">Marketplace</p>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white md:text-4xl">
              Find a service for every job.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-200 md:text-base">
              Explore service categories, find providers, and manage requests from your workspace.
            </p>
            <form onSubmit={handleSearch} className="mt-6 flex max-w-xl gap-2">
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search electrician, haulage, or a provider name"
                aria-label="Search services and providers"
                className="block w-full rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm text-white placeholder:text-slate-300 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/40"
              />
              <button
                type="submit"
                className="inline-flex shrink-0 items-center gap-2 rounded-full bg-brand-green px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-green/90"
              >
                <Search className="h-4 w-4" /> Search
              </button>
            </form>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Link to="/dashboard/bookings" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-green/30 hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-700"><BriefcaseBusiness className="h-5 w-5" /></div>
            <div>
              <p className="text-sm font-semibold text-brand-navy">Booked jobs</p>
              <p className="text-xs text-slate-500">View job details and status</p>
            </div>
          </div>
        </Link>
        {isClientMode ? (
          <Link to="/dashboard/search" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-green/30 hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-sky-50 p-2 text-sky-700"><Search className="h-5 w-5" /></div>
              <div>
                <p className="text-sm font-semibold text-brand-navy">Search providers</p>
                <p className="text-xs text-slate-500">Find professionals near you</p>
              </div>
            </div>
          </Link>
        ) : (
          <Link to="/dashboard/find-me" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-green/30 hover:shadow-md">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-sky-50 p-2 text-sky-700"><MapPinned className="h-5 w-5" /></div>
              <div>
                <p className="text-sm font-semibold text-brand-navy">Live availability</p>
                <p className="text-xs text-slate-500">Nearby professionals and logistics</p>
              </div>
            </div>
          </Link>
        )}
        <Link to="/dashboard/post-job" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-green/30 hover:shadow-md">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-violet-50 p-2 text-violet-700"><Sparkles className="h-5 w-5" /></div>
            <div>
              <p className="text-sm font-semibold text-brand-navy">Post a job</p>
              <p className="text-xs text-slate-500">Describe the work you need done</p>
            </div>
          </div>
        </Link>
      </section>

      {loadError && (
        <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{loadError}</p>
      )}

      {categories.length > 0 && (
        <section aria-labelledby="live-categories-heading">
          <div className="mb-4">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-green">Live categories</p>
            <h2 id="live-categories-heading" className="mt-2 text-2xl font-extrabold text-brand-navy">Browse by trade</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/dashboard/search?q=${encodeURIComponent(category.name)}`}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-brand-green/50 hover:bg-emerald-50/40 hover:text-brand-green"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {featured.length > 0 && (
        <section aria-labelledby="featured-providers-heading">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-green">Top rated</p>
              <h2 id="featured-providers-heading" className="mt-2 text-2xl font-extrabold text-brand-navy">Featured providers</h2>
            </div>
            <Link to="/dashboard/search" className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-brand-green hover:text-brand-navy">
              Search all providers <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {featured.map((provider) => (
              <article
                key={provider.id}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-green/30 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-700">
                    {(provider.fullName || '?').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate font-bold text-brand-navy">{provider.fullName}</h3>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                      {provider.averageRating !== null ? (
                        <>
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                          {Number(provider.averageRating).toFixed(1)} · {provider.ratingCount} reviews
                        </>
                      ) : (
                        'New provider'
                      )}
                    </p>
                  </div>
                </div>
                {provider.bio && <p className="mt-3 line-clamp-2 text-sm leading-5 text-slate-500">{provider.bio}</p>}
                <Link
                  to={`/dashboard/provider/${provider.id}`}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-green hover:text-brand-navy"
                >
                  View profile <ArrowRight className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-green">Service catalog</p>
            <h2 className="mt-2 text-2xl font-extrabold text-brand-navy">Choose a category</h2>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {servicesData.map((service) => (
            <Link
              key={service.id}
              to={serviceRoutes[service.id] || '/search'}
              className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-green/30 hover:shadow-lg"
            >
              <div className="h-44 overflow-hidden rounded-2xl bg-slate-100">
                <img src={service.image} alt={service.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-brand-navy">{service.title}</h3>
                  <p className="mt-1 text-sm leading-5 text-slate-500">{service.description}</p>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-green/10 text-brand-green">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Marketplace;
