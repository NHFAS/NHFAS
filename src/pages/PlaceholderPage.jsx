import React from 'react';
import {
  Shield,
  CheckCircle,
  Users,
  Hammer,
  Truck,
  BookOpen,
  Briefcase,
  MessageSquareText,
  Sparkles,
  BadgeCheck,
  ArrowRight,
} from 'lucide-react';

const PhoneIcon = () => <MessageSquareText className="h-6 w-6 text-brand-navy" />;

const pageContent = {
  'About Us': {
    intro: 'NHFAS connects homeowners, businesses, artisans, and heavy operators through one trusted platform built around speed, trust, and quality work.',
    highlight: 'Trusted work, better matching, and dependable coordination for the jobs that matter most.',
    cta: { label: 'Find a service', to: '/signup' },
    cards: [
      { title: 'Verified professionals', text: 'Every service provider is reviewed, checked, and matched to the right task.', icon: BadgeCheck },
      { title: 'Local and reliable', text: 'We support local talent and dependable operations in every job category.', icon: Users },
      { title: 'Built for real work', text: 'From repair jobs to large logistics projects, we keep the process transparent and practical.', icon: CheckCircle },
    ],
    sections: [
      'We simplify how people find skilled support for everyday and large-scale needs.',
      'Our mission is to make booking, coordination, and completion easier across repair work, custom craftsmanship, and heavy transport.',
      'By combining experience, safety standards, and clear communication, we help clients and professionals work with confidence.',
    ],
  },
  Careers: {
    intro: 'Join a team building a more reliable marketplace for skilled work, goods movement, and trusted service delivery.',
    highlight: 'We are growing a platform that values precision, modern operations, and people who care about service quality.',
    cta: { label: 'Apply now', to: '/contact' },
    cards: [
      { title: 'Growth opportunities', text: 'Work in a fast-moving platform that values initiative and impact.', icon: Briefcase },
      { title: 'People-first culture', text: 'We believe strong teams deliver better service and stronger experiences.', icon: Users },
      { title: 'Meaningful projects', text: 'Every role contributes to safer jobs, smoother logistics, and better customer outcomes.', icon: Sparkles },
    ],
    sections: [
      'We are always looking for talented people who care about service quality, logistics, customer support, and digital operations.',
      'Whether your strength is operations, design, engineering, or support, there is room to contribute to the NHFAS mission.',
      'If you are passionate about helping communities and service providers thrive, we would like to hear from you.',
    ],
  },
  Blog: {
    intro: 'Browse practical insights, service trends, and operational tips that help customers and providers get more value from NHFAS.',
    highlight: 'Fresh guidance for better service decisions, smarter logistics, and safer project planning.',
    cta: { label: 'See latest insights', to: '/' },
    cards: [
      { title: 'How to choose the right provider', text: 'Understand what to look for before confirming a job or booking service.', icon: BookOpen },
      { title: 'Haulage planning tips', text: 'Learn how to prepare cargo, schedules, and paperwork for smoother dispatch.', icon: Truck },
      { title: 'Service quality checklist', text: 'Keep every visit professional, efficient, and safe from start to finish.', icon: CheckCircle },
    ],
    sections: [
      'Our blog covers practical advice for homes, businesses, contractors, and operators.',
      'From handyman best practices to heavy equipment planning, we share useful guidance built around real experiences.',
      'We also cover marketplace updates, customer stories, and simple ways to improve your service outcomes.',
    ],
  },
  Contact: {
    intro: 'We are here to answer questions, help with bookings, and support both customers and service providers using the NHFAS platform.',
    highlight: 'Need help with a booking, an account, or a service question? Reach out and we will guide you to the right solution.',
    cta: { label: 'Contact support', to: '/contact' },
    cards: [
      { title: 'Email support', text: 'nhfaas@gmail.com', icon: MessageSquareText },
      { title: 'Phone line', text: '0988736737 / 0944213470', icon: PhoneIcon },
      { title: 'Fast response', text: 'Our team assists customers and providers around the clock.', icon: Shield },
    ],
    sections: [
      'Reach out for booking help, account support, service questions, or general platform feedback.',
      'Customers can ask about requests, providers can ask about verification and onboarding, and operators can ask about dispatch support.',
      'We aim to respond clearly, quickly, and with the right next step for each issue.',
    ],
  },
  'Handyman Services': {
    intro: 'From repairs to finishing touches, our handyman network helps with everyday property needs across homes, rentals, and small businesses.',
    highlight: 'Need a quick fix or a planned improvement? We connect you with reliable local support for practical work.',
    cta: { label: 'Book a handyman', to: '/signup' },
    cards: [
      { title: 'Plumbing & electrical', text: 'Reliable fixes for common property issues and urgent repairs.', icon: Hammer },
      { title: 'Carpentry & finishing', text: 'Skilled work for maintenance, assembly, and improvements.', icon: CheckCircle },
      { title: 'Home support', text: 'From small fixes to scheduled improvements, we help keep your space working smoothly.', icon: Users },
    ],
    sections: [
      'Book professionals for repairs, installation, maintenance, and quick home improvements.',
      'Our network includes trusted specialists who know how to work efficiently and safely.',
      'Whether you need a one-time fix or multiple tasks coordinated together, the process is simple and organized.',
    ],
  },
  'Skilled Artisans': {
    intro: 'NHFAS connects customers with craftsmen and makers for bespoke, detailed, and highly skilled work.',
    highlight: 'Custom jobs deserve careful craftsmanship, clear communication, and trusted local skill.',
    cta: { label: 'Explore artisans', to: '/signup' },
    cards: [
      { title: 'Custom craftsmanship', text: 'From design-led work to handcrafted finishing, our artisans deliver detail and care.', icon: Sparkles },
      { title: 'Local talent', text: 'Support skilled specialists in your area with clearly defined project requirements.', icon: Users },
      { title: 'Quality-focused', text: 'Each project is matched to artisans who understand the craft and standards involved.', icon: BadgeCheck },
    ],
    sections: [
      'Our artisan network covers woodworking, furniture making, custom finishing, and other specialized craft work.',
      'Customers can request flexible quotes and discuss requirements before work begins.',
      'Each service is designed to provide both craft quality and a transparent professional experience.',
    ],
  },
  'Heavy Haulage': {
    intro: 'Move large, heavy, or time-sensitive cargo with experienced operators and the right equipment for the job.',
    highlight: 'Safe routing, capable equipment, and clear dispatch planning for demanding transport work.',
    cta: { label: 'Request haulage', to: '/signup' },
    cards: [
      { title: 'Fleet capability', text: 'Coordinate heavy load transport with fit-for-purpose vehicles and operators.', icon: Truck },
      { title: 'Route and cargo planning', text: 'Haulage is organized around safety, loading, compliance, and timing.', icon: Shield },
      { title: 'Operational reliability', text: 'From equipment to materials, the process is built around smooth execution.', icon: CheckCircle },
    ],
    sections: [
      'Our heavy haulage service helps with transporting machinery, equipment, and other bulky cargo safely.',
      'Dispatch and route planning are supported by operational oversight and clear communication between clients and operators.',
      'The service is designed for high-value loads where safety and coordination matter just as much as speed.',
    ],
  },
  'Equipment Rental': {
    intro: 'Access the tools and machinery needed for bigger projects without the long-term commitment of ownership.',
    highlight: 'Flexible equipment access for projects that need the right machine at the right time.',
    cta: { label: 'Get equipment', to: '/signup' },
    cards: [
      { title: 'Flexible access', text: 'Rent tools and heavy equipment for the duration your project requires.', icon: Briefcase },
      { title: 'Cost efficient', text: 'Scale your equipment needs without capital-heavy purchase commitments.', icon: CheckCircle },
      { title: 'Ready for work', text: 'Find equipment that matches the task and the operational standard required.', icon: Hammer },
    ],
    sections: [
      'Equipment rental supports short-term project demands, seasonal workloads, and one-off operational needs.',
      'From smaller tools to heavy construction assets, we help match the right equipment to the job.',
      'This creates a faster and more flexible way to complete work without unnecessary delays.',
    ],
  },
  FAQ: {
    intro: 'Get quick answers about bookings, pricing, verification, payment, and how the NHFAS platform works in practice.',
    highlight: 'Common questions, clearer answers, and a smoother path to getting the right help or service.',
    cta: { label: 'Ask support', to: '/contact' },
    cards: [
      { title: 'How do I book?', text: 'Create a request, compare proposals, and confirm the right provider or operator.', icon: BookOpen },
      { title: 'Are providers verified?', text: 'Yes. Verification is part of the trust layer built into the platform.', icon: BadgeCheck },
      { title: 'Can I track progress?', text: 'Job updates, status checks, and real-time coordination are part of the experience.', icon: Shield },
    ],
    sections: [
      'Most customer questions revolve around price, timing, provider matching, and how to manage job changes.',
      'We also answer common support questions related to account actions, notifications, and service follow-up.',
      'If you do not find the answer you need, the support team is ready to help directly.',
    ],
  },
  'Help Center': {
    intro: 'Use the NHFAS Help Center for practical guidance, service walkthroughs, and troubleshooting support.',
    highlight: 'We want every user to understand the process and move forward with confidence.',
    cta: { label: 'Get help', to: '/contact' },
    cards: [
      { title: 'Guides', text: 'Step-by-step explanations for customers, providers, and operators.', icon: BookOpen },
      { title: 'Troubleshooting', text: 'Quick answers for service issues, account questions, and job updates.', icon: Shield },
      { title: 'Support flow', text: 'Clear next steps for getting help without long delays or confusion.', icon: MessageSquareText },
    ],
    sections: [
      'The Help Center is designed to help users move confidently through each stage of the experience.',
      'It includes practical guidance on bookings, payment flow, safety coordination, and account access.',
      'This makes it easier for new and returning users to resolve common issues quickly.',
    ],
  },
  'Trust & Safety': {
    intro: 'NHFAS is designed to protect users with clear verification, dispute support, and service standards that reduce risk.',
    highlight: 'A safer platform starts with trust, accountability, and clear procedures for every job and interaction.',
    cta: { label: 'Report a concern', to: '/contact' },
    cards: [
      { title: 'Verification', text: 'Identity checks and quality expectations help build safer service matching.', icon: BadgeCheck },
      { title: 'Safe coordination', text: 'Operational updates, incident reporting, and route visibility support accountability.', icon: Shield },
      { title: 'Dispute support', text: 'We provide pathways to escalate issues and protect user confidence.', icon: Users },
    ],
    sections: [
      'Safety is a core part of the NHFAS experience for both customers and providers.',
      'We encourage verified profiles, clear job communication, and responsible operation for every service engagement.',
      'Our trust and safety approach helps reduce risk while keeping the experience practical and professional.',
    ],
  },
};

