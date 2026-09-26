# AGENTS.md — install & operations guide for xLLM Chat

xLLM Chat is one browser window for **every** model and agent you run locally: local LLMs, cloud models,
and live agent sessions with real tools. This file is the install guide — written for an AI agent asked to
set it up properly, and just as useful to a person doing it by hand.

Read the tiers below. Each one stands alone: stop wherever you like, and nothing above it breaks.
Tiers 3 and 4 are where xLLM Chat stops being "a chat window" and becomes the thing on the screenshot —
agents that write code, generate images, cut video, write and mix songs, and read their answers out loud.

---

## Privacy first (our system)

This repo is a **client**, and it is deliberately inert: one HTML file, one stdlib-only Python companion
server, no build step, no accounts, no telemetry, nothing about the machine it runs on. That is the
contract — if you extend this code, extend it the same way.

- **No secrets in the tree, ever.** Agent keys live in a gitignored `.agent-keys.json` next to
  `chat-server.py`, or in the `HERMES_API_KEY` environment variable. Cloud provider keys (DeepSeek /
  OpenRouter) live only in the browser's `localStorage` (`chat_llm_conns`). A key in a tracked file is a
  bug: move it out and rotate it.
- **Loopback by default.** The companion server talks to loopback services (an agent gateway on
  `127.0.0.1:8642`, a TTS server on `127.0.0.1:5093`) and to whatever model endpoint you configured. Remote
  access is your own reverse proxy or tunnel — never expose these ports to the internet on someone's
  behalf, and never put a key in a URL. If the box is shared, bind the server to `127.0.0.1` explicitly.
- **Same-origin only.** The page never calls a gateway or cloud API directly: the companion server proxies
  those (`/api/agent/*`) so the key is injected server-side, no CORS is needed, and no secret ever lands in
  the browser. Do not "simplify" a proxied call into a direct browser fetch.
- **No absolute user paths.** Use `~` / `os.path.expanduser()` in code and docs — never `/home/<someone>`,
  never a machine name, IP, phone number or internal hostname. Ports and `~`-relative roots are the only
  environment facts allowed to be baked in.
- **The client never touches the server it chats with.** It does not launch, stop, tune or restart model
  servers, and it never sends reasoning settings — those belong to your launch command.
- **Outbound calls are short and deliberate:** your own model/cloud endpoints, `models.dev` (public model
  catalog, for context-window sizes), Google Fonts (bubble font, on demand), and YouTube only when you
  picked a video background. Nothing else leaves the machine, and no usage data is collected.

---

## The four tiers

| Tier | What you add | What it unlocks |
|---|---|---|
| **0 — the window** | nothing but Python 3 | full UI: themes, backgrounds, per-thread system prompts, presets, export/import, search, attachments, markdown/code preview with a sandboxed Try-it, edit/recycle, token bar |
| **1 — a local model** | llama.cpp, vLLM, or any OpenAI-compatible server | streaming chat with exact token/s, thinking pills, unlimited output, per-thread models, tool-less chat that never leaves the machine |
| **2 — cloud** | a DeepSeek or OpenRouter key | frontier models in the same window, per-thread source + model memory, no key ever in the repo or the page |
| **3 — a capable agent** | **Hermes** (or any runs-capable agent) on loopback | live agent sessions per thread, real tool use on your machine, approval prompts (Allow once / this session / always / Deny), Yolo auto-answer, activity feed, measured context, media + music + voice workflows |
| **4 — the media factory** | local generators (images/video, music, TTS) + the skills that drive them | generated images/video/music as inline tiles with a full viewer, a floating session music player with a captured playlist, voice read-aloud of replies |

Tier 3 is the hinge. Everything the media tiers do is your agent invoking local tools — xLLM Chat renders
the result, it never generates anything itself.

---

## Recommendations for full functionality (what we run)

1. **Model server — one of:**
   - **llama.cpp** (`llama-server`, default `http://127.0.0.1:8080`) — the default in Settings, exact
     token/s reporting, GGUF-friendly, great single-GPU story.
   - **vLLM** (`http://127.0.0.1:8000`) — batching and long context; pair it with `--reasoning-parser` so
     reasoning lands in the collapsible thinking pill instead of the answer.
   - Any other OpenAI-compatible endpoint works the same way; set it in Settings → LLM Connections → Local.
2. **Agent — Hermes** (the gateway preset, `http://127.0.0.1:8642`). This is what makes tiers 3–4 real:
   tools, sessions that survive reloads, approvals, and the media workflows. Any OpenAI-compatible agent
   gets one-shot turns with no tools and no approvals.
3. **TTS — a local voice server on `127.0.0.1:5093`** (Kokoro, or a Qwen3-TTS-style clone service with a
   `voices.json`). Point `VOICES_DIR` at the voice set if it isn't in the default location.
4. **Images / video — a ComfyUI-family stack** (any local node-based generator). Have it write to
   `~/ComfyUI/output` (or any root in the media contract below) and its output shows up as tiles with a
   viewer — including the image zoom and video/audio seeking.
5. **Music — a local song generator** (an ACE-Step-style server works well). Keep finished tracks under
   `~/Music`, `~/Downloads`, or a project folder in the media roots; the session music player picks audio
   up straight out of the conversation and gives you a playlist beside the chat.
6. **Skills.** The tier-4 magic is not in this repo: it is *skills* — the written instructions that teach
   your agent how to launch the generator, wait for output, name the file, and reference it in the reply.
   If you're an agent installing this, port or write those for the user's stack; without them the tools
   exist but nobody knows how to drive them.

---

## Tier 3 wiring — the agent contract

Client → agent, over the proxied `/api/agent/*` routes:

