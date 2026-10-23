# Tool Choices

## Why Browser Use + Playwright

Nut-Cracks needs two things: **understand the page** and **intercept the download**. No single tool does both well. Browser Use handles navigation intelligence; Playwright handles the download stream.

---

## Alternatives Compared

### Browser Use ✅ (chosen for navigation)

- **GitHub:** 118k stars — most active Python AI browser tool
- **How it works:** Wraps Playwright with an LLM loop. LLM reads DOM, decides actions, executes via Playwright.
- **Strengths:** Handles multi-step flows, reasons about ambiguous UIs, Python-native
- **Weaknesses:** LLM API cost per download (~$0.01–0.05 per run), slower than rule-based
- **Best for:** Pages with no predictable selector pattern

### Playwright ✅ (chosen for download interception)

- **GitHub:** 98k stars — industry standard
- **How it works:** Chromium/Firefox/WebKit via DevTools Protocol
- **Strengths:** Rock-solid `page.on("download")` API, CDP network intercept, cross-platform
- **Weaknesses:** Not agentic — needs explicit selectors without Browser Use wrapper
- **Best for:** Intercepting and saving the actual file

### Stagehand ❌

- **GitHub:** 25k stars
- **How it works:** TypeScript SDK, structured page interaction with AI assist
- **Strengths:** Clean API, good for data extraction
- **Weaknesses:** TypeScript only, no native download focus, less reasoning depth
- **Use instead when:** Building a TypeScript project, scraping structured data

### Skyvern ❌

- **GitHub:** 23k stars
- **How it works:** Declarative YAML workflows, visual click detection via computer vision
- **Strengths:** Good for click-through workflows, visual page understanding
- **Weaknesses:** More complex setup, less flexible for programmatic download interception
- **Use instead when:** Building reusable workflow automations, not one-shot downloads

### Raw Playwright (no AI) ❌

- **How it works:** Hand-write selectors, event handlers, navigation steps
- **Strengths:** Fast, cheap, no LLM API call
- **Weaknesses:** Breaks when sites change, requires site-specific code per domain
- **Use instead when:** Downloading from a single known site with stable DOM

### yt-dlp ✅ (try this first for media)

- **Not browser automation** — dedicated downloader for 1000+ media sites
- **Strengths:** Handles HLS, DASH, auth, playlists — no LLM needed
- **Use this first** for video/audio downloads
- **Use Nut-Cracks when** yt-dlp can't handle the site or file type

---

## Decision Tree

```
Is it a video/audio file?
├── YES → Try yt-dlp first
│         yt-dlp failed? → Use Nut-Cracks
└── NO  → Use Nut-Cracks
              ↓
         Is site Cloudflare-protected?
         ├── YES → Use Browserbase cloud browser
         └── NO  → Local Playwright (default)
```

---

## Cost per Download

| Component | Cost |
|-----------|------|
| Claude claude-sonnet-4-6 (navigation) | ~$0.01–0.05 |
| Playwright (local Chromium) | Free |
| Browserbase (if needed) | ~$0.10/session |
| 2captcha (if needed) | ~$0.003/CAPTCHA |
| rclone sync | Free (egress costs apply) |

Typical run with no CAPTCHA/Cloudflare: **~$0.02**.

---

## Future: Swap LLM Backend

Browser Use supports any LLM. To reduce cost, swap Claude for a cheaper model:

```python
# In agent/navigator.py
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model="gpt-4o-mini")  # ~10x cheaper than Sonnet
agent = Agent(task=..., llm=llm, browser=browser)
```

Trade-off: cheaper models make more navigation mistakes on complex pages.
