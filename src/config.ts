export interface Config {
  botToken: string;
  zenApiKey: string;
  zenModel: string;
}

export function loadConfig(env: Record<string, string | undefined>): Config {
  const botToken = env.TELEGRAM_BOT_TOKEN;
  const zenApiKey = env.ZEN_API_KEY;
  if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN is unset");
  if (!zenApiKey) throw new Error("ZEN_API_KEY is unset");
  return {
    botToken,
    zenApiKey,
    zenModel: env.ZEN_MODEL ?? "deepseek-v4-flash",
  };
}

let cached: Config | null = null;

export function getConfig(): Config {
  cached ??= loadConfig(process.env);
  return cached;
}