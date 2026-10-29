import React from 'react';
import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  Cloud,
  FileCheck2,
  HeartHandshake,
  MapPin,
  Phone,
  Route,
  ShieldCheck,
  Smartphone,
  Truck,
  Users,
  WifiOff,
  Wrench,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';

const pillars = [
  {
    icon: Wrench,
    title: 'Artisan services',
    description: 'Help clients find skilled carpenters, electricians, plumbers, fabricators, and fine artists. Support both fixed-rate catalog work and custom project quotes.',
    action: 'Explore artisan services',
    to: '/services/artisans',
  },
  {
    icon: Truck,
    title: 'Heavy logistics',
    description: 'Connect cargo with suitable pickups, trucks, flatbeds, cranes, and machinery haulers, with multi-stop route planning and compliance in view.',
    action: 'Explore heavy haulage',
    to: '/services/heavy-haulage',
  },
  {
    icon: Banknote,
    title: 'Payment infrastructure',
    description: 'Support Telebirr and M-Pesa payment flows, escrow protection, milestone releases, transparent pricing, and automated settlement ledgers.',
    action: 'View payment tools',
    to: '/dashboard/payments',
  },
  {
    icon: ShieldCheck,
    title: 'Safety and compliance',
    description: 'Support provider verification, permit checks, active-job tracking, trust information, and emergency incident escalation.',
    action: 'Read trust and safety',
    to: '/trust-safety',
  },
];

const architecture = [
  {
    icon: Smartphone,
    title: 'Web experience',
    description: 'Responsive, browser-based Progressive Web App for desktop and mobile, with service-worker caching and IndexedDB for offline data.',
  },
  {
    icon: Cloud,
    title: 'API services',
    description: 'Node.js and Express microservices exposing REST and GraphQL interfaces for platform workflows.',
  },
  {
    icon: MapPin,
    title: 'Spatial data',
    description: 'Relational storage with PostGIS extensions to support geographic proximity searches and spatial indexing.',
  },
  {
    icon: Route,
    title: 'Live communication',
    description: 'WebSockets for real-time updates, Web Push for browser notifications, and HTTPS/TLS 1.3 for encrypted data in transit.',
  },
];

const values = [
  {
    icon: HeartHandshake,
    title: 'Economic inclusion',
    description: 'Give independent tradespeople a place to build a verifiable work history, earn trust, and reach more customers.',
  },
  {
    icon: Route,
    title: 'Operational efficiency',
    description: 'Make cargo matching, route planning, and document checks more visible to reduce avoidable delays and empty vehicle miles.',
  },
  {
    icon: ShieldCheck,
    title: 'Reliable transactions',
    description: 'Bring pricing transparency, payment protection, and job visibility together for clients, artisans, and transport operators.',
  },
];

const communityMembers = [
  {
    icon: Users,
    title: 'Clients and businesses',
    description: 'Individuals, households, and organizations can describe what they need, compare suitable service or transport options, agree on scope, and follow updates in one place.',
  },
  {
    icon: Wrench,
    title: 'Artisans and tradespeople',
    description: 'Independent professionals can present their services, skills, availability, and work history, then respond to direct requests or submit quotes for custom projects.',
  },
  {
    icon: Truck,
    title: 'Drivers and logistics operators',
    description: 'Transport providers can list vehicle capabilities, review cargo details before accepting a job, coordinate pickup and delivery, and keep clients informed during a trip.',
  },
  {
    icon: ShieldCheck,
    title: 'Fleet and compliance teams',
    description: 'Fleet managers and authorized reviewers can help keep vehicle, driver, and permit information current and identify documentation that needs attention before dispatch.',
  },
];

const serviceJourneys = [
  {
    title: 'A service request from start to finish',
    description: 'A client explains the task, selects a service category, and shares the location and preferred timing. The platform can surface relevant providers using distance, category, rating, and availability.',
    steps: [
      'Review provider profiles and the proposed scope before agreeing.',
      'Use a listed price for standard work or request quotes for a custom commission.',
      'Keep questions, decisions, and progress updates connected to the job.',
      'Confirm completion and follow the payment and review steps available for that booking.',
    ],
  },
  {
    title: 'A heavy-haul request from planning to delivery',
    description: 'A shipper enters the load’s weight, dimensions, origin, destination, and timing. Those details help determine what kind of vehicle and handling the load may require.',
    steps: [
      'Compare appropriate vehicle options and transport proposals.',
      'Check payload, route, driver, vehicle, and permit requirements before confirmation.',
      'Follow trip progress and receive updates at important points along the journey.',
      'Record delivery confirmation, raise a concern if needed, and settle the job according to its agreed terms.',
    ],
  },
];

