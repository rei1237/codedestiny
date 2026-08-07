#!/usr/bin/env node
/**
 * 모바일 하단 네비 정합성 가드.
 *
 * 탭 정의 정본은 app/_lib/mobile-tabs.ts 이고, 정적 셸(index.html)은 같은 내용을 손으로 미러링한다.
 * 런타임으로 공유할 수 없는 구조라(셸은 바닐라 HTML) 어긋나면 두 화면의 탭이 갈라진다.
 * 여기서 key·라벨·href·순서가 같은지 확인하고, public/ 미러 5벌도 함께 본다.
 *
 * 사용법: node scripts/verify-mobile-bottom-nav-sync.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = process.cwd();

const SHELL_FILES = [
  "index.html",
  "public/index.html",
  "public/static/index.html",
  "public/en/index.html",
  "public/ja/index.html",
  "public/zh/index.html",
];

const failures = [];

function fail(message) {
  failures.push(message);
}

/** app/_lib/mobile-tabs.ts 의 MOBILE_TABS 리터럴을 정규식으로 읽는다(빌드 없이 검사하기 위함). */
function readCanonicalTabs() {
  const source = readFileSync(resolve(rootDir, "app/_lib/mobile-tabs.ts"), "utf8");

  const constants = {};
  // MOBILE_TABS 가 참조하는 액션 상수는 전부 여기 있어야 한다. 빠지면 템플릿 보간이 펼쳐지지 않아
  // 셸과 정본이 실제로는 같은데도 불일치로 잡힌다.
  for (const name of ["SAJU_TAB_ACTION", "ALL_FORTUNES_ACTION", "PROFILE_SHEET_ACTION"]) {
    const found = source.match(new RegExp(`export const ${name}\\s*=\\s*"([^"]+)"`));
    if (!found) throw new Error(`app/_lib/mobile-tabs.ts 에서 ${name} 을 찾지 못했습니다.`);
    constants[name] = found[1];
  }

  const block = source.match(/export const MOBILE_TABS[^=]*=\s*\[([\s\S]*?)\n\] as const;/);
  if (!block) throw new Error("app/_lib/mobile-tabs.ts 에서 MOBILE_TABS 배열을 찾지 못했습니다.");

  // 상수 참조를 먼저 펼친다. 템플릿 보간(`${SAJU_TAB_ACTION}`)을 남겨두면 항목 분해가
  // `}` 에서 끊기고, 맨 식별자 참조(shellAction: SAJU_TAB_ACTION)는 값이 빈 문자열로 읽힌다.
  let body = block[1];
  for (const [name, value] of Object.entries(constants)) {
    body = body.split("${" + name + "}").join(value);
    body = body.replace(new RegExp(`\\b${name}\\b`, "g"), `"${value}"`);
  }

  const tabs = [];
  for (const entry of body.split(/\{\s*key:/).slice(1)) {
    const read = (field, raw = entry) => {
      const found = raw.match(new RegExp(`${field}:\\s*[\`"']([^\`"']*)[\`"']`));
      return found ? found[1] : "";
    };
    const keyMatch = entry.match(/^\s*[`"']([^`"']*)[`"']/);
    if (!keyMatch) continue;
    tabs.push({
      key: keyMatch[1],
      label: read("label"),
      href: read("href"),
      glyph: read("glyph"),
      shellAction: read("shellAction"),
    });
  }
  return tabs;
}

/** 셸의 .cd-mobile-bottom-nav__main 안 앵커들을 순서대로 뽑는다. */
function readShellTabs(html) {
  const main = html.match(/<div class="cd-mobile-bottom-nav__main">([\s\S]*?)<\/div>/);
  if (!main) return null;

  const tabs = [];
  const anchorPattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/g;
  let match;
  while ((match = anchorPattern.exec(main[1])) !== null) {
    const attrs = match[1];
    const attr = (name) => {
      const found = attrs.match(new RegExp(`${name}="([^"]*)"`));
      return found ? found[1] : "";
    };
    tabs.push({
      key: attr("data-nav-key"),
      label: match[2].replace(/<[^>]*>/g, "").trim(),
      href: attr("href"),
      glyph: attr("data-nav-icon"),
      shellAction: attr("data-action"),
      ariaLabel: attr("aria-label"),
    });
  }
  return tabs;
}

const canonical = readCanonicalTabs();

if (canonical.length !== 5) {
  fail(`MOBILE_TABS 는 5개여야 합니다 (현재 ${canonical.length}개).`);
}

for (const relativePath of SHELL_FILES) {
  const absolutePath = resolve(rootDir, relativePath);
  if (!existsSync(absolutePath)) {
    fail(`${relativePath}: 파일이 없습니다. npm run sync:public 을 실행하세요.`);
    continue;
  }

  const shellTabs = readShellTabs(readFileSync(absolutePath, "utf8"));
  if (!shellTabs) {
    fail(`${relativePath}: .cd-mobile-bottom-nav__main 블록을 찾지 못했습니다.`);
    continue;
  }

  if (shellTabs.length !== canonical.length) {
    fail(`${relativePath}: 탭 개수 불일치 (정본 ${canonical.length} vs 셸 ${shellTabs.length}).`);
    continue;
  }

  canonical.forEach((tab, index) => {
    const shellTab = shellTabs[index];
    // shellAction 은 셸에서 이동 대신 실행할 전역 액션이다. 어긋나면 탭이 이동해버리거나
    // 반대로 아무 일도 일어나지 않는다.
    for (const field of ["key", "label", "href", "glyph", "shellAction"]) {
      if (shellTab[field] !== tab[field]) {
        fail(`${relativePath}: ${index + 1}번째 탭 ${field} 불일치 — 정본 "${tab[field]}" vs 셸 "${shellTab[field]}".`);
      }
    }
    if (!shellTab.ariaLabel) {
      fail(`${relativePath}: ${index + 1}번째 탭(${tab.key})에 aria-label 이 없습니다.`);
    }
  });
}

if (failures.length > 0) {
  console.error("모바일 하단 네비 정합성 검사 실패:\n");
  for (const message of failures) console.error(`- ${message}`);
  console.error("\n루트 index.html 을 고친 뒤 npm run sync:public 을 실행하세요.");
  process.exit(1);
}

console.log("Mobile bottom nav sync OK");
console.log(`- Tabs: ${canonical.map((tab) => `${tab.key}(${tab.label})`).join(", ")}`);
console.log(`- Shells checked: ${SHELL_FILES.length}`);
