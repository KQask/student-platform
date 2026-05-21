import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getProfileByUserId } from "@/services/profileService";
import { prisma } from "@/lib/db";
import { ProfileEditor } from "./ProfileEditor";

export default async function MyProfilePage() {
  const session = await auth();
  const uid = (session!.user as { id: string }).id;
  const [profile, schools] = await Promise.all([
    getProfileByUserId(uid),
    prisma.school.findMany({ include: { majors: { orderBy: { name: "asc" } } }, orderBy: { name: "asc" } }),
  ]);
  if (!profile) redirect("/signin");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Your profile</h1>
        <p className="text-sm text-gray-600">This drives your requirements, recommendations, and what classmates see.</p>
      </div>
      <ProfileEditor profile={profile} schools={schools} />
    </div>
  );
}
