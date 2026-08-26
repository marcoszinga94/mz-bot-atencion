import { buildMessages } from "./prompt.js";
import { complete } from "./zen.js";
import { embed, loadIndex, retrieve } from "./rag.js";
import type { Chunk, ChatMessage, Index } from "./types.js";

export interface AnswerDeps {
  embed: (text: string) => Promise<number[]>;
  retrieve: (index: Index, queryVec: number[], k: number) => Chunk[];
  complete: (messages: ChatMessage[]) => Promise<string>;
  loadIndex: () => Index;
}

export function createAnswerer(deps: AnswerDeps) {
  return async function answerQuestion(question: string): Promise<string> {
    const index = deps.loadIndex();
    const queryVec = await deps.embed(question);
    const chunks = deps.retrieve(index, queryVec, 4);
    const messages = buildMessages(chunks, question);
    return deps.complete(messages);
  };
}

export const answerQuestion = createAnswerer({
  embed,
  retrieve,
  complete,
  loadIndex,
});