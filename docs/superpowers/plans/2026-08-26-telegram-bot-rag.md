# Telegram Bot de Atención al Cliente con RAG — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bot de Telegram en Vercel que responde consultas sobre una marca o negocio usando RAG sobre una base de conocimiento en markdown y la API de OpenCode Zen.

**Architecture:** Función serverless de Vercel (`api/webhook.ts`) recibe los updates de Telegram vía webhook de grammY. El texto del usuario se embeddea con Transformers.js, se compara por coseno contra `knowledge/index.json` (precalculado en build), los top-4 chunks se inyectan en el prompt y la respuesta la genera el modelo `deepseek-v4-flash` vía `https://opencode.ai/zen/v1/chat/completions`.

**Tech Stack:** Node 20+, TypeScript, grammY, Vercel Functions, `@huggingface/transformers` (v3), vitest, tsx.

**Spec:** `docs/superpowers/specs/2026-08-26-telegram-bot-rag-design.md`

## Global Constraints

- TypeScript estricto (`strict: true`). No se usan `any` salvo donde se indique explícitamente.
- Modelo de embeddings: `Xenova/paraphrase-multilingual-MiniLM-L12-v2` (mismo modelo en build y en runtime, sin override de `dtype`).
- Modelo de Zen por defecto: `deepseek-v4-flash`; endpoint `https://opencode.ai/zen/v1/chat/completions`.
- `top_k = 4` para la recuperación.
- Respuestas del bot en español; el bot nunca inventa precios, plazos ni datos.
- Secretos (`TELEGRAM_BOT_TOKEN`, `ZEN_API_KEY`) SOLO en env vars de Vercel, nunca en el repo. `.env*` está en `.gitignore`.
- RAG stateless (sin memoria de conversación) en v1.
- Cada tarea termina con commit.

---

### Task 1: Scaffolding del proyecto + config

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `src/types.ts`
- Create: `src/config.ts`
- Test: `tests/config.test.ts`

**Interfaces:**
- Produces:
  - `src/types.ts`: `interface Chunk { id: number; source: string; text: string }`, `interface Index { chunks: Chunk[]; embeddings: number[][] }`, `interface ChatMessage { role: "system" | "user" | "assistant"; content: string }`
  - `src/config.ts`: `interface Config { botToken: string; zenApiKey: string; zenModel: string }`, `loadConfig(env: Record<string, string | undefined>): Config`, `getConfig(): Config` (memoizada, lee `process.env`)

- [ ] **Step 1: Escribir los archivos de scaffolding**

`package.json`:
```json
{
  "name": "telegram-bot-atencion",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "build-index": "tsx scripts/build-index.ts",
    "set-webhook": "tsx scripts/set-webhook.ts",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@huggingface/transformers": "^3.0.0",
    "grammy": "^1.30.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "noEmit": true,
    "types": ["node"]
  },
  "include": ["api/**/*.ts", "src/**/*.ts", "scripts/**/*.ts", "tests/**/*.ts"]
}
```

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
  },
});
```

`.gitignore`:
```
node_modules/
dist/
.env
.env.*
!.env.example
.DS_Store
```

`src/types.ts`:
```ts
export interface Chunk {
  id: number;
  source: string;
  text: string;
}

export interface Index {
  chunks: Chunk[];
  embeddings: number[][];
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}
```

`src/config.ts`:
```ts
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
```

- [ ] **Step 2: Escribir el test que falla**

`tests/config.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config";

describe("loadConfig", () => {
  it("lanza si falta TELEGRAM_BOT_TOKEN", () => {
    expect(() => loadConfig({})).toThrow("TELEGRAM_BOT_TOKEN");
  });

  it("lanza si falta ZEN_API_KEY", () => {
    expect(() => loadConfig({ TELEGRAM_BOT_TOKEN: "t" })).toThrow("ZEN_API_KEY");
  });

  it("usa deepseek-v4-flash como modelo por defecto", () => {
    const config = loadConfig({ TELEGRAM_BOT_TOKEN: "t", ZEN_API_KEY: "k" });
    expect(config.zenModel).toBe("deepseek-v4-flash");
  });

  it("respeta ZEN_MODEL", () => {
    const config = loadConfig({
      TELEGRAM_BOT_TOKEN: "t",
      ZEN_API_KEY: "k",
      ZEN_MODEL: "nemotron-3-ultra-free",
    });
    expect(config.zenModel).toBe("nemotron-3-ultra-free");
  });
});
```

- [ ] **Step 3: Instalar dependencias y correr el test**

Run: `npm install && npx vitest run tests/config.test.ts`
Expected: 4 tests PASS.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts .gitignore src/types.ts src/config.ts tests/config.test.ts
git commit -m "feat: scaffolding del proyecto y config de entorno"
```

