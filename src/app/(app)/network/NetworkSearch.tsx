"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Input, Select } from "@/components/ui/Input";

type School = { id: string; name: string };

export function NetworkSearch({
  initialQuery, initialSchoolId, schools,
}: { initialQuery: string; initialSchoolId: string; schools: School[] }) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [schoolId, setSchoolId] = useState(initialSchoolId);

  function go() {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (schoolId) p.set("schoolId", schoolId);
    router.push(`/network?${p.toString()}`);
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); go(); }} className="flex gap-2">
      <Input placeholder="Search by name, interest, or bio" value={q} onChange={(e) => setQ(e.target.value)} className="flex-1" />
      <Select value={schoolId} onChange={(e) => setSchoolId(e.target.value)} className="max-w-xs">
        <option value="">All schools</option>
        {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </Select>
    </form>
  );
}
