import { saveStory, getStories, getStoryById } from "@/lib/mongodb";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const story = await getStoryById(id);
      if (!story) {
        return Response.json({ error: "Story not found" }, { status: 404 });
      }
      return Response.json(story);
    }

    const stories = await getStories();
    return Response.json(stories);
  } catch (error) {
    console.error("Failed to fetch stories:", error);
    return Response.json({ error: "Failed to fetch stories" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, content, genre } = body;

    if (!prompt || !content || !genre) {
      return Response.json(
        { error: "prompt, content, and genre are required" },
        { status: 400 }
      );
    }

    const id = await saveStory({
      prompt,
      content,
      genre,
      createdAt: new Date(),
      votes: 0,
    });

    // Fire-and-forget: save embedding for future uniqueness checks
    (async () => {
      try {
        const { embedText } = await import("@/lib/story-memory");
        const { getDb } = await import("@/lib/mongodb");
        const { ObjectId } = await import("mongodb");
        const embedding = await embedText(content);
        const db = await getDb();
        await db.collection("stories").updateOne(
          { _id: new ObjectId(id) },
          { $set: { embedding } }
        );
      } catch (e) {
        console.error("Failed to save embedding (non-fatal):", e);
      }
    })();

    return Response.json({ id, success: true });
  } catch (error) {
    console.error("Failed to save story:", error);
    return Response.json({ error: "Failed to save story" }, { status: 500 });
  }
}
