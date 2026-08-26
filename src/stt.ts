import { env, pipeline } from "@huggingface/transformers";
import { spawn } from "node:child_process";
import ffmpegPath from "ffmpeg-static";

const MODEL = "Xenova/whisper-tiny";
const FFMPEG_PATH = ffmpegPath as unknown as string;

env.cacheDir = "/tmp/transformers";

type Transcriber = ReturnType<typeof pipeline<"automatic-speech-recognition">>;

let transcriberPromise: Promise<Awaited<Transcriber>> | null = null;

function getTranscriber() {
  transcriberPromise ??= pipeline("automatic-speech-recognition", MODEL, {
    dtype: "q8",
  }) as Promise<Awaited<Transcriber>>;
  return transcriberPromise;
}

export function decodeToPcm(buffer: Buffer): Promise<Float32Array> {
  return new Promise((resolve, reject) => {
    const ff = spawn(
      FFMPEG_PATH,
      ["-i", "pipe:0", "-f", "f32le", "-ac", "1", "-ar", "16000", "pipe:1"],
      { stdio: ["pipe", "pipe", "pipe"] },
    );

    const chunks: Buffer[] = [];
    ff.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    ff.on("error", reject);
    ff.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`ffmpeg salió con código ${code}`));
        return;
      }
      const out = Buffer.concat(chunks);
      resolve(new Float32Array(out.buffer, out.byteOffset, out.length / 4));
    });

    ff.stdin.write(buffer);
    ff.stdin.end();
  });
}

export async function transcribe(buffer: Buffer): Promise<string> {
  const audio = await decodeToPcm(buffer);
  const transcriber = await getTranscriber();
  const output = await transcriber(audio, { language: "es", task: "transcribe" });
  return (output as { text: string }).text.trim();
}