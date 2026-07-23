"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

// 궁별 상담 프리셋: 검증된 /ziwei-ai 상담을 그 궁 주제(focusArea)+맞춤 질문으로 초점 맞춰 연다.
type FocusArea = "overall" | "personality" | "career" | "money" | "love" | "relationship" | "health" | "custom";
interface Palace {
  name: string;
  title: string;
  icon: string;
  theme: string;
  focus: FocusArea;
  question: string;
}

const PALACES: Palace[] = [
  { name: "명궁", title: "운명의 성", icon: "🏰", theme: "나의 본질·성향·삶의 방향", focus: "personality", question: "명궁을 중심으로 제 타고난 성향과 지금 삶의 방향을 봐주세요." },
  { name: "재백궁", title: "황금 광산", icon: "⛏️", theme: "재물·수입·돈의 흐름", focus: "money", question: "재백궁을 중심으로 재물의 흐름과 지금 돈·일 관련 선택을 봐주세요." },
  { name: "관록궁", title: "전략실", icon: "📐", theme: "직업·성취·진로 전환", focus: "career", question: "관록궁을 중심으로 직업·성취와 진로 전환의 흐름을 봐주세요." },
  { name: "부부궁", title: "연인의 정원", icon: "💗", theme: "배우자·연애·인연", focus: "love", question: "부부궁을 중심으로 배우자·연애 인연의 형태와 흐름을 봐주세요." },
  { name: "천이궁", title: "항구", icon: "⛵", theme: "이동·변화·해외", focus: "career", question: "천이궁을 중심으로 이동·변화·이사/해외 등 바깥 활동의 흐름을 봐주세요." },
  { name: "복덕궁", title: "신비한 도서관", icon: "📚", theme: "내면·정신·취향", focus: "personality", question: "복덕궁을 중심으로 내면의 즐거움·정신 상태와 취향을 봐주세요." },
  { name: "질액궁", title: "치유의 성소", icon: "💧", theme: "건강·체질·컨디션", focus: "health", question: "질액궁을 중심으로 건강·체질과 몸·마음의 취약점을 봐주세요." },
  { name: "부모궁", title: "고대 신전", icon: "⛩️", theme: "부모·윗사람·뿌리", focus: "relationship", question: "부모궁을 중심으로 부모·윗사람과의 관계와 뿌리의 기운을 봐주세요." },
  { name: "형제궁", title: "형제의 숲", icon: "🌲", theme: "형제·동년배·협력", focus: "relationship", question: "형제궁을 중심으로 형제·동년배와의 관계와 협력운을 봐주세요." },
  { name: "노복궁", title: "동료의 광장", icon: "🤝", theme: "동료·인맥·아랫사람", focus: "relationship", question: "노복궁을 중심으로 동료·아랫사람 등 사회적 관계망을 봐주세요." },
  { name: "자녀궁", title: "빛의 놀이터", icon: "🎈", theme: "자녀·창작·돌봄", focus: "relationship", question: "자녀궁을 중심으로 자녀운과 새로 시작하는 일(창작)의 기운을 봐주세요." },
  { name: "전택궁", title: "고향의 집", icon: "🏡", theme: "거처·부동산·터전", focus: "custom", question: "전택궁을 중심으로 거처·부동산과 머무는 자리의 운을 봐주세요." },
];

const YEON_AV = "/fuctionassets/" + encodeURIComponent("연이.webp");
const NEO_AV =
  "https://assets.code-destiny.com/cdn-cgi/image/width=240,quality=80,format=auto/DestinyWar/" +
  encodeURIComponent("전략실 네오 메인-Photoroom.png");

export default function IslandConsultClient() {
  const router = useRouter();
  const [focused, setFocused] = useState<string>("");

  useEffect(() => {
    try {
      const palace = new URLSearchParams(window.location.search).get("palace") || "";
      if (palace && PALACES.some((p) => p.name === palace)) {
        setFocused(palace);
        requestAnimationFrame(() => {
          const el = document.getElementById("ic-" + palace);
          if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
        });
      }
    } catch {
      /* noop */
    }
  }, []);

  function openConsult(p: Palace) {
    try {
      sessionStorage.setItem(
        "ziweiIslandPreset",
        JSON.stringify({ focusArea: p.focus, question: p.question, palace: p.name }),
      );
    } catch {
      /* 프리셋 저장 실패해도 상담 자체는 열린다 */
    }
    router.push("/ziwei-ai");
  }

  return (
    <div className="ic-root">
      <style>{CSS}</style>
      <header className="ic-head">
        <div className="ic-avatars" aria-hidden="true">
          <span className="ic-av ic-av--yeon">
            <Image src={YEON_AV} alt="" width={72} height={72} unoptimized />
          </span>
          <span className="ic-av ic-av--neo">
            <Image src={NEO_AV} alt="" width={72} height={72} unoptimized />
          </span>
        </div>
        <p className="ic-eyebrow">紫微斗數 · 운명의 섬</p>
        <h1 className="ic-title">12궁 특화 상담</h1>
        <p className="ic-sub">
          궁을 하나 고르면, 그 자리에 초점을 맞춰 <strong>자미두수 AI 상담</strong>이 열려요.
          연이와 네오가 그 궁의 별과 사화·대운의 흐름을 지금 고민에 맞춰 풀어드립니다.
        </p>
      </header>

      <ul className="ic-grid" aria-label="12궁 상담 선택">
        {PALACES.map((p) => (
          <li key={p.name}>
            <button
              type="button"
              id={"ic-" + p.name}
              className={"ic-card" + (focused === p.name ? " ic-card--focus" : "")}
              onClick={() => openConsult(p)}
              aria-label={`${p.name} ${p.title} — ${p.theme} 상담 시작`}
            >
              <span className="ic-card__icon" aria-hidden="true">{p.icon}</span>
              <span className="ic-card__name">{p.name}</span>
              <span className="ic-card__title">{p.title}</span>
              <span className="ic-card__theme">{p.theme}</span>
              <span className="ic-card__cta" aria-hidden="true">상담 →</span>
            </button>
          </li>
        ))}
      </ul>

      <footer className="ic-foot">
        <p>결제·상담·결과는 검증된 자미두수 AI 상담 화면에서 진행돼요.</p>
        <a className="ic-back" href="/destiny-island">← 운명의 섬으로 돌아가기</a>
      </footer>
    </div>
  );
}

