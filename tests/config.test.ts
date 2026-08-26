import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config";

describe("loadConfig", () => {
  it("lanza si falta TELEGRAM_BOT_TOKEN", () => {
    expect(() => loadConfig({})).toThrow("TELEGRAM_BOT_TOKEN");
  });

  it("lanza si falta ZEN_API_KEY", () => {
    expect(() => loadConfig({ TELEGRAM_BOT_TOKEN: "t" })).toThrow("ZEN_API_KEY");
  });

  it("usa deepseek-v4-flash como modelo por defecto", () => {
    const config = loadConfig({ TELEGRAM_BOT_TOKEN: "t", ZEN_API_KEY: "k" });
    expect(config.zenModel).toBe("deepseek-v4-flash");
  });

  it("respeta ZEN_MODEL", () => {
    const config = loadConfig({
      TELEGRAM_BOT_TOKEN: "t",
      ZEN_API_KEY: "k",
      ZEN_MODEL: "nemotron-3-ultra-free",
    });
    expect(config.zenModel).toBe("nemotron-3-ultra-free");
  });
});