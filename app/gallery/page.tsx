"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import StoryCard from "@/components/StoryCard";

interface Story {
  _id: string;
  prompt: string;
  content: string;
  genre: string;
  audioUrl?: string;
  nftMint?: string;
  votes: number;
  isRecommended?: boolean;
  createdAt: string;
}

const genreFilters = [
  { id: "all", label: "All" },
  { id: "fantasy", label: "Fantasy" },
  { id: "scifi", label: "Sci-Fi" },
  { id: "horror", label: "Horror" },
  { id: "comedy", label: "Comedy" },
  { id: "romance", label: "Romance" },
];

// Strip markdown formatting for clean display
const cleanMarkdown = (text: string) =>
  text.replace(/#{1,6}\s*/g, "").replace(/\*{1,3}(.*?)\*{1,3}/g, "$1").replace(/\n+/g, " ").trim();

const extractTitle = (content: string, prompt: string) => {
  // Try to extract a clean title from content (first heading or first sentence)
  const headingMatch = content.match(/^#+\s*(.+)/m);
  if (headingMatch) return headingMatch[1].replace(/[#*_]/g, "").trim();
  // Fall back to cleaned prompt
  return cleanMarkdown(prompt).slice(0, 60);
};

export default function GalleryPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetch("/api/stories")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setStories(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? stories : stories.filter((s) => s.genre === filter);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[var(--bg-primary)] pt-24 px-6 pb-16">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-10"
          >
            <span className="label mb-3 block">Gallery</span>
            <h1 className="heading-section text-3xl text-[var(--text-primary)] mb-2">
              Community stories
            </h1>
            <p className="body-small max-w-md">
              Browse AI-co-authored stories. Listen to narrations. Collect NFTs.
            </p>
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="flex gap-1 mb-10"
          >
            {genreFilters.map((g) => (
              <button
                key={g.id}
                onClick={() => setFilter(g.id)}
                className={`relative px-3 py-1.5 rounded-[8px] text-[12px] font-medium transition-colors duration-200 ${
                  filter === g.id
                    ? "text-[var(--text-primary)]"
                    : "text-[var(--text-quaternary)] hover:text-[var(--text-tertiary)]"
                }`}
              >
                {filter === g.id && (
                  <motion.div
                    layoutId="filter-pill"
                    className="absolute inset-0 bg-[var(--bg-surface)] rounded-[8px] border border-[var(--border-default)]"
                    transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  />
                )}
                <span className="relative z-10">{g.label}</span>
              </button>
            ))}
          </motion.div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="spinner" />
            </div>
          ) : filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-24 text-center"
            >
              <div className="w-12 h-12 rounded-[12px] bg-[var(--bg-surface)] border border-[var(--border-default)] flex items-center justify-center mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-quaternary)" strokeWidth="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
              </div>
              <p className="text-[14px] text-[var(--text-secondary)] mb-1">No stories yet</p>
              <p className="text-[12px] text-[var(--text-quaternary)]">Be the first to create one.</p>
            </motion.div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((story, i) => (
                <motion.div
                  key={story._id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.4 }}
                >
                  <StoryCard
                    id={story._id}
                    title={extractTitle(story.content, story.prompt)}
                    preview={cleanMarkdown(story.content).slice(0, 150) + "…"}
                    genre={story.genre}
                    votes={story.votes}
                    hasAudio={!!story.audioUrl}
                    hasNft={!!story.nftMint}
                    isRecommended={story.isRecommended}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
