# Whisper STT para Notas de Voz — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el bot de Telegram transcriba notas de voz con Whisper local liviano (`whisper-tiny` q8) y responda con la transcripción + la respuesta RAG.

**Architecture:** Handler `message:voice` en grammY descarga el `.ogg`, lo decodifica a PCM 48kHz con `ogg-opus-decoder` (WASM), se resamplea a 16kHz y se transcribe con `@huggingface/transformers` (`Xenova/whisper-tiny`, q8). El texto transcrito se pasa a `answerQuestion` (RAG) y se responde transcripción + respuesta.

**Tech Stack:** TypeScript, grammY, `@huggingface/transformers` (ya presente), `ogg-opus-decoder` (nuevo), vitest, tsx.

**Spec:** `docs/superpowers/specs/2026-08-26-whisper-stt-design.md`

## Global Constraints

- Modelo STT: `Xenova/whisper-tiny` (multilingüe), con `dtype: "q8"`.
- `env.cacheDir = "/tmp/transformers"` (igual que `src/rag.ts`).
- Límite de duración de nota de voz: 45 segundos.
- Respuesta al usuario: `📝 Transcripción:\n<texto>\n\n<respuesta RAG>` (sin `parse_mode`; texto plano).
- Imports relativos SIEMPRE con extensión `.js` (resolución ESM de Node, requisito de Vercel).
- TypeScript estricto; `npm run typecheck` y `npx vitest run` en verde.
- Secretos solo en env vars.

---

### Task 1: Módulo STT (decode + resample + transcribe)

**Files:**
- Modify: `package.json` (agregar dependencia `ogg-opus-decoder`)
- Create: `src/stt.ts`
- Test: `tests/stt.test.ts`

**Interfaces:**
- Produces (consumidas por Task 2):
  - `resample(audio: Float32Array, fromRate: number, toRate: number): Float32Array`
  - `transcribe(buffer: Buffer): Promise<string>`

- [ ] **Step 1: Instalar la dependencia**

Run: `npm install ogg-opus-decoder@^1.7.3`
Expected: se agrega `ogg-opus-decoder` a `package.json` (v1.7.x).

- [ ] **Step 2: Escribir el test que falla**

`tests/stt.test.ts`:
```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const decodeMock = vi.fn();
const freeMock = vi.fn();
const transcribeMock = vi.fn(async () => ({ text: "hola mundo" }));

vi.mock("ogg-opus-decoder", () => ({
  OggOpusDecoder: class {
    ready = Promise.resolve();
    decode = decodeMock;
    free = freeMock;
  },
}));

vi.mock("@huggingface/transformers", () => ({
  env: { cacheDir: "" },
  pipeline: vi.fn(async () => transcribeMock),
}));

import { resample, transcribe } from "../src/stt.js";

describe("resample", () => {
  it("devuelve la misma señal si las tasas son iguales", () => {
    const input = new Float32Array([1, 2, 3, 4]);
    expect(resample(input, 48000, 48000)).toEqual(input);
  });

  it("reduce 48kHz a 16kHz (factor 3)", () => {
    const input = new Float32Array([0, 1, 2, 3, 4, 5]);
    const out = resample(input, 48000, 16000);
    expect(out.length).toBe(2);
    expect(out[0]).toBeCloseTo(0);
    expect(out[1]).toBeCloseTo(3);
  });

  it("aumenta 16kHz a 48kHz (factor 3)", () => {
    const input = new Float32Array([0, 1]);
    const out = resample(input, 16000, 48000);
    expect(out.length).toBe(6);
  });
});

describe("transcribe", () => {
  beforeEach(() => {
    decodeMock.mockReset();
    decodeMock.mockReturnValue({
      channelData: [new Float32Array([0, 1, 2, 3, 4, 5])],
      sampleRate: 48000,
    });
    freeMock.mockReset();
    transcribeMock.mockReset();
    transcribeMock.mockResolvedValue({ text: "hola mundo" });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("decodifica, resamplea a 16kHz y devuelve el texto", async () => {
    const text = await transcribe(Buffer.from("fake-ogg"));
    expect(text).toBe("hola mundo");
    expect(decodeMock).toHaveBeenCalled();
    expect(freeMock).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Correr el test para verlo fallar**

Run: `npx vitest run tests/stt.test.ts`
Expected: FAIL con "Cannot find module '../src/stt.js'".

- [ ] **Step 4: Escribir `src/stt.ts`**

```ts
import { env, pipeline } from "@huggingface/transformers";
import { OggOpusDecoder } from "ogg-opus-decoder";

const MODEL = "Xenova/whisper-tiny";

env.cacheDir = "/tmp/transformers";

type Transcriber = ReturnType<typeof pipeline<"automatic-speech-recognition">>;

let transcriberPromise: Promise<Awaited<Transcriber>> | null = null;

function getTranscriber() {
  transcriberPromise ??= pipeline("automatic-speech-recognition", MODEL, {
    dtype: "q8",
  }) as Promise<Awaited<Transcriber>>;
  return transcriberPromise;
}

export function resample(
  audio: Float32Array,
  fromRate: number,
  toRate: number,
): Float32Array {
  if (fromRate === toRate) return audio;
  const ratio = fromRate / toRate;
  const length = Math.round(audio.length / ratio);
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const pos = i * ratio;
    const i0 = Math.floor(pos);
    const i1 = Math.min(i0 + 1, audio.length - 1);
    const frac = pos - i0;
    out[i] = audio[i0] + (audio[i1] - audio[i0]) * frac;
  }
  return out;
}