const fallbackContent = {
  intro: 'This section is currently being updated with new and exciting information. Please check back later!',
  highlight: 'We are building a stronger, clearer experience for every NHFAS user.',
  cta: { label: 'Explore NHFAS', to: '/' },
  cards: [
    { title: 'Trusted experience', text: 'Quality support and better coordination for every service journey.', icon: CheckCircle },
    { title: 'Reliable flow', text: 'Simple communication, transparent updates, and thoughtful service delivery.', icon: Shield },
    { title: 'Better outcomes', text: 'A more organized process for customers, professionals, and operators alike.', icon: Users },
  ],
  sections: [
    'We are building the right tools, support, and guidance to make your experience smoother.',
    'More information will be added as this section grows and evolves.',
  ],
};

const PlaceholderPage = ({ title }) => {
  const page = pageContent[title] || fallbackContent;

  return (
    <div className="flex-1 bg-brand-softBlue pb-16 pt-28 font-sans lg:pb-24 lg:pt-32">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-green">NHFAS</p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-brand-navy md:text-5xl">{title}</h1>
          <div className="mx-auto mt-5 h-1.5 w-24 rounded-full bg-brand-green" />
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-10">
          <p className="text-lg leading-relaxed text-slate-600">{page.intro}</p>
          {page.highlight && (
            <div className="mt-4 rounded-2xl border border-brand-green/20 bg-brand-softBlue px-4 py-3 text-sm font-medium text-brand-navy">
              {page.highlight}
            </div>
          )}

          {page.cta && (
            <div className="mt-6 flex justify-start">
              <a href={page.cta.to} className="inline-flex items-center gap-2 rounded-full bg-brand-green px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-navy">
                {page.cta.label}
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          )}

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {page.cards.map(({ title: cardTitle, text, icon: Icon }) => (
              <div key={cardTitle} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-softBlue text-brand-navy">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-bold text-brand-navy">{cardTitle}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 border-t border-slate-200 pt-8">
            <div className="grid gap-5 md:grid-cols-3">
              {page.sections.map((section, index) => (
                <div key={`${section}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-brand-green/10 text-brand-green">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                  <p className="text-sm leading-6 text-slate-600">{section}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaceholderPage;
