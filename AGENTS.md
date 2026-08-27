# AGENTS.md

## Commands
- `npm test` — vitest (no env needed for most suites; see Testing).
- `npm run typecheck` — `tsc --noEmit`. No lint or formatter is configured.
- `npm run seed-knowledge` — reads `knowledge/*.md`, embeds locally, and **replaces** the whole Blob base (clears then appends). Needs `BLOB_READ_WRITE_TOKEN` (script parses `.env` itself; run `source .env` first).
- `npm run set-webhook -- <URL>` — sets the Telegram webhook with `secret_token`. Needs the 3 required env vars; reads `WEBHOOK_URL` env or first argv.

## ESM / NodeNext (critical)
All relative imports MUST use the `.js` extension, e.g. `import { getConfig } from "./config.js"`. Extensionless imports compile under `tsc` but break at runtime on Vercel (`ERR_MODULE_NOT_FOUND`). Follow this in every new file and test.

## Env config
- `loadConfig` throws unless `TELEGRAM_BOT_TOKEN`, `ZEN_API_KEY`, and `WEBHOOK_SECRET` are set. `getConfig()` is memoized at module level.
- Any test that imports a module calling `getConfig()` (bot, answer, zen, etc.) must set all 3 vars at the top of the test file **before** imports (vitest isolates per file, so this is per-file).
- `ADMIN_IDS` (comma-separated) gates `/aprende`, `/base`, and document uploads; empty = setup mode (bot prints the sender's Telegram ID).

## Architecture
- Entrypoint is the Vercel serverless function `api/webhook.ts` (`webhookCallback`, `maxDuration = 60`); there is no dev server or build step.
- Live knowledge lives in Vercel Blob as a single JSON file `knowledge.json` (`PATHNAME` in `src/store.ts`). The repo `knowledge/*.md` files are only a seed source; editing them does nothing until `npm run seed-knowledge` runs. `knowledge.json` is NOT in the repo.
- RAG: embeddings `Xenova/paraphrase-multilingual-MiniLM-L12-v2` (384 dims), cosine similarity, top-k=4. Zen LLM endpoint is `https://opencode.ai/zen/go/v1/chat/completions` (note the `/go/` path — it changed from `/zen/v1/`). Default model `deepseek-v4-flash`.
- Transformers.js models cache to `/tmp/transformers` (`env.cacheDir` in `rag.ts` and `stt.ts`) — ephemeral on Vercel, so each cold start re-downloads (~120MB).
- Voice notes: `whisper-base`, decoded with `ffmpeg-static` to 16kHz f32le PCM; messages >45s are rejected.
- Pattern: pure logic takes injected deps via factories (`createBot`, `createAnswerer`, `createBlobStore`, `createMemoryStore`); real wiring uses module-level memoized singletons (`??=`). Tests rely on this — never test against the real store or API.

## Conventions
- All user-facing strings, comments, commit messages, and test names are in Spanish (commit style: `feat:`, `fix:`, `docs:`).
- Keep pure functions (chunking, formatting, prompt building, retrieval) free of `getConfig()`/IO so they stay unit-testable.

## Testing
- Unit tests mock heavy deps with `vi.fn`/`vi.mock`; `tests/stt.test.ts` mocks `ffmpeg-static`, `@huggingface/transformers`, and `node:child_process`.
- `tests/rag.test.ts` has one real-embedding integration test (60s timeout) that downloads the model and needs network on first run.