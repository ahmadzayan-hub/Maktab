/**
 * Exam readiness and study planning.
 *
 * The dashboard used to show a hardcoded "72%". A number a learner is asked
 * to act on has to come from their own work, so this module derives it from
 * what Maktab actually knows: graded work, course coverage, and how close
 * the deadlines are. Where the evidence is too thin to support a number, it
 * says so rather than inventing one.
 */

export interface CourseInput {
  id: string;
  name: string;
  /** Course completion 0..100, as tracked by the course itself. */
  progress: number;
}

export interface GradeInput {
  course_id: string;
  score: number;
  max_score: number;
  /** Weight of this item in the final grade, if known. */
  weight?: number;
}

export interface DeadlineInput {
  course_id: string;
  due_date: string;
  is_done?: boolean;
}

export type ReadinessLevel = 'strong' | 'developing' | 'weak' | 'unknown';

export interface ReadinessDriver {
  name: string;
  detail: string;
  /** Signed impact in readiness points; negative pulls readiness down. */
  impact: number;
}

export interface CourseReadiness {
  courseId: string;
  courseName: string;
  /** 0..100, or null when there is not enough evidence to claim a number. */
  score: number | null;
  level: ReadinessLevel;
  drivers: ReadinessDriver[];
  /** Days until the nearest open deadline, or null when nothing is due. */
  daysToNextDeadline: number | null;
  /** How much graded work stands behind the score. */
  gradedItems: number;
}

const DAY = 86_400_000;

function clamp(n: number, min = 0, max = 100): number {
  return Math.min(Math.max(n, min), max);
}

export function levelFor(score: number | null): ReadinessLevel {
  if (score === null) return 'unknown';
  if (score >= 75) return 'strong';
  if (score >= 55) return 'developing';
  return 'weak';
}

/** Weighted average of graded work as a percentage, or null when ungraded. */
export function gradeAverage(grades: GradeInput[]): number | null {
  const usable = grades.filter((g) => g.max_score > 0);
  if (usable.length === 0) return null;
  const totalWeight = usable.reduce((sum, g) => sum + (g.weight ?? 1), 0);
  if (totalWeight === 0) return null;
  const weighted = usable.reduce(
    (sum, g) => sum + (g.score / g.max_score) * 100 * (g.weight ?? 1),
    0,
  );
  return Math.round(weighted / totalWeight);
}

export function daysUntil(dueDate: string, now: Date): number {
  return Math.ceil((new Date(dueDate).getTime() - now.getTime()) / DAY);
}

/**
 * Readiness for one course.
 *
 * Graded performance carries the score; coverage adjusts it; an imminent
 * deadline lowers it, because being 70% ready with an exam tomorrow is not
 * the same as being 70% ready with three weeks left.
 */
export function courseReadiness(
  course: CourseInput,
  grades: GradeInput[],
  deadlines: DeadlineInput[],
  now: Date = new Date(),
): CourseReadiness {
  const courseGrades = grades.filter((g) => g.course_id === course.id);
  const average = gradeAverage(courseGrades);
  const drivers: ReadinessDriver[] = [];

  const open = deadlines
    .filter((d) => d.course_id === course.id && !d.is_done)
    .map((d) => daysUntil(d.due_date, now))
    .sort((a, b) => a - b);
  const daysToNextDeadline = open.length > 0 ? open[0]! : null;

  // No graded work means no honest readiness number.
  if (average === null) {
    return {
      courseId: course.id,
      courseName: course.name,
      score: null,
      level: 'unknown',
      drivers: [
        {
          name: 'No graded work yet',
          detail: 'Readiness needs at least one graded item before it means anything.',
          impact: 0,
        },
      ],
      daysToNextDeadline,
      gradedItems: 0,
    };
  }

  drivers.push({
    name: 'Graded performance',
    detail: `${average}% across ${courseGrades.length} graded item(s)`,
    impact: 0,
  });

  // Coverage: material seen versus material examined.
  const coverageGap = clamp(100 - course.progress);
  const coveragePenalty = Math.round(coverageGap * 0.25);
  if (coveragePenalty > 0) {
    drivers.push({
      name: 'Course coverage',
      detail: `${course.progress}% of the course covered`,
      impact: -coveragePenalty,
    });
  }

  // Deadline pressure: only for work that is actually imminent.
  let deadlinePenalty = 0;
  if (daysToNextDeadline !== null && daysToNextDeadline <= 7) {
    deadlinePenalty = daysToNextDeadline < 0 ? 15 : Math.round((7 - daysToNextDeadline) * 1.5);
    drivers.push({
      name: daysToNextDeadline < 0 ? 'Overdue work' : 'Deadline pressure',
      detail:
        daysToNextDeadline < 0
          ? `${Math.abs(daysToNextDeadline)} day(s) overdue`
          : `Next deadline in ${daysToNextDeadline} day(s)`,
      impact: -deadlinePenalty,
    });
  }

  const score = clamp(Math.round(average - coveragePenalty - deadlinePenalty));

  return {
    courseId: course.id,
    courseName: course.name,
    score,
    level: levelFor(score),
    drivers,
    daysToNextDeadline,
    gradedItems: courseGrades.length,
  };
}

