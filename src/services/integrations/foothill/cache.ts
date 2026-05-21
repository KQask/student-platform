// In-process TTL cache for Foothill responses.
// Sections refresh hourly; catalog refreshes ~monthly.

import { MemoryCache } from "@/lib/cache";

export const sectionsCache = new MemoryCache<unknown>(60 * 60_000);   // 1h
export const catalogCache  = new MemoryCache<unknown>(30 * 24 * 60 * 60_000); // 30d