const howItWorks = [
  {
    number: '01',
    title: 'Choose a service',
    english: 'Browse artisan services or heavy haulage and decide what kind of help your job needs.',
  },
  {
    number: '02',
    title: 'Describe the job',
    english: 'Share the task or cargo details, location, preferred timing, and any useful measurements or references.',
  },
  {
    number: '03',
    title: 'Review providers and proposals',
    english: 'Compare relevant provider information, availability, and quotes. For custom work, discuss the scope and agree on the details before starting.',
  },
  {
    number: '04',
    title: 'Stay in touch and follow progress',
    english: 'Use the job details and available messaging or status updates to coordinate timing, questions, and progress.',
  },
  {
    number: '05',
    title: 'Confirm completion',
    english: 'Review the completed service or delivery, confirm the agreed outcome, and follow the payment and feedback options available for the job.',
  },
];

const workPrinciples = [
  {
    number: '01',
    title: 'Understand the real request',
    description: 'Good coordination starts with the right details. For artisan work, that may be the task, materials, access to the site, timing, and the finish the client expects. For freight, it includes cargo dimensions and weight, pickup and delivery points, loading needs, and any special handling. Clear information helps everyone assess the job before making a commitment.',
  },
  {
    number: '02',
    title: 'Connect the job to a suitable provider',
    description: 'A match should consider more than who is closest. Service category, provider availability, experience, ratings, equipment capability, payload, and document status may all matter. The goal is to help clients find a capable provider and to give providers enough context to decide whether the work fits their skills or fleet.',
  },
  {
    number: '03',
    title: 'Agree on scope, timing, and price',
    description: 'Before work begins, clients and providers need a shared understanding of what is included, what is not, when the work is expected, and how the price is determined. Standard services may use listed rates; custom work can require quotes, milestones, or further discussion. A fair-price reference can provide context, while the agreed job terms remain central.',
  },
  {
    number: '04',
    title: 'Keep important information together',
    description: 'Messages, status changes, route updates, milestones, and supporting evidence are more useful when attached to the relevant job. A connected record can reduce repeated explanations, help both sides see what has changed, and provide context if a delay, scope question, or payment issue needs attention.',
  },
  {
    number: '05',
    title: 'Complete work with a clear closeout',
    description: 'Completion should be understandable to both parties. Depending on the service and available platform features, that could involve a delivery confirmation, client sign-off, OTP, digital signature, milestone evidence, payment settlement, or a review. The closeout records the outcome and helps establish a history for future work.',
  },
];

const safeguards = [
  {
    icon: FileCheck2,
    title: 'Verification with purpose',
    description: 'Document checks are intended to establish eligibility and help clients make informed choices. Access to sensitive documents should be limited to authorized verification work.',
  },
  {
    icon: Banknote,
    title: 'Understand the price before agreeing',
    description: 'Quotes, price ranges, transport details, and any applicable pricing adjustments should be clear before a client confirms a job. Fair-price tools are intended to support transparency, not replace an agreed quote.',
  },
  {
    icon: ShieldCheck,
    title: 'Clear handling of incidents',
    description: 'Safety reports need a visible path for escalation and review. A hold on a job or payment is a protective measure while a reported incident is assessed, not a finding about who is at fault.',
  },
  {
    icon: WifiOff,
    title: 'Designed for inconsistent connectivity',
    description: 'Offline support can preserve selected drafts and queued actions until a connection returns. Users should be able to see whether information is saved locally, waiting to sync, or confirmed by the service.',
  },
];

const regionalPriorities = [
  {
    title: 'Local service realities',
    description: 'Artisan work is often discovered through personal networks and informal referrals. Searchable profiles, clear service categories, and records of completed work can help customers discover providers beyond those networks.',
  },
  {
    title: 'Transport that fits the load',
    description: 'Cargo comes in many shapes and sizes, and the right vehicle depends on more than distance. Weight, dimensions, loading needs, route conditions, and applicable permits all matter when planning a safe movement.',
  },
  {
    title: 'Mobile-first and resilient access',
    description: 'A browser-based experience avoids requiring an app-store installation. Responsive screens, limited-bandwidth considerations, and offline queues are important design goals for people working on the move.',
  },
  {
    title: 'Local payments and clear records',
    description: 'Payment methods and settlement timing should work for the people using the service. Integration with providers such as Telebirr or M-Pesa depends on partner availability, agreements, and the current platform rollout.',
  },
];

