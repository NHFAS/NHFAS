// NHFAS voice-note recorder (SRS FR-16 — multilingual audio/voice messaging).
// Browser MediaRecorder API records an audio blob; playback uses an object URL.
// No server storage — messages are played client-first (demo baseline).

import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Volume2, VolumeX, LoaderCircle, Trash2, Play } from 'lucide-react';

const inputClass = 'block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20';

export default function VoiceNoteRecorder({ onAudioReady, className = '' }) {
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [error, setError] = useState(null);
  const [duration, setDuration] = useState(0);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        if (onAudioReady) onAudioReady({ blob, url, duration: Math.round(duration) });
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      setRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch (err) {
      setError('Microphone access denied or unavailable.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const playAudio = () => {
    if (!audioUrl) return;
    if (audioRef.current) {
      audioRef.current.pause();
      URL.revokeObjectURL(audioRef.current.src);
    }
    audioRef.current = new Audio(audioUrl);
    audioRef.current.play();
  };

  const clearAudio = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setDuration(0);
  };

  return (
    <div className={`rounded-lg border border-slate-200 bg-white p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Voice note</span>
        {error && (
          <span className="text-xs text-red-600">{error}</span>
        )}
      </div>

      {!recording && !audioUrl ? (
        <button
          onClick={startRecording}
          disabled={!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600 hover:border-brand-green hover:bg-brand-green/5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia ? (
            <span>Microphone not available</span>
          ) : (
            <>
              <Mic className="h-4 w-4" /> Record voice note
            </>
          )}
        </button>
      ) : recording ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-brand-navy">Recording…</span>
            <span className="text-xs font-mono text-slate-500">{duration}s</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={stopRecording}
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100"
            >
              <MicOff className="h-4 w-4" /> Stop
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-brand-navy">Recording ready</span>
            <button
              onClick={clearAudio}
              className="text-xs text-red-600 hover:underline"
            >
              <Trash2 className="h-3 w-3" /> Discard
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={playAudio} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <Play className="h-3.5 w-3.5" /> Play
            </button>
            <span className="text-xs font-mono text-slate-500">{duration}s</span>
          </div>
        </div>
      )}
    </div>
  );
}