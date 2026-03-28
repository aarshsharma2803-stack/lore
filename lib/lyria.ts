// Lyria RealTime music streaming via Gemini WebSocket
// Genre-adaptive background music score — correct Lyria protocol

const LYRIA_OUTPUT_HZ = 48000; // Lyria outputs 48kHz PCM

const GENRE_PROMPTS: Record<string, string> = {
  fantasy: "Epic orchestral fantasy score, sweeping strings, heroic horns, magical harp, cinematic adventure",
  horror: "Dark ambient horror score, dissonant strings, subtle dread, eerie atmosphere, tension building",
  scifi: "Electronic sci-fi soundtrack, pulsing synthesizers, futuristic atmosphere, space ambience, digital",
  comedy: "Playful upbeat score, pizzicato strings, light percussion, whimsical brass, fun and quirky",
  romance: "Soft romantic score, gentle piano melody, warm strings, tender and emotional",
};

export class LyriaPlayer {
  private ws: WebSocket | null = null;
  private audioCtx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private nextPlayTime = 0;
  private isConnected = false;
  public onStateChange?: (state: "connecting" | "streaming" | "stopped" | "error") => void;

  // Collect all PCM chunks for export
  public collectedPCM: ArrayBuffer[] = [];

  connect(apiKey: string, genre: string) {
    try {
      // 48kHz — Lyria's native output rate
      this.audioCtx = new AudioContext({ sampleRate: LYRIA_OUTPUT_HZ });
      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.value = 0.3;
      this.gainNode.connect(this.audioCtx.destination);
      this.nextPlayTime = this.audioCtx.currentTime + 0.1;

      this.onStateChange?.("connecting");

      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${apiKey}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        // Lyria setup — no speechConfig/voiceConfig (those are Gemini Live features)
        this.ws!.send(JSON.stringify({
          setup: {
            model: "models/lyria-realtime-exp",
          },
        }));
      };

      this.ws.onmessage = async (event) => {
        try {
          let raw = event.data;
          if (raw instanceof Blob) raw = await raw.text();
          const data = JSON.parse(raw);

          // Setup complete → send music prompt immediately (no timeout needed)
          if (data.setupComplete) {
            const prompt = GENRE_PROMPTS[genre] ?? GENRE_PROMPTS.fantasy;
            this.ws!.send(JSON.stringify({
              weightedPrompts: [{ text: prompt, weight: 1.0 }],
            }));
            this.isConnected = true;
            this.onStateChange?.("streaming");
            return;
          }

          // Audio chunks
          const parts = data.serverContent?.modelTurn?.parts;
          if (!parts) return;

          for (const part of parts) {
            if (part.inlineData?.mimeType?.startsWith("audio/")) {
              const raw = atob(part.inlineData.data as string);
              const buf = new ArrayBuffer(raw.length);
              const view = new Uint8Array(buf);
              for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
              this.collectedPCM.push(buf);
              this.scheduleAudio(buf);
            }
          }
        } catch { /* skip parse errors */ }
      };

      this.ws.onerror = () => {
        this.onStateChange?.("error");
      };

      this.ws.onclose = () => {
        if (this.isConnected) this.onStateChange?.("stopped");
        this.isConnected = false;
      };

    } catch (e) {
      console.error("Lyria connect error:", e);
      this.onStateChange?.("error");
    }
  }

  private scheduleAudio(pcmBuffer: ArrayBuffer) {
    if (!this.audioCtx || !this.gainNode) return;
    try {
      const view = new DataView(pcmBuffer);
      const samples = pcmBuffer.byteLength / 2;
      const audioBuffer = this.audioCtx.createBuffer(1, samples, LYRIA_OUTPUT_HZ);
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < samples; i++) {
        channelData[i] = view.getInt16(i * 2, true) / 32768;
      }
      const source = this.audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.gainNode);
      const now = this.audioCtx.currentTime;
      if (this.nextPlayTime < now) this.nextPlayTime = now + 0.02;
      source.start(this.nextPlayTime);
      this.nextPlayTime += audioBuffer.duration;
    } catch (e) {
      console.error("Lyria audio schedule error:", e);
    }
  }

  setVolume(v: number) {
    if (this.gainNode) this.gainNode.gain.value = Math.max(0, Math.min(1, v));
  }

  fadeOut(durationSec = 2) {
    if (!this.gainNode || !this.audioCtx) return;
    this.gainNode.gain.linearRampToValueAtTime(0, this.audioCtx.currentTime + durationSec);
  }

  stop() {
    this.ws?.close();
    this.ws = null;
    this.isConnected = false;
    try { this.audioCtx?.close(); } catch { /* ignore */ }
    this.audioCtx = null;
    this.gainNode = null;
    this.onStateChange?.("stopped");
  }

  getMergedPCM(): ArrayBuffer {
    const totalBytes = this.collectedPCM.reduce((sum, b) => sum + b.byteLength, 0);
    const merged = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of this.collectedPCM) {
      merged.set(new Uint8Array(chunk), offset);
      offset += chunk.byteLength;
    }
    return merged.buffer;
  }
}
