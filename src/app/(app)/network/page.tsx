import { auth } from "@/lib/auth";
import { searchProfiles } from "@/services/profileService";
import { prisma } from "@/lib/db";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { NetworkSearch } from "./NetworkSearch";
import { ConnectButton } from "./ConnectButton";

export default async function NetworkPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; schoolId?: string }>;
}) {
  const { q, schoolId } = await searchParams;
  const session = await auth();
  const uid = (session!.user as { id: string }).id;

  const [profiles, schools, existingConnections] = await Promise.all([
    searchProfiles({ q, schoolId }),
    prisma.school.findMany({ orderBy: { name: "asc" } }),
    prisma.connection.findMany({ where: { OR: [{ requesterId: uid }, { addresseeId: uid }] } }),
  ]);

  const connectedSet = new Set(
    existingConnections.flatMap((c) => [c.requesterId, c.addresseeId]).filter((id) => id !== uid),
  );

  const visible = profiles.filter((p) => p.userId !== uid);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Network</h1>
        <p className="text-sm text-gray-600">Find classmates, mentors, and students who've walked your path.</p>
      </div>

      <NetworkSearch initialQuery={q ?? ""} initialSchoolId={schoolId ?? ""} schools={schools} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {visible.length === 0 ? (
          <Card><CardBody className="text-sm text-gray-600">No matching students yet.</CardBody></Card>
        ) : (
          visible.map((p) => (
            <Card key={p.id}>
              <CardBody className="flex items-start gap-3">
                <Avatar name={p.user.name} image={p.user.image} size={48} />
                <div className="flex-1 min-w-0">
                  <a href={`/profile/${p.userId}`} className="font-medium text-gray-900 hover:underline">
                    {p.user.name ?? "Unnamed"}
                  </a>
                  <div className="text-xs text-gray-600">
                    {p.school?.name ?? "—"}{p.major ? ` · ${p.major.name}` : ""}
                  </div>
                  {p.bio && <p className="mt-1 text-sm text-gray-700 line-clamp-2">{p.bio}</p>}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {p.interests.slice(0, 4).map((t) => <Badge key={t}>{t}</Badge>)}
                  </div>
                  <div className="mt-3">
                    <ConnectButton userId={p.userId} alreadyConnected={connectedSet.has(p.userId)} />
                  </div>
                </div>
              </CardBody>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
