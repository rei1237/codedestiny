"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

declare global {
  interface Window {
    openTarotReunionModal?: () => void;
  }
}

const REUNION_STYLE_HREF = "/styles/tarot-reunion-lighthouse.css";

const TAROT_REUNION_COPY: Record<LoadingLocale, {
  closeLabel: string;
  title: string;
  subtitle: string;
  meditationAria: string;
  meditationButton: string;
  invoke: string;
  drawHeader: string;
  spreadGuide: string;
  finalReading: string;
  resultTitle: string;
  share: string;
  reset: string;
  home: string;
}> = {
  ko: {
    closeLabel: "재회운 타로 닫기",
    title: "그 사람과의 인연은 끝났을까?",
    subtitle: "깊은 밤바다의 등대처럼, 당신의 그리움을 다정하게 비추는 재회운 5카드 스프레드입니다. 조급한 단정보다 따뜻한 통찰로 다음 길을 찾도록 도와드립니다.",
    meditationAria: "밤바다 명상",
    meditationButton: "🧘 밤바다 명상 시작",
    invoke: "🕯️ 재회의 등대 카드 펼치기",
    drawHeader: "카드를 1번부터 5번까지 순서대로 열어 감정의 흐름을 따라가세요",
    spreadGuide: "첫 번째 카드를 뒤집어 주세요.",
    finalReading: "✨ 등대의 해석 보기",
    resultTitle: "🌌 재회운 5카드 리딩 결과",
    share: "💬 카카오톡 공유하기",
    reset: "🔄 다시 리딩하기",
    home: "🏠 홈화면 바로가기",
  },
  en: {
    closeLabel: "Close reunion tarot",
    title: "Has this bond truly ended?",
    subtitle: "A five-card reunion spread that lights your longing like a lighthouse over the midnight sea, helping you find the next path with warmth instead of urgency.",
    meditationAria: "Night sea meditation",
    meditationButton: "🧘 Start night sea meditation",
    invoke: "🕯️ Open the lighthouse reunion cards",
    drawHeader: "Open cards 1 through 5 in order and follow the emotional tide.",
    spreadGuide: "Turn over the first card.",
    finalReading: "✨ View the lighthouse reading",
    resultTitle: "🌌 Reunion five-card reading",
    share: "💬 Share on KakaoTalk",
    reset: "🔄 Read again",
    home: "🏠 Go to home",
  },
  ja: {
    closeLabel: "復縁タロットを閉じる",
    title: "あの人との縁は、もう終わったのでしょうか？",
    subtitle: "深い夜の海を照らす灯台のように、あなたの想いをやさしく映す復縁5カードスプレッドです。焦った結論ではなく、温かな洞察で次の道を探します。",
    meditationAria: "夜の海の瞑想",
    meditationButton: "🧘 夜の海の瞑想を始める",
    invoke: "🕯️ 復縁の灯台カードを開く",
    drawHeader: "1枚目から5枚目まで順に開き、感情の流れをたどってください",
    spreadGuide: "最初のカードをめくってください。",
    finalReading: "✨ 灯台の読み解きを見る",
    resultTitle: "🌌 復縁5カードリーディング結果",
    share: "💬 KakaoTalkで共有",
    reset: "🔄 もう一度リーディング",
    home: "🏠 ホームへ戻る",
  },
  "zh-CN": {
    closeLabel: "关闭复合塔罗",
    title: "和那个人的缘分真的结束了吗？",
    subtitle: "这是一组如深夜海面灯塔般温柔照亮思念的复合五张牌牌阵，帮助你放下急切判断，用更温暖的洞察寻找下一条路。",
    meditationAria: "夜海冥想",
    meditationButton: "🧘 开始夜海冥想",
    invoke: "🕯️ 展开复合灯塔牌",
    drawHeader: "请按1到5的顺序翻开卡牌，跟随情绪的流向。",
    spreadGuide: "请翻开第一张牌。",
    finalReading: "✨ 查看灯塔解读",
    resultTitle: "🌌 复合五张牌解读结果",
    share: "💬 分享到 KakaoTalk",
    reset: "🔄 重新解读",
    home: "🏠 返回首页",
  },
  "zh-TW": {
    closeLabel: "關閉復合塔羅",
    title: "和那個人的緣分真的結束了嗎？",
    subtitle: "這是一組如深夜海面燈塔般溫柔照亮思念的復合五張牌牌陣，幫助你放下急切判斷，用更溫暖的洞察尋找下一條路。",
    meditationAria: "夜海冥想",
    meditationButton: "🧘 開始夜海冥想",
    invoke: "🕯️ 展開復合燈塔牌",
    drawHeader: "請按1到5的順序翻開卡牌，跟隨情緒的流向。",
    spreadGuide: "請翻開第一張牌。",
    finalReading: "✨ 查看燈塔解讀",
    resultTitle: "🌌 復合五張牌解讀結果",
    share: "💬 分享到 KakaoTalk",
    reset: "🔄 重新解讀",
    home: "🏠 返回首頁",
  },
  vi: {
    closeLabel: "Đóng tarot tái hợp",
    title: "Mối duyên với người ấy đã thật sự kết thúc chưa?",
    subtitle: "Trải bài tái hợp 5 lá soi nỗi nhớ của bạn như ngọn hải đăng giữa biển đêm, giúp bạn tìm lối đi tiếp theo bằng sự thấu hiểu dịu dàng.",
    meditationAria: "Thiền biển đêm",
    meditationButton: "🧘 Bắt đầu thiền biển đêm",
    invoke: "🕯️ Mở những lá bài hải đăng tái hợp",
    drawHeader: "Hãy mở lần lượt từ lá 1 đến lá 5 và đi theo dòng cảm xúc.",
    spreadGuide: "Hãy lật lá bài đầu tiên.",
    finalReading: "✨ Xem lời giải của hải đăng",
    resultTitle: "🌌 Kết quả trải bài tái hợp 5 lá",
    share: "💬 Chia sẻ KakaoTalk",
    reset: "🔄 Trải lại",
    home: "🏠 Về trang chủ",
  },
  hi: {
    closeLabel: "रीयूनियन टैरो बंद करें",
    title: "क्या उस व्यक्ति से जुड़ा रिश्ता सचमुच समाप्त हो गया है?",
    subtitle: "रात के गहरे समुद्र में प्रकाशस्तंभ की तरह यह पाँच-कार्ड रीयूनियन स्प्रेड आपकी चाहत को नरमी से रोशन करता है और जल्दबाज़ निष्कर्ष के बजाय शांत समझ से अगला रास्ता दिखाता है.",
    meditationAria: "रात के समुद्र का ध्यान",
    meditationButton: "🧘 रात के समुद्र का ध्यान शुरू करें",
    invoke: "🕯️ रीयूनियन लाइटहाउस कार्ड खोलें",
    drawHeader: "कार्ड 1 से 5 तक क्रम से खोलें और भावनाओं की धारा का अनुसरण करें.",
    spreadGuide: "पहला कार्ड पलटें.",
    finalReading: "✨ लाइटहाउस व्याख्या देखें",
    resultTitle: "🌌 पाँच-कार्ड रीयूनियन रीडिंग परिणाम",
    share: "💬 KakaoTalk पर साझा करें",
    reset: "🔄 फिर से रीडिंग",
    home: "🏠 होम पर जाएँ",
  },
  es: {
    closeLabel: "Cerrar tarot de reencuentro",
    title: "¿El vínculo con esa persona realmente terminó?",
    subtitle: "Una tirada de reencuentro de cinco cartas que ilumina tu añoranza como un faro en el mar nocturno, para encontrar el siguiente paso con calidez y no con prisa.",
    meditationAria: "Meditación del mar nocturno",
    meditationButton: "🧘 Iniciar meditación del mar nocturno",
    invoke: "🕯️ Abrir las cartas faro del reencuentro",
    drawHeader: "Abre las cartas del 1 al 5 en orden y sigue la corriente emocional.",
    spreadGuide: "Da vuelta la primera carta.",
    finalReading: "✨ Ver la lectura del faro",
    resultTitle: "🌌 Resultado de la tirada de reencuentro de 5 cartas",
    share: "💬 Compartir en KakaoTalk",
    reset: "🔄 Leer de nuevo",
    home: "🏠 Ir al inicio",
  },
  fr: {
    closeLabel: "Fermer le tarot de retrouvailles",
    title: "Le lien avec cette personne est-il vraiment terminé ?",
    subtitle: "Un tirage de retrouvailles en cinq cartes qui éclaire votre nostalgie comme un phare sur la mer nocturne, pour chercher la suite avec douceur plutôt qu'avec hâte.",
    meditationAria: "Méditation de la mer nocturne",
    meditationButton: "🧘 Commencer la méditation de la mer nocturne",
    invoke: "🕯️ Ouvrir les cartes du phare des retrouvailles",
    drawHeader: "Ouvrez les cartes de 1 à 5 dans l'ordre et suivez le courant émotionnel.",
    spreadGuide: "Retournez la première carte.",
    finalReading: "✨ Voir la lecture du phare",
    resultTitle: "🌌 Résultat du tirage de retrouvailles en 5 cartes",
    share: "💬 Partager sur KakaoTalk",
    reset: "🔄 Refaire la lecture",
    home: "🏠 Aller à l'accueil",
  },
  de: {
    closeLabel: "Wiedervereinigungs-Tarot schließen",
    title: "Ist die Verbindung zu dieser Person wirklich beendet?",
    subtitle: "Eine Fünf-Karten-Legung zur Wiederbegegnung, die deine Sehnsucht wie ein Leuchtturm auf dem nächtlichen Meer sanft erhellt und den nächsten Weg ohne Hast zeigt.",
    meditationAria: "Nachtmeer-Meditation",
    meditationButton: "🧘 Nachtmeer-Meditation starten",
    invoke: "🕯️ Leuchtturm-Karten der Wiederbegegnung öffnen",
    drawHeader: "Öffne die Karten 1 bis 5 der Reihe nach und folge der emotionalen Strömung.",
    spreadGuide: "Drehe die erste Karte um.",
    finalReading: "✨ Leuchtturm-Deutung ansehen",
    resultTitle: "🌌 Ergebnis der 5-Karten-Wiederbegegnung",
    share: "💬 Auf KakaoTalk teilen",
    reset: "🔄 Erneut lesen",
    home: "🏠 Zur Startseite",
  },
  nl: {
    closeLabel: "Reünie-tarot sluiten",
    title: "Is de band met die persoon echt voorbij?",
    subtitle: "Een vijfkaartenlegging voor hereniging die je verlangen verlicht als een vuurtoren boven de nachtzee, zodat je met zachtheid de volgende weg kunt vinden.",
    meditationAria: "Nachtzee-meditatie",
    meditationButton: "🧘 Start nachtzee-meditatie",
    invoke: "🕯️ Open de vuurtorenkaarten voor hereniging",
    drawHeader: "Open kaarten 1 tot en met 5 op volgorde en volg de emotionele stroom.",
    spreadGuide: "Draai de eerste kaart om.",
    finalReading: "✨ Bekijk de vuurtorenlezing",
    resultTitle: "🌌 Resultaat van de 5-kaarten reünielezing",
    share: "💬 Delen via KakaoTalk",
    reset: "🔄 Opnieuw lezen",
    home: "🏠 Naar home",
  },
  ms: {
    closeLabel: "Tutup tarot pertemuan semula",
    title: "Adakah ikatan dengan orang itu benar-benar sudah berakhir?",
    subtitle: "Hamparan lima kad pertemuan semula yang menerangi rindu anda seperti rumah api di laut malam, membantu anda mencari jalan seterusnya dengan lembut tanpa tergesa-gesa.",
    meditationAria: "Meditasi laut malam",
    meditationButton: "🧘 Mulakan meditasi laut malam",
    invoke: "🕯️ Buka kad rumah api pertemuan semula",
    drawHeader: "Buka kad 1 hingga 5 mengikut urutan dan ikuti aliran emosi.",
    spreadGuide: "Terbalikkan kad pertama.",
    finalReading: "✨ Lihat tafsiran rumah api",
    resultTitle: "🌌 Keputusan bacaan 5 kad pertemuan semula",
    share: "💬 Kongsi di KakaoTalk",
    reset: "🔄 Baca semula",
    home: "🏠 Ke halaman utama",
  },
};

