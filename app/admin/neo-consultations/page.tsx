"use client";
import { useCallback, useEffect, useState } from "react";
import { adminFetch } from "../_lib/admin-api";
import { NEO_EMAIL_SALE_ENABLED, NEO_STATUS_LABELS, neoMoney, neoReadingMode, neoReadingLabel, neoReviewReady } from "@/lib/neo-consultation/contract";
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
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try { setOrders((await adminFetch<{ orders: NeoOrder[] }>("/api/admin/neo-consultations")).orders); }
    catch (e) { setError((e as Error).message); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const select = async (id: string) => {
    setBusy(true); setError("");
    try { setOrder((await adminFetch<{ order: NeoOrder }>("/api/admin/neo-consultations/" + id)).order); setAnswers({}); setCorrections({}); setCombinedChecks({}); }
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
  const dirty = order?.questions.some(q => answers[q.id] !== undefined && answers[q.id] !== (q.answer || ""));
  const ready = paid && !dirty && order?.questions.every(neoReviewReady);
  return <main className={styles.page}>
    <h1>네오 이메일 상담</h1><p>질문을 직접 확인하고, 준비한 답변을 붙여 넣어 검수해 주세요. 자동 AI 호출은 없습니다.</p>
    <p className={styles.notice}>{NEO_EMAIL_SALE_ENABLED ? '보통 24시간 이내, 늦어도 결제 후 3일 이내 답변을 보내 주세요. 최초 발송 후 7일이 지나면 본문은 삭제됩니다.' : '판매·실제 발송 차단 상태입니다. 로컬 mock에서만 주문 흐름을 검증합니다.'}</p>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <button disabled={busy} onClick={load}>접수 목록 새로고침</button>
    <div className={styles.layout}><aside aria-label="접수 목록">{orders.length === 0 && <p>접수된 상담이 없습니다.</p>}{orders.map(row => <button key={row.id} onClick={() => select(row.id)} disabled={busy} aria-pressed={row.id === order?.id}>{row.questions[0].text}<small>{label(row.state)} · 질문 {row.questions.length}개</small></button>)}</aside>
      {order && <article><h2>{label(order.state)}</h2><p>주문번호 {order.id}</p><p>결제 주문번호 {order.payment?.id || '미발급'}</p>{order.cancellationRequestedAt && <p className={styles.notice}>취소·전액 환불 요청이 접수되었습니다. 답변 발송은 중지됩니다. <a href="/admin/orders/">결제 주문 관리</a>에서 위 결제 주문번호로 확인하고 환불 처리해 주세요.</p>}<dl><dt>회신 이메일</dt><dd>{order.email}</dd><dt>결제</dt><dd>{order.payment?.status || "미결제"} · {neoMoney(order.quote?.totalKRW || 0)}</dd><dt>상황</dt><dd>{order.context || "없음"}</dd><dt>특별히 좋았던 시기</dt><dd style={{whiteSpace:"pre-wrap"}}>{order.goodPeriod || "입력하지 않음"}</dd><dt>힘들었던 시기</dt><dd style={{whiteSpace:"pre-wrap"}}>{order.difficultPeriod || "입력하지 않음"}</dd><dt>출생정보</dt><dd>{order.birth ? [order.birth.date, order.birth.calendar === "lunar" ? "음력" : "양력", order.birth.leapMonth ? "윤달" : "평달", order.birth.timeUnknown ? "시간 모름" : order.birth.time].join(" / ") : "입력하지 않음"}</dd></dl>
        {order.questions.map((q,i) => <section key={q.id} className={styles.question}><h3>질문 {i+1}. {q.text}</h3><p>{neoReadingLabel(q)} · {neoMoney(order.quote?.items?.find(item => item.questionId === q.id)?.unitKRW ?? order.quote?.unitKRW ?? 0)}</p>
          {q.correction && <p className={styles.notice}>정정 요청: {q.correction}</p>}
          <label htmlFor={"answer-" + q.id}>질문 {i+1} 답변</label><textarea id={"answer-" + q.id} rows={12} maxLength={30000} value={answers[q.id] ?? q.answer ?? ""} onChange={e => { setAnswers({ ...answers, [q.id]: e.target.value }); setCombinedChecks({...combinedChecks, [q.id]: false}); }} disabled={busy || !paid} />
          {neoReadingMode(q) === 'ziwei_saju' && <label className={styles.combinedCheck}><input type="checkbox" checked={combinedChecks[q.id] === true} disabled={busy || !paid} onChange={e => setCombinedChecks({...combinedChecks, [q.id]: e.target.checked})} />질문 {i+1}에 자미두수와 사주 풀이가 모두 포함됐는지 확인했습니다.</label>}
          <div className={styles.actions}><button disabled={busy || !paid} onClick={() => action("answer", { questionId: q.id, answer: answers[q.id] ?? q.answer ?? "" })}>답변 저장하기</button><button disabled={busy || !paid || !q.answer || !!q.correction || (neoReadingMode(q) === 'ziwei_saju' && !combinedChecks[q.id]) || (answers[q.id] !== undefined && answers[q.id] !== q.answer)} onClick={() => action("review", { questionId: q.id, combinedReadingConfirmed: combinedChecks[q.id] === true })}>직접 검수 완료</button></div>
          {q.review && <p>네오 검수 완료 · {q.review.at} · 답변 버전 {q.review.answerVersion}</p>}
          <details><summary>여러 질문·정보 정정 요청</summary><label htmlFor={"correction-" + q.id}>정정 안내</label><textarea id={"correction-" + q.id} rows={3} maxLength={1000} value={corrections[q.id] || ""} onChange={e => setCorrections({ ...corrections, [q.id]: e.target.value })} placeholder="이번 질문에서 답변받을 한 가지 주제를 골라 주세요. 다른 질문은 별도로 추가할 수 있어요." /><button disabled={busy || !paid || !corrections[q.id]?.trim()} onClick={() => action("correction", { questionId: q.id, message: corrections[q.id] })}>질문 정정 요청하기</button></details>
        </section>)}
        <section className={styles.preview}><h3>통합 이메일 미리보기</h3>{order.questions.map((q,i) => <div key={q.id}><h4>질문 {i+1}. {q.text}</h4><p>{neoReadingLabel(q)}</p><p>{q.answer || "아직 저장된 답변이 없습니다."}</p></div>)}</section>
        <div className={styles.actions}><button disabled={busy || !ready} onClick={() => action("send", {})}>검수한 답변 발송 예약</button><button disabled={busy || !ready || !order.deliveries.length} onClick={() => action("send", { resend: true })}>같은 답변 재발송 예약</button></div>
        <h3>메일 전달 상태</h3>{order.mailJobs?.map(job => <div className={styles.mail} key={job.key}><p>{job.kind === "receipt" ? "운영자 접수 메일" : job.kind === "cancellation" ? "운영자 취소 요청 메일" : "고객 답변"} · {mailLabel(job.state)} · 시도 {job.attempt}회</p>{["pending","retry"].includes(job.state) && <button disabled={busy || !paid} onClick={() => action("deliver", { jobKey: job.key })}>예약 메일 전달하기</button>}{["sending","unknown"].includes(job.state) && <><p>메일 제공자의 전달 기록을 확인한 후에만 결과를 지정하세요.</p><button disabled={busy || !paid} onClick={() => action("resolve-delivery", { jobKey: job.key, resolution: "sent" })}>전달 완료 확인</button><button disabled={busy || !paid} onClick={() => action("resolve-delivery", { jobKey: job.key, resolution: "not_sent" })}>미전달 확인 · 재시도 허용</button></>}</div>)}
      </article>}
    </div>
  </main>;
}
