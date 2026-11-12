# Bot de Telegram con RAG

> Asistente de Telegram que responde consultas de un negocio usando solo el conocimiento que su dueño carga desde el chat.

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Telegram](https://img.shields.io/badge/Telegram-26A5E4?logo=telegram&logoColor=white)
![Hugging Face](https://img.shields.io/badge/Hugging_Face-FFD21E?logo=huggingface&logoColor=black)
![Vercel](https://img.shields.io/badge/Vercel-000000?logo=vercel&logoColor=white)

## Características

- **Flujo RAG:** el mensaje se convierte en un embedding multilingüe, se recuperan los 4 fragmentos más similares por coseno y se arma un prompt con ese contexto para el modelo.
- **Respuestas acotadas:** el prompt instruye a responder únicamente con el contexto, sin inventar precios ni plazos, y a admitir cuando la información no está disponible.
- **Aprendizaje desde el chat:** `/aprende <texto>`, `/aprende` respondiendo un mensaje o el envío de un archivo `.txt`/`.md` agregan conocimiento nuevo.
- **Fragmentación:** los textos se dividen por secciones Markdown y párrafos, con un máximo de 1200 caracteres por fragmento, y cada uno se embebe antes de guardarse.
- **Base durable:** el conocimiento vive como un JSON en Vercel Blob. `/base` lista fuentes y cantidad de fragmentos; `/base limpiar` borra todo.
- **Control de acceso:** `ADMIN_IDS` habilita los comandos de administración y la carga de documentos; si está vacío, `/start` muestra el ID del remitente para completar la configuración.
- **Notas de voz:** descarga el audio, lo decodifica con ffmpeg a PCM de 16 kHz y lo transcribe con Whisper; se rechazan notas de más de 45 segundos.
- **Formato de salida:** texto plano, viñetas con `•` y contacto opcional al final de cada respuesta.
- **Webhook serverless:** `api/webhook.ts` expone el bot con grammy, valida el `secret_token` y limita la ejecución a 60 segundos.
- **Landing informativa:** página Astro que presenta el asistente y su uso.
- **Tests:** 11 suites de Vitest con dependencias inyectadas; no tocan la API real ni el almacenamiento.

## Stack

| Capa | Tecnología |
| --- | --- |
| Runtime | Node.js con TypeScript y ESM |
| Bot | grammy sobre webhook de Telegram |
| Embeddings | Transformers.js con `paraphrase-multilingual-MiniLM-L12-v2` |
| Voz | Whisper base y `ffmpeg-static` |
| LLM | OpenCode Zen (`deepseek-v4-flash` por defecto) |
| Almacenamiento | Vercel Blob |
| Landing | Astro con Tailwind CSS |
| Tests | Vitest |

## Estructura del proyecto

```text
api/webhook.ts       entrypoint serverless del bot
src/
  bot.ts             handlers de Telegram
  commands.ts        /aprende y /base
  answer.ts          pipeline de respuesta
  rag.ts             embeddings y recuperación
  learn.ts           chunking e ingesta
  stt.ts             transcripción de audio
  store.ts           persistencia en Blob
  prompt.ts          construcción del prompt
  zen.ts             cliente del LLM
  config.ts          lectura y validación del entorno
  format.ts          limpieza de texto
  pages/index.astro  landing
scripts/             siembra de conocimiento y webhook
tests/               suites de Vitest
docs/                diseño y planes
```

## Puesta en marcha

### Requisitos

- Node.js 20 o superior.
- Token de bot de Telegram, API key de OpenCode Zen y un Blob store privado de Vercel.
- Definir `TELEGRAM_BOT_TOKEN`, `ZEN_API_KEY` y `WEBHOOK_SECRET`: sin las tres, el bot no arranca.
- Opcionales: `BLOB_READ_WRITE_TOKEN` (persistencia), `ADMIN_IDS`, `ZEN_MODEL`, `ASISTENTE_NOMBRE`, `ASISTENTE_DESCRIPCION` y `ASISTENTE_CONTACTO`.

### Instalación

```bash
npm install
npm test
npm run typecheck
```

No hay servidor de desarrollo: el entrypoint es la función serverless `api/webhook.ts`.

## Scripts

| Comando | Descripción |
| --- | --- |
| `npm run build` | Build de la landing con Astro |
| `npm run seed-knowledge` | Embebe los `.md` de `knowledge/` y reemplaza la base en Blob |
| `npm run set-webhook -- <URL>` | Registra el webhook con el `secret_token` configurado |
| `npm run test` | Ejecuta las suites de Vitest |
| `npm run typecheck` | Chequeo de TypeScript sin emitir |

El repositorio no incluye la carpeta `knowledge/`: el conocimiento se puede cargar desde
Telegram o aportando archivos Markdown para el script de siembra.

## Despliegue

Se despliega en Vercel como función serverless con un Blob store privado. Después de
definir las variables de entorno, hay que registrar el webhook apuntando a
`https://<proyecto>/api/webhook` con `npm run set-webhook`. Los modelos de embeddings y
voz se descargan en cada arranque en frío porque la caché es efímera.

## Estado del proyecto

Bot funcional con RAG, ingesta desde el chat, notas de voz y tests unitarios. El
conocimiento inicial no forma parte del repositorio y se carga por separado.

## Licencia

Sin licencia definida.

## Autor

Marcos Zingaretti — https://github.com/marcoszinga94
