import { ok, requireUserId } from "@/lib/api";
import { evaluateForUser } from "@/services/requirementsService";

export async function GET() {
  const uid = await requireUserId();
  if (uid instanceof Response) return uid;
  return ok(await evaluateForUser(uid));
}
