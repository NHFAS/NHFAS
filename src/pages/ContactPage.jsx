import React from 'react';
import {
  ArrowRight,
  BriefcaseBusiness,
  HelpCircle,
  Mail,
  MessageCircle,
  Phone,
  ShieldAlert,
  UserRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';

const contactTopics = [
  {
    icon: BriefcaseBusiness,
    title: 'A booking or job in progress',
    description: 'For updates, scheduling questions, or a change to an existing request, sign in and open the relevant booking. Keeping the conversation with the job helps the people involved see the right details.',
    action: 'Go to My Bookings',
    to: '/dashboard/bookings',
  },
  {
    icon: UserRound,
    title: 'Your account or provider profile',
    description: 'For profile details, sign-in questions, or provider onboarding, start from your account. Provider verification and service availability may depend on the current rollout.',
    action: 'Sign in to your account',
    to: '/login',
  },
  {
    icon: ShieldAlert,
    title: 'A safety concern',
    description: 'If you are involved in an active job and there is an urgent safety concern, use the incident-reporting or SOS action on that job if it is available. For immediate danger, contact local emergency services.',
    action: 'Read Trust & Safety',
    to: '/trust-safety',
  },
  {
    icon: HelpCircle,
    title: 'General questions',
    description: 'For guidance on posting a request, choosing a service, or understanding marketplace workflows, check the Help Center and frequently asked questions.',
    action: 'Visit the Help Center',
    to: '/help-center',
  },
];

const ContactPage = () => (
  <div className="flex-1 bg-slate-50 font-sans">
    <section className="bg-brand-navy px-4 py-16 text-white sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-emerald-300">Contact NHFAS</p>
        <h1 className="max-w-3xl text-4xl font-extrabold leading-tight text-white sm:text-5xl">
          Let’s help you find the right next step.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-200">
          Whether you are arranging artisan work, planning a heavy haul, joining as a provider, or need help with an account, choose the option that best matches your question.
        </p>
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
      <div className="mb-9 max-w-2xl">
        <h2 className="text-2xl font-extrabold sm:text-3xl">How can we help?</h2>
        <p className="mt-3 leading-relaxed text-slate-600">
          Choose a support path below. For an existing request, use its booking page so your question stays connected to the job details and updates.
        </p>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {contactTopics.map(({ icon: Icon, title, description, action, to }) => (
          <article key={title} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-brand-green">
              <Icon className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold">{title}</h3>
            <p className="mt-3 flex-1 leading-relaxed text-slate-600">{description}</p>
            <Link to={to} className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-brand-green transition-colors hover:text-brand-navy">
              {action} <ArrowRight className="h-4 w-4" />
            </Link>
          </article>
        ))}
      </div>
    </section>

    <section className="border-y border-slate-200 bg-white py-14 sm:py-16">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div>
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-brand-green">Help us understand</p>
          <h2 className="text-2xl font-extrabold sm:text-3xl">What to include in a support request</h2>
          <p className="mt-4 leading-relaxed text-slate-600">
            A short, clear description helps us understand what you need. If your question concerns a booking, include its reference if available, the step you were trying to complete, and what happened. Please do not share passwords, payment card details, or identity documents in public messages.
          </p>
        </div>
        <div className="rounded-2xl bg-brand-softBlue p-6 sm:p-8">
          <h3 className="text-lg font-bold">Before you contact us</h3>
          <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-relaxed text-slate-700">
            <li>For job-specific questions, open the booking and use its available conversation or support actions.</li>
            <li>For account access, make sure you are using the email address linked to your NHFAS account.</li>
            <li>For payments, note the job and transaction reference, but never send full card or wallet credentials.</li>
            <li>For urgent danger, contact local emergency services first; platform support is not an emergency service.</li>
          </ul>
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
      <div className="mb-8 max-w-2xl">
        <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-brand-green">Direct contact</p>
        <h2 className="text-2xl font-extrabold sm:text-3xl">Reach the NHFAS team</h2>
        <p className="mt-3 leading-relaxed text-slate-600">
          Call us at either number below or send an email. For faster help with a current booking, include its reference in your message.
        </p>
      </div>
      <div className="grid gap-5 md:grid-cols-3">
        <a
          href="tel:+251944213470"
          className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-brand-green/50 hover:shadow-soft"
        >
          <Phone className="mb-4 h-6 w-6 text-brand-green" />
          <span className="block text-sm font-semibold text-slate-500">Call us</span>
          <span className="mt-1 block text-xl font-bold text-brand-navy group-hover:text-brand-green">+251 944 213 470</span>
        </a>
        <a
          href="tel:+251988736737"
          className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-brand-green/50 hover:shadow-soft"
        >
          <Phone className="mb-4 h-6 w-6 text-brand-green" />
          <span className="block text-sm font-semibold text-slate-500">Call us</span>
          <span className="mt-1 block text-xl font-bold text-brand-navy group-hover:text-brand-green">+251 988 736 737</span>
        </a>
        <a
          href="mailto:nhfaas@gmail.com"
          className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-brand-green/50 hover:shadow-soft"
        >
          <Mail className="mb-4 h-6 w-6 text-brand-green" />
          <span className="block text-sm font-semibold text-slate-500">Email us</span>
          <span className="mt-1 block break-all text-lg font-bold text-brand-navy group-hover:text-brand-green">nhfaas@gmail.com</span>
        </a>
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
      <div className="grid gap-8 rounded-3xl bg-brand-softBlue p-7 sm:p-10 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-brand-green">Stay connected</p>
          <h2 className="text-2xl font-extrabold sm:text-3xl">Follow NHFAS on our public channels</h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-slate-600">
            You can find NHFAS on Facebook and TikTok for public updates. Do not post private booking, payment, or identity information in public comments or messages.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href="https://www.facebook.com/profile.php?id=61594481709392"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-brand-navy px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-navy/90"
          >
            <MessageCircle className="h-4 w-4" /> Facebook
          </a>
          <a
            href="https://www.tiktok.com/@nhfas0?_r=1&_t=ZS-99jb2FKxWWv"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-brand-navy px-5 text-sm font-semibold text-brand-navy transition-colors hover:bg-white"
          >
            <MessageCircle className="h-4 w-4" /> TikTok
          </a>
        </div>
      </div>
    </section>

    <section className="bg-brand-navy py-12 text-white">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-5 px-4 sm:px-6 md:flex-row md:items-center lg:px-8">
        <div>
          <h2 className="text-2xl font-extrabold text-white">New to NHFAS?</h2>
          <p className="mt-2 text-slate-300">Learn about our work or explore services across the marketplace.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button as={Link} to="/about" variant="outline" className="border-white/60 text-white hover:bg-white/10 hover:text-white">
            About NHFAS
          </Button>
          <Button as={Link} to="/search" className="gap-2">
            Explore services <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  </div>
);

export default ContactPage;
