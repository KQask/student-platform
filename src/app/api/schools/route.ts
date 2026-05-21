import { ok } from "@/lib/api";
import { prisma } from "@/lib/db";

export async function GET() {
  const schools = await prisma.school.findMany({
    include: { majors: { orderBy: { name: "asc" } } },
    orderBy: { name: "asc" },
  });
  return ok(schools);
}
