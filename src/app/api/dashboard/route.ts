import { ok, requireUserId } from "@/lib/api";
import { getNextClassSuggestions, getReadiness } from "@/services/recommendationService";
import { computeGpa } from "@/services/gpaService";

export async function GET() {
  const uid = await requireUserId();
  if (uid instanceof Response) return uid;
  const [readiness, suggestions, gpa] = await Promise.all([
    getReadiness(uid),
    getNextClassSuggestions(uid),
    computeGpa(uid),
  ]);
  return ok({ readiness, suggestions, gpa });
}
