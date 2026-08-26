import type { Chunk, ChatMessage } from "./types";

const SYSTEM = [
  "Sos el asistente virtual de Marcos Zingaretti, desarrollador web full-stack.",
  "Respondés en español, con tono amable y profesional.",
  "Respondés basándote ÚNICAMENTE en el contexto provisto entre [CONTEXTO] y [/CONTEXTO].",
  "Si la información no está en el contexto, decís que no la tenés y ofrecés que lo contacten por email o WhatsApp.",
  "Nunca inventes precios, plazos ni datos.",
].join(" ");

export function buildMessages(chunks: Chunk[], question: string): ChatMessage[] {
  const context = chunks
    .map((chunk, i) => `[${i + 1}] (fuente: ${chunk.source})\n${chunk.text}`)
    .join("\n\n");

  return [
    { role: "system", content: `${SYSTEM}\n\n[CONTEXTO]\n${context}\n[/CONTEXTO]` },
    { role: "user", content: question },
  ];
}