# AppForge Hub

A self-hosted, offline-capable AI app builder. Describe an app in chat and it
scaffolds a real, running web app — Express server, SQLite database, and
cookie-based auth already wired up — inside its own sandboxed process, with a
live preview and an editable file tree. No cloud account, billing, or
third-party signup involved; the only account is the admin login you create on
first visit.

Inspired by [Hercules](https://hercules.app/)'s chat-to-app concept, rebuilt as
something you run entirely on your own hardware.

## Features

- **Chat-driven app generation** — describe what you want, iterate by chatting
  further ("add a delete button", "require login before posting")
- **Built-in DB + auth per app** — every generated app gets its own SQLite
  database and a ready-made register/login/session helper the AI is told to
  use, instead of reinventing auth each time
- **Live preview** — each running app is reverse-proxied into the main UI at
  `/preview/<id>/`
- **Pluggable AI** — cloud APIs (Anthropic, OpenAI, or any OpenAI-compatible
  endpoint) or fully offline local models (Ollama, llama.cpp), switchable
  anytime from Settings
- **Single container** — the whole platform (UI, API, generated-app runtime)
  ships as one Docker image; generated apps run as child processes on internal
  ports, never separate containers

## Running it

### Docker Compose (recommended for trying it out)

```bash
docker compose up -d
```

Then open http://localhost:8000 and create the admin account.

To also run a local Ollama instance alongside it:

```bash
docker compose --profile local-ai up -d
docker exec -it appforge-ollama ollama pull llama3.1
```

Then in Settings, set provider to "Local: Ollama" with base URL
`http://ollama:11434`.

**Model choice matters a lot here.** Tested live against `llama3.2:3b`: it
reliably follows the output format (see below) but regularly writes broken
code for anything past a trivial CRUD page — wrong async patterns, undefined
variables, duplicate function names. For usable local results, use a
larger or coder-tuned model (`qwen2.5-coder:7b`+, `llama3.1:8b`+, or bigger if
your hardware allows) rather than a small general-purpose one. Cloud models
(Claude, GPT-4o) are markedly more reliable and are the better default if
you have the option.

### Unraid

See [UNRAID.md](UNRAID.md), or install the `AppForge Hub` template from
Community Applications (once published) / the
[AoN-Unraid-Apps](https://github.com/aon082910/AoN-Unraid-Apps) repo.

### Local development

```bash
# one-time: install deps and the shared runtime used by generated apps
cd server && npm install && cd runtime-template && npm install && cd ../../web && npm install

# terminal 1
cd server && npm run dev

# terminal 2
cd web && npm run dev
```

The web dev server proxies `/api` and `/preview` to `http://localhost:8000`
(see `web/vite.config.ts`), so open the Vite dev URL, not the backend port,
while developing.

## How generation works

Every project starts as a copy of `server/runtime-template/` (an Express app
with `lib/db.js` and `lib/auth.js` helpers already wired to a per-project
SQLite file). The AI is prompted to respond with plain-text `===FILE:
path===` / `===END FILE===` blocks (see `server/src/ai/generator.ts`) rather
than JSON — file content is taken verbatim between markers, so there's no
escaping for the model to get wrong. An earlier JSON-based version broke in
practice: a local model emitted an unescaped template literal inside a JSON
string and `JSON.parse` choked on it. The delimiter format sidesteps that
class of failure entirely and has proven more robust across model sizes.

Generated apps have no network access to `npm install`; all their
dependencies (express, `node:sqlite` in place of better-sqlite3, bcryptjs,
jsonwebtoken, cookie-parser) are pre-installed once in the shared runtime
template and made available via `NODE_PATH`, so generation and running both
work fully offline.

## License

MIT — see [LICENSE](LICENSE).
