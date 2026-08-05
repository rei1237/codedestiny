"use client";

import dynamic from "next/dynamic";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { PaymentLoadingProps } from "./common/PaymentLoading";
import LoadingProgressMotion, {
  type LoadingMotionPhase,
  type LoadingMotionTone,
} from "./common/LoadingProgressMotion";
import { PaymentPigVisual } from "./common/PaymentPigVisual";

type PaymentLoadingVariant = NonNullable<PaymentLoadingProps["variant"]>;
type LoadingStage = "pg_processing" | "result_loading" | "access_check";
type PaymentType = "subscription" | "single" | "pass";
type PaymentProcessingAction = {
  label: string;
  onClick: () => void;
};

const PAYMENT_LOADING_LOCALES = ["ko", "en", "ja", "zh-CN", "zh-TW", "vi", "hi", "es", "fr", "de", "nl", "ms"] as const;
type LoadingLocale = (typeof PAYMENT_LOADING_LOCALES)[number];
type LoadingMessage = { title: string; sub: string };

function normalizeLoadingLocale(value?: string | null): LoadingLocale {
  const normalized = String(value || "").trim().replace("_", "-").toLowerCase();
  if (normalized === "zh" || normalized === "zh-cn" || normalized === "zh-hans") return "zh-CN";
  if (normalized === "zh-tw" || normalized === "zh-hant" || normalized === "zh-hk" || normalized === "zh-mo") return "zh-TW";
  if (normalized === "vi-vn") return "vi";
  return PAYMENT_LOADING_LOCALES.find((locale) => locale.toLowerCase() === normalized) || "ko";
}

function getCurrentLoadingLocale(): LoadingLocale {
  if (typeof window === "undefined") return "ko";
  try {
    const runtimeLang = (window as typeof window & { cdGetCurrentLanguage?: () => string }).cdGetCurrentLanguage?.();
    if (runtimeLang) return normalizeLoadingLocale(runtimeLang);
  } catch {}
  try {
    const params = new URLSearchParams(window.location.search || "");
    const fromQuery = params.get("lang");
    if (fromQuery) return normalizeLoadingLocale(fromQuery);
  } catch {}
  try {
    const fromStorage = window.localStorage.getItem("cd_lang");
    if (fromStorage) return normalizeLoadingLocale(fromStorage);
  } catch {}
  try {
    const match = document.cookie.match(/(?:^|;\s*)cd_locale=([^;]+)/);
    if (match?.[1]) return normalizeLoadingLocale(decodeURIComponent(match[1]));
  } catch {}
  return "ko";
}

function PaymentOverlayFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[2147483001] flex items-end justify-center bg-slate-950/62 px-0 backdrop-blur-sm sm:items-center sm:px-4"
    >
      <div
        className="w-full rounded-t-[8px] border border-white/15 bg-slate-950/92 p-5 text-white shadow-[0_18px_60px_rgba(2,6,23,.5)] sm:max-w-[420px] sm:rounded-[8px]"
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/20 sm:hidden" />
        <p className="m-0 text-sm font-black">寃곗젣 ?뺤씤 ?붾㈃???щ뒗 以묒엯?덈떎.</p>
        <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-300">
          李쎌쓣 ?レ? 留먭퀬 ?좎떆留?湲곕떎??二쇱꽭??
        </p>
      </div>
    </div>
  );
}

const DeferredPaymentProcessingOverlay = dynamic<PaymentLoadingProps>(
  () => import("./PaymentProcessingOverlay"),
  {
    ssr: false,
    loading: () => <PaymentOverlayFallback />,
  },
);

type PaymentProcessingContextValue = {
  isProcessing: boolean;
  isPaymentLoading: boolean;
  processingMessage: string;
  startProcessing: (message?: string, variant?: PaymentLoadingVariant) => void;
  stopProcessing: () => void;
  setProcessingMessage: (message: string) => void;
  setProcessingAction: (action: PaymentProcessingAction | null) => void;
  startPayment: (message?: string, variant?: PaymentLoadingVariant) => void;
  endPayment: () => void;
  setPaymentMessage: (message: string) => void;
};

type PaymentProcessingProviderProps = {
  children: React.ReactNode;
};

type PaidFeatureGateStatus =
  | "idle"
  | "opening"
  | "checkingEntitlement"
  | "hasEntitlement"
  | "noEntitlement"
  | "loadingProducts"
  | "readyToPay"
  | "paymentProcessing"
  | "paymentSuccess"
  | "paymentFailed"
  | "error"
  | "paymentPreparing"
  | "paymentWindowOpen"
  | "savingUnlock"
  | "unlockSaving"
  | "cancelled";

type PaidFeatureGateDetail = {
  featureId?: string;
  featureKey?: string;
  requestId?: string;
  title?: string;
  message?: string;
  status?: PaidFeatureGateStatus;
  cost?: number;
  paymentMode?: string;
  accessType?: string;
  accessMethod?: string;
  paymentMethod?: string;
  startedAt?: number;
};

type PaidFeatureGateState = Required<Pick<PaidFeatureGateDetail, "featureId" | "requestId" | "title" | "message">> & {
  open: boolean;
  status: PaidFeatureGateStatus;
  cost: number | null;
  seq: number;
  startedAt: number;
};

type PaidFeatureGateContextValue = {
  state: PaidFeatureGateState;
  open: (detail: PaidFeatureGateDetail) => number;
  update: (detail: PaidFeatureGateDetail) => void;
  close: (requestId?: string) => void;
  preload: () => void;
};

const DEFAULT_PROCESSING_MESSAGE = "泥섎━ 以묒씠?먯슂\n?좎떆留?湲곕떎??二쇱꽭??;

const PAID_GATE_DEFAULT_TITLE = "寃곗젣/?댁슜沅??뺤씤";
const ACCESS_CHECKING_MESSAGE = "?댁슜沅??뺤씤 以묒씠?먯슂\n?좎떆留?湲곕떎??二쇱꽭??;
const PAID_GATE_DEFAULT_MESSAGE = ACCESS_CHECKING_MESSAGE;

