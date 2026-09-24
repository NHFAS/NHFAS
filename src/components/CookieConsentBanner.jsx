import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const COOKIE_CONSENT_KEY = 'nhfas-cookie-consent';

const CookieConsentBanner = () => {
  const [visible, setVisible] = useState(() => !localStorage.getItem(COOKIE_CONSENT_KEY));

  const choose = (value) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, value);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <aside className="fixed bottom-4 left-4 right-4 z-[60] mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl" aria-label="Cookie consent">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl">
          <h2 className="font-bold text-brand-navy">Cookies on NHFAS</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            We use essential cookies to keep the site working and optional cookies to understand how it is used. Read our <Link to="/cookies" className="font-semibold text-brand-green hover:underline">Cookie Policy</Link> for details.
          </p>
        </div>
        <div className="flex shrink-0 gap-3">
          <button type="button" onClick={() => choose('declined')} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Decline optional
          </button>
          <button type="button" onClick={() => choose('accepted')} className="rounded-full bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green/90">
            Accept all
          </button>
        </div>
      </div>
    </aside>
  );
};

export default CookieConsentBanner;
