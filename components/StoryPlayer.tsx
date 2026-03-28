"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Scene {
  sceneNumber: number;
  text: string;
  visual: string;
  imageUrl: string;
  wordCount: number;
}

interface StoryPlayerProps {
  audioUrl: string;
  story: string;
  scenes: Scene[];
}

// Ken Burns animation variants — each scene gets a different one
const kenBurnsVariants = [
  { scale: [1, 1.15], x: ["0%", "3%"], y: ["0%", "2%"] },
  { scale: [1.1, 1], x: ["2%", "-2%"], y: ["-1%", "1%"] },
  { scale: [1, 1.12], x: ["-2%", "2%"], y: ["1%", "-1%"] },
  { scale: [1.08, 1], x: ["1%", "-3%"], y: ["2%", "0%"] },
];

export default function StoryPlayer({ audioUrl, story, scenes }: StoryPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentScene, setCurrentScene] = useState(0);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [imagesLoaded, setImagesLoaded] = useState<boolean[]>([]);

  const words = story.split(/\s+/);
  const totalWords = scenes.reduce((sum, s) => sum + s.wordCount, 0);

  // Precompute scene word boundaries for audio sync
  const sceneBoundaries = useCallback(() => {
    let cumulative = 0;
    return scenes.map((s) => {
      const start = cumulative / totalWords;
      cumulative += s.wordCount;
      const end = cumulative / totalWords;
      return { start, end };
    });
  }, [scenes, totalWords]);

  // Check which images are available (base64 data URLs are instant, http URLs need loading)
  useEffect(() => {
    const loaded = new Array(scenes.length).fill(false);

    scenes.forEach((scene, i) => {
      if (scene.imageUrl.startsWith("data:")) {
        // Base64 data URL — already available, no loading needed
        loaded[i] = true;
      } else if (scene.imageUrl) {
        // HTTP URL — need to preload
        const img = new Image();
        img.onload = () => {
          loaded[i] = true;
          setImagesLoaded([...loaded]);
        };
        img.onerror = () => {
          loaded[i] = false;
          setImagesLoaded([...loaded]);
        };
        img.src = scene.imageUrl;
      }
    });

    setImagesLoaded([...loaded]);
  }, [scenes]);

  // Audio context for waveform
  const setupAudioContext = () => {
    if (!audioRef.current || analyserRef.current) return;
    const ctx = new AudioContext();
    const source = ctx.createMediaElementSource(audioRef.current);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    source.connect(analyser);
    analyser.connect(ctx.destination);
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
      const barWidth = 2;
      const gap = 1.5;
      const totalBars = Math.floor(canvas.width / (barWidth + gap));
      const step = Math.ceil(bufferLength / totalBars);
      const centerY = canvas.height / 2;

      for (let i = 0; i < totalBars; i++) {
        const value = dataArray[i * step] || 0;
        const barHeight = Math.max(1, (value / 255) * centerY * 0.85);
        ctx.fillStyle = `rgba(124, 92, 252, ${0.25 + (value / 255) * 0.6})`;
        ctx.beginPath();
        ctx.roundRect(i * (barWidth + gap), centerY - barHeight, barWidth, barHeight * 2, 1);
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

  // Sync scenes + words with audio progress
  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const current = audioRef.current.currentTime;
    const dur = audioRef.current.duration;
    if (!dur) return;

    const pct = current / dur;
    setProgress(pct * 100);

    // Update current word
    const wordIdx = Math.floor(pct * words.length);
    setCurrentWordIndex(wordIdx);

    // Update current scene based on word boundaries
    const boundaries = sceneBoundaries();
    for (let i = 0; i < boundaries.length; i++) {
      if (pct >= boundaries[i].start && pct < boundaries[i].end) {
        if (currentScene !== i) setCurrentScene(i);
        break;
      }
    }
    // Handle end
    if (pct >= 0.99 && scenes.length > 0) {
      setCurrentScene(scenes.length - 1);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !audioRef.current.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = pct * audioRef.current.duration;
  };

  const goToScene = (idx: number) => {
    if (!audioRef.current || !audioRef.current.duration) return;
    const boundaries = sceneBoundaries();
    if (boundaries[idx]) {
      audioRef.current.currentTime = boundaries[idx].start * audioRef.current.duration;
      setCurrentScene(idx);
    }
  };

  const fmt = (s: number) => {
    if (!s || isNaN(s)) return "0:00";
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const kb = kenBurnsVariants[currentScene % kenBurnsVariants.length];

  return (
    <div className="space-y-4">
      {/* ─── Cinematic Image Display ─── */}
      <div className="relative rounded-[12px] overflow-hidden bg-black aspect-video">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentScene}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            {/* Loading skeleton while image loads */}
            {!imagesLoaded[currentScene] && scenes[currentScene]?.imageUrl && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[var(--bg-elevated)] to-[var(--bg-surface)]">
                <div className="text-center">
                  <div className="spinner mx-auto mb-3" />
                  <p className="text-[11px] text-[var(--text-quaternary)]">Generating scene {currentScene + 1}…</p>
                </div>
                <div className="absolute inset-0 opacity-30 aurora-bg" />
              </div>
            )}

            {/* Gradient fallback when no image available */}
            {!scenes[currentScene]?.imageUrl && (
              <div className="absolute inset-0 bg-gradient-to-br from-[#1a0533] via-[#0d1b2a] to-[#0a0a12]">
                <div className="absolute inset-0 aurora-bg opacity-40" />
              </div>
            )}

            {/* Ken Burns animated image */}
            {scenes[currentScene]?.imageUrl && (
              <motion.img
                src={scenes[currentScene].imageUrl}
                alt={scenes[currentScene]?.visual || "Scene"}
                className="w-full h-full object-cover"
                style={{ display: imagesLoaded[currentScene] ? "block" : "none" }}
                initial={{ scale: kb.scale[0], x: kb.x[0], y: kb.y[0] }}
                animate={{ scale: kb.scale[1], x: kb.x[1], y: kb.y[1] }}
                transition={{ duration: 15, ease: "linear", repeat: Infinity, repeatType: "reverse" }}
                onLoad={() => {
                  setImagesLoaded((prev) => {
                    const next = [...prev];
                    next[currentScene] = true;
                    return next;
                  });
                }}
              />
            )}

            {/* Gradient overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          </motion.div>
        </AnimatePresence>

        {/* Scene text overlay at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <AnimatePresence mode="wait">
            <motion.p
              key={currentScene}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.6 }}
              className="text-white/90 text-[13px] leading-relaxed line-clamp-3"
              style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
            >
              {scenes[currentScene]?.text.slice(0, 200)}
              {(scenes[currentScene]?.text.length || 0) > 200 ? "…" : ""}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Scene counter */}
        <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm rounded-[6px] px-2.5 py-1 text-[10px] text-white/70 font-mono">
          Scene {currentScene + 1}/{scenes.length}
        </div>

        {/* Playing indicator */}
        {isPlaying && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-[6px] px-2.5 py-1">
            <div className="flex items-center gap-[2px]">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-[2px] bg-[var(--accent)] rounded-full"
                  animate={{ height: ["4px", "12px", "4px"] }}
                  transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.15 }}
                />
              ))}
            </div>
            <span className="text-[10px] text-white/70 font-mono">LIVE</span>
          </div>
        )}
      </div>

      {/* ─── Scene Dots ─── */}
      <div className="flex items-center justify-center gap-2">
        {scenes.map((_, i) => (
          <button
            key={i}
            onClick={() => goToScene(i)}
            className="group flex flex-col items-center gap-1"
          >
            <div
              className={`h-1 rounded-full transition-all duration-500 ${
                i === currentScene
                  ? "w-8 bg-[var(--accent)]"
                  : i < currentScene
                  ? "w-4 bg-[var(--accent)]/40"
                  : "w-4 bg-[var(--border-default)] group-hover:bg-[var(--text-quaternary)]"
              }`}
            />
          </button>
        ))}
      </div>

      {/* ─── Audio Controls ─── */}
      <div className="surface p-4">
        <div className="flex items-center gap-3">
          {/* Play/Pause */}
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

          {/* Waveform + Progress */}
          <div className="flex-1">
            <div className="relative rounded-[8px] overflow-hidden bg-[var(--bg-primary)] border border-[var(--border-default)] mb-1.5">
              <canvas ref={canvasRef} width={500} height={32} className="w-full h-8" />
              {!isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex items-center gap-[1px] opacity-15">
                    {Array.from({ length: 60 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-[1.5px] rounded-full bg-[var(--accent)]"
                        style={{ height: `${3 + Math.abs(Math.sin(i * 0.25)) * 16}px` }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
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
              {/* Scene markers on progress bar */}
              {scenes.length > 1 &&
                sceneBoundaries().map((b, i) =>
                  i > 0 ? (
                    <div
                      key={i}
                      className="absolute top-1/2 -translate-y-1/2 w-[2px] h-2.5 bg-[var(--text-quaternary)]/30 rounded-full"
                      style={{ left: `${b.start * 100}%` }}
                    />
                  ) : null
                )}
            </div>
            <div className="flex justify-between mt-1 text-[10px] font-mono text-[var(--text-quaternary)]">
              <span>{fmt(audioRef.current?.currentTime || 0)}</span>
              <span>{fmt(duration)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Synced Transcript ─── */}
      <AnimatePresence>
        {isPlaying && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="surface p-4">
              <div className="flex items-center gap-2 mb-3">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-quaternary)" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>
                <span className="text-[11px] font-medium text-[var(--text-tertiary)]">Live transcript</span>
              </div>
              <p className="text-[13px] leading-relaxed max-h-24 overflow-y-auto">
                {words.map((word, i) => (
                  <span
                    key={i}
                    className={`transition-colors duration-150 ${
                      i === currentWordIndex
                        ? "text-[var(--accent)] font-semibold"
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
    </div>
  );
}
