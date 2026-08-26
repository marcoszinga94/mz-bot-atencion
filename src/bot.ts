import { Bot, InlineKeyboard } from "grammy";
import { getConfig } from "./config.js";
import { answerQuestion } from "./answer.js";
import { transcribe } from "./stt.js";
import { appendContact, toPlainText } from "./format.js";

export interface BotDeps {
  answerQuestion: (question: string) => Promise<string>;
}

export function createBot(deps: BotDeps = { answerQuestion }) {
  const config = getConfig();
  const bot = new Bot(config.botToken);

  const keyboard = new InlineKeyboard()
    .text("Servicios", "servicios")
    .text("Proyectos", "proyectos")
    .text("Contacto", "contacto");

  bot.command("start", async (ctx) => {
    await ctx.reply(
      "¡Hola! 👋 Soy el asistente virtual de Marcos Zingaretti, desarrollador web full-stack.\n\nPuedo contarte sobre sus servicios, proyectos, formación y cómo contactarlo. ¿Qué querés saber?",
      { reply_markup: keyboard },
    );
  });

  bot.callbackQuery("servicios", async (ctx) => {
    await ctx.answerCallbackQuery();
    try {
      await ctx.reply(appendContact(toPlainText(await deps.answerQuestion("¿Qué servicios de desarrollo web ofrece Marcos?"))));
    } catch (err) {
      console.error("Error al responder:", err);
      await ctx.reply("Ups, tuve un problema técnico. Escribile directamente a Marcos por WhatsApp 📱 https://wa.me/5493584406950.");
    }
  });

  bot.callbackQuery("proyectos", async (ctx) => {
    await ctx.answerCallbackQuery();
    try {
      await ctx.reply(appendContact(toPlainText(await deps.answerQuestion("¿Qué proyectos ha desarrollado Marcos?"))));
    } catch (err) {
      console.error("Error al responder:", err);
      await ctx.reply("Ups, tuve un problema técnico. Escribile directamente a Marcos por WhatsApp 📱 https://wa.me/5493584406950.");
    }
  });

  bot.callbackQuery("contacto", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(
      "📧 Email: marcoszinga94@gmail.com\n📱 WhatsApp: https://wa.me/5493584406950\n🐙 GitHub: github.com/marcoszinga94\n🌐 Web: marcoszinga.vercel.app",
    );
  });

  bot.on("message:text", async (ctx) => {
    const placeholder = await ctx.reply("Un momento, estoy buscando esa información...");
    try {
      const answer = await deps.answerQuestion(ctx.message.text);
      await ctx.api.editMessageText(placeholder.chat.id, placeholder.message_id, appendContact(toPlainText(answer)));
    } catch (err) {
      console.error("Error al responder:", err);
      await ctx.api.editMessageText(
        placeholder.chat.id,
        placeholder.message_id,
        "Ups, tuve un problema técnico. Probá de nuevo en un momento o escribile directamente a Marcos por WhatsApp 📱 https://wa.me/5493584406950.",
      );
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
        `https://api.telegram.org/file/bot${getConfig().botToken}/${file.file_path}`,
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

      const answer = await deps.answerQuestion(text);
      await ctx.api.editMessageText(
        placeholder.chat.id,
        placeholder.message_id,
        `📝 Transcripción:\n${text}\n\n${appendContact(toPlainText(answer))}`,
      );
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