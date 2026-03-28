import { getPromptSuggestions } from "@/lib/fetchai-agent";

export async function GET() {
  try {
    const data = await getPromptSuggestions();
    return Response.json(data);
  } catch (error) {
    console.error("Agent suggestions error:", error);
    return Response.json({ suggestions: [], scoutAddress: "", storiesAnalyzed: 0 });
  }
}
