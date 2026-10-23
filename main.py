import asyncio
import json
from pathlib import Path

import typer
from rich.console import Console

app = typer.Typer(help="Nut-Cracks: agentic file downloader")
console = Console()


def _load_config() -> dict:
    path = Path(__file__).parent / "config.json"
    return json.loads(path.read_text()) if path.exists() else {}


@app.command()
def download(
    url: str = typer.Argument(..., help="Page URL to download from"),
    output: str = typer.Option(None, "--output", "-o", help="Output directory"),
    sync: str = typer.Option(None, "--sync", help="rclone remote (e.g. gdrive:Downloads)"),
    headed: bool = typer.Option(False, "--headed", help="Show browser window"),
):
    """Download a file from a complex web page using AI-guided navigation."""
    config = _load_config()

    if not output:
        default = config.get("default_output", "~/Downloads/nut-cracks")
        output = default if config.get("default_output") else typer.prompt("Output directory", default=default)

    output_path = Path(output).expanduser().resolve()
    model = config.get("anthropic_model", "claude-sonnet-4-6")
    headed_flag = headed or config.get("headed", False)

    sync_remote = sync
    if not sync_remote and config.get("sync", {}).get("enabled"):
        sync_remote = config["sync"].get("rclone_remote")

    console.print(f"[bold cyan]URL:[/bold cyan]    {url}")
    console.print(f"[bold cyan]Output:[/bold cyan] {output_path}")
    if sync_remote:
        console.print(f"[bold cyan]Sync:[/bold cyan]   {sync_remote}")

    from agent.navigator import run_agent

    result = asyncio.run(
        run_agent(url, output_path, model=model, headed=headed_flag, sync_remote=sync_remote)
    )

    if result:
        console.print(f"\n[bold green]✓ Downloaded:[/bold green] {result}")
    else:
        console.print("\n[bold red]✗ No file downloaded.[/bold red]")
        raise typer.Exit(1)


if __name__ == "__main__":
    app()
