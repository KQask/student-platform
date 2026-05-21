import { auth } from "@/lib/auth";
import { getActivePlan } from "@/services/plannerService";
import { prisma } from "@/lib/db";
import { PlannerBoard } from "./PlannerBoard";

export default async function PlannerPage() {
  const session = await auth();
  const uid = (session!.user as { id: string }).id;
  const [plan, allCourses] = await Promise.all([
    getActivePlan(uid),
    prisma.course.findMany({ orderBy: { code: "asc" }, take: 500 }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Academic planner</h1>
        <p className="text-sm text-gray-600">Lay out your terms, add courses, and track progress.</p>
      </div>
      <PlannerBoard plan={plan} courses={allCourses} />
    </div>
  );
}
