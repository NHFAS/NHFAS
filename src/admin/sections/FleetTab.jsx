import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Card, DataTable, ErrorNote, Spinner, StatusBadge, fmtDate, fmtDateTime, loadProfilesMap } from './adminUi';

const FleetTab = ({ notify }) => {
  const [vehicles, setVehicles] = useState([]);
  const [classes, setClasses] = useState({});
  const [maintenance, setMaintenance] = useState([]);
  const [telematics, setTelematics] = useState([]);
  const [sustainability, setSustainability] = useState([]);
  const [names, setNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [working, setWorking] = useState(null);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [profileNames, classRes, vehRes, maintRes, teleRes, sustRes] = await Promise.all([
        loadProfilesMap(),
        supabase.from('vehicle_classes').select('id, code, name'),
        supabase.from('vehicles').select('id, plate_number, make, model, model_year, status, maintenance_blocked, owner_id, vehicle_class_id, created_at')
          .order('created_at', { ascending: false }).limit(200),
        supabase.from('vehicle_maintenance_records').select('id, vehicle_id, maintenance_type, status, scheduled_at, completed_at, cost')
          .order('created_at', { ascending: false }).limit(200),
        supabase.from('telematics_events').select('id, vehicle_id, event_type, recorded_at')
          .order('recorded_at', { ascending: false }).limit(50),
        supabase.from('sustainability_records').select('id, vehicle_id, distance_km, fuel_litres, co2e_kg, calculation_method, created_at')
          .order('created_at', { ascending: false }).limit(50),
      ]);
      if (vehRes.error) throw vehRes.error;
      if (maintRes.error) throw maintRes.error;
      const classMap = {};
      (classRes.data || []).forEach((c) => { classMap[c.id] = c.name; });
      setNames(profileNames);
      setClasses(classMap);
      setVehicles(vehRes.data || []);
      setMaintenance(maintRes.data || []);
      setTelematics(teleRes.data || []);
      setSustainability(sustRes.data || []);
    } catch (e) {
      setError(e.message || String(e));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (table, id, patch, label) => {
    setWorking(id);
    const { error: updateError } = await supabase.from(table).update(patch).eq('id', id);
    setWorking(null);
    if (updateError) notify(`${label} failed: ${updateError.message}`, 'red');
    else {
      notify(`${label} succeeded.`, 'emerald');
      setTick((t) => t + 1);
    }
  };

  const actionBtn = (id, label, tone, onClick) => (
    <button
      onClick={onClick}
      disabled={working === id}
      className={`rounded-full border px-3 py-1 text-xs font-bold disabled:opacity-50 ${tone}`}
    >
      {label}
    </button>
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorNote>{error}</ErrorNote>;

  const plateOf = (vehicleId) => vehicles.find((v) => v.id === vehicleId)?.plate_number || '—';

  return (
    <div className="space-y-6">
      <Card title="Vehicles" subtitle={`${vehicles.length} vehicle(s)`}>
        <DataTable
          columns={[
            {
              key: 'plate_number', label: 'Plate',
              render: (v) => (
                <div>
                  <p className="font-mono text-sm font-bold text-red-900">{v.plate_number}</p>
                  <p className="text-xs text-red-500">{[v.make, v.model, v.model_year].filter(Boolean).join(' ') || '—'}</p>
                </div>
              ),
            },
            { key: 'vehicle_class_id', label: 'Class', render: (v) => classes[v.vehicle_class_id] || '—' },
            { key: 'owner', label: 'Owner', render: (v) => (v.owner_id ? names[v.owner_id] || '—' : 'organization') },
            { key: 'status', label: 'Status', render: (v) => <StatusBadge value={v.status} /> },
            {
              key: 'maintenance_blocked', label: 'Blocked',
              render: (v) => (v.maintenance_blocked ? <StatusBadge value="overdue" /> : <span className="text-xs text-slate-400">—</span>),
            },
            {
              key: 'actions', label: 'Actions', align: 'right',
              render: (v) => (
                <div className="flex items-center gap-2 justify-end flex-wrap">
                  {v.status !== 'active' && actionBtn(v.id, 'Activate', 'border-emerald-200 text-emerald-700 hover:bg-emerald-50',
                    () => act('vehicles', v.id, { status: 'active' }, 'Vehicle activated'))}
                  {v.status === 'active' && actionBtn(v.id, 'To maintenance', 'border-amber-200 text-amber-700 hover:bg-amber-50',
                    () => act('vehicles', v.id, { status: 'maintenance' }, 'Vehicle sent to maintenance'))}
                  {actionBtn(v.id, v.maintenance_blocked ? 'Unblock' : 'Block', 'border-red-200 text-red-600 hover:bg-red-50',
                    () => act('vehicles', v.id, { maintenance_blocked: !v.maintenance_blocked }, v.maintenance_blocked ? 'Vehicle unblocked' : 'Vehicle blocked'))}
                </div>
              ),
            },
          ]}
          rows={vehicles}
          empty="No vehicles registered."
        />
      </Card>
      <Card title="Maintenance records" subtitle={`${maintenance.length} record(s)`}>
        <DataTable
          columns={[
            { key: 'vehicle', label: 'Vehicle', render: (m) => <span className="font-mono text-xs">{plateOf(m.vehicle_id)}</span> },
            { key: 'maintenance_type', label: 'Type', render: (m) => m.maintenance_type },
            { key: 'scheduled_at', label: 'Scheduled', render: (m) => fmtDate(m.scheduled_at) },
            { key: 'cost', label: 'Cost', align: 'right', render: (m) => (m.cost != null ? `ETB ${Number(m.cost).toLocaleString()}` : '—') },
            { key: 'status', label: 'Status', render: (m) => <StatusBadge value={m.status} /> },
            {
              key: 'actions', label: 'Actions', align: 'right',
              render: (m) => (m.status !== 'completed'
                ? actionBtn(m.id, 'Mark completed', 'border-emerald-200 text-emerald-700 hover:bg-emerald-50',
                  () => act('vehicle_maintenance_records', m.id, { status: 'completed', completed_at: new Date().toISOString() }, 'Maintenance completed'))
                : '—'),
            },
          ]}
          rows={maintenance}
          empty="No maintenance records."
        />
      </Card>

      <Card title="Recent telematics events" subtitle={`${telematics.length} most recent event(s)`}>
        <DataTable
          columns={[
            { key: 'vehicle', label: 'Vehicle', render: (t) => <span className="font-mono text-xs">{plateOf(t.vehicle_id)}</span> },
            { key: 'event_type', label: 'Event', render: (t) => t.event_type },
            { key: 'recorded_at', label: 'Recorded', render: (t) => fmtDateTime(t.recorded_at) },
          ]}
          rows={telematics}
          empty="No telematics events."
        />
      </Card>

      <Card title="Sustainability records" subtitle={`${sustainability.length} record(s) — distance, fuel and CO₂e`}>
        <DataTable
          columns={[
            { key: 'vehicle', label: 'Vehicle', render: (s) => (s.vehicle_id ? <span className="font-mono text-xs">{plateOf(s.vehicle_id)}</span> : '—') },
            { key: 'distance_km', label: 'Distance', render: (s) => (s.distance_km != null ? `${s.distance_km} km` : '—') },
            { key: 'fuel_litres', label: 'Fuel', render: (s) => (s.fuel_litres != null ? `${s.fuel_litres} L` : '—') },
            { key: 'co2e_kg', label: 'CO₂e', render: (s) => (s.co2e_kg != null ? `${s.co2e_kg} kg` : '—') },
            { key: 'calculation_method', label: 'Method', render: (s) => s.calculation_method || '—' },
            { key: 'created_at', label: 'Date', render: (s) => fmtDate(s.created_at) },
          ]}
          rows={sustainability}
          empty="No sustainability records."
        />
      </Card>

    </div>
  );
};

export default FleetTab;
