import { badRequest, ok, requireUserId } from "@/lib/api";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { ConnectionStatus } from "@prisma/client";

const requestSchema = z.object({ addresseeId: z.string() });
const updateSchema = z.object({
  connectionId: z.string(),
  status: z.enum(["ACCEPTED", "DECLINED"]),
});

export async function GET() {
  const uid = await requireUserId();
  if (uid instanceof Response) return uid;
  const connections = await prisma.connection.findMany({
    where: { OR: [{ requesterId: uid }, { addresseeId: uid }] },
    include: {
      requester: { select: { id: true, name: true, image: true } },
      addressee: { select: { id: true, name: true, image: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return ok(connections);
}

export async function POST(req: Request) {
  const uid = await requireUserId();
  if (uid instanceof Response) return uid;
  const parsed = requestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid input");
  if (parsed.data.addresseeId === uid) return badRequest("Cannot connect to self");
  const conn = await prisma.connection.upsert({
    where: { requesterId_addresseeId: { requesterId: uid, addresseeId: parsed.data.addresseeId } },
    create: { requesterId: uid, addresseeId: parsed.data.addresseeId },
    update: {},
  });
  return ok(conn);
}

export async function PATCH(req: Request) {
  const uid = await requireUserId();
  if (uid instanceof Response) return uid;
  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid input");
  const conn = await prisma.connection.findUnique({ where: { id: parsed.data.connectionId } });
  if (!conn || conn.addresseeId !== uid) return badRequest("Not authorized");
  return ok(
    await prisma.connection.update({
      where: { id: conn.id },
      data: { status: parsed.data.status as ConnectionStatus },
    }),
  );
}
