import React from 'react';
import { ArrowRight, Truck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';

const FinalCTA = () => {
  return (
    <section className="relative py-24 bg-brand-navy overflow-hidden">
      {/* Background Image & Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1541625602330-2277a4c4618c?q=80&w=2000&auto=format&fit=crop" 
          alt="Heavy machinery at sunset" 
          className="w-full h-full object-cover object-center opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-navy via-brand-navy/80 to-transparent"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-2xl">
          {/* Logo mark */}
          <div className="flex items-center gap-2 mb-6">
            <Truck className="w-8 h-8 text-white" />
            <span className="font-extrabold text-2xl tracking-tight text-white">NHFAS</span>
          </div>

          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6 leading-tight">
            Ready to <span className="text-brand-green">Get Started?</span>
          </h2>
          <p className="text-lg text-slate-300 mb-10 max-w-xl leading-relaxed">
            Join thousands of customers and service providers building a stronger community, one job at a time.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button as={Link} to="/services/handyman" size="lg" className="justify-center group">
              Find a Service
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button as={Link} to="/signup" variant="outline" size="lg" className="justify-center border-slate-600 text-white hover:bg-slate-800 hover:text-white focus:ring-slate-600 group">
              Become a Provider
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinalCTA;
