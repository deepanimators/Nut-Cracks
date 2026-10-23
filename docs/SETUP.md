# Setup

## Requirements

- Python 3.11+
- Anthropic API key (for Claude LLM)
- ~500MB disk (Chromium browser)

---

## Install

```bash
# 1. Clone
git clone https://github.com/yourname/nut-cracks
cd nut-cracks

# 2. Python deps
pip install browser-use playwright anthropic typer rich

# 3. Playwright browser
playwright install chromium

# 4. Set API key
export ANTHROPIC_API_KEY="sk-ant-..."
# or add to .env file
```

---

## Configuration

Create `config.json` at project root:

```json
{
  "default_output": "~/Downloads/nut-cracks",
  "anthropic_model": "claude-sonnet-4-6",
  "headed": false,
  "sync": {
    "enabled": false,
    "rclone_remote": "gdrive:Downloads"
  }
}
```

| Key | Default | Description |
|-----|---------|-------------|
| `default_output` | `~/Downloads/nut-cracks` | Where files save if `--output` omitted |
| `anthropic_model` | `claude-sonnet-4-6` | Claude model for navigation |
| `headed` | `false` | Show browser window |
| `sync.enabled` | `false` | Auto-sync after download |
| `sync.rclone_remote` | — | rclone remote target |

---

## Usage

### Basic download

```bash
python main.py download "https://example.com/file-page"
```

Prompts for output path if not set in config.

### Specify output folder

```bash
python main.py download "https://example.com/file-page" --output ~/Desktop/files
```

### Show browser (debug mode)

```bash
python main.py download "https://example.com/file-page" --headed
```

### With cloud sync

```bash
# Requires rclone installed + configured
python main.py download "https://example.com/file-page" --sync "gdrive:MyFiles"
```

---

## Cloud Sync Setup (rclone)

```bash
# Install rclone
brew install rclone          # macOS
# or: curl https://rclone.org/install.sh | bash

# Configure a remote
rclone config
# Follow prompts to add Google Drive, S3, Dropbox, etc.

# Test
rclone lsd gdrive:           # list Google Drive root
```

Once configured, pass remote name as `--sync`:
```bash
python main.py download <url> --sync "gdrive:Downloads"
```

---

## Environment Variables

```bash
ANTHROPIC_API_KEY=sk-ant-...       # required
TWOCAPTCHA_API_KEY=...             # optional, for CAPTCHA solving
BROWSERBASE_API_KEY=...            # optional, for Cloudflare bypass
```

---

## Troubleshooting

**Agent clicks wrong button / misses download link**
→ Run with `--headed` to watch. Adjust task prompt in `agent/navigator.py`.

**Download starts but file is empty**
→ Site may stream via XHR, not standard download. Check CDP intercept in `agent/downloader.py`.

**Cloudflare blocks headless browser**
→ Set `BROWSERBASE_API_KEY` and switch to Browserbase cloud browser.

**Rate limited / IP blocked**
→ Add delay between runs. Use a proxy or VPN.
