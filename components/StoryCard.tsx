"use client";

import { motion } from "framer-motion";
import Link from "next/link";

interface StoryCardProps {
  id: string;
  title: string;
  preview: string;
  genre: string;
  votes: number;
  hasAudio: boolean;
  hasNft: boolean;
  isRecommended?: boolean;
}

const genreAccent: Record<string, string> = {
  fantasy: "#f59e0b",
  scifi: "#06b6d4",
  horror: "#a855f7",
  comedy: "#eab308",
  romance: "#f472b6",
};

export default function StoryCard({
  id,
  title,
  preview,
  genre,
  votes,
  hasAudio,
  hasNft,
  isRecommended,
}: StoryCardProps) {
  const accent = genreAccent[genre] || "#7c5cfc";
  const genreLabel = genre === "scifi" ? "Sci-Fi" : genre.charAt(0).toUpperCase() + genre.slice(1);

  return (
    <Link href={`/story/${id}`} className="block group">
      <motion.article
        whileHover={{ y: -3 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        className="surface-interactive card-spotlight gradient-border h-full flex flex-col p-5"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
          e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
        }}
      >
        {/* Top row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: accent }}
            />
            <span className="label">{genreLabel}</span>
          </div>
          {isRecommended && (
            <span className="badge badge-accent">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              AI Pick
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mb-2 line-clamp-1 group-hover:text-[var(--accent)] transition-colors duration-200">
          {title}
        </h3>

        {/* Preview */}
        <p className="text-[13px] text-[var(--text-tertiary)] line-clamp-3 leading-relaxed mb-auto pb-4">
          {preview}
        </p>

        {/* Bottom row */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--border-default)]">
          <div className="flex items-center gap-3">
            {hasAudio && (
              <span className="flex items-center gap-1.5 text-[11px] text-[var(--text-quaternary)]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                Audio
              </span>
            )}
            {hasNft && (
              <span className="flex items-center gap-1.5 text-[11px] text-[var(--text-quaternary)]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M12 8v8m-4-4h8"/></svg>
                Minted
              </span>
            )}
          </div>
          <span className="text-[11px] text-[var(--text-quaternary)] tabular-nums">{votes}</span>
        </div>
      </motion.article>
    </Link>
  );
}
