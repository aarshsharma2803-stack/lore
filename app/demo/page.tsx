"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AudioPlayer from "@/components/AudioPlayer";
import AgentNetwork from "@/components/AgentNetwork";
import Navbar from "@/components/Navbar";

// ─── Demo Configuration ───
const DEMO_GENRE = "fantasy";
const DEMO_PROMPT =
  "A lonely astronaut discovers a library floating in deep space, where every book contains a real universe you can step into. She opens one and finds a world where stars sing.";

interface DemoPhase {
  id: string;
  label: string;
  icon: string;
  description: string;
}

const PHASES: DemoPhase[] = [
  { id: "init", label: "Initializing", icon: "⚡", description: "Setting up MintTales experience" },
  { id: "genre", label: "Genre Selection", icon: "🐉", description: "Selecting Fantasy genre" },
  { id: "story", label: "AI Story Generation", icon: "✦", description: "Gemini co-authoring your story" },
  { id: "save", label: "Database Storage", icon: "🗄️", description: "Saving to MongoDB Atlas" },
  { id: "narrate", label: "Voice Narration", icon: "🎙️", description: "ElevenLabs creating cinematic voice" },
  { id: "agents", label: "Agent Analysis", icon: "🌐", description: "5 Fetch.ai agents analyzing story" },
  { id: "video", label: "Video Generation", icon: "🎬", description: "LTX Video creating scene videos" },
  { id: "mint", label: "NFT Minting", icon: "⟁", description: "Minting on Solana devnet" },
  { id: "complete", label: "Complete", icon: "🏆", description: "Your story is on the blockchain" },
];

