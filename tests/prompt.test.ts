import { describe, expect, it } from "vitest";
import { buildMessages } from "../src/prompt.js";
import type { Chunk } from "../src/types.js";

const chunks: Chunk[] = [
  { id: 0, source: "servicios.md", text: "Tienda online: desarrollo inicial $500 + $30 por mes." },
];

describe("buildMessages", () => {
  it("devuelve un mensaje system con el contexto y un mensaje user con la pregunta", () => {
    const messages = buildMessages(chunks, "¿cuánto cuesta una tienda online?");
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toContain("servicios.md");
    expect(messages[0].content).toContain("$500");
    expect(messages[0].content).toContain("[CONTEXTO]");
    expect(messages[1]).toEqual({ role: "user", content: "¿cuánto cuesta una tienda online?" });
  });

  it("indica que no debe inventar datos", () => {
    const messages = buildMessages(chunks, "hola");
    expect(messages[0].content).toContain("Nunca inventes");
  });
});