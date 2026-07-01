import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const files = {
  index: "index.html",
  mobilePatch: "js/mobile-interaction-patch.js",
  musicPlayer: "app/music/_hooks/useMusicPlayer.ts",
  paymentContext: "app/components/PaymentProcessingContext.tsx",
  premiumGate: "app/components/PremiumBlurGate.tsx",
};

const shellMirrors = [
  "public/index.html",
  "public/static/index.html",
  "public/en/index.html",
  "public/ja/index.html",
  "public/zh/index.html",
];

const requiredRoutes = [
  "app/fortune-tea-house/page.tsx",
  "app/neo-operation-room/page.tsx",
  "app/music/page.tsx",
  "app/stories/page.tsx",
  "app/premium-unlock/page.tsx",
  "app/sukuyo-compatibility-ai/page.tsx",
  "app/ziwei-ai/page.tsx",
  "app/astrology-ai/page.tsx",
  "app/vedic-ai/page.tsx",
  "app/karma-destiny-ai/page.tsx",
  "app/life-book-ai/page.tsx",
  "app/love-secret-ai/page.tsx",
  "app/new-year-ai-consultation/page.tsx",
];

const index = read(files.index);
const mobilePatch = read(files.mobilePatch);
const musicPlayer = read(files.musicPlayer);
const paymentContext = read(files.paymentContext);
const premiumGate = read(files.premiumGate);

const checks = [];

check("viewport uses viewport-fit=cover", includesAll(index, ["name=\"viewport\"", "viewport-fit=cover"]));
check("mobile compact hub exists", includesAll(index, ["id=\"cdMobileDestinyHub\"", "mobile-first-hub-v20260701", "mobile-home-compact-v20260701"]));
check("mobile first screen has primary CTA and two assist CTAs", includesAll(index, ["무료 사주 분석 시작", "타로 카드 뽑기", "오늘의 운세"]));
check("mobile quick start exists", includesAll(index, ["Quick Start", "무료 사주", "오늘의 타로", "나의 운명 카드"]));
check("mobile category chips cover requested groups", includesAny(index, ["꽃/해몽", "꽃·해몽"]) && includesAll(index, ["무료", "사주", "타로", "상담", "신탁", "별자리", "음악", "VVIP"]));
check("recent/saved area exists", includesAll(index, ["Recently Used / Saved", "최근 이용 기록", "저장된 프로필"]));
check("Moonlight Pass compact exists", includesAll(index, ["Moonlight Pass Compact", "내 이용권 확인", "플랜 보기"]));
check("All Features is collapsed by default", /<details\s+class="cd-mobile-hub__all-details"/.test(index) && index.includes("<summary>All Features</summary>"));
check("bottom navigation exists with safe area", includesAll(index, ["id=\"cdMobileBottomNav\"", "cd-mobile-bottom-navigation-v20260701", "env(safe-area-inset-bottom"]));
check("bottom navigation covers main slots", includesAll(index, ["data-nav-key=\"home\"", "data-nav-key=\"saju\"", "data-nav-key=\"tarot\"", "data-nav-key=\"consult\"", "data-nav-key=\"my\""]));
check("bottom navigation has requested quick categories", includesAny(index, ["꽃/해몽", "꽃·해몽"]) && includesAll(index, ["data-nav-key=\"free\"", "data-nav-key=\"oracle\"", "data-nav-key=\"cosmic\"", "data-nav-key=\"music\"", "data-nav-key=\"vvip\""]));
check("mobile hub exposes representative internal features", includesAll(index, ["href=\"/fortune-tea-house\"", "href=\"/neo-operation-room\"", "href=\"/music\"", "data-action=\"openTarotModal\"", "href=\"#destinyCardForm\""]));
check("mobile hub avoids nested anchors and buttons", mobileHubHasNoNestedInteractive(index));
check("global touch targets use 44px and manipulation", includesAll(index, ["min-height:44px", "min-width:44px", "touch-action:manipulation"]));
check("decorative fixed business bar cannot steal touches", includesAll(index, [".cd-fixed-business-bar", "pointer-events:none"]));
check("hidden overlays are pointer-disabled", includesAll(mobilePatch, ["#privacy-modal-overlay[aria-hidden=\"true\"]", "#goldenGrainChargeModalRoot[aria-hidden=\"true\"]", "pointer-events: none !important"]));
check("bottom sheets use dynamic viewport and safe area", includesAll(index, ["100dvh", "88dvh", "MobileFeatureBottomSheet", "env(safe-area-inset-bottom"]));
check("payment sheet opens immediately before async balance sync", paymentSheetOpensBeforeAsyncSync(index));
check("payment plans are collapsed behind mobile toggle", includesAll(index, ["goldenPackageListExpanded", "golden-grain-packages__toggle", "toggleGoldenPackages", "전체 플랜 보기"]));
check("mobile pass button is wired to payment sheet action", includesAll(index, ["data-action=\"openGoldenGrainCharge\"", "openGoldenGrainCharge: ['goldenGrainChargeModalRoot', 'sajuLoaderOverlay']", "if (action === 'openGoldenGrainCharge')"]));
check("React payment overlay has visible fallback and mobile bounds", includesAll(paymentContext, ["PaymentOverlayFallback", "min(88svh, 88dvh)", "safe-area-inset-bottom"]));
check("React premium gate touch CTA is mobile ready", includesAll(premiumGate, ["min-h-12", "touch-manipulation"]));
check("audio element is created without preloading", includesAll(musicPlayer, ["const audio = new Audio();", "audio.preload = \"none\"", "audio.removeAttribute(\"src\")"]));
check("audio source is injected only in playback path", includesAll(musicPlayer, ["audio.src = track.audioUrl", "await audio.play()"]));
check("required app routes exist", requiredRoutes.every((route) => fs.existsSync(path.join(root, route))));
check("mobile markers are mirrored to public shells", shellMirrors.every((mirror) => {
  const text = read(mirror);
  return includesAll(text, ["cd-mobile-bottom-navigation-v20260701", "cd-mobile-payment-lock-ux-v20260701", "id=\"cdMobileDestinyHub\"", "id=\"cdMobileBottomNav\""]);
}));

