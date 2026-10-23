# Nut-Cracks

Agentic file downloader. Give it a URL — it figures out the page, navigates the download flow, and saves the file.

Built on AI-driven browser automation (Browser Use + Playwright). Works on complex JS-heavy sites with countdown timers, multi-step flows, and dynamic download buttons.

> **Legal note:** Use only on sites you have permission to download from. Do not use for pirated/cracked software.

---

## What it does

```
User: "Download this" → URL
         ↓
  AI reads the page
         ↓
  Navigates download flow (clicks, waits, handles popups)
         ↓
  Intercepts actual file stream
         ↓
  Saves to your chosen folder
```

---

## Quick Start

```bash
# Install
pip install browser-use playwright anthropic typer rich
playwright install chromium

# Run
python main.py download "https://example.com/file-page" --output ~/Downloads
```

---

## Features

| Feature | Status |
|---------|--------|
| AI-guided page navigation | ✅ |
| Countdown timer handling | ✅ |
| Popup/overlay dismissal | ✅ |
| Multi-mirror selection | ✅ |
| User-defined storage path | ✅ |
| Cloud sync (via rclone) | 🔜 |
| CAPTCHA solving | 🔜 |
| Cloudflare bypass | 🔜 |

---

## Docs

- [Architecture](docs/ARCHITECTURE.md) — how it works end to end
- [Setup](docs/SETUP.md) — install, configure, run
- [Tools](docs/TOOLS.md) — why Browser Use + Playwright, alternatives

---

## Project Structure

```
nut-cracks/
├── main.py              # CLI entrypoint
├── agent/
│   ├── navigator.py     # Browser Use agent + task prompts
│   ├── downloader.py    # Playwright download interception
│   └── storage.py       # File save + sync logic
├── config.json          # Default storage path, API keys
└── docs/
    ├── ARCHITECTURE.md
    ├── SETUP.md
    └── TOOLS.md
```
