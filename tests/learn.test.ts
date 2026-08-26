import { describe, expect, it, vi } from "vitest";
import { chunkText, learnText } from "../src/learn.js";
import { createMemoryStore } from "../src/store.js";

describe("chunkText", () => {
  it("divide por encabezados markdown", () => {
    const chunks = chunkText("## Servicios\n\nhacemos tiendas\n## Contacto\n\nhola@acme.com");
    expect(chunks).toEqual([
      "## Servicios\n\nhacemos tiendas",
      "## Contacto\n\nhola@acme.com",
    ]);
  });

  it("ignora texto vacío", () => {
    expect(chunkText("\n\n  \n")).toEqual([]);
  });

  it("divide secciones largas por párrafos", () => {
    const long = "## A\n\n" + "p1 ".repeat(400) + "\n\n" + "p2 ".repeat(400);
    const chunks = chunkText(long, 120);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]).toBe("## A");
  });
});

describe("learnText", () => {
  it("embebe cada fragmento y lo guarda en el store", async () => {
    const store = createMemoryStore();
    const embed = vi.fn(async (text: string) => [text.length, 0]);
    const n = await learnText(
      "## Servicios\n\nhacemos tiendas online\n## Precios\n\n$500",
      "telegram",
      { store, embed },
    );

    expect(n).toBe(2);
    const entries = await store.list();
    expect(entries).toHaveLength(2);
    expect(entries[0].source).toBe("telegram");
    expect(entries[0].text).toContain("Servicios");
    expect(entries[0].embedding).toEqual([expect.any(Number), 0]);
    expect(entries[0].id).toBeTruthy();
    expect(entries[0].id).not.toBe(entries[1].id);
  });

  it("no agrega nada si el texto está vacío", async () => {
    const store = createMemoryStore();
    const embed = vi.fn();
    const n = await learnText("   ", "telegram", { store, embed });
    expect(n).toBe(0);
    expect(await store.list()).toEqual([]);
    expect(embed).not.toHaveBeenCalled();
  });
});