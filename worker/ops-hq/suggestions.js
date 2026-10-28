// 영냥이 제안 — 규칙 기반(LLM 호출 없음). 모든 제안은 근거 숫자·출처·기간과 바로 갈 수 있는 화면을 함께 낸다.
// 압박 문구(출석·연속 기록·벌점)는 쓰지 않는다. 우선순위: 고객 영향 → 데이터 신뢰 → 오늘 할 일.

import { addDaysKey as addDays } from "./time.js";

export function buildSuggestions({ today, revenue = {}, quests = [], threadsToday = null, traffic = null, syncStates = [] }) {
  const out = [];
  const heldDelivery = Number(revenue.held?.delivery_pending || 0) + Number(revenue.held?.delivery_unknown || 0);
  if (heldDelivery > 0) {
    out.push({
      id: "delivery_pending",
      tone: "err",
      title: `결제 후 제공 대기 ${heldDelivery}건`,
      body: "결제는 됐지만 리포트·권한 지급이 확인되지 않은 주문이에요. 고객이 기다리고 있을 수 있어요",
      evidence: { source: "ops_revenue_facts(결제·제공 원천 재계산)", period: revenue.period || null, count: heldDelivery },
      action: { label: "미제공 주문 보기", href: "/admin/orders/?queue=undelivered" },
    });
  }
  const refundUnknown = Number(revenue.held?.refund_unknown || 0);
  if (refundUnknown > 0) {
    out.push({
      id: "refund_unknown",
      tone: "warn",
      title: `환불 조회 실패 ${refundUnknown}건`,
      body: "PortOne 에서 환불 내역을 읽지 못해 매출 반영을 미뤄 두었어요. 다음 동기화에서 다시 조회해요",
      evidence: { source: "PortOne 결제 조회", period: revenue.period || null, count: refundUnknown },
      action: { label: "주문 확인", href: "/admin/orders/?queue=refund_check" },
    });
  }
  const failing = syncStates.filter((state) => state.lastError && state.status !== "integration_pending");
  if (failing.length) {
    out.push({
      id: "sync_error",
      tone: "warn",
      title: `연결 오류 ${failing.length}곳`,
      body: `${failing.map((state) => state.label || state._id).join(", ")} 집계가 마지막에 실패했어요. 숫자가 늦을 수 있어요`,
      evidence: { source: "ops_sync_state", period: null, count: failing.length },
      action: { label: "연결 상태 보기", href: "/admin/connections/" },
    });
  }
  if (threadsToday?.attention) {
    const bad = threadsToday.jobs.filter((job) => ["needs_check", "failed", "missed"].includes(job.state));
    out.push({
      id: "threads_attention",
      tone: "warn",
      title: `Threads 자동 발행 확인 필요 ${bad.length}건`,
      body: bad.map((job) => `${job.label} ${job.time || ""} ${job.stateLabel}`.trim()).join(" · "),
      evidence: { source: "idempotency_keys(읽기 전용)", period: today, count: bad.length },
      action: { label: "자동 발행 확인 퀘스트", href: "/admin/quests/?channel=threads_existing_worker" },
    });
  }
  const overdue = quests.filter((quest) => quest.overdue && quest.kind !== "auto_publish_check");
  if (overdue.length) {
    out.push({
      id: "overdue",
      tone: "info",
      title: `작업 목표 시각이 지난 퀘스트 ${overdue.length}개`,
      body: "감점은 없어요. 일정을 옮기거나 보류로 두면 오늘 목록이 가벼워져요",
      evidence: { source: "ops_quests", period: today, count: overdue.length },
      action: { label: "지난 퀘스트 정리", href: "/admin/quests/?filter=overdue" },
    });
  }
  const dueToday = quests.filter((quest) => quest.dueDate === today && !quest.overdue && ["scheduled", "in_progress", "review"].includes(quest.status) && quest.kind !== "auto_publish_check");
  if (dueToday.length) {
    const minutes = dueToday.reduce((sum, quest) => sum + (quest.estimatedMinutes || 30), 0);
    out.push({
      id: "today",
      tone: "info",
      title: `오늘 퀘스트 ${dueToday.length}개 · 약 ${minutes}분`,
      body: `${dueToday.slice(0, 3).map((quest) => quest.title).join(", ")}${dueToday.length > 3 ? " 외" : ""}`,
      evidence: { source: "ops_quests", period: today, count: dueToday.length },
      action: { label: "오늘 퀘스트", href: "/admin/quests/?filter=today" },
    });
  }
  const waitingVideo = quests.filter((quest) => quest.kind === "production" && quest.sourceStatus === "script_ready_video_pending" && quest.status !== "done" && quest.dueDate <= addDays(today, 3));
  if (waitingVideo.length) {
    out.push({
      id: "video_pending",
      tone: "info",
      title: `3일 안에 필요한 영상 ${waitingVideo.length}편`,
      body: "대본은 준비돼 있어요. 영상 파일만 만들면 TikTok·Shorts 발행 퀘스트가 열려요",
      evidence: { source: "calendar.csv · ops_quests", period: `${today}~${addDays(today, 3)}`, count: waitingVideo.length },
      action: { label: "제작 퀘스트 보기", href: "/admin/quests/?kind=production" },
    });
  }
  if (traffic?.status === "integration_pending") {
    out.push({
      id: "traffic_pending",
      tone: "muted",
      title: "트래픽 XP 연동 대기",
      body: "GA4 서비스 계정을 연결하면 유효 참여 세션이 XP 와 추이 그래프에 들어와요",
      evidence: { source: "GA4 Data API", period: null, count: null },
      action: { label: "연결 방법 보기", href: "/admin/connections/#ga4" },
    });
  }
  if (!out.length) {
    out.push({
      id: "calm",
      tone: "ok",
      title: "지금은 급한 일이 없어요",
      body: "다음 퀘스트를 미리 준비하거나 지난 발행의 성과를 기록해 보세요",
      evidence: { source: "ops_quests · ops_revenue_facts", period: today, count: 0 },
      action: { label: "퀘스트 보드", href: "/admin/quests/" },
    });
  }
  return out;
}
