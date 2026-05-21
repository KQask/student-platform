import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardBody } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import Link from "next/link";

export default async function MessagesPage() {
  const session = await auth();
  const uid = (session!.user as { id: string }).id;
  const threads = await prisma.messageThread.findMany({
    where: { participants: { some: { userId: uid } } },
    include: {
      participants: { include: { user: { select: { id: true, name: true, image: true } } } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Messages</h1>
        <p className="text-sm text-gray-600">1:1 direct messages with classmates and mentors.</p>
        {/* STUB: realtime/push notifications will land later. Threads currently update on refresh. */}
      </div>

      {threads.length === 0 ? (
        <Card><CardBody className="text-sm text-gray-600">No conversations yet. Start one from a profile or the network page.</CardBody></Card>
      ) : (
        <div className="space-y-2">
          {threads.map((t) => {
            const other = t.participants.find((p) => p.userId !== uid)?.user;
            const last = t.messages[0];
            return (
              <Link key={t.id} href={`/messages/${t.id}`}>
                <Card className="hover:bg-gray-50 transition-colors">
                  <CardBody className="flex items-center gap-3">
                    <Avatar name={other?.name} image={other?.image} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900">{other?.name ?? "—"}</div>
                      <div className="text-xs text-gray-600 truncate">{last?.body ?? "No messages yet"}</div>
                    </div>
                    <div className="text-xs text-gray-500 shrink-0">
                      {last ? new Date(last.createdAt).toLocaleDateString() : ""}
                    </div>
                  </CardBody>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
