// Normalized types exposed by foothillScheduleService.

export type Term = {
  code: string;   // e.g. "F26" — internal short code
  label: string;  // e.g. "Fall 2026"
};

export type ScheduleSection = {
  crn: string;
  courseCode: string;
  title: string;
  units: number;
  instructor?: string;
  term: string;
  days?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  modality: "IN_PERSON" | "ONLINE" | "HYBRID" | "UNKNOWN";
  capacity?: number;
  enrolled?: number;
};

export type CatalogCourse = {
  code: string;       // e.g. "C S 2A"
  title: string;
  units: number;
  description?: string;
  department?: string;
};
