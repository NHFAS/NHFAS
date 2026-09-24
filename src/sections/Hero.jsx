import React, { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
const Hero = () => {
  const words = [
    "Skilled Hands",
    "Heavy Haul Services",
    "Expert Carpenters",
    "Logistics Pros",
    "Creative Craftsmen",
    "Trusted Plumbers"
  ];
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
    <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 overflow-hidden min-h-[600px] flex items-center bg-brand-navy">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          {/* Text Content */}
          <div className="w-full lg:w-1/2">
            <p className="text-white text-sm font-bold tracking-widest uppercase mb-4 opacity-90">
              Local Skills. Heavy Equipment. Real Solutions.
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-[1.2] mb-6 tracking-tight min-h-[150px] md:min-h-[180px] lg:min-h-[220px]">
              <span className="block">Find</span>
              <span 
                className={cn(
                  "block transition-all duration-500",
                  isFading ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
                )}
              >
                {words[currentWord]}
              </span>
              <span className="block text-brand-green">Near You.</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-200 mb-10 max-w-xl leading-relaxed">
              Whether you need skilled hands for delicate crafts or heavy equipment for major logistics, NHFAS seamlessly connects you with trusted local experts. Fast, safe, and entirely hassle-free.
            </p>
          </div>
          
          {/* Hero Image Container */}
          <div className="w-full lg:w-1/2 h-[400px] lg:h-[500px] relative rounded-2xl overflow-hidden shadow-2xl border-4 border-[#1B2A47]">
            <img src="/worker.jpg" alt="NHFAS service provider at a construction site" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
