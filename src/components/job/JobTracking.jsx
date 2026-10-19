import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LoaderCircle, MapPinned } from 'lucide-react';
import { supabase } from '../../lib/supabase';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const TRACK_PERSIST_INTERVAL_MS = 10000;

const Recenter = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position);
  }, [position, map]);
  return null;
};

const JobTracking = ({ job, user }) => {
  const isAssignedProvider = job.provider_id === user.id;
  const isActive = ['en_route', 'in_progress'].includes(job.status);
  const [sharing, setSharing] = useState(false);
  const [points, setPoints] = useState([]);
  const [note, setNote] = useState('');
  const watchIdRef = useRef(null);
  const lastPersistRef = useRef(0);

  const loadPoints = async () => {
    const { data } = await supabase
      .from('job_tracking_points')
      .select('id, latitude, longitude, accuracy_m, speed_kph, recorded_at')
      .eq('job_id', job.id)
      .order('recorded_at', { ascending: false })
      .limit(60);
    if (data) setPoints([...data].reverse());
  };

  useEffect(() => {
    if (!isActive) {
      setPoints([]);
      return undefined;
    }
    loadPoints();
    const timer = setInterval(loadPoints, 10000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.id, isActive]);

  const stopSharing = () => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setSharing(false);
  };

  useEffect(() => stopSharing, []);

  const startSharing = () => {
    if (!('geolocation' in navigator)) {
      setNote('Location is not available in this browser.');
      return;
    }
    setNote('');
    setSharing(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        if (Date.now() - lastPersistRef.current < TRACK_PERSIST_INTERVAL_MS) return;
        lastPersistRef.current = Date.now();
        supabase.from('job_tracking_points').insert({
          job_id: job.id,
          driver_id: user.id,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy_m: position.coords.accuracy ?? null,
          speed_kph: position.coords.speed != null ? Math.round(position.coords.speed * 3.6 * 100) / 100 : null,
        }).then(() => loadPoints());
      },
      (error) => {
        setNote(error.code === error.PERMISSION_DENIED
          ? 'Location permission was denied. Allow it to share your position.'
          : 'Location is temporarily unavailable; retrying.');
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
  };

  const positions = points.map((point) => [Number(point.latitude), Number(point.longitude)]);
  const latest = positions[positions.length - 1] || null;

  return (
    <section aria-label="Live tracking" className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold text-brand-navy">
          <MapPinned className="h-4 w-4" /> Live tracking
        </h2>
        {isAssignedProvider && isActive && (
          <button
            type="button"
            onClick={sharing ? stopSharing : startSharing}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
              sharing ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-brand-green text-white hover:bg-brand-green/90'
            }`}
          >
            {sharing ? 'Stop sharing' : 'Share live location'}
          </button>
        )}
      </div>

      {note && <p role="alert" className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{note}</p>}

      {!isActive ? (
        <p className="mt-3 text-sm text-slate-500">Live tracking runs while the job is en route or in progress.</p>
      ) : latest ? (
        <div className="mt-4 h-72 overflow-hidden rounded-xl border border-slate-200">
          <MapContainer center={latest} zoom={13} scrollWheelZoom={false} className="h-full w-full">
            <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {positions.length > 1 && <Polyline positions={positions} color="#00A651" weight={4} opacity={0.8} />}
            <Marker position={latest} />
            <Recenter position={latest} />
          </MapContainer>
        </div>
      ) : (
        <div className="mt-4 flex h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-400">
          {isAssignedProvider && sharing
            ? <><LoaderCircle size={18} className="animate-spin" /><span className="text-sm">Waiting for your first position...</span></>
            : <span className="text-sm">Waiting for location updates from the provider.</span>}
        </div>
      )}

      {isActive && (
        <p className="mt-3 text-xs text-slate-400">
          Positions refresh every 10 seconds while sharing is active.
          {isAssignedProvider && !sharing && ' Tap "Share live location" so your client can follow the job in real time.'}
        </p>
      )}
    </section>
  );
};

export default JobTracking;
