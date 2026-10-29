import React from 'react';
import { ArrowRight, CheckCircle2, Search, ShieldCheck, Truck, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';

const serviceContent = {
  handyman: {
    eyebrow: 'Home and everyday work',
    title: 'Handyman services',
    description: 'Find help for repairs, maintenance, plumbing, electrical work, carpentry, and painting.',
    search: 'handyman',
    icon: Wrench,
    items: ['Home repairs and maintenance', 'Plumbing and electrical work', 'Carpentry and painting'],
  },
  artisans: {
    eyebrow: 'Local skills and craftsmanship',
    title: 'Skilled artisans',
    description: 'Find independent craftspeople and skilled makers for practical, decorative, and made-to-order work. Share what you want created or repaired, your preferred materials and dimensions, where the work is needed, and when you need it. Providers can assess the request, discuss details, and offer a quote for a custom project.',
    search: 'artisan',
    icon: CheckCircle2,
    items: ['Custom furniture and woodwork', 'Tailoring and crafts', 'Made-to-order projects'],
    examples: [
      {
        title: 'Furniture and carpentry',
        description: 'Request custom tables, chairs, shelves, cabinets, doors, repairs, or other woodwork. Include measurements, materials, finish preferences, and reference photos when available.',
      },
      {
        title: 'Textiles, tailoring, and crafts',
        description: 'Describe a made-to-measure garment, alteration, woven item, decorative craft, or other specialist piece. Share fabric preferences, sizing, quantity, and any design references.',
      },
      {
        title: 'Artwork and custom commissions',
        description: 'Explain the subject, style, size, materials, intended use, and delivery needs for a piece of art or a one-of-a-kind commission. Agree on the scope and stages with the provider before work begins.',
      },
      {
        title: 'Fabrication and specialist projects',
        description: 'For custom fabrication or detailed trade work, describe the intended result, site conditions, materials, dimensions, and any installation requirements so providers can prepare an informed proposal.',
      },
    ],
  },
  'heavy-haulage': {
    eyebrow: 'Freight and equipment movement',
    title: 'Heavy haulage',
    description: 'Request transport for machinery, oversized cargo, construction materials, and other heavy loads.',
    search: 'haulage',
    icon: Truck,
    items: ['Cargo and machinery transport', 'Pickup and drop-off details', 'Vehicle class based on cargo weight'],
  },
  equipment: {
    eyebrow: 'Tools and machinery',
    title: 'Equipment rental',
    description: 'Tell providers what equipment your project needs and where it will be used.',
    search: 'equipment',
    icon: Wrench,
    items: ['Tools for home and trade work', 'Construction machinery', 'Rental requests through a job post'],
  },
};

const ServiceLandingPage = ({ serviceId }) => {
  const service = serviceContent[serviceId];
  const Icon = service.icon;

  return (
    <main className="mx-auto max-w-6xl space-y-10 px-4 py-12 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-2xl bg-brand-navy px-6 py-10 text-white sm:px-10 sm:py-14">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-300">{service.eyebrow}</p>
        <div className="mt-4 grid gap-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div>
            <h1 className="text-3xl font-extrabold sm:text-4xl">{service.title}</h1>
            <p className="mt-4 max-w-2xl leading-7 text-slate-200">{service.description}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button as={Link} to={`/dashboard/post-job?kind=${serviceId === 'heavy-haulage' ? 'haulage' : 'artisan'}`} variant="primary" className="gap-2">
                Request this service <ArrowRight className="h-4 w-4" />
              </Button>
              <Button as={Link} to={`/search?q=${encodeURIComponent(service.search)}`} variant="white" className="gap-2">
                <Search className="h-4 w-4" /> Search providers
              </Button>
            </div>
          </div>
          <span className="hidden h-28 w-28 items-center justify-center rounded-3xl bg-white/10 text-emerald-300 md:flex">
            <Icon className="h-14 w-14" aria-hidden="true" />
          </span>
        </div>
      </section>

      <section aria-labelledby="service-options-heading">
        <div className="mb-5">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">What you can request</p>
          <h2 id="service-options-heading" className="mt-1 text-2xl font-bold text-brand-navy">Start with what you need</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {service.items.map((item) => (
            <article key={item} className="rounded-xl border border-slate-200 bg-white p-5">
              <CheckCircle2 className="h-5 w-5 text-brand-green" aria-hidden="true" />
              <h3 className="mt-3 font-semibold text-brand-navy">{item}</h3>
              <p className="mt-2 text-sm leading-5 text-slate-500">
                Include the details, location, and timing when you post your request so providers can assess the work.
              </p>
            </article>
          ))}
        </div>
      </section>

      {service.examples && (
        <section aria-labelledby="service-examples-heading">
          <div className="mb-5">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">Examples of artisan work</p>
            <h2 id="service-examples-heading" className="mt-1 text-2xl font-bold text-brand-navy">Describe the result you have in mind</h2>
            <p className="mt-3 max-w-3xl leading-relaxed text-slate-600">
              Custom work varies from one project to another. A detailed request helps an artisan understand the materials, design, size, location, and finish you expect, then decide whether to accept the work or provide a quote.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {service.examples.map((example) => (
              <article key={example.title} className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="font-semibold text-brand-navy">{example.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{example.description}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-4 rounded-xl border border-emerald-100 bg-emerald-50 p-6 sm:grid-cols-[auto_1fr_auto] sm:items-center">
        <ShieldCheck className="h-8 w-8 text-emerald-700" aria-hidden="true" />
        <div>
          <h2 className="font-bold text-brand-navy">Keep your request clear</h2>
          <p className="mt-1 text-sm leading-5 text-slate-600">
            Add useful job details and review provider information before agreeing to work. Availability and verification can vary by provider.
          </p>
        </div>
        <Link to="/faq" className="text-sm font-semibold text-emerald-800 underline underline-offset-4">Read common questions</Link>
      </section>
    </main>
  );
};

export default ServiceLandingPage;
