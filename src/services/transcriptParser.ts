// Best-effort transcript text → structured entries parser.
//
// Designed primarily for Foothill / FHDA transcripts but tolerant of common formats.
// The parser is pure (no DB) so it can be unit-tested in isolation and reused for
// non-Foothill transcripts later.
//
// FUTURE: train a more robust extractor for: (a) scanned/image transcripts (OCR step
// upstream), (b) UC/CSU formats, (c) AP credits granted with no letter grade.

export type TranscriptStatus = "COMPLETED" | "DROPPED";

export type ParsedEntry = {
  term: string;             // normalized "Fall 2024"
  rawTerm?: string;         // original header text (omitted in API payloads)
  courseCode: string;       // normalized, e.g. "C S 2A"
  title?: string;
  units?: number;
  grade?: string;           // "A", "B+", "P", "NP", "W", "I", "CR", "NC"
  status: TranscriptStatus;
  // Index into the source text — useful for the UI to highlight unparsed lines.
  lineIndex?: number;
};

export type ParseResult = {
  entries: ParsedEntry[];
  warnings: string[];
};

const SEASONS = ["WINTER", "SPRING", "SUMMER", "FALL"];
const SEASON_RX = SEASONS.join("|");

// Match a term header line in many forms:
//   "FALL QUARTER 2024", "Fall 2024", "Spring Quarter 2025", "FALL 2024-2025"
const TERM_HEADER_RX = new RegExp(
  String.raw`\b(${SEASON_RX})\s*(?:QUARTER|SEMESTER|TERM)?\s*(\d{4})\b`,
  "i",
);

// Course code: 1-5 letter prefix, optional space-separated continuation, then a number.
// Allows both "CS 2A" and "C S 2A" (Foothill's catalog uses the spaced form).
const COURSE_CODE_RX = /\b([A-Z]{1,5}(?:\s+[A-Z]{1,5})?(?:\s*&\s*[A-Z]{1,5})?)\s+(\d{1,4}[A-Z]?)\b/;

// Grade token: bounded by whitespace (not word boundaries — `\b` doesn't trigger between
// "-" and " ", which would strip +/- modifiers). Anchored to whitespace/end so we don't
// match the "C" in "C++" inside a course title.
const GRADE_TOKEN_RX = /(?:^|\s)(A[+-]?|B[+-]?|C[+-]?|D[+-]?|F|P|NP|CR|NC|I|W|IP)(?=\s|$)/g;

// Units: one or two digits, optional fractional part. Foothill uses x.x or x.xx.
const UNITS_RX = /\b(\d{1,2}(?:\.\d{1,2})?)\b/g;

export function parseTranscript(rawText: string): ParseResult {
  const warnings: string[] = [];
  const entries: ParsedEntry[] = [];
  const lines = rawText.split(/\r?\n/);

  let currentTerm: string | null = null;
  let currentRawTerm: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Term header?
    const termMatch = line.match(TERM_HEADER_RX);
    if (termMatch) {
      const season = capitalize(termMatch[1]);
      const year = termMatch[2];
      currentTerm = `${season} ${year}`;
      currentRawTerm = line;
      continue;
    }

    // Otherwise try to extract a course row.
    const codeMatch = line.match(COURSE_CODE_RX);
    if (!codeMatch) continue;

    const courseCode = normalizeCourseCode(codeMatch[1], codeMatch[2]);

    // Grade and units come from the portion AFTER the course code. We take the LAST
    // grade-shaped token (transcripts list grade at the end of the row), which avoids
    // false matches like the "C" in "C++" inside a course title.
    const afterCode = line.slice((codeMatch.index ?? 0) + codeMatch[0].length);
    const gradeMatches = [...afterCode.matchAll(GRADE_TOKEN_RX)];
    const lastGradeMatch = gradeMatches[gradeMatches.length - 1];
    const grade = lastGradeMatch?.[1]?.toUpperCase();

    // Units: rightmost numeric token strictly BEFORE the grade. If no grade, use the
    // rightmost numeric token overall (still likely the units column).
    const gradeIndex = lastGradeMatch ? (lastGradeMatch.index ?? 0) : afterCode.length;
    const beforeGrade = afterCode.slice(0, gradeIndex);
    const unitTokens = [...beforeGrade.matchAll(UNITS_RX)];
    const lastUnit = unitTokens[unitTokens.length - 1];
    const units = lastUnit ? Number.parseFloat(lastUnit[1]) : undefined;

    // Title = text between the course code and the unit/grade tokens.
    const titleCutoff = lastUnit?.index ?? gradeIndex;
    let title: string | undefined = afterCode
      .slice(0, titleCutoff)
      .replace(/[.·•—]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (title.length === 0) title = undefined;

    if (!currentTerm) {
      warnings.push(`Line ${i + 1}: found course "${courseCode}" before any term header; skipping.`);
      continue;
    }

    const status: TranscriptStatus = grade && /^(W|I|IP)$/.test(grade) ? "DROPPED" : "COMPLETED";

    entries.push({
      term: currentTerm,
      rawTerm: currentRawTerm ?? currentTerm,
      courseCode,
      title,
      units,
      grade,
      status,
      lineIndex: i,
    });
  }

  if (entries.length === 0) {
    warnings.push(
      "No course rows recognized. Make sure the text contains term headers like " +
      "\"Fall 2024\" followed by lines like \"C S 2A  Programming  4.5  A\".",
    );
  }

  return { entries, warnings };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function normalizeCourseCode(prefix: string, number: string): string {
  // Collapse internal whitespace in prefix to a single space (handles "C  S" → "C S").
  return `${prefix.replace(/\s+/g, " ").trim()} ${number}`.toUpperCase();
}
