"use client";
import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Mail, RefreshCw, FileCheck2, Send, Inbox, ArrowRight } from "lucide-react";
import { adminFetch } from "../_lib/admin-api";
import { NEO_EMAIL_SALE_ENABLED, NEO_STATUS_LABELS, neoMoney, neoChartLabel, neoChartReading, neoCombinedMode, neoReadingLabel, neoReviewReady } from "@/lib/neo-consultation/contract";
import { AI_LOCALE_LABEL, toAiLocale } from "@/lib/i18n/ai-locale";
import type { NeoOrder } from "@/app/neo-consultation/types";
import styles from "./review.module.css";

const label = (state: string) => (NEO_STATUS_LABELS as Record<string,string>)[state] || state;
const mailLabel = (state: string) => ({ pending: "발송 대기", sending: "전달 확인 중", sent: "발송 완료", retry: "전달 재시도", unknown: "전달 확인 필요" } as Record<string,string>)[state] || state;
export default function NeoConsultationAdmin() {
  const [orders, setOrders] = useState<NeoOrder[]>([]);
  const [order, setOrder] = useState<NeoOrder | null>(null);
  const [answers, setAnswers] = useState<Record<string,string>>({});
  const [corrections, setCorrections] = useState<Record<string,string>>({});
  const [combinedChecks, setCombinedChecks] = useState<Record<string,boolean>>({});
  const [chartChecks, setChartChecks] = useState<Record<string,boolean>>({});
  const [manualConfirmed, setManualConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const load = useCallback(async () => {
    setLoadingList(true);
    try { setOrders((await adminFetch<{ orders: NeoOrder[] }>("/api/admin/neo-consultations")).orders); }
    catch (e) { setError((e as Error).message); }
    finally { setLoadingList(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const select = async (id: string) => {
    setBusy(true); setError("");
    try { setOrder((await adminFetch<{ order: NeoOrder }>("/api/admin/neo-consultations/" + id)).order); setAnswers({}); setCorrections({}); setCombinedChecks({}); setChartChecks({}); setManualConfirmed(false); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const action = async (name: string, data: object) => {
    if (!order) return;
    setBusy(true); setError("");
    try {
      const result = await adminFetch<{ order: NeoOrder }>("/api/admin/neo-consultations/" + order.id + "/" + name, { method: "POST", body: JSON.stringify({ ...data, version: order.version }) });
      setOrder(result.order); await load();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const paid = order?.payment?.status === "paid" && !order?.cancellationRequestedAt && !order?.contentDeletedAt;
  const manual = order?.deliveryMode === "manual_email";
  const dirty = order?.questions.some(q => answers[q.id] !== undefined && answers[q.id] !== (q.answer || ""));
  const ready = paid && !dirty && order?.questions.every(neoReviewReady);
  return <main className={styles.page}>
    <header className={styles.hero}>
      <div className={styles.heroCopy}>
        <h1>네오 이메일 상담</h1>
        <p className={styles.lead}>한 통의 질문을 읽고,<br />명확한 답변으로 마무리하세요.</p>
        <p>접수 내용을 읽고 내부 시스템에서 답변을 작성·검수한 뒤 직접 이메일로 보내 주세요. 새 주문의 답변 본문은 이 서비스에 입력하거나 저장하지 않습니다.</p>
        <a className={styles.jump} href="#neo-intake"><Inbox size={17} aria-hidden="true" />접수 목록 확인<ArrowRight size={16} aria-hidden="true" /></a>
      </div>
      <figure className={styles.heroArt}>
        <Image src="/images/service-introductions/neo-consultation-640.webp" width={640} height={427} sizes="(max-width:760px) 100vw, 480px" alt="네오가 별빛 서재에서 상담 편지를 검토하는 장면" />
        <figcaption>네오의 서재 · 접수부터 전달 기록까지</figcaption>
      </figure>
    </header>
    <ol className={styles.workflow} aria-label="상담 처리 순서">
      <li><Inbox aria-hidden="true" size={20} /><div><strong>접수 확인</strong><span>질문·결제·회신 주소 확인</span></div></li>
      <li><FileCheck2 aria-hidden="true" size={20} /><div><strong>답변 작성·검수</strong><span>선택한 풀이 범위까지 확인</span></div></li>
      <li><Send aria-hidden="true" size={20} /><div><strong>이메일 전달</strong><span>실제 발송 후 완료 이력 기록</span></div></li>
    </ol>
    <p className={styles.notice}>{NEO_EMAIL_SALE_ENABLED ? '보통 24시간 이내, 늦어도 결제 후 3일 이내 답변을 보내 주세요. 새 주문의 접수 정보는 발송 완료를 기록한 뒤 7일 후 삭제됩니다.' : '판매·실제 발송 차단 상태입니다. 로컬 mock에서만 주문 흐름을 검증합니다.'}</p>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <div id="neo-intake" className={styles.intakeHeading}><div><h2>접수 목록</h2><p>{loadingList ? "접수 내용을 불러오는 중" : `조회된 상담 ${orders.length}건 · 선택하면 상세 내용이 열립니다.`}</p></div><button disabled={busy || loadingList} onClick={load}><RefreshCw size={16} aria-hidden="true" />{loadingList ? "불러오는 중" : "접수 목록 새로고침"}</button></div>
    <div className={styles.layout}><aside aria-label="접수 목록" aria-busy={loadingList}>{!loadingList && !error && orders.length === 0 && <p className={styles.listEmpty}>접수된 상담이 없습니다.<br />새 상담이 접수되면 이곳에서 확인할 수 있어요.</p>}{orders.map(row => <button key={row.id} onClick={() => select(row.id)} disabled={busy} aria-pressed={row.id === order?.id}><span className={styles.orderTitle}>{row.questions[0].text}</span><small>{label(row.state)} · 질문 {row.questions.length}개</small><span className={styles.orderHint}>{row.id === order?.id ? "선택한 상담" : "상담 내용 확인"}<ArrowRight size={14} aria-hidden="true" /></span></button>)}</aside>
      {!order && <section className={styles.empty} aria-label="상담 선택 안내"><Mail size={32} aria-hidden="true" /><h2>{busy ? "상담 내용을 확인하고 있어요" : "검토할 상담을 선택하세요"}</h2><p>접수 목록에서 질문을 고르면 회신 이메일과 상담 범위를 확인할 수 있습니다.</p><p className={styles.emptyNote}>결제·취소 상태를 확인한 후 답변 작업을 시작하세요.</p></section>}
      {order && <article><h2>{label(order.state)}</h2><p>주문번호 {order.id}</p><p>결제 주문번호 {order.payment?.id || '미발급'}</p>{order.cancellationRequestedAt && <p className={styles.notice}>취소·전액 환불 요청이 접수되었습니다. 답변 발송은 중지됩니다. <a href="/admin/orders/">결제 주문 관리</a>에서 위 결제 주문번호로 확인하고 환불 처리해 주세요.</p>}<dl><dt>회신 이메일</dt><dd>{order.email}</dd><dt>요청 답변 언어</dt><dd>{AI_LOCALE_LABEL[toAiLocale(order.locale)]} · 이 언어로 작성하고 검수하세요.</dd><dt>결제</dt><dd>{order.payment?.status || "미결제"} · {neoMoney(order.quote?.totalKRW || 0)}</dd><dt>상황</dt><dd>{order.context || "없음"}</dd><dt>특별히 좋았던 시기</dt><dd style={{whiteSpace:"pre-wrap"}}>{order.goodPeriod || "입력하지 않음"}</dd><dt>힘들었던 시기</dt><dd style={{whiteSpace:"pre-wrap"}}>{order.difficultPeriod || "입력하지 않음"}</dd><dt>출생정보</dt><dd>{order.birth ? [order.birth.date, order.birth.calendar === "lunar" ? "음력" : "양력", order.birth.leapMonth ? "윤달" : "평달", order.birth.timeUnknown ? "시간 모름" : order.birth.time].join(" / ") : "입력하지 않음"}</dd><dt>상대방 출생정보</dt><dd>{order.partnerBirth ? [order.partnerBirth.date, order.partnerBirth.calendar === "lunar" ? "음력" : "양력", order.partnerBirth.leapMonth ? "윤달" : "평달", order.partnerBirth.timeUnknown ? "시간 모름" : order.partnerBirth.time].join(" / ") : "입력하지 않음"}</dd></dl>
        {order.questions.map((q,i) => <section key={q.id} className={styles.question}><h3>질문 {i+1}. {q.text}</h3><p>{neoReadingLabel(q)} · {neoMoney(order.quote?.items?.find(item => item.questionId === q.id)?.unitKRW ?? order.quote?.unitKRW ?? 0)}</p>
          {q.correction && <p className={styles.notice}>정정 요청: {q.correction}</p>}
          {!manual && <><label htmlFor={"answer-" + q.id}>질문 {i+1} 답변</label><textarea id={"answer-" + q.id} rows={12} maxLength={30000} value={answers[q.id] ?? q.answer ?? ""} onChange={e => { setAnswers({ ...answers, [q.id]: e.target.value }); setCombinedChecks({...combinedChecks, [q.id]: false}); setChartChecks({...chartChecks, [q.id]: false}); }} disabled={busy || !paid} />
          {neoCombinedMode(q) && <label className={styles.combinedCheck}><input type="checkbox" checked={combinedChecks[q.id] === true} disabled={busy || !paid} onChange={e => setCombinedChecks({...combinedChecks, [q.id]: e.target.checked})} />질문 {i+1}에 자미두수와 사주 풀이가 모두 포함됐는지 확인했습니다.</label>}
          {neoChartReading(q) && <label className={styles.combinedCheck}><input type="checkbox" checked={chartChecks[q.id] === true} disabled={busy || !paid} onChange={e => setChartChecks({...chartChecks, [q.id]: e.target.checked})} />질문 {i+1}에 {neoChartLabel(q)}이 포함됐는지 확인했습니다.</label>}
          <div className={styles.actions}><button disabled={busy || !paid} onClick={() => action("answer", { questionId: q.id, answer: answers[q.id] ?? q.answer ?? "" })}>답변 저장하기</button><button disabled={busy || !paid || !q.answer || !!q.correction || (neoCombinedMode(q) && !combinedChecks[q.id]) || (neoChartReading(q) && !chartChecks[q.id]) || (answers[q.id] !== undefined && answers[q.id] !== q.answer)} onClick={() => action("review", { questionId: q.id, combinedReadingConfirmed: combinedChecks[q.id] === true, chartReadingConfirmed: chartChecks[q.id] === true })}>직접 검수 완료</button></div>
          {q.review && <p>네오 검수 완료 · {q.review.at} · 답변 버전 {q.review.answerVersion}</p>}</>}
          {!order.manualDelivery && <details><summary>여러 질문·정보 정정 요청</summary><label htmlFor={"correction-" + q.id}>정정 안내</label><textarea id={"correction-" + q.id} rows={3} maxLength={1000} value={corrections[q.id] || ""} onChange={e => setCorrections({ ...corrections, [q.id]: e.target.value })} placeholder="이번 질문에서 답변받을 한 가지 주제를 골라 주세요. 다른 질문은 별도로 추가할 수 있어요." /><button disabled={busy || !paid || !corrections[q.id]?.trim()} onClick={() => action("correction", { questionId: q.id, message: corrections[q.id] })}>질문 정정 요청하기</button></details>}
        </section>)}
        {!manual && <><section className={styles.preview}><h3>통합 이메일 미리보기</h3>{order.questions.map((q,i) => <div key={q.id}><h4>질문 {i+1}. {q.text}</h4><p>{neoReadingLabel(q)}</p><p>{q.answer || "아직 저장된 답변이 없습니다."}</p></div>)}</section>
        <div className={styles.actions}><button disabled={busy || !ready} onClick={() => action("send", {})}>검수한 답변 발송 예약</button><button disabled={busy || !ready || !order.deliveries.length} onClick={() => action("send", { resend: true })}>같은 답변 재발송 예약</button></div></>}
        {manual && <section><h3>직접 이메일 전달</h3><p>발송 직전에 접수 목록을 새로고침해 결제·취소 상태와 회신 이메일을 확인하세요. 이메일 발송은 외부에서 직접 진행하며, 아래 버튼은 발송 이력만 기록합니다.</p>{order.manualDelivery ? <p role="status">발송 완료 기록 · {order.manualDelivery.sentAt}</p> : <><label className={styles.combinedCheck}><input type="checkbox" checked={manualConfirmed} disabled={busy || !paid} onChange={e => setManualConfirmed(e.target.checked)} />모든 질문과 선택한 사주·자미두수·원국·명반 풀이를 요청한 답변 언어로 검수하고, 회신 이메일로 실제 발송했습니다.</label><button disabled={busy || !paid || !manualConfirmed || order.questions.some(q => q.correction)} onClick={() => action("complete-manual-delivery", { confirmed: manualConfirmed })}>이메일 발송 완료 기록하기</button></>}</section>}
        <h3>메일 전달 상태</h3>{order.mailJobs?.map(job => <div className={styles.mail} key={job.key}><p>{job.kind === "receipt" ? "운영자 접수 메일" : job.kind === "cancellation" ? "운영자 취소 요청 메일" : "고객 답변"} · {mailLabel(job.state)} · 시도 {job.attempt}회</p>{["pending","retry"].includes(job.state) && <button disabled={busy || !paid} onClick={() => action("deliver", { jobKey: job.key })}>예약 메일 전달하기</button>}{["sending","unknown"].includes(job.state) && <><p>메일 제공자의 전달 기록을 확인한 후에만 결과를 지정하세요.</p><button disabled={busy || !paid} onClick={() => action("resolve-delivery", { jobKey: job.key, resolution: "sent" })}>전달 완료 확인</button><button disabled={busy || !paid} onClick={() => action("resolve-delivery", { jobKey: job.key, resolution: "not_sent" })}>미전달 확인 · 재시도 허용</button></>}</div>)}
      </article>}
    </div>
  </main>;
}
