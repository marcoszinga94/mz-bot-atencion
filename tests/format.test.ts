import { describe, expect, it } from "vitest";
import { appendContact, toPlainText } from "../src/format.js";

describe("appendContact", () => {
  it("no agrega footer si no hay contacto configurado", () => {
    expect(appendContact("Hola")).toBe("Hola");
  });

  it("agrega el footer si hay contacto", () => {
    const out = appendContact("Hola", "📧 hola@acme.com");
    expect(out).toBe("Hola\n\n📧 hola@acme.com");
  });

  it("no duplica el contacto si el texto ya lo incluye", () => {
    const text = "Consulta en 📧 hola@acme.com";
    expect(appendContact(text, "📧 hola@acme.com")).toBe(text);
  });
});

describe("toPlainText", () => {
  it("quita negrita, cursiva y código", () => {
    expect(toPlainText("Hola **mundo** y *énfasis* y `código`")).toBe(
      "Hola mundo y énfasis y código",
    );
  });

  it("quita encabezados markdown", () => {
    expect(toPlainText("## Servicios\n\nDescripción")).toBe(
      "Servicios\n\nDescripción",
    );
  });

  it("convierte viñetas en bullets de texto plano", () => {
    expect(toPlainText("- Uno\n- Dos\n* Tres")).toBe("• Uno\n• Dos\n• Tres");
  });

  it("quita enlaces markdown y deja solo el texto", () => {
    expect(toPlainText("Mirá [esto](https://ejemplo.com)")).toBe("Mirá esto");
  });

  it("colapsa líneas en blanco repetidas", () => {
    expect(toPlainText("a\n\n\n\n\nb")).toBe("a\n\nb");
  });
});