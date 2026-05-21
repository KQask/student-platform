import { ok } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, name: true, image: true } },
      comments: { include: { author: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } },
      reactions: true,
    },
  });
  return ok(post);
}
