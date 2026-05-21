// Matching engine: given a student's plan, compute which requirement groups are
// satisfied / partial / unsatisfied for each transfer goal.

import { prisma } from "@/lib/db";
import { getCompletedAndEnrolledCourseIds } from "./plannerService";

export type GroupStatus = "SATISFIED" | "PARTIAL" | "UNSATISFIED";

export type GroupEvaluation = {
  groupId: string;
  name: string;
  description: string | null;
  minCourses: number;
  status: GroupStatus;
  taken: { courseId: string; code: string; title: string }[];
  options: { courseId: string; code: string; title: string; seriesKey: string | null }[];
};

export type SetEvaluation = {
  setId: string;
  setName: string;
  type: string;
  receivingSchool: { id: string; name: string; code: string };
  major: { id: string; name: string } | null;
  percentComplete: number;
  groupsSatisfied: number;
  groupsTotal: number;
  groups: GroupEvaluation[];
};

export async function evaluateForUser(userId: string): Promise<SetEvaluation[]> {
  const takenIds = await getCompletedAndEnrolledCourseIds(userId);

  // Fetch all requirement sets that match the user's transfer goals + CalGETC + Foothill grad.
  const profile = await prisma.profile.findUnique({
    where: { userId },
    include: { transferGoals: true },
  });

  // Always include CalGETC; include major-prep sets for each transfer goal.
  const targetSchoolIds = new Set<string>(profile?.transferGoals.map((g) => g.schoolId) ?? []);
  const sets = await prisma.requirementSet.findMany({
    where: {
      OR: [
        { type: "CALGETC" },
        targetSchoolIds.size > 0 ? { receivingSchoolId: { in: [...targetSchoolIds] } } : { id: "__none__" },
      ],
    },
    include: {
      receivingSchool: true,
      major: true,
      groups: {
        orderBy: { order: "asc" },
        include: { options: { include: { course: true } } },
      },
    },
  });

  return sets.map((set) => evaluateSet(set, takenIds));
}

function evaluateSet(set: any, takenIds: Set<string>): SetEvaluation {
  const groups: GroupEvaluation[] = set.groups.map((g: any) => evaluateGroup(g, takenIds));
  const groupsSatisfied = groups.filter((g) => g.status === "SATISFIED").length;
  const groupsTotal = groups.length;
  return {
    setId: set.id,
    setName: set.name,
    type: set.type,
    receivingSchool: { id: set.receivingSchool.id, name: set.receivingSchool.name, code: set.receivingSchool.code },
    major: set.major ? { id: set.major.id, name: set.major.name } : null,
    percentComplete: groupsTotal === 0 ? 0 : groupsSatisfied / groupsTotal,
    groupsSatisfied,
    groupsTotal,
    groups,
  };
}

function evaluateGroup(group: any, takenIds: Set<string>): GroupEvaluation {
  const taken = group.options
    .filter((o: any) => takenIds.has(o.courseId))
    .map((o: any) => ({ courseId: o.courseId, code: o.course.code, title: o.course.title }));

  let status: GroupStatus = "UNSATISFIED";

  // Series groups: every option sharing the same seriesKey must be taken.
  const seriesKeys = new Set<string>(
    group.options.map((o: any) => o.seriesKey).filter((k: string | null) => k !== null),
  );

  if (seriesKeys.size > 0) {
    const anyFullSeries = [...seriesKeys].some((key) => {
      const seriesOpts = group.options.filter((o: any) => o.seriesKey === key);
      return seriesOpts.every((o: any) => takenIds.has(o.courseId));
    });
    if (anyFullSeries) status = "SATISFIED";
    else if (taken.length > 0) status = "PARTIAL";
  } else {
    if (taken.length >= group.minCourses) status = "SATISFIED";
    else if (taken.length > 0) status = "PARTIAL";
  }

  return {
    groupId: group.id,
    name: group.name,
    description: group.description ?? null,
    minCourses: group.minCourses,
    status,
    taken,
    options: group.options.map((o: any) => ({
      courseId: o.courseId,
      code: o.course.code,
      title: o.course.title,
      seriesKey: o.seriesKey,
    })),
  };
}
