/**
 * 🔴 네오 작전실 궁합 챕터가 화면까지 도달하는지 보는 가드.
 *
 * 서버(PR #1147)는 궁합 모드에서 1인 챕터 4개를 궁합 챕터 4개로 **갈아 끼운다.**
 * 그래서 화면이 `repeatedChoice` / `topicStyle` / `topicAreas` / `misalignedFlow` 만 그리면,
 * 궁합 상담은 값이 빈 카드 네 장을 보여주고 실제로 생성된 4챕터는 어디에도 안 나온다.
 * ₩30,000 을 낸 상담에서 본문이 통째로 사라지는 사고라 정적으로 못 박는다.
 *
 * 대상 필드는 손으로 적지 않고 **서버의 mergeNeoCompatSections 반환 리터럴에서 전수 발견**한다.
 * 서버가 필드를 더하거나 이름을 바꾸면 이 가드가 즉시 두 화면 모두에서 실패한다.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { stripTypeScriptTypes } = require("node:module");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const toDataUrl = (source) => `data:text/javascript;base64,${Buffer.from(source, "utf8").toString("base64")}`;

const PROMPT_SOURCE = "worker/lib/neo-operation-room-prompt.js";
const SURFACES = [
  "src/features/neo-war-room/NeoOperationRoomResultPage.tsx",
  "src/features/neo-war-room/NeoOperationRoomPage.tsx",
];

/** 중괄호 균형으로 함수 본문을 잘라 낸다 — 이름 grep 은 다른 함수의 같은 단어를 주워 온다. */
function sliceFunctionBody(source, signature) {
  const start = source.indexOf(signature);
  assert.notEqual(start, -1, `${PROMPT_SOURCE}: ${signature} 를 못 찾았다 — 이름이 바뀌었으면 가드도 함께 고칠 것`);
  const open = source.indexOf("{", start + signature.length - 1);
  assert.notEqual(open, -1, `${signature}: 본문 시작 중괄호를 못 찾았다`);
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    else if (source[index] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(open, index + 1);
    }
  }
  throw new Error(`${signature}: 본문 끝을 못 찾았다`);
}

