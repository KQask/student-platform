import { badRequest, ok, requireUserId } from "@/lib/api";
import { prisma } from "@/lib/db";
import { z } from "zod";

export async function GET() {
  const uid = await requireUserId();
  if (uid instanceof Response) return uid;
  const threads = await prisma.messageThread.findMany({
    where: { participants: { some: { userId: uid } } },
    include: {
      participants: { include: { user: { select: { id: true, name: true, image: true } } } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });
  return ok(threads);
}

const createSchema = z.object({ otherUserId: z.string() });

export async function POST(req: Request) {
  const uid = await requireUserId();
  if (uid instanceof Response) return uid;
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid input");
  // Find existing 1:1 thread first.
  const existing = await prisma.messageThread.findFirst({
    where: {
      AND: [
        { participants: { some: { userId: uid } } },
        { participants: { some: { userId: parsed.data.otherUserId } } },
      ],
    },
  });
  if (existing) return ok(existing);
  const thread = await prisma.messageThread.create({
    data: {
      participants: {
        create: [{ userId: uid }, { userId: parsed.data.otherUserId }],
      },
    },
  });
  return ok(thread);
}
