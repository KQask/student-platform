// DB-backed cache for ASSIST payloads. Stores raw JSON in TransferAgreement so we can
// re-parse (when the parser is upgraded) without re-fetching from the upstream API.
//
// Note: the unique key includes a nullable majorId, which means we can't use Prisma's
// findUnique/upsert helpers (compound unique with nullable columns isn't safely usable
// via the unique-where API). Manual find+create/update is what's left.

import { prisma } from "@/lib/db";

const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

type CacheKey = {
  sendingSchoolId: string;
  receivingSchoolId: string;
  majorId: string | null;
  academicYear: string;
};

export async function readCached(key: CacheKey): Promise<{ raw: unknown; sourceUrl?: string } | null> {
  const row = await prisma.transferAgreement.findFirst({
    where: {
      sendingSchoolId: key.sendingSchoolId,
      receivingSchoolId: key.receivingSchoolId,
      majorId: key.majorId,
      academicYear: key.academicYear,
    },
  });
  if (!row) return null;
  if (Date.now() - row.fetchedAt.getTime() > TTL_MS) return null;
  return { raw: row.rawJson, sourceUrl: row.sourceUrl ?? undefined };
}

export async function writeCached(key: CacheKey, raw: unknown, sourceUrl?: string): Promise<void> {
  const existing = await prisma.transferAgreement.findFirst({
    where: {
      sendingSchoolId: key.sendingSchoolId,
      receivingSchoolId: key.receivingSchoolId,
      majorId: key.majorId,
      academicYear: key.academicYear,
    },
    select: { id: true },
  });
  if (existing) {
    await prisma.transferAgreement.update({
      where: { id: existing.id },
      data: { rawJson: raw as object, sourceUrl, fetchedAt: new Date() },
    });
  } else {
    await prisma.transferAgreement.create({
      data: {
        sendingSchoolId: key.sendingSchoolId,
        receivingSchoolId: key.receivingSchoolId,
        majorId: key.majorId,
        academicYear: key.academicYear,
        rawJson: raw as object,
        sourceUrl,
      },
    });
  }
}
