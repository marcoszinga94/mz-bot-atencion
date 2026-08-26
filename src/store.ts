import { get, put } from "@vercel/blob";
import type { KnowledgeEntry } from "./types.js";

const PATHNAME = "knowledge.json";

export interface KnowledgeStore {
  list(): Promise<KnowledgeEntry[]>;
  append(entries: KnowledgeEntry[]): Promise<void>;
  clear(): Promise<void>;
}

export function createBlobStore(token?: string): KnowledgeStore {
  let cache: KnowledgeEntry[] | null = null;

  const read = async (): Promise<KnowledgeEntry[]> => {
    if (cache) return cache;
    try {
      const blob = await get(PATHNAME, { access: "private", token });
      if (!blob) return [];
      cache = JSON.parse(
        await new Response(blob.stream).text(),
      ) as KnowledgeEntry[];
    } catch {
      cache = [];
    }
    return cache;
  };

  const write = async (entries: KnowledgeEntry[]): Promise<void> => {
    await put(PATHNAME, JSON.stringify(entries), {
      access: "private",
      addRandomSuffix: false,
      allowOverwrite: true,
      token,
    });
    cache = entries;
  };

  return {
    list: read,
    async append(entries) {
      await write([...entries, ...(await read())]);
    },
    async clear() {
      await write([]);
    },
  };
}

export function createMemoryStore(
  initial: KnowledgeEntry[] = [],
): KnowledgeStore {
  let data = [...initial];
  return {
    async list() {
      return data;
    },
    async append(entries) {
      data = [...data, ...entries];
    },
    async clear() {
      data = [];
    },
  };
}