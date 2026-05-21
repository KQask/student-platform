"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/Input";

export function CoursesSearch({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    router.push(`/courses?${params.toString()}`);
  }

  return (
    <form onSubmit={onSubmit} className="max-w-md">
      <Input
        placeholder="Search by code or title (e.g. C S 2A, calculus)"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
    </form>
  );
}