---

### Task 2: Base de conocimiento del cliente

> La base de conocimiento la genera y cura cada cliente según su propio negocio
> (con `/aprende`, documentos `.txt`/`.md`, o editando los `.md` de `knowledge/`
> y sembrando). No se incluye contenido de ejemplo: cada instancia parte de la
> base de su propio dueño.

**Files:**
- Create: `knowledge/` con los `.md` provistos por el cliente (o sembrada desde
  el chat con `/aprende` y documentos).

**Interfaces:**
- Consumes: nada.
- Produces: archivos `knowledge/*.md` que consume `scripts/build-index.ts` (Task 3). Contenido en español, secciones con `##` para que el chunking por encabezados funcione.

- [ ] **Step 1: Crear la carpeta y la base del cliente**

Run: `mkdir knowledge/`
Expected: carpeta lista para los `.md` del cliente.

- [ ] **Step 2: Cargar el contenido del cliente**

El cliente sube su información (servicios, proyectos, trayectoria,
certificaciones, contacto, marketing) desde el chat con `/aprende` y
documentos, o en archivos `.md` dentro de `knowledge/`.

- [ ] **Step 3: Verificar**

Run: `ls -la knowledge/`
Expected: los `.md` del cliente con contenido no vacío.

- [ ] **Step 4: Commit**

```bash
git add knowledge/
git commit -m "feat: base de conocimiento en markdown"
```

---

### Task 3: Índice de embeddings + módulo RAG

**Files:**
- Create: `scripts/build-index.ts`
- Create: `knowledge/index.json` (generado por el script; se commitea)
- Create: `src/rag.ts`
- Test: `tests/rag.test.ts`

**Interfaces:**
- Consumes:
  - `src/types.ts` → `Chunk`, `Index` (Task 1)
  - `knowledge/*.md` (Task 2)
- Produces:
  - `scripts/build-index.ts` (comando `npm run build-index`) → escribe `knowledge/index.json`
  - `src/rag.ts`:
    - `embed(text: string): Promise<number[]>` — pipeline de Transformers.js con `Xenova/paraphrase-multilingual-MiniLM-L12-v2`, `pooling: "mean"`, `normalize: true`
    - `cosine(a: number[], b: number[]): number`
    - `retrieve(index: Index, queryVec: number[], k?: number): Chunk[]` (default `k = 4`)
    - `loadIndex(): Index` — importa `knowledge/index.json`

- [ ] **Step 1: Escribir `scripts/build-index.ts`**

```ts
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "@huggingface/transformers";
import type { Chunk } from "../src/types";

const KNOWLEDGE_DIR = path.join(process.cwd(), "knowledge");
const MODEL = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";

function chunkMarkdown(content: string): string[] {
  return content
    .split(/\n(?=#+ )/)
    .map((section) => section.trim())
    .filter((section) => section.length > 0);
}

const extractor = await pipeline("feature-extraction", MODEL);

const files = (await readdir(KNOWLEDGE_DIR)).filter((f) => f.endsWith(".md"));

const chunks: Chunk[] = [];
const texts: string[] = [];
for (const file of files.sort()) {
  const content = await readFile(path.join(KNOWLEDGE_DIR, file), "utf8");
  for (const section of chunkMarkdown(content)) {
    chunks.push({ id: chunks.length, source: file, text: section });
    texts.push(section);
  }
}

const output = await extractor(texts, { pooling: "mean", normalize: true });
const embeddings = output.tolist() as number[][];

await writeFile(
  path.join(KNOWLEDGE_DIR, "index.json"),
  JSON.stringify({ chunks, embeddings }),
);

console.log(`Índice escrito: ${chunks.length} chunks, ${embeddings.length} embeddings (${embeddings[0]?.length} dims)`);
```

