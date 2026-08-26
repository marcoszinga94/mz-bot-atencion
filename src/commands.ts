import type { KnowledgeEntry } from "./types.js";

export interface LearnDeps {
  learnText: (text: string, source: string) => Promise<number>;
}

export interface BaseDeps {
  listEntries: () => Promise<KnowledgeEntry[]>;
  clearKnowledge: () => Promise<void>;
}

export function isOwner(adminIds: number[], userId?: number): boolean {
  return typeof userId === "number" && adminIds.includes(userId);
}

export function ownerRejected(): string {
  return "Este comando es solo para el administrador del bot.";
}

export function learnFromMessage(
  args: string,
  repliedText: string | undefined,
  source: string,
  deps: LearnDeps,
): Promise<string> {
  const text = (repliedText ?? args).trim();
  if (!text) {
    return Promise.resolve(
      "Uso: /aprende <texto> o respondé un mensaje con /aprende para que lo aprenda.",
    );
  }
  return deps.learnText(text, source).then((n) => {
    const plural = n === 1 ? "fragmento" : "fragmentos";
    return `Aprendido ✅ ${n} ${plural} agregado${n === 1 ? "" : "s"} a la base de conocimiento.`;
  });
}

export async function baseAction(
  arg: string | undefined,
  deps: BaseDeps,
): Promise<string> {
  if (arg === "limpiar") {
    await deps.clearKnowledge();
    return "Base de conocimiento limpiada 🧹";
  }
  const entries = await deps.listEntries();
  if (entries.length === 0) {
    return "La base de conocimiento está vacía. Enviá /aprende <texto> para empezar.";
  }
  const counts = new Map<string, number>();
  for (const entry of entries) {
    counts.set(entry.source, (counts.get(entry.source) ?? 0) + 1);
  }
  const lines = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(
      ([source, count]) =>
        `• ${source}: ${count} fragmento${count === 1 ? "" : "s"}`,
    );
  return `Base de conocimiento (${entries.length} fragmentos en total):\n${lines.join("\n")}`;
}