"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Genre } from "@/lib/gemini";
import VoiceInput from "@/components/VoiceInput";

interface Message {
  role: "user" | "model";
  content: string;
}

const genres: { id: Genre; label: string; description: string; color: string }[] = [
  { id: "fantasy", label: "Fantasy", description: "Magic, quests, and mythical worlds", color: "#f59e0b" },
  { id: "scifi", label: "Sci-Fi", description: "Technology, space, and the future", color: "#06b6d4" },
  { id: "horror", label: "Horror", description: "Dread, suspense, and dark twists", color: "#a855f7" },
  { id: "comedy", label: "Comedy", description: "Absurd, witty, and hilarious", color: "#eab308" },
  { id: "romance", label: "Romance", description: "Chemistry, emotion, and heart", color: "#f472b6" },
];

interface GeminiChatProps {
  onStoryComplete: (story: string, genre: Genre) => void;
}

export default function GeminiChat({ onStoryComplete }: GeminiChatProps) {
  const [genre, setGenre] = useState<Genre | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [currentStory, setCurrentStory] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const storyEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    storyEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentStory]);

  const sendMessage = async (userMessage: string, isSpecial?: string) => {
    if (!genre || (!userMessage.trim() && !isSpecial)) return;
    const newMessage: Message = { role: "user", content: isSpecial || userMessage };
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsGenerating(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          genre,
        }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let storyChunk = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value);
          for (const line of text.split("\n")) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed.text) {
                  storyChunk += parsed.text;
                  setCurrentStory((prev) => prev + parsed.text);
                }
              } catch { /* skip */ }
            }
          }
        }
      }

      setMessages((prev) => [...prev, { role: "model", content: storyChunk }]);
    } catch (error) {
      console.error("Generation error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlotTwist = () => {
    sendMessage("", "PLOT TWIST! Write ONLY the new plot twist — do NOT repeat any of the previous story. Just continue from where we left off with an absolutely unexpected, absurd twist. Keep it to 1-2 paragraphs. No markdown formatting.");
  };

  const handleWTFEnding = () => {
    sendMessage("", "Write ONLY the ending — do NOT repeat any of the previous story. Just continue from where we left off with the most UNHINGED, CHAOTIC, ABSURD ending possible. Go completely off the rails. Keep it to 2-3 paragraphs. No markdown formatting.");
  };

  // ── Genre Selection ──
  if (!genre) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-6">
        <div className="orb w-[400px] h-[400px] bg-[var(--accent)] top-1/3 -left-32" />
        <div className="aurora-bg" />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="max-w-lg w-full relative z-10"
        >
          <div className="mb-10">
            <h1 className="heading-display text-3xl gradient-text mb-2">
              What kind of story?
            </h1>
            <p className="body-small">
              Choose a genre and start co-authoring with Gemini AI.
            </p>
          </div>

          <div className="space-y-2">
            {genres.map((g, i) => (
              <motion.button
                key={g.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.06, duration: 0.4 }}
                onClick={() => setGenre(g.id)}
                onMouseMove={(e: React.MouseEvent) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  (e.currentTarget as HTMLElement).style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
                  (e.currentTarget as HTMLElement).style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
                }}
                className="w-full group surface-interactive card-spotlight gradient-border flex items-center gap-4 p-4 text-left"
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0 transition-transform duration-200 group-hover:scale-125"
                  style={{ backgroundColor: g.color }}
                />
                <div>
                  <span className="text-[14px] font-semibold text-[var(--text-primary)] block">
                    {g.label}
                  </span>
                  <span className="text-[12px] text-[var(--text-tertiary)]">
                    {g.description}
                  </span>
                </div>
                <svg className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text-quaternary)]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  const activeGenre = genres.find((g) => g.id === genre)!;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="flex h-screen">
        {/* ── Left: Chat ── */}
        <div className="w-1/2 flex flex-col border-r border-[var(--border-default)]">
          {/* Chat header */}
          <div className="h-12 px-4 border-b border-[var(--border-default)] flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeGenre.color }} />
              <span className="text-[13px] font-semibold text-[var(--text-primary)]">
                Gemini · {activeGenre.label}
              </span>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={handlePlotTwist}
                disabled={isGenerating || messages.length === 0}
                className="btn-icon !w-auto !h-7 !rounded-[6px] px-2.5 gap-1 text-[11px] font-medium disabled:opacity-25"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/></svg>
                Twist
              </button>
              <button
                onClick={handleWTFEnding}
                disabled={isGenerating || messages.length === 0}
                className="btn-icon !w-auto !h-7 !rounded-[6px] px-2.5 gap-1 text-[11px] font-medium disabled:opacity-25"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                Ending
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-5 space-y-3">
            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-full text-center"
              >
                <div className="w-10 h-10 rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] flex items-center justify-center mb-3">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-quaternary)" strokeWidth="1.5">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <p className="text-[13px] text-[var(--text-secondary)] mb-1">Start your story</p>
                <p className="text-[12px] text-[var(--text-quaternary)]">
                  &ldquo;A robot discovers music for the first time&rdquo;
                </p>
              </motion.div>
            )}

            <AnimatePresence>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-[12px] px-3.5 py-2.5 text-[13px] leading-relaxed ${
                      msg.role === "user"
                        ? "bg-[var(--accent)] text-white"
                        : "bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-secondary)]"
                    }`}
                  >
                    {msg.content.slice(0, 200)}{msg.content.length > 200 ? "…" : ""}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isGenerating && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[12px] px-3.5 py-2.5">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="w-1.5 h-1.5 bg-[var(--text-quaternary)] rounded-full"
                        animate={{ opacity: [0.2, 0.8, 0.2] }}
                        transition={{ repeat: Infinity, duration: 1, delay: i * 0.15 }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-[var(--border-default)]">
            <form
              onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
              className="flex gap-2"
            >
              <VoiceInput
                apiKey={process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? ""}
                onTranscript={(text) => setInput(prev => prev ? prev + " " + text : text)}
                disabled={isGenerating}
              />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={messages.length === 0 ? "Describe your story idea… or press 🎤" : "Guide the story…"}
                disabled={isGenerating}
                className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[10px] px-3.5 py-2.5 text-[13px] text-[var(--text-primary)] placeholder-[var(--text-quaternary)] focus:border-[var(--accent)] disabled:opacity-30 transition-colors duration-200"
              />
              <button
                type="submit"
                disabled={isGenerating || !input.trim()}
                className="btn-primary !py-2.5 !px-4 !text-[13px] disabled:opacity-25 disabled:cursor-not-allowed"
              >
                Send
              </button>
            </form>
          </div>
        </div>

        {/* ── Right: Story Preview ── */}
        <div className="w-1/2 flex flex-col bg-[var(--bg-primary)]">
          <div className="h-12 px-4 border-b border-[var(--border-default)] flex items-center justify-between flex-shrink-0">
            <span className="text-[13px] font-semibold text-[var(--text-primary)]">Story</span>
            {currentStory && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => onStoryComplete(currentStory, genre)}
                className="badge badge-mint cursor-pointer hover:bg-[rgba(52,211,153,0.15)] transition-colors"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Finish & Narrate
              </motion.button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {!currentStory ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-10 h-10 rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] flex items-center justify-center mb-3">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-quaternary)" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                </div>
                <p className="text-[13px] text-[var(--text-secondary)] mb-1">No story yet</p>
                <p className="text-[12px] text-[var(--text-quaternary)]">
                  Start chatting to co-author your tale
                </p>
              </div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="prose-story whitespace-pre-wrap">{currentStory.replace(/#{1,6}\s*/g, "").replace(/\*{1,3}(.*?)\*{1,3}/g, "$1")}</div>
                <div ref={storyEndRef} />
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
