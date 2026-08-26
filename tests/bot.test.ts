process.env.TELEGRAM_BOT_TOKEN = "test-token";
process.env.ZEN_API_KEY = "test-key";
process.env.WEBHOOK_SECRET = "test-secret";

import { Bot } from "grammy";
import { describe, expect, it, vi } from "vitest";
import { createBot } from "../src/bot";

describe("createBot", () => {
  it("construye la instancia del bot sin llamar a la API", () => {
    const answerQuestion = vi.fn(async () => "respuesta");
    const bot = createBot({ answerQuestion });
    expect(bot).toBeInstanceOf(Bot);
  });
});