function ensureReunionStyleSheet() {
  if (typeof document === "undefined") return;
  const existed = document.querySelector('link[data-tarot-reunion-style="1"]');
  if (existed) return;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = REUNION_STYLE_HREF;
  link.setAttribute("data-tarot-reunion-style", "1");
  document.head.appendChild(link);
}

function openReunionExperienceWhenReady() {
  if (typeof window === "undefined") return;
  if (typeof window.openTarotReunionModal === "function") {
    window.openTarotReunionModal();
  }
}

export default function TarotReunionClient() {
  const [locale, setLocale] = useState<LoadingLocale>("ko");
  const copy = TAROT_REUNION_COPY[locale] || TAROT_REUNION_COPY.ko;

  useEffect(() => {
    setLocale(getCurrentLoadingLocale());
    ensureReunionStyleSheet();
    openReunionExperienceWhenReady();

    const timer = window.setInterval(() => {
      if (typeof window.openTarotReunionModal === "function") {
        window.openTarotReunionModal();
        window.clearInterval(timer);
      }
    }, 150);

    return () => {
      window.clearInterval(timer);
      try {
        // 레거시 경험 스크립트가 건 락만 청소 — ref-count 락(data-cd-scroll-lock)은 건드리지 않음
        if (!document.body.hasAttribute("data-cd-scroll-lock")) {
          document.body.style.overflow = "";
        }
      } catch {
        // no-op
      }
    };
  }, []);

  return (
    <>
      <Script src="/js/tarot-reunion-experience.js?v=build-3a3676872a13" strategy="afterInteractive" onLoad={openReunionExperienceWhenReady} />

      <div
        id="tarotReunionOverlay"
        className="tarot-reunion-overlay"
        style={{ display: "none" }}
        data-action="closeTarotReunionModal"
        data-action-self-only="1"
      >
        <div className="tarot-reunion-stars" aria-hidden="true">
          <span className="star s1" />
          <span className="star s2" />
          <span className="star s3" />
          <span className="star s4" />
          <span className="star s5" />
          <span className="star s6" />
          <span className="star s7" />
          <span className="star s8" />
          <span className="star s9" />
          <span className="star s10" />
        </div>

        <div className="tarot-reunion-lighthouse" aria-hidden="true">
          <span className="tower" />
          <span className="lamp" />
          <span className="beam" />
          <span className="water-reflection" />
        </div>

        <div className="tarot-reunion-shell">
          <div className="tarot-reunion-panel">
            <button className="tarot-reunion-close" type="button" data-action="closeTarotReunionModal" aria-label={copy.closeLabel}>
              ×
            </button>

            <section id="tarotReunionIntroStage" className="tarot-reunion-stage is-active">
              <div className="tarot-reunion-hero">
                <h1 className="tarot-reunion-title">{copy.title}</h1>
                <p className="tarot-reunion-subtitle">
                  {copy.subtitle}
                </p>

                <div className="tarot-reunion-meditation-wrap">
                  <button
                    id="tarotReunionMeditationBtn"
                    className="tarot-reunion-meditation-btn"
                    type="button"
                    data-action="toggleTarotReunionMeditation"
                    data-action-stop-propagation="1"
                    aria-label={copy.meditationAria}
                  >
                    {copy.meditationButton}
                  </button>

                  <div id="tarotReunionMeditationGuide" className="tarot-reunion-meditation-guide" aria-live="polite" hidden>
                    <div className="tarot-reunion-breath-circle" aria-hidden="true" />
                    <p id="tarotReunionBreathText" className="tarot-reunion-breath-text" />
                    <span id="tarotReunionBreathCount" className="tarot-reunion-breath-count" />
                  </div>
                </div>

                <div className="tarot-reunion-invoke-wrap">
                  <button className="tarot-reunion-btn tarot-reunion-btn--invoke" type="button" data-action="startTarotReunionReading">
                    {copy.invoke}
                  </button>
                </div>
              </div>
            </section>

            <section id="tarotReunionDrawStage" className="tarot-reunion-stage">
              <h3 className="tarot-reunion-draw-header">{copy.drawHeader}</h3>
              <div className="tarot-reunion-spread-guide" id="tarotReunionSpreadGuide">
                {copy.spreadGuide}
              </div>
              <div id="tarotReunionCardGrid" className="tarot-reunion-card-grid" />
              <div className="tarot-reunion-final-wrap">
                <button type="button" className="tarot-reunion-final-btn" id="tarotReunionFinalBtn" data-action="showTarotReunionFinalReading" disabled>
                  {copy.finalReading}
                </button>
              </div>
            </section>

            <section id="tarotReunionResultStage" className="tarot-reunion-stage tarot-reunion-result-stage-shell">
              <header className="tarot-reunion-reading-header">
                <h2 className="tarot-reunion-reading-title">{copy.resultTitle}</h2>
                <div className="tarot-reunion-result-stars" aria-hidden="true">
                  <span className="result-star rs1" />
                  <span className="result-star rs2" />
                  <span className="result-star rs3" />
                  <span className="result-star rs4" />
                  <span className="result-star rs5" />
                  <span className="result-star rs6" />
                </div>
              </header>

              <div id="tarotReunionResultCards" className="tarot-reunion-result-cards" />

              <div className="tarot-reunion-result-divider">
                <span className="result-lighthouse-icon" aria-hidden="true" />
                <span className="result-lighthouse-glow" />
                <span className="result-star-line" />
              </div>

              <div id="tarotReunionReadingContent" className="tarot-reunion-reading-content" />

              <div className="tarot-reunion-result-actions">
                <button type="button" className="tarot-reunion-btn" data-action="shareTarotReunionResult">
                  {copy.share}
                </button>
                <button type="button" className="tarot-reunion-btn tarot-reunion-btn--subtle" data-action="resetTarotReunionFlow">
                  {copy.reset}
                </button>
                <button type="button" className="tarot-reunion-btn tarot-reunion-btn--subtle" data-action="closeTarotReunionModal">
                  {copy.home}
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
