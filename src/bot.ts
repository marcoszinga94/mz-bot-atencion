import { Bot } from "grammy";
import { getConfig } from "./config.js";
import { answerQuestion } from "./answer.js";
import { transcribe } from "./stt.js";
import { appendContact, toPlainText } from "./format.js";
import { learnText as learnTextImpl } from "./learn.js";
import { embed } from "./rag.js";
import { createBlobStore } from "./store.js";
import { baseAction, isOwner, learnFromMessage, ownerRejected } from "./commands.js";
import type { KnowledgeEntry } from "./types.js";
import type { KnowledgeStore } from "./store.js";

export interface BotDeps {
  answerQuestion: (question: string) => Promise<string>;
  learnText: (text: string, source: string) => Promise<number>;
  listEntries: () => Promise<KnowledgeEntry[]>;
  clearKnowledge: () => Promise<void>;
}

let blobStore: KnowledgeStore | null = null;
function getBlobStore(): KnowledgeStore {
  blobStore ??= createBlobStore(getConfig().blobToken);
  return blobStore;
}

const defaultDeps: BotDeps = {
  answerQuestion,
  learnText: (text, source) =>
    learnTextImpl(text, source, { store: getBlobStore(), embed }),
  listEntries: () => getBlobStore().list(),
  clearKnowledge: () => getBlobStore().clear(),
};

export function createBot(deps: Partial<BotDeps> = {}) {
  const config = getConfig();
  const d: BotDeps = { ...defaultDeps, ...deps };
  const bot = new Bot(config.botToken);

  const errorReply =
    "Ups, tuve un problema técnico. Probá de nuevo en un momento.";

  const commandArgs = (ctx: {
    match: string | RegExpMatchArray | undefined;
  }): string => {
    const raw = ctx.match;
    return typeof raw === "string"
      ? raw.trim()
      : (raw?.[0] ?? "").trim();
  };

  bot.command("start", async (ctx) => {
    const name = config.assistantName ?? "asistente virtual";
    const desc = config.assistantDescription
      ? `\n\n${config.assistantDescription}`
      : "";
    const welcome = `¡Hola! 👋 Soy ${name}.${desc}\n\nEscribí tu consulta y te respondo en base a la información disponible.`;
    if (config.adminIds.length === 0) {
      await ctx.reply(
        `${welcome}\n\n⚠️ Modo setup: no hay administradores configurados (ADMIN_IDS). Tu ID de Telegram es: ${ctx.from?.id ?? "?"}.`,
      );
      return;
    }
    await ctx.reply(welcome);
  });

  bot.command("aprende", async (ctx) => {
    if (!isOwner(config.adminIds, ctx.from?.id)) {
      await ctx.reply(ownerRejected());
      return;
    }
    const args = commandArgs(ctx);
    const replied = ctx.message?.reply_to_message?.text;
    const msg = await learnFromMessage(args, replied, "telegram", {
      learnText: d.learnText,
    });
    await ctx.reply(msg);
  });

  bot.command("base", async (ctx) => {
    if (!isOwner(config.adminIds, ctx.from?.id)) {
      await ctx.reply(ownerRejected());
      return;
    }
    const args = commandArgs(ctx);
    const msg = await baseAction(args || undefined, {
      listEntries: d.listEntries,
      clearKnowledge: d.clearKnowledge,
    });
    await ctx.reply(msg);
  });

  bot.on("message:document", async (ctx) => {
    if (!isOwner(config.adminIds, ctx.from?.id)) {
      await ctx.reply(ownerRejected());
      return;
    }
    const doc = ctx.message.document;
    const fileName = (doc.file_name ?? "").toLowerCase();
    const isText =
      doc.mime_type === "text/plain" ||
      fileName.endsWith(".txt") ||
      fileName.endsWith(".md");
    if (!isText) {
      await ctx.reply("Solo acepto archivos .txt o .md para aprender.");
      return;
    }
    const placeholder = await ctx.reply("Leyendo el documento... 📄");
    try {
      const file = await ctx.getFile();
      if (!file.file_path) throw new Error("El archivo no tiene file_path");
      const res = await fetch(
        `https://api.telegram.org/file/bot${config.botToken}/${file.file_path}`,
      );
      if (!res.ok)
        throw new Error(`Descarga del documento falló (${res.status})`);
      const content = Buffer.from(await res.arrayBuffer()).toString("utf8");
      const msg = await learnFromMessage(
        content,
        undefined,
        doc.file_name ?? "documento",
        { learnText: d.learnText },
      );
      await ctx.api.editMessageText(placeholder.chat.id, placeholder.message_id, msg);
    } catch (err) {
      console.error("Error leyendo documento:", err);
      await ctx.api.editMessageText(
        placeholder.chat.id,
        placeholder.message_id,
        "No pude leer el documento. Envialo como archivo .txt o .md.",
      );
    }
  });

  bot.on("message:text", async (ctx) => {
    const placeholder = await ctx.reply(
      "Un momento, estoy buscando esa información...",
    );
    try {
      const answer = await d.answerQuestion(ctx.message.text);
      const text = appendContact(toPlainText(answer), config.assistantContact);
      await ctx.api.editMessageText(placeholder.chat.id, placeholder.message_id, text);
    } catch (err) {
      console.error("Error al responder:", err);
      await ctx.api.editMessageText(placeholder.chat.id, placeholder.message_id, errorReply);
    }
  });

  bot.on("message:voice", async (ctx) => {
    const voice = ctx.message.voice;
    if (voice.duration > 45) {
      await ctx.reply(
        "La nota de voz es muy larga (máximo 45 segundos). Enviá una más corta o escribí tu consulta por texto.",
      );
      return;
    }
    const placeholder = await ctx.reply("Escuchando tu nota de voz... 🎙️");
    try {
      const file = await ctx.getFile();
      if (!file.file_path) throw new Error("El archivo no tiene file_path");
      const res = await fetch(
        `https://api.telegram.org/file/bot${config.botToken}/${file.file_path}`,
      );
      if (!res.ok) throw new Error(`Descarga del audio falló (${res.status})`);
      const audio = Buffer.from(await res.arrayBuffer());
      const text = await transcribe(audio);

      if (!text) {
        await ctx.api.editMessageText(
          placeholder.chat.id,
          placeholder.message_id,
          "No pude entender la nota de voz. ¿Podés escribir tu consulta por texto?",
        );
        return;
      }

      const answer = await d.answerQuestion(text);
      const reply = `📝 Transcripción:\n${text}\n\n${appendContact(toPlainText(answer), config.assistantContact)}`;
      await ctx.api.editMessageText(placeholder.chat.id, placeholder.message_id, reply);
    } catch (err) {
      console.error("Error en nota de voz:", err);
      await ctx.api.editMessageText(
        placeholder.chat.id,
        placeholder.message_id,
        "Ups, tuve un problema procesando tu nota de voz. Probá de nuevo o escribí tu consulta por texto.",
      );
    }
  });

  bot.catch((err) => {
    console.error("Error no manejado:", err.error);
  });

  return bot;
}