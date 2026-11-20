"use client";

// 사주 고급 궁합 결과 화면. ?sid= 의 상담을 불러와 완성본만 보여 준다.
// 미완성(202)이면 /generate { resumeSessionId } 로 한 장씩 이어 쓰고, 실패해 서버가 무료 다시 시도를 열면
// 다시 시도(추가 결제·차감 없음)와 환불 요청을 함께 보여 준다. 보관함(/records/)도 이 화면으로 다시 연다.
import { useCallback, useEffect, useRef, useState } from "react";
import GenerationProgress from "@/components/fortune/GenerationProgress";
import { masterProfiles } from "@/components/fortune/master-profiles";
import { usePaidDeliveryScope } from "@/app/hooks/usePaidDeliveryScope";
import { authFetch } from "@/app/_lib/auth-client";
import { readDevPreviewState } from "@/lib/dev-preview/core";
import { buildSajuCompatPremiumPreviewPayload } from "@/lib/dev-preview/fixtures/saju-compat-premium";
import {
  API_BASE,
  CHAPTER_TOTAL,
  LOGIN_REQUIRED_MESSAGE,
  REFUND_LABEL,
  RETRY_LABEL,
  RETRY_MESSAGE,
  SERVER_ERROR_MESSAGE,
  STALLED_MESSAGE,
  readRetryOffer,
  refundNotice,
  requestRefund,
  runPremiumGeneration,
  type GenerationOutcome,
  type PremiumResult,
  type RetryOffer,
  type SessionPayload,
} from "../_lib/premium-delivery";
import styles from "../premium.module.css";

type View =
  | { kind: "loading" }
  | { kind: "generating"; completed: number }
  | { kind: "completed"; result: PremiumResult; relationType: string }
  | { kind: "retry"; offer: RetryOffer; message: string }
  | { kind: "stalled"; message: string }
  | { kind: "notice"; message: string };

type Rec = Record<string, unknown>;
const rec = (value: unknown): Rec => (value && typeof value === "object" && !Array.isArray(value) ? value as Rec : {});
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const text = (value: unknown) => (typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "");

const AXIS_LABELS: Array<[string, string, string]> = [
  ["attraction", "끌림", "서로에게 마음이 가는 힘"],
  ["stability", "안정", "함께 있을 때의 편안함"],
  ["communication", "소통", "말과 마음이 오가는 결"],
  ["endurance", "지속", "오래 이어 가는 힘"],
];
const ELEMENTS = ["목", "화", "토", "금", "수"] as const;
const PILLAR_LABELS: Array<[string, string]> = [["hour", "시주"], ["day", "일주"], ["month", "월주"], ["year", "년주"]];
const UNCERTAINTY_TEXT: Record<string, string> = {
  self_birth_time_unknown: "내 태어난 시간을 몰라 시주를 빼고 계산했어요.",
  partner_birth_time_unknown: "상대의 태어난 시간을 몰라 시주를 빼고 계산했어요.",
};

function readSessionId() {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  return (params.get("sid") || params.get("sessionId") || "").trim();
}

function PersonCard({ label, person }: { label: string; person: Rec }) {
  const pillars = rec(person.pillars);
  const elements = rec(person.fiveElements);
  return (
    <div className={styles.personCard}>
      <p className={styles.cardEyebrow}>{label} · 일간 {text(person.dayMasterLabel)}</p>
      <dl className={styles.pillars}>
        {PILLAR_LABELS.map(([key, name]) => (
          <div key={key}>
            <dt>{name}</dt>
            <dd>{text(pillars[key]) || "—"}</dd>
          </div>
        ))}
      </dl>
      <p className={styles.elements}>
        {ELEMENTS.map((element) => <span key={element}>{element} {text(elements[element]) || "0"}</span>)}
      </p>
    </div>
  );
}

