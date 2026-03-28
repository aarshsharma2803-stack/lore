// Lyria 3 music generation via Gemini REST API
// Genre-adaptive background music score

const LYRIA_MODEL = "lyria-3-clip-preview";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

const GENRE_PROMPTS: Record<string, string> = {
  fantasy: "Epic orchestral fantasy score, sweeping strings, heroic horns, magical harp, cinematic adventure",
  horror: "Dark ambient horror score, dissonant strings, subtle dread, eerie atmosphere, tension building",
  scifi: "Electronic sci-fi soundtrack, pulsing synthesizers, futuristic atmosphere, space ambience, digital",
  comedy: "Playful upbeat score, pizzicato strings, light percussion, whimsical brass, fun and quirky",
  romance: "Soft romantic score, gentle piano melody, warm strings, tender and emotional",
};

export class LyriaPlayer {
  private audioEl: HTMLAudioElement | null = null;
  private gainNode: GainNode | null = null;
  private audioCtx: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  public onStateChange?: (state: "connecting" | "streaming" | "stopped" | "error") => void;

  async connect(apiKey: string, genre: string) {
    try {
      this.onStateChange?.("connecting");

      const prompt = GENRE_PROMPTS[genre] ?? GENRE_PROMPTS.fantasy;
      const url = `${API_BASE}/models/${LYRIA_MODEL}:generateContent?key=${apiKey}`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ["AUDIO"] },
        }),
      });

      if (!res.ok) {
        console.error("Lyria API error:", res.status, await res.text());
        this.onStateChange?.("error");
        return;
      }

      const data = await res.json();
      let audioBase64: string | null = null;
      let mimeType = "audio/mpeg";

      for (const cand of data.candidates ?? []) {
        for (const part of cand.content?.parts ?? []) {
          if (part.inlineData?.data) {
            audioBase64 = part.inlineData.data;
            mimeType = part.inlineData.mimeType || mimeType;
            break;
          }
        }
        if (audioBase64) break;
      }

      if (!audioBase64) {
        console.error("Lyria returned no audio");
        this.onStateChange?.("error");
        return;
      }

      // Create audio element and play
      const blob = this.base64ToBlob(audioBase64, mimeType);
      const blobUrl = URL.createObjectURL(blob);

      this.audioCtx = new AudioContext();
      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.value = 0.3;
      this.gainNode.connect(this.audioCtx.destination);

      this.audioEl = new Audio(blobUrl);
      this.audioEl.loop = true;
      this.sourceNode = this.audioCtx.createMediaElementSource(this.audioEl);
      this.sourceNode.connect(this.gainNode);

      await this.audioEl.play();
      this.onStateChange?.("streaming");

    } catch (e) {
      console.error("Lyria connect error:", e);
      this.onStateChange?.("error");
    }
  }

  private base64ToBlob(b64: string, mime: string): Blob {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }

  setVolume(v: number) {
    if (this.gainNode) this.gainNode.gain.value = Math.max(0, Math.min(1, v));
  }

  fadeOut(durationSec = 2) {
    if (!this.gainNode || !this.audioCtx) return;
    this.gainNode.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + durationSec);
    setTimeout(() => this.stop(), durationSec * 1000);
  }

  // Stub for backward compat with export (no raw PCM in REST mode)
  getMergedPCM(): ArrayBuffer | null {
    return null;
  }

  stop() {
    this.audioEl?.pause();
    this.audioEl = null;
    this.sourceNode?.disconnect();
    this.sourceNode = null;
    try { this.audioCtx?.close(); } catch { /* ignore */ }
    this.audioCtx = null;
    this.gainNode = null;
    this.onStateChange?.("stopped");
  }
}