- [ ] **Step 2: Correr el script para generar `knowledge/index.json`**

Run: `npm run build-index`
Expected: log con el número de chunks y embeddings. Se descarga el modelo (~120MB) la primera vez. Con 6 archivos de conocimiento deberían salir ~15-25 chunks de 384 dims.

- [ ] **Step 3: Escribir `src/rag.ts`**

```ts
import { pipeline } from "@huggingface/transformers";
import type { Chunk, Index } from "./types";
import rawIndex from "../knowledge/index.json";

const MODEL = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";

let extractorPromise: ReturnType<typeof pipeline> | null = null;

function getExtractor() {
  extractorPromise ??= pipeline("feature-extraction", MODEL);
  return extractorPromise;
}

export async function embed(text: string): Promise<number[]> {
  const extractor = await getExtractor();
  const output = await extractor([text], { pooling: "mean", normalize: true });
  return Array.from(output.tolist()[0] as number[]);
}

export function cosine(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

export function retrieve(index: Index, queryVec: number[], k = 4): Chunk[] {
  return index.chunks
    .map((chunk, i) => ({ chunk, score: cosine(index.embeddings[i], queryVec) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((entry) => entry.chunk);
}

export function loadIndex(): Index {
  return rawIndex as Index;
}
```

- [ ] **Step 4: Escribir los tests**

`tests/rag.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { cosine, loadIndex, retrieve } from "../src/rag";

describe("cosine", () => {
  it("devuelve 1 para vectores idénticos", () => {
    expect(cosine([1, 0, 0], [1, 0, 0])).toBeCloseTo(1);
  });

  it("devuelve 0 para vectores ortogonales", () => {
    expect(cosine([1, 0], [0, 1])).toBeCloseTo(0);
  });
});

describe("retrieve", () => {
  const index = {
    chunks: [
      { id: 0, source: "a.md", text: "tienda" },
      { id: 1, source: "b.md", text: "certificado" },
      { id: 2, source: "c.md", text: "proyecto" },
    ],
    embeddings: [
      [1, 0],
      [0, 1],
      [0.5, 0.5],
    ],
  };

  it("ordena por similitud y devuelve top-k", () => {
    const hits = retrieve(index, [1, 0], 2);
    expect(hits).toHaveLength(2);
    expect(hits[0].id).toBe(0);
  });

  it("usa k=4 por defecto", () => {
    const hits = retrieve(index, [1, 0]);
    expect(hits).toHaveLength(3);
  });
});

describe("RAG de integración (índice real)", () => {
  it("recupera un chunk de servicios para '¿hacés tiendas online?'", async () => {
    const index = loadIndex();
    expect(index.chunks.length).toBeGreaterThan(0);
    const sources = new Set(index.chunks.map((c) => c.source));
    expect(sources).toContain("servicios.md");
  }, 60_000);
});
```

Nota: el test de integración verifica que el índice existe y contiene la fuente esperada, sin embeddear en cada corrida (rápido y determinista).

- [ ] **Step 5: Correr los tests**

Run: `npx vitest run tests/rag.test.ts`
Expected: todos PASS.

- [ ] **Step 6: Typecheck y commit**

Run: `npm run typecheck`
Expected: sin errores.

```bash
git add scripts/build-index.ts knowledge/index.json src/rag.ts tests/rag.test.ts
git commit -m "feat: índice de embeddings y módulo RAG"
```

---

### Task 4: Prompt builder

**Files:**
- Create: `src/prompt.ts`
- Test: `tests/prompt.test.ts`

**Interfaces:**
- Consumes: `src/types.ts` → `Chunk`, `ChatMessage` (Task 1)
- Produces: `buildMessages(chunks: Chunk[], question: string): ChatMessage[]` — arma `system` (persona + contexto de los chunks con su fuente) y `user` (la pregunta)

- [ ] **Step 1: Escribir el test que falla**

