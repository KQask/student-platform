import { ok, requireUserId } from "@/lib/api";
import { addTerm, getActivePlan } from "@/services/plannerService";
import { z } from "zod";

export async function GET() {
  const uid = await requireUserId();
  if (uid instanceof Response) return uid;
  return ok(await getActivePlan(uid));
}

const termSchema = z.object({ term: z.string().min(2), order: z.number().int() });

export async function POST(req: Request) {
  const uid = await requireUserId();
  if (uid instanceof Response) return uid;
  const body = await req.json().catch(() => null);
  const parsed = termSchema.safeParse(body);
  if (!parsed.success) return ok({ error: "Invalid term" });
  const plan = await getActivePlan(uid);
  return ok(await addTerm(plan.id, parsed.data.term, parsed.data.order));
}
