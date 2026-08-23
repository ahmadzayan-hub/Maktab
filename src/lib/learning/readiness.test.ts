import { describe, expect, it } from "vitest";
import {
  MIN_BLOCK_MINUTES,
  allReadiness,
  courseReadiness,
  daysUntil,
  gradeAverage,
  levelFor,
  overallReadiness,
  studyPlan,
  type CourseInput,
  type DeadlineInput,
  type GradeInput,
} from "./readiness";

const NOW = new Date("2026-05-06T09:00:00.000Z");
const inDays = (n: number) => new Date(NOW.getTime() + n * 86_400_000).toISOString();

const course = (over: Partial<CourseInput> = {}): CourseInput => ({
  id: "c1",
  name: "Strategic Management",
  progress: 80,
  ...over,
});

const grade = (over: Partial<GradeInput> = {}): GradeInput => ({
  course_id: "c1",
  score: 80,
  max_score: 100,
  weight: 1,
  ...over,
});

describe("gradeAverage", () => {
  it("is null when there is nothing graded", () => {
    expect(gradeAverage([])).toBeNull();
    expect(gradeAverage([grade({ max_score: 0 })])).toBeNull();
  });

  it("weights items by their contribution to the final grade", () => {
    const avg = gradeAverage([
      grade({ score: 90, weight: 30 }),
      grade({ score: 50, weight: 10 }),
    ]);
    expect(avg).toBe(80);
  });

  it("treats missing weights as equal", () => {
    expect(gradeAverage([grade({ score: 100, weight: undefined }), grade({ score: 60, weight: undefined })])).toBe(80);
  });
});

describe("levelFor", () => {
  it("bands scores and keeps 'unknown' distinct from zero", () => {
    expect(levelFor(80)).toBe("strong");
    expect(levelFor(75)).toBe("strong");
    expect(levelFor(60)).toBe("developing");
    expect(levelFor(54)).toBe("weak");
    expect(levelFor(null)).toBe("unknown");
  });
});

describe("courseReadiness", () => {
  it("refuses to produce a number without graded work", () => {
    const r = courseReadiness(course(), [], [], NOW);
    expect(r.score).toBeNull();
    expect(r.level).toBe("unknown");
    expect(r.gradedItems).toBe(0);
    expect(r.drivers[0]!.name).toMatch(/No graded work/i);
  });

  it("starts from graded performance and names it as a driver", () => {
    const r = courseReadiness(course({ progress: 100 }), [grade({ score: 82 })], [], NOW);
    expect(r.score).toBe(82);
    expect(r.drivers.map((d) => d.name)).toContain("Graded performance");
  });

  it("lowers readiness when the course is not fully covered", () => {
    const covered = courseReadiness(course({ progress: 100 }), [grade({ score: 80 })], [], NOW);
    const partial = courseReadiness(course({ progress: 60 }), [grade({ score: 80 })], [], NOW);
    expect(partial.score!).toBeLessThan(covered.score!);
    expect(partial.drivers.some((d) => d.name === "Course coverage" && d.impact < 0)).toBe(true);
  });

  it("treats an imminent deadline as pressure but ignores a distant one", () => {
    const soon: DeadlineInput[] = [{ course_id: "c1", due_date: inDays(1) }];
    const later: DeadlineInput[] = [{ course_id: "c1", due_date: inDays(40) }];
    const a = courseReadiness(course({ progress: 100 }), [grade({ score: 80 })], soon, NOW);
    const b = courseReadiness(course({ progress: 100 }), [grade({ score: 80 })], later, NOW);
    expect(a.score!).toBeLessThan(b.score!);
    expect(b.drivers.some((d) => d.name === "Deadline pressure")).toBe(false);
  });

  it("calls out overdue work explicitly", () => {
    const overdue: DeadlineInput[] = [{ course_id: "c1", due_date: inDays(-3) }];
    const r = courseReadiness(course(), [grade({ score: 80 })], overdue, NOW);
    expect(r.drivers.some((d) => d.name === "Overdue work")).toBe(true);
    expect(r.daysToNextDeadline).toBeLessThan(0);
  });

  it("ignores deadlines already done and those of other courses", () => {
    const deadlines: DeadlineInput[] = [
      { course_id: "c1", due_date: inDays(1), is_done: true },
      { course_id: "other", due_date: inDays(1) },
    ];
    const r = courseReadiness(course({ progress: 100 }), [grade({ score: 80 })], deadlines, NOW);
    expect(r.daysToNextDeadline).toBeNull();
    expect(r.score).toBe(80);
  });

  it("keeps the score inside 0..100", () => {
    const brutal = courseReadiness(
      course({ progress: 0 }),
      [grade({ score: 5 })],
      [{ course_id: "c1", due_date: inDays(-30) }],
      NOW,
    );
    expect(brutal.score!).toBeGreaterThanOrEqual(0);
    expect(courseReadiness(course({ progress: 100 }), [grade({ score: 100 })], [], NOW).score).toBe(100);
  });
});

