import { ok, requireUserId } from "@/lib/api";
import { getTerms, searchSections } from "@/services/integrations/foothill/foothillScheduleService";

export async function GET(req: Request) {
  const uid = await requireUserId();
  if (uid instanceof Response) return uid;
  const url = new URL(req.url);
  const term = url.searchParams.get("term");
  if (!term) return ok({ terms: await getTerms() });
  return ok({
    sections: await searchSections({
      term,
      subject: url.searchParams.get("subject") ?? undefined,
      courseCode: url.searchParams.get("courseCode") ?? undefined,
    }),
  });
}
