import { runMultiAgentAnalysis } from "@/lib/fetchai-agent";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { content, genre } = await req.json();
    if (!content) {
      return Response.json({ error: "Content is required" }, { status: 400 });
    }
    const analysis = await runMultiAgentAnalysis(content, genre || "fantasy");
    return Response.json(analysis);
  } catch (error) {
    console.error("Agent analysis error:", error);
    return Response.json({ error: "Agent analysis failed" }, { status: 500 });
  }
}
