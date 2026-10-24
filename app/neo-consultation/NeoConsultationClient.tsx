"use client";
import SavedBirthProfilePicker from "@/app/components/SavedBirthProfilePicker";
import BirthTimeInput from "@/app/components/BirthTimeInput";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { LazyMotion, domAnimation, m, useReducedMotion } from "framer-motion";
import { useAuthStore } from "@/app/_lib/auth-store";
import { NEO_EMAIL_SALE_ENABLED, NEO_LIMITS, NEO_STATUS_LABELS, hasMultipleQuestions, neoMoney, neoReadingLabel, neoQuestionPrice, neoZiweiAddonPrice, neoChartAddonPrice, neoChartLabel, neoBirthLabel, neoTotal, neoUnitPrice, validateNeoInput } from "@/lib/neo-consultation/contract";
import { PUBLIC_RECORD_PATH } from "@/lib/seo/public-record-copy.mjs";
import { maskBirthDateInput } from "@/lib/birthDateInput";
import { neoCall } from "./api";
import { openNeoCheckout } from "./checkout";
import { NEO_POLICY } from "@/lib/neo-consultation/policy";
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/site-policy-config";
import type { NeoDraftQuestion, NeoInput, NeoOrder } from "./types";

const NEO_MAX_QUESTION_PRICE = neoQuestionPrice({ readingMode: "saju_ziwei", chartReading: true });
import styles from "./neo.module.css";

