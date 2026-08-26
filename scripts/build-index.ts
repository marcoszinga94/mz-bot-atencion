import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "@huggingface/transformers";
import type { Chunk } from "../src/types";

const KNOWLEDGE_DIR = path.join(process.cwd(), "knowledge");
const MODEL = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";

function chunkMarkdown(content: string): string[] {
  return content
    .split(/\n(?=#+ )/)
    .map((section) => section.trim())
    .filter((section) => section.length > 0);
}

const extractor = await pipeline("feature-extraction", MODEL, { dtype: "q8" });

const files = (await readdir(KNOWLEDGE_DIR)).filter((f) => f.endsWith(".md"));

const chunks: Chunk[] = [];
const texts: string[] = [];
for (const file of files.sort()) {
  const content = await readFile(path.join(KNOWLEDGE_DIR, file), "utf8");
  for (const section of chunkMarkdown(content)) {
    chunks.push({ id: chunks.length, source: file, text: section });
    texts.push(section);
  }
}

const output = await extractor(texts, { pooling: "mean", normalize: true });
const embeddings = output.tolist() as number[][];

await writeFile(
  path.join(KNOWLEDGE_DIR, "index.json"),
  JSON.stringify({ chunks, embeddings }),
);

console.log(`Índice escrito: ${chunks.length} chunks, ${embeddings.length} embeddings (${embeddings[0]?.length} dims)`);