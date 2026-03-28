"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { LyriaPlayer } from "@/lib/lyria";

export interface CinematicScene {
  imageUrl: string;
  videoBase64?: string;
  mimeType?: string;
}

interface CinematicPlayerProps {
  scenes: CinematicScene[];
  audioUrl: string | null;
  lyriaRef?: React.MutableRefObject<LyriaPlayer | null>;
  storyTitle?: string;
}

interface ExportProgress {
  percent: number;
  label: string;
}

function base64ToObjectUrl(b64: string, mimeType: string): string {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: mimeType }));
}

export default function CinematicPlayer({ scenes, audioUrl, lyriaRef, storyTitle }: CinematicPlayerProps) {
  const [activeScene, setActiveScene] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null);
  const [exportDone, setExportDone] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoUrlsRef = useRef<string[]>([]);
  // State version counter — increments when blob URLs are ready, forcing a re-render
  const [videoUrlsVersion, setVideoUrlsVersion] = useState(0);

  const hasVideos = scenes.some(s => s.videoBase64);
  const current = scenes[activeScene];

  // Pre-convert base64 videos to blob URLs and trigger re-render
  useEffect(() => {
    const prev = videoUrlsRef.current;
    videoUrlsRef.current = scenes.map(s =>
      s.videoBase64 ? base64ToObjectUrl(s.videoBase64, s.mimeType ?? "video/mp4") : ""
    );
    setVideoUrlsVersion(v => v + 1); // force re-render so new URLs are picked up
    return () => prev.forEach(u => u && URL.revokeObjectURL(u));
  }, [scenes]);

  // Auto-advance scenes every 9 seconds while playing
  useEffect(() => {
    if (!isPlaying) { if (timerRef.current) clearTimeout(timerRef.current); return; }
    timerRef.current = setTimeout(() => {
      setActiveScene(prev => (prev + 1) % scenes.length);
    }, 9000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isPlaying, activeScene, scenes.length]);

  // Sync video element src whenever scene changes or video URLs become ready
  useEffect(() => {
    const url = videoUrlsRef.current[activeScene];
    if (videoRef.current && url) {
      videoRef.current.src = url;
      if (isPlaying) videoRef.current.play().catch(() => {});
    }
  }, [activeScene, isPlaying, videoUrlsVersion]);

  const togglePlay = () => {
    const next = !isPlaying;
    setIsPlaying(next);
    if (next) {
      audioRef.current?.play().catch(() => {});
      videoRef.current?.play().catch(() => {});
    } else {
      audioRef.current?.pause();
      videoRef.current?.pause();
    }
  };

  const handleDownload = async () => {
    if (exportProgress) return;
    setExportDone(false);
    setExportProgress({ percent: 0, label: "Preparing…" });

    try {
      const { exportCinematicFilm, downloadBlob } = await import("@/lib/cinematic-export");

      // Collect Veo video blobs
      const videoBlobs = scenes.map(s => {
        if (!s.videoBase64) return null;
        const binary = atob(s.videoBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return new Blob([bytes], { type: s.mimeType ?? "video/mp4" });
      });

      // Collect Lyria PCM if available
      const lyriaBuffer = lyriaRef?.current?.getMergedPCM() ?? null;

      const mp4Blob = await exportCinematicFilm({
        videoBlobs,
        narrationUrl: audioUrl,
        lyriaBuffer,
        onProgress: (percent, label) => setExportProgress({ percent, label }),
      });

      const title = (storyTitle || "lore-story").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
      downloadBlob(mp4Blob, `${title}.mp4`);
      setExportDone(true);
      setExportProgress(null);
    } catch (e) {
      console.error("Export error:", e);
      setExportProgress({ percent: -1, label: "Export failed" });
      setTimeout(() => setExportProgress(null), 3000);
    }
  };

  if (scenes.length === 0) return null;

  return (
    <div className="surface overflow-hidden mb-6">
      {/* Cinematic frame */}
      <div className="relative aspect-video bg-black">
        <AnimatePresence mode="wait">
          <motion.div key={activeScene} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.7 }} className="absolute inset-0">
            {hasVideos && videoUrlsRef.current[activeScene] ? (
              <video ref={videoRef} className="w-full h-full object-cover" loop muted playsInline />
            ) : current?.imageUrl ? (
              <img src={current.imageUrl} alt={`Scene ${activeScene + 1}`} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[var(--bg-elevated)]">
                <div className="spinner" />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Scene badge */}
        <div className="absolute top-3 left-3 px-2 py-1 rounded text-[10px] font-mono" style={{ background: "rgba(0,0,0,0.65)", color: "var(--genre-accent)" }}>
          {hasVideos ? "VEO" : "IMG"} · SCENE {activeScene + 1}/{scenes.length}
        </div>

        {/* Play overlay */}
        {!isPlaying && (
          <motion.button onClick={togglePlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.3)" }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "var(--genre-glow)", border: "2px solid var(--genre-primary)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--genre-primary)"><polygon points="5 3 19 12 5 21 5 3" /></svg>
            </div>
          </motion.button>
        )}

        {/* Export progress overlay */}
        <AnimatePresence>
          {exportProgress && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3"
              style={{ background: "rgba(0,0,0,0.82)" }}
            >
              <div className="w-8 h-8">
                {exportProgress.percent >= 0 ? (
                  <svg viewBox="0 0 36 36" className="w-8 h-8 -rotate-90">
                    <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3"/>
                    <circle cx="18" cy="18" r="14" fill="none" stroke="var(--genre-primary)" strokeWidth="3"
                      strokeDasharray={`${(exportProgress.percent / 100) * 88} 88`} strokeLinecap="round"/>
                  </svg>
                ) : (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                  </svg>
                )}
              </div>
              <div className="text-center">
                <p className="text-[13px] font-semibold text-white">{exportProgress.label}</p>
                {exportProgress.percent >= 0 && (
                  <p className="text-[11px] text-white/50 mt-0.5">{exportProgress.percent}%</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="p-4 flex items-center gap-3">
        <button onClick={togglePlay} className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--genre-glow)", border: "1px solid var(--genre-primary)" }}>
          {isPlaying
            ? <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--genre-primary)"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            : <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--genre-primary)"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          }
        </button>
        <div className="flex gap-1.5 flex-1">
          {scenes.map((_, i) => (
            <button key={i} onClick={() => setActiveScene(i)} className="w-2 h-2 rounded-full transition-all" style={{ background: i === activeScene ? "var(--genre-primary)" : "var(--bg-elevated)" }} />
          ))}
        </div>
        <span className="text-[10px] text-[var(--text-quaternary)]">
          {hasVideos ? "🎬 Veo 2" : "🖼 AI scene"}
        </span>

        {/* Download button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleDownload}
          disabled={!!exportProgress}
          title="Download as MP4"
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[11px] font-medium transition-all duration-200 ${
            exportDone
              ? "bg-[var(--mint-muted)] text-[var(--mint)] border border-[rgba(52,211,153,0.2)]"
              : exportProgress
              ? "bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-quaternary)] cursor-wait"
              : "bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] cursor-pointer"
          }`}
        >
          {exportDone ? (
            <>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Saved!
            </>
          ) : exportProgress ? (
            <><div className="spinner" />Exporting…</>
          ) : (
            <>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download MP4
            </>
          )}
        </motion.button>
      </div>

      {audioUrl && <audio ref={audioRef} src={audioUrl} />}
    </div>
  );
}