type PaidGateCopy = { label: string; title: string; message: string };
type PaidGateUiCopy = {
  closeLabel: string;
  costPrefix: string;
  costSuffix: string;
  payAction: string;
  genericLabel: string;
  progressLabel: string;
  progressSteps: readonly [string, string, string];
};

const KOREAN_TEXT_PATTERN = /[媛-??/;

const PAID_GATE_COPY: Record<PaidFeatureGateStatus, PaidGateCopy> = {
  idle: { label: "?湲?, title: PAID_GATE_DEFAULT_TITLE, message: PAID_GATE_DEFAULT_MESSAGE },
  opening: { label: "以鍮?, title: "?댁슜沅??뺤씤", message: ACCESS_CHECKING_MESSAGE },
  checkingEntitlement: { label: "?뺤씤 以?, title: "?댁슜沅??뺤씤", message: ACCESS_CHECKING_MESSAGE },
  hasEntitlement: { label: "?댁슜 媛??, title: "?댁슜沅??뺤씤 ?꾨즺", message: "?댁슜沅??뺤씤???앸궗?댁슂\n寃곌낵瑜?以鍮꾪븯怨??덉뼱?? },
  noEntitlement: { label: "寃곗젣 ?꾩슂", title: PAID_GATE_DEFAULT_TITLE, message: "?ъ슜 媛?ν븳 ?댁슜沅뚯씠 ?놁뼱 寃곗젣媛 ?꾩슂?⑸땲??" },
  loadingProducts: { label: "?뺤씤 以?, title: "?댁슜沅?寃곗젣 ?뺤씤", message: ACCESS_CHECKING_MESSAGE },
  readyToPay: { label: "?좏깮 ?湲?, title: "寃곗젣 ?섎떒 ?좏깮", message: "??肄섑뀗痢좊? ?????덈뒗 寃곗젣 ?섎떒???좏깮??二쇱꽭??" },
  paymentProcessing: { label: "泥섎━ 以?, title: "寃곗젣 泥섎━ 以?, message: "寃곗젣 ?뱀씤怨??댁슜 沅뚰븳???뺤씤?섍퀬 ?덉뼱??n李쎌쓣 ?レ? 留먯븘 二쇱꽭?? },
  paymentSuccess: { label: "?꾨즺", title: "寃곗젣 ?꾨즺", message: "寃곗젣媛 ?꾨즺?먯뼱??n寃곌낵瑜?以鍮꾪븯怨??덉뼱?? },
  paymentFailed: { label: "?ㅽ뙣", title: "寃곗젣 ?뺤씤 ?ㅽ뙣", message: "寃곗젣瑜??꾨즺?섏? 紐삵뻽?듬땲?? ?ㅼ떆 ?쒕룄??二쇱꽭??" },
  error: { label: "?ㅻ쪟", title: "?뺤씤 ?ㅽ뙣", message: "?댁슜沅??뺤씤???ㅽ뙣?덉뒿?덈떎. ?좎떆 ???ㅼ떆 ?쒕룄??二쇱꽭??" },
  paymentPreparing: { label: "寃곗젣 以鍮?, title: "?④굔 寃곗젣 以鍮?以?, message: "二쇰Ц ?뺣낫? ?몄쬆 ?먮쫫??議곗슜??留욎떠吏怨??덉뼱??n李쎌쓣 ?レ? 留먯븘 二쇱꽭?? },
  paymentWindowOpen: { label: "寃곗젣 吏꾪뻾", title: "?④굔 寃곗젣 以鍮?以?, message: "二쇰Ц ?뺣낫? ?몄쬆 ?먮쫫??議곗슜??留욎떠吏怨??덉뼱??n李쎌쓣 ?レ? 留먯븘 二쇱꽭?? },
  savingUnlock: { label: "???以?, title: "?댁슜 沅뚰븳 ???以?, message: "寃곌낵 ?붾㈃?쇰줈 ?댁뼱吏?꾨줉 ?댁슜 沅뚰븳????ν븯怨??덉뒿?덈떎." },
  unlockSaving: { label: "???以?, title: "?댁슜 沅뚰븳 ???以?, message: "寃곌낵 ?붾㈃?쇰줈 ?댁뼱吏?꾨줉 ?댁슜 沅뚰븳????ν븯怨??덉뒿?덈떎." },
  cancelled: { label: "痍⑥냼??, title: "寃곗젣 ?좏깮 痍⑥냼", message: "寃곗젣 ?좏깮??痍⑥냼?섏뿀?듬땲?? ?꾩슂?????ㅼ떆 吏꾪뻾?????덉뒿?덈떎." },
};

const PAID_GATE_LOCALIZED_COPY: Record<Exclude<LoadingLocale, "ko">, Partial<Record<PaidFeatureGateStatus, PaidGateCopy>>> = {
  en: {
    idle: { label: "Waiting", title: "Payment/pass check", message: "Checking your pass." },
    noEntitlement: { label: "Payment needed", title: "Payment/pass check", message: "No usable pass was found." },
    readyToPay: { label: "Choose payment", title: "Choose a payment method", message: "Select a payment method to open this content." },
    paymentFailed: { label: "Failed", title: "Payment check failed", message: "Payment could not be completed." },
    error: { label: "Error", title: "Check failed", message: "Please check your network and try again." },
    cancelled: { label: "Cancelled", title: "Payment selection cancelled", message: "You can try again whenever needed." },
  },
  ja: {
    idle: { label: "孃끾찣訝?, title: "黎뷸툑?삣닶?ⓨ댏??▶沃?, message: "?⑴뵪?멥굮閻븃첀?쀣겍?꾠겲?쇻? },
    noEntitlement: { label: "黎뷸툑?뚦퓚誤?, title: "黎뷸툑?삣닶?ⓨ댏??▶沃?, message: "?⑴뵪?㎯걤?뗥닶?ⓨ댏?뚩쫳?ㅳ걢?듽겲?쎼굯?㎯걮?잆? },
    readyToPay: { label: "?멩뒢孃끹걾", title: "黎뷸툑?방퀡??겦??, message: "?볝겗?녈꺍?녴꺍?꾠굮?뗣걦黎뷸툑?방퀡?믧겦?볝겎?뤵걽?뺛걚?? },
    paymentFailed: { label: "鸚길븮", title: "黎뷸툑閻븃첀?ュㅁ?쀣걮?얇걮??, message: "?딀뵱?뺛걚?믣츑雅녴겎?띲겲?쎼굯?㎯걮?잆? },
    error: { label: "?ⓦ꺀??, title: "閻븃첀?ュㅁ?쀣걮?얇걮??, message: "?싦에?뜻퀋?믥▶沃띲걮?╉곥굚?녵?佯╉걡屋╉걮?뤵걽?뺛걚?? },
    cancelled: { label: "??깵?녈궩??, title: "黎뷸툑?멩뒢?믡궘?ｃ꺍?삠꺂?쀣겲?쀣걼", message: "恙낁쫨?ゃ겏?띲겓?귙걝訝佯?꿔굙?됥굦?얇걲?? },
  },
  "zh-CN": {
    idle: { label: "嶺됧푷", title: "??퍡/?싪죱?며‘溫?, message: "閭ｅ쑉簾???싪죱?멥? },
    noEntitlement: { label: "?誤곫뵱餓?, title: "??퍡/?싪죱?며‘溫?, message: "?ゆ돻?겼룾?①쉪?싪죱?멥? },
    readyToPay: { label: "嶺됧푷?됪떓", title: "?됪떓??퍡?밧폀", message: "瑥룬됪떓??돀凉閭ㅵ냵若밭쉪??퍡?밧폀?? },
    paymentFailed: { label: "鸚김뇰", title: "??퍡簾??鸚김뇰", message: "?よ꺗若뚧닇??퍡?? },
    error: { label: "?숃?", title: "簾??鸚김뇰", message: "瑥룡??η퐨瀯쒐듁?곩릮?띹캊?? },
    cancelled: { label: "藥꿨룚易?, title: "藥꿨룚易덃뵱餓섌됪떓", message: "?誤곫뿶??빳?띷А瀯㎫뺌?? },
  },
  "zh-TW": {
    idle: { label: "嶺됧푷", title: "餓섉Ь/?싪죱?며▶沃?, message: "閭ｅ쑉閻븃첀?싪죱?멥? },
    noEntitlement: { label: "?誤곦퍡轝?, title: "餓섉Ь/?싪죱?며▶沃?, message: "?얌툖?겼룾?①쉪?싪죱?멥? },
    readyToPay: { label: "嶺됧푷?멩뱡", title: "?멩뱡餓섉Ь?밧폀", message: "獄뗩겦?뉐룾?뗥븶閭ㅵ뀱若밭쉪餓섉Ь?밧폀?? },
    paymentFailed: { label: "鸚길븮", title: "餓섉Ь閻븃첀鸚길븮", message: "?よ꺗若뚧닇餓섉Ь?? },
    error: { label: "??い", title: "閻븃첀鸚길븮", message: "獄뗦あ?η떤瓮???뗥풄?띹ĳ訝轝▲? },
    cancelled: { label: "藥꿨룚易?, title: "藥꿨룚易덁퍡轝얗겦??, message: "?誤곫셽??빳?띷А濚쇘틠?? },
  },
  vi: {
    idle: { label: "휂ang ch沼?, title: "Ki沼긩 tra thanh to찼n/v챕", message: "휂ang ki沼긩 tra v챕 s沼?d沼쩸g." },
    noEntitlement: { label: "C梳쬷 thanh to찼n", title: "Ki沼긩 tra thanh to찼n/v챕", message: "Kh척ng t챙m th梳쪅 v챕 c처 th沼?d첫ng." },
    readyToPay: { label: "Ch沼?ch沼뛫", title: "Ch沼뛫 ph튼퉤ng th沼쯢 thanh to찼n", message: "Ch沼뛫 ph튼퉤ng th沼쯢 thanh to찼n 휃沼?m沼?n沼셢 dung n횪y." },
    paymentFailed: { label: "Th梳쩿 b梳죍", title: "X찼c nh梳춏 thanh to찼n th梳쩿 b梳죍", message: "Kh척ng th沼?ho횪n t梳쩿 thanh to찼n." },
    error: { label: "L沼뾦", title: "Ki沼긩 tra th梳쩿 b梳죍", message: "Vui l챵ng ki沼긩 tra m梳죒g r沼밿 th沼?l梳죍." },
    cancelled: { label: "휂찾 h沼쭃", title: "휂찾 h沼쭃 l沼켥 ch沼뛫 thanh to찼n", message: "B梳죒 c처 th沼?th沼켧 hi沼뇆 l梳죍 khi c梳쬷." },
  },
  hi: {
    idle: { label: "西む쪓西겯ㄴ誓西뺖쪓西룅ㅎ", title: "西?쪇西쀠ㄴ西약ㄸ/西むㅎ西?西쒉ㅎ西곟쩀", message: "西녱ㄺ西뺖ㅎ 西むㅎ西?西쒉ㅎ西곟쩀西?西쒉ㅎ 西겯ㅉ西?西밝쪎." },
    noEntitlement: { label: "西?쪇西쀠ㄴ西약ㄸ 西녱ㅅ西뜩쪓西?쨻", title: "西?쪇西쀠ㄴ西약ㄸ/西むㅎ西?西쒉ㅎ西곟쩀", message: "西됢ㄺ西?쪑西?西?쪑西쀠쪓西?西むㅎ西?西ⓣㅉ誓西?西?ㅏ西꿋ㅎ." },
    readyToPay: { label: "西싟ㄿ西?西む쪓西겯ㄴ誓西뺖쪓西룅ㅎ", title: "西?쪇西쀠ㄴ西약ㄸ 西듀ㅏ西㏅ㅏ 西싟쪇西ⓣ쪍西?, message: "西뉋ㅈ 西멘ㅎ西?쨽誓띭ㅀ誓 西뺖쪑 西뽤쪑西꿋ㄸ誓?西뺖쪍 西꿋ㅏ西?西?쪇西쀠ㄴ西약ㄸ 西듀ㅏ西㏅ㅏ 西싟쪇西ⓣ쪍西?" },
    paymentFailed: { label: "西듀ㅏ西ムㅂ", title: "西?쪇西쀠ㄴ西약ㄸ 西む쪇西룅쪓西잀ㅏ 西듀ㅏ西ムㅂ", message: "西?쪇西쀠ㄴ西약ㄸ 西む쪈西겯ㅎ 西ⓣㅉ誓西?西밝쪑 西멘쨻西?" },
    error: { label: "西ㅰ쪓西겯쪇西잀ㅏ", title: "西쒉ㅎ西곟쩀 西듀ㅏ西ムㅂ", message: "西뺖쪉西むㄿ西?西ⓣ쪍西잀ㅅ西겯쪓西?西멘쪓西?ㅏ西ㅰㅏ 西쒉ㅎ西곟쩀西뺖ㅀ 西ムㅏ西?西む쪓西겯ㄿ西약ㅈ 西뺖ㅀ誓뉋쨧." },
    cancelled: { label: "西겯ㄶ誓띭ㄶ", title: "西?쪇西쀠ㄴ西약ㄸ 西싟ㄿ西?西겯ㄶ誓띭ㄶ 西밝쪇西?, message: "西쒉ㅌ西겯쪈西겯ㄴ 西むㄱ西솰ㄸ誓?西むㅀ 西ムㅏ西?西멘쪍 西녱쨽誓?西оㄲ西?西멘쨻西ㅰ쪍 西밝쪎西?" },
  },
  es: {
    idle: { label: "En espera", title: "Comprobaci처n de pago/pase", message: "Comprobando tu pase." },
    noEntitlement: { label: "Pago necesario", title: "Comprobaci처n de pago/pase", message: "No se encontr처 un pase disponible." },
    readyToPay: { label: "Elegir pago", title: "Elige un m챕todo de pago", message: "Selecciona un m챕todo de pago para abrir este contenido." },
    paymentFailed: { label: "Fall처", title: "Fall처 la confirmaci처n del pago", message: "No se pudo completar el pago." },
    error: { label: "Error", title: "Fall처 la comprobaci처n", message: "Revisa la conexi처n e int챕ntalo de nuevo." },
    cancelled: { label: "Cancelado", title: "Selecci처n de pago cancelada", message: "Puedes intentarlo de nuevo cuando lo necesites." },
  },
  fr: {
    idle: { label: "En attente", title: "V챕rification paiement/pass", message: "V챕rification de votre pass." },
    noEntitlement: { label: "Paiement requis", title: "V챕rification paiement/pass", message: "Aucun pass utilisable n'a 챕t챕 trouv챕." },
    readyToPay: { label: "Choix du paiement", title: "Choisir un moyen de paiement", message: "S챕lectionnez un moyen de paiement pour ouvrir ce contenu." },
    paymentFailed: { label: "횋chec", title: "횋chec de la confirmation du paiement", message: "Le paiement n'a pas pu 챗tre termin챕." },
    error: { label: "Erreur", title: "횋chec de la v챕rification", message: "V챕rifiez votre connexion puis r챕essayez." },
    cancelled: { label: "Annul챕", title: "S챕lection du paiement annul챕e", message: "Vous pourrez r챕essayer quand vous le souhaitez." },
  },
  de: {
    idle: { label: "Warten", title: "Zahlung/Pass wird gepr체ft", message: "Dein Pass wird gepr체ft." },
    noEntitlement: { label: "Zahlung n철tig", title: "Zahlung/Pass wird gepr체ft", message: "Es wurde kein nutzbarer Pass gefunden." },
    readyToPay: { label: "Zahlung w채hlen", title: "Zahlungsmethode w채hlen", message: "W채hle eine Zahlungsmethode, um diesen Inhalt zu 철ffnen." },
    paymentFailed: { label: "Fehlgeschlagen", title: "Zahlungspr체fung fehlgeschlagen", message: "Die Zahlung konnte nicht abgeschlossen werden." },
    error: { label: "Fehler", title: "Pr체fung fehlgeschlagen", message: "Bitte pr체fe deine Verbindung und versuche es erneut." },
    cancelled: { label: "Abgebrochen", title: "Zahlungsauswahl abgebrochen", message: "Du kannst es bei Bedarf erneut versuchen." },
  },
  nl: {
    idle: { label: "Wachten", title: "Betaling/pas controleren", message: "Je pas wordt gecontroleerd." },
    noEntitlement: { label: "Betaling nodig", title: "Betaling/pas controleren", message: "Er is geen bruikbare pas gevonden." },
    readyToPay: { label: "Betaling kiezen", title: "Kies een betaalmethode", message: "Kies een betaalmethode om deze inhoud te openen." },
    paymentFailed: { label: "Mislukt", title: "Betaalcontrole mislukt", message: "De betaling kon niet worden voltooid." },
    error: { label: "Fout", title: "Controle mislukt", message: "Controleer je netwerk en probeer het opnieuw." },
    cancelled: { label: "Geannuleerd", title: "Betaalkeuze geannuleerd", message: "Je kunt het opnieuw proberen wanneer dat nodig is." },
  },
  ms: {
    idle: { label: "Menunggu", title: "Semakan bayaran/pas", message: "Menyemak pas anda." },
    noEntitlement: { label: "Bayaran diperlukan", title: "Semakan bayaran/pas", message: "Tiada pas yang boleh digunakan ditemui." },
    readyToPay: { label: "Pilih bayaran", title: "Pilih kaedah bayaran", message: "Pilih kaedah bayaran untuk membuka kandungan ini." },
    paymentFailed: { label: "Gagal", title: "Pengesahan bayaran gagal", message: "Bayaran tidak dapat diselesaikan." },
    error: { label: "Ralat", title: "Semakan gagal", message: "Sila semak rangkaian anda dan cuba lagi." },
    cancelled: { label: "Dibatalkan", title: "Pilihan bayaran dibatalkan", message: "Anda boleh cuba semula apabila perlu." },
  },
};

const PAID_GATE_UI_COPY: Record<LoadingLocale, PaidGateUiCopy> = {
  ko: { closeLabel: "?リ린", costPrefix: "?꾩슂 湲덉븸", costSuffix: "??, payAction: "寃곗젣 ?곹뭹 蹂닿린", genericLabel: "?뺤씤 以?, progressLabel: "?댁슜沅??뺤씤 吏꾪뻾 ?곹깭", progressSteps: ["沅뚰븳 ?뺤씤", "泥섎━ 吏꾪뻾", "寃곌낵 以鍮?] },
  en: { closeLabel: "Close", costPrefix: "Required amount", costSuffix: " KRW", payAction: "View payment options", genericLabel: "Checking", progressLabel: "Access check progress", progressSteps: ["Check access", "Processing", "Prepare result"] },
  ja: { closeLabel: "?됥걯??, costPrefix: "恙낁쫨?묌죲", costSuffix: "?╉궔??, payAction: "黎뷸툑?녶뱚?믦쫳??, genericLabel: "閻븃첀訝?, progressLabel: "?⑴뵪?며▶沃띲겗?꿱죱?뜻퀋", progressSteps: ["與⑶솏閻븃첀", "??릤訝?, "永먩옖繹뽩굺"] },
  "zh-CN": { closeLabel: "?녜뿭", costPrefix: "???묌쥫", costSuffix: "?⒴뀇", payAction: "?η쐦??퍡?됮」", genericLabel: "簾??訝?, progressLabel: "?껈솏簾??瓦쎾벧", progressSteps: ["簾???껈솏", "鸚꾤릤訝?, "?녶쨭瀯볠옖"] },
  "zh-TW": { closeLabel: "?쒒뻾", costPrefix: "???묌죲", costSuffix: "?볟뀇", payAction: "?η쐦餓섉Ь?면쟿", genericLabel: "閻븃첀訝?, progressLabel: "轝딃솏閻븃첀?꿨벧", progressSteps: ["閻븃…7517 tokens truncated…TimerRef.current = setTimeout(tryClose, 400);
        return;
      }
      if (hold && hold.requestId === state.requestId) holdRef.current = null;
      close(state.requestId);
    };
    closeTimerRef.current = setTimeout(tryClose, state.status === "hasEntitlement" ? 800 : 700);
    return () => {
      cancelled = true;
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [close, state.open, state.requestId, state.status]);

  useEffect(() => {
    if (!state.open || !showSkeleton) {
      setLoadingPhase("fresh");
      return;
    }

    setLoadingPhase("fresh");
    // ?뺤쟻 ?몄? 2.5珥덈㈃ "?쒕쾭 ?묐떟???됱냼蹂대떎 ?먮젮??濡??붾㈃??諛붾뚮뒗?? React 寃뚯씠?몃뒗 8珥?20珥덈씪
    // ?먮┛ ?좎뿉 ?꾨Т 蹂???녿뒗 ?붾㈃???ㅻ옒 遊먯빞 ?덈떎. ?좉????덉궛(6珥?怨?留욌Ъ由ш쾶 ?욌떦湲대떎.
    const warmTimer = window.setTimeout(() => setLoadingPhase("warming"), 2500);
    const slowTimer = window.setTimeout(() => setLoadingPhase("slow"), 6000);

    return () => {
      window.clearTimeout(warmTimer);
      window.clearTimeout(slowTimer);
    };
  }, [showSkeleton, state.open, state.status]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    type PaidGateWindow = Window & {
      __cdPaidFeatureGate?: {
        open: (detail: PaidFeatureGateDetail) => number;
        update: (detail: PaidFeatureGateDetail) => void;
        close: (requestId?: string) => void;
        holdOpen: (requestId?: string, maxMs?: number) => void;
        release: (requestId?: string) => void;
        preload: () => void;
      };
    };
    const runtimeWindow = window as PaidGateWindow;
    runtimeWindow.__cdPaidFeatureGate = { open, update, close, holdOpen, release, preload };

    const onGateEvent = (event: Event) => {
      const detail = (event as CustomEvent<PaidFeatureGateDetail & { action?: string; maxMs?: number }>).detail || {};
      if (detail.action === "close") {
        close(detail.requestId);
        return;
      }
      if (detail.action === "hold") {
        holdOpen(detail.requestId, detail.maxMs);
        return;
      }
      if (detail.action === "release") {
        release(detail.requestId);
        return;
      }
      if (detail.action === "update") {
        update(detail);
        return;
      }
      open(detail);
    };

    window.addEventListener("cd:paid-feature-gate", onGateEvent);
    return () => {
      window.removeEventListener("cd:paid-feature-gate", onGateEvent);
      if (runtimeWindow.__cdPaidFeatureGate?.open === open) {
        delete runtimeWindow.__cdPaidFeatureGate;
      }
    };
  }, [close, holdOpen, open, preload, release, update]);

  const contextValue = useMemo(() => ({ state, open, update, close, preload }), [close, open, preload, state, update]);
  const copy = resolvePaidGateCopy(state, locale);
  const gateUiCopy = PAID_GATE_UI_COPY[locale] || PAID_GATE_UI_COPY.ko;
  const gateMotionTone: LoadingMotionTone =
    state.status === "paymentProcessing" || state.status === "paymentPreparing" || state.status === "paymentWindowOpen"
      ? "payment"
      : state.status === "hasEntitlement" || state.status === "paymentSuccess" || state.status === "savingUnlock" || state.status === "unlockSaving"
        ? "result"
        : "pass";
  const showPayAction = state.status === "readyToPay" || state.status === "noEntitlement" || state.status === "paymentFailed" || state.status === "cancelled";

  return (
    <PaidFeatureGateContext.Provider value={contextValue}>
      {children}
      {state.open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-live="polite"
          data-paid-feature-gate-status={state.status}
          data-loading-phase={loadingPhase}
          className="fixed inset-0 z-[2147483002] flex items-end justify-center bg-[linear-gradient(180deg,rgba(3,6,18,.50),rgba(2,6,23,.72))] px-0 backdrop-blur-[14px] sm:items-center sm:px-4"
        >
          <div
            className="w-full overflow-y-auto rounded-t-[8px] border border-white/20 bg-[radial-gradient(circle_at_82%_10%,rgba(254,240,138,.16),transparent_32%),linear-gradient(145deg,rgba(15,23,42,.82),rgba(30,41,59,.68))] p-5 text-white shadow-[0_26px_90px_rgba(2,6,23,.58),inset_0_1px_0_rgba(255,255,255,.18)] backdrop-blur-[22px] sm:max-w-[440px] sm:rounded-[8px] sm:p-6"
            style={{ maxHeight: "min(88svh, 88dvh)", paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/20 sm:hidden" />
            <PaymentPigVisual tone={gateMotionTone} />
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-cyan-200/80">{copy.label}</p>
                <h2 className="m-0 text-[22px] font-black leading-[1.24] tracking-normal text-white">{copy.title}</h2>
              </div>
              <button
                type="button"
                aria-label={gateUiCopy.closeLabel}
                onClick={() => close(state.requestId)}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/15 bg-white/10 text-lg font-bold text-white/80"
              >
                횞
              </button>
            </div>
            <p className="whitespace-pre-line text-sm leading-[1.7] text-slate-200/90">{copy.message}</p>
            {showSkeleton ? (
              <LoadingProgressMotion
                phase={loadingPhase}
                step={gateProgressStep}
                tone={gateMotionTone}
                label={gateUiCopy.progressLabel}
                labels={gateUiCopy.progressSteps}
              />
            ) : null}
            {state.cost !== null ? (
              <p className="mt-3 inline-flex rounded-full border border-amber-200/30 bg-amber-300/10 px-3 py-1 text-xs font-extrabold text-amber-100">
                {gateUiCopy.costPrefix} {formatPaidGateCost(state.cost, locale)}
              </p>
            ) : null}
            {showSkeleton ? (
              <div className="mt-5 grid gap-[9px]">
                <span className="h-3 w-full animate-pulse rounded-full bg-white/10" />
                <span className="h-3 w-[82%] animate-pulse rounded-full bg-white/10" />
                <span className="h-3 w-[64%] animate-pulse rounded-full bg-white/10" />
              </div>
            ) : null}
            {showPayAction ? (
              <button
                type="button"
                onClick={() => {
                  window.location.href = `/points?feature=${encodeURIComponent(state.featureId)}`;
                }}
                className="mt-5 min-h-12 w-full rounded-[8px] bg-amber-100 px-4 text-sm font-black text-slate-950"
              >
                {gateUiCopy.payAction}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </PaidFeatureGateContext.Provider>
  );
}

export function PaymentProcessingProvider({
  children,
}: PaymentProcessingProviderProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingVariant, setProcessingVariant] = useState<PaymentLoadingVariant>("payment");
  const processingVariantRef = useRef<PaymentLoadingVariant>("payment");
  const overlayStateRef = useRef({ open: false, message: "", mode: "" });
  const completionCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [processingMessage, setProcessingMessageState] = useState(
    DEFAULT_PROCESSING_MESSAGE,
  );
  const [processingAction, setProcessingAction] = useState<PaymentProcessingAction | null>(null);

  // ?좊즺 ?≪뀡???꾨Ⅴ湲?"????援щ룆 ?ㅻ깄?룹쓣 ?곗썙 ?붾떎. ?ㅻ깄?룹씠 ?쒖꽦?대㈃ ?댁슜沅?蹂댁쑀?먮뒗 ?쒕쾭 ?뺣났 ?놁씠
  // 利됱떆 ?듦낵?섍퀬(runBillingCoinGate???숆? fast-path), 洹몃옒???쒕쾭媛 ?먮┛ ?좎뿉??寃곗젣李쎌쑝濡??덉? ?딅뒗??
  // 吏湲덇퉴吏??useCoinGate 留덉슫?몄뿉?쒕쭔 ?뚮컢??洹??낆쓣 ?곗? ?딅뒗 ?붾㈃(AI ?곷떞 ?????꾨? 鍮좎졇 ?덉뿀??
  // ?ш린(???꾩뿭 Provider) ??怨녹뿉 ?먮㈃ ?붾㈃留덈떎 諛곗꽑?섎뒗 以묐났???녿떎. ?대? ?좎꽑???ㅻ깄?룹씠 ?덉쑝硫?
  // warmSubscriptionSnapshotOnEntry媛 議곌린 諛섑솚?섎?濡??ㅼ젣 ?붿껌? TTL??1?뚮떎.
  // billing-client/auth-store???숈쟻 import濡쒕쭔 李몄“?쒕떎 ??猷⑦듃 ?덉씠?꾩썐 踰덈뱾???ㅼ슦吏 ?딄린 ?꾪빐?쒕떎.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    let idleHandle: number | null = null;

    const warmIfAuthenticated = async () => {
      if (cancelled) return;
      try {
        const { getAuthState } = await import("../_lib/auth-store");
        if (cancelled || !getAuthState().isAuthenticated) return;
        const { warmSubscriptionSnapshotOnEntry } = await import("../_lib/billing-client");
        if (!cancelled) void warmSubscriptionSnapshotOnEntry();
      } catch {
        // ?뚮컢 ?ㅽ뙣??臾댁떆?쒕떎 ??泥??좊즺 ?≪뀡??醫낆쟾?濡??쒕쾭 ?먯젙?쇰줈 ?대갚?쒕떎.
      }
    };

    // 理쒖큹 吏꾩엯 ?쒖젏???몄쬆???꾩쭅 ?섏씠?쒕젅?댁뀡 ?꾩씪 ???덉뼱, ?몄쬆 ?곹깭 蹂?붿뿉????踰????쒕룄?쒕떎.
    void warmIfAuthenticated();
    void (async () => {
      try {
        const { subscribeAuth } = await import("../_lib/auth-store");
        if (cancelled) return;
        unsubscribe = subscribeAuth(() => { void warmIfAuthenticated(); });
      } catch {
        // 援щ룆 ?ㅽ뙣 ?쒖뿏 ??1???쒕룄留뚯쑝濡??붾떎.
      }
    })();

    // ?뵶 留뚮즺瑜?硫붿슦???ъ썙諛? ?댁슜沅?誘몃낫???ㅻ깄??TTL? 60珥?蹂댁쑀?먮뒗 5遺??몃뜲 ?덉뿴??吏꾩엯 1?뚮퓧?대씪,
    // 1遺??섍쾶 ?쎈떎媛 ?꾨Ⅴ???ъ슜?먮뒗 留ㅻ쾲 ?쒕쾭 ?뺣났 + 洹멸쾶 ?먮━硫?"寃곗젣 泥섎━ 以? ?붾㈃源뚯? 媛붾떎.
    // ?먮┛ 寃쎈줈媛 誘몃낫?좎옄 ?꾩슜?댁뿀???댁쑀媛 ??TTL 鍮꾨?移?씠?? ?뺤쟻 ?몄씠 #129?먯꽌 媛숈? 臾몄젣瑜?
    // ?좏쑕+?섎룄(pointerdown) ?덉뿴濡??닿껐?덇퀬, React 寃쎈줈?먮룄 媛숈? 諛⑹떇???붾떎.
    // ??荑⑤떎?는룹깉 dedup??留뚮뱾吏 ?딅뒗????warmSubscriptionSnapshotOnEntry媛 ?좎꽑???ㅻ깄?룹씠 ?덉쑝硫?
    // 議곌린 諛섑솚?섍퀬 in-flight 以묐났???ㅼ뒪濡?留됱쑝誘濡? ?ㅼ젣 ?붿껌? '留뚮즺?먯쓣 ?뚮쭔' ?섍컙???먭린?쒗븳??.
    // TTL ?먯껜???섎━吏 ?딅뒗?? ?댁슜沅?援щℓ 吏곹썑 臾댄슚???낆씠 ?놁뼱 ?섎━硫?諛⑷툑 ???ъ슜?먭? '誘몃낫??濡??⑤뒗??
    const warmOnIntent = () => { void warmIfAuthenticated(); };
    const idleWindow = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    if (typeof idleWindow.requestIdleCallback === "function") {
      idleHandle = idleWindow.requestIdleCallback(warmOnIntent, { timeout: 4000 });
    }

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
      if (idleHandle !== null && typeof idleWindow.cancelIdleCallback === "function") {
        idleWindow.cancelIdleCallback(idleHandle);
      }
    };
  }, []);

  const setPaymentLoadingVariant = useCallback((variant: PaymentLoadingVariant) => {
    processingVariantRef.current = variant;
    setProcessingVariant(variant);
  }, []);

  const clearCompletionCloseTimer = useCallback(() => {
    if (completionCloseTimerRef.current) {
      clearTimeout(completionCloseTimerRef.current);
      completionCloseTimerRef.current = null;
    }
  }, []);

  const closeProcessingNow = useCallback(() => {
    clearCompletionCloseTimer();
    overlayStateRef.current = { open: false, message: "", mode: "" };
    setIsProcessing(false);
    setPaymentLoadingVariant("payment");
    setProcessingMessageState(DEFAULT_PROCESSING_MESSAGE);
    setProcessingAction(null);
  }, [clearCompletionCloseTimer, setPaymentLoadingVariant]);

  const startProcessing = useCallback((message?: string, variant?: PaymentLoadingVariant) => {
    clearCompletionCloseTimer();
    if (typeof message === "string" && message.trim()) {
      setProcessingMessageState(message);
    }
    setPaymentLoadingVariant(variant || resolvePaymentLoadingVariant(message));
    setIsProcessing(true);
  }, [clearCompletionCloseTimer, setPaymentLoadingVariant]);

  const stopProcessing = useCallback(() => {
    if (isPaymentCompletionVariant(processingVariantRef.current) && typeof window !== "undefined") {
      clearCompletionCloseTimer();
      completionCloseTimerRef.current = setTimeout(() => {
        closeProcessingNow();
      }, processingVariantRef.current === "pass-applied" ? 800 : 700);
      return;
    }
    closeProcessingNow();
  }, [clearCompletionCloseTimer, closeProcessingNow]);

  const setProcessingMessage = useCallback((message: string) => {
    if (!message || !message.trim()) {
      setProcessingMessageState(DEFAULT_PROCESSING_MESSAGE);
      setPaymentLoadingVariant("payment");
      return;
    }
    setProcessingMessageState(message);
    setPaymentLoadingVariant(resolvePaymentLoadingVariant(message));
  }, [setPaymentLoadingVariant]);

  useEffect(() => {
    return () => clearCompletionCloseTimer();
  }, [clearCompletionCloseTimer]);

  const applyReactPaymentOverlay = useCallback((show: boolean, message?: string, mode?: string) => {
    const nextMessage = String(message || "").trim() || DEFAULT_PROCESSING_MESSAGE;
    const nextMode = String(mode || "").trim();
    const previous = overlayStateRef.current;
    if (show) {
      // ?뵶 寃곗젣李쎄낵 ?湲??붾㈃??寃뱀튂吏 ?딄쾶 ?쒕떎. ?몄쓽 _cdSetCoinGateOverlay 泥?以꾧낵 媛숈? ?먯젙?대ŉ,
      // ??Provider 媛 洹??⑥닔瑜?媛덉븘移섏슦???볦뿉 ?먯젙???고쉶?섎뜕 寃껋쓣 ?섏궡由?寃껋씠??
      if (isPaymentWaitUiBlocked(nextMode)) return;
      if (previous.open && previous.message === nextMessage && previous.mode === nextMode) return;
      overlayStateRef.current = { open: true, message: nextMessage, mode: nextMode };
      closeStaticPaymentOverlay();
      clearCompletionCloseTimer();
      const nextVariant = resolvePaymentLoadingVariant(nextMessage, nextMode);
      setPaymentLoadingVariant(nextVariant);
      setProcessingMessageState(nextMessage);
      setIsProcessing(true);
      return;
    }
    if (!previous.open) {
      closeProcessingNow();
      return;
    }
    stopProcessing();
  }, [clearCompletionCloseTimer, closeProcessingNow, setPaymentLoadingVariant, stopProcessing]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const overlayWindow = window as PaymentOverlayWindow;
    const previousOverlay = overlayWindow._cdSetCoinGateOverlay;
    const onPaymentLoadingState = (event: Event) => {
      const detail = (event as CustomEvent<{ open?: boolean; message?: string; mode?: string }>).detail || {};
      applyReactPaymentOverlay(Boolean(detail.open), detail.message, detail.mode);
    };
    overlayWindow.__CD_REACT_PAYMENT_OVERLAY_OWNER__ = true;
    closeStaticPaymentOverlay();
    overlayWindow._cdSetCoinGateOverlay = applyReactPaymentOverlay;
    window.addEventListener("cd:payment-loading-state", onPaymentLoadingState);
    return () => {
      window.removeEventListener("cd:payment-loading-state", onPaymentLoadingState);
      if (overlayWindow._cdSetCoinGateOverlay === applyReactPaymentOverlay) {
        overlayWindow._cdSetCoinGateOverlay = previousOverlay;
      }
      if (overlayWindow.__CD_REACT_PAYMENT_OVERLAY_OWNER__) {
        delete overlayWindow.__CD_REACT_PAYMENT_OVERLAY_OWNER__;
      }
    };
  }, [applyReactPaymentOverlay]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const runtimeWindow = window as unknown as Record<string, unknown>;
    runtimeWindow.__CD_PAYMENT_PROCESSING__ = isProcessing;

    if (document?.body) {
      if (isProcessing) {
        document.body.dataset.cdVersionGuardBusy = "1";
      } else {
        delete document.body.dataset.cdVersionGuardBusy;
      }
    }

    window.dispatchEvent(new CustomEvent("cd:critical-operation-state", {
      detail: {
        isPaymentProcessing: isProcessing,
      },
    }));

    return () => {
      runtimeWindow.__CD_PAYMENT_PROCESSING__ = false;
      if (document?.body) {
        delete document.body.dataset.cdVersionGuardBusy;
      }
    };
  }, [isProcessing]);

  useEffect(() => {
    if (!isProcessing || typeof window === "undefined") return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // PG(PortOne)??紐⑤컮?쇱뿉??寃곗젣瑜??곸쐞 ?꾨젅??由щ떎?대젆?몃줈 泥섎━?쒕떎 ??洹멸굔 ?섎룄???대룞?대?濡?
      // 留됱쑝硫?"?ъ씠?몃? ?섍??쒓쿋?듬땲源?"媛 ?④굅???대룞 ?먯껜媛 痍⑥냼?섏뼱 寃곗젣李쎌씠 ???대┛ 寃껋쿂??蹂댁씤??
      // 寃곗젣 ?고??꾩씠 requestPayment 吏곸쟾?????뚮옒洹몃? ?몄슫?? isProcessing ??false 濡?flush ?섎뒗
      // ??대컢???섏〈?섏? ?딆쑝?ㅺ퀬 蹂꾨룄 ?뚮옒洹몃? ?대떎.
      if ((window as unknown as { __cdSuppressPaymentUnloadBlock?: boolean }).__cdSuppressPaymentUnloadBlock === true) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isProcessing]);

  const value = useMemo(
    () => ({
      isProcessing,
      isPaymentLoading: isProcessing,
      processingMessage,
      startProcessing,
      stopProcessing,
      setProcessingMessage,
      setProcessingAction,
      startPayment: startProcessing,
      endPayment: stopProcessing,
      setPaymentMessage: setProcessingMessage,
    }),
    [
      isProcessing,
      processingMessage,
      startProcessing,
      stopProcessing,
      setProcessingMessage,
      setProcessingAction,
    ],
  );

  return (
    <PaymentProcessingContext.Provider value={value}>
      <PaidFeatureGateProvider>
        {children}
        {isProcessing ? (
          <DeferredPaymentProcessingOverlay
            open
            variant={processingVariant}
            stage={resolvePaymentLoadingStage(processingVariant, processingMessage)}
            paymentType={resolvePaymentLoadingType(processingVariant, processingMessage)}
            statusMessage={processingMessage}
            actionLabel={processingAction?.label}
            onAction={processingAction?.onClick}
          />
        ) : null}
      </PaidFeatureGateProvider>
    </PaymentProcessingContext.Provider>
  );
}

export function usePaymentProcessing() {
  const context = useContext(PaymentProcessingContext);
  if (!context) {
    throw new Error("usePaymentProcessing must be used within PaymentProcessingProvider");
  }
  return context;
}

export const usePayment = usePaymentProcessing;

export function usePaidFeatureGate() {
  const context = useContext(PaidFeatureGateContext);
  if (!context) {
    throw new Error("usePaidFeatureGate must be used within PaidFeatureGateProvider");
  }
  return context;
}
