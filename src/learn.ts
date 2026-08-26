import { randomUUID } from "node:crypto";
import type { KnowledgeEntry } from "./types.js";
import type { KnowledgeStore } from "./store.js";

export function chunkText(text: string, maxChars = 1200): string[] {
  const sections = text
    .split(/\n(?=#{1,6} )/)
    .map((section) => section.trim())
    .filter((section) => section.length > 0);

  const out: string[] = [];
  for (const section of sections) {
    if (section.length <= maxChars) {
      out.push(section);
      continue;
    }
    let current = "";
    for (const paragraph of section.split(/\n\s*\n/).filter(Boolean)) {
      const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
      if (candidate.length > maxChars && current) {
        out.push(current);
        current = paragraph;
      } else {
        current = candidate;
      }
    }
    if (current) out.push(current);
  }
  return out;
}

export interface LearnDeps {
  store: KnowledgeStore;
  embed: (text: string) => Promise<number[]>;
}

export async function learnText(
  text: string,
  source: string,
  deps: LearnDeps,
): Promise<number> {
  const chunks = chunkText(text);
  const entries: KnowledgeEntry[] = [];
  for (const chunk of chunks) {
    const embedding = await deps.embed(chunk);
    entries.push({ id: randomUUID(), source, text: chunk, embedding });
  }
  if (entries.length > 0) await deps.store.append(entries);
  return entries.length;
}