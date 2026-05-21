import { badRequest, ok, requireUserId } from "@/lib/api";
import { addCourseToTerm, removeCourseFromTerm, updatePlanCourse } from "@/services/plannerService";
import { z } from "zod";
import { PlanCourseStatus } from "@prisma/client";

const addSchema = z.object({
  planTermId: z.string(),
  courseId: z.string(),
  status: z.nativeEnum(PlanCourseStatus).optional(),
  grade: z.string().nullable().optional(),
  professorName: z.string().nullable().optional(),
});

const patchSchema = z.object({
  planCourseId: z.string(),
  status: z.nativeEnum(PlanCourseStatus).optional(),
  grade: z.string().nullable().optional(),
  professorName: z.string().nullable().optional(),
});

const deleteSchema = z.object({ planCourseId: z.string() });

export async function POST(req: Request) {
  const uid = await requireUserId();
  if (uid instanceof Response) return uid;
  const parsed = addSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid input");
  return ok(await addCourseToTerm({ userId: uid, ...parsed.data }));
}

export async function PATCH(req: Request) {
  const uid = await requireUserId();
  if (uid instanceof Response) return uid;
  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid input");
  try {
    return ok(await updatePlanCourse({ userId: uid, ...parsed.data }));
  } catch (err) {
    return badRequest((err as Error).message);
  }
}

export async function DELETE(req: Request) {
  const uid = await requireUserId();
  if (uid instanceof Response) return uid;
  const parsed = deleteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest("Invalid input");
  await removeCourseFromTerm(parsed.data.planCourseId);
  return ok({ ok: true });
}
