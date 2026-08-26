process.env.TELEGRAM_BOT_TOKEN = "test-token";
process.env.ZEN_API_KEY = "test-key";
process.env.WEBHOOK_SECRET = "test-secret";

import { describe, expect, it, vi } from "vitest";
import { createAnswerer } from "../src/answer.js";
import type { ChatMessage, Chunk, KnowledgeEntry } from "../src/types.js";

const chunk: Chunk = { id: 0, source: "servicios.md", text: "Tienda online." };
const entries: KnowledgeEntry[] = [
  { id: "1", source: "servicios.md", text: "Tienda online.", embedding: [1, 0] },
];

describe("createAnswerer", () => {
  it("encadena RAG + prompt + Zen y devuelve la respuesta", async () => {
    const embed = vi.fn(async () => [1, 0]);
    const retrieve = vi.fn(() => [chunk]);
    const complete = vi.fn(
      async (_messages: ChatMessage[]) => "Sí, hace tiendas online.",
    );
    const getEntries = vi.fn(async () => entries);

    const answer = createAnswerer({
      embed,
      retrieve,
      complete,
      getEntries,
      persona: { name: "ACME" },
    });

    const result = await answer("¿hacés tiendas online?");

    expect(result).toBe("Sí, hace tiendas online.");
    expect(getEntries).toHaveBeenCalledOnce();
    expect(embed).toHaveBeenCalledWith("¿hacés tiendas online?");
    expect(retrieve).toHaveBeenCalledWith(entries, [1, 0], 4);
    expect(complete).toHaveBeenCalledOnce();

    const messages = complete.mock.calls[0][0];
    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toContain("ACME");
    expect(messages[0].content).toContain("servicios.md");
    expect(messages[1]).toEqual({
      role: "user",
      content: "¿hacés tiendas online?",
    });
  });

  it("responde sin conocimiento si no hay entradas", async () => {
    const getEntries = vi.fn(async () => []);
    const answer = createAnswerer({
      embed: vi.fn(async () => [1, 0]),
      retrieve: vi.fn(() => []),
      complete: vi.fn(async () => "No tengo esa información."),
      getEntries,
      persona: {},
    });
    expect(await answer("hola")).toBe("No tengo esa información.");
    expect(getEntries).toHaveBeenCalledOnce();
  });
});