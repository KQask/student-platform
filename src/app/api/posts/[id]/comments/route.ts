import { badRequest, ok, requireUserId } from "@/lib/api";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({ body: z.string().min(1).max(2000) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const uid = await requireUserId();
  if (uid instanceof Response) return uid;
  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid input");
  const comment = await prisma.comment.create({
    data: { postId: id, authorId: uid, body: parsed.data.body },
    include: { author: { select: { id: true, name: true } } },
  });
  return ok(comment);
}
