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
const { pathToFileURL } = require("node:url");

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

// 화면·서버가 공유하는 궁합 주제. 소스에서 읽어 와야 값이 바뀔 때 테스트가 같이 따라간다.
const NEO_COMPAT_TOPIC = (() => {
  const source = read("src/features/neo-war-room/data/input-flow.ts");
  const match = source.match(/NEO_COMPAT_TOPIC = "([^"]+)"/);
  assert.ok(match, "input-flow.ts 에서 NEO_COMPAT_TOPIC 을 못 찾았다 — 이름이 바뀌었으면 가드도 함께 고칠 것");
  return match[1];
})();

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
    // 🔴 실제 topicOptions 값이어야 한다. 궁합 게이트가 주제를 보므로 아무 문자열이나 쓰면
    //    이 파일의 모든 궁합 테스트가 "게이트가 닫혀서" 통과하는 위양성이 된다.
    topic: NEO_COMPAT_TOPIC,
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

test("궁합은 술수마다 열리고, 지원 밖 술수는 상대를 버린다", async () => {
  const { validateNeoWarRoomInput, buildNeoWarRoomAccessPayload, isNeoWarRoomCompatActive, NEO_COMPAT_METHODS } = await loadInputFlow();
  const allMethods = ["saju", "ziwei", "vedic", "astrology"];
  for (const method of allMethods) {
    const supported = NEO_COMPAT_METHODS.includes(method);
    const input = buildInput({ method }, { enabled: true, relationshipStatus: "dating" });
    assert.equal(isNeoWarRoomCompatActive(input), supported, `${method}: 궁합 개폐가 지원 목록과 어긋난다`);
    const payload = buildNeoWarRoomAccessPayload(input, "key-1");
    assert.equal(
      "partnerBirthInput" in payload,
      supported,
      supported ? `${method}: 궁합인데 상대가 페이로드에 없다` : `${method}: 술수를 바꿨는데 상대가 페이로드에 남았다`,
    );
  }
  // 🔴 지원 술수라도 토글을 끄면 상대는 사라져야 한다. 여기가 무너지면 1인 결제로 궁합이 나간다.
  for (const method of NEO_COMPAT_METHODS) {
    const off = buildInput({ method }, { enabled: false, relationshipStatus: "dating" });
    assert.equal(isNeoWarRoomCompatActive(off), false, `${method}: 토글을 껐는데 궁합이 켜져 있다`);
    assert.deepEqual(validateNeoWarRoomInput(off).filter((error) => error.field.startsWith("partner")), []);
    const payload = buildNeoWarRoomAccessPayload(off, "key-off");
    assert.equal("partnerBirthInput" in payload, false, `${method}: 토글을 껐는데 상대가 페이로드에 남았다`);
    assert.equal("relationshipStatus" in payload, false);
  }
});

test("연애·재회가 아닌 주제에서는 궁합이 아예 열리지 않는다", async () => {
  const { validateNeoWarRoomInput, buildNeoWarRoomAccessPayload, createNeoWarRoomInputFingerprint, isNeoWarRoomCompatActive } = await loadInputFlow();
  // 🔴 서버(normalizePartnerBirthInfo)도 같은 조건으로 상대를 버린다. 화면이 안 막으면
  //    ₩30,000 을 내고 주제와 무관한 관계 상담 챕터를 받는다.
  const otherTopics = ["직업 / 이직", "돈 / 재물", "인간관계", "멘탈 / 자기관리", "인생 방향", "지금 선택", "내가 반복하는 실수"];
  for (const topic of otherTopics) {
    const input = buildInput({ topic }, { enabled: true, relationshipStatus: "married" });
    assert.equal(isNeoWarRoomCompatActive(input), false, `${topic}: 궁합이 열렸다`);
    assert.deepEqual(
      validateNeoWarRoomInput(input).filter((error) => error.field.startsWith("partner")),
      [],
      `${topic}: 상대 검증이 1인 상담을 막는다`,
    );
    const payload = buildNeoWarRoomAccessPayload(input, "key-topic");
    assert.equal("partnerBirthInput" in payload, false, `${topic}: 주제를 바꿨는데 상대가 페이로드에 남았다`);
    assert.equal("relationshipStatus" in payload, false, `${topic}: 관계 상태가 페이로드에 남았다`);
    assert.equal(
      createNeoWarRoomInputFingerprint(input).includes("partner"),
      false,
      `${topic}: 1인 지문에 상대 키가 섞였다`,
    );
  }
});

