"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

type Major = { id: string; name: string };
type School = { id: string; name: string; code: string; type: string; majors: Major[] };
type Profile = {
  id: string;
  schoolId: string | null;
  majorId: string | null;
  careerGoal: string | null;
  bio: string | null;
  interests: string[];
  skills: string[];
  extracurriculars: string[];
  transferGoals: { id: string; schoolId: string; majorId: string | null }[];
};

export function ProfileEditor({ profile, schools }: { profile: Profile; schools: School[] }) {
  const router = useRouter();
  const [schoolId, setSchoolId] = useState(profile.schoolId ?? "");
  const [majorId, setMajorId] = useState(profile.majorId ?? "");
  const [careerGoal, setCareerGoal] = useState(profile.careerGoal ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [interests, setInterests] = useState(profile.interests.join(", "));
  const [skills, setSkills] = useState(profile.skills.join(", "));
  const [extracurriculars, setExtracurriculars] = useState(profile.extracurriculars.join(", "));
  const [transferGoals, setTransferGoals] = useState(profile.transferGoals);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const currentSchool = schools.find((s) => s.id === schoolId);
  const majorOptions = currentSchool?.majors ?? [];

  async function save() {
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        schoolId: schoolId || null,
        majorId: majorId || null,
        careerGoal: careerGoal || null,
        bio: bio || null,
        interests: csv(interests),
        skills: csv(skills),
        extracurriculars: csv(extracurriculars),
        transferGoals: transferGoals.map((g, i) => ({
          schoolId: g.schoolId,
          majorId: g.majorId,
          priority: i,
        })),
      }),
    });
    setSaving(false);
    if (res.ok) {
      setMsg("Saved");
      router.refresh();
    } else {
      setMsg("Failed to save");
    }
  }

  function addGoal() {
    if (!schools[0]) return;
    setTransferGoals((g) => [...g, { id: `new-${g.length}`, schoolId: schools.filter(s => s.type === "UC")[0]?.id ?? schools[0].id, majorId: null }]);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Academic information</CardTitle></CardHeader>
        <CardBody className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Current school</label>
              <Select value={schoolId} onChange={(e) => { setSchoolId(e.target.value); setMajorId(""); }}>
                <option value="">—</option>
                {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Current major</label>
              <Select value={majorId} onChange={(e) => setMajorId(e.target.value)} disabled={!schoolId}>
                <option value="">—</option>
                {majorOptions.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </Select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Career goal</label>
            <Input value={careerGoal} onChange={(e) => setCareerGoal(e.target.value)} placeholder="e.g. Software engineer" />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Bio</label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A few sentences about yourself…" />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Transfer goals</CardTitle>
            <Button size="sm" variant="secondary" onClick={addGoal}>Add</Button>
          </div>
        </CardHeader>
        <CardBody className="space-y-3">
          {transferGoals.length === 0 ? (
            <p className="text-sm text-gray-600">Add a target school to unlock requirement tracking.</p>
          ) : (
            transferGoals.map((g, i) => {
              const sch = schools.find((s) => s.id === g.schoolId);
              const majors = sch?.majors ?? [];
              return (
                <div key={g.id} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <Select
                      value={g.schoolId}
                      onChange={(e) => setTransferGoals((arr) => arr.map((x, idx) => idx === i ? { ...x, schoolId: e.target.value, majorId: null } : x))}
                    >
                      {schools.filter(s => s.type !== "CC").map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </Select>
                  </div>
                  <div className="col-span-6">
                    <Select
                      value={g.majorId ?? ""}
                      onChange={(e) => setTransferGoals((arr) => arr.map((x, idx) => idx === i ? { ...x, majorId: e.target.value || null } : x))}
                    >
                      <option value="">— any major —</option>
                      {majors.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </Select>
                  </div>
                  <button
                    className="col-span-1 text-gray-400 hover:text-red-600"
                    onClick={() => setTransferGoals((arr) => arr.filter((_, idx) => idx !== i))}
                  >×</button>
                </div>
              );
            })
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>About you</CardTitle></CardHeader>
        <CardBody className="space-y-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Interests (comma-separated)</label>
            <Input value={interests} onChange={(e) => setInterests(e.target.value)} placeholder="ML, robotics, climate" />
            <div className="mt-1 flex flex-wrap gap-1">{csv(interests).map((t) => <Badge key={t}>{t}</Badge>)}</div>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Skills</label>
            <Input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="Python, React" />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Extracurriculars</label>
            <Input value={extracurriculars} onChange={(e) => setExtracurriculars(e.target.value)} placeholder="CS club, hackathons" />
          </div>
        </CardBody>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save profile"}</Button>
        {msg && <span className="text-sm text-gray-600">{msg}</span>}
      </div>
    </div>
  );
}

function csv(s: string): string[] {
  return s.split(",").map((x) => x.trim()).filter(Boolean);
}
