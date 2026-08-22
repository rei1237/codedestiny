import FeatureLandingPage from "../../components/FeatureLandingPage";
import { withUniqueRouteMetadata } from "../../../lib/generate-page-metadata";
import RouteMetadataLocaleSync from "../../components/RouteMetadataLocaleSync";

const SERVICE = {
  h1: "타세오그래피 찻잎 점",
  description:
    "런던 로열 컵 문양을 기반으로 상징을 해석하는 영국 홍차 찻잎 점 오라클 리딩 서비스. 찻잎이 남긴 패턴으로 현재의 흐름과 미래 메시지를 읽어보세요.",
  ogImage: "/fuctionassets/london.webp",
  landingPoints: ["런던 로열 컵 문양 리딩", "영국 홍차 전통 점술", "상징 기반 오라클 메시지"],
  seoText:
    "타세오그래피는 타 컵 내에 남은 찻잎 패턴으로 미래를 읽는 유럽 전통 점술입니다. 런던 로열 컵 버전으로 즐겨보세요.",
  localized: {
    en: {
      title: "Tasseography Tea Leaf Oracle - London Royal Cup Symbol Reading",
      h1: "Tasseography Tea Leaf Oracle",
      description:
        "A British tea leaf oracle that reads symbols from London Royal Cup patterns. Let the shapes left by the leaves reveal the present flow and the message ahead.",
      landingPoints: ["London Royal Cup pattern reading", "Traditional British tea divination", "Symbol-based oracle messages"],
      seoText:
        "Tasseography is a European divination tradition that reads the future through tea leaf patterns left in the cup. Experience it in the London Royal Cup style.",
    },
    ja: {
      title: "タセオグラフィー紅茶占い - ロンドンロイヤルカップ象徴リーディング",
      h1: "タセオグラフィー紅茶占い",
      description:
        "ロンドンロイヤルカップの模様をもとに象徴を読み解く、英国式の紅茶占いオラクルリーディングです。茶葉が残した形から、今の流れと未来のメッセージを受け取ってみましょう。",
      landingPoints: ["ロンドンロイヤルカップ模様のリーディング", "英国紅茶に伝わる伝統占い", "象徴から受け取るオラクルメッセージ"],
      seoText:
        "タセオグラフィーは、カップに残った茶葉の模様から未来を読むヨーロッパの伝統占術です。ロンドンロイヤルカップ版でお楽しみください。",
    },
    "zh-CN": {
      title: "茶叶占卜 - 伦敦皇家杯纹样解读",
      h1: "茶叶占卜",
      description:
        "以伦敦皇家杯纹样为基础解读象征的英式红茶茶叶神谕。通过茶叶留下的图案，读取当下的流向与未来讯息。",
      landingPoints: ["伦敦皇家杯纹样解读", "英国红茶传统占卜", "基于象征的神谕讯息"],
      seoText:
        "茶叶占卜是通过杯中残留茶叶图案读取未来的欧洲传统占术。请体验伦敦皇家杯版本。",
    },
    "zh-TW": {
      title: "茶葉占卜 - 倫敦皇家杯紋樣解讀",
      h1: "茶葉占卜",
      description:
        "以倫敦皇家杯紋樣為基礎解讀象徵的英式紅茶茶葉神諭。透過茶葉留下的圖案，讀取當下的流向與未來訊息。",
      landingPoints: ["倫敦皇家杯紋樣解讀", "英國紅茶傳統占卜", "基於象徵的神諭訊息"],
      seoText:
        "茶葉占卜是透過杯中殘留茶葉圖案讀取未來的歐洲傳統占術。請體驗倫敦皇家杯版本。",
    },
    vi: {
      title: "Bói lá trà Tasseography - Luận biểu tượng tách London Royal",
      h1: "Bói lá trà Tasseography",
      description:
        "Một oracle lá trà kiểu Anh đọc các biểu tượng từ họa tiết tách London Royal. Hãy để hình dạng lá trà còn lại hé mở dòng chảy hiện tại và thông điệp phía trước.",
      landingPoints: ["Luận họa tiết tách London Royal", "Bói trà truyền thống Anh", "Thông điệp oracle dựa trên biểu tượng"],
      seoText:
        "Tasseography là truyền thống bói châu Âu đọc tương lai qua họa tiết lá trà còn lại trong tách. Hãy trải nghiệm phiên bản London Royal Cup.",
    },
    hi: {
      title: "टैसियोग्राफी चाय पत्ती ओरेकल - लंदन रॉयल कप प्रतीक रीडिंग",
      h1: "टैसियोग्राफी चाय पत्ती ओरेकल",
      description:
        "लंदन रॉयल कप के पैटर्न से प्रतीकों को पढ़ने वाली ब्रिटिश चाय पत्ती ओरेकल रीडिंग. पत्तियों द्वारा छोड़े गए आकार वर्तमान प्रवाह और आगे के संदेश को खोलते हैं.",
      landingPoints: ["लंदन रॉयल कप पैटर्न रीडिंग", "ब्रिटिश चाय की पारंपरिक दिव्यविद्या", "प्रतीक-आधारित ओरेकल संदेश"],
      seoText:
        "टैसियोग्राफी कप में बची चाय पत्तियों के पैटर्न से भविष्य पढ़ने की यूरोपीय परंपरा है. इसे लंदन रॉयल कप शैली में अनुभव करें.",
    },
    es: {
      title: "Oráculo de hojas de té - Lectura de símbolos London Royal Cup",
      h1: "Oráculo de hojas de té",
      description:
        "Una lectura oracular británica que interpreta símbolos desde los patrones de la London Royal Cup. Las formas dejadas por las hojas revelan el flujo actual y el mensaje que viene.",
      landingPoints: ["Lectura de patrones London Royal Cup", "Adivinación tradicional británica con té", "Mensajes oraculares basados en símbolos"],
      seoText:
        "La tasseografía es una tradición europea que lee el futuro en los patrones de hojas de té dentro de la taza. Disfrútala en versión London Royal Cup.",
    },
    fr: {
      title: "Oracle des feuilles de thé - Lecture des symboles London Royal Cup",
      h1: "Oracle des feuilles de thé",
      description:
        "Une lecture oracle britannique qui interprète les symboles des motifs London Royal Cup. Les formes laissées par les feuilles éclairent le courant présent et le message à venir.",
      landingPoints: ["Lecture des motifs London Royal Cup", "Divination britannique traditionnelle par le thé", "Messages oracle fondés sur les symboles"],
      seoText:
        "La tasséographie est une tradition européenne qui lit l'avenir dans les motifs de feuilles de thé laissés dans la tasse. Découvrez la version London Royal Cup.",
    },
    de: {
      title: "Tasseografie-Teeorakel - Symboldeutung der London Royal Cup",
      h1: "Tasseografie-Teeorakel",
      description:
        "Ein britisches Teeorakel, das Symbole aus London-Royal-Cup-Mustern deutet. Die Formen der Teeblätter zeigen den gegenwärtigen Fluss und die kommende Botschaft.",
      landingPoints: ["London Royal Cup Musterdeutung", "Traditionelle britische Teedivination", "Symbolbasierte Orakelbotschaften"],
      seoText:
        "Tasseografie ist eine europäische Wahrsagetradition, die die Zukunft aus Teeblattmustern in der Tasse liest. Erlebe sie im London-Royal-Cup-Stil.",
    },
    nl: {
      title: "Tasseografie theeblad-orakel - London Royal Cup symboollezing",
      h1: "Tasseografie theeblad-orakel",
      description:
        "Een Britse theeblad-orakellezing die symbolen leest uit London Royal Cup patronen. De vormen die de bladeren achterlaten tonen de huidige stroom en de boodschap vooruit.",
      landingPoints: ["London Royal Cup patroonlezing", "Traditionele Britse theedivinatie", "Orakelboodschappen via symbolen"],
      seoText:
        "Tasseografie is een Europese divinatietraditie die de toekomst leest in theebladpatronen die in de kop achterblijven. Ervaar de London Royal Cup-versie.",
    },
    ms: {
      title: "Oracle daun teh Tasseography - Bacaan simbol London Royal Cup",
      h1: "Oracle daun teh Tasseography",
      description:
        "Bacaan oracle daun teh British yang membaca simbol daripada corak London Royal Cup. Bentuk yang ditinggalkan daun teh membuka aliran semasa dan mesej yang bakal datang.",
      landingPoints: ["Bacaan corak London Royal Cup", "Ramalan teh tradisional British", "Mesej oracle berasaskan simbol"],
      seoText:
        "Tasseography ialah tradisi ramalan Eropah yang membaca masa depan melalui corak daun teh dalam cawan. Nikmati versi London Royal Cup.",
    },
  },
};

