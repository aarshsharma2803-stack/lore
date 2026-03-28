"use client";

import LiveVoiceAssistant from "@/components/LiveVoiceAssistant";

// Renders the floating AI assistant on every page (client component wrapper)
export default function GlobalAssistant() {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? "";
  return (
    <LiveVoiceAssistant
      apiKey={apiKey}
      genre="fantasy"
      storyContext="You are a helpful AI assistant for Lore — a platform that lets users create AI-generated stories, cinematic videos, and mint them as NFTs on Solana. Help users with anything about the platform: how to create stories, generate videos, mint NFTs, use the gallery, and more. Be friendly, concise, and enthusiastic."
      siteWide
    />
  );
}
