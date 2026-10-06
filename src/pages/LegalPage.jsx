import React from 'react';

const legalContent = {
  terms: {
    label: 'Terms and Conditions',
    title: 'Terms and Conditions',
    intro: 'These terms explain the rules for using NHFAS and the responsibilities of customers, providers, operators, and organizations on the platform.',
    sections: [
      ['Using NHFAS', 'You must provide accurate account information, keep your login details private, and use the platform lawfully. Accounts may be suspended when activity creates a security, safety, or fraud risk.'],
      ['Services and bookings', 'NHFAS helps users discover and coordinate services. A booking may include provider terms, price, timing, permits, and completion requirements agreed by the parties.'],
      ['Payments and disputes', 'Payment, escrow, cancellation, and dispute terms should be reviewed before confirming a job. Do not make off-platform payments when a protected NHFAS payment flow is available.'],
      ['Safety and responsibility', 'Users must follow applicable laws, safety rules, permit requirements, and professional standards. Report incidents or suspected fraud through the appropriate support channel.'],
      ['Changes and contact', 'We may update these terms as the platform develops. Questions about these terms can be sent through the Contact page.'],
    ],
  },
  privacy: {
    label: 'Privacy',
    title: 'Privacy Policy',
    intro: 'This policy describes the information NHFAS may collect, why it is used, and the choices available to you.',
    sections: [
      ['Information we collect', 'We may collect account details, contact information, service requests, booking information, location data needed for logistics, payment references, and messages or documents you choose to provide. Providers may submit identity document photos, such as a Fayda ID, for verification.'],
      ['How we use information', 'Information is used to provide and secure the service, verify provider identities, match jobs, coordinate bookings, process payments, support users, prevent abuse, and improve the platform.'],
      ['Sharing and retention', 'Identity documents are kept in private storage and are accessible only to the person who submitted them and authorized platform administrators. We share information only as needed to operate a requested service, meet legal obligations, protect users, or work with trusted infrastructure providers, and retain it only as long as needed for these purposes.'],
      ['Your choices', 'You can request access, correction, or deletion of personal information where applicable. You can also control optional cookies through the consent banner.'],
      ['Security and contact', 'We use access controls and security practices appropriate to the information handled. Contact NHFAS if you have a privacy question or request.'],
    ],
  },
  cookies: {
    label: 'Cookies',
    title: 'Cookie Policy',
    intro: 'NHFAS uses a small number of cookies and local storage values to keep the site usable and remember your consent choice.',
    sections: [
      ['Essential storage', 'Essential storage supports features such as remembering your cookie preference and maintaining a reliable session. These features cannot be switched off through the consent banner.'],
      ['Optional measurement', 'Optional analytics may help us understand which pages are useful and where the experience needs improvement. Optional measurement is only enabled after consent.'],
      ['Managing your choice', 'Choose “Decline optional” to allow only essential storage. You can clear site data in your browser to show the consent banner again.'],
      ['Third-party services', 'Some embedded or payment-related services may set their own cookies under their own policies. Review those providers’ notices before using the related feature.'],
      ['Updates', 'We may update this policy as the platform adds features. The current version will always be available from the site footer.'],
    ],
  },
};

const LegalPage = ({ type }) => {
  const content = legalContent[type];

  return (
    <article className="flex-1 bg-brand-softBlue px-4 pb-20 pt-28 sm:px-6 lg:px-8 lg:pb-28 lg:pt-32">
      <div className="mx-auto max-w-4xl">
        <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-brand-green">{content.label}</p>
        <h1 className="text-4xl font-extrabold tracking-tight text-brand-navy md:text-5xl">{content.title}</h1>
        <p className="mt-6 max-w-3xl text-lg leading-relaxed text-slate-600">{content.intro}</p>

        <div className="mt-12 space-y-5">
          {content.sections.map(([heading, body]) => (
            <section key={heading} className="border-t border-slate-200 py-6">
              <h2 className="text-xl font-bold text-brand-navy">{heading}</h2>
              <p className="mt-2 leading-relaxed text-slate-600">{body}</p>
            </section>
          ))}
        </div>
      </div>
    </article>
  );
};

export default LegalPage;
