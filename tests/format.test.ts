import { describe, expect, it } from "vitest";
import { toPlainText } from "../src/format.js";

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