import type { Chunk, ChatMessage } from "./types.js";

export interface Persona {
  name?: string;
  description?: string;
}

function personaIntro(persona: Persona): string {
  if (persona.name) {
    return persona.description
      ? `Sos el asistente virtual de ${persona.name}, ${persona.description}.`
      : `Sos el asistente virtual de ${persona.name}.`;
  }
  if (persona.description) {
    return `Sos un asistente virtual: ${persona.description}.`;
  }
  return "Sos un asistente virtual genérico.";
}

const BEHAVIOR = [
  "Respondés en español, con tono amable y profesional.",
  "Respondés basándote ÚNICAMENTE en el contexto provisto entre [CONTEXTO] y [/CONTEXTO].",
  "Si la información no está en el contexto, decís que no la tenés y que se puede consultar directamente al propietario.",
  "Nunca inventes precios, plazos ni datos.",
  'Formateá la respuesta como texto plano fácil de leer: párrafos cortos separados por una línea en blanco, y viñetas con "• " para listas. No uses markdown.',
].join(" ");

export function buildMessages(
  chunks: Chunk[],
  question: string,
  persona: Persona = {},
): ChatMessage[] {
  const context = chunks
    .map((chunk, i) => `[${i + 1}] (fuente: ${chunk.source})\n${chunk.text}`)
    .join("\n\n");

  return [
    {
      role: "system",
      content: `${personaIntro(persona)} ${BEHAVIOR}\n\n[CONTEXTO]\n${context}\n[/CONTEXTO]`,
    },
    { role: "user", content: question },
  ];
}