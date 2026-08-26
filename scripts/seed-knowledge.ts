import { readFileSync, existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { pipeline } from "@huggingface/transformers";
import { chunkText } from "../src/learn.js";
import { createBlobStore } from "../src/store.js";
import type { KnowledgeEntry } from "../src/types.js";

const dotenvFile = path.join(process.cwd(), ".env");
if (existsSync(dotenvFile)) {
  for (const line of readFileSync(dotenvFile, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match) process.env[match[1]] = match[2];
  }
}

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error(
    "Falta BLOB_READ_WRITE_TOKEN. Creá un store con `vercel blob create-store` y agregalo al .env.",
  );
  process.exit(1);
}

const MODEL = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";
const store = createBlobStore(process.env.BLOB_READ_WRITE_TOKEN);
const extractor = await pipeline("feature-extraction", MODEL, { dtype: "q8" });

const KNOWLEDGE_DIR = path.join(process.cwd(), "knowledge");
const files = (await readdir(KNOWLEDGE_DIR)).filter((f) =>
  f.endsWith(".md"),
);

const entries: KnowledgeEntry[] = [];
for (const file of files.sort()) {
  const content = await readFile(path.join(KNOWLEDGE_DIR, file), "utf8");
  for (const chunk of chunkText(content)) {
    const output = await extractor([chunk], { pooling: "mean", normalize: true });
    entries.push({
      id: randomUUID(),
      source: file,
      text: chunk,
      embedding: Array.from(output.tolist()[0] as number[]),
    });
  }
}

await store.clear();
await store.append(entries);

console.log(
  `Seed OK: ${entries.length} fragmentos de ${files.length} archivos subidos a Vercel Blob.`,
);