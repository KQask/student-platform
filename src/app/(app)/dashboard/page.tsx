import { auth } from "@/lib/auth";
import { getNextClassSuggestions, getReadiness } from "@/services/recommendationService";
import { computeGpa } from "@/services/gpaService";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/Badge";
import { formatPercent } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await auth();
  const uid = (session?.user as { id: string }).id;
  const [readiness, suggestions, gpa] = await Promise.all([
    getReadiness(uid),
    getNextClassSuggestions(uid),
    computeGpa(uid),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Welcome back, {session?.user?.name?.split(" ")[0] ?? "student"}</h1>
        <p className="text-sm text-gray-600">Here's where you are on your transfer journey.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle>Transfer readiness</CardTitle></CardHeader>
          <CardBody className="space-y-3">
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-bold text-brand-700">{formatPercent(readiness.score)}</span>
              <span className="text-sm text-gray-500">overall</span>
            </div>
            <ProgressBar value={readiness.score} />
            <p className="text-xs text-gray-600">
              Weighted across major-prep and CalGETC progress for your transfer goals.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>GPA</CardTitle></CardHeader>
          <CardBody className="space-y-2">
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-bold text-brand-700">
                {gpa.gpa !== null ? gpa.gpa.toFixed(2) : "—"}
              </span>
              <span className="text-sm text-gray-500">/ 4.00</span>
            </div>
            <p className="text-xs text-gray-600">
              {gpa.gradedCount === 0
                ? "No graded courses yet. Mark a planned course as completed with a grade to see your GPA."
                : `${gpa.gradedCount} graded courses · ${gpa.totalUnits} GPA units`}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>Quick stats</CardTitle></CardHeader>
          <CardBody>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center justify-between">
                <span className="text-gray-600">Requirement sets</span>
                <span className="font-semibold">{readiness.sets.length}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-gray-600">Groups satisfied</span>
                <span className="font-semibold">
                  {readiness.sets.reduce((a, s) => a + s.groupsSatisfied, 0)} /{" "}
                  {readiness.sets.reduce((a, s) => a + s.groupsTotal, 0)}
                </span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-gray-600">Units completed</span>
                <span className="font-semibold">{gpa.completedUnits}</span>
              </li>
            </ul>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Requirement sets</CardTitle></CardHeader>
        <CardBody className="space-y-4">
          {readiness.sets.length === 0 ? (
            <p className="text-sm text-gray-600">
              Add a transfer goal on your <a className="text-brand-600 hover:underline" href="/profile">profile</a>{" "}
              to start tracking requirements.
            </p>
          ) : (
            readiness.sets.map((s) => (
              <div key={s.setId} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">{s.setName}</div>
                    <div className="text-xs text-gray-500">{s.receivingSchool.name}{s.major ? ` · ${s.major.name}` : ""}</div>
                  </div>
                  <div className="text-sm font-semibold text-gray-700">
                    {s.groupsSatisfied} / {s.groupsTotal} groups · {formatPercent(s.percentComplete)}
                  </div>
                </div>
                <ProgressBar value={s.percentComplete} tone={s.percentComplete > 0.66 ? "success" : "brand"} />
              </div>
            ))
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader><CardTitle>Suggested next classes</CardTitle></CardHeader>
        <CardBody>
          {suggestions.length === 0 ? (
            <p className="text-sm text-gray-600">No suggestions yet — set up your transfer goals and plan.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {suggestions.map((s) => (
                <li key={s.courseCode} className="py-3 flex items-start justify-between gap-4">
                  <div>
                    <div className="font-mono text-sm font-semibold text-gray-900">{s.courseCode}</div>
                    <div className="text-sm text-gray-600">{s.reason}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {s.satisfiesGroups.slice(0, 4).map((g, i) => (
                        <Badge key={i} tone="info">{g.setName} · {g.groupName}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 shrink-0">
                    {s.availableSections > 0 ? (
                      <Badge tone="success">{s.availableSections} sections next term</Badge>
                    ) : (
                      <Badge tone="warning">Not offered next term</Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
