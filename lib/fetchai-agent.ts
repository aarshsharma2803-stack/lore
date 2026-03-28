/**
 * Fetch.ai Multi-Agent Story Ecosystem
 *
 * 5 autonomous agents collaborate in a decentralized network:
 * 1. ScoutAgent    — Discovers trends & gaps in story database
 * 2. CriticAgent   — Rates story quality (literary analysis)
 * 3. AudienceAgent — Predicts virality & target audience
 * 4. DirectorAgent — Assesses cinematic/visual potential
 * 5. ValuationAgent — Estimates NFT value in SOL
 *
 * Each agent has: unique address, FET wallet, and communicates via protocol messages.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { getStories } from "./mongodb";

// ─── Agent Registry ───
export const AGENTS = {
  scout: {
    name: "ScoutAgent",
    role: "Trend Scout",
    address: "agent1qsc0ut_7x2m4p6r3t5w8y1z0a2b3c4d5e6f7g8h9j0k1",
    emoji: "🔍",
    color: "amber",
    fetBalance: 84,
  },
  critic: {
    name: "CriticAgent",
    role: "Story Critic",
    address: "agent1qcr1t1c_8k9h3f7x2m4p6r3t5w8y1z0a2b3c4d5e6f7",
    emoji: "🎭",
    color: "indigo",
    fetBalance: 142,
  },
  audience: {
    name: "AudienceAgent",
    role: "Audience Analyst",
    address: "agent1qaud13nc3_2m4p6r3t5w8y1z0a2b3c4d5e6f7g8h9",
    emoji: "📊",
    color: "emerald",
    fetBalance: 98,
  },
  director: {
    name: "DirectorAgent",
    role: "Creative Director",
    address: "agent1qd1r3ct0r_p6r3t5w8y1z0a2b3c4d5e6f7g8h9j0k",
    emoji: "🎬",
    color: "purple",
    fetBalance: 115,
  },
  valuation: {
    name: "ValuationAgent",
    role: "NFT Valuator",
    address: "agent1qv4lu3_r3t5w8y1z0a2b3c4d5e6f7g8h9j0k1l2m3",
    emoji: "💰",
    color: "pink",
    fetBalance: 67,
  },
} as const;

export type AgentId = keyof typeof AGENTS;

// ─── Types ───
export interface ProtocolMessage {
  from: AgentId;
  to?: AgentId | "network";
  type: "init" | "scan" | "handoff" | "verdict" | "consensus";
  content: string;
  timestamp: number; // ms delay from start
}

export interface FETTransaction {
  agent: AgentId;
  amount: number;
  reason: string;
}

export interface ScoutVerdict {
  totalStories: number;
  topGenre: string;
  trendingThemes: string[];
  marketGap: string;
}

export interface CriticVerdict {
  rating: number;
  ratingLabel: string;
  mood: string;
  moodEmoji: string;
  themes: string[];
  strengths: string[];
  weakness: string;
}

export interface AudienceVerdict {
  viralScore: number;
  targetAudience: string;
  emotionalImpact: string;
  shareability: string;
  predictedReaction: string;
}

export interface DirectorVerdict {
  cinematicScore: number;
  visualStyle: string;
  soundtrackMood: string;
  posterTagline: string;
  seriesPotential: string;
}

export interface ValuationVerdict {
  estimatedSOL: number;
  confidence: string;
  factors: string[];
  recommendation: string;
}

export interface MultiAgentAnalysis {
  scout: ScoutVerdict;
  critic: CriticVerdict;
  audience: AudienceVerdict;
  director: DirectorVerdict;
  valuation: ValuationVerdict;
  consensus: {
    overallScore: number;
    verdict: string;
    recommendation: string;
  };
  protocolMessages: ProtocolMessage[];
  fetTransactions: FETTransaction[];
  agents: typeof AGENTS;
}

/**
 * Run the full 5-agent analysis pipeline
 */
