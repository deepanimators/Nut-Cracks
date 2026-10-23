import asyncio
from pathlib import Path
from typing import Optional

from langchain_anthropic import ChatAnthropic
from browser_use import Agent, Browser, BrowserConfig
from rich.console import Console

from agent.downloader import DownloadInterceptor
from agent.storage import sync_to_remote

console = Console()

TASK = """\
Go to {url}.

Goal: start the actual file download.

Steps:
1. Dismiss any cookie banners, consent popups, or GDPR dialogs.
2. Close any ad overlays blocking the page content.
3. Locate the real download button or link. Real download links show the \
filename or file type. Ignore large promotional banners that say "Download Now".
4. If a countdown timer is shown, wait for it to finish before clicking.
5. If a mirror selection page appears, pick the first non-ad mirror option.
6. Click the download trigger.
7. Stop as soon as the browser begins downloading the file.

Do not click ads. Do not navigate away from the download flow.\
"""


async def run_agent(
    url: str,
    output_path: Path,
    model: str = "claude-sonnet-4-6",
    headed: bool = False,
    sync_remote: Optional[str] = None,
) -> Optional[Path]:
    output_path.mkdir(parents=True, exist_ok=True)
    before_files = set(output_path.iterdir())

    interceptor = DownloadInterceptor(output_path)
    llm = ChatAnthropic(model=model)

    browser = Browser(config=BrowserConfig(
        headless=not headed,
        extra_chromium_args=[
            f"--download-default-directory={output_path}",
            "--download-restrictions=0",
        ],
    ))

    agent = Agent(task=TASK.format(url=url), llm=llm, browser=browser)

    await asyncio.gather(
        agent.run(max_steps=25),
        _attach_download_hooks(agent, interceptor),
        return_exceptions=True,
    )

    # Keep browser open while download finishes
    result = await interceptor.wait(timeout=300)

    # Fallback: file appeared via Chrome native download (bypassed Playwright API)
    if result is None:
        result = _find_new_file(output_path, before_files)

    await browser.close()

    if result and sync_remote:
        await sync_to_remote(result, sync_remote)

    return result


async def _attach_download_hooks(agent: Agent, interceptor: DownloadInterceptor) -> None:
    """Poll until browser_use's Playwright context is ready, then hook download events."""
    for _ in range(300):  # 30s window, check every 100ms
        await asyncio.sleep(0.1)
        try:
            bc = getattr(agent, "browser_context", None)
            if not bc:
                continue
            pw_ctx = getattr(bc, "context", None)
            if not pw_ctx:
                continue
            pw_ctx.on("page", interceptor.attach_to_page)
            for page in pw_ctx.pages:
                interceptor.attach_to_page(page)
            console.print("[dim]Download hooks attached.[/dim]")
            return
        except Exception:
            continue


def _find_new_file(output_path: Path, before: set) -> Optional[Path]:
    """Detect files that appeared via Chrome's native download (bypassed Playwright)."""
    after = set(output_path.iterdir())
    new = after - before
    complete = [f for f in new if f.suffix not in {".crdownload", ".tmp", ".part"}]
    return sorted(complete, key=lambda f: f.stat().st_mtime)[-1] if complete else None
