"use client";

import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AudioPlayerProps {
  audioUrl: string;
  story: string;
}

export default function AudioPlayer({ audioUrl, story }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);

  const words = story.split(/\s+/);

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const setupAudioContext = () => {
    if (!audioRef.current || analyserRef.current) return;
    const audioContext = new AudioContext();
    const source = audioContext.createMediaElementSource(audioRef.current);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 128;
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    analyserRef.current = analyser;
  };

  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barWidth = 3;
      const gap = 2;
      const totalBars = Math.floor(canvas.width / (barWidth + gap));
      const step = Math.ceil(bufferLength / totalBars);
      const centerY = canvas.height / 2;

      for (let i = 0; i < totalBars; i++) {
        const value = dataArray[i * step] || 0;
        const barHeight = Math.max(2, (value / 255) * centerY * 0.9);

        ctx.fillStyle = `rgba(124, 92, 252, ${0.3 + (value / 255) * 0.6})`;
        ctx.beginPath();
        ctx.roundRect(
          i * (barWidth + gap),
          centerY - barHeight,
          barWidth,
          barHeight * 2,
          1.5
        );
        ctx.fill();
      }
    };
    draw();
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      setupAudioContext();
      audioRef.current.play();
      drawWaveform();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const current = audioRef.current.currentTime;
    const dur = audioRef.current.duration;
    setProgress((current / dur) * 100);
    if (dur > 0) {
      const wordIdx = Math.floor(current * (words.length / dur));
      setCurrentWordIndex(wordIdx);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = percent * audioRef.current.duration;
  };

  const fmt = (s: number) => {
    if (!s || isNaN(s)) return "0:00";
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="surface p-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
          <span className="text-[13px] font-semibold text-[var(--text-primary)]">Voice Narration</span>
        </div>
        <span className="label">ElevenLabs</span>
      </div>

      {/* Waveform */}
      <div className="relative rounded-[10px] overflow-hidden bg-[var(--bg-primary)] border border-[var(--border-default)] mb-4">
        <canvas
          ref={canvasRef}
          width={600}
          height={56}
          className="w-full h-14"
        />
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex items-center gap-[2px] opacity-20">
              {Array.from({ length: 50 }).map((_, i) => (
                <div
                  key={i}
                  className="w-[2px] rounded-full bg-[var(--accent)]"
                  style={{
                    height: `${6 + Math.abs(Math.sin(i * 0.3)) * 22}px`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={togglePlay}
          className="w-10 h-10 rounded-[10px] bg-[var(--accent)] flex items-center justify-center flex-shrink-0 hover:bg-[var(--accent-hover)] transition-colors"
        >
          {isPlaying ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
              <polygon points="6,4 20,12 6,20" />
            </svg>
          )}
        </motion.button>

        <div className="flex-1">
          <div
            className="h-1 bg-[var(--bg-surface)] rounded-full cursor-pointer group relative"
            onClick={handleSeek}
          >
            <div
              className="h-full bg-[var(--accent)] rounded-full transition-all relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white scale-0 group-hover:scale-100 transition-transform shadow-sm" />
            </div>
          </div>
          <div className="flex justify-between mt-1.5 text-[10px] font-mono text-[var(--text-quaternary)]">
            <span>{fmt(audioRef.current?.currentTime || 0)}</span>
            <span>{fmt(duration)}</span>
          </div>
        </div>
      </div>

      {/* Live transcript */}
      <AnimatePresence>
        {isPlaying && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-[var(--border-default)]">
              <p className="text-[13px] leading-relaxed max-h-28 overflow-y-auto">
                {words.map((word, i) => (
                  <span
                    key={i}
                    className={`transition-colors duration-100 ${
                      i === currentWordIndex
                        ? "text-[var(--accent)] font-medium"
                        : i < currentWordIndex
                        ? "text-[var(--text-secondary)]"
                        : "text-[var(--text-quaternary)]"
                    }`}
                  >
                    {word}{" "}
                  </span>
                ))}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentWordIndex(-1);
          if (animationRef.current) cancelAnimationFrame(animationRef.current);
        }}
      />
    </motion.div>
  );
}
