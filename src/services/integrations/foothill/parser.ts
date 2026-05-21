// Best-effort HTML parser for Foothill's public schedule + catalog pages.
//
// The schedule UI is rendered server-side; section rows live in <table> elements with
// columns for CRN, course code, title, instructor, days/time, modality, enrollment.
//
// Foothill regularly tweaks page markup. We use cheerio with permissive selectors and
// per-row try/catch so a single malformed row doesn't fail the whole parse. If parsing
// yields zero results, the service falls back to seed data.

import * as cheerio from "cheerio";
import type { CatalogCourse, ScheduleSection } from "./types";

export function parseSections(html: string, term: string): ScheduleSection[] {
  const $ = cheerio.load(html);
  const sections: ScheduleSection[] = [];

  $("table tr").each((_, tr) => {
    const cells = $(tr).find("td").map((_, td) => $(td).text().trim()).get();
    if (cells.length < 4) return;
    try {
      const crn = pickByPattern(cells, /^\d{4,6}$/);
      const courseCode = pickByPattern(cells, /^[A-Z]{1,5}\s+\d{1,4}[A-Z]?$/);
      if (!crn || !courseCode) return;
      const title = cells.find((c) => /^[A-Z][a-zA-Z]/.test(c)) ?? courseCode;
      const days = pickByPattern(cells, /^[MTWRFS]{1,5}$/);
      const time = pickByPattern(cells, /\d{1,2}:\d{2}/);
      const enrolled = cells.find((c) => /^\d+\s*\/\s*\d+$/.test(c));
      let cap: number | undefined;
      let cur: number | undefined;
      if (enrolled) {
        const [a, b] = enrolled.split("/").map((s) => Number.parseInt(s.trim(), 10));
        if (Number.isFinite(a) && Number.isFinite(b)) {
          cur = a;
          cap = b;
        }
      }
      sections.push({
        crn,
        courseCode,
        title,
        units: 0, // catalog parse fills this; not present on the schedule row
        term,
        days,
        startTime: time?.split("-")[0]?.trim(),
        endTime: time?.split("-")[1]?.trim(),
        modality: "UNKNOWN",
        capacity: cap,
        enrolled: cur,
      });
    } catch {
      // Skip malformed row.
    }
  });

  return sections;
}

export function parseCatalog(html: string): CatalogCourse[] {
  const $ = cheerio.load(html);
  const courses: CatalogCourse[] = [];

  // catalog.foothill.edu lists courses in <div class="courseblock"> blocks (Acalog).
  $(".courseblock").each((_, el) => {
    const titleLine = $(el).find(".courseblocktitle").text().trim();
    const description = $(el).find(".courseblockdesc").text().trim();
    // titleLine examples: "C S 2A. Object-Oriented Programming Methodologies in C++. 4.5 Units."
    const m = titleLine.match(/^([A-Z]{1,5}(?:\s*&\s*[A-Z]{1,5})?\s+\d{1,4}[A-Z]?)\.\s*([^.]+)\.\s*([\d.]+)\s*Units?/i);
    if (!m) return;
    courses.push({
      code: m[1].trim(),
      title: m[2].trim(),
      units: Number.parseFloat(m[3]),
      description: description || undefined,
    });
  });

  return courses;
}

function pickByPattern(cells: string[], re: RegExp): string | undefined {
  return cells.find((c) => re.test(c));
}