const preparationChecklist = [
  {
    title: 'Share accurate details',
    description: 'Describe the work or cargo clearly, use current contact information, and provide measurements or photos only when they help explain the request.',
  },
  {
    title: 'Confirm the agreement',
    description: 'Before accepting or starting, confirm the scope, schedule, price, materials or cargo requirements, and how changes will be handled.',
  },
  {
    title: 'Check the practical requirements',
    description: 'Consider site access, loading and unloading, special handling, vehicle suitability, permits, and any safety conditions that could affect the job.',
  },
  {
    title: 'Keep communication on the job',
    description: 'Use the job conversation and status updates for key decisions so the client and provider can refer to the same information if plans change.',
  },
  {
    title: 'Close out carefully',
    description: 'Review the completed work or delivery, submit any requested evidence, raise unresolved concerns promptly, and use the payment and completion steps shown for the job.',
  },
];

const AboutPage = () => (
  <div className="flex-1 bg-white font-sans">
    <section className="relative overflow-hidden bg-brand-navy text-white">
      <div className="absolute inset-0 opacity-20">
        <img src="/illustrations/ill-haulage.svg" alt="" className="h-full w-full object-cover" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-brand-navy via-brand-navy/95 to-brand-navy/70" />
      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="max-w-3xl">
          <h1 className="mb-6 text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl">
            One platform for skilled work and heavy transport.
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-slate-200 sm:text-xl">
            The National Heavy Freight & Artisan System (NHFAS) is a dual-service marketplace vision for connecting local artisans, clients, and commercial logistics operators across Ethiopia.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Button as={Link} to="/services/handyman" size="lg" className="gap-2">
              Explore services <ArrowRight className="h-5 w-5" />
            </Button>
            <Button as={Link} to="/services/heavy-haulage" size="lg" variant="outline" className="border-white/60 text-white hover:bg-white/10 hover:text-white">
              Explore heavy haulage
            </Button>
          </div>
        </div>
      </div>
    </section>

    <section className="bg-brand-softBlue py-16 sm:py-20">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
        <div>
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-brand-green">Our vision</p>
          <h2 className="text-3xl font-extrabold leading-tight sm:text-4xl">Make fragmented services easier to find, book, and trust.</h2>
        </div>
        <div className="space-y-5 text-lg leading-relaxed text-slate-600">
          <p>
            NHFAS aims to bridge the operational gap between skilled trade professionals—such as carpenters, electricians, plumbers, and fine artists—and commercial transport operators moving heavy cargo and equipment.
          </p>
          <p>
            Our vision is a unified digital marketplace that brings together service requests, cargo and vehicle matching, weight safeguards, transparent pricing, and payment protection. An offline-first PWA, location-aware workflows, and permit verification are part of the platform’s intended direction.
          </p>
        </div>
      </div>
    </section>

    <section className="py-16 sm:py-20">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
        <div>
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-brand-green">Our role in this project</p>
          <h2 className="text-3xl font-extrabold leading-tight sm:text-4xl">We build the bridge between people, services, and transport.</h2>
        </div>
        <div className="space-y-5 text-lg leading-relaxed text-slate-600">
          <p>
            NHFAS’s role is to provide shared digital infrastructure that helps clients explain what they need and helps artisans, service providers, drivers, and logistics operators discover and coordinate suitable work. We bring the important parts of a job—its scope, proposals, schedules, messages, progress, and closeout—into a more organized marketplace experience.
          </p>
          <p>
            We aim to make the process clearer by supporting provider discovery, cargo and vehicle matching, price context, job updates, verification workflows, and payment records. These tools are intended to help people make informed decisions; they do not replace direct agreement between clients and providers, professional judgment, or applicable laws and regulatory authorities.
          </p>
          <p>
            Our responsibility is to keep improving the platform around practical needs: make workflows easier to understand, protect account and job information, communicate limitations honestly, and create room for independent workers and transport businesses to build trusted working relationships with customers across Ethiopia.
          </p>
        </div>
      </div>
    </section>

    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-2xl">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-brand-green">How we bring it together</p>
          <h2 className="text-3xl font-extrabold sm:text-4xl">Four connected service pillars</h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">A shared platform can make local services and commercial hauling easier to coordinate—without losing sight of trust, safety, and fair value.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map(({ icon: Icon, title, description, action, to }) => (
            <article key={title} className="flex flex-col rounded-2xl border border-slate-100 bg-white p-6 shadow-soft">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-brand-green">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mb-3 text-xl font-bold">{title}</h3>
              <p className="flex-1 text-sm leading-relaxed text-slate-600">{description}</p>
              <Link
                to={to}
                className="mt-5 inline-flex w-fit items-center gap-2 rounded-full bg-brand-green px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-green/90 focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2"
              >
                {action} <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>

    <section className="bg-brand-softBlue py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-2xl">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-brand-green">Who we serve</p>
          <h2 className="text-3xl font-extrabold sm:text-4xl">Different roles, one shared job journey</h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            NHFAS is intended to make coordination clearer for everyone involved, while giving each role the information and tools relevant to their part of the work.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {communityMembers.map(({ icon: Icon, title, description }) => (
            <article key={title} className="rounded-2xl border border-slate-100 bg-white p-6">
              <Icon className="mb-5 h-7 w-7 text-brand-green" />
              <h3 className="mb-3 text-lg font-bold">{title}</h3>
              <p className="text-sm leading-relaxed text-slate-600">{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>

    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-2xl">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-brand-green">From request to completion</p>
          <h2 className="text-3xl font-extrabold sm:text-4xl">Make the next step easier to understand</h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            A reliable marketplace is more than a search page. It helps people set expectations, make informed decisions, and keep a useful record as work progresses.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {serviceJourneys.map(({ title, description, steps }, index) => (
            <article key={title} className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-brand-navy text-sm font-bold text-white">
                0{index + 1}
              </div>
              <h3 className="mb-3 text-xl font-bold">{title}</h3>
              <p className="mb-5 leading-relaxed text-slate-600">{description}</p>
              <ul className="space-y-3">
                {steps.map((step) => (
                  <li key={step} className="flex items-start gap-3 text-sm leading-relaxed text-slate-600">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>

    <section className="bg-brand-navy py-16 text-white sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-3xl">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-emerald-300">The work behind every successful job</p>
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">From a clear request to a confident closeout</h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-300">
            NHFAS is designed to support the practical steps that happen around a service or transport job—not just introduce a client to a provider. We aim to make the details, decisions, and responsibilities easier to follow from beginning to end.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workPrinciples.map(({ number, title, description }) => (
            <article key={number} className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <p className="mb-4 text-sm font-bold tracking-widest text-emerald-300">{number}</p>
              <h3 className="mb-3 text-xl font-bold text-white">{title}</h3>
              <p className="text-sm leading-relaxed text-slate-300">{description}</p>
            </article>
          ))}
        </div>
        <p className="mt-6 max-w-4xl text-xs leading-relaxed text-slate-400">
          These principles describe how the platform is intended to support jobs. Specific tools, providers, payment options, and compliance checks depend on availability and rollout.
        </p>
      </div>
    </section>

    <section className="bg-brand-softBlue py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-3xl">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-brand-green">How the website works</p>
          <h2 className="text-3xl font-extrabold sm:text-4xl">A simple guide for clients and providers</h2>
          <p className="mt-4 leading-relaxed text-slate-600">
            Follow these steps to find a service, share a request, and keep track of the work.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {howItWorks.map(({ number, title, english }) => (
            <article key={number} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="mb-4 text-sm font-bold tracking-widest text-brand-green">{number}</p>
              <h3 className="mb-4 text-lg font-bold">{title}</h3>
              <p className="text-sm leading-relaxed text-slate-600">{english}</p>
            </article>
          ))}
        </div>
        <div className="mt-8 rounded-2xl bg-brand-navy p-6 text-white sm:flex sm:items-center sm:justify-between sm:gap-8">
          <div>
            <h3 className="text-xl font-bold text-white">Are you a service provider?</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-200">
              Create an account to begin setting up your provider profile and explore the tools available to you.
            </p>
          </div>
          <Button as={Link} to="/signup" className="mt-5 shrink-0 gap-2 sm:mt-0">
            Sign up <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-5 text-xs leading-relaxed text-slate-500">
          Available services and features can vary by location and platform rollout.
        </p>
      </div>
    </section>

    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-2xl">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-brand-green">Technology direction</p>
          <h2 className="text-3xl font-extrabold sm:text-4xl">Built for connected and low-connectivity workflows</h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {architecture.map(({ icon: Icon, title, description }) => (
            <article key={title} className="rounded-2xl border border-slate-100 p-6">
              <Icon className="mb-5 h-6 w-6 text-brand-green" />
              <h3 className="mb-2 text-lg font-bold">{title}</h3>
              <p className="text-sm leading-relaxed text-slate-600">{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>

    <section className="bg-slate-50 py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-2xl">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-brand-green">Trust in practice</p>
          <h2 className="text-3xl font-extrabold sm:text-4xl">Good safeguards should be understandable</h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            Trust comes from clear information and accountable processes, not a badge alone. These principles guide how NHFAS intends to handle verification, money, incidents, and connectivity.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {safeguards.map(({ icon: Icon, title, description }) => (
            <article key={title} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-brand-green">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="mb-2 text-lg font-bold">{title}</h3>
                <p className="text-sm leading-relaxed text-slate-600">{description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>

    <section className="bg-brand-softBlue py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-2xl">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-brand-green">Why it matters</p>
          <h2 className="text-3xl font-extrabold sm:text-4xl">A practical foundation for opportunity</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {values.map(({ icon: Icon, title, description }) => (
            <article key={title} className="rounded-2xl bg-white p-7 shadow-soft">
              <Icon className="mb-5 h-7 w-7 text-brand-green" />
              <h3 className="mb-3 text-xl font-bold">{title}</h3>
              <p className="leading-relaxed text-slate-600">{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>

    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-2xl">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-brand-green">Designed with Ethiopia in mind</p>
          <h2 className="text-3xl font-extrabold sm:text-4xl">Practical tools for local work and transport</h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            The platform’s direction recognizes that access, service availability, payments, and transport requirements vary by location and by job.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {regionalPriorities.map(({ title, description }) => (
            <article key={title} className="rounded-2xl border border-slate-100 p-6">
              <h3 className="mb-3 text-lg font-bold">{title}</h3>
              <p className="text-sm leading-relaxed text-slate-600">{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>

    <section className="bg-brand-softBlue py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-2xl">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-brand-green">Looking ahead</p>
          <h2 className="text-3xl font-extrabold sm:text-4xl">A marketplace that grows with its community</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <article className="rounded-2xl bg-white p-6 shadow-soft">
            <h3 className="mb-3 text-lg font-bold">Build useful records</h3>
            <p className="text-sm leading-relaxed text-slate-600">Support clear job histories, documented milestones, and feedback that helps clients and providers make better-informed decisions over time.</p>
          </article>
          <article className="rounded-2xl bg-white p-6 shadow-soft">
            <h3 className="mb-3 text-lg font-bold">Strengthen coordination</h3>
            <p className="text-sm leading-relaxed text-slate-600">Bring job details, messages, schedules, payment records, and transport updates together so fewer critical details are lost between people.</p>
          </article>
          <article className="rounded-2xl bg-white p-6 shadow-soft">
            <h3 className="mb-3 text-lg font-bold">Grow responsibly</h3>
            <p className="text-sm leading-relaxed text-slate-600">Introduce capabilities carefully, make limitations visible, and adapt workflows as provider communities, service coverage, and trusted local partners grow.</p>
          </article>
        </div>
      </div>
    </section>

    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-3xl">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-brand-green">A better start for every job</p>
          <h2 className="text-3xl font-extrabold sm:text-4xl">A practical checklist for clients and providers</h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            Good outcomes begin before a booking is confirmed. These shared habits help clients and providers set clear expectations, avoid preventable delays, and keep a useful record as the work progresses.
          </p>
        </div>
        <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {preparationChecklist.map(({ title, description }, index) => (
            <li key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-softBlue text-sm font-extrabold text-brand-navy">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-4 text-lg font-bold text-brand-navy">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>

    <section className="bg-brand-navy py-14 text-white sm:py-16">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 sm:px-6 md:flex-row md:items-center lg:px-8">
        <div>
          <h2 className="text-2xl font-extrabold text-white sm:text-3xl">Bring your next job into view.</h2>
          <p className="mt-2 text-slate-300">Explore artisan services, logistics options, and the NHFAS marketplace.</p>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-3">
            <a href="tel:+251944213470" className="inline-flex min-h-11 items-center gap-2 font-semibold text-white transition hover:text-emerald-200 focus:outline-none focus:ring-2 focus:ring-white">
              <Phone className="h-4 w-4" aria-hidden="true" />
              +251 944 213 470
            </a>
            <a href="tel:+251988736737" className="inline-flex min-h-11 items-center gap-2 font-semibold text-white transition hover:text-emerald-200 focus:outline-none focus:ring-2 focus:ring-white">
              <Phone className="h-4 w-4" aria-hidden="true" />
              +251 988 736 737
            </a>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button as={Link} to="/contact" size="lg" variant="outline" className="shrink-0 border-white/60 text-white hover:bg-white/10 hover:text-white">
            Contact us
          </Button>
          <Button as={Link} to="/search" size="lg" className="shrink-0 gap-2">
            Explore NHFAS <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </section>
  </div>
);

export default AboutPage;
