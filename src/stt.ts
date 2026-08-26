import { env, pipeline } from "@huggingface/transformers";
import { OggOpusDecoder } from "ogg-opus-decoder";

const MODEL = "Xenova/whisper-tiny";

env.cacheDir = "/tmp/transformers";

type Transcriber = ReturnType<typeof pipeline<"automatic-speech-recognition">>;

let transcriberPromise: Promise<Awaited<Transcriber>> | null = null;

function getTranscriber() {
  transcriberPromise ??= pipeline("automatic-speech-recognition", MODEL, {
    dtype: "q8",
  }) as Promise<Awaited<Transcriber>>;
  return transcriberPromise;
}

export function resample(
  audio: Float32Array,
  fromRate: number,
  toRate: number,
): Float32Array {
  if (fromRate === toRate) return audio;
  const ratio = fromRate / toRate;
  const length = Math.round(audio.length / ratio);
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const pos = i * ratio;
    const i0 = Math.floor(pos);
    const i1 = Math.min(i0 + 1, audio.length - 1);
    const frac = pos - i0;
    out[i] = audio[i0] + (audio[i1] - audio[i0]) * frac;
  }
  return out;
}

export async function transcribe(buffer: Buffer): Promise<string> {
  const decoder = new OggOpusDecoder();
  await decoder.ready;
  try {
    const { channelData, sampleRate } = decoder.decode(new Uint8Array(buffer));
    const mono = channelData[0];
    const audio16k = resample(mono, sampleRate, 16000);
    const transcriber = await getTranscriber();
    const output = await transcriber(audio16k);
    return (output as { text: string }).text.trim();
  } finally {
    decoder.free();
  }
}