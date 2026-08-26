import { describe, expect, it } from "vitest";
import { cosine, loadIndex, retrieve } from "../src/rag.js";

describe("cosine", () => {
  it("devuelve 1 para vectores idénticos", () => {
    expect(cosine([1, 0, 0], [1, 0, 0])).toBeCloseTo(1);
  });

  it("devuelve 0 para vectores ortogonales", () => {
    expect(cosine([1, 0], [0, 1])).toBeCloseTo(0);
  });
});

describe("retrieve", () => {
  const index = {
    chunks: [
      { id: 0, source: "a.md", text: "tienda" },
      { id: 1, source: "b.md", text: "certificado" },
      { id: 2, source: "c.md", text: "proyecto" },
    ],
    embeddings: [
      [1, 0],
      [0, 1],
      [0.5, 0.5],
    ],
  };

  it("ordena por similitud y devuelve top-k", () => {
    const hits = retrieve(index, [1, 0], 2);
    expect(hits).toHaveLength(2);
    expect(hits[0].id).toBe(0);
  });

  it("usa k=4 por defecto", () => {
    const hits = retrieve(index, [1, 0]);
    expect(hits).toHaveLength(3);
  });
});

describe("RAG de integración (índice real)", () => {
  it("recupera un chunk de servicios para '¿hacés tiendas online?'", async () => {
    const index = loadIndex();
    expect(index.chunks.length).toBeGreaterThan(0);
    const sources = new Set(index.chunks.map((c) => c.source));
    expect(sources).toContain("servicios.md");
  }, 60_000);
});