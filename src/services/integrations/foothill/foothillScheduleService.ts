// Public surface for the Foothill schedule + catalog integration.
//
// FUTURE (de anza, other FHDA colleges): the same Banner-style schedule UI is shared
// across the Foothill-De Anza Community College District. Cloning this folder with a
// different base URL and (likely) reusing parser.ts wholesale is the expected path.
//
// FUTURE (swap to internal API): if the registrar exposes a JSON endpoint, replace
// client.fetchScheduleSearch with a JSON fetcher and update parser.ts accordingly. The
// public surface of this service should not change.

import { FoothillClient } from "./client";
import { parseCatalog, parseSections } from "./parser";
import { catalogCache, sectionsCache } from "./cache";
import type { CatalogCourse, ScheduleSection, Term } from "./types";
import seedCatalog from "./seed/catalog.json";
import seedSections from "./seed/sections.json";

const liveFetch = (process.env.FOOTHILL_LIVE_FETCH ?? "true") === "true";
const client = new FoothillClient();

export async function getTerms(): Promise<Term[]> {
  // FUTURE: scrape the term dropdown from the schedule page so this stays current.
  return [
    { code: "S26", label: "Spring 2026" },
    { code: "M26", label: "Summer 2026" },
    { code: "F26", label: "Fall 2026" },
    { code: "W27", label: "Winter 2027" },
  ];
}

export async function searchSections(input: {
  term: string;
  subject?: string;
  courseCode?: string;
}): Promise<ScheduleSection[]> {
  const key = `sections:${input.term}:${input.subject ?? ""}:${input.courseCode ?? ""}`;
  const cached = sectionsCache.get(key);
  if (cached) return cached as ScheduleSection[];

  if (liveFetch) {
    try {
      const html = await client.fetchScheduleSearch({
        term: input.term,
        subject: input.subject ?? "",
        course: input.courseCode ?? "",
      });
      const parsed = parseSections(html, input.term);
      if (parsed.length > 0) {
        sectionsCache.set(key, parsed);
        return parsed;
      }
    } catch (err) {
      console.warn("[foothillScheduleService] live fetch failed; using seed:", (err as Error).message);
    }
  }

  const seed = (seedSections as ScheduleSection[]).filter((s) => {
    if (input.term && s.term !== input.term) return false;
    if (input.courseCode && !s.courseCode.startsWith(input.courseCode)) return false;
    if (input.subject && !s.courseCode.startsWith(input.subject)) return false;
    return true;
  });
  sectionsCache.set(key, seed);
  return seed;
}

export async function getCourseCatalog(): Promise<CatalogCourse[]> {
  const cached = catalogCache.get("catalog");
  if (cached) return cached as CatalogCourse[];

  if (liveFetch) {
    try {
      const html = await client.fetchCatalogIndex();
      const parsed = parseCatalog(html);
      if (parsed.length > 0) {
        catalogCache.set("catalog", parsed);
        return parsed;
      }
    } catch (err) {
      console.warn("[foothillScheduleService] catalog fetch failed; using seed:", (err as Error).message);
    }
  }

  catalogCache.set("catalog", seedCatalog as CatalogCourse[]);
  return seedCatalog as CatalogCourse[];
}
