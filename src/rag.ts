import { env, pipeline } from "@huggingface/transformers";
import type { Chunk, Index } from "./types";
import rawIndex from "../knowledge/index.json";

env.cacheDir = "/tmp/transformers";

const MODEL = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";

let extractorPromise: ReturnType<typeof pipeline<"feature-extraction">> | null = null;

function getExtractor() {
  extractorPromise ??= pipeline("feature-extraction", MODEL, { dtype: "q8" });
  return extractorPromise;
}

export async function embed(text: string): Promise<number[]> {
  const extractor = await getExtractor();
  const output = await extractor([text], { pooling: "mean", normalize: true });
  return Array.from(output.tolist()[0] as number[]);
}

export function cosine(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

export function retrieve(index: Index, queryVec: number[], k = 4): Chunk[] {
  return index.chunks
    .map((chunk, i) => ({ chunk, score: cosine(index.embeddings[i], queryVec) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((entry) => entry.chunk);
}

export function loadIndex(): Index {
  return rawIndex as Index;
}