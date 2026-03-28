import { GoogleGenerativeAI } from "@google/generative-ai";

const LTXV_API_KEY = process.env.LTXV_API_KEY!;
const BASE_URL = "https://api.ltx.video/v1";

export async function generateVideo(
  prompt: string,
  duration: number = 5
): Promise<ArrayBuffer> {
  const response = await fetch(`${BASE_URL}/text-to-video`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LTXV_API_KEY}`,
    },
    body: JSON.stringify({
      prompt: prompt.slice(0, 500),
      model: "ltx-2-fast",
      duration,
      resolution: "1920x1080",
      fps: 25,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LTX Video error: ${response.status} - ${error}`);
  }

  return response.arrayBuffer();
}

// Use Gemini to generate cinematic scene descriptions from the story
// This ensures videos actually match the story content
export async function extractScenePrompts(content: string, genre: string): Promise<string[]> {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent(`You are a cinematic director creating visual scene descriptions for AI video generation.

Given this ${genre} story, break it into exactly 3 key visual scenes. For each scene, write a detailed VISUAL description of what the camera sees — NOT the story text itself, but what it LOOKS like as a movie scene.

STORY:
${content.slice(0, 1500)}

RULES:
- Write exactly 3 scene descriptions, separated by |||
- Each description must be 1-2 sentences, max 80 words
- Describe ONLY what is visually seen: setting, lighting, character appearance, action, camera angle
- Use cinematic language: "wide shot of", "close-up on", "camera pans across", "silhouetted against"
- Include specific visual details: colors, textures, weather, time of day
- Match the ${genre} genre's visual style (e.g., horror = dark shadows, fantasy = magical glow)
- Do NOT include dialogue, thoughts, or narration — only visual descriptions
- Do NOT include any prefix like "Scene 1:" — just the description

EXAMPLE OUTPUT for a fantasy story:
Wide establishing shot of an ancient stone tower rising from a misty emerald forest at twilight, golden light spilling from its arched windows, fireflies swirling around its base|||Close-up of a young woman with silver braided hair gripping a glowing blue crystal sword, her face lit by its pulsing light, rain streaming down her determined expression|||Aerial shot of a massive crimson dragon soaring through storm clouds above a burning village, lightning illuminating its outstretched wings as villagers flee below

Now write 3 scene descriptions for the story above:`);

    const text = result.response.text().trim();
    const scenes = text
      .split("|||")
      .map((s) => s.trim())
      .filter((s) => s.length > 20)
      .slice(0, 3);

    if (scenes.length === 0) {
      return fallbackExtract(content, genre);
    }

    // Add quality suffix to each prompt
    return scenes.map(
      (scene) =>
        `${scene}. Cinematic quality, 4K, detailed, professional lighting, ${genre} genre atmosphere.`
    );
  } catch (error) {
    console.error("Gemini scene extraction failed, using fallback:", error);
    return fallbackExtract(content, genre);
  }
}

// Fallback if Gemini fails — basic extraction
function fallbackExtract(content: string, genre: string): string[] {
  const paragraphs = content
    .split(/\n\n+/)
    .filter((p) => p.trim().length > 30 && !p.startsWith("##"));

  return paragraphs.slice(0, 3).map((p) => {
    const sentences = p.split(/[.!?]+/).filter((s) => s.trim().length > 15);
    const best = sentences.reduce((a, b) => (a.length > b.length ? a : b), "");
    return `Cinematic ${genre} movie scene: ${best.trim().slice(0, 300)}. Professional cinematography, dramatic lighting, vivid colors, 4K quality.`;
  });
}
