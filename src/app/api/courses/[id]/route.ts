import { ok, requireUserId } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const uid = await requireUserId();
  if (uid instanceof Response) return uid;
  const { id } = await params;
  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      sections: { include: { professor: true }, orderBy: { term: "desc" } },
      reviews: { include: { author: true } },
    },
  });
  return ok(course);
}
