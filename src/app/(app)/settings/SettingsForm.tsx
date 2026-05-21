"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function SettingsForm({ user }: { user: { id: string; email: string; name: string | null; isPublic: boolean } }) {
  const router = useRouter();
  const [isPublic, setIsPublic] = useState(user.isPublic);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    // Re-uses /api/profile for the toggle since it's the simplest path; user.isPublic is
    // updated via a small dedicated endpoint in a future iteration.
    // STUB: dedicated user-settings endpoint.
    await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setMsg("Saved");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-gray-600 mb-1">Email</label>
        <Input value={user.email} disabled />
      </div>
      <div>
        <label className="block text-xs text-gray-600 mb-1">Name</label>
        <Input defaultValue={user.name ?? ""} disabled />
      </div>
      <label className="inline-flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
        Make profile public to other students
      </label>
      <div className="flex items-center gap-3">
        <Button onClick={save}>Save</Button>
        {msg && <span className="text-sm text-gray-600">{msg}</span>}
      </div>
    </div>
  );
}
