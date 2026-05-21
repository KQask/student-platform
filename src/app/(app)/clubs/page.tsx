import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { JoinClubButton } from "./JoinClubButton";

export default async function ClubsPage() {
  const session = await auth();
  const uid = (session!.user as { id: string }).id;
  const [clubs, memberships] = await Promise.all([
    prisma.club.findMany({
      include: { school: true, _count: { select: { memberships: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.clubMembership.findMany({ where: { userId: uid }, select: { clubId: true } }),
  ]);
  const joined = new Set(memberships.map((m) => m.clubId));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Clubs</h1>
        <p className="text-sm text-gray-600">Find a community on campus.</p>
        {/* STUB: club recommendations based on major/interests will land here. */}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {clubs.length === 0 ? (
          <Card><CardBody className="text-sm text-gray-600">No clubs seeded yet.</CardBody></Card>
        ) : clubs.map((c) => (
          <Card key={c.id}>
            <CardBody className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-medium text-gray-900">{c.name}</div>
                <Badge>{c._count.memberships} members</Badge>
              </div>
              <p className="text-xs text-gray-500">{c.school.name}</p>
              {c.description && <p className="text-sm text-gray-700">{c.description}</p>}
              {c.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {c.tags.map((t) => <Badge key={t} tone="info">{t}</Badge>)}
                </div>
              )}
              <div className="pt-1">
                <JoinClubButton clubId={c.id} alreadyJoined={joined.has(c.id)} />
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
