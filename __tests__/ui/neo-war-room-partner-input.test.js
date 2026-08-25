/**
 * 🔴 네오 작전실 궁합 입력(상대 명반) 단위 테스트.
 *
 * 이 화면의 입력 로직에는 조용히 돈이 새는 자리가 둘 있다.
 *  ① 서버는 조건을 못 채운 상대 정보를 **422 로 막지 않고 버린다**(1인 분석을 막지 않으려고).
 *     그러니 화면이 막지 않으면 궁합을 켠 사용자가 ₩30,000 을 내고 1인 결과를 받는다.
 *  ② 요청 지문에 상대가 안 들어가면 "같은 본인 입력"의 1인/궁합 요청이 **같은 멱등키**로 나가고,
 *     서버가 뒤엣것을 replay 로 흡수한다. 결제는 됐는데 옛 1인 결과가 돌아온다.
 * 반대로 1인 지문이 한 글자라도 달라지면 저장된 요청키가 회전해, 결제 실패 후 재시도하던
 * 사용자가 새 키로 나간다(= 이중 차감 경로). 세 방향을 다 못 박는다.
 *
 * 레포 Jest 에는 TS 프리셋이 없어 이 모듈을 임포트할 수 없다. node 24 의 타입 스트리핑으로
 * 실제 소스를 그대로 실행해 **문자열 검사가 아니라 동작**을 본다.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { stripTypeScriptTypes } = require("node:module");

const root = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

function toDataUrl(source) {
  return `data:text/javascript;base64,${Buffer.from(source, "utf8").toString("base64")}`;
}

/** .ts 를 타입만 벗겨 data: 모듈로 만든다. data URL 은 상대 경로를 못 푸므로 지정자도 갈아 끼운다. */
function loadTsModule(relativePath, rewrites = {}) {
  let source = stripTypeScriptTypes(read(relativePath), { mode: "strip" });
  for (const [specifier, replacement] of Object.entries(rewrites)) {
    const before = source;
    source = source.split(`"${specifier}"`).join(`"${replacement}"`);
    assert.notEqual(source, before, `${relativePath}: import "${specifier}" 를 못 찾았다 — 하네스를 고칠 것`);
  }
  return import(toDataUrl(source));
}

// 프로필 시드는 브라우저 스토리지를 읽는다. 이 테스트는 시드를 쓰지 않는 경로만 보므로 빈 값으로 세운다.
const AI_PREFILL_SEED_STUB = toDataUrl("export function readAiProfileSeed() { return {}; }\n");

async function loadInputFlow() {
  const formCopy = toDataUrl(stripTypeScriptTypes(read("src/features/neo-war-room/data/form-copy.ts"), { mode: "strip" }));
  return loadTsModule("src/features/neo-war-room/data/input-flow.ts", {
    "@/app/_lib/ai-prefill-seed": AI_PREFILL_SEED_STUB,
    "./form-copy": formCopy,
  });
}

const selfBirth = {
  name: "나",
  gender: "female",
  birthDate: "1991-04-02",
  birthTime: "09:30",
  birthTimeUnknown: false,
  calendarType: "solar",
  city: "Seoul",
  country: "KR",
  timezone: "Asia/Seoul",
  latitude: "37.5665",
  longitude: "126.9780",
};

const partnerBirth = {
  ...selfBirth,
  name: "상대",
  gender: "male",
  birthDate: "1989-11-18",
  birthTime: "22:10",
};

function buildInput(overrides = {}, partnerOverrides = {}) {
  return {
    profileMode: "manual",
    birth: selfBirth,
    method: "ziwei",
    topic: "love",
    intensity: "standard",
    question: "재회하면 또 같은 문제로 싸울까",
    partner: {
      enabled: false,
      relationshipStatus: "",
      birth: partnerBirth,
      ...partnerOverrides,
    },
    ...overrides,
  };
}

test("궁합을 켜면 상대 정보가 다 찰 때까지 제출을 막는다", async () => {
  const { validateNeoWarRoomInput } = await loadInputFlow();
  const empty = { ...partnerBirth, gender: "", birthDate: "", birthTime: "", birthTimeUnknown: false };
  const errors = validateNeoWarRoomInput(buildInput({}, { enabled: true, birth: empty }));
  const fields = errors.map((error) => error.field);
  for (const field of ["partnerRelationship", "partnerBirthDate", "partnerGender", "partnerBirthTime"]) {
    assert.ok(fields.includes(field), `${field} 를 안 막는다 — 서버는 이 입력을 조용히 버린다`);
  }
  for (const error of errors) {
    assert.ok(error.message.length > 5, `${error.field}: 안내 문구가 비어 있다`);
  }
});

