import asyncio
from pathlib import Path
from typing import Optional

from rich.console import Console

from agent.storage import deduplicate_path

console = Console()


class DownloadInterceptor:
    def __init__(self, output_path: Path):
        self.output_path = output_path
        self.result: Optional[Path] = None
        self._done = asyncio.Event()

    def attach_to_page(self, page) -> None:
        page.on("download", self._handle_download)

    async def _handle_download(self, download) -> None:
        filename = download.suggested_filename or "download"
        dest = deduplicate_path(self.output_path / filename)
        console.print(f"[cyan]Downloading:[/cyan] {filename}")
        try:
            await download.save_as(dest)
            self.result = dest
            console.print(f"[green]Saved:[/green] {dest}")
        except Exception as e:
            console.print(f"[red]Download failed:[/red] {e}")
        finally:
            self._done.set()

    async def wait(self, timeout: int = 300) -> Optional[Path]:
        try:
            await asyncio.wait_for(self._done.wait(), timeout=timeout)
        except asyncio.TimeoutError:
            pass
        return self.result
