import { auth } from "@/auth";
import { buildReport, parseSectionSlug, reportCsv, sectionLabel } from "@/lib/classReport";
import { isFaculty, LESSON_COLUMNS, progressFor, studentsIn, teaches } from "@/lib/faculty";
import { summaries } from "@/lib/quiz/store";
import { getUser } from "@/lib/users";

// GET /api/faculty/export?section=<slug> → the section's progress as CSV.
// Only for faculty who have added that section.

export async function GET(req: Request) {
  const id = (await auth())?.user?.id;
  const user = id ? await getUser(id) : null;
  if (!isFaculty(user)) return new Response("Faculty only", { status: 403 });

  const s = parseSectionSlug(new URL(req.url).searchParams.get("section") ?? "");
  if (!s || !(await teaches(user._id.toHexString(), s))) return new Response("Not one of your sections", { status: 404 });

  const students = await studentsIn(s);
  const ids = students.map((st) => st.id);
  const [progress, quizzes] = await Promise.all([progressFor(ids), summaries(ids)]);
  const report = buildReport(students, progress, LESSON_COLUMNS, quizzes);
  const date = new Date().toISOString().slice(0, 10);
  const name = `${sectionLabel(s).replace(/[^A-Za-z0-9]+/g, "-")}-${date}.csv`;
  return new Response(reportCsv(report, LESSON_COLUMNS), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
