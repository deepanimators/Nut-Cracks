import { Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";

export interface DownloadResult {
  url: string;
  filename: string;
}

const STEPS = [
  "Dismiss any cookie banners, consent popups, or GDPR dialogs if present.",
  "Close any ad overlays or modal popups blocking the page if present.",
  "Find the real download button or link — look for the actual file download trigger, not advertisement banners. Real download links typically show the filename or file type.",
  "If a countdown timer is preventing the download, wait for it to finish, then click the download button.",
  "If a mirror selection page appeared, click the first non-advertisement download option.",
];

const ResultSchema = z.object({
  downloadUrl: z.string().url().nullable(),
  filename: z.string().nullable(),
});

export async function runDownload(
  url: string,
  onLog: (msg: string) => void
): Promise<DownloadResult> {
  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    apiKey: process.env.BROWSERBASE_API_KEY!,
    projectId: process.env.BROWSERBASE_PROJECT_ID!,
    modelName: "claude-sonnet-4-6",
    modelClientOptions: {
      apiKey: process.env.ANTHROPIC_API_KEY!,
    },
    verbose: 0,
  });

  try {
    await stagehand.init();
    const page = stagehand.page;

    // Capture download URL from Playwright download event (primary)
    let downloadCapture: DownloadResult | null = null;
    const downloadEventPromise = new Promise<DownloadResult>((resolve) => {
      page.on("download", async (download) => {
        const fileUrl = download.url();
        const filename = download.suggestedFilename() || "download";
        onLog(`Download detected: ${filename}`);
        await download.cancel();
        downloadCapture = { url: fileUrl, filename };
        resolve(downloadCapture);
      });
    });

    onLog("Navigating to page...");
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });

    for (const step of STEPS) {
      onLog(`Agent: ${step.slice(0, 80)}...`);
      try {
        await stagehand.act({ action: step });
      } catch {
        // Step not applicable on this page — continue
      }
    }

    // Wait up to 8s for download event, then fall back to URL extraction
    const downloadFromEvent = await Promise.race([
      downloadEventPromise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 8_000)),
    ]);

    if (downloadFromEvent) return downloadFromEvent;

    // Fallback: extract the direct download URL from page DOM
    onLog("Extracting download URL from page...");
    const extracted = await stagehand.extract({
      instruction:
        "Find the direct file download URL on this page. Look for links to files (ZIP, EXE, DMG, APK, PDF, etc.) that would download a file when clicked.",
      schema: ResultSchema,
    });

    if (extracted.downloadUrl) {
      return {
        url: extracted.downloadUrl,
        filename: extracted.filename || extractFilenameFromUrl(extracted.downloadUrl),
      };
    }

    throw new Error(
      "Could not find a download link. The page may require a login, CAPTCHA, or Cloudflare verification."
    );
  } finally {
    await stagehand.close().catch(() => {});
  }
}

function extractFilenameFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname;
    const name = path.split("/").pop();
    return name && name.includes(".") ? name : "download";
  } catch {
    return "download";
  }
}
