import { badRequest, ok, requireUserId } from "@/lib/api";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { ReactionType } from "@prisma/client";

const schema = z.object({ type: z.nativeEnum(ReactionType) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const uid = await requireUserId();
  if (uid instanceof Response) return uid;
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid input");

  // Toggle: delete if exists, else create.
  const existing = await prisma.reaction.findFirst({
    where: { userId: uid, postId: id, type: parsed.data.type },
  });
  if (existing) {
    await prisma.reaction.delete({ where: { id: existing.id } });
    return ok({ active: false });
  }
  await prisma.reaction.create({ data: { userId: uid, postId: id, type: parsed.data.type } });
  return ok({ active: true });
}
