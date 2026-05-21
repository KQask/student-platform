// Tiny in-memory TTL cache. Used by integration services on top of their DB-backed cache
// for sub-second hot reads (e.g. a planner page that asks for the same agreement 5 times
// in one render).

type Entry<T> = { value: T; expiresAt: number };

export class MemoryCache<T> {
  private store = new Map<string, Entry<T>>();
  constructor(private readonly defaultTtlMs: number) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlMs?: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs) });
  }

  clear(): void {
    this.store.clear();
  }
}
