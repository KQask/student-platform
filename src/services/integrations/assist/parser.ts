// Parser: ASSIST agreement JSON → NormalizedRequirementSet.
//
// ASSIST's published-agreement payload is a deeply nested tree: an agreement contains
// sections; each section contains rows; each row contains a list of "from" courses
// (sending school) joined by conjunctions (AND / OR), and a "to" target.
//
// For MVP purposes we extract a flat list of RequirementGroups, where each group is
// either:
//   - "complete N of these courses" (OR conjunctions), or
//   - "complete this series" (AND conjunctions, shared seriesKey)
//
// TODO: ASSIST also expresses "courses-with-equivalent-honors", "any course" wildcards,
// and unit-floor requirements. Those are flagged in-line and left as future work.

import type { NormalizedRequirementGroup, NormalizedRequirementSet } from "./types";

type Unknown = Record<string, unknown>;

export function parseAgreement(input: {
  raw: unknown;
  receivingInstitutionId: number;
  sendingInstitutionId: number;
  academicYear: string;
  majorName: string;
  sourceUrl?: string;
}): NormalizedRequirementSet {
  const groups: NormalizedRequirementGroup[] = [];

  // ASSIST's agreement schema has shifted across releases. We defensively walk the tree
  // looking for course-bearing nodes rather than relying on rigid pathing.
  walk(input.raw, (node) => {
    const courseCodes = extractCourseCodes(node);
    if (courseCodes.length === 0) return;

    const name = pickString(node, ["name", "title", "label"]) ?? "Requirement";
    const description = pickString(node, ["description", "instruction"]);
    const isSeries = isAndConjunction(node);

    if (isSeries) {
      const seriesKey = `series-${groups.length}`;
      groups.push({
        name,
        description,
        minCourses: courseCodes.length,
        options: courseCodes.map((c) => ({ courseCode: c, seriesKey })),
      });
    } else {
      groups.push({
        name,
        description,
        minCourses: 1,
        options: courseCodes.map((c) => ({ courseCode: c })),
      });
    }
  });

  return {
    receivingInstitutionId: input.receivingInstitutionId,
    sendingInstitutionId: input.sendingInstitutionId,
    academicYear: input.academicYear,
    majorName: input.majorName,
    sourceUrl: input.sourceUrl,
    groups,
  };
}

function walk(node: unknown, visit: (n: Unknown) => void): void {
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit);
    return;
  }
  if (node && typeof node === "object") {
    visit(node as Unknown);
    for (const value of Object.values(node as Unknown)) walk(value, visit);
  }
}

function extractCourseCodes(node: Unknown): string[] {
  // Heuristic: any string field that looks like "PREFIX NNNN" inside this node, plus
  // any nested "courseIdentifierParentId" + "prefix"/"courseNumber" combos.
  const direct = new Set<string>();

  // Pattern A: prefix + courseNumber fields directly on the node.
  const prefix = pickString(node, ["prefix", "subjectCode"]);
  const num = pickString(node, ["courseNumber", "number"]);
  if (prefix && num) direct.add(`${prefix} ${num}`);

  // Pattern B: any string value matching a course-code regex.
  for (const value of Object.values(node)) {
    if (typeof value === "string") {
      const m = value.match(/\b([A-Z]{1,5}(?:\s*&\s*[A-Z]{1,5})?)\s+([0-9]{1,4}[A-Z]?)\b/);
      if (m) direct.add(`${m[1]} ${m[2]}`);
    }
  }

  return [...direct];
}

function isAndConjunction(node: Unknown): boolean {
  const conj = pickString(node, ["conjunction", "operator"]);
  return conj?.toUpperCase() === "AND";
}

function pickString(node: Unknown, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = node[k];
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return undefined;
}