export async function transcribe(buffer: Buffer): Promise<string> {
  const decoder = new OggOpusDecoder();
  await decoder.ready;
  try {
    const { channelData, sampleRate } = decoder.decode(new Uint8Array(buffer));
    const mono = channelData[0];
    const audio16k = resample(mono, sampleRate, 16000);
    const transcriber = await getTranscriber();
    const output = await transcriber(audio16k);
    return (output as { text: string }).text.trim();
  } finally {
    decoder.free();
  }
}
```

- [ ] **Step 5: Correr el test para verlo pasar**

Run: `npx vitest run tests/stt.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Typecheck y commit**

Run: `npm run typecheck`

```bash
git add package.json package-lock.json src/stt.ts tests/stt.test.ts
git commit -m "feat: módulo STT con whisper-tiny y decodificador ogg"
```

---

### Task 2: Handler de notas de voz en el bot

**Files:**
- Modify: `src/bot.ts`

**Interfaces:**
- Consumes:
  - `src/stt.js` → `transcribe(buffer: Buffer): Promise<string>` (Task 1)
  - `src/answer.js` → `answerQuestion(text): Promise<string>` (existente)
  - `src/config.js` → `getConfig()` (existente)
- Produces: handler `bot.on("message:voice", ...)`.

- [ ] **Step 1: Leer `src/bot.ts` actual**

Lee el archivo completo para respetar los imports existentes (`getConfig`, `answerQuestion`) y el estilo de handlers.

- [ ] **Step 2: Agregar el import y el handler**

En `src/bot.ts`:
```ts
import { transcribe } from "./stt.js";
```

Agregar este handler (después del handler `message:text`):
```ts
bot.on("message:voice", async (ctx) => {
  const voice = ctx.message.voice;
  if (voice.duration > 45) {
    await ctx.reply(
      "La nota de voz es muy larga (máximo 45 segundos). Enviá una más corta o escribí tu consulta por texto.",
    );
    return;
  }

  const placeholder = await ctx.reply("Escuchando tu nota de voz... 🎙️");
  try {
    const file = await ctx.getFile();
    if (!file.file_path) throw new Error("El archivo no tiene file_path");
    const res = await fetch(
      `https://api.telegram.org/file/bot${getConfig().botToken}/${file.file_path}`,
    );
    if (!res.ok) throw new Error(`Descarga del audio falló (${res.status})`);

    const audio = Buffer.from(await res.arrayBuffer());
    const text = await transcribe(audio);

    if (!text) {
      await ctx.api.editMessageText(
        placeholder.chat.id,
        placeholder.message_id,
        "No pude entender la nota de voz. ¿Podés escribir tu consulta por texto?",
      );
      return;
    }

    const answer = await deps.answerQuestion(text);
    await ctx.api.editMessageText(
      placeholder.chat.id,
      placeholder.message_id,
      `📝 Transcripción:\n${text}\n\n${answer}`,
    );
  } catch (err) {
    console.error("Error en nota de voz:", err);
    await ctx.api.editMessageText(
      placeholder.chat.id,
      placeholder.message_id,
      "Ups, tuve un problema procesando tu nota de voz. Probá de nuevo o escribí tu consulta por texto.",
    );
  }
});
```

- [ ] **Step 3: Verificar typecheck y suite**

Run: `npm run typecheck`
Expected: sin errores.

Run: `npx vitest run`
Expected: todos los tests PASS (16 + 4 nuevos).

- [ ] **Step 4: Commit**

```bash
git add src/bot.ts
git commit -m "feat: transcribir notas de voz con whisper y responder"
```

---

### Task 3: Despliegue y verificación manual

**Files:**
- Ninguno (solo comandos)

- [ ] **Step 1: Push y deploy**

```bash
git push
vercel --prod
```
Expected: deployment Ready, alias `https://tu-proyecto.vercel.app`.

- [ ] **Step 2: Verificar webhook sano**

Run:
```bash
export $(grep -v '^#' .env | xargs)
curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  -H "Content-Type: application/json" \
  -H "X-Telegram-Bot-Api-Secret-Token: ${WEBHOOK_SECRET}" \
  -d '{"update_id":1}' https://tu-proyecto.vercel.app/api/webhook
```
Expected: `200`.

- [ ] **Step 3: Prueba manual en Telegram**

Enviar una nota de voz (≤45s) al bot. Esperado: "Escuchando tu nota de voz..." seguido de transcripción + respuesta RAG. Si el primer intento demora (cold start descarga whisper-tiny ~40MB), reintentar.

---

## Self-Review

Cobertura del spec:
- Módulo STT (`resample`, `transcribe`, decode ogg, whisper-tiny q8, cache /tmp) → Task 1.
- Handler `message:voice` con límite 45s, descarga, transcripción + respuesta RAG, fallbacks → Task 2.
- Despliegue y verificación → Task 3.
- `env.cacheDir` / modelo / límites / formato de respuesta → Global Constraints.

Consistencia de tipos: `resample(Float32Array, number, number): Float32Array` y `transcribe(Buffer): Promise<string>` definidos en Task 1 y usados idénticos en Task 2. Imports relativos con `.js` en ambos.

Riesgo conocido: primer cold start tras el deploy descarga whisper-tiny (~40MB); la nota de voz ≤45s debe procesarse dentro de `maxDuration = 60`. Si excede, cae en el fallback amistoso.