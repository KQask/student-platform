import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default async function CourseDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      sections: { include: { professor: true }, orderBy: { term: "desc" } },
      reviews: { include: { author: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!course) notFound();

  const avgRating =
    course.reviews.length === 0
      ? null
      : course.reviews.reduce((a, r) => a + r.rating, 0) / course.reviews.length;

  return (
    <div className="space-y-6">
      <div>
        <div className="font-mono text-2xl font-bold text-gray-900">{course.code}</div>
        <h1 className="text-xl text-gray-800">{course.title}</h1>
        <div className="mt-2 flex items-center gap-2">
          <Badge>{course.units} units</Badge>
          {avgRating !== null && <Badge tone="info">★ {avgRating.toFixed(1)} · {course.reviews.length} reviews</Badge>}
        </div>
      </div>

      {course.description && (
        <Card>
          <CardHeader><CardTitle>Description</CardTitle></CardHeader>
          <CardBody className="text-sm text-gray-700">{course.description}</CardBody>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Sections</CardTitle></CardHeader>
        <CardBody className="p-0">
          {course.sections.length === 0 ? (
            <p className="p-5 text-sm text-gray-600">No sections currently scheduled.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {course.sections.map((s) => (
                <li key={s.id} className="px-5 py-3 flex items-center justify-between gap-4 text-sm">
                  <div>
                    <div className="font-medium text-gray-900">
                      {s.term} {s.crn && <span className="text-xs text-gray-500 font-mono">#{s.crn}</span>}
                    </div>
                    <div className="text-xs text-gray-600">
                      {s.days ?? "—"} {s.startTime}{s.endTime ? `–${s.endTime}` : ""} · {s.location ?? "—"}
                      {s.professor && <> · {s.professor.name}</>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge tone={s.modality === "ONLINE" ? "info" : "default"}>{s.modality.toLowerCase()}</Badge>
                    {s.capacity && s.enrolled !== null && (
                      <Badge tone={s.enrolled! < s.capacity ? "success" : "warning"}>
                        {s.enrolled}/{s.capacity}
                      </Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Reviews</CardTitle></CardHeader>
        <CardBody>
          {course.reviews.length === 0 ? (
            <p className="text-sm text-gray-600">No reviews yet.</p>
          ) : (
            <ul className="space-y-3">
              {course.reviews.map((r) => (
                <li key={r.id} className="border border-gray-100 rounded-md p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{r.author.name ?? "Anonymous"}</span>
                    <span className="text-amber-600">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                  </div>
                  {r.body && <p className="mt-1 text-sm text-gray-700">{r.body}</p>}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