export function allReadiness(
  courses: CourseInput[],
  grades: GradeInput[],
  deadlines: DeadlineInput[],
  now: Date = new Date(),
): CourseReadiness[] {
  return courses
    .map((c) => courseReadiness(c, grades, deadlines, now))
    .sort((a, b) => {
      // Weakest first; courses with no evidence sit after scored ones, since
      // "unknown" is a prompt to add data, not a call to study.
      if (a.score === null && b.score === null) return a.courseName.localeCompare(b.courseName);
      if (a.score === null) return 1;
      if (b.score === null) return -1;
      return a.score - b.score;
    });
}

/** Overall readiness across the courses that have evidence, or null. */
export function overallReadiness(readiness: CourseReadiness[]): number | null {
  const scored = readiness.filter((r) => r.score !== null);
  if (scored.length === 0) return null;
  return Math.round(scored.reduce((sum, r) => sum + (r.score ?? 0), 0) / scored.length);
}

// --- Study plan --------------------------------------------------------------

export interface StudyBlock {
  courseId: string;
  courseName: string;
  minutes: number;
  reason: string;
}

/** Blocks shorter than this are not worth switching context for. */
export const MIN_BLOCK_MINUTES = 15;

/**
 * Allocate the time a learner actually has to the courses that need it most.
 *
 * Urgency multiplies need, so a weak course with an exam in two days
 * outranks a slightly weaker course with three weeks left. Time is allocated
 * in whole blocks: an honest plan says "two courses tonight", not "seven
 * courses for nine minutes each".
 */
export function studyPlan(
  minutesAvailable: number,
  readiness: CourseReadiness[],
): StudyBlock[] {
  if (minutesAvailable < MIN_BLOCK_MINUTES) return [];

  const candidates = readiness
    .filter((r) => r.score !== null)
    .map((r) => {
      const need = 100 - (r.score ?? 100);
      const days = r.daysToNextDeadline;
      const urgency =
        days === null ? 1 : days < 0 ? 2.5 : days <= 2 ? 2.2 : days <= 7 ? 1.6 : days <= 14 ? 1.2 : 1;
      return { readiness: r, weight: need * urgency, urgency, days };
    })
    .filter((c) => c.weight > 0)
    .sort((a, b) => b.weight - a.weight);

  if (candidates.length === 0) return [];

  // Only as many courses as can each get a real block.
  const maxBlocks = Math.max(1, Math.floor(minutesAvailable / MIN_BLOCK_MINUTES));
  const chosen = candidates.slice(0, Math.min(maxBlocks, 3));
  const totalWeight = chosen.reduce((sum, c) => sum + c.weight, 0);

  const blocks: StudyBlock[] = chosen.map((c) => ({
    courseId: c.readiness.courseId,
    courseName: c.readiness.courseName,
    // Round to 5-minute steps: a plan a person can actually follow.
    minutes: Math.max(
      MIN_BLOCK_MINUTES,
      Math.round(((c.weight / totalWeight) * minutesAvailable) / 5) * 5,
    ),
    reason:
      c.days !== null && c.days < 0
        ? `Overdue work, readiness ${c.readiness.score}%`
        : c.days !== null && c.days <= 7
          ? `Due in ${c.days} day(s), readiness ${c.readiness.score}%`
          : `Weakest course, readiness ${c.readiness.score}%`,
  }));

  // Never promise more time than the learner said they have.
  let total = blocks.reduce((sum, b) => sum + b.minutes, 0);
  while (total > minutesAvailable && blocks.length > 0) {
    const last = blocks[blocks.length - 1]!;
    const excess = total - minutesAvailable;
    if (last.minutes - excess >= MIN_BLOCK_MINUTES) {
      last.minutes -= excess;
      total -= excess;
    } else {
      total -= last.minutes;
      blocks.pop();
    }
  }
  return blocks;
}
