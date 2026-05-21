import { z } from "zod";
import { badRequest, ok, requireUserId } from "@/lib/api";
import { getProfileByUserId, upsertProfile } from "@/services/profileService";

const updateSchema = z.object({
  schoolId: z.string().nullable().optional(),
  majorId: z.string().nullable().optional(),
  careerGoal: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  interests: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  extracurriculars: z.array(z.string()).optional(),
  transferGoals: z
    .array(
      z.object({
        schoolId: z.string(),
        majorId: z.string().nullable().optional(),
        priority: z.number().int().optional(),
      }),
    )
    .optional(),
});

export async function GET() {
  const uid = await requireUserId();
  if (uid instanceof Response) return uid;
  return ok(await getProfileByUserId(uid));
}

export async function PUT(req: Request) {
  const uid = await requireUserId();
  if (uid instanceof Response) return uid;
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return badRequest("Invalid input");
  await upsertProfile({ userId: uid, ...parsed.data });
  return ok(await getProfileByUserId(uid));
}
