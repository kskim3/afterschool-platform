"use client";

import { useEffect, useMemo, useState } from "react";

type Role = "admin" | "guardian";
type PaymentStatus = "unpaid" | "virtual" | "paid" | "refunding" | "refunded";

type Course = {
  id: number;
  category: string;
  title: string;
  section: string;
  grades: string;
  schedule: string;
  room: string;
  tuition: number;
  materials: number;
  capacity: number;
  applicants: number;
  status: "모집중" | "대기접수" | "마감";
  instructor: string;
  accent: string;
};

type Application = {
  id: number;
  courseId: number;
  student: string;
  grade: string;
  submittedAt: string;
  status: "접수완료" | "대기 1번" | "수강확정";
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

const money = (value: number) => `${value.toLocaleString("ko-KR")}원`;

const initialCourses: Course[] = [
  {
    id: 1,
    category: "교과",
    title: "생각이 자라는 창의수학",
    section: "A반",
    grades: "1–2학년",
    schedule: "월 13:20–14:40",
    room: "창의실",
    tuition: 78000,
    materials: 10000,
    capacity: 24,
    applicants: 19,
    status: "모집중",
    instructor: "김하늘",
    accent: "mint",
  },
  {
    id: 2,
    category: "예체능",
    title: "신나는 방송댄스",
    section: "A반",
    grades: "1–3학년",
    schedule: "수 13:30–14:50",
    room: "다목적실",
    tuition: 72000,
    materials: 0,
    capacity: 20,
    applicants: 20,
    status: "대기접수",
    instructor: "이지아",
    accent: "coral",
  },
  {
    id: 3,
    category: "디지털",
    title: "처음 만나는 로봇 코딩",
    section: "A반",
    grades: "3–4학년",
    schedule: "목 14:40–16:00",
    room: "컴퓨터실",
    tuition: 90000,
    materials: 25000,
    capacity: 22,
    applicants: 17,
    status: "모집중",
    instructor: "박도윤",
    accent: "blue",
  },
  {
    id: 4,
    category: "체육",
    title: "튼튼 음악줄넘기",
    section: "B반",
    grades: "3–6학년",
    schedule: "금 14:50–16:10",
    room: "체육관",
    tuition: 78000,
    materials: 0,
    capacity: 25,
    applicants: 21,
    status: "모집중",
    instructor: "정유진",
    accent: "yellow",
  },
  {
    id: 5,
    category: "과학·창의",
    title: "꼬마 과학자 실험실",
    section: "A반",
    grades: "1–2학년",
    schedule: "화 13:20–14:40",
    room: "과학실",
    tuition: 84000,
    materials: 18000,
    capacity: 20,
    applicants: 14,
    status: "모집중",
    instructor: "최서윤",
    accent: "purple",
  },
  {
    id: 6,
    category: "예체능",
    title: "상상 톡톡 창의미술",
    section: "B반",
    grades: "3–6학년",
    schedule: "수 14:50–16:10",
    room: "미술실",
    tuition: 76000,
    materials: 15000,
    capacity: 24,
    applicants: 18,
    status: "모집중",
    instructor: "오민지",
    accent: "pink",
  },
];

const initialApplications: Application[] = [
  { id: 101, courseId: 3, student: "이서준", grade: "3-2", submittedAt: "오늘 09:14", status: "수강확정" },
  { id: 102, courseId: 1, student: "한지우", grade: "2-1", submittedAt: "오늘 09:07", status: "접수완료" },
  { id: 103, courseId: 2, student: "윤도현", grade: "1-3", submittedAt: "오늘 08:58", status: "대기 1번" },
  { id: 104, courseId: 4, student: "김채원", grade: "4-2", submittedAt: "어제 16:42", status: "수강확정" },
];

const initialRefunds: RefundItem[] = [
  { id: 201, student: "김채원", course: "튼튼 음악줄넘기 B반", amount: 52000, reason: "개인 일정", status: "승인대기" },
  { id: 202, student: "박민준", course: "영어뮤지컬 A반", amount: 68000, reason: "전학", status: "승인대기" },
];

const initialDeliveries: Delivery[] = [
  { id: 301, title: "2026-1기 모집 시작", recipient: "1,024명", channel: "알림톡", sentAt: "오늘 08:30", status: "수신완료" },
  { id: 302, title: "수강신청 접수 완료", recipient: "한지우 보호자", channel: "알림톡", sentAt: "오늘 09:07", status: "수신완료" },
  { id: 303, title: "가상계좌 납부 안내", recipient: "윤도현 보호자", channel: "SMS", sentAt: "어제 17:02", status: "대체발송" },
];

const adminMenu = [
  ["dashboard", "대시보드"],
  ["term", "학기·운영기간"],
  ["courses", "프로그램·강좌"],
  ["students", "학생·학부모"],
  ["applications", "수강신청"],
  ["payments", "결제·수납"],
  ["refunds", "환불"],
  ["attendance", "출결"],
  ["instructors", "강사"],
  ["operations", "수업운영"],
  ["settlement", "강사료·업체정산"],
  ["support", "지원금·감면"],
  ["surveys", "설문·평가"],
  ["notifications", "알림톡·민원"],
  ["reports", "통계·보고서"],
  ["submissions", "자료제출·승인"],
  ["notices", "공지·업무연락"],
  ["settings", "학교설정"],
] as const;

const moduleDetails: Record<string, { title: string; eyebrow: string; cards: [string, string, string][] }> = {
  term: { title: "학기·운영기간", eyebrow: "2026학년도", cards: [["현재 운영기수", "1학기 1기", "운영 중"], ["추가모집", "3월 9–11일", "예정"], ["수강기간", "3월 16–5월 29일", "10주"]] },
  students: { title: "학생·학부모", eyebrow: "재적 및 보호자", cards: [["재적 학생", "1,024명", "동기화 완료"], ["보호자 연결", "97.8%", "22명 확인 필요"], ["개인정보 동의", "99.1%", "9명 미동의"]] },
  instructors: { title: "강사 관리", eyebrow: "계약·자격·배정", cards: [["등록 강사", "31명", "활동 28명"], ["서류 만료 예정", "2건", "30일 이내"], ["미배정 강좌", "1개", "처리 필요"]] },
  operations: { title: "수업운영", eyebrow: "계획·일지·보강", cards: [["오늘 수업", "18회", "정상 운영"], ["보강 예정", "3회", "이번 주"], ["수업일지 미제출", "4건", "확인 필요"]] },
  settlement: { title: "강사료·업체정산", eyebrow: "2026년 3월", cards: [["지급 예정", "12,480,000원", "31명"], ["확정 출강", "286시간", "검수 완료"], ["업체 정산", "2건", "승인 대기"]] },
  support: { title: "지원금·감면", eyebrow: "자유수강권", cards: [["지원 학생", "86명", "승인"], ["배정액", "18,200,000원", "연간"], ["사용률", "31.4%", "정상"]] },
  surveys: { title: "설문·평가", eyebrow: "만족도와 수요", cards: [["진행 설문", "2개", "학부모·학생"], ["응답률", "68.2%", "전주 +12%"], ["평균 만족도", "4.62", "5점 만점"]] },
  reports: { title: "통계·보고서", eyebrow: "운영 데이터 자동 집계", cards: [["전체 참여율", "47.5%", "전년 +3.2%"], ["평균 출석률", "94.8%", "안정"], ["폐강률", "3.8%", "목표 이내"]] },
  submissions: { title: "자료제출·승인", eyebrow: "교육지원청 보고", cards: [["제출 예정", "2건", "3월 31일"], ["승인 완료", "4건", "이번 학기"], ["보완 요청", "0건", "없음"]] },
  notices: { title: "공지·업무연락", eyebrow: "학교·교육지원청", cards: [["새 지침", "3건", "이번 주"], ["업무 요청", "1건", "답변 필요"], ["학교 공지", "8건", "게시 중"]] },
  settings: { title: "학교설정", eyebrow: "운영 기준", cards: [["알림톡 발신프로필", "승인", "정상"], ["PG 연동", "테스트", "정상"], ["담당자", "4명", "권한 적용"]] },
};

export default function Home() {
  const [role, setRole] = useState<Role>("admin");
  const [section, setSection] = useState("dashboard");
  const [guardianTab, setGuardianTab] = useState("courses");
  const [category, setCategory] = useState("전체");
  const [courses, setCourses] = useState(initialCourses);
  const [applications, setApplications] = useState(initialApplications);
  const [refunds, setRefunds] = useState(initialRefunds);
  const [deliveries, setDeliveries] = useState(initialDeliveries);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("unpaid");
  const [paymentMethod, setPaymentMethod] = useState<"bank" | "virtual">("bank");
  const [showRefund, setShowRefund] = useState(false);
  const [toast, setToast] = useState("");
  const [ready, setReady] = useState(false);

  const guardianApplications = applications.filter((application) => application.student === "김하윤");
  const guardianCourses = guardianApplications
    .map((application) => courses.find((course) => course.id === application.courseId))
    .filter(Boolean) as Course[];
  const guardianTotal = guardianCourses.reduce((sum, course) => sum + course.tuition + course.materials, 0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem("afterschool-demo-v1");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.courses) setCourses(parsed.courses);
          if (parsed.applications) setApplications(parsed.applications);
          if (parsed.refunds) setRefunds(parsed.refunds);
          if (parsed.deliveries) setDeliveries(parsed.deliveries);
          if (parsed.paymentStatus) setPaymentStatus(parsed.paymentStatus);
        }
      } catch {
        // A corrupt local demo state falls back to the seeded records.
      }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(
      "afterschool-demo-v1",
      JSON.stringify({ courses, applications, refunds, deliveries, paymentStatus }),
    );
  }, [applications, courses, deliveries, paymentStatus, ready, refunds]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const filteredCourses = useMemo(
    () => (category === "전체" ? courses : courses.filter((course) => course.category === category)),
    [category, courses],
  );

  function addDelivery(title: string, status: Delivery["status"] = "수신완료") {
    setDeliveries((items) => [
      {
        id: Date.now(),
        title,
        recipient: "김하윤 보호자",
        channel: status === "대체발송" ? "SMS" : "알림톡",
        sentAt: "방금 전",
        status,
      },
      ...items,
    ]);
  }

  function applyCourse(course: Course) {
    if (guardianApplications.some((application) => application.courseId === course.id)) {
      setToast("이미 신청한 강좌입니다.");
      return;
    }
    const isWaitlist = course.applicants >= course.capacity;
    setCourses((items) => items.map((item) => item.id === course.id ? { ...item, applicants: item.applicants + 1 } : item));
    setApplications((items) => [
      ...items,
      {
        id: Date.now(),
        courseId: course.id,
        student: "김하윤",
        grade: "2-3",
        submittedAt: "방금 전",
        status: isWaitlist ? "대기 1번" : "접수완료",
      },
    ]);
    addDelivery(isWaitlist ? "수강신청 대기 접수" : "수강신청 접수 완료");
    setGuardianTab("applications");
    setToast(isWaitlist ? "대기 1번으로 접수됐습니다." : "수강신청이 접수됐습니다.");
  }

  function requestPayment() {
    if (paymentMethod === "virtual") {
      setPaymentStatus("virtual");
      addDelivery("가상계좌 발급 안내");
      setToast("가상계좌가 발급됐습니다.");
      return;
    }
    setPaymentStatus("paid");
    addDelivery("수강료 납부 완료");
    setToast("실시간 계좌이체가 완료됐습니다.");
  }

  function confirmVirtualPayment() {
    setPaymentStatus("paid");
    addDelivery("가상계좌 입금 완료");
    setToast("입금 웹훅이 확인돼 납부 완료 처리됐습니다.");
  }

  function submitRefund() {
    setPaymentStatus("refunding");
    setRefunds((items) => [
      { id: Date.now(), student: "김하윤", course: guardianCourses[0]?.title ?? "신청 강좌", amount: Math.max(guardianTotal - 25000, 0), reason: "개인 일정", status: "승인대기" },
      ...items,
    ]);
    addDelivery("환불 신청 접수");
    setShowRefund(false);
    setToast("환불 신청이 접수됐습니다.");
  }

  function approveRefund(id: number) {
    const target = refunds.find((item) => item.id === id);
    setRefunds((items) => items.map((item) => item.id === id ? { ...item, status: "지급완료" } : item));
    if (target?.student === "김하윤") setPaymentStatus("refunded");
    addDelivery("환불 지급 완료");
    setToast("환불 승인과 지급 처리가 완료됐습니다.");
  }

  function resetDemo() {
    setCourses(initialCourses);
    setApplications(initialApplications);
    setRefunds(initialRefunds);
    setDeliveries(initialDeliveries);
    setPaymentStatus("unpaid");
    setToast("데모 데이터가 초기화됐습니다.");
  }

  return (
    <main className="app-root">
      {role === "admin" ? (
        <AdminApp
          section={section}
          setSection={setSection}
          setRole={setRole}
          courses={courses}
          applications={applications}
          refunds={refunds}
          deliveries={deliveries}
          approveRefund={approveRefund}
          resetDemo={resetDemo}
        />
      ) : (
        <GuardianApp
          setRole={setRole}
          tab={guardianTab}
          setTab={setGuardianTab}
          category={category}
          setCategory={setCategory}
          courses={filteredCourses}
          applications={guardianApplications}
          allCourses={courses}
          deliveries={deliveries.filter((delivery) => delivery.recipient.includes("김하윤"))}
          total={guardianTotal}
          paymentStatus={paymentStatus}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          applyCourse={applyCourse}
          requestPayment={requestPayment}
          confirmVirtualPayment={confirmVirtualPayment}
          openRefund={() => setShowRefund(true)}
        />
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
      {showRefund && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowRefund(false)}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="refund-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="icon-button modal-close" onClick={() => setShowRefund(false)} aria-label="환불창 닫기">×</button>
            <p className="eyebrow">예상 환불액 확인</p>
            <h2 id="refund-title">환불 신청</h2>
            <div className="refund-calc">
              <div><span>최초 납부액</span><strong>{money(guardianTotal)}</strong></div>
              <div><span>진행 수업료</span><strong>− 15,000원</strong></div>
              <div><span>사용 재료비</span><strong>− 10,000원</strong></div>
              <div className="refund-total"><span>예상 환불액</span><strong>{money(Math.max(guardianTotal - 25000, 0))}</strong></div>
            </div>
            <label className="field-label" htmlFor="refund-reason">환불 사유</label>
            <select id="refund-reason" className="select-field" defaultValue="개인 일정">
              <option>개인 일정</option>
              <option>건강상 사유</option>
              <option>전학</option>
              <option>기타</option>
            </select>
            <div className="account-card">
              <span className="mini-icon">₩</span>
              <div><strong>원결제수단으로 환불</strong><p>실시간 계좌이체 · 끝자리 4821</p></div>
              <span className="status-badge success">본인확인</span>
            </div>
            <button className="primary-button full" onClick={submitRefund}>환불 신청하기</button>
            <p className="modal-note">학교 승인 후 알림톡으로 처리 결과를 안내합니다.</p>
          </section>
        </div>
      )}
    </main>
  );
}

