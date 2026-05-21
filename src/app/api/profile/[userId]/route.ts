import { ok } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: {
        include: {
          school: true,
          major: true,
          transferGoals: { include: { school: true, major: true } },
        },
      },
    },
  });
  if (!user) return ok(null);
  if (!user.isPublic) return ok({ id: user.id, name: user.name, isPublic: false });
  return ok(user);
}
