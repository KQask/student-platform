// Accepts a transcript as either:
//   - JSON: { "text": "..." }
//   - multipart/form-data with a "file" field (PDF or plain text)
// Returns: { entries: ParsedEntry[], warnings: string[], rawTextLength: number }
//
// PDF text extraction uses pdf-parse 2.x (class-based API).
// Image-only / scanned PDFs are NOT supported in MVP — those need OCR upstream.

import { ok, requireUserId, badRequest } from "@/lib/api";
import { parseTranscript } from "@/services/transcriptParser";

export async function POST(req: Request) {
  const uid = await requireUserId();
  if (uid instanceof Response) return uid;

  const contentType = req.headers.get("content-type") ?? "";
  let text: string | null = null;

  try {
    if (contentType.includes("application/json")) {
      const body = await req.json().catch(() => null);
      if (typeof body?.text === "string") text = body.text;
    } else if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (file instanceof Blob) {
        const name = (file as File).name?.toLowerCase() ?? "";
        const buf = Buffer.from(await file.arrayBuffer());
        if (name.endsWith(".pdf") || (file.type || "").includes("pdf")) {
          const { PDFParse } = await import("pdf-parse");
          const parser = new PDFParse({ data: new Uint8Array(buf) });
          try {
            const result = await parser.getText();
            text = result.text ?? "";
          } finally {
            await parser.destroy().catch(() => {});
          }
        } else {
          text = buf.toString("utf8");
        }
      }
    }
  } catch (err) {
    return badRequest(`Could not read upload: ${(err as Error).message}`);
  }

  if (!text || text.trim().length === 0) {
    return badRequest("No transcript text found. Paste it directly or upload a PDF / .txt file.");
  }

  const { entries, warnings } = parseTranscript(text);
  return ok({ entries, warnings, rawTextLength: text.length });
}
