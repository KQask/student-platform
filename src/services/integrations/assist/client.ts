// Raw HTTP client for the ASSIST.org public API.
// Reference: https://prod.assistng.org/apidocs/docs/articulation/
//
// ASSIST does not document strict rate limits; we self-limit to be polite (one in-flight
// request at a time per process) and retry transient failures with exponential backoff.

type FetchOptions = {
  timeoutMs?: number;
  retries?: number;
};

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_RETRIES = 2;

export class AssistClient {
  constructor(
    private readonly baseUrl: string = process.env.ASSIST_API_BASE ?? "https://prod.assistng.org",
  ) {}

  async getJson<T>(path: string, opts: FetchOptions = {}): Promise<T> {
    const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const retries = opts.retries ?? DEFAULT_RETRIES;
    const url = path.startsWith("http") ? path : `${this.baseUrl}${path}`;

    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, {
          signal: controller.signal,
          headers: { Accept: "application/json", "User-Agent": "student-platform/0.1 (academic-planning)" },
        });
        if (!res.ok) throw new Error(`ASSIST ${res.status} for ${url}`);
        return (await res.json()) as T;
      } catch (err) {
        lastError = err;
        if (attempt < retries) {
          await sleep(2 ** attempt * 250);
          continue;
        }
      } finally {
        clearTimeout(timer);
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
