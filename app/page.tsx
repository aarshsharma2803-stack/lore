"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";

const steps = [
  {
    num: "01",
    title: "Chat with Gemini",
    desc: "Describe an idea. Gemini co-writes story chapters with you in real-time, adapting to your direction at every turn.",
  },
  {
    num: "02",
    title: "Narrate with ElevenLabs",
    desc: "Transform your story into an immersive audio experience with cinematic, expressive voice narration.",
  },
  {
    num: "03",
    title: "Generate video",
    desc: "AI generates scene illustrations and assembles them into a narrated video sequence.",
  },
  {
    num: "04",
    title: "Mint on Solana",
    desc: "Permanently store your story on-chain as an NFT. Own your narrative forever.",
  },
];

const featured = [
  {
    genre: "Fantasy",
    title: "The Last Dragon's Song",
    preview: "In a world where dragons communicate through music, one young bard discovers she can hear their melodies — and they have something urgent to say.",
    color: "#f59e0b",
  },
  {
    genre: "Comedy",
    title: "The CEO Who Was a Cat",
    preview: "Nobody noticed the new CEO was actually a tabby cat — until the quarterly earnings call went spectacularly sideways.",
    color: "#eab308",
  },
  {
    genre: "Sci-Fi",
    title: "Error 404: Earth Not Found",
    preview: "The AI responsible for maintaining Earth's simulation encounters a fatal exception it was never programmed to handle.",
    color: "#06b6d4",
  },
];

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[var(--bg-primary)] relative overflow-hidden">
        {/* Background orb — singular, intentional */}
        <div className="orb w-[600px] h-[600px] bg-[var(--accent)] -top-48 right-[-200px]" />
        <div className="aurora-bg" />

        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-[var(--accent)]"
              style={{
                left: `${15 + i * 15}%`,
                top: `${20 + (i % 3) * 25}%`,
                opacity: 0.15 + (i % 3) * 0.1,
                animation: `float ${5 + i * 1.5}s ease-in-out infinite`,
                animationDelay: `${i * 0.8}s`,
              }}
            />
          ))}
        </div>

        {/* ══ Hero ══ */}
        <section className="relative z-10 pt-28 pb-24 px-6">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
            >
              {/* Status badge */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="mb-6"
              >
                <span className="badge">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Glitch 2026
                </span>
              </motion.div>

              {/* Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="heading-display text-[clamp(2.5rem,6vw,4.5rem)] text-[var(--text-primary)] mb-5"
              >
                <span className="gradient-text">Stories that live</span>
                <br />
                <span className="text-[var(--text-tertiary)]">on the blockchain.</span>
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="body-large max-w-xl mb-10"
              >
                Co-author immersive tales with AI. Hear them narrated with
                cinematic voices. Mint them as NFTs — forever yours.
              </motion.p>

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="flex items-center gap-3"
              >
                <Link href="/create" className="btn-primary pulse-glow whitespace-nowrap">
                  Start creating
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </Link>
                <Link href="/gallery" className="btn-secondary whitespace-nowrap">
                  Browse gallery
                </Link>
              </motion.div>

              {/* Tech stack — horizontal, understated */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.6 }}
                className="mt-16 flex items-center gap-4 text-[11px] text-[var(--text-quaternary)]"
              >
                <span className="uppercase tracking-[0.08em] font-medium">Powered by</span>
                <div className="h-px flex-1 bg-[var(--border-default)]" />
                <div className="flex items-center gap-3 flex-wrap">
                  {["Gemini", "ElevenLabs", "Solana", "Fetch.ai", "MongoDB", "Vultr"].map((t) => (
                    <span key={t} className="hover-underline cursor-default">{t}</span>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ══ How It Works ══ */}
        <section className="relative z-10 py-24 px-6 border-t border-[var(--border-default)]">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5 }}
            >
              <span className="label mb-3 block">How it works</span>
              <h2 className="heading-section text-2xl text-[var(--text-primary)] mb-12">
                From idea to blockchain
                <br />
                <span className="text-[var(--text-tertiary)]">in four steps.</span>
              </h2>
            </motion.div>

            <div className="space-y-0">
              {steps.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ delay: i * 0.12, duration: 0.5 }}
                  style={{ animationDelay: `${i * 0.12}s` }}
                  className="group flex gap-6 py-6 border-b border-[var(--border-default)] last:border-none"
                >
                  <span className="font-mono text-[12px] text-[var(--text-quaternary)] pt-0.5 w-6 flex-shrink-0">
                    {step.num}
                  </span>
                  <div>
                    <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mb-1 group-hover:text-[var(--accent)] transition-colors duration-200">
                      {step.title}
                    </h3>
                    <p className="text-[13px] text-[var(--text-tertiary)] leading-relaxed max-w-md">
                      {step.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ Featured Stories ══ */}
        <section className="relative z-10 py-24 px-6 border-t border-[var(--border-default)]">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5 }}
              className="flex items-end justify-between mb-12"
            >
              <div>
                <span className="label mb-3 block">Featured</span>
                <h2 className="heading-section text-2xl text-[var(--text-primary)]">
                  AI-curated stories
                </h2>
              </div>
              <span className="badge">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-[var(--accent)]">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                Fetch.ai
              </span>
            </motion.div>

            <div className="space-y-3">
              {featured.map((story, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ delay: i * 0.08, duration: 0.5 }}
                >
                  <div
                    className="surface-interactive card-spotlight gradient-border p-5 group"
                    onMouseMove={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
                      e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
                    }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: story.color }}
                      />
                      <span className="label">{story.genre}</span>
                    </div>
                    <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mb-2 group-hover:text-[var(--accent)] transition-colors duration-200">
                      {story.title}
                    </h3>
                    <p className="text-[13px] text-[var(--text-tertiary)] leading-relaxed">
                      {story.preview}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ Footer ══ */}
        <footer className="relative z-10 py-10 px-6 border-t border-[var(--border-default)]">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-[5px] bg-[var(--accent)] flex items-center justify-center">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <span className="text-[12px] font-semibold text-[var(--text-tertiary)]">Lore</span>
            </div>
            <span className="text-[11px] text-[var(--text-quaternary)]">
              Glitch 2026
            </span>
          </div>
        </footer>
      </main>
    </>
  );
}
