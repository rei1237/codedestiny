// Deterministic guidance only. No LLM, network, XP writes or inferred customer journeys.
export const WORDPRESS_URL = "https://ggulggulinsights.wordpress.com";
export const WORDPRESS_EDITOR = `${WORDPRESS_URL}/wp-admin/edit.php`;
export const RETIRED_MARKETING_CHANNELS = Object.freeze(["threads_existing_worker", "tiktok", "youtube_shorts", "x", "naver_blog"]);

export function isActiveOperationsQuest(quest) {
  return quest.origin === "custom" || quest.channel === "wordpress";
}

export function questKeeper(quest) {
  if (quest.kind === "analysis") return "영냥이";
  if (quest.kind === "improvement") return "네오";
  return "연이";
}

export const OPERATIONS_MISSIONS = Object.freeze({
  editorial: { title: "[WordPress] 원문 한 편 검토하기", kind: "copy", note: "질문의 답·출처·실제 서비스 링크를 확인하고 원고 준비 증빙을 남깁니다. 공개 발행은 WordPress에서 직접 결정합니다." },
  discovery: { title: "[WordPress] 핵심 URL 검색 반영 확인", kind: "analysis", note: "기간과 URL을 적고 Search Console 색인·비브랜드 노출·클릭을 확인합니다. 미확인 값을 0으로 기록하지 않습니다." },
  measurement: { title: "[측정] GA4와 승인 결제 대조", kind: "analysis", note: "같은 KST 기간의 고유 승인 거래와 GA 거래를 대조합니다. 동의·테스트·환경·처리 지연을 구분하고 고객 정보는 증빙에 넣지 않습니다." },
  delivery: { title: "[운영] 결제 후 제공 대기 확인", kind: "improvement", note: "주문 화면에서 결제와 제공 상태를 읽어 확인합니다. 환불·복구·재처리는 별도 판단하며 이 퀘스트가 자동 실행하지 않습니다." },
  conversion: { title: "[운영] 상담 진입부터 결제까지 점검", kind: "analysis", note: "선택 기간의 상담 이동·결제창 진입·승인 기록을 확인합니다. 서로 다른 분모를 구매율로 합치지 않습니다." },
});

export function missionHref(id) {
  return `/admin/quests/?mission=${encodeURIComponent(id)}`;
}

/** @param {any} data */
export function operationsAdvisors(data, now = Date.now()) {
  const revenue = data.metrics.revenue;
  const traffic = data.metrics.traffic;
  const awaiting = data.metrics.delivery.awaitingDelivery || 0;
  const syncTime = Date.parse(data.lastSync || "");
  const stale = !Number.isFinite(syncTime) || now - syncTime > 12 * 3600_000 || data.alerts.some((alert) => /sync|connection|source/.test(alert.id));
  const trafficKnown = traffic.status === "connected" && Number.isFinite(traffic.engagedSessions);
  const noOrders = !stale && revenue.orders === 0;
  const recentCorrection = revenue.refundedKRW > 0;
  const observation = `${data.period.fromDate} ~ ${data.period.toDate} · KST`;
  return [
    { id: "yeoni", name: "연이", role: "편집 마스터", mood: "차분히 준비 중", art: "yeoniLibrary",
      title: "원문 한 편에 힘을 모아요.", body: "검색자가 궁금한 질문 하나를 끝까지 설명해요. 글은 직접 다듬고, 준비된 근거를 퀘스트에 남겨 주세요.",
      mission: "editorial", action: "원고 검토 퀘스트", evidence: "WordPress 중심 편집 원칙", tone: "accent" },
    { id: "neo", name: "네오", role: "운영 마스터", mood: awaiting ? "긴급 점검" : stale ? "확인 대기" : noOrders ? "작전 점검" : recentCorrection ? "차분히 대조 중" : "운영 안정 확인",
      art: "neoGuardian", title: awaiting ? "결제한 손님의 결과부터 챙기죠." : stale ? "기록이 최신인지 먼저 확인하죠." : noOrders ? "현재 집계에 결제 기록이 없군요. 경로부터 봅시다." : "승인과 결과 제공은 따로 확인하죠.",
      body: awaiting ? `선택 기간에 제공 대기 ${awaiting}건이 있습니다. 주문 상태와 전달 근거부터 확인하세요.` : stale ? "마지막 동기화 근거가 부족합니다. 이 상태에서 매출이나 전환을 단정하지 않습니다." : noOrders ? "가격부터 바꾸지 마세요. 상담 진입, 결제창 진입, 승인 기록 중 어디가 비었는지 확인하는 게 먼저입니다." : "현재 수납 기록을 기준으로 안내합니다. 환불과 제공 상태를 함께 살피고, GA4 구매와 같다고 가정하지 않습니다.",
      mission: awaiting ? "delivery" : stale ? "measurement" : "conversion", action: awaiting ? "제공 대기 점검" : "운영 점검 퀘스트", evidence: observation, tone: awaiting ? "warn" : "info" },
    { id: "yeongnyangi", name: "영냥이", role: "관측 마스터", mood: !trafficKnown ? "관측 대기" : noOrders ? "조금 아쉬워" : "차분히 관측 중",
      art: !trafficKnown ? "yeongnyangiFocus" : noOrders ? "yeongnyangiSad" : "yeongnyangiCelebrateAvatar",
      title: !trafficKnown ? "아직 보이지 않는 숫자가 있어." : noOrders ? "조금 아쉽지만, 다음 한 걸음을 찾아보자." : "기록을 남겨야 다음 길이 보여.",
      body: !trafficKnown ? "분석 연동이 확인되기 전에는 방문이 없다고 말할 수 없어. 유효 참여 세션은 방문자 수와도 달라." : "검색 노출부터 상담 이동까지 한 구간씩 보자. 작은 표본에서 구매율을 단정하지 않고, 확인한 근거만 기록할게.",
      mission: !trafficKnown ? "measurement" : "discovery", action: !trafficKnown ? "측정 점검 퀘스트" : "검색 관측 퀘스트", evidence: trafficKnown ? `GA4 유효 참여 세션 · ${observation}` : "GA4 연동 또는 처리 상태 미확인", tone: !trafficKnown ? "warn" : "info" },
  ];
}
