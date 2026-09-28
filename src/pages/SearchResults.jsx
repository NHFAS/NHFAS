import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, BriefcaseBusiness, Search, Star, UserRound } from 'lucide-react';
import { Button } from '../components/Button';
import { servicesData } from '../data/services';
import { supabase } from '../lib/supabase';

const serviceRoutes = {
  handyman: '/services/handyman',
  artisans: '/services/artisans',
  'heavy-haul': '/services/heavy-haulage',
  auction: '/services/auction',
  equipment: '/services/equipment',
};

const serviceKeywords = {
  handyman: 'handyman repair repairs home plumbing plumber electrician electrical carpentry carpenter painting maintenance',
  artisans: 'artisan artisans skilled craft crafts custom furniture woodworking tailoring artwork maker artist',
  'heavy-haul': 'haulage heavy haul transport cargo machinery crane truck towing',
  auction: 'art auction bidding artwork',
  equipment: 'equipment rental tool tools machinery',
};

const categoryRoutes = {
  artisan: '/services/artisans',
  haulage: '/services/heavy-haulage',
  custom_build: '/services/artisans',
  art: '/services/auction',
};

const SearchResults = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q')?.trim() || '';
  const [searchInput, setSearchInput] = useState(query);
  const [serviceResults, setServiceResults] = useState([]);
  const [providerResults, setProviderResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [providerSearchError, setProviderSearchError] = useState(false);
  const [searchError, setSearchError] = useState(false);

  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  useEffect(() => {
    let isCurrent = true;

    const runSearch = async () => {
      setServiceResults([]);
      setProviderResults([]);
      setNeedsSignIn(false);
      setProviderSearchError(false);
      setSearchError(false);

      if (!query) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const normalizedQuery = query.toLocaleLowerCase();
      const serviceCatalog = [
        ...servicesData,
        {
          id: 'equipment',
          title: 'Equipment Rental',
          description: 'Tools and machinery for your next job.',
        },
      ];
      const localServices = serviceCatalog
        .filter((service) => `${service.title} ${service.description} ${serviceKeywords[service.id] || ''}`.toLocaleLowerCase().includes(normalizedQuery))
        .map((service) => ({
          id: service.id,
          title: service.title,
          description: service.description,
          href: serviceRoutes[service.id],
        }));

      try {
        const { data: categories, error: categoryError } = await supabase
          .from('service_categories')
          .select('id, name, category_type')
          .eq('is_active', true)
          .ilike('name', `%${query}%`)
          .limit(12);

        if (categoryError) throw categoryError;
        if (!isCurrent) return;

        const categoryServices = (categories || []).map((category) => ({
          id: category.id,
          title: category.name,
          description: 'Service category',
          href: categoryRoutes[category.category_type] || '/services/artisans',
        }));
        const uniqueServices = new Map();
        [...localServices, ...categoryServices].forEach((service) => {
          const key = `${service.title.toLocaleLowerCase()}|${service.href}`;
          uniqueServices.set(key, service);
        });
        setServiceResults([...uniqueServices.values()]);

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session?.user) {
          setNeedsSignIn(true);
          return;
        }

        const [nameResponse, bioResponse] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, full_name, provider_profiles!inner(bio, average_rating, rating_count, is_searchable)')
            .eq('provider_profiles.is_searchable', true)
            .ilike('full_name', `%${query}%`)
            .limit(12),
          supabase
            .from('provider_profiles')
            .select('user_id, bio, average_rating, rating_count')
            .eq('is_searchable', true)
            .ilike('bio', `%${query}%`)
            .limit(12),
        ]);

        if (!isCurrent) return;
        if (nameResponse.error && bioResponse.error) {
          setProviderSearchError(true);
          return;
        }

        const providersById = new Map();
        (nameResponse.data || []).forEach((provider) => {
          const details = Array.isArray(provider.provider_profiles)
            ? provider.provider_profiles[0]
            : provider.provider_profiles;
          if (details) {
            providersById.set(provider.id, {
              id: provider.id,
              fullName: provider.full_name,
              bio: details.bio,
              averageRating: details.average_rating,
              ratingCount: details.rating_count,
            });
          }
        });

        const bioMatches = bioResponse.data || [];
        const missingProfiles = bioMatches.filter((provider) => !providersById.has(provider.user_id));
        if (missingProfiles.length) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', missingProfiles.map((provider) => provider.user_id));

          if (!profilesError) {
            const namesById = new Map((profiles || []).map((profile) => [profile.id, profile.full_name]));
            missingProfiles.forEach((provider) => {
              const fullName = namesById.get(provider.user_id);
              if (fullName) {
                providersById.set(provider.user_id, {
                  id: provider.user_id,
                  fullName,
                  bio: provider.bio,
                  averageRating: provider.average_rating,
                  ratingCount: provider.rating_count,
                });
              }
            });
          }
        }

        setProviderResults([...providersById.values()]);
      } catch {
        if (isCurrent) setSearchError(true);
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };

    runSearch();
    return () => {
      isCurrent = false;
    };
  }, [query]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextQuery = searchInput.trim();
    if (nextQuery) setSearchParams({ q: nextQuery });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-green">NHFAS directory</p>
        <h1 className="mt-2 text-3xl font-extrabold text-brand-navy">Search services and providers</h1>
        <form onSubmit={handleSubmit} role="search" className="mt-6 flex max-w-2xl gap-2">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search services and providers</span>
            <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Try electrician, haulage, or a provider name"
              className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30"
            />
          </label>
          <Button type="submit" className="inline-flex shrink-0 items-center gap-2">
            Search
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>
        {query && <p className="mt-3 text-sm text-slate-500">Results for <span className="font-semibold text-slate-700">“{query}”</span></p>}
      </header>

      {!query ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-sm text-slate-500">Enter a service or provider name to search.</div>
      ) : isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-sm text-slate-500" role="status">Searching NHFAS...</div>
      ) : searchError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-800" role="alert">Search is temporarily unavailable. Check your Supabase connection and try again.</div>
      ) : (
        <div className="space-y-8">
          {serviceResults.length > 0 && (
            <section aria-labelledby="service-results-heading">
              <h2 id="service-results-heading" className="mb-3 text-xl font-bold text-brand-navy">Services and categories</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {serviceResults.map((service) => (
                  <Link key={`${service.id}-${service.href}`} to={service.href} className="group rounded-lg border border-slate-200 bg-white p-5 transition-colors hover:border-brand-green/50 hover:bg-emerald-50/30 focus:outline-none focus:ring-2 focus:ring-brand-green">
                    <span className="flex items-center justify-between gap-3 font-bold text-brand-navy">
                      {service.title}
                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-brand-green" />
                    </span>
                    <span className="mt-2 block text-sm leading-5 text-slate-500">{service.description}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {needsSignIn && (
            <div className="flex flex-col gap-3 rounded-lg border border-sky-200 bg-sky-50 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-bold text-brand-navy">Looking for a provider?</h2>
                <p className="mt-1 text-sm text-slate-600">Sign in to search provider profiles that are visible to clients.</p>
              </div>
              <Button as={Link} to="/login" variant="outline" className="self-start sm:self-auto">Sign in</Button>
            </div>
          )}

          {providerSearchError && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="status">Provider profiles could not be searched. Service category results are still available.</p>
          )}

          {providerResults.length > 0 && (
            <section aria-labelledby="provider-results-heading">
              <h2 id="provider-results-heading" className="mb-3 text-xl font-bold text-brand-navy">Service providers</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {providerResults.map((provider) => (
                  <article key={provider.id} className="rounded-lg border border-slate-200 bg-white p-5">
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                        <UserRound className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-brand-navy">{provider.fullName}</h3>
                        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400">Service provider</p>
                      </div>
                      {provider.averageRating && (
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700" aria-label={`${provider.averageRating} average rating`}>
                          <Star aria-hidden="true" className="h-4 w-4 fill-amber-400 text-amber-400" />
                          {Number(provider.averageRating).toFixed(1)}
                        </span>
                      )}
                    </div>
                    {provider.bio && <p className="mt-4 text-sm leading-5 text-slate-600">{provider.bio}</p>}
                    {provider.ratingCount > 0 && <p className="mt-3 text-xs text-slate-500">{provider.ratingCount} client reviews</p>}
                  </article>
                ))}
              </div>
            </section>
          )}

          {!serviceResults.length && !providerResults.length && !needsSignIn && !providerSearchError && (
            <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
              <BriefcaseBusiness className="mx-auto h-8 w-8 text-slate-400" />
              <h2 className="mt-3 font-bold text-brand-navy">No matching results</h2>
              <p className="mt-1 text-sm text-slate-500">Try another service, category, or provider name.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchResults;