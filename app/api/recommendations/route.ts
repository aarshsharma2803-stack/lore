import { getRecommendations, AGENTS } from "@/lib/fetchai-agent";

export async function GET() {
  try {
    const data = await getRecommendations();
    return Response.json({
      ...data,
      agents: AGENTS,
      agentStatus: "active",
      agentMessage: data.stats.totalStories > 0
        ? `Analyzed ${data.stats.totalStories} stories. ${data.stats.topGenre} is trending.`
        : "No stories yet — create the first one!",
    });
  } catch (error) {
    console.error("Recommendation error:", error);
    return Response.json({
      recommendations: [],
      stats: { totalStories: 0, topGenre: "none" },
      agentAddress: AGENTS.scout.address,
      analyzedAt: new Date().toISOString(),
      agentStatus: "error",
      agentMessage: "Agent temporarily offline",
    });
  }
}
