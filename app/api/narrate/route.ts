import { textToSpeech, VoiceId } from "@/lib/elevenlabs";
import { NextRequest } from "next/server";

// Genre-specific voice settings for emotional delivery
const genreVoiceSettings: Record<string, { stability: number; similarity_boost: number; style: number }> = {
  fantasy: { stability: 0.4, similarity_boost: 0.75, style: 0.6 },
  horror:  { stability: 0.3, similarity_boost: 0.8,  style: 0.8 },
  comedy:  { stability: 0.3, similarity_boost: 0.7,  style: 0.9 },
  romance: { stability: 0.5, similarity_boost: 0.8,  style: 0.7 },
  "sci-fi": { stability: 0.5, similarity_boost: 0.75, style: 0.5 },
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = body.text as string;
    const genre = body.genre as string | undefined;

    // Default to "narrator" if voice is missing or invalid
    const validVoices: VoiceId[] = ["narrator", "hero", "villain", "comedy", "calm"];
    const voice: VoiceId = validVoices.includes(body.voice) ? body.voice : "narrator";

    if (!text) {
      return new Response(JSON.stringify({ error: "Text is required" }), {
        status: 400,
      });
    }

    // Truncate to avoid API limits (ElevenLabs free tier limit)
    const truncatedText = text.slice(0, 5000);

    // Use genre-specific voice settings for emotional narration
    const voiceSettings = genre ? genreVoiceSettings[genre] : undefined;

    const audioBuffer = await textToSpeech(truncatedText, voice, voiceSettings);

    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("Narration error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate narration" }),
      { status: 500 }
    );
  }
}
