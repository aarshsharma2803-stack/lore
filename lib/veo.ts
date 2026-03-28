const VEO_API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const VEO_MODEL = "veo-2.0-generate-001";

// Use dedicated VEO_API_KEY if set, fall back to GEMINI_API_KEY
function getVeoKey(): string {
  return process.env.VEO_API_KEY || process.env.GEMINI_API_KEY || "";
}

export interface VeoJob {
  operationName: string;
  sceneIndex: number;
}

export interface VeoPollResult {
  done: boolean;
  videoBase64?: string;
  mimeType?: string;
  error?: string;
}

export async function createVeoJob(
  prompt: string,
  sceneIndex: number
): Promise<VeoJob> {
  const url = `${VEO_API_BASE}/models/${VEO_MODEL}:predictLongRunning?key=${getVeoKey()}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instances: [{ prompt: prompt.slice(0, 500) }],
      parameters: {
        aspectRatio: "16:9",
        durationSeconds: 8,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Veo job creation failed [${res.status}]: ${err}`);
  }

  const data = await res.json();
  if (!data.name) throw new Error(`Veo response missing operation name: ${JSON.stringify(data)}`);
  return { operationName: data.name, sceneIndex };
}

export async function pollVeoJob(operationName: string): Promise<VeoPollResult> {
  // operationName is the full path returned by createVeoJob e.g. "models/veo-2.0-generate-001/operations/abc123"
  const url = `${VEO_API_BASE}/${operationName}?key=${getVeoKey()}`;
  const res = await fetch(url);

  if (!res.ok) {
    return { done: false, error: `Poll failed: ${res.status}` };
  }

  const data = await res.json();
  if (!data.done) return { done: false };
  if (data.error) return { done: true, error: data.error.message };

  // Try multiple response paths (Veo API format varies)
  const video =
    data.response?.generateVideoResponse?.generatedSamples?.[0]?.video ||
    data.response?.generatedSamples?.[0]?.video ||
    data.response?.videos?.[0];

  if (!video) {
    console.error("Veo done but no video found. Full response:", JSON.stringify(data.response ?? {}));
    return { done: true, error: "No video in response" };
  }

  // Case 1: base64 bytes returned directly
  if (video.bytesBase64Encoded) {
    return { done: true, videoBase64: video.bytesBase64Encoded, mimeType: "video/mp4" };
  }

  // Case 2: GCS URI returned — fetch the bytes and convert to base64
  if (video.uri) {
    try {
      // Try with API key in case GCS bucket requires it
      const videoRes = await fetch(`${video.uri}${video.uri.includes("?") ? "&" : "?"}key=${getVeoKey()}`);
      if (!videoRes.ok) {
        // Try without key (public signed URL)
        const videoRes2 = await fetch(video.uri);
        if (!videoRes2.ok) throw new Error(`GCS fetch failed: ${videoRes2.status}`);
        const arrayBuf2 = await videoRes2.arrayBuffer();
        const b64_2 = Buffer.from(arrayBuf2).toString("base64");
        return { done: true, videoBase64: b64_2, mimeType: "video/mp4" };
      }
      const arrayBuf = await videoRes.arrayBuffer();
      const b64 = Buffer.from(arrayBuf).toString("base64");
      return { done: true, videoBase64: b64, mimeType: "video/mp4" };
    } catch (e) {
      return { done: true, error: `Failed to fetch video from URI: ${e}` };
    }
  }

  return { done: true, error: "Video has no bytesBase64Encoded or uri field" };
}
