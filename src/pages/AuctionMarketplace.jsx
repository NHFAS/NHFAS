import React, { useEffect, useState } from 'react';
import { ArrowUpRight, Gavel, LoaderCircle, Plus, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';

const defaultStart = () => new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16);
const defaultEnd = () => new Date(Date.now() + 65 * 60 * 1000).toISOString().slice(0, 16);

const AuctionMarketplace = () => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('');
  const [auctions, setAuctions] = useState([]);
  const [summaries, setSummaries] = useState({});
  const [bidValues, setBidValues] = useState({});
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', starting: '', reserve: '', startsAt: defaultStart(), endsAt: defaultEnd() });
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadAuctions = async () => {
    const { data, error: queryError } = await supabase.from('auction_listings')
      .select('id, seller_id, title, description, starting_price, reserve_price, starts_at, ends_at, status')
      .in('status', ['open', 'scheduled']).order('ends_at', { ascending: true });
    if (queryError) {
      setError(queryError.message);
      return;
    }
    const listings = data || [];
    setAuctions(listings);
    if (listings.length) {
      const { data: summaryData } = await supabase.from('auction_bid_summaries')
        .select('auction_id, highest_bid, bid_count').in('auction_id', listings.map((auction) => auction.id));
      setSummaries(Object.fromEntries((summaryData || []).map((item) => [item.auction_id, item])));
    }
  };

  useEffect(() => {
    let mounted = true;
    const initialize = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!mounted) return;
      setUser(currentUser);
      if (currentUser) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', currentUser.id).maybeSingle();
        if (mounted) setRole(profile?.role || '');
        await loadAuctions();
      }
      if (mounted) setLoading(false);
    };
    initialize();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    const timer = window.setInterval(loadAuctions, 15000);
    return () => window.clearInterval(timer);
  }, [user]);

  const createAuction = async (event) => {
    event.preventDefault();
    setWorking('create');
    setError('');
    setMessage('');
    const { error: createError } = await supabase.rpc('create_auction_listing', {
      listing_title: form.title,
      listing_description: form.description || null,
      minimum_price: Number(form.starting),
      reserve_price: form.reserve ? Number(form.reserve) : null,
      auction_starts_at: new Date(form.startsAt).toISOString(),
      auction_ends_at: new Date(form.endsAt).toISOString(),
    });
    if (createError) setError(createError.message);
    else {
      setShowCreate(false);
      setForm({ title: '', description: '', starting: '', reserve: '', startsAt: defaultStart(), endsAt: defaultEnd() });
      setMessage('Auction listing published.');
      await loadAuctions();
    }
    setWorking(null);
  };

  const placeBid = async (auction) => {
    setWorking(auction.id);
    setError('');
    setMessage('');
    const { error: bidError } = await supabase.rpc('place_auction_bid', {
      target_auction_id: auction.id,
      bid_amount: Number(bidValues[auction.id]),
    });
    if (bidError) setError(bidError.message);
    else {
      setMessage('Your bid is now the leading bid.');
      setBidValues((current) => ({ ...current, [auction.id]: '' }));
      await loadAuctions();
    }
    setWorking(null);
  };

  return (
    <main className="mx-auto min-h-[70vh] max-w-6xl px-5 pb-10 pt-28 sm:px-8 lg:pb-14 lg:pt-32">
      <header className="flex flex-col gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-green">CRAFT / COLLECT / TRADE</p>
          <h1 className="mt-2 text-3xl font-bold text-brand-navy sm:text-4xl">Artisan auctions</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Bid on original work from verified makers. A bid in the final minute adds three minutes to the clock.</p>
        </div>
        {user ? <Button onClick={() => setShowCreate((visible) => !visible)} className="gap-2 self-start"><Plus size={17} />{showCreate ? 'Close listing' : 'List an artwork'}</Button> : <Button as={Link} to="/login" className="self-start">Sign in to bid</Button>}
      </header>

      {showCreate && role === 'service_provider' && (
        <form onSubmit={createAuction} className="grid gap-4 border-b border-slate-200 py-6 sm:grid-cols-2">
          <label className="space-y-1.5 text-sm font-semibold text-slate-700">Artwork title<input required maxLength={140} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="w-full border border-slate-300 px-3 py-2.5 font-normal" /></label>
          <label className="space-y-1.5 text-sm font-semibold text-slate-700">Starting price (ETB)<input required type="number" min="0" step="1" value={form.starting} onChange={(event) => setForm({ ...form, starting: event.target.value })} className="w-full border border-slate-300 px-3 py-2.5 font-normal" /></label>
          <label className="space-y-1.5 text-sm font-semibold text-slate-700">Reserve price (optional)<input type="number" min={form.starting || 0} step="1" value={form.reserve} onChange={(event) => setForm({ ...form, reserve: event.target.value })} className="w-full border border-slate-300 px-3 py-2.5 font-normal" /></label>
          <label className="space-y-1.5 text-sm font-semibold text-slate-700">Description<textarea rows={2} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="w-full border border-slate-300 px-3 py-2.5 font-normal" /></label>
          <label className="space-y-1.5 text-sm font-semibold text-slate-700">Starts<input required type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} className="w-full border border-slate-300 px-3 py-2.5 font-normal" /></label>
          <label className="space-y-1.5 text-sm font-semibold text-slate-700">Ends<input required type="datetime-local" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} className="w-full border border-slate-300 px-3 py-2.5 font-normal" /></label>
          <Button disabled={working === 'create'} className="gap-2 self-start"><Gavel size={16} />Publish auction</Button>
        </form>
      )}
      {showCreate && user && role !== 'service_provider' && <p className="border-b border-slate-200 py-4 text-sm text-slate-600">Only identity-approved artisan providers can create auction listings.</p>}
      {!user && <p className="border-b border-slate-200 py-4 text-sm text-slate-600">Sign in to see current listings and participate in bidding.</p>}
      {error && <p className="mt-5 border-l-4 border-red-600 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</p>}
      {message && <p className="mt-5 border-l-4 border-green-600 bg-green-50 px-4 py-3 text-sm text-green-800" role="status">{message}</p>}

      {loading ? <p className="py-12 text-sm text-slate-500">Loading auctions...</p> : user && auctions.length ? (
        <section className="mt-2 divide-y divide-slate-200 border-y border-slate-200">
          {auctions.map((auction) => {
            const summary = summaries[auction.id];
            const minimumBid = summary?.highest_bid ? Number(summary.highest_bid) + 1 : Number(auction.starting_price);
            const isSeller = auction.seller_id === user.id;
            return (
              <article key={auction.id} className="grid gap-5 py-6 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide text-brand-green"><span>{auction.status}</span><span className="h-1 w-1 rounded-full bg-slate-400" /><span>Ends {new Date(auction.ends_at).toLocaleString()}</span></div>
                  <h2 className="mt-2 text-xl font-bold text-brand-navy">{auction.title}</h2>
                  {auction.description && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{auction.description}</p>}
                  <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
                    <span>Leading bid <strong className="text-brand-navy">{summary?.highest_bid == null ? `${Number(auction.starting_price).toLocaleString()} ETB start` : `${Number(summary.highest_bid).toLocaleString()} ETB`}</strong></span>
                    <span>{summary?.bid_count || 0} bids</span>
                    {auction.reserve_price != null && <span>Reserve set</span>}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  {isSeller ? <span className="text-sm font-medium text-slate-500">Your listing</span> : auction.status === 'open' ? (
                    <>
                      <label className="sr-only" htmlFor={`bid-${auction.id}`}>Your bid in ETB</label>
                      <input id={`bid-${auction.id}`} type="number" min={minimumBid} step="1" value={bidValues[auction.id] || ''} onChange={(event) => setBidValues((current) => ({ ...current, [auction.id]: event.target.value }))} className="h-10 w-36 border border-slate-300 px-3 text-sm outline-none focus:border-brand-green" placeholder={`${minimumBid} ETB min`} />
                      <Button onClick={() => placeBid(auction)} disabled={working === auction.id || Number(bidValues[auction.id]) < minimumBid} className="h-10 gap-2 px-4 text-sm">{working === auction.id ? <LoaderCircle size={15} className="animate-spin" /> : <ArrowUpRight size={15} />}Place bid</Button>
                    </>
                  ) : <span className="text-sm text-slate-500">Scheduled</span>}
                </div>
              </article>
            );
          })}
        </section>
      ) : !loading && user ? (
        <div className="flex flex-col items-center border-y border-slate-200 py-16 text-center"><Gavel size={27} className="text-slate-400" /><h2 className="mt-4 text-lg font-bold text-brand-navy">No active auctions</h2><p className="mt-2 text-sm text-slate-600">Verified artisan listings will appear here when published.</p><Button variant="outline" onClick={loadAuctions} className="mt-5 gap-2"><RefreshCw size={15} />Refresh listings</Button></div>
      ) : null}
    </main>
  );
};

export default AuctionMarketplace;