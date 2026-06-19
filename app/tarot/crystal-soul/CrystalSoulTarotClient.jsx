"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Gem as GemIcon, Home, Loader2, RotateCcw, Share2, Sparkles } from "lucide-react";
import CrystalGem, { GEM_META } from "@/src/components/crystal/CrystalGem";
import { useRubInteraction } from "@/src/components/crystal/useRubInteraction";
import { useCoinGate } from "../../hooks/useCoinGate";

const CRYSTAL_COST = 50;
const FLOWER_ADMIN_TOKEN_RE = /^[A-Za-z0-9_-]{20,}\.[0-9a-f]{64}$/;
const GEM_TYPES = ["amethyst", "rose_quartz", "obsidian", "moonstone", "lapis", "citrine", "black_tourmaline"];

const POSITION_LABELS = [
  "원석의 첫 번째 빛",
  "가려진 면",
  "원석이 보내는 경고",
  "크리스탈의 처방",
  "빛이 열어줄 문",
];

function isAdminSessionClient() {
  if (typeof window === "undefined") return false;
  try {
    if (window.__cdAdminBypass) return true;
  } catch (e) {}
  try {
    const user = JSON.parse(localStorage.getItem("fortune_auth_user") || "null");
    if (String(user?.role || "").toLowerCase() === "admin") return true;
  } catch (e) {}
  try {
    const user = JSON.parse(localStorage.getItem("cd_user") || "null");
    if (String(user?.role || "").toLowerCase() === "admin") return true;
  } catch (e) {}
  try {
    const roleMatch = document.cookie.match(/(?:^|;\s*)cd_role=([^;]+)/);
    if (roleMatch && decodeURIComponent(roleMatch[1]).toLowerCase() === "admin") return true;
  } catch (e) {}
  try {
    const token = String(sessionStorage.getItem("flower_admin_token") || "");
    if (FLOWER_ADMIN_TOKEN_RE.test(token)) return true;
  } catch (e) {}
  try {
    const token = String(localStorage.getItem("flower_admin_token") || "");
    if (FLOWER_ADMIN_TOKEN_RE.test(token)) return true;
  } catch (e) {}
  return false;
}

function useBodyChrome() {
  useEffect(() => {
    document.body.classList.add("crystal-soul-active");
    return () => document.body.classList.remove("crystal-soul-active");
  }, []);
}

function useTypewriter(text, active = true, speed = 15) {
  const [visibleText, setVisibleText] = useState(active ? "" : text);

  useEffect(() => {
    const fullText = String(text || "");
    if (!active) {
      setVisibleText(fullText);
      return undefined;
    }
    setVisibleText("");
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setVisibleText(fullText.slice(0, index));
      if (index >= fullText.length) window.clearInterval(timer);
    }, speed);
    return () => window.clearInterval(timer);
  }, [active, speed, text]);

  return visibleText;
}

function TypedText({ text, className = "", speed = 15 }) {
  const visibleText = useTypewriter(text, true, speed);
  const done = visibleText.length >= String(text || "").length;

  return (
    <span className={className}>
      {visibleText}
      {!done ? <span className="crystal-type-cursor" /> : null}
    </span>
  );
}

