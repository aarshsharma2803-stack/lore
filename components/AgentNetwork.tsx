"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types matching lib/fetchai-agent.ts ───
interface ProtocolMessage {
  from: string;
  to?: string;
  type: string;
  content: string;
  timestamp: number;
}

interface FETTransaction {
  agent: string;
  amount: number;
  reason: string;
}

interface AnalysisData {
  scout: { totalStories: number; topGenre: string; trendingThemes: string[]; marketGap: string };
  critic: { rating: number; ratingLabel: string; mood: string; moodEmoji: string; themes: string[]; strengths: string[]; weakness: string };
  audience: { viralScore: number; targetAudience: string; emotionalImpact: string; shareability: string; predictedReaction: string };
  director: { cinematicScore: number; visualStyle: string; soundtrackMood: string; posterTagline: string; seriesPotential: string };
  valuation: { estimatedSOL: number; confidence: string; factors: string[]; recommendation: string };
  consensus: { overallScore: number; verdict: string; recommendation: string };
  protocolMessages: ProtocolMessage[];
  fetTransactions: FETTransaction[];
  agents: Record<string, { name: string; role: string; address: string; emoji: string; color: string; fetBalance: number }>;
}

const AGENT_ORDER = ["scout", "critic", "audience", "director", "valuation"] as const;

// Agent node positions (pentagon layout)
const NODE_POSITIONS = [
  { x: 50, y: 8 },   // scout (top center)
  { x: 15, y: 38 },  // critic (top left)
  { x: 85, y: 38 },  // audience (top right)
  { x: 25, y: 75 },  // director (bottom left)
  { x: 75, y: 75 },  // valuation (bottom right)
];

// Connection pairs for the network graph
const CONNECTIONS: [number, number][] = [
  [0, 1], // scout → critic
  [1, 2], // critic → audience
  [2, 3], // audience → director (cross)
  [3, 4], // director → valuation
  [0, 2], // scout → audience
  [1, 3], // critic → director
  [2, 4], // audience → valuation
  [4, 0], // valuation → scout (full loop)
];

const COLOR_MAP: Record<string, string> = {
  amber: "rgb(245, 158, 11)",
  indigo: "rgb(99, 102, 241)",
  emerald: "rgb(16, 185, 129)",
  purple: "rgb(168, 85, 247)",
  pink: "rgb(236, 72, 153)",
};

const BG_MAP: Record<string, string> = {
  amber: "rgba(245, 158, 11, 0.1)",
  indigo: "rgba(99, 102, 241, 0.1)",
  emerald: "rgba(16, 185, 129, 0.1)",
  purple: "rgba(168, 85, 247, 0.1)",
  pink: "rgba(236, 72, 153, 0.1)",
};

const BORDER_MAP: Record<string, string> = {
  amber: "rgba(245, 158, 11, 0.25)",
  indigo: "rgba(99, 102, 241, 0.25)",
  emerald: "rgba(16, 185, 129, 0.25)",
  purple: "rgba(168, 85, 247, 0.25)",
  pink: "rgba(236, 72, 153, 0.25)",
};

