"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  downloadReconciliationWorkbook,
  parseVendorWorkbook,
  type ReconciliationExportRow,
} from "../lib/xlsx";

type Role = "admin" | "guardian";
type PaymentStatus = "unpaid" | "virtual" | "paid" | "refunding" | "refunded";

type School = {
  id: number;
  code: string;
  name: string;
  district: string;
  schoolType: string;
  phone: string;
  address: string;
};

type Course = {
  id: number;
  category: string;
  title: string;
  section: string;
  grades: string;
  schedule: string;
  room: string;
  tuition: number;
  textbook: number;
  materials: number;
  operatingFee: number;
  weeks: number;
  capacity: number;
  applicants: number;
  status: "모집중" | "대기접수" | "마감";
  selectionMethod: string;
  instructor: string;
  accent: string;
};

type Student = {
  id: number;
  name: string;
  grade: number;
  className: string;
  studentNumber: number;
  guardianPhone: string;
  supportType: string | null;
  supportLimit: number;
};

type Application = ReconciliationExportRow & {
  courseId: number;
  studentId: number;
  submittedAt: string;
  source: string;
  supportType: string | null;
  verifiedAt: string | null;
};

type RefundItem = {
  id: number;
  student: string;
  course: string;
  amount: number;
  reason: string;
  status: "승인대기" | "지급완료";
};

type Delivery = {
  id: number;
  title: string;
  recipient: string;
  channel: "알림톡" | "SMS";
  sentAt: string;
  status: "수신완료" | "대체발송" | "발송대기";
};

type OperationsState = {
  school: School;
  courses: Course[];
  students: Student[];
  applications: Application[];
  refunds: RefundItem[];
  deliveries: Delivery[];
  paymentStatus: PaymentStatus;
  lastImportSummary: string;
  updatedAt: string;
  importSummary?: { matched: number; unmatched: string[]; summary: string };
};

type ActionPayload = Record<string, unknown> & { action: string };

const adminMenu = [
  ["dashboard", "운영 대시보드"],
  ["courses", "강좌·모집"],
  ["students", "학생·학부모"],
  ["applications", "수강신청 원장"],
  ["reconciliation", "업체자료 검증"],
  ["support", "지원금·정산"],
  ["refunds", "환불 승인"],
  ["notifications", "문자·알림"],
  ["settings", "학교 설정"],
] as const;

const money = (value: number | null | undefined) =>
  value == null ? "—" : `${Number(value).toLocaleString("ko-KR")}원`;

const displayTime = (value: string) => {
  const parsed = new Date(value.replace(" ", "T") + (value.includes("Z") ? "" : "+09:00"));
  return Number.isNaN(parsed.valueOf())
    ? value
    : new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(parsed);
};

