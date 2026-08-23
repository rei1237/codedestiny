import FeatureLandingPage from "../../components/FeatureLandingPage";
import { generatePageMetadata } from "../../../lib/generate-page-metadata";

const TAROT_LOVE_PAGE_TEXT_TRANSLATIONS = {
  ko: {
    title: "우리는 무슨 사이? - 6카드 연애 관계 타로",
    description: "내가 보는 상대, 상대의 시선, 관계를 막는 요인과 예상 결과까지 6카드 스프레드로 확인하세요.",
  },
  en: {
    title: "What Are We? - 6-Card Love Relationship Tarot",
    description: "Use a six-card spread to read how you see them, how they see the relationship, what blocks it, and where it may go.",
  },
  ja: {
    title: "私たちはどんな関係？ - 6枚の恋愛関係タロット",
    description: "自分から見た相手、相手の視線、関係を妨げる要因、予想される流れまで6枚のスプレッドで確かめます。",
  },
} as const;

const META = {
  path: "/tarot/love",
  title: TAROT_LOVE_PAGE_TEXT_TRANSLATIONS.ko.title,
  description: TAROT_LOVE_PAGE_TEXT_TRANSLATIONS.ko.description,
  keywords: ["연애 타로", "관계 타로", "relationship six card", "우리는 무슨 사이", "재회", "연애운"],
  image: "https://code-destiny.com/fuctionassets/tarolove.webp",
  featureList: ["6카드 연애 스프레드", "서로의 시선 확인", "관계 방향 한눈에 파악"],
  applicationCategory: "EntertainmentApplication",
} as const;

export function generateMetadata() {
  return generatePageMetadata(META);
}

