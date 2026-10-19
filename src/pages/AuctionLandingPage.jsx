import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  Clock,
  Gavel,
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
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 hover:shadow-md transition-shadow">
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
          <Button as={Link} to="/dashboard/post-job" variant="outline" className="gap-2">
            <ArrowRight className="h-4 w-4" /> List an auction item
          </Button>
        </div>
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
