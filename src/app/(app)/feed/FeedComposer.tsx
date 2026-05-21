"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";

export function FeedComposer() {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [posting, setPosting] = useState(false);

  async function submit() {
    if (!body.trim()) return;
    setPosting(true);
    await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body: body.trim(),
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      }),
    });
    setPosting(false);
    setBody("");
    setTags("");
    router.refresh();
  }

  return (
    <Card>
      <CardBody className="space-y-2">
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Share an update, ask a question, recommend a class…" />
        <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Tags (comma-separated, e.g. transfer, CS, UCB)" />
        <div className="flex justify-end">
          <Button onClick={submit} disabled={posting || !body.trim()}>{posting ? "Posting…" : "Post"}</Button>
        </div>
      </CardBody>
    </Card>
  );
}