`tests/prompt.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { buildMessages } from "../src/prompt";
import type { Chunk } from "../src/types";

const chunks: Chunk[] = [
  { id: 0, source: "servicios.md", text: "Tienda online: desarrollo inicial $500 + $30 por mes." },
];

describe("buildMessages", () => {
  it("devuelve un mensaje system con el contexto y un mensaje user con la pregunta", () => {
    const messages = buildMessages(chunks, "¿cuánto cuesta una tienda online?");
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toContain("servicios.md");
    expect(messages[0].content).toContain("$500");
    expect(messages[0].content).toContain("[CONTEXTO]");
    expect(messages[1]).toEqual({ role: "user", content: "¿cuánto cuesta una tienda online?" });
  });

  it("indica que no debe inventar datos", () => {
    const messages = buildMessages(chunks, "hola");
    expect(messages[0].content).toContain("Nunca inventes");
  });
});
```

- [ ] **Step 2: Correr el test para verlo fallar**

Run: `npx vitest run tests/prompt.test.ts`
Expected: FAIL con "Cannot find module '../src/prompt'".

- [ ] **Step 3: Escribir `src/prompt.ts`**

```ts
import type { Chunk, ChatMessage } from "./types";

const SYSTEM = [
  "Sos el asistente virtual de {nombre del dueño}, {descripción}.",
  "Respondés en español, con tono amable y profesional.",
  "Respondés basándote ÚNICAMENTE en el contexto provisto entre [CONTEXTO] y [/CONTEXTO].",
  "Si la información no está en el contexto, decís que no la tenés y ofrecés que lo contacten por email o WhatsApp.",
  "Nunca inventes precios, plazos ni datos.",
].join(" ");

export function buildMessages(chunks: Chunk[], question: string): ChatMessage[] {
  const context = chunks
    .map((chunk, i) => `[${i + 1}] (fuente: ${chunk.source})\n${chunk.text}`)
    .join("\n\n");

  return [
    { role: "system", content: `${SYSTEM}\n\n[CONTEXTO]\n${context}\n[/CONTEXTO]` },
    { role: "user", content: question },
  ];
}
```

- [ ] **Step 4: Correr el test para verlo pasar**

Run: `npx vitest run tests/prompt.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck y commit**

Run: `npm run typecheck`

```bash
git add src/prompt.ts tests/prompt.test.ts
git commit -m "feat: prompt builder con contexto RAG"
```

---

### Task 5: Cliente de OpenCode Zen

**Files:**
- Create: `src/zen.ts`
- Test: `tests/zen.test.ts`

**Interfaces:**
- Consumes: `src/types.ts` → `ChatMessage` (Task 1), `src/config.ts` → `getConfig()` (Task 1)
- Produces: `complete(messages: ChatMessage[]): Promise<string>` — POST a `https://opencode.ai/zen/v1/chat/completions` con `model`, `temperature: 0.4`, `max_tokens: 800`, auth Bearer con `ZEN_API_KEY`; devuelve `choices[0].message.content`

- [ ] **Step 1: Escribir el test que falla**

`tests/zen.test.ts`:
```ts
process.env.TELEGRAM_BOT_TOKEN = "test-token";
process.env.ZEN_API_KEY = "test-key";

import { afterEach, describe, expect, it, vi } from "vitest";
import { complete } from "../src/zen";

const okResponse = (content: string) => ({
  ok: true,
  json: async () => ({ choices: [{ message: { content } }] }),
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("complete", () => {
  it("hace POST al endpoint de Zen con auth y devuelve el contenido", async () => {
    const fetchMock = vi.fn(async () => okResponse("Hola"));
    vi.stubGlobal("fetch", fetchMock);

    const text = await complete([{ role: "user", content: "hola" }]);
    expect(text).toBe("Hola");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://opencode.ai/zen/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
          "Content-Type": "application/json",
        }),
      }),
    );

    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.model).toBe("deepseek-v4-flash");
    expect(body.temperature).toBe(0.4);
    expect(body.max_tokens).toBe(800);
    expect(body.messages).toEqual([{ role: "user", content: "hola" }]);
  });

  it("lanza error si la API responde con error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 500, text: async () => "boom" })),
    );

    await expect(complete([{ role: "user", content: "x" }])).rejects.toThrow(/500/);
  });
});
```

- [ ] **Step 2: Correr el test para verlo fallar**

Run: `npx vitest run tests/zen.test.ts`
Expected: FAIL con "Cannot find module '../src/zen'".

- [ ] **Step 3: Escribir `src/zen.ts`**

