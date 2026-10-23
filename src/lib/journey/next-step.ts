import { allReadiness, type CourseInput, type DeadlineInput, type GradeInput } from "@/lib/learning/readiness";
export function nextStudyStep(courses: CourseInput[], grades: GradeInput[], deadlines: DeadlineInput[], now = new Date()) {
  if (!courses.length) return null;
  const nearest = deadlines.filter(d => !d.is_done && Number.isFinite(Date.parse(d.due_date)) && courses.some(c => c.id === d.course_id)).sort((a, b) => Date.parse(a.due_date) - Date.parse(b.due_date))[0];
  const readiness = allReadiness(courses, grades, deadlines, now);
  const selected = nearest ? courses.find(c => c.id === nearest.course_id)! : courses.find(c => c.id === readiness.find(r => r.score !== null)?.courseId) || courses[0];
  const evidence = readiness.find(r => r.courseId === selected.id)!;
  return { course: selected, readiness: evidence, reason: nearest ? "deadlineReason" : evidence.score !== null ? "gradeReason" : "firstReason" } as const;
}
