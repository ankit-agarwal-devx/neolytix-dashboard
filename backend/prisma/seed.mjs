import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const prismaDir = dirname(fileURLToPath(import.meta.url));
const projectDir = resolve(prismaDir, "..");
const data = JSON.parse(readFileSync(resolve(prismaDir, "seed-data.json"), "utf8"));

function text(value, field) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${field} must be a non-empty string`);
  }
  return `'${value.replaceAll("'", "''")}'`;
}

function integer(value, field) {
  if (!Number.isSafeInteger(value)) {
    throw new TypeError(`${field} must be a safe integer`);
  }
  return String(value);
}

function date(value, field) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value
  ) {
    throw new TypeError(`${field} must be a valid YYYY-MM-DD date`);
  }
  return `TIMESTAMP '${value} 00:00:00'`;
}

function insert(table, columns, rows, conflictKeys, updates) {
  if (rows.length === 0) {
    return "";
  }

  return `INSERT INTO "${table}" (${columns.map((column) => `"${column}"`).join(", ")})
VALUES
${rows.map((row) => `  (${row.join(", ")})`).join(",\n")}
ON CONFLICT (${conflictKeys.map((column) => `"${column}"`).join(", ")}) DO UPDATE SET
  ${updates.map((column) => `"${column}" = EXCLUDED."${column}"`).join(",\n  ")};`;
}

if (!Array.isArray(data.students) || !Array.isArray(data.courses)) {
  throw new TypeError("seed-data.json must contain students and courses arrays");
}

const courseIds = new Set(
  data.courses.map((course) => {
    text(course.id, "course.id");
    return course.id;
  }),
);
const students = data.students.map((student) => [
  text(student.id, "student.id"),
  text(student.name, "student.name"),
  text(student.region, "student.region"),
  date(student.joined_on, "student.joined_on"),
]);
const courses = data.courses.map((course) => [
  text(course.id, "course.id"),
  text(course.title, "course.title"),
  text(course.category, "course.category"),
  text(course.level, "course.level"),
  text(course.instructor, "course.instructor"),
  integer(course.duration_weeks, "course.duration_weeks"),
]);

for (const [values, field] of [
  [students.map((row) => row[0]), "student IDs"],
  [courses.map((row) => row[0]), "course IDs"],
]) {
  if (new Set(values).size !== values.length) {
    throw new TypeError(`seed-data.json contains duplicate ${field}`);
  }
}

const enrollments = [];
for (const student of data.students) {
  if (!Array.isArray(student.enrollments)) {
    throw new TypeError(`student ${student.id} must contain an enrollments array`);
  }

  for (const enrollment of student.enrollments) {
    if (!courseIds.has(enrollment.course_id)) {
      throw new TypeError(`Unknown course ID ${enrollment.course_id} for student ${student.id}`);
    }

    enrollments.push([
      text(student.id, "student.id"),
      text(enrollment.course_id, "enrollment.course_id"),
      date(enrollment.enrolled_on, "enrollment.enrolled_on"),
      text(enrollment.completion_status, "enrollment.completion_status"),
      enrollment.grade === null ? "NULL" : text(enrollment.grade, "enrollment.grade"),
      integer(enrollment.rating, "enrollment.rating"),
      integer(enrollment.fee_paid, "enrollment.fee_paid"),
    ]);
  }
}

if (
  new Set(enrollments.map((row) => `${row[0]}:${row[1]}`)).size !== enrollments.length
) {
  throw new TypeError("seed-data.json contains duplicate student/course enrollments");
}

const verification = `DO $seed_verify$
BEGIN
  IF (SELECT COUNT(*) FROM "students" WHERE "id" IN (${students.map((row) => row[0]).join(", ")})) <> ${students.length} THEN
    RAISE EXCEPTION 'Seed verification failed for students';
  END IF;
  IF (SELECT COUNT(*) FROM "courses" WHERE "id" IN (${courses.map((row) => row[0]).join(", ")})) <> ${courses.length} THEN
    RAISE EXCEPTION 'Seed verification failed for courses';
  END IF;
  IF (SELECT COUNT(*) FROM "enrollments" WHERE ("student_id", "course_id") IN (${enrollments.map((row) => `(${row[0]}, ${row[1]})`).join(", ")})) <> ${enrollments.length} THEN
    RAISE EXCEPTION 'Seed verification failed for enrollments';
  END IF;
END
$seed_verify$;`;

const sql = [
  "BEGIN;",
  insert("students", ["id", "name", "region", "joined_on"], students, ["id"], [
    "name",
    "region",
    "joined_on",
  ]),
  insert(
    "courses",
    ["id", "title", "category", "level", "instructor", "duration_weeks"],
    courses,
    ["id"],
    ["title", "category", "level", "instructor", "duration_weeks"],
  ),
  insert(
    "enrollments",
    [
      "student_id",
      "course_id",
      "enrolled_on",
      "completion_status",
      "grade",
      "rating",
      "fee_paid",
    ],
    enrollments,
    ["student_id", "course_id"],
    ["enrolled_on", "completion_status", "grade", "rating", "fee_paid"],
  ),
  verification,
  "COMMIT;",
]
  .filter(Boolean)
  .join("\n\n");

const prismaCli = resolve(projectDir, "node_modules", "prisma", "build", "index.js");
const result = spawnSync(process.execPath, [prismaCli, "db", "execute", "--stdin"], {
  cwd: projectDir,
  encoding: "utf8",
  input: sql,
});

if (result.stdout) {
  process.stdout.write(result.stdout);
}
if (result.stderr) {
  process.stderr.write(result.stderr);
}
if (result.error) {
  throw result.error;
}
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log(
  `Seeded ${data.students.length} students, ${data.courses.length} courses, and ${enrollments.length} enrollments.`,
);
