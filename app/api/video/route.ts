import { generateVideo, extractScenePrompts } from "@/lib/ltxvideo";
import { NextRequest } from "next/server";

// AI Video generation endpoint using LTX Video API
// Generates multiple scene videos that cover the full story
export async function POST(req: NextRequest) {
  try {
    const { content, genre } = await req.json();

    if (!content) {
      return Response.json({ error: "Content is required" }, { status: 400 });
    }

    // Extract scene prompts from the story
    const scenePrompts = await extractScenePrompts(content, genre || "fantasy");

    // Generate videos for each scene in parallel
    const videoBuffers = await Promise.all(
      scenePrompts.map((prompt) => generateVideo(prompt, 5))
    );

    // Convert to base64 for JSON response
    const scenes = videoBuffers.map((buffer, i) => ({
      videoBase64: Buffer.from(buffer).toString("base64"),
      description: scenePrompts[i].slice(0, 200),
      sceneNumber: i + 1,
    }));

    return Response.json({
      success: true,
      scenes,
      totalScenes: scenes.length,
    });
  } catch (error) {
    console.error("Video generation error:", error);
    return Response.json(
      { error: "Failed to generate video" },
      { status: 500 }
    );
  }
}
