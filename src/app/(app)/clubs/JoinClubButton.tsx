"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function JoinClubButton({ clubId, alreadyJoined }: { clubId: string; alreadyJoined: boolean }) {
  const router = useRouter();
  const [joined, setJoined] = useState(alreadyJoined);
  const [loading, setLoading] = useState(false);

  async function join() {
    setLoading(true);
    await fetch("/api/clubs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clubId }),
    });
    setJoined(true);
    setLoading(false);
    router.refresh();
  }

  if (joined) return <Button size="sm" variant="secondary" disabled>Joined</Button>;
  return <Button size="sm" onClick={join} disabled={loading}>{loading ? "Joining…" : "Join"}</Button>;
}