function GemSelectScreen({ selectedGem, onSelect }) {
  return (
    <section className="crystal-screen crystal-screen--select">
      <div className="crystal-title-row">
        <GemIcon size={25} strokeWidth={1.8} />
        <h1>원석 소울 타로</h1>
      </div>
      <p className="crystal-subtitle">손이 멈추는 원석이 오늘의 기운입니다</p>

      <div className="gem-grid" aria-label="원석 선택">
        {GEM_TYPES.map((type) => {
          const meta = GEM_META[type];
          const selected = selectedGem === type;
          return (
            <button
              key={type}
              type="button"
              className={`gem-card ${selected ? "selected" : ""}`}
              onClick={() => onSelect(type)}
              aria-pressed={selected}
            >
              <CrystalGem type={type} size="min(116px, 24vw)" compact state={selected ? "activated" : "idle"} />
              <span className="gem-card__name">{meta.name}</span>
              <span className="gem-card__keywords">{meta.keywords}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function GemRubScreen({ gemType, onBack, onRevealed }) {
  const meta = GEM_META[gemType];
  const handleActivated = useCallback(() => {
    window.setTimeout(onRevealed, 820);
  }, [onRevealed]);
  const { progress, rubState, handlers } = useRubInteraction({ threshold: 200, onActivated: handleActivated });

  return (
    <section className="crystal-screen crystal-screen--rub">
      <button type="button" className="crystal-text-button" onClick={onBack}>
        원석 다시 고르기
      </button>
      <p className="rub-kicker">✦ {meta.name}이 선택되었습니다 ✦</p>
      <div className="rub-stage" {...handlers}>
        <CrystalGem type={gemType} size="min(280px, 70vw)" state={rubState} progress={progress} />
      </div>
      <div className="rub-progress" aria-label={`문지르기 진행률 ${Math.round(progress)}%`}>
        <span style={{ width: `${progress}%` }} />
      </div>
      <div className="rub-progress-label">{Math.round(progress)}%</div>
      <p className="rub-hint">원석에 손을 얹고 천천히 문질러 주세요</p>
      <p className="rub-hint rub-hint--sub">당신의 에너지가 카드를 깨웁니다</p>
    </section>
  );
}

function ReaderBubble({ gemType, text, children }) {
  return (
    <article className="reader-bubble">
      <div className="reader-bubble__mark">
        <CrystalGem type={gemType} size={34} compact state="revealed" />
      </div>
      <p>{text ? <TypedText text={text} /> : children}</p>
    </article>
  );
}

function TarotReaderChat({ gemType, reading, loading, paying, error, onStart }) {
  const meta = GEM_META[gemType];
  const intro = reading?.intro || meta.energy + " 질문을 마음속에 담고 카드를 한 장씩 열어 주세요.";

  return (
    <section className="crystal-screen crystal-screen--reader">
      <div className="reader-gem-pin">
        <CrystalGem type={gemType} size={58} compact state="revealed" />
        <span>{meta.name}</span>
      </div>

      <ReaderBubble gemType={gemType} text={intro} />

      {!reading ? (
        <div className="reader-pay-panel">
          <button type="button" className="crystal-primary-button" onClick={onStart} disabled={loading || paying}>
            {loading || paying ? <Loader2 size={18} className="spin" /> : <Sparkles size={18} />}
            {loading || paying ? "카드의 빛을 여는 중" : `카드 리딩 열기 (${CRYSTAL_COST}코인)`}
          </button>
          {error ? <p className="crystal-error">{error}</p> : null}
        </div>
      ) : null}
    </section>
  );
}

function CardSpread({ gemType, reading, openedCards, onOpenCard }) {
  return (
    <section className="card-spread-section" aria-label="5장 원석 타로 스프레드">
      <div className="card-spread">
        {reading.cards.map((card, index) => {
          const opened = openedCards.includes(index);
          return (
            <article key={`${card.card_id}-${index}`} className={`spread-item ${opened ? "is-open" : ""}`}>
              <button type="button" className="tarot-card" onClick={() => onOpenCard(index)} aria-pressed={opened}>
                <span className="tarot-card__inner">
                  <span className="tarot-card__back">
                    <span className="tarot-card__star">✦</span>
                    <span>{GEM_META[gemType].initial}</span>
                  </span>
                  <span className="tarot-card__front">
                    <img
                      src={card.imageUrl}
                      alt={`${card.card_name} ${card.direction}`}
                      className={card.orientation === "reversed" ? "is-reversed" : ""}
                      loading="lazy"
                    />
                  </span>
                </span>
                {opened ? (
                  <span className="card-particles" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                ) : null}
              </button>
              <div className="spread-item__label">
                <strong>{index + 1}</strong>
                <span>{card.pos_name}</span>
              </div>
              {opened ? <CardReadingBubble gemType={gemType} card={card} /> : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function CardReadingBubble({ gemType, card }) {
  return (
    <article className="card-reading-bubble">
      <header>
        <CrystalGem type={gemType} size={28} compact state="revealed" />
        <span>포지션 {card.pos_id} · {card.pos_name}</span>
      </header>
      <div className="card-reading-bubble__card">
        <img src={card.imageUrl} alt={card.card_name} className={card.orientation === "reversed" ? "is-reversed" : ""} loading="lazy" />
        <div>
          <strong>{card.card_name}</strong>
          <span>{card.direction}</span>
        </div>
      </div>
      <p><TypedText text={card.reading} speed={13} /></p>
      <b>{card.one_line}</b>
    </article>
  );
}

function ReadingResult({ gemType, reading, onRetry, onHome }) {
  const meta = GEM_META[gemType];

  const onShare = useCallback(async () => {
    const text = `${meta.name} 원석 소울 타로\n${reading.synthesis.gem_message}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "원석 소울 타로", text, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(`${text}\n${window.location.href}`);
      }
    } catch (e) {}
  }, [meta.name, reading.synthesis.gem_message]);

  return (
    <section className="reading-result">
      <header className="reading-result__sticky">
        <CrystalGem type={gemType} size={38} compact state="revealed" />
        <span>원석 소울 타로 결과</span>
      </header>

      <div className="reading-result__body">
        <h2>✦ {meta.name}이 전하는 오늘의 메시지</h2>
        <article className="synthesis-panel">
          <p>{reading.synthesis.body}</p>
          <div className="gem-message">{reading.synthesis.gem_message}</div>
        </article>

        <div className="result-divider">카드별 상세 해석</div>
        <div className="result-card-list">
          {reading.cards.map((card) => (
            <article key={`result-${card.pos_id}-${card.card_id}`} className="result-card">
              <img src={card.imageUrl} alt={card.card_name} className={card.orientation === "reversed" ? "is-reversed" : ""} loading="lazy" />
              <div>
                <span>{card.pos_name}</span>
                <h3>{card.card_name} · {card.direction}</h3>
                <p>{card.reading}</p>
                <b>{card.one_line}</b>
              </div>
            </article>
          ))}
        </div>
      </div>

      <footer className="result-actions">
        <button type="button" onClick={onShare}><Share2 size={17} />공유</button>
        <button type="button" onClick={onRetry}><RotateCcw size={17} />다시 뽑기</button>
        <button type="button" onClick={onHome}><Home size={17} />홈</button>
      </footer>
    </section>
  );
}

function normalizeReadingPayload(data) {
  const reading = data?.readingData && Array.isArray(data.readingData.cards) ? data.readingData : null;
  if (!reading || reading.cards.length !== 5 || !reading.synthesis) return null;
  return reading;
}

export default function CrystalSoulTarotClient() {
  useBodyChrome();
  const { ensurePaidAccess, isPaying } = useCoinGate();
  const [stage, setStage] = useState("select");
  const [selectedGem, setSelectedGem] = useState("amethyst");
  const [reading, setReading] = useState(null);
  const [openedCards, setOpenedCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  const activeGemStyle = useMemo(() => ({ "--active-gem": reading?.gem_color || "#a78bfa" }), [reading?.gem_color]);

  const resetForGem = useCallback((gemType) => {
    setSelectedGem(gemType);
    setReading(null);
    setOpenedCards([]);
    setError("");
    setStage("rub");
  }, []);

  const requestReading = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/tarot/crystal-soul", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          crystalSoulVersion: "gem-v3",
          gem: { id: selectedGem, name: GEM_META[selectedGem].name },
          positions: POSITION_LABELS,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) throw new Error(data?.message || "reading failed");
      const normalized = normalizeReadingPayload(data);
      if (!normalized) throw new Error("reading payload invalid");
      setReading(normalized);
      setOpenedCards([]);
      setStage("reader");
    } catch (e) {
      setError("카드의 빛을 여는 데 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }, [selectedGem]);

  const startPaidReading = useCallback(async () => {
    if (loading || paying || isPaying) return;
    setPaying(true);
    setError("");

    if (isAdminSessionClient()) {
      await requestReading();
      setPaying(false);
      return;
    }

    try {
      const result = await ensurePaidAccess({
        featureKey: "tarot-crystal-soul-reading",
        reason: "크리스탈 소울 타로 리딩",
        forceDeduct: true,
        requestId: `tarot-crystal-soul-reading:req:${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        onPaid: requestReading,
      });

      if (!result.ok) {
        if (result.code === "AUTH_REQUIRED") {
          setError("로그인이 필요합니다. 로그인 화면으로 이동합니다.");
          window.setTimeout(() => {
            window.location.href = "/login?next=%2Ftarot%2Fcrystal-soul";
          }, 600);
          return;
        }
        setError(result.message || "결제를 완료하지 못했습니다.");
      }
    } catch (e) {
      setError("리딩을 여는 과정에서 오류가 발생했습니다.");
    } finally {
      setPaying(false);
    }
  }, [ensurePaidAccess, isPaying, loading, paying, requestReading]);

  const openCard = useCallback((index) => {
    setOpenedCards((current) => current.includes(index) ? current : [...current, index]);
  }, []);

  const resetAll = useCallback(() => {
    setReading(null);
    setOpenedCards([]);
    setError("");
    setLoading(false);
    setPaying(false);
    setStage("select");
  }, []);

  const allRevealed = reading && openedCards.length === 5;

  return (
    <main className="crystal-soul-shell" style={activeGemStyle}>
      <div className="crystal-soul-orbit" aria-hidden="true" />

      {stage === "select" ? (
        <GemSelectScreen selectedGem={selectedGem} onSelect={resetForGem} />
      ) : null}

      {stage === "rub" ? (
        <GemRubScreen
          gemType={selectedGem}
          onBack={() => setStage("select")}
          onRevealed={() => setStage("reader")}
        />
      ) : null}

      {stage === "reader" ? (
        <>
          <TarotReaderChat
            gemType={selectedGem}
            reading={reading}
            loading={loading}
            paying={paying || isPaying}
            error={error}
            onStart={startPaidReading}
          />
          {reading ? <CardSpread gemType={selectedGem} reading={reading} openedCards={openedCards} onOpenCard={openCard} /> : null}
          {allRevealed ? <ReadingResult gemType={selectedGem} reading={reading} onRetry={resetAll} onHome={() => { window.location.href = "/"; }} /> : null}
        </>
      ) : null}

      <style jsx global>{`
        body.crystal-soul-active {
          background: #0a0818;
        }

        body.crystal-soul-active > header,
        body.crystal-soul-active > footer {
          display: none !important;
        }

        .crystal-soul-shell {
          --text-main: #e2e0f0;
          --text-soft: rgba(226, 224, 240, 0.68);
          --line: rgba(167, 139, 250, 0.18);
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          color: var(--text-main);
          background:
            radial-gradient(circle at 50% -10%, color-mix(in srgb, var(--active-gem), transparent 72%), transparent 35%),
            linear-gradient(180deg, #0a0818 0%, #0f0c1e 52%, #13102a 100%);
          font-family: Pretendard, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          padding: 24px 16px 92px;
        }

        .crystal-soul-shell * {
          box-sizing: border-box;
        }

        .crystal-soul-orbit {
          position: fixed;
          inset: 0;
          pointer-events: none;
          opacity: 0.38;
          background-image:
            radial-gradient(circle at 12% 24%, rgba(226,224,240,0.42) 0 1px, transparent 1.8px),
            radial-gradient(circle at 78% 18%, rgba(196,181,253,0.48) 0 1.2px, transparent 2px),
            radial-gradient(circle at 44% 82%, rgba(167,139,250,0.34) 0 1px, transparent 1.8px);
          background-size: 108px 108px, 154px 154px, 188px 188px;
        }

        .crystal-screen {
          width: min(960px, 100%);
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        .crystal-screen--select,
        .crystal-screen--rub,
        .crystal-screen--reader {
          min-height: calc(100vh - 116px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .crystal-title-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          color: #c4b5fd;
        }

        .crystal-title-row h1 {
          margin: 0;
          font-family: "Noto Serif KR", serif;
          font-size: clamp(30px, 8vw, 52px);
          font-weight: 700;
          letter-spacing: 0;
        }

        .crystal-subtitle {
          margin: 10px 0 30px;
          color: rgba(226, 224, 240, 0.62);
          font-family: "Noto Serif KR", serif;
          font-size: 16px;
        }

        .gem-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          width: min(780px, 100%);
        }

        .gem-card {
          min-height: 198px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          border: 1px solid rgba(167, 139, 250, 0.15);
          border-radius: 16px;
          padding: 20px 14px;
          background: rgba(167, 139, 250, 0.05);
          color: var(--text-main);
          cursor: pointer;
          transition: background 0.3s ease, border-color 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease;
        }

        .gem-card:hover {
          background: rgba(167, 139, 250, 0.1);
          border-color: rgba(167, 139, 250, 0.4);
          transform: translateY(-4px);
          box-shadow: 0 8px 32px rgba(167, 139, 250, 0.2);
        }

        .gem-card.selected {
          background: rgba(167, 139, 250, 0.15);
          border-color: #a78bfa;
          box-shadow: 0 0 24px rgba(167, 139, 250, 0.35);
        }

        .gem-card__name {
          font-family: "Noto Serif KR", serif;
          font-size: 17px;
          font-weight: 700;
        }

        .gem-card__keywords {
          min-height: 32px;
          display: flex;
          align-items: center;
          color: rgba(226, 224, 240, 0.62);
          font-size: 12px;
          line-height: 1.45;
          text-align: center;
        }

        .crystal-text-button {
          position: absolute;
          top: 18px;
          left: 0;
          border: 1px solid rgba(196, 181, 253, 0.24);
          border-radius: 999px;
          background: rgba(15, 12, 30, 0.62);
          color: #c4b5fd;
          padding: 9px 13px;
          font-size: 13px;
          cursor: pointer;
        }

        .rub-kicker {
          margin: 0 0 28px;
          color: #c4b5fd;
          font-family: "Noto Serif KR", serif;
          font-size: clamp(20px, 5vw, 30px);
        }

        .rub-stage {
          width: min(320px, 78vw);
          height: min(320px, 78vw);
          display: grid;
          place-items: center;
          touch-action: none;
          cursor: grab;
        }

        .rub-progress {
          width: min(420px, 82vw);
          height: 8px;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(226, 224, 240, 0.1);
          margin-top: 28px;
        }

        .rub-progress span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, rgba(196,181,253,0.72), var(--active-gem));
          box-shadow: 0 0 18px var(--active-gem);
          transition: width 0.12s ease;
        }

        .rub-progress-label {
          margin-top: 8px;
          color: #c4b5fd;
          font-size: 13px;
        }

        .rub-hint {
          margin: 22px 0 0;
          color: rgba(226, 224, 240, 0.78);
          font-family: "Noto Serif KR", serif;
          animation: crystalHintPulse 0.8s ease-in-out infinite alternate;
        }

        .rub-hint--sub {
          margin-top: 6px;
          color: rgba(226, 224, 240, 0.52);
          font-size: 14px;
        }

        .reader-gem-pin {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 24px;
          color: #c4b5fd;
          font-family: "Noto Serif KR", serif;
        }

        .reader-bubble {
          width: min(620px, 100%);
          border: 1px solid rgba(167, 139, 250, 0.25);
          border-left: 3px solid var(--active-gem);
          border-radius: 14px;
          background: rgba(167, 139, 250, 0.08);
          padding: 22px 22px 22px 20px;
          display: grid;
          grid-template-columns: 42px 1fr;
          gap: 14px;
          box-shadow: 0 18px 54px rgba(0,0,0,0.22);
        }

        .reader-bubble p {
          margin: 0;
          min-height: 116px;
          color: #e2e0f0;
          font-family: "Noto Serif KR", serif;
          font-size: 17px;
          line-height: 1.85;
        }

        .reader-pay-panel {
          margin-top: 22px;
          display: grid;
          justify-items: center;
          gap: 12px;
        }

        .crystal-primary-button,
        .result-actions button {
          min-height: 44px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 1px solid rgba(196, 181, 253, 0.32);
          border-radius: 999px;
          background: rgba(167, 139, 250, 0.16);
          color: #e2e0f0;
          padding: 11px 18px;
          font-weight: 700;
          cursor: pointer;
          transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
        }

        .crystal-primary-button:hover,
        .result-actions button:hover {
          transform: translateY(-2px);
          border-color: rgba(196, 181, 253, 0.58);
          background: rgba(167, 139, 250, 0.24);
        }

        .crystal-primary-button:disabled {
          cursor: wait;
          opacity: 0.64;
          transform: none;
        }

        .spin {
          animation: crystalSpin 0.9s linear infinite;
        }

        .crystal-error {
          margin: 0;
          color: #fca5a5;
          font-size: 13px;
        }

        .card-spread-section {
          width: min(1020px, 100%);
          margin: -42px auto 0;
          position: relative;
          z-index: 2;
          animation: crystalSlideUp 0.5s ease both;
        }

        .card-spread {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 14px;
          align-items: start;
        }

        .spread-item {
          display: grid;
          justify-items: center;
          gap: 10px;
          min-width: 0;
        }

        .tarot-card {
          width: 100px;
          height: 160px;
          position: relative;
          border: 0;
          padding: 0;
          background: transparent;
          perspective: 900px;
          cursor: pointer;
        }

        .tarot-card__inner {
          position: absolute;
          inset: 0;
          transform-style: preserve-3d;
          transition: transform 0.6s ease;
        }

        .spread-item.is-open .tarot-card__inner {
          transform: rotateY(180deg);
        }

        .tarot-card__back,
        .tarot-card__front {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          backface-visibility: hidden;
          overflow: hidden;
        }

        .tarot-card__back {
          border: 1px solid rgba(167, 139, 250, 0.3);
          background:
            radial-gradient(circle at 50% 38%, color-mix(in srgb, var(--active-gem), transparent 58%), transparent 34%),
            #0f0c1e;
          color: #c4b5fd;
          flex-direction: column;
          gap: 8px;
          font-family: "Noto Serif KR", serif;
          font-size: 19px;
        }

        .tarot-card__star {
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          color: var(--active-gem);
          font-size: 32px;
          filter: drop-shadow(0 0 12px var(--active-gem));
        }

        .tarot-card__front {
          transform: rotateY(180deg);
          border: 1px solid rgba(226, 224, 240, 0.16);
          background: #0f0c1e;
        }

        .tarot-card__front img,
        .card-reading-bubble__card img,
        .result-card img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        img.is-reversed {
          transform: rotateZ(180deg);
        }

        .card-particles {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .card-particles i {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 5px;
          height: 5px;
          border-radius: 999px;
          background: var(--active-gem);
          box-shadow: 0 0 10px var(--active-gem);
          animation: cardParticle 0.62s ease-out both;
        }

        .card-particles i:nth-child(2) {
          animation-delay: 0.06s;
          transform: rotate(120deg);
        }

        .card-particles i:nth-child(3) {
          animation-delay: 0.1s;
          transform: rotate(240deg);
        }

        .spread-item__label {
          min-height: 48px;
          display: grid;
          justify-items: center;
          gap: 4px;
          text-align: center;
          color: rgba(226, 224, 240, 0.72);
          font-size: 12px;
          line-height: 1.3;
        }

        .spread-item__label strong {
          width: 22px;
          height: 22px;
          display: grid;
          place-items: center;
          border-radius: 999px;
          border: 1px solid rgba(196, 181, 253, 0.24);
          color: #c4b5fd;
          font-size: 11px;
        }

        .card-reading-bubble {
          width: min(320px, 92vw);
          border: 1px solid rgba(167, 139, 250, 0.22);
          border-left: 3px solid var(--active-gem);
          border-radius: 14px;
          background: rgba(15, 12, 30, 0.86);
          backdrop-filter: blur(14px);
          padding: 14px;
          animation: crystalSlideDown 0.34s ease both;
        }

        .card-reading-bubble header,
        .card-reading-bubble__card {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .card-reading-bubble header {
          color: #c4b5fd;
          font-size: 12px;
          margin-bottom: 12px;
        }

        .card-reading-bubble__card {
          border-top: 1px solid rgba(167, 139, 250, 0.16);
          border-bottom: 1px solid rgba(167, 139, 250, 0.16);
          padding: 11px 0;
          margin-bottom: 11px;
        }

        .card-reading-bubble__card img {
          width: 46px;
          height: 70px;
          border-radius: 8px;
        }

        .card-reading-bubble__card strong {
          display: block;
          font-family: "Noto Serif KR", serif;
          font-size: 15px;
          margin-bottom: 4px;
        }

        .card-reading-bubble__card span {
          color: rgba(226, 224, 240, 0.62);
          font-size: 12px;
        }

        .card-reading-bubble p {
          margin: 0;
          min-height: 154px;
          color: #e2e0f0;
          font-family: "Noto Serif KR", serif;
          font-size: 14px;
          line-height: 1.8;
        }

        .card-reading-bubble b {
          display: block;
          margin-top: 10px;
          color: #c4b5fd;
          font-size: 12px;
          line-height: 1.5;
        }

        .reading-result {
          width: min(920px, 100%);
          margin: 34px auto 0;
          position: relative;
          z-index: 2;
          animation: crystalSlideUp 0.52s ease both;
        }

        .reading-result__sticky {
          position: sticky;
          top: 0;
          z-index: 4;
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 58px;
          border-bottom: 1px solid rgba(167, 139, 250, 0.18);
          background: rgba(10, 8, 24, 0.88);
          backdrop-filter: blur(16px);
          color: #e2e0f0;
          font-family: "Noto Serif KR", serif;
        }

        .reading-result__body {
          padding-top: 22px;
        }

        .reading-result h2 {
          margin: 0 0 16px;
          color: #c4b5fd;
          font-family: "Noto Serif KR", serif;
          font-size: clamp(22px, 5vw, 32px);
          letter-spacing: 0;
        }

        .synthesis-panel {
          border: 1px solid rgba(167, 139, 250, 0.22);
          border-radius: 14px;
          background: rgba(167, 139, 250, 0.07);
          padding: 20px;
        }

        .synthesis-panel p,
        .result-card p {
          margin: 0;
          color: #e2e0f0;
          font-family: "Noto Serif KR", serif;
          font-size: 16px;
          line-height: 1.9;
        }

        .gem-message {
          margin-top: 18px;
          border-left: 3px solid var(--active-gem);
          border-radius: 10px;
          background: rgba(15, 12, 30, 0.72);
          color: #c4b5fd;
          padding: 14px 16px;
          font-family: "Noto Serif KR", serif;
          line-height: 1.75;
        }

        .result-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 30px 0 16px;
          color: rgba(226, 224, 240, 0.62);
          font-size: 13px;
        }

        .result-divider::before,
        .result-divider::after {
          content: "";
          height: 1px;
          flex: 1;
          background: rgba(167, 139, 250, 0.18);
        }

        .result-card-list {
          display: grid;
          gap: 14px;
        }

        .result-card {
          display: grid;
          grid-template-columns: 84px 1fr;
          gap: 14px;
          border: 1px solid rgba(167, 139, 250, 0.18);
          border-radius: 14px;
          background: rgba(15, 12, 30, 0.62);
          padding: 14px;
        }

        .result-card img {
          width: 84px;
          height: 132px;
          border-radius: 10px;
        }

        .result-card span {
          color: #c4b5fd;
          font-size: 12px;
        }

        .result-card h3 {
          margin: 5px 0 8px;
          font-family: "Noto Serif KR", serif;
          font-size: 18px;
          letter-spacing: 0;
        }

        .result-card b {
          display: block;
          margin-top: 9px;
          color: #c4b5fd;
          font-size: 13px;
        }

        .result-actions {
          position: sticky;
          bottom: 14px;
          display: flex;
          justify-content: center;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 24px;
          padding: 10px;
          border: 1px solid rgba(167, 139, 250, 0.16);
          border-radius: 999px;
          background: rgba(10, 8, 24, 0.78);
          backdrop-filter: blur(16px);
        }

        .result-actions button {
          min-height: 40px;
          padding: 9px 14px;
          font-size: 13px;
        }

        .crystal-type-cursor {
          display: inline-block;
          width: 1px;
          height: 1.1em;
          margin-left: 2px;
          background: #c4b5fd;
          vertical-align: -0.15em;
          animation: blink 0.8s step-end infinite;
        }

        @keyframes gemFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }

        @keyframes gemGlow {
          0%, 100% { filter: drop-shadow(0 0 8px var(--gem-color)); }
          50% { filter: drop-shadow(0 0 20px var(--gem-color)); }
        }

        @keyframes gemRub {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px); }
          75% { transform: translateX(2px); }
        }

        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 1; transform: scale(1); }
        }

        @keyframes cardFlip {
          0% { transform: rotateY(0); }
          100% { transform: rotateY(180deg); }
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        @keyframes crystalHintPulse {
          from { opacity: 0.5; }
          to { opacity: 0.88; }
        }

        @keyframes crystalSpin {
          to { transform: rotate(360deg); }
        }

        @keyframes crystalSlideUp {
          from { opacity: 0; transform: translateY(28px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes crystalSlideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes cardParticle {
          0% { opacity: 1; transform: translate(-50%, -50%) rotate(0deg) translateX(0) scale(0.6); }
          100% { opacity: 0; transform: translate(-50%, -50%) rotate(120deg) translateX(42px) scale(1.1); }
        }

        @media (max-width: 740px) {
          .crystal-soul-shell {
            padding-inline: 12px;
          }

          .gem-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .gem-card {
            min-height: 176px;
            padding: 16px 10px;
          }

          .gem-card:last-child {
            grid-column: 1 / -1;
            width: min(220px, 100%);
            justify-self: center;
          }

          .card-spread {
            grid-template-columns: repeat(6, minmax(0, 1fr));
          }

          .spread-item {
            grid-column: span 2;
          }

          .spread-item:nth-child(4) {
            grid-column: 2 / span 2;
          }

          .spread-item:nth-child(5) {
            grid-column: 4 / span 2;
          }

          .tarot-card {
            width: 80px;
            height: 128px;
          }

          .card-reading-bubble {
            width: min(290px, 94vw);
          }

          .result-card {
            grid-template-columns: 72px 1fr;
          }

          .result-card img {
            width: 72px;
            height: 112px;
          }
        }

        @media (max-width: 430px) {
          .gem-grid {
            gap: 10px;
          }

          .gem-card__keywords {
            font-size: 11px;
          }

          .reader-bubble {
            grid-template-columns: 1fr;
          }

          .reader-bubble__mark {
            display: none;
          }

          .reader-bubble p {
            min-height: 154px;
            font-size: 16px;
          }

          .result-actions {
            border-radius: 18px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            scroll-behavior: auto !important;
          }
        }
      `}</style>
    </main>
  );
}
