import { ok, requireUserId } from "@/lib/api";
import { computeGpa } from "@/services/gpaService";

export async function GET() {
  const uid = await requireUserId();
  if (uid instanceof Response) return uid;
  return ok(await computeGpa(uid));
}
