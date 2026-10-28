import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  Clock,
  Gavel,
  LoaderCircle,
  Palette,
  ShieldCheck,
  Timer,
  TrendingUp,
} from 'lucide-react';

import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';

const AuctionCard = ({ auction, currentPrice, timeLeft, userBid }) => {
  const isOpen = auction.status === 'open' && timeLeft > 0;
  const isUserWinning = userBid === true;
  const isVideo = auction.media_url?.match(/\.(mp4|webm|mov|avi)$/i) ||
    auction.media_url?.includes('youtube.com') ||
    auction.media_url?.includes('youtu.be');
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 hover:shadow-md transition-shadow flex flex-col">
      {auction.media_url && (
        <Link to={`/auction/${auction.id}`} className="mb-3 block aspect-video overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
          {isVideo ? (
            <div className="h-full w-full flex items-center justify-center bg-black text-slate-400 text-sm">
              🎬 Video item — click to watch
            </div>
          ) : (
            <img src={auction.media_url} alt={auction.title} className="h-full w-full object-cover" />
          )}
        </Link>
      )}
      <div className="flex justify-between items-start mb-2">
        <Link
          to={`/auction/${auction.id}`}
          className="font-bold text-brand-navy hover:underline"
        >
          {auction.title}
        </Link>
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${
            isOpen
              ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
              : 'border-slate-100 bg-slate-100 text-slate-500'
          }`}
        >
          {isOpen ? 'LIVE' : auction.status}
        </span>
      </div>
      {auction.description && (
        <p className="mt-1 text-sm text-slate-500 line-clamp-2">
          {auction.description}
        </p>
      )}
      <div className="mt-4 space-y-2">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-brand-navy">
            {currentPrice?.toLocaleString()} ETB
          </span>
          <span className="text-sm text-slate-500">current bid</span>
          {userBid === false && (
            <span className="text-xs text-red-600 font-medium">You are outbid</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Timer className="h-4 w-4" aria-hidden="true" />
          <span>{Math.max(0, timeLeft)}s remaining</span>
        </div>
        <div className="flex gap-2">
          <Button
            as={Link}
            to={`/auction/${auction.id}`}
            variant="primary"
            disabled={!isOpen}
            className="flex-1 gap-2"
          >
            {isOpen ? 'Place Bid' : 'Closed'}
          </Button>
        </div>
      </div>
    </article>
  );
};

const AuctionLandingPage = () => {
  const [auctions, setAuctions] = useState([]);
  const [prices, setPrices] = useState({});
  const [timeLeft, setTimeLeft] = useState({});
  const [userWinning, setUserWinning] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createForm, setCreateForm] = useState({
    title: '', description: '', starting_price: '', reserve_price: '', duration_hours: '24', media_url: '',
  });
  const navigate = useNavigate();


  useEffect(() => {
    let current = true;
    const load = async () => {
      const { data } = await supabase
        .from('auction_listings')
        .select('*')
        .order('starts_at', { ascending: true });
      if (!current) return;
      setAuctions(data || []);
      setIsLoading(false);
    };
    load();
    return () => { current = false; };
  }, []);

  useEffect(() => {
    if (auctions.length === 0) return;
    let current = true;
    const refresh = async () => {
      const now = Date.now();
      const nextPrices = {};
      const nextTime = {};
      const nextWinning = {};
      const { data: user } = await supabase.auth.getUser();
      const userId = user?.user?.id;

      for (const a of auctions) {
        const { data: bids } = await supabase
          .from('auction_bids')
          .select('amount, bidder_id, status')
          .eq('auction_id', a.id)
          .in('status', ['active', 'winning'])
          .order('amount', { ascending: false });
        const top = bids?.[0];
        nextPrices[a.id] = top?.amount ?? a.starting_price;
        nextTime[a.id] = Math.max(
          0,
          Math.floor((new Date(a.ends_at).getTime() - now) / 1000)
        );
        nextWinning[a.id] = top?.bidder_id === userId;
      }
      if (!current) return;
      setPrices(nextPrices);
      setTimeLeft(nextTime);
      setUserWinning(nextWinning);
    };
    refresh();
    const t = setInterval(refresh, 5000);
    return () => { current = false; clearInterval(t); };
  }, [auctions]);

  const setCreate = (key) => (event) => setCreateForm((current) => ({ ...current, [key]: event.target.value }));

  // Sellers list an item by creating the backing job first (FR-05):
  // auction_listings.job_id is required, so each auction is anchored to a
  // custom_build job the platform can fulfil after the hammer falls.
  const createAuction = async (event) => {
    event.preventDefault();
    setCreateError('');
    const starting = Number(createForm.starting_price);
    const reserve = createForm.reserve_price ? Number(createForm.reserve_price) : null;
    const hours = Number(createForm.duration_hours);
    if (!createForm.title.trim()) { setCreateError('Enter a title for the auction item.'); return; }
    if (!starting || starting <= 0) { setCreateError('Enter a valid starting price in ETB.'); return; }
    if (reserve != null && reserve < starting) { setCreateError('The reserve price cannot be below the starting price.'); return; }
    if (!hours || hours < 1 || hours > 72) { setCreateError('Auction duration must be between 1 and 72 hours.'); return; }
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) { navigate('/login'); return; }
    setCreating(true);
    try {
      const { data: job, error: jobError } = await supabase.from('jobs').insert({
        client_id: userData.user.id,
        job_type: 'custom_build',
        booking_mode: 'instant',
        status: 'posted',
        title: createForm.title.trim(),
        description: createForm.description.trim() || null,
      }).select('id').single();
      if (jobError) throw new Error(jobError.message);
      const startsAt = new Date();
      const endsAt = new Date(startsAt.getTime() + hours * 60 * 60 * 1000);
      const { data: listing, error: listingError } = await supabase.from('auction_listings').insert({
        job_id: job.id,
        seller_id: userData.user.id,
        title: createForm.title.trim(),
        description: createForm.description.trim() || null,
        media_url: createForm.media_url.trim() || null,
        starting_price: starting,
        reserve_price: reserve,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        status: 'open',
      }).select('id').single();
      if (listingError) {
        await supabase.from('jobs').delete().eq('id', job.id);
        throw new Error(listingError.message);
      }
      navigate(`/auction/${listing.id}`);
    } catch (err) {
      setCreateError(err?.message || 'The auction could not be created. Please try again.');
      setCreating(false);
    }
  };

  if (isLoading) {

    return (
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="animate-pulse rounded-xl bg-slate-700/30 h-96"></div>
      </main>
    );
  }

  const openAuctions = auctions.filter((a) => a.status === 'open' || a.status === 'scheduled');

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
      <section className="rounded-2xl bg-brand-navy px-6 py-10 text-white sm:px-10 sm:py-14">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-300">
          NHFAS marketplace
        </p>
        <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">
          Artisan auctions & live bidding
        </h1>
        <p className="mt-4 max-w-2xl leading-7 text-slate-200">
          Bid on custom commissions and artisan work. Auctions run live with anti-sniping
          time extensions — a bid in the final minutes adds time back to the clock.
        </p>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-brand-navy">Live auctions</h2>
          <Button type="button" onClick={() => setShowCreate((open) => !open)} variant="outline" className="gap-2" aria-expanded={showCreate}>
            <ArrowRight className="h-4 w-4" /> {showCreate ? 'Hide form' : 'List an auction item'}
          </Button>
        </div>
        {showCreate && (
          <form onSubmit={createAuction} className="mb-6 space-y-4 rounded-xl border border-slate-200 bg-white p-5 sm:p-6" aria-label="Create auction listing">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
                Item title *
                <input type="text" maxLength={120} required value={createForm.title} onChange={setCreate('title')}
                  placeholder="Handmade mahogany dining table"
                  className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20" />
              </label>
              <label className="block space-y-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
                Image or video URL *
                <input type="url" required value={createForm.media_url} onChange={setCreate('media_url')}
                  placeholder="https://example.com/item.jpg or https://youtube.com/watch?v=..."
                  className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20" />
                <p className="text-[11px] text-slate-500 mt-1">Paste a link to your item image or video. Buyers click it to view full size.</p>
              </label>
              <label className="block space-y-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
                Description
                <textarea rows={3} maxLength={2000} value={createForm.description} onChange={setCreate('description')}
                  placeholder="Materials, dimensions, delivery terms..."
                  className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20" />
              </label>
              <label className="block space-y-1.5 text-sm font-medium text-slate-700">
                Starting price (ETB) *
                <input type="number" min="1" step="0.01" required value={createForm.starting_price} onChange={setCreate('starting_price')}
                  className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20" />
              </label>
              <label className="block space-y-1.5 text-sm font-medium text-slate-700">
                Reserve price (ETB, optional)
                <input type="number" min="0" step="0.01" value={createForm.reserve_price} onChange={setCreate('reserve_price')}
                  className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20" />
              </label>
              <label className="block space-y-1.5 text-sm font-medium text-slate-700">
                Duration (hours) *
                <input type="number" min="1" max="72" required value={createForm.duration_hours} onChange={setCreate('duration_hours')}
                  className="block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20" />
              </label>
            </div>
            {createError && (
              <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{createError}</p>
            )}
            <div className="flex justify-end">
              <Button type="submit" disabled={creating} className="gap-2">
                {creating ? <LoaderCircle size={16} className="animate-spin" /> : <Gavel size={16} />}
                {creating ? 'Creating...' : 'Start auction'}
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              The auction starts immediately and runs live with anti-sniping protection. A backing job is created automatically so the winning bid can move straight into escrow.
            </p>
          </form>
        )}
        {openAuctions.length === 0 ? (
          <p className="text-slate-500">No live auctions right now. Check back soon.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
            {openAuctions.map((a) => (
              <AuctionCard
                key={a.id}
                auction={a}
                currentPrice={prices[a.id]}
                timeLeft={timeLeft[a.id]}
                userBid={userWinning[a.id]}
              />
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-5">
          <TrendingUp className="h-6 w-6 text-brand-green" aria-hidden="true" />
          <h2 className="mt-3 font-bold text-brand-navy">Anti-sniping protection</h2>
          <p className="mt-2 text-sm leading-5 text-slate-500">
            Bids placed in the final minutes automatically extend the auction clock,
            preventing last-second sniping.
          </p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5">
          <ShieldCheck className="h-6 w-6 text-sky-700" aria-hidden="true" />
          <h2 className="mt-3 font-bold text-brand-navy">Secure bidding</h2>
          <p className="mt-2 text-sm leading-5 text-slate-500">
            All bids are recorded via Supabase RLS. Winning bidders are notified and
            payment is held in escrow.
          </p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5">
          <Palette className="h-6 w-6 text-brand-green" aria-hidden="true" />
          <h2 className="mt-3 font-bold text-brand-navy">Artisan commissions</h2>
          <p className="mt-2 text-sm leading-5 text-slate-500">
            Bid on custom furniture, artwork, and handmade goods from NHFAS
            registered artisans.
          </p>
        </article>
      </section>
    </main>
  );
};

export default AuctionLandingPage;
