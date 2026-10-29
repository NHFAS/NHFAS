import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, MapPinned, ShieldCheck } from 'lucide-react';
import { Button } from '../components/Button';
import { cn } from '../lib/utils';

const words = [
  'Skilled Hands',
  'Heavy Haul Services',
  'Expert Carpenters',
  'Logistics Pros',
  'Creative Craftsmen',
  'Local Plumbers',
];

const trustChips = [
  { icon: BadgeCheck, label: 'Identity review workflow' },
  { icon: ShieldCheck, label: 'Job escrow tracking' },
  { icon: MapPinned, label: 'Location sharing when enabled' },
];

const Hero = () => {
  const [currentWord, setCurrentWord] = useState(0);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setCurrentWord((prev) => (prev + 1) % words.length);
        setIsFading(false);
      }, 500);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-navy via-brand-navy to-[#123a6b] pt-28 pb-16 lg:pt-36 lg:pb-24">
      {/* Decorative glows */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-brand-green/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-16 h-[28rem] w-[28rem] rounded-full bg-brand-purple/15 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-12 lg:flex-row lg:items-center lg:gap-16">
          {/* Copy */}
          <div className="w-full lg:w-1/2">
            <h1 className="min-h-[160px] text-4xl font-extrabold leading-[1.15] tracking-tight text-white md:min-h-[190px] md:text-5xl lg:min-h-[210px] lg:text-6xl">
              <span className="block">Find</span>
              <span
                className={cn(
                  'block bg-gradient-to-r from-brand-green via-emerald-300 to-brand-green bg-clip-text text-transparent transition-all duration-500',
                  isFading ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0',
                )}
              >
                {words[currentWord]}
              </span>
              <span className="block">Near You.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-300">
              Whether you need skilled hands for delicate crafts or heavy equipment for major logistics,
              NHFAS brings service requests, provider discovery, and job coordination together in one place.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button as={Link} to="/search" size="lg" className="justify-center gap-2">
                Find a service <ArrowRight className="h-5 w-5" />
              </Button>
              <Button as={Link} to="/signup" variant="outline" size="lg" className="justify-center gap-2 border-white/30 text-white hover:bg-white/10 hover:text-white focus:ring-white/40">
                Become a provider
              </Button>
            </div>

            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3">
              {trustChips.map(({ icon: Icon, label }) => (
                <li key={label} className="inline-flex items-center gap-2 text-sm font-medium text-slate-300">
                  <Icon className="h-4 w-4 text-brand-green" /> {label}
                </li>
              ))}
            </ul>
          </div>
          {/* Illustration */}
          <div className="relative w-full lg:w-1/2">
            <div className="overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
              <img src="/illustrations/hero.svg" alt="NHFAS artisans and heavy haulage coordination" className="h-auto w-full" />
            </div>
          </div>
        </div>
      </div>

      {/* Wave divider */}
      <div className="absolute inset-x-0 bottom-0" aria-hidden="true">
        <svg viewBox="0 0 1440 72" fill="none" className="h-12 w-full text-white" preserveAspectRatio="none">
          <path d="M0 72h1440V28c-240 32-480 44-720 44S240 60 0 28z" fill="currentColor" />
        </svg>
      </div>
    </section>
  );
};

export default Hero;
