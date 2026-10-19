import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Card, DataTable, ErrorNote, Spinner, StatusBadge, fmtDateTime, fmtMoney, loadProfilesMap } from './adminUi';

const AuctionsTab = ({ notify }) => {
  const [auctions, setAuctions] = useState([]);
  const [bids, setBids] = useState([]);
  const [names, setNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [working, setWorking] = useState(null);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [profileNames, aucRes, bidRes] = await Promise.all([
        loadProfilesMap(),
        supabase.from('auction_listings').select('id, title, seller_id, starting_price, reserve_price, starts_at, ends_at, status')
          .order('ends_at', { ascending: true }).limit(200),
        supabase.from('auction_bids').select('id, auction_id, bidder_id, amount, status, created_at')
          .order('created_at', { ascending: false }).limit(500),
      ]);
      if (aucRes.error) throw aucRes.error;
      if (bidRes.error) throw bidRes.error;
      setNames(profileNames);
      setAuctions(aucRes.data || []);
      setBids(bidRes.data || []);
    } catch (e) {
      setError(e.message || String(e));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const closeAuction = async (auctionId) => {
    if (!window.confirm('Close this auction now? The current winning bidder will be notified.')) return;
    setWorking(auctionId);
    const { error: closeError } = await supabase.rpc('close_auction', { target_auction_id: auctionId });
    setWorking(null);
    if (closeError) notify(`Auction close failed: ${closeError.message}`, 'red');
    else {
      notify('Auction closed and the winner was notified.', 'emerald');
      setTick((t) => t + 1);
    }
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorNote>{error}</ErrorNote>;

  const bidsFor = (auctionId) => bids.filter((b) => b.auction_id === auctionId);
  const topBid = (auctionId) => {
    const list = bidsFor(auctionId).filter((b) => b.status !== 'withdrawn' && b.status !== 'rejected');
    if (!list.length) return null;
    return list.reduce((best, b) => (Number(b.amount) > Number(best.amount) ? b : best), list[0]);
  };

  return (
    <div className="space-y-6">
      <Card title="Auctions" subtitle={`${auctions.length} listing(s)`}>
        <DataTable
          columns={[
            { key: 'title', label: 'Title', render: (a) => <span className="font-semibold text-red-900">{a.title}</span> },
            { key: 'seller', label: 'Seller', render: (a) => names[a.seller_id] || '—' },
            { key: 'starting_price', label: 'Start price', align: 'right', render: (a) => fmtMoney(a.starting_price) },
            { key: 'reserve_price', label: 'Reserve', align: 'right', render: (a) => fmtMoney(a.reserve_price) },
            {
              key: 'top_bid', label: 'Top bid', align: 'right',
              render: (a) => {
                const bid = topBid(a.id);
                return bid ? `${fmtMoney(bid.amount)} (${names[bid.bidder_id] || '—'})` : '—';
              },
            },
            { key: 'bids', label: 'Bids', render: (a) => bidsFor(a.id).length },
            { key: 'ends_at', label: 'Ends', render: (a) => fmtDateTime(a.ends_at) },
            { key: 'status', label: 'Status', render: (a) => <StatusBadge value={a.status} /> },
            {
              key: 'actions', label: 'Actions', align: 'right',
              render: (a) => (
                a.status !== 'closed' && a.status !== 'cancelled' ? (
                  <button
                    onClick={() => closeAuction(a.id)}
                    disabled={working === a.id}
                    className="rounded-full border border-red-200 px-3 py-1 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Close now
                  </button>
                ) : '—'
              ),
            },
          ]}
          rows={auctions}
          empty="No auctions created."
        />
      </Card>

      <Card title="Recent bids" subtitle={`${bids.length} bid(s)`}>
        <DataTable
          columns={[
            { key: 'auction', label: 'Auction', render: (b) => auctions.find((a) => a.id === b.auction_id)?.title || '—' },
            { key: 'bidder', label: 'Bidder', render: (b) => names[b.bidder_id] || '—' },
            { key: 'amount', label: 'Amount', align: 'right', render: (b) => fmtMoney(b.amount) },
            { key: 'status', label: 'Status', render: (b) => <StatusBadge value={b.status} /> },
            { key: 'created_at', label: 'Placed', render: (b) => fmtDateTime(b.created_at) },
          ]}
          rows={bids}
          empty="No bids placed."
        />
      </Card>
    </div>
  );
};

export default AuctionsTab;
