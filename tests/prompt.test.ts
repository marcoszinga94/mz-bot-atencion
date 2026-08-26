import { describe, expect, it } from "vitest";
import { buildMessages } from "../src/prompt.js";
import type { Chunk } from "../src/types.js";

const chunks: Chunk[] = [
  { id: 0, source: "servicios.md", text: "Tienda online: desarrollo inicial $500 + $30 por mes." },
];

describe("buildMessages", () => {
  it("usa persona genérica por defecto (sin nombre hardcodeado)", () => {
    const messages = buildMessages(chunks, "¿cuánto cuesta una tienda online?");
    expect(messages[0].content).toContain("asistente virtual genérico");
    expect(messages[0].content).not.toContain("Marcos");
    expect(messages[0].content).toContain("servicios.md");
    expect(messages[0].content).toContain("$500");
    expect(messages[0].content).toContain("[CONTEXTO]");
    expect(messages[1]).toEqual({
      role: "user",
      content: "¿cuánto cuesta una tienda online?",
    });
  });

  it("compone la persona con nombre y descripción", () => {
    const messages = buildMessages(chunks, "hola", {
      name: "ACME",
      description: "agencia de diseño",
    });
    expect(messages[0].content).toContain(
      "Sos el asistente virtual de ACME, agencia de diseño.",
    );
  });

  it("usa la descripción sola si no hay nombre", () => {
    const messages = buildMessages(chunks, "hola", {
      description: "clínica odontológica",
    });
    expect(messages[0].content).toContain(
      "Sos un asistente virtual: clínica odontológica.",
    );
  });

  it("indica que no debe inventar datos", () => {
    const messages = buildMessages(chunks, "hola");
    expect(messages[0].content).toContain("Nunca inventes");
  });
});