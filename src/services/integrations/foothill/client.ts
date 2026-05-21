// HTML fetcher for Foothill's public schedule + catalog.
// Reference: https://foothill.edu/schedule/  and  https://catalog.foothill.edu/
//
// There is no documented JSON API; we GET the public HTML and let parser.ts extract
// what we need with cheerio.

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_RETRIES = 2;

export class FoothillClient {
  constructor(
    private readonly scheduleBase = process.env.FOOTHILL_SCHEDULE_BASE ?? "https://foothill.edu/schedule",
    private readonly catalogBase  = process.env.FOOTHILL_CATALOG_BASE  ?? "https://catalog.foothill.edu",
  ) {}

  async fetchScheduleSearch(query: Record<string, string>): Promise<string> {
    const params = new URLSearchParams(query);
    return this.getText(`${this.scheduleBase}/search.html?${params.toString()}`);
  }

  async fetchCatalogIndex(): Promise<string> {
    return this.getText(`${this.catalogBase}/courses-az/`);
  }

  async getText(url: string): Promise<string> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= DEFAULT_RETRIES; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
      try {
        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            "User-Agent": "student-platform/0.1 (academic-planning)",
            Accept: "text/html,application/xhtml+xml",
          },
        });
        if (!res.ok) throw new Error(`Foothill ${res.status} for ${url}`);
        return await res.text();
      } catch (err) {
        lastError = err;
        if (attempt < DEFAULT_RETRIES) {
          await new Promise((r) => setTimeout(r, 2 ** attempt * 300));
          continue;
        }
      } finally {
        clearTimeout(timer);
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }
}
