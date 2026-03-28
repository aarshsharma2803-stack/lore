import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import GlobalAssistant from "@/components/GlobalAssistant";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lore — AI Cinematic Stories on Solana",
  description:
    "Co-author immersive stories with Gemini AI, generate cinematic video with Veo 2, add music with Lyria, and mint as NFTs on Solana.",
  keywords: ["AI stories", "NFT", "Solana", "Gemini AI", "Veo 2", "Lyria", "ElevenLabs", "storytelling"],
  openGraph: {
    title: "Lore — AI Cinematic Stories on Solana",
    description: "From a sentence to a cinematic film. On-chain forever.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased dark`}
    >
      <body className="noise min-h-full flex flex-col bg-[#09090b] text-white">
        {children}
        {/* 24/7 AI assistant — visible on every page */}
        <GlobalAssistant />
      </body>
    </html>
  );
}
