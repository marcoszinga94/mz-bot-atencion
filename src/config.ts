export interface Config {
  botToken: string;
  zenApiKey: string;
  zenModel: string;
  webhookSecret: string;
  assistantName?: string;
  assistantDescription?: string;
  assistantContact?: string;
  adminIds: number[];
  blobToken?: string;
}

function parseAdminIds(value: string | undefined): number[] {
  if (!value) return [];
  return value
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
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
    assistantName: env.ASISTENTE_NOMBRE || undefined,
    assistantDescription: env.ASISTENTE_DESCRIPCION || undefined,
    assistantContact: env.ASISTENTE_CONTACTO || undefined,
    adminIds: parseAdminIds(env.ADMIN_IDS),
    blobToken: env.BLOB_READ_WRITE_TOKEN || undefined,
  };
}

let cached: Config | null = null;

export function getConfig(): Config {
  cached ??= loadConfig(process.env);
  return cached;
}