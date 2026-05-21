// Debug/admin-friendly pass-through to ASSIST integration.
// Returns the parsed normalized RequirementSet (not the raw payload).

import { ok, requireUserId } from "@/lib/api";
import { getInstitutions } from "@/services/integrations/assist/assistService";

export async function GET() {
  const uid = await requireUserId();
  if (uid instanceof Response) return uid;
  return ok({ institutions: await getInstitutions() });
}
