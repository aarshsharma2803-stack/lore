"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  apiKey?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySR = any;

declare global {
  interface Window {
    SpeechRecognition: AnySR;
    webkitSpeechRecognition: AnySR;
  }
}

export default function VoiceInput({ onTranscript, disabled }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [liveText, setLiveText] = useState("");
  const [error, setError] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const finalTextRef = useRef(""); // accumulates final results reliably

  useEffect(() => {
    return () => { recognitionRef.current?.abort(); };
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SR: any = typeof window !== "undefined"
    ? (window.SpeechRecognition || window.webkitSpeechRecognition)
    : null;

  if (!SR) return null;

  const start = () => {
    if (recognitionRef.current) return;
    setError("");
    setLiveText("");
    finalTextRef.current = "";

    const r = new SR();
    r.lang = "en-US";
    r.continuous = true;
    r.interimResults = true;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          finalTextRef.current += t + " ";
        } else {
          interim = t;
        }
      }
      setLiveText((finalTextRef.current + interim).trim());
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onerror = (e: any) => {
      if (e.error === "not-allowed") setError("Mic blocked — allow in browser settings");
      else if (e.error === "no-speech") setError("No speech detected");
      else setError("Mic error: " + e.error);
      stop();
    };

    r.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
    };

    recognitionRef.current = r;
    r.start();
    setIsListening(true);
  };

  const stop = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);

    const captured = finalTextRef.current.trim() || liveText.trim();
    if (captured) {
      onTranscript(captured);
      setLiveText("");
      finalTextRef.current = "";
    }
  };

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <motion.button
        type="button"
        whileTap={{ scale: 0.92 }}
        onClick={isListening ? stop : start}
        disabled={disabled}
        title={isListening ? "Stop — inserts text" : "Speak your idea"}
        className={`w-9 h-9 rounded-[10px] flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
          isListening
            ? "bg-red-500/15 border border-red-500/40 text-red-400"
            : "bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-tertiary)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] cursor-pointer"
        }`}
      >
        {isListening ? (
          <motion.svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.7 }}>
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
          </motion.svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        )}
      </motion.button>

      <AnimatePresence>
        {isListening && liveText && (
          <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] overflow-hidden whitespace-nowrap"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <motion.span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0"
              animate={{ opacity: [1, 0.2, 1] }} transition={{ repeat: Infinity, duration: 0.9 }}/>
            <span className="text-[11px] text-red-300 max-w-[180px] truncate">{liveText}</span>
          </motion.div>
        )}
        {isListening && !liveText && (
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="text-[11px] text-red-300/70">Listening…</motion.span>
        )}
        {error && !isListening && (
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="text-[11px] text-red-400">{error}</motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
