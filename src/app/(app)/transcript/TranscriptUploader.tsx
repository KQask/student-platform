"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

type ParsedEntry = {
  term: string;
  rawTerm?: string;
  courseCode: string;
  title?: string;
  units?: number;
  grade?: string;
  status: "COMPLETED" | "DROPPED";
  lineIndex?: number;
};

type ParseResp = { entries: ParsedEntry[]; warnings: string[]; rawTextLength: number };
type ImportResp = {
  importedCount: number;
  skippedExisting: number;
  unmatched: { courseCode: string; term: string; reason: string }[];
};

export function TranscriptUploader() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResp | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResp | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function parseText() {
    setError(null);
    if (!text.trim()) return setError("Paste transcript text or upload a file first.");
    setParsing(true);
    const res = await fetch("/api/transcript/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    setParsing(false);
    const data = await res.json();
    if (!res.ok) return setError(data.error ?? "Could not parse transcript");
    setParseResult(data);
    setSelected(new Set(data.entries.map((_: unknown, i: number) => i)));
  }

  async function parseFile(file: File) {
    setError(null);
    setParsing(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/transcript/parse", { method: "POST", body: form });
    setParsing(false);
    const data = await res.json();
    if (!res.ok) return setError(data.error ?? "Could not parse transcript");
    setParseResult(data);
    setSelected(new Set(data.entries.map((_: unknown, i: number) => i)));
  }

  async function importSelected() {
    if (!parseResult) return;
    const entries = parseResult.entries.filter((_, i) => selected.has(i));
    if (entries.length === 0) return setError("Select at least one entry to import.");
    setImporting(true);
    const res = await fetch("/api/transcript/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries }),
    });
    setImporting(false);
    const data = await res.json();
    if (!res.ok) return setError(data.error ?? "Import failed");
    setImportResult(data);
    router.refresh();
  }

  function toggle(i: number) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  }

  // Group entries by term for the preview table.
  const byTerm = new Map<string, { entry: ParsedEntry; index: number }[]>();
  if (parseResult) {
    parseResult.entries.forEach((e, i) => {
      const arr = byTerm.get(e.term) ?? [];
      arr.push({ entry: e, index: i });
      byTerm.set(e.term, arr);
    });
  }

  if (importResult) {
    return (
      <Card>
        <CardHeader><CardTitle>Import complete</CardTitle></CardHeader>
        <CardBody className="space-y-3 text-sm">
          <p className="text-gray-800">
            <span className="font-semibold">{importResult.importedCount}</span> course
            {importResult.importedCount === 1 ? "" : "s"} added to your plan
            {importResult.skippedExisting > 0
              ? `, ${importResult.skippedExisting} updated (already existed)`
              : ""}.
          </p>
          {importResult.unmatched.length > 0 && (
            <div>
              <div className="text-amber-700 font-medium mb-1">
                Couldn't match {importResult.unmatched.length} course
                {importResult.unmatched.length === 1 ? "" : "s"} to the catalog:
              </div>
              <ul className="list-disc pl-5 text-gray-700">
                {importResult.unmatched.map((u, i) => (
                  <li key={i}>
                    <span className="font-mono">{u.courseCode}</span> ({u.term}) — {u.reason}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-gray-500 mt-2">
                These usually mean the course is from a different college (we currently
                only seed Foothill courses) or the parser misread the code.
              </p>
            </div>
          )}
          <div className="pt-2 flex gap-2">
            <a href="/planner" className="text-brand-600 hover:underline text-sm">View your planner →</a>
            <button
              onClick={() => { setImportResult(null); setParseResult(null); setText(""); }}
              className="text-sm text-gray-600 hover:underline"
            >
              Import another
            </button>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {!parseResult && (
        <Card>
          <CardHeader><CardTitle>1. Provide your transcript</CardTitle></CardHeader>
          <CardBody className="space-y-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Upload PDF or text file</label>
              <input
                type="file"
                accept=".pdf,.txt,application/pdf,text/plain"
                onChange={(e) => e.target.files?.[0] && parseFile(e.target.files[0])}
                className="block text-sm"
              />
            </div>
            <div className="text-xs text-gray-500 text-center">— or —</div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Paste transcript text</label>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={`Fall 2024\nC S 2A   Object-Oriented Programming   4.50  A\nMATH 1A  Calculus                       5.00  A-\n\nWinter 2025\n...`}
                className="font-mono text-xs min-h-[200px]"
              />
            </div>
            <div className="flex items-center justify-between">
              {error && <span className="text-sm text-red-600">{error}</span>}
              <Button onClick={parseText} disabled={parsing || !text.trim()}>
                {parsing ? "Parsing…" : "Parse text"}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {parseResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>2. Review parsed courses</CardTitle>
              <div className="text-sm text-gray-600">
                {selected.size} of {parseResult.entries.length} selected
              </div>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            {parseResult.warnings.length > 0 && (
              <div className="rounded bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                {parseResult.warnings.map((w, i) => <div key={i}>{w}</div>)}
              </div>
            )}

            {[...byTerm.entries()].length === 0 ? (
              <p className="text-sm text-gray-600">No courses were extracted. Try editing the text and re-parsing.</p>
            ) : (
              [...byTerm.entries()].map(([term, rows]) => (
                <div key={term} className="space-y-1">
                  <div className="text-sm font-semibold text-gray-900">{term}</div>
                  <ul className="divide-y divide-gray-100 border border-gray-100 rounded-md">
                    {rows.map(({ entry, index }) => (
                      <li key={index} className="flex items-center gap-3 px-3 py-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selected.has(index)}
                          onChange={() => toggle(index)}
                        />
                        <span className="font-mono font-semibold w-24">{entry.courseCode}</span>
                        <span className="flex-1 truncate text-gray-700">{entry.title ?? "—"}</span>
                        {entry.units !== undefined && <span className="text-xs text-gray-500">{entry.units} u</span>}
                        {entry.grade && <Badge tone={gradeTone(entry.grade)}>{entry.grade}</Badge>}
                        <Badge tone={entry.status === "DROPPED" ? "warning" : "default"}>
                          {entry.status.toLowerCase()}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}

            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <button
                onClick={() => { setParseResult(null); setText(""); }}
                className="text-sm text-gray-600 hover:underline"
              >
                ← Start over
              </button>
              <div className="flex items-center gap-3">
                {error && <span className="text-sm text-red-600">{error}</span>}
                <Button onClick={importSelected} disabled={importing || selected.size === 0}>
                  {importing ? "Importing…" : `Import ${selected.size} into planner`}
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function gradeTone(grade: string): "success" | "info" | "warning" | "danger" | "default" {
  const upper = grade.toUpperCase();
  if (upper === "A" || upper === "A+" || upper === "A-") return "success";
  if (upper.startsWith("B")) return "info";
  if (upper.startsWith("C") || upper === "P" || upper === "CR") return "default";
  if (upper.startsWith("D") || upper === "NP" || upper === "NC") return "warning";
  if (upper === "F") return "danger";
  if (upper === "W" || upper === "I" || upper === "IP") return "warning";
  return "default";
}