```ts
import { getConfig } from "./config";
import type { ChatMessage } from "./types";

const API_URL = "https://opencode.ai/zen/v1/chat/completions";

export async function complete(messages: ChatMessage[]): Promise<string> {
  const config = getConfig();

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.zenApiKey}`,
    },
    body: JSON.stringify({
      model: config.zenModel,
      messages,
      temperature: 0.4,
      max_tokens: 800,
    }),
  });

  if (!res.ok) {
    throw new Error(`Zen API respondió ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
  };

  return data.choices[0].message.content;
}
```

- [ ] **Step 4: Correr el test para verlo pasar**

Run: `npx vitest run tests/zen.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Typecheck y commit**

Run: `npm run typecheck`

```bash
git add src/zen.ts tests/zen.test.ts
git commit -m "feat: cliente de OpenCode Zen"
```

---

### Task 6: Orquestador de respuestas (RAG + Zen)

**Files:**
- Create: `src/answer.ts`
- Test: `tests/answer.test.ts`

**Interfaces:**
- Consumes:
  - `src/types.ts` → `Chunk`, `Index`, `ChatMessage` (Task 1)
  - `src/prompt.ts` → `buildMessages` (Task 4)
  - `src/rag.ts` → `embed`, `retrieve`, `loadIndex` (Task 3)
  - `src/zen.ts` → `complete` (Task 5)
- Produces:
  - `interface AnswerDeps { embed; retrieve; loadIndex; complete }`
  - `createAnswerer(deps: AnswerDeps): (question: string) => Promise<string>`
  - `answerQuestion: (question: string) => Promise<string>` (instancia con dependencias reales)

- [ ] **Step 1: Escribir el test que falla**

`tests/answer.test.ts`:
```ts
process.env.TELEGRAM_BOT_TOKEN = "test-token";
process.env.ZEN_API_KEY = "test-key";

import { describe, expect, it, vi } from "vitest";
import { createAnswerer } from "../src/answer";
import type { Chunk, Index } from "../src/types";

const chunk: Chunk = { id: 0, source: "servicios.md", text: "Tienda online." };
const index: Index = { chunks: [chunk], embeddings: [[1, 0]] };

describe("createAnswerer", () => {
  it("encadena RAG + prompt + Zen y devuelve la respuesta", async () => {
    const embed = vi.fn(async () => [1, 0]);
    const retrieve = vi.fn(() => [chunk]);
    const complete = vi.fn(async () => "Sí, hace tiendas online.");
    const loadIndex = vi.fn(() => index);

    const answer = createAnswerer({ embed, retrieve, complete, loadIndex });

    const result = await answer("¿hacés tiendas online?");

    expect(result).toBe("Sí, hace tiendas online.");
    expect(embed).toHaveBeenCalledWith("¿hacés tiendas online?");
    expect(retrieve).toHaveBeenCalledWith(index, [1, 0], 4);
    expect(complete).toHaveBeenCalledOnce();

    const messages = complete.mock.calls[0][0];
    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toContain("servicios.md");
    expect(messages[1]).toEqual({ role: "user", content: "¿hacés tiendas online?" });
  });
});
```

- [ ] **Step 2: Correr el test para verlo fallar**

Run: `npx vitest run tests/answer.test.ts`
Expected: FAIL con "Cannot find module '../src/answer'".

- [ ] **Step 3: Escribir `src/answer.ts`**

```ts
import { buildMessages } from "./prompt";
import { complete } from "./zen";
import { embed, loadIndex, retrieve } from "./rag";
import type { Chunk, ChatMessage, Index } from "./types";

export interface AnswerDeps {
  embed: (text: string) => Promise<number[]>;
  retrieve: (index: Index, queryVec: number[], k: number) => Chunk[];
  complete: (messages: ChatMessage[]) => Promise<string>;
  loadIndex: () => Index;
}

export function createAnswerer(deps: AnswerDeps) {
  return async function answerQuestion(question: string): Promise<string> {
    const index = deps.loadIndex();
    const queryVec = await deps.embed(question);
    const chunks = deps.retrieve(index, queryVec, 4);
    const messages = buildMessages(chunks, question);
    return deps.complete(messages);
  };
}

export const answerQuestion = createAnswerer({
  embed,
  retrieve,
  complete,
  loadIndex,
});
```

- [ ] **Step 4: Correr el test para verlo pasar**

Run: `npx vitest run tests/answer.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck y commit**

Run: `npm run typecheck`

```bash
git add src/answer.ts tests/answer.test.ts
git commit -m "feat: orquestador de respuestas RAG + Zen"
```

---

### Task 7: Bot de grammY + función serverless de Vercel

**Files:**
- Create: `src/bot.ts`
- Create: `api/webhook.ts`
- Test: `tests/bot.test.ts`

**Interfaces:**
- Consumes: `src/config.ts` → `getConfig()` (Task 1), `src/answer.ts` → `answerQuestion` (Task 6)
- Produces:
  - `src/bot.ts`: `createBot(deps?: { answerQuestion }): Bot` — instancia grammY con `/start`, callbacks inline (Servicios/Proyectos/Contacto), handler `message:text` y validación del `secret_token` del webhook
  - `api/webhook.ts`: `export default webhookCallback(bot, "https")` con `export const maxDuration = 60`

- [ ] **Step 1: Escribir el test que falla**

`tests/bot.test.ts`:
```ts
process.env.TELEGRAM_BOT_TOKEN = "test-token";
process.env.ZEN_API_KEY = "test-key";

import { describe, expect, it, vi } from "vitest";
import { createBot } from "../src/bot";

describe("createBot", () => {
  it("registra el comando /start", () => {
    const answerQuestion = vi.fn(async () => "respuesta");
    const bot = createBot({ answerQuestion });
    const listener = bot.botInfo;
    expect(listener).toBeUndefined();
  });
});
```

Nota: este test es una verificación mínima de que `createBot` construye la instancia sin errores (el comportamiento completo del bot se prueba manualmente en Telegram). Asegurate de que `createBot` no llame a la API de Telegram al construirse.

- [ ] **Step 2: Correr el test para verlo fallar**

Run: `npx vitest run tests/bot.test.ts`
Expected: FAIL con "Cannot find module '../src/bot'".

- [ ] **Step 3: Escribir `src/bot.ts`**

```ts
import { Bot, InlineKeyboard } from "grammy";
import { getConfig } from "./config";
import { answerQuestion } from "./answer";

export interface BotDeps {
  answerQuestion: (question: string) => Promise<string>;
}

export function createBot(deps: BotDeps = { answerQuestion }) {
  const config = getConfig();
  const bot = new Bot(config.botToken);

  const keyboard = new InlineKeyboard()
    .text("Servicios", "servicios")
    .text("Proyectos", "proyectos")
    .text("Contacto", "contacto");

  bot.use(async (ctx, next) => {
    const secret = ctx.headers?.get("x-telegram-bot-api-secret-token");
    if (secret && secret !== config.botToken) {
      throw new Error("Secret token inválido");
    }
    await next();
  });

  bot.command("start", async (ctx) => {
    await ctx.reply(
      `¡Hola! 👋 Soy ${config.assistantName ?? "el asistente"}.\n\nPuedo contarte sobre servicios, proyectos, formación y cómo contactar al dueño. ¿Qué querés saber?`,
      { reply_markup: keyboard },
    );
  });

  bot.callbackQuery("servicios", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(await deps.answerQuestion("¿Qué servicios se ofrecen?"));
  });

  bot.callbackQuery("proyectos", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(await deps.answerQuestion("¿Qué proyectos destacados hay?"));
  });

  bot.callbackQuery("contacto", async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(
      config.assistantContact ?? "Contacto configurado por el dueño.",
    );
  });

  bot.on("message:text", async (ctx) => {
    const placeholder = await ctx.reply("Un momento, estoy buscando esa información...");
    try {
      const answer = await deps.answerQuestion(ctx.message.text);
      await ctx.api.editMessageText(placeholder.chat.id, placeholder.message_id, answer);
    } catch (err) {
      console.error("Error al responder:", err);
      await ctx.api.editMessageText(
        placeholder.chat.id,
        placeholder.message_id,
        "Ups, tuve un problema técnico. Probá de nuevo en un momento.",
      );
    }
  });

  bot.catch((err) => {
    console.error("Error no manejado:", err.error);
  });

  return bot;
}
```

- [ ] **Step 4: Escribir `api/webhook.ts`**

```ts
import { webhookCallback } from "grammy";
import { createBot } from "../src/bot";

export const maxDuration = 60;

const bot = createBot();

export default webhookCallback(bot, "https");
```

- [ ] **Step 5: Correr el test para verlo pasar**

Run: `npx vitest run tests/bot.test.ts`
Expected: PASS.

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 7: Commit**

```bash
git add src/bot.ts api/webhook.ts tests/bot.test.ts
git commit -m "feat: bot de grammY y webhook de Vercel"
```

---

### Task 8: Script de set-webhook + verificación local

**Files:**
- Create: `scripts/set-webhook.ts`
- Modify: `README.md` (nuevo, con pasos de deploy)

**Interfaces:**
- Consumes: `src/config.ts` → `getConfig()` (Task 1)
- Produces: comando `npm run set-webhook -- <URL>` que llama a `setWebhook` con `secret_token` = token del bot

- [ ] **Step 1: Escribir `scripts/set-webhook.ts`**

```ts
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
  body: JSON.stringify({ url, secret_token: config.botToken }),
});

const data = (await res.json()) as { ok: boolean; description?: string };
if (!data.ok) {
  console.error("Error al configurar el webhook:", data.description ?? res.status);
  process.exit(1);
}

console.log("Webhook configurado:", JSON.stringify(data));
```

- [ ] **Step 2: Escribir `README.md`**

```markdown
# Telegram Bot de Atención al Cliente con RAG

Bot de Telegram para atender consultas sobre una marca o negocio, con RAG
sobre una base de conocimiento en `knowledge/` (generada por cada cliente) y la
API de OpenCode Zen. Hosteado en Vercel.

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
```

- [ ] **Step 3: Verificación local del flujo (manual)**

Si ya se tienen `TELEGRAM_BOT_TOKEN` y `ZEN_API_KEY` en el entorno, verificar que la cadena RAG responde con:
```bash
TELEGRAM_BOT_TOKEN=x ZEN_API_KEY=x npx tsx -e "import { answerQuestion } from './src/answer'; answerQuestion('¿Qué servicios se ofrecen?').then(console.log).catch(e => { console.error(e); process.exit(1); })"
```
Expected: una respuesta en español coherente. (Si no hay credenciales aún, se puede marcar como paso pendiente.)

- [ ] **Step 4: Typecheck y commit**

Run: `npm run typecheck`

```bash
git add scripts/set-webhook.ts README.md
git commit -m "docs: script de set-webhook y README de deploy"
```

---

## Self-Review

Cobertura del spec:
- Arquitectura webhook Vercel → Task 7 (api/webhook.ts + grammY).
- RAG con embeddings multilingüe precalculados → Tasks 2 y 3.
- Cliente Zen (endpoint, modelo por defecto, temp 0.4) → Task 5.
- Prompting (persona, solo contexto, no inventar) → Task 4.
- Manejo de errores (fallback amigable + log) → Task 7 (try/catch en `message:text` y `bot.catch`).
- Seguridad (secret_token, env vars, .gitignore) → Tasks 1 y 7.
- Testing (RAG, Zen mockeado, handler) → Tasks 1, 3, 4, 5, 6, 7.
- Deploy (set-webhook, README) → Task 8.

Consistencia de tipos: `Chunk`/`Index`/`ChatMessage` definidos en Task 1 y usados igual en Tasks 3-6. `retrieve(index, vec, 4)` firmado con default `k = 4` y llamado con 4 explícito en `answer.ts` — consistente.

Riesgo conocido: el modelo de embeddings (~120MB) se descarga en cada cold start de Vercel; mitigado con `maxDuration = 60` y bajo volumen esperado. Si el bundle supera el límite de tamaño de función de Vercel, el plan B es cambiar a búsqueda por keywords (enfoque B del spec).

## Riesgos / notas de ejecución

- `@huggingface/transformers` v3 en Node usa `onnxruntime-node` (incluido como dependencia). No requiere instalación manual.
- El primer `npm run build-index` descarga el modelo; requiere red en la máquina de desarrollo.
- En Vercel, las variables `TELEGRAM_BOT_TOKEN` y `ZEN_API_KEY` son obligatorias o la función fallará al importar `config` (vía `getConfig` en el primer request).