test("상대가 다 차면 상대 관련 오류가 없다", async () => {
  const { validateNeoWarRoomInput } = await loadInputFlow();
  const errors = validateNeoWarRoomInput(buildInput({}, { enabled: true, relationshipStatus: "reconciling" }));
  assert.deepEqual(errors.filter((error) => error.field.startsWith("partner")), []);
});

test("출생시간 모름은 궁합에서도 통과한다", async () => {
  const { validateNeoWarRoomInput } = await loadInputFlow();
  const errors = validateNeoWarRoomInput(
    buildInput({}, {
      enabled: true,
      relationshipStatus: "dating",
      birth: { ...partnerBirth, birthTime: "", birthTimeUnknown: true },
    }),
  );
  assert.deepEqual(errors.filter((error) => error.field.startsWith("partner")), []);
});

test("서버가 버리는 범위 밖 생년월일을 화면이 먼저 막는다", async () => {
  const { validateNeoWarRoomInput } = await loadInputFlow();
  for (const birthDate of ["1899-12-31", "2101-01-01", "1991-02-30", "1991-4-2"]) {
    const errors = validateNeoWarRoomInput(
      buildInput({}, { enabled: true, relationshipStatus: "dating", birth: { ...partnerBirth, birthDate } }),
    );
    assert.ok(
      errors.some((error) => error.field === "partnerBirthDate"),
      `${birthDate}: 서버 isValidDateKey 가 버리는 값인데 화면이 통과시킨다`,
    );
  }
});

test("자미두수가 아니면 궁합은 아예 열리지 않는다", async () => {
  const { validateNeoWarRoomInput, buildNeoWarRoomAccessPayload, isNeoWarRoomCompatActive } = await loadInputFlow();
  const input = buildInput({ method: "saju" }, { enabled: true, relationshipStatus: "" });
  assert.equal(isNeoWarRoomCompatActive(input), false);
  // 관계 상태가 비어 있어도 사주 상담을 막지 않는다 — 서버도 같은 조건으로 상대를 버린다.
  assert.deepEqual(validateNeoWarRoomInput(input).filter((error) => error.field.startsWith("partner")), []);
  const payload = buildNeoWarRoomAccessPayload(input, "key-1");
  assert.equal("partnerBirthInput" in payload, false, "술수를 바꿨는데 상대가 페이로드에 남았다");
  assert.equal("relationshipStatus" in payload, false);
});

test("페이로드는 궁합일 때만 상대 키를 싣는다", async () => {
  const { buildNeoWarRoomAccessPayload } = await loadInputFlow();

  const solo = buildNeoWarRoomAccessPayload(buildInput(), "key-solo");
  assert.equal("partnerBirthInput" in solo, false, "🔴 1인 입력에 키가 끼면 서버 inputHash 가 갈려 30일 캐시가 통째로 무효화된다");
  assert.equal("relationshipStatus" in solo, false);

  const compat = buildNeoWarRoomAccessPayload(
    buildInput({}, { enabled: true, relationshipStatus: "married" }),
    "key-compat",
  );
  assert.equal(compat.relationshipStatus, "married");
  assert.equal(compat.partnerBirthInput.birthDate, "1989-11-18");
  assert.equal(compat.partnerBirthInput.gender, "male");

  const unknownTime = buildNeoWarRoomAccessPayload(
    buildInput({}, {
      enabled: true,
      relationshipStatus: "married",
      birth: { ...partnerBirth, birthTime: "22:10", birthTimeUnknown: true },
    }),
    "key-unknown",
  );
  assert.equal(unknownTime.partnerBirthInput.birthTime, "", "모름을 켰는데 옛 시간이 그대로 실렸다");
});

