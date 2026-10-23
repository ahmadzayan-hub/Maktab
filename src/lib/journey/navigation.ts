export const PRIMARY_NAV = [
  { href: "/dashboard", key: "today" },
  { href: "/courses", key: "courses" },
  { href: "/study", key: "study" },
  { href: "/timeline", key: "deadlines" },
] as const;

export function courseHref(path: string, courseId?: string | null) {
  return courseId ? `${path}?course_id=${encodeURIComponent(courseId)}` : path;
}

export function selectedCourseId() {
  return typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("course_id") || "";
}

export function initials(name?: string | null) {
  return name?.trim().split(/\s+/).slice(0, 2).map(word => Array.from(word)[0]).join("").toUpperCase() || "?";
}
