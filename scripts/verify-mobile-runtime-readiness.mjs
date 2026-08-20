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
// v20260723 재구성: 모바일 허브(#cdMobileDestinyHub)를 걷어내고 단일 반응형 홈 + 슬림 헤더로 전환.
// 아래 검사는 옛 허브 구조 대신 새 아키텍처를 보증한다.
check("legacy mobile hub removed (single responsive home)", !index.includes("id=\"cdMobileDestinyHub\""));
check("mobile slim header exists", includesAll(index, ["id=\"cdMobileHeader\"", "cd-mobile-header-v20260723", "cd-mobile-header__search"]));
check("mobile header keeps a single theme toggle", (index.match(/id="themeCheckbox"/g) || []).length === 1);
check("mobile header search reuses the service index", includesAll(index, ["cd-mobile-header__search", "data-cd-service-index-jump=\"1\""]));
check("responsive home sections present", includesAll(index, ["cd-fortune-pick", "cd-ai-feats", "honey-membership-mini", "moon-story-entry"]));
check("hero primary CTA present", index.includes("moon-hero__cta--primary"));
check("sticky CTA sits above bottom nav", includesAll(index, ["id=\"cdStickyCta\"", "cd-sticky-cta", "cd-sticky-cta-v20260723"]));
check("bottom navigation exists with safe area", includesAll(index, ["id=\"cdMobileBottomNav\"", "cd-mobile-bottom-navigation-v20260701", "env(safe-area-inset-bottom"]));
// 메인 5탭은 실제 링크다 — data-nav-key 만 보면 숨은 퀵칩 레일에도 같은 key 가 있어 통과해버린다.
check("bottom navigation covers main slots", includesAll(index, [
  "data-nav-key=\"home\" data-nav-icon=\"⌂\" href=\"/\"",
  "data-nav-key=\"saju\" data-nav-icon=\"命\" href=\"/?action=cdSajuTabEntry\"",
  "data-nav-key=\"fortunes\" data-nav-icon=\"✦\" href=\"/?action=cdOpenAllFortunes\"",
  "data-nav-key=\"pass\" data-nav-icon=\"◈\" href=\"/points/\"",
  // 마이 탭은 라우트가 아니라 셸 프로필 시트를 연다(정본: app/_lib/mobile-tabs.ts 의
  // PROFILE_SHEET_ACTION). React /me 는 중복 구현이라 제거됐고 되살리는 것은
  // verify-profile-card-action-policy.mjs 가 막는다 — 여기서 /me 를 요구하면 두 가드가 충돌한다.
  "data-nav-key=\"my\" data-nav-icon=\"☰\" href=\"/?action=dpOpenList\"",
]));
// 셸에서 모든 운세·마이 탭이 이동 대신 실행하는 인페이지 동작 (오버레이 / 프로필 시트)
check("bottom navigation keeps shell in-page actions", includesAll(index, [
  "data-action=\"cdOpenAllFortunes\"",
  "data-action=\"dpOpenList\"",
  // 개요 패널은 스크립트가 만들어 붙이므로 마크업이 아니라 CSS 규칙 + 생성 코드로 확인한다
  "#cdMobileFortuneOverview",
  "'cdMobileFortuneOverview'",
  "window.cdOpenAllFortunes",
]));
check("profile sheet exposes my-page entry", includesAll(index, ["dp-sheet-foot", "dp-sheet-foot__link"]));
check("bottom navigation has requested quick categories", includesAny(index, ["꽃/해몽", "꽃·해몽"]) && includesAll(index, ["data-nav-key=\"free\"", "data-nav-key=\"oracle\"", "data-nav-key=\"cosmic\"", "data-nav-key=\"music\"", "data-nav-key=\"vvip\""]));
check("home exposes representative internal features", includesAll(index, ["href=\"/fortune-tea-house/\"", "href=\"/neo-operation-room/\"", "href=\"/music/\"", "data-action=\"openTarotModal\"", "destinyCardForm"]));
check("global touch targets use 44px and manipulation", includesAll(index, ["min-height:44px", "min-width:44px", "touch-action:manipulation"]));
check("hidden overlays are pointer-disabled", includesAll(mobilePatch, ["#privacy-modal-overlay[aria-hidden=\"true\"]", "#goldenGrainChargeModalRoot[aria-hidden=\"true\"]", "pointer-events: none !important"]));
check("bottom sheets use dynamic viewport and safe area", includesAll(index, ["100dvh", "88dvh", "MobileFeatureBottomSheet", "env(safe-area-inset-bottom"]));
check("payment sheet opens immediately before async balance sync", paymentSheetOpensBeforeAsyncSync(index));
check("payment plans are collapsed behind mobile toggle", includesAll(index, ["goldenPackageListExpanded", "golden-grain-packages__toggle", "toggleGoldenPackages", "전체 플랜 보기"]));
check("moonlight pass section exposes working CTAs", includesAll(index, ["id=\"honeyMembershipMini\"", "data-membership-cta=\"benefits\"", "data-membership-toggle"]));
check("golden grain charge handler and delegation remain intact", includesAll(index, ["if (action === 'openGoldenGrainCharge')", "openGoldenGrainCharge: ['goldenGrainChargeModalRoot', 'sajuLoaderOverlay']"]));
check("React payment overlay has visible fallback and mobile bounds", includesAll(paymentContext, ["PaymentOverlayFallback", "min(88svh, 88dvh)", "safe-area-inset-bottom"]));
check("React premium gate touch CTA is mobile ready", includesAll(premiumGate, ["min-h-12", "touch-manipulation"]));
check("audio element is created without preloading", includesAll(musicPlayer, ["const audio = new Audio();", "audio.preload = \"none\"", "audio.removeAttribute(\"src\")"]));
check("audio source is injected only in playback path", includesAll(musicPlayer, ["audio.src = track.audioUrl", "await audio.play()"]));
check("required app routes exist", requiredRoutes.every((route) => fs.existsSync(path.join(root, route))));
check("mobile markers are mirrored to public shells", shellMirrors.every((mirror) => {
  const text = read(mirror);
  return includesAll(text, ["cd-mobile-bottom-navigation-v20260701", "cd-mobile-payment-lock-ux-v20260701", "cd-mobile-header-v20260723", "id=\"cdMobileHeader\"", "id=\"cdMobileBottomNav\""]);
}));
// 모바일 레이아웃 정본 6블록(cd-appbar-header-toggle-v20260704 등 201개 셀렉터)은
// html.cd-mobile-runtime.mobile-safe-render 두 클래스를 함께 요구한다. 한쪽만 붙으면
// mobile-lite.css 가 앱바를 fixed 로 만들어 놓고 그 높이를 비켜주는
// .cd-mobile-hub__fold{margin-top:62px} 는 적용되지 않아 제목이 앱바 밑에 깔린다.
check("mobile gate classes are added together in every shell", [files.index, ...shellMirrors].every((shell) => (
  includesAll(read(shell), ["d.classList.add('cd-mobile-runtime','mobile-safe-render')"])
)));

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