export default function DemoPage() {
  const [started, setStarted] = useState(false);
  const [currentPhaseIdx, setCurrentPhaseIdx] = useState(-1);
  const [phaseStatus, setPhaseStatus] = useState<Record<string, "waiting" | "running" | "done" | "error">>({});
  const [story, setStory] = useState("");
  const [storyId, setStoryId] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [showAudio, setShowAudio] = useState(false);
  const [showAgents, setShowAgents] = useState(false);
  const [videoScenes, setVideoScenes] = useState<{ videoUrl: string; description: string }[]>([]);
  const [showVideo, setShowVideo] = useState(false);
  const [mintResult, setMintResult] = useState<{ explorerUrl: string; signature: string } | null>(null);
  const [showMint, setShowMint] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Timer
  useEffect(() => {
    if (started && currentPhaseIdx < PHASES.length - 1) {
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [started, currentPhaseIdx]);

  const setPhase = useCallback((idx: number, status: "running" | "done") => {
    setCurrentPhaseIdx(idx);
    setPhaseStatus((prev) => ({
      ...prev,
      [PHASES[idx].id]: status,
    }));
  }, []);

  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const scrollToBottom = () => {
    setTimeout(() => contentRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 100);
  };

  // ─── The Full Automated Demo Pipeline ───
  const runDemo = async () => {
    setStarted(true);

    // Phase 0: Init
    setPhase(0, "running");
    await delay(1200);
    setPhase(0, "done");

    // Phase 1: Genre Selection
    setPhase(1, "running");
    await delay(1500);
    setPhase(1, "done");

    // Phase 2: Story Generation (real streaming from Gemini)
    setPhase(2, "running");
    let fullStory = "";
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: DEMO_PROMPT }],
          genre: DEMO_GENRE,
        }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));
          for (const line of lines) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                fullStory += parsed.text;
                setStory(fullStory);
                scrollToBottom();
              }
            } catch {
              // skip malformed chunks
            }
          }
        }
      }
    } catch (err) {
      console.error("Story generation failed:", err);
      fullStory = "The astronaut floated through the cosmic library, her fingers tracing spines of books that hummed with starlight. Each volume pulsed with a different color — amber for desert worlds, deep blue for ocean planets, silver for realms of pure thought.\n\nShe pulled a book bound in midnight velvet. The pages were blank, but as she touched them, the ink bled through like a sunrise — and suddenly she wasn't reading anymore. She was standing on a crystalline plain where the stars sang in harmonies that made her chest ache with beauty she'd never known existed.\n\n\"You hear them too,\" whispered a voice behind her. A child made of constellation dust smiled up at her. \"The stars have been waiting for someone who could listen.\"";
      setStory(fullStory);
    }
    await delay(800);
    setPhase(2, "done");

    // Phase 3: Save to MongoDB
    setPhase(3, "running");
    try {
      const saveRes = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: DEMO_PROMPT.slice(0, 100),
          content: fullStory,
          genre: DEMO_GENRE,
        }),
      });
      const saveData = await saveRes.json();
      setStoryId(saveData.id || `local_${Date.now()}`);
    } catch {
      setStoryId(`local_${Date.now()}`);
    }
    await delay(1000);
    setPhase(3, "done");

    // Phase 4: ElevenLabs Narration
    setPhase(4, "running");
    scrollToBottom();
    try {
      const narRes = await fetch("/api/narrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: fullStory.slice(0, 5000), voice: "narrator" }),
      });
      if (narRes.ok) {
        const blob = await narRes.blob();
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setShowAudio(true);
      }
    } catch (err) {
      console.error("Narration failed:", err);
    }
    await delay(500);
    setPhase(4, "done");

    // Phase 5: Fetch.ai Agent Network
    setPhase(5, "running");
    setShowAgents(true);
    scrollToBottom();
    // Wait for agent animation to play out (~8 seconds)
    await delay(9000);
    setPhase(5, "done");

    // Phase 6: Video Generation
    setPhase(6, "running");
    scrollToBottom();
    try {
      const vidRes = await fetch("/api/video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: fullStory, genre: DEMO_GENRE }),
      });
      const vidData = await vidRes.json();
      if (vidData.success && vidData.scenes) {
        const scenes = vidData.scenes.map(
          (s: { videoBase64: string; description: string; sceneNumber: number }) => {
            const binary = atob(s.videoBase64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const blob = new Blob([bytes], { type: "video/mp4" });
            return { videoUrl: URL.createObjectURL(blob), description: s.description };
          }
        );
        setVideoScenes(scenes);
        setShowVideo(true);
      }
    } catch (err) {
      console.error("Video generation failed:", err);
    }
    await delay(1500);
    setPhase(6, "done");
    scrollToBottom();

    // Phase 7: Solana NFT Mint
    setPhase(7, "running");
    try {
      const mintRes = await fetch("/api/mint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyId: storyId || `local_${Date.now()}`,
          title: fullStory.slice(0, 50),
          genre: DEMO_GENRE,
          content: fullStory.slice(0, 500),
          payerPublicKey: "demo_judge_wallet",
        }),
      });
      const mintData = await mintRes.json();
      if (mintData.success) {
        setMintResult({ explorerUrl: mintData.explorerUrl, signature: mintData.signature });
        setShowMint(true);
      }
    } catch (err) {
      console.error("Mint failed:", err);
    }
    await delay(1500);
    setPhase(7, "done");
    scrollToBottom();

    // Phase 8: Complete
    setPhase(8, "done");
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const currentPhase = currentPhaseIdx >= 0 ? PHASES[currentPhaseIdx] : null;
  const isComplete = currentPhaseIdx === PHASES.length - 1;

  // ─── Pre-start Landing ───
  if (!started) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-[#050510] flex items-center justify-center p-8 relative overflow-hidden">
          <div className="ambient-glow bg-indigo-600/30 top-1/4 -left-20" />
          <div className="ambient-glow bg-purple-600/20 bottom-1/4 -right-20" />
          <div className="ambient-glow bg-pink-600/15 top-1/2 left-1/2" />

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-2xl w-full text-center relative z-10"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 mb-8"
            >
              <span className="text-amber-400 text-sm">🏆</span>
              <span className="text-xs font-semibold text-amber-400">Judge Demo Mode</span>
            </motion.div>

            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 tracking-tight">
              One Click.<br />
              <span className="gradient-text">Full Experience.</span>
            </h1>

            <p className="text-gray-400 text-lg mb-4 max-w-lg mx-auto">
              Watch MintTales run the complete pipeline automatically — from AI story generation to blockchain NFT minting.
            </p>

            {/* Tech stack involved */}
            <div className="flex items-center justify-center gap-2 flex-wrap mb-10">
              {["Gemini AI", "MongoDB", "ElevenLabs", "Fetch.ai (5 Agents)", "LTX Video", "Solana"].map((t) => (
                <span key={t} className="text-[11px] text-gray-500 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.06]">
                  {t}
                </span>
              ))}
            </div>

            {/* Pipeline preview */}
            <div className="flex items-center justify-center gap-1 mb-10 flex-wrap">
              {PHASES.slice(1, -1).map((p, i) => (
                <div key={p.id} className="flex items-center gap-1">
                  <span className="text-xs bg-white/[0.04] px-2.5 py-1.5 rounded-lg border border-white/[0.06] text-gray-500">
                    {p.icon} {p.label}
                  </span>
                  {i < PHASES.length - 3 && <span className="text-gray-700 text-[10px]">→</span>}
                </div>
              ))}
            </div>

            {/* Launch button */}
            <motion.button
              whileHover={{ scale: 1.05, y: -3 }}
              whileTap={{ scale: 0.97 }}
              onClick={runDemo}
              className="relative px-10 py-5 rounded-2xl text-lg font-bold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 shadow-2xl shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-300 group"
            >
              <span className="relative z-10 flex items-center gap-3">
                <span className="text-2xl group-hover:animate-bounce">▶</span>
                Launch Demo
              </span>
              {/* Shine effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 animate-shimmer" />
            </motion.button>

            <p className="text-gray-700 text-xs mt-4">
              Takes ~45-60 seconds • Fully automated • All APIs called live
            </p>
          </motion.div>
        </div>
      </>
    );
  }

  // ─── Running Demo ───
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#050510] pt-24 pb-16 relative">
        <div className="ambient-glow bg-indigo-600/15 -top-20 left-1/3" />

        {/* ─── Top: Status Bar ─── */}
        <div className="fixed top-16 left-0 right-0 z-40">
          <div className="max-w-5xl mx-auto px-6 pt-3">
            <div className="glass-strong rounded-2xl px-5 py-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 text-sm">🏆</span>
                  <span className="text-white font-bold text-sm">Judge Demo</span>
                  {currentPhase && !isComplete && (
                    <span className="text-gray-500 text-xs">
                      — {currentPhase.icon} {currentPhase.description}
                    </span>
                  )}
                  {isComplete && (
                    <span className="text-emerald-400 text-xs font-semibold">
                      — ✓ Complete in {elapsed}s
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-gray-500 font-mono bg-white/[0.04] px-2.5 py-1 rounded-full">
                  {elapsed}s
                </span>
              </div>

              {/* Phase dots */}
              <div className="flex items-center gap-1">
                {PHASES.map((p, i) => {
                  const status = phaseStatus[p.id] || "waiting";
                  return (
                    <div key={p.id} className="flex items-center flex-1">
                      <div
                        className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                          status === "done"
                            ? "bg-gradient-to-r from-indigo-500 to-purple-500"
                            : status === "running"
                            ? "bg-amber-500/60 animate-pulse"
                            : "bg-white/[0.06]"
                        }`}
                      />
                      {i < PHASES.length - 1 && <div className="w-0.5" />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Main Content ─── */}
        <div className="max-w-4xl mx-auto px-6 pt-20 space-y-6" ref={contentRef}>
          {/* Phase Cards showing what's happening */}
          <AnimatePresence>
            {/* Genre Selection */}
            {currentPhaseIdx >= 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-2xl p-5"
              >
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/15 flex items-center justify-center text-lg">
                    🐉
                  </span>
                  <div>
                    <h3 className="text-white font-bold text-sm">Genre: Fantasy</h3>
                    <p className="text-gray-500 text-xs">Dragons, magic, and epic quests</p>
                  </div>
                  <span className="ml-auto text-emerald-400 text-sm">✓</span>
                </div>
              </motion.div>
            )}

            {/* Story Generation */}
            {currentPhaseIdx >= 2 && story && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-2xl p-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm">✦</span>
                  <h3 className="text-white font-bold text-sm">AI-Generated Story</h3>
                  <span className="text-[10px] text-gray-600 bg-white/[0.04] px-2 py-0.5 rounded-full ml-auto">
                    Gemini 2.5 Flash
                  </span>
                  {phaseStatus["story"] === "done" && (
                    <span className="text-emerald-400 text-sm">✓</span>
                  )}
                </div>
                <div className="prose-premium whitespace-pre-wrap max-h-[300px] overflow-y-auto text-sm">
                  {story}
                  {phaseStatus["story"] === "running" && (
                    <span className="inline-block w-2 h-4 bg-indigo-400 animate-pulse ml-0.5" />
                  )}
                </div>
              </motion.div>
            )}

            {/* MongoDB Save */}
            {phaseStatus["save"] === "done" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-xl p-4 flex items-center gap-3"
              >
                <span className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-sm">🗄️</span>
                <div className="flex-1">
                  <span className="text-white text-sm font-semibold">Saved to MongoDB Atlas</span>
                  <span className="text-gray-600 text-xs ml-2 font-mono">ID: {storyId?.slice(0, 12)}...</span>
                </div>
                <span className="text-emerald-400 text-sm">✓</span>
              </motion.div>
            )}

            {/* Audio Player */}
            {showAudio && audioUrl && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-2xl p-5"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm">🎙️</span>
                  <h3 className="text-white font-bold text-sm">Voice Narration</h3>
                  <span className="text-[10px] text-gray-600 bg-white/[0.04] px-2 py-0.5 rounded-full ml-auto">
                    ElevenLabs
                  </span>
                  <span className="text-emerald-400 text-sm">✓</span>
                </div>
                <AudioPlayer audioUrl={audioUrl} story={story} />
              </motion.div>
            )}

            {/* Agent Network */}
            {showAgents && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <AgentNetwork story={story} genre={DEMO_GENRE} />
              </motion.div>
            )}

            {/* Video Scenes */}
            {showVideo && videoScenes.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-2xl p-5"
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm">🎬</span>
                  <h3 className="text-white font-bold text-sm">
                    AI Video — {videoScenes.length} Scenes
                  </h3>
                  <span className="text-[10px] text-gray-600 bg-white/[0.04] px-2 py-0.5 rounded-full ml-auto">
                    LTX Video AI
                  </span>
                  <span className="text-emerald-400 text-sm">✓</span>
                </div>
                <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(videoScenes.length, 3)}, 1fr)` }}>
                  {videoScenes.map((scene, i) => (
                    <div key={i} className="rounded-xl overflow-hidden bg-black/40 aspect-video">
                      <video
                        src={scene.videoUrl}
                        controls
                        autoPlay={i === 0}
                        muted
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* NFT Mint Result */}
            {showMint && mintResult && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="glass rounded-2xl p-6"
                style={{ borderColor: "rgba(34, 197, 94, 0.2)", borderWidth: 1 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-green-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300 }}
                      className="text-xl"
                    >
                      ⟁
                    </motion.span>
                  </div>
                  <div>
                    <h3 className="text-emerald-400 font-bold text-base">Minted on Solana</h3>
                    <p className="text-gray-500 text-xs">Story NFT is now on the blockchain</p>
                  </div>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-4 mb-4 font-mono text-[11px] text-gray-500 break-all">
                  <span className="text-gray-600">Signature: </span>
                  {mintResult.signature}
                </div>
                <a
                  href={mintResult.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm font-semibold transition-colors group"
                >
                  View on Solana Explorer
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </a>
              </motion.div>
            )}

            {/* Completion Card */}
            {isComplete && (
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-2xl p-8 text-center bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-white/[0.08]"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                  className="text-5xl mb-4"
                >
                  🏆
                </motion.div>
                <h2 className="text-2xl font-bold text-white mb-2">Demo Complete</h2>
                <p className="text-gray-400 text-sm mb-6">
                  Full pipeline executed in <span className="text-white font-bold">{elapsed} seconds</span>
                </p>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  {[
                    { label: "Gemini AI", color: "text-blue-400", icon: "✦" },
                    { label: "MongoDB", color: "text-emerald-400", icon: "🗄️" },
                    { label: "ElevenLabs", color: "text-purple-400", icon: "🎙️" },
                    { label: "Fetch.ai", color: "text-amber-400", icon: "🌐" },
                    { label: "LTX Video", color: "text-pink-400", icon: "🎬" },
                    { label: "Solana", color: "text-indigo-400", icon: "⟁" },
                  ].map((tech) => (
                    <span
                      key={tech.label}
                      className={`${tech.color} text-xs font-semibold px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center gap-1.5`}
                    >
                      <span>{tech.icon}</span> {tech.label} ✓
                    </span>
                  ))}
                </div>
                <div className="mt-6 pt-6 border-t border-white/[0.06]">
                  <p className="text-gray-600 text-xs">
                    Built by Aarsh Sharma for Glitch 2026 • All 6 sponsor technologies integrated
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Spacer */}
          <div className="h-20" />
        </div>
      </div>
    </>
  );
}
