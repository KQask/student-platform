// Seed script: schools, majors, Foothill catalog + sections, demo user + plan,
// ASSIST-derived RequirementSets for the three target majors (CS, Bio, Econ),
// plus a sample IGETC set, a few demo classmates, clubs, and a sample post.

import { PrismaClient, SchoolType, Modality } from "@prisma/client";
import bcrypt from "bcryptjs";
import catalogJson from "../src/services/integrations/foothill/seed/catalog.json";
import sectionsJson from "../src/services/integrations/foothill/seed/sections.json";
import agreementsJson from "../src/services/integrations/assist/seed/agreements.json";

const prisma = new PrismaClient();

type SeedCourse = { code: string; title: string; units: number; description?: string; department?: string };
type SeedSection = {
  crn: string; courseCode: string; title: string; units: number; instructor?: string;
  term: string; days?: string; startTime?: string; endTime?: string; location?: string;
  modality: string; capacity?: number; enrolled?: number;
};
type SeedAgreement = {
  receivingInstitutionId: number;
  sendingInstitutionId: number;
  academicYear: string;
  majorName: string;
  sourceUrl?: string;
  groups: {
    name: string;
    description?: string;
    minCourses: number;
    options: { courseCode: string; seriesKey?: string }[];
  }[];
};

const SCHOOLS = [
  { code: "FOOTHILL", name: "Foothill College", type: SchoolType.CC,  assistInstitutionId: 113, isPrimary: true },
  { code: "DEANZA",   name: "De Anza College",  type: SchoolType.CC,  assistInstitutionId: 79 },
  { code: "UCB",      name: "University of California, Berkeley",     type: SchoolType.UC, assistInstitutionId: 5 },
  { code: "UCLA",     name: "University of California, Los Angeles",  type: SchoolType.UC, assistInstitutionId: 11 },
  { code: "UCSD",     name: "University of California, San Diego",    type: SchoolType.UC, assistInstitutionId: 7 },
  { code: "UCD",      name: "University of California, Davis",        type: SchoolType.UC, assistInstitutionId: 9 },
  { code: "UCSB",     name: "University of California, Santa Barbara",type: SchoolType.UC, assistInstitutionId: 12 },
  { code: "SJSU",     name: "San Jose State University",              type: SchoolType.CSU, assistInstitutionId: 39 },
];

const MAJORS_PER_SCHOOL = {
  FOOTHILL: ["Computer Science", "Biology", "Economics", "Undeclared"],
  DEANZA:   ["Computer Science", "Biology", "Economics"],
  UCB:      ["Computer Science", "Biology", "Economics", "Electrical Engineering and Computer Science"],
  UCLA:     ["Computer Science", "Biology", "Economics"],
  UCSD:     ["Computer Science", "Biology", "Economics"],
  UCD:      ["Computer Science", "Biology", "Economics"],
  UCSB:     ["Computer Science", "Biology", "Economics"],
  SJSU:     ["Computer Science", "Biology", "Economics"],
};