const ROYAL_TEA_METADATA_COPY = {
  ko: {
    title: "타세오그래피 찻잎 점 - 런던 로열 컵 문양 리딩",
    description:
      "런던 로열 컵 문양을 기반으로 찻잎 패턴의 상징을 해석하는 영국 전통 홍차 점 오라클.",
  },
  en: {
    title: "Tasseography Tea Leaf Oracle - London Royal Cup Symbol Reading",
    description:
      "A traditional British tea oracle that interprets the symbols in tea leaf patterns from the London Royal Cup.",
  },
  ja: {
    title: "タセオグラフィー紅茶占い - ロンドンロイヤルカップ象徴リーディング",
    description:
      "ロンドンロイヤルカップの模様をもとに茶葉の象徴を読み解く、英国伝統の紅茶占いオラクルです。",
  },
  zh: {
    title: "茶叶占卜 - 伦敦皇家杯纹样解读",
    description:
      "以伦敦皇家杯纹样为基础，解读茶叶图案象征的英式传统红茶神谕。",
  },
};

const royalTeaMetadataCopy = ROYAL_TEA_METADATA_COPY.ko;

export const metadata = withUniqueRouteMetadata("/oracle/royal-tea", {
  title: royalTeaMetadataCopy.title,
  description: royalTeaMetadataCopy.description,
});

export default function RoyalTeaLandingPage() {
  return (
    <>
      <RouteMetadataLocaleSync entries={ROYAL_TEA_METADATA_COPY} />
      <FeatureLandingPage service={SERVICE} />
    </>
  );
}
