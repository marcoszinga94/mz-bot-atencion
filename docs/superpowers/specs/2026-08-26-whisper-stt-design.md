# Whisper STT para Notas de Voz — Spec

Fecha: 2026-08-26
Estado: Aprobado para implementación

## Resumen

Agregar transcripción de notas de voz (voice messages) al bot de Telegram de
atención al cliente, usando Whisper local y liviano via `@huggingface/transformers`
(`whisper-tiny`, q8). La transcripción se muestra al usuario junto con la
respuesta RAG generada a partir del texto transcrito.

## Objetivos

- El usuario puede enviar una nota de voz y el bot responde con:
  1. La transcripción del audio.
  2. La respuesta de atención al cliente (RAG) basada en ese texto.
- Sin nuevas API keys ni dependencias externas de STT (autónomo y costo $0).
- Modelo liviano (`whisper-tiny` multilingüe, ~40MB q8) para mantener el cold
  start acotado.

## No objetivos (v1)

- No se transcriben archivos de audio adjuntos (solo notas de voz).
- No se transcriben notas de voz de más de 45 segundos.
- No se usa el estado de procesamiento en streaming (solo respuesta final).

## Arquitectura

```
Nota de voz (message:voice)
      │  ctx.getFile() → file_path → descarga desde
      │  https://api.telegram.org/file/bot<token>/<file_path>
      ▼
src/stt.ts
      │  OggOpusDecoder (WASM) → Float32 PCM 48kHz
      │  resample 48kHz → 16kHz (lineal)
      │  pipeline("automatic-speech-recognition", "Xenova/whisper-tiny", { dtype: "q8" })
      ▼
  transcripción (string)
      │
      ▼
src/answer.ts (answerQuestion) con el texto transcrito
      ▼
  reply: "📝 Transcripción: <texto>\n\n<respuesta RAG>"
```

### Componentes

- `src/stt.ts` (nuevo):
  - `resample(audio: Float32Array, fromRate: number, toRate: number): Float32Array` —
    interpolación lineal pura (testeable sin modelo).
  - `transcribe(buffer: Buffer): Promise<string>` — decodifica el OGG con
    `OggOpusDecoder` (mono, canal 0), resamplea a 16kHz y corre el pipeline
    whisper-tiny q8. Singleton lazy del transcriber; `env.cacheDir = "/tmp/transformers"`
    (mismo patrón que `src/rag.ts`).
  - Aplica `decoder.free()` tras decodificar para liberar memoria WASM.
- `src/bot.ts` (modificar):
  - Handler `bot.on("message:voice")`: verifica duración (`ctx.message.voice.duration`
    <= 45s), descarga el archivo con `ctx.getFile()`, llama `transcribe()`, responde
    con transcripción + respuesta RAG.
  - Manejo de errores con el mismo patrón de fallback amistoso existente.
- `package.json`: agregar dependencia `ogg-opus-decoder` (v1.7.x).

### Variables de entorno

Sin cambios (se reutilizan `TELEGRAM_BOT_TOKEN`, `ZEN_API_KEY`, `WEBHOOK_SECRET`).

## Flujo y formato de respuesta

- Nota ≤ 45s → `📝 Transcripción:\n<texto>\n\n<respuesta RAG>`.
- Nota > 45s → mensaje pidiendo una nota más corta (máximo 45 segundos).
- Error de descarga/decodificación/IA → fallback amistoso (mismo que el resto del bot).

## Manejo de errores

- `voice.duration > 45` → respuesta sin procesar audio.
- Fallo en `ctx.getFile()`/fetch → fallback amistoso.
- Fallo en decode (`OggOpusDecoder`) o en el pipeline → fallback amistoso + log.
- Nota vacía/sin voz → se intenta transcribir igual; si devuelve texto vacío, se
  responde que no se entendió y se ofrece escribir el mensaje.

## Seguridad

- Sin claves nuevas. El audio se procesa en memoria (no se persiste).
- El audio viaja solo entre Telegram y Vercel (HTTPS).

## Testing

- `tests/stt.test.ts`:
  - `resample`: downsampling correcto (48kHz→16kHz) con señal conocida y
    verificación de longitud/valores.
  - `transcribe` con dependencias mockeadas (decoder + pipeline) para verificar
    el flujo de decodificación y el resample.
- Prueba manual: enviar una nota de voz real al bot y verificar transcripción +
  respuesta.

## Despliegue

- Sin cambios de infraestructura: misma función `api/webhook.ts`, misma env.
- El modelo whisper-tiny se descarga en el primer cold start (~40MB, cache en
  `/tmp`).

## Fuera de alcance / futuro

- Archivos de audio/video adjuntos.
- Modelos de STT más grandes (base/small) o API de Whisper en la nube.
- Streaming de transcripción parcial.