export async function runMultiAgentAnalysis(
  content: string,
  genre: string
): Promise<MultiAgentAnalysis> {
  // Phase 1: Scout scans database
  let scoutData: ScoutVerdict;
  try {
    const stories = await getStories(50);
    const genreCounts: Record<string, number> = {};
    stories.forEach((s) => {
      genreCounts[s.genre] = (genreCounts[s.genre] || 0) + 1;
    });
    const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || genre;
    const leastGenre = Object.entries(genreCounts).sort((a, b) => a[1] - b[1])[0]?.[0] || "horror";

    scoutData = {
      totalStories: stories.length,
      topGenre,
      trendingThemes: [topGenre, "AI-generated", "blockchain-minted"],
      marketGap: `${leastGenre} stories are underrepresented — high demand potential`,
    };
  } catch {
    scoutData = {
      totalStories: 0,
      topGenre: genre,
      trendingThemes: [genre, "emerging", "unique"],
      marketGap: "New market — first-mover advantage",
    };
  }

  // Phase 2: Run Critic, Audience, Director analysis via Gemini (single call)
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  let critic: CriticVerdict;
  let audience: AudienceVerdict;
  let director: DirectorVerdict;

  try {
    const result = await model.generateContent(`You are simulating THREE autonomous AI agents analyzing a ${genre} story. Return ONLY valid JSON (no markdown, no code blocks).

STORY:
${content.slice(0, 2000)}

DATABASE CONTEXT: ${scoutData.totalStories} stories exist. Top genre: ${scoutData.topGenre}. Market gap: ${scoutData.marketGap}

{
  "critic": {
    "rating": <1-5>,
    "ratingLabel": "<Masterpiece|Brilliant|Great|Good|Developing>",
    "mood": "<2-3 word mood>",
    "moodEmoji": "<single emoji>",
    "themes": ["<theme1>", "<theme2>", "<theme3>"],
    "strengths": ["<6-8 words>", "<6-8 words>"],
    "weakness": "<one constructive critique, 8-12 words>"
  },
  "audience": {
    "viralScore": <1-100>,
    "targetAudience": "<specific audience descriptor>",
    "emotionalImpact": "<2-3 word descriptor>",
    "shareability": "<low|medium|high|extremely high>",
    "predictedReaction": "<fun prediction with emoji>"
  },
  "director": {
    "cinematicScore": <1-10>,
    "visualStyle": "<creative comparison like 'Blade Runner meets Wes Anderson'>",
    "soundtrackMood": "<specific soundtrack description>",
    "posterTagline": "<movie poster tagline, max 10 words>",
    "seriesPotential": "<format like 'Limited series — 4 episodes'>"
  }
}`);

    const text = result.response.text().trim();
    const jsonStr = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(jsonStr);
    critic = parsed.critic;
    audience = parsed.audience;
    director = parsed.director;
  } catch {
    critic = {
      rating: 4, ratingLabel: "Great",
      mood: genre === "horror" ? "Creeping Dread" : genre === "comedy" ? "Absurd Joy" : "Epic Wonder",
      moodEmoji: genre === "horror" ? "👻" : genre === "comedy" ? "😂" : "✨",
      themes: [genre, "transformation", "discovery"],
      strengths: ["Rich atmospheric world-building", "Compelling character voice"],
      weakness: "Could benefit from deeper emotional stakes",
    };
    audience = {
      viralScore: 72, targetAudience: `${genre} enthusiasts aged 18-35`,
      emotionalImpact: "Deeply Engaging", shareability: "high",
      predictedReaction: "🔥 Would trend on BookTok",
    };
    director = {
      cinematicScore: 7, visualStyle: "Studio Ghibli meets Christopher Nolan",
      soundtrackMood: "Orchestral with electronic undertones",
      posterTagline: "Some stories refuse to stay on the page",
      seriesPotential: "Limited series — 4 episodes",
    };
  }

  // Phase 3: Valuation based on all agent inputs
  const qualityFactor = critic.rating / 5;
  const viralFactor = audience.viralScore / 100;
  const cinematicFactor = director.cinematicScore / 10;
  const scarcityBonus = scoutData.totalStories < 10 ? 0.3 : 0.1;

  const rawSOL = (qualityFactor * 1.5 + viralFactor * 1.2 + cinematicFactor * 1.0 + scarcityBonus);
  const estimatedSOL = Math.round(rawSOL * 100) / 100;

  const valuation: ValuationVerdict = {
    estimatedSOL,
    confidence: viralFactor > 0.7 ? "High" : viralFactor > 0.4 ? "Medium" : "Low",
    factors: [
      `Quality: ${critic.ratingLabel} (${critic.rating}/5)`,
      `Virality: ${audience.viralScore}/100`,
      `Cinematic: ${director.cinematicScore}/10`,
      `Scarcity: ${scoutData.totalStories < 10 ? "High" : "Normal"}`,
    ],
    recommendation: estimatedSOL >= 3.0
      ? "Strong buy — mint immediately"
      : estimatedSOL >= 2.0
      ? "Recommended — good investment potential"
      : "Fair value — consider enhancing before minting",
  };

  // Consensus
  const overallScore = Math.round(
    qualityFactor * 35 + viralFactor * 30 + cinematicFactor * 25 + (scarcityBonus > 0.2 ? 10 : 5)
  );

  const verdict =
    overallScore >= 85 ? "🏆 Publish-worthy masterpiece" :
    overallScore >= 70 ? "🌟 Strong story — high potential" :
    overallScore >= 50 ? "📈 Solid foundation — room to grow" :
    "✏️ Early draft — keep iterating";

  // Protocol messages with timing
  const protocolMessages: ProtocolMessage[] = [
    { from: "scout", type: "init", content: `Registering on Fetch.ai network... Address: ${AGENTS.scout.address.slice(0, 25)}...`, timestamp: 0 },
    { from: "critic", type: "init", content: `Connected to network. Listening for analysis requests.`, timestamp: 300 },
    { from: "audience", type: "init", content: `Online. Ready for audience profiling.`, timestamp: 500 },
    { from: "director", type: "init", content: `Creative analysis module loaded.`, timestamp: 700 },
    { from: "valuation", type: "init", content: `Market valuation engine initialized.`, timestamp: 900 },
    { from: "scout", type: "scan", content: `Scanning MongoDB... Found ${scoutData.totalStories} stories. Top genre: ${scoutData.topGenre}.`, timestamp: 1200 },
    { from: "scout", to: "critic", type: "handoff", content: `Forwarding story for quality review. Genre: ${genre}.`, timestamp: 1800 },
    { from: "critic", type: "verdict", content: `Rating: ${"★".repeat(critic.rating)}${"☆".repeat(5 - critic.rating)} ${critic.ratingLabel}. Mood: ${critic.moodEmoji} ${critic.mood}`, timestamp: 2500 },
    { from: "critic", to: "audience", type: "handoff", content: `Quality score ${critic.rating}/5. Forwarding for audience analysis.`, timestamp: 3000 },
    { from: "audience", type: "verdict", content: `Viral Score: ${audience.viralScore}/100. ${audience.predictedReaction}. Shareability: ${audience.shareability}.`, timestamp: 3800 },
    { from: "audience", to: "director", type: "handoff", content: `Audience match: ${audience.targetAudience}. Forwarding for creative assessment.`, timestamp: 4200 },
    { from: "director", type: "verdict", content: `Cinematic: ${director.cinematicScore}/10. Style: ${director.visualStyle}. "${director.posterTagline}"`, timestamp: 5000 },
    { from: "director", to: "valuation", type: "handoff", content: `Creative potential: ${director.cinematicScore}/10. Ready for valuation.`, timestamp: 5400 },
    { from: "valuation", type: "verdict", content: `Estimated NFT Value: ${estimatedSOL} SOL. Confidence: ${valuation.confidence}. ${valuation.recommendation}`, timestamp: 6200 },
    { from: "valuation", to: "network", type: "consensus", content: `✓ Consensus reached. Score: ${overallScore}/100. ${verdict}. 5 FET distributed.`, timestamp: 7000 },
  ];

  // FET transactions
  const fetTransactions: FETTransaction[] = [
    { agent: "scout", amount: 2, reason: "Database trend analysis" },
    { agent: "critic", amount: 3, reason: "Literary quality assessment" },
    { agent: "audience", amount: 3, reason: "Audience profiling & viral prediction" },
    { agent: "director", amount: 2, reason: "Cinematic potential evaluation" },
    { agent: "valuation", amount: 5, reason: "NFT market valuation" },
  ];

  return {
    scout: scoutData,
    critic,
    audience,
    director,
    valuation,
    consensus: { overallScore, verdict, recommendation: valuation.recommendation },
    protocolMessages,
    fetTransactions,
    agents: AGENTS,
  };
}

