<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/Solana-Devnet-9945FF?style=for-the-badge&logo=solana&logoColor=white" />
  <img src="https://img.shields.io/badge/Google%20Gemini-2.5%20Flash-4285F4?style=for-the-badge&logo=google&logoColor=white" />
</p>

<h1 align="center">Lore</h1>
<p align="center"><strong>AI Cinematic Story Platform</strong></p>
<p align="center">
  <em>Speak a sentence. Get a cinematic film. Mint it on Solana forever.</em>
</p>

<p align="center">
  Built for <strong>Glitch 2026 — Google DeepMind Hackathon</strong>
</p>

---

## What is Lore?

**Lore** transforms a single story idea into a full cinematic experience in under two minutes. You co-author a narrative with Gemini AI, watch it come to life as HD video scenes with a live music score and professional narration, then permanently preserve it on the Solana blockchain as an NFT.

Every piece of the pipeline — story generation, voice co-authoring, video rendering, music composition, narration, and on-chain minting — runs end-to-end through cutting-edge generative AI APIs.

---

## Features

### AI Story Co-Authoring (Gemini 2.5 Flash)
Describe an idea in a sentence or paragraph. Gemini 2.5 Flash co-writes rich, multi-chapter narratives in real time, adapting to your creative direction at every turn. Supports both typed input and voice dictation.

### Real-Time Voice Co-Author (Google Live API)
A persistent voice assistant powered by Google Live API (`gemini-2.0-flash-live-001`) listens and responds with story suggestions using full bidirectional audio streaming. No push-to-talk — just speak naturally.

### Cinematic Video Generation (Veo 2)
Three 8-second HD video clips are rendered asynchronously from your story via Veo 2 (`veo-2.0-generate-001`). Scene illustrations are generated in parallel through Pollinations AI (Flux model, 1920x1080). The player automatically upgrades from static images to video as each clip finishes rendering.

### Live Music Score (Lyria RealTime)
Genre-adaptive background music streams directly into the browser the moment you start generating. Lyria RealTime (`lyria-realtime-exp`) delivers 48 kHz PCM audio over a WebSocket connection, matching the mood of your story — fantasy, horror, sci-fi, romance, or comedy.

### Professional Narration (ElevenLabs)
Your story is narrated with cinematic, expressive AI voices via ElevenLabs TTS, synced to the story text for an immersive listening experience.

### Solana NFT Minting
Connect a Phantom wallet and mint individual scene images or the full story as on-chain NFTs on Solana devnet. Each NFT includes scene image URLs, story metadata, and cryptographic proof stored via the Solana Memo Program.

### AI Agent Analysis (Fetch.ai)
A network of five Fetch.ai agents from Agentverse analyze and value your story across dimensions like narrative quality, market potential, and creative originality.

### In-Browser MP4 Export (ffmpeg.wasm)
Download your complete cinematic film — video scenes, narration audio, and music score — assembled entirely in the browser using ffmpeg.wasm. No server-side rendering required.

### Story Memory (MongoDB Atlas + Gemini Embeddings)
Stories are persisted in MongoDB Atlas with Gemini-generated vector embeddings, enabling semantic similarity search and personalized story recommendations.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Story Generation | **Gemini 2.5 Flash** — real-time co-authoring |
| Voice Co-Author | **Google Live API** (`gemini-2.0-flash-live-001`) — bidirectional realtime audio |
| Video Generation | **Veo 2** (`veo-2.0-generate-001`) — 8s HD video clips |
| Music Score | **Lyria RealTime** (`lyria-realtime-exp`) — 48 kHz PCM WebSocket streaming |
| Narration | **ElevenLabs** TTS — cinematic voice synthesis |
| Scene Illustrations | **Pollinations AI** (Flux model, 1920x1080) |
| NFT Minting | **Solana** devnet + **Phantom** wallet + Memo Program |
| Story Persistence | **MongoDB Atlas** + Gemini vector embeddings |
| AI Agent Network | **Fetch.ai** Agentverse — story analysis and valuation |
| Video Export | **ffmpeg.wasm** — in-browser MP4 assembly |
| Framework | **Next.js 16** + **React 19** + **TypeScript** + **Tailwind CSS v4** |
| Animation | **Framer Motion** |

