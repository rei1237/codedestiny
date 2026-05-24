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
  { num: 1, title: "1장. 명궁 완전 해독 — 타고난 인생 설계도", subtitle: "명궁을 중심으로 타고난 성격, 기질, 인생 선택 패턴을 해석한다.", icon: "🌌" },
  { num: 2, title: "2장. 신궁 심층 분석 — 후천적으로 완성되는 나", subtitle: "신궁 위치, 명궁과의 관계, 후천 성향 강화 방향을 해석한다.", icon: "🧠" },
  { num: 3, title: "3장. 복덕궁 — 마음의 만족과 내면의 행복 구조", subtitle: "복덕궁 중심으로 스트레스-회복 구조와 내면 행복 설계를 해석한다.", icon: "🌍" },
  { num: 4, title: "4장. 관록궁 — 직업, 커리어, 사회적 성취", subtitle: "관록궁 기반 직업 적성, 일 방식, 성취 조건과 리스크를 정리한다.", icon: "👑" },
  { num: 5, title: "5장. 재백궁 — 돈의 흐름과 재물 그릇", subtitle: "재백궁 기반 수익 구조, 누수 패턴, 재물운 강화 습관을 제시한다.", icon: "💰" },
  { num: 6, title: "6장. 천이궁 — 외부 세계, 이동, 기회", subtitle: "천이궁 중심으로 외부 기회, 이동운, 타지/해외 적응력을 해석한다.", icon: "💞" },
  { num: 7, title: "7장. 부처궁 — 연애, 결혼, 배우자 인연", subtitle: "부처궁 중심 연애/결혼 반복 패턴과 파트너십 전략을 구체화한다.", icon: "🤝" },
  { num: 8, title: "8장. 교우궁 — 인간관계, 친구, 협력자", subtitle: "교우궁 중심으로 협업/인맥 구조, 도움 인연과 리스크를 해석한다.", icon: "🏠" },
  { num: 9, title: "9장. 부모궁 — 원가족, 윗사람, 보호와 압박", subtitle: "부모궁 중심으로 원가족/윗사람 관계의 보호와 압박 패턴을 해석한다.", icon: "💪" },
  { num: 10, title: "10장. 형제궁 — 형제, 경쟁자, 가까운 수평 관계", subtitle: "형제궁 기반 수평 관계의 거리감, 경쟁 구도, 협력 가능 구조를 분석한다.", icon: "🌊" },
  { num: 11, title: "11장. 질액궁 — 건강, 체력, 에너지 관리", subtitle: "질액궁 중심 취약 패턴, 번아웃 포인트, 회복 전략을 실전적으로 정리한다.", icon: "📅" },
  { num: 12, title: "12장. 대운과 인생 전환기 — 큰 흐름의 지도", subtitle: "현재 대운/연운을 중심으로 인생 전환 시기와 분야별 전환 전략을 제시한다.", icon: "🍀" },
  { num: 13, title: "13장. 종합 결론 — 나의 운명을 쓰는 법", subtitle: "명궁·신궁·관록궁·재백궁 축을 통합해 실행 가능한 최종 전략 로드맵을 완성한다.", icon: "🌅" },
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
      script.src = "/js/ziwei-book.js?v=build-1779459999758";
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
        <img src="/fuctionassets/jamipremiun.webp" alt="자미두수 프리미엄 소개" width={1200} height={675} loading="lazy" decoding="async" style={{ width:"100%", maxHeight:280, objectFit:"cover", opacity:0.42 }} />
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
            {generationLoading ? "데이터 검증 중…" : "프리미엄 PDF 리포트 생성하기"}
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
        <img src="/fuctionassets/jamipremiun.webp" alt="자미두수 프리미엄" width={70} height={70} loading="lazy" decoding="async" style={{ width:70, height:70, borderRadius:16, objectFit:"cover", boxShadow:"0 4px 20px rgba(99,102,241,0.35)", flexShrink:0, border:"1.5px solid rgba(167,139,250,0.45)" }} />
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
