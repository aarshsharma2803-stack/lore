 "use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import AudioPlayer from "@/components/AudioPlayer";
import MintButton from "@/components/MintButton";

interface Story {
  _id: string;
  prompt: string;
  content: string;
  genre: string;
  audioUrl?: string;
  nftMint?: string;
  nftExplorerUrl?: string;
  votes: number;
  createdAt: string;
}

const genreAccent: Record<string, string> = {
  fantasy: "#f59e0b",
  scifi: "#06b6d4",
  horror: "#a855f7",
  comedy: "#eab308",
  romance: "#f472b6",
};

// Strip markdown formatting for clean display
const cleanMarkdown = (text: string) =>
  text.replace(/#{1,6}\s*/g, "").replace(/\*{1,3}(.*?)\*{1,3}/g, "$1").trim();

const extractTitle = (content: string, prompt: string) => {
  const headingMatch = content.match(/^#+\s*(.+)/m);
  if (headingMatch) return headingMatch[1].replace(/[#*_]/g, "").trim();
  return cleanMarkdown(prompt).slice(0, 80);
};

export default function StoryDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isNarrating, setIsNarrating] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/stories?id=${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) setStory(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const handleNarrate = async () => {
    if (!story) return;
    setIsNarrating(true);
    try {
      const res = await fetch("/api/narrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: story.content.slice(0, 5000), voice: "narrator" }),
      });
      if (res.ok) {
        setAudioUrl(URL.createObjectURL(await res.blob()));
      }
    } catch (error) {
      console.error("Narration failed:", error);
    } finally {
      setIsNarrating(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
          <div className="spinner" />
        </div>
      </>
    );
  }

  if (!story) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 rounded-[12px] bg-[var(--bg-surface)] border border-[var(--border-default)] flex items-center justify-center mx-auto mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-quaternary)" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <p className="text-[13px] text-[var(--text-secondary)]">Story not found</p>
          </div>
        </div>
      </>
    );
  }

  const accent = genreAccent[story.genre] || "#7c5cfc";
  const genreLabel = story.genre === "scifi" ? "Sci-Fi" : story.genre.charAt(0).toUpperCase() + story.genre.slice(1);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[var(--bg-primary)] pt-24 px-6 pb-20">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Meta row */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: accent }} />
                <span className="label">{genreLabel}</span>
              </div>
              {story.nftMint && (
                <span className="badge badge-mint">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  Minted
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="heading-section text-2xl md:text-3xl text-[var(--text-primary)] mb-8">
              {extractTitle(story.content, story.prompt)}
            </h1>

            {/* Story content */}
            <motion.article
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="surface p-8 mb-8"
            >
              <div className="prose-story whitespace-pre-wrap">
                {cleanMarkdown(story.content)}
              </div>
            </motion.article>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="flex flex-wrap gap-2 mb-8"
            >
              <button
                onClick={handleNarrate}
                disabled={isNarrating}
                className="btn-primary disabled:opacity-30"
              >
                {isNarrating ? (
                  <>
                    <div className="spinner" />
                    Generating…
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    </svg>
                    Narrate
                  </>
                )}
              </button>
              <MintButton
                storyId={story._id}
                title={story.prompt}
                genre={story.genre}
                content={story.content}
              />
            </motion.div>

            {/* Audio */}
            {audioUrl && <AudioPlayer audioUrl={audioUrl} story={story.content} />}

            {/* NFT info */}
            {story.nftExplorerUrl && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="surface p-5 mt-8"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[8px] bg-[var(--mint-muted)] flex items-center justify-center flex-shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--mint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M12 8v8m-4-4h8"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-[var(--text-primary)] mb-0.5">On-chain</p>
                    <a
                      href={story.nftExplorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[12px] text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                    >
                      View on Solana Explorer
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 17L17 7M17 7H7M17 7v10"/></svg>
                    </a>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Votes */}
            <div className="mt-10 pt-6 border-t border-[var(--border-default)] text-center">
              <span className="text-[12px] text-[var(--text-quaternary)] tabular-nums">{story.votes} votes</span>
            </div>
          </motion.div>
        </div>
      </main>
    </>
  );
}
