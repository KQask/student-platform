"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

type Course = { id: string; code: string; title: string; units: number };

type PlanCourseRow = {
  id: string;
  status: "PLANNED" | "ENROLLED" | "COMPLETED" | "DROPPED";
  grade: string | null;
  professor: { id: string; name: string } | null;
  course: Course;
};

type Term = {
  id: string;
  term: string;
  order: number;
  courses: PlanCourseRow[];
};

type Plan = {
  id: string;
  name: string;
  terms: Term[];
};

const STATUS_TONES = {
  PLANNED: "default",
  ENROLLED: "info",
  COMPLETED: "success",
  DROPPED: "warning",
} as const;

const VALID_GRADES = [
  "A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-",
  "F", "P", "NP", "CR", "NC", "I", "W",
];

export function PlannerBoard({ plan, courses }: { plan: Plan; courses: Course[] }) {
  const [newTerm, setNewTerm] = useState("");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function addTerm() {
    if (!newTerm.trim()) return;
    await fetch("/api/planner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ term: newTerm.trim(), order: plan.terms.length }),
    });
    setNewTerm("");
    startTransition(() => router.refresh());
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2">
        <div className="flex-1 max-w-xs">
          <label className="block text-xs text-gray-600 mb-1">Add a term</label>
          <Input
            placeholder="e.g. Fall 2026"
            value={newTerm}
            onChange={(e) => setNewTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTerm()}
          />
        </div>
        <Button onClick={addTerm} disabled={pending}>Add term</Button>
      </div>

      {plan.terms.length === 0 ? (
        <Card>
          <CardBody className="text-sm text-gray-600">No terms yet — add one above.</CardBody>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {plan.terms.map((term) => (
            <TermCard key={term.id} term={term} courses={courses} />
          ))}
        </div>
      )}
    </div>
  );
}

function TermCard({ term, courses }: { term: Term; courses: Course[] }) {
  const router = useRouter();
  const [selectedCourse, setSelectedCourse] = useState("");
  const totalUnits = term.courses.reduce((sum, c) => sum + (c.course.units ?? 0), 0);

  async function addCourse() {
    if (!selectedCourse) return;
    await fetch("/api/planner/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planTermId: term.id, courseId: selectedCourse }),
    });
    setSelectedCourse("");
    router.refresh();
  }

  async function removeCourse(planCourseId: string) {
    await fetch("/api/planner/courses", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planCourseId }),
    });
    router.refresh();
  }

  async function deleteTerm() {
    const ok = window.confirm(
      `Delete "${term.term}" and remove ${term.courses.length} course${term.courses.length === 1 ? "" : "s"}?`,
    );
    if (!ok) return;
    await fetch("/api/planner/terms", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planTermId: term.id }),
    });
    router.refresh();
  }

  // Codes already in this term — used to filter the add-course dropdown so the user
  // doesn't try to add a duplicate.
  const codesInTerm = new Set(term.courses.map((c) => c.course.id));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle>{term.term}</CardTitle>
            <div className="text-xs text-gray-500 mt-0.5">{totalUnits.toFixed(1)} units</div>
          </div>
          <button
            onClick={deleteTerm}
            title="Delete term"
            className="text-gray-400 hover:text-red-600 p-1 rounded"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </CardHeader>
      <CardBody className="space-y-3">
        {term.courses.length === 0 ? (
          <p className="text-sm text-gray-500">No courses added.</p>
        ) : (
          <ul className="space-y-2">
            {term.courses.map((row) => (
              <CourseRow key={row.id} row={row} onRemove={removeCourse} />
            ))}
          </ul>
        )}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
          <Select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="h-9 text-sm flex-1"
          >
            <option value="">Add course…</option>
            {courses
              .filter((c) => !codesInTerm.has(c.id))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.title}
                </option>
              ))}
          </Select>
          <Button size="sm" onClick={addCourse} disabled={!selectedCourse}>Add</Button>
        </div>
      </CardBody>
    </Card>
  );
}

function CourseRow({
  row,
  onRemove,
}: {
  row: PlanCourseRow;
  onRemove: (planCourseId: string) => void;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(row.status);
  const [grade, setGrade] = useState(row.grade ?? "");
  const [professor, setProfessor] = useState(row.professor?.name ?? "");

  // Persist any change immediately. Each input commits onBlur (text fields) or
  // onChange (selects) so the user sees the GPA / requirements update right away.
  async function patch(payload: Record<string, unknown>) {
    await fetch("/api/planner/courses", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planCourseId: row.id, ...payload }),
    });
    router.refresh();
  }

  function handleStatus(next: typeof row.status) {
    setStatus(next);
    // Clear grade automatically when leaving COMPLETED so a stale grade doesn't
    // keep contributing to the GPA.
    if (next !== "COMPLETED" && grade) {
      setGrade("");
      patch({ status: next, grade: null });
    } else {
      patch({ status: next });
    }
  }

  function handleGradeCommit() {
    const trimmed = grade.trim().toUpperCase();
    if (trimmed === (row.grade ?? "")) return;
    if (trimmed !== "" && !VALID_GRADES.includes(trimmed)) {
      // Reject silently; UI keeps the displayed value but doesn't persist.
      setGrade(row.grade ?? "");
      return;
    }
    patch({ grade: trimmed === "" ? null : trimmed });
  }

  function handleProfessorCommit() {
    const trimmed = professor.trim();
    if (trimmed === (row.professor?.name ?? "")) return;
    patch({ professorName: trimmed === "" ? null : trimmed });
  }

  return (
    <li className="border border-gray-100 rounded-md p-2 space-y-2">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-mono text-sm font-semibold text-gray-900 truncate">
            {row.course.code}
            <span className="ml-2 font-sans font-normal text-xs text-gray-500">
              {row.course.units}u
            </span>
          </div>
          <div className="text-xs text-gray-600 truncate">{row.course.title}</div>
        </div>
        <Badge tone={STATUS_TONES[status]}>{status.toLowerCase()}</Badge>
        <button
          onClick={() => onRemove(row.id)}
          className="text-gray-400 hover:text-red-600 text-sm px-1"
          title="Remove course"
        >
          ×
        </button>
      </div>
      <div className="grid grid-cols-12 gap-2 items-center text-xs">
        <Select
          value={status}
          onChange={(e) => handleStatus(e.target.value as typeof row.status)}
          className="col-span-4 h-8 text-xs"
        >
          <option value="PLANNED">Planned</option>
          <option value="ENROLLED">Enrolled</option>
          <option value="COMPLETED">Completed</option>
          <option value="DROPPED">Dropped</option>
        </Select>
        <input
          type="text"
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          onBlur={handleGradeCommit}
          onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
          placeholder="Grade"
          disabled={status !== "COMPLETED"}
          className="col-span-3 h-8 px-2 text-xs rounded border border-gray-300 disabled:bg-gray-50 disabled:text-gray-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none"
        />
        <input
          type="text"
          value={professor}
          onChange={(e) => setProfessor(e.target.value)}
          onBlur={handleProfessorCommit}
          onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
          placeholder="Instructor (optional)"
          className="col-span-5 h-8 px-2 text-xs rounded border border-gray-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none"
        />
      </div>
    </li>
  );
}