- `POST /v1/runs` `{input, session_id?, instructions?, conversation_history?}` → `202 {run_id}`
- `GET /v1/runs/{id}/events` — SSE, typed events inside each `data:` line: `message.delta`,
  `reasoning.available`, `tool.started`, `tool.completed`, `subagent.start/complete`,
  `approval.request {command, choices}`, `approval.responded`, `run.steered`,
  `run.completed {output, usage}`, `run.failed`, `run.cancelled`
- `POST /v1/runs/{id}/approval {choice: once|session|always|deny}`, `/steer {input}`, `/stop`
- `GET /v1/models` — reachability probe (`hermes-agent`), drives the connected/offline pill
- Used when present: `GET /api/model/options` (the agent's **live** provider + model → the token-bar
  window, resolved through the `models.dev` catalog) and `GET /api/sessions/{id}` (per-session token
  totals → the card's *measured* context line). An agent without them still works: the card falls back to
  estimates and says so rather than showing a wrong number.

Setup: Settings → Connect Agent → Server URL + API Key (blank key = a same-host Hermes gateway keyed by
`.agent-keys.json`), then flip the header pill to the agent. Each chat thread keeps its own session id
across turns and reloads, so the agent resumes the same conversation. Approvals prompt in the UI unless the
user enables **Yolo**, which answers with the least-permissive *allow* choice on offer (never Deny).

---

## Tier 4 wiring — media and voice

The companion server is a **file server for media, never a generator**. Tiles, the media viewer and the
session music player all read files that already exist on the machine running `chat-server.py`.

Resolution — a reference must land in one of these or nothing renders:

1. an absolute path → served as-is
2. else relative to, in order: `~/ComfyUI/output`, `~/ComfyUI/output/img2ltx`, `~`, the server's cwd
3. a bare filename → searched across `~/Music`, `~/Downloads`, `~/song-factory`, `~/flac-archive`,
   `~/ComfyUI/output` (newest first), so a stale path in an old chat still resolves to the file on disk

Limits: 8 MB per image, 256 MB per video/audio file. Supported: png/jpg/jpeg/webp/gif/bmp and
mp4/mov/m4v/webm, mp3/wav/m4a/aac/ogg/flac/opus. Attachments spool to `XLLM_ATTACH_DIR`
(default `~/xllm-attachments`) and reach the agent as a `MEDIA:` path, not as pixels — cheap for the model,
and the file survives in the conversation. Voice read-aloud proxies a local TTS on `127.0.0.1:5093`
(voice list from `voices.json` under `VOICES_DIR`): no CORS, no cloud TTS.

If a generated file doesn't render, check in order: does the path exist **on the server host**, is it under
one of the roots, is it within the size cap, is the extension supported.

---

## Install checklist

```bash
python3 chat-server.py          # or ./launch.sh  → http://localhost:3001
```

1. Python 3 only. No packages required to chat.
2. Attachments (PDF/XLSX/XLS/DOCX extraction), once:
   `pip install --user --break-system-packages pypdf openpyxl xlrd python-docx`
3. Model server of choice (tier 1) → Settings → LLM Connections → Local.
4. Optional cloud keys (tier 2) → Settings → LLM Connections → DeepSeek / OpenRouter → Test.
5. Capable agent (tier 3) → Settings → Connect Agent. Put the gateway key in `.agent-keys.json` or
   `HERMES_API_KEY` if it isn't typed in the pane.
6. Optional voice (tier 4) → a TTS server on `127.0.0.1:5093`, `VOICES_DIR` if non-default.
7. Optional media roots (tier 4) → let your generators write where the resolver looks, and install the
   skills that drive them.

## Verify your setup — no guessing

```bash
curl -sI http://127.0.0.1:3001/ | head -1                      # 200 = UI up
curl -s -X POST localhost:3001/api/agent/ping -H 'Content-Type: application/json' \
     -d '{"id":"hermes","url":"http://127.0.0.1:8642"}'         # {"ok":true,…} = agent reachable
curl -s -X POST localhost:3001/api/agent/modelinfo -H 'Content-Type: application/json' \
     -d '{"id":"hermes","url":"http://127.0.0.1:8642"}'         # the agent's model + context window
curl -s "localhost:3001/api/media?path=<absolute path to a real file>" -o /dev/null -w '%{http_code}\n'
curl -s localhost:3001/api/music/recent | head -c 200           # playlist source
curl -s localhost:3001/api/voices | head -c 200                 # proxied voice list (tier 4 voice)
```

Symptom → cause:

- *Agent pill says offline* — wrong URL/port, key missing (`.agent-keys.json` / `HERMES_API_KEY`), or the
  gateway isn't running.
- *Replies arrive, but no tools or approval prompts* — the agent isn't runs-capable; the client fell back
  to one-shot chat-completions turns.
- *Context bar reads a suspiciously round number or says "window not detected"* — the agent didn't report a
  model (`/api/model/options`), or the model isn't in the `models.dev` catalog; set **Settings → Connect
  Agent → Context window** by hand.
- *Image/audio tile is a broken frame* — the file isn't on the server host, isn't under a media root, is
  over the size cap, or the extension isn't in the supported set.
- *Voice button does nothing* — no TTS server on `127.0.0.1:5093`, or `voices.json` isn't in `VOICES_DIR`.

Before any commit to this repo, scan for leaks: absolute user paths (`/home/`, `/Users/`), non-loopback
IPv4 addresses, key-shaped strings (`ghp_`, `sk-`, `hf_`, long hex), phone numbers. Hits are only acceptable
when they *name the mechanism* (this file does, on purpose, without values); never commit a value. The
loopback addresses above are expected and fine.
