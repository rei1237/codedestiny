"use client";
import Image from "next/image";
import TestArtwork from "./TestArtwork";
import { useState, useRef, useEffect } from "react";
import {
  ALL_TESTS,
  PSYCHO_QUESTIONS, PSYCHO_OPTS, PSYCHO_RESULTS,
  NARCISSIST_QUESTIONS, NARCISSIST_OPTS, NARCISSIST_RESULTS,
  CHIHUAHUA_QUESTIONS, CHIHUAHUA_OPTS, CHIHUAHUA_RESULTS,
  AURA_QUESTIONS, AURA_RESULTS,
  TTEST_QUESTIONS, TTEST_OPTS, TTEST_RESULTS,
  PERSONA_QUESTIONS, PERSONA_OPTS, PERSONA_RESULTS,
  THRILLER_QUESTIONS, THRILLER_RESULTS,
  OFFICE_QUESTIONS, OFFICE_RESULTS,
  SEVEN_QUESTIONS, SEVEN_RESULTS,
  HSP_QUESTIONS, HSP_OPTS_LABELS, HSP_RESULTS,
  TCI_QUESTIONS, TCI_OPTS, TCI_RESULTS,
  EMPATHY_QUESTIONS, EMPATHY_RESULTS,
  MENTAL_QUESTIONS, MENTAL_RESULTS,
  ROMANCE_QUESTIONS, ROMANCE_RESULTS,
  MBTI_QUESTIONS, MBTI_RESULTS,
  LOVELANG_QUESTIONS, LOVELANG_RESULTS,
  PASTLIFE_QUESTIONS, PASTLIFE_RESULTS,
  DOPAMINE_QUESTIONS, DOPAMINE_RESULTS,
  NUNCHI_QUESTIONS, NUNCHI_OPTS, NUNCHI_RESULTS,
  MENTALFIT_QUESTIONS, MENTALFIT_OPTS, MENTALFIT_RESULTS,
  VILLAIN_QUESTIONS, VILLAIN_RESULTS,
  IDEALSIGNAL_QUESTIONS, IDEALSIGNAL_RESULTS,
} from "./data/testData";

const QUESTION_COUNTS: Record<string,number> = {
psycho: PSYCHO_QUESTIONS.length,
narcissist: NARCISSIST_QUESTIONS.length,
chihuahua: CHIHUAHUA_QUESTIONS.length,
aura: AURA_QUESTIONS.length,
ttest: TTEST_QUESTIONS.length,
persona: PERSONA_QUESTIONS.length,
thriller: THRILLER_QUESTIONS.length,
office: OFFICE_QUESTIONS.length,
seven: SEVEN_QUESTIONS.length,
hsp: HSP_QUESTIONS.length,
tci: TCI_QUESTIONS.length,
empathy: EMPATHY_QUESTIONS.length,
mental: MENTAL_QUESTIONS.length,
romance: ROMANCE_QUESTIONS.length,
mbti: MBTI_QUESTIONS.length,
lovelang: LOVELANG_QUESTIONS.length,
pastlife: PASTLIFE_QUESTIONS.length,
dopamine: DOPAMINE_QUESTIONS.length,
nunchi: NUNCHI_QUESTIONS.length,
mentalfit: MENTALFIT_QUESTIONS.length,
villain: VILLAIN_QUESTIONS.length,
idealsignal: IDEALSIGNAL_QUESTIONS.length
};

interface Props { testId: string; onBack: () => void; }

type Phase = "intro" | "quiz" | "result";

function getResultProps(result: React.ReactNode): Record<string, any> {
  if (!result || typeof result !== "object" || !("props" in result)) return {};
  return ((result as React.ReactElement).props || {}) as Record<string, any>;
}

function getResultLabel(result: React.ReactNode): string {
  const props = getResultProps(result);
  const data = props.result || props.winner;
  return props.title || data?.name || data?.title || data?.tier || data?.badge || data?.subtitle || "나의 결과";
}

function getResultSummary(meta: any, result: React.ReactNode): string {
  const props = getResultProps(result);
  const data = props.result || props.winner;
  const label = getResultLabel(result);
  const score = typeof props.score === "number" ? `\n점수: ${props.score}점` : "";
  const description = data?.desc || props.desc;
  return [
    `${meta.emoji} ${meta.name}`,
    `나의 결과: ${label}${score}`,
    description ? `\n${description}` : "",
    "\nCode Destiny에서 나만의 심리테스트 결과를 확인해보세요.",
  ].filter(Boolean).join("\n");
}

function ShareButton({ meta, result }: { meta: any; result: React.ReactNode }) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  const copySummary = async () => {
    const text = getResultSummary(meta, result);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand("copy");
        textarea.remove();
        if (!copied) throw new Error("Clipboard copy failed");
      }
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 1800);
    } catch {
      setStatus("error");
      window.setTimeout(() => setStatus("idle"), 2200);
    }
  };

  const label = status === "copied" ? "복사 완료" : status === "error" ? "복사 실패" : "결과 공유하기";

  return (
    <button
      className={`result-share ${status !== "idle" ? `result-share-${status}` : ""}`}
      onClick={copySummary}
      aria-live="polite"
      aria-label={label}
    >
      <span aria-hidden="true">{status === "copied" ? "✓" : status === "error" ? "!" : "↗"}</span>
      {label}
    </button>
  );
}

export default function TestPage({ testId, onBack }: Props) {
  const meta = ALL_TESTS.find(t => t.id === testId)!;
  const [phase, setPhase] = useState<Phase>("intro");
  const [result, setResult] = useState<React.ReactNode>(null);

  if (phase === "intro") return <Intro meta={meta} onBack={onBack} onStart={() => setPhase("quiz")} />;
  if (phase === "result") {
    return (
      <>
        {result}
        <div className="psy-result-host"><Image src="/images/psychotest/yeoni-youngyangi-gallery-v1.webp" width={360} height={240} alt="카드를 함께 읽는 연이와 영냥이"/><p>오늘의 선택에서 발견한 한 조각이에요.<br/>나와 닮은 부분을 일상에서 천천히 살펴보세요.</p></div>
        <ShareButton meta={meta} result={result} />
      </>
    );
  }

  const onDone = (r: React.ReactNode) => { setResult(r); setPhase("result"); };

  const QuizComponent: Record<string, React.ReactElement> = {
    psycho: <ScoreQuiz testId={testId} meta={meta} questions={PSYCHO_QUESTIONS} opts={PSYCHO_OPTS.map((o,i)=>({t:o,v:i}))} results={PSYCHO_RESULTS.map(r=>({...r,scoreMap:(s:number)=>s===2?2:s===1?1:0}))} scoreCalc={(answers)=>answers.reduce((a,b)=>a+b,0)} findResult={(s)=>PSYCHO_RESULTS.find(r=>s>=r.min&&s<=r.max)||PSYCHO_RESULTS[0]} onBack={onBack} onDone={onDone} renderResult={(r,s)=><ScoreResult meta={meta} result={r} score={s} maxScore={40} onBack={onBack} onRetry={()=>setPhase("intro")} />} bg="#0D0008" cardStyle={{background:"rgba(255,107,157,0.04)",border:"1px solid rgba(255,107,157,0.13)",borderRadius:28}} optStyle={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.7)"}} optLblStyle={{color:"rgba(255,107,157,0.7)",borderColor:"rgba(255,107,157,0.2)"}} />,
    narcissist: <ScaleQuiz testId="narcissist" meta={meta} questions={NARCISSIST_QUESTIONS.map(q=>q.q)} cats={NARCISSIST_QUESTIONS.map(q=>q.cat)} opts={NARCISSIST_OPTS} findResult={(s)=>NARCISSIST_RESULTS.find(r=>s>=r.min&&s<=r.max)||NARCISSIST_RESULTS[0]} onBack={onBack} onDone={onDone} renderResult={(r,s)=><SimpleResult meta={meta} title={r.name} badge={r.badge} desc={r.desc} score={s} maxScore={100} color={r.color} onBack={onBack} onRetry={()=>setPhase("intro")} />} bg="linear-gradient(135deg,#0D0D1A,#1A1A2E,#16213E)" cardStyle={{background:"rgba(212,175,55,0.06)",border:"1px solid rgba(212,175,55,0.18)",borderRadius:20}} optStyle={{background:"rgba(212,175,55,0.06)",border:"1px solid rgba(212,175,55,0.15)",color:"rgba(255,230,160,0.85)"}} optLblStyle={{color:"#D4AF37",borderColor:"rgba(212,175,55,0.3)"}} catStyle={{color:"#D4AF37"}} qTextStyle={{color:"#F0DFA0"}} />,
    chihuahua: <ScaleQuiz testId="chihuahua" meta={meta} questions={CHIHUAHUA_QUESTIONS.map(q=>q.q)} cats={CHIHUAHUA_QUESTIONS.map(q=>q.cat)} opts={CHIHUAHUA_OPTS} findResult={(s)=>{const pct=Math.round(s/(CHIHUAHUA_QUESTIONS.length*5)*100);return CHIHUAHUA_RESULTS.find(r=>pct>=r.min&&pct<=r.max)||CHIHUAHUA_RESULTS[CHIHUAHUA_RESULTS.length-1];}} onBack={onBack} onDone={onDone} renderResult={(r,s)=><SimpleResult meta={meta} title={r.name} badge={r.icon+" "+r.badge} desc={r.desc} score={Math.round(s/(CHIHUAHUA_QUESTIONS.length*5)*100)} maxScore={100} color={r.color} onBack={onBack} onRetry={()=>setPhase("intro")} />} bg="linear-gradient(135deg,#FFF8F0,#FFE4D1)" cardStyle={{background:"rgba(255,255,255,0.85)",border:"2px dashed rgba(255,107,53,0.25)",borderRadius:24}} optStyle={{background:"#fff",border:"2px solid rgba(255,107,53,0.18)",color:"#7A4030"}} optLblStyle={{color:"#FF6B35",borderColor:"rgba(255,107,53,0.3)"}} catStyle={{color:"#FF6B35"}} qTextStyle={{color:"#5A3020",fontWeight:600}} />,
    aura: <AuraQuiz meta={meta} onBack={onBack} onDone={onDone} onRetry={()=>setPhase("intro")} />,
    ttest: <TTestQuiz meta={meta} onBack={onBack} onDone={onDone} onRetry={()=>setPhase("intro")} />,
    persona: <PersonaQuiz meta={meta} onBack={onBack} onDone={onDone} onRetry={()=>setPhase("intro")} />,
    thriller: <ThrillerQuiz meta={meta} onBack={onBack} onDone={onDone} onRetry={()=>setPhase("intro")} />,
    office: <OfficeQuiz meta={meta} onBack={onBack} onDone={onDone} onRetry={()=>setPhase("intro")} />,
    seven: <SevenQuiz meta={meta} onBack={onBack} onDone={onDone} onRetry={()=>setPhase("intro")} />,
    hsp: <ScaleQuiz testId="hsp" meta={meta} questions={HSP_QUESTIONS.map(q=>q.q)} cats={HSP_QUESTIONS.map(q=>q.cat)} opts={HSP_OPTS_LABELS} findResult={(s)=>{const pct=Math.round(s/(HSP_QUESTIONS.length*4)*100);return [...HSP_RESULTS].reverse().find(r=>pct>=r.min)||HSP_RESULTS[0];}} onBack={onBack} onDone={onDone} renderResult={(r,s)=><HspResult meta={meta} result={r} score={Math.round(s/(HSP_QUESTIONS.length*4)*100)} onBack={onBack} onRetry={()=>setPhase("intro")} />} bg="linear-gradient(180deg,#E8F3D6 0%,#FAF3E0 50%,#FFF9F0 100%)" cardStyle={{background:"rgba(255,255,255,0.9)",border:"1px solid rgba(124,154,124,0.2)",borderRadius:32,boxShadow:"0 20px 60px rgba(124,154,124,0.1)"}} optStyle={{background:"#fff",border:"2px solid rgba(124,154,124,0.2)",color:"#4A5A4A",borderRadius:20}} optLblStyle={{color:"#7C9A7C",borderColor:"rgba(124,154,124,0.3)"}} catStyle={{color:"#AA96DA",letterSpacing:2}} qTextStyle={{color:"#3A4A3A",fontWeight:500}} />,
    tci: <TciQuiz meta={meta} onBack={onBack} onDone={onDone} onRetry={()=>setPhase("intro")} />,
    empathy: <EmpathyQuiz meta={meta} onBack={onBack} onDone={onDone} onRetry={()=>setPhase("intro")} />,
    mental: <MentalQuiz meta={meta} onBack={onBack} onDone={onDone} onRetry={()=>setPhase("intro")} />,
    romance: <RomanceQuiz meta={meta} onBack={onBack} onDone={onDone} onRetry={()=>setPhase("intro")} />,
    mbti: <MbtiQuiz meta={meta} onBack={onBack} onDone={onDone} onRetry={()=>setPhase("intro")} />,
    lovelang: <DimTypeQuiz
      bg="linear-gradient(135deg,#FF9A9E 0%,#FECFEF 50%,#ffecd2 100%)"
      accent="#E91E8C" cardBg="rgba(255,255,255,0.95)" textColor="#5A1A3A"
      questions={LOVELANG_QUESTIONS}
      categoryLabel="연애 언어"
      onBack={onBack}
      onDone={(winner,scores) => onDone(<LoveLangResult meta={meta} winner={winner} scores={scores} onBack={onBack} onRetry={()=>setPhase("intro")} />)}
    />,
    pastlife: <DimTypeQuiz
      bg="linear-gradient(135deg,#0A0010 0%,#2C1654 50%,#1A0A2E 100%)"
      accent="#C9A227" cardBg="rgba(255,255,255,0.07)" textColor="#F0DFA0"
      questions={PASTLIFE_QUESTIONS}
      categoryLabel="전생 유형"
      onBack={onBack}
      onDone={(winner,scores) => onDone(<PastLifeResult meta={meta} winner={winner} scores={scores} onBack={onBack} onRetry={()=>setPhase("intro")} />)}
    />,
    dopamine: <DimTypeQuiz
      bg="linear-gradient(135deg,#1A0A00 0%,#3D1C00 50%,#1A0A00 100%)"
      accent="#FFD200" cardBg="rgba(255,210,0,0.06)" textColor="#FFD200"
      questions={DOPAMINE_QUESTIONS}
      categoryLabel="도파민 유형"
      onBack={onBack}
      onDone={(winner,scores) => onDone(<DopamineResult meta={meta} winner={winner} scores={scores} onBack={onBack} onRetry={()=>setPhase("intro")} />)}
    />,
    nunchi: <NunchiQuiz meta={meta} onBack={onBack} onDone={onDone} onRetry={()=>setPhase("intro")} />,
    mentalfit: <MentalFitQuiz meta={meta} onBack={onBack} onDone={onDone} onRetry={()=>setPhase("intro")} />,
    villain: <VillainQuiz meta={meta} onBack={onBack} onDone={onDone} onRetry={()=>setPhase("intro")} />,
    idealsignal: <IdealSignalQuiz meta={meta} onBack={onBack} onDone={onDone} onRetry={()=>setPhase("intro")} />,
  };

  return QuizComponent[testId] || <div style={{padding:40,color:"#fff"}}>Unknown test</div>;
}

