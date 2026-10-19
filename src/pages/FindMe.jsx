import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, MapPin } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import ProviderMap from '../components/ProviderMap';
import { supabase } from '../lib/supabase';

const LOCATION_PERSIST_INTERVAL_MS = 10000;

const FindMe = () => {
  const { user } = useOutletContext();
  const [isFindMeActive, setIsFindMeActive] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const watchIdRef = useRef(null);
  const lastPersistRef = useRef(0);

  // Load the stored visibility + last location so the toggle survives reloads.
  useEffect(() => {
    if (!user) return undefined;
    let isCurrent = true;
    (async () => {
      const { data } = await supabase
        .from('provider_profiles')
        .select('is_searchable, last_latitude, last_longitude')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!isCurrent || !data) return;
      setIsFindMeActive(Boolean(data.is_searchable));
    })();
    return () => {
      isCurrent = false;
    };
  }, [user]);

  const stopWatching = () => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  // Clean up the browser location watcher when leaving the page.
  useEffect(() => stopWatching, []);

  const persist = async (visible, position, { silent = false } = {}) => {
    if (!user) return false;
    if (!silent) setIsSaving(true);
    const updates = { is_searchable: visible };
    if (position) {
      updates.last_latitude = position[0];
      updates.last_longitude = position[1];
      updates.last_location_at = new Date().toISOString();
    }
    const { error } = await supabase
      .from('provider_profiles')
      .upsert({ user_id: user.id, ...updates }, { onConflict: 'user_id' });
    if (!silent) setIsSaving(false);
    if (error) {
      if (!silent) {
        setLocationError('Your visibility setting could not be saved. Check your connection and try again.');
      }
      return false;
    }
    lastPersistRef.current = Date.now();
    return true;
  };

  const handleToggle = async () => {
    setLocationError('');
    const nextActive = !isFindMeActive;

    if (!nextActive) {
      setIsFindMeActive(false);
      stopWatching();
      await persist(false, null);
      return;
    }

    if (!('geolocation' in navigator)) {
      setLocationError('Location is not available in this browser, so Find Me cannot be switched on.');
      return;
    }

    const saved = await persist(true, null);
    if (!saved) return;
    setIsFindMeActive(true);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const next = [position.coords.latitude, position.coords.longitude];
        // Throttle writes: at most one location update every 10 seconds.
        if (Date.now() - lastPersistRef.current >= LOCATION_PERSIST_INTERVAL_MS) {
          persist(true, next, { silent: true });
        }
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError('Location permission was denied. Allow location access to appear on the client map.');
          stopWatching();
          setIsFindMeActive(false);
          persist(false, null, { silent: true });
        } else {
          setLocationError('Your location could not be updated. It will keep retrying while Find Me is active.');
        }
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 },
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-green">Location Tracking</p>
          <h1 className="mt-2 text-3xl font-extrabold text-brand-navy">Find Me</h1>
          <p className="mt-2 max-w-2xl text-slate-500">Toggle your visibility so nearby clients can find your services on the map.</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleToggle}
            disabled={isSaving}
            className={`inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all shadow-sm disabled:opacity-60 ${
              isFindMeActive 
                ? 'bg-brand-green text-white shadow-md shadow-brand-green/30 ring-2 ring-brand-green ring-offset-2' 
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <MapPin className="h-5 w-5" />
            {isSaving ? 'Saving...' : isFindMeActive ? 'Find Me: Active' : 'Set as "Find Me"'}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-brand-navy">Your Live Location</h2>
            <p className="text-sm text-slate-500 mt-1">
              {isFindMeActive 
                ? 'You are currently visible on the client map.' 
                : 'Turn on "Find Me" to become visible to clients.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              {isFindMeActive && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-green opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isFindMeActive ? 'bg-brand-green' : 'bg-slate-300'}`}></span>
            </span>
            <span className={`text-sm font-medium ${isFindMeActive ? 'text-brand-green' : 'text-slate-400'}`}>
              {isFindMeActive ? 'Live' : 'Offline'}
            </span>
          </div>
        </div>
        
        <div className={`transition-opacity duration-500 ${isFindMeActive ? 'opacity-100' : 'opacity-50 grayscale'}`}>
          <ProviderMap />
        </div>
        
        {locationError && (
          <div role="alert" className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
            <p>{locationError}</p>
          </div>
        )}

        {!isFindMeActive && !locationError && (
          <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-start gap-3">
            <MapPin className="w-5 h-5 shrink-0 text-amber-600" />
            <p>You are currently hidden from the client map. Turn on "Find Me" when you are available to take immediate requests nearby.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FindMe;
