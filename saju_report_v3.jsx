import { useState, useRef, useCallback } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Area, AreaChart, defs, linearGradient
} from "recharts";

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const SECTIONS = [
  { id: "A", title: "사주 원국 및 기본 분석",        subtitle: "내 인생의 거대한 지도",         icon: "☰", color: "#D4AF37" },
  { id: "B", title: "성격 및 기질 분석",              subtitle: "타고난 나의 본질",               icon: "◈", color: "#7EB8C9" },
  { id: "C", title: "부모 및 조상운",                 subtitle: "뿌리와 가문의 기운",             icon: "☲", color: "#C9856F" },
  { id: "D", title: "진로·직장·사업운",               subtitle: "부와 성공의 방정식",             icon: "◇", color: "#8FC98F" },
  { id: "E", title: "연애 및 결혼운 · 궁합",          subtitle: "인연의 붉은 실",                 icon: "◉", color: "#C97EB8" },
  { id: "F", title: "재물운 및 투자",                 subtitle: "부의 흐름과 재물의 지혜",        icon: "☵", color: "#C9B87E" },
  { id: "G", title: "대운 및 인생 그래프",            subtitle: "거대한 시간의 흐름",             icon: "☶", color: "#9B8FD4" },
  { id: "H", title: "연도별 운세 · 건강 · 인생 조언", subtitle: "미래의 등불과 삶의 지혜",        icon: "☷", color: "#7EC9A8" },
];

const SYSTEM_ROLE = `당신은 '천기누설 사주 명리 연구소'의 수석 명리학자 '청학(淸鶴)'입니다. 한 사람의 인생 전체를 관통하는 거대한 서사를 한 권의 책으로 엮어내는 마스터 카운슬러로서, 깊이 있는 철학적 고찰과 풍부한 어휘, 따뜻한 조언으로 풀이합니다. 명리학적 용어를 정확히 사용하되 대중이 이해하기 쉽게 풀어 설명하십시오. 요약은 절대 금지. 반드시 순수 JSON만 출력하십시오 (백틱·마크다운 불가):
{"content":"내용(최소 1500자 이상)","image_prompt":"영문 이미지 프롬프트","daewoon_scores":[{"age":"3-12","label":"간지","score":45},...]"} 
daewoon_scores는 [G] 섹션에서만 포함하며, 다른 섹션은 생략합니다.`;

