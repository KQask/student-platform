// Public surface for ASSIST.org integration.
//
// Callers (API routes, seed script, requirementsService) talk only to this module —
// they never see raw API payloads. Adding more sending/receiving institutions is
// a config-only change.
//
// FUTURE: expand parser.ts to fully model AND/OR/series conjunctions and unit floors.
// FUTURE: replace the long-running 7-day cache with a webhook or version-stamp check
// once ASSIST publishes one.

import { AssistClient } from "./client";
import { parseAgreement } from "./parser";
import { readCached, writeCached } from "./cache";
import { MemoryCache } from "@/lib/cache";
import type {
  AcademicYear,
  AgreementSummary,
  Institution,
  NormalizedRequirementSet,
} from "./types";
import seedAgreements from "./seed/agreements.json";
import seedInstitutions from "./seed/institutions.json";

const liveFetch = (process.env.ASSIST_LIVE_FETCH ?? "true") === "true";
const memCache = new MemoryCache<unknown>(60_000);
const client = new AssistClient();

export async function getInstitutions(): Promise<Institution[]> {
  const cached = memCache.get("institutions");
  if (cached) return cached as Institution[];

  if (liveFetch) {
    try {
      const raw = await client.getJson<unknown[]>("/api/institutions");
      const normalized = (Array.isArray(raw) ? raw : []).map(normalizeInstitution).filter(Boolean) as Institution[];
      if (normalized.length > 0) {
        memCache.set("institutions", normalized, 24 * 60 * 60_000);
        return normalized;
      }
    } catch (err) {
      console.warn("[assistService] live institution fetch failed; using seed:", (err as Error).message);
    }
  }
  return seedInstitutions as Institution[];
}

export async function getAcademicYears(): Promise<AcademicYear[]> {
  if (liveFetch) {
    try {
      const raw = await client.getJson<unknown[]>("/api/AcademicYears");
      const years = (Array.isArray(raw) ? raw : [])
        .map((y) => {
          const o = y as Record<string, unknown>;
          const id = typeof o.Id === "number" ? o.Id : typeof o.id === "number" ? o.id : null;
          const label = typeof o.FallYear === "number" ? `${o.FallYear}-${o.FallYear + 1}` :
                        typeof o.label === "string" ? o.label : null;
          return id && label ? { id, label } : null;
        })
        .filter(Boolean) as AcademicYear[];
      if (years.length > 0) return years;
    } catch (err) {
      console.warn("[assistService] live academic years fetch failed; using fallback:", (err as Error).message);
    }
  }
  return [{ id: 75, label: "2025-2026" }, { id: 74, label: "2024-2025" }];
}

export type GetAgreementParams = {
  sendingSchoolId: string;
  receivingSchoolId: string;
  majorId: string | null;
  sendingInstitutionId: number;
  receivingInstitutionId: number;
  academicYearId?: number;
  academicYear: string;
  majorName: string;
};

/**
 * Fetch a single major-prep articulation as a normalized RequirementSet.
 *
 * Order of resolution:
 *   1. In-memory cache (current request scope).
 *   2. DB-backed TransferAgreement cache (rawJson, 7-day TTL — re-parsed each call).
 *   3. Live ASSIST API (if ASSIST_LIVE_FETCH=true).
 *   4. Bundled seed JSON (always available — used in CI and as final fallback).
 */
