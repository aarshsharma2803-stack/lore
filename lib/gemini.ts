import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export type Genre = "fantasy" | "scifi" | "horror" | "comedy" | "romance";

const genrePrompts: Record<Genre, string> = {
  fantasy: `You are a master fantasy storyteller. Write vivid, magical narratives with dragons, wizards, enchanted forests, and epic quests. Use rich, lyrical prose.`,
  scifi: `You are a brilliant sci-fi author. Write futuristic stories with advanced technology, space exploration, AI, and thought-provoking concepts. Use precise, evocative language.`,
  horror: `You are a spine-chilling horror writer. Write unsettling stories with creeping dread, psychological tension, and terrifying twists. Build atmosphere slowly, then strike.`,
  comedy: `You are a hilarious comedy writer. Write stories that are absurd, witty, and laugh-out-loud funny. Use clever wordplay, situational comedy, and unexpected punchlines. Make it genuinely funny.`,
  romance: `You are a captivating romance author. Write heartfelt stories with compelling chemistry, emotional depth, and swoon-worthy moments. Balance tension with tenderness.`,
};

export function getSystemPrompt(genre: Genre): string {
  // Generate a unique seed for every story request
  const uniqueSeed = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  return `${genrePrompts[genre]}

UNIQUE STORY SEED: ${uniqueSeed}
You MUST use this seed to ensure this story is completely unique and has never been told before. Generate entirely original characters (with unique names), a fresh setting, and an unexpected plot structure. Never reuse common tropes or default storylines. Every story must feel like a one-of-a-kind creation.

IMPORTANT RULES:
- Write the story in 2-3 short sections
- Each section should be 1-2 paragraphs
- Use vivid, sensory language — every word counts
- Create compelling characters with distinct personalities
- Include dialogue when appropriate
- Do NOT use any markdown formatting. No #, ##, **, *, or any other markdown symbols. Write plain prose only. Use line breaks to separate chapters/sections.
- If you want to indicate a chapter title, just write it as plain text on its own line (e.g. "Chapter 1: The Beginning")
- Keep the total story between 200-350 words — concise but vivid
- Do NOT exceed 350 words under any circumstances

You are co-authoring with the user. They may ask you to modify the story, add elements, change the tone, or take the plot in a new direction. Always incorporate their feedback naturally into the narrative.`;
}

export function getPlotTwistPrompt(): string {
  return `PLOT TWIST! Write ONLY the new plot twist section — do NOT repeat or rewrite any of the previous story. Just continue from where the story left off with an absolutely unexpected, absurd, and hilarious plot twist. The twist should be so ridiculous it makes the reader laugh out loud. Keep it to 1-2 paragraphs. No markdown formatting — plain prose only.`;
}

export function getWTFEndingPrompt(): string {
  return `Write ONLY the ending — do NOT repeat or rewrite any of the previous story. Just continue from where the story left off with the most UNHINGED, CHAOTIC, ABSURD ending possible. Go completely off the rails. Keep it to 2-3 paragraphs. No markdown formatting — plain prose only.`;
}

export async function* streamStoryGeneration(
  messages: { role: "user" | "model"; content: string }[],
  genre: Genre,
  uniquenessInstruction = ""
) {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: { role: "system" as const, parts: [{ text: getSystemPrompt(genre) + uniquenessInstruction }] } as any,
    generationConfig: {
      temperature: 1.2,
      topP: 0.95,
      topK: 64,
    },
  });

  const chat = model.startChat({
    history: messages.slice(0, -1).map((msg) => ({
      role: msg.role,
      parts: [{ text: msg.content }],
    })),
  });

  const lastMessage = messages[messages.length - 1];
  const result = await chat.sendMessageStream(lastMessage.content);

  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) {
      yield text;
    }
  }
}
