import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  ClipboardList,
  Link2,
  RotateCcw,
  Search,
  ShieldCheck,
  Truck,
  Users,
  Wallet,
  Wrench,
  X,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { faqCategories } from '../data/faqData';

const categoryIcons = {
  Users,
  Wrench,
  Truck,
  ClipboardList,
  ShieldCheck,
  Wallet,
};

const roleOptions = [
  { value: 'CLIENT', label: 'General users and consumers' },
  { value: 'ARTISAN', label: 'Skilled artisans and fine artists' },
  { value: 'OPERATOR', label: 'Heavy machinery and logistics operators' },
  { value: 'FLEET', label: 'Fleet managers' },
  { value: 'COMPLIANCE', label: 'Compliance and regulatory officers' },
];

const quickSearches = ['verification', 'payload', 'escrow', 'auction', 'offline'];

const getFAQFromHash = () => {
  if (typeof window === 'undefined' || !window.location.hash.startsWith('#faq-')) return null;

  const itemId = window.location.hash.slice('#faq-'.length);
  for (const category of faqCategories) {
    const item = category.items.find((candidate) => candidate.id === itemId);
    if (item) return { categoryId: category.id, item };
  }

  return null;
};

const FAQPage = () => {
  const [linkedFAQ] = useState(() => getFAQFromHash());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(linkedFAQ?.categoryId || 'all');
  const [selectedRole, setSelectedRole] = useState('all');
  const [openItems, setOpenItems] = useState(() => new Set(linkedFAQ ? [linkedFAQ.item.id] : []));
  const [copyFeedback, setCopyFeedback] = useState({ itemId: '', message: '', isError: false });

  useEffect(() => {
    if (!linkedFAQ) return;

    window.requestAnimationFrame(() => {
      document.getElementById(`faq-${linkedFAQ.item.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [linkedFAQ]);

  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();

  const visibleCategories = useMemo(() => faqCategories
    .filter((category) => selectedCategory === 'all' || category.id === selectedCategory)
    .map((category) => ({
      ...category,
      items: category.items.filter((item) => {
        const matchesRole = selectedRole === 'all' || item.userRoles.includes(selectedRole);
        const searchableText = [
          item.question,
          item.answer,
          ...item.tags,
          item.relatedFeatureRef || '',
          category.title,
        ].join(' ').toLocaleLowerCase();
        return matchesRole && (!normalizedQuery || searchableText.includes(normalizedQuery));
      }),
    }))
    .filter((category) => category.items.length > 0), [normalizedQuery, selectedCategory, selectedRole]);

  const resultCount = visibleCategories.reduce((count, category) => count + category.items.length, 0);
  const allVisibleIds = visibleCategories.flatMap((category) => category.items.map((item) => item.id));
  const allVisibleOpen = allVisibleIds.length > 0 && allVisibleIds.every((id) => openItems.has(id));

  const toggleItem = (itemId) => {
    const isCurrentlyOpen = openItems.has(itemId);
    setOpenItems((current) => {
      const next = new Set(current);
      if (isCurrentlyOpen) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
    const nextHash = isCurrentlyOpen ? '' : `#faq-${itemId}`;
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${nextHash}`);
  };

  const toggleAllVisible = () => {
    setOpenItems((current) => {
      const next = new Set(current);
      if (allVisibleOpen) allVisibleIds.forEach((id) => next.delete(id));
      else allVisibleIds.forEach((id) => next.add(id));
      return next;
    });
    if (allVisibleOpen) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    }
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedRole('all');
    setOpenItems(new Set());
    setCopyFeedback({ itemId: '', message: '', isError: false });
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
  };

  const applySearchFilter = (value) => {
    setSearchQuery(value);
  };

  const copyFAQLink = async (itemId) => {
    const shareUrl = `${window.location.origin}${window.location.pathname}${window.location.search}#faq-${itemId}`;
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard access is unavailable in this browser.');
      }
      await navigator.clipboard.writeText(shareUrl);
      setCopyFeedback({ itemId, message: 'Link copied to clipboard.', isError: false });
    } catch (error) {
      console.error('FAQ link copy failed:', error);
      setCopyFeedback({ itemId, message: 'Could not copy the link. Check browser clipboard permissions and try again.', isError: true });
    }
  };

  return (
    <div className="flex-1 bg-slate-50 font-sans">
      <header className="bg-brand-navy px-4 py-16 text-white sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.65fr)] lg:items-end">
            <div>
              <h1 className="max-w-3xl text-4xl font-extrabold leading-tight text-white sm:text-5xl">
                Answers for every part of the job.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-200">
                Find practical guidance for booking a service, managing a fleet, checking compliance, and understanding job payments.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm leading-relaxed text-slate-200">
              <p className="font-semibold text-white">Not sure where to start?</p>
              <p className="mt-2">Search a topic, choose your role, or browse a category below. Answers describe intended workflows; feature availability can vary by rollout.</p>
            </div>
          </div>
          <div className="mt-8 max-w-4xl">
            <label htmlFor="faq-search" className="sr-only">Search frequently asked questions</label>
            <div className="relative min-w-0">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                id="faq-search"
                type="search"
                value={searchQuery}
                onChange={(event) => applySearchFilter(event.target.value)}
                placeholder="Search questions, topics, or feature references"
                className="block h-12 w-full rounded-xl border border-white/20 bg-white px-12 pr-12 text-base text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-green focus:ring-4 focus:ring-brand-green/30 sm:h-14"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => applySearchFilter('')}
                  className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-green"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Suggested FAQ searches">
              <span className="mr-1 text-xs font-semibold text-slate-300">Quick searches:</span>
              {quickSearches.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => applySearchFilter(topic)}
                  className="min-h-9 rounded-full border border-white/20 bg-white/10 px-3 text-xs font-semibold text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
                >
                  {topic}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-300">Search questions and answers instantly as you type.</p>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:px-8 lg:py-14">
        <aside className="space-y-6">
          <section aria-labelledby="faq-category-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 id="faq-category-heading" className="text-sm font-bold uppercase tracking-wider text-slate-500">Browse topics</h2>
            <nav className="mt-4 space-y-1" aria-label="FAQ categories">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all');
                }}
                aria-pressed={selectedCategory === 'all'}
                className={`flex min-h-11 w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-brand-green ${selectedCategory === 'all' ? 'bg-brand-softBlue text-brand-navy' : 'text-slate-600 hover:bg-slate-50 hover:text-brand-navy'}`}
              >
                <span>All questions</span>
                <span className="text-xs text-slate-500">{faqCategories.reduce((sum, category) => sum + category.items.length, 0)}</span>
              </button>
              {faqCategories.map((category) => {
                const Icon = categoryIcons[category.iconName] || CircleHelp;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(category.id);
                    }}
                    aria-pressed={selectedCategory === category.id}
                    className={`flex min-h-11 w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-brand-green ${selectedCategory === category.id ? 'bg-brand-softBlue text-brand-navy' : 'text-slate-600 hover:bg-slate-50 hover:text-brand-navy'}`}
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" aria-hidden="true" />
                    <span className="flex-1">{category.title}</span>
                    <span className="text-xs text-slate-500">{category.items.length}</span>
                  </button>
                );
              })}
            </nav>
          </section>

          <section aria-labelledby="faq-role-heading" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <label id="faq-role-heading" htmlFor="faq-role" className="text-sm font-bold uppercase tracking-wider text-slate-500">Filter by role</label>
            <select
              id="faq-role"
              value={selectedRole}
              onChange={(event) => {
                setSelectedRole(event.target.value);
              }}
              className="mt-3 block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20"
            >
              <option value="all">All roles</option>
              {roleOptions.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
            </select>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">Role filters show answers relevant to the selected account type.</p>
          </section>

          <section className="rounded-2xl bg-brand-softBlue p-5">
            <h2 className="font-bold text-brand-navy">Need personal assistance?</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">For a current booking, include its reference so the team can understand the context.</p>
            <Link to="/contact" className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-brand-green hover:text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-green">
              Contact NHFAS <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
        </aside>

        <section aria-labelledby="faq-results-heading" className="min-w-0">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-brand-green">Knowledge base</p>
              <h2 id="faq-results-heading" className="mt-1 text-2xl font-extrabold text-brand-navy sm:text-3xl">
                Frequently asked questions
              </h2>
              <p className="mt-2 text-sm text-slate-500" aria-live="polite">
                {resultCount} {resultCount === 1 ? 'answer' : 'answers'} found
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={toggleAllVisible}
                disabled={allVisibleIds.length === 0}
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-brand-green hover:text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-green disabled:cursor-not-allowed disabled:opacity-50"
              >
                {allVisibleOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {allVisibleOpen ? 'Collapse all' : 'Expand all'}
              </button>
              {(searchQuery || selectedCategory !== 'all' || selectedRole !== 'all') && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-green"
                >
                  <RotateCcw className="h-4 w-4" /> Reset filters
                </button>
              )}
            </div>
          </div>

          {visibleCategories.length > 0 ? (
            <div className="space-y-7">
              {visibleCategories.map((category) => {
                const Icon = categoryIcons[category.iconName] || CircleHelp;
                return (
                  <section key={category.id} aria-labelledby={`category-${category.id}`}>
                    <div className="mb-3 flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-brand-green">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div>
                        <h3 id={`category-${category.id}`} className="font-bold text-brand-navy">{category.title}</h3>
                        <p className="mt-0.5 text-sm text-slate-500">{category.description}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {category.items.map((item) => {
                        const isOpen = openItems.has(item.id);
                        return (
                          <article id={`faq-${item.id}`} key={item.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                            <h4>
                              <button
                                type="button"
                                id={`question-${item.id}`}
                                aria-expanded={isOpen}
                                aria-controls={`answer-${item.id}`}
                                onClick={() => toggleItem(item.id)}
                                className="flex w-full items-center justify-between gap-4 p-5 text-left transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-green"
                              >
                                <span className="font-semibold leading-relaxed text-slate-800">{item.question}</span>
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </span>
                              </button>
                            </h4>
                            {isOpen && (
                              <div
                                id={`answer-${item.id}`}
                                role="region"
                                aria-labelledby={`question-${item.id}`}
                                className="border-t border-slate-100 px-5 pb-5 pt-4"
                              >
                                <p className="leading-relaxed text-slate-600">{item.answer}</p>
                                <div className="mt-4">
                                  <button
                                    type="button"
                                    onClick={() => copyFAQLink(item.id)}
                                    className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 transition hover:border-brand-green hover:text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-green"
                                  >
                                    <Link2 className="h-4 w-4" aria-hidden="true" />
                                    Copy answer link
                                  </button>
                                  {copyFeedback.itemId === item.id && (
                                    <p className={`mt-2 text-sm ${copyFeedback.isError ? 'text-red-700' : 'text-emerald-700'}`} role="status" aria-live="polite">
                                      {copyFeedback.message}
                                    </p>
                                  )}
                                </div>
                                <div className="mt-4 flex flex-wrap items-center gap-2">
                                  {item.relatedFeatureRef && (
                                    <button
                                      type="button"
                                      onClick={() => applySearchFilter(item.relatedFeatureRef)}
                                      className="min-h-11 rounded-full bg-brand-softBlue px-3 py-1 text-xs font-semibold text-brand-navy transition hover:bg-brand-navy hover:text-white focus:outline-none focus:ring-2 focus:ring-brand-green sm:min-h-9"
                                      aria-label={`Search FAQs for ${item.relatedFeatureRef}`}
                                    >
                                      {item.relatedFeatureRef}
                                    </button>
                                  )}
                                  {item.tags.map((tag) => (
                                    <button
                                      key={tag}
                                      type="button"
                                      onClick={() => applySearchFilter(tag)}
                                      className="min-h-11 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 transition hover:bg-brand-navy hover:text-white focus:outline-none focus:ring-2 focus:ring-brand-green sm:min-h-9"
                                      aria-label={`Search FAQs tagged ${tag}`}
                                    >
                                      {tag}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
              <CircleHelp className="mx-auto h-10 w-10 text-slate-400" aria-hidden="true" />
              <h3 className="mt-4 text-lg font-bold text-brand-navy">No matching answers</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
                Try a different search term or clear one of the selected filters to browse more guidance.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-green px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-green/90 focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2"
              >
                <RotateCcw className="h-4 w-4" /> Show all questions
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default FAQPage;