type AdminProps = {
  section: string;
  setSection: (section: string) => void;
  setRole: (role: Role) => void;
  courses: Course[];
  applications: Application[];
  refunds: RefundItem[];
  deliveries: Delivery[];
  approveRefund: (id: number) => void;
  resetDemo: () => void;
};

function AdminApp(props: AdminProps) {
  const { section, setSection, setRole, courses, applications, refunds, deliveries, approveRefund, resetDemo } = props;
  const menuLabel = adminMenu.find(([id]) => id === section)?.[1] ?? "대시보드";

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => setSection("dashboard")} aria-label="늘봄온 대시보드">
          <span className="brand-mark">늘</span>
          <span><strong>늘봄ON</strong><small>방과후학교 통합운영</small></span>
        </button>
        <nav className="side-nav" aria-label="학교 관리자 메뉴">
          {adminMenu.map(([id, label], index) => (
            <button key={id} className={section === id ? "active" : ""} onClick={() => setSection(id)}>
              <span className="nav-index">{String(index + 1).padStart(2, "0")}</span>
              <span>{label}</span>
              {id === "refunds" && refunds.some((item) => item.status === "승인대기") && <em>{refunds.filter((item) => item.status === "승인대기").length}</em>}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="profile-avatar">이</div>
          <div><strong>이수민 담당자</strong><small>서울한빛초등학교</small></div>
          <button className="more-button" aria-label="사용자 메뉴">•••</button>
        </div>
      </aside>
      <section className="admin-main">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark">늘</span><strong>늘봄ON</strong></div>
          <div className="crumb"><span>서울한빛초등학교</span><b>/</b><strong>{menuLabel}</strong></div>
          <div className="top-actions">
            <select className="term-select" defaultValue="2026-1-1" aria-label="운영기수 선택">
              <option value="2026-1-1">2026학년도 1학기 1기</option>
              <option value="2025-2-2">2025학년도 2학기 2기</option>
            </select>
            <button className="role-switch" onClick={() => setRole("guardian")}><span>↗</span> 학부모 화면</button>
            <button className="icon-button" aria-label="알림">●<i>3</i></button>
          </div>
        </header>
        <div className="admin-content">
          {renderAdminSection(section, { courses, applications, refunds, deliveries, approveRefund, resetDemo })}
        </div>
      </section>
    </div>
  );
}

function renderAdminSection(
  section: string,
  data: Pick<AdminProps, "courses" | "applications" | "refunds" | "deliveries" | "approveRefund" | "resetDemo">,
) {
  if (section === "dashboard") return <Dashboard {...data} />;
  if (section === "courses") return <CourseManagement courses={data.courses} />;
  if (section === "applications") return <ApplicationManagement applications={data.applications} courses={data.courses} />;
  if (section === "payments") return <PaymentManagement />;
  if (section === "refunds") return <RefundManagement refunds={data.refunds} approveRefund={data.approveRefund} />;
  if (section === "attendance") return <AttendanceManagement />;
  if (section === "notifications") return <NotificationManagement deliveries={data.deliveries} />;
  const sectionDetails = moduleDetails[section] ?? moduleDetails.settings;
  return <ModuleOverview {...sectionDetails} />;
}

function PageIntro({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description: string; actions?: React.ReactNode }) {
  return (
    <div className="page-intro">
      <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{description}</p></div>
      {actions && <div className="intro-actions">{actions}</div>}
    </div>
  );
}

function Dashboard({ courses, refunds, deliveries, resetDemo }: Pick<AdminProps, "courses" | "refunds" | "deliveries" | "resetDemo">) {
  const applicants = courses.reduce((sum, course) => sum + course.applicants, 0);
  return (
    <>
      <PageIntro
        eyebrow="2026년 3월 6일 금요일"
        title="좋은 아침이에요, 이수민 담당자님"
        description="오늘 처리할 운영 업무와 모집 현황을 한눈에 확인하세요."
        actions={<><button className="secondary-button" onClick={resetDemo}>데모 초기화</button><button className="primary-button">+ 강좌 개설</button></>}
      />
      <div className="stats-grid">
        <StatCard label="운영 강좌" value="24" unit="개" detail="모집중 18 · 확정 6" tone="navy" />
        <StatCard label="전체 신청" value={String(applicants)} unit="명" detail="전일 대비 +28" tone="teal" />
        <StatCard label="정원 대비 신청률" value="87.4" unit="%" detail="목표 85% 달성" tone="blue" />
        <StatCard label="총 수납액" value="31.82" unit="백만원" detail="미납 42건" tone="gold" />
        <StatCard label="환불 승인대기" value={String(refunds.filter((item) => item.status === "승인대기").length)} unit="건" detail="오늘 2건 신규" tone="coral" />
      </div>
      <div className="dashboard-grid">
        <section className="panel chart-panel">
          <PanelHeader title="일자별 수강신청" subtitle="최근 8일" action="자세히 보기" />
          <div className="chart-wrap" aria-label="일자별 신청자 수 막대그래프">
            {[42, 65, 51, 88, 74, 96, 62, 82].map((height, index) => (
              <div className="bar-column" key={index}><span className={index === 7 ? "bar active" : "bar"} style={{ height: `${height}%` }} /><small>{index + 1}일</small></div>
            ))}
          </div>
          <div className="chart-summary"><span><i className="dot teal" /> 신청 486명</span><span><i className="dot pale" /> 확정 421명</span><strong>확정률 86.6%</strong></div>
        </section>
        <section className="panel todo-panel">
          <PanelHeader title="오늘 확인할 일" subtitle="우선순위순" />
          <div className="todo-list">
            <TodoItem tone="coral" count={refunds.filter((item) => item.status === "승인대기").length} title="환불 승인 대기" detail="예상 지급액 120,000원" />
            <TodoItem tone="gold" count={3} title="출결 미입력 강좌" detail="어제 수업 기준" />
            <TodoItem tone="blue" count={2} title="강사 서류 만료 예정" detail="30일 이내 갱신" />
            <TodoItem tone="purple" count={1} title="교육지원청 업무 요청" detail="3월 8일까지 회신" />
          </div>
        </section>
      </div>
      <div className="dashboard-grid lower">
        <section className="panel course-snapshot">
          <PanelHeader title="모집 중 강좌" subtitle={`${courses.length}개 표시`} action="전체 강좌" />
          <div className="compact-course-list">
            {courses.slice(0, 4).map((course) => (
              <div className="compact-course" key={course.id}>
                <span className={`course-symbol ${course.accent}`}>{course.title.slice(0, 1)}</span>
                <div><strong>{course.title} {course.section}</strong><small>{course.grades} · {course.schedule}</small></div>
                <div className="capacity"><strong>{course.applicants}</strong><span>/ {course.capacity}명</span><i><b style={{ width: `${Math.min((course.applicants / course.capacity) * 100, 100)}%` }} /></i></div>
                <span className={`status-badge ${course.status === "대기접수" ? "warning" : "success"}`}>{course.status}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="panel alimtalk-panel">
          <PanelHeader title="알림톡 운영" subtitle="카카오 공식 딜러 연동" action="발송 관리" />
          <div className="channel-health"><div className="kakao-mark">TALK</div><div><strong>발신프로필 정상</strong><p>서울한빛초등학교 · 승인 템플릿 12개</p></div><span className="live-dot">정상</span></div>
          <div className="delivery-stats"><div><strong>98.7%</strong><span>수신 성공률</span></div><div><strong>{deliveries.length}</strong><span>최근 발송</span></div><div><strong>14건</strong><span>문자 대체</span></div></div>
          <div className="latest-delivery"><span className="mini-icon">✓</span><div><strong>{deliveries[0]?.title}</strong><p>{deliveries[0]?.recipient} · {deliveries[0]?.sentAt}</p></div><span className="status-badge success">{deliveries[0]?.status}</span></div>
        </section>
      </div>
      <section className="panel system-note"><span className="note-mark">i</span><div><strong>로컬 MVP 안내</strong><p>결제·환불·알림톡은 실제 외부 전송 없이 안전한 데모 거래로 동작합니다. 화면의 상태 변화는 이 브라우저에 저장됩니다.</p></div></section>
    </>
  );
}

function StatCard({ label, value, unit, detail, tone }: { label: string; value: string; unit: string; detail: string; tone: string }) {
  return <article className={`stat-card ${tone}`}><div className="stat-top"><span>{label}</span><i /></div><div className="stat-value"><strong>{value}</strong><b>{unit}</b></div><p>{detail}</p></article>;
}

function PanelHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: string }) {
  return <header className="panel-header"><div><h2>{title}</h2><p>{subtitle}</p></div>{action && <button>{action} <span>→</span></button>}</header>;
}

function TodoItem({ tone, count, title, detail }: { tone: string; count: number; title: string; detail: string }) {
  return <button className="todo-item"><span className={`todo-count ${tone}`}>{count}</span><span><strong>{title}</strong><small>{detail}</small></span><b>›</b></button>;
}

function CourseManagement({ courses }: { courses: Course[] }) {
  return (
    <>
      <PageIntro eyebrow="운영기수 · 2026-1학기 1기" title="프로그램·강좌" description="강좌 공개, 정원, 일정, 비용과 강사 배정 상태를 관리합니다." actions={<button className="primary-button">+ 새 강좌</button>} />
      <div className="filter-row"><button className="filter-button active">전체 {courses.length}</button><button className="filter-button">모집중</button><button className="filter-button">승인대기</button><button className="filter-button">폐강</button><label className="search-box">⌕<input placeholder="강좌명 또는 강사 검색" /></label></div>
      <section className="panel table-panel"><div className="table-scroll"><table><thead><tr><th>강좌</th><th>대상·일정</th><th>강사</th><th>비용</th><th>신청/정원</th><th>상태</th><th /></tr></thead><tbody>{courses.map((course) => <tr key={course.id}><td><div className="table-course"><span className={`course-symbol ${course.accent}`}>{course.title[0]}</span><div><strong>{course.title}</strong><small>{course.category} · {course.section}</small></div></div></td><td><strong>{course.grades}</strong><small>{course.schedule} · {course.room}</small></td><td>{course.instructor}</td><td><strong>{money(course.tuition)}</strong><small>재료비 {money(course.materials)}</small></td><td><div className="inline-capacity"><strong>{course.applicants}</strong> / {course.capacity}<i><b style={{ width: `${Math.min((course.applicants / course.capacity) * 100, 100)}%` }} /></i></div></td><td><span className={`status-badge ${course.status === "대기접수" ? "warning" : "success"}`}>{course.status}</span></td><td><button className="row-action">관리</button></td></tr>)}</tbody></table></div></section>
    </>
  );
}

function ApplicationManagement({ applications, courses }: { applications: Application[]; courses: Course[] }) {
  return (
    <>
      <PageIntro eyebrow="접수·선발·대기" title="수강신청 관리" description="신청순위와 선발상태를 확인하고 최종 수강생을 확정합니다." actions={<button className="secondary-button">추첨 실행</button>} />
      <div className="stats-grid compact"><StatCard label="전체 접수" value={String(applications.length + 482)} unit="건" detail="오늘 +28" tone="navy" /><StatCard label="수강 확정" value="421" unit="명" detail="확정률 86.6%" tone="teal" /><StatCard label="대기" value="38" unit="명" detail="7개 강좌" tone="gold" /><StatCard label="취소" value="12" unit="건" detail="이번 기수" tone="coral" /></div>
      <section className="panel table-panel"><div className="table-scroll"><table><thead><tr><th>학생</th><th>신청강좌</th><th>접수시각</th><th>검증</th><th>상태</th><th /></tr></thead><tbody>{applications.map((application) => { const course = courses.find((item) => item.id === application.courseId); return <tr key={application.id}><td><strong>{application.student}</strong><small>{application.grade}</small></td><td><strong>{course?.title ?? "강좌"}</strong><small>{course?.section} · {course?.schedule}</small></td><td>{application.submittedAt}</td><td><span className="check-text">✓ 시간충돌 없음</span></td><td><span className={`status-badge ${application.status.includes("대기") ? "warning" : application.status === "수강확정" ? "success" : "info"}`}>{application.status}</span></td><td><button className="row-action">상세</button></td></tr>; })}</tbody></table></div></section>
    </>
  );
}

function PaymentManagement() {
  const rows = [
    ["P-260306-0142", "이서준", "로봇 코딩 A반", "115,000원", "실시간 계좌이체", "납부완료"],
    ["P-260306-0141", "한지우", "창의수학 A반", "88,000원", "가상계좌", "입금대기"],
    ["P-260305-0298", "윤도현", "방송댄스 A반", "72,000원", "가상계좌", "납부완료"],
    ["P-260305-0280", "김채원", "음악줄넘기 B반", "78,000원", "실시간 계좌이체", "납부완료"],
  ];
  return <><PageIntro eyebrow="청구·입금·영수증" title="결제·수납" description="실시간 계좌이체와 가상계좌 입금 결과를 자동 대사합니다." actions={<button className="primary-button">청구서 발행</button>} /><div className="stats-grid compact"><StatCard label="청구액" value="35.12" unit="백만원" detail="이번 기수" tone="navy" /><StatCard label="수납액" value="31.82" unit="백만원" detail="수납률 90.6%" tone="teal" /><StatCard label="입금대기" value="42" unit="건" detail="3.3백만원" tone="gold" /><StatCard label="대사필요" value="3" unit="건" detail="과소·과다입금" tone="coral" /></div><section className="panel table-panel"><div className="table-scroll"><table><thead><tr><th>결제번호</th><th>학생</th><th>청구강좌</th><th>금액</th><th>수단</th><th>상태</th></tr></thead><tbody>{rows.map((row) => <tr key={row[0]}>{row.map((value, index) => <td key={value}>{index === 5 ? <span className={`status-badge ${value === "납부완료" ? "success" : "warning"}`}>{value}</span> : index === 0 ? <code>{value}</code> : <strong>{value}</strong>}</td>)}</tr>)}</tbody></table></div></section></>;
}

function RefundManagement({ refunds, approveRefund }: { refunds: RefundItem[]; approveRefund: (id: number) => void }) {
  return <><PageIntro eyebrow="산정·승인·지급" title="환불 관리" description="원결제 거래는 유지하고 환불 산식과 지급거래를 별도 원장으로 관리합니다." /><div className="stats-grid compact"><StatCard label="승인대기" value={String(refunds.filter((item) => item.status === "승인대기").length)} unit="건" detail="오늘 처리 권장" tone="coral" /><StatCard label="지급예정" value={money(refunds.filter((item) => item.status === "승인대기").reduce((sum, item) => sum + item.amount, 0)).replace("원", "")} unit="원" detail="승인대기 합계" tone="gold" /><StatCard label="이번 달 환불" value="1.28" unit="백만원" detail="환불률 2.4%" tone="teal" /></div><section className="panel table-panel"><div className="table-scroll"><table><thead><tr><th>학생</th><th>강좌</th><th>사유</th><th>환불예정액</th><th>지급수단</th><th>상태</th><th /></tr></thead><tbody>{refunds.map((refund) => <tr key={refund.id}><td><strong>{refund.student}</strong></td><td>{refund.course}</td><td>{refund.reason}</td><td><strong>{money(refund.amount)}</strong><small>산식 확인 완료</small></td><td>원결제수단</td><td><span className={`status-badge ${refund.status === "지급완료" ? "success" : "warning"}`}>{refund.status}</span></td><td>{refund.status === "승인대기" ? <button className="row-action primary" onClick={() => approveRefund(refund.id)}>승인·지급</button> : <button className="row-action">내역</button>}</td></tr>)}</tbody></table></div></section></>;
}

function AttendanceManagement() {
  const students = [["이서준", "출석"], ["한지우", "출석"], ["윤도현", "지각"], ["김채원", "결석"], ["박민준", "출석"]];
  return <><PageIntro eyebrow="오늘 · 18개 수업" title="출결 관리" description="강사 입력 현황과 장기결석 학생을 확인합니다." /><div className="attendance-layout"><section className="panel attendance-session"><PanelHeader title="생각이 자라는 창의수학 A반" subtitle="3월 6일 · 4회차 · 창의실" /><div className="attendance-list">{students.map(([name, status]) => <div key={name}><span className="student-avatar">{name[0]}</span><strong>{name}</strong><div className="attendance-actions">{["출석", "지각", "조퇴", "결석"].map((item) => <button key={item} className={status === item ? `selected ${item}` : ""}>{item}</button>)}</div></div>)}</div><button className="primary-button attendance-save">출결 저장</button></section><section className="panel attendance-summary"><PanelHeader title="입력 현황" subtitle="오늘 기준" /><div className="ring"><strong>83%</strong><span>15 / 18강좌</span></div><div className="summary-lines"><p><span>입력 완료</span><strong>15개</strong></p><p><span>미입력</span><strong className="danger-text">3개</strong></p><p><span>장기결석 알림</span><strong>2명</strong></p></div></section></div></>;
}

function NotificationManagement({ deliveries }: { deliveries: Delivery[] }) {
  const templates = [["수강신청 접수", "승인", "APPLICATION_RECEIVED"], ["수강확정 안내", "승인", "ENROLLMENT_CONFIRMED"], ["가상계좌 발급", "승인", "VIRTUAL_ACCOUNT_ISSUED"], ["환불 지급 완료", "심사중", "REFUND_COMPLETED_V2"]];
  return <><PageIntro eyebrow="카카오 알림톡 · 문자 대체" title="알림톡 관리" description="발신프로필, 승인 템플릿과 발송·수신 결과를 관리합니다." actions={<button className="primary-button">+ 알림톡 발송</button>} /><div className="channel-banner"><div className="kakao-mark large">TALK</div><div><p className="eyebrow">발신프로필</p><h2>서울한빛초등학교</h2><p>공식 딜러 연동 정상 · 마지막 확인 1분 전</p></div><span className="status-badge success">사용 가능</span><div className="channel-numbers"><strong>12</strong><span>승인 템플릿</span><strong>98.7%</strong><span>수신 성공률</span></div></div><div className="notification-grid"><section className="panel"><PanelHeader title="템플릿" subtitle="정보성 메시지만 발송" action="전체 관리" /><div className="template-list">{templates.map(([name, status, code]) => <div key={code}><span className="template-icon">T</span><div><strong>{name}</strong><code>{code}</code></div><span className={`status-badge ${status === "승인" ? "success" : "warning"}`}>{status}</span></div>)}</div></section><section className="panel"><PanelHeader title="최근 발송" subtitle="알림톡 실패 시 문자 자동 대체" /><div className="delivery-list">{deliveries.slice(0, 6).map((delivery) => <div key={delivery.id}><span className={delivery.channel === "알림톡" ? "delivery-channel kakao" : "delivery-channel sms"}>{delivery.channel === "알림톡" ? "T" : "S"}</span><div><strong>{delivery.title}</strong><p>{delivery.recipient} · {delivery.sentAt}</p></div><span className={`status-badge ${delivery.status === "대체발송" ? "warning" : "success"}`}>{delivery.status}</span></div>)}</div></section></div></>;
}

function ModuleOverview({ title, eyebrow, cards }: { title: string; eyebrow: string; cards: [string, string, string][] }) {
  return <><PageIntro eyebrow={eyebrow} title={title} description="설계된 업무 기준에 따라 기관 범위와 권한이 적용된 관리 화면입니다." actions={<button className="primary-button">+ 새 항목</button>} /><div className="module-cards">{cards.map(([label, value, detail], index) => <article className="module-card" key={label}><span className={`module-number n${index + 1}`}>0{index + 1}</span><p>{label}</p><strong>{value}</strong><small>{detail}</small><button>관리하기 <span>→</span></button></article>)}</div><section className="panel module-workspace"><div className="empty-illustration"><span /><i /><b /></div><div><p className="eyebrow">MVP 모듈</p><h2>{title} 업무공간</h2><p>상세 등록·승인·이력 기능은 다음 개발 단계에서 실제 기관 정책과 연결됩니다. 현재는 전체 메뉴 구조와 핵심 현황을 확인할 수 있습니다.</p></div></section></>;
}

type GuardianProps = {
  setRole: (role: Role) => void;
  tab: string;
  setTab: (tab: string) => void;
  category: string;
  setCategory: (category: string) => void;
  courses: Course[];
  allCourses: Course[];
  applications: Application[];
  deliveries: Delivery[];
  total: number;
  paymentStatus: PaymentStatus;
  paymentMethod: "bank" | "virtual";
  setPaymentMethod: (method: "bank" | "virtual") => void;
  applyCourse: (course: Course) => void;
  requestPayment: () => void;
  confirmVirtualPayment: () => void;
  openRefund: () => void;
};

function GuardianApp(props: GuardianProps) {
  const { setRole, tab, setTab, category, setCategory, courses, allCourses, applications, deliveries, total, paymentStatus, paymentMethod, setPaymentMethod, applyCourse, requestPayment, confirmVirtualPayment, openRefund } = props;
  const tabs = [["courses", "강좌찾기"], ["applications", "신청확인"], ["payment", "결제·환불"], ["alerts", "알림"]];
  return (
    <div className="guardian-shell">
      <header className="guardian-header">
        <button className="brand guardian-brand" onClick={() => setTab("courses")}><span className="brand-mark">늘</span><span><strong>늘봄ON</strong><small>서울한빛초등학교</small></span></button>
        <nav className="guardian-tabs" aria-label="학부모 메뉴">{tabs.map(([id, label]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}{id === "alerts" && deliveries.length > 0 && <i>{deliveries.length}</i>}</button>)}</nav>
        <button className="role-switch guardian-role" onClick={() => setRole("admin")}>학교 관리자 화면 ↗</button>
      </header>
      <div className="guardian-content">
        <section className="child-hero">
          <div className="child-avatar">김</div>
          <div><p className="eyebrow">선택된 자녀</p><h1>김하윤 <span>2학년 3반 12번</span></h1><p>2026학년도 1학기 1기 · 신청기간 3월 2일 09:00–3월 8일 17:00</p></div>
          <button className="child-switch">자녀 변경⌄</button>
          <div className="period-badge"><span className="live-dot">신청중</span><strong>D–2</strong></div>
        </section>
        {tab === "courses" && <GuardianCourses category={category} setCategory={setCategory} courses={courses} applications={applications} applyCourse={applyCourse} />}
        {tab === "applications" && <GuardianApplications applications={applications} courses={allCourses} total={total} goPayment={() => setTab("payment")} />}
        {tab === "payment" && <GuardianPayment total={total} applications={applications} status={paymentStatus} method={paymentMethod} setMethod={setPaymentMethod} requestPayment={requestPayment} confirmVirtualPayment={confirmVirtualPayment} openRefund={openRefund} />}
        {tab === "alerts" && <GuardianAlerts deliveries={deliveries} />}
      </div>
      <nav className="mobile-bottom-nav" aria-label="모바일 학부모 메뉴">{tabs.map(([id, label], index) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}><span>{["⌕", "✓", "₩", "●"][index]}</span>{label}</button>)}</nav>
    </div>
  );
}

function GuardianCourses({ category, setCategory, courses, applications, applyCourse }: { category: string; setCategory: (category: string) => void; courses: Course[]; applications: Application[]; applyCourse: (course: Course) => void }) {
  const categories = ["전체", "교과", "예체능", "과학·창의", "디지털", "체육"];
  return <><div className="guardian-title"><div><p className="eyebrow">방과후 프로그램</p><h2>하윤이에게 맞는 강좌를 찾아보세요</h2><p>대상 학년과 시간표 충돌을 자동으로 확인합니다.</p></div><label className="search-box large">⌕<input placeholder="강좌명, 요일, 분야 검색" /></label></div><div className="category-scroll">{categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div><div className="guardian-course-grid">{courses.map((course) => { const applied = applications.some((item) => item.courseId === course.id); const full = course.applicants >= course.capacity; return <article className="guardian-course-card" key={course.id}><div className={`course-cover ${course.accent}`}><span>{course.category}</span><strong>{course.title[0]}</strong><small>{course.section}</small></div><div className="course-card-body"><div className="course-meta"><span>{course.grades}</span><span>{course.schedule}</span></div><h3>{course.title}</h3><p>{course.room} · {course.instructor} 강사</p><div className="course-fee"><strong>{money(course.tuition + course.materials)}</strong><span>기수 총액</span></div><div className="course-capacity"><span><strong>{course.applicants}</strong> / {course.capacity}명</span><i><b style={{ width: `${Math.min((course.applicants / course.capacity) * 100, 100)}%` }} /></i><em>{full ? "대기 접수" : `${course.capacity - course.applicants}자리 남음`}</em></div><button className={applied ? "apply-button applied" : full ? "apply-button wait" : "apply-button"} disabled={applied} onClick={() => applyCourse(course)}>{applied ? "신청 완료" : full ? "대기 신청" : "수강 신청"}</button></div></article>; })}</div></>;
}

function GuardianApplications({ applications, courses, total, goPayment }: { applications: Application[]; courses: Course[]; total: number; goPayment: () => void }) {
  return <><div className="guardian-title"><div><p className="eyebrow">신청확인</p><h2>신청 강좌를 확인하세요</h2><p>모집 종료 후 최종 확정된 강좌에 청구서가 발행됩니다.</p></div></div>{applications.length === 0 ? <div className="empty-state"><strong>아직 신청한 강좌가 없어요</strong><p>하윤이에게 맞는 강좌를 찾아 신청해 보세요.</p></div> : <div className="application-layout"><section className="application-stack">{applications.map((application) => { const course = courses.find((item) => item.id === application.courseId); if (!course) return null; return <article className="application-card" key={application.id}><span className={`course-symbol ${course.accent}`}>{course.title[0]}</span><div><div className="course-meta"><span>{course.category}</span><span>{course.grades}</span></div><h3>{course.title} {course.section}</h3><p>{course.schedule} · {course.room}</p><small>접수 {application.submittedAt}</small></div><div className="application-status"><span className={`status-badge ${application.status.includes("대기") ? "warning" : "success"}`}>{application.status}</span><strong>{money(course.tuition + course.materials)}</strong><button>신청 취소</button></div></article>; })}</section><aside className="summary-card"><p className="eyebrow">예상 신청총액</p><strong>{money(total)}</strong><span>{applications.length}개 강좌</span><div><p><span>수강료</span><b>{money(Math.max(total - 25000, 0))}</b></p><p><span>교재·재료비</span><b>25,000원</b></p></div><button className="primary-button full" onClick={goPayment}>결제·환불 보기</button><small>선발 결과와 지원금에 따라 실제 결제액이 달라질 수 있습니다.</small></aside></div>}</>;
}

function GuardianPayment({ total, applications, status, method, setMethod, requestPayment, confirmVirtualPayment, openRefund }: { total: number; applications: Application[]; status: PaymentStatus; method: "bank" | "virtual"; setMethod: (method: "bank" | "virtual") => void; requestPayment: () => void; confirmVirtualPayment: () => void; openRefund: () => void }) {
  if (applications.length === 0) return <div className="empty-state"><strong>결제할 신청내역이 없어요</strong><p>강좌를 먼저 신청해 주세요.</p></div>;
  return <><div className="guardian-title"><div><p className="eyebrow">안전한 납부·환불</p><h2>결제·환불</h2><p>실시간 계좌이체와 학생별 가상계좌를 지원합니다.</p></div></div><div className="payment-layout"><section className="panel payment-card"><div className="invoice-title"><div><p className="eyebrow">청구서 INV-2026-0306-0142</p><h3>2026학년도 1학기 1기 수강료</h3></div><span className={`status-badge ${status === "paid" ? "success" : status === "refunding" ? "warning" : status === "refunded" ? "info" : "danger"}`}>{status === "unpaid" ? "납부대기" : status === "virtual" ? "입금대기" : status === "paid" ? "납부완료" : status === "refunding" ? "환불처리중" : "환불완료"}</span></div><div className="invoice-lines"><p><span>강좌 신청금액</span><strong>{money(total)}</strong></p><p><span>자유수강권 지원</span><strong className="teal-text">− 20,000원</strong></p><p className="invoice-total"><span>최종 납부액</span><strong>{money(Math.max(total - 20000, 0))}</strong></p></div>{status === "unpaid" && <><p className="field-label">납부수단을 선택하세요</p><div className="payment-methods"><button className={method === "bank" ? "selected" : ""} onClick={() => setMethod("bank")}><span className="mini-icon">₩</span><strong>실시간 계좌이체</strong><small>은행 인증 후 즉시 완료</small><i /></button><button className={method === "virtual" ? "selected" : ""} onClick={() => setMethod("virtual")}><span className="mini-icon">#</span><strong>학생별 가상계좌</strong><small>입금 확인 후 자동 처리</small><i /></button></div><button className="primary-button full pay-button" onClick={requestPayment}>{money(Math.max(total - 20000, 0))} 납부하기</button><p className="safe-note">🔒 로컬 데모에서는 실제 금융 거래가 발생하지 않습니다.</p></>}{status === "virtual" && <div className="virtual-account-card"><p>입금 전용 가상계좌</p><strong>신한은행 562-910-483821</strong><span>예금주 서울한빛초등학교(김하윤)</span><small>입금기한 2026.03.09 23:59</small><button className="primary-button full" onClick={confirmVirtualPayment}>데모 입금 확인</button></div>}{status === "paid" && <div className="paid-actions"><div className="success-circle">✓</div><h3>납부가 완료됐습니다</h3><p>영수증과 납부완료 알림톡을 발송했습니다.</p><div><button className="secondary-button">영수증 보기</button><button className="text-danger" onClick={openRefund}>환불 신청</button></div></div>}{status === "refunding" && <div className="paid-actions"><div className="processing-circle">•••</div><h3>학교 승인 대기 중입니다</h3><p>승인 후 원결제수단으로 지급하고 알림톡을 발송합니다.</p></div>}{status === "refunded" && <div className="paid-actions"><div className="success-circle">✓</div><h3>환불 지급이 완료됐습니다</h3><p>원결제수단으로 환불됐습니다. 상세 내역은 환불 영수증에서 확인하세요.</p><button className="secondary-button">환불 영수증</button></div>}</section><aside className="panel payment-help"><span className="help-mark">?</span><h3>납부·환불 안내</h3><ul><li>입금 결과는 금융기관 웹훅으로 확인합니다.</li><li>과소·과다입금은 학교 확인 후 처리합니다.</li><li>환불은 원결제수단을 우선 사용합니다.</li><li>처리 단계마다 알림톡을 보내드립니다.</li></ul><button>학교에 문의하기 →</button></aside></div></>;
}

function GuardianAlerts({ deliveries }: { deliveries: Delivery[] }) {
  return <><div className="guardian-title"><div><p className="eyebrow">카카오 알림톡</p><h2>알림 내역</h2><p>신청부터 환불까지 중요한 처리 결과를 모아봅니다.</p></div></div><section className="alerts-stack">{deliveries.length === 0 ? <div className="empty-state"><strong>새로운 알림이 없어요</strong></div> : deliveries.map((delivery) => <article className="alert-card" key={delivery.id}><span className={delivery.channel === "알림톡" ? "delivery-channel kakao" : "delivery-channel sms"}>{delivery.channel === "알림톡" ? "T" : "S"}</span><div><span>{delivery.channel} · {delivery.sentAt}</span><h3>{delivery.title}</h3><p>{delivery.title.includes("환불") ? "요청하신 환불 처리 상태가 변경되었습니다." : delivery.title.includes("납부") || delivery.title.includes("입금") ? "납부 상태와 영수증을 확인해 주세요." : "김하윤 학생의 방과후학교 신청 정보입니다."}</p><button>상세보기 →</button></div><span className={`status-badge ${delivery.status === "대체발송" ? "warning" : "success"}`}>{delivery.status}</span></article>)}</section></>;
}
