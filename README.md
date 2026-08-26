# Telegram Bot de Atención al Cliente con RAG

Bot de Telegram para atender consultas sobre la marca personal de Marcos
Zingaretti, con RAG sobre una base de conocimiento en `knowledge/` y la API
de OpenCode Zen. Hosteado en Vercel.

## Requisitos

- Node 20+
- Token de bot de Telegram (de @BotFather)
- API key de OpenCode Zen (opencode.ai/auth)

## Variables de entorno

| Variable | Descripción |
| --- | --- |
| `TELEGRAM_BOT_TOKEN` | Token del bot de Telegram |
| `ZEN_API_KEY` | API key de OpenCode Zen |
| `ZEN_MODEL` | Modelo de Zen (default `deepseek-v4-flash`) |

## Uso local

```bash
npm install
TELEGRAM_BOT_TOKEN=... ZEN_API_KEY=... npm run build-index
TELEGRAM_BOT_TOKEN=... ZEN_API_KEY=... npm test
```

## Deploy en Vercel

1. Subir el repo a GitHub y conectar con Vercel, o `vercel --prod`.
2. Cargar `TELEGRAM_BOT_TOKEN` y `ZEN_API_KEY` en Project Settings → Environment Variables.
3. Configurar el webhook:

```bash
TELEGRAM_BOT_TOKEN=... ZEN_API_KEY=... npm run set-webhook -- https://tu-proyecto.vercel.app/api/webhook
```

4. Hablarle al bot en Telegram.

## Actualizar el conocimiento

Editar los `.md` de `knowledge/` y correr `npm run build-index` para regenerar
`knowledge/index.json`. Commitea ambos.