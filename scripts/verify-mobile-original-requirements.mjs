import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

const sources = {
  index: read("index.html"),
  mobilePatch: read("js/mobile-interaction-patch.js"),
  mobileLite: read("styles/mobile-lite.css"),
  finalAudit: read("MOBILE_FINAL_COMPLETION_AUDIT.md"),
  staticReactAudit: read("MOBILE_STATIC_REACT_PAYMENT_AUDIT.md"),
  registry: read("MOBILE_FEATURE_REGISTRY.md"),
  paymentContext: read("app/components/PaymentProcessingContext.tsx"),
  premiumGate: read("app/components/PremiumBlurGate.tsx"),
  workerBilling: read("worker/routes/billing.js"),
  musicHook: readIfExists("app/music/_hooks/useMusicPlayer.ts"),
  musicPlayer: readIfExists("app/music/MusicPlaylistPanel.tsx") + "\n" + readIfExists("app/music/MusicPlayerExample.tsx"),
  teaAssets: readIfExists("src/features/fortune-tea-house/data/assets.ts"),
  neoAssets: readIfExists("src/features/neo-war-room/data/assets.ts"),
};

checkAll("mobile compact home", sources.index, [
  'id="cdMobileDestinyHub"',
  "Code Destiny / 꿀꿀 운세",
  "오늘의 운명을 가장 가볍게 열어보세요",
  "무료 사주 분석 시작",
  "Quick Start",
  "오늘의 타로",
  "오늘의 운세",
  "나의 운명 카드",
  "Recommended Cards",
  "Recently Used / Saved",
  "Moonlight Pass",
  "All Features",
  "<summary>All Features</summary>",
]);

checkAll("mobile category navigation", sources.index, [
  "추천",
  "무료",
  "사주",
  "타로",
  "상담",
  "신탁",
  "별자리",
  "꽃·해몽",
  "꽃/해몽",
  "음악",
  "VVIP",
  "마이",
  'id="cdMobileBottomNav"',
  "env(safe-area-inset-bottom",
  "cd-mobile-nav-hidden",
]);

checkAll("mobile card system", sources.index + sources.mobileLite, [
  "MobileFeatureCard",
  "MobileCompactCard",
  "MobileCategoryTabs",
  "MobileFeatureRail",
  "MobileLockedCard",
  "MobilePassCard",
  "MobileQuickAction",
  "MobileFeatureBottomSheet",
  "min-height:44px",
  "-webkit-line-clamp:2",
  "touch-action:manipulation",
  "pointer-events:none",
  'data-mobile-card-kind="locked"',
]);

checkAll("collection length reduction", sources.index, [
  'data-mobile-collapsed-card="true"',
  'data-mobile-collection-more',
  'data-mobile-show-all',
  ".cd-mobile-collection-more",
  ".feature-card-grid [data-mobile-collapsed-card=\"true\"]",
]);

checkAll("touch routing fallback", sources.mobilePatch + sources.index, [
  "pointerdown",
  "pointerup",
  "touchstart",
  "touchend",
  "elementFromPoint",
  "showTapFeedback",
  "findMobileCardLink",
  "invokeMobileCardLink",
  "navigateLink",
  "window.location.href",
  "data-mobile-external",
]);

checkAll("modal and scroll lifecycle", sources.index + sources.mobilePatch + sources.paymentContext, [
  "aria-hidden=\"true\"",
  "setAttribute('aria-hidden', 'false')",
  "setAttribute('aria-hidden','true')",
  "document.body.style.overflow = 'hidden'",
  "document.body.style.overflow = ''",
  "document.body.style.overflow = \"hidden\"",
  "document.body.style.overflow = originalOverflow",
  "#tilePvwOverlay:not(.pvw-open)",
  "pointer-events: none !important",
  "100dvh",
]);

checkAll("lazy images and media", sources.index + sources.mobilePatch + sources.musicHook + sources.musicPlayer, [
  'loading="lazy"',
  'decoding="async"',
  'fetchpriority="low"',
  'width="',
  'height="',
  "data-mobile-media=\"defer\"",
  "queryAll(root, 'audio,video')",
  "mediaNode.setAttribute('preload', 'none')",
  "audio.preload = \"none\"",
  "audio.src =",
]);

checkAll("music and bgm no eager download", sources.index + sources.musicHook + sources.musicPlayer + sources.finalAudit, [
  "initial audio/video elements 0",
  "audio.preload = \"none\"",
  "audio.src =",
  "playTrack",
]);