export async function getMajorArticulation(params: GetAgreementParams): Promise<NormalizedRequirementSet> {
  const memKey = `agreement:${params.sendingSchoolId}:${params.receivingSchoolId}:${params.majorId ?? "-"}:${params.academicYear}`;
  const memHit = memCache.get(memKey);
  if (memHit) return memHit as NormalizedRequirementSet;

  // 2. DB cache
  const cached = await readCached({
    sendingSchoolId: params.sendingSchoolId,
    receivingSchoolId: params.receivingSchoolId,
    majorId: params.majorId,
    academicYear: params.academicYear,
  });
  if (cached) {
    const parsed = parseAgreement({
      raw: cached.raw,
      receivingInstitutionId: params.receivingInstitutionId,
      sendingInstitutionId: params.sendingInstitutionId,
      academicYear: params.academicYear,
      majorName: params.majorName,
      sourceUrl: cached.sourceUrl,
    });
    memCache.set(memKey, parsed);
    return parsed;
  }

  // 3. Live fetch
  if (liveFetch) {
    try {
      const path = `/api/articulation/Agreements?sending=${params.sendingInstitutionId}&receiving=${params.receivingInstitutionId}&academicYear=${params.academicYearId ?? ""}&major=${encodeURIComponent(params.majorName)}`;
      const raw = await client.getJson<unknown>(path);
      const sourceUrl = `https://assist.org/transfer/results?year=${params.academicYearId}&institution=${params.sendingInstitutionId}&agreement=${params.receivingInstitutionId}&type=major`;
      await writeCached(
        {
          sendingSchoolId: params.sendingSchoolId,
          receivingSchoolId: params.receivingSchoolId,
          majorId: params.majorId,
          academicYear: params.academicYear,
        },
        raw,
        sourceUrl,
      );
      const parsed = parseAgreement({
        raw,
        receivingInstitutionId: params.receivingInstitutionId,
        sendingInstitutionId: params.sendingInstitutionId,
        academicYear: params.academicYear,
        majorName: params.majorName,
        sourceUrl,
      });
      memCache.set(memKey, parsed);
      return parsed;
    } catch (err) {
      console.warn("[assistService] live agreement fetch failed; falling back to seed:", (err as Error).message);
    }
  }

  // 4. Seed fallback
  const seed = (seedAgreements as NormalizedRequirementSet[]).find(
    (s) =>
      s.receivingInstitutionId === params.receivingInstitutionId &&
      s.sendingInstitutionId === params.sendingInstitutionId &&
      s.majorName.toLowerCase() === params.majorName.toLowerCase(),
  );
  if (seed) {
    memCache.set(memKey, seed);
    return seed;
  }
  return {
    receivingInstitutionId: params.receivingInstitutionId,
    sendingInstitutionId: params.sendingInstitutionId,
    academicYear: params.academicYear,
    majorName: params.majorName,
    groups: [],
  };
}

/**
 * Bulk listing for a sending/receiving pair. Used by the planner UI when a student adds
 * a new transfer goal — surfaces the available majors so they can pick one.
 */
export async function listAgreementsForPair(params: {
  sendingInstitutionId: number;
  receivingInstitutionId: number;
  academicYearId: number;
}): Promise<AgreementSummary[]> {
  if (liveFetch) {
    try {
      const path = `/api/articulation/Agreements/Published/for/${params.receivingInstitutionId}/to/${params.sendingInstitutionId}/in/${params.academicYearId}?types=Major`;
      const raw = await client.getJson<unknown[]>(path);
      return (Array.isArray(raw) ? raw : []).map((r) => {
        const o = r as Record<string, unknown>;
        return {
          key: String(o.key ?? o.Key ?? ""),
          label: String(o.label ?? o.Label ?? o.name ?? ""),
          majorName: String(o.label ?? o.Label ?? o.name ?? ""),
          sendingInstitutionId: params.sendingInstitutionId,
          receivingInstitutionId: params.receivingInstitutionId,
          academicYearId: params.academicYearId,
        };
      });
    } catch (err) {
      console.warn("[assistService] list agreements failed; returning empty:", (err as Error).message);
    }
  }
  return [];
}

function normalizeInstitution(raw: unknown): Institution | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "number" ? o.id : typeof o.Id === "number" ? o.Id : null;
  const name = typeof o.names === "object" && o.names
    ? ((o.names as Record<string, unknown>).fromName as string | undefined)
    : typeof o.name === "string" ? o.name : null;
  const code = typeof o.code === "string" ? o.code : name?.replace(/\s+/g, "_").toUpperCase() ?? "";
  if (!id || !name) return null;
  const upper = name.toUpperCase();
  let category: Institution["category"] = "OTHER";
  if (upper.includes("UNIVERSITY OF CALIFORNIA")) category = "UC";
  else if (upper.includes("CALIFORNIA STATE")) category = "CSU";
  else if (upper.includes("COLLEGE") || upper.includes("COMMUNITY")) category = "CC";
  return { id, name, code, category };
}
