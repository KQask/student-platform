// DB import for parsed transcript entries.
//
// Strategy:
//   1. Resolve each entry's course by code against the user's school's catalog
//      (current profile.schoolId, defaulting to Foothill if not set).
//      Falls back to a global code lookup if the school-scoped lookup misses.
//   2. Group entries by term; create or find PlanTerm rows on the user's active plan.
//   3. Upsert PlanCourse rows. If a course already exists in that term we update the
//      status + grade rather than duplicating it.

import { prisma } from "@/lib/db";
import { getActivePlan } from "./plannerService";
import type { ParsedEntry } from "./transcriptParser";

export type ImportSummary = {
  importedCount: number;
  skippedExisting: number;
  unmatched: { courseCode: string; term: string; reason: string }[];
};

export async function importTranscriptEntries(
  userId: string,
  entries: ParsedEntry[],
): Promise<ImportSummary> {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  const schoolId = profile?.schoolId ?? null;

  // Build a lookup by code (school-scoped first, then global).
  const codes = [...new Set(entries.map((e) => e.courseCode))];
  const courses = await prisma.course.findMany({
    where: { code: { in: codes } },
    select: { id: true, code: true, schoolId: true },
  });
  const courseByCode = new Map<string, { id: string; schoolId: string }>();
  for (const c of courses) {
    const existing = courseByCode.get(c.code);
    // Prefer the user's school if multiple schools share a code.
    if (!existing || c.schoolId === schoolId) {
      courseByCode.set(c.code, { id: c.id, schoolId: c.schoolId });
    }
  }

  const plan = await getActivePlan(userId);
  const existingTerms = new Map(plan.terms.map((t) => [t.term, t.id]));
  const existingPlanCourses = new Map<string, string>(); // `${planTermId}:${courseId}` → planCourseId
  for (const t of plan.terms) {
    for (const pc of t.courses) {
      existingPlanCourses.set(`${t.id}:${pc.courseId}`, pc.id);
    }
  }

  let importedCount = 0;
  let skippedExisting = 0;
  const unmatched: ImportSummary["unmatched"] = [];

  // Determine next available "order" for new terms.
  let nextOrder = plan.terms.length;

  // Sort by chronological term order using a stable heuristic.
  const sortedEntries = [...entries].sort((a, b) => termSortKey(a.term) - termSortKey(b.term));

  for (const entry of sortedEntries) {
    const course = courseByCode.get(entry.courseCode);
    if (!course) {
      unmatched.push({
        courseCode: entry.courseCode,
        term: entry.term,
        reason: "Course code not found in catalog",
      });
      continue;
    }

    // Ensure PlanTerm exists.
    let planTermId = existingTerms.get(entry.term);
    if (!planTermId) {
      const created = await prisma.planTerm.create({
        data: { academicPlanId: plan.id, term: entry.term, order: nextOrder++ },
      });
      planTermId = created.id;
      existingTerms.set(entry.term, planTermId);
    }

    const key = `${planTermId}:${course.id}`;
    const existingId = existingPlanCourses.get(key);
    if (existingId) {
      await prisma.planCourse.update({
        where: { id: existingId },
        data: { status: entry.status, grade: entry.grade ?? null },
      });
      skippedExisting += 1;
    } else {
      await prisma.planCourse.create({
        data: {
          planTermId,
          courseId: course.id,
          status: entry.status,
          grade: entry.grade ?? null,
        },
      });
      existingPlanCourses.set(key, "new");
      importedCount += 1;
    }
  }

  return { importedCount, skippedExisting, unmatched };
}

// Map "Fall 2024" → sortable integer (year * 4 + season offset).
function termSortKey(term: string): number {
  const m = term.match(/(Winter|Spring|Summer|Fall)\s+(\d{4})/i);
  if (!m) return 0;
  const season = m[1].toLowerCase();
  const offset = season === "winter" ? 0 : season === "spring" ? 1 : season === "summer" ? 2 : 3;
  return Number.parseInt(m[2], 10) * 4 + offset;
}
