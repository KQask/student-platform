import { ok, requireUserId } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const uid = await requireUserId();
  if (uid instanceof Response) return uid;
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const courses = await prisma.course.findMany({
    where: q
      ? { OR: [{ code: { contains: q, mode: "insensitive" } }, { title: { contains: q, mode: "insensitive" } }] }
      : undefined,
    orderBy: { code: "asc" },
    take: 200,
  });
  return ok(courses);
}
