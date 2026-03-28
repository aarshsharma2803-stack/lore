import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Try multiple embedding model names — availability varies by API key/project
const EMBEDDING_MODELS = [
  "text-embedding-004",
  "gemini-embedding-exp-03-07",
  "embedding-001",
];

async function tryEmbedText(text: string): Promise<number[] | null> {
  for (const modelName of EMBEDDING_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.embedContent(text.slice(0, 2000));
      return result.embedding.values;
    } catch {
      // Try next model
    }
  }
  return null;
}

export async function embedText(text: string): Promise<number[]> {
  const result = await tryEmbedText(text);
  return result ?? [];
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export async function findSimilarStories(
  collection: any,
  promptEmbedding: number[],
  threshold = 0.82
): Promise<string[]> {
  if (promptEmbedding.length === 0) return [];
  try {
    const stories = await collection
      .find({ embedding: { $exists: true } })
      .project({ embedding: 1, content: 1 })
      .limit(200)
      .toArray();

    return stories
      .filter((s: any) => cosineSimilarity(promptEmbedding, s.embedding) > threshold)
      .map((s: any) => s.content.slice(0, 80).replace(/\n/g, " "));
  } catch {
    return [];
  }
}

export function buildUniquenessInstruction(similarThemes: string[]): string {
  if (similarThemes.length === 0) return "";
  const list = similarThemes.map(t => `- "${t}..."`).join("\n");
  return `\n\nCRITICAL: The following story themes have ALREADY been generated. You MUST create something completely different — new setting, new characters, new conflict, new arc:\n${list}\nThis story must be entirely unlike any of those above.`;
}
