"use client";

import { useState, useCallback, useEffect } from "react";

const GOOGLE_FONTS = `@import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700;900&family=Cinzel:wght@500;600;700&family=Noto+Sans+KR:wght@400;500;700;800&display=swap');`;

// ─── RUNES DATA ────────────────────────────────────────────────────────────────
const RUNES_DATA = [
  { id: "fehu", name: "Fehu", symbol: "ᚠ", meaning_upright: "풍요, 번영, 가축과 재물. 새로운 시작을 위한 에너지가 충만합니다. 노력이 결실을 맺을 때입니다.", meaning_reversed: "재물의 손실, 탐욕, 집착. 물질적 집착을 내려놓고 진정한 가치를 돌아볼 시간입니다.", isSymmetric: false },
  { id: "uruz", name: "Uruz", symbol: "ᚢ", meaning_upright: "생명력, 야생의 힘, 건강. 내면의 원초적 에너지가 깨어나고 있습니다. 변화를 두려워 말아요.", meaning_reversed: "체력 저하, 기회 상실. 쉬지 않고 달려온 당신, 잠시 멈춰 회복하세요.", isSymmetric: false },
  { id: "thurisaz", name: "Thurisaz", symbol: "ᚦ", meaning_upright: "보호, 저항, 가시덤불. 강한 방어막이 당신을 지킵니다. 충동적 행동 전 한 번 더 생각하세요.", meaning_reversed: "무분별한 충동, 위험. 공격성을 내면으로 돌려 자기 파괴를 조심하세요.", isSymmetric: false },
  { id: "ansuz", name: "Ansuz", symbol: "ᚨ", meaning_upright: "신의 목소리, 소통, 지혜. 오딘의 숨결이 당신에게 닿습니다. 직관과 내면의 목소리에 귀 기울이세요.", meaning_reversed: "거짓말, 오해, 의사소통 단절. 말을 조심하고 속임수에 주의하세요.", isSymmetric: false },
  { id: "raidho", name: "Raidho", symbol: "ᚱ", meaning_upright: "여정, 올바른 행동, 리듬. 당신은 옳은 길 위에 있습니다. 우주의 흐름과 함께 움직이세요.", meaning_reversed: "여정의 방해, 통제 상실. 계획에 차질이 생길 수 있습니다. 유연성을 가지세요.", isSymmetric: false },
  { id: "kenaz", name: "Kenaz", symbol: "ᚲ", meaning_upright: "등불, 창의성, 영감. 어둠 속에서도 빛나는 창조의 불꽃. 예술과 지식이 당신을 이끕니다.", meaning_reversed: "창의성의 차단, 거짓 희망. 내면의 불꽃이 꺼져가고 있습니다. 새로운 영감을 찾으세요.", isSymmetric: false },
  { id: "gebo", name: "Gebo", symbol: "ᚷ", meaning_upright: "선물, 교환, 균형. 주고받음의 아름다운 순환. 진정한 관계는 균형 위에 서 있습니다.", meaning_reversed: null, isSymmetric: true },
  { id: "wunjo", name: "Wunjo", symbol: "ᚹ", meaning_upright: "기쁨, 조화, 행복. 오래 기다린 기쁨이 찾아옵니다. 축하받을 일이 가까이 있습니다.", meaning_reversed: "슬픔, 고통, 불조화. 일시적인 어둠입니다. 이 또한 지나가리니 희망을 잃지 마세요.", isSymmetric: false },
  { id: "hagalaz", name: "Hagalaz", symbol: "ᚺ", meaning_upright: "파괴적 변화, 우박, 시련. 갑작스러운 변화가 옵니다. 하지만 파괴 후에는 반드시 재건이 따릅니다.", meaning_reversed: null, isSymmetric: true },
  { id: "nauthiz", name: "Nauthiz", symbol: "ᚾ", meaning_upright: "필요, 결핍, 제약. 지금의 부족함이 미래의 강함을 만듭니다. 인내의 시간입니다.", meaning_reversed: "강박, 불안, 외부 압박. 욕망을 좇지 말고 진정으로 필요한 것을 분별하세요.", isSymmetric: false },
  { id: "isa", name: "Isa", symbol: "ᛁ", meaning_upright: "얼음, 정체, 내면 집중. 모든 것이 멈춘 듯 느껴집니다. 지금은 행동보다 성찰의 시간입니다.", meaning_reversed: null, isSymmetric: true },
  { id: "jera", name: "Jera", symbol: "ᛃ", meaning_upright: "수확, 순환, 정당한 보상. 심은 대로 거두는 시간입니다. 그동안의 노력이 결실을 맺습니다.", meaning_reversed: null, isSymmetric: true },
  { id: "eihwaz", name: "Eihwaz", symbol: "ᛇ", meaning_upright: "주목나무, 죽음과 재생, 인내. 끝과 시작의 경계에 서 있습니다. 변화를 두려워 말고 통과하세요.", meaning_reversed: "혼란, 약함, 방해. 현재의 장애물은 더 큰 성장을 위한 관문입니다.", isSymmetric: false },
  { id: "perthro", name: "Perthro", symbol: "ᛈ", meaning_upright: "신비, 운명의 컵, 잠재성. 운명의 주사위가 던져졌습니다. 비밀이 밝혀질 수도 있습니다.", meaning_reversed: "불확실성, 중독, 집착. 운명에 지나치게 의존하지 말고 스스로의 선택을 신뢰하세요.", isSymmetric: false },
  { id: "algiz", name: "Algiz", symbol: "ᛉ", meaning_upright: "보호, 사슴뿔, 신성한 방패. 강력한 수호 에너지가 주변을 감쌉니다. 직관을 믿으세요.", meaning_reversed: "무방비, 취약성. 지금은 경계가 필요합니다. 에너지 흡혈귀를 조심하세요.", isSymmetric: false },
  { id: "sowilo", name: "Sowilo", symbol: "ᛊ", meaning_upright: "태양, 승리, 생명력. 찬란한 태양 에너지가 당신 편입니다. 목표를 향해 당당히 나아가세요.", meaning_reversed: null, isSymmetric: true },
  { id: "tiwaz", name: "Tiwaz", symbol: "ᛏ", meaning_upright: "티르신, 정의, 희생. 올바름을 위해 기꺼이 희생하는 용기. 법과 정의가 당신 편입니다.", meaning_reversed: "불의, 배신, 에너지 고갈. 싸움에서 에너지가 소진되고 있습니다. 방향을 재검토하세요.", isSymmetric: false },
  { id: "berkano", name: "Berkano", symbol: "ᛒ", meaning_upright: "자작나무, 탄생, 모성. 새로운 생명과 시작. 성장과 치유의 에너지가 충만합니다.", meaning_reversed: "성장의 방해, 불임, 근심. 내면의 상처를 치유하지 않으면 새 시작이 어렵습니다.", isSymmetric: false },
  { id: "ehwaz", name: "Ehwaz", symbol: "ᛖ", meaning_upright: "말(馬), 파트너십, 이동. 신뢰할 수 있는 동반자와 함께 앞으로 나아갑니다. 협력이 핵심입니다.", meaning_reversed: "신뢰 부재, 배신, 좌절. 파트너십에 균열이 생겼습니다. 소통으로 다리를 놓으세요.", isSymmetric: false },
  { id: "mannaz", name: "Mannaz", symbol: "ᛗ", meaning_upright: "인류, 자아, 사회. 나는 누구인가? 공동체 안에서의 자신을 돌아보는 시간입니다.", meaning_reversed: "자만, 고립, 적대심. 타인과의 관계에서 자아를 잃지 마세요.", isSymmetric: false },
  { id: "laguz", name: "Laguz", symbol: "ᛚ", meaning_upright: "물, 직관, 무의식. 감정의 흐름에 몸을 맡기세요. 직관이 이성보다 강한 시간입니다.", meaning_reversed: "감정의 홍수, 두려움. 두려움이 판단을 흐립니다. 감정을 솔직하게 들여다보세요.", isSymmetric: false },
  { id: "ingwaz", name: "Ingwaz", symbol: "ᛜ", meaning_upright: "잉그신, 내면의 성장, 씨앗. 조용하지만 강력한 에너지가 내면에서 자라나고 있습니다.", meaning_reversed: null, isSymmetric: true },
  { id: "dagaz", name: "Dagaz", symbol: "ᛞ", meaning_upright: "새벽, 각성, 돌파구. 긴 밤이 지나고 새벽이 밝아옵니다. 획기적인 변화와 깨달음의 순간입니다.", meaning_reversed: null, isSymmetric: true },
  { id: "othalan", name: "Othalan", symbol: "ᛟ", meaning_upright: "조상, 유산, 고향. 뿌리를 돌아보세요. 가족과 전통에서 지혜와 힘을 얻습니다.", meaning_reversed: "유산 상실, 집착, 고집. 과거에 집착하면 미래로 나아갈 수 없습니다.", isSymmetric: false },
  { id: "wyrd", name: "Wyrd", symbol: "ᛟ", meaning_upright: "공백 룬, 알 수 없는 운명. 모든 것이 가능하고, 아무것도 정해지지 않았습니다. 당신의 운명은 당신이 만들어 갑니다.", meaning_reversed: null, isSymmetric: true },
];

