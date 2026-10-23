import subprocess
from pathlib import Path
from typing import Optional

from rich.console import Console

console = Console()


def deduplicate_path(path: Path) -> Path:
    if not path.exists():
        return path
    stem, suffix = path.stem, path.suffix
    i = 1
    while True:
        candidate = path.parent / f"{stem}_{i}{suffix}"
        if not candidate.exists():
            return candidate
        i += 1


async def sync_to_remote(local_path: Path, remote: str) -> bool:
    console.print(f"[cyan]Syncing to {remote}...[/cyan]")
    try:
        result = subprocess.run(
            ["rclone", "copy", str(local_path), remote],
            capture_output=True,
            text=True,
            timeout=300,
        )
        if result.returncode == 0:
            console.print(f"[green]Synced:[/green] {local_path.name} → {remote}")
            return True
        console.print(f"[red]Sync failed:[/red] {result.stderr.strip()}")
        return False
    except FileNotFoundError:
        console.print("[red]rclone not found. Install: brew install rclone[/red]")
        return False
    except subprocess.TimeoutExpired:
        console.print("[red]rclone timed out[/red]")
        return False
