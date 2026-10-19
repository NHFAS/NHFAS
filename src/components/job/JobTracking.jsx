import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AlertTriangle, Clock, LoaderCircle, MapPinned, Navigation } from 'lucide-react';
import { supabase } from '../../lib/supabase';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const TRACK_PERSIST_INTERVAL_MS = 10000;
const DEVIATION_ALERT_KM = 2.5;
const DEFAULT_SPEED_KPH = 40;
const ROAD_FACTOR = 1.3; // straight-line km → estimated road km

// Free OSM geocoding (no key). Results are cached per address for the
// session so the ETA panel doesn't re-hit Nominatim on every poll.
const geoCache = new Map();
const geocodeAddress = async (address) => {
  if (!address) return null;
  if (geoCache.has(address)) return geoCache.get(address);
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`,
      { headers: { Accept: 'application/json', 'Accept-Language': 'en' } },
    );
    const rows = await response.json();
    const loc = rows?.[0] ? { lat: Number(rows[0].lat), lon: Number(rows[0].lon) } : null;
    geoCache.set(address, loc);
    return loc;
  } catch {
    return null;
  }
};

const toRad = (deg) => (deg * Math.PI) / 180;
const haversineKm = ([lat1, lon1], [lat2, lon2]) => {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

// Perpendicular distance (km) from point p to the segment a→b, using a
// local equirectangular projection — accurate enough at city/regional scale.
const corridorDeviationKm = (p, a, b) => {
  const latRef = toRad((a[0] + b[0]) / 2);
  const kmPerDegLat = 110.574;
  const kmPerDegLon = 111.32 * Math.cos(latRef);
  const ax = a[1] * kmPerDegLon; const ay = a[0] * kmPerDegLat;
  const bx = b[1] * kmPerDegLon; const by = b[0] * kmPerDegLat;
  const px = p[1] * kmPerDegLon; const py = p[0] * kmPerDegLat;
  const dx = bx - ax; const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return haversineKm(p, a);
  let t = ((px - ax) * dx + (py - ay) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  const closest = [ay + t * dy, ax + t * dx]; // lat, lon (unprojected order kept)
  return haversineKm(p, [closest[0] / kmPerDegLat, closest[1] / kmPerDegLon]);
};

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

  const originAddress = job.pickup_address || job.service_address || null;
  const destinationAddress = job.dropoff_address || job.service_address || null;
  const [originCoords, setOriginCoords] = useState(null);
  const [destinationCoords, setDestinationCoords] = useState(null);

  // FR-04 — geocode the route ends once per job so we can show ETA and
  // detect corridor deviations from the live track.
  useEffect(() => {
    if (!isActive) {
      setOriginCoords(null);
      setDestinationCoords(null);
      return undefined;
    }
    let active = true;
    Promise.all([geocodeAddress(originAddress), geocodeAddress(destinationAddress)]).then(([origin, dest]) => {
      if (!active) return;
      setOriginCoords(origin ? [origin.lat, origin.lon] : null);
      setDestinationCoords(dest ? [dest.lat, dest.lon] : null);
    });
    return () => { active = false; };
  }, [isActive, originAddress, destinationAddress]);

  const etaInfo = useMemo(() => {
    if (!latest || !destinationCoords) return null;
    const roadKm = haversineKm(latest, destinationCoords) * ROAD_FACTOR;
    const recent = points.slice(-10).map((point) => Number(point.speed_kph)).filter((speed) => speed > 3);
    const speed = recent.length ? recent.reduce((sum, value) => sum + value, 0) / recent.length : DEFAULT_SPEED_KPH;
    const minutes = Math.max(1, Math.round((roadKm / speed) * 60));
    return { km: Math.round(roadKm * 10) / 10, minutes };
  }, [latest, destinationCoords, points]);

  const deviationKm = useMemo(() => {
    if (!latest || !originCoords || !destinationCoords) return null;
    return Math.round(corridorDeviationKm(latest, originCoords, destinationCoords) * 100) / 100;
  }, [latest, originCoords, destinationCoords]);
  const isDeviating = deviationKm != null && deviationKm > DEVIATION_ALERT_KM;

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

      {(etaInfo || deviationKm != null) && (
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3" aria-label="Route estimates">
          <div className="rounded-lg bg-slate-50 p-3">
            <dt className="flex items-center gap-1 text-xs font-medium text-slate-500">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" /> ETA to drop-off
            </dt>
            <dd className="mt-1 font-bold text-brand-navy" aria-live="polite">
              {etaInfo ? `${etaInfo.minutes} min` : '—'}
            </dd>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <dt className="flex items-center gap-1 text-xs font-medium text-slate-500">
              <Navigation className="h-3.5 w-3.5" aria-hidden="true" /> Est. remaining
            </dt>
            <dd className="mt-1 font-bold text-brand-navy">
              {etaInfo ? `${etaInfo.km} km` : '—'}
            </dd>
          </div>
          <div className={`rounded-lg p-3 ${isDeviating ? 'bg-red-50' : 'bg-slate-50'}`}>
            <dt className="text-xs font-medium text-slate-500">Off-route distance</dt>
            <dd className={`mt-1 font-bold ${isDeviating ? 'text-red-700' : 'text-brand-navy'}`}>
              {deviationKm != null ? `${deviationKm} km` : '—'}
            </dd>
          </div>
        </dl>
      )}
      {isDeviating && (
        <p role="alert" className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          Deviation alert: the vehicle is {deviationKm} km from the direct route corridor (threshold {DEVIATION_ALERT_KM} km). ETA recalculated automatically (FR-04).
        </p>
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
