export interface Config {
  botToken: string;
  zenApiKey: string;
  zenModel: string;
  webhookSecret: string;
}

export function loadConfig(env: Record<string, string | undefined>): Config {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  const zenApiKey = env.ZEN_API_KEY;
  const webhookSecret = env.WEBHOOK_SECRET;
  if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN is unset");
  if (!zenApiKey) throw new Error("ZEN_API_KEY is unset");
  if (!webhookSecret) throw new Error("WEBHOOK_SECRET is unset");
  return {
    botToken,
    zenApiKey,
    zenModel: env.ZEN_MODEL ?? "deepseek-v4-flash",
    webhookSecret,
  };
}

let cached: Config | null = null;

export function getConfig(): Config {
  cached ??= loadConfig(process.env);
  return cached;
}