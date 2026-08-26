process.env.TELEGRAM_BOT_TOKEN = "test-token";
process.env.ZEN_API_KEY = "test-key";

import { describe, expect, it, vi } from "vitest";
import { createAnswerer } from "../src/answer";
import type { ChatMessage, Chunk, Index } from "../src/types";

const chunk: Chunk = { id: 0, source: "servicios.md", text: "Tienda online." };
const index: Index = { chunks: [chunk], embeddings: [[1, 0]] };

describe("createAnswerer", () => {
  it("encadena RAG + prompt + Zen y devuelve la respuesta", async () => {
    const embed = vi.fn(async () => [1, 0]);
    const retrieve = vi.fn(() => [chunk]);
    const complete = vi.fn(async (_messages: ChatMessage[]) => "Sí, hace tiendas online.");
    const loadIndex = vi.fn(() => index);

    const answer = createAnswerer({ embed, retrieve, complete, loadIndex });

    const result = await answer("¿hacés tiendas online?");

    expect(result).toBe("Sí, hace tiendas online.");
    expect(embed).toHaveBeenCalledWith("¿hacés tiendas online?");
    expect(retrieve).toHaveBeenCalledWith(index, [1, 0], 4);
    expect(complete).toHaveBeenCalledOnce();

    const messages = complete.mock.calls[0][0];
    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toContain("servicios.md");
    expect(messages[1]).toEqual({ role: "user", content: "¿hacés tiendas online?" });
  });
});