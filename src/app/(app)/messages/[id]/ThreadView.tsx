"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Msg = { id: string; body: string; authorId: string; createdAt: string | Date; author: { name: string | null } };

export function ThreadView({
  threadId, otherName, currentUserId, initialMessages,
}: { threadId: string; otherName: string; currentUserId: string; initialMessages: Msg[] }) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // STUB: replace with realtime websocket subscription.
  useEffect(() => {
    const t = setInterval(refresh, 8000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function refresh() {
    const res = await fetch(`/api/messages/threads/${threadId}`);
    const data = await res.json();
    if (data?.messages) setMessages(data.messages);
  }

  async function send() {
    if (!body.trim()) return;
    setSending(true);
    const res = await fetch(`/api/messages/threads/${threadId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: body.trim() }),
    });
    const msg = await res.json();
    setMessages((m) => [...m, msg]);
    setBody("");
    setSending(false);
  }

  return (
    <Card>
      <CardHeader><CardTitle>{otherName}</CardTitle></CardHeader>
      <CardBody className="space-y-3">
        <div className="h-96 overflow-y-auto space-y-2 pr-1">
          {messages.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-12">Say hello.</p>
          ) : (
            messages.map((m) => {
              const own = m.authorId === currentUserId;
              return (
                <div key={m.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${own ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-900"}`}>
                    {m.body}
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
        <div className="flex items-center gap-2 border-t border-gray-100 pt-3">
          <Input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Type a message…"
          />
          <Button onClick={send} disabled={sending || !body.trim()}>Send</Button>
        </div>
      </CardBody>
    </Card>
  );
}
