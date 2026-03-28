// Cinematic export using ffmpeg.wasm
// Merges Veo video clips + ElevenLabs narration + Lyria music → single MP4

export interface ExportOptions {
  videoBlobs: (Blob | null)[]; // Up to 3 Veo video blobs (null = not available)
  narrationUrl: string | null; // ElevenLabs audio URL
  lyriaBuffer: ArrayBuffer | null; // Collected Lyria PCM (16-bit, 24kHz mono)
  onProgress?: (percent: number, label: string) => void;
}

// Convert raw 16-bit PCM to a minimal WAV blob
function pcmToWav(pcm: ArrayBuffer, sampleRate = 24000): ArrayBuffer {
  const numSamples = pcm.byteLength / 2;
  const wavBuffer = new ArrayBuffer(44 + pcm.byteLength);
  const view = new DataView(wavBuffer);
  const write = (offset: number, val: number, bytes: number) => {
    for (let i = 0; i < bytes; i++) view.setUint8(offset + i, (val >> (8 * i)) & 0xff);
  };
  // RIFF header
  [0x52, 0x49, 0x46, 0x46].forEach((b, i) => view.setUint8(i, b)); // "RIFF"
  write(4, 36 + pcm.byteLength, 4);
  [0x57, 0x41, 0x56, 0x45].forEach((b, i) => view.setUint8(8 + i, b)); // "WAVE"
  [0x66, 0x6d, 0x74, 0x20].forEach((b, i) => view.setUint8(12 + i, b)); // "fmt "
  write(16, 16, 4); // Subchunk1Size
  write(20, 1, 2);  // PCM format
  write(22, 1, 2);  // 1 channel (mono)
  write(24, sampleRate, 4);
  write(28, sampleRate * 2, 4); // ByteRate
  write(32, 2, 2);  // BlockAlign
  write(34, 16, 2); // BitsPerSample
  [0x64, 0x61, 0x74, 0x61].forEach((b, i) => view.setUint8(36 + i, b)); // "data"
  write(40, pcm.byteLength, 4);
  new Uint8Array(wavBuffer, 44).set(new Uint8Array(pcm));
  return wavBuffer;
}