export default function TarotLoveLandingPage() {
  return (
    <FeatureLandingPage
      service={{
        h1: "💕 우리는 무슨 사이?",
        description: META.description,
        ogImage: META.image,
        landingPoints: [...META.featureList],
        seoText: "실행은 메인 런처에서 진행됩니다.",
        valueGuideTitle: "6장이 각각 무엇을 맡는가",
        valueSections: [
          {
            title: "① 내가 바라보는 상대",
            body: "첫 장은 지금 내가 상대를 어떤 사람으로 보고 있는지를 비춥니다. 관계가 흔들릴 때 우리는 상대를 실제보다 크게 보거나 작게 보기 쉬운데, 이 자리는 그 왜곡의 방향을 먼저 짚어 줍니다.",
          },
          {
            title: "② 상대가 관계 전체를 보는 시각",
            body: "두 번째 장은 상대가 '나'가 아니라 '우리 관계'를 어떻게 보고 있는지를 다룹니다. 나를 좋아하는지와 이 관계를 이어갈 마음이 있는지는 다른 질문이고, 그 둘이 어긋날 때 관계가 정체됩니다.",
          },
          {
            title: "③ 상대가 나를 바라보는 마음",
            body: "세 번째 장에서 상대의 시선이 나에게 닿는 결을 봅니다. 앞의 두 장과 나란히 놓으면 내가 느끼는 온도와 상대가 보내는 온도의 차이가 드러납니다.",
          },
          {
            title: "④ 상대의 연애 의지와 열망",
            body: "네 번째 장은 감정이 아니라 의지를 봅니다. 마음은 있어도 지금 관계를 밀고 나갈 여력이 없는 시기가 있고, 그 구분이 기다릴지 정리할지를 가릅니다.",
          },
          {
            title: "⑤ 관계를 가로막는 핵심 요인",
            body: "다섯 번째 장은 두 사람 사이에 실제로 놓인 장애를 지목합니다. 상대의 마음이 아니라 시기, 환경, 이전 관계의 잔여물이 원인인 경우가 적지 않습니다.",
          },
          {
            title: "⑥ 가까운 흐름과 선택 기준",
            body: "마지막 장은 결말을 단정하지 않고, 가까운 시기에 관계가 어느 쪽으로 기우는지와 그때 무엇을 기준으로 고를지를 정리합니다.",
          },
          {
            title: "리딩은 이렇게 만들어집니다",
            body: "카드를 뽑으면 여섯 자리에 각각 한 장이 놓이고, 서버가 그 여섯 장의 조합을 읽어 상담문을 새로 생성합니다. 같은 카드가 나와도 자리가 다르면 해석이 달라지므로 미리 써 둔 문장을 꺼내 오지 않습니다. 회당 5,000원이며 이용권이나 월정석으로도 열 수 있습니다.",
          },
        ],
        localized: {
          en: {
            title: "What Are We? - 6-Card Love Relationship Tarot",
            h1: "💕 What Are We?",
            description:
              "Check how you see the other person, how they may see you, what blocks the relationship, and the likely direction through a 6-card spread.",
            landingPoints: ["6-card love spread", "See both perspectives", "Understand the relationship direction at a glance"],
            seoText: "The reading starts from the main launcher.",
          },
          ja: {
            title: "私たちはどんな関係？ - 6カード恋愛関係タロット",
            h1: "💕 私たちはどんな関係？",
            description:
              "あなたから見た相手、相手から見たあなた、関係を止めているもの、これからの流れまで、6枚のタロットでやさしく確認します。",
            landingPoints: ["6カード恋愛スプレッド", "お互いの視線を確認", "関係の方向をひと目で把握"],
            seoText: "リーディングはメインランチャーから始まります。",
          },
          "zh-CN": {
            title: "我们是什么关系？- 6张牌恋爱关系塔罗",
            h1: "💕 我们是什么关系？",
            description:
              "通过6张牌展开，查看你眼中的对方、对方的视线、阻碍关系的因素以及可能的走向。",
            landingPoints: ["6张牌恋爱展开", "确认彼此视角", "一眼掌握关系方向"],
            seoText: "阅读将在主启动器中进行。",
          },
          "zh-TW": {
            title: "我們是什麼關係？- 6張牌戀愛關係塔羅",
            h1: "💕 我們是什麼關係？",
            description:
              "透過6張牌展開，查看你眼中的對方、對方的視線、阻礙關係的因素以及可能的走向。",
            landingPoints: ["6張牌戀愛展開", "確認彼此視角", "一眼掌握關係方向"],
            seoText: "閱讀將在主啟動器中進行。",
          },
          vi: {
            title: "Chúng ta là gì của nhau? - Tarot quan hệ tình yêu 6 lá",
            h1: "💕 Chúng ta là gì của nhau?",
            description:
              "Xem cách bạn nhìn người ấy, ánh nhìn của họ, điều đang cản trở mối quan hệ và hướng đi dự kiến qua trải bài 6 lá.",
            landingPoints: ["Trải bài tình yêu 6 lá", "Nhìn từ hai phía", "Nắm hướng quan hệ trong một lượt"],
            seoText: "Bài đọc được bắt đầu từ launcher chính.",
          },
          hi: {
            title: "हमारा रिश्ता क्या है? - 6 कार्ड प्रेम संबंध टैरो",
            h1: "💕 हमारा रिश्ता क्या है?",
            description:
              "6 कार्ड स्प्रेड से देखें कि आप सामने वाले को कैसे देखते हैं, उनकी दृष्टि क्या हो सकती है, संबंध में रुकावट क्या है और आगे की दिशा कैसी है.",
            landingPoints: ["6 कार्ड प्रेम स्प्रेड", "दोनों दृष्टिकोण देखें", "संबंध दिशा एक नज़र में समझें"],
            seoText: "रीडिंग मुख्य लॉन्चर से शुरू होती है.",
          },
          es: {
            title: "¿Qué somos? - Tarot de relación amorosa de 6 cartas",
            h1: "💕 ¿Qué somos?",
            description:
              "Consulta cómo ves a la otra persona, cómo puede verte, qué bloquea la relación y hacia dónde se dirige mediante una tirada de 6 cartas.",
            landingPoints: ["Tirada amorosa de 6 cartas", "Ver ambas miradas", "Entender la dirección de la relación"],
            seoText: "La lectura se inicia desde el lanzador principal.",
          },
          fr: {
            title: "Que sommes-nous ? - Tarot relationnel amoureux en 6 cartes",
            h1: "💕 Que sommes-nous ?",
            description:
              "Découvrez votre regard sur l'autre, son regard possible sur vous, ce qui bloque la relation et la direction attendue avec un tirage de 6 cartes.",
            landingPoints: ["Tirage amoureux en 6 cartes", "Voir les deux regards", "Comprendre la direction relationnelle"],
            seoText: "La lecture démarre depuis le lanceur principal.",
          },
          de: {
            title: "Was sind wir? - 6-Karten-Liebesbeziehungs-Tarot",
            h1: "💕 Was sind wir?",
            description:
              "Erkenne mit einem 6-Karten-Spread, wie du die andere Person siehst, wie sie dich sehen könnte, was die Beziehung blockiert und welche Richtung sich zeigt.",
            landingPoints: ["6-Karten-Liebesspread", "Beide Perspektiven sehen", "Beziehungsrichtung auf einen Blick"],
            seoText: "Die Lesung startet im Haupt-Launcher.",
          },
          nl: {
            title: "Wat zijn wij? - 6-kaarten liefdesrelatie tarot",
            h1: "💕 Wat zijn wij?",
            description:
              "Bekijk met een 6-kaarten spread hoe jij de ander ziet, hoe de ander jou mogelijk ziet, wat de relatie blokkeert en welke richting zichtbaar wordt.",
            landingPoints: ["6-kaarten liefdesspread", "Beide perspectieven zien", "Relatierichting in één oogopslag"],
            seoText: "De reading start vanuit de hoofdlauncher.",
          },
          ms: {
            title: "Apakah hubungan kita? - Tarot hubungan cinta 6 kad",
            h1: "💕 Apakah hubungan kita?",
            description:
              "Lihat cara anda melihat si dia, pandangan si dia terhadap anda, halangan hubungan dan arah yang mungkin muncul melalui spread 6 kad.",
            landingPoints: ["Spread cinta 6 kad", "Lihat dua perspektif", "Fahami arah hubungan sepintas lalu"],
            seoText: "Bacaan bermula daripada pelancar utama.",
          },
        },
      }}
    />
  );
}
