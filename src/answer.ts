import { buildMessages, type Persona } from "./prompt.js";
import { complete } from "./zen.js";
import { embed, retrieve } from "./rag.js";
import { createBlobStore, type KnowledgeStore } from "./store.js";
import { getConfig } from "./config.js";
import type { Chunk, ChatMessage, KnowledgeEntry } from "./types.js";

export interface AnswerDeps {
  embed: (text: string) => Promise<number[]>;
  retrieve: (entries: KnowledgeEntry[], queryVec: number[], k: number) => Chunk[];
  complete: (messages: ChatMessage[]) => Promise<string>;
  getEntries: () => Promise<KnowledgeEntry[]>;
  persona: Persona;
}

export function createAnswerer(deps: AnswerDeps) {
  return async function answerQuestion(question: string): Promise<string> {
    const entries = await deps.getEntries();
    const queryVec = await deps.embed(question);
    const chunks = deps.retrieve(entries, queryVec, 4);
    const messages = buildMessages(chunks, question, deps.persona);
    return deps.complete(messages);
  };
}

let store: KnowledgeStore | null = null;
function getStore(): KnowledgeStore {
  store ??= createBlobStore(getConfig().blobToken);
  return store;
}

let defaultAnswerer: ((question: string) => Promise<string>) | null = null;
function getDefaultAnswerer(): (question: string) => Promise<string> {
  defaultAnswerer ??= createAnswerer({
    embed,
    retrieve,
    complete,
    getEntries: () => getStore().list(),
    persona: {
      name: getConfig().assistantName,
      description: getConfig().assistantDescription,
    },
  });
  return defaultAnswerer;
}

export async function answerQuestion(question: string): Promise<string> {
  return getDefaultAnswerer()(question);
}