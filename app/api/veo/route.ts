import { NextRequest } from "next/server";
import { createVeoJob } from "@/lib/veo";
import { extractScenePrompts } from "@/lib/ltxvideo";

export async function POST(req: NextRequest) {
  try {
    const { content, genre } = (await req.json()) as {
      content: string;
      genre: string;
    };

    if (!content || !genre) {
      return Response.json({ error: "content and genre required" }, { status: 400 });
    }

    // Reuse existing Gemini-powered scene extractor
    const prompts = await extractScenePrompts(content, genre);

    // Fire all 3 Veo jobs concurrently
    const jobs = await Promise.all(
      prompts.map((prompt, i) => createVeoJob(prompt, i))
    );

    return Response.json({ jobs, scenePrompts: prompts });
  } catch (error) {
    console.error("Veo job creation failed:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Veo failed" },
      { status: 500 }
    );
  }
}
