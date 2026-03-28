import { streamStoryGeneration, Genre } from "@/lib/gemini";
import { embedText, findSimilarStories, buildUniquenessInstruction } from "@/lib/story-memory";
import { getDb } from "@/lib/mongodb";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { messages, genre } = (await req.json()) as {
      messages: { role: "user" | "model"; content: string }[];
      genre: Genre;
    };

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Messages required" }), { status: 400 });
    }

    let uniquenessInstruction = "";
    try {
      const userPrompt = messages.filter(m => m.role === "user").map(m => m.content).join(" ").slice(0, 500);
      const embedding = await embedText(userPrompt);
      const db = await getDb();
      const similar = await findSimilarStories(db.collection("stories"), embedding);
      uniquenessInstruction = buildUniquenessInstruction(similar);
    } catch (e) {
      console.error("Uniqueness check failed (non-fatal):", e);
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamStoryGeneration(messages, genre, uniquenessInstruction)) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`));
          }
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (error) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "Generation failed" })}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500 });
  }
}