const failed = checks.filter((entry) => !entry.pass);

if (failed.length) {
  console.error("Mobile runtime readiness verification failed.");
  for (const entry of failed) {
    console.error(`- ${entry.name}`);
  }
  process.exitCode = 1;
} else {
  console.log("Mobile runtime readiness OK");
  console.log(`- Checks: ${checks.length}/${checks.length}`);
  console.log(`- Mirrored shells: ${shellMirrors.length}/${shellMirrors.length}`);
  console.log(`- Required routes: ${requiredRoutes.length}/${requiredRoutes.length}`);
}

function read(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }
  return fs.readFileSync(filePath, "utf8");
}

function check(name, pass) {
  checks.push({ name, pass: Boolean(pass) });
}

function includesAll(text, needles) {
  return needles.every((needle) => text.includes(needle));
}

function includesAny(text, needles) {
  return needles.some((needle) => text.includes(needle));
}

function mobileHubHasNoNestedInteractive(text) {
  const start = text.indexOf("id=\"cdMobileDestinyHub\"");
  const end = text.indexOf("id=\"cdMobileBottomNav\"");
  if (start < 0 || end <= start) {
    return false;
  }
  const hub = text.slice(start, end);
  const stack = [];
  const tokens = hub.match(/<\/?(?:a|button)\b[^>]*>/gi) || [];
  for (const token of tokens) {
    const isClose = token.startsWith("</");
    const tag = token.toLowerCase().startsWith("</a") || token.toLowerCase().startsWith("<a") ? "a" : "button";
    if (!isClose) {
      if ((tag === "a" && stack.includes("button")) || (tag === "button" && stack.includes("a"))) {
        return false;
      }
      stack.push(tag);
    } else {
      const index = stack.lastIndexOf(tag);
      if (index >= 0) {
        stack.splice(index, 1);
      }
    }
  }
  return true;
}

function paymentSheetOpensBeforeAsyncSync(text) {
  const openStart = text.indexOf("async function openChargeModal()");
  if (openStart < 0) {
    return false;
  }
  const openEnd = text.indexOf("window.__cdOpenChargeModal", openStart);
  const body = text.slice(openStart, openEnd > openStart ? openEnd : openStart + 4000);
  const renderIndex = body.indexOf("ChargeModal()");
  const asyncIndex = body.indexOf("syncGoldenMonthlyCreditsFromPaymentsMe(");
  return renderIndex >= 0 && asyncIndex > renderIndex && body.includes(".catch(") && body.includes(".finally(");
}