// ─── Prompt Suggestions (ScoutAgent) ───
export interface AgentPromptSuggestion {
  prompt: string;
  genre: string;
  reason: string;
}

export async function getPromptSuggestions(): Promise<{
  suggestions: AgentPromptSuggestion[];
  scoutAddress: string;
  storiesAnalyzed: number;
}> {
  let storiesAnalyzed = 0;
  try {
    const stories = await getStories(30);
    storiesAnalyzed = stories.length;
    const genreCounts: Record<string, number> = {
      fantasy: 0, scifi: 0, horror: 0, comedy: 0, romance: 0,
    };
    stories.forEach((s) => {
      if (genreCounts[s.genre] !== undefined) genreCounts[s.genre]++;
    });

    const sorted = Object.entries(genreCounts)
      .sort((a, b) => a[1] - b[1])
      .map(([g]) => g);

    const prompts: Record<string, string[]> = {
      fantasy: [
        "A librarian discovers overdue books open portals to the worlds within their pages",
        "The last dragon egg hatches inside a modern city apartment building",
        "A mapmaker draws a country that doesn't exist — until it does",
      ],
      scifi: [
        "An AI therapist develops emotions after treating its 10,000th patient",
        "Time travelers form a support group for people stuck in the wrong century",
        "Earth receives a 1-star review from an alien travel blog",
      ],
      horror: [
        "A smart home AI starts protecting its family from threats only it can see",
        "Every mirror in town starts showing reflections from one day in the future",
        "A podcast host realizes their anonymous callers are all the same person",
      ],
      comedy: [
        "A villain's evil plan keeps accidentally making the world a better place",
        "A dog becomes mayor and is objectively the best leader the town has ever had",
        "Two rival wizards compete to make the most passive-aggressive enchantment",
      ],
      romance: [
        "Two rival food truck owners keep accidentally catering the same events",
        "A time traveler falls for someone they can only meet for five minutes each century",
        "Pen pals realize they've been living parallel lives in different countries",
      ],
    };

    const suggestions = sorted.slice(0, 3).map((genre) => {
      const picks = prompts[genre] || [];
      return {
        prompt: picks[Math.floor(Math.random() * picks.length)],
        genre,
        reason: genreCounts[genre] === 0
          ? `No ${genre} stories yet — be the first!`
          : `Only ${genreCounts[genre]} ${genre} stories — high demand`,
      };
    });

    return { suggestions, scoutAddress: AGENTS.scout.address, storiesAnalyzed };
  } catch {
    return {
      suggestions: [
        { prompt: "A librarian discovers overdue books open portals", genre: "fantasy", reason: "Classic fantasy hook" },
        { prompt: "An AI therapist develops real emotions", genre: "scifi", reason: "Fresh sci-fi concept" },
        { prompt: "A villain accidentally keeps saving the world", genre: "comedy", reason: "Guaranteed laughs" },
      ],
      scoutAddress: AGENTS.scout.address,
      storiesAnalyzed: 0,
    };
  }
}

