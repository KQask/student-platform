import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";

export default async function PublicProfile({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: {
        include: {
          school: true,
          major: true,
          transferGoals: { include: { school: true, major: true } },
        },
      },
    },
  });
  if (!user) notFound();

  if (!user.isPublic) {
    return (
      <Card>
        <CardBody className="text-sm text-gray-600">This profile is private.</CardBody>
      </Card>
    );
  }

  const p = user.profile;
  return (
    <div className="space-y-6">
      <Card>
        <CardBody className="flex items-start gap-4">
          <Avatar name={user.name} image={user.image} size={64} />
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-gray-900">{user.name}</h1>
            <p className="text-sm text-gray-600">
              {p?.school?.name}{p?.major ? ` · ${p.major.name}` : ""}
            </p>
            {p?.bio && <p className="mt-3 text-sm text-gray-700">{p.bio}</p>}
          </div>
        </CardBody>
      </Card>

      {p?.transferGoals && p.transferGoals.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Transfer goals</CardTitle></CardHeader>
          <CardBody>
            <ul className="space-y-1 text-sm">
              {p.transferGoals.map((g) => (
                <li key={g.id} className="text-gray-700">
                  {g.school.name}{g.major ? ` · ${g.major.name}` : ""}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      {(p?.interests?.length || p?.skills?.length || p?.extracurriculars?.length) && (
        <Card>
          <CardHeader><CardTitle>About</CardTitle></CardHeader>
          <CardBody className="space-y-3 text-sm">
            {p?.interests?.length ? (
              <div>
                <div className="text-xs text-gray-500 mb-1">Interests</div>
                <div className="flex flex-wrap gap-1">{p.interests.map((t) => <Badge key={t}>{t}</Badge>)}</div>
              </div>
            ) : null}
            {p?.skills?.length ? (
              <div>
                <div className="text-xs text-gray-500 mb-1">Skills</div>
                <div className="flex flex-wrap gap-1">{p.skills.map((t) => <Badge key={t} tone="info">{t}</Badge>)}</div>
              </div>
            ) : null}
            {p?.extracurriculars?.length ? (
              <div>
                <div className="text-xs text-gray-500 mb-1">Extracurriculars</div>
                <div className="flex flex-wrap gap-1">{p.extracurriculars.map((t) => <Badge key={t}>{t}</Badge>)}</div>
              </div>
            ) : null}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