export async function exportCinematicFilm(opts: ExportOptions): Promise<Blob> {
  const { videoBlobs, narrationUrl, lyriaBuffer, onProgress } = opts;
  const validVideos = videoBlobs.filter((b): b is Blob => b !== null && b.size > 0);

  onProgress?.(5, "Loading ffmpeg…");

  // Dynamic import — ffmpeg.wasm is large, lazy load
  const { FFmpeg } = await import("@ffmpeg/ffmpeg");
  const { fetchFile, toBlobURL } = await import("@ffmpeg/util");

  const ffmpeg = new FFmpeg();

  ffmpeg.on("progress", ({ progress }) => {
    onProgress?.(10 + Math.floor(progress * 70), "Assembling film…");
  });

  // Load ffmpeg core
  onProgress?.(8, "Loading ffmpeg core…");
  await ffmpeg.load({
    coreURL: await toBlobURL(
      "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js",
      "text/javascript"
    ),
    wasmURL: await toBlobURL(
      "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm",
      "application/wasm"
    ),
  });

  onProgress?.(15, "Writing scene files…");

  const hasVideos = validVideos.length > 0;
  const outputFile = "output.mp4";

  if (hasVideos) {
    // Write each video
    for (let i = 0; i < validVideos.length; i++) {
      await ffmpeg.writeFile(`scene${i}.mp4`, await fetchFile(validVideos[i]));
    }

    // Concat list
    const concatLines = validVideos.map((_, i) => `file 'scene${i}.mp4'`).join("\n");
    await ffmpeg.writeFile("concat.txt", concatLines);

    onProgress?.(25, "Concatenating scenes…");

    if (narrationUrl || lyriaBuffer) {
      // First concat video
      await ffmpeg.exec(["-f", "concat", "-safe", "0", "-i", "concat.txt", "-c", "copy", "merged.mp4"]);

      onProgress?.(40, "Mixing audio tracks…");

      const audioInputs: string[] = ["-i", "merged.mp4"];
      const audioFilters: string[] = [];
      let audioIdx = 1;

      if (narrationUrl) {
        const narrationBlob = await fetch(narrationUrl).then(r => r.blob());
        await ffmpeg.writeFile("narration.mp3", await fetchFile(narrationBlob));
        audioInputs.push("-i", "narration.mp3");
        audioFilters.push(`[${audioIdx}:a]volume=1.0[narr]`);
        audioIdx++;
      }

      if (lyriaBuffer) {
        const wavBuf = pcmToWav(lyriaBuffer);
        await ffmpeg.writeFile("music.wav", new Uint8Array(wavBuf));
        audioInputs.push("-i", "music.wav");
        audioFilters.push(`[${audioIdx}:a]volume=0.28[music]`);
        audioIdx++;
      }

      onProgress?.(55, "Rendering final film…");

      let filterComplex = audioFilters.join(";");
      let audioMap = "";

      if (narrationUrl && lyriaBuffer) {
        filterComplex += ";[narr][music]amix=inputs=2:duration=longest[a]";
        audioMap = "[a]";
      } else if (narrationUrl) {
        audioMap = "[narr]";
      } else if (lyriaBuffer) {
        audioMap = "[music]";
      }

      const args = [
        ...audioInputs,
        "-filter_complex", filterComplex,
        "-map", "0:v",
        "-map", audioMap,
        "-c:v", "copy",
        "-c:a", "aac",
        "-shortest",
        outputFile,
      ];

      await ffmpeg.exec(args);
    } else {
      // Video only, no audio
      await ffmpeg.exec(["-f", "concat", "-safe", "0", "-i", "concat.txt", "-c", "copy", outputFile]);
    }
  } else {
    // No videos — audio-only "film" with black screen
    onProgress?.(30, "Building audio film…");
    const audioInputs: string[] = [];
    const filters: string[] = [];
    let idx = 0;

    if (narrationUrl) {
      const narrationBlob = await fetch(narrationUrl).then(r => r.blob());
      await ffmpeg.writeFile("narration.mp3", await fetchFile(narrationBlob));
      audioInputs.push("-i", "narration.mp3");
      filters.push(`[${idx}:a]volume=1.0[narr]`);
      idx++;
    }
    if (lyriaBuffer) {
      const wavBuf = pcmToWav(lyriaBuffer);
      await ffmpeg.writeFile("music.wav", new Uint8Array(wavBuf));
      audioInputs.push("-i", "music.wav");
      filters.push(`[${idx}:a]volume=0.28[music]`);
    }

    const audioMap = narrationUrl && lyriaBuffer
      ? "[a]"
      : narrationUrl ? "[narr]" : "[music]";
    const fc = narrationUrl && lyriaBuffer
      ? filters.join(";") + ";[narr][music]amix=inputs=2:duration=longest[a]"
      : filters.join(";");

    await ffmpeg.exec([
      "-f", "lavfi", "-i", "color=c=black:s=1280x720:r=24",
      ...audioInputs,
      "-filter_complex", fc,
      "-map", "0:v",
      "-map", audioMap,
      "-c:v", "libx264", "-c:a", "aac",
      "-shortest", outputFile,
    ]);
  }

  onProgress?.(88, "Packaging MP4…");
  const data = await ffmpeg.readFile(outputFile);
  onProgress?.(100, "Done!");

  // ffmpeg readFile returns Uint8Array | string — always use Uint8Array path
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bytes = data instanceof Uint8Array ? data : new Uint8Array((data as any).buffer ?? new ArrayBuffer(0));
  return new Blob([bytes.buffer as ArrayBuffer], { type: "video/mp4" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
