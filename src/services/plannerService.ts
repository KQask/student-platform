import { prisma } from "@/lib/db";
import { PlanCourseStatus } from "@prisma/client";

export async function getActivePlan(userId: string) {
  let plan = await prisma.academicPlan.findFirst({
    where: { userId, isActive: true },
    include: {
      terms: {
        orderBy: { order: "asc" },
        include: {
          courses: {
            include: { course: true, professor: true },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });
  if (!plan) {
    plan = await prisma.academicPlan.create({
      data: { userId, name: "My Plan", isActive: true },
      include: {
        terms: {
          orderBy: { order: "asc" },
          include: {
            courses: {
              include: { course: true, professor: true },
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
    });
  }
  return plan;
}

export async function addTerm(planId: string, term: string, order: number) {
  return prisma.planTerm.create({ data: { academicPlanId: planId, term, order } });
}

export async function removeTerm(planTermId: string, userId: string) {
  // Verify the term belongs to a plan owned by this user before deleting.
  const term = await prisma.planTerm.findFirst({
    where: { id: planTermId, plan: { userId } },
    select: { id: true },
  });
  if (!term) throw new Error("Term not found or not owned by user");
  await prisma.planTerm.delete({ where: { id: term.id } });
}

// Resolve a professor by name within a school. Creates the professor if not found
// so users can type unfamiliar instructor names without prior admin setup.
async function resolveProfessor(schoolId: string, name: string | null | undefined): Promise<string | null> {
  if (!name || !name.trim()) return null;
  const cleaned = name.trim();
  const existing = await prisma.professor.findFirst({
    where: { schoolId, name: { equals: cleaned, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await prisma.professor.create({
    data: { schoolId, name: cleaned, departments: [] },
  });
  return created.id;
}

export async function addCourseToTerm(input: {
  userId: string;
  planTermId: string;
  courseId: string;
  status?: PlanCourseStatus;
  grade?: string | null;
  professorName?: string | null;
}) {
  // Resolve the professor (if any) against the user's current school.
  let professorId: string | null = null;
  if (input.professorName) {
    const profile = await prisma.profile.findUnique({
      where: { userId: input.userId },
      select: { schoolId: true },
    });
    const course = await prisma.course.findUnique({
      where: { id: input.courseId },
      select: { schoolId: true },
    });
    const schoolId = profile?.schoolId ?? course?.schoolId;
    if (schoolId) professorId = await resolveProfessor(schoolId, input.professorName);
  }
  return prisma.planCourse.upsert({
    where: { planTermId_courseId: { planTermId: input.planTermId, courseId: input.courseId } },
    create: {
      planTermId: input.planTermId,
      courseId: input.courseId,
      status: input.status ?? "PLANNED",
      grade: input.grade ?? null,
      professorId,
    },
    update: {
      status: input.status ?? "PLANNED",
      grade: input.grade ?? null,
      ...(professorId !== null ? { professorId } : {}),
    },
  });
}

export async function removeCourseFromTerm(planCourseId: string) {
  return prisma.planCourse.delete({ where: { id: planCourseId } });
}

export async function updatePlanCourse(input: {
  userId: string;
  planCourseId: string;
  status?: PlanCourseStatus;
  grade?: string | null;
  professorName?: string | null;
}) {
  // Ownership check.
  const row = await prisma.planCourse.findFirst({
    where: { id: input.planCourseId, planTerm: { plan: { userId: input.userId } } },
    include: { course: { select: { schoolId: true } } },
  });
  if (!row) throw new Error("PlanCourse not found or not owned by user");

  // Resolve professor name → professorId (or null to clear).
  let professorIdUpdate: { professorId: string | null } | Record<string, never> = {};
  if (input.professorName !== undefined) {
    if (input.professorName === null || input.professorName === "") {
      professorIdUpdate = { professorId: null };
    } else {
      const profile = await prisma.profile.findUnique({
        where: { userId: input.userId },
        select: { schoolId: true },
      });
      const schoolId = profile?.schoolId ?? row.course.schoolId;
      const profId = await resolveProfessor(schoolId, input.professorName);
      if (profId) professorIdUpdate = { professorId: profId };
    }
  }

  return prisma.planCourse.update({
    where: { id: row.id },
    data: {
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.grade !== undefined ? { grade: input.grade } : {}),
      ...professorIdUpdate,
    },
  });
}

export async function getCompletedAndEnrolledCourseIds(userId: string): Promise<Set<string>> {
  const rows = await prisma.planCourse.findMany({
    where: {
      planTerm: { plan: { userId, isActive: true } },
      status: { in: ["COMPLETED", "ENROLLED"] },
    },
    select: { courseId: true },
  });
  return new Set(rows.map((r) => r.courseId));
}
