import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";

const base = { TELEGRAM_BOT_TOKEN: "t", ZEN_API_KEY: "k", WEBHOOK_SECRET: "s" };

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
    expect(loadConfig(base).zenModel).toBe("deepseek-v4-flash");
  });

  it("respeta ZEN_MODEL y expone webhookSecret", () => {
    const config = loadConfig({ ...base, ZEN_MODEL: "nemotron-3-ultra-free" });
    expect(config.zenModel).toBe("nemotron-3-ultra-free");
    expect(config.webhookSecret).toBe("s");
  });

  it("parsea ADMIN_IDS como números válidos", () => {
    const config = loadConfig({ ...base, ADMIN_IDS: "111, 222, abc, -3" });
    expect(config.adminIds).toEqual([111, 222]);
  });

  it("deja adminIds vacío si no está definido", () => {
    expect(loadConfig(base).adminIds).toEqual([]);
  });

  it("expone persona, contacto y blob token opcionales", () => {
    const config = loadConfig({
      ...base,
      ASISTENTE_NOMBRE: "ACME",
      ASISTENTE_DESCRIPCION: "agencia de diseño",
      ASISTENTE_CONTACTO: "📧 hola@acme.com",
      BLOB_READ_WRITE_TOKEN: "blob-token",
    });
    expect(config.assistantName).toBe("ACME");
    expect(config.assistantDescription).toBe("agencia de diseño");
    expect(config.assistantContact).toBe("📧 hola@acme.com");
    expect(config.blobToken).toBe("blob-token");
  });

  it("deja los opcionales como undefined si no están", () => {
    const config = loadConfig(base);
    expect(config.assistantName).toBeUndefined();
    expect(config.assistantContact).toBeUndefined();
    expect(config.blobToken).toBeUndefined();
  });
});