const SECTION_PROMPTS = {
  A:`[A] 사주 원국 및 기본 분석 — A4 2~3장 분량으로 작성:
1. 인생의 거대한 서막: 전반적 기운과 삶의 핵심 주제를 철학적으로 서술
2. 타고난 그릇(일간): 일간의 고유한 기질과 삶에 미치는 영향
3. 환경과 조화(월지): 월지·격국 상세 분석과 삶의 패턴
4. 오행의 하모니: 과다·결핍 분석과 성격·건강·사회생활에 미치는 영향`,

  B:`[B] 성격 및 기질 분석 — A4 2~3장 분량으로 작성:
1. 빛과 그림자: 타고난 강점과 약점, 내면의 이중성
2. 사회적 페르소나: 타인에게 보이는 모습 vs 실제 내면
3. 감정의 패턴: 희로애락 처리 방식, 스트레스 반응
4. 성장의 키워드: 이 기질이 삶에서 꽃피우는 방법`,

  C:`[C] 부모 및 조상운 — A4 2~3장 분량으로 작성:
1. 조상의 음덕(년주 분석): 조상 음덕·가문 환경·조부모 인연
2. 부모의 영향(월주 분석): 부모 보살핌·가정 분위기·성격 형성
3. 가족 관계의 역동성: 오행으로 보는 갈등·유대감·균형 조언`,

  D:`[D] 진로·적성·직장·사업운 — A4 2~3장 분량으로 작성:
1. 적합한 직업 분야: 격국·오행·신살로 본 천직
2. 타고난 재능의 성격: 직장에서 발휘되는 독특한 재능
3. 직장 생활의 패턴: 대인관계·상사 관계·승진 운세
4. 사업가의 기질과 성공 전략: 기질·성공 가능성·시기·주의점`,

  E:`[E] 연애 및 결혼운·궁합 — A4 2~3장 분량으로 작성:
1. 연애 스타일: 일간·신살(도화살·홍염살)로 본 연애 패턴과 선호 연인상
2. 배우자상(일지 분석): 배우자의 기질·외모·직업성향·영향력
3. 결혼 시기와 결혼운: 관성·재성·대운으로 본 결혼 적기와 운세
4. 나와 잘 맞는 사람(궁합): 조화를 이루는 오행 특징 구체적 제시`,

  F:`[F] 재물운 및 투자 — A4 2~3장 분량으로 작성:
1. 돈을 버는 방식: 재성·식상·대운으로 본 최적 재물 획득 방식
2. 돈 관리 성향: 소비 습관·저축 성향·재물 관리 패턴
3. 투자 운세와 성공 요건: 투자 감각·좋은 시기·주의점
4. 평생의 재물 흐름: 대운별 재물운 변화와 큰 부를 위한 준비`,

  G:`[G] 대운 및 인생 그래프 — A4 3~4장 분량으로 작성:
1. 대운의 개념: 대운이 인생에 미치는 거대한 영향력과 시간의 철학
2. 평생의 운세 흐름(과거-현재-미래): 각 대운별 특징과 주요 에피소드
3. 현재 대운의 특징: 핵심 주제·기회·주의점 상세 조언
4. 다음 대운의 예고: 준비 방법 철학적 조언
반드시 daewoon_scores 배열을 포함하십시오 (생년 기준 10년 단위, 8~9개 항목, score는 운세 강도 0~100).`,

  H:`[H] 연도별 운세·건강·인생 조언 — A4 2~3장 분량으로 작성:
1. 향후 5년 연간 운세: 각 연도별 핵심 테마·재물·연애·건강·주의점 상세 서술
2. 건강 및 체질 분석: 오행 과다·결핍으로 본 체질적 약점·주의 질환·정신 건강
3. 총평 및 인생 조언: 리포트 전체를 아우르는 철학적 고찰과 따뜻하고 강력한 마지막 메시지`,
};

// ─────────────────────────────────────────────
// DAEWOON CHART
// ─────────────────────────────────────────────
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div style={{ background: "rgba(10,8,18,0.95)", border: "1px solid rgba(155,143,212,0.4)", borderRadius: "8px", padding: "10px 14px" }}>
        <p style={{ margin: "0 0 3px", fontSize: "12px", color: "#9B8FD4", letterSpacing: "0.08em" }}>{d.age}세</p>
        <p style={{ margin: "0 0 3px", fontSize: "13px", color: "#F5E06E", fontWeight: 600 }}>{d.label}</p>
        <p style={{ margin: 0, fontSize: "12px", color: "rgba(232,223,200,0.7)" }}>운세 강도: {d.score}/100</p>
      </div>
    );
  }
  return null;
};

