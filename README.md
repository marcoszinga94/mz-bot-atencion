# Bot de Telegram Genérico con RAG

Bot de Telegram genérico con RAG dinámico: el dueño alimenta el conocimiento
desde el propio chat (`/aprende`, documentos `.txt`/`.md`) y el bot responde
consultas de cualquier usuario usando ese conocimiento. Hosteado en Vercel con
almacenamiento durable en Vercel Blob.

## Requisitos

- Node 20+
- Token de bot de Telegram (de @BotFather)
- API key de OpenCode Zen (opencode.ai/auth)
- Un Blob store en Vercel (`vercel blob create-store <nombre> --access private --yes`)

## Variables de entorno

| Variable | Descripción |
| --- | --- |
| `TELEGRAM_BOT_TOKEN` | Token del bot de Telegram |
| `ZEN_API_KEY` | API key de OpenCode Zen |
| `ZEN_MODEL` | Modelo de Zen (default `deepseek-v4-flash`) |
| `WEBHOOK_SECRET` | Secreto del webhook (solo `A-Z a-z 0-9 _ -`; `openssl rand -hex 32`) |
| `BLOB_READ_WRITE_TOKEN` | Token del Blob store (lo agrega `vercel blob create-store --yes`) |
| `ADMIN_IDS` | IDs de Telegram del dueño, separados por coma (vacío = modo setup) |
| `ASISTENTE_NOMBRE` | (opcional) Nombre del asistente, p. ej. `Asistente de Mi Negocio` |
| `ASISTENTE_DESCRIPCION` | (opcional) Descripción del asistente |
| `ASISTENTE_CONTACTO` | (opcional) Texto de contacto que cierra cada respuesta |

## Uso local

```bash
npm install
source .env
npm test
npm run seed-knowledge   # sube knowledge/*.md a Blob (embebe localmente)
```

## Comandos del dueño (solo `ADMIN_IDS`)

- `/aprende <texto>` — agrega información a la base de conocimiento.
- `/aprende` respondiendo un mensaje — aprende el mensaje respondido.
- Enviar un archivo `.txt` o `.md` — se aprende como documento.
- `/base` — lista fuentes y cantidad de fragmentos.
- `/base limpiar` — borra todo el conocimiento.

Si `ADMIN_IDS` está vacío, el bot está en modo setup: `/start` muestra el ID de
Telegram del emisor para que configures al dueño.

## Deploy en Vercel

1. Crear y linkear el Blob store:
   ```bash
   vercel blob create-store mi-knowledge --access private --yes
   ```
2. Cargar las env vars en Project Settings → Environment Variables
   (`vercel env add <VAR> production --value ...`).
3. Configurar el webhook:
   ```bash
   source .env
   npm run set-webhook -- https://tu-proyecto.vercel.app/api/webhook
   ```
4. Deployar: `vercel --prod`.

## Actualizar el conocimiento

- El dueño lo hace desde Telegram (`/aprende`, documentos), o
- editando los `.md` de `knowledge/` y corriendo `npm run seed-knowledge` para
  reemplazar la base (limpia y vuelve a sembrar).