// NHFAS text-to-speech (SRS FR-16 — multilingual voice support).
// Uses the browser Web Speech API (speechSynthesis) for TTS playback.
// Falls back gracefully when the API is unavailable.

import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Speaker, LoaderCircle } from 'lucide-react';

export default function TextToSpeech({ text, lang = 'en', autoPlay = false, className = '' }) {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(typeof window !== 'undefined' && 'speechSynthesis' in window);
  const utteranceRef = useRef(null);

  useEffect(() => {
    if (!supported) return;
    if (autoPlay && text && !speaking) {
      speak(text, lang);
    }
    return () => {
      if (utteranceRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, [autoPlay, text, lang, speaking, supported]);

  const speak = (txt, language) => {
    if (!supported || !txt) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(txt);
    utterance.lang = language;
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const toggle = () => {
    if (!supported) return;
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    } else if (text) {
      speak(text, lang);
    }
  };

  if (!supported) {
    return (
      <span className={`text-xs text-slate-400 italic ${className}`}>
        Voice playback not available in this browser
      </span>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={!text}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {speaking ? (
        <>
          <VolumeX className="h-3 w-3" animate="spin" /> Stop
        </>
      ) : (
        <>
          <Speaker className="h-3 w-3" /> Read aloud
        </>
      )}
    </button>
  );
}