// Normalized types exposed by assistService. Callers should never see raw ASSIST payloads.

export type Institution = {
  id: number;
  name: string;
  code: string;
  category: "CC" | "UC" | "CSU" | "PRIVATE" | "OTHER";
};

export type AcademicYear = {
  id: number;
  label: string; // e.g. "2025-2026"
};

export type AgreementSummary = {
  key: string;
  label: string;
  majorName: string;
  receivingInstitutionId: number;
  sendingInstitutionId: number;
  academicYearId: number;
};

// A single requirement group: "complete N courses from these options" (or all of them, in a series).
export type NormalizedRequirementGroup = {
  name: string;
  description?: string;
  minCourses: number;
  options: {
    // sending-school course code, e.g. "C S 2A"
    courseCode: string;
    // If multiple options share the same seriesKey, they must all be completed together.
    seriesKey?: string;
  }[];
};

export type NormalizedRequirementSet = {
  receivingInstitutionId: number;
  sendingInstitutionId: number;
  academicYear: string;
  majorName: string;
  sourceUrl?: string;
  groups: NormalizedRequirementGroup[];
};