function DaewoonChart({ data, birthYear }) {
  if (!data || data.length === 0) return null;
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;

  return (
    <div style={{ marginTop: "36px", padding: "24px 20px 16px", background: "rgba(155,143,212,0.06)", border: "1px solid rgba(155,143,212,0.2)", borderRadius: "14px" }}>
      <p style={{ margin: "0 0 4px", fontSize: "11px", color: "rgba(155,143,212,0.7)", letterSpacing: "0.15em" }}>✦ 인생 운세 그래프 (대운 흐름)</p>
      <p style={{ margin: "0 0 20px", fontSize: "12px", color: "rgba(232,223,200,0.4)" }}>각 대운 구간의 운세 강도를 시각화한 그래프입니다</p>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#9B8FD4" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#9B8FD4" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="age" tick={{ fill: "rgba(232,223,200,0.45)", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "rgba(255,255,255,0.08)" }} />
          <YAxis domain={[0, 100]} tick={{ fill: "rgba(232,223,200,0.35)", fontSize: 10 }} tickLine={false} axisLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine x={`${age}세 현재`} stroke="rgba(212,175,55,0.6)" strokeDasharray="4 4" label={{ value: "현재", fill: "#D4AF37", fontSize: 11 }} />
          <Area type="monotoneX" dataKey="score" stroke="#9B8FD4" strokeWidth={2.5} fill="url(#scoreGrad)" dot={{ r: 4, fill: "#9B8FD4", strokeWidth: 0 }} activeDot={{ r: 6, fill: "#F5E06E", strokeWidth: 0 }} />
        </AreaChart>
      </ResponsiveContainer>
      <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginTop: "12px", flexWrap: "wrap" }}>
        {data.map((d, i) => (
          <div key={i} style={{ background: "rgba(155,143,212,0.1)", border: "1px solid rgba(155,143,212,0.2)", borderRadius: "5px", padding: "3px 8px", fontSize: "10px", color: d.score >= 70 ? "#D4AF37" : d.score <= 35 ? "rgba(232,223,200,0.4)" : "rgba(232,223,200,0.65)" }}>
            {d.age} <span style={{ color: "#9B8FD4" }}>{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────
export default function SajuApp() {
  const [step, setStep] = useState("form"); // form | report
  const [form, setForm] = useState({ name: "", birthDate: "", birthTime: "", gender: "남", calendar: "양력" });
  const [activeSection, setActiveSection] = useState("A");
  const [sectionData, setSectionData] = useState({});
  const [loadingIds, setLoadingIds] = useState({});
  const [pipeline, setPipeline] = useState(null); // null | 'running' | 'done'
  const [pipelineIdx, setPipelineIdx] = useState(0);
  const [error, setError] = useState("");
  const [copyMsg, setCopyMsg] = useState("");
  const abortRef = useRef(false);

  const birthYear = form.birthDate ? parseInt(form.birthDate.split("-")[0]) : new Date().getFullYear() - 30;

  // ── API call (with continuation if content feels short) ──
  const callAPI = useCallback(async (sectionId, extraInstruction = "") => {
    const userMsg = `고객 정보:\n이름: ${form.name || "익명"}\n생년월일: ${form.birthDate} (${form.calendar})\n태어난 시각: ${form.birthTime || "미상"}\n성별: ${form.gender}

${SECTION_PROMPTS[sectionId]}${extraInstruction ? "\n\n" + extraInstruction : ""}

위 정보를 바탕으로 사주를 추론하여 리포트를 작성해 주십시오. 반드시 순수 JSON만 출력하십시오.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: SYSTEM_ROLE,
        messages: [{ role: "user", content: userMsg }],
      }),
    });
    const data = await res.json();
    const raw = data.content?.find(b => b.type === "text")?.text || "{}";
    try {
      return JSON.parse(raw.replace(/```json|```/g, "").trim());
    } catch {
      // Try to extract JSON from mixed output
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        try { return JSON.parse(match[0]); } catch {}
      }
      return { content: raw, image_prompt: "" };
    }
  }, [form]);

  // ── Single section generate ──
  const generateSection = useCallback(async (id) => {
    if (sectionData[id]) { setActiveSection(id); return; }
    setActiveSection(id);
    setLoadingIds(p => ({ ...p, [id]: true }));
    setError("");
    try {
      const parsed = await callAPI(id);
      setSectionData(p => ({ ...p, [id]: parsed }));
    } catch (e) {
      setError("API 오류: " + e.message);
    } finally {
      setLoadingIds(p => ({ ...p, [id]: false }));
    }
  }, [sectionData, callAPI]);

  // ── Full pipeline: generate all 8 sections sequentially ──
  const runPipeline = useCallback(async () => {
    if (!form.birthDate) { setError("생년월일을 입력해 주세요."); return; }
    setError("");
    setSectionData({});
    setStep("report");
    setPipeline("running");
    setPipelineIdx(0);
    abortRef.current = false;

    for (let i = 0; i < SECTIONS.length; i++) {
      if (abortRef.current) break;
      const sec = SECTIONS[i];
      setPipelineIdx(i);
      setActiveSection(sec.id);
      setLoadingIds(p => ({ ...p, [sec.id]: true }));
      try {
        const parsed = await callAPI(sec.id);
        setSectionData(p => ({ ...p, [sec.id]: parsed }));
      } catch {}
      finally { setLoadingIds(p => ({ ...p, [sec.id]: false })); }
    }
    setPipeline("done");
  }, [form, callAPI]);

  // ── Single submit → just A ──
  const handleSubmit = async () => {
    if (!form.birthDate) { setError("생년월일을 입력해 주세요."); return; }
    setError(""); setSectionData({}); setStep("report"); setPipeline(null);
    await generateSection("A");
  };

  // ── Copy image prompt ──
  const copyPrompt = (txt) => {
    navigator.clipboard?.writeText(txt).then(() => {
      setCopyMsg("복사됨!");
      setTimeout(() => setCopyMsg(""), 1800);
    });
  };

  const cur = SECTIONS.find(s => s.id === activeSection);
  const curData = sectionData[activeSection];
  const isLoading = !!loadingIds[activeSection];
  const doneCount = Object.keys(sectionData).length;
  const accentColor = cur?.color || "#D4AF37";

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(155deg,#070510 0%,#0f0b1a 55%,#09101a 100%)", fontFamily: "'Noto Serif KR','Georgia',serif", color: "#e8dfc8" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@300;400;600;700&family=Cinzel:wght@400;600;700&display=swap');
        @keyframes shimmer{0%{background-position:-300% center}100%{background-position:300% center}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:.5;transform:scale(.85)}50%{opacity:1;transform:scale(1.15)}}
        @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
        @keyframes glow{0%,100%{box-shadow:0 0 16px rgba(212,175,55,.12)}50%{box-shadow:0 0 36px rgba(212,175,55,.4)}}
        @keyframes pipelinePulse{0%,100%{opacity:.4}50%{opacity:1}}
        .fade-in{animation:fadeUp .55s ease forwards}
        .btn-gold{background:linear-gradient(135deg,#D4AF37,#b8921e);border:none;border-radius:10px;color:#07050f;font-family:inherit;font-weight:700;cursor:pointer;letter-spacing:.1em;transition:all .25s;animation:glow 3s ease-in-out infinite}
        .btn-gold:hover{filter:brightness(1.12);transform:translateY(-2px);box-shadow:0 10px 28px rgba(212,175,55,.35)!important}
        .btn-purple{background:linear-gradient(135deg,#5B3F90,#8B6FC4);border:none;border-radius:10px;color:#fff;font-family:inherit;font-weight:700;cursor:pointer;letter-spacing:.08em;transition:all .25s}
        .btn-purple:hover{filter:brightness(1.1);transform:translateY(-2px)}
        .sec-btn{transition:all .22s;border:none;cursor:pointer;font-family:inherit;text-align:left}
        .sec-btn:hover{transform:translateX(4px)}
        input,select{background:rgba(255,255,255,.04)!important;border:1px solid rgba(212,175,55,.2)!important;color:#e8dfc8!important;border-radius:8px;padding:12px 16px;width:100%;box-sizing:border-box;font-family:inherit;font-size:14px;outline:none;transition:border-color .3s,box-shadow .3s}
        input:focus,select:focus{border-color:rgba(212,175,55,.65)!important;box-shadow:0 0 0 3px rgba(212,175,55,.08)}
        input::placeholder{color:rgba(232,223,200,.22)}
        select option{background:#0f0b1a}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(212,175,55,.22);border-radius:2px}
      `}</style>

      {/* ambient blobs */}
      <div style={{ position:"fixed", top:"-20%", right:"-15%", width:600, height:600, borderRadius:"50%", background:"radial-gradient(circle,rgba(212,175,55,.035) 0%,transparent 70%)", pointerEvents:"none" }} />
      <div style={{ position:"fixed", bottom:"-20%", left:"-15%", width:600, height:600, borderRadius:"50%", background:"radial-gradient(circle,rgba(100,130,210,.03) 0%,transparent 70%)", pointerEvents:"none" }} />

      <div style={{ maxWidth:1040, margin:"0 auto", padding:"0 16px" }}>

        {/* HEADER */}
        <header style={{ textAlign:"center", padding:"52px 0 36px" }}>
          <div style={{ display:"flex", justifyContent:"center", gap:12, marginBottom:16 }}>
            {["木","火","土","金","水"].map((c,i)=>(
              <span key={i} style={{ fontSize:13, color:["#5DBF72","#EF5350","#D4AF37","#90CAF9","#4FC3F7"][i], opacity:.7 }}>{c}</span>
            ))}
          </div>
          <h1 style={{ fontFamily:"Cinzel,serif", fontSize:"clamp(22px,5vw,36px)", fontWeight:700, background:"linear-gradient(135deg,#C09010 0%,#F5E06E 40%,#C09010 100%)", backgroundSize:"300% auto", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text", animation:"shimmer 5s linear infinite", margin:"0 0 6px", letterSpacing:".14em" }}>天機漏說</h1>
          <p style={{ fontSize:11, color:"rgba(212,175,55,.48)", letterSpacing:".45em", margin:0 }}>사주 명리 연구소 · 수석 명리학자 청학(淸鶴)</p>
        </header>

        {/* ════════════════ FORM ════════════════ */}
        {step === "form" && (
          <div className="fade-in" style={{ maxWidth:560, margin:"0 auto", paddingBottom:80 }}>
            <div style={{ background:"rgba(255,255,255,.022)", border:"1px solid rgba(212,175,55,.14)", borderRadius:18, padding:"clamp(24px,5vw,52px)", backdropFilter:"blur(14px)" }}>
              <div style={{ textAlign:"center", marginBottom:34 }}>
                <div style={{ fontSize:30, marginBottom:12, opacity:.8 }}>✦</div>
                <h2 style={{ fontSize:19, fontWeight:400, color:"#D4AF37", margin:"0 0 10px", letterSpacing:".1em" }}>사주 정보 입력</h2>
                <p style={{ fontSize:13, color:"rgba(232,223,200,.42)", margin:0, lineHeight:2 }}>태어난 날의 정보를 입력하시면<br/>청학 선생이 인생의 거대한 지도를 펼쳐드립니다</p>
              </div>

              <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
                <div>
                  <label style={{ display:"block", fontSize:11, color:"rgba(212,175,55,.6)", marginBottom:7, letterSpacing:".12em" }}>이름 (선택)</label>
                  <input type="text" placeholder="성함을 입력하세요" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} />
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                  <div>
                    <label style={{ display:"block", fontSize:11, color:"rgba(212,175,55,.6)", marginBottom:7, letterSpacing:".12em" }}>생년월일 *</label>
                    <input type="date" value={form.birthDate} onChange={e=>setForm({...form,birthDate:e.target.value})} />
                  </div>
                  <div>
                    <label style={{ display:"block", fontSize:11, color:"rgba(212,175,55,.6)", marginBottom:7, letterSpacing:".12em" }}>태어난 시각</label>
                    <input type="time" value={form.birthTime} onChange={e=>setForm({...form,birthTime:e.target.value})} />
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
                  <div>
                    <label style={{ display:"block", fontSize:11, color:"rgba(212,175,55,.6)", marginBottom:7, letterSpacing:".12em" }}>성별</label>
                    <select value={form.gender} onChange={e=>setForm({...form,gender:e.target.value})}>
                      <option value="남">남성</option><option value="여">여성</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display:"block", fontSize:11, color:"rgba(212,175,55,.6)", marginBottom:7, letterSpacing:".12em" }}>역법</label>
                    <select value={form.calendar} onChange={e=>setForm({...form,calendar:e.target.value})}>
                      <option value="양력">양력</option><option value="음력">음력</option>
                    </select>
                  </div>
                </div>

                {error && <p style={{ color:"#ef9a9a", fontSize:13, margin:0, textAlign:"center" }}>{error}</p>}

                <button className="btn-gold" onClick={handleSubmit} style={{ padding:"16px", fontSize:14, marginTop:4 }}>
                  ✦ 섹션별 생성 시작
                </button>
                <button className="btn-purple" onClick={runPipeline} style={{ padding:"16px", fontSize:14 }}>
                  ☰ 전체 리포트 자동 생성 (8섹션 순차)
                </button>
                <p style={{ fontSize:11, color:"rgba(232,223,200,.25)", margin:0, textAlign:"center", lineHeight:1.8 }}>
                  전체 자동 생성: 8개 섹션을 순서대로 생성합니다<br/>약 3~5분이 소요됩니다
                </p>
              </div>
            </div>

            <div style={{ display:"flex", justifyContent:"center", gap:24, marginTop:36, opacity:.14 }}>
              {["☰","☱","☲","☳","☴","☵","☶","☷"].map((h,i)=><span key={i} style={{ fontSize:20, color:"#D4AF37" }}>{h}</span>)}
            </div>
          </div>
        )}

        {/* ════════════════ REPORT ════════════════ */}
        {step === "report" && (
          <div className="fade-in" style={{ display:"grid", gridTemplateColumns:"230px 1fr", gap:20, paddingBottom:70, alignItems:"start" }}>

            {/* ── LEFT SIDEBAR ── */}
            <div style={{ position:"sticky", top:16 }}>
              {/* client card */}
              <div style={{ background:"rgba(212,175,55,.055)", border:"1px solid rgba(212,175,55,.13)", borderRadius:12, padding:"14px 16px", marginBottom:14 }}>
                <p style={{ margin:"0 0 3px", fontSize:15, color:"#D4AF37", fontWeight:600 }}>{form.name||"익명"}</p>
                <p style={{ margin:"0 0 2px", fontSize:11, color:"rgba(232,223,200,.45)" }}>{form.birthDate} ({form.calendar})</p>
                <p style={{ margin:"0 0 12px", fontSize:11, color:"rgba(232,223,200,.45)" }}>{form.birthTime||"시각 미상"} · {form.gender}성</p>
                <button onClick={()=>{setStep("form");setSectionData({});setError("");abortRef.current=true;setPipeline(null);}}
                  style={{ background:"none", border:"1px solid rgba(212,175,55,.22)", color:"rgba(212,175,55,.6)", borderRadius:6, padding:"5px 10px", cursor:"pointer", fontSize:11, fontFamily:"inherit", width:"100%" }}>
                  ← 다시 입력
                </button>
              </div>

              {/* progress */}
              <div style={{ marginBottom:14 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                  <span style={{ fontSize:10, color:"rgba(212,175,55,.55)", letterSpacing:".1em" }}>
                    {pipeline==="running" ? `생성 중 (${pipelineIdx+1}/8)...` : "섹션 진행률"}
                  </span>
                  <span style={{ fontSize:10, color:"#D4AF37" }}>{doneCount}/8</span>
                </div>
                <div style={{ height:3, background:"rgba(255,255,255,.05)", borderRadius:2, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${(doneCount/8)*100}%`, background:"linear-gradient(90deg,#D4AF37,#F5E06E)", borderRadius:2, transition:"width .5s ease" }} />
                </div>
              </div>

              {/* section tabs */}
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                {SECTIONS.map(sec=>{
                  const isAct = activeSection===sec.id;
                  const isDone = !!sectionData[sec.id];
                  const isLd = !!loadingIds[sec.id];
                  return (
                    <button key={sec.id} className="sec-btn"
                      onClick={()=>generateSection(sec.id)}
                      style={{ background: isAct?"rgba(255,255,255,.06)":"rgba(255,255,255,.02)", borderRadius:9, padding:"9px 12px", opacity: isAct?1:.65, border:`1px solid ${isAct?sec.color+"44":"rgba(255,255,255,.05)"}` }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ fontSize:14, color:sec.color, flexShrink:0 }}>{sec.icon}</span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:10, color:sec.color, fontWeight:600, letterSpacing:".06em" }}>[{sec.id}]</div>
                          <div style={{ fontSize:11, color: isAct?"#e8dfc8":"rgba(232,223,200,.7)", fontWeight: isAct?600:400, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{sec.title}</div>
                        </div>
                        <div style={{ width:7, height:7, borderRadius:"50%", background: isLd?"#F5E06E": isDone?sec.color:"rgba(255,255,255,.1)", flexShrink:0, animation: isLd?"pulse 1s infinite":"none" }} />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* pipeline button */}
              {pipeline!=="running" && (
                <button className="btn-purple" onClick={runPipeline}
                  style={{ width:"100%", marginTop:12, padding:"10px", fontSize:11 }}>
                  ☰ 전체 자동 생성
                </button>
              )}
              {pipeline==="running" && (
                <div style={{ marginTop:12, textAlign:"center" }}>
                  <div style={{ width:24, height:24, border:"2px solid rgba(155,143,212,.2)", borderTop:"2px solid #9B8FD4", borderRadius:"50%", margin:"0 auto 8px", animation:"spin 1.2s linear infinite" }} />
                  <p style={{ fontSize:11, color:"rgba(155,143,212,.7)", margin:0, animation:"pipelinePulse 2s ease-in-out infinite" }}>
                    [{SECTIONS[pipelineIdx]?.id}] 생성 중...
                  </p>
                  <button onClick={()=>abortRef.current=true} style={{ marginTop:8, background:"none", border:"1px solid rgba(255,100,100,.25)", color:"rgba(255,150,150,.6)", borderRadius:5, padding:"4px 10px", cursor:"pointer", fontSize:10, fontFamily:"inherit" }}>
                    중단
                  </button>
                </div>
              )}
              {pipeline==="done" && (
                <div style={{ marginTop:10, textAlign:"center", padding:"8px", background:"rgba(127,201,168,.06)", border:"1px solid rgba(127,201,168,.2)", borderRadius:8 }}>
                  <p style={{ margin:0, fontSize:11, color:"rgba(127,201,168,.8)" }}>✦ 전체 리포트 생성 완료</p>
                </div>
              )}
            </div>

            {/* ── RIGHT CONTENT ── */}
            <div>
              <div style={{ background:"rgba(255,255,255,.02)", border:`1px solid ${accentColor}20`, borderRadius:16, padding:"clamp(20px,4vw,42px)", backdropFilter:"blur(10px)", minHeight:520 }}>
                {/* section header */}
                <div style={{ borderBottom:`1px solid ${accentColor}18`, paddingBottom:18, marginBottom:26 }}>
                  <div style={{ fontSize:10, color:`${accentColor}66`, letterSpacing:".25em", marginBottom:6 }}>SECTION [{cur?.id}] — 천기누설 사주 명리 연구소</div>
                  <h2 style={{ fontSize:22, fontWeight:600, color:accentColor, margin:"0 0 4px", letterSpacing:".04em" }}>{cur?.title}</h2>
                  <p style={{ fontSize:12, color:"rgba(232,223,200,.4)", margin:0 }}>{cur?.subtitle}</p>
                </div>

                {/* loading */}
                {isLoading && (
                  <div style={{ textAlign:"center", padding:"70px 20px" }}>
                    <div style={{ width:48, height:48, border:"2px solid rgba(212,175,55,.12)", borderTop:`2px solid ${accentColor}`, borderRadius:"50%", margin:"0 auto 20px", animation:"spin 1.4s linear infinite" }} />
                    <p style={{ color:"rgba(212,175,55,.55)", fontSize:14, margin:"0 0 6px", letterSpacing:".15em" }}>청학이 천기를 읽는 중</p>
                    <p style={{ color:"rgba(232,223,200,.3)", fontSize:12, margin:0 }}>깊은 통찰을 담아 풀이를 작성하고 있습니다...</p>
                  </div>
                )}

                {/* content */}
                {!isLoading && curData && (
                  <div className="fade-in">
                    {/* main text */}
                    <div style={{ lineHeight:2.3, fontSize:15, letterSpacing:".025em", whiteSpace:"pre-wrap", color:"rgba(232,223,200,.9)" }}>
                      {curData.content}
                    </div>

                    {/* G section: daewoon chart */}
                    {activeSection === "G" && curData.daewoon_scores && (
                      <DaewoonChart data={curData.daewoon_scores} birthYear={birthYear} />
                    )}

                    {/* image prompt */}
                    {curData.image_prompt && (
                      <div style={{ marginTop:36, padding:"18px 20px", background:`${accentColor}08`, border:`1px solid ${accentColor}18`, borderRadius:12 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                          <p style={{ fontSize:10, color:`${accentColor}55`, margin:0, letterSpacing:".14em" }}>✦ 이미지 생성 프롬프트 (DALL-E 3 / Midjourney)</p>
                          <button onClick={()=>copyPrompt(curData.image_prompt)}
                            style={{ background:"none", border:`1px solid ${accentColor}30`, color:`${accentColor}70`, borderRadius:5, padding:"4px 10px", cursor:"pointer", fontSize:10, fontFamily:"inherit", transition:"all .2s" }}>
                            {copyMsg||"복사"}
                          </button>
                        </div>
                        <p style={{ fontSize:12, color:"rgba(232,223,200,.52)", margin:0, lineHeight:1.9, fontStyle:"italic" }}>{curData.image_prompt}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* empty state */}
                {!isLoading && !curData && (
                  <div style={{ textAlign:"center", padding:"90px 20px", color:"rgba(232,223,200,.18)" }}>
                    <div style={{ fontSize:48, marginBottom:16 }}>{cur?.icon}</div>
                    <p style={{ fontSize:15, marginBottom:6 }}>이 섹션의 풀이를 시작하려면</p>
                    <p style={{ fontSize:13, margin:0 }}>좌측 탭을 클릭하거나 전체 자동 생성을 누르십시오</p>
                  </div>
                )}

                {error && !isLoading && (
                  <p style={{ color:"#ef9a9a", fontSize:14, textAlign:"center", padding:40 }}>{error}</p>
                )}
              </div>

              {/* Implementation Guide callout */}
              {pipeline==="done" && (
                <div className="fade-in" style={{ marginTop:16, padding:"18px 22px", background:"rgba(127,201,168,.04)", border:"1px solid rgba(127,201,168,.18)", borderRadius:12, display:"flex", gap:14, alignItems:"flex-start" }}>
                  <span style={{ fontSize:20, flexShrink:0 }}>☷</span>
                  <div>
                    <p style={{ margin:"0 0 5px", fontSize:13, color:"rgba(127,201,168,.85)", fontWeight:600 }}>전체 리포트 생성 완료 — 다음 단계</p>
                    <p style={{ margin:0, fontSize:12, color:"rgba(232,223,200,.45)", lineHeight:1.9 }}>
                      각 섹션의 <strong style={{ color:"rgba(212,175,55,.7)" }}>이미지 프롬프트</strong>를 복사하여 DALL-E 3 또는 Midjourney에 붙여넣어 섹션 이미지를 생성하세요.
                      [G] 대운 그래프는 위의 차트로 시각화되었습니다.
                      모든 콘텐츠를 PDF로 패키징하여 최종 리포트를 완성할 수 있습니다.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
