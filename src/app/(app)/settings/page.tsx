import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { SettingsForm } from "./SettingsForm";

export default async function SettingsPage() {
  const session = await auth();
  const user = await prisma.user.findUnique({
    where: { id: (session!.user as { id: string }).id },
    select: { id: true, email: true, name: true, isPublic: true },
  });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
      </div>
      <Card>
        <CardHeader><CardTitle>Account</CardTitle></CardHeader>
        <CardBody>
          <SettingsForm user={user!} />
        </CardBody>
      </Card>
      <Card>
        <CardHeader><CardTitle>Notifications</CardTitle></CardHeader>
        <CardBody>
          {/* STUB: notification preferences will land alongside the notification system. */}
          <p className="text-sm text-gray-600">Notification preferences coming soon.</p>
        </CardBody>
      </Card>
    </div>
  );
}