/* ═══════════════════════════════════════ INTRO ═══════════════════════════════════════ */
function Intro({ meta, onBack, onStart }: { meta: any; onBack: ()=>void; onStart: ()=>void }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return <section className="psy-intro">
    <button className="psy-back" onClick={onBack}>← 테스트 목록</button>
    <div className="psy-intro-layout">
      <TestArtwork id={meta.id} className="psy-intro-art" />
      <div className="psy-intro-copy"><div className="psy-companion"><Image src="/images/home/yeoni-pass-mascot-240.webp" width={64} height={64} alt="꽃돼지 연이"/><span>천천히 골라도 괜찮아요.<br/>지금의 당신에게 귀 기울여 보세요.</span></div>
        <h1>{meta.name}</h1><p>{meta.desc}</p>
        <dl className="psy-facts"><div><dt>소요 시간</dt><dd>{meta.time}</dd></div><div><dt>문항</dt><dd>{QUESTION_COUNTS[meta.id]}개</dd></div><div><dt>이용 요금</dt><dd>무료</dd></div></dl>
        <button className="psy-start" disabled={!ready} onClick={onStart}>무료로 시작하기 <span aria-hidden="true">↗</span></button>
        <p className="psy-note">정답은 없어요. 평소의 나와 가까운 답을 골라주세요. 결과는 자기이해를 위한 참고이며, 전문 심리검사나 진단을 대신하지 않아요.</p>
      </div>
    </div>
  </section>;
}

