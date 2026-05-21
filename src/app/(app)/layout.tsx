import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Sidebar } from "@/components/app/Sidebar";
import { SessionProvider } from "next-auth/react";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!session?.user || !uid) redirect("/signin");

  // Stale sessions (DB reset, user deletion) can leave a valid JWT pointing at a
  // userId that no longer exists. Verify before any child page tries to use it,
  // otherwise every authenticated page would FK-violate the moment it touches the DB.
  const exists = await prisma.user.findUnique({ where: { id: uid }, select: { id: true } });
  if (!exists) redirect("/signin?stale=1");

  return (
    <SessionProvider session={session}>
      <div className="min-h-screen flex bg-[var(--background)]">
        <Sidebar userName={session.user.name ?? session.user.email} />
        <main className="flex-1 min-w-0">
          <div className="max-w-6xl mx-auto px-6 py-8">{children}</div>
        </main>
      </div>
    </SessionProvider>
  );
}
