import { describe, expect, it, vi } from "vitest";
import { baseAction, isOwner, learnFromMessage, ownerRejected } from "../src/commands.js";
import type { KnowledgeEntry } from "../src/types.js";

describe("isOwner", () => {
  it("reconoce a un admin", () => {
    expect(isOwner([111, 222], 111)).toBe(true);
  });

  it("rechaza a un no-admin", () => {
    expect(isOwner([111], 222)).toBe(false);
  });

  it("rechaza userId indefinido", () => {
    expect(isOwner([111], undefined)).toBe(false);
  });
});

describe("ownerRejected", () => {
  it("devuelve el mensaje de rechazo", () => {
    expect(ownerRejected()).toContain("solo para el administrador");
  });
});

describe("learnFromMessage", () => {
  it("aprende el texto del argumento", async () => {
    const learnText = vi.fn(async () => 1);
    const msg = await learnFromMessage("hacemos tiendas online", undefined, "telegram", { learnText });
    expect(learnText).toHaveBeenCalledWith("hacemos tiendas online", "telegram");
    expect(msg).toContain("Aprendido ✅ 1 fragmento agregado");
  });

  it("prioriza el mensaje respondido sobre el argumento", async () => {
    const learnText = vi.fn(async () => 3);
    const msg = await learnFromMessage("ignorado", "texto respondido", "telegram", { learnText });
    expect(learnText).toHaveBeenCalledWith("texto respondido", "telegram");
    expect(msg).toContain("Aprendido ✅ 3 fragmentos agregados");
  });

  it("muestra uso si no hay texto ni reply", async () => {
    const learnText = vi.fn();
    const msg = await learnFromMessage("", undefined, "telegram", { learnText });
    expect(msg).toContain("Uso: /aprende");
    expect(learnText).not.toHaveBeenCalled();
  });
});

describe("baseAction", () => {
  it("lista fuentes y cantidad de fragmentos", async () => {
    const entries: KnowledgeEntry[] = [
      { id: "1", source: "telegram", text: "a", embedding: [1] },
      { id: "2", source: "servicios.md", text: "b", embedding: [1] },
      { id: "3", source: "servicios.md", text: "c", embedding: [1] },
    ];
    const msg = await baseAction(undefined, {
      listEntries: async () => entries,
      clearKnowledge: vi.fn(),
    });
    expect(msg).toContain("3 fragmentos en total");
    expect(msg).toContain("servicios.md: 2 fragmentos");
    expect(msg).toContain("telegram: 1 fragmento");
  });

  it("avisa si está vacía", async () => {
    const msg = await baseAction(undefined, {
      listEntries: async () => [],
      clearKnowledge: vi.fn(),
    });
    expect(msg).toContain("está vacía");
  });

  it("limpia con el argumento limpiar", async () => {
    const clearKnowledge = vi.fn();
    const msg = await baseAction("limpiar", {
      listEntries: vi.fn(),
      clearKnowledge,
    });
    expect(clearKnowledge).toHaveBeenCalledOnce();
    expect(msg).toContain("limpiada");
  });
});