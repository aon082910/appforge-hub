# AppForge Hub on Unraid

Self-hosted AI app builder: describe an app in chat, get a real running web
app with its own database and auth already wired up. AI is optional and
pluggable — a cloud API key or a local Ollama/llama.cpp instance.

## Setup

1. **Apps** tab → search "AppForge Hub" → Install (or add the template
   manually — see the parent repo's README).
2. Set the **Appdata** path (default `/mnt/user/appdata/appforge-hub`) — this
   holds the admin account, settings, and every generated app's files and
   database. Back this up like you would any other app's config.
3. Start the container and open the WebUI. The first visit creates the single
   admin account for this instance — there is no other signup.
4. (Optional) In **Settings**, choose an AI provider:
   - **Anthropic / OpenAI / OpenAI-compatible** — paste an API key. Use
     "OpenAI-compatible" to point at OpenRouter, Groq, or any other endpoint
     that speaks the OpenAI API shape.
   - **Ollama / llama.cpp** — point the base URL at an existing instance on
     your LAN (e.g. `http://192.168.1.50:11434`), or run one alongside this
     container (see below). Nothing leaves your network.

Until a provider is configured, the dashboard and project pages work, but
chat-based generation is disabled.

## Running a local model alongside it

Easiest path: install the **Ollama** template from Community Applications
separately, pull a model (`docker exec -it ollama ollama pull llama3.1`), then
in AppForge Hub's Settings set provider = Ollama and base URL to
`http://<unraid-ip>:11434`.

## Notes

- Generated apps run as child Node processes **inside this container** on
  internal ports 4100–4999 and are reverse-proxied through the same WebUI
  port — nothing else needs to be exposed or port-forwarded.
- Set `AI_PROVIDER` / `AI_API_KEY` / `AI_BASE_URL` / `AI_MODEL` as container
  variables to pre-configure a provider at first boot; the Settings page can
  still override them afterward (values saved there take precedence).
- All generated-app data lives under `/config/projects/<id>/` inside the
  Appdata path, including each app's own `data.sqlite` — deleting an app from
  the UI deletes its folder.
