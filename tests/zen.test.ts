process.env.TELEGRAM_BOT_TOKEN = "test-token";
process.env.ZEN_API_KEY = "test-key";
process.env.WEBHOOK_SECRET = "test-secret";

import { afterEach, describe, expect, it, vi } from "vitest";
import { complete } from "../src/zen";

const okResponse = (content: string) => ({
  ok: true,
  json: async () => ({ choices: [{ message: { content } }] }),
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("complete", () => {
  it("hace POST al endpoint de Zen con auth y devuelve el contenido", async () => {
    const fetchMock = vi.fn(async (...args: unknown[]) => okResponse("Hola"));
    vi.stubGlobal("fetch", fetchMock);

    const text = await complete([{ role: "user", content: "hola" }]);
    expect(text).toBe("Hola");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://opencode.ai/zen/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
          "Content-Type": "application/json",
        }),
      }),
    );

    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.model).toBe("deepseek-v4-flash");
    expect(body.temperature).toBe(0.4);
    expect(body.max_tokens).toBe(800);
    expect(body.messages).toEqual([{ role: "user", content: "hola" }]);
  });

  it("lanza error si la API responde con error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 500, text: async () => "boom" })),
    );

    await expect(complete([{ role: "user", content: "x" }])).rejects.toThrow(/500/);
  });
});