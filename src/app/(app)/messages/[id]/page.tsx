import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { ThreadView } from "./ThreadView";

export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const uid = (session!.user as { id: string }).id;
  const thread = await prisma.messageThread.findFirst({
    where: { id, participants: { some: { userId: uid } } },
    include: {
      participants: { include: { user: { select: { id: true, name: true, image: true } } } },
      messages: { include: { author: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" }, take: 200 },
    },
  });
  if (!thread) notFound();
  const other = thread.participants.find((p) => p.userId !== uid)?.user;
  return <ThreadView threadId={thread.id} otherName={other?.name ?? "—"} currentUserId={uid} initialMessages={thread.messages} />;
}
