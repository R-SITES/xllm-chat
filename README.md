# xLLM Chat

![xLLM Chat](screenshot-xllm-chat.gif)

![xLLM Chat — chat with local models and connected agents](screenshot-xllm-chat.png)

A single-file browser chat window for **local LLMs and connected agents** — llama.cpp, vLLM, or any OpenAI-compatible server, plus live agent sessions with tool-use approvals. One UI that talks to everything. Built to run locally; the front end is a single HTML file with a tiny Python companion server.

## Features

- **Any local model, one window** — the header pill flips the chat source between local models and connected agents. Point the API URL at llama.cpp, vLLM, or any OpenAI-compatible server; the client auto-detects the backend and shows the serving model on every response. The client never touches model reasoning settings — reasoning depth is whatever the model launch sets (server flags / template), so every model behaves exactly as launched
- **Live agent sessions** — Settings → Connect Agent configures Hermes (the local gateway on `:8642`) or any OpenAI-compatible agent server (Pi, DS Harness, custom). Each chat thread keeps its own live agent session — returning to a thread resumes the same conversation
- **Tool-use approvals** — when a connected agent wants to run a tool, xLLM Chat surfaces a native approval prompt (Allow once / Allow this session / Always allow / Deny) with live "agent is working" activity notes; no blind auto-run
- **Streaming chat** with a live stats bar per response: tokens / time / tok/s (llama.cpp's exact cumulative formula `predicted_n / predicted_ms * 1000`) — a theme-aware plate attached to the response bubble (bottom-rounded, bubble-matched color) so it stays readable over video/image chat backgrounds
- **Thinking pill** — collapsible "reasoning" block for models that emit `delta.reasoning` (pair with vLLM's `--reasoning-parser qwen3` or llama.cpp's reasoning streams)
- **Markdown + code blocks** — GFM via marked.js, syntax highlighting via Prism, Copy / Try-it / Download buttons on code blocks, and a llama.cpp-style sandboxed HTML preview for generated HTML
- **Attachments** — images (sent as OpenAI vision parts), plus txt/csv/json/md/pdf/xlsx/xls/docx (server-side text extraction via `/api/extract`)
- **Unlimited output** — no token cap; truncation is detected and flagged when the server stops at `finish_reason: length`
- **Per-thread system prompts** — each conversation carries its own prompt; new chats inherit the last known one
- **Message actions** — copy, recycle (re-run the prompt), delete (bubble + everything below); jump buttons walk between messages
- **Token context bar** — Big AGI-style segmented bar at the input's bottom edge (history / current message / max response, red on overflow); hover pops the exact context breakdown
- **History** — sidebar with localStorage persistence, thread titles, per-thread source badges, slim theme-aware scrollbars, pin (keeps the panel open while switching chats), ⋯ thread menu (rename / pin / export / delete)
- **JSON export / import** — export one chat or many (bulk export with per-chat checkboxes); imports merge by id
- **Edit messages** — ✎ on user messages: edit an old prompt and re-send; old answers are kept and a ‹ n/N › pill flips between versions
- **Themes** — ten two-color themes in the settings modal, grouped as Dark and Light (Blue, Green, Purple, Orange, Teal): a single click re-themes the whole UI instantly, persisted across reloads
- **Chat background** — settings → Chat Background: a local image, an image URL, a YouTube video or playlist (muted autoplay with a bottom-right unmute), or a color with a transparency slider; optional crossfading overlay; the chat area stays readable while the background shows through. A multi-image **slideshow** mode picks several local images at once (fade / slide / zoom transitions, 2–60 s per slide, persisted in the browser). A ready-made green/black equalizer backdrop ships as `bg-visualizer.png` — point the Image URL field at it (as served, `http://localhost:3001/bg-visualizer.png`) and hit Apply
- **Voice read-aloud** — Settings → Voice: reads replies aloud through a local TTS server (Kokoro / Qwen3-TTS cloned voices proxied by the companion server, so no CORS and no cloud)
- **Background streaming** — start a response, browse any other chat: the render keeps running in the background and lands in the thread that started it; Stop keeps the partial output
- **Chat search** — live-filters the chat list by title; Enter searches inside the actual messages and lists every matching chat

## Run

```bash
python3 chat-server.py        # serves http://localhost:3001
```

Requires Python 3. For attachment extraction of PDF/XLSX/XLS/DOCX, install the extras once:

```bash
pip install --user --break-system-packages pypdf openpyxl xlrd python-docx
```

Open `http://localhost:3001`. The default API URL is `http://127.0.0.1:8080` (llama.cpp); point it at your vLLM server (`:8000`) or any OpenAI-compatible endpoint in Settings → General. To chat with an agent instead of a local model, configure one in Settings → Connect Agent (Hermes gateway preset included) and flip the header pill. Agent keys live only in the gitignored `.agent-keys.json` next to the server (or `HERMES_API_KEY`) — nothing secret ships in this repo. xLLM Chat never launches or kills your model servers.

## Structure

```
index.html        # the whole UI — all CSS/JS inline, marked.js + Prism embedded
chat-server.py    # static file server + /api/extract (attachments), agent/voice/media proxy
launch.sh         # convenience launcher (starts server, opens browser)
favicon-*.png     # icons
```

## License

MIT
