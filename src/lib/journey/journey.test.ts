import { describe, expect, it } from "vitest";
import { PRIMARY_NAV, courseHref, initials } from "./navigation";
import { nextStudyStep } from "./next-step";
import { readDraft, sessionMinutes } from "./draft";
import { journeyCopy } from "./copy";
import { parseHaderTranscript } from "./hader";
import { courseReadiness, gradeAverage } from "@/lib/learning/readiness";
const courses = [{ id: "finance", name: "Finance", progress: 0 }, { id: "strategy", name: "Strategy", progress: 0 }];
const now = new Date("2026-10-23T10:00:00Z");
describe("first useful study session", () => {
  it("has four primary destinations and preserves course context", () => {
    expect(PRIMARY_NAV).toHaveLength(4); expect(courseHref("/files", "a/b")).toBe("/files?course_id=a%2Fb");
  });
  it("offers a study action without inventing readiness or requiring grades", () => {
    const step = nextStudyStep(courses, [], [], now)!; expect(step.course.id).toBe("finance"); expect(step.readiness.score).toBeNull(); expect(step.reason).toBe("firstReason");
  });
  it("uses the nearest real open deadline even without grades", () => {
    const step = nextStudyStep(courses, [], [{ course_id: "strategy", due_date: "2026-10-24T09:00:00Z" }, { course_id: "finance", due_date: "2026-10-23T09:00:00Z", is_done: true }], now)!;
    expect(step.course.id).toBe("strategy"); expect(step.readiness.score).toBeNull(); expect(step.reason).toBe("deadlineReason");
  });
  it("ignores malformed dates and unknown course IDs", () => {
    expect(nextStudyStep(courses, [], [{ course_id: "strategy", due_date: "invalid" }, { course_id: "unknown", due_date: "2026-01-01" }], now)?.course.id).toBe("finance");
  });
  it("never turns pending, malformed or zero-weight grades into evidence", () => {
    const grades = [{ course_id: "finance", score: null, max_score: 100 }, { course_id: "finance", score: NaN, max_score: 100 }, { course_id: "finance", score: 90, max_score: 100, weight: 0 }];
    expect(gradeAverage(grades)).toBeNull(); expect(courseReadiness(courses[0], grades, [], now).gradedItems).toBe(0);
    expect(gradeAverage([{ course_id: "finance", score: 0, max_score: 100 }])).toBe(0);
  });
  it("ships every new label in Arabic and English", () => { expect(Object.keys(journeyCopy.ar).sort()).toEqual(Object.keys(journeyCopy.en).sort()); });
  it("uses actual initials or a neutral placeholder", () => { expect(initials("Ahmad Zayan")).toBe("AZ"); expect(initials()).toBe("?"); expect(initials("أحمد زين")).toBe("أز"); });
  it("validates locally restored drafts and timing", () => {
    expect(sessionMinutes("15")).toBe(15); expect(sessionMinutes("-1")).toBe(30);
    const raw = JSON.stringify({ courseId: "finance", goal: "DCF", notes: "My explanation", elapsed: 50, minutes: 15, finished: false });
    expect(readDraft(raw, "finance")?.notes).toBe("My explanation"); expect(readDraft(raw, "strategy")).toBeNull(); expect(readDraft("{", "finance")).toBeNull();
  });
});
describe("explicit Hader transcript import", () => {
  const source = { format: "hader-session", version: 1, id: "session-1", title: "Finance", createdAt: "2026-10-23T10:00:00Z", segments: [{ id: "one", text: "DCF explanation", offsetMs: 125000, source: "live" }, { id: "two", text: "Notes", offsetMs: null, source: "import" }] };
  it("preserves timestamps and provenance without inventing timings", () => { const r = parseHaderTranscript(JSON.stringify(source)); expect(r.transcript).toContain("[00:02:05] [live]"); expect(r.transcript).toContain("[untimed] [import]"); expect(r.hasDemo).toBe(false); });
  it("labels example content", () => { expect(parseHaderTranscript(JSON.stringify({ ...source, segments: [{ ...source.segments[0], source: "demo" }] })).hasDemo).toBe(true); });
  it("rejects duplicate IDs, unsupported versions, and oversized files", () => { expect(() => parseHaderTranscript(JSON.stringify({ ...source, segments: [source.segments[0], source.segments[0]] }))).toThrow(); expect(() => parseHaderTranscript(JSON.stringify({ ...source, version: 2 }))).toThrow(); expect(() => parseHaderTranscript(" ".repeat(2097153))).toThrow(); });
});