describe("daysUntil", () => {
  it("is negative for the past and positive for the future", () => {
    expect(daysUntil(inDays(-2), NOW)).toBeLessThan(0);
    expect(daysUntil(inDays(5), NOW)).toBe(5);
  });
});

describe("allReadiness and overallReadiness", () => {
  const courses = [
    course({ id: "c1", name: "Strategy", progress: 100 }),
    course({ id: "c2", name: "Finance", progress: 100 }),
    course({ id: "c3", name: "Ops", progress: 100 }),
  ];
  const grades = [
    grade({ course_id: "c1", score: 88 }),
    grade({ course_id: "c2", score: 61 }),
  ];

  it("puts the weakest course first and evidence-less courses last", () => {
    const list = allReadiness(courses, grades, [], NOW);
    expect(list.map((r) => r.courseId)).toEqual(["c2", "c1", "c3"]);
    expect(list[2]!.score).toBeNull();
  });

  it("averages only the courses that have evidence", () => {
    expect(overallReadiness(allReadiness(courses, grades, [], NOW))).toBe(75);
  });

  it("reports nothing rather than zero when no course has evidence", () => {
    expect(overallReadiness(allReadiness(courses, [], [], NOW))).toBeNull();
  });
});

describe("studyPlan", () => {
  const readiness = (id: string, name: string, score: number, days: number | null) => ({
    courseId: id,
    courseName: name,
    score,
    level: levelFor(score),
    drivers: [],
    daysToNextDeadline: days,
    gradedItems: 2,
  });

  it("returns nothing when there is not even one usable block", () => {
    expect(studyPlan(10, [readiness("c1", "A", 40, null)])).toEqual([]);
  });

  it("never promises more time than the learner has", () => {
    const plan = studyPlan(90, [
      readiness("c1", "A", 40, 1),
      readiness("c2", "B", 55, 5),
      readiness("c3", "C", 70, 20),
    ]);
    const total = plan.reduce((sum, b) => sum + b.minutes, 0);
    expect(total).toBeLessThanOrEqual(90);
    expect(plan.length).toBeGreaterThan(0);
  });

  it("gives every block enough time to be worth starting", () => {
    for (const block of studyPlan(60, [
      readiness("c1", "A", 40, 1),
      readiness("c2", "B", 50, 3),
      readiness("c3", "C", 60, 9),
    ])) {
      expect(block.minutes).toBeGreaterThanOrEqual(MIN_BLOCK_MINUTES);
    }
  });

  it("lets urgency outrank a slightly lower score", () => {
    const plan = studyPlan(60, [
      readiness("urgent", "Urgent", 60, 1),
      readiness("weaker", "Weaker", 55, 30),
    ]);
    expect(plan[0]!.courseId).toBe("urgent");
    expect(plan[0]!.reason).toMatch(/Due in 1 day/i);
  });

  it("puts overdue work at the top and says so", () => {
    const plan = studyPlan(60, [
      readiness("late", "Late", 70, -2),
      readiness("ok", "Ok", 65, 25),
    ]);
    expect(plan[0]!.courseId).toBe("late");
    expect(plan[0]!.reason).toMatch(/Overdue/i);
  });

  it("does not spread a short session across many courses", () => {
    const plan = studyPlan(30, [
      readiness("c1", "A", 30, 1),
      readiness("c2", "B", 40, 2),
      readiness("c3", "C", 50, 3),
      readiness("c4", "D", 60, 4),
    ]);
    expect(plan.length).toBeLessThanOrEqual(2);
  });

  it("plans nothing for courses with no evidence", () => {
    const plan = studyPlan(60, [
      { courseId: "c1", courseName: "A", score: null, level: "unknown" as const, drivers: [], daysToNextDeadline: null, gradedItems: 0 },
    ]);
    expect(plan).toEqual([]);
  });
});