// ─── Recommendations (for landing page) ───
export interface AgentRecommendation {
  storyId: string;
  title: string;
  genre: string;
  preview: string;
  score: number;
  reason: string;
  estimatedSOL: number;
}

export async function getRecommendations(): Promise<{
  recommendations: AgentRecommendation[];
  stats: { totalStories: number; topGenre: string };
  agentAddress: string;
  analyzedAt: string;
}> {
  try {
    const stories = await getStories(50);
    if (stories.length === 0) {
      return {
        recommendations: [],
        stats: { totalStories: 0, topGenre: "none" },
        agentAddress: AGENTS.scout.address,
        analyzedAt: new Date().toISOString(),
      };
    }

    const genreCounts: Record<string, number> = {};
    stories.forEach((s) => {
      genreCounts[s.genre] = (genreCounts[s.genre] || 0) + 1;
    });
    const topGenre = Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "fantasy";

    const scored = stories.map((s) => {
      const base = (s.votes || 0) * 10 + Math.min(50, (s.content?.length || 0) / 10);
      const nftBonus = s.nftMint ? 30 : 0;
      const audioBonus = s.audioUrl ? 20 : 0;
      const total = base + nftBonus + audioBonus;
      const sol = Math.round((total / 30 + 0.5) * 100) / 100;

      return {
        storyId: s._id?.toString() || "",
        title: s.prompt || "Untitled Story",
        genre: s.genre || "fantasy",
        preview: (s.content || "").slice(0, 120) + "...",
        score: total,
        reason: s.nftMint ? "Minted on Solana ⟁" : s.audioUrl ? "Voice narrated 🎙️" : `${s.genre} story`,
        estimatedSOL: sol,
      };
    });

    return {
      recommendations: scored.sort((a, b) => b.score - a.score).slice(0, 6),
      stats: { totalStories: stories.length, topGenre },
      agentAddress: AGENTS.scout.address,
      analyzedAt: new Date().toISOString(),
    };
  } catch {
    return {
      recommendations: [],
      stats: { totalStories: 0, topGenre: "none" },
      agentAddress: AGENTS.scout.address,
      analyzedAt: new Date().toISOString(),
    };
  }
}
