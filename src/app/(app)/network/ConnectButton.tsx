"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function ConnectButton({ userId, alreadyConnected }: { userId: string; alreadyConnected: boolean }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "already">(
    alreadyConnected ? "already" : "idle",
  );

  async function send() {
    setState("sending");
    const res = await fetch("/api/connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addresseeId: userId }),
    });
    setState(res.ok ? "sent" : "idle");
  }

  if (state === "already" || state === "sent") {
    return <Button size="sm" variant="secondary" disabled>{state === "sent" ? "Request sent" : "Connected"}</Button>;
  }
  return <Button size="sm" onClick={send} disabled={state === "sending"}>
    {state === "sending" ? "Sending…" : "Connect"}
  </Button>;
}
