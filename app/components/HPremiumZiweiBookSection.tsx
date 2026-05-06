"use client";
/**
 * [프리미엄 자미두수 PDF 기능]
 * - 13개 챕터의 정밀 리포트를 PDF 파일로 생성하여 제공하는 서비스입니다.
 * - public/js/ziwei-book.js 및 전역 window 함수를 사용하여 동작합니다.
 * - '자미두수 심화 기능' 웹 리포트와는 별개의 독립적인 PDF 전용 서비스입니다.
 */
import { useEffect, useCallback, useRef } from "react";

interface HPremiumZiweiBookSectionProps {
  showIntro?: boolean;
  onStartGeneration?: () => void;
  generationLoading?: boolean;
  isUnlocked?: boolean;
}

const CHAPTER_META = [
  { num: 1, title: "타고난 명(命)과 본질", subtitle: "명궁·신궁·삼방사정 통합 해석", icon: "🌌" },
  { num: 2, title: "내면 심리와 무의식", subtitle: "복덕궁 기반 정서 패턴 분석", icon: "🧠" },
  { num: 3, title: "사회적 페르소나", subtitle: "천이궁으로 보는 외부 활동운", icon: "🌍" },
  { num: 4, title: "진로·직업운", subtitle: "관록궁 중심 적성/커리어 전략", icon: "👑" },
  { num: 5, title: "재물운·자산 운영", subtitle: "재백궁 기반 수익 구조 분석", icon: "💰" },
  { num: 6, title: "연애·배우자운", subtitle: "부처궁 관계 패턴 정밀 해석", icon: "💞" },
  { num: 7, title: "인맥·협업 구조", subtitle: "교우궁·형제궁 귀인/소인 분석", icon: "🤝" },
  { num: 8, title: "주거·부동산 흐름", subtitle: "전택궁 공간 에너지 전략", icon: "🏠" },
  { num: 9, title: "건강·활력 리듬", subtitle: "질액궁 생활/회복 루틴 설계", icon: "💪" },
  { num: 10, title: "생애 주기 대운", subtitle: "대한(10년) 흐름 전략", icon: "🌊" },
  { num: 11, title: "연운·월운 타이밍", subtitle: "유년·유월 12개월 액션 플랜", icon: "📅" },
  { num: 12, title: "개운법 총결산", subtitle: "액운 대응·맞춤 개운 가이드", icon: "🍀" },
  { num: 13, title: "종합 총운 로드맵", subtitle: "90일 실행 플랜", icon: "🌅" },
];