/* ═══════════════════════════════════════ SCORE QUIZ (psycho) ═══════════════════════════════════════ */
function ScoreQuiz({ meta, questions, opts, findResult, onBack, onDone, renderResult, bg, cardStyle, optStyle, optLblStyle }: any) {
  const [cur, setCur] = useState(0);
  const [total, setTotal] = useState(0);
  const pct = Math.round(cur / questions.length * 100);

  const pick = (v: number) => {
    const newTotal = total + v;
    const next = cur + 1;
    if (next >= questions.length) {
      const r = findResult(newTotal);
      onDone(renderResult(r, newTotal));
    } else {
      setTotal(newTotal);
      setCur(next);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: bg || "var(--bg-main)", padding: "24px 16px 60px" }}>
      <QuizHeader meta={meta} cur={cur} total={questions.length} pct={pct} onBack={onBack} />
      <div style={{ maxWidth: 600, margin: "0 auto", animation: "fadeUp .4s ease both" }}>
        <QuizCard qnum={cur+1} question={questions[cur]} cardStyle={cardStyle}>
          {opts.map((o: any, i: number) => (
            <button key={i} className="opt-btn" onClick={() => pick(o.v ?? i)} style={optStyle}>
              <span className="opt-lbl" style={optLblStyle}>{String.fromCharCode(65+i)}</span>
              <span>{o.t ?? o}</span>
            </button>
          ))}
        </QuizCard>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ SCALE QUIZ (narcissist, chihuahua, hsp) ═══════════════════════════════════════ */
function ScaleQuiz({ meta, questions, cats, opts, findResult, onBack, onDone, renderResult, bg, cardStyle, optStyle, optLblStyle, qTextStyle, catStyle }: any) {
  const [cur, setCur] = useState(0);
  const [total, setTotal] = useState(0);
  const pct = Math.round(cur / questions.length * 100);

  const pick = (i: number) => {
    const newTotal = total + i;
    const next = cur + 1;
    if (next >= questions.length) {
      const r = findResult(newTotal);
      onDone(renderResult(r, newTotal));
    } else {
      setTotal(newTotal);
      setCur(next);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: bg || "var(--bg-main)", padding: "24px 16px 60px" }}>
      <QuizHeader meta={meta} cur={cur} total={questions.length} pct={pct} onBack={onBack} />
      <div style={{ maxWidth: 600, margin: "0 auto", animation: "fadeUp .4s ease both" }}>
        <QuizCard qnum={cur+1} question={questions[cur]} category={cats?.[cur]} cardStyle={cardStyle} qTextStyle={qTextStyle} catStyle={catStyle}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {opts.map((o: string, i: number) => (
              <button key={i} className="opt-btn" onClick={() => pick(i)} style={optStyle}>
                <span className="opt-lbl" style={optLblStyle}>{i}</span>
                <span>{o}</span>
              </button>
            ))}
          </div>
        </QuizCard>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ AURA QUIZ ═══════════════════════════════════════ */
function AuraQuiz({ meta, onBack, onDone, onRetry }: any) {
  const [cur, setCur] = useState(0);
  const [scores, setScores] = useState({e:0,i:0,s:0,n:0,f:0,t:0,p:0,j:0});
  const pct = Math.round(cur / AURA_QUESTIONS.length * 100);

  const pick = (opt: any) => {
    const ns = { ...scores };
    (Object.keys(opt) as (keyof typeof ns)[]).forEach(k => { if (k !== 'label' as any) ns[k] = (ns[k]||0) + (opt[k]||0); });
    const next = cur + 1;
    if (next >= AURA_QUESTIONS.length) {
      const { e, i, s, n, f, t, p, j } = ns;
      const found = AURA_RESULTS.find(r => r.cond(e,i,s,n,f,t,p,j)) || AURA_RESULTS[6];
      onDone(<AuraResult meta={meta} result={found} onBack={onBack} onRetry={onRetry} />);
    } else {
      setScores(ns);
      setCur(next);
    }
  };

  const q = AURA_QUESTIONS[cur];
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0f0c29,#302b63,#24243e)", padding: "24px 16px 60px" }}>
      <QuizHeader meta={meta} cur={cur} total={AURA_QUESTIONS.length} pct={pct} onBack={onBack} />
      <div style={{ maxWidth: 600, margin: "0 auto", animation: "fadeUp .4s ease both" }}>
        <QuizCard
          qnum={cur+1}
          question={q.q}
          cardStyle={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(20px)", borderRadius: 24 }}
          qTextStyle={{ color: "#e8e0ff", fontSize: 17, lineHeight: 1.75 }}
        >
          {q.opts.map((o: any, i: number) => (
            <button key={i} className="opt-btn" onClick={() => pick(o)}
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(168,140,255,0.25)", color: "rgba(230,220,255,0.85)" }}>
              <span className="opt-lbl" style={{ color: "#c4a8ff", borderColor: "rgba(168,140,255,0.35)" }}>{i===0?"A":"B"}</span>
              <span>{o.label}</span>
            </button>
          ))}
        </QuizCard>
      </div>
    </div>
  );
}

function AuraResult({ meta, result, onBack, onRetry }: any) {
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0f0c29,#302b63,#24243e)", padding: "24px 16px 60px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <button className="back-btn" onClick={onBack} style={{ marginBottom: 24 }}>← 테스트 목록</button>
        <div className="glass-card" style={{ overflow: "hidden", animation: "cardIn .6s ease both" }}>
          <div style={{ padding: "48px 32px", textAlign: "center", background: result.barColor }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>{result.icon}</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 16 }}>
              {result.keywords.map((k: string) => (
                <span key={k} style={{ background: "rgba(255,255,255,0.2)", borderRadius: 99, padding: "4px 12px", fontSize: 12, color: "#fff" }}>{k}</span>
              ))}
            </div>
            <h2 style={{ fontFamily: "inherit", fontSize: 28, color: "#fff", marginBottom: 8 }}>{result.name}</h2>
          </div>
          <div style={{ padding: "28px 32px" }}>
            <p style={{ color: "var(--text-secondary)", fontSize: 15, lineHeight: 1.7, marginBottom: 28 }}>{result.desc}</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={onRetry}>다시 하기</button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={onBack}>다른 테스트 보기</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ TTEST QUIZ ═══════════════════════════════════════ */
function TTestQuiz({ meta, onBack, onDone, onRetry }: any) {
  const [cur, setCur] = useState(0);
  const [total, setTotal] = useState(0);
  const pct = Math.round(cur / TTEST_QUESTIONS.length * 100);
  const maxScore = TTEST_QUESTIONS.length * 5;

  const pick = (v: number) => {
    const nt = total + v;
    const next = cur + 1;
    if (next >= TTEST_QUESTIONS.length) {
      const scorePct = Math.round(nt / maxScore * 100);
      const r = TTEST_RESULTS.find(r => scorePct >= r.min && scorePct <= r.max) || TTEST_RESULTS[0];
      onDone(<TTestResult meta={meta} result={r} score={nt} maxScore={maxScore} onBack={onBack} onRetry={onRetry} />);
    } else {
      setTotal(nt);
      setCur(next);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#000", padding: "24px 16px 60px" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <button className="back-btn" onClick={onBack}>← Back</button>
          <span style={{ color: "#00FF41", fontFamily: "monospace", fontSize: 14 }}>
            SCANNING... QUERY_{String(cur+1).padStart(2,"0")} | {pct}%
          </span>
        </div>
        <div className="progress-track" style={{ marginBottom: 24 }}><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
        <div style={{ border: "1px solid rgba(0,255,65,0.3)", borderRadius: 16, padding: "28px 24px", background: "rgba(0,255,65,0.03)", animation: "fadeUp .4s ease both" }}>
          <p style={{ color: "#00FF41", fontFamily: "monospace", fontSize: 12, marginBottom: 12 }}>Q.{String(cur+1).padStart(2,"0")}</p>
          <p style={{ color: "#fff", fontSize: 16, lineHeight: 1.7, marginBottom: 24 }}>{TTEST_QUESTIONS[cur]}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {TTEST_OPTS.map((o, i) => (
              <button key={i} className="opt-btn" onClick={() => pick(o.v)} style={{ borderColor: "rgba(0,255,65,0.2)" }}>
                <span className="opt-lbl" style={{ color: "#00FF41", borderColor: "rgba(0,255,65,0.3)" }}>{o.v}</span>
                <span style={{ fontFamily: "monospace", fontSize: 13 }}>{o.t}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TTestResult({ meta, result, score, maxScore, onBack, onRetry }: any) {
  const pct = Math.round(score / maxScore * 100);
  return (
    <div style={{ minHeight: "100vh", background: "#000", padding: "24px 16px 60px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <button className="back-btn" onClick={onBack} style={{ marginBottom: 24 }}>← 테스트 목록</button>
        <div style={{ border: `2px solid ${result.color}`, borderRadius: 20, padding: 32, textAlign: "center", animation: "cardIn .6s ease both", boxShadow: `0 0 40px ${result.color}33` }}>
          <p style={{ color: result.color, fontFamily: "monospace", fontSize: 12, marginBottom: 8 }}>{result.tier}</p>
          <div style={{ fontSize: 64, fontFamily: "monospace", fontWeight: 900, color: result.color, textShadow: `0 0 30px ${result.color}`, marginBottom: 8 }}>{pct}<span style={{ fontSize: 32 }}>%</span></div>
          <h2 style={{ color: "#fff", fontSize: 24, fontFamily: "inherit", marginBottom: 4 }}>{result.title}</h2>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, marginBottom: 20 }}>{result.subtitle}</p>
          <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>{result.desc}</p>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn-ghost" style={{ flex: 1 }} onClick={onRetry}>다시 하기</button>
            <button className="btn-primary" style={{ flex: 1 }} onClick={onBack}>다른 테스트 보기</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ PERSONA QUIZ ═══════════════════════════════════════ */
function PersonaQuiz({ meta, onBack, onDone, onRetry }: any) {
  const [cur, setCur] = useState(0);
  const [scores, setScores] = useState({external:0,internal:0,gap:0});
  const [totals, setTotals] = useState({external:0,internal:0,gap:0});
  const pct = Math.round(cur / PERSONA_QUESTIONS.length * 100);

  const pick = (v: number) => {
    const q = PERSONA_QUESTIONS[cur];
    const ns = { ...scores };
    const nt = { ...totals };
    ns[q.type as keyof typeof ns] += v;
    nt[q.type as keyof typeof nt] += 5;
    const next = cur + 1;
    if (next >= PERSONA_QUESTIONS.length) {
      const gapScore = Math.abs(ns.external - ns.internal) + ns.gap;
      const gapMax = 35 + 50;
      const gapPct = Math.min(100, Math.round(gapScore / gapMax * 100));
      const r = PERSONA_RESULTS.find(r => gapPct >= r.minGap && gapPct <= r.maxGap) || PERSONA_RESULTS[PERSONA_RESULTS.length - 1];
      onDone(<PersonaResult meta={meta} result={r} gapPct={gapPct} extScore={ns.external} intScore={ns.internal} onBack={onBack} onRetry={onRetry} />);
    } else {
      setScores(ns); setTotals(nt); setCur(next);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0d0d0e,#1a1a2e,#16213e)", padding: "24px 16px 60px" }}>
      <QuizHeader meta={meta} cur={cur} total={PERSONA_QUESTIONS.length} pct={pct} onBack={onBack} />
      <div style={{ maxWidth: 600, margin: "0 auto", animation: "fadeUp .4s ease both" }}>
        <QuizCard qnum={cur+1} question={PERSONA_QUESTIONS[cur].q} category={PERSONA_QUESTIONS[cur].cat}
          cardStyle={{ background: "rgba(130,170,227,0.07)", border: "1px solid rgba(130,170,227,0.2)", backdropFilter: "blur(20px)", borderRadius: 24 }}
          catStyle={{ color: "#82AAE3", letterSpacing: 1 }}
          qTextStyle={{ color: "rgba(255,255,255,0.9)" }}
        >
          {PERSONA_OPTS.map((o, i) => (
            <button key={i} className="opt-btn" onClick={() => pick(o.v)}
              style={{ background: "rgba(130,170,227,0.07)", border: "1px solid rgba(130,170,227,0.18)", color: "rgba(200,220,255,0.85)" }}>
              <span className="opt-lbl" style={{ color: "#82AAE3", borderColor: "rgba(130,170,227,0.3)" }}>{o.v}</span>
              <span>{o.t}</span>
            </button>
          ))}
        </QuizCard>
      </div>
    </div>
  );
}

function PersonaResult({ meta, result, gapPct, extScore, intScore, onBack, onRetry }: any) {
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0d0d0e,#1a1a2e,#16213e)", padding: "24px 16px 60px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <button className="back-btn" onClick={onBack} style={{ marginBottom: 24 }}>← 테스트 목록</button>
        <div className="glass-card" style={{ overflow: "hidden", animation: "cardIn .6s ease both" }}>
          <div style={{ padding: "40px 32px", textAlign: "center", background: "linear-gradient(135deg,#82AAE3,#541690)" }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>{result.icon}</div>
            <h2 style={{ fontFamily: "inherit", fontSize: 22, color: "#fff", marginBottom: 4 }}>{result.name}</h2>
            <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 14 }}>{result.subtitle}</p>
          </div>
          <div style={{ padding: "28px 32px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
              {[{label:"갭 지수", val:`${gapPct}%`, color:"#FF6B9D"},{label:"외부 점수", val:extScore, color:"#82AAE3"},{label:"내부 점수", val:intScore, color:"#A91079"}].map(s=>(
                <div key={s.label} style={{ textAlign: "center", padding: 14, background: "rgba(255,255,255,0.05)", borderRadius: 12 }}>
                  <div style={{ color: s.color, fontSize: 22, fontWeight: 700 }}>{s.val}</div>
                  <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: 15, lineHeight: 1.7, marginBottom: 28 }}>{result.desc}</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={onRetry}>다시 하기</button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={onBack}>다른 테스트 보기</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ THRILLER QUIZ ═══════════════════════════════════════ */
function ThrillerQuiz({ meta, onBack, onDone, onRetry }: any) {
  const [cur, setCur] = useState(0);
  const [scores, setScores] = useState({instinct:0,logic:0,survival:0});
  const pct = Math.round(cur / THRILLER_QUESTIONS.length * 100);

  const pick = (idx: number) => {
    const s = THRILLER_QUESTIONS[cur].scores[idx];
    const ns = { instinct: scores.instinct+s.instinct, logic: scores.logic+s.logic, survival: scores.survival+s.survival };
    const next = cur + 1;
    if (next >= THRILLER_QUESTIONS.length) {
      const { instinct, logic, survival } = ns;
      const total = instinct + logic + survival;
      let r;
      const mx = Math.max(instinct, logic, survival);
      if (mx === instinct && instinct/total > 0.4) r = THRILLER_RESULTS[1];
      else if (mx === logic && logic/total > 0.4) r = THRILLER_RESULTS[0];
      else if (mx === survival && survival/total > 0.4) r = THRILLER_RESULTS[2];
      else if (instinct > logic && logic > survival) r = THRILLER_RESULTS[4];
      else r = THRILLER_RESULTS[3];
      onDone(<ThrillerResult meta={meta} result={r} scores={ns} onBack={onBack} onRetry={onRetry} />);
    } else {
      setScores(ns); setCur(next);
    }
  };

  const q = THRILLER_QUESTIONS[cur];
  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0F", padding: "24px 16px 60px" }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <button className="back-btn" onClick={onBack}>← Back</button>
          <span style={{ color: "#E50914", fontFamily: "monospace", fontSize: 13 }}>CASE {String(cur+1).padStart(2,"0")} / {THRILLER_QUESTIONS.length}</span>
        </div>
        <div className="progress-track" style={{ marginBottom: 24, background: "rgba(229,9,20,0.1)" }}>
          <div className="progress-fill" style={{ width: `${pct}%`, background: "linear-gradient(90deg,#E50914,#FF4500)" }} />
        </div>
        <div style={{ border: "1px solid rgba(229,9,20,0.3)", borderRadius: 16, padding: "28px 24px", background: "rgba(229,9,20,0.04)", animation: "fadeUp .4s ease both" }}>
          <p style={{ color: "#E50914", fontSize: 12, marginBottom: 12, fontFamily: "monospace" }}>{q.cat}</p>
          <p style={{ color: "#fff", fontSize: 16, lineHeight: 1.7, marginBottom: 24 }}>{q.q}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {q.opts.map((o, i) => (
              <button key={i} className="opt-btn" onClick={() => pick(i)} style={{ borderColor: "rgba(229,9,20,0.2)" }}>
                <span className="opt-lbl" style={{ color: "#E50914", borderColor: "rgba(229,9,20,0.3)" }}>{String.fromCharCode(65+i)}</span>
                <span>{o}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ThrillerResult({ meta, result, scores, onBack, onRetry }: any) {
  return (
    <div style={{ minHeight: "100vh", background: "#0A0A0F", padding: "24px 16px 60px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <button className="back-btn" onClick={onBack} style={{ marginBottom: 24 }}>← 테스트 목록</button>
        <div style={{ border: "2px solid rgba(229,9,20,0.5)", borderRadius: 20, overflow: "hidden", animation: "cardIn .6s ease both" }}>
          <div style={{ background: "linear-gradient(135deg,#E50914,#B20710)", padding: "40px 32px", textAlign: "center" }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>{result.icon}</div>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, marginBottom: 6, fontFamily: "monospace" }}>CASE FILE CLASSIFIED</p>
            <h2 style={{ fontFamily: "inherit", fontSize: 22, color: "#fff", marginBottom: 4 }}>{result.name}</h2>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 14 }}>{result.subtitle}</p>
          </div>
          <div style={{ padding: "28px 32px", background: "#0A0A0F" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
              {[{label:"본능",val:scores.instinct,color:"#FF4500"},{label:"논리",val:scores.logic,color:"#00D7FF"},{label:"생존",val:scores.survival,color:"#00FF41"}].map(s=>(
                <div key={s.label} style={{ textAlign:"center", padding:12, background:"rgba(255,255,255,0.04)", borderRadius:10, border:`1px solid ${s.color}33` }}>
                  <div style={{ color:s.color, fontSize:22, fontWeight:700 }}>{s.val}</div>
                  <div style={{ color:"rgba(255,255,255,0.5)", fontSize:11, marginTop:4 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>{result.desc}</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={onRetry}>다시 하기</button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={onBack}>다른 테스트 보기</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ OFFICE QUIZ (Chat) ═══════════════════════════════════════ */
function OfficeQuiz({ meta, onBack, onDone, onRetry }: any) {
  const [cur, setCur] = useState(0);
  const [scores, setScores] = useState({mad:0,soul:0,eff:0,slave:0});
  const [messages, setMessages] = useState<{type:string;text:string}[]>([]);
  const [picked, setPicked] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pct = Math.round(cur / OFFICE_QUESTIONS.length * 100);

  const q = OFFICE_QUESTIONS[cur];

  const pick = (idx: number) => {
    if (picked) return;
    setPicked(true);
    const s = q.scores[idx];
    const ns = {mad:scores.mad+s.mad,soul:scores.soul+s.soul,eff:scores.eff+s.eff,slave:scores.slave+s.slave};
    const chosen = q.opts[idx];
    setMessages(prev => [...prev, {type:"sent",text:chosen}]);
    setTimeout(() => {
      const next = cur + 1;
      if (next >= OFFICE_QUESTIONS.length) {
        const mx = Math.max(ns.mad,ns.soul,ns.eff,ns.slave);
        let r;
        if(mx===ns.mad)r=OFFICE_RESULTS[0];
        else if(mx===ns.soul)r=OFFICE_RESULTS[1];
        else if(mx===ns.eff)r=OFFICE_RESULTS[2];
        else r=OFFICE_RESULTS[3];
        onDone(<OfficeResult meta={meta} result={r} scores={ns} onBack={onBack} onRetry={onRetry} />);
      } else {
        setScores(ns);
        setCur(next);
        setPicked(false);
        setMessages(prev => [...prev, {type:"sys",text:OFFICE_QUESTIONS[next].cat}]);
      }
    }, 600);
  };

  return (
    <div style={{ minHeight:"100vh", background:"#F0F2F5", display:"flex", flexDirection:"column" }}>
      {/* Office header */}
      <div style={{ background:"#1877F2", padding:"12px 20px", display:"flex", alignItems:"center", gap:12, color:"#fff" }}>
        <button onClick={onBack} style={{background:"none",border:"none",color:"#fff",cursor:"pointer",fontSize:18}}>←</button>
        <div style={{fontWeight:700,fontSize:16}}>팀 단톡방 💼</div>
        <div style={{marginLeft:"auto",fontSize:12,opacity:0.8}}>
          {String(new Date().getHours()).padStart(2,"0")}:{String(new Date().getMinutes()).padStart(2,"0")}
        </div>
      </div>
      {/* Progress */}
      <div className="progress-track" style={{borderRadius:0}}>
        <div className="progress-fill" style={{width:`${pct}%`,background:"linear-gradient(90deg,#1877F2,#42A5F5)"}} />
      </div>

      {/* Chat area */}
      <div ref={containerRef} style={{ flex:1, overflowY:"auto", padding:"16px", display:"flex", flexDirection:"column", gap:10, minHeight:300 }}>
        {messages.map((m,i) => (
          m.type==="sys" ? <div key={i} className="chat-sys">{m.text}</div>
          : <div key={i} className="chat-sent" style={{background:"#1877F2"}}>{m.text}</div>
        ))}
        {/* Current question */}
        <div key={cur}>
          <div className="chat-sys">{q.cat}</div>
          <div className="chat-recv" style={{ marginTop:8, background:"#fff", color:"#111" }}>
            <div style={{fontSize:11,color:"#1877F2",fontWeight:600,marginBottom:4}}>👔 팀장님</div>
            {q.q}
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8,alignItems:"flex-end",marginTop:4}}>
          {q.opts.map((opt,i)=>(
            <button key={i} className={`chat-choice${picked&&messages.some(m=>m.text===opt)?" selected":""}`} onClick={()=>pick(i)} disabled={picked}>{opt}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function OfficeResult({ meta, result, scores, onBack, onRetry }: any) {
  return (
    <div style={{ minHeight:"100vh", background:"var(--bg-main)", padding:"24px 16px 60px" }}>
      <div style={{ maxWidth:560, margin:"0 auto" }}>
        <button className="back-btn" onClick={onBack} style={{marginBottom:24}}>← 테스트 목록</button>
        <div className="glass-card" style={{ overflow:"hidden", animation:"cardIn .6s ease both" }}>
          <div style={{background:"linear-gradient(135deg,#3b82f6,#1d4ed8)",padding:"40px 32px",textAlign:"center"}}>
            <div style={{fontSize:56,marginBottom:12}}>{result.emoji}</div>
            <p style={{color:"rgba(255,255,255,0.7)",fontSize:12,marginBottom:6}}>K-직장인 유형</p>
            <h2 style={{fontFamily:"inherit",fontSize:22,color:"#fff",marginBottom:4}}>{result.name}</h2>
            <p style={{color:"rgba(255,255,255,0.7)",fontSize:13}}>{result.subtitle}</p>
          </div>
          <div style={{padding:"28px 32px"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
              {[{k:"mad",label:"광인도",color:"#F44336"},{k:"soul",label:"영혼없음",color:"#9C27B0"},{k:"eff",label:"효율추구",color:"#2196F3"},{k:"slave",label:"노예도",color:"#FF9800"}].map(s=>(
                <div key={s.k} style={{textAlign:"center",padding:12,background:"rgba(255,255,255,0.05)",borderRadius:10}}>
                  <div style={{color:s.color,fontSize:20,fontWeight:700}}>{scores[s.k]}</div>
                  <div style={{color:"var(--text-muted)",fontSize:11,marginTop:4}}>{s.label}</div>
                </div>
              ))}
            </div>
            <p style={{color:"var(--text-secondary)",fontSize:14,lineHeight:1.7,marginBottom:24}}>{result.desc}</p>
            <div style={{display:"flex",gap:10}}>
              <button className="btn-ghost" style={{flex:1}} onClick={onRetry}>다시 하기</button>
              <button className="btn-primary" style={{flex:1}} onClick={onBack}>다른 테스트 보기</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ SEVEN QUIZ (Swipe) ═══════════════════════════════════════ */
function SevenQuiz({ meta, onBack, onDone, onRetry }: any) {
  const [cur, setCur] = useState(0);
  const [yesCount, setYesCount] = useState(0);
  const [swipeDir, setSwipeDir] = useState<"left"|"right"|null>(null);
  const [dragging, setDragging] = useState(false);
  const [dragX, setDragX] = useState(0);
  const startX = useRef(0);
  const pct = Math.round(cur / SEVEN_QUESTIONS.length * 100);

  const answer = (yes: boolean) => {
    setSwipeDir(yes ? "right" : "left");
    const ny = yes ? yesCount + 1 : yesCount;
    setTimeout(() => {
      setSwipeDir(null); setDragX(0);
      const next = cur + 1;
      if (next >= SEVEN_QUESTIONS.length) {
        const r = [...SEVEN_RESULTS].reverse().find(r => ny >= r.min) || SEVEN_RESULTS[SEVEN_RESULTS.length-1];
        onDone(<SevenResult meta={meta} result={r} yesCount={ny} total={SEVEN_QUESTIONS.length} onBack={onBack} onRetry={onRetry} />);
      } else {
        setYesCount(ny); setCur(next);
      }
    }, 400);
  };

  const onMouseDown = (e: React.MouseEvent) => { setDragging(true); startX.current = e.clientX; };
  const onMouseMove = (e: React.MouseEvent) => { if (dragging) setDragX(e.clientX - startX.current); };
  const onMouseUp = () => { if (dragging) { setDragging(false); if (Math.abs(dragX) > 80) answer(dragX > 0); else setDragX(0); } };

  const tilt = Math.min(Math.max(dragX / 8, -20), 20);

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#0D001A,#1A0030)", padding:"24px 16px 60px" }}>
      <div style={{ maxWidth:600, margin:"0 auto" }}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <button className="back-btn" onClick={onBack}>← Back</button>
          <span style={{color:"var(--rose-300)",fontSize:13}}>{cur+1} / {SEVEN_QUESTIONS.length} | YES: {yesCount}</span>
        </div>
        <div className="progress-track" style={{marginBottom:32}}>
          <div className="progress-fill" style={{width:`${pct}%`}} />
        </div>

        {/* Card container */}
        <div style={{position:"relative",height:300,marginBottom:28}} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}>
          {swipeDir ? (
            <div style={{
              position:"absolute",inset:0,
              background:"linear-gradient(135deg,rgba(45,0,77,0.96),rgba(26,0,51,0.98))",
              border:"1px solid rgba(255,0,127,0.28)",borderRadius:24,padding:32,
              display:"flex",flexDirection:"column",justifyContent:"center",
              animation: swipeDir==="right" ? "swipe-right .4s ease forwards" : "swipe-left .4s ease forwards",
            }}>
              <p style={{color:"rgba(255,255,255,0.7)",fontSize:16,lineHeight:1.7}}>{SEVEN_QUESTIONS[cur]}</p>
            </div>
          ) : (
            <div
              onMouseDown={onMouseDown}
              style={{
                position:"absolute",inset:0,
                background:"linear-gradient(135deg,rgba(45,0,77,0.96),rgba(26,0,51,0.98))",
                border:`1px solid ${dragX>60?"rgba(0,255,127,0.5)":dragX<-60?"rgba(255,0,127,0.5)":"rgba(255,0,127,0.28)"}`,
                borderRadius:24,padding:32,cursor:"grab",userSelect:"none",
                display:"flex",flexDirection:"column",justifyContent:"center",
                transform:`translateX(${dragX}px) rotate(${tilt}deg)`,
                transition:dragging?"none":"transform .2s ease",
                boxShadow:`0 20px 60px rgba(0,0,0,0.5)`,
              }}
            >
              {dragX > 60 && <div style={{position:"absolute",top:20,left:24,color:"#00FF7F",fontSize:24,fontWeight:700,opacity:Math.min((dragX-60)/40,1)}}>YES ✓</div>}
              {dragX < -60 && <div style={{position:"absolute",top:20,right:24,color:"#FF006E",fontSize:24,fontWeight:700,opacity:Math.min((-dragX-60)/40,1)}}>NO ✗</div>}
              <p style={{color:"rgba(255,0,127,0.6)",fontSize:12,marginBottom:12,fontFamily:"monospace"}}>Q.{String(cur+1).padStart(2,"0")} — 당신에게 해당하나요?</p>
              <p style={{color:"rgba(255,255,255,0.85)",fontSize:16,lineHeight:1.7}}>{SEVEN_QUESTIONS[cur]}</p>
            </div>
          )}
        </div>

        <div style={{display:"flex",gap:16,justifyContent:"center"}}>
          <button onClick={() => answer(false)} style={{width:72,height:72,borderRadius:"50%",border:"2px solid #FF006E",background:"rgba(255,0,110,0.1)",color:"#FF006E",fontSize:28,cursor:"pointer",transition:"all .2s"}}>✗</button>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4}}>
            <p style={{color:"var(--text-muted)",fontSize:11}}>← NO / YES →</p>
          </div>
          <button onClick={() => answer(true)} style={{width:72,height:72,borderRadius:"50%",border:"2px solid #00FF7F",background:"rgba(0,255,127,0.1)",color:"#00FF7F",fontSize:28,cursor:"pointer",transition:"all .2s"}}>✓</button>
        </div>
      </div>
    </div>
  );
}

function SevenResult({ meta, result, yesCount, total, onBack, onRetry }: any) {
  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#0D001A,#1A0030)", padding:"24px 16px 60px" }}>
      <div style={{maxWidth:560,margin:"0 auto"}}>
        <button className="back-btn" onClick={onBack} style={{marginBottom:24}}>← 테스트 목록</button>
        <div style={{border:"2px solid rgba(255,0,127,0.4)",borderRadius:20,overflow:"hidden",animation:"cardIn .6s ease both",boxShadow:"0 0 60px rgba(255,0,127,0.15)"}}>
          <div style={{background:"linear-gradient(135deg,#FF007F,#00F0FF)",padding:"40px 32px",textAlign:"center"}}>
            <div style={{fontSize:56,marginBottom:12}}>{result.icon}</div>
            <p style={{color:"rgba(255,255,255,0.8)",fontSize:12,marginBottom:4}}>{result.tier}</p>
            <h2 style={{fontFamily:"inherit",fontSize:26,color:"#fff",marginBottom:4}}>{result.name}</h2>
            <p style={{color:"rgba(255,255,255,0.8)",fontSize:13}}>{result.subtitle}</p>
          </div>
          <div style={{padding:"28px 32px",background:"rgba(13,0,26,0.9)"}}>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{fontSize:48,fontWeight:900,color:"#FF007F"}}>{yesCount}<span style={{fontSize:20,color:"rgba(255,255,255,0.5)"}}>/{total}</span></div>
              <div style={{color:"rgba(255,255,255,0.5)",fontSize:13}}>YES 응답 수</div>
            </div>
            <p style={{color:"rgba(255,255,255,0.75)",fontSize:14,lineHeight:1.7,marginBottom:24}}>{result.desc}</p>
            <div style={{display:"flex",gap:10}}>
              <button className="btn-ghost" style={{flex:1}} onClick={onRetry}>다시 하기</button>
              <button className="btn-primary" style={{flex:1}} onClick={onBack}>다른 테스트 보기</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ HSP RESULT ═══════════════════════════════════════ */
function HspResult({ meta, result, score, onBack, onRetry }: any) {
  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(180deg,#E8F3D6 0%,#FAF3E0 50%,#FFF9F0 100%)",padding:"24px 16px 60px"}}>
      <div style={{maxWidth:560,margin:"0 auto"}}>
        <button className="back-btn" onClick={onBack} style={{marginBottom:24}}>← 테스트 목록</button>
        <div className="glass-card" style={{overflow:"hidden",animation:"cardIn .6s ease both"}}>
          <div style={{background:"linear-gradient(135deg,#A8D8EA,#AA96DA)",padding:"40px 32px",textAlign:"center"}}>
            <div style={{fontSize:56,marginBottom:12}}>{result.drop}</div>
            <p style={{color:"rgba(255,255,255,0.8)",fontSize:12,marginBottom:6}}>{result.tier}</p>
            <h2 style={{fontFamily:"inherit",fontSize:22,color:"#fff",marginBottom:4}}>{result.name}</h2>
          </div>
          <div style={{padding:"28px 32px"}}>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{fontSize:40,fontWeight:900,color:"var(--rose-400)"}}>{score}<span style={{fontSize:18,color:"var(--text-muted)"}}>%</span></div>
              <div style={{color:"var(--text-muted)",fontSize:13}}>예민 지수</div>
            </div>
            <p style={{color:"var(--text-secondary)",fontSize:14,lineHeight:1.7,marginBottom:16}}>{result.desc}</p>
            <div style={{background:"rgba(168,216,234,0.1)",border:"1px solid rgba(168,216,234,0.2)",borderRadius:12,padding:16,marginBottom:24}}>
              <p style={{color:"#A8D8EA",fontSize:12,marginBottom:6}}>💊 HSP 처방전</p>
              <p style={{color:"var(--text-secondary)",fontSize:13,lineHeight:1.6}}>{result.prescription}</p>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button className="btn-ghost" style={{flex:1}} onClick={onRetry}>다시 하기</button>
              <button className="btn-primary" style={{flex:1}} onClick={onBack}>다른 테스트 보기</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ TCI QUIZ ═══════════════════════════════════════ */
function TciQuiz({ meta, onBack, onDone, onRetry }: any) {
  const [cur, setCur] = useState(0);
  const [scores, setScores] = useState({ns:0,ha:0,rd:0,p:0});
  const pct = Math.round(cur / TCI_QUESTIONS.length * 100);

  const pick = (i: number) => {
    const q = TCI_QUESTIONS[cur];
    const ns = {...scores}; ns[q.trait as keyof typeof ns] += i;
    const next = cur + 1;
    if (next >= TCI_QUESTIONS.length) {
      const dominant = (Object.entries(ns) as [string,number][]).sort((a,b)=>b[1]-a[1])[0][0];
      const r = TCI_RESULTS[dominant];
      onDone(<TciResult meta={meta} result={r} scores={ns} dominant={dominant} onBack={onBack} onRetry={onRetry} />);
    } else {
      setScores(ns); setCur(next);
    }
  };

  return (
    <div style={{minHeight:"100vh",background:"#F8FAFC",padding:"24px 16px 60px"}}>
      <QuizHeader meta={meta} cur={cur} total={TCI_QUESTIONS.length} pct={pct} onBack={onBack} />
      <div style={{maxWidth:600,margin:"0 auto",animation:"fadeUp .4s ease both"}}>
        <QuizCard qnum={cur+1} question={TCI_QUESTIONS[cur].q} category={TCI_QUESTIONS[cur].cat}
          cardStyle={{background:"#fff",border:"1px solid rgba(71,85,105,0.12)",borderRadius:16,boxShadow:"0 4px 20px rgba(71,85,105,0.08)"}}
          catStyle={{color:"#14B8A6",letterSpacing:1}}
          qTextStyle={{color:"#1E293B",fontWeight:500}}
        >
          {TCI_OPTS.map((o,i)=>(
            <button key={i} className="opt-btn" onClick={()=>pick(i)}
              style={{background:"#F8FAFC",border:"1px solid rgba(71,85,105,0.15)",color:"#475569",borderRadius:8}}>
              <span className="opt-lbl" style={{color:"#14B8A6",borderColor:"rgba(20,184,166,0.3)"}}>{i}</span><span>{o}</span>
            </button>
          ))}
        </QuizCard>
      </div>
    </div>
  );
}

function TciResult({ meta, result, scores, dominant, onBack, onRetry }: any) {
  const colors: Record<string,string> = {ns:"#FF6B35",ha:"#42A5F5",rd:"#FF6B9D",p:"#81C784"};
  const labels: Record<string,string> = {ns:"자극추구",ha:"위험회피",rd:"사회민감",p:"인내력"};
  return (
    <div style={{minHeight:"100vh",background:"#F8FAFC",padding:"24px 16px 60px"}}>
      <div style={{maxWidth:560,margin:"0 auto"}}>
        <button className="back-btn" onClick={onBack} style={{marginBottom:24}}>← 테스트 목록</button>
        <div className="glass-card" style={{overflow:"hidden",animation:"cardIn .6s ease both"}}>
          <div style={{background:"linear-gradient(135deg,#475569,#14B8A6)",padding:"40px 32px",textAlign:"center"}}>
            <div style={{fontSize:52,marginBottom:12}}>📊</div>
            <h2 style={{fontFamily:"inherit",fontSize:22,color:"#fff",marginBottom:4}}>{result.title}</h2>
            <p style={{color:"rgba(255,255,255,0.8)",fontSize:13}}>{result.subtitle}</p>
          </div>
          <div style={{padding:"28px 32px"}}>
            <div style={{marginBottom:20}}>
              {(Object.entries(scores) as [string,number][]).map(([k,v])=>(
                <div key={k} style={{marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <span style={{color:colors[k],fontSize:13}}>{labels[k]}</span>
                    <span style={{color:"var(--text-muted)",fontSize:13}}>{v}점</span>
                  </div>
                  <div className="trait-track">
                    <div className="trait-fill" style={{width:`${Math.min(v/20*100,100)}%`,background:colors[k]}} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{background:"rgba(20,184,166,0.1)",border:"1px solid rgba(20,184,166,0.2)",borderRadius:12,padding:16,marginBottom:24}}>
              <p style={{color:"#14B8A6",fontSize:12,marginBottom:6}}>🗓 맞춤 계획법</p>
              <p style={{color:"var(--text-secondary)",fontSize:13,lineHeight:1.6}}>{result.plan}</p>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button className="btn-ghost" style={{flex:1}} onClick={onRetry}>다시 하기</button>
              <button className="btn-primary" style={{flex:1}} onClick={onBack}>다른 테스트 보기</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ EMPATHY QUIZ ═══════════════════════════════════════ */
function EmpathyQuiz({ meta, onBack, onDone, onRetry }: any) {
  const [cur, setCur] = useState(0);
  const [scores, setScores] = useState({c:0,e:0,b:0});
  const pct = Math.round(cur / EMPATHY_QUESTIONS.length * 100);

  const pick = (opt: any) => {
    const ns = {c:scores.c+opt.c,e:scores.e+opt.e,b:scores.b+opt.b};
    const next = cur + 1;
    if (next >= EMPATHY_QUESTIONS.length) {
      const dominant = (Object.entries(ns) as [string,number][]).sort((a,b)=>b[1]-a[1])[0][0] as keyof typeof EMPATHY_RESULTS;
      const r = EMPATHY_RESULTS[dominant];
      onDone(<EmpathyResult meta={meta} result={r} scores={ns} onBack={onBack} onRetry={onRetry} />);
    } else {
      setScores(ns); setCur(next);
    }
  };

  const q = EMPATHY_QUESTIONS[cur];
  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0F172A,#1E1040,#0F172A)",padding:"24px 16px 60px"}}>
      <QuizHeader meta={meta} cur={cur} total={EMPATHY_QUESTIONS.length} pct={pct} onBack={onBack} />
      <div style={{maxWidth:600,margin:"0 auto",animation:"fadeUp .4s ease both"}}>
        <QuizCard qnum={cur+1} question={q.q}
          cardStyle={{background:"rgba(139,92,246,0.07)",border:"1px solid rgba(139,92,246,0.2)",backdropFilter:"blur(20px)",borderRadius:24}}
          qTextStyle={{color:"rgba(230,210,255,0.92)"}}
        >
          {q.opts.map((o: any,i: number)=>(
            <button key={i} className="opt-btn" onClick={()=>pick(o)}
              style={{background:"rgba(139,92,246,0.07)",border:"1px solid rgba(139,92,246,0.2)",color:"rgba(210,190,255,0.85)"}}>
              <span className="opt-lbl" style={{color:"#a78bfa",borderColor:"rgba(139,92,246,0.3)"}}>{String.fromCharCode(65+i)}</span><span>{o.t}</span>
            </button>
          ))}
        </QuizCard>
      </div>
    </div>
  );
}

function EmpathyResult({ meta, result, scores, onBack, onRetry }: any) {
  const keys = [{k:"c",label:"인지 공감",color:"#00CED1"},{k:"e",label:"정서 공감",color:"#FF6B9D"},{k:"b",label:"행동 공감",color:"#FFD666"}];
  const maxVal = Math.max(scores.c,scores.e,scores.b,1);
  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0F172A,#1E1040,#0F172A)",padding:"24px 16px 60px"}}>
      <div style={{maxWidth:560,margin:"0 auto"}}>
        <button className="back-btn" onClick={onBack} style={{marginBottom:24}}>← 테스트 목록</button>
        <div className="glass-card" style={{overflow:"hidden",animation:"cardIn .6s ease both"}}>
          <div style={{background:"linear-gradient(135deg,#8b5cf6,#ec4899)",padding:"40px 32px",textAlign:"center"}}>
            <div style={{fontSize:52,marginBottom:12}}>💎</div>
            <p style={{color:"rgba(255,255,255,0.8)",fontSize:13,marginBottom:4}}>{result.subtitle}</p>
            <h2 style={{fontFamily:"inherit",fontSize:22,color:"#fff"}}>{result.name}</h2>
          </div>
          <div style={{padding:"28px 32px"}}>
            <div style={{marginBottom:24}}>
              {keys.map(s=>(
                <div key={s.k} style={{marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <span style={{color:s.color,fontSize:13}}>{s.label}</span>
                    <span style={{color:"var(--text-muted)",fontSize:13}}>{scores[s.k]}점</span>
                  </div>
                  <div className="trait-track">
                    <div className="trait-fill" style={{width:`${Math.round(scores[s.k]/maxVal*100)}%`,background:s.color}} />
                  </div>
                </div>
              ))}
            </div>
            <p style={{color:"var(--text-secondary)",fontSize:14,lineHeight:1.7,marginBottom:24}}>{result.desc}</p>
            <div style={{display:"flex",gap:10}}>
              <button className="btn-ghost" style={{flex:1}} onClick={onRetry}>다시 하기</button>
              <button className="btn-primary" style={{flex:1}} onClick={onBack}>다른 테스트 보기</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ MENTAL QUIZ ═══════════════════════════════════════ */
function MentalQuiz({ meta, onBack, onDone, onRetry }: any) {
  const [cur, setCur] = useState(0);
  const [total, setTotal] = useState(0);
  const pct = Math.round(cur / MENTAL_QUESTIONS.length * 100);

  const pick = (s: number) => {
    const nt = total + s;
    const next = cur + 1;
    if (next >= MENTAL_QUESTIONS.length) {
      const r = [...MENTAL_RESULTS].reverse().find(r => nt >= r.min) || MENTAL_RESULTS[0];
      onDone(<MentalResult meta={meta} result={r} score={nt} onBack={onBack} onRetry={onRetry} />);
    } else {
      setTotal(nt); setCur(next);
    }
  };

  const q = MENTAL_QUESTIONS[cur];
  return (
    <div style={{minHeight:"100vh",background:"#000",padding:"24px 16px 60px"}}>
      <QuizHeader meta={meta} cur={cur} total={MENTAL_QUESTIONS.length} pct={pct} onBack={onBack} />
      <div style={{maxWidth:600,margin:"0 auto",animation:"fadeUp .4s ease both"}}>
        <QuizCard qnum={cur+1} question={q.q}
          cardStyle={{background:"rgba(57,255,20,0.03)",border:"1px solid rgba(57,255,20,0.18)",borderRadius:0,boxShadow:"0 0 20px rgba(57,255,20,0.05)"}}
          qTextStyle={{color:"rgba(57,255,20,0.9)",fontFamily:"monospace",fontWeight:500}}
        >
          {q.opts.map((o: any,i: number)=>(
            <button key={i} className="opt-btn" onClick={()=>pick(o.s)}
              style={{background:"rgba(57,255,20,0.04)",border:"1px solid rgba(57,255,20,0.2)",color:"rgba(57,255,20,0.8)",fontFamily:"monospace"}}>
              <span className="opt-lbl" style={{color:"#39FF14",borderColor:"rgba(57,255,20,0.3)"}}>{o.t.charAt(0)}</span><span>{o.t.substring(3)}</span>
            </button>
          ))}
        </QuizCard>
      </div>
    </div>
  );
}

function MentalResult({ meta, result, score, onBack, onRetry }: any) {
  return (
    <div style={{minHeight:"100vh",background:"#000",padding:"24px 16px 60px"}}>
      <div style={{maxWidth:560,margin:"0 auto"}}>
        <button className="back-btn" onClick={onBack} style={{marginBottom:24}}>← 테스트 목록</button>
        <div className="glass-card" style={{overflow:"hidden",animation:"cardIn .6s ease both"}}>
          <div style={{background:"linear-gradient(135deg,#39FF14,#FF69B4)",padding:"40px 32px",textAlign:"center"}}>
            <div style={{fontSize:64,marginBottom:8}}>{result.icon}</div>
            <div style={{fontSize:52,fontFamily:"inherit",color:"#fff",fontWeight:900,marginBottom:4}}>{result.age}<span style={{fontSize:24}}>세</span></div>
            <h2 style={{fontFamily:"inherit",fontSize:20,color:"#fff",marginBottom:4}}>{result.title}</h2>
            <p style={{color:"rgba(255,255,255,0.8)",fontSize:13}}>{result.subtitle}</p>
          </div>
          <div style={{padding:"28px 32px"}}>
            <div style={{marginBottom:20}}>
              {result.traits.map((t: any)=>(
                <div key={t.name} style={{marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                    <span style={{color:"var(--text-secondary)",fontSize:13}}>{t.name}</span>
                    <span style={{color:"var(--text-muted)",fontSize:13}}>{t.val}%</span>
                  </div>
                  <div className="trait-track">
                    <div className="trait-fill" style={{width:`${t.val}%`,background:"linear-gradient(90deg,#39FF14,#FF69B4)"}} />
                  </div>
                </div>
              ))}
            </div>
            <p style={{color:"var(--text-secondary)",fontSize:14,lineHeight:1.7,marginBottom:24}}>{result.desc}</p>
            <div style={{display:"flex",gap:10}}>
              <button className="btn-ghost" style={{flex:1}} onClick={onRetry}>다시 하기</button>
              <button className="btn-primary" style={{flex:1}} onClick={onBack}>다른 테스트 보기</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ ROMANCE QUIZ ═══════════════════════════════════════ */
function RomanceQuiz({ meta, onBack, onDone, onRetry }: any) {
  const [cur, setCur] = useState(0);
  const [counts, setCounts] = useState({highteen:0,indie:0,sf:0,classic:0});
  const pct = Math.round(cur / ROMANCE_QUESTIONS.length * 100);

  const pick = (type: string) => {
    const nc = {...counts, [type]: counts[type as keyof typeof counts]+1};
    const next = cur + 1;
    if (next >= ROMANCE_QUESTIONS.length) {
      const dominant = (Object.entries(nc) as [string,number][]).sort((a,b)=>b[1]-a[1])[0][0];
      const r = ROMANCE_RESULTS[dominant];
      onDone(<RomanceResult meta={meta} result={r} dominant={dominant} counts={nc} onBack={onBack} onRetry={onRetry} />);
    } else {
      setCounts(nc); setCur(next);
    }
  };

  const q = ROMANCE_QUESTIONS[cur];
  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#faf7f2,#f5ebe0,#fdf0e0)",padding:"24px 16px 60px"}}>
      <QuizHeader meta={meta} cur={cur} total={ROMANCE_QUESTIONS.length} pct={pct} onBack={onBack} />
      <div style={{maxWidth:600,margin:"0 auto",animation:"fadeUp .4s ease both"}}>
        <QuizCard qnum={cur+1} question={q.q}
          cardStyle={{background:"rgba(255,255,255,0.88)",border:"1px solid rgba(221,176,141,0.3)",borderRadius:20,boxShadow:"0 8px 32px rgba(180,120,80,0.1)"}}
          qTextStyle={{color:"#5C3D2E",fontFamily:"'Nanum Myeongjo',serif",fontWeight:600,fontSize:17}}
        >
          {q.opts.map((o: any,i: number)=>(
            <button key={i} className="opt-btn" onClick={()=>pick(o.type)}
              style={{background:"#fff",border:"1px solid rgba(221,176,141,0.3)",color:"#6B4A3A",borderRadius:14}}>
              <span className="opt-lbl" style={{color:"#C07850",borderColor:"rgba(192,120,80,0.3)"}}>{String.fromCharCode(65+i)}</span><span>{o.t}</span>
            </button>
          ))}
        </QuizCard>
      </div>
    </div>
  );
}

function RomanceResult({ meta, result, dominant, counts, onBack, onRetry }: any) {
  const colorMap: Record<string,string> = {highteen:"#FF69B4",indie:"#A78BFA",sf:"#60A5FA",classic:"#FBBF24"};
  const labelMap: Record<string,string> = {highteen:"하이틴",indie:"인디",sf:"SF",classic:"클래식"};
  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#faf7f2,#f5ebe0,#fdf0e0)",padding:"24px 16px 60px"}}>
      <div style={{maxWidth:560,margin:"0 auto"}}>
        <button className="back-btn" onClick={onBack} style={{marginBottom:24}}>← 테스트 목록</button>
        <div className="glass-card" style={{overflow:"hidden",animation:"cardIn .6s ease both"}}>
          <div style={{background:"linear-gradient(135deg,#FFB6C1,#FF69B4)",padding:"40px 32px",textAlign:"center"}}>
            <div style={{fontSize:48,marginBottom:12}}>💘</div>
            <h2 style={{fontFamily:"inherit",fontSize:22,color:"#fff",marginBottom:4}}>{result.title}</h2>
            <p style={{color:"rgba(255,255,255,0.85)",fontSize:13}}>{result.subtitle}</p>
            <div style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap",marginTop:12}}>
              {result.keywords.map((k: string)=>(
                <span key={k} style={{background:"rgba(255,255,255,0.2)",borderRadius:99,padding:"4px 12px",fontSize:12,color:"#fff"}}>{k}</span>
              ))}
            </div>
          </div>
          <div style={{padding:"28px 32px"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>
              {(Object.entries(counts) as [string,number][]).map(([k,v])=>(
                <div key={k} style={{textAlign:"center",padding:12,background:`${colorMap[k]}18`,border:`1px solid ${colorMap[k]}33`,borderRadius:10}}>
                  <div style={{color:colorMap[k],fontSize:20,fontWeight:700}}>{v}</div>
                  <div style={{color:"var(--text-muted)",fontSize:11,marginTop:4}}>{labelMap[k]}</div>
                </div>
              ))}
            </div>
            <p style={{color:"var(--text-secondary)",fontSize:14,lineHeight:1.7,marginBottom:16}}>{result.desc}</p>
            <div style={{background:"rgba(255,182,193,0.08)",border:"1px solid rgba(255,182,193,0.2)",borderRadius:12,padding:16,marginBottom:24}}>
              <p style={{color:"var(--rose-300)",fontSize:12,marginBottom:6}}>🎵 추천 플레이리스트</p>
              {result.playlist.map((s: string)=>(
                <p key={s} style={{color:"var(--text-muted)",fontSize:13,marginBottom:2}}>♪ {s}</p>
              ))}
            </div>
            <div style={{display:"flex",gap:10}}>
              <button className="btn-ghost" style={{flex:1}} onClick={onRetry}>다시 하기</button>
              <button className="btn-primary" style={{flex:1}} onClick={onBack}>다른 테스트 보기</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ SHARED COMPONENTS ═══════════════════════════════════════ */
function QuizHeader({ meta, cur, total, pct, onBack, accent }: any) {
  const accentColor = accent || "var(--rose-400)";
  return (
    <div style={{ maxWidth: 600, margin: "0 auto 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <button className="back-btn" onClick={onBack}>← 테스트 목록</button>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span style={{ fontSize:16 }}><Image src="/images/home/yeoni-pass-mascot-240.webp" width={40} height={40} alt="함께하는 연이" style={{borderRadius:20}} /></span>
          <span style={{ background:`${accentColor}22`, border:`1px solid ${accentColor}55`, borderRadius:99, padding:"4px 12px", fontSize:12, color:accentColor, fontFamily:"inherit", letterSpacing:1 }}>
            {cur+1} / {total}
          </span>
        </div>
      </div>
      <div className="progress-track" role="progressbar" aria-label="테스트 진행률" aria-valuemin={0} aria-valuemax={total} aria-valuenow={cur}>
        <div className="progress-fill" style={{ width: `${pct}%`, background:`linear-gradient(90deg,${accentColor},${accentColor}99)` }} />
      </div>
    </div>
  );
}

function QuizCard({ qnum, question, category, children, cardStyle, qTextStyle, catStyle }: { qnum: number; question: string; category?: string; children: React.ReactNode; cardStyle?: React.CSSProperties; qTextStyle?: React.CSSProperties; catStyle?: React.CSSProperties }) {
  return (
    <div key={qnum} className="glass-card quiz-enter" style={{ padding: "28px 24px", ...cardStyle }}>
      {category && (
        <p style={{ color: "var(--rose-300)", fontSize: 11, marginBottom: 10, fontFamily: "monospace", letterSpacing: 2, textTransform:"uppercase", ...catStyle }}>{category}</p>
      )}
      <div style={{ display:"flex", alignItems:"baseline", gap:6, marginBottom:12 }}>
        <span style={{ color: "var(--text-muted)", fontSize: 11, fontFamily:"inherit", letterSpacing:1 }}>Q</span>
        <span style={{ color: "var(--rose-300)", fontSize: 22, fontFamily:"inherit", lineHeight:1 }}>{String(qnum).padStart(2,"0")}</span>
      </div>
      <h2 tabIndex={-1} ref={(node) => node?.focus({ preventScroll: true })} style={{ color: "var(--text-primary)", fontSize: 22, lineHeight: 1.65, marginBottom: 28, fontWeight: 600, ...qTextStyle }}>{question}</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
    </div>
  );
}

function SimpleResult({ meta, title, badge, desc, score, maxScore, color, onBack, onRetry }: any) {
  const pct = Math.round(score / maxScore * 100);
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-main)", padding: "24px 16px 60px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <button className="back-btn" onClick={onBack} style={{ marginBottom: 24 }}>← 테스트 목록</button>
        <div className="glass-card" style={{ overflow: "hidden", animation: "cardIn .6s ease both" }}>
          <div style={{ padding: "40px 32px", textAlign: "center", background: `linear-gradient(135deg,${color}33,${color}11)`, borderBottom: `1px solid ${color}33` }}>
            <p style={{ color, fontSize: 13, marginBottom: 8 }}>{badge}</p>
            <div style={{ fontSize: 56, fontWeight: 900, color, marginBottom: 8 }}>{pct}<span style={{ fontSize: 24 }}>%</span></div>
            <h2 style={{ fontFamily: "inherit", fontSize: 22, color: "#fff" }}>{title}</h2>
          </div>
          <div style={{ padding: "28px 32px" }}>
            <p style={{ color: "var(--text-secondary)", fontSize: 15, lineHeight: 1.7, marginBottom: 28 }}>{desc}</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={onRetry}>다시 하기</button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={onBack}>다른 테스트 보기</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ MBTI QUIZ ═══════════════════════════════════════ */
function MbtiQuiz({ meta, onBack, onDone, onRetry }: any) {
  const [cur, setCur] = useState(0);
  const [scores, setScores] = useState<Record<string,number>>({E:0,I:0,S:0,N:0,T:0,F:0,J:0,P:0});
  const total = MBTI_QUESTIONS.length;
  const pct = Math.round((cur / total) * 100);
  const dimNames: Record<string,string> = { EI:"에너지 방향", SN:"인식 방식", TF:"판단 기준", JP:"생활 방식" };
  const dimColors: Record<string,string> = { EI:"#667eea", SN:"#f093fb", TF:"#4facfe", JP:"#43e97b" };

  const pick = (dim: string) => {
    const ns = { ...scores, [dim]: (scores[dim] || 0) + 1 };
    const next = cur + 1;
    if (next >= total) {
      const E = ns.E >= ns.I ? "E" : "I";
      const S = ns.S >= ns.N ? "S" : "N";
      const T = ns.T >= ns.F ? "T" : "F";
      const J = ns.J >= ns.P ? "J" : "P";
      const type = E + S + T + J;
      const result = MBTI_RESULTS[type] || MBTI_RESULTS["INFP"];
      onDone(<MbtiResult meta={meta} result={result} scores={ns} type={type} onBack={onBack} onRetry={onRetry} />);
    } else {
      setScores(ns);
      setCur(next);
    }
  };

  const q = MBTI_QUESTIONS[cur];
  const dimIdx = ["EI","SN","TF","JP"].indexOf(q.dim);
  const dimColor = dimColors[q.dim] || "#667eea";

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#667eea 0%,#764ba2 50%,#f093fb 100%)", padding:"24px 16px 60px" }}>
      <div style={{ maxWidth:560, margin:"0 auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <button className="back-btn" onClick={onBack} style={{ color:"rgba(255,255,255,0.85)", background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.25)" }}>← 뒤로</button>
          <span style={{ color:"rgba(255,255,255,0.85)", fontSize:13, fontWeight:600 }}>{cur + 1} / {total}</span>
        </div>

        <div style={{ marginBottom:28 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
            {["E/I","S/N","T/F","J/P"].map((d, idx) => (
              <span key={d} style={{
                fontSize:11, fontWeight:700, padding:"5px 10px", borderRadius:99,
                color: idx === dimIdx ? "#fff" : "rgba(255,255,255,0.45)",
                background: idx === dimIdx ? "rgba(255,255,255,0.3)" : "transparent",
                border: idx === dimIdx ? "1px solid rgba(255,255,255,0.4)" : "1px solid transparent",
                transition:"all .3s",
              }}>{d}</span>
            ))}
          </div>
          <div style={{ height:6, background:"rgba(255,255,255,0.2)", borderRadius:99 }}>
            <div style={{ width:`${pct}%`, height:"100%", background:"rgba(255,255,255,0.9)", borderRadius:99, transition:"width .4s ease" }} />
          </div>
        </div>

        <div style={{ textAlign:"center", marginBottom:16 }}>
          <span style={{ background:"rgba(255,255,255,0.22)", color:"#fff", borderRadius:99, padding:"6px 18px", fontSize:12, fontWeight:700, letterSpacing:1 }}>{dimNames[q.dim]}</span>
        </div>

        <div style={{ background:"rgba(255,255,255,0.97)", borderRadius:28, padding:"32px 28px", marginBottom:18, boxShadow:"0 20px 60px rgba(0,0,0,0.25)", animation:"fadeUp .35s ease both" }}>
          <p style={{ fontSize:17, fontWeight:700, color:"#1A1A2E", lineHeight:1.7, textAlign:"center" }}>{q.q}</p>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {q.opts.map((o: any, i: number) => (
            <button key={i} onClick={() => pick(o.dim)}
              style={{ background:"rgba(255,255,255,0.93)", border:"2px solid rgba(255,255,255,0.4)", borderRadius:22, padding:"18px 22px", textAlign:"left", cursor:"pointer", display:"flex", alignItems:"center", gap:16, boxShadow:"0 4px 20px rgba(0,0,0,0.1)", transition:"transform .15s, box-shadow .15s", animation:`fadeUp .4s ease ${i*0.08}s both` }}>
              <span style={{ width:36, height:36, borderRadius:"50%", background:i===0?"linear-gradient(135deg,#667eea,#764ba2)":"linear-gradient(135deg,#f093fb,#f5576c)", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:14, flexShrink:0 }}>{i===0?"A":"B"}</span>
              <span style={{ color:"#1A1A2E", fontSize:15, lineHeight:1.55, fontWeight:500 }}>{o.t}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function MbtiResult({ meta, result, scores, type, onBack, onRetry }: any) {
  const dims = [
    { a:"E", b:"I", aLabel:"외향형", bLabel:"내향형", color:"#667eea" },
    { a:"S", b:"N", aLabel:"감각형", bLabel:"직관형", color:"#f093fb" },
    { a:"T", b:"F", aLabel:"사고형", bLabel:"감정형", color:"#4facfe" },
    { a:"J", b:"P", aLabel:"판단형", bLabel:"인식형", color:"#43e97b" },
  ];

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#667eea,#764ba2,#f093fb)", padding:"24px 16px 60px" }}>
      <div style={{ maxWidth:560, margin:"0 auto" }}>
        <button className="back-btn" onClick={onBack} style={{ marginBottom:24, color:"rgba(255,255,255,0.85)", background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.25)" }}>← 테스트 목록</button>

        <div style={{ background:"#fff", borderRadius:28, overflow:"hidden", boxShadow:"0 24px 80px rgba(0,0,0,0.3)", marginBottom:16, animation:"cardIn .6s ease both" }}>
          <div style={{ background:`linear-gradient(135deg,${result.color}15,${result.color}30)`, padding:"40px 32px", textAlign:"center", borderBottom:`3px solid ${result.color}` }}>
            <div style={{ fontSize:52, marginBottom:8 }}>{result.icon}</div>
            <div style={{ fontFamily:"inherit", fontSize:56, color:result.color, letterSpacing:6, marginBottom:4, lineHeight:1 }}>{result.name}</div>
            <div style={{ fontSize:18, fontWeight:800, color:"#1A1A2E", marginBottom:12 }}>{result.title}</div>
            <div style={{ display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap" }}>
              {result.keywords.map((k: string) => (
                <span key={k} style={{ background:`${result.color}18`, color:result.color, borderRadius:99, padding:"5px 14px", fontSize:12, fontWeight:700, border:`1px solid ${result.color}30` }}>{k}</span>
              ))}
            </div>
          </div>

          <div style={{ padding:"28px 28px 32px" }}>
            <p style={{ color:"#444", fontSize:15, lineHeight:1.8, marginBottom:24, fontFamily:"inherit" }}>{result.desc}</p>

            <div style={{ marginBottom:24 }}>
              <p style={{ color:"#888", fontSize:12, fontWeight:700, letterSpacing:1, marginBottom:14, textTransform:"uppercase" }}>나의 MBTI 지표</p>
              {dims.map(d => {
                const aVal = scores[d.a] || 0;
                const bVal = scores[d.b] || 0;
                const total = aVal + bVal || 1;
                const aPct = Math.round(aVal / total * 100);
                const bPct = 100 - aPct;
                const aWins = aPct >= 50;
                return (
                  <div key={d.a} style={{ marginBottom:14 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6, fontSize:13 }}>
                      <span style={{ color:aWins?result.color:"#aaa", fontWeight:aWins?700:400 }}>{d.a} {d.aLabel} {aPct}%</span>
                      <span style={{ color:!aWins?result.color:"#aaa", fontWeight:!aWins?700:400 }}>{bPct}% {d.bLabel} {d.b}</span>
                    </div>
                    <div style={{ height:10, background:"#f0f0f8", borderRadius:99, overflow:"hidden" }}>
                      <div style={{ width:`${aPct}%`, height:"100%", background:`linear-gradient(90deg,${d.color},${result.color})`, borderRadius:99, transition:"width .8s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:24 }}>
              <div style={{ background:"#f0fff8", borderRadius:16, padding:"16px 14px", border:"1px solid #c6f6e4" }}>
                <div style={{ color:"#00C897", fontSize:12, fontWeight:800, marginBottom:8, letterSpacing:0.5 }}>✓ 강점</div>
                {result.strengths.map((s: string) => <div key={s} style={{ color:"#2D6A4F", fontSize:13, marginBottom:5, lineHeight:1.4 }}>• {s}</div>)}
              </div>
              <div style={{ background:"#fff5f5", borderRadius:16, padding:"16px 14px", border:"1px solid #fed7d7" }}>
                <div style={{ color:"#E53E3E", fontSize:12, fontWeight:800, marginBottom:8, letterSpacing:0.5 }}>△ 약점</div>
                {result.weaknesses.map((w: string) => <div key={w} style={{ color:"#742A2A", fontSize:13, marginBottom:5, lineHeight:1.4 }}>• {w}</div>)}
              </div>
            </div>

            <div style={{ display:"flex", gap:10 }}>
              <button className="btn-ghost" style={{ flex:1 }} onClick={onRetry}>다시 하기</button>
              <button className="btn-primary" style={{ flex:1 }} onClick={onBack}>다른 테스트 보기</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════ SHARED DIM-TYPE QUIZ ══════════════════ */
function DimTypeQuiz({ bg, accent, cardBg, textColor, questions, categoryLabel, onBack, onDone }: any) {
  const [cur, setCur] = useState(0);
  const [scores, setScores] = useState<Record<string,number>>({});
  const total = questions.length;
  const pct = Math.round(cur / total * 100);
  const isLight = textColor && (textColor.startsWith("#5") || textColor.startsWith("#3") || textColor.startsWith("#1E"));

  const pick = (dim: string) => {
    const ns = { ...scores, [dim]: (scores[dim]||0)+1 };
    const next = cur + 1;
    if (next >= total) {
      const winner = Object.entries(ns).sort((a,b)=>b[1]-a[1])[0][0];
      onDone(winner, ns);
    } else {
      setScores(ns);
      setCur(next);
    }
  };

  const q = questions[cur];
  return (
    <div style={{ minHeight:"100vh", background:bg, padding:"24px 16px 60px" }}>
      <div style={{ maxWidth:560, margin:"0 auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <button className="back-btn" onClick={onBack} style={{ color:isLight?"rgba(0,0,0,0.5)":textColor, background:isLight?"rgba(0,0,0,0.06)":"rgba(255,255,255,0.1)", border:`1px solid ${isLight?"rgba(0,0,0,0.1)":"rgba(255,255,255,0.2)"}` }}>← 뒤로</button>
          <span style={{ color:isLight?"rgba(0,0,0,0.5)":textColor, fontSize:13, fontWeight:600 }}>{cur+1} / {total}</span>
        </div>

        <div style={{ marginBottom:24 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <span style={{ color:isLight?"rgba(0,0,0,0.5)":textColor, fontSize:11, fontWeight:700, letterSpacing:1 }}>{categoryLabel}</span>
            <span style={{ color:isLight?"rgba(0,0,0,0.4)":accent, fontSize:11, fontWeight:700 }}>{pct}%</span>
          </div>
          <div style={{ height:5, background:isLight?"rgba(0,0,0,0.08)":"rgba(255,255,255,0.15)", borderRadius:99 }}>
            <div style={{ width:`${pct}%`, height:"100%", background:accent, borderRadius:99, transition:"width .4s ease", boxShadow:`0 0 8px ${accent}80` }} />
          </div>
        </div>

        <div style={{ background:cardBg, backdropFilter:"blur(20px)", borderRadius:24, padding:"32px 26px", marginBottom:16, boxShadow:"0 16px 48px rgba(0,0,0,0.2)", border:`1px solid ${isLight?"rgba(0,0,0,0.06)":"rgba(255,255,255,0.12)"}`, animation:"fadeUp .35s ease both" }}>
          <p style={{ fontSize:17, fontWeight:700, color:isLight?"#2A1020":"#fff", lineHeight:1.7, textAlign:"center" }}>{q.q}</p>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {q.opts.map((o: any, i: number) => (
            <button key={i} onClick={() => pick(o.dim)}
              style={{ background:cardBg, backdropFilter:"blur(16px)", border:`2px solid ${isLight?"rgba(0,0,0,0.08)":"rgba(255,255,255,0.15)"}`, borderRadius:20, padding:"18px 20px", textAlign:"left", cursor:"pointer", display:"flex", alignItems:"center", gap:14, transition:"transform .15s, box-shadow .15s", animation:`fadeUp .4s ease ${i*0.08}s both` }}>
              <span style={{ width:34, height:34, borderRadius:"50%", background:i===0?accent:`${accent}55`, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:13, flexShrink:0 }}>{i===0?"A":"B"}</span>
              <span style={{ color:isLight?"#2A1020":"rgba(255,255,255,0.92)", fontSize:14, lineHeight:1.6, fontWeight:500 }}>{o.t}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════ LOVE LANG RESULT ══════════════════ */
function LoveLangResult({ meta, winner, scores, onBack, onRetry }: any) {
  const r = LOVELANG_RESULTS[winner];
  const dimLabels: Record<string,string> = { W:"💬 말", A:"🤲 행동", G:"🎁 선물", T:"⏰ 시간", P:"🤗 스킨십" };
  const total = Object.values(scores).reduce((a:any,b:any)=>a+b, 0) as number || 1;
  return (
    <div style={{ minHeight:"100vh", background:r.bg, padding:"24px 16px 60px" }}>
      <div style={{ maxWidth:560, margin:"0 auto" }}>
        <button className="back-btn" onClick={onBack} style={{ marginBottom:24, color:"rgba(90,26,58,0.6)", background:"rgba(255,255,255,0.7)", border:"1px solid rgba(233,30,140,0.2)" }}>← 테스트 목록</button>
        <div style={{ background:"#fff", borderRadius:28, overflow:"hidden", boxShadow:"0 24px 80px rgba(233,30,140,0.2)", animation:"cardIn .6s ease both" }}>
          <div style={{ background:`linear-gradient(135deg,${r.color}22,${r.color}44)`, padding:"40px 28px", textAlign:"center", borderBottom:`3px solid ${r.color}` }}>
            <div style={{ fontSize:56, marginBottom:8 }}>{r.emoji}</div>
            <div style={{ fontSize:12, color:r.color, fontWeight:800, letterSpacing:2, marginBottom:8 }}>나의 연애 언어</div>
            <h2 style={{ fontFamily:"inherit", fontSize:22, color:"#2A1020", marginBottom:10, lineHeight:1.3 }}>{r.title}</h2>
            <div style={{ display:"flex", gap:6, justifyContent:"center", flexWrap:"wrap" }}>
              {r.keywords.map((k: string) => <span key={k} style={{ background:`${r.color}18`, color:r.color, borderRadius:99, padding:"4px 12px", fontSize:11, fontWeight:700 }}>{k}</span>)}
            </div>
          </div>
          <div style={{ padding:"24px 28px 32px" }}>
            <p style={{ color:"#5A1A3A", fontSize:15, lineHeight:1.8, marginBottom:20, fontFamily:"inherit" }}>{r.desc}</p>

            <div style={{ background:"#FFF0F7", borderRadius:16, padding:"16px 18px", marginBottom:20, border:`1px solid ${r.color}22` }}>
              <p style={{ color:r.color, fontSize:12, fontWeight:800, marginBottom:12, letterSpacing:0.5 }}>💕 나의 5가지 연애 언어 분포</p>
              {Object.entries(dimLabels).map(([dim, label]) => {
                const val = (scores[dim]||0) as number;
                const pct = Math.round(val/total*100);
                return (
                  <div key={dim} style={{ marginBottom:10 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4, fontSize:12 }}>
                      <span style={{ color:dim===winner?"#2A1020":"#888", fontWeight:dim===winner?700:400 }}>{label}</span>
                      <span style={{ color:dim===winner?r.color:"#aaa", fontWeight:700 }}>{pct}%</span>
                    </div>
                    <div style={{ height:8, background:"#F5E6F0", borderRadius:99 }}>
                      <div style={{ width:`${pct}%`, height:"100%", background:dim===winner?`linear-gradient(90deg,${r.color},${r.color}aa)`:"#ddd", borderRadius:99, transition:"width .8s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ background:`${r.color}10`, borderRadius:14, padding:"14px 16px", marginBottom:22, border:`1px solid ${r.color}25` }}>
              <p style={{ color:r.color, fontSize:12, fontWeight:800, marginBottom:6 }}>💌 연인에게 이렇게 말해줘요</p>
              <p style={{ color:"#5A1A3A", fontSize:13, lineHeight:1.6 }}>{r.tip}</p>
            </div>

            <div style={{ display:"flex", gap:10 }}>
              <button className="btn-ghost" style={{ flex:1 }} onClick={onRetry}>다시 하기</button>
              <button className="btn-primary" style={{ flex:1, background:`linear-gradient(135deg,${r.color},${r.color}cc)` }} onClick={onBack}>다른 테스트 보기</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════ PAST LIFE RESULT ══════════════════ */
function PastLifeResult({ meta, winner, scores, onBack, onRetry }: any) {
  const r = PASTLIFE_RESULTS[winner];
  const jobLabels: Record<string,string> = { F:"⚔️ 전사", S:"📜 학자", A:"🎨 예술가", M:"🏺 상인", H:"🌿 치유사", N:"👑 귀족" };
  const total = Object.values(scores).reduce((a:any,b:any)=>a+b, 0) as number || 1;
  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#0A0010,#2C1654,#1A0A2E)", padding:"24px 16px 60px" }}>
      <div style={{ maxWidth:560, margin:"0 auto" }}>
        <button className="back-btn" onClick={onBack} style={{ marginBottom:24, color:"rgba(201,162,39,0.7)", background:"rgba(201,162,39,0.1)", border:"1px solid rgba(201,162,39,0.2)" }}>← 테스트 목록</button>
        <div style={{ background:"rgba(255,255,255,0.04)", backdropFilter:"blur(20px)", borderRadius:28, overflow:"hidden", border:"1px solid rgba(201,162,39,0.25)", boxShadow:"0 24px 80px rgba(0,0,0,0.6)", animation:"cardIn .6s ease both" }}>
          <div style={{ padding:"44px 28px", textAlign:"center", background:`linear-gradient(135deg,${r.color}08,${r.color}18)`, borderBottom:`2px solid ${r.color}40` }}>
            <div style={{ fontSize:60, marginBottom:8 }}>{r.icon}</div>
            <div style={{ fontSize:11, color:"rgba(201,162,39,0.7)", fontWeight:800, letterSpacing:3, marginBottom:8 }}>전생 직업 판명 결과</div>
            <h2 style={{ fontFamily:"inherit", fontSize:"clamp(16px,4vw,22px)", color:r.color, marginBottom:6, lineHeight:1.3 }}>{r.title}</h2>
            <div style={{ display:"flex", gap:6, justifyContent:"center", flexWrap:"wrap", marginBottom:4 }}>
              {r.keywords.map((k: string) => <span key={k} style={{ background:`${r.color}18`, color:r.color, borderRadius:99, padding:"4px 10px", fontSize:11, fontWeight:700 }}>{k}</span>)}
            </div>
            <p style={{ color:"rgba(201,162,39,0.5)", fontSize:11, marginTop:10 }}>시대: {r.era}</p>
          </div>
          <div style={{ padding:"24px 28px 32px" }}>
            <p style={{ color:"rgba(240,223,160,0.85)", fontSize:14, lineHeight:1.8, marginBottom:20, fontFamily:"inherit" }}>{r.desc}</p>

            <div style={{ background:"rgba(201,162,39,0.05)", borderRadius:14, padding:"14px 16px", marginBottom:20, border:"1px solid rgba(201,162,39,0.15)" }}>
              <p style={{ color:"rgba(201,162,39,0.7)", fontSize:11, fontWeight:800, marginBottom:12, letterSpacing:1 }}>⚖️ 전생 성향 분포</p>
              {Object.entries(jobLabels).map(([dim, label]) => {
                const val = (scores[dim]||0) as number;
                const pct = Math.round(val/total*100);
                return (
                  <div key={dim} style={{ marginBottom:8 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3, fontSize:12 }}>
                      <span style={{ color:dim===winner?r.color:"rgba(201,162,39,0.4)", fontWeight:dim===winner?700:400 }}>{label}</span>
                      <span style={{ color:dim===winner?r.color:"rgba(201,162,39,0.3)", fontWeight:700 }}>{pct}%</span>
                    </div>
                    <div style={{ height:7, background:"rgba(201,162,39,0.08)", borderRadius:99 }}>
                      <div style={{ width:`${pct}%`, height:"100%", background:dim===winner?`linear-gradient(90deg,${r.color},#C9A227)`:"rgba(201,162,39,0.2)", borderRadius:99, transition:"width .8s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ background:"rgba(201,162,39,0.06)", borderRadius:14, padding:"14px 16px", marginBottom:22, border:"1px solid rgba(201,162,39,0.12)" }}>
              <p style={{ color:"#C9A227", fontSize:11, fontWeight:800, marginBottom:6, letterSpacing:0.5 }}>✨ 현생에 남은 재능</p>
              <p style={{ color:"rgba(240,223,160,0.8)", fontSize:13, lineHeight:1.6 }}>{r.talent}</p>
            </div>

            <div style={{ display:"flex", gap:10 }}>
              <button className="btn-ghost" style={{ flex:1 }} onClick={onRetry}>다시 하기</button>
              <button style={{ flex:1, background:`linear-gradient(135deg,#C9A227,#A67C00)`, color:"#1A0A2E", fontWeight:800, border:"none", borderRadius:14, padding:"14px", cursor:"pointer", fontSize:14 }} onClick={onBack}>다른 테스트 보기</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════ DOPAMINE RESULT ══════════════════ */
function DopamineResult({ meta, winner, scores, onBack, onRetry }: any) {
  const r = DOPAMINE_RESULTS[winner];
  const dimLabels: Record<string,string> = { V:"🏆 성취", C:"🫂 소통", R:"🎨 창작", K:"🛋️ 안락", T:"🎢 스릴" };
  const total = Object.values(scores).reduce((a:any,b:any)=>a+b, 0) as number || 1;
  return (
    <div style={{ minHeight:"100vh", background:r.bg, padding:"24px 16px 60px" }}>
      <div style={{ maxWidth:560, margin:"0 auto" }}>
        <button className="back-btn" onClick={onBack} style={{ marginBottom:24, color:"rgba(255,210,0,0.7)", background:"rgba(255,210,0,0.1)", border:"1px solid rgba(255,210,0,0.25)" }}>← 테스트 목록</button>
        <div style={{ background:"rgba(0,0,0,0.55)", backdropFilter:"blur(20px)", borderRadius:28, overflow:"hidden", border:`1px solid ${r.color}40`, boxShadow:`0 24px 80px ${r.color}30`, animation:"cardIn .6s ease both" }}>
          <div style={{ padding:"44px 28px", textAlign:"center", background:`linear-gradient(135deg,${r.color}10,${r.color}20)`, borderBottom:`2px solid ${r.color}` }}>
            <div style={{ fontSize:60, marginBottom:8 }}>{r.icon}</div>
            <div style={{ fontSize:11, color:`${r.color}aa`, fontWeight:800, letterSpacing:3, marginBottom:6 }}>나의 도파민 유형</div>
            <h2 style={{ fontFamily:"inherit", fontSize:22, color:r.color, marginBottom:8, textShadow:`0 0 20px ${r.color}60` }}>{r.title}</h2>
            <div style={{ fontSize:13, color:"rgba(255,255,255,0.6)", marginBottom:10 }}>{r.keyword}</div>
            <div style={{ display:"flex", gap:6, justifyContent:"center", flexWrap:"wrap" }}>
              {r.keywords.map((k: string) => <span key={k} style={{ background:`${r.color}20`, color:r.color, borderRadius:99, padding:"4px 10px", fontSize:11, fontWeight:700, border:`1px solid ${r.color}30` }}>{k}</span>)}
            </div>
          </div>
          <div style={{ padding:"24px 28px 32px" }}>
            <p style={{ color:"rgba(255,255,255,0.82)", fontSize:14, lineHeight:1.8, marginBottom:20, fontFamily:"inherit" }}>{r.desc}</p>

            <div style={{ background:`${r.color}08`, borderRadius:14, padding:"14px 16px", marginBottom:20, border:`1px solid ${r.color}20` }}>
              <p style={{ color:`${r.color}cc`, fontSize:11, fontWeight:800, marginBottom:12, letterSpacing:1 }}>⚡ 나의 도파민 분포</p>
              {Object.entries(dimLabels).map(([dim, label]) => {
                const val = (scores[dim]||0) as number;
                const pct = Math.round(val/total*100);
                return (
                  <div key={dim} style={{ marginBottom:8 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3, fontSize:12 }}>
                      <span style={{ color:dim===winner?r.color:"rgba(255,255,255,0.35)", fontWeight:dim===winner?700:400 }}>{label}</span>
                      <span style={{ color:dim===winner?r.color:"rgba(255,255,255,0.2)", fontWeight:700 }}>{pct}%</span>
                    </div>
                    <div style={{ height:7, background:"rgba(255,255,255,0.06)", borderRadius:99 }}>
                      <div style={{ width:`${pct}%`, height:"100%", background:dim===winner?`linear-gradient(90deg,${r.color},${r.color}88)`:"rgba(255,255,255,0.12)", borderRadius:99, transition:"width .8s ease" }} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ background:`${r.color}08`, borderRadius:14, padding:"14px 16px", marginBottom:22, border:`1px solid ${r.color}15` }}>
              <p style={{ color:r.color, fontSize:11, fontWeight:800, marginBottom:6, letterSpacing:0.5 }}>🔥 나의 도파민 연료</p>
              <p style={{ color:"rgba(255,255,255,0.75)", fontSize:13, lineHeight:1.6 }}>{r.fuel}</p>
            </div>

            <div style={{ display:"flex", gap:10 }}>
              <button className="btn-ghost" style={{ flex:1 }} onClick={onRetry}>다시 하기</button>
              <button style={{ flex:1, background:`linear-gradient(135deg,${r.color},${r.color}aa)`, color:"#111", fontWeight:800, border:"none", borderRadius:14, padding:"14px", cursor:"pointer", fontSize:14 }} onClick={onBack}>다른 테스트 보기</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════ NUNCHI QUIZ ══════════════════ */
function NunchiQuiz({ meta, onBack, onDone, onRetry }: any) {
  const [cur, setCur] = useState(0);
  const [total, setTotal] = useState(0);
  const maxScore = NUNCHI_QUESTIONS.length * 3;
  const pct = Math.round(cur / NUNCHI_QUESTIONS.length * 100);

  const pick = (val: number) => {
    const ns = total + val;
    const next = cur + 1;
    if (next >= NUNCHI_QUESTIONS.length) {
      const result = [...NUNCHI_RESULTS].reverse().find(r => ns >= r.min) || NUNCHI_RESULTS[0];
      onDone(<NunchiResult meta={meta} result={result} score={ns} maxScore={maxScore} onBack={onBack} onRetry={onRetry} />);
    } else {
      setTotal(ns);
      setCur(next);
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#001A18 0%,#003630 50%,#001A18 100%)", padding:"24px 16px 60px" }}>
      <div style={{ maxWidth:560, margin:"0 auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <button className="back-btn" onClick={onBack} style={{ color:"rgba(67,184,156,0.7)", background:"rgba(67,184,156,0.1)", border:"1px solid rgba(67,184,156,0.2)" }}>← 뒤로</button>
          <span style={{ color:"rgba(67,184,156,0.7)", fontSize:13, fontWeight:600 }}>{cur+1} / {NUNCHI_QUESTIONS.length}</span>
        </div>

        <div style={{ marginBottom:24 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
            <span style={{ color:"rgba(167,243,208,0.6)", fontSize:11, fontWeight:700, letterSpacing:1 }}>눈치력 측정 중</span>
            <span style={{ color:"#43B89C", fontSize:11, fontWeight:700 }}>{pct}%</span>
          </div>
          <div style={{ height:5, background:"rgba(67,184,156,0.15)", borderRadius:99 }}>
            <div style={{ width:`${pct}%`, height:"100%", background:"linear-gradient(90deg,#43B89C,#1BA1CF)", borderRadius:99, transition:"width .4s ease" }} />
          </div>
        </div>

        <div style={{ background:"rgba(67,184,156,0.06)", backdropFilter:"blur(20px)", borderRadius:24, padding:"28px 24px", marginBottom:18, border:"1px solid rgba(67,184,156,0.15)", animation:"fadeUp .35s ease both" }}>
          <p style={{ color:"rgba(167,243,208,0.85)", fontSize:16, fontWeight:600, lineHeight:1.7, textAlign:"center" }}>{NUNCHI_QUESTIONS[cur]}</p>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {NUNCHI_OPTS.map((opt, i) => (
            <button key={i} onClick={() => pick(i)}
              style={{ background:"rgba(67,184,156,0.07)", border:"1px solid rgba(67,184,156,0.18)", borderRadius:16, padding:"16px 20px", textAlign:"left", cursor:"pointer", display:"flex", alignItems:"center", gap:14, transition:"transform .15s", animation:`fadeUp .4s ease ${i*0.06}s both` }}>
              <span style={{ width:30, height:30, borderRadius:"50%", background:i===3?"linear-gradient(135deg,#43B89C,#1BA1CF)":i===2?"rgba(67,184,156,0.4)":"rgba(67,184,156,0.15)", color:"#A7F3D0", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:12, flexShrink:0 }}>{i===0?"①":i===1?"②":i===2?"③":"④"}</span>
              <span style={{ color:"rgba(167,243,208,0.85)", fontSize:14, fontWeight:500 }}>{opt}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function NunchiResult({ meta, result, score, maxScore, onBack, onRetry }: any) {
  const pct = Math.round(score / maxScore * 100);
  const gaugeColor = result.color;
  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#001A18,#003630,#001A18)", padding:"24px 16px 60px" }}>
      <div style={{ maxWidth:560, margin:"0 auto" }}>
        <button className="back-btn" onClick={onBack} style={{ marginBottom:24, color:"rgba(67,184,156,0.7)", background:"rgba(67,184,156,0.1)", border:"1px solid rgba(67,184,156,0.2)" }}>← 테스트 목록</button>
        <div style={{ background:"rgba(255,255,255,0.04)", backdropFilter:"blur(20px)", borderRadius:28, overflow:"hidden", border:"1px solid rgba(67,184,156,0.2)", boxShadow:"0 24px 80px rgba(0,0,0,0.5)", animation:"cardIn .6s ease both" }}>
          <div style={{ padding:"44px 28px 32px", textAlign:"center", background:`linear-gradient(135deg,${gaugeColor}08,${gaugeColor}18)`, borderBottom:`2px solid ${gaugeColor}40` }}>
            <div style={{ fontSize:60, marginBottom:8 }}>{result.icon}</div>
            <div style={{ fontSize:11, color:"rgba(167,243,208,0.5)", fontWeight:800, letterSpacing:3, marginBottom:8 }}>나의 눈치력</div>
            <div style={{ marginBottom:16 }}>
              <div style={{ fontFamily:"inherit", fontSize:48, color:gaugeColor, lineHeight:1, marginBottom:4 }}>{pct}<span style={{ fontSize:22 }}>점</span></div>
              <div style={{ fontSize:13, color:"rgba(167,243,208,0.55)" }}>/ 100점</div>
            </div>
            <h2 style={{ fontFamily:"inherit", fontSize:20, color:"#A7F3D0", marginBottom:6 }}>{result.title}</h2>
            <p style={{ color:"rgba(167,243,208,0.6)", fontSize:13 }}>{result.subtitle}</p>

            <div style={{ margin:"20px auto 0", maxWidth:300 }}>
              <div style={{ height:12, background:"rgba(255,255,255,0.08)", borderRadius:99 }}>
                <div style={{ width:`${pct}%`, height:"100%", background:`linear-gradient(90deg,#43B89C,${gaugeColor})`, borderRadius:99, transition:"width 1s ease", boxShadow:`0 0 12px ${gaugeColor}60` }} />
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:6, fontSize:10, color:"rgba(167,243,208,0.35)" }}>
                <span>눈치 없음</span><span>보통</span><span>눈치왕</span>
              </div>
            </div>
          </div>
          <div style={{ padding:"24px 28px 32px" }}>
            <p style={{ color:"rgba(167,243,208,0.78)", fontSize:14, lineHeight:1.8, marginBottom:24, fontFamily:"inherit" }}>{result.desc}</p>
            <div style={{ display:"flex", gap:10 }}>
              <button className="btn-ghost" style={{ flex:1 }} onClick={onRetry}>다시 하기</button>
              <button style={{ flex:1, background:"linear-gradient(135deg,#43B89C,#1BA1CF)", color:"#001A18", fontWeight:800, border:"none", borderRadius:14, padding:"14px", cursor:"pointer", fontSize:14 }} onClick={onBack}>다른 테스트 보기</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoreResult({ meta, result, score, maxScore, onBack, onRetry }: any) {
  const pct = Math.round(score / maxScore * 100);
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-main)", padding: "24px 16px 60px" }}>
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <button className="back-btn" onClick={onBack} style={{ marginBottom: 24 }}>← 테스트 목록</button>
        <div className="glass-card" style={{ overflow: "hidden", animation: "cardIn .6s ease both" }}>
          <div style={{ padding: "40px 32px", textAlign: "center", background: `linear-gradient(135deg,${result.color}25,${result.color}08)`, borderBottom: `1px solid ${result.color}33` }}>
            <p style={{ color: result.color, fontSize: 14, marginBottom: 8 }}>{result.badge}</p>
            <div style={{ fontSize: 52, fontWeight: 900, color: result.color, marginBottom: 8, fontFamily: "inherit" }}>{pct}<span style={{ fontSize: 22 }}>%</span></div>
            <h2 style={{ fontFamily: "inherit", fontSize: 22, color: "#fff" }}>{result.name}</h2>
          </div>
          <div style={{ padding: "28px 32px" }}>
            {result.traits && (
              <div style={{ marginBottom: 20 }}>
                {result.traits.map((t: any) => (
                  <div key={t.name} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <span style={{ color: t.color, fontSize: 13 }}>{t.name}</span>
                      <span style={{ color: "var(--text-muted)", fontSize: 13 }}>{t.val}%</span>
                    </div>
                    <div className="trait-track">
                      <div className="trait-fill" style={{ width: `${t.val}%`, background: t.color }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>{result.desc}</p>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={onRetry}>다시 하기</button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={onBack}>다른 테스트 보기</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ MENTALFIT QUIZ ═══════════════════════════════════════ */
function MentalFitQuiz({ meta, onBack, onDone, onRetry }: any) {
  const [cur, setCur] = useState(0);
  const [total, setTotal] = useState(0);
  const pct = Math.round(cur / MENTALFIT_QUESTIONS.length * 100);
  const bg = "linear-gradient(135deg,#0D1B2A,#1B2D4F,#0D1B2A)";

  const pick = (v: number) => {
    const newTotal = total + v;
    const next = cur + 1;
    if (next >= MENTALFIT_QUESTIONS.length) {
      const r = MENTALFIT_RESULTS.find(r2 => newTotal >= r2.min && newTotal <= r2.max) || MENTALFIT_RESULTS[1];
      onDone(<MentalFitResult meta={meta} result={r} score={newTotal} onBack={onBack} onRetry={onRetry} />);
    } else { setTotal(newTotal); setCur(next); }
  };

  return (
    <div style={{ minHeight:"100vh", background:bg, padding:"24px 16px 60px" }}>
      <QuizHeader meta={meta} cur={cur} total={MENTALFIT_QUESTIONS.length} pct={pct} onBack={onBack} accent="#00D4FF" />
      <div key={cur} style={{ maxWidth:600, margin:"0 auto" }} className="quiz-enter">
        <QuizCard qnum={cur+1} question={MENTALFIT_QUESTIONS[cur]}
          cardStyle={{ background:"rgba(0,212,255,0.05)", border:"1px solid rgba(0,212,255,0.15)", borderRadius:24 }}
          qTextStyle={{ color:"#BAE6FD", fontSize:16, lineHeight:1.85 }}>
          {MENTALFIT_OPTS.map((o, i) => (
            <button key={i} className="opt-btn" onClick={() => pick(i)}
              style={{ background:"rgba(0,212,255,0.05)", border:"1px solid rgba(0,212,255,0.15)", color:"rgba(186,230,253,0.8)" }}>
              <span className="opt-lbl" style={{ color:"#00D4FF", borderColor:"rgba(0,212,255,0.3)" }}>{i}</span>
              <span>{o}</span>
            </button>
          ))}
        </QuizCard>
      </div>
    </div>
  );
}

function MentalFitResult({ meta, result, score, onBack, onRetry }: any) {
  const pct = Math.round(score / 45 * 100);
  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#0D1B2A,#1B2D4F)", padding:"24px 16px 60px" }}>
      <div style={{ maxWidth:560, margin:"0 auto" }}>
        <button className="back-btn" onClick={onBack} style={{ marginBottom:24, color:"#BAE6FD", background:"rgba(0,212,255,0.08)", border:"1px solid rgba(0,212,255,0.2)" }}>← 테스트 목록</button>
        <div style={{ borderRadius:28, overflow:"hidden", animation:"cardIn .6s ease both", border:"1px solid rgba(0,212,255,0.2)" }}>
          <div style={{ padding:"44px 32px 36px", textAlign:"center", background:`linear-gradient(135deg,${result.color}20,rgba(0,212,255,0.05))` }}>
            <div style={{ fontSize:56, marginBottom:12 }}>🔩</div>
            <p style={{ color:result.color, fontSize:13, marginBottom:10, letterSpacing:2, fontFamily:"inherit" }}>{result.badge}</p>
            <div style={{ display:"flex", justifyContent:"center", alignItems:"flex-end", gap:4, marginBottom:8 }}>
              <span style={{ fontSize:64, fontWeight:900, color:result.color, fontFamily:"inherit", lineHeight:1 }}>{pct}</span>
              <span style={{ fontSize:22, color:result.color, marginBottom:8 }}>점</span>
            </div>
            <h2 style={{ fontFamily:"inherit", fontSize:24, color:"#BAE6FD", marginBottom:4 }}>{result.name}</h2>
          </div>
          <div style={{ padding:"28px 32px", background:"rgba(0,0,0,0.3)" }}>
            {result.traits && (
              <div style={{ marginBottom:24 }}>
                {result.traits.map((t: any) => (
                  <div key={t.name} style={{ marginBottom:14 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                      <span style={{ color:t.color, fontSize:13 }}>{t.name}</span>
                      <span style={{ color:"rgba(186,230,253,0.5)", fontSize:13 }}>{t.val}%</span>
                    </div>
                    <div className="trait-track">
                      <div className="trait-fill" style={{ width:`${t.val}%`, background:`linear-gradient(90deg,${t.color},${t.color}88)`, boxShadow:`0 0 8px ${t.color}60` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p style={{ color:"rgba(186,230,253,0.78)", fontSize:14, lineHeight:1.8, marginBottom:28 }}>{result.desc}</p>
            <div style={{ display:"flex", gap:10 }}>
              <button className="btn-ghost" style={{ flex:1 }} onClick={onRetry}>다시 하기</button>
              <button style={{ flex:1, background:"linear-gradient(135deg,#00D4FF,#0099CC)", color:"#001A2A", fontWeight:800, border:"none", borderRadius:14, padding:"14px", cursor:"pointer", fontSize:14 }} onClick={onBack}>다른 테스트 보기</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ VILLAIN QUIZ ═══════════════════════════════════════ */
function VillainQuiz({ meta, onBack, onDone, onRetry }: any) {
  const [cur, setCur] = useState(0);
  const [scores, setScores] = useState<Record<string,number>>({ C:0, K:0, R:0, V:0, H:0 });
  const pct = Math.round(cur / VILLAIN_QUESTIONS.length * 100);
  const bg = "linear-gradient(135deg,#0D0000,#2D0000,#0D0000)";

  const pick = (dim: string) => {
    const ns = { ...scores, [dim]: scores[dim] + 1 };
    const next = cur + 1;
    if (next >= VILLAIN_QUESTIONS.length) {
      const winner = Object.entries(ns).sort((a,b) => b[1]-a[1])[0][0];
      const r = VILLAIN_RESULTS[winner];
      onDone(<VillainResult meta={meta} result={r} winKey={winner} scores={ns} onBack={onBack} onRetry={onRetry} />);
    } else { setScores(ns); setCur(next); }
  };

  const q = VILLAIN_QUESTIONS[cur];
  return (
    <div style={{ minHeight:"100vh", background:bg, padding:"24px 16px 60px" }}>
      <QuizHeader meta={meta} cur={cur} total={VILLAIN_QUESTIONS.length} pct={pct} onBack={onBack} accent="#DC2626" />
      <div key={cur} style={{ maxWidth:600, margin:"0 auto" }} className="quiz-enter">
        <QuizCard qnum={cur+1} question={q.q}
          cardStyle={{ background:"rgba(220,38,38,0.06)", border:"1px solid rgba(220,38,38,0.18)", borderRadius:24 }}
          qTextStyle={{ color:"#FECACA", fontSize:17, lineHeight:1.85 }}>
          {q.a.map((opt, i) => (
            <button key={i} className="opt-btn" onClick={() => pick(q.d[i])}
              style={{ background:"rgba(220,38,38,0.06)", border:"1px solid rgba(220,38,38,0.2)", color:"rgba(254,202,202,0.8)", borderRadius:16 }}>
              <span className="opt-lbl" style={{ color:"#DC2626", borderColor:"rgba(220,38,38,0.35)" }}>{i === 0 ? "A" : "B"}</span>
              <span>{opt}</span>
            </button>
          ))}
        </QuizCard>
      </div>
    </div>
  );
}

function VillainResult({ meta, result, winKey, scores, onBack, onRetry }: any) {
  const labels: Record<string,string> = { C:"전략가", K:"지배자", R:"반항아", V:"복수자", H:"혼돈" };
  const total = Object.values(scores as Record<string,number>).reduce((a,b)=>a+b,0) as number;
  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#0D0000,#2D0000)", padding:"24px 16px 60px" }}>
      <div style={{ maxWidth:560, margin:"0 auto" }}>
        <button className="back-btn" onClick={onBack} style={{ marginBottom:24, color:"#FECACA", background:"rgba(220,38,38,0.08)", border:"1px solid rgba(220,38,38,0.2)" }}>← 테스트 목록</button>
        <div style={{ borderRadius:28, overflow:"hidden", animation:"cardIn .6s ease both", border:"1px solid rgba(220,38,38,0.25)" }}>
          <div style={{ padding:"44px 32px 32px", textAlign:"center", background:`linear-gradient(135deg,${result.color}18,rgba(220,38,38,0.08))` }}>
            <div style={{ fontSize:64, marginBottom:12 }}>{result.icon}</div>
            <p style={{ color:result.color, fontSize:12, marginBottom:10, letterSpacing:3, fontFamily:"inherit" }}>내 안의 빌런</p>
            <h2 style={{ fontFamily:"inherit", fontSize:26, color:"#FECACA", marginBottom:4 }}>{result.title}</h2>
          </div>
          <div style={{ padding:"28px 32px", background:"rgba(0,0,0,0.4)" }}>
            <p style={{ color:"rgba(254,202,202,0.8)", fontSize:14, lineHeight:1.85, marginBottom:20 }}>{result.desc}</p>
            <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:20 }}>
              <div style={{ background:"rgba(220,38,38,0.08)", border:"1px solid rgba(220,38,38,0.18)", borderRadius:14, padding:"12px 16px" }}>
                <div style={{ color:"rgba(254,202,202,0.55)", fontSize:11, marginBottom:4, letterSpacing:2 }}>빌런 파워</div>
                <div style={{ color:"#FECACA", fontSize:13 }}>⚡ {result.power}</div>
              </div>
              <div style={{ background:"rgba(220,38,38,0.05)", border:"1px solid rgba(220,38,38,0.12)", borderRadius:14, padding:"12px 16px" }}>
                <div style={{ color:"rgba(254,202,202,0.55)", fontSize:11, marginBottom:4, letterSpacing:2 }}>아킬레스건</div>
                <div style={{ color:"rgba(254,202,202,0.7)", fontSize:13 }}>🩸 {result.weakness}</div>
              </div>
            </div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:24 }}>
              {Object.entries(scores as Record<string,number>).map(([k,v]) => (
                <span key={k} style={{ background:k===winKey?"rgba(220,38,38,0.25)":"rgba(255,255,255,0.05)", border:k===winKey?"1px solid rgba(220,38,38,0.5)":"1px solid rgba(255,255,255,0.1)", borderRadius:99, padding:"5px 12px", fontSize:12, color:k===winKey?"#FCA5A5":"rgba(255,255,255,0.4)" }}>
                  {labels[k]} {Math.round((v as number)/total*100)}%
                </span>
              ))}
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button className="btn-ghost" style={{ flex:1 }} onClick={onRetry}>다시 하기</button>
              <button style={{ flex:1, background:"linear-gradient(135deg,#DC2626,#991B1B)", color:"#fff", fontWeight:800, border:"none", borderRadius:14, padding:"14px", cursor:"pointer", fontSize:14 }} onClick={onBack}>다른 테스트 보기</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════ IDEALSIGNAL QUIZ ═══════════════════════════════════════ */
function IdealSignalQuiz({ meta, onBack, onDone, onRetry }: any) {
  const [cur, setCur] = useState(0);
  const [scores, setScores] = useState<Record<string,number>>({ L:0, P:0, F:0, I:0, W:0 });
  const pct = Math.round(cur / IDEALSIGNAL_QUESTIONS.length * 100);
  const bg = "linear-gradient(135deg,#2D1040,#1A0A2E,#3D1560)";

  const pick = (dim: string) => {
    const ns = { ...scores, [dim]: scores[dim] + 1 };
    const next = cur + 1;
    if (next >= IDEALSIGNAL_QUESTIONS.length) {
      const winner = Object.entries(ns).sort((a,b) => b[1]-a[1])[0][0];
      const r = IDEALSIGNAL_RESULTS[winner];
      onDone(<IdealSignalResult meta={meta} result={r} winKey={winner} scores={ns} onBack={onBack} onRetry={onRetry} />);
    } else { setScores(ns); setCur(next); }
  };

  const q = IDEALSIGNAL_QUESTIONS[cur];
  return (
    <div style={{ minHeight:"100vh", background:bg, padding:"24px 16px 60px" }}>
      <QuizHeader meta={meta} cur={cur} total={IDEALSIGNAL_QUESTIONS.length} pct={pct} onBack={onBack} accent="#A78BFA" />
      <div key={cur} style={{ maxWidth:600, margin:"0 auto" }} className="quiz-enter">
        <QuizCard qnum={cur+1} question={q.q}
          cardStyle={{ background:"rgba(167,139,250,0.06)", border:"1px solid rgba(167,139,250,0.2)", borderRadius:24 }}
          qTextStyle={{ color:"#EDE9FE", fontSize:17, lineHeight:1.85 }}>
          {q.a.map((opt, i) => (
            <button key={i} className="opt-btn" onClick={() => pick(q.d[i])}
              style={{ background:"rgba(167,139,250,0.06)", border:"1px solid rgba(167,139,250,0.2)", color:"rgba(237,233,254,0.82)" }}>
              <span className="opt-lbl" style={{ color:"#A78BFA", borderColor:"rgba(167,139,250,0.35)" }}>{i === 0 ? "A" : "B"}</span>
              <span>{opt}</span>
            </button>
          ))}
        </QuizCard>
      </div>
    </div>
  );
}

function IdealSignalResult({ meta, result, winKey, scores, onBack, onRetry }: any) {
  const labels: Record<string,string> = { L:"로맨틱", P:"현실파트너", F:"자유영혼", I:"지적자극", W:"따뜻한울타리" };
  const total = Object.values(scores as Record<string,number>).reduce((a,b)=>a+b,0) as number;
  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#2D1040,#1A0A2E,#3D1560)", padding:"24px 16px 60px" }}>
      <div style={{ maxWidth:560, margin:"0 auto" }}>
        <button className="back-btn" onClick={onBack} style={{ marginBottom:24, color:"#EDE9FE", background:"rgba(167,139,250,0.08)", border:"1px solid rgba(167,139,250,0.2)" }}>← 테스트 목록</button>
        <div style={{ borderRadius:28, overflow:"hidden", animation:"cardIn .6s ease both", border:"1px solid rgba(167,139,250,0.25)" }}>
          <div style={{ padding:"44px 32px 32px", textAlign:"center", background:`linear-gradient(135deg,${result.color}20,rgba(167,139,250,0.06))` }}>
            <div style={{ fontSize:64, marginBottom:12 }}>{result.icon}</div>
            <p style={{ color:result.color, fontSize:12, marginBottom:8, letterSpacing:3, fontFamily:"inherit" }}>나의 이상형 시그널</p>
            <h2 style={{ fontFamily:"inherit", fontSize:24, color:"#EDE9FE", marginBottom:4 }}>{result.title}</h2>
            <p style={{ color:"rgba(237,233,254,0.6)", fontSize:13 }}>{result.subtitle}</p>
          </div>
          <div style={{ padding:"28px 32px", background:"rgba(0,0,0,0.3)" }}>
            <p style={{ color:"rgba(237,233,254,0.82)", fontSize:14, lineHeight:1.85, marginBottom:20 }}>{result.desc}</p>
            <div style={{ background:"rgba(167,139,250,0.08)", border:"1px solid rgba(167,139,250,0.18)", borderRadius:16, padding:"16px 18px", marginBottom:20 }}>
              <div style={{ color:"rgba(237,233,254,0.5)", fontSize:11, marginBottom:6, letterSpacing:2 }}>내게 맞는 파트너</div>
              <div style={{ color:"#C4B5FD", fontSize:14 }}>💫 {result.partner}</div>
            </div>
            <div style={{ background:"rgba(167,139,250,0.05)", border:"1px solid rgba(167,139,250,0.12)", borderRadius:16, padding:"16px 18px", marginBottom:20 }}>
              <div style={{ color:"rgba(237,233,254,0.5)", fontSize:11, marginBottom:6, letterSpacing:2 }}>연애 팁</div>
              <div style={{ color:"rgba(237,233,254,0.72)", fontSize:13 }}>✨ {result.tip}</div>
            </div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:24 }}>
              {Object.entries(scores as Record<string,number>).map(([k,v]) => (
                <span key={k} style={{ background:k===winKey?`${result.color}30`:"rgba(255,255,255,0.04)", border:k===winKey?`1px solid ${result.color}60`:"1px solid rgba(255,255,255,0.08)", borderRadius:99, padding:"5px 12px", fontSize:12, color:k===winKey?"#DDD6FE":"rgba(255,255,255,0.35)" }}>
                  {labels[k]} {Math.round((v as number)/total*100)}%
                </span>
              ))}
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button className="btn-ghost" style={{ flex:1 }} onClick={onRetry}>다시 하기</button>
              <button style={{ flex:1, background:"linear-gradient(135deg,#A78BFA,#7C3AED)", color:"#fff", fontWeight:800, border:"none", borderRadius:14, padding:"14px", cursor:"pointer", fontSize:14 }} onClick={onBack}>다른 테스트 보기</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
