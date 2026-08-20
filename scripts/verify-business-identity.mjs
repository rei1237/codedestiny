#!/usr/bin/env node
/**
 * 법정 사업자 표기가 어디서든 **등록 원문 그대로**인지 본다.
 *
 * 왜 필요한가 (2026-08-20 실측):
 *   `business.*` 값이 12개 로케일 사전에서 **번역돼 있었다.** 라벨이 아니라 값이다.
 *     · 상호      ja `コードの運命` · de `Code-Schicksal` · vi `Mã số mệnh` · ms `Kod Takdir`
 *     · 대표자명  es `Parque Byeong-ha` · fr `Parc Byeong-ha` · zh-TW `樸秉河`
 *                 (Park 을 "공원"으로, 박을 "나무껍질"로 옮긴 기계번역 결과다)
 *     · 신고번호  en/de `2026-Hwaseongho-0264` · ja 사전 `2026-華城湖-0264` ·
 *                 lib/legal/legalContent.ts 의 ja `第2026-火城湖-0264号` — 같은 언어에서 두 값
 *     · 주소      `..., 101-1207` 로 동/호가 뭉개졌고 한자가 `孝行`/`孝興`, `飛鳳`/`飛峰` 로 갈렸다
 *   등록된 상호·대표자·번호·주소는 **문자열 자체가 법적 형식**이라, 옮기는 순간 등록되지 않은
 *   사업자 정보를 표시하게 된다. PG 심사와 전자상거래법 표시가 정확히 보는 지점이다.
 *
 * 🔴 번역 파이프라인이 이 키들을 다시 번역하면 조용히 되돌아간다. 그래서 이 가드가 있다.
 *
 * fail-closed: 대상을 못 찾으면 통과가 아니라 실패다(사전 12벌 · 셸 스팬 7개 바닥 단언).
 *
 * 실행: node scripts/verify-business-identity.mjs
 */

import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { BUSINESS_IDENTITY } from "../lib/site-policy-config.js";

const root = process.cwd();
const failures = [];

function read(relPath) {
  return readFileSync(resolve(root, relPath), "utf8");
}

/**
 * 🔴 이 가드가 **반드시 열어야 하는** 파일을 모은다. (4)가 이 목록을 워크플로 트리거 paths 와
 *    대조한다. 사본 확산 검사(3)가 우연히 읽는 파일은 여기 넣지 않는다 — 그건 "트리거에 넣어라"가
 *    아니라 "그 사본을 지워라"가 정답이라, 섞으면 실패 메시지가 반대 방향을 가리킨다.
 */
const openedPaths = new Set();

function readTracked(relPath) {
  openedPaths.add(relPath.replace(/\\/g, "/"));
  return read(relPath);
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}

/** 사전·셸이 쓰는 `business.*` 값 키 → 정본 필드. 라벨 키는 번역 대상이라 여기 없다. */
const VALUE_KEYS = {
  companyValue: BUSINESS_IDENTITY.companyName,
  representativeValue: BUSINESS_IDENTITY.representative,
  registrationValue: BUSINESS_IDENTITY.registrationNumber,
  mailOrderValue: BUSINESS_IDENTITY.mailOrderNumber,
  contactValue: BUSINESS_IDENTITY.phone,
  emailValue: BUSINESS_IDENTITY.email,
  addressValue: BUSINESS_IDENTITY.address,
};

/** 라벨과 값을 잇는 구분자(": " / "："). 표시 규칙이라 로케일 것을 그대로 둔다. */
function stripSeparator(value) {
  return String(value).replace(/^\s*[:：]\s*/, "");
}

// (1) 사전 12벌. 값 키는 로케일과 무관하게 등록 원문이어야 한다.
{
  const dir = "public/i18n";
  const files = readdirSync(resolve(root, dir)).filter((name) => name.endsWith(".json"));
  assert(files.length >= 12, `${dir}: 사전을 ${files.length}개만 찾았다 — 이 검사가 대상 없이 통과할 뻔했다`);

  for (const file of files) {
    const dictionary = JSON.parse(readTracked(`${dir}/${file}`));
    const business = dictionary.business;
    assert(business && typeof business === "object", `${dir}/${file}: business 블록이 없다 — 푸터 사업자 정보가 사라진다`);
    if (!business) continue;
    for (const [key, registered] of Object.entries(VALUE_KEYS)) {
      if (!(key in business)) continue; // 로케일마다 키 집합이 조금 다르다(addressLabel 등)
      assert(
        stripSeparator(business[key]) === registered,
        `${dir}/${file}: business.${key} 가 등록 원문과 다르다 — 값은 번역 대상이 아니다\n`
          + `      현재 ${JSON.stringify(business[key])}\n      등록 ${JSON.stringify(registered)}`,
      );
    }
  }
}