checkAll("sprite and animation lightness", sources.mobilePatch + sources.mobileLite + sources.teaAssets + sources.neoAssets, [
  "prefers-reduced-motion",
  "animation-play-state: paused",
  "requestAnimationFrame",
  "mobile",
  "sprite",
]);

checkAll("feature detail template", sources.index + sources.mobileLite, [
  "MobileFeatureDetail",
  "data-mobile-detail-template",
  'data-mobile-detail-section="top"',
  'data-mobile-detail-section="start"',
  'data-mobile-detail-section="preview"',
  'data-mobile-detail-section="guide"',
  'data-mobile-detail-section="progress"',
  'data-mobile-detail-section="result"',
  // data-mobile-detail-result-summary 는 2026-07-28 제거 — 모든 기능의 결과 첫 문장에
  // 공용 요약칩을 씌우던 훅이라 계약(인체공학만)을 벗어났다. 배지 훅도 같은 이유로 사라졌다.
  // 래퍼가 경계를 지키는지는 verify:mobile-detail-nonintrusive 가 본다.
  "data-mobile-detail-accordion",
]);

checkAll("payment lock pass mobile ux", sources.index + sources.paymentContext + sources.premiumGate + sources.workerBilling + sources.finalAudit + sources.staticReactAudit, [
  "openGoldenGrainCharge",
  "goldenGrainChargeModalRoot",
  "cd-mobile-payment-lock-ux-v20260701",
  "권한/결제 확인",
  "already_unlocked",
  "retry",
  "stale-while-revalidate",
  "public cache",
  "single",
  "membership",
]);

checkAll("static and react coverage", sources.index + sources.mobilePatch + sources.mobileLite + sources.paymentContext + sources.premiumGate + sources.finalAudit + sources.staticReactAudit, [
  "viewport-fit=cover",
  "overflow-x:hidden",
  "hydration",
  "Suspense",
  "fixed inset-0",
  "rounded-t-[8px]",
]);

const registryRows = sources.registry.split(/\r?\n/).filter((line) => line.startsWith("|") && !line.includes("---") && !line.includes("| 기능명 |"));
// verify-mobile-final-audit.mjs 가 같은 임계를 복사해 갖고 있다 — 한쪽만 고치지 말 것.
// 2026-08-23 de1195b70 이 운명의 꽃 카드 4장을 아틀리에 1장으로 합쳐 행이 107 → 104 가 됐다.
check("registry has at least 104 feature rows", registryRows.length >= 104, `rows=${registryRows.length}`);

const requiredReports = [
  "MOBILE_FULL_SITE_AUDIT.md",
  "MOBILE_FEATURE_REGISTRY.md",
  "MOBILE_HOME_UX_IMPLEMENTATION_REPORT.md",
  "MOBILE_CARD_SYSTEM_IMPLEMENTATION_REPORT.md",
  "MOBILE_HOME_MODAL_SPLIT_REPORT.md",
  "MOBILE_FEATURE_DETAIL_TEMPLATE_REPORT.md",
  "MOBILE_TOUCH_ROUTING_MODAL_AUDIT.md",
  "MOBILE_PERFORMANCE_OPTIMIZATION_REPORT.md",
  "MOBILE_SCREEN_LENGTH_REDUCTION_REPORT.md",
  "MOBILE_NAVIGATION_REPORT.md",
  "MOBILE_STATIC_REACT_PAYMENT_AUDIT.md",
  "MOBILE_COLLECTION_CARD_AUDIT.md",
  "MOBILE_FINAL_COMPLETION_AUDIT.md",
];
for (const file of requiredReports) check(`report exists: ${file}`, fs.existsSync(path.join(root, file)));

if (failures.length) {
  console.error("Mobile original requirements verification failed.");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("Mobile original requirements verification OK");
  console.log(`- Requirement groups: 13/13`);
  console.log(`- Reports: ${requiredReports.length}/${requiredReports.length}`);
  console.log(`- Registry rows: ${registryRows.length}`);
}

function checkAll(group, text, needles) {
  for (const needle of needles) check(`${group}: ${needle}`, text.includes(needle));
}

function check(label, ok, detail = "") {
  if (!ok) failures.push(detail ? `${label} (${detail})` : label);
}

function read(file) {
  const filePath = path.join(root, file);
  if (!fs.existsSync(filePath)) throw new Error(`Missing file: ${file}`);
  return fs.readFileSync(filePath, "utf8");
}

function readIfExists(file) {
  const filePath = path.join(root, file);
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}