test("서버 게이트가 화면 게이트와 같은 주제를 연다", () => {
  // 화면은 "연애 / 재회" 문자열을, 서버는 normalizeTopicKey 로 정규화한 "연애/재회" 를 본다.
  // 둘이 어긋나면 화면은 상대를 받고 서버는 버려 결제한 요청이 1인 결과로 나간다.
  const compatSource = read("worker/lib/neo-operation-room-compat.js");
  const keyMatch = compatSource.match(/NEO_COMPAT_TOPIC_KEY = "([^"]+)"/);
  assert.ok(keyMatch, "worker 의 NEO_COMPAT_TOPIC_KEY 를 못 찾았다");

  // 🔴 게이트는 라우트 테스트가 mock 하지 않는 모듈에 있어야 한다. 프롬프트 모듈로 되돌리면
  //    payment-flow 스위트의 mock 이 게이트를 지워, 주제 가드가 초록불인 채로 죽는다.
  assert.match(
    compatSource,
    /export function normalizeTopicKey/,
    "normalizeTopicKey 가 궁합 모듈 밖으로 나갔다 — 라우트 테스트의 mock 이 게이트를 지운다",
  );
  assert.equal(
    NEO_COMPAT_TOPIC.replace(/\s+/g, ""),
    keyMatch[1].replace(/\s+/g, ""),
    "화면 주제와 서버 주제 키가 다르다",
  );

  const routeSource = read("worker/routes/neo-operation-room.js");
  assert.match(
    routeSource,
    /normalizeTopicKey\(topic\) !== NEO_COMPAT_TOPIC_KEY\) return null;/,
    "🔴 서버 normalizePartnerBirthInfo 에 주제 게이트가 없다 — 화면만 막으면 API 직접 호출이 통과한다",
  );
});

test("궁합을 여는 술수 목록이 화면·서버·프롬프트에서 모두 같다", async () => {
  const { NEO_COMPAT_METHODS } = await loadInputFlow();
  // 🔴 문자열 검사가 아니라 실제 모듈을 로드해 본다. 서버 목록은 교차 빌더 표에서
  //    파생되므로(Object.keys), 빌더를 안 만들고 목록에만 이름을 적으면 여기서 걸린다.
  const { NEO_COMPAT_METHODS: serverMethods } = await import(pathToFileURL(path.join(root, "worker/lib/neo-operation-room-compat.js")).href);
  const { NEO_COMPAT_PROMPT_METHODS } = await import(pathToFileURL(path.join(root, "worker/lib/neo-operation-room-prompt.js")).href);

  // 🔴 화면에만 있는 술수는 상대 칸을 열어 놓고 서버가 조용히 버려, 결제한 요청이
  //    1인 상담으로 나간다. 서버에만 있는 술수는 아무도 못 쓰는 죽은 경로가 된다.
  assert.deepEqual([...NEO_COMPAT_METHODS].sort(), [...serverMethods].sort(), "화면 목록 != 서버 교차 빌더");
  // 프롬프트 어휘가 없으면 그 술수의 궁합 챕터가 자미두수 어휘("부부궁"…)로 나간다.
  assert.deepEqual([...serverMethods].sort(), [...NEO_COMPAT_PROMPT_METHODS].sort(), "서버 교차 빌더 != 프롬프트 어휘 표");

  // 라우트가 그 목록을 그대로 쓰는지 — 손으로 다시 적어 두면 조용히 갈라진다.
  assert.match(
    read("worker/routes/neo-operation-room.js"),
    /COMPAT_METHODS = new Set\(NEO_COMPAT_METHODS\)/,
    "라우트가 궁합 술수 목록을 따로 적고 있다 — 정본 하나를 쓸 것",
  );
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
    // 주제를 안 넘기면 isNeoWarRoomCompatActive 가 항상 false 가 되어 궁합이 통째로 죽는다.
    ["isNeoWarRoomCompatActive({ method, topic, partner: partnerState })", "주제까지 넘기는 궁합 판정"],
    ["isNeoWarRoomCompatSupported(method) && topic === NEO_COMPAT_TOPIC", "상대 칸을 여는 주제·술수 조건"],
    ["updatePartnerBirthInput", "상대 필드 입력 핸들러"],
    ["NEO_COMPAT_RELATIONSHIP_STATUSES.map", "관계 상태 선택 칩"],
    ['formCopy["partner.launchBadge"]', "발사 확인의 궁합 표시"],
  ];
  for (const [marker, why] of wiring) {
    assert.ok(page.includes(marker), `입력 화면에 ${why} 배선이 없다: ${marker}`);
  }
});
