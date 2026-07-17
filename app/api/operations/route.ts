import { getOperationDatabase } from "../../../db/runtime";

type VendorRow = {
  student?: string;
  course?: string;
  vendorGross?: number;
  vendorSupport?: number;
};

type OperationPayload = {
  action?: string;
  courseId?: number;
  studentId?: number;
  applicationId?: number;
  refundId?: number;
  status?: string;
  paymentStatus?: string;
  idempotencyKey?: string;
  rows?: VendorRow[];
};

let initialization: Promise<void> | null = null;

async function database() {
  return getOperationDatabase();
}

async function initializeDatabase() {
  if (initialization) return initialization;
  initialization = (async () => {
    const db = await database();
    await db.batch([
      db.prepare(`CREATE TABLE IF NOT EXISTS schools (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        district TEXT NOT NULL,
        school_type TEXT NOT NULL,
        phone TEXT NOT NULL DEFAULT '',
        address TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        school_id INTEGER NOT NULL,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        section TEXT NOT NULL,
        grades TEXT NOT NULL,
        schedule TEXT NOT NULL,
        room TEXT NOT NULL,
        tuition INTEGER NOT NULL DEFAULT 0,
        textbook INTEGER NOT NULL DEFAULT 0,
        materials INTEGER NOT NULL DEFAULT 0,
        operating_fee INTEGER NOT NULL DEFAULT 0,
        weeks INTEGER NOT NULL DEFAULT 0,
        capacity INTEGER NOT NULL DEFAULT 0,
        applicants INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT '모집중',
        selection_method TEXT NOT NULL DEFAULT '선착순',
        instructor TEXT NOT NULL DEFAULT '',
        accent TEXT NOT NULL DEFAULT 'mint',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (school_id) REFERENCES schools(id)
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        school_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        grade INTEGER NOT NULL,
        class_name TEXT NOT NULL,
        student_number INTEGER NOT NULL,
        guardian_phone TEXT NOT NULL,
        support_type TEXT,
        support_limit INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (school_id) REFERENCES schools(id)
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        school_id INTEGER NOT NULL,
        course_id INTEGER NOT NULL,
        student_id INTEGER NOT NULL,
        status TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT '문자 URL',
        submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        tuition_snapshot INTEGER NOT NULL DEFAULT 0,
        textbook_snapshot INTEGER NOT NULL DEFAULT 0,
        materials_snapshot INTEGER NOT NULL DEFAULT 0,
        operating_snapshot INTEGER NOT NULL DEFAULT 0,
        support_amount INTEGER NOT NULL DEFAULT 0,
        vendor_gross INTEGER,
        vendor_support INTEGER,
        verified_at TEXT,
        idempotency_key TEXT NOT NULL UNIQUE,
        FOREIGN KEY (school_id) REFERENCES schools(id),
        FOREIGN KEY (course_id) REFERENCES courses(id),
        FOREIGN KEY (student_id) REFERENCES students(id)
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS refunds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        school_id INTEGER NOT NULL,
        student_name TEXT NOT NULL,
        course_name TEXT NOT NULL,
        amount INTEGER NOT NULL,
        reason TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (school_id) REFERENCES schools(id)
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS deliveries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        school_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        recipient TEXT NOT NULL,
        channel TEXT NOT NULL,
        status TEXT NOT NULL,
        sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (school_id) REFERENCES schools(id)
      )`),
      db.prepare(`CREATE TABLE IF NOT EXISTS operation_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`),
      db.prepare("CREATE INDEX IF NOT EXISTS applications_course_idx ON applications(course_id)"),
      db.prepare("CREATE INDEX IF NOT EXISTS applications_student_idx ON applications(student_id)"),
    ]);

    const existing = await db.prepare("SELECT COUNT(*) AS count FROM schools").first<{ count: number }>();
    if ((existing?.count ?? 0) > 0) return;

    await db.batch([
      db.prepare("INSERT INTO schools (id, code, name, district, school_type, phone, address) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .bind(1, "7131210", "서울세검정초등학교", "서울특별시서부교육지원청", "공립 초등학교", "02-379-3004", "서울특별시 종로구 세검정로9길 1"),
      db.prepare("INSERT INTO courses (id, school_id, category, title, section, grades, schedule, room, tuition, textbook, materials, operating_fee, weeks, capacity, applicants, status, selection_method, instructor, accent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(1, 1, "교과", "생각이 자라는 창의수학", "A반", "1–2학년", "월 13:20–14:40", "창의실", 78000, 6000, 10000, 4000, 10, 24, 19, "모집중", "선착순", "김하늘", "mint"),
      db.prepare("INSERT INTO courses (id, school_id, category, title, section, grades, schedule, room, tuition, textbook, materials, operating_fee, weeks, capacity, applicants, status, selection_method, instructor, accent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(2, 1, "예체능", "신나는 방송댄스", "A반", "1–3학년", "수 13:30–14:50", "다목적실", 72000, 0, 0, 3000, 10, 20, 20, "대기접수", "선착순", "이지아", "coral"),
      db.prepare("INSERT INTO courses (id, school_id, category, title, section, grades, schedule, room, tuition, textbook, materials, operating_fee, weeks, capacity, applicants, status, selection_method, instructor, accent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(3, 1, "디지털", "처음 만나는 로봇 코딩", "A반", "3–4학년", "목 14:40–16:00", "컴퓨터실", 90000, 0, 25000, 5000, 10, 22, 17, "모집중", "추첨", "박도윤", "blue"),
      db.prepare("INSERT INTO courses (id, school_id, category, title, section, grades, schedule, room, tuition, textbook, materials, operating_fee, weeks, capacity, applicants, status, selection_method, instructor, accent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(4, 1, "체육", "튼튼 음악줄넘기", "B반", "3–6학년", "금 14:50–16:10", "체육관", 78000, 0, 0, 2000, 10, 25, 21, "모집중", "선착순", "정유진", "yellow"),
      db.prepare("INSERT INTO courses (id, school_id, category, title, section, grades, schedule, room, tuition, textbook, materials, operating_fee, weeks, capacity, applicants, status, selection_method, instructor, accent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(5, 1, "과학·창의", "꼬마 과학자 실험실", "A반", "1–2학년", "화 13:20–14:40", "과학실", 84000, 0, 18000, 4000, 10, 20, 14, "모집중", "학교승인", "최서윤", "purple"),
      db.prepare("INSERT INTO courses (id, school_id, category, title, section, grades, schedule, room, tuition, textbook, materials, operating_fee, weeks, capacity, applicants, status, selection_method, instructor, accent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(6, 1, "예체능", "상상 톡톡 창의미술", "B반", "3–6학년", "수 14:50–16:10", "미술실", 76000, 0, 15000, 4000, 10, 24, 18, "모집중", "추첨", "오민지", "pink"),
      db.prepare("INSERT INTO students (id, school_id, name, grade, class_name, student_number, guardian_phone, support_type, support_limit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(1, 1, "이서준", 3, "2반", 8, "010-0000-1001", "자유수강권", 40000),
      db.prepare("INSERT INTO students (id, school_id, name, grade, class_name, student_number, guardian_phone, support_type, support_limit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(2, 1, "한지우", 2, "1반", 17, "010-0000-1002", null, 0),
      db.prepare("INSERT INTO students (id, school_id, name, grade, class_name, student_number, guardian_phone, support_type, support_limit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(3, 1, "윤도현", 1, "3반", 4, "010-0000-1003", "다자녀 감면", 20000),
      db.prepare("INSERT INTO students (id, school_id, name, grade, class_name, student_number, guardian_phone, support_type, support_limit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(4, 1, "김채원", 4, "2반", 11, "010-0000-1004", null, 0),
      db.prepare("INSERT INTO students (id, school_id, name, grade, class_name, student_number, guardian_phone, support_type, support_limit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(5, 1, "김하윤", 2, "3반", 12, "010-0000-1005", "자유수강권", 20000),
      db.prepare("INSERT INTO applications (id, school_id, course_id, student_id, status, source, submitted_at, tuition_snapshot, textbook_snapshot, materials_snapshot, operating_snapshot, support_amount, vendor_gross, vendor_support, verified_at, idempotency_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(101, 1, 3, 1, "수강확정", "문자 URL", "2026-07-17 09:14:00", 90000, 0, 25000, 5000, 40000, 120000, 40000, "2026-07-17 09:30:00", "seed-101"),
      db.prepare("INSERT INTO applications (id, school_id, course_id, student_id, status, source, submitted_at, tuition_snapshot, textbook_snapshot, materials_snapshot, operating_snapshot, support_amount, vendor_gross, vendor_support, idempotency_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(102, 1, 1, 2, "접수완료", "문자 URL", "2026-07-17 09:07:00", 78000, 6000, 10000, 4000, 0, 93000, 0, "seed-102"),
      db.prepare("INSERT INTO applications (id, school_id, course_id, student_id, status, source, submitted_at, tuition_snapshot, textbook_snapshot, materials_snapshot, operating_snapshot, support_amount, vendor_gross, vendor_support, idempotency_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(103, 1, 2, 3, "대기 1번", "문자 URL", "2026-07-17 08:58:00", 72000, 0, 0, 3000, 20000, 75000, 0, "seed-103"),
      db.prepare("INSERT INTO applications (id, school_id, course_id, student_id, status, source, submitted_at, tuition_snapshot, textbook_snapshot, materials_snapshot, operating_snapshot, support_amount, vendor_gross, vendor_support, verified_at, idempotency_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(104, 1, 4, 4, "수강확정", "문자 URL", "2026-07-16 16:42:00", 78000, 0, 0, 2000, 0, 80000, 0, "2026-07-17 09:30:00", "seed-104"),
      db.prepare("INSERT INTO refunds (id, school_id, student_name, course_name, amount, reason, status) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .bind(201, 1, "김채원", "튼튼 음악줄넘기 B반", 52000, "개인 일정", "승인대기"),
      db.prepare("INSERT INTO refunds (id, school_id, student_name, course_name, amount, reason, status) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .bind(202, 1, "박민준", "영어뮤지컬 A반", 68000, "전학", "승인대기"),
      db.prepare("INSERT INTO deliveries (id, school_id, title, recipient, channel, status, sent_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .bind(301, 1, "2026-2기 모집 시작", "전교생 보호자", "SMS", "수신완료", "2026-07-17 08:30:00"),
      db.prepare("INSERT INTO deliveries (id, school_id, title, recipient, channel, status, sent_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .bind(302, 1, "수강신청 접수 완료", "한지우 보호자", "알림톡", "수신완료", "2026-07-17 09:07:00"),
      db.prepare("INSERT INTO operation_settings (key, value) VALUES (?, ?)").bind("payment_status", "unpaid"),
      db.prepare("INSERT INTO operation_settings (key, value) VALUES (?, ?)").bind("last_import_summary", "업체 자료 4건 · 자동검증 2건 · 확인필요 2건"),
    ]);
  })().catch((error) => {
    initialization = null;
    throw error;
  });
  return initialization;
}

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function buildState() {
  const db = await database();
  const [schoolQuery, courseQuery, studentQuery, applicationQuery, refundQuery, deliveryQuery, settingQuery] = await Promise.all([
    db.prepare("SELECT id, code, name, district, school_type AS schoolType, phone, address FROM schools ORDER BY id LIMIT 1").all(),
    db.prepare(`SELECT id, category, title, section, grades, schedule, room, tuition, textbook, materials,
      operating_fee AS operatingFee, weeks, capacity, applicants, status, selection_method AS selectionMethod,
      instructor, accent FROM courses ORDER BY id`).all(),
    db.prepare(`SELECT id, name, grade, class_name AS className, student_number AS studentNumber,
      guardian_phone AS guardianPhone, support_type AS supportType, support_limit AS supportLimit
      FROM students ORDER BY grade, class_name, student_number`).all(),
    db.prepare(`SELECT a.id, a.course_id AS courseId, a.student_id AS studentId, s.name AS student,
      s.grade || '-' || REPLACE(s.class_name, '반', '') AS grade, a.submitted_at AS submittedAt,
      a.status, a.source, a.tuition_snapshot AS tuitionSnapshot, a.textbook_snapshot AS textbookSnapshot,
      a.materials_snapshot AS materialsSnapshot, a.operating_snapshot AS operatingSnapshot,
      a.support_amount AS supportAmount, a.vendor_gross AS vendorGross, a.vendor_support AS vendorSupport,
      a.verified_at AS verifiedAt, c.title AS courseTitle, c.section AS courseSection,
      s.support_type AS supportType
      FROM applications a JOIN students s ON s.id = a.student_id JOIN courses c ON c.id = a.course_id
      WHERE a.status != '취소' ORDER BY a.id DESC`).all(),
    db.prepare("SELECT id, student_name AS student, course_name AS course, amount, reason, status FROM refunds ORDER BY id DESC").all(),
    db.prepare("SELECT id, title, recipient, channel, sent_at AS sentAt, status FROM deliveries ORDER BY id DESC LIMIT 30").all(),
    db.prepare("SELECT key, value FROM operation_settings").all(),
  ]);

  const settings = Object.fromEntries(settingQuery.results.map((row) => [String(row.key), String(row.value)]));
  const applications = applicationQuery.results.map((row) => {
    const systemGross = number(row.tuitionSnapshot) + number(row.textbookSnapshot) + number(row.materialsSnapshot) + number(row.operatingSnapshot);
    const systemSupport = number(row.supportAmount);
    const vendorGross = row.vendorGross == null ? null : number(row.vendorGross);
    const vendorSupport = row.vendorSupport == null ? null : number(row.vendorSupport);
    const issues: string[] = [];
    if (vendorGross == null) issues.push("업체 자료 미수신");
    else if (vendorGross !== systemGross) issues.push("수강료 합계 불일치");
    if (vendorSupport == null) issues.push("지원금 확인 필요");
    else if (vendorSupport !== systemSupport) issues.push("지원금 불일치");
    return {
      ...row,
      systemGross,
      systemSupport,
      finalAmount: Math.max(systemGross - systemSupport, 0),
      vendorGross,
      vendorSupport,
      verificationStatus: issues.length === 0 ? "검증완료" : "확인필요",
      issues,
    };
  });

  return {
    school: schoolQuery.results[0],
    courses: courseQuery.results,
    students: studentQuery.results,
    applications,
    refunds: refundQuery.results,
    deliveries: deliveryQuery.results,
    paymentStatus: settings.payment_status ?? "unpaid",
    lastImportSummary: settings.last_import_summary ?? "업체 자료를 업로드해 주세요.",
    updatedAt: new Date().toISOString(),
  };
}

function gradeIsAllowed(grade: number, grades: string) {
  const matches = [...grades.matchAll(/\d/g)].map((match) => Number(match[0]));
  if (matches.length === 0) return true;
  return grade >= Math.min(...matches) && grade <= Math.max(...matches);
}

async function applyCourse(payload: OperationPayload) {
  const db = await database();
  const courseId = number(payload.courseId);
  const studentId = number(payload.studentId || 5);
  const idempotencyKey = String(payload.idempotencyKey ?? "").slice(0, 100);
  if (!courseId || !studentId || !idempotencyKey) throw new Error("신청 정보가 올바르지 않습니다.");

  const duplicateKey = await db.prepare("SELECT id FROM applications WHERE idempotency_key = ?").bind(idempotencyKey).first();
  if (duplicateKey) return;

  const course = await db.prepare("SELECT * FROM courses WHERE id = ?").bind(courseId).first<Record<string, unknown>>();
  const student = await db.prepare("SELECT * FROM students WHERE id = ?").bind(studentId).first<Record<string, unknown>>();
  if (!course || !student) throw new Error("강좌 또는 학생 정보를 찾을 수 없습니다.");
  if (course.status === "마감") throw new Error("마감된 강좌입니다.");
  if (!gradeIsAllowed(number(student.grade), String(course.grades))) throw new Error("신청 가능한 학년이 아닙니다.");

  const existing = await db.prepare("SELECT id FROM applications WHERE course_id = ? AND student_id = ? AND status != '취소'").bind(courseId, studentId).first();
  if (existing) throw new Error("이미 신청한 강좌입니다.");

  const active = await db.prepare("SELECT COUNT(*) AS count FROM applications WHERE course_id = ? AND status NOT IN ('취소', '탈락')").bind(courseId).first<{ count: number }>();
  const waitNumber = Math.max((active?.count ?? 0) - number(course.capacity) + 1, 1);
  const status = (active?.count ?? 0) >= number(course.capacity) ? `대기 ${waitNumber}번` : "접수완료";
  const gross = number(course.tuition) + number(course.textbook) + number(course.materials) + number(course.operating_fee);
  const supportAmount = Math.min(number(student.support_limit), gross);
  const recipient = `${String(student.name)} 보호자`;

  await db.batch([
    db.prepare(`INSERT INTO applications (
      school_id, course_id, student_id, status, source, tuition_snapshot, textbook_snapshot,
      materials_snapshot, operating_snapshot, support_amount, idempotency_key
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(1, courseId, studentId, status, "문자 URL", number(course.tuition), number(course.textbook), number(course.materials), number(course.operating_fee), supportAmount, idempotencyKey),
    db.prepare("UPDATE courses SET applicants = applicants + 1 WHERE id = ?").bind(courseId),
    db.prepare("INSERT INTO deliveries (school_id, title, recipient, channel, status) VALUES (?, ?, ?, ?, ?)")
      .bind(1, status.startsWith("대기") ? "수강신청 대기 접수" : "수강신청 접수 완료", recipient, "알림톡", "발송대기"),
  ]);
}

async function cancelApplication(applicationId: number) {
  const db = await database();
  const application = await db.prepare("SELECT id, course_id AS courseId, status FROM applications WHERE id = ?").bind(applicationId).first<{ id: number; courseId: number; status: string }>();
  if (!application || application.status === "취소") return;
  await db.batch([
    db.prepare("UPDATE applications SET status = '취소' WHERE id = ?").bind(applicationId),
    db.prepare("UPDATE courses SET applicants = MAX(applicants - 1, 0) WHERE id = ?").bind(application.courseId),
  ]);
}

async function importVendorRows(rows: VendorRow[]) {
  const db = await database();
  let matched = 0;
  const unmatched: string[] = [];

  for (const row of rows.slice(0, 1000)) {
    const student = String(row.student ?? "").trim();
    const course = String(row.course ?? "").trim();
    if (!student || !course) continue;
    const application = await db.prepare(`SELECT a.id FROM applications a
      JOIN students s ON s.id = a.student_id JOIN courses c ON c.id = a.course_id
      WHERE s.name = ? AND (c.title = ? OR c.title || ' ' || c.section = ?) AND a.status != '취소'
      ORDER BY a.id DESC LIMIT 1`).bind(student, course, course).first<{ id: number }>();
    if (!application) {
      unmatched.push(`${student} · ${course}`);
      continue;
    }
    await db.prepare("UPDATE applications SET vendor_gross = ?, vendor_support = ?, verified_at = CURRENT_TIMESTAMP WHERE id = ?")
      .bind(number(row.vendorGross), number(row.vendorSupport), application.id).run();
    matched += 1;
  }

  const summary = `업체 자료 ${rows.length}건 · 연결 ${matched}건 · 미연결 ${unmatched.length}건`;
  await db.prepare(`INSERT INTO operation_settings (key, value, updated_at) VALUES ('last_import_summary', ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`).bind(summary).run();
  return { matched, unmatched: unmatched.slice(0, 20), summary };
}

export async function GET() {
  try {
    await initializeDatabase();
    return Response.json(await buildState(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "운영 정보를 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await initializeDatabase();
    const payload = await request.json() as OperationPayload;
    let importSummary: Awaited<ReturnType<typeof importVendorRows>> | undefined;

    if (payload.action === "apply") await applyCourse(payload);
    else if (payload.action === "cancelApplication") await cancelApplication(number(payload.applicationId));
    else if (payload.action === "setCourseStatus") {
      const allowed = ["모집중", "대기접수", "마감"];
      if (!allowed.includes(String(payload.status))) throw new Error("변경할 모집 상태를 확인해 주세요.");
      await (await database()).prepare("UPDATE courses SET status = ? WHERE id = ?").bind(payload.status, number(payload.courseId)).run();
    } else if (payload.action === "approveRefund") {
      await (await database()).prepare("UPDATE refunds SET status = '지급완료' WHERE id = ?").bind(number(payload.refundId)).run();
    } else if (payload.action === "updatePayment") {
      await (await database()).prepare(`INSERT INTO operation_settings (key, value, updated_at) VALUES ('payment_status', ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`).bind(String(payload.paymentStatus ?? "unpaid")).run();
    } else if (payload.action === "importVendorRows") {
      if (!Array.isArray(payload.rows)) throw new Error("업체 자료의 표 구조를 확인해 주세요.");
      importSummary = await importVendorRows(payload.rows);
    } else {
      throw new Error("지원하지 않는 처리 요청입니다.");
    }

    return Response.json({ ...(await buildState()), importSummary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "요청을 처리하지 못했습니다.";
    return Response.json({ error: message }, { status: 400 });
  }
}
