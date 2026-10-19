import React, { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Card, DataTable, Spinner, StatusBadge, fmtDateTime, fmtMoney } from './adminUi';

// Loads every related record for one job: status history, stops, cargo,
// quotes, dispatch offers, route plans, tracking, cost estimates, permits.
const JobDetail = ({ jobId, names, onClose, notify }) => {
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    const [history, stops, cargo, quotes, offers, routes, tracking, estimates, permits] = await Promise.all([
      supabase.from('job_status_history').select('id, from_status, to_status, reason, changed_at').eq('job_id', jobId).order('changed_at', { ascending: false }),
      supabase.from('job_stops').select('id, stop_order, stop_type, address, arrived_at, planned_arrival').eq('job_id', jobId).order('stop_order', { ascending: true }),
      supabase.from('cargo_specifications').select('id, description, weight_kg, is_hazardous, is_oversize').eq('job_id', jobId),
      supabase.from('job_quotes').select('id, provider_id, amount, estimated_days, status, created_at').eq('job_id', jobId).order('created_at', { ascending: false }),
      supabase.from('dispatch_offers').select('id, provider_id, operator_id, rank, match_score, status, expires_at').eq('job_id', jobId).order('rank', { ascending: true }),
      supabase.from('route_plans').select('id, algorithm, distance_km, estimated_minutes, created_at').eq('job_id', jobId).order('created_at', { ascending: false }),
      supabase.from('job_tracking_points').select('id, latitude, longitude, speed_kph, recorded_at').eq('job_id', jobId).order('recorded_at', { ascending: false }).limit(5),
      supabase.from('cost_estimates').select('id, labor_cost, materials_cost, transport_cost, total_estimate, created_at').eq('job_id', jobId).order('created_at', { ascending: false }),
      supabase.from('regulatory_permits').select('id, permit_type, permit_number, status, valid_until').eq('job_id', jobId),
    ]);
    const firstError = [history, stops, cargo, quotes, offers, routes, tracking, estimates, permits]
      .map((r) => r.error).find(Boolean);
    if (firstError && notify) notify(`Some job details failed to load: ${firstError.message}`, 'red');
    setData({
      history: history.data || [], stops: stops.data || [], cargo: cargo.data || [],
      quotes: quotes.data || [], offers: offers.data || [], routes: routes.data || [],
      tracking: tracking.data || [], estimates: estimates.data || [], permits: permits.data || [],
    });
  }, [jobId, notify]);

  useEffect(() => { load(); }, [load]);

  if (!data) return <Card title="Job detail"><Spinner /></Card>;

  return (
    <Card
      title="Job detail"
      subtitle="Status history, stops, cargo, quotes, dispatch, routing, estimates and permits"
      action={
        <button onClick={onClose} className="rounded-full p-1.5 text-red-400 hover:bg-red-100 hover:text-red-700" aria-label="Close detail">
          <X className="h-4 w-4" />
        </button>
      }
    >
      <div className="space-y-6 p-4">
        <div>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-red-600">Status history</h4>
          <DataTable
            columns={[
              { key: 'from', label: 'From', render: (h) => <StatusBadge value={h.from_status || 'draft'} /> },
              { key: 'to', label: 'To', render: (h) => <StatusBadge value={h.to_status} /> },
              { key: 'reason', label: 'Reason', render: (h) => h.reason || '—' },
              { key: 'changed_at', label: 'When', render: (h) => fmtDateTime(h.changed_at) },
            ]}
            rows={data.history}
            empty="No status changes recorded."
          />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-red-600">Stops</h4>
            <DataTable
              columns={[
                { key: 'stop_order', label: '#', render: (s) => s.stop_order },
                { key: 'stop_type', label: 'Type', render: (s) => s.stop_type },
                { key: 'address', label: 'Address', render: (s) => s.address },
                { key: 'arrived_at', label: 'Arrived', render: (s) => fmtDateTime(s.arrived_at || s.planned_arrival) },
              ]}
              rows={data.stops}
              empty="No stops."
            />
          </div>
          <div>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-red-600">Cargo</h4>
            <DataTable
              columns={[
                { key: 'description', label: 'Description', render: (c) => c.description },
                { key: 'weight_kg', label: 'Weight (kg)', render: (c) => c.weight_kg },
                { key: 'flags', label: 'Flags', render: (c) => [c.is_hazardous && 'Hazardous', c.is_oversize && 'Oversize'].filter(Boolean).join(', ') || '—' },
              ]}
              rows={data.cargo}
              empty="No cargo specification."
            />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-red-600">Quotes</h4>
            <DataTable
              columns={[
                { key: 'provider', label: 'Provider', render: (q) => names[q.provider_id] || '—' },
                { key: 'amount', label: 'Amount', render: (q) => fmtMoney(q.amount) },
                { key: 'days', label: 'Days', render: (q) => q.estimated_days ?? '—' },
                { key: 'status', label: 'Status', render: (q) => <StatusBadge value={q.status} /> },
              ]}
              rows={data.quotes}
              empty="No quotes."
            />
          </div>
          <div>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-red-600">Dispatch offers</h4>
            <DataTable
              columns={[
                { key: 'rank', label: 'Rank', render: (o) => o.rank },
                { key: 'target', label: 'Offered to', render: (o) => names[o.provider_id || o.operator_id] || '—' },
                { key: 'score', label: 'Match', render: (o) => (o.match_score != null ? `${Math.round(o.match_score * 100)}%` : '—') },
                { key: 'status', label: 'Status', render: (o) => <StatusBadge value={o.status} /> },
              ]}
              rows={data.offers}
              empty="No dispatch offers."
            />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-red-600">Route plans</h4>
            <DataTable
              columns={[
                { key: 'distance_km', label: 'Distance', render: (r) => (r.distance_km != null ? `${r.distance_km} km` : '—') },
                { key: 'estimated_minutes', label: 'ETA', render: (r) => (r.estimated_minutes != null ? `${r.estimated_minutes} min` : '—') },
              ]}
              rows={data.routes}
              empty="No route plans."
            />
          </div>
          <div>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-red-600">Latest tracking points</h4>
            <DataTable
              columns={[
                { key: 'latitude', label: 'Lat', render: (t) => t.latitude },
                { key: 'longitude', label: 'Lng', render: (t) => t.longitude },
                { key: 'recorded_at', label: 'When', render: (t) => fmtDateTime(t.recorded_at) },
              ]}
              rows={data.tracking}
              empty="No tracking points."
            />
          </div>
          <div>
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-red-600">Cost estimates</h4>
            <DataTable
              columns={[
                { key: 'total_estimate', label: 'Total', render: (e) => fmtMoney(e.total_estimate) },
                { key: 'breakdown', label: 'L / M / T', render: (e) => `${e.labor_cost} / ${e.materials_cost} / ${e.transport_cost}` },
              ]}
              rows={data.estimates}
              empty="No estimates."
            />
          </div>
        </div>

        <div>
          <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-red-600">Regulatory permits</h4>
          <DataTable
            columns={[
              { key: 'permit_type', label: 'Type', render: (p) => p.permit_type },
              { key: 'permit_number', label: 'Number', render: (p) => p.permit_number || '—' },
              { key: 'status', label: 'Status', render: (p) => <StatusBadge value={p.status} /> },
              { key: 'valid_until', label: 'Valid until', render: (p) => fmtDateTime(p.valid_until) },
            ]}
            rows={data.permits}
            empty="No permits on file."
          />
        </div>

      </div>
    </Card>
  );
};

export default JobDetail;
