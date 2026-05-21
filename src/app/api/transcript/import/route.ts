import { z } from "zod";
import { badRequest, ok, requireUserId } from "@/lib/api";
import { importTranscriptEntries } from "@/services/transcriptService";

const entrySchema = z.object({
  term: z.string(),
  rawTerm: z.string().optional(),
  courseCode: z.string(),
  title: z.string().optional(),
  units: z.number().optional(),
  grade: z.string().optional(),
  status: z.enum(["COMPLETED", "DROPPED"]),
  lineIndex: z.number().optional(),
});

const schema = z.object({ entries: z.array(entrySchema).min(1) });

export async function POST(req: Request) {
  const uid = await requireUserId();
  if (uid instanceof Response) return uid;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid payload");
  const summary = await importTranscriptEntries(uid, parsed.data.entries);
  return ok(summary);
}
