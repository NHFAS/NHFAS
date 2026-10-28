import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, Bell, Flag, Gavel, LoaderCircle, Radio, Timer, User } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';

const formatClock = (totalSeconds) => {
  const seconds = Math.max(0, totalSeconds);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
};

const AuctionPage = () => {
  const { auctionId } = useParams();
  const [auction, setAuction] = useState(null);
  const [bids, setBids] = useState([]);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const [working, setWorking] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [userId, setUserId] = useState(null);
  const [live, setLive] = useState(false);
  const [extendedNote, setExtendedNote] = useState('');
  const [outbidNotification, setOutbidNotification] = useState(false);
  const [reserveNotMet, setReserveNotMet] = useState(false);
  const prevEndsAtRef = useRef(null);
  const prevWinningRef = useRef(false);

  const load = useCallback(async () => {
    if (!auctionId) return;
    const { data: a, error: aErr } = await supabase
      .from('auction_listings')
      .select('*, seller:profiles(full_name)')
      .eq('id', auctionId)
      .maybeSingle();
    if (aErr || !a) {
      setError('Auction not found.');
      setIsLoading(false);
      return;
    }
    // Anti-sniping: the bid RPC may have pushed ends_at back — tell the user.
    if (prevEndsAtRef.current && new Date(a.ends_at).getTime() > new Date(prevEndsAtRef.current).getTime() + 1000) {
      setExtendedNote('A late bid extended the auction clock (anti-sniping protection).');
    }
    prevEndsAtRef.current = a.ends_at;
    setAuction(a);
    setCurrentPrice(a.starting_price);
    const { data: b } = await supabase
      .from('auction_bids')
      .select('*, bidder:profiles(full_name)')
      .eq('auction_id', auctionId)
      .order('created_at', { ascending: false })
      .limit(50);
    const rows = b || [];
    const liveRows = rows.filter((row) => ['active', 'winning', 'outbid'].includes(row.status));
    setBids(liveRows);
    const winning = liveRows.find((row) => row.status === 'winning');
    if (winning) setCurrentPrice(Number(winning.amount));
    setTimeLeft(Math.max(0, Math.floor((new Date(a.ends_at).getTime() - Date.now()) / 1000)));
    // Reserve price enforcement: track whether reserve has been met
    setReserveNotMet(Boolean(a.reserve_price) && currentPrice < Number(a.reserve_price));
    // Outbid notification: if user had a winning bid but now it's outbid
    const userWinningNow = liveRows.some((row) => row.status === 'winning' && row.bidder_id === userId);
    const userOutbidNow = liveRows.some((row) => row.status === 'outbid' && row.bidder_id === userId);
    if (userId && prevWinningRef.current && !userWinningNow && userOutbidNow) {
      setOutbidNotification(true);
    }
    setIsLoading(false);
  }, [auctionId]);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => { if (active) setUserId(data?.user?.id || null); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Countdown ticks every second; the bid feed refreshes on an interval
  // AND via realtime so competing bids appear immediately (FR-05).
  useEffect(() => {
    if (!auction) return undefined;
    const timer = setInterval(() => {
      setTimeLeft(Math.max(0, Math.floor((new Date(auction.ends_at).getTime() - Date.now()) / 1000)));
    }, 1000);
    const poll = setInterval(load, 10000);
    const channel = supabase
      .channel(`auction-${auctionId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'auction_bids', filter: `auction_id=eq.${auctionId}` }, () => { load(); })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'auction_listings', filter: `id=eq.${auctionId}` }, () => { load(); })
      .subscribe((status) => setLive(status === 'SUBSCRIBED'));
    return () => { clearInterval(timer); clearInterval(poll); supabase.removeChannel(channel); };
  }, [auction, auctionId, load]);

  const placeBid = async () => {
    const amount = Number(bidAmount);
    if (!amount || amount <= 0) {
      setError('Please enter a valid bid amount.');
      return;
    }
    if (!auction) return;
    const minBid = currentPrice + (auction.starting_price * 0.05);
    if (amount < minBid) {
      setError(`Bid must be at least ${minBid.toLocaleString()} ETB (5% increment).`);
      return;
    }
    setWorking(true);
    setError('');
    const { error: bidError } = await supabase.rpc('place_auction_bid', {
      target_auction_id: auctionId,
      bid_amount: amount,
    });
    setWorking(false);
    if (bidError) {
      setError(bidError.message);
    } else {
      setFlash(`Bid of ${amount.toLocaleString()} ETB placed. You are the current highest bidder.`);
      setBidAmount('');
      load();
    }
  };


  const myHighestBid = useMemo(
    () => bids.filter((b) => b.bidder_id === userId).sort((a, b) => Number(b.amount) - Number(a.amount))[0] || null,
    [bids, userId],
  );
  const iAmWinning = myHighestBid?.status === 'winning';
  const iAmOutbid = Boolean(myHighestBid) && myHighestBid.status === 'outbid';
  prevWinningRef.current = iAmWinning;
  const isSeller = auction?.seller_id === userId;
  const reserveMet = auction?.reserve_price == null || currentPrice >= Number(auction.reserve_price);

  if (isLoading || !auction) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="animate-pulse rounded-xl bg-slate-700/30 h-96" />
      </main>
    );
  }

  const isOpen = auction.status === 'open' && timeLeft > 0;
  const minBid = currentPrice + (auction.starting_price * 0.05);
  const sellerCanClose = isSeller && auction.status === 'open';

  const closeAuctionEarly = async () => {
    if (reserveNotMet && !window.confirm(`WARNING: The reserve price has not been met. Closing now will not award the item to any bidder. Proceed anyway?`)) return;
    setWorking(true);
    setError('');
    const { error: closeError } = await supabase.rpc('close_auction', { target_auction_id: auctionId });
    setWorking(false);
    if (closeError) {
      setError(closeError.message);
    } else {
      setFlash('Auction closed. The winning bidder has been notified.');
      load();
    }
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex items-center gap-2 mb-6">
        <Button as={Link} to="/services/auction" variant="ghost" className="gap-2" aria-label="Back to auctions">
          <ArrowLeft className="h-4 w-4" /> All auctions
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-extrabold text-brand-navy">{auction.title}</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Sold by {auction.seller?.full_name || 'NHFAS seller'}
                  {' · '}
                  <span className="inline-flex items-center gap-1">
                    <Radio className={`h-3 w-3 ${live ? 'text-emerald-500' : 'text-slate-300'}`} aria-hidden="true" />
                    {live ? 'Live updates on' : 'Connecting…'}
                  </span>
                </p>
              </div>
              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                isOpen ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-500'
              }`}>
                {isOpen ? 'Live' : auction.status}
              </span>
            </div>

            {auction.description && (
              <p className="mt-4 text-sm leading-6 text-slate-600 whitespace-pre-wrap">{auction.description}</p>
            )}

            <dl className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <div className="rounded-lg bg-slate-50 p-3">
                <dt className="text-xs font-medium text-slate-500">Current bid</dt>
                <dd className="mt-1 font-bold text-brand-navy">{Number(currentPrice).toLocaleString()} ETB</dd>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <dt className="text-xs font-medium text-slate-500">Time remaining</dt>
                <dd className={`mt-1 font-bold ${timeLeft < 60 ? 'text-red-600' : 'text-brand-navy'}`} aria-live="polite">
                  <Timer className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />{formatClock(timeLeft)}
                </dd>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <dt className="text-xs font-medium text-slate-500">Reserve price</dt>
                <dd className="mt-1 font-bold">
                  {auction.reserve_price
                    ? (
                      <span className={reserveMet ? 'text-emerald-700' : 'text-amber-700'}>
                        {reserveMet ? 'Met ✓' : `Not met (${Number(auction.reserve_price).toLocaleString()} ETB)`}
                      </span>
                    )
                    : <span className="text-slate-400">No reserve</span>}
                </dd>
              </div>
            </dl>

            {outbidNotification && (
              <p role="alert" className="mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">
                <Bell className="h-4 w-4 shrink-0" aria-hidden="true" />
                You have been outbid by another bidder. Place a new bid to stay competitive.
              </p>
            )}
            {iAmWinning && (
              <p role="status" className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">
                You are the highest bidder at {Number(myHighestBid.amount).toLocaleString()} ETB.
              </p>
            )}
            {iAmOutbid && !outbidNotification && (
              <p role="alert" className="mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                You have been outbid. Your highest bid was {Number(myHighestBid.amount).toLocaleString()} ETB.
              </p>
            )}
            {extendedNote && (
              <p role="status" className="mt-3 rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800">{extendedNote}</p>
            )}
          </div>
        </div>


        <div className="lg:col-span-1">
          <div className="rounded-xl border border-slate-200 bg-white p-6 sticky top-24">
            <h3 className="text-sm font-bold text-brand-navy mb-4">Place your bid</h3>
            {isOpen ? (
              <>
                <label htmlFor="bid-amount" className="block text-sm font-medium text-slate-700 mb-2">Bid amount (ETB)</label>
                <div className="relative mb-4">
                  <input
                    id="bid-amount"
                    type="number"
                    min={minBid}
                    step="0.01"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder={minBid.toLocaleString()}
                    disabled={working}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20"
                  />
                  <span className="absolute right-3 top-2 text-slate-400 text-xs">ETB</span>
                </div>
                <Button onClick={placeBid} disabled={working || !isOpen} className="w-full gap-2">
                  {working ? <LoaderCircle size={16} className="animate-spin" /> : <Gavel className="h-4 w-4" />}
                  {working ? 'Placing bid...' : 'Place bid'}
                </Button>
                <p className="text-xs text-slate-500 mt-2">
                  Minimum next bid: {minBid.toLocaleString()} ETB. Bids in the final {auction.anti_sniping_seconds}s extend the auction clock (anti-sniping).
                </p>
              </>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
                <p className="text-sm text-slate-500">This auction is not currently open for bidding.</p>
              </div>
            )}

            {isSeller && (
              <div className="mt-5 border-t border-slate-100 pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wide text-slate-400">Seller actions</h4>
                {reserveNotMet && sellerCanClose && (
                  <p className="mt-2 text-xs text-amber-700 font-medium">⚠ Reserve price not yet met — closing will not award the item.</p>
                )}
                {sellerCanClose ? (
                  <Button variant="outline" onClick={closeAuctionEarly} disabled={working} className="mt-2 w-full border-red-300 text-red-700 hover:bg-red-50">
                    Request early close
                  </Button>
                ) : (
                  <p className="mt-2 text-xs text-slate-500">Auction closed. The winning bidder was notified by NHFAS.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="text-sm font-bold text-brand-navy mb-4 flex items-center gap-2">
          <User className="h-4 w-4" aria-hidden="true" /> Bid history
        </h3>
        {bids.length === 0 ? (
          <p className="text-slate-500 text-sm">No bids yet. Be the first!</p>
        ) : (
          <div className="space-y-3">
            {bids.map((bid) => (
              <div key={bid.id} className="flex justify-between items-center border-b border-slate-100 pb-3 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    {bid.bidder_id === userId ? 'You' : (bid.bidder?.full_name || 'Anonymous')}
                    {isSeller && bid.fraud_score != null && Number(bid.fraud_score) >= 0.5 && (
                      <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700">
                        <Flag className="h-3 w-3" aria-hidden="true" /> unusual bid ({Number(bid.fraud_score).toFixed(2)})
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(bid.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-brand-navy">
                    {Number(bid.amount).toLocaleString()} ETB
                  </p>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-bold ${
                      bid.status === 'winning'
                        ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                        : bid.status === 'outbid'
                          ? 'border-amber-100 bg-amber-50 text-amber-600'
                          : 'border-slate-100 bg-slate-100 text-slate-500'
                    }`}
                  >
                    {bid.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p>
      )}
      {flash && (
        <p role="status" className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">{flash}</p>
      )}
    </main>
  );
};

export default AuctionPage;
