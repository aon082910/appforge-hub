# AppForge Hub

A self-hosted AI app builder. Describe an app in chat and AppForge Hub builds a real, running web app (Express server, SQLite database and login already wired up), with a live preview and an editable file tree. No cloud account or billing. The only account is the admin login you create on first visit.

What's nice about it:

- **Build by chatting.** Ask for changes in plain words ("add a delete button") and iterate.
- **It fixes its own crashes.** If a generated app won't start, the error goes back to the AI for a couple of repair attempts.
- **Use any AI.** Claude, OpenAI, any OpenAI-compatible endpoint, or a local model through Ollama.

Image: [allornothing/appforge-hub](https://hub.docker.com/r/allornothing/appforge-hub) · Source: [aon082910/appforge-hub](https://github.com/aon082910/appforge-hub)

## Install

**Docker Compose:** run `docker compose up -d`, open `http://localhost:8000`, and create the admin account. For a bundled local Ollama, use `docker compose --profile local-ai up -d` and pull a model.

**Unraid:** install the `AppForge Hub` template from [AoN-Unraid-Apps](https://github.com/aon082910/AoN-Unraid-Apps). See `UNRAID.md` for details.

| Setting | Default | What it's for |
|---|---|---|
| Port | `8000` | Web UI |
| `/config` | `/mnt/user/appdata/appforge-hub` | Database and generated apps |
| `AI_PROVIDER` | `none` | Also settable in Settings. Add `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` as needed |

Cloud models are noticeably more reliable. For local models, use a coder-tuned one (`qwen2.5-coder:7b` or bigger), since small general models often write broken code.

## Help

[Open an issue](https://github.com/aon082910/appforge-hub/issues). See `LICENSE` for the license.
