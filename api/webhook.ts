import { webhookCallback } from "grammy";
import { createBot } from "../src/bot.js";
import { getConfig } from "../src/config.js";

export const maxDuration = 60;

const bot = createBot();

export default webhookCallback(bot, "https", {
  secretToken: getConfig().webhookSecret,
  timeoutMilliseconds: 55000,
});