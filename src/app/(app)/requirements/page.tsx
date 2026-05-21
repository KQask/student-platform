import { auth } from "@/lib/auth";
import { evaluateForUser } from "@/services/requirementsService";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { formatPercent } from "@/lib/utils";

export default async function RequirementsPage() {
  const session = await auth();
  const uid = (session!.user as { id: string }).id;
  const sets = await evaluateForUser(uid);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Requirements</h1>
        <p className="text-sm text-gray-600">
          Driven by ASSIST.org agreements. Series requirements (like the Calculus 1A→1B→1C
          sequence) must be completed in full to count.
        </p>
      </div>

      {sets.length === 0 && (
        <Card>
          <CardBody className="text-sm text-gray-600">
            No requirement sets to show yet. Add a transfer goal on your{" "}
            <a className="text-brand-600 hover:underline" href="/profile">profile</a> to get started.
          </CardBody>
        </Card>
      )}

      {sets.map((s) => (
        <Card key={s.setId}>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>{s.setName}</CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">
                  {s.receivingSchool.name}{s.major ? ` · ${s.major.name}` : ""} · {s.type}
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-gray-900">
                  {s.groupsSatisfied} / {s.groupsTotal} groups
                </div>
                <div className="text-xs text-gray-500">{formatPercent(s.percentComplete)} complete</div>
              </div>
            </div>
            <div className="mt-3">
              <ProgressBar value={s.percentComplete} tone={s.percentComplete > 0.66 ? "success" : "brand"} />
            </div>
          </CardHeader>
          <CardBody className="space-y-3">
            {s.groups.map((g) => (
              <div key={g.groupId} className="border border-gray-100 rounded-md p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{g.name}</div>
                    {g.description && <div className="text-xs text-gray-500 mt-0.5">{g.description}</div>}
                  </div>
                  <Badge tone={g.status === "SATISFIED" ? "success" : g.status === "PARTIAL" ? "warning" : "default"}>
                    {g.status === "SATISFIED" ? "Satisfied" : g.status === "PARTIAL" ? "Partial" : "Not started"}
                  </Badge>
                </div>
                <div className="mt-2 text-xs text-gray-600">
                  Complete{g.minCourses > 1 ? ` ${g.minCourses}` : ""} of:
                </div>
                <ul className="mt-1 flex flex-wrap gap-1.5">
                  {g.options.map((o) => {
                    const isTaken = g.taken.some((t) => t.courseId === o.courseId);
                    return (
                      <li key={o.courseId}>
                        <span
                          className={
                            "font-mono text-xs px-2 py-0.5 rounded " +
                            (isTaken ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-700")
                          }
                          title={o.title}
                        >
                          {isTaken ? "✓ " : ""}{o.code}
                          {o.seriesKey && <span className="text-[10px] text-gray-500 ml-1">(series)</span>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
