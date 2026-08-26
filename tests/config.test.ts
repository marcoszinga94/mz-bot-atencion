import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

describe("loadConfig", () => {
  it("lanza si falta TELEGRAM_BOT_TOKEN", () => {
    expect(() => loadConfig({})).toThrow("TELEGRAM_BOT_TOKEN");
  });

  it("lanza si falta ZEN_API_KEY", () => {
    expect(() => loadConfig({ TELEGRAM_BOT_TOKEN: "t" })).toThrow("ZEN_API_KEY");
  });

  it("lanza si falta WEBHOOK_SECRET", () => {
    expect(() =>
      loadConfig({ TELEGRAM_BOT_TOKEN: "t", ZEN_API_KEY: "k" }),
    ).toThrow("WEBHOOK_SECRET");
  });

  it("usa deepseek-v4-flash como modelo por defecto", () => {
    const config = loadConfig({
      TELEGRAM_BOT_TOKEN: "t",
      ZEN_API_KEY: "k",
      WEBHOOK_SECRET: "s",
    });
    expect(config.zenModel).toBe("deepseek-v4-flash");
  });

  it("respeta ZEN_MODEL y expone webhookSecret", () => {
    const config = loadConfig({
      TELEGRAM_BOT_TOKEN: "t",
      ZEN_API_KEY: "k",
      WEBHOOK_SECRET: "s",
      ZEN_MODEL: "nemotron-3-ultra-free",
    });
    expect(config.zenModel).toBe("nemotron-3-ultra-free");
    expect(config.webhookSecret).toBe("s");
  });
});