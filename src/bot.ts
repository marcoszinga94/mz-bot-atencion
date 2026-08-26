import { Bot, InlineKeyboard } from "grammy";
import { getConfig } from "./config";
import { answerQuestion } from "./answer";

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
    await ctx.reply(await deps.answerQuestion("¿Qué servicios de desarrollo web ofrece Marcos?"));
  });

  bot.callbackQuery("proyectos", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(await deps.answerQuestion("¿Qué proyectos ha desarrollado Marcos?"));
  });

  bot.callbackQuery("contacto", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(
      "📧 Email: marcoszinga94@gmail.com\n📱 WhatsApp: +54 9 3584 40-6950\n🔗 LinkedIn: in/marcos-zingaretti\n🐙 GitHub: github.com/marcoszinga94\n🌐 Web: marcoszinga.vercel.app",
    );
  });

  bot.on("message:text", async (ctx) => {
    const placeholder = await ctx.reply("Un momento, estoy buscando esa información...");
    try {
      const answer = await deps.answerQuestion(ctx.message.text);
      await ctx.api.editMessageText(placeholder.chat.id, placeholder.message_id, answer);
    } catch (err) {
      console.error("Error al responder:", err);
      await ctx.api.editMessageText(
        placeholder.chat.id,
        placeholder.message_id,
        "Ups, tuve un problema técnico. Probá de nuevo en un momento o escribile directamente a Marcos por WhatsApp 📱 +54 9 3584 40-6950.",
      );
    }
  });

  bot.catch((err) => {
    console.error("Error no manejado:", err.error);
  });

  return bot;
}