async function main() {
  console.log("Seeding…");

  // Wipe in dependency-safe order.
  await prisma.message.deleteMany();
  await prisma.messageThreadParticipant.deleteMany();
  await prisma.messageThread.deleteMany();
  await prisma.reaction.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.post.deleteMany();
  await prisma.review.deleteMany();
  await prisma.clubMembership.deleteMany();
  await prisma.club.deleteMany();
  await prisma.connection.deleteMany();
  await prisma.planCourse.deleteMany();
  await prisma.planTerm.deleteMany();
  await prisma.academicPlan.deleteMany();
  await prisma.requirementOption.deleteMany();
  await prisma.requirementGroup.deleteMany();
  await prisma.requirementSet.deleteMany();
  await prisma.transferAgreement.deleteMany();
  await prisma.section.deleteMany();
  await prisma.professor.deleteMany();
  await prisma.course.deleteMany();
  await prisma.transferGoal.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.major.deleteMany();
  await prisma.school.deleteMany();
  await prisma.user.deleteMany();

  // Schools + majors
  const schools = new Map<string, string>(); // code → id
  for (const s of SCHOOLS) {
    const row = await prisma.school.create({ data: s });
    schools.set(s.code, row.id);
    for (const m of MAJORS_PER_SCHOOL[s.code as keyof typeof MAJORS_PER_SCHOOL] ?? []) {
      await prisma.major.create({ data: { schoolId: row.id, name: m } });
    }
  }
  console.log(`  ✓ ${SCHOOLS.length} schools + majors`);

  // Foothill catalog
  const foothillId = schools.get("FOOTHILL")!;
  const courseIdByCode = new Map<string, string>();
  for (const c of catalogJson as SeedCourse[]) {
    const row = await prisma.course.create({
      data: {
        schoolId: foothillId,
        code: c.code,
        title: c.title,
        units: c.units,
        description: c.description ?? null,
      },
    });
    courseIdByCode.set(c.code, row.id);
  }
  console.log(`  ✓ ${courseIdByCode.size} Foothill courses`);

  // Professors + sections (Foothill)
  const profIdByName = new Map<string, string>();
  for (const s of sectionsJson as SeedSection[]) {
    if (s.instructor && !profIdByName.has(s.instructor)) {
      const p = await prisma.professor.create({
        data: { schoolId: foothillId, name: s.instructor, departments: [] },
      });
      profIdByName.set(s.instructor, p.id);
    }
    const courseId = courseIdByCode.get(s.courseCode);
    if (!courseId) continue;
    await prisma.section.create({
      data: {
        courseId,
        professorId: s.instructor ? profIdByName.get(s.instructor) : null,
        term: s.term,
        crn: s.crn,
        days: s.days ?? null,
        startTime: s.startTime ?? null,
        endTime: s.endTime ?? null,
        location: s.location ?? null,
        modality: (Modality as any)[s.modality] ?? Modality.UNKNOWN,
        capacity: s.capacity ?? null,
        enrolled: s.enrolled ?? null,
      },
    });
  }
  console.log(`  ✓ ${(sectionsJson as SeedSection[]).length} sections`);

  // ASSIST-derived requirement sets — one per (receivingSchool, major).
  for (const agreement of agreementsJson as SeedAgreement[]) {
    const receivingSchoolCode = SCHOOLS.find((s) => s.assistInstitutionId === agreement.receivingInstitutionId)?.code;
    if (!receivingSchoolCode) continue;
    const receivingSchoolId = schools.get(receivingSchoolCode)!;
    const major = await prisma.major.findFirst({
      where: { schoolId: receivingSchoolId, name: agreement.majorName },
    });
    const set = await prisma.requirementSet.create({
      data: {
        name: `${agreement.majorName} Major Prep — ${schoolNameFromCode(receivingSchoolCode)} ${agreement.academicYear}`,
        receivingSchoolId,
        majorId: major?.id ?? null,
        type: "MAJOR_PREP",
        academicYear: agreement.academicYear,
        sourceUrl: agreement.sourceUrl,
      },
    });
    let order = 0;
    for (const g of agreement.groups) {
      const group = await prisma.requirementGroup.create({
        data: {
          requirementSetId: set.id,
          name: g.name,
          description: g.description ?? null,
          minCourses: g.minCourses,
          order: order++,
        },
      });
      for (const o of g.options) {
        const courseId = courseIdByCode.get(o.courseCode);
        if (!courseId) continue; // skip unknown courses (real ASSIST will name more than we seeded)
        await prisma.requirementOption.create({
          data: { requirementGroupId: group.id, courseId, seriesKey: o.seriesKey ?? null },
        });
      }
    }
  }
  console.log(`  ✓ ${(agreementsJson as SeedAgreement[]).length} major-prep requirement sets`);

  // CalGETC set — replaces IGETC for transfers entering Fall 2025+.
  // Differences from old IGETC: Oral Communication (1C) is required (not UC-optional);
  // Ethnic Studies (Area 6) added as a required area; language requirement removed;
  // minimum 34 semester / 51 quarter units total.
  // Reference: https://www.icas-ca.org/calgetc-standards
  const calgetc = await prisma.requirementSet.create({
    data: {
      name: "CalGETC 2025-2026",
      receivingSchoolId: schools.get("UCB")!,  // CalGETC applies broadly across UC/CSU; we anchor to UC for display.
      type: "CALGETC",
      academicYear: "2025-2026",
      sourceUrl: "https://www.icas-ca.org/calgetc-standards",
    },
  });
  const calgetcGroups: { name: string; description?: string; opts: string[] }[] = [
    { name: "Area 1A: English Composition",        description: "1 course, 3 sem / 4 qtr units min.", opts: ["ENGL 1A"] },
    { name: "Area 1B: Critical Thinking & Composition", opts: ["ENGL 1B"] },
    { name: "Area 1C: Oral Communication",         description: "Required under CalGETC (was UC-optional under IGETC).", opts: ["COMM 1A"] },
    { name: "Area 2: Mathematical Concepts & Quantitative Reasoning", opts: ["MATH 1A", "MATH 10", "PSYC 7"] },
    { name: "Area 3A: Arts",                       opts: ["ART 2A"] },
    { name: "Area 3B: Humanities",                 opts: ["PHIL 1"] },
    { name: "Area 4: Social & Behavioral Sciences", description: "2 courses from different disciplines.", opts: ["ECON 1A", "ECON 1B", "PSYC 7"] },
    { name: "Area 5A: Physical Science",           opts: ["PHYS 2A", "PHYS 4A", "CHEM 1A"] },
    { name: "Area 5B: Biological Science",         opts: ["BIOL 1A", "BIOL 1B"] },
    { name: "Area 5C: Laboratory Activity",        description: "Met by lab-bearing courses in 5A or 5B.", opts: ["PHYS 4A", "CHEM 1A", "BIOL 1A"] },
    { name: "Area 6: Ethnic Studies",              description: "New under CalGETC — required.", opts: ["ETHS 1", "ETHS 2"] },
  ];
  let calgetcOrder = 0;
  for (const g of calgetcGroups) {
    const group = await prisma.requirementGroup.create({
      data: {
        requirementSetId: calgetc.id,
        name: g.name,
        description: g.description ?? null,
        minCourses: g.name.startsWith("Area 4") ? 2 : 1,
        order: calgetcOrder++,
      },
    });
    for (const code of g.opts) {
      const cid = courseIdByCode.get(code);
      if (cid) {
        await prisma.requirementOption.create({
          data: { requirementGroupId: group.id, courseId: cid },
        });
      }
    }
  }
  console.log("  ✓ CalGETC requirement set");

  // Demo user
  const passwordHash = await bcrypt.hash("demo1234", 10);
  const csMajor = await prisma.major.findFirst({ where: { schoolId: foothillId, name: "Computer Science" } });
  const demoUser = await prisma.user.create({
    data: {
      email: "demo@student.local",
      name: "Demo Student",
      passwordHash,
      isPublic: true,
      profile: {
        create: {
          schoolId: foothillId,
          majorId: csMajor?.id,
          careerGoal: "Software engineer at a product company",
          bio: "First-year at Foothill aiming to transfer to a UC for CS. Into web, ML, and indie games.",
          interests: ["machine learning", "web", "indie games"],
          skills: ["Python", "JavaScript", "C++"],
          extracurriculars: ["CS Club", "Hackathons"],
          transferGoals: {
            create: [
              { schoolId: schools.get("UCB")!,  majorId: (await prisma.major.findFirst({ where: { schoolId: schools.get("UCB"),  name: "Computer Science" } }))?.id ?? null, priority: 0 },
              { schoolId: schools.get("UCLA")!, majorId: (await prisma.major.findFirst({ where: { schoolId: schools.get("UCLA"), name: "Computer Science" } }))?.id ?? null, priority: 1 },
              { schoolId: schools.get("UCSD")!, majorId: (await prisma.major.findFirst({ where: { schoolId: schools.get("UCSD"), name: "Computer Science" } }))?.id ?? null, priority: 2 },
            ],
          },
        },
      },
    },
  });

  // Demo plan with some courses already taken/in progress
  const plan = await prisma.academicPlan.create({
    data: { userId: demoUser.id, name: "My Plan", isActive: true },
  });
  type Status = "COMPLETED" | "ENROLLED" | "PLANNED" | "DROPPED";
  const terms: { term: string; order: number; courses: { code: string; status: Status; grade?: string }[] }[] = [
    { term: "Fall 2025",   order: 0, courses: [
      { code: "C S 2A",  status: "COMPLETED", grade: "A"  },
      { code: "MATH 1A", status: "COMPLETED", grade: "A-" },
      { code: "ENGL 1A", status: "COMPLETED", grade: "B+" },
    ] },
    { term: "Winter 2026", order: 1, courses: [
      { code: "C S 2B",  status: "COMPLETED", grade: "A"  },
      { code: "MATH 1B", status: "COMPLETED", grade: "B+" },
      { code: "PHYS 4A", status: "COMPLETED", grade: "B"  },
    ] },
    { term: "Spring 2026", order: 2, courses: [
      { code: "C S 2C",  status: "ENROLLED" },
      { code: "MATH 1C", status: "ENROLLED" },
      { code: "PHYS 4B", status: "ENROLLED" },
    ] },
    { term: "Fall 2026", order: 3, courses: [
      { code: "MATH 22", status: "PLANNED" },
      { code: "MATH 2B", status: "PLANNED" },
      { code: "ENGL 1B", status: "PLANNED" },
    ] },
  ];
  for (const t of terms) {
    const planTerm = await prisma.planTerm.create({
      data: { academicPlanId: plan.id, term: t.term, order: t.order },
    });
    for (const c of t.courses) {
      const courseId = courseIdByCode.get(c.code);
      if (!courseId) continue;
      await prisma.planCourse.create({
        data: { planTermId: planTerm.id, courseId, status: c.status, grade: c.grade ?? null },
      });
    }
  }
  console.log("  ✓ Demo user + plan");

  // A couple more demo students for the network page
  const otherUsers = [
    {
      email: "ana@student.local", name: "Ana Diaz", interests: ["data science", "research"],
      schoolCode: "FOOTHILL", major: "Computer Science", goals: ["UCB", "UCSD"],
    },
    {
      email: "ben@student.local", name: "Ben Carter", interests: ["bioinformatics", "genomics"],
      schoolCode: "FOOTHILL", major: "Biology", goals: ["UCB", "UCD"],
    },
    {
      email: "lin@student.local", name: "Lin Park", interests: ["macroeconomics", "policy"],
      schoolCode: "FOOTHILL", major: "Economics", goals: ["UCB", "UCLA"],
    },
  ];
  const otherHash = await bcrypt.hash("demo1234", 10);
  for (const u of otherUsers) {
    const major = await prisma.major.findFirst({
      where: { schoolId: schools.get(u.schoolCode)!, name: u.major },
    });
    const user = await prisma.user.create({
      data: {
        email: u.email, name: u.name, passwordHash: otherHash, isPublic: true,
        profile: {
          create: {
            schoolId: schools.get(u.schoolCode)!,
            majorId: major?.id,
            interests: u.interests,
            transferGoals: {
              create: u.goals.map((g, i) => ({ schoolId: schools.get(g)!, priority: i })),
            },
          },
        },
      },
    });
    // Each gets an active empty plan so the dashboard works if they log in.
    await prisma.academicPlan.create({ data: { userId: user.id, name: "My Plan", isActive: true } });
  }

  // A sample post on the feed
  await prisma.post.create({
    data: {
      authorId: demoUser.id,
      body: "Just wrapped up C S 2B with Allen — would highly recommend. Office hours were super helpful for the recursion stuff.",
      tags: ["CS", "transfer", "foothill"],
    },
  });

  // Sample clubs (Foothill)
  await prisma.club.createMany({
    data: [
      { schoolId: foothillId, name: "CS Club", description: "Hackathons, code reviews, mentorship.", tags: ["computer science", "career"] },
      { schoolId: foothillId, name: "Pre-Med Society", description: "Volunteer hours, MCAT prep, advisor connections.", tags: ["biology", "medicine"] },
      { schoolId: foothillId, name: "Economics Forum", description: "Speaker series, finance careers, policy debates.", tags: ["economics", "finance"] },
    ],
  });

  console.log("✅ Seed complete");
}

function schoolNameFromCode(code: string): string {
  return SCHOOLS.find((s) => s.code === code)?.name ?? code;
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
