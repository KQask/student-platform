import { prisma } from "@/lib/db";
import type { Profile } from "@prisma/client";

export type ProfileUpsertInput = {
  userId: string;
  schoolId?: string | null;
  majorId?: string | null;
  careerGoal?: string | null;
  bio?: string | null;
  interests?: string[];
  skills?: string[];
  extracurriculars?: string[];
  transferGoals?: { schoolId: string; majorId?: string | null; priority?: number }[];
};

export async function getProfileByUserId(userId: string) {
  return prisma.profile.findUnique({
    where: { userId },
    include: {
      school: true,
      major: true,
      transferGoals: { include: { school: true, major: true } },
      user: true,
    },
  });
}

export async function upsertProfile(input: ProfileUpsertInput): Promise<Profile> {
  const { userId, transferGoals, ...rest } = input;
  const profile = await prisma.profile.upsert({
    where: { userId },
    create: { userId, ...rest },
    update: { ...rest },
  });

  if (transferGoals) {
    await prisma.transferGoal.deleteMany({ where: { profileId: profile.id } });
    if (transferGoals.length > 0) {
      await prisma.transferGoal.createMany({
        data: transferGoals.map((g, i) => ({
          profileId: profile.id,
          schoolId: g.schoolId,
          majorId: g.majorId ?? null,
          priority: g.priority ?? i,
        })),
      });
    }
  }

  return profile;
}

export async function searchProfiles(query: {
  q?: string;
  schoolId?: string;
  majorId?: string;
  limit?: number;
}) {
  const where: any = { user: { isPublic: true } };
  if (query.schoolId) where.schoolId = query.schoolId;
  if (query.majorId) where.majorId = query.majorId;
  if (query.q) {
    where.OR = [
      { user: { name: { contains: query.q, mode: "insensitive" } } },
      { bio: { contains: query.q, mode: "insensitive" } },
      { interests: { hasSome: [query.q] } },
    ];
  }
  return prisma.profile.findMany({
    where,
    include: { user: true, school: true, major: true },
    take: query.limit ?? 30,
    orderBy: { updatedAt: "desc" },
  });
}
