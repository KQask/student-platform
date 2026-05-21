import { badRequest, ok, requireUserId } from "@/lib/api";
import { removeTerm } from "@/services/plannerService";
import { z } from "zod";

const schema = z.object({ planTermId: z.string() });

export async function DELETE(req: Request) {
  const uid = await requireUserId();
  if (uid instanceof Response) return uid;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid input");
  try {
    await removeTerm(parsed.data.planTermId, uid);
    return ok({ ok: true });
  } catch (err) {
    return badRequest((err as Error).message);
  }
}
