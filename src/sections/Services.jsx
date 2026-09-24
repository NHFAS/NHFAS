import React from 'react';
import { ArrowRight, Wrench, Palette, Truck, Gavel } from 'lucide-react';
import { Link } from 'react-router-dom';
import { servicesData } from '../data/services';

const iconMap = {
  'handyman': Wrench,
  'artisans': Palette,
  'heavy-haul': Truck,
  'auction': Gavel,
};

const Services = () => {
  return (
    <section id="services" className="py-20 bg-brand-softBlue">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-3">
            <div className="h-0.5 w-12 bg-brand-green"></div>
            <span className="text-brand-green font-semibold text-sm uppercase tracking-wider">Our Services</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-brand-navy mb-4">Choose What You Need</h2>
          <p className="text-slate-500 text-lg max-w-2xl">
            Whether it's a quick repair, a skilled artisan, or a heavy haul, we've got you covered.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {servicesData.map((service) => {
            const IconComponent = iconMap[service.id];
            return (
              <Link
                key={service.id} 
                to={service.id === 'auction' ? '/services/auction' : `/services/${service.id === 'heavy-haul' ? 'heavy-haulage' : service.id}`}
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-hover transition-all duration-300 group cursor-pointer flex flex-col h-full border border-slate-100"
              >
                <div className="relative">
                  <div className="h-48 w-full overflow-hidden">
                    <img 
                      src={service.image} 
                      alt={service.title} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  {/* Icon Badge overlapping image and content */}
                  <div className={`absolute -bottom-6 left-6 w-12 h-12 rounded-full ${service.iconColor} flex items-center justify-center text-white border-4 border-white shadow-sm z-10`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                </div>
                
                <div className="pt-10 pb-6 px-6 flex-1 flex flex-col">
                  <h3 className="text-xl font-bold text-slate-800 mb-2">{service.title}</h3>
                  <p className="text-slate-500 text-sm flex-1 mb-4 leading-relaxed">
                    {service.description}
                  </p>
                  
                  <div className="flex items-center justify-end mt-auto">
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-brand-green group-hover:bg-brand-green group-hover:text-white transition-colors">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Services;
