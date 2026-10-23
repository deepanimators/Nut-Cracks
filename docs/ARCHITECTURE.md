# Architecture

## System Flow

```
┌─────────────┐
│  User Input  │  URL + output path
└──────┬──────┘
       ↓
┌─────────────────────────────────┐
│         CLI (Typer)             │
│  - Validate URL                 │
│  - Resolve output path          │
│  - Prompt if path missing       │
└──────┬──────────────────────────┘
       ↓
┌─────────────────────────────────┐
│      AI Agent (Browser Use)     │
│  - LLM reads page structure     │
│  - Identifies download path     │
│  - Executes multi-step flows    │
└──────┬──────────────────────────┘
       ↓
┌─────────────────────────────────┐
│   Headless Browser (Playwright) │
│  - Renders JS-heavy pages       │
│  - Handles redirects            │
│  - Intercepts download events   │
└──────┬──────────────────────────┘
       ↓
┌─────────────────────────────────┐
│       Storage Layer             │
│  - Saves to user path           │
│  - Optional rclone cloud sync   │
└─────────────────────────────────┘
```

---

## Components

### 1. CLI (`main.py`)

Entry point via Typer. Accepts:
- `url` — target page URL
- `--output` / `-o` — save directory (prompts if omitted)
- `--sync` — rclone remote target (optional)
- `--headed` — show browser window (useful for debugging)

### 2. AI Navigator (`agent/navigator.py`)

Uses **Browser Use** to wrap a Playwright browser with an LLM reasoning loop.

The agent receives a structured task prompt:
```
Go to <url>.
Find and initiate the file download.
Handle: cookie banners, popups, countdown timers, mirror selection.
Do NOT click ads labeled "Download" — find the real file link.
Wait for download to begin, then stop.
```

The LLM (Claude claude-sonnet-4-6) reads the DOM, decides what to click, waits, and repeats until the download starts or it fails.

### 3. Download Interceptor (`agent/downloader.py`)

Playwright's built-in download API:
```python
page.on("download", handle_download)
```

When a download starts, captures:
- Filename (from `download.suggested_filename`)
- Stream (via `download.save_as(path)`)

Also intercepts network requests via CDP for obfuscated direct URLs:
```python
await page.route("**/*", intercept_large_responses)
```

### 4. Storage (`agent/storage.py`)

- Resolves `~` paths, creates dirs if missing
- Deduplicates filenames (appends `_1`, `_2`, etc.)
- Optional post-download sync via `rclone copy <file> <remote>`

---

## Download Wall Patterns Handled

| Pattern | How handled |
|---------|-------------|
| Countdown timer | Agent waits via `time.sleep` or page event |
| Cookie popup | Agent dismisses before navigating |
| Ad overlays | Agent detects and closes |
| Mirror selection | Agent picks first non-ad link |
| Redirect chains | Playwright follows automatically |
| Soft paywalls | Not handled — requires login |
| Hard paywalls | Not handled — requires account |
| CAPTCHA | Not handled — needs 2captcha API |
| Cloudflare | Not handled locally — needs Browserbase |

---

## Data Flow: Download Interception

```
Browser navigates to download URL
          ↓
Playwright fires "download" event
          ↓
handle_download(download) called
          ↓
download.save_as(output_path/filename)
          ↓
Progress displayed via rich
          ↓
Optional: rclone sync triggered
```

---

## Key Design Decisions

**Why Browser Use over raw Playwright?**
Raw Playwright needs hardcoded selectors — breaks when sites change. Browser Use uses LLM to read the live DOM and reason about what to click. See [TOOLS.md](TOOLS.md).

**Why headless=False for debugging?**
Lets you watch exactly what the agent is doing. Helpful for tuning task prompts.

**Why not yt-dlp?**
yt-dlp is the right first choice for media (video/audio). Nut-Cracks targets arbitrary file types on pages yt-dlp doesn't cover.
