import React from 'react';
import { Search, ClipboardList, Shield, MapPin, CheckCircle } from 'lucide-react';
import heroImage from '../assets/hero-image.jpg';

const HowItWorks = () => {
  const steps = [
    {
      icon: <Search className="w-6 h-6" />,
      title: '1. Find a Service',
      desc: 'Search and choose what you need.',
      color: 'text-brand-green',
      bg: 'bg-green-100'
    },
    {
      icon: <ClipboardList className="w-6 h-6" />,
      title: '2. Book & Confirm',
      desc: 'Get quotes and confirm your booking.',
      color: 'text-blue-500',
      bg: 'bg-blue-100'
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: '3. Pay Securely',
      desc: 'Use escrow and trusted payment methods.',
      color: 'text-amber-500',
      bg: 'bg-amber-100'
    },
    {
      icon: <MapPin className="w-6 h-6" />,
      title: '4. Track Progress',
      desc: 'Follow in real-time via GPS and updates.',
      color: 'text-brand-purple',
      bg: 'bg-purple-100'
    },
    {
      icon: <CheckCircle className="w-6 h-6 text-white" />,
      title: '5. Complete & Review',
      desc: 'Confirm completion and leave a review.',
      color: 'text-white',
      bg: 'bg-brand-green',
      isFinal: true
    }
  ];

  return (
    <section id="how-it-works" className="py-20 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="flex flex-col lg:flex-row items-center gap-16">
          {/* Content */}
          <div className="w-full lg:w-3/5">
            <div className="flex items-center gap-4 mb-3">
              <div className="h-0.5 w-12 bg-brand-green"></div>
              <span className="text-brand-green font-semibold text-sm uppercase tracking-wider">How It Works</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-brand-navy mb-4">
              Get Your Job Done<br />in 5 Simple Steps
            </h2>
            <p className="text-slate-500 text-lg mb-12">
              Fast, easy, and secure — from booking to completion.
            </p>

            <div className="relative">
              {/* Connecting Line (desktop only) */}
              <div className="hidden md:block absolute top-8 left-8 right-8 h-0.5 bg-slate-100 -z-10"></div>
              
              <div className="flex flex-col md:flex-row justify-between gap-8 md:gap-4">
                {steps.map((step, idx) => (
                  <div key={idx} className="flex flex-row md:flex-col items-start md:items-center text-left md:text-center relative">
                    {/* Connecting line for mobile */}
                    {idx !== steps.length - 1 && (
                      <div className="md:hidden absolute top-16 left-8 bottom-[-2rem] w-0.5 bg-slate-100 -z-10"></div>
                    )}
                    
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-0 md:mb-4 flex-shrink-0 z-10 shadow-sm ${step.bg} ${step.color}`}>
                      {step.icon}
                    </div>
                    
                    <div className="ml-4 md:ml-0 mt-2 md:mt-0">
                      <h3 className="text-sm font-bold text-slate-800 mb-1">{step.title}</h3>
                      <p className="text-xs text-slate-500 leading-relaxed max-w-[140px]">{step.desc}</p>
                    </div>

                    {/* Desktop arrow */}
                    {idx !== steps.length - 1 && (
                      <div className="hidden md:block absolute top-8 -right-4 text-slate-300">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Image */}
          <div className="w-full lg:w-2/5 relative">
            <div className="relative rounded-2xl overflow-hidden shadow-xl">
              <img 
                src={heroImage} 
                alt="NHFAS service and logistics coordination" 
                className="w-full h-auto object-cover"
              />
              <div className="absolute top-6 right-6 bg-white/90 backdrop-blur px-4 py-2 rounded-lg shadow-sm transform rotate-3 border border-white">
                <span className="font-bold text-brand-navy block">Your Project.</span>
                <span className="font-bold text-brand-green block">Our Priority.</span>
              </div>
            </div>
            {/* Decorative background shape */}
            <div className="absolute -inset-4 bg-brand-softBlue rounded-2xl -z-10 transform -rotate-3"></div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default HowItWorks;