---

## Architecture

```
User Input (voice / text)
       |
       v
Gemini 2.5 Flash -------> Story Text
       |
       +----> Google Live API (real-time voice co-author)
       |
       +----> ElevenLabs (narration audio)
       |
       +----> Pollinations AI (3 scene images, parallel)
       |
       +----> Veo 2 (3 HD video clips, async polling)
       |
       +----> Lyria RealTime (music score, WebSocket stream)
       |
       +----> Fetch.ai Agents (story analysis + valuation)
       |
       +----> MongoDB Atlas (story persistence + embeddings)
       |
       \----> Solana NFT Mint (Phantom wallet, devnet)
                |
                v
          ffmpeg.wasm ---> MP4 Export
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- A **Phantom** wallet browser extension (for Solana NFT minting)

### Installation

```bash
git clone https://github.com/aarshsharma2803-stack/lore.git
cd lore
npm install
```

### Environment Variables

Create a `.env.local` file in the project root with the following keys:

```env
# Google AI Studio — powers story generation, Veo 2, Live API, and Lyria
GEMINI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key

# ElevenLabs — cinematic voice narration
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# MongoDB Atlas — story persistence and vector search
MONGODB_URI=your_mongodb_connection_string

# Solana network configuration
NEXT_PUBLIC_SOLANA_NETWORK=devnet
```

### Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start creating stories.

---

## Project Structure

```
app/
  page.tsx              # Landing page
  create/               # Main story creation page
  demo/                 # Automated judge demo pipeline
  gallery/              # Story gallery
  api/
    generate/           # Gemini story generation (streaming)
    narrate/            # ElevenLabs TTS
    scenes/             # Scene extraction + image generation
    stories/            # MongoDB story CRUD
    veo/                # Veo 2 job creation + polling
    video/              # Video generation pipeline
    mint/               # Solana NFT transaction builder
    agent/              # Fetch.ai agent integration
    recommendations/    # Story recommendations

components/
  GeminiChat.tsx            # Story co-authoring chat interface
  LiveVoiceAssistant.tsx    # Google Live API voice panel
  GlobalAssistant.tsx       # Persistent AI assistant (all pages)
  CinematicPlayer.tsx       # Video/image player + MP4 export
  SceneNFTSelector.tsx      # Per-scene Solana NFT minting
  MintButton.tsx            # Phantom wallet mint trigger
  GenerationProgress.tsx    # Multi-track pipeline progress UI
  AgentNetwork.tsx          # Fetch.ai agent analysis visualization
  AudioPlayer.tsx           # Narration audio player
  LiveDirector.tsx          # Live directing controls
  VoiceInput.tsx            # Voice input component
  Navbar.tsx                # Navigation bar
  StoryCard.tsx             # Story preview card
  StoryPlayer.tsx           # Story playback component

lib/
  gemini.ts             # Gemini 2.5 Flash client
  veo.ts                # Veo 2 API client
  lyria.ts              # Lyria RealTime WebSocket client
  gemini-live.ts        # Google Live API client
  elevenlabs.ts         # ElevenLabs TTS client
  pollinations.ts       # Pollinations AI image generation
  solana.ts             # Solana transaction builder
  mongodb.ts            # MongoDB Atlas client
  fetchai.ts            # Fetch.ai agent client
  fetchai-agent.ts      # Fetch.ai agent definitions
  cinematic-export.ts   # ffmpeg.wasm MP4 assembly
  story-memory.ts       # Embedding + MongoDB similarity search
  ltxvideo.ts           # LTX Video client
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Run production server |
| `npm run lint` | Run ESLint |

---

<p align="center">
  Built for <strong>Glitch 2026 — Google DeepMind Hackathon</strong><br/>
  <sub>Created by Aarsh Sharma</sub>
</p>
