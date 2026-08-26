import { getConfig } from "../src/config";

const TELEGRAM_API = "https://api.telegram.org";
const url = process.env.WEBHOOK_URL ?? process.argv[2];

if (!url) {
  console.error(
    "Uso: npm run set-webhook -- <URL>   (ej: npm run set-webhook -- https://tu-proyecto.vercel.app/api/webhook)",
  );
  process.exit(1);
}

const config = getConfig();

const res = await fetch(`${TELEGRAM_API}/bot${config.botToken}/setWebhook`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ url, secret_token: config.webhookSecret }),
});

const data = (await res.json()) as { ok: boolean; description?: string };
if (!data.ok) {
  console.error("Error al configurar el webhook:", data.description ?? res.status);
  process.exit(1);
}

console.log("Webhook configurado:", JSON.stringify(data));