test("요청 지문이 1인과 궁합을 가른다", async () => {
  const { createNeoWarRoomInputFingerprint } = await loadInputFlow();

  const solo = createNeoWarRoomInputFingerprint(buildInput());
  // 🔴 상대를 채워 두고 토글만 꺼도 1인 지문은 그대로여야 한다 — 저장된 요청키가 회전하면
  //    결제 실패 후 재시도가 새 키로 나가 이중 차감 경로가 열린다.
  assert.equal(solo.includes("partner"), false, "1인 지문에 상대 키가 섞였다");
  assert.equal(solo, createNeoWarRoomInputFingerprint(buildInput({}, { relationshipStatus: "dating" })));

  const compat = createNeoWarRoomInputFingerprint(buildInput({}, { enabled: true, relationshipStatus: "dating" }));
  assert.notEqual(solo, compat, "🔴 1인과 궁합이 같은 지문 = 같은 멱등키 = 서버가 replay 로 흡수");

  const otherStatus = createNeoWarRoomInputFingerprint(buildInput({}, { enabled: true, relationshipStatus: "breakup" }));
  assert.notEqual(compat, otherStatus, "관계 상태를 바꿨는데 지문이 그대로다");

  const otherPartner = createNeoWarRoomInputFingerprint(
    buildInput({}, {
      enabled: true,
      relationshipStatus: "dating",
      birth: { ...partnerBirth, birthDate: "1990-01-01" },
    }),
  );
  assert.notEqual(compat, otherPartner, "상대를 바꿨는데 지문이 그대로다");
});

test("화면이 내미는 관계 상태가 서버가 받는 목록과 정확히 같다", async () => {
  const { NEO_COMPAT_RELATIONSHIP_STATUSES } = await import(
    toDataUrl(stripTypeScriptTypes(read("src/features/neo-war-room/data/form-copy.ts"), { mode: "strip" }))
  );
  const serverSource = read("worker/lib/neo-operation-room-compat.js");
  const block = serverSource.match(/NEO_RELATIONSHIP_STATUSES = Object\.freeze\(\[([\s\S]*?)\]\)/);
  assert.ok(block, "서버의 NEO_RELATIONSHIP_STATUSES 를 못 찾았다 — 이름이 바뀌었으면 가드도 함께 고칠 것");
  const serverStatuses = [...block[1].matchAll(/"([a-z]+)"/g)].map((match) => match[1]);
  assert.ok(serverStatuses.length >= 5, `서버 상태를 ${serverStatuses.length}개밖에 못 찾았다 — 탐지가 깨진 것이다`);
  // 🔴 화면에만 있는 상태는 서버가 조용히 버려 전략 챕터가 무게중심을 잃는다.
  assert.deepEqual([...NEO_COMPAT_RELATIONSHIP_STATUSES].sort(), [...serverStatuses].sort());
});

test("관계 상태 라벨이 다섯 저작 로케일에 다 있다", async () => {
  const formCopyUrl = toDataUrl(stripTypeScriptTypes(read("src/features/neo-war-room/data/form-copy.ts"), { mode: "strip" }));
  const { NEO_COMPAT_RELATIONSHIP_STATUSES, getNeoCompatStatusLabel } = await import(formCopyUrl);
  for (const locale of ["ko", "en", "ja", "zh-CN", "zh-TW"]) {
    for (const status of NEO_COMPAT_RELATIONSHIP_STATUSES) {
      const label = getNeoCompatStatusLabel(status, locale);
      assert.ok(label && label.length > 0, `${locale}/${status}: 라벨이 비었다`);
    }
  }
  assert.equal(getNeoCompatStatusLabel("nonsense", "ko"), "", "모르는 상태는 빈 문자열이어야 화면이 줄을 통째로 뺀다");
});

/**
 * 위 테스트들은 로직만 본다 — 화면이 그 로직에 값을 안 넘기면 전부 초록불인 채로 기능이 죽는다.
 * 배선(상태·검증 입력·핸들러·상태 칩·발사 확인 표시)이 실제로 있는지 함께 못 박는다.
 */
test("입력 화면이 상대 정보 블록을 배선한다", () => {
  const page = read("src/features/neo-war-room/NeoOperationRoomPage.tsx");
  const wiring = [
    ["buildDefaultNeoWarRoomPartnerState", "상대 입력 상태"],
    // 쉼표까지 봐야 한다 — 콤마 없는 `{ method, partner: partnerState }` 가 따로 있어서
    // 쉼표를 빼면 검증 입력을 끊어도 그 줄이 대신 통과시킨다(음성 테스트에서 실제로 통과했다).
    ["partner: partnerState,", "검증·지문·페이로드로 넘기는 자리"],
    ["updatePartnerBirthInput", "상대 필드 입력 핸들러"],
    ["NEO_COMPAT_RELATIONSHIP_STATUSES.map", "관계 상태 선택 칩"],
    ['formCopy["partner.launchBadge"]', "발사 확인의 궁합 표시"],
  ];
  for (const [marker, why] of wiring) {
    assert.ok(page.includes(marker), `입력 화면에 ${why} 배선이 없다: ${marker}`);
  }
});
