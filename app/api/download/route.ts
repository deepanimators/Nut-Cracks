import { runDownload } from "@/lib/downloader";
import { NextRequest } from "next/server";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  let url: string;

  try {
    const body = await request.json();
    url = body.url;
    new URL(url); // validate
  } catch {
    return Response.json({ error: "valid url required" }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // controller already closed
        }
      };

      try {
        const result = await runDownload(url, (msg) => send({ type: "log", message: msg }));
        send({ type: "done", downloadUrl: result.url, filename: result.filename });
      } catch (err) {
        send({
          type: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      } finally {
        try {
          controller.close();
        } catch {
          // already closed
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
