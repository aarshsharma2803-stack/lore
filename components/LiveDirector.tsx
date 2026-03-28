"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createDirectorClient, GeminiLiveClient } from "@/lib/gemini-live";
import { VeoTrack } from "./GenerationProgress";

interface LiveDirectorProps {
  isActive: boolean;
  videos: VeoTrack[];
  sceneDescriptions: string[];
  apiKey: string;
}

export default function LiveDirector({ isActive, videos, sceneDescriptions, apiKey }: LiveDirectorProps) {
  const [lines, setLines] = useState<{ id: number; text: string }[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const clientRef = useRef<GeminiLiveClient | null>(null);
  const lastStatusRef = useRef<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastUpdateTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!isActive || !apiKey) return;

    const client = createDirectorClient({
      onText: (text) => {
        setLines(prev => {
          const now = Date.now();
          const last = prev[prev.length - 1];
          // Append to last line if recent (streaming), else new line
          if (last && now - last.id < 3000) {
            return [...prev.slice(0, -1), { ...last, text: last.text + text }];
          }
          return [...prev, { id: now, text }];
        });
      },
      onReady: () => {
        setIsConnected(true);
        client.send("The film pipeline has started! We have 3 cinematic scenes to generate. Get ready!");
      },
    });

    client.connect(apiKey);
    clientRef.current = client;
    return () => { client.close(); clientRef.current = null; setIsConnected(false); };
  }, [isActive, apiKey]);

  // Send status updates when Veo jobs change (throttled)
  useEffect(() => {
    if (!isConnected || !clientRef.current) return;
    const now = Date.now();
    if (now - lastUpdateTimeRef.current < 5000) return; // throttle to 5s

    videos.forEach((video, i) => {
      const key = `${i}-${video.status}`;
      if (key === lastStatusRef.current) return;
      lastStatusRef.current = key;
      lastUpdateTimeRef.current = now;
      const desc = sceneDescriptions[i] ?? `Scene ${i + 1}`;
      if (video.status === "loading" && video.percent === 0) {
        clientRef.current!.send(`Scene ${i + 1} is now rendering! Visual: "${desc.slice(0, 100)}"`);
      } else if (video.status === "done") {
        clientRef.current!.send(`Scene ${i + 1} is complete! ${i < 2 ? `Moving to scene ${i + 2}.` : "All scenes done — final cut ready!"}`);
      }
    });
  }, [videos, isConnected, sceneDescriptions]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [lines]);

  if (!isActive) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="surface p-5 mb-6" style={{ border: "1px solid var(--genre-glow)" }}>
      <div className="flex items-center gap-2.5 mb-4">
        <span className="text-sm">🎬</span>
        <span className="text-[13px] font-medium text-[var(--text-primary)]">AI Director</span>
        <div className={`ml-auto w-2 h-2 rounded-full ${isConnected ? "bg-emerald-400 animate-pulse" : "bg-[var(--text-quaternary)]"}`} />
        <span className="text-[10px] text-[var(--text-quaternary)]">{isConnected ? "live" : "connecting…"}</span>
      </div>
      <div ref={scrollRef} className="space-y-3 max-h-36 overflow-y-auto">
        <AnimatePresence initial={false}>
          {lines.map(line => (
            <motion.p key={line.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="text-[12px] text-[var(--text-secondary)] leading-relaxed border-l-2 pl-3" style={{ borderColor: "var(--genre-primary)" }}>
              {line.text}
            </motion.p>
          ))}
        </AnimatePresence>
        {lines.length === 0 && isConnected && (
          <p className="text-[11px] text-[var(--text-quaternary)] italic">Director is watching the generation…</p>
        )}
      </div>
    </motion.div>
  );
}
