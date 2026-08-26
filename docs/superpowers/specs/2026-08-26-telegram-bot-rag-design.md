# Telegram Bot de Atención al Cliente con RAG — Spec

Fecha: 2026-08-26
Estado: Aprobado para implementación

## Resumen

Bot de Telegram para atención al cliente de la marca personal de Marcos
Federico Zingaretti (desarrollador web full-stack). Responde preguntas sobre
servicios, proyectos, trayectoria, certificaciones y contacto, usando
Recuperación Aumentada por Generación (RAG) sobre una base de conocimiento
pequeña y versionada.

Se hostea en Vercel (función serverless con webhook). El modelo de lenguaje se
consume a través de la API de OpenCode Zen (endpoint OpenAI-compatible).

## Objetivos

- Atender consultas de potenciales clientes 24/7 en Telegram.
- Responder únicamente con información verificada de la base de conocimiento.
- Desplegar gratis en el free tier de Vercel para bajo volumen.
- Reutilizar las credenciales de OpenCode Zen ya existentes (sin registrarse en
  otro proveedor).

## No objetivos (v1)

- No hay memoria de conversación persistente (stateless por mensaje).
- No se usan los presupuestos de Drive ni archivos genéricos ("200 Prompts",
  artículo de Pecados Capitales).
- No se integra WhatsApp.
- No hay dashboard de administración.

## Arquitectura

```
Usuario Telegram
      │  POST /api/webhook (JSON update de Telegram, con secret_token)
      ▼
api/webhook.ts (función serverless Vercel)
      │  webhookCallback de grammY
      ▼
src/bot.ts (grammY) — handlers
      │
      ├─ /start → bienvenida + teclado inline (Servicios, Proyectos, Contacto)
      ├─ /contacto → datos de contacto
      └─ texto → src/rag.ts
                     │  embed pregunta (Transformers.js)
                     │  similitud coseno vs knowledge/index.json → top-k=4
                     ▼
              src/zen.ts → POST https://opencode.ai/zen/go/v1/chat/completions
                     │  (modelo deepseek-v4-flash, temp ~0.4)
                     ▼
              reply (bot.api.sendMessage)
```

### Componentes

- `api/webhook.ts` — función serverless de Vercel que recibe los updates y los
  enruta con `webhookCallback(bot, "http")`.
- `src/bot.ts` — instancia de grammY, comandos y handler de mensajes de texto.
- `src/rag.ts` — carga `knowledge/index.json`, embeddea la pregunta con
  Transformers.js, calcula similitud coseno y devuelve los top-k chunks.
- `src/zen.ts` — cliente OpenAI-compatible hacia la API de Zen
  (`https://opencode.ai/zen/go/v1/chat/completions`). Solo se envía
  `messages` (system + context + pregunta). `max_tokens` razonable.
- `src/knowledge.ts` — carga de los archivos markdown de `knowledge/`.
- `src/config.ts` — lee y valida env vars.
- `scripts/build-index.ts` — corre offline: lee `knowledge/*.md`, hace chunking,
  calcula embeddings y escribe `knowledge/index.json`.
- `scripts/set-webhook.ts` — registra la URL de la función de Vercel como
  webhook del bot (`setWebhook` con `secret_token`).

### Variables de entorno

- `TELEGRAM_BOT_TOKEN` — token del bot de @BotFather.
- `ZEN_API_KEY` — key de OpenCode Zen (de `~/.local/share/opencode/auth.json`
  o creada en opencode.ai/auth).
- `ZEN_MODEL` — default `deepseek-v4-flash`.

## Base de conocimiento

Fuente primaria: web personal (marcoszinga.vercel.app), perfil de GitHub
(marcoszinga94) y carpeta de Google Drive "Marketing Personal - Marcos
Zingaretti" (fuente editable de autoría).

Se cura manualmente en markdown en `knowledge/`:

- `servicios.md` — web corporativa, tienda online/e-commerce, costos y qué
  incluye (derivado de "Servicios Desarrollo Web").
- `proyectos.md` — Kura Medical, Argentista, EspartaGym, TurnoMaster,
  El Socorro, MadMind: descripción y stack.
- `trayectoria.md` — perfil profesional, experiencia (freelance, Bottos,
  Tecno+, docente), formación (Tecnicatura en curso, Argentina Programa 2.0),
  idiomas.
- `certificaciones.md` — resumen de certificados de Drive (#SeProgramar,
  #YoProgramo, Certificado Desarrollo con IA, Certificado 2026, Constancia).
  Los PDFs son escaneos/imágenes sin texto extraíble: el resumen es manual.
- `contacto.md` — email, WhatsApp, LinkedIn, GitHub, ubicación, web.
- `marketing.md` — plan de marketing y estrategia (cómo trabaja y busca
  clientes).

Excluidos por decisión del dueño: presupuestos (clientes reales), "200 Prompts
que todo programador debe conocer", artículo "El Rol de los Pecados Capitales".

### RAG

- Chunking por estructura de encabezados (~500 tokens, solape pequeño).
- Modelo de embeddings: `paraphrase-multilingual-MiniLM-L12-v2` (multilingüe,
  contenido en español).
- `scripts/build-index.ts` genera `knowledge/index.json` (chunks + vectores),
  que se commitea. En runtime no se reprocesan documentos.
- Búsqueda: coseno pregunta vs chunks, `top_k = 4`.

## Prompting

System prompt (en español): "Sos el asistente virtual de Marcos Zingaretti,
desarrollador web full-stack. Respondés en español, tono amable y profesional,
basándote ÚNICAMENTE en el contexto provisto. Si la información no está en el
contexto, decís que no la tenés y ofrecés que lo contacten por email/WhatsApp.
Nunca inventes precios, plazos ni datos."

Contexto: los top-k chunks precedidos por su fuente. Pregunta: el texto del
usuario.

## Manejo de errores

- try/catch global en el handler.
- Error de IA/Zen o de recuperación → mensaje genérico amable y log en
  consola de Vercel.
- Updates malformados se ignoran (grammY).

## Seguridad

- Webhook con `secret_token` (solo se aceptan POSTs de Telegram).
- `TELEGRAM_BOT_TOKEN` y `ZEN_API_KEY` solo en env vars de Vercel.
- `.gitignore` excluye `.env*` y archivos de secretos.
- No se commitean claves.

## Testing

- vitest:
  - RAG: la query "¿hacés tiendas online?" recupera el chunk de e-commerce;
    "¿qué estudios tenés?" recupera trayectoria.
  - Cliente Zen: con fetch mockeado, arma el payload correcto y parsea la
    respuesta.
  - Handler: update de ejemplo → respuesta esperada (con dependencias
    mockeadas).
- Prueba manual en Telegram tras el deploy.

## Despliegue

- Repo git local, conectado a Vercel (GitHub → Vercel o `vercel` CLI).
- Comando de deploy: `vercel --prod`.
- Script `set-webhook` configura la URL `https://<proyecto>.vercel.app/api/webhook`
  como webhook del bot con `secret_token`.

## Fuera de alcance / futuro

- Memoria de conversación por chat (Upstash Redis).
- Sincronización automática con Drive.
- Multi-canal (WhatsApp).