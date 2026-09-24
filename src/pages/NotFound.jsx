import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Compass } from 'lucide-react';

const NotFound = () => (
  <main className="flex min-h-[70vh] flex-1 items-center justify-center bg-brand-softBlue px-4 py-20">
    <div className="max-w-xl text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-navy text-white shadow-lg">
        <Compass className="h-8 w-8" />
      </div>
      <p className="mt-8 text-sm font-bold uppercase tracking-[0.2em] text-brand-green">404 error</p>
      <h1 className="mt-3 text-4xl font-extrabold text-brand-navy md:text-5xl">This page is not available</h1>
      <p className="mt-5 text-lg leading-relaxed text-slate-600">The address may be outdated or the page may have moved. Let’s get you back to NHFAS.</p>
      <Link to="/" className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand-green px-6 py-3 font-semibold text-white hover:bg-brand-green/90">
        <ArrowLeft className="h-4 w-4" />
        Return home
      </Link>
    </div>
  </main>
);

export default NotFound;
