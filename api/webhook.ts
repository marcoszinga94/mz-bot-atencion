import { webhookCallback } from "grammy";
import { createBot } from "../src/bot";
import { getConfig } from "../src/config";

export const maxDuration = 60;

const bot = createBot();

export default webhookCallback(bot, "https", { secretToken: getConfig().botToken });