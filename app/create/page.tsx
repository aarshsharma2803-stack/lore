"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GeminiChat from "@/components/GeminiChat";
import CinematicPlayer, { CinematicScene } from "@/components/CinematicPlayer";
import GenerationProgress, { TrackStatus, VeoTrack } from "@/components/GenerationProgress";
import LiveDirector from "@/components/LiveDirector";
import MintButton from "@/components/MintButton";
import SceneNFTSelector from "@/components/SceneNFTSelector";
import AgentNetwork from "@/components/AgentNetwork";
import Navbar from "@/components/Navbar";
import { Genre } from "@/lib/gemini";
import type { LyriaPlayer } from "@/lib/lyria";

interface Scene {
  sceneNumber: number;
  text: string;
  visual: string;
  imageUrl: string;
  wordCount: number;
}

const cleanMarkdown = (text: string) =>
  text.replace(/#{1,6}\s*/g, "").replace(/\*{1,3}(.*?)\*{1,3}/g, "$1").trim();

const genreVoiceMap: Record<string, string> = {
  fantasy: "narrator",
  "sci-fi": "calm",
  scifi: "calm",
  horror: "villain",
  comedy: "comedy",
  romance: "calm",
};

export default function CreatePage() {
  // ── Existing state ──
  const [completedStory, setCompletedStory] = useState<string | null>(null);
  const [storyGenre, setStoryGenre] = useState<Genre>("fantasy");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [isNarrating, setIsNarrating] = useState(false);
  const [pipelinePhase, setPipelinePhase] = useState<"idle" | "narrating" | "ready">("idle");
  const [showFullStory, setShowFullStory] = useState(true);
  const [showAgentNetwork, setShowAgentNetwork] = useState(false);
  const [storyId, setStoryId] = useState<string | null>(null);

  // ── Veo + Live Director state ──
  const [veoJobs, setVeoJobs] = useState<{ operationName: string; sceneIndex: number }[]>([]);
  const [videoTracks, setVideoTracks] = useState<VeoTrack[]>([
    { label: "Video scene 1", status: "idle", percent: 0 },
    { label: "Video scene 2", status: "idle", percent: 0 },
    { label: "Video scene 3", status: "idle", percent: 0 },
  ]);
  const [videoResults, setVideoResults] = useState<(string | undefined)[]>([undefined, undefined, undefined]);
  const [sceneDescriptions, setSceneDescriptions] = useState<string[]>([]);
  const [imageTrack, setImageTrack] = useState<TrackStatus>("idle");
  const [narrationTrack, setNarrationTrack] = useState<TrackStatus>("idle");
  const [musicTrack, setMusicTrack] = useState<TrackStatus>("idle");
  const [showDirector, setShowDirector] = useState(false);
  const [uniquenessStatus, setUniquenessStatus] = useState<"checking" | "clear" | "adjusted" | null>(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);

  const playerRef = useRef<HTMLDivElement>(null);
  const agentRef = useRef<HTMLDivElement>(null);
  const veoPollerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lyriaRef = useRef<LyriaPlayer | null>(null);

  // ── Mood-reactive UI ──
  useEffect(() => {
    const genreClass = `genre-${storyGenre}`;
    Array.from(document.body.classList)
      .filter(cls => cls.startsWith("genre-"))
      .forEach(cls => document.body.classList.remove(cls));
    document.body.classList.add(genreClass);
    return () => document.body.classList.remove(genreClass);
  }, [storyGenre]);

  // ── Auto-scroll to player ──
  useEffect(() => {
    if (pipelinePhase === "ready" && audioUrl && scenes.length > 0) {
      setShowFullStory(false);
      setTimeout(() => {
        playerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    }
  }, [pipelinePhase, audioUrl, scenes]);

  // ── Cleanup Lyria on unmount ──
  useEffect(() => {
    return () => {
      lyriaRef.current?.stop();
    };
  }, []);

  // ── Save story to MongoDB ──
  const handleStoryComplete = async (story: string, genre: Genre) => {
    setCompletedStory(story);
    setStoryGenre(genre);
    try {
      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: story.split("\n")[0].replace(/[#*]/g, "").trim().slice(0, 120),
          content: story,
          genre,
        }),
      });
      const data = await res.json();
      if (data.id) setStoryId(data.id);
    } catch (e) {
      console.error("Failed to save story:", e);
    }
  };

  // ── Veo polling ──
  const startVeoPolling = (jobs: { operationName: string; sceneIndex: number }[]) => {
    if (veoPollerRef.current) clearInterval(veoPollerRef.current);
    const doneSet = new Set<number>();

    veoPollerRef.current = setInterval(async () => {
      if (doneSet.size >= jobs.length) {
        clearInterval(veoPollerRef.current!);
        return;
      }
      for (const job of jobs) {
        if (doneSet.has(job.sceneIndex)) continue;
        try {
          const res = await fetch("/api/veo/status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ operationName: job.operationName }),
          });
          const data = await res.json();

          if (data.done && !data.error) {
            doneSet.add(job.sceneIndex);
            setVideoTracks(prev => {
              const next = [...prev];
              next[job.sceneIndex] = { ...next[job.sceneIndex], status: "done", percent: 100 };
              return next;
            });
            if (data.videoBase64) {
              setVideoResults(prev => {
                const next = [...prev];
                next[job.sceneIndex] = data.videoBase64;
                return next;
              });
            }
          } else if (data.error) {
            doneSet.add(job.sceneIndex);
            setVideoTracks(prev => {
              const next = [...prev];
              next[job.sceneIndex] = { ...next[job.sceneIndex], status: "error", percent: 0 };
              return next;
            });
          } else {
            setVideoTracks(prev => {
              const next = [...prev];
              const cur = next[job.sceneIndex];
              if (cur.status !== "done" && cur.status !== "error") {
                next[job.sceneIndex] = {
                  ...cur,
                  status: "loading",
                  percent: Math.min(88, (cur.percent ?? 0) + 7),
                };
              }
              return next;
            });
          }
        } catch (e) {
          console.error(`Veo poll error scene ${job.sceneIndex}:`, e);
        }
      }
    }, 10000);
  };

  // ── Start Lyria music stream ──
  const lyriaModuleRef = useRef<Promise<typeof import("@/lib/lyria")> | null>(null);

  const startLyria = async (genre: string) => {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) return;

    try {
      const mod = lyriaModuleRef.current
        ? await lyriaModuleRef.current
        : await import("@/lib/lyria");
      const player = new mod.LyriaPlayer();
      lyriaRef.current = player;

      player.onStateChange = (state) => {
        if (state === "streaming") setMusicTrack("streaming" as TrackStatus);
        else if (state === "stopped" || state === "error") setMusicTrack(state === "error" ? "error" : "done" as TrackStatus);
      };

      // Connect silently — no "loading" indicator; music just starts playing
      player.connect(apiKey, genre);
    } catch (e) {
      console.error("Lyria start error:", e);
      setMusicTrack("error" as TrackStatus);
    }
  };

  // ── Main pipeline ──
  const handleNarrate = async () => {
    if (!completedStory) return;
    setIsNarrating(true);
    setPipelinePhase("narrating");
    setImageTrack("loading");
    setNarrationTrack("loading");
    setVideoTracks([
      { label: "Video scene 1", status: "loading", percent: 0 },
      { label: "Video scene 2", status: "idle", percent: 0 },
      { label: "Video scene 3", status: "idle", percent: 0 },
    ]);

    // Pre-load Lyria module in parallel so music starts instantly later
    lyriaModuleRef.current = import("@/lib/lyria");

    try {
      const [narrationRes, scenesRes] = await Promise.all([
        fetch("/api/narrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: cleanMarkdown(completedStory).slice(0, 5000),
            voice: genreVoiceMap[storyGenre] || "narrator",
            genre: storyGenre,
          }),
        }),
        fetch("/api/scenes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: completedStory, genre: storyGenre }),
        }),
      ]);

      if (narrationRes.ok) {
        const blob = await narrationRes.blob();
        setAudioUrl(URL.createObjectURL(blob));
        setNarrationTrack("done");
      } else {
        setNarrationTrack("error" as TrackStatus);
      }

      let imagesReady = false;
      if (scenesRes.ok) {
        const scenesData = await scenesRes.json();
        if (scenesData.scenes?.length > 0) {
          setScenes(scenesData.scenes);
          setImageTrack("done");
          imagesReady = true;
        }
      } else {
        setImageTrack("error" as TrackStatus);
      }

      // Lyria music is started manually via the Score button in CinematicPlayer

      // Trigger Veo (non-blocking)
      fetch("/api/veo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: completedStory, genre: storyGenre }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.jobs?.length > 0) {
            setVeoJobs(data.jobs);
            setSceneDescriptions(data.scenePrompts ?? []);
            setShowDirector(true);
            setVideoTracks([
              { label: "Video scene 1", status: "loading", percent: 5 },
              { label: "Video scene 2", status: "loading", percent: 0 },
              { label: "Video scene 3", status: "loading", percent: 0 },
            ]);
            startVeoPolling(data.jobs);
          } else {
            setVideoTracks(prev => prev.map(v => ({ ...v, status: "error" as TrackStatus })));
          }
        })
        .catch(e => {
          console.error("Veo trigger failed:", e);
          setVideoTracks(prev => prev.map(v => ({ ...v, status: "error" as TrackStatus })));
        });

      setPipelinePhase("ready");
    } catch (error) {
      console.error("Pipeline error:", error);
      setPipelinePhase("idle");
    } finally {
      setIsNarrating(false);
    }
  };

  // ── Music toggle ──
  const handleMusicToggle = async () => {
    if (isMusicPlaying) {
      lyriaRef.current?.stop();
      lyriaRef.current = null;
      setIsMusicPlaying(false);
    } else {
      await startLyria(storyGenre);
      setIsMusicPlaying(true);
    }
  };

  // ── Reset everything ──
  const handleReset = () => {
    if (veoPollerRef.current) clearInterval(veoPollerRef.current);
    lyriaRef.current?.stop();
    lyriaRef.current = null;
    setCompletedStory(null);
    setAudioUrl(null);
    setScenes([]);
    setPipelinePhase("idle");
    setShowFullStory(true);
    setShowAgentNetwork(false);
    setStoryId(null);
    setVeoJobs([]);
    setVideoResults([undefined, undefined, undefined]);
    setVideoTracks([
      { label: "Video scene 1", status: "idle", percent: 0 },
      { label: "Video scene 2", status: "idle", percent: 0 },
      { label: "Video scene 3", status: "idle", percent: 0 },
    ]);
    setSceneDescriptions([]);
    setShowDirector(false);
    setImageTrack("idle");
    setNarrationTrack("idle");
    setMusicTrack("idle");
    setUniquenessStatus(null);
    setIsMusicPlaying(false);
  };

  // ── Build cinematic scenes for player ──
  const cinematicScenes: CinematicScene[] = scenes.map((s, i) => ({
    imageUrl: s.imageUrl,
    videoBase64: videoResults[i],
    mimeType: "video/mp4",
  }));

  const storyTitle = completedStory
    ? completedStory.split("\n")[0].replace(/[#*]/g, "").trim().slice(0, 60)
    : "Untitled Story";

  // ─────────────────────────────────────────
  // COMPLETED STORY VIEW
  // ─────────────────────────────────────────
  if (completedStory) {
    const isPlayerReady = audioUrl && scenes.length > 0;

    return (
      <>
        <Navbar />
        <div className="genre-ambient-dot" aria-hidden="true" />
        <div className="min-h-screen bg-[var(--bg-primary)] pt-24 px-6 pb-16">
          <div className="max-w-3xl mx-auto">

            {/* Header */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-8">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-[8px] bg-[var(--mint-muted)] border border-[rgba(52,211,153,0.15)] flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--mint)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <div>
                  <h1 className="text-[18px] font-semibold text-[var(--text-primary)]">
                    {isPlayerReady ? "Cinematic experience ready" : "Story complete"}
                  </h1>
                  <p className="text-[12px] text-[var(--text-tertiary)]">
                    {isPlayerReady ? "Press play to watch your narrated story" : "Narrate & generate scenes, then mint on Solana"}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* ── CinematicPlayer ── */}
            <AnimatePresence>
              {isPlayerReady && (
                <motion.div
                  ref={playerRef}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                >
                  <CinematicPlayer
                    scenes={cinematicScenes}
                    audioUrl={audioUrl}
                    lyriaRef={lyriaRef}
                    storyTitle={storyTitle}
                    onMusicToggle={handleMusicToggle}
                    isMusicPlaying={isMusicPlaying}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Audio-only fallback */}
            {pipelinePhase === "ready" && audioUrl && scenes.length === 0 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="surface p-5 mb-6">
                <audio controls src={audioUrl} className="w-full" />
              </motion.div>
            )}

            {/* ── Scene NFT Selector (shown when scenes are ready) ── */}
            <AnimatePresence>
              {isPlayerReady && scenes.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}>
                  <SceneNFTSelector
                    scenes={scenes}
                    storyId={storyId || ""}
                    genre={storyGenre}
                    storyTitle={storyTitle}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Generation Progress (5 tracks) ── */}
            <AnimatePresence>
              {(isNarrating || pipelinePhase === "ready") && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <GenerationProgress
                    images={imageTrack}
                    narration={narrationTrack}
                    music={musicTrack}
                    videos={videoTracks}
                    uniquenessStatus={uniquenessStatus}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Live AI Director ── */}
            <LiveDirector
              isActive={showDirector}
              videos={videoTracks}
              sceneDescriptions={sceneDescriptions}
              apiKey={process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? ""}
            />

            {/* ── Story text (collapsible) ── */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }} className="surface mb-6 overflow-hidden">
              {isPlayerReady ? (
                <>
                  <button onClick={() => setShowFullStory(!showFullStory)} className="w-full flex items-center justify-between p-5 hover:bg-[var(--bg-elevated)] transition-colors">
                    <div className="flex items-center gap-2.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-quaternary)" strokeWidth="1.5">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                      <span className="text-[13px] font-medium text-[var(--text-secondary)]">Story text</span>
                    </div>
                    <motion.svg animate={{ rotate: showFullStory ? 180 : 0 }} transition={{ duration: 0.2 }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-quaternary)" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9"/>
                    </motion.svg>
                  </button>
                  <AnimatePresence>
                    {showFullStory && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }}>
                        <div className="px-8 pb-8 prose-story whitespace-pre-wrap">{cleanMarkdown(completedStory)}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                <div className="p-8 prose-story whitespace-pre-wrap">{cleanMarkdown(completedStory)}</div>
              )}
            </motion.div>

            {/* ── Action buttons ── */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }} className="flex flex-wrap gap-2 mb-6">
              {!isPlayerReady && (
                <button onClick={handleNarrate} disabled={isNarrating} className="btn-primary disabled:opacity-30">
                  {isNarrating ? (
                    <><div className="spinner" />Building cinematic experience…</>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                      </svg>
                      Narrate &amp; Generate Film
                    </>
                  )}
                </button>
              )}
              <button onClick={handleReset} className="btn-secondary">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
                </svg>
                Back to editor
              </button>
              <MintButton
                storyId={storyId || ""}
                title={storyTitle}
                genre={storyGenre}
                content={completedStory}
              />
              {!showAgentNetwork && (
                <button
                  onClick={() => {
                    setShowAgentNetwork(true);
                    setTimeout(() => agentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 300);
                  }}
                  className="btn-secondary"
                >
                  <span className="text-sm">🤖</span>
                  Analyze with AI Agents
                </button>
              )}
            </motion.div>

            {/* ── Fetch.ai Agent Network ── */}
            <AnimatePresence>
              {showAgentNetwork && completedStory && (
                <motion.div ref={agentRef} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-6">
                  <AgentNetwork story={completedStory} genre={storyGenre} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Global AI assistant is rendered in layout.tsx */}
      </>
    );
  }

  // ─────────────────────────────────────────
  // STORY CREATION VIEW
  // ─────────────────────────────────────────
  return (
    <>
      <div className="genre-ambient-dot" aria-hidden="true" />
      <GeminiChat onStoryComplete={handleStoryComplete} />
    </>
  );
}