export default function Home() {
  const [role, setRole] = useState<Role>("admin");
  const [section, setSection] = useState("dashboard");
  const [guardianTab, setGuardianTab] = useState("courses");
  const [data, setData] = useState<OperationsState | null>(null);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState("");
  const [loadError, setLoadError] = useState("");

  async function requestOperations() {
    const response = await fetch("/api/operations", { cache: "no-store" });
    const result = await response.json() as OperationsState & { error?: string };
    if (!response.ok) throw new Error(result.error ?? "운영 정보를 불러오지 못했습니다.");
    return result;
  }

  async function loadOperations() {
    setLoadError("");
    try {
      setData(await requestOperations());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "운영 정보를 불러오지 못했습니다.");
    }
  }

  useEffect(() => {
    let active = true;
    void requestOperations().then(
      (result) => { if (active) setData(result); },
      (error: unknown) => { if (active) setLoadError(error instanceof Error ? error.message : "운영 정보를 불러오지 못했습니다."); },
    );
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function runAction(payload: ActionPayload, successMessage: string) {
    try {
      setBusy(payload.action);
      const response = await fetch("/api/operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json() as OperationsState & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "요청을 처리하지 못했습니다.");
      setData(result);
      setToast(successMessage);
      return result;
    } catch (error) {
      setToast(error instanceof Error ? error.message : "요청을 처리하지 못했습니다.");
      return null;
    } finally {
      setBusy("");
    }
  }

  const guardianApplications = useMemo(
    () => data?.applications.filter((application) => application.studentId === 5) ?? [],
    [data],
  );

  if (!data) {
    return (
      <main className="loading-screen">
        <div className="loading-brand"><span className="brand-mark">늘</span><strong>늘봄ON</strong></div>
        {loadError ? (
          <div className="load-error" role="alert">
            <strong>운영 데이터 연결을 확인해 주세요</strong>
            <p>{loadError}</p>
            <button className="primary-button" onClick={() => void loadOperations()}>다시 연결</button>
          </div>
        ) : (
          <><span className="loading-line" /><p>방과후학교 운영 원장을 불러오고 있습니다.</p></>
        )}
      </main>
    );
  }

  return (
    <main className="app-root">
      {role === "admin" ? (
        <AdminApp
          data={data}
          section={section}
          setSection={setSection}
          setRole={setRole}
          runAction={runAction}
          busy={busy}
        />
      ) : (
        <GuardianApp
          data={data}
          applications={guardianApplications}
          tab={guardianTab}
          setTab={setGuardianTab}
          setRole={setRole}
          runAction={runAction}
          busy={busy}
        />
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}

type SharedProps = {
  data: OperationsState;
  runAction: (payload: ActionPayload, successMessage: string) => Promise<OperationsState | null>;
  busy: string;
};

function AdminApp({ data, section, setSection, setRole, runAction, busy }: SharedProps & {
  section: string;
  setSection: (section: string) => void;
  setRole: (role: Role) => void;
}) {
  const label = adminMenu.find(([id]) => id === section)?.[1] ?? "운영 대시보드";
  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => setSection("dashboard")}>
          <span className="brand-mark">늘</span>
          <span><strong>늘봄ON</strong><small>방과후학교 통합운영</small></span>
        </button>
        <nav className="side-nav" aria-label="학교 관리자 메뉴">
          {adminMenu.map(([id, menuLabel], index) => (
            <button key={id} className={section === id ? "active" : ""} onClick={() => setSection(id)}>
              <span className="nav-index">{String(index + 1).padStart(2, "0")}</span>{menuLabel}
              {id === "reconciliation" && data.applications.some((item) => item.verificationStatus !== "검증완료") && <em>!</em>}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="profile-avatar">늘</span>
          <div><strong>늘봄실무사</strong><small>{data.school.name}</small></div>
        </div>
      </aside>
      <section className="admin-main">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark">늘</span><strong>늘봄ON</strong></div>
          <div className="crumb"><span>{data.school.name}</span><b>›</b><strong>{label}</strong></div>
          <div className="top-actions">
            <span className="sync-state"><i /> DB 자동저장</span>
            <select className="term-select" aria-label="운영기수"><option>2026학년도 2기</option></select>
            <button className="role-switch" onClick={() => setRole("guardian")}><span>●</span> 학부모 화면 보기</button>
          </div>
        </header>
        <div className="admin-content">
          {section === "dashboard" && <Dashboard data={data} setSection={setSection} />}
          {section === "courses" && <CourseManagement data={data} runAction={runAction} busy={busy} setRole={setRole} />}
          {section === "students" && <StudentManagement data={data} />}
          {section === "applications" && <ApplicationLedger data={data} />}
          {section === "reconciliation" && <ReconciliationManagement data={data} runAction={runAction} busy={busy} />}
          {section === "support" && <SupportManagement data={data} />}
          {section === "refunds" && <RefundManagement data={data} runAction={runAction} busy={busy} />}
          {section === "notifications" && <NotificationManagement data={data} />}
          {section === "settings" && <SchoolSettings data={data} />}
        </div>
      </section>
    </div>
  );
}

function Dashboard({ data, setSection }: { data: OperationsState; setSection: (section: string) => void }) {
  const needsReview = data.applications.filter((item) => item.verificationStatus !== "검증완료").length;
  const supportTotal = data.applications.reduce((sum, item) => sum + item.systemSupport, 0);
  const finalTotal = data.applications.reduce((sum, item) => sum + item.finalAmount, 0);
  return (
    <>
      <PageIntro eyebrow="2026학년도 2기 · 실시간 원장" title="재입력 없이, 신청부터 정산까지" description="학부모 신청 원장을 기준으로 업체 자료와 지원금을 자동 대조합니다." actions={<button className="primary-button" onClick={() => setSection("reconciliation")}>검증 업무 열기</button>} />
      <div className="stats-grid">
        <StatCard label="개설 강좌" value={String(data.courses.length)} unit="개" detail={`모집중 ${data.courses.filter((item) => item.status !== "마감").length}개`} tone="navy" />
        <StatCard label="수강신청" value={String(data.applications.length)} unit="건" detail="문자 URL 원장" tone="teal" />
        <StatCard label="자동 검증" value={String(data.applications.length - needsReview)} unit="건" detail={`확인필요 ${needsReview}건`} tone={needsReview ? "coral" : "blue"} />
        <StatCard label="교육청 지원" value={(supportTotal / 10000).toFixed(0)} unit="만원" detail="지원금 자동 배분" tone="blue" />
        <StatCard label="최종 부담액" value={(finalTotal / 10000).toFixed(1)} unit="만원" detail="지원금 차감 후" tone="gold" />
      </div>
      <section className="panel workflow-panel">
        <PanelHeader title="업무 흐름" subtitle="같은 신청 원장을 학교·업체가 함께 확인합니다." />
        <div className="workflow-strip">
          {[
            ["01", "학생·강좌 등록", "학교 기본자료"],
            ["02", "문자 URL 발송", "학생별 접근링크"],
            ["03", "학부모 신청", "정원·학년 자동검증"],
            ["04", "업체자료 대조", "금액·인원·지원금"],
            ["05", "학교 확정·제출", "엑셀 자동생성"],
          ].map(([number, title, detail], index) => (
            <article key={number}><span>{number}</span><div><strong>{title}</strong><small>{detail}</small></div>{index < 4 && <b>→</b>}</article>
          ))}
        </div>
      </section>
      <div className="dashboard-grid lower dashboard-spaced">
        <section className="panel table-panel">
          <PanelHeader title="최근 수강신청" subtitle="서버 원장에 저장된 최신 내역" action="전체보기" onAction={() => setSection("applications")} />
          <div className="table-scroll"><table><thead><tr><th>학생</th><th>강좌</th><th>접수경로</th><th>상태</th><th>최종 부담액</th></tr></thead><tbody>{data.applications.slice(0, 5).map((item) => <tr key={item.id}><td><strong>{item.student}</strong><small>{item.grade}</small></td><td>{item.courseTitle} {item.courseSection}</td><td>{item.source}</td><td><StatusBadge status={item.status} /></td><td><strong>{money(item.finalAmount)}</strong></td></tr>)}</tbody></table></div>
        </section>
        <section className="panel attention-panel">
          <PanelHeader title="담당자 확인" subtitle="자동검증에서 발견한 차이" />
          <div className="attention-list">
            {data.applications.filter((item) => item.verificationStatus !== "검증완료").slice(0, 4).map((item) => <button key={item.id} onClick={() => setSection("reconciliation")}><span>!</span><div><strong>{item.student} · {item.courseTitle}</strong><small>{item.issues.join(" · ")}</small></div><b>›</b></button>)}
            {needsReview === 0 && <div className="all-clear"><span>✓</span><strong>확인할 차이가 없습니다</strong></div>}
          </div>
        </section>
      </div>
    </>
  );
}

function CourseManagement({ data, runAction, busy, setRole }: SharedProps & { setRole: (role: Role) => void }) {
  return (
    <>
      <PageIntro eyebrow="개설강좌 · 비용 원장" title="강좌·모집 관리" description="수강료, 교재비, 재료비, 수용비, 주수, 정원을 한 번만 등록합니다." actions={<><button className="secondary-button" onClick={() => setRole("guardian")}>학부모 신청 화면</button><button className="primary-button">+ 강좌 등록</button></>} />
      <section className="panel table-panel">
        <div className="table-scroll"><table><thead><tr><th>강좌</th><th>일정·대상</th><th>비용 구성</th><th>정원</th><th>선발</th><th>모집상태</th><th /></tr></thead><tbody>{data.courses.map((course) => {
          const total = course.tuition + course.textbook + course.materials + course.operatingFee;
          return <tr key={course.id}><td><div className="course-cell"><span className={`course-symbol ${course.accent}`}>{course.title[0]}</span><div><strong>{course.title} {course.section}</strong><small>{course.room} · {course.instructor} 강사</small></div></div></td><td><strong>{course.schedule}</strong><small>{course.grades} · {course.weeks}주</small></td><td><strong>{money(total)}</strong><small>수강 {money(course.tuition)} · 교재 {money(course.textbook)} · 재료 {money(course.materials)} · 수용 {money(course.operatingFee)}</small></td><td><strong>{course.applicants} / {course.capacity}명</strong><small>{Math.max(course.capacity - course.applicants, 0)}자리</small></td><td>{course.selectionMethod}</td><td><StatusBadge status={course.status} /></td><td><button className={course.status === "마감" ? "row-action primary" : "row-action"} disabled={busy === "setCourseStatus"} onClick={() => void runAction({ action: "setCourseStatus", courseId: course.id, status: course.status === "마감" ? "모집중" : "마감" }, course.status === "마감" ? "학부모 화면의 ‘마감’ 버튼이 ‘신청하기’로 변경됐습니다." : "강좌 모집을 마감했습니다.")}>{course.status === "마감" ? "신청 열기" : "마감 전환"}</button></td></tr>;
        })}</tbody></table></div>
      </section>
    </>
  );
}

function StudentManagement({ data }: { data: OperationsState }) {
  return (
    <>
      <PageIntro eyebrow="전교 학생 기본정보" title="학생·학부모" description="학생별 문자 URL 발송과 지원금 판정에 쓰이는 최소 정보만 관리합니다." actions={<button className="primary-button">학생명부 업로드</button>} />
      <div className="stats-grid compact"><StatCard label="등록 학생" value={String(data.students.length)} unit="명" detail="운영 표본 원장" tone="navy" /><StatCard label="보호자 연락처" value="100" unit="%" detail="형식 확인 완료" tone="teal" /><StatCard label="지원 대상" value={String(data.students.filter((item) => item.supportLimit > 0).length)} unit="명" detail="지원한도 연결" tone="blue" /><StatCard label="문자 링크" value="5" unit="건" detail="학생별 발급" tone="gold" /></div>
      <section className="panel table-panel"><div className="table-scroll"><table><thead><tr><th>학생</th><th>학년·반·번호</th><th>보호자 휴대폰</th><th>지원 구분</th><th>지원 한도</th><th>접근 링크</th></tr></thead><tbody>{data.students.map((student) => <tr key={student.id}><td><strong>{student.name}</strong></td><td>{student.grade}학년 {student.className} {student.studentNumber}번</td><td>{student.guardianPhone.replace(/(\d{3})-(\d{4})-(\d{4})/, "$1-****-$3")}</td><td>{student.supportType ?? "일반"}</td><td><strong>{money(student.supportLimit)}</strong></td><td><span className="status-badge success">발급 가능</span></td></tr>)}</tbody></table></div></section>
    </>
  );
}

function ApplicationLedger({ data }: { data: OperationsState }) {
  const total = data.applications.reduce((sum, item) => sum + item.systemGross, 0);
  return (
    <>
      <PageIntro eyebrow="단일 수강신청 원장" title="수강신청 원장" description="업체 다운로드 파일과 학교 확인표가 갈라지지 않도록 신청 시점의 비용을 보존합니다." />
      <div className="stats-grid compact"><StatCard label="전체 신청" value={String(data.applications.length)} unit="건" detail="취소 제외" tone="navy" /><StatCard label="확정" value={String(data.applications.filter((item) => item.status === "수강확정").length)} unit="건" detail="수강생 명부 반영" tone="teal" /><StatCard label="대기" value={String(data.applications.filter((item) => item.status.includes("대기")).length)} unit="건" detail="자동 순번" tone="gold" /><StatCard label="신청 총액" value={(total / 10000).toFixed(1)} unit="만원" detail="비용 스냅샷" tone="blue" /></div>
      <section className="panel table-panel"><div className="table-scroll"><table><thead><tr><th>신청번호</th><th>학생</th><th>강좌</th><th>신청시각·경로</th><th>상태</th><th>교육비</th><th>지원금</th><th>최종 부담액</th></tr></thead><tbody>{data.applications.map((item) => <tr key={item.id}><td><code>APP-{String(item.id).padStart(5, "0")}</code></td><td><strong>{item.student}</strong><small>{item.grade}</small></td><td><strong>{item.courseTitle} {item.courseSection}</strong></td><td>{displayTime(item.submittedAt)}<small>{item.source}</small></td><td><StatusBadge status={item.status} /></td><td>{money(item.systemGross)}</td><td className="teal-text">− {money(item.systemSupport)}</td><td><strong>{money(item.finalAmount)}</strong></td></tr>)}</tbody></table></div></section>
    </>
  );
}

function ReconciliationManagement({ data, runAction, busy }: SharedProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const needsReview = data.applications.filter((item) => item.verificationStatus !== "검증완료");
  const matched = data.applications.length - needsReview.length;

  async function handleFile(file: File | undefined) {
    if (!file) return;
    try {
      const rows = parseVendorWorkbook(await file.arrayBuffer(), file.name);
      const result = await runAction({ action: "importVendorRows", rows }, `${rows.length}건을 읽어 시스템 원장과 대조했습니다.`);
      if (result?.importSummary?.unmatched.length) {
        window.setTimeout(() => window.alert(`미연결 항목\n${result.importSummary?.unmatched.join("\n")}`), 0);
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "파일을 읽지 못했습니다.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <PageIntro eyebrow="업체자료 → 학교 자동대조" title="업체자료 검증" description="인원수·수강료·교재비·재료비·수용비와 교육청 지원금을 신청 원장 기준으로 확인합니다." actions={<><input ref={inputRef} className="visually-hidden" type="file" accept=".xlsx,.csv" onChange={(event) => void handleFile(event.target.files?.[0])} /><button className="secondary-button" disabled={busy === "importVendorRows"} onClick={() => inputRef.current?.click()}>{busy === "importVendorRows" ? "대조 중…" : "업체 엑셀 업로드"}</button><button className="primary-button" onClick={() => downloadReconciliationWorkbook(data.school.name, data.applications)}>교육청용 엑셀 내려받기</button></>} />
      <div className="import-banner"><span>↥</span><div><strong>{data.lastImportSummary}</strong><p>XLSX·CSV의 학생명, 강좌명, 총액, 지원금 열을 자동으로 연결합니다.</p></div><span className="status-badge info">DB 원장 기준</span></div>
      <div className="stats-grid compact"><StatCard label="대조 대상" value={String(data.applications.length)} unit="건" detail="업체 제출 범위" tone="navy" /><StatCard label="자동 일치" value={String(matched)} unit="건" detail="금액·지원금 일치" tone="teal" /><StatCard label="확인 필요" value={String(needsReview.length)} unit="건" detail="차이 사유 표시" tone={needsReview.length ? "coral" : "blue"} /><StatCard label="최종 부담액" value={(data.applications.reduce((sum, item) => sum + item.finalAmount, 0) / 10000).toFixed(1)} unit="만원" detail="지원금 차감 후" tone="gold" /></div>
      <section className="panel table-panel reconciliation-table"><div className="table-scroll"><table><thead><tr><th>학생·강좌</th><th>시스템 교육비</th><th>업체 교육비</th><th>시스템 지원금</th><th>업체 지원금</th><th>최종 부담액</th><th>검증결과</th></tr></thead><tbody>{data.applications.map((item) => <tr key={item.id} className={item.verificationStatus === "검증완료" ? "" : "review-row"}><td><strong>{item.student} · {item.courseTitle}</strong><small>{item.grade} · {item.courseSection}</small></td><td>{money(item.systemGross)}</td><td className={item.vendorGross !== item.systemGross ? "difference" : ""}>{money(item.vendorGross)}</td><td>{money(item.systemSupport)}</td><td className={item.vendorSupport !== item.systemSupport ? "difference" : ""}>{money(item.vendorSupport)}</td><td><strong>{money(item.finalAmount)}</strong></td><td><StatusBadge status={item.verificationStatus} /><small>{item.issues.join(" · ") || "모든 항목 일치"}</small></td></tr>)}</tbody></table></div></section>
    </>
  );
}

function SupportManagement({ data }: { data: OperationsState }) {
  const supportTotal = data.applications.reduce((sum, item) => sum + item.systemSupport, 0);
  return (
    <>
      <PageIntro eyebrow="교육청 지원금·감면" title="지원금·정산" description="학생 자격과 강좌 비용을 연결해 지원금, 본인부담액, 업체 지급액을 자동 계산합니다." actions={<button className="primary-button" onClick={() => downloadReconciliationWorkbook(data.school.name, data.applications)}>정산 엑셀 내려받기</button>} />
      <div className="stats-grid compact"><StatCard label="지원 신청" value={String(data.applications.filter((item) => item.systemSupport > 0).length)} unit="건" detail="자격 연결 완료" tone="blue" /><StatCard label="지원금 합계" value={(supportTotal / 10000).toFixed(0)} unit="만원" detail="교육청 지원" tone="teal" /><StatCard label="본인 부담" value={(data.applications.reduce((sum, item) => sum + item.finalAmount, 0) / 10000).toFixed(1)} unit="만원" detail="가정 청구액" tone="gold" /><StatCard label="오류 검증" value={String(data.applications.filter((item) => item.issues.some((issue) => issue.includes("지원금"))).length)} unit="건" detail="업체자료 차이" tone="coral" /></div>
      <section className="panel table-panel"><div className="table-scroll"><table><thead><tr><th>학생</th><th>지원 구분</th><th>강좌</th><th>교육비</th><th>지원금</th><th>본인 부담</th><th>검증</th></tr></thead><tbody>{data.applications.map((item) => <tr key={item.id}><td><strong>{item.student}</strong><small>{item.grade}</small></td><td>{item.supportType ?? "일반"}</td><td>{item.courseTitle}</td><td>{money(item.systemGross)}</td><td className="teal-text"><strong>{money(item.systemSupport)}</strong></td><td><strong>{money(item.finalAmount)}</strong></td><td><StatusBadge status={item.issues.some((issue) => issue.includes("지원금")) ? "확인필요" : "검증완료"} /></td></tr>)}</tbody></table></div></section>
    </>
  );
}

function RefundManagement({ data, runAction, busy }: SharedProps) {
  return (
    <>
      <PageIntro eyebrow="산식 보존·승인 이력" title="환불 승인" description="수업 진행분과 사용 재료비를 차감한 산식은 원장에 남기고 승인 후 지급합니다." />
      <section className="panel table-panel"><div className="table-scroll"><table><thead><tr><th>학생</th><th>강좌</th><th>사유</th><th>예상 환불액</th><th>상태</th><th /></tr></thead><tbody>{data.refunds.map((refund) => <tr key={refund.id}><td><strong>{refund.student}</strong></td><td>{refund.course}</td><td>{refund.reason}</td><td><strong>{money(refund.amount)}</strong><small>산식 확인 완료</small></td><td><StatusBadge status={refund.status} /></td><td>{refund.status === "승인대기" && <button className="row-action primary" disabled={busy === "approveRefund"} onClick={() => void runAction({ action: "approveRefund", refundId: refund.id }, "환불 승인과 지급 상태를 저장했습니다.")}>승인·지급</button>}</td></tr>)}</tbody></table></div></section>
    </>
  );
}

function NotificationManagement({ data }: { data: OperationsState }) {
  return (
    <>
      <PageIntro eyebrow="문자 URL·알림톡" title="문자·알림" description="신청 링크 발송, 접수, 확정, 납부, 환불 알림의 요청과 결과를 보존합니다." actions={<button className="primary-button">학생별 링크 발송</button>} />
      <div className="notification-grid"><section className="panel"><PanelHeader title="발송 원칙" subtitle="실패 시 SMS로 자동 대체" /><div className="policy-list"><p><span>1</span><strong>학생별 난수 URL</strong><small>휴대폰번호로 수신한 학생만 접근</small></p><p><span>2</span><strong>신청 결과 자동발송</strong><small>접수·대기·확정 상태를 즉시 안내</small></p><p><span>3</span><strong>발송결과 원장</strong><small>성공·실패·재시도 이력 보존</small></p></div></section><section className="panel"><PanelHeader title="최근 발송" subtitle="업무 처리와 함께 생성된 알림" /><div className="delivery-list">{data.deliveries.map((delivery) => <div key={delivery.id}><span className={delivery.channel === "알림톡" ? "delivery-channel kakao" : "delivery-channel sms"}>{delivery.channel === "알림톡" ? "T" : "S"}</span><div><strong>{delivery.title}</strong><p>{delivery.recipient} · {displayTime(delivery.sentAt)}</p></div><StatusBadge status={delivery.status} /></div>)}</div></section></div>
    </>
  );
}

function SchoolSettings({ data }: { data: OperationsState }) {
  return (
    <>
      <PageIntro eyebrow="학교이름.xlsx 연계" title="학교 설정" description="서울 학교 기본정보의 행정표준코드와 관할 교육지원청을 운영 원장에 연결했습니다." />
      <section className="school-profile panel"><div className="school-monogram">서</div><div><p className="eyebrow">행정표준코드 {data.school.code}</p><h2>{data.school.name}</h2><p>{data.school.district} · {data.school.schoolType}</p></div><span className="status-badge success">학교정보 연결</span></section>
      <div className="settings-grid"><article className="panel setting-card"><span>⌂</span><div><strong>주소</strong><p>{data.school.address}</p></div></article><article className="panel setting-card"><span>☎</span><div><strong>대표전화</strong><p>{data.school.phone}</p></div></article><article className="panel setting-card"><span>DB</span><div><strong>운영 원장</strong><p>서버 DB 자동저장</p></div></article><article className="panel setting-card"><span>XLS</span><div><strong>교육청 제출</strong><p>XLSX 자동생성</p></div></article></div>
    </>
  );
}

function GuardianApp({ data, applications, tab, setTab, setRole, runAction, busy }: SharedProps & {
  applications: Application[];
  tab: string;
  setTab: (tab: string) => void;
  setRole: (role: Role) => void;
}) {
  const tabs = [["courses", "수강신청"], ["applications", "신청확인"], ["payment", "결제·환불"], ["alerts", "알림"]];
  return (
    <div className="guardian-shell">
      <header className="guardian-header">
        <button className="brand guardian-brand" onClick={() => setTab("courses")}><span className="brand-mark">늘</span><span><strong>늘봄ON</strong><small>{data.school.name}</small></span></button>
        <nav className="guardian-tabs" aria-label="학부모 메뉴">{tabs.map(([id, label]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}{id === "alerts" && <i>{data.deliveries.filter((item) => item.recipient.includes("김하윤")).length}</i>}</button>)}</nav>
        <button className="role-switch guardian-role" onClick={() => setRole("admin")}>학교 관리자 화면 ↗</button>
      </header>
      <div className="guardian-content">
        <section className="child-hero"><div className="child-avatar">김</div><div><p className="eyebrow">수강신청 대상 학생</p><h1>김하윤 <span>2학년 3반 12번</span></h1><p>{data.school.name} · 2026학년도 2기 · 신청기간 7월 17일 09:00–7월 24일 17:00</p></div><div className="period-badge"><span className="live-dot">신청중</span><strong>D–7</strong></div></section>
        {tab === "courses" && <GuardianCourses data={data} applications={applications} runAction={runAction} busy={busy} setTab={setTab} />}
        {tab === "applications" && <GuardianApplications data={data} applications={applications} runAction={runAction} busy={busy} setTab={setTab} />}
        {tab === "payment" && <GuardianPayment data={data} applications={applications} runAction={runAction} busy={busy} />}
        {tab === "alerts" && <GuardianAlerts data={data} />}
      </div>
      <nav className="mobile-bottom-nav" aria-label="모바일 학부모 메뉴">{tabs.map(([id, label], index) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}><span>{["⌕", "✓", "₩", "●"][index]}</span>{label}</button>)}</nav>
    </div>
  );
}

function GuardianCourses({ data, applications, runAction, busy, setTab }: SharedProps & { applications: Application[]; setTab: (tab: string) => void }) {
  const [category, setCategory] = useState("전체");
  const [query, setQuery] = useState("");
  const categories = ["전체", ...Array.from(new Set(data.courses.map((course) => course.category)))];
  const filtered = data.courses.filter((course) => (category === "전체" || course.category === category) && `${course.title} ${course.schedule} ${course.category}`.toLowerCase().includes(query.toLowerCase()));
  async function apply(course: Course) {
    const result = await runAction({ action: "apply", courseId: course.id, studentId: 5, idempotencyKey: crypto.randomUUID() }, course.applicants >= course.capacity ? "대기 신청이 접수됐습니다." : "수강신청이 접수됐습니다.");
    if (result) setTab("applications");
  }
  return (
    <>
      <div className="guardian-title"><div><p className="eyebrow">수강신청</p><h2>신청할 강좌를 선택하세요</h2><p>대상학년, 정원, 비용을 확인한 뒤 ‘신청하기’를 눌러 주세요.</p></div><label className="search-box large">⌕<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="강좌명, 요일, 분야 검색" /></label></div>
      <div className="category-scroll">{categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div>
      <div className="guardian-course-grid">{filtered.map((course) => {
        const applied = applications.some((item) => item.courseId === course.id);
        const full = course.applicants >= course.capacity;
        const closed = course.status === "마감";
        const total = course.tuition + course.textbook + course.materials + course.operatingFee;
        const buttonLabel = applied ? "신청 완료" : closed ? "마감" : full ? "대기 신청" : "신청하기";
        return <article className="guardian-course-card" key={course.id}><div className={`course-cover ${course.accent}`}><span>{course.category}</span><strong>{course.title[0]}</strong><small>{course.section}</small></div><div className="course-card-body"><div className="course-meta"><span>{course.grades}</span><span>{course.schedule}</span><span>{course.selectionMethod}</span></div><h3>{course.title}</h3><p>{course.room} · {course.instructor} 강사 · {course.weeks}주</p><div className="course-fee"><strong>{money(total)}</strong><span>수강·교재·재료·수용비 합계</span></div><div className="course-capacity"><span><strong>{course.applicants}</strong> / {course.capacity}명</span><i><b style={{ width: `${Math.min(course.applicants / course.capacity * 100, 100)}%` }} /></i><em>{closed ? "모집 마감" : full ? "대기 접수" : `${course.capacity - course.applicants}자리`}</em></div><button className={applied || closed ? "apply-button applied" : full ? "apply-button wait" : "apply-button"} disabled={applied || closed || busy === "apply"} onClick={() => void apply(course)}>{busy === "apply" && !applied ? "처리 중…" : buttonLabel}</button></div></article>;
      })}</div>
    </>
  );
}

function GuardianApplications({ data, applications, runAction, busy, setTab }: SharedProps & { applications: Application[]; setTab: (tab: string) => void }) {
  const total = applications.reduce((sum, item) => sum + item.systemGross, 0);
  const support = applications.reduce((sum, item) => sum + item.systemSupport, 0);
  return (
    <>
      <div className="guardian-title"><div><p className="eyebrow">신청확인</p><h2>신청 강좌를 확인하세요</h2><p>최종 선발 뒤 지원금을 반영한 청구서가 발행됩니다.</p></div></div>
      {applications.length === 0 ? <div className="empty-state"><strong>아직 신청한 강좌가 없어요</strong><p>수강신청 탭에서 신청하기 버튼을 눌러 주세요.</p></div> : <div className="application-layout"><section className="application-stack">{applications.map((application) => {
        const course = data.courses.find((item) => item.id === application.courseId);
        if (!course) return null;
        return <article className="application-card" key={application.id}><span className={`course-symbol ${course.accent}`}>{course.title[0]}</span><div><div className="course-meta"><span>{course.category}</span><span>{course.grades}</span></div><h3>{course.title} {course.section}</h3><p>{course.schedule} · {course.room}</p><small>접수 {displayTime(application.submittedAt)} · {application.source}</small></div><div className="application-status"><StatusBadge status={application.status} /><strong>{money(application.finalAmount)}</strong><button disabled={busy === "cancelApplication"} onClick={() => void runAction({ action: "cancelApplication", applicationId: application.id }, "신청을 취소했습니다.")}>신청 취소</button></div></article>;
      })}</section><aside className="summary-card"><p className="eyebrow">예상 신청총액</p><strong>{money(Math.max(total - support, 0))}</strong><span>{applications.length}개 강좌 · 지원금 반영</span><div><p><span>교육비 합계</span><b>{money(total)}</b></p><p><span>교육청 지원</span><b>− {money(support)}</b></p></div><button className="primary-button full" onClick={() => setTab("payment")}>결제·환불 보기</button><small>선발 결과에 따라 실제 청구액이 달라질 수 있습니다.</small></aside></div>}
    </>
  );
}

function GuardianPayment({ data, applications, runAction, busy }: SharedProps & { applications: Application[] }) {
  const [method, setMethod] = useState<"bank" | "virtual">("bank");
  const total = applications.reduce((sum, item) => sum + item.finalAmount, 0);
  if (applications.length === 0) return <div className="empty-state"><strong>결제할 신청내역이 없어요</strong><p>강좌를 먼저 신청해 주세요.</p></div>;
  return (
    <>
      <div className="guardian-title"><div><p className="eyebrow">지원금 반영 청구서</p><h2>결제·환불</h2><p>금융기관 연동 전에는 운영 검증용 상태로 처리됩니다.</p></div></div>
      <div className="payment-layout"><section className="panel payment-card"><div className="invoice-title"><div><p className="eyebrow">청구서 INV-2026-2-0005</p><h3>2026학년도 2기 방과후학교</h3></div><StatusBadge status={data.paymentStatus === "unpaid" ? "납부대기" : data.paymentStatus === "virtual" ? "입금대기" : "납부완료"} /></div><div className="invoice-lines"><p><span>최종 부담액</span><strong>{money(total)}</strong></p><p><span>학생</span><strong>김하윤</strong></p><p className="invoice-total"><span>납부할 금액</span><strong>{money(total)}</strong></p></div>{data.paymentStatus === "unpaid" && <><p className="field-label">납부수단</p><div className="payment-methods"><button className={method === "bank" ? "selected" : ""} onClick={() => setMethod("bank")}><span className="mini-icon">₩</span><strong>실시간 계좌이체</strong><small>PG 계약 후 연동</small><i /></button><button className={method === "virtual" ? "selected" : ""} onClick={() => setMethod("virtual")}><span className="mini-icon">#</span><strong>학생별 가상계좌</strong><small>입금 웹훅 확인</small><i /></button></div><button className="primary-button full pay-button" disabled={busy === "updatePayment"} onClick={() => void runAction({ action: "updatePayment", paymentStatus: method === "virtual" ? "virtual" : "paid" }, method === "virtual" ? "가상계좌 발급 상태를 저장했습니다." : "납부 상태를 저장했습니다.")}>{money(total)} 납부하기</button><p className="safe-note">실제 금융 거래는 PG·은행 계약키를 연결한 뒤 활성화됩니다.</p></>}{data.paymentStatus === "virtual" && <div className="virtual-account-card"><p>운영 검증용 가상계좌</p><strong>신한은행 562-910-483821</strong><span>예금주 {data.school.name}(김하윤)</span><small>입금 웹훅 대기</small><button className="primary-button full" onClick={() => void runAction({ action: "updatePayment", paymentStatus: "paid" }, "입금 확인 상태를 저장했습니다.")}>입금 확인 처리</button></div>}{data.paymentStatus === "paid" && <div className="paid-actions"><div className="success-circle">✓</div><h3>납부가 완료됐습니다</h3><p>영수증과 납부완료 알림을 발송할 수 있습니다.</p></div>}</section><aside className="panel payment-help"><span className="help-mark">!</span><h3>운영 연결 필요</h3><ul><li>실시간 계좌이체 PG 계약키</li><li>가상계좌 입금 웹훅</li><li>환불 지급 API</li><li>문자·알림톡 발송키</li></ul></aside></div>
    </>
  );
}

function GuardianAlerts({ data }: { data: OperationsState }) {
  const deliveries = data.deliveries.filter((item) => item.recipient.includes("김하윤"));
  return <><div className="guardian-title"><div><p className="eyebrow">신청 처리 알림</p><h2>알림 내역</h2><p>접수부터 납부·환불까지 처리 상태를 확인합니다.</p></div></div><section className="alerts-stack">{deliveries.length === 0 ? <div className="empty-state"><strong>새로운 알림이 없어요</strong></div> : deliveries.map((delivery) => <article className="alert-card" key={delivery.id}><span className={delivery.channel === "알림톡" ? "delivery-channel kakao" : "delivery-channel sms"}>{delivery.channel === "알림톡" ? "T" : "S"}</span><div><span>{delivery.channel} · {displayTime(delivery.sentAt)}</span><h3>{delivery.title}</h3><p>김하윤 학생의 방과후학교 처리 결과입니다.</p></div><StatusBadge status={delivery.status} /></article>)}</section></>;
}

function PageIntro({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: React.ReactNode }) {
  return <header className="page-intro"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>{actions && <div className="intro-actions">{actions}</div>}</header>;
}

function StatCard({ label, value, unit, detail, tone }: { label: string; value: string; unit: string; detail: string; tone: string }) {
  return <article className={`stat-card ${tone}`}><div className="stat-top"><span>{label}</span><i /></div><div className="stat-value"><strong>{value}</strong><b>{unit}</b></div><p>{detail}</p></article>;
}

function PanelHeader({ title, subtitle, action, onAction }: { title: string; subtitle: string; action?: string; onAction?: () => void }) {
  return <header className="panel-header"><div><h2>{title}</h2><p>{subtitle}</p></div>{action && <button onClick={onAction}>{action} <span>→</span></button>}</header>;
}

function StatusBadge({ status }: { status: string }) {
  const warning = status.includes("대기") || status.includes("확인") || status.includes("마감") || status.includes("발송대기");
  const danger = status.includes("불일치") || status.includes("반려");
  const info = status.includes("접수") || status.includes("모집중");
  return <span className={`status-badge ${danger ? "danger" : warning ? "warning" : info ? "info" : "success"}`}>{status}</span>;
}
