"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LazyMotion, domAnimation, m, useReducedMotion } from "framer-motion";
import { useAuthStore } from "@/app/_lib/auth-store";
import { NEO_EMAIL_PORTRAIT, NEO_EMAIL_SALE_ENABLED, NEO_LIMITS, NEO_STATUS_LABELS, hasMultipleQuestions, neoMoney, neoTotal, neoUnitPrice, validateNeoInput } from "@/lib/neo-consultation/contract";
import { PRESIDENTIAL_RECORDS } from "@/lib/brand/trust-stories.mjs";
import { neoCall } from "./api";
import type { NeoInput, NeoOrder } from "./types";
import styles from "./neo.module.css";

const statusLabel = (state: string) => (NEO_STATUS_LABELS as Record<string,string>)[state] || state;
export default function NeoConsultationClient() {
  const auth = useAuthStore();
  const reducedMotion = useReducedMotion();
  const [questions, setQuestions] = useState([""]);
  const [context, setContext] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState("");
  const [calendar, setCalendar] = useState("solar");
  const [leapMonth, setLeapMonth] = useState(false);
  const [timeUnknown, setTimeUnknown] = useState(true);
  const [time, setTime] = useState("");
  const [consent, setConsent] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState<NeoOrder | null>(null);
  const [history, setHistory] = useState<NeoOrder[]>([]);
  const [correction, setCorrection] = useState<Record<string,string>>({});
  const [mock, setMock] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    // 로컬 테스트 서버의 별도 endpoint만 인식. 운영 URL·query·env로 켤 수 없다.
    if (!["localhost","127.0.0.1"].includes(location.hostname)) return;
    fetch("/__neo_mock__/status").then(r => r.ok ? r.json() : null).then(data => setMock(data?.mock === true)).catch(() => {});
  }, []);
  const canSubmit = NEO_EMAIL_SALE_ENABLED || mock;
  const signedIn = auth.isAuthenticated || mock;
  const ownerKey = mock ? "mock" : auth.user?.id || "";
  useEffect(() => { setOrder(null); setHistory([]); }, [ownerKey]);
  useEffect(() => {
    if (!canSubmit || !signedIn) return;
    let active = true;
    const id = new URLSearchParams(location.search).get("order");
    if (id && /^[a-zA-Z0-9-]{1,80}$/.test(id)) {
      neoCall("/" + id).then(data => { if (active) { setOrder(data.order); setStep(2); } }).catch(e => { if (active) setError(e.message); });
    }
    return () => { active = false; };
  }, [canSubmit, signedIn, ownerKey]);
  const input = (): NeoInput => ({ questions, context, email, consent, birth: date ? { date, calendar, leapMonth, timeUnknown, time: timeUnknown ? null : time } : null });
  const run = async (task: () => Promise<void>) => {
    setBusy(true); setError("");
    try { await task(); } catch (e) { setError(e instanceof Error ? e.message : "잠시 후 다시 시도해 주세요."); } finally { setBusy(false); }
  };
  const next = () => {
    setError("");
    if (questions.some(q => !q.trim() || hasMultipleQuestions(q))) { setError("각 질문란에 한 가지 질문을 적어 주세요. 여러 질문은 추가 버튼으로 나눠 주세요."); return; }
    if (step === 1) {
      try { validateNeoInput(input()); } catch (e) { setError((e as Error).message); return; }
    }
    setStep(step + 1);
    requestAnimationFrame(() => heading.current?.focus());
  };
  const prepare = () => run(async () => {
    if (!signedIn) throw new Error("로그인한 뒤 상담을 신청해 주세요.");
    if (!canSubmit) throw new Error("판매 준비 중입니다. 아직 결제와 접수는 진행되지 않아요.");
    const created = (await neoCall("", input())).order;
    setOrder(created);
    const resumeUrl = new URL(location.href);
    resumeUrl.searchParams.set("order", created.id);
    window.history.replaceState(null, "", resumeUrl);
    const quoted = (await neoCall("/" + created.id + "/quote", { version: created.version })).order;
    setOrder(quoted);
    const prepared = (await neoCall("/" + quoted.id + "/prepare", { quoteId: quoted.quote!.id })).order;
    setOrder(prepared);
    if (mock) {
      const response = await fetch("/__neo_mock__/pay/" + prepared.id, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setOrder(data.order);
    }
  });
  const loadHistory = () => run(async () => { setHistory((await neoCall("")).orders); });
  const resume = () => run(async () => {
    if (!order) return;
    let current = (await neoCall("/" + order.id)).order;
    if (!current.quote) current = (await neoCall("/" + current.id + "/quote", { version: current.version })).order;
    current = (await neoCall("/" + current.id + "/prepare", { quoteId: current.quote!.id })).order;
    setOrder(current);
    if (mock) {
      const response = await fetch("/__neo_mock__/pay/" + current.id, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setOrder(data.order);
    }
  });
  return <LazyMotion features={domAnimation}><main className={styles.page}>
    <nav className={styles.nav}><Link href="/">Code Destiny</Link><a href="#neo-form">질문 작성하기</a></nav>
    <header className={styles.hero}>
      <m.div className={styles.heroCopy} initial={{ y: reducedMotion ? 0 : 16 }} animate={{ y: 0 }} transition={{ duration: .85, ease: [.16,1,.3,1] }}>
        <h1>네오에게<br /><span>물어봐</span></h1>
        <p className={styles.lead}>마음은 깊게 읽고,<br />선택은 선명하게.</p>
        <p className={styles.heroDescription}>혼자 맴돌던 고민을 질문 하나씩 정리해 보세요.<br />네오가 맥락을 살피고, AI 분석을 보조로 활용해<br className={styles.desktopBreak} /> 직접 검수한 답변을 이메일로 전합니다.</p>
        <a className={styles.primary} href="#neo-form">나의 질문 정리하기 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6" /></svg></a>
        <p className={styles.notice}>{mock ? "MOCK 미리보기 · 실제 결제와 이메일 발송이 없습니다." : "판매 준비 중 · 질문 작성 화면을 먼저 살펴보세요."}</p>
      </m.div>
      <m.figure className={styles.portrait} initial={{ y: reducedMotion ? 0 : 24 }} animate={{ y: 0 }} transition={{ duration: 1.1, ease: [.16,1,.3,1] }}>
        <svg className={styles.blueMoon} viewBox="0 0 360 360" aria-hidden="true"><defs><radialGradient id="neo-blue-moon"><stop stopColor="#dceeff" /><stop offset=".65" stopColor="#93b9e0" /><stop offset="1" stopColor="#365c89" /></radialGradient></defs><circle cx="180" cy="180" r="145" fill="url(#neo-blue-moon)" /><g fill="#446c99" opacity=".2"><ellipse cx="137" cy="122" rx="38" ry="26" /><ellipse cx="210" cy="218" rx="48" ry="41" /><circle cx="245" cy="113" r="24" /><circle cx="117" cy="232" r="18" /></g><circle cx="180" cy="180" r="166" fill="none" stroke="#8baacb" strokeWidth=".6" /></svg>
        <div className={styles.portraitFrame}><img src={NEO_EMAIL_PORTRAIT} width={600} height={720} alt="은빛 머리와 푸른 눈의 인간형 네오 캐릭터" fetchPriority="high" /></div>
        <figcaption><span>BLUE MOON</span><p>고민을 읽는 깊이,<br />다음 한 걸음의 명료함.</p><small>네오를 표현한 캐릭터 일러스트</small></figcaption>
      </m.figure>
    </header>
    <div className={styles.serviceLine}><p>질문 하나에 집중하는 상담</p><p>네오 직접 검수</p><p>질문당 {neoMoney(neoUnitPrice())} · 이메일 답변</p></div>
    <section className={styles.evidence} aria-labelledby="neo-evidence">
      <h2 id="neo-evidence">기록은 원문으로 확인하세요</h2>
      <p>2024년에 공개한 2025년 탄핵 가능성 분석과 대통령 가능 시기 기록입니다. 당시 해석과 이후 사건을 구분해 읽어 주세요.</p>
      <ul>{PRESIDENTIAL_RECORDS.map((record: { date: string; title: string; url: string }) => <li key={record.url}><time>{record.date}</time><a href={record.url} target="_blank" rel="noopener noreferrer">{record.title} · 원문 보기</a></li>)}</ul>
      <p className={styles.small}>과거 분석 사례이며, 특정 사건의 예측이나 같은 결과를 보장하지 않습니다.</p>
    </section>
    <section className={styles.formSection} id="neo-form" aria-labelledby="neo-form-title">
      <div className={styles.formIntro}><h2 id="neo-form-title" ref={heading} tabIndex={-1}>{["질문을 하나씩 적어 주세요","답변받을 정보를 알려 주세요","질문과 금액을 확인해 주세요"][step]}</h2><p>질문 1개 {neoMoney(neoUnitPrice())} · 단건 결제<br />한 가지 선택이나 고민을 질문 하나에 담아 주세요.</p><ol className={styles.steps}>{["질문 작성","정보 입력","최종 확인"].map((s,i) => <li key={s} aria-current={step === i ? "step" : undefined}>{s}</li>)}</ol></div>
      <div className={styles.form}>
        {error && <p className={styles.error} role="alert">{error}</p>}
        {!order && <>
          {step === 0 && <>
            <label htmlFor="neo-context">공통 상황 설명 <span>선택</span></label>
            <textarea id="neo-context" maxLength={NEO_LIMITS.context} value={context} onChange={e => setContext(e.target.value)} placeholder="지금 처한 상황과 고민의 배경을 알려 주세요." rows={4} />
            <p className={styles.small}>상황 설명은 해석을 돕는 배경입니다. 답변받을 질문은 아래에 따로 추가해 주세요.</p>
            {questions.map((q,i) => <div className={styles.question} key={i}>
              <div className={styles.questionHeading}><label htmlFor={"neo-q-" + i}>질문 {i+1}</label><span>{neoMoney(neoUnitPrice())}</span>{questions.length > 1 && <button type="button" aria-label={"질문 " + (i+1) + " 삭제"} onClick={() => setQuestions(questions.filter((_,n) => n !== i))}>삭제</button>}</div>
              <textarea id={"neo-q-" + i} value={q} maxLength={NEO_LIMITS.question} rows={3} onChange={e => setQuestions(questions.map((text,n) => n === i ? e.target.value : text))} aria-describedby={"neo-q-hint-" + i} placeholder="예: 지금 직장을 옮기는 선택에서 무엇을 먼저 살펴봐야 할까요?" />
              <p id={"neo-q-hint-" + i} className={hasMultipleQuestions(q) ? styles.error : styles.small}>{hasMultipleQuestions(q) ? "여러 질문은 질문 추가 버튼으로 나눠 주세요." : q.length + " / 1,000자 · 한 질문란에는 한 가지 주제"}</p>
            </div>)}
            <button className={styles.secondary} disabled={questions.length >= NEO_LIMITS.questions} onClick={() => { setQuestions([...questions,""]); requestAnimationFrame(() => document.getElementById("neo-q-" + questions.length)?.focus()); }}>질문 추가하기 · +{neoMoney(neoUnitPrice())}</button>
          </>}
          {step === 1 && <>
            <label htmlFor="neo-email">회신 이메일</label><input id="neo-email" type="email" autoComplete="email" maxLength={254} value={email} onChange={e => setEmail(e.target.value)} required />
            <fieldset><legend>출생정보 <span>선택</span></legend><p className={styles.small}>고민 해석에 필요한 경우에만 적어 주세요. 시간 모름은 그대로 전달합니다.</p>
              <label htmlFor="neo-birth">생년월일</label><input id="neo-birth" type="date" value={date} onChange={e => setDate(e.target.value)} />
              {date && <><label htmlFor="neo-calendar">달력 구분</label><select id="neo-calendar" value={calendar} onChange={e => setCalendar(e.target.value)}><option value="solar">양력</option><option value="lunar">음력</option></select>
                {calendar === "lunar" && <label className={styles.check}><input type="checkbox" checked={leapMonth} onChange={e => setLeapMonth(e.target.checked)} />윤달이에요</label>}
                <label className={styles.check}><input type="checkbox" checked={timeUnknown} onChange={e => setTimeUnknown(e.target.checked)} />출생시간을 몰라요</label>
                {!timeUnknown && <><label htmlFor="neo-time">출생시간</label><input id="neo-time" type="time" value={time} onChange={e => setTime(e.target.value)} /></>}
              </>}
            </fieldset>
            <label className={styles.check}><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />상담과 회신을 위한 입력정보 수집·이용 안내를 확인했어요.</label>
            <p className={styles.small}><Link href="/privacy-policy/">개인정보처리방침</Link> · 공개 판매 전 상담의 답변 기한·환불·보존 기준을 확정해 안내합니다. 현재 입력값은 접수되지 않습니다.</p>
          </>}
          {step === 2 && <><ol className={styles.summary}>{questions.map((q,i) => <li key={i}><p>{q}</p><span>{neoMoney(neoUnitPrice())}</span></li>)}</ol><p>회신 이메일: {email}</p><p>네오가 직접 검수한 질문별 답변을 한 통의 이메일로 전합니다.</p><p className={styles.small}>한 질문에 여러 독립 질문이 포함되면 정정을 요청할 수 있습니다. 추가 과금은 자동으로 진행하지 않습니다.</p></>}
          <div className={styles.total} aria-live="polite"><span>질문 {questions.length}개</span><strong>{neoMoney(neoTotal(questions.length))}</strong></div>
          <div className={styles.actions}>{step > 0 && <button className={styles.secondary} onClick={() => setStep(step-1)}>이전</button>}{step < 2 ? <button className={styles.primary} onClick={next}>다음</button> : <button className={styles.primary} disabled={busy || !canSubmit || !signedIn} onClick={prepare}>{busy ? "주문 확인 중" : mock ? "모의 결제로 상담 신청하기" : "판매 준비 중"}</button>}</div>
          {!signedIn && step === 2 && <p>상담 신청에는 로그인이 필요합니다.</p>}
        </>}
        {order && <><h3>{statusLabel(order.state)}</h3><p>주문번호 {order.id}</p><p>질문 {order.questions.length}개 · {neoMoney(order.quote?.totalKRW || neoTotal(order.questions.length))}</p>
          {order.payment?.status === "paid" && ["retry","unknown"].includes(order.deliveryStatus?.receipt || "") && <p role="status">결제는 완료됐어요. 접수 메일 전달을 확인하고 있어요. 다시 결제하지 않아도 됩니다.</p>}
          {order.payment?.status === "paid" && ["retry","unknown"].includes(order.deliveryStatus?.answer || "") && <p role="status">답변 메일 전달을 확인하고 있어요. 주문과 검수한 답변은 안전하게 보관됩니다.</p>}
          {["draft","preparing","pending"].includes(order.state) && <button className={styles.primary} disabled={busy || !canSubmit} onClick={resume}>같은 주문 이어서 확인하기</button>}
          <button disabled={busy} className={styles.secondary} onClick={() => run(async () => setOrder((await neoCall("/" + order.id)).order))}>접수 상태 확인하기</button>
          {order.questions.filter(q => q.correction).map(q => <div className={styles.question} key={q.id}><p>{q.correction}</p><label htmlFor={"correct-" + q.id}>질문 정정</label><textarea id={"correct-" + q.id} maxLength={1000} value={correction[q.id] ?? q.text} onChange={e => setCorrection({ ...correction, [q.id]: e.target.value })} /><button disabled={busy} onClick={() => run(async () => setOrder((await neoCall("/" + order.id + "/correction", { version: order.version, questionId: q.id, text: correction[q.id] ?? q.text })).order))}>정정한 질문 보내기</button></div>)}
          {order.deliveries.length > 0 && <article className={styles.answer}><h3>네오 검수 완료 · 나의 답변</h3>{order.deliveries[order.deliveries.length-1].questions.map(q => <section key={q.id}><h4>{q.text}</h4><p>{q.answer}</p></section>)}</article>}
        </>}
      </div>
    </section>
    <section className={styles.records}><h2>나의 이메일 상담</h2><p>이미 받은 답변은 추가 결제 없이 다시 확인할 수 있어요.</p><button className={styles.secondary} disabled={busy || !signedIn || !canSubmit} onClick={loadHistory}>구매 기록 확인하기</button>{history.map(row => <button className={styles.historyItem} key={row.id} onClick={() => { setOrder(row); document.getElementById("neo-form")?.scrollIntoView(); }}>{row.questions[0].text} · {statusLabel(row.state)}</button>)}</section>
  </main></LazyMotion>;
}
