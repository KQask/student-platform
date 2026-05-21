import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CoursesSearch } from "./CoursesSearch";

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const where = q
    ? { OR: [{ code: { contains: q, mode: "insensitive" as const } }, { title: { contains: q, mode: "insensitive" as const } }] }
    : {};
  const courses = await prisma.course.findMany({
    where,
    orderBy: { code: "asc" },
    include: { _count: { select: { sections: true, reviews: true } } },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Courses</h1>
        <p className="text-sm text-gray-600">Foothill College catalog, with section data from the public schedule.</p>
      </div>

      <CoursesSearch initialQuery={q ?? ""} />

      <Card>
        <CardBody className="p-0">
          <ul className="divide-y divide-gray-100">
            {courses.length === 0 ? (
              <li className="p-5 text-sm text-gray-600">No courses match your search.</li>
            ) : (
              courses.map((c) => (
                <li key={c.id}>
                  <Link href={`/courses/${c.id}`} className="block px-5 py-3 hover:bg-gray-50">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-mono font-semibold text-gray-900">{c.code}</div>
                        <div className="text-sm text-gray-700 truncate">{c.title}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge>{c.units} units</Badge>
                        {c._count.sections > 0 && <Badge tone="info">{c._count.sections} sections</Badge>}
                      </div>
                    </div>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
