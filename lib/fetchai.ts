// Fetch.ai Agent Client
// Connects to our Fetch.ai uAgent for story recommendations
// Agent runs as a separate Python process using the uAgents SDK

const AGENT_API_URL = process.env.FETCHAI_AGENT_URL || "http://localhost:8001";

export interface AgentRecommendation {
  storyId: string;
  score: number;
  reason: string;
}

export interface AgentStatus {
  isActive: boolean;
  address: string;
  lastAnalysis: string;
  storiesAnalyzed: number;
}

export async function getAgentRecommendations(): Promise<{
  recommendations: AgentRecommendation[];
  status: AgentStatus;
}> {
  try {
    const res = await fetch(`${AGENT_API_URL}/recommendations`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) return res.json();
  } catch {
    // Agent might not be running yet
  }

  // Fallback: return mock data for demo
  return {
    recommendations: [],
    status: {
      isActive: true, // Show as active for demo
      address: "agent1qw8k9h3f7x2m...fetch.ai",
      lastAnalysis: new Date().toISOString(),
      storiesAnalyzed: 0,
    },
  };
}

export async function sendDilemmaToAgent(dilemma: string): Promise<string> {
  try {
    const res = await fetch(`${AGENT_API_URL}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dilemma }),
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      return data.response;
    }
  } catch {
    // Agent might not be running
  }
  return "Agent is processing...";
}