export default function HPremiumZiweiBookSection({
  showIntro = false,
  onStartGeneration,
  generationLoading = false,
  isUnlocked = false,
}: HPremiumZiweiBookSectionProps) {
  const autoOpenedRef = useRef(false);

  // Ensure ziwei-book.js is loaded
  useEffect(() => {
    if (typeof window !== "undefined" && !(window as any).generateZiweiBook) {
      const script = document.createElement("script");
      script.src = "/js/ziwei-book.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const handleOpenModal = useCallback(() => {
    if (typeof (window as any).openZiweiBookModal === "function") {
      (window as any).openZiweiBookModal();
    } else {
      alert("프리미엄 자미두수 모듈을 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
    }
  }, []);

  useEffect(() => {
    if (showIntro) return;
    if (!isUnlocked) return;
    if (autoOpenedRef.current) return;
    autoOpenedRef.current = true;
    const timer = window.setTimeout(() => {
      handleOpenModal();
    }, 120);
    return () => window.clearTimeout(timer);
  }, [showIntro, isUnlocked, handleOpenModal]);

  if (showIntro) {
    return (
      <section style={{ background:"linear-gradient(145deg,#07091a 0%,#0c0f24 50%,#070916 100%)", border:"1px solid rgba(167,139,250,0.20)", borderRadius:24, overflow:"hidden", boxShadow:"0 12px 50px rgba(99,102,241,0.08), inset 0 1px 0 rgba(255,255,255,0.04)" }}>
        <img src="/fuctionassets/jamipremiun.webp" alt="자미두수 프리미엄 소개" style={{ width:"100%", maxHeight:280, objectFit:"cover", opacity:0.42 }} />
        <div style={{ padding:"18px 18px 22px" }}>
          <p style={{ color:"rgba(167,139,250,0.72)", fontSize:"0.66rem", letterSpacing:"0.28em", margin:0 }}>ZIWEI DOUSHU PREMIUM · DETAIL INTRO</p>
          <h3 style={{ color:"#fff", fontWeight:900, fontSize:"1.5rem", margin:"8px 0 6px" }}>자미두수 인생 총람 PDF</h3>
          <p style={{ color:"rgba(203,213,225,0.78)", fontSize:"0.88rem", lineHeight:1.8, margin:0 }}>
            자미두수 13챕터 카테고리를 먼저 확인하고, 버튼 클릭 시 PDF 생성 단계로 진입합니다.
          </p>

          <div style={{ display:"grid", gap:8, marginTop:12 }}>
            {CHAPTER_META.map((ch) => (
              <div key={ch.num} style={{ borderRadius:12, border:"1px solid rgba(167,139,250,0.22)", background:"rgba(15,23,42,0.5)", padding:"10px 12px" }}>
                <p style={{ margin:0, color:"rgba(196,181,253,0.94)", fontSize:"0.82rem", fontWeight:700 }}>
                  {ch.icon} CHAPTER {ch.num}. {ch.title}
                </p>
                <p style={{ margin:"4px 0 0", color:"rgba(148,163,184,0.76)", fontSize:"0.74rem" }}>{ch.subtitle}</p>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => onStartGeneration?.()}
            disabled={generationLoading}
            style={{
              marginTop:14,
              width:"100%",
              borderRadius:12,
              padding:"14px",
              background: generationLoading ? "rgba(50,40,80,0.55)" : "linear-gradient(135deg,#8b5cf6 0%,#7c3aed 55%,#6366f1 100%)",
              border:"none",
              color: generationLoading ? "rgba(148,163,184,0.5)" : "#fff",
              fontWeight:900,
              fontSize:"0.96rem",
              letterSpacing:"0.05em",
              cursor: generationLoading ? "wait" : "pointer",
              opacity: generationLoading ? 0.72 : 1,
            }}
          >
            {generationLoading ? "코인 확인 중…" : "프리미엄 PDF 리포트 생성하기"}
          </button>
        </div>
      </section>
    );
  }

  if (!isUnlocked) {
    return (
      <section style={{ background:"linear-gradient(145deg,#07091a 0%,#0c0f24 50%,#070916 100%)", border:"1px solid rgba(167,139,250,0.20)", borderRadius:24, overflow:"hidden", boxShadow:"0 12px 50px rgba(99,102,241,0.08), inset 0 1px 0 rgba(255,255,255,0.04)" }}>
        <div style={{ padding:"26px 22px", textAlign:"center" }}>
          <p style={{ color:"rgba(167,139,250,0.66)", fontSize:"0.62rem", letterSpacing:"0.30em", fontWeight:700, textTransform:"uppercase", margin:"0 0 8px" }}>
            CODE : DESTINY · ZIWEI PREMIUM
          </p>
          <h3 style={{ color:"#fff", fontWeight:900, fontSize:"1.3rem", margin:"0 0 10px" }}>자미두수 인생 총람 PDF</h3>
          <p style={{ color:"rgba(203,213,225,0.7)", fontSize:"0.88rem", lineHeight:1.8, margin:"0 0 16px" }}>
            결제 확인 후 생성 단계가 열립니다. 버튼을 눌러 다시 시도해 주세요.
          </p>
          <button
            type="button"
            onClick={() => onStartGeneration?.()}
            disabled={generationLoading}
            style={{
              borderRadius:12,
              padding:"12px 20px",
              background: generationLoading ? "rgba(50,40,80,0.55)" : "linear-gradient(135deg,#8b5cf6 0%,#7c3aed 55%,#6366f1 100%)",
              border:"none",
              color: generationLoading ? "rgba(148,163,184,0.5)" : "#fff",
              fontWeight:800,
              fontSize:"0.86rem",
              cursor: generationLoading ? "wait" : "pointer",
              opacity: generationLoading ? 0.72 : 1,
            }}
          >
            {generationLoading ? "코인 확인 중…" : "생성 단계 열기"}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section style={{ background:"linear-gradient(145deg,#07091a 0%,#0c0f24 50%,#070916 100%)", border:"1px solid rgba(167,139,250,0.20)", borderRadius:24, overflow:"hidden", boxShadow:"0 12px 50px rgba(99,102,241,0.08), inset 0 1px 0 rgba(255,255,255,0.04)" }}>
      <div style={{ padding:"26px 22px 18px", background:"linear-gradient(135deg,rgba(139,92,246,0.12) 0%,rgba(99,102,241,0.08) 100%)", borderBottom:"1px solid rgba(167,139,250,0.16)", display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
        <img src="/fuctionassets/jamipremiun.webp" alt="자미두수 프리미엄" style={{ width:70, height:70, borderRadius:16, objectFit:"cover", boxShadow:"0 4px 20px rgba(99,102,241,0.35)", flexShrink:0, border:"1.5px solid rgba(167,139,250,0.45)" }} />
        <div>
          <p style={{ color:"rgba(167,139,250,0.70)", fontSize:"0.62rem", letterSpacing:"0.30em", fontWeight:700, textTransform:"uppercase", marginBottom:5 }}>CODE : DESTINY · ZIWEI MASTER</p>
          <h2 style={{ color:"#fff", fontWeight:900, fontSize:"clamp(1.2rem,3.5vw,1.65rem)", lineHeight:1.25, margin:0 }}>
            👑 자미두수 인생 총람
          </h2>
          <p style={{ color:"rgba(196,181,253,0.72)", fontSize:"0.84rem", marginTop:5, lineHeight:1.6 }}>
            한국 천문력 기반 12궁·사화·대한·묘왕리함 심층 분석 PDF
          </p>
        </div>
      </div>

      <div style={{ padding:"18px 18px 24px", textAlign:"center" }}>
        <p style={{ color:"rgba(148,163,184,0.76)", fontSize:"0.86rem", lineHeight:1.8, margin:"0 0 14px" }}>
          결제가 완료되어 생성기를 열었습니다. 창이 닫혔거나 차단된 경우 아래 버튼으로 다시 열 수 있습니다.
        </p>
        <button
          type="button"
          onClick={handleOpenModal}
          style={{
            borderRadius:12,
            padding:"12px 22px",
            background:"linear-gradient(135deg,#8b5cf6 0%,#7c3aed 55%,#6366f1 100%)",
            border:"none",
            color:"#fff",
            fontWeight:900,
            fontSize:"0.9rem",
            letterSpacing:"0.04em",
            cursor:"pointer",
          }}
        >
          PDF 생성기 다시 열기
        </button>
      </div>
    </section>
  );
}
