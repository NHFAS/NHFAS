import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Gavel, LoaderCircle, Timer, User } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';

const AuctionPage = () => {
  const { auctionId } = useParams();
  const navigate = useNavigate();
  const [auction, setAuction] = useState(null);
  const [bids, setBids] = useState([]);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const [working, setWorking] = useState(false);
  const [bidAmount, setBidAmount] = useState('');

  const load = useCallback(async () => {
    if (!auctionId) return;
    setIsLoading(true);
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
    setAuction(a);
    setCurrentPrice(a.starting_price);
    const { data: b } = await supabase
      .from('auction_bids')
      .select('*, bidder:profiles(full_name)')
      .eq('auction_id', auctionId)
      .in('status', ['active', 'winning'])
      .order('amount', { descending: true })
      .order('created_at', { ascending: true });
    setBids(b || []);
    if (b && b.length > 0) setCurrentPrice(b[0].amount);
    setTimeLeft(Math.max(0, Math.floor((new Date(a.ends_at).getTime() - Date.now()) / 1000)));
    setIsLoading(false);
  }, [auctionId]);

  useEffect(() => {
    load();
    const t = setInterval(() => {
      if (auction) {
        setTimeLeft(Math.max(0, Math.floor((new Date(auction.ends_at).getTime() - Date.now()) / 1000)));
      }
    }, 1000);
    const bidT = setInterval(load, 5000);
    return () => { clearInterval(t); clearInterval(bidT); };
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
      setFlash('Bid placed successfully!');
      setBidAmount('');
      load();
    }
  };

  if (isLoading || !auction) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="animate-pulse rounded-xl bg-slate-700/30 h-96"></div>
      </main>
    );
  }

  const isOpen = auction.status === 'open' && timeLeft > 0;
  const minBid = currentPrice + (auction.starting_price * 0.05);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex items-center gap-2 mb-6">
        <Button as={Link} to="/services/auction" variant="outline" size="sm" className="gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to auctions
        </Button>
        <h1 className="text-2xl font-bold text-brand-navy">{auction.title}</h1>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 text-sm">{error}</div>
      )}
      {flash && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-700 text-sm">{flash}</div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <p className="text-sm text-slate-500">Current price</p>
              <span className="text-3xl font-bold text-brand-navy">{currentPrice.toLocaleString()} ETB</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Timer className="h-4 w-4" aria-hidden="true" />
              <span>{timeLeft}s remaining</span>
            </div>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                isOpen ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-slate-100 bg-slate-100 text-slate-500'
              }`}
            >
              {isOpen ? 'LIVE' : auction.status.toUpperCase()}
            </span>
          </div>
          {auction.description && (
            <div className="mb-6">
              <p className="text-sm font-medium text-slate-700 mb-2">Description</p>
              <p className="text-slate-600">{auction.description}</p>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2 text-sm text-slate-500">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase">Starting price</p>
              <p className="text-brand-navy">{auction.starting_price.toLocaleString()} ETB</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase">Reserve price</p>
              <p className="text-brand-navy">{auction.reserve_price ? auction.reserve_price.toLocaleString() + ' ETB' : 'None set'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase">Seller</p>
              <p className="text-brand-navy">{auction.seller?.full_name || 'Artisan'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase">Next min bid</p>
              <p className="text-brand-navy">{isOpen ? minBid.toLocaleString() + ' ETB' : '—'}</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="rounded-xl border border-slate-200 bg-white p-6 sticky top-24">
            <h3 className="text-sm font-bold text-brand-navy mb-4">Place your bid</h3>
            {isOpen ? (
              <>
                <label className="block text-sm font-medium text-slate-700 mb-2">Bid amount (ETB)</label>
                <div className="relative mb-4">
                  <input
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
                  Bids in the final minutes extend the auction clock (anti-sniping).
                </p>
              </>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
                <p className="text-sm text-slate-500">This auction is not currently open for bidding.</p>
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
                  <p className="text-sm font-medium text-slate-700">{bid.bidder?.full_name || 'Anonymous'}</p>
                  <p className="text-xs text-slate-400">
                    {new Date(bid.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-brand-navy">
                    {bid.amount.toLocaleString()} ETB
                  </p>
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-bold ${
                      bid.status === 'winning'
                        ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
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
    </main>
  );
};

export default AuctionPage;