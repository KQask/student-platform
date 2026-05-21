// Transfer readiness score + next-class suggestions.
//
// FUTURE: replace the weighted-average score with a graph-based prereq solver and an
// ML ranking model trained on student outcomes.

import { evaluateForUser, type SetEvaluation } from "./requirementsService";
import { searchSections } from "./integrations/foothill/foothillScheduleService";

export type ReadinessReport = {
  score: number; // 0..1
  sets: SetEvaluation[];
  missingGroups: { setName: string; groupName: string; options: string[] }[];
};

export async function getReadiness(userId: string): Promise<ReadinessReport> {
  const sets = await evaluateForUser(userId);

  // Weighted: major-prep counts double-weight vs. CalGETC for transfer readiness.
  let weightedSum = 0;
  let weightTotal = 0;
  for (const s of sets) {
    const w = s.type === "MAJOR_PREP" ? 2 : 1;
    weightedSum += s.percentComplete * w;
    weightTotal += w;
  }
  const score = weightTotal === 0 ? 0 : weightedSum / weightTotal;

  const missingGroups = sets.flatMap((s) =>
    s.groups
      .filter((g) => g.status !== "SATISFIED")
      .map((g) => ({
        setName: s.setName,
        groupName: g.name,
        options: g.options.map((o) => o.code),
      })),
  );

  return { score, sets, missingGroups };
}

export type NextClassSuggestion = {
  courseCode: string;
  reason: string;
  satisfiesGroups: { setName: string; groupName: string }[];
  availableSections: number;
};

export async function getNextClassSuggestions(userId: string): Promise<NextClassSuggestion[]> {
  const sets = await evaluateForUser(userId);

  // Score each course by how many unsatisfied groups it appears in (across all sets).
  const courseAppearances = new Map<string, { code: string; groups: { setName: string; groupName: string }[] }>();
  for (const s of sets) {
    for (const g of s.groups) {
      if (g.status === "SATISFIED") continue;
      for (const o of g.options) {
        const entry = courseAppearances.get(o.code) ?? { code: o.code, groups: [] };
        entry.groups.push({ setName: s.setName, groupName: g.name });
        courseAppearances.set(o.code, entry);
      }
    }
  }

  const ranked = [...courseAppearances.values()].sort((a, b) => b.groups.length - a.groups.length).slice(0, 8);

  // Check availability of each in the upcoming term.
  // FUTURE: detect "next term" from a calendar service instead of hardcoding.
  const term = "F26";
  const out: NextClassSuggestion[] = [];
  for (const r of ranked) {
    const sections = await searchSections({ term, courseCode: r.code });
    out.push({
      courseCode: r.code,
      reason: r.groups.length > 1
        ? `Progresses ${r.groups.length} requirement groups across your transfer goals.`
        : "Fills an unsatisfied requirement.",
      satisfiesGroups: r.groups,
      availableSections: sections.length,
    });
  }
  return out;
}