const CSS = `
.ic-root{min-height:100vh;padding:calc(24px + env(safe-area-inset-top)) 16px calc(32px + env(safe-area-inset-bottom));
  color:#241f47;font-family:'CodeDestinyBody','Pretendard','Apple SD Gothic Neo','Noto Sans KR',system-ui,sans-serif;
  background:radial-gradient(130% 100% at 50% 0%,#cbd0f5 0%,#b9b3ea 42%,#a99fdd 100%);}
.ic-head{max-width:760px;margin:0 auto 22px;text-align:center}
.ic-avatars{display:flex;justify-content:center;gap:-8px;margin-bottom:12px}
.ic-av{width:72px;height:72px;border-radius:50%;overflow:hidden;border:2px solid rgba(255,255,255,.75);
  box-shadow:0 8px 26px rgba(60,40,110,.28);background:#efeaff}
.ic-av--yeon{margin-right:-14px;z-index:2}
.ic-av--neo{border-color:rgba(232,213,163,.9)}
.ic-av :global(img){width:100%;height:100%;object-fit:cover;object-position:50% 18%}
.ic-eyebrow{font-size:.82rem;letter-spacing:.14em;font-weight:700;color:#6a4fb0}
.ic-title{font-family:'CodeDestinyDisplay','Mulmaru','Nanum Myeongjo',serif;font-size:clamp(1.8rem,6vw,2.5rem);
  font-weight:800;margin:4px 0 8px;color:#2a1f5e;text-shadow:0 2px 14px rgba(255,255,255,.5)}
.ic-sub{max-width:44ch;margin:0 auto;font-size:.96rem;line-height:1.75;color:#3d356e;word-break:keep-all}
.ic-sub strong{color:#7a4fc0;font-weight:800}
.ic-grid{max-width:920px;margin:0 auto;list-style:none;padding:0;display:grid;gap:12px;
  grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}
.ic-card{display:flex;flex-direction:column;align-items:center;gap:3px;width:100%;min-height:150px;padding:18px 12px 14px;
  border-radius:20px;border:1px solid rgba(255,255,255,.7);cursor:pointer;text-align:center;
  background:linear-gradient(180deg,rgba(255,255,255,.82),rgba(255,255,255,.62));
  -webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);
  box-shadow:0 10px 26px rgba(70,48,130,.16),inset 0 1px 0 rgba(255,255,255,.9);
  transition:transform .18s cubic-bezier(.16,1,.3,1),box-shadow .2s ease,border-color .2s ease}
.ic-card:hover,.ic-card:focus-visible{transform:translateY(-4px);border-color:#b79cf0;outline:none;
  box-shadow:0 18px 40px rgba(70,48,130,.26),0 0 0 3px rgba(183,156,240,.35)}
.ic-card--focus{border-color:#e0b94f;box-shadow:0 16px 38px rgba(70,48,130,.24),0 0 0 3px rgba(224,185,79,.5)}
.ic-card__icon{font-size:2rem;line-height:1;filter:drop-shadow(0 3px 6px rgba(90,60,150,.28))}
.ic-card__name{font-family:'CodeDestinyDisplay','Mulmaru',serif;font-weight:800;font-size:1.06rem;color:#2a1f5e;margin-top:6px}
.ic-card__title{font-size:.82rem;color:#6a4fb0;font-weight:700}
.ic-card__theme{font-size:.78rem;color:#5c5488;line-height:1.5;margin-top:2px}
.ic-card__cta{margin-top:auto;font-size:.8rem;font-weight:800;color:#8a5fd0}
.ic-foot{max-width:760px;margin:22px auto 0;text-align:center;color:#463c7a;font-size:.86rem}
.ic-back{display:inline-block;margin-top:10px;color:#6a4fb0;font-weight:700;text-decoration:none;
  padding:9px 18px;border-radius:999px;border:1px solid rgba(106,79,176,.35);min-height:44px;line-height:26px}
.ic-back:hover{background:rgba(255,255,255,.5)}
@media (prefers-reduced-motion:reduce){.ic-card{transition:none}}
`;
