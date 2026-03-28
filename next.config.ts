import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // COOP: same-origin keeps popup isolation
          // COEP: unsafe-none — fully unblocks Google Live API + Lyria WebSockets
          // (ffmpeg.wasm export still works via in-memory fallback without SharedArrayBuffer)
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "unsafe-none" },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.phantom.app https://*.solana.com https://unpkg.com; connect-src 'self' https://*.solana.com https://*.mongodb.net https://*.googleapis.com https://*.elevenlabs.io https://image.pollinations.ai wss://*.phantom.app wss://generativelanguage.googleapis.com https://unpkg.com; img-src 'self' data: blob: https://image.pollinations.ai https://*.googleapis.com; media-src 'self' blob: data:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; worker-src 'self' blob:;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