export default function AgentNetwork({
  story,
  genre,
}: {
  story: string;
  genre: string;
}) {
  const [phase, setPhase] = useState<"loading" | "animating" | "complete" | "error">("loading");
  const [data, setData] = useState<AnalysisData | null>(null);
  const [visibleMessages, setVisibleMessages] = useState<ProtocolMessage[]>([]);
  const [activeAgent, setActiveAgent] = useState<number>(-1);
  const [activeConnection, setActiveConnection] = useState<number>(-1);
  const [pipelineStep, setPipelineStep] = useState<number>(-1);
  const [showValuation, setShowValuation] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);
  const [animatedSOL, setAnimatedSOL] = useState(0);

  const runAnimation = useCallback((analysisData: AnalysisData) => {
    setPhase("animating");
    const msgs = analysisData.protocolMessages;

    msgs.forEach((msg, i) => {
      setTimeout(() => {
        setVisibleMessages((prev) => [...prev, msg]);

        // Activate the sending agent node
        const agentIdx = AGENT_ORDER.indexOf(msg.from as typeof AGENT_ORDER[number]);
        if (agentIdx >= 0) setActiveAgent(agentIdx);

        // Pipeline progress
        if (msg.type === "verdict" || msg.type === "scan") {
          setPipelineStep(agentIdx);
        }

        // Activate connection line on handoff
        if (msg.type === "handoff" && msg.to) {
          const fromIdx = AGENT_ORDER.indexOf(msg.from as typeof AGENT_ORDER[number]);
          const toIdx = AGENT_ORDER.indexOf(msg.to as typeof AGENT_ORDER[number]);
          const connIdx = CONNECTIONS.findIndex(
            ([a, b]) => (a === fromIdx && b === toIdx) || (a === toIdx && b === fromIdx)
          );
          if (connIdx >= 0) {
            setActiveConnection(connIdx);
            setTimeout(() => setActiveConnection(-1), 800);
          }
        }

        // Final consensus
        if (msg.type === "consensus") {
          setTimeout(() => {
            setShowValuation(true);
            // Animate SOL counter
            const target = analysisData.valuation.estimatedSOL;
            const steps = 30;
            for (let s = 0; s <= steps; s++) {
              setTimeout(() => {
                setAnimatedSOL(Math.round((target * s / steps) * 100) / 100);
              }, s * 30);
            }
            setTimeout(() => {
              setShowTransactions(true);
              setPhase("complete");
            }, 1200);
          }, 600);
        }
      }, msg.timestamp);
    });
  }, []);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const res = await fetch("/api/agent/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: story, genre }),
        });
        const result = await res.json();
        if (result.error) throw new Error(result.error);
        setData(result);
        runAnimation(result);
      } catch (err) {
        console.error("Agent analysis failed:", err);
        setPhase("error");
      }
    };
    fetchAnalysis();
  }, [story, genre, runAnimation]);

  if (phase === "error") {
    return (
      <div className="glass rounded-2xl p-6 text-center">
        <p className="text-red-400 text-sm">Agent network temporarily offline. Try again later.</p>
      </div>
    );
  }

  if (phase === "loading" && !data) {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <div className="spinner mx-auto mb-3" />
        <p className="text-gray-400 text-sm">Initializing Fetch.ai agent network...</p>
        <p className="text-gray-600 text-xs mt-1 font-mono">Connecting 5 autonomous agents</p>
      </div>
    );
  }

  const agents = data?.agents || {};

  return (
    <div className="space-y-4">
      {/* ─── Section Header ─── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🌐</span>
          <h3 className="text-white font-bold text-sm">Fetch.ai Agent Network</h3>
          <span className={`w-2 h-2 rounded-full ${phase === "complete" ? "bg-emerald-400" : "bg-amber-400 animate-pulse"}`} />
        </div>
        <span className="text-[10px] text-gray-600 font-mono bg-white/[0.03] px-2.5 py-1 rounded-full border border-white/[0.05]">
          {phase === "complete" ? "Consensus Reached" : "Agents Communicating..."}
        </span>
      </div>

      {/* ─── Section A: Network Graph ─── */}
      <div className="glass rounded-2xl p-6 relative overflow-hidden" style={{ minHeight: 320 }}>
        {/* Background grid effect */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }} />

        <div className="relative" style={{ height: 260 }}>
          {/* Connection lines (SVG) */}
          <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }}>
            {CONNECTIONS.map(([fromIdx, toIdx], i) => {
              const from = NODE_POSITIONS[fromIdx];
              const to = NODE_POSITIONS[toIdx];
              const isActive = activeConnection === i;
              return (
                <g key={i}>
                  <line
                    x1={`${from.x}%`} y1={`${from.y}%`}
                    x2={`${to.x}%`} y2={`${to.y}%`}
                    stroke={isActive ? "rgba(99, 102, 241, 0.6)" : "rgba(255,255,255,0.06)"}
                    strokeWidth={isActive ? 2 : 1}
                    strokeDasharray={isActive ? "none" : "4 4"}
                    style={{ transition: "all 0.5s ease" }}
                  />
                  {/* Animated dot traveling along active connection */}
                  {isActive && (
                    <circle r="3" fill="rgb(99, 102, 241)">
                      <animateMotion
                        dur="0.8s"
                        repeatCount="1"
                        path={`M ${from.x * 3.2} ${from.y * 2.6} L ${to.x * 3.2} ${to.y * 2.6}`}
                      />
                    </circle>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Agent Nodes */}
          {AGENT_ORDER.map((agentKey, i) => {
            const agent = agents[agentKey];
            if (!agent) return null;
            const pos = NODE_POSITIONS[i];
            const isActive = activeAgent >= i;
            const color = COLOR_MAP[agent.color] || "white";
            const bg = BG_MAP[agent.color] || "rgba(255,255,255,0.05)";
            const border = BORDER_MAP[agent.color] || "rgba(255,255,255,0.1)";

            return (
              <motion.div
                key={agentKey}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.15, type: "spring", stiffness: 200 }}
                className="absolute flex flex-col items-center"
                style={{
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  transform: "translate(-50%, -50%)",
                  zIndex: 10,
                }}
              >
                {/* Node circle */}
                <div
                  className="relative w-14 h-14 rounded-full flex items-center justify-center text-xl transition-all duration-500"
                  style={{
                    background: bg,
                    border: `2px solid ${isActive ? color : border}`,
                    boxShadow: isActive ? `0 0 20px ${bg}, 0 0 40px ${bg}` : "none",
                  }}
                >
                  {agent.emoji}
                  {/* Active pulse ring */}
                  {activeAgent === i && (
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      style={{ border: `2px solid ${color}` }}
                      initial={{ scale: 1, opacity: 0.8 }}
                      animate={{ scale: 1.8, opacity: 0 }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  )}
                </div>
                {/* Label */}
                <span className="text-[10px] font-bold mt-1.5" style={{ color: isActive ? color : "rgba(255,255,255,0.3)" }}>
                  {agent.name}
                </span>
                <span className="text-[8px] font-mono text-gray-700 max-w-[80px] truncate">
                  {agent.address.slice(0, 16)}...
                </span>
              </motion.div>
            );
          })}

          {/* Center label */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-0">
            <p className="text-[10px] text-gray-700 font-mono">FETCH.AI</p>
            <p className="text-[9px] text-gray-800 font-mono">NETWORK</p>
          </div>
        </div>
      </div>

      {/* ─── Section B: Pipeline Progress ─── */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs">⛓️</span>
          <h4 className="text-white font-semibold text-xs">Agent Pipeline</h4>
          <span className="text-[10px] text-gray-600 ml-auto">
            {pipelineStep >= 4 ? "5/5 Complete" : `${Math.max(0, pipelineStep + 1)}/5 Stages`}
          </span>
        </div>

        {/* Pipeline stages */}
        <div className="flex items-center gap-1">
          {AGENT_ORDER.map((agentKey, i) => {
            const agent = agents[agentKey];
            if (!agent) return null;
            const isDone = pipelineStep >= i;
            const isRunning = pipelineStep === i - 1 && activeAgent === i;
            const color = COLOR_MAP[agent.color];

            return (
              <div key={agentKey} className="flex items-center flex-1">
                <motion.div
                  className="flex-1 rounded-lg p-2.5 text-center transition-all duration-500 relative overflow-hidden"
                  style={{
                    background: isDone ? BG_MAP[agent.color] : "rgba(255,255,255,0.02)",
                    border: `1px solid ${isDone ? BORDER_MAP[agent.color] : "rgba(255,255,255,0.04)"}`,
                  }}
                  animate={isDone ? { scale: [1, 1.02, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  <span className="text-base block mb-0.5">{agent.emoji}</span>
                  <span className="text-[9px] font-medium block" style={{ color: isDone ? color : "rgba(255,255,255,0.3)" }}>
                    {agent.name.replace("Agent", "")}
                  </span>
                  <span className="text-[9px] block mt-0.5">
                    {isDone ? (
                      <span style={{ color }}>✓</span>
                    ) : isRunning ? (
                      <span className="text-amber-400">⏳</span>
                    ) : (
                      <span className="text-gray-700">○</span>
                    )}
                  </span>
                </motion.div>
                {i < 4 && (
                  <div className="w-3 flex items-center justify-center">
                    <motion.span
                      className="text-[8px]"
                      style={{ color: isDone ? color : "rgba(255,255,255,0.1)" }}
                      animate={isDone && pipelineStep === i ? { x: [0, 4, 0] } : {}}
                      transition={{ duration: 0.5 }}
                    >
                      →
                    </motion.span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1 bg-white/[0.04] rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 via-indigo-500 via-emerald-500 via-purple-500 to-pink-500"
            initial={{ width: "0%" }}
            animate={{ width: `${Math.min(100, ((pipelineStep + 1) / 5) * 100)}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* ─── Protocol Message Log ─── */}
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs">📡</span>
          <h4 className="text-white font-semibold text-xs">Protocol Messages</h4>
          <span className="text-[10px] text-gray-600 ml-auto font-mono">
            {visibleMessages.length} messages
          </span>
        </div>
        <div className="space-y-1 max-h-[160px] overflow-y-auto font-mono text-[11px]" id="protocol-log">
          <AnimatePresence>
            {visibleMessages.map((msg, i) => {
              const agent = agents[msg.from];
              const color = agent ? COLOR_MAP[agent.color] : "white";
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-start gap-2 py-1 border-b border-white/[0.03] last:border-0"
                >
                  <span className="text-[10px] shrink-0" style={{ color }}>
                    {msg.to && msg.to !== "network" ? `[${agent?.name} → ${agents[msg.to]?.name}]` : `[${agent?.name}]`}
                  </span>
                  <span className="text-gray-500">{msg.content}</span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* ─── Section C: Marketplace Valuation Card ─── */}
      <AnimatePresence>
        {showValuation && data && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="glass rounded-2xl overflow-hidden"
            style={{ border: "1px solid rgba(236, 72, 153, 0.15)" }}
          >
            {/* Header gradient */}
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border-b border-white/[0.05]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🏪</span>
                  <div>
                    <h4 className="text-white font-bold text-sm">Marketplace Valuation</h4>
                    <p className="text-gray-500 text-[10px] font-mono">Powered by ValuationAgent</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white">{animatedSOL}</span>
                    <span className="text-sm text-purple-400 font-semibold">SOL</span>
                  </div>
                  <span className="text-[10px] text-gray-500">Estimated NFT Value</span>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Consensus Score */}
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16">
                  <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                    <motion.circle
                      cx="32" cy="32" r="28" fill="none"
                      stroke="url(#scoreGradient)" strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={`${Math.PI * 56}`}
                      initial={{ strokeDashoffset: Math.PI * 56 }}
                      animate={{ strokeDashoffset: Math.PI * 56 * (1 - data.consensus.overallScore / 100) }}
                      transition={{ duration: 1, delay: 0.3 }}
                    />
                    <defs>
                      <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="rgb(99, 102, 241)" />
                        <stop offset="100%" stopColor="rgb(236, 72, 153)" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">
                    {data.consensus.overallScore}
                  </span>
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{data.consensus.verdict}</p>
                  <p className="text-gray-500 text-xs">{data.consensus.recommendation}</p>
                </div>
              </div>

              {/* Agent Verdicts Summary */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/[0.02] rounded-lg p-2.5 border border-white/[0.04]">
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-xs">🎭</span>
                    <span className="text-[10px] text-indigo-400 font-semibold">Critic</span>
                  </div>
                  <p className="text-white text-xs font-semibold">
                    {"★".repeat(data.critic.rating)}{"☆".repeat(5 - data.critic.rating)} {data.critic.ratingLabel}
                  </p>
                  <p className="text-gray-600 text-[10px]">{data.critic.moodEmoji} {data.critic.mood}</p>
                </div>
                <div className="bg-white/[0.02] rounded-lg p-2.5 border border-white/[0.04]">
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-xs">📊</span>
                    <span className="text-[10px] text-emerald-400 font-semibold">Audience</span>
                  </div>
                  <p className="text-white text-xs font-semibold">Viral: {data.audience.viralScore}/100</p>
                  <p className="text-gray-600 text-[10px]">{data.audience.predictedReaction}</p>
                </div>
                <div className="bg-white/[0.02] rounded-lg p-2.5 border border-white/[0.04]">
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-xs">🎬</span>
                    <span className="text-[10px] text-purple-400 font-semibold">Director</span>
                  </div>
                  <p className="text-white text-xs font-semibold">Cinematic: {data.director.cinematicScore}/10</p>
                  <p className="text-gray-600 text-[10px] italic">&ldquo;{data.director.posterTagline}&rdquo;</p>
                </div>
                <div className="bg-white/[0.02] rounded-lg p-2.5 border border-white/[0.04]">
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-xs">💰</span>
                    <span className="text-[10px] text-pink-400 font-semibold">Valuation</span>
                  </div>
                  <p className="text-white text-xs font-semibold">{data.valuation.estimatedSOL} SOL</p>
                  <p className="text-gray-600 text-[10px]">Confidence: {data.valuation.confidence}</p>
                </div>
              </div>

              {/* FET Transactions */}
              <AnimatePresence>
                {showTransactions && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    transition={{ duration: 0.4 }}
                  >
                    <div className="border-t border-white/[0.05] pt-3 mt-2">
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-[10px]">💎</span>
                        <span className="text-[10px] text-gray-400 font-semibold">FET Token Rewards</span>
                      </div>
                      <div className="space-y-1">
                        {data.fetTransactions.map((tx, i) => {
                          const agent = data.agents[tx.agent];
                          return (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.1 }}
                              className="flex items-center justify-between py-1"
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs">{agent?.emoji}</span>
                                <span className="text-[10px] text-gray-500">{agent?.name}</span>
                                <span className="text-[10px] text-gray-700">— {tx.reason}</span>
                              </div>
                              <span className="text-[10px] font-bold text-emerald-400">+{tx.amount} FET</span>
                            </motion.div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/[0.04]">
                        <span className="text-[10px] text-gray-500 font-mono">Total distributed</span>
                        <span className="text-xs font-bold text-emerald-400">
                          +{data.fetTransactions.reduce((s, t) => s + t.amount, 0)} FET
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