function StaticCards({ cards }: { cards: Rec }) {
  const axis = rec(cards.axisScores);
  const complement = list(rec(cards.elementComplement).lines).map(text).filter(Boolean);
  const harmony = rec(cards.harmonyClash);
  const dayStem = rec(harmony.dayStem);
  const relations = list(harmony.relations).map(rec);
  const temperament = rec(cards.partnerTemperament);
  const evidence = list(temperament.evidence).map(rec);
  const pastLife = rec(cards.pastLife);
  const uncertainty = list(cards.uncertainty).map(text).map((key) => UNCERTAINTY_TEXT[key]).filter(Boolean);
  return (
    <div className={styles.cards}>
      <section className={styles.card} aria-labelledby="scp-people">
        <h2 id="scp-people" className={styles.cardTitle}>두 사람의 원국</h2>
        <div className={styles.peopleGrid}>
          <PersonCard label="나" person={rec(cards.self)} />
          <PersonCard label="상대" person={rec(cards.partner)} />
        </div>
        {uncertainty.map((line) => <p key={line} className={styles.cardNote}>{line}</p>)}
      </section>

      <section className={styles.card} aria-labelledby="scp-axis">
        <h2 id="scp-axis" className={styles.cardTitle}>궁합 네 갈래</h2>
        <ul className={styles.axisList}>
          {AXIS_LABELS.map(([key, label, hint]) => {
            const score = Math.max(0, Math.min(100, Number(axis[key]) || 0));
            return (
              <li key={key}>
                <span className={styles.axisName}>{label}<small>{hint}</small></span>
                <span className={styles.axisBar} aria-hidden="true"><i style={{ width: `${score}%` }} /></span>
                <span className={styles.axisScore}>{score}</span>
              </li>
            );
          })}
        </ul>
      </section>

      {complement.length ? (
        <section className={styles.card} aria-labelledby="scp-complement">
          <h2 id="scp-complement" className={styles.cardTitle}>서로 채워 주는 오행</h2>
          <ul className={styles.plainList}>{complement.map((line) => <li key={line}>{line}</li>)}</ul>
        </section>
      ) : null}

      <section className={styles.card} aria-labelledby="scp-harmony">
        <h2 id="scp-harmony" className={styles.cardTitle}>합과 충</h2>
        <p className={styles.cardLead}>
          일간 {text(dayStem.selfStem)} · {text(dayStem.partnerStem)} — {text(dayStem.relationLabel)}
          {text(dayStem.partnerAsMyTenGod) ? ` (내게 상대는 ${text(dayStem.partnerAsMyTenGod)}, 상대에게 나는 ${text(dayStem.meAsPartnerTenGod)})` : ""}
        </p>
        <p className={styles.cardNote}>돕는 결 {text(harmony.supportCount) || "0"}곳 · 부딪히는 결 {text(harmony.tensionCount) || "0"}곳</p>
        {relations.length ? (
          <ul className={styles.relationList}>
            {relations.map((relation, index) => (
              <li key={index} data-polarity={text(relation.polarity)}>
                <b>{text(relation.type)}</b> 나의 {text(relation.selfPillar)} {text(relation.selfBranchKo)}({text(relation.selfBranch)}) · 상대의 {text(relation.partnerPillar)} {text(relation.partnerBranchKo)}({text(relation.partnerBranch)})
                {text(relation.element) ? ` → ${text(relation.element)} 기운` : ""}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className={styles.card} aria-labelledby="scp-temperament">
        <h2 id="scp-temperament" className={styles.cardTitle}>상대의 이성 기질 지표</h2>
        <p className={styles.cardLead}>
          <span className={styles.grade}>{text(temperament.grade) || "—"}</span>
          {text(temperament.maxScore) ? ` 원국 지표 ${text(temperament.score) || "0"} / ${text(temperament.maxScore)}` : ""}
        </p>
        {evidence.length ? (
          <ul className={styles.plainList}>
            {evidence.map((item) => <li key={text(item.key) || text(item.label)}><b>{text(item.label)}</b> {text(item.detail)}</li>)}
          </ul>
        ) : <p className={styles.cardNote}>눈에 띄는 근거가 많지 않은 원국이에요.</p>}
        <p className={styles.cardNote}>근거: {text(temperament.basis)}</p>
        {text(temperament.caution) ? <p className={styles.caution}>{text(temperament.caution)}</p> : null}
      </section>

      {text(pastLife.title) ? (
        <section className={styles.card} aria-labelledby="scp-pastlife">
          <h2 id="scp-pastlife" className={styles.cardTitle}>전생 인연 · {text(pastLife.grade)}</h2>
          <p className={styles.cardLead}>{text(pastLife.title)}</p>
          <p>{text(pastLife.text)}</p>
          {text(pastLife.note) ? <p className={styles.cardNote}>{text(pastLife.note)}</p> : null}
        </section>
      ) : null}
    </div>
  );
}

// 보관함(/records/view/)도 같은 렌더러로 저장 원본을 그린다. saved 면 제목 계층과 바깥 링크만 바꾼다.
export function SajuCompatPremiumReading({ result, saved = false }: { result: PremiumResult; saved?: boolean }) {
  const cards = rec(result.staticCards);
  const Title = saved ? "h2" : "h1";
  return (
    <article className={styles.result}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>사주 고급 궁합{text(cards.relationLabel) ? ` · ${text(cards.relationLabel)}` : ""}</p>
        <Title className={styles.title}>{text(result.summaryTitle) || "두 사람의 고급 궁합"}</Title>
        {text(result.oneLine) ? <p className={styles.lead}>{text(result.oneLine)}</p> : null}
        {list(result.keywords).length ? (
          <ul className={styles.keywords}>{list(result.keywords).map(text).filter(Boolean).map((word) => <li key={word}>{word}</li>)}</ul>
        ) : null}
      </header>
      <StaticCards cards={cards} />
      {list(result.chapters).map(rec).map((chapter, index) => (
        <section key={text(chapter.key) || index} className={styles.chapter} aria-labelledby={`scp-ch-${index}`}>
          <p className={styles.cardEyebrow}>{index + 1}장</p>
          <h2 id={`scp-ch-${index}`} className={styles.chapterTitle}>{text(chapter.label)}</h2>
          {list(chapter.sections).map(rec).map((section, sectionIndex) => (
            <div key={sectionIndex} className={styles.section}>
              <h3>{text(section.title)}</h3>
              {text(section.body).split(/\n{2,}/).filter(Boolean).map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}
            </div>
          ))}
        </section>
      ))}
      {list(result.actionTips).length ? (
        <section className={styles.card} aria-labelledby="scp-tips">
          <h2 id="scp-tips" className={styles.cardTitle}>함께 해 볼 작은 실천</h2>
          <ul className={styles.plainList}>{list(result.actionTips).map(text).filter(Boolean).map((tip) => <li key={tip}>{tip}</li>)}</ul>
        </section>
      ) : null}
      {text(result.finalMessage) ? <p className={styles.finalMessage}>{text(result.finalMessage)}</p> : null}
      {text(result.temperamentCaution) ? <p className={styles.caution}>{text(result.temperamentCaution)}</p> : null}
      {saved ? null : <p className={styles.footerLinks}>
        <a href="/records/">보관함에서 다시 보기</a>
        <a href="/saju/compatibility/">사주 궁합 안내로 돌아가기</a>
      </p>}
    </article>
  );
}

export default function SajuCompatPremiumResultClient() {
  const [view, setView] = useState<View>({ kind: "loading" });
  const [busy, setBusy] = useState(false);
  const [refundMessage, setRefundMessage] = useState("");
  const previewRef = useRef(false);
  const captureDeliveryScope = usePaidDeliveryScope(() => {
    setView({ kind: "notice", message: "계정이 바뀌어 이 궁합 풀이를 닫았어요. 보관함에서 다시 열어 주세요." });
  });

  const applyOutcome = useCallback((outcome: GenerationOutcome) => {
    switch (outcome.kind) {
      case "completed":
        setView({ kind: "completed", result: outcome.payload.result || {}, relationType: outcome.payload.relationType || "" });
        return;
      case "retry":
        setView({ kind: "retry", offer: outcome.offer, message: outcome.message });
        return;
      case "stalled":
        setView({ kind: "stalled", message: outcome.message || STALLED_MESSAGE });
        return;
      case "refund":
      case "error":
        setView({ kind: "notice", message: outcome.message });
        return;
      case "payment":
        setView({ kind: "notice", message: "이 궁합의 결제 확인이 필요해요. 보관함이나 결제 내역을 확인해 주세요." });
        return;
      default:
    }
  }, []);

  const continueGeneration = useCallback(async (first: { path: string; body: Record<string, unknown> }, startCompleted: number) => {
    const isCurrent = captureDeliveryScope();
    setView({ kind: "generating", completed: startCompleted });
    const outcome = await runPremiumGeneration({
      first,
      isCurrent,
      onProgress: (completed) => { if (isCurrent()) setView({ kind: "generating", completed }); },
    });
    if (!isCurrent() || outcome.kind === "cancelled") return;
    applyOutcome(outcome);
  }, [applyOutcome, captureDeliveryScope]);

  const handlePayload = useCallback((status: number, payload: SessionPayload, sessionId: string) => {
    if (status === 200 && payload.status === "completed" && payload.result) {
      setView({ kind: "completed", result: payload.result, relationType: payload.relationType || "" });
      return;
    }
    const offer = readRetryOffer(payload);
    if (offer) {
      setView({ kind: "retry", offer, message: RETRY_MESSAGE });
      return;
    }
    const refund = refundNotice(payload);
    if (refund) {
      setView({ kind: "notice", message: refund });
      return;
    }
    if (status === 401 || payload.reason === "LOGIN_REQUIRED") {
      setView({ kind: "notice", message: LOGIN_REQUIRED_MESSAGE });
      return;
    }
    if (status === 202) {
      const completed = Number(payload.progress?.completed) || 0;
      if (previewRef.current) {
        setView({ kind: "stalled", message: STALLED_MESSAGE });
        return;
      }
      void continueGeneration({ path: `${API_BASE}/generate`, body: { resumeSessionId: payload.resumeSessionId || sessionId } }, completed);
      return;
    }
    setView({ kind: "notice", message: payload.message || SERVER_ERROR_MESSAGE });
  }, [continueGeneration]);

  const load = useCallback(async () => {
    const preview = readDevPreviewState();
    if (preview) {
      previewRef.current = true;
      const fixture = buildSajuCompatPremiumPreviewPayload(preview);
      handlePayload(fixture.status, fixture.body as SessionPayload, "preview-saju-compat-premium");
      return;
    }
    const sessionId = readSessionId();
    if (!sessionId) {
      setView({ kind: "notice", message: "열 궁합 풀이를 찾지 못했어요. 보관함에서 다시 열어 주세요." });
      return;
    }
    const isCurrent = captureDeliveryScope();
    try {
      const response = await authFetch(`${API_BASE}/result?sessionId=${encodeURIComponent(sessionId)}`, { credentials: "include" });
      const payload = await response.json().catch(() => ({})) as SessionPayload;
      if (!isCurrent()) return;
      handlePayload(response.status, payload, sessionId);
    } catch {
      if (!isCurrent()) return;
      setView({ kind: "stalled", message: STALLED_MESSAGE });
    }
  }, [captureDeliveryScope, handlePayload]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleRetry(offer: RetryOffer) {
    if (busy || previewRef.current) return;
    setBusy(true);
    setRefundMessage("");
    try {
      await continueGeneration({ path: `${API_BASE}/retry`, body: { sessionId: offer.sessionId } }, 0);
    } finally {
      setBusy(false);
    }
  }

  async function handleRefund(offer: RetryOffer) {
    if (busy || previewRef.current) return;
    setBusy(true);
    const isCurrent = captureDeliveryScope();
    try {
      const { response, payload } = await requestRefund(offer.sessionId);
      if (!isCurrent()) return;
      if (response.ok && payload.ok !== false) {
        setView({ kind: "notice", message: payload.refunded ? "환불을 마쳤어요. 결제 수단에 따라 반영까지 며칠 걸릴 수 있어요." : "환불 요청을 접수했어요. 처리되면 결제 내역에 반영돼요." });
      } else {
        setRefundMessage(payload.message || "환불 요청을 접수하지 못했어요. 잠시 후 다시 시도하거나 고객센터로 알려 주세요.");
      }
    } catch {
      if (isCurrent()) setRefundMessage("환불 요청을 보내지 못했어요. 연결을 확인한 뒤 다시 시도해 주세요.");
    } finally {
      if (isCurrent()) setBusy(false);
    }
  }

  if (view.kind === "completed") return <SajuCompatPremiumReading result={view.result} />;

  if (view.kind === "loading" || view.kind === "generating") {
    const completed = view.kind === "generating" ? view.completed : 0;
    return (
      <GenerationProgress
        title="연이가 두 사람의 궁합을 쓰고 있어요"
        status={view.kind === "loading" ? "저장된 궁합 풀이를 확인하고 있어요." : `네 장 중 ${completed}장을 마쳤어요.`}
        description="한 장씩 저장하며 쓰기 때문에 화면을 닫아도 쓴 장은 사라지지 않아요."
        completed={view.kind === "generating" ? completed : null}
        total={view.kind === "generating" ? CHAPTER_TOTAL : null}
        countUnit="장"
        timing
        typicalRange="보통 1~3분"
        persona="yeoni"
        counselor={{ src: masterProfiles.yeoni.portrait }}
      />
    );
  }

  return (
    <section className={styles.statusPanel} aria-live="polite">
      <h1 className={styles.title}>사주 고급 궁합</h1>
      {view.kind === "retry" ? (
        <>
          <p>{view.message}</p>
          <div className={styles.actions}>
            <button type="button" className={styles.primary} disabled={busy} onClick={() => void handleRetry(view.offer)}>{RETRY_LABEL}</button>
            <button type="button" className={styles.secondary} disabled={busy} onClick={() => void handleRefund(view.offer)}>{REFUND_LABEL}</button>
          </div>
          {refundMessage ? <p className={styles.error} role="alert">{refundMessage}</p> : null}
        </>
      ) : view.kind === "stalled" ? (
        <>
          <p>{view.message}</p>
          <div className={styles.actions}>
            <button type="button" className={styles.primary} disabled={previewRef.current} onClick={() => { setView({ kind: "loading" }); void load(); }}>이어서 보기</button>
          </div>
        </>
      ) : (
        <p>{view.message}</p>
      )}
      <p className={styles.footerLinks}>
        <a href="/records/">보관함</a>
        <a href="/saju/compatibility/">사주 궁합 안내</a>
      </p>
    </section>
  );
}