// (2) 정적 셸. 사전이 아니라 인라인 한국어가 곧 ko 정본이므로(cdTranslate 는 ko 에서 사전을
//     건너뛴다) 여기 값이 틀리면 한국어 사용자가 틀린 표기를 본다.
{
  const shell = readTracked("index.html");
  const spans = [...shell.matchAll(/<span data-cd-trans="business\.([A-Za-z]+Value)">([^<]*)<\/span>/g)];
  assert(spans.length >= 7, `index.html: business 값 스팬을 ${spans.length}개만 찾았다 — 이 검사가 무력화됐다`);
  for (const [, key, text] of spans) {
    const registered = VALUE_KEYS[key];
    assert(registered !== undefined, `index.html: business.${key} 는 정본에 없는 값 키다 — 정본에 추가하거나 라벨로 바꿔라`);
    if (registered === undefined) continue;
    assert(
      stripSeparator(text) === registered,
      `index.html: business.${key} 가 등록 원문과 다르다\n      현재 ${JSON.stringify(text)}\n      등록 ${JSON.stringify(registered)}`,
    );
  }
}

// (3) 사본 확산 금지. 새 소스 파일이 값을 손으로 다시 적으면 다음 개정 때 그 하나만 낡는다
//     — 실제로 그렇게 lib/legal/legalContent.ts 와 app/ja/tokushoho 가 갈라졌다.
//     🔴 파일명을 나열하지 않는다. git 으로 전수 발견하고 **허용 접두사**만 정책으로 둔다.
{
  const ALLOWED_PREFIXES = [
    "lib/site-policy-config.js", // 정본
    "index.html", // 정적 셸(ko 정본)
    "public/", // sync:public 미러 · 사전
    "i18n/", // 번역 저작 산출물
    "docs/", // 기록
    "scripts/verify-business-identity.mjs", // 이 가드
  ];
  const NEEDLES = [BUSINESS_IDENTITY.mailOrderNumber, BUSINESS_IDENTITY.address];

  for (const needle of NEEDLES) {
    let hits = [];
    try {
      hits = execFileSync("git", ["grep", "-l", "-F", needle], { cwd: root, encoding: "utf8" })
        .split("\n")
        .filter(Boolean);
    } catch {
      hits = [];
    }
    assert(hits.length > 0, `"${needle}" 를 담은 파일을 하나도 못 찾았다 — 표기가 통째로 사라졌거나 검사가 깨졌다`);

    for (const file of hits) {
      if (ALLOWED_PREFIXES.some((prefix) => file.startsWith(prefix))) continue;
      // 주석에만 있으면 사본이 아니다(왜 이렇게 됐는지 적어 두는 것까지 막지 않는다).
      const stripped = read(file)
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
      assert(
        !stripped.includes(needle),
        `${file}: 사업자 표기를 손으로 다시 적었다 — lib/site-policy-config.js 의 BUSINESS_IDENTITY 에서 파생시켜라\n`
          + `      (사본은 다음 개정 때 그 하나만 낡는다)`,
      );
    }
  }
}

// (4) 이 가드를 부르는 워크플로의 트리거 paths 가 **가드가 여는 파일 전부**를 덮는가.
//
// 🔴 CLAUDE.md 원칙 10. 가드가 보는 파일이 트리거에 없으면 그 파일만 고친 PR 에서 가드가
//    깨어나지 않는다 — 있으나 마나 한 게이트가 된다. paid-flow-gates 에서 이 구멍이 다섯 번 났다.
//    손으로 목록을 적지 않는다: readTracked() 가 실제로 연 경로를 그대로 쓴다.
{
  const WORKFLOW = ".github/workflows/business-identity-gate.yml";
  const workflow = read(WORKFLOW);

  assert(
    /run: npm run verify:business-identity\s*$/m.test(workflow),
    `${WORKFLOW}: 이 워크플로가 verify:business-identity 를 부르지 않는다 — 게이트가 껍데기만 남았다`,
  );

  const pathsBlock = workflow.match(/^ {4}paths:$([\s\S]*?)^ {2}workflow_dispatch:$/m);
  assert(pathsBlock, `${WORKFLOW}: pull_request.paths 블록을 찾지 못했다 — 트리거 대조가 무력화됐다`);

  const globs = pathsBlock
    ? [...pathsBlock[1].matchAll(/^ {6}- "([^"]+)"$/gm)].map((match) => match[1])
    : [];
  assert(globs.length >= 8, `${WORKFLOW}: 트리거 경로를 ${globs.length}개만 읽었다 — 대조가 무력화됐다`);

  const covered = (relPath) => globs.some((glob) => (
    glob.endsWith("/**") ? relPath.startsWith(glob.slice(0, -2)) : glob === relPath
  ));

  // 임포트로 들어오는 정본은 readTracked() 를 거치지 않으므로 명시한다.
  for (const relPath of [...openedPaths, "lib/site-policy-config.js"].sort()) {
    assert(
      covered(relPath),
      `${WORKFLOW}: 이 가드는 ${relPath} 를 읽는데 트리거 paths 에 없다 — `
        + `그 파일만 고친 PR 에서는 이 게이트가 깨어나지 않는다(CLAUDE.md 원칙 10)`,
    );
  }
}

if (failures.length) {
  console.error("[verify:business-identity] FAILED");
  for (const message of failures) console.error(`  - ${message}`);
  process.exit(1);
}

console.log("[verify:business-identity] ok — 사전 12벌 · 정적 셸 · 소스 사본 · 게이트 트리거 커버리지 통과");
