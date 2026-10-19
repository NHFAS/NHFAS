import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { translations } from './translations';

// FR-16 — lightweight i18n: English, አማርኛ (Amharic), Afaan Oromo, Kiswahili.
// The selected language persists in localStorage and drives document.lang
// so screen readers announce pages in the right language (NFR access).
export const LANGUAGES = [
  { code: 'en', label: 'English', htmlLang: 'en' },
  { code: 'am', label: 'አማርኛ', htmlLang: 'am' },
  { code: 'or', label: 'Afaan Oromo', htmlLang: 'om' },
  { code: 'sw', label: 'Kiswahili', htmlLang: 'sw' },
];

const STORAGE_KEY = 'nhfas_lang';
const I18nContext = createContext(null);

const detectInitialLang = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && translations[saved]) return saved;
  } catch { /* storage unavailable — fall through */ }
  const nav = (typeof navigator !== 'undefined' && navigator.language || 'en').slice(0, 2);
  return translations[nav] ? nav : 'en';
};

export const I18nProvider = ({ children }) => {
  const [lang, setLangState] = useState(detectInitialLang);

  useEffect(() => {
    const meta = LANGUAGES.find((entry) => entry.code === lang) || LANGUAGES[0];
    document.documentElement.lang = meta.htmlLang;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* ignore */ }
  }, [lang]);

  const setLang = useCallback((code) => {
    if (translations[code]) setLangState(code);
  }, []);

  // t(key) → active language → English → the key itself (never blanks UI).
  const t = useCallback((key) => (
    translations[lang]?.[key] ?? translations.en[key] ?? key
  ), [lang]);

  const value = useMemo(() => ({ t, lang, setLang, languages: LANGUAGES }), [t, lang, setLang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useTranslation = () => {
  const context = useContext(I18nContext);
  if (!context) {
    // Pages rendered outside the provider still get English keys.
    return { t: (key) => translations.en[key] ?? key, lang: 'en', setLang: () => {}, languages: LANGUAGES };
  }
  return context;
};