const statusLabel = (state: string) => (NEO_STATUS_LABELS as Record<string,string>)[state] || state;
export default function NeoConsultationClient() {
  const auth = useAuthStore();
  const reducedMotion = useReducedMotion();
  const [questions, setQuestions] = useState<NeoDraftQuestion[]>([{text: "", readingMode: "saju", chartReading: false}]);
  const [goodPeriod, setGoodPeriod] = useState("");
  const [difficultPeriod, setDifficultPeriod] = useState("");
  const [context, setContext] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState("");
  const [calendar, setCalendar] = useState("solar");
  const [leapMonth, setLeapMonth] = useState(false);
  const [time, setTime] = useState("");
  const [consent, setConsent] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState<NeoOrder | null>(null);
  const [history, setHistory] = useState<NeoOrder[]>([]);
  const [correction, setCorrection] = useState<Record<string,string>>({});
  const [mock, setMock] = useState(false);
  const [saleReady, setSaleReady] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const inFlight = useRef(false);
  useEffect(() => {
    fetch('/api/neo-consultations/status',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(data=>setSaleReady(data?.enabled===true)).catch(()=>setSaleReady(false));
    // 로컬 테스트 서버의 별도 endpoint만 인식. 운영 URL·query·env로 켤 수 없다.
    if (!["localhost","127.0.0.1"].includes(location.hostname)) return;
    fetch("/__neo_mock__/status").then(r => r.ok ? r.json() : null).then(data => setMock(data?.mock === true)).catch(() => {});
  }, []);
  const canSubmit = (NEO_EMAIL_SALE_ENABLED && saleReady) || mock;
  const signedIn = auth.isAuthenticated || mock;
  const ownerKey = mock ? "mock" : auth.user?.id || "";
  useEffect(() => { setOrder(null); setHistory([]); }, [ownerKey]);
  useEffect(() => {
    if (!canSubmit || !signedIn) return;
    let active = true;
    let latest = 0;
    const refresh = () => {
      if (document.visibilityState === "hidden") return;
      const id = new URLSearchParams(location.search).get("order");
      const request = ++latest;
      if (id && /^[a-zA-Z0-9-]{1,80}$/.test(id)) {
        neoCall("/" + id).then(async data => {
          if (!mock && data.order.payment?.status === 'pending') {
            try { data = await neoCall('/'+id+'/confirm',{}); } catch { /* 확정 지연은 기존 주문을 표시한다. */ }
          }
          if (active && request === latest) { setOrder(data.order); setStep(2); }
        }).catch(e => { if (active && request === latest) setError(e.message); });
      }
    };
    refresh();
    window.addEventListener("pageshow", refresh);
    window.addEventListener("popstate", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { active = false; window.removeEventListener("pageshow", refresh); window.removeEventListener("popstate", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [canSubmit, signedIn, ownerKey]);
  const input = (): NeoInput => ({ questions, context, goodPeriod, difficultPeriod, email, consent, birth: date ? { date, calendar, leapMonth, timeUnknown: false, time } : null });
  const run = async (task: () => Promise<void>) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true); setError("");
    try { await task(); } catch (e) { setError(e instanceof Error ? e.message : "잠시 후 다시 시도해 주세요."); } finally { inFlight.current = false; setBusy(false); }
  };
  const next = () => {
    setError("");
    if (questions.some(q => !q.text.trim() || hasMultipleQuestions(q.text))) { setError("각 질문란에 한 가지 질문을 적어 주세요. 여러 질문은 추가 버튼으로 나눠 주세요."); return; }
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
    } else setOrder(await openNeoCheckout(prepared));
  });
  const loadHistory = () => run(async () => { setHistory((await neoCall("")).orders); });
  const resume = () => run(async () => {
    if (!order) return;
    let current = (await neoCall("/" + order.id)).order;
    setOrder(current);
    if (!["draft","preparing","pending","payment_failed"].includes(current.state)) return;
    if (!current.quote) current = (await neoCall("/" + current.id + "/quote", { version: current.version })).order;
    current = (await neoCall("/" + current.id + "/prepare", { quoteId: current.quote!.id })).order;
    setOrder(current);
    if (mock) {
      const response = await fetch("/__neo_mock__/pay/" + current.id, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setOrder(data.order);
    } else setOrder(await openNeoCheckout(current));
  });
  return <LazyMotion features={domAnimation}><main className={styles.page}>
    <nav className={styles.nav}><Link href="/">Code Destiny</Link><a href="#neo-form">질문 작성하기</a></nav>
    <header className={styles.hero}>
      <picture className={styles.heroArt} aria-hidden="true"><source media="(max-width:760px)" srcSet="/images/service-introductions/neo-consultation-640.webp" /><Image src="/images/service-introductions/neo-consultation.webp" width={1536} height={1024} alt="" loading="eager" /></picture>
      <m.div className={styles.heroCopy} initial={{ y: reducedMotion ? 0 : 16 }} animate={{ y: 0 }} transition={{ duration: .85, ease: [.16,1,.3,1] }}>
        <h1>네오에게<br /><span>물어봐</span></h1>
        <p className={styles.lead}>검색한 답으로는<br />정리되지 않는 사정이 있죠.</p>
        <p className={styles.heroDescription}>{NEO_POLICY.service}</p>
        <a className={styles.primary} href="#neo-form">나의 질문 정리하기 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 12h16m-6-6 6 6-6 6" /></svg></a>
        <p className={styles.notice}>{mock ? "MOCK 미리보기 · 실제 결제와 이메일 발송이 없습니다." : canSubmit ? NEO_POLICY.delivery : "판매 준비 중 · 질문 작성 화면을 먼저 살펴보세요."}</p>
      </m.div>
      <m.figure className={styles.portrait} initial={{ y: reducedMotion ? 0 : 24 }} animate={{ y: 0 }} transition={{ duration: 1.1, ease: [.16,1,.3,1] }}>
        <div className={styles.portraitFrame}><Image src="/images/service-introductions/neo-consultation-640.webp" width={640} height={427} alt="네오가 사주와 자미두수 자료를 살피며 상담 편지를 검토하는 장면" priority /></div>
        <figcaption><p>고민을 읽는 깊이,<br />다음 한 걸음의 명료함.</p><small>네오를 표현한 캐릭터 일러스트</small></figcaption>
      </m.figure>
    </header>
    <div className={styles.serviceLine}><p>질문 하나에 집중하는 이메일 해석</p><p>네오 직접 검수</p><p>사주 질문당 {neoMoney(neoUnitPrice())} · 자미두수 +{neoMoney(neoZiweiAddonPrice())} · 원국·명반 +{neoMoney(neoChartAddonPrice())}</p></div>
    <section className={styles.evidence} aria-labelledby="neo-question-guide">
      <h2 id="neo-question-guide">답이 필요한 선택과, 쉽게 설명되지 않는 사정까지</h2>
      <p>계속할지 그만둘지, 먼저 말을 꺼낼지 기다릴지. 이미 찾아본 답과 달랐던 현실을 함께 적어 주세요. 네오가 질문과 상황을 읽고, 선택한 사주·자미두수의 근거를 살펴 답변을 작성·검수합니다.</p>
      <details><summary>질문은 이렇게 정리해 보세요</summary>
        <p>질문 작성 예시 · 실제 고객 사연이나 상담 결과가 아닙니다.</p>
        <blockquote>이직 제안을 받았지만 업무 범위가 아직 불분명해요. 현재 직장의 안정성과 새 역할에서의 성장 중 무엇을 기준으로 판단하면 좋을까요?</blockquote>
        <p>결정할 일, 확인한 사실, 아직 모르는 조건을 나누면 질문이 선명해집니다. 출생정보는 아래 전용 입력란에 적어 주세요.</p>
      </details>
      <p>AI가 생성한 해설을 바로 읽는 상담과 제공 방식이 달라요. 답변은 이메일로 전달되며, 새 신청의 답변 본문은 서비스 서버에 보관하지 않습니다. 받은 이메일을 보관해 주세요.</p>
      <a href="#neo-form">내 상황과 질문 작성하기</a>
    </section>
    <section className={styles.evidence} aria-labelledby="neo-evidence">
      <h2 id="neo-evidence">기록은 원문으로 확인하세요</h2>
      <p>공개한 분석과 이후의 기록을 함께 확인하세요. 당시 해석과 실제 결과를 구분해 읽을 수 있습니다.</p>
      <Link href={PUBLIC_RECORD_PATH}>공개 분석 기록과 원문 보기</Link>
      <p className={styles.small}>과거 분석 사례이며, 특정 사건의 예측이나 같은 결과를 보장하지 않습니다.</p>
    </section>
    <section className={styles.correspondence} aria-labelledby="neo-letter-title">
      <picture><source media="(max-width:760px)" srcSet="/images/neo-consultation/moonlit-letter-640.webp" /><Image src="/images/neo-consultation/moonlit-letter-1280.webp" width={1280} height={853} alt="달빛이 드는 서재의 편지와 은빛 만년필" loading="lazy" /></picture>
      <div><h2 id="neo-letter-title">충분히 읽고,<br />한 통의 답변으로.</h2><p>네오가 당신의 질문과 상황을 살핀 뒤, 내부 시스템으로 해석을 정리하고 검수합니다.</p><p>대화를 이어가는 직접 상담 대신, 차분히 다시 읽을 수 있는 이메일 답변을 전합니다.</p></div>
    </section>
    <section className={styles.formSection} id="neo-form" aria-labelledby="neo-form-title">
      <div className={styles.formIntro}><p className={styles.letterMark}>NEO · PRIVATE CORRESPONDENCE</p><h2 id="neo-form-title" ref={heading} tabIndex={-1}>{["질문을 하나씩 적어 주세요","답변받을 정보를 알려 주세요","질문과 금액을 확인해 주세요"][step]}</h2><p>사주 질문당 {neoMoney(neoUnitPrice())}<br />자미두수 추가 시 +{neoMoney(neoZiweiAddonPrice())}<br />사주 원국·자미두수 명반 해석 추가 시 +{neoMoney(neoChartAddonPrice())}<br />질문당 최대 {neoMoney(NEO_MAX_QUESTION_PRICE)} · 단건 결제<br />한 가지 선택이나 고민을 질문 하나에 담아 주세요.</p><ol className={styles.steps}>{["질문 작성","정보 입력","최종 확인"].map((s,i) => <li key={s} aria-current={step === i ? "step" : undefined}>{s}</li>)}</ol></div>
      <div className={styles.form} aria-busy={busy}>
        {error && <p className={styles.error} role="alert">{error}</p>}
        {!order && <>
          {step === 0 && <>
            <p className={styles.salutation}>네오에게,</p>
            <label htmlFor="neo-context">공통 상황 설명 <span>선택</span></label>
            <textarea id="neo-context" maxLength={NEO_LIMITS.context} value={context} onChange={e => setContext(e.target.value)} placeholder="지금 처한 상황과 고민의 배경을 알려 주세요." rows={4} />
            <details className={styles.periods}><summary>지나온 시기도 함께 전할까요? <span>선택</span></summary><p className={styles.small}>특별히 좋았거나 힘들었던 때가 있다면 알려 주세요. 정확한 날짜 대신 연도나 나이로 적어도 괜찮습니다. 추가 질문으로 계산되지 않습니다.</p><label htmlFor="neo-good-period">특별히 좋았던 시기 <span>선택</span></label><textarea id="neo-good-period" rows={3} maxLength={NEO_LIMITS.period} value={goodPeriod} onChange={e => setGoodPeriod(e.target.value)} placeholder="예: 2022년 봄, 원하던 일을 시작하고 생활이 안정됐어요." /><label htmlFor="neo-difficult-period">힘들었던 시기 <span>선택</span></label><textarea id="neo-difficult-period" rows={3} maxLength={NEO_LIMITS.period} value={difficultPeriod} onChange={e => setDifficultPeriod(e.target.value)} placeholder="예: 서른 살 무렵, 이직과 이사가 겹쳐 방향을 잡기 어려웠어요." /></details>
            <p className={styles.small}>상황 설명은 해석을 돕는 배경입니다. 답변받을 질문은 아래에 따로 추가해 주세요.</p>
            {questions.map((q,i) => <div className={styles.question} key={i}>
              <div className={styles.questionHeading}><label htmlFor={"neo-q-" + i}>질문 {i+1}</label><span>{neoMoney(neoQuestionPrice(q))}</span>{questions.length > 1 && <button type="button" aria-label={"질문 " + (i+1) + " 삭제"} onClick={() => setQuestions(questions.filter((_,n) => n !== i))}>삭제</button>}</div>
              <textarea id={"neo-q-" + i} value={q.text} maxLength={NEO_LIMITS.question} rows={3} onChange={e => setQuestions(questions.map((item,n) => n === i ? {...item, text: e.target.value} : item))} aria-describedby={"neo-q-hint-" + i} placeholder="예: 지금 직장을 옮기는 선택에서 무엇을 먼저 살펴봐야 할까요?" />
              <fieldset className={styles.readingOptions}><legend>질문 {i+1} 풀이 구성</legend><p className={styles.readingBase}><span>사주 풀이 · 기본 포함</span><strong>{neoMoney(neoUnitPrice())}</strong></p><label className={styles.readingOption}><input type="checkbox" checked={q.readingMode === "saju_ziwei"} onChange={e => setQuestions(questions.map((item,n) => n === i ? {...item, readingMode: e.target.checked ? "saju_ziwei" : "saju"} : item))} /><span>자미두수 추가<strong>+{neoMoney(neoZiweiAddonPrice())}</strong></span></label><label className={styles.readingOption}><input type="checkbox" checked={q.chartReading} onChange={e => setQuestions(questions.map((item,n) => n === i ? {...item, chartReading: e.target.checked} : item))} /><span>{neoChartLabel(q)} 추가<strong>+{neoMoney(neoChartAddonPrice())}</strong></span></label></fieldset>
              <p id={"neo-q-hint-" + i} className={hasMultipleQuestions(q.text) ? styles.error : styles.small}>{hasMultipleQuestions(q.text) ? "여러 질문은 질문 추가 버튼으로 나눠 주세요." : q.text.length + " / 1,000자 · 한 질문란에는 한 가지 주제"}</p>
            </div>)}
            <button className={styles.secondary} disabled={questions.length >= NEO_LIMITS.questions} onClick={() => { setQuestions([...questions,{text: "", readingMode: "saju", chartReading: false}]); requestAnimationFrame(() => document.getElementById("neo-q-" + questions.length)?.focus()); }}>질문 추가하기 · +{neoMoney(neoUnitPrice())}</button>
          </>}
          {step === 1 && <>
            <label htmlFor="neo-email">회신 이메일</label><input id="neo-email" type="email" autoComplete="email" maxLength={254} value={email} onChange={e => setEmail(e.target.value)} required />
            <fieldset data-moonlit-form=""><legend>출생정보 <span>필수</span></legend><p id="neo-birth-help" className={styles.small}>풀이에 필요한 생년월일과 출생시간을 정확하게 입력해 주세요. 모든 질문에 같은 출생정보를 사용합니다.</p>
              <SavedBirthProfilePicker disabled={busy} onSelect={seed=>{setDate(seed.birthDate || "");setTime(seed.birthTime || "");setCalendar(seed.calendarType || "solar");setLeapMonth(Boolean(seed.isLeapMonth));}} />
              <label htmlFor="neo-birth">생년월일</label><input id="neo-birth" type="text" inputMode="numeric" placeholder="YYYY-MM-DD" maxLength={10} value={date} onChange={e => setDate(maskBirthDateInput(e.target.value))} required aria-describedby="neo-birth-help" />
              <label htmlFor="neo-calendar">달력 구분</label><select id="neo-calendar" value={calendar} onChange={e => setCalendar(e.target.value)}><option value="solar">양력</option><option value="lunar">음력</option></select>
              {calendar === "lunar" && <label className={styles.check}><input type="checkbox" checked={leapMonth} onChange={e => setLeapMonth(e.target.checked)} />윤달이에요</label>}
              <label htmlFor="neo-time">출생시간</label><BirthTimeInput id="neo-time"  value={time} onChange={e => setTime(e.target.value)} required aria-describedby="neo-time-help" /><p id="neo-time-help" className={styles.small}>오전·오후와 시·분을 확인해 주세요. 출생시간을 입력해야 결제할 수 있어요.</p>
            </fieldset>
            <p className={styles.small}>{NEO_POLICY.service}</p>
            <p className={styles.small}>{NEO_POLICY.delivery} {NEO_POLICY.capacity}</p>
            <p className={styles.small}>{NEO_POLICY.refund}</p>
            <p className={styles.small}>{NEO_POLICY.privacy}</p>
            <label className={styles.check}><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />답변 기한·취소 및 환불 안내를 확인하고, 상담과 회신을 위한 개인정보 수집·이용에 동의합니다.</label>
            <p className={styles.small}><Link href="/privacy/">개인정보처리방침</Link> · <a href={SUPPORT_MAILTO}>취소·환불 및 미수신 문의</a></p>
          </>}
          {step === 2 && <>{goodPeriod && <p className={styles.periodSummary}>특별히 좋았던 시기: {goodPeriod}</p>}{difficultPeriod && <p className={styles.periodSummary}>힘들었던 시기: {difficultPeriod}</p>}<ol className={styles.summary}>{questions.map((q,i) => <li key={i}><p>{q.text}</p><span>{neoReadingLabel(q)} · {neoMoney(neoQuestionPrice(q))}</span></li>)}</ol><p>출생정보: {neoBirthLabel(input().birth)}</p><p>회신 이메일: {email}</p><p className={styles.small}>결제가 확인되면 자동으로 상담이 접수됩니다.</p><p>{NEO_POLICY.service} 답변 본문은 서비스 서버에 저장하지 않으니 이메일에서 확인해 주세요.</p><p className={styles.small}>한 질문에 여러 독립 질문이 포함되면 정정을 요청할 수 있습니다. 추가 과금은 자동으로 진행하지 않습니다.</p></>}
          <div className={styles.total} aria-live="polite"><span>질문 {questions.length}개</span><strong>{neoMoney(neoTotal(questions))}</strong></div>
          <div className={styles.actions}>{step > 0 && <button className={styles.secondary} disabled={busy} onClick={() => setStep(step-1)}>이전</button>}{step < 2 ? <button className={styles.primary} onClick={next}>다음</button> : <button className={styles.primary} disabled={busy || !canSubmit || !signedIn} onClick={prepare}>{busy ? "주문 확인 중" : mock ? "모의 결제로 상담 신청하기" : canSubmit ? `총 ${neoMoney(neoTotal(questions))} 결제하고 상담 신청하기` : "판매 준비 중"}</button>}</div>
          {!signedIn && step === 2 && <p>상담 신청에는 <Link href="/login?next=%2Fneo-consultation%2F">로그인</Link>이 필요합니다.</p>}
        </>}
        {order && <><h3>{statusLabel(order.state)}</h3><p>질문 {order.questions.length}개 · {neoMoney(order.quote?.totalKRW || neoTotal(order.questions))}</p>
          {order.payment?.status === "paid" && ["pending","sending","retry","unknown"].includes(order.deliveryStatus?.receipt || "") && <p role="status">결제는 완료됐어요. 접수 메일 전달을 확인하고 있어요. 다시 결제하지 않아도 됩니다.</p>}
          {order.payment?.status === "paid" && ["retry","unknown"].includes(order.deliveryStatus?.answer || "") && <p role="status">답변 메일 전달을 확인하고 있어요. 주문과 검수한 답변은 안전하게 보관됩니다.</p>}
          {order.state === "pending" && <p role="status">결제 완료 여부를 확인하고 있어요. 새 주문을 만들지 말고 같은 주문에서 확인해 주세요.</p>}
          {order.state === 'payment_failed' && <p role="status">결제 실패가 확인됐습니다. 같은 주문에서 다시 확인하거나 결제창을 열어 주세요.</p>}
          {["cancelled","refunded"].includes(order.state) && <p role="status">이 주문의 결제는 종료됐어요. 추가 결제나 답변 발송은 진행하지 않습니다.</p>}
          {["draft","preparing","pending","payment_failed"].includes(order.state) && <button className={styles.primary} disabled={busy || !canSubmit} onClick={resume}>같은 주문 이어서 확인하기</button>}
          <button disabled={busy} className={styles.secondary} onClick={() => run(async () => setOrder((await neoCall("/" + order.id)).order))}>접수 상태 확인하기</button>
          {order.deliveryMode === "manual_email" && <p>{order.manualDelivery ? "답변 이메일 발송이 기록됐어요. 받으신 이메일에서 확인해 주세요." : "결제가 확인되고 취소되지 않은 주문은 네오가 내용을 검토한 뒤 내부 시스템으로 답변을 작성·검수해 이메일로 전합니다."} 답변 본문은 서비스 서버에 저장하지 않습니다.</p>}
          {order.contentDeletedAt && <p>{order.deliveryMode === "manual_email" ? "접수 정보" : "상담 본문"}의 보관 기간이 끝났습니다. 답변을 받으셨다면 이메일에서 확인해 주세요.</p>}
          {order.payment?.status === 'paid' && !order.cancellationRequestedAt && !order.deliveries.length && !order.manualDelivery && <button className={styles.secondary} disabled={busy} onClick={() => run(async () => setOrder((await neoCall('/'+order.id+'/cancel',{version:order.version})).order))}>취소·전액 환불 요청하기</button>}
          {order.cancellationRequestedAt && <p role="status">취소·환불 요청이 접수되어 답변 발송을 중지했습니다. 담당자가 결제 상태를 확인해 환불을 처리합니다. <a href={SUPPORT_MAILTO}>문의하기</a></p>}
          {order.questions.filter(q => q.correction).map(q => <div className={styles.question} key={q.id}><p>{q.correction}</p><label htmlFor={"correct-" + q.id}>질문 정정</label><textarea id={"correct-" + q.id} maxLength={1000} value={correction[q.id] ?? q.text} onChange={e => setCorrection({ ...correction, [q.id]: e.target.value })} /><button className={styles.primary} disabled={busy} onClick={() => run(async () => setOrder((await neoCall("/" + order.id + "/correction", { version: order.version, questionId: q.id, text: correction[q.id] ?? q.text })).order))}>정정한 질문 보내기</button></div>)}
          {order.deliveries.length > 0 && <article className={styles.answer}><h3>네오 검수 완료 · 나의 답변</h3>{order.deliveries[order.deliveries.length-1].questions.map(q => <section key={q.id}><h4>{q.text}</h4><p className={styles.small}>{neoReadingLabel(q)}</p><p>{q.answer}</p></section>)}</article>}
        </>}
      </div>
    </section>
    <section className={styles.contact} aria-labelledby="neo-contact-title"><h2 id="neo-contact-title">답변을 기다리고 계신가요?</h2><p>{NEO_POLICY.delivery} 안내된 기한이 지나도 연락이 없으면 회사 이메일로 문의해 주세요.</p><a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}<span>회사 이메일로 문의하기</span></a><p className={styles.contactHint}>신청할 때 사용한 이메일과 신청 날짜를 함께 알려주시면 확인에 도움이 됩니다.</p></section>
    <section className={styles.records}><h2>나의 이메일 상담</h2><p>새 신청은 접수·전달 상태만 확인할 수 있어요. 답변은 받으신 이메일에서 확인하고 보관해 주세요. 기존 신청의 답변은 신청 당시 보관 기간 동안 확인할 수 있어요.</p><button className={styles.secondary} disabled={busy || !signedIn || !canSubmit} onClick={loadHistory}>구매 기록 확인하기</button>{history.map(row => <button className={styles.historyItem} key={row.id} onClick={() => { setOrder(row); document.getElementById("neo-form")?.scrollIntoView(); }}>{row.questions[0].text || '보관 기간이 지난 상담'} · {statusLabel(row.state)}</button>)}</section>
  </main></LazyMotion>;
}
