// Pollinations.ai - Free AI image generation (no API key needed!)
// https://pollinations.ai

export function getImageUrl(prompt: string, width = 512, height = 288, seed?: number): string {
  // Keep prompts short to avoid URL length issues
  const shortPrompt = prompt.slice(0, 300);
  const encoded = encodeURIComponent(shortPrompt);
  // Use a deterministic seed so the same prompt always returns the same image (cache-friendly)
  const s = seed ?? hashCode(shortPrompt);
  return `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&nologo=true&seed=${s}`;
}

// Simple string hash for deterministic seeds
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 100000;
}

export async function generateSceneImages(
  storyContent: string,
  genre: string
): Promise<{ description: string; imageUrl: string }[]> {
  // Extract key scenes from the story
  const scenes = extractScenes(storyContent);

  // Generate image URLs for each scene — smaller size (512x288) for fast loading
  return scenes.map((scene) => ({
    description: scene,
    imageUrl: getImageUrl(
      `${scene}, ${genre} style, cinematic, vibrant`,
      512,
      288
    ),
  }));
}

function extractScenes(content: string): string[] {
  // Split by chapters or paragraphs
  const paragraphs = content
    .split(/\n\n+/)
    .filter((p) => p.trim().length > 30);

  // Take up to 3 key scenes for fast loading
  const scenes: string[] = [];
  const step = Math.max(1, Math.floor(paragraphs.length / 3));

  for (let i = 0; i < paragraphs.length && scenes.length < 3; i += step) {
    // Extract the most vivid sentence from each paragraph
    const sentences = paragraphs[i]
      .split(/[.!?]+/)
      .filter((s) => s.trim().length > 20);

    if (sentences.length > 0) {
      // Pick the most descriptive sentence (longest usually has most detail)
      const bestSentence = sentences.reduce((a, b) =>
        a.length > b.length ? a : b
      );
      scenes.push(bestSentence.trim().slice(0, 200));
    }
  }

  // Fallback: if no good scenes found, use generic prompts based on content
  if (scenes.length === 0) {
    scenes.push(content.slice(0, 200));
  }

  return scenes;
}
