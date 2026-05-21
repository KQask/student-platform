// GPA computation from a student's active academic plan.
//
// Conventions:
//   - Only PlanCourses with status=COMPLETED and a parseable letter grade contribute.
//   - P / NP / CR / NC / I / W do not contribute (no GPA impact, units don't count).
//   - +/- modifiers use the standard 4.0 scale (A=4.0, A-=3.7, B+=3.3, B=3.0, ...).
//   - F counts as 0.0 grade points but the units DO count (lowers GPA).
//
// FUTURE: compute a separate "UC-transferable GPA" that only counts courses appearing
// in any RequirementOption — that's what UC admissions actually evaluates.

import { prisma } from "@/lib/db";

const GRADE_POINTS: Record<string, number> = {
  "A+": 4.0, "A": 4.0, "A-": 3.7,
  "B+": 3.3, "B": 3.0, "B-": 2.7,
  "C+": 2.3, "C": 2.0, "C-": 1.7,
  "D+": 1.3, "D": 1.0, "D-": 0.7,
  "F": 0.0,
};

export type GpaReport = {
  gpa: number | null;          // null when no graded courses yet
  totalUnits: number;          // units of graded (GPA-contributing) courses
  completedUnits: number;      // units of all COMPLETED courses (incl. P/CR)
  gradedCount: number;
  breakdown: { code: string; title: string; grade: string; units: number; points: number }[];
};

export function letterToPoints(grade: string | null | undefined): number | null {
  if (!grade) return null;
  const normalized = grade.trim().toUpperCase();
  return normalized in GRADE_POINTS ? GRADE_POINTS[normalized] : null;
}

export async function computeGpa(userId: string): Promise<GpaReport> {
  const rows = await prisma.planCourse.findMany({
    where: {
      planTerm: { plan: { userId, isActive: true } },
      status: "COMPLETED",
    },
    include: { course: true },
  });

  let qualityPoints = 0;
  let gpaUnits = 0;
  let completedUnits = 0;
  const breakdown: GpaReport["breakdown"] = [];

  for (const r of rows) {
    const units = r.course.units;
    completedUnits += units;
    const points = letterToPoints(r.grade);
    if (points === null) continue;
    qualityPoints += points * units;
    gpaUnits += units;
    breakdown.push({
      code: r.course.code,
      title: r.course.title,
      grade: r.grade!.toUpperCase(),
      units,
      points,
    });
  }

  return {
    gpa: gpaUnits > 0 ? +(qualityPoints / gpaUnits).toFixed(3) : null,
    totalUnits: gpaUnits,
    completedUnits,
    gradedCount: breakdown.length,
    breakdown,
  };
}
