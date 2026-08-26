import { describe, expect, it } from "vitest";
import { cosine, embed, retrieve } from "../src/rag.js";
import type { KnowledgeEntry } from "../src/types.js";

describe("cosine", () => {
  it("devuelve 1 para vectores idénticos", () => {
    expect(cosine([1, 0, 0], [1, 0, 0])).toBeCloseTo(1);
  });

  it("devuelve 0 para vectores ortogonales", () => {
    expect(cosine([1, 0], [0, 1])).toBeCloseTo(0);
  });
});

describe("retrieve", () => {
  const entries: KnowledgeEntry[] = [
    { id: "a", source: "a.md", text: "tienda", embedding: [1, 0] },
    { id: "b", source: "b.md", text: "certificado", embedding: [0, 1] },
    { id: "c", source: "c.md", text: "proyecto", embedding: [0.5, 0.5] },
  ];

  it("ordena por similitud y devuelve top-k", () => {
    const hits = retrieve(entries, [1, 0], 2);
    expect(hits).toHaveLength(2);
    expect(hits[0].source).toBe("a.md");
  });

  it("usa k=4 por defecto", () => {
    const hits = retrieve(entries, [1, 0]);
    expect(hits).toHaveLength(3);
  });
});

describe("RAG de integración (embedding real)", () => {
  it("embebe y compara textos similares", async () => {
    const a = await embed("tienda online para vender productos");
    const b = await embed("e-commerce con carrito de compras");
    const c = await embed("receta de torta de chocolate");
    expect(a).toHaveLength(384);
    expect(cosine(a, b)).toBeGreaterThan(cosine(a, c));
  }, 60_000);
});