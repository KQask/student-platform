import { badRequest, ok, requireUserId } from "@/lib/api";
import { prisma } from "@/lib/db";
import { z } from "zod";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const uid = await requireUserId();
  if (uid instanceof Response) return uid;
  const { id } = await params;
  const thread = await prisma.messageThread.findFirst({
    where: { id, participants: { some: { userId: uid } } },
    include: {
      participants: { include: { user: { select: { id: true, name: true, image: true } } } },
      messages: {
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
        take: 200,
      },
    },
  });
  if (!thread) return ok(null);
  return ok(thread);
}

const sendSchema = z.object({ body: z.string().min(1).max(5000) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const uid = await requireUserId();
  if (uid instanceof Response) return uid;
  const { id } = await params;
  const parsed = sendSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid input");
  const member = await prisma.messageThreadParticipant.findFirst({ where: { threadId: id, userId: uid } });
  if (!member) return badRequest("Not a participant");
  const message = await prisma.message.create({
    data: { threadId: id, authorId: uid, body: parsed.data.body },
    include: { author: { select: { id: true, name: true } } },
  });
  await prisma.messageThread.update({ where: { id }, data: { updatedAt: new Date() } });
  return ok(message);
}
