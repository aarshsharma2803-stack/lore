"use client";

import { motion, AnimatePresence } from "framer-motion";

export type TrackStatus = "idle" | "loading" | "streaming" | "done" | "error";

export interface VeoTrack {
  label: string;
  status: TrackStatus;
  percent: number;
}

interface GenerationProgressProps {
  images: TrackStatus;
  narration: TrackStatus;
  music: TrackStatus;
  videos: VeoTrack[];
  uniquenessStatus?: "checking" | "clear" | "adjusted" | null;
}

function TrackRow({ label, status, percent = 0 }: { label: string; status: TrackStatus; percent?: number }) {
  const icons: Record<TrackStatus, string> = { idle: "○", loading: "◉", streaming: "≋", done: "✓", error: "✗" };
  const colors: Record<TrackStatus, string> = {
    idle: "text-[var(--text-quaternary)]",
    loading: "text-[var(--genre-primary)]",
    streaming: "text-[var(--genre-accent)]",
    done: "text-emerald-400",
    error: "text-red-400",
  };

  return (
    <div className="flex items-center gap-3 py-1">
      <span className={`text-[11px] font-mono w-4 ${colors[status]}`}>
        {status === "loading" ? (
          <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
            {icons[status]}
          </motion.span>
        ) : icons[status]}
      </span>
      <span className="text-[12px] text-[var(--text-secondary)] w-28 truncate">{label}</span>
      {status === "loading" && percent > 0 && (
        <div className="flex-1 h-1 bg-[var(--bg-elevated)] rounded-full overflow-hidden max-w-[120px]">
          <motion.div
            className="h-full rounded-full"
            style={{ background: "var(--genre-primary)" }}
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      )}
      {status === "streaming" && (
        <motion.span className="text-[10px] text-[var(--genre-accent)]" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5 }}>
          streaming
        </motion.span>
      )}
      {status === "done" && <span className="text-[10px] text-emerald-400">ready</span>}
    </div>
  );
}

export default function GenerationProgress({ images, narration, music, videos, uniquenessStatus }: GenerationProgressProps) {
  const allDone = images === "done" && narration === "done" && videos.every(v => v.status === "done");

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="surface p-5 mb-6"
      style={{ border: "1px solid var(--genre-glow)" }}
    >
      <div className="flex items-center gap-2.5 mb-4">
        <motion.span animate={{ rotate: allDone ? 0 : 360 }} transition={{ repeat: allDone ? 0 : Infinity, duration: 2, ease: "linear" }} className="text-[var(--genre-primary)]">✦</motion.span>
        <span className="text-[13px] font-medium text-[var(--text-primary)]">
          {allDone ? "Cinematic experience ready" : "Building your film…"}
        </span>
      </div>
      <div className="space-y-0.5">
        <TrackRow label="Scene images" status={images} />
        <TrackRow label="Voice narration" status={narration} />
        <TrackRow label="Music score" status={music} />
        {videos.map((v, i) => <TrackRow key={i} label={`Video scene ${i + 1}`} status={v.status} percent={v.percent} />)}
      </div>
      <AnimatePresence>
        {uniquenessStatus && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-3 pt-3 border-t border-[var(--border-default)]">
            {uniquenessStatus === "checking" && <p className="text-[11px] text-[var(--text-quaternary)]">⚡ Checking story vault for uniqueness…</p>}
            {uniquenessStatus === "clear" && <p className="text-[11px] text-emerald-400">✓ Uniqueness verified — no similar stories in vault</p>}
            {uniquenessStatus === "adjusted" && <p className="text-[11px] text-amber-400">⚡ Similar themes detected — steering into unexplored territory</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
