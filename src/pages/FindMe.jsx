import React, { useState } from 'react';
import { MapPin } from 'lucide-react';
import ProviderMap from '../components/ProviderMap';

const FindMe = () => {
  const [isFindMeActive, setIsFindMeActive] = useState(false);

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
            onClick={() => setIsFindMeActive(!isFindMeActive)}
            className={`inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all shadow-sm ${
              isFindMeActive 
                ? 'bg-brand-green text-white shadow-md shadow-brand-green/30 ring-2 ring-brand-green ring-offset-2' 
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <MapPin className="h-5 w-5" />
            {isFindMeActive ? 'Find Me: Active' : 'Set as "Find Me"'}
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
        
        {!isFindMeActive && (
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
