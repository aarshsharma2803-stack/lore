const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!;
const BASE_URL = "https://api.elevenlabs.io/v1";

// Pre-selected voices for different roles
export const VOICES = {
  narrator: { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel" },      // Calm, clear
  hero: { id: "ErXwobaYiN019PkySvjV", name: "Antoni" },           // Confident
  villain: { id: "VR6AewLTigWG4xSOukaG", name: "Arnold" },        // Deep
  comedy: { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh" },           // Energetic
  calm: { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella" },            // Soft, soothing
} as const;

export type VoiceId = keyof typeof VOICES;

export async function textToSpeech(
  text: string,
  voiceKey: VoiceId = "narrator",
  settingsOverride?: { stability: number; similarity_boost: number; style: number }
): Promise<ArrayBuffer> {
  const voice = VOICES[voiceKey];

  const voiceSettings = {
    stability: settingsOverride?.stability ?? 0.5,
    similarity_boost: settingsOverride?.similarity_boost ?? 0.75,
    style: settingsOverride?.style ?? 0.5,
    use_speaker_boost: true,
  };

  const response = await fetch(
    `${BASE_URL}/text-to-speech/${voice.id}/stream`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_monolingual_v1",
        voice_settings: voiceSettings,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs error: ${response.status} - ${error}`);
  }

  return response.arrayBuffer();
}

export async function getAvailableVoices() {
  const response = await fetch(`${BASE_URL}/voices`, {
    headers: { "xi-api-key": ELEVENLABS_API_KEY },
  });

  if (!response.ok) throw new Error("Failed to fetch voices");
  return response.json();
}
