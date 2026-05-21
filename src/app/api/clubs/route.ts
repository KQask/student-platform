import { badRequest, ok, requireUserId } from "@/lib/api";
import { prisma } from "@/lib/db";
import { z } from "zod";

export async function GET() {
  const clubs = await prisma.club.findMany({
    include: { school: true, _count: { select: { memberships: true } } },
    orderBy: { name: "asc" },
  });
  return ok(clubs);
}

const joinSchema = z.object({ clubId: z.string() });

export async function POST(req: Request) {
  const uid = await requireUserId();
  if (uid instanceof Response) return uid;
  const parsed = joinSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid input");
  const membership = await prisma.clubMembership.upsert({
    where: { clubId_userId: { clubId: parsed.data.clubId, userId: uid } },
    create: { clubId: parsed.data.clubId, userId: uid },
    update: {},
  });
  return ok(membership);
}
