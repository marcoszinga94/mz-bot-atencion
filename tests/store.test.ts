import { describe, expect, it } from "vitest";
import { createMemoryStore } from "../src/store.js";
import type { KnowledgeEntry } from "../src/types.js";

const entry: KnowledgeEntry = {
  id: "1",
  source: "telegram",
  text: "hacemos tiendas online",
  embedding: [1, 0],
};

describe("createMemoryStore", () => {
  it("arranca vacío y lista sin entradas", async () => {
    const store = createMemoryStore();
    expect(await store.list()).toEqual([]);
  });

  it("apendea entradas al final", async () => {
    const store = createMemoryStore([entry]);
    const otro: KnowledgeEntry = {
      id: "2",
      source: "telegram",
      text: "otro dato",
      embedding: [0, 1],
    };
    await store.append([otro]);
    expect((await store.list()).map((e) => e.id)).toEqual(["1", "2"]);
  });

  it("limpia todas las entradas", async () => {
    const store = createMemoryStore([entry]);
    await store.clear();
    expect(await store.list()).toEqual([]);
  });
});