"use client";

import { useState, useRef, FormEvent } from "react";

type Status = "idle" | "running" | "done" | "error";

interface LogLine {
  text: string;
  kind: "info" | "agent" | "muted";
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [result, setResult] = useState<{ downloadUrl: string; filename: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const logBoxRef = useRef<HTMLDivElement>(null);

  function addLog(text: string, kind: LogLine["kind"] = "muted") {
    setLogs((prev) => [...prev, { text, kind }]);
    setTimeout(() => {
      if (logBoxRef.current) {
        logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
      }
    }, 0);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setStatus("running");
    setLogs([]);
    setResult(null);
    setErrorMsg("");

    addLog(`Starting download for: ${url}`, "info");

    try {
      const response = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Server error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const dataLine = part.split("\n").find((l) => l.startsWith("data: "));
          if (!dataLine) continue;

          try {
            const event = JSON.parse(dataLine.slice(6));

            if (event.type === "log") {
              const isAgent = event.message.startsWith("Agent:");
              addLog(event.message, isAgent ? "agent" : "muted");
            } else if (event.type === "done") {
              setResult({ downloadUrl: event.downloadUrl, filename: event.filename });
              setStatus("done");
              addLog("Done.", "info");
            } else if (event.type === "error") {
              setErrorMsg(event.message);
              setStatus("error");
            }
          } catch {
            // malformed SSE chunk — skip
          }
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  }

  return (
    <>
      <header>
        <h1>
          Nut<span>-</span>Cracks
        </h1>
        <p>Paste a URL. AI navigates the download flow and hands you the file.</p>
      </header>

      <main className="card">
        <form onSubmit={handleSubmit}>
          <div className="input-row">
            <input
              type="url"
              placeholder="https://example.com/software-download-page"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              disabled={status === "running"}
            />
            <button type="submit" disabled={status === "running" || !url.trim()}>
              {status === "running" ? "Working…" : "Download"}
            </button>
          </div>
        </form>

        {status === "running" && (
          <div className="badge">AI agent running</div>
        )}

        {logs.length > 0 && (
          <div className="log-box" ref={logBoxRef}>
            {logs.map((line, i) => (
              <div key={i} className={`log-line ${line.kind}`}>
                {line.text}
              </div>
            ))}
          </div>
        )}

        {status === "done" && result && (
          <div className="result success">
            <span className="filename">📄 {result.filename}</span>
            <a className="dl-btn" href={result.downloadUrl} download={result.filename} target="_blank" rel="noreferrer">
              Download
            </a>
          </div>
        )}

        {status === "error" && (
          <div className="result error">
            <span className="filename">✗ {errorMsg}</span>
          </div>
        )}
      </main>

      <footer>
        <p>Works on JS-heavy sites with countdowns, popups, and multi-step flows.</p>
        <p style={{ marginTop: 6 }}>
          Does not handle hard paywalls, logins, or CAPTCHA. Try{" "}
          <a href="https://github.com/yt-dlp/yt-dlp" target="_blank" rel="noreferrer">
            yt-dlp
          </a>{" "}
          for video/audio.
        </p>
      </footer>
    </>
  );
}