// ─── useRuneDraw HOOK ──────────────────────────────────────────────────────────
function useRuneDraw() {
  const [drawnRunes, setDrawnRunes] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [phase, setPhase] = useState("idle");

  const shuffleArray = (arr) => {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  const drawRunes = useCallback((count) => {
    setIsDrawing(true);
    setPhase("shaking");
    setDrawnRunes([]);

    setTimeout(() => {
      setPhase("drawing");
      const shuffled = shuffleArray(RUNES_DATA);
      const selected = shuffled.slice(0, count).map((rune) => ({
        ...rune,
        isReversed: rune.isSymmetric ? false : Math.random() < 0.5,
      }));
      setTimeout(() => {
        setDrawnRunes(selected);
        setPhase("revealed");
        setIsDrawing(false);
      }, 1200);
    }, 2000);
  }, []);

  const reset = useCallback(() => {
    setDrawnRunes([]);
    setPhase("idle");
    setIsDrawing(false);
  }, []);

  return { drawnRunes, isDrawing, phase, drawRunes, reset };
}

// ─── SPREAD LABELS ────────────────────────────────────────────────────────────
const SPREAD_OPTIONS = [
  { count: 1, rune: "ᚢ", name: "1-룬", desc: "오늘의 조언" },
  { count: 3, rune: "ᚦ", name: "3-룬 · 노른의 예언", desc: "과거 · 현재 · 미래" },
  { count: 5, rune: "ᛃ", name: "5-룬 · 심층 해석", desc: "성향 + 주의 포인트 포함" },
  { count: 12, rune: "ᛞ", name: "12-룬 · 연간 대점", desc: "1년 종합 흐름" },
];

const SPREAD_LABELS = {
  3: ["과거 · Urd", "현재 · Verdandi", "미래 · Skuld"],
  5: ["과거의 흐름", "현재의 상태", "다가올 미래", "타고난 성향", "조심해야 할 부분"],
  12: [
    "1월", "2월", "3월", "4월", "5월", "6월",
    "7월", "8월", "9월", "10월", "11월", "12월",
  ],
};

function getMeaningText(rune) {
  if (rune.isReversed && rune.meaning_reversed) return rune.meaning_reversed;
  return rune.meaning_upright;
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function StonehengeRune() {
  const { drawnRunes, isDrawing, phase, drawRunes, reset } = useRuneDraw();
  const [spread, setSpread] = useState(null);
  const [selectedRune, setSelectedRune] = useState(null);
  const [visibleCards, setVisibleCards] = useState([]);
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);

  useEffect(() => {
    if (phase === "revealed" && drawnRunes.length > 0) {
      drawnRunes.forEach((_, i) => {
        setTimeout(() => {
          setVisibleCards((prev) => [...prev, i]);
        }, i * 400 + 200);
      });
    }
    if (phase === "idle" || phase === "shaking") {
      setVisibleCards([]);
    }
  }, [phase, drawnRunes]);

  const handleSpreadSelect = (n) => {
    setSpread(n);
    setSelectedRune(null);
    reset();
  };

  const handleDraw = () => {
    if (!spread) return;
    setSelectedRune(null);
    drawRunes(spread);
  };

  const getMeaning = (rune) => {
    return getMeaningText(rune);
  };

  const getSpreadInsight = () => {
    if (!drawnRunes.length) return null;

    if (spread === 5 && drawnRunes.length === 5) {
      return {
        title: "5-룬 심층 운세 풀이",
        points: [
          `과거의 흐름: ${getMeaningText(drawnRunes[0])}`,
          `현재의 상태: ${getMeaningText(drawnRunes[1])}`,
          `다가올 미래: ${getMeaningText(drawnRunes[2])}`,
          `타고난 성향: ${getMeaningText(drawnRunes[3])}`,
          `조심해야 할 부분: ${getMeaningText(drawnRunes[4])}`,
        ],
      };
    }

    if (spread === 12 && drawnRunes.length === 12) {
      const reversedCount = drawnRunes.filter((rune) => rune.isReversed).length;
      const quarterLabels = ["1분기", "2분기", "3분기", "4분기"];
      const quarterSummary = [0, 1, 2, 3].map((idx) => {
        const start = idx * 3;
        const chunk = drawnRunes.slice(start, start + 3);
        const brightCount = chunk.filter((rune) => !rune.isReversed).length;
        const tone = brightCount >= 2 ? "확장과 기회" : "점검과 조율";
        return `${quarterLabels[idx]}: ${tone} 흐름`;
      });

      return {
        title: "12-룬 연간 총운",
        points: [
          `연간 키워드: ${drawnRunes.slice(0, 3).map((rune) => rune.name).join(" · ")}`,
          `전체 균형: 정방향 ${12 - reversedCount}개 / 역방향 ${reversedCount}개`,
          ...quarterSummary,
          "핵심 조언: 월별 카드의 강점은 밀고, 역방향 카드가 뜬 달은 일정·재정·관계 리스크를 미리 줄이세요.",
        ],
      };
    }

    return null;
  };

  const handleShareKakao = async () => {
    const shareTitle = "스톤헨지 룬 오라클";
    const shareText = "룬의 속삭임으로 오늘의 흐름을 확인해보세요.";
    const shareUrl = typeof window !== "undefined" ? window.location.href : "https://code-destiny-web.pages.dev/oracle/rune";

    try {
      if (navigator.share) {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
        return;
      }

      const kakaoUrl = `https://sharer.kakao.com/talk/friends/picker/link?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`${shareTitle} - ${shareText}`)}`;
      window.open(kakaoUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        window.alert("공유 링크를 복사했습니다. 카카오톡 대화창에 붙여넣어 공유해 주세요.");
      } catch {
        window.alert("공유를 열 수 없었습니다. 잠시 후 다시 시도해 주세요.");
      }
    }
  };

  const handleAddToHome = async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      try {
        await deferredInstallPrompt.userChoice;
      } catch {
        // install prompt might be dismissed; no-op
      }
      setDeferredInstallPrompt(null);
      return;
    }

    const ua = (typeof navigator !== "undefined" ? navigator.userAgent : "").toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isAndroid = /android/.test(ua);
    if (isIOS) {
      window.alert("iPhone/iPad: 브라우저 하단 공유 버튼을 누른 뒤 '홈 화면에 추가'를 선택하세요.");
      return;
    }
    if (isAndroid) {
      window.alert("Android: 브라우저 메뉴(⋮)에서 '홈 화면에 추가' 또는 '앱 설치'를 선택하세요.");
      return;
    }
    window.alert("브라우저 메뉴에서 '홈 화면에 추가' 또는 '앱 설치'를 선택해 주세요.");
  };

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredInstallPrompt(event);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const spreadInsight = getSpreadInsight();

  return (
    <>
      <style>{`
        ${GOOGLE_FONTS}

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .sr-root {
          min-height: 100vh;
          background: #030712;
          background-image:
            radial-gradient(ellipse 80% 40% at 50% -10%, rgba(30,58,138,0.45) 0%, transparent 70%),
            radial-gradient(ellipse 60% 50% at 80% 80%, rgba(88,28,135,0.25) 0%, transparent 60%),
            radial-gradient(ellipse 40% 30% at 20% 60%, rgba(15,118,110,0.12) 0%, transparent 60%);
          font-family: 'Noto Sans KR', 'Apple SD Gothic Neo', sans-serif;
          color: #e2e8f0;
          overflow-x: hidden;
          position: relative;
        }

        /* Stars */
        .sr-root::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image:
            radial-gradient(1px 1px at 20% 15%, rgba(255,255,255,0.6) 0%, transparent 100%),
            radial-gradient(1px 1px at 60% 5%, rgba(255,255,255,0.5) 0%, transparent 100%),
            radial-gradient(1.5px 1.5px at 80% 20%, rgba(255,255,255,0.7) 0%, transparent 100%),
            radial-gradient(1px 1px at 40% 35%, rgba(255,255,255,0.4) 0%, transparent 100%),
            radial-gradient(1px 1px at 10% 45%, rgba(255,255,255,0.5) 0%, transparent 100%),
            radial-gradient(1px 1px at 90% 40%, rgba(255,255,255,0.6) 0%, transparent 100%),
            radial-gradient(1.5px 1.5px at 50% 8%, rgba(255,255,255,0.8) 0%, transparent 100%),
            radial-gradient(1px 1px at 35% 55%, rgba(255,255,255,0.3) 0%, transparent 100%),
            radial-gradient(1px 1px at 75% 10%, rgba(255,255,255,0.5) 0%, transparent 100%),
            radial-gradient(1px 1px at 15% 70%, rgba(255,255,255,0.4) 0%, transparent 100%),
            radial-gradient(1.5px 1.5px at 95% 65%, rgba(255,255,255,0.6) 0%, transparent 100%),
            radial-gradient(1px 1px at 55% 90%, rgba(255,255,255,0.3) 0%, transparent 100%);
          pointer-events: none;
          z-index: 0;
        }

        /* Mist layers */
        .sr-mist {
          position: fixed;
          bottom: 0; left: 0; right: 0;
          height: 280px;
          background: linear-gradient(to top,
            rgba(15,23,42,0.9) 0%,
            rgba(30,58,138,0.15) 40%,
            transparent 100%);
          pointer-events: none;
          z-index: 1;
          animation: mistDrift 8s ease-in-out infinite alternate;
        }
        @keyframes mistDrift {
          from { opacity: 0.7; transform: translateX(-10px); }
          to   { opacity: 1;   transform: translateX(10px);  }
        }

        /* Stonehenge silhouette */
        .sr-stones {
          position: fixed;
          bottom: 0; left: 0; right: 0;
          height: 200px;
          pointer-events: none;
          z-index: 2;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          gap: 0;
          padding: 0 5%;
          opacity: 0.35;
        }
        .stone-pair {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          flex: 0 0 auto;
        }
        .stone-lintel {
          background: #1e293b;
          border-radius: 4px 4px 0 0;
          box-shadow: inset 0 -2px 8px rgba(0,0,0,0.5);
        }
        .stone-col {
          background: #1e293b;
          border-radius: 4px 4px 0 0;
          box-shadow: inset -3px 0 8px rgba(0,0,0,0.4);
        }

        .sr-content {
          position: relative;
          z-index: 10;
          max-width: 680px;
          margin: 0 auto;
          padding: 48px 20px 240px;
        }

        /* ── HEADER ── */
        .sr-header {
          text-align: center;
          margin-bottom: 52px;
        }
        .sr-header-eyebrow {
          font-family: 'Noto Sans KR', sans-serif;
          font-size: 12px;
          letter-spacing: 0.2em;
          color: #94a3b8;
          font-weight: 700;
          text-transform: uppercase;
          margin-bottom: 12px;
        }
        .sr-header-title {
          font-family: 'Cinzel Decorative', serif;
          font-size: clamp(22px, 6vw, 38px);
          font-weight: 700;
          background: linear-gradient(135deg, #e2e8f0 0%, #93c5fd 40%, #a78bfa 70%, #e2e8f0 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          line-height: 1.2;
          margin-bottom: 8px;
          text-shadow: none;
        }
        .sr-header-sub {
          font-size: 16px;
          color: #cbd5e1;
          font-weight: 500;
          letter-spacing: 0.02em;
        }

        .sr-collection-card {
          display: grid;
          grid-template-columns: 120px 1fr;
          gap: 16px;
          align-items: center;
          background: linear-gradient(140deg, rgba(12,18,44,0.9), rgba(32,16,58,0.72));
          border: 1px solid rgba(120,119,198,0.35);
          border-radius: 18px;
          padding: 14px;
          margin-bottom: 26px;
          box-shadow: 0 16px 36px rgba(2, 6, 23, 0.45);
        }
        .sr-collection-img {
          width: 100%;
          height: 96px;
          object-fit: cover;
          border-radius: 12px;
          border: 1px solid rgba(147,197,253,0.35);
        }
        .sr-collection-label {
          font-size: 12px;
          color: #93c5fd;
          letter-spacing: 0.12em;
          font-weight: 700;
          margin-bottom: 6px;
        }
        .sr-collection-title {
          font-size: 18px;
          font-weight: 800;
          color: #f8fafc;
          margin-bottom: 4px;
          line-height: 1.3;
        }
        .sr-collection-desc {
          font-size: 13px;
          color: #cbd5e1;
          line-height: 1.55;
        }
        .sr-divider {
          display: flex;
          align-items: center;
          gap: 16px;
          margin: 20px auto 0;
          max-width: 320px;
        }
        .sr-divider-line {
          flex: 1;
          height: 1px;
          background: linear-gradient(to right, transparent, rgba(99,102,241,0.5), transparent);
        }
        .sr-divider-rune {
          font-size: 18px;
          color: #6366f1;
          opacity: 0.7;
        }

        /* ── MOON ── */
        .sr-moon {
          position: fixed;
          top: 28px;
          right: clamp(20px, 8%, 80px);
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, #fef9c3, #fde68a 50%, #d97706);
          box-shadow: 0 0 24px rgba(253,230,138,0.4), 0 0 60px rgba(251,191,36,0.15);
          z-index: 3;
          animation: moonPulse 4s ease-in-out infinite;
        }
        @keyframes moonPulse {
          0%,100% { box-shadow: 0 0 24px rgba(253,230,138,0.4), 0 0 60px rgba(251,191,36,0.15); }
          50%      { box-shadow: 0 0 36px rgba(253,230,138,0.6), 0 0 90px rgba(251,191,36,0.25); }
        }

        /* ── SPREAD SELECTOR ── */
        .sr-section-label {
          font-family: 'Cinzel', serif;
          font-size: 11px;
          letter-spacing: 0.25em;
          color: #475569;
          text-transform: uppercase;
          text-align: center;
          margin-bottom: 16px;
        }
        .sr-spread-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 36px;
        }
        .sr-spread-btn {
          background: rgba(15,23,42,0.7);
          border: 1px solid rgba(99,102,241,0.25);
          border-radius: 12px;
          padding: 18px 16px;
          cursor: pointer;
          text-align: center;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }
        .sr-spread-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(99,102,241,0.08), rgba(167,139,250,0.08));
          opacity: 0;
          transition: opacity 0.3s;
        }
        .sr-spread-btn:hover::before,
        .sr-spread-btn.active::before { opacity: 1; }
        .sr-spread-btn.active {
          border-color: rgba(99,102,241,0.7);
          box-shadow: 0 0 20px rgba(99,102,241,0.2), inset 0 0 20px rgba(99,102,241,0.05);
        }
        .sr-spread-btn-rune {
          font-size: 28px;
          margin-bottom: 6px;
          display: block;
          filter: drop-shadow(0 0 8px rgba(99,102,241,0.6));
        }
        .sr-spread-btn-name {
          font-family: 'Noto Sans KR', sans-serif;
          font-size: 13px;
          color: #e2e8f0;
          font-weight: 700;
          display: block;
          margin-bottom: 4px;
        }
        .sr-spread-btn-desc {
          font-size: 12px;
          color: #94a3b8;
          line-height: 1.45;
        }

        /* ── DRAW BUTTON ── */
        .sr-draw-btn {
          width: 100%;
          padding: 18px 24px;
          background: linear-gradient(135deg, rgba(67,56,202,0.6), rgba(109,40,217,0.6));
          border: 1px solid rgba(139,92,246,0.5);
          border-radius: 14px;
          color: #e2e8f0;
          font-family: 'Noto Sans KR', sans-serif;
          font-size: 15px;
          font-weight: 800;
          letter-spacing: 0.04em;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          margin-bottom: 40px;
        }
        .sr-draw-btn::after {
          content: '';
          position: absolute;
          top: 50%; left: 50%;
          width: 0; height: 0;
          background: rgba(255,255,255,0.1);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          transition: width 0.5s, height 0.5s;
        }
        .sr-draw-btn:hover::after { width: 300px; height: 300px; }
        .sr-draw-btn:hover {
          border-color: rgba(139,92,246,0.9);
          box-shadow: 0 0 30px rgba(109,40,217,0.4), 0 0 60px rgba(109,40,217,0.15);
          transform: translateY(-1px);
        }
        .sr-draw-btn:active { transform: translateY(0); }
        .sr-draw-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        /* ── BAG ANIMATION ── */
        .sr-bag-wrap {
          text-align: center;
          margin: 24px 0 40px;
          min-height: 120px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }
        .sr-bag {
          font-size: 64px;
          display: inline-block;
          filter: drop-shadow(0 0 16px rgba(99,102,241,0.5));
        }
        .sr-bag.shaking {
          animation: bagShake 0.15s ease-in-out infinite;
        }
        @keyframes bagShake {
          0%,100% { transform: rotate(-12deg) scale(1.05); }
          50%      { transform: rotate(12deg) scale(0.95); }
        }
        .sr-bag-text {
          font-family: 'Cinzel', serif;
          font-size: 13px;
          letter-spacing: 0.15em;
          color: #6366f1;
          animation: textPulse 1s ease-in-out infinite;
        }
        @keyframes textPulse {
          0%,100% { opacity: 0.6; }
          50%      { opacity: 1; }
        }

        /* ── RUNE CARDS ── */
        .sr-cards-wrap {
          display: grid;
          gap: 20px;
          margin-bottom: 40px;
        }
        .sr-cards-wrap.count-1 { grid-template-columns: 1fr; max-width: 340px; margin-inline: auto; }
        .sr-cards-wrap.count-3 { grid-template-columns: repeat(3, 1fr); }
        .sr-cards-wrap.count-5 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .sr-cards-wrap.count-12 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        @media (max-width: 760px) {
          .sr-cards-wrap.count-12,
          .sr-cards-wrap.count-5 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 480px) {
          .sr-content { padding: 36px 16px 200px; }
          .sr-collection-card { grid-template-columns: 1fr; }
          .sr-spread-row,
          .sr-cards-wrap.count-3,
          .sr-cards-wrap.count-5,
          .sr-cards-wrap.count-12,
          .sr-cta-btns { grid-template-columns: 1fr; }
          .sr-cards-wrap.count-3,
          .sr-cards-wrap.count-5,
          .sr-cards-wrap.count-12 { max-width: 340px; margin-inline: auto; }
        }

        .sr-card {
          background: rgba(15,23,42,0.85);
          border: 1px solid rgba(99,102,241,0.2);
          border-radius: 16px;
          padding: 24px 18px;
          cursor: pointer;
          transition: all 0.4s ease;
          opacity: 0;
          transform: translateY(30px) scale(0.95);
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .sr-card.visible {
          opacity: 1;
          transform: translateY(0) scale(1);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }
        .sr-card::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: 17px;
          background: linear-gradient(135deg, rgba(99,102,241,0.0), rgba(167,139,250,0.0));
          transition: background 0.4s;
          z-index: -1;
        }
        .sr-card:hover::before,
        .sr-card.selected::before {
          background: linear-gradient(135deg, rgba(99,102,241,0.4), rgba(167,139,250,0.3));
        }
        .sr-card.selected {
          border-color: rgba(139,92,246,0.8);
          box-shadow: 0 0 30px rgba(99,102,241,0.3), 0 0 60px rgba(99,102,241,0.1);
        }

        .sr-card-position {
          font-family: 'Cinzel', serif;
          font-size: 10px;
          letter-spacing: 0.25em;
          color: #475569;
          text-transform: uppercase;
          margin-bottom: 12px;
        }
        .sr-card-stone {
          width: 72px; height: 72px;
          margin: 0 auto 12px;
          background: radial-gradient(circle at 35% 30%, #334155, #1e293b 60%, #0f172a);
          border-radius: 50%;
          border: 2px solid rgba(99,102,241,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          box-shadow: 0 4px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05);
          animation: stoneGlow 3s ease-in-out infinite;
        }
        @keyframes stoneGlow {
          0%,100% { box-shadow: 0 4px 16px rgba(0,0,0,0.5), 0 0 0 0 rgba(99,102,241,0.0), inset 0 1px 0 rgba(255,255,255,0.05); }
          50%      { box-shadow: 0 4px 16px rgba(0,0,0,0.5), 0 0 20px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.05); }
        }
        .sr-card-symbol {
          font-size: 32px;
          line-height: 1;
          filter: drop-shadow(0 0 10px rgba(147,197,253,0.8));
          animation: runeGlow 2s ease-in-out infinite;
        }
        .sr-card.reversed .sr-card-symbol { transform: rotate(180deg); display: block; }
        @keyframes runeGlow {
          0%,100% { filter: drop-shadow(0 0 6px rgba(147,197,253,0.6)); }
          50%      { filter: drop-shadow(0 0 14px rgba(147,197,253,1.0)); }
        }
        .sr-card-name {
          font-family: 'Cinzel', serif;
          font-size: 14px;
          font-weight: 500;
          color: #cbd5e1;
          margin-bottom: 4px;
        }
        .sr-card-dir {
          font-size: 11px;
          color: #6b7280;
          font-style: italic;
          margin-bottom: 0;
        }
        .sr-card-dir.rev { color: #ef4444; opacity: 0.8; }

        /* ── DETAIL PANEL ── */
        .sr-detail {
          background: rgba(15,23,42,0.9);
          border: 1px solid rgba(99,102,241,0.3);
          border-radius: 18px;
          padding: 28px 24px;
          margin-bottom: 32px;
          animation: fadeSlideIn 0.5s ease;
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .sr-detail-header {
          display: flex;
          align-items: center;
          gap: 18px;
          margin-bottom: 20px;
          padding-bottom: 18px;
          border-bottom: 1px solid rgba(99,102,241,0.15);
        }
        .sr-detail-stone {
          width: 88px; height: 88px;
          flex-shrink: 0;
          background: radial-gradient(circle at 35% 30%, #334155, #1e293b 60%, #0f172a);
          border-radius: 50%;
          border: 2px solid rgba(99,102,241,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 30px rgba(99,102,241,0.25), 0 4px 20px rgba(0,0,0,0.5);
        }
        .sr-detail-symbol {
          font-size: 42px;
          filter: drop-shadow(0 0 14px rgba(147,197,253,0.9));
        }
        .sr-detail-stone.rev .sr-detail-symbol { transform: rotate(180deg); display: block; }
        .sr-detail-info { flex: 1; }
        .sr-detail-name {
          font-family: 'Cinzel Decorative', serif;
          font-size: 22px;
          color: #e2e8f0;
          margin-bottom: 4px;
        }
        .sr-detail-dir {
          font-family: 'Cinzel', serif;
          font-size: 11px;
          letter-spacing: 0.2em;
          margin-bottom: 6px;
        }
        .sr-detail-dir.up { color: #60a5fa; }
        .sr-detail-dir.rev { color: #f87171; }
        .sr-detail-symbol-text {
          font-size: 13px;
          color: #475569;
          font-style: italic;
        }
        .sr-detail-meaning {
          font-size: 16px;
          line-height: 1.8;
          color: #cbd5e1;
          font-style: italic;
          position: relative;
          padding-left: 16px;
        }
        .sr-detail-meaning::before {
          content: '';
          position: absolute;
          left: 0; top: 4px; bottom: 4px;
          width: 2px;
          background: linear-gradient(to bottom, #6366f1, rgba(99,102,241,0));
          border-radius: 2px;
        }

        .sr-spread-insight {
          background: linear-gradient(140deg, rgba(11,20,48,0.92), rgba(29,20,58,0.82));
          border: 1px solid rgba(125, 211, 252, 0.3);
          border-radius: 18px;
          padding: 22px 20px;
          margin-bottom: 22px;
        }
        .sr-spread-insight h3 {
          font-size: 18px;
          font-weight: 800;
          color: #f8fafc;
          margin-bottom: 12px;
        }
        .sr-spread-insight ul {
          list-style: none;
          display: grid;
          gap: 8px;
        }
        .sr-spread-insight li {
          position: relative;
          padding-left: 14px;
          font-size: 14px;
          color: #dbeafe;
          line-height: 1.7;
        }
        .sr-spread-insight li::before {
          content: '•';
          position: absolute;
          left: 0;
          top: 0;
          color: #7dd3fc;
          font-weight: 800;
        }

        /* ── CTA ── */
        .sr-cta-wrap {
          background: rgba(15,23,42,0.7);
          border: 1px solid rgba(99,102,241,0.2);
          border-radius: 16px;
          padding: 24px;
          text-align: center;
          margin-bottom: 28px;
        }
        .sr-cta-title {
          font-family: 'Noto Sans KR', sans-serif;
          font-size: 13px;
          letter-spacing: 0.1em;
          color: #93c5fd;
          font-weight: 700;
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .sr-cta-desc {
          font-size: 14px;
          color: #cbd5e1;
          margin-bottom: 18px;
          line-height: 1.6;
        }
        .sr-cta-btns {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .sr-cta-btn {
          padding: 13px 10px;
          border-radius: 10px;
          font-family: 'Noto Sans KR', sans-serif;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 0.02em;
          cursor: pointer;
          transition: all 0.25s;
          border: 1px solid rgba(99,102,241,0.35);
          background: rgba(30,27,75,0.5);
          color: #a5b4fc;
        }
        .sr-cta-btn:hover {
          background: rgba(49,46,129,0.7);
          border-color: rgba(139,92,246,0.7);
          color: #c7d2fe;
          transform: translateY(-1px);
        }
        .sr-cta-btn.primary {
          background: linear-gradient(135deg, rgba(67,56,202,0.7), rgba(109,40,217,0.7));
          border-color: rgba(139,92,246,0.6);
          color: #e0e7ff;
        }
        .sr-cta-btn.primary:hover {
          box-shadow: 0 0 18px rgba(99,102,241,0.4);
        }

        /* ── RESET ── */
        .sr-reset-btn {
          width: 100%;
          padding: 12px;
          background: transparent;
          border: 1px solid rgba(51,65,85,0.5);
          border-radius: 10px;
          color: #475569;
          font-family: 'Noto Sans KR', sans-serif;
          font-size: 12px;
          letter-spacing: 0.15em;
          cursor: pointer;
          transition: all 0.25s;
        }
        .sr-reset-btn:hover { border-color: rgba(99,102,241,0.4); color: #6366f1; }

        /* ── IDLE STATE ── */
        .sr-idle-runes {
          display: flex;
          justify-content: center;
          gap: 20px;
          margin: 24px 0;
          flex-wrap: wrap;
        }
        .sr-idle-rune {
          font-size: 22px;
          color: rgba(99,102,241,0.3);
          animation: idleFloat 3s ease-in-out infinite;
          filter: drop-shadow(0 0 4px rgba(99,102,241,0.3));
        }
        .sr-idle-rune:nth-child(2) { animation-delay: 0.4s; }
        .sr-idle-rune:nth-child(3) { animation-delay: 0.8s; }
        .sr-idle-rune:nth-child(4) { animation-delay: 1.2s; }
        .sr-idle-rune:nth-child(5) { animation-delay: 1.6s; }
        @keyframes idleFloat {
          0%,100% { transform: translateY(0); opacity: 0.3; }
          50%      { transform: translateY(-6px); opacity: 0.7; }
        }

        .sr-hint-text {
          text-align: center;
          font-size: 14px;
          color: #94a3b8;
          font-weight: 500;
          margin-bottom: 24px;
        }
      `}</style>

      {/* Moon */}
      <div className="sr-moon" />

      {/* Mist */}
      <div className="sr-mist" />

      {/* Stonehenge silhouette */}
      <div className="sr-stones" aria-hidden="true">
        {[
          [60,130,160,8],[44,115,140,6],[52,125,155,8],[40,110,130,6],[56,128,160,8],[48,118,145,6],
        ].map(([w,h,capW,capH], i) => (
          <div key={i} className="stone-pair" style={{ marginRight: i % 2 === 0 ? 4 : 24 }}>
            <div className="stone-lintel" style={{ width: capW, height: capH, marginBottom: -2 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <div className="stone-col" style={{ width: (w-14)/2, height: h }} />
              <div className="stone-col" style={{ width: (w-14)/2, height: h*0.88 }} />
            </div>
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="sr-root">
        <div className="sr-content">

          {/* Header */}
          <header className="sr-header">
            <p className="sr-header-eyebrow">MYSTIC ORACLE COLLECTION</p>
            <h1 className="sr-header-title">Whispers of<br />Stonehenge</h1>
            <p className="sr-header-sub">신탁의 흐름을 읽고, 오늘의 방향을 선명하게 받아보세요</p>
            <div className="sr-divider">
              <div className="sr-divider-line" />
              <span className="sr-divider-rune">ᚠ</span>
              <div className="sr-divider-line" />
            </div>
          </header>

          <section className="sr-collection-card">
            <img
              className="sr-collection-img"
              src="/fuctionassets/rune.webp"
              alt="스톤헨지 룬 오라클"
              loading="lazy"
            />
            <div>
              <p className="sr-collection-label">신탁 & 점술 컬렉션</p>
              <p className="sr-collection-title">스톤헨지 룬 오라클</p>
              <p className="sr-collection-desc">고대 룬의 상징을 통해 현재 흐름, 성향, 연간 운세까지 단계별로 해석합니다.</p>
            </div>
          </section>

          {/* Spread selector */}
          <p className="sr-section-label">배열 선택</p>
          <div className="sr-spread-row">
            {SPREAD_OPTIONS.map((option) => (
              <button
                key={option.count}
                className={`sr-spread-btn ${spread === option.count ? "active" : ""}`}
                onClick={() => handleSpreadSelect(option.count)}
              >
                <span className="sr-spread-btn-rune">{option.rune}</span>
                <span className="sr-spread-btn-name">{option.name}</span>
                <span className="sr-spread-btn-desc">{option.desc}</span>
              </button>
            ))}
          </div>

          {/* Draw button */}
          <button
            className="sr-draw-btn"
            onClick={handleDraw}
            disabled={!spread || isDrawing}
          >
            {isDrawing ? "룬을 소환하는 중..." : spread ? "⬡  룬 주머니를 흔들어라  ⬡" : "배열을 먼저 선택하세요"}
          </button>

          {/* Bag / idle state */}
          {phase === "idle" && (
            <div className="sr-bag-wrap">
              <div className="sr-idle-runes">
                {["ᚠ","ᚢ","ᚦ","ᚨ","ᚱ"].map((r, i) => (
                  <span key={i} className="sr-idle-rune">{r}</span>
                ))}
              </div>
              <p className="sr-hint-text">
                {spread ? "이제 룬 주머니를 흔들 준비가 되었습니다" : "배열을 선택하고 운명을 물어보세요"}
              </p>
            </div>
          )}

          {(phase === "shaking" || phase === "drawing") && (
            <div className="sr-bag-wrap">
              <span className={`sr-bag ${phase === "shaking" ? "shaking" : ""}`}>🎒</span>
              <p className="sr-bag-text">
                {phase === "shaking" ? "고대의 룬들이 깨어납니다..." : "운명이 룬을 선택합니다..."}
              </p>
            </div>
          )}

          {/* Rune cards */}
          {phase === "revealed" && drawnRunes.length > 0 && (
            <>
              <div className={`sr-cards-wrap count-${drawnRunes.length}`}>
                {drawnRunes.map((rune, i) => (
                  <div
                    key={rune.id}
                    className={`sr-card ${rune.isReversed ? "reversed" : ""} ${visibleCards.includes(i) ? "visible" : ""} ${selectedRune?.id === rune.id && selectedRune?.index === i ? "selected" : ""}`}
                    onClick={() => setSelectedRune(selectedRune?.index === i ? null : { ...rune, index: i })}
                  >
                    {SPREAD_LABELS[drawnRunes.length] && (
                      <p className="sr-card-position">{SPREAD_LABELS[drawnRunes.length][i]}</p>
                    )}
                    <div className="sr-card-stone">
                      <span className="sr-card-symbol">{rune.id === "wyrd" ? "○" : rune.symbol}</span>
                    </div>
                    <p className="sr-card-name">{rune.name}</p>
                    <p className={`sr-card-dir ${rune.isReversed ? "rev" : ""}`}>
                      {rune.isReversed ? "↓ 역방향" : "↑ 정방향"}
                    </p>
                  </div>
                ))}
              </div>

              {/* Detail panel */}
              {selectedRune && (
                <div className="sr-detail">
                  <div className="sr-detail-header">
                    <div className={`sr-detail-stone ${selectedRune.isReversed ? "rev" : ""}`}>
                      <span className="sr-detail-symbol">
                        {selectedRune.id === "wyrd" ? "○" : selectedRune.symbol}
                      </span>
                    </div>
                    <div className="sr-detail-info">
                      <h2 className="sr-detail-name">{selectedRune.name}</h2>
                      <p className={`sr-detail-dir ${selectedRune.isReversed ? "rev" : "up"}`}>
                        {selectedRune.isReversed ? "↓ REVERSED · 역방향" : "↑ UPRIGHT · 정방향"}
                      </p>
                      {SPREAD_LABELS[drawnRunes.length] && (
                        <p className="sr-detail-symbol-text">{SPREAD_LABELS[drawnRunes.length][selectedRune.index]}</p>
                      )}
                    </div>
                  </div>
                  <p className="sr-detail-meaning">{getMeaning(selectedRune)}</p>
                </div>
              )}

              {spreadInsight && (
                <section className="sr-spread-insight">
                  <h3>{spreadInsight.title}</h3>
                  <ul>
                    {spreadInsight.points.map((point, idx) => (
                      <li key={idx}>{point}</li>
                    ))}
                  </ul>
                </section>
              )}

              {!selectedRune && (
                <p className="sr-hint-text" style={{ marginTop: 8 }}>
                  룬 카드를 클릭하면 상세 해석을 볼 수 있습니다
                </p>
              )}

              {/* CTA */}
              <div className="sr-cta-wrap">
                <p className="sr-cta-title">함께 나누고 바로 만나기</p>
                <p className="sr-cta-desc">룬 결과를 카카오톡으로 공유하거나 홈화면에 바로가기를 추가해 빠르게 다시 열어보세요.</p>
                <div className="sr-cta-btns">
                  <button className="sr-cta-btn primary" onClick={handleShareKakao}>카카오톡 공유하기</button>
                  <button className="sr-cta-btn" onClick={handleAddToHome}>홈화면 바로가기</button>
                </div>
              </div>

              <button className="sr-reset-btn" onClick={reset}>
                ↺ &nbsp;다시 뽑기
              </button>
            </>
          )}

        </div>
      </div>
    </>
  );
}