/** 본문의 객체 리터럴 키를 전수 수집한다(`key:` 형태만 — 문자열 키와 호출은 제외). */
function collectObjectKeys(body) {
  const keys = new Set();
  for (const match of body.matchAll(/(^|[\s{,([])([A-Za-z_$][\w$]*)\s*:/gm)) {
    keys.add(match[2]);
  }
  return keys;
}

/**
 * 화면 소스에서 궁합 타입 선언 블록을 걷어낸다.
 * 🔴 선언에는 모든 필드 이름이 한 번씩 적혀 있어서, 걷어내지 않으면 "타입만 베껴 두고 렌더는 안 하는"
 *    화면이 이 가드를 통과한다(음성 테스트에서 실제로 통과했다).
 */
function stripCompatTypeDeclarations(source) {
  let out = source.replace(/^type NeoCompatSide = .*$/m, "");
  const start = out.indexOf("type NeoCompatSections = {");
  if (start === -1) return out;
  let depth = 0;
  for (let index = out.indexOf("{", start); index < out.length; index += 1) {
    if (out[index] === "{") depth += 1;
    else if (out[index] === "}") {
      depth -= 1;
      if (depth === 0) {
        out = out.slice(0, start) + out.slice(index + 1);
        break;
      }
    }
  }
  return out;
}

// 서버 본문에는 있지만 화면 필드가 아닌 지역 이름들 — 여기 적힌 것은 "화면에 없어도 되는 이유"가 있다.
const NOT_A_RENDERED_FIELD = new Set([
  "default", // switch 문/객체 스프레드 등에서 딸려 오는 예약어
]);

test("궁합 챕터의 모든 필드가 결과 화면과 브리핑 패널 양쪽에 렌더된다", () => {
  const promptSource = read(PROMPT_SOURCE);
  const body = sliceFunctionBody(promptSource, "function mergeNeoCompatSections(map)");
  const fields = [...collectObjectKeys(body)].filter((key) => !NOT_A_RENDERED_FIELD.has(key));

  // 🔴 대상이 없으면 통과시키는 가드는 가드가 아니다.
  assert.ok(fields.length >= 15, `궁합 필드를 ${fields.length}개밖에 못 찾았다 — 탐지가 깨진 것이다`);
  for (const chapter of ["mutualRead", "palaceCross", "conflictPattern", "relationStrategy"]) {
    assert.ok(fields.includes(chapter), `서버가 더 이상 ${chapter} 를 내지 않는다 — 화면과 가드를 함께 고칠 것`);
  }

  const missing = [];
  for (const surface of SURFACES) {
    // 🔴 타입 선언에는 모든 필드 이름이 다 적혀 있다 — 그대로 두면 "타입만 있고 렌더는 없는" 화면이 통과한다.
    const source = stripCompatTypeDeclarations(read(surface));
    for (const field of fields) {
      if (!new RegExp(`\\b${field}\\b`).test(source)) missing.push(`${surface}: ${field}`);
    }
  }
  assert.deepEqual(missing, [], `궁합 챕터 필드가 화면에 안 그려진다:\n  ${missing.join("\n  ")}`);
});

/**
 * 궁합 계기판은 세션 응답(publicSession)이 주는 값이라 브리핑 안에 없다.
 * 응답 키 이름이 갈리면 화면이 조용히 점수를 못 그리므로 양쪽을 맞대어 본다.
 */
test("궁합 계기판이 읽는 응답 키가 서버 응답과 일치한다", () => {
  const routeSource = read("worker/routes/neo-operation-room.js");
  const publicSessionBody = sliceFunctionBody(routeSource, "function publicSession(doc)");
  const responseKeys = ["relationshipMode", "relationshipStatus", "compatScores", "partnerBirthTimeUnknown"];
  for (const key of responseKeys) {
    assert.ok(
      new RegExp(`\\b${key}\\s*:`).test(publicSessionBody),
      `publicSession 이 ${key} 를 더 이상 내려주지 않는다`,
    );
  }

  const cardSource = read("src/features/neo-war-room/components/NeoCompatSummaryCard.tsx");
  // 종합은 술수 무관으로 늘 있다.
  assert.ok(cardSource.includes("scores.overall"), "계기판이 종합 점수를 안 그린다");
  // 축은 술수마다 다르므로(자미두수 3 · 사주 4 · 베다 0) 이름을 박지 않고 배열을 순회해야 한다.
  assert.ok(cardSource.includes("resolveAxes(scores)"), "계기판이 축 배열을 순회하지 않는다 — 축 이름을 박아 두면 술수가 늘 때 게이지가 빈다");
  // 🔴 옛 상담(2026-08-26 이전 자미두수)은 평면 키로 저장돼 있다. 폴백이 사라지면 재열람이 빈 카드가 된다.
  for (const legacyAxis of ["resonance", "friction", "growth"]) {
    assert.ok(
      cardSource.includes(`scores.${legacyAxis}`),
      `옛 모양 폴백에서 ${legacyAxis} 가 빠졌다 — 이전에 저장된 궁합 상담의 점수 카드가 빈다`,
    );
  }

  // 궁합 요약을 실제로 화면에 넘기는 배선까지 — 카드만 있고 아무도 안 부르면 점수는 영영 안 보인다.
  for (const surface of SURFACES) {
    assert.match(read(surface), /<NeoCompatSummaryCard/, `${surface}: 궁합 계기판을 렌더하지 않는다`);
  }
});

/**
 * 🔴 서버가 낼 수 있는 축을 화면이 전부 로케일화하는가.
 *
 * 서버 label 은 한국어라 카드가 그대로 그리면 en/ja/zh 화면에 한국어가 박힌다. 카드의
 * AXIS_COPY_KEYS 가 축 키를 카피 키로 옮기고, 그 카피 키가 다섯 저작 로케일에 다 있어야 한다.
 * 축을 더하면서 카피를 빠뜨리면 여기서 걸린다.
 */
test("서버가 내는 모든 궁합 축을 화면이 로케일별로 부른다", async () => {
  const { NEO_COMPAT_METHODS, buildNeoCompat } = await import(
    pathToFileURL(path.join(root, "worker/lib/neo-operation-room-compat.js")).href
  );
  const formCopyUrl = toDataUrl(stripTypeScriptTypes(read("src/features/neo-war-room/data/form-copy.ts"), { mode: "strip" }));
  const { getNeoFormCopy } = await import(formCopyUrl);

  const cardSource = read("src/features/neo-war-room/components/NeoCompatSummaryCard.tsx");
  const mapBlock = cardSource.match(/const AXIS_COPY_KEYS = \{([\s\S]*?)\} as const;/);
  assert.ok(mapBlock, "카드의 AXIS_COPY_KEYS 를 못 찾았다 — 이름이 바뀌었으면 가드도 함께 고칠 것");
  const axisCopyKeys = new Map(
    [...mapBlock[1].matchAll(/(\w+):\s*"([^"]+)"/g)].map((match) => [match[1], match[2]]),
  );
  assert.ok(axisCopyKeys.size > 0, "축 카피 매핑을 못 읽었다 — 탐지가 깨진 것이다");

  // 축 이름은 엔진 산출물에서 나온다. 실제 차트를 세우는 대신 축 표를 그대로 읽어 전수로 본다.
  const compatSource = read("worker/lib/neo-operation-room-compat.js");
  const axesBlock = compatSource.match(/const COMPAT_SCORE_AXES = Object\.freeze\(\{([\s\S]*?)\n\}\);/);
  assert.ok(axesBlock, "서버의 COMPAT_SCORE_AXES 를 못 찾았다 — 이름이 바뀌었으면 가드도 함께 고칠 것");
  const serverAxisKeys = [...axesBlock[1].matchAll(/key: "(\w+)"/g)].map((match) => match[1]);
  assert.ok(serverAxisKeys.length >= 3, `서버 축을 ${serverAxisKeys.length}개밖에 못 찾았다 — 탐지가 깨진 것이다`);

  const copies = ["ko", "en", "ja", "zh-CN", "zh-TW"].map((locale) => [locale, getNeoFormCopy(locale)]);
  for (const axisKey of serverAxisKeys) {
    const copyKey = axisCopyKeys.get(axisKey);
    assert.ok(copyKey, `축 "${axisKey}" 의 화면 카피 키가 없다 — 다른 로케일에 한국어 라벨이 박힌다`);
    for (const [locale, copy] of copies) {
      assert.ok(copy[copyKey] && copy[copyKey].length > 0, `${locale}/${copyKey}: 축 라벨이 비었다`);
    }
  }

  // 궁합 술수 전부에 축 표가 있거나(점수를 낸다) 없거나(베다처럼 종합만) 둘 중 하나여야 한다.
  assert.ok(NEO_COMPAT_METHODS.length > 0, "궁합 술수 목록이 비었다");
  assert.equal(typeof buildNeoCompat, "function");
});
