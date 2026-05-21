import { ok, requireUserId } from "@/lib/api";
import { searchProfiles } from "@/services/profileService";

export async function GET(req: Request) {
  const uid = await requireUserId();
  if (uid instanceof Response) return uid;
  const url = new URL(req.url);
  return ok(
    await searchProfiles({
      q: url.searchParams.get("q") ?? undefined,
      schoolId: url.searchParams.get("schoolId") ?? undefined,
      majorId: url.searchParams.get("majorId") ?? undefined,
    }),
  );
}
