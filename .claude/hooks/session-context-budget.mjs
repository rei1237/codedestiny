#!/usr/bin/env node
/**
 * UserPromptSubmit 훅 — 자동 압축 직전에 세션 상태 파일을 갱신하게 하고, 압축이 안 돌면 알린다.
 *
 * 왜 (2026-08-24 실측): 토큰 소비는 요청 수가 아니라 **요청당 컨텍스트 크기**가 정한다.
 * 트랜스크립트 85개 디렉터리·요청 50,853건을 파싱한 결과, 08-19 → 08-22 사이 요청 수는
 * +22% 인데 평균 컨텍스트는 262K → 463K 로 +77% 올랐고, 800K 초과 요청이 0건 → 1,092건이
 * 됐다. 소비의 34%가 **단일 세션 하나**에서 나왔다 — 13,184 요청 / 44.7시간 / 자동압축 32회.
 *
 * 🔴 임계 재조정 (2026-08-29 실측): 이 훅을 넣고도 08-18~08-29 메인세션 83개 / 요청
 * 14,383건(message.id 중복제거)의 평균 컨텍스트가 **318k** 였다. 구간을 갈라 보면
 * **300k 초과가 요청의 45% 인데 총소비의 69.7%** 를 먹는다. 실제 세션 궤적에 임계 기반
 * clear 를 적용한 시뮬레이션은 450k → 71% · 300k → 54% · 200k → 41% · 150k → 34% 였다.
 * 옛 임계(300k/450k/650k)는 그 표에서 가장 비싼 자리에 있었다. 반대로 세션 시작 고정비는
 * 첫 요청 컨텍스트 중앙값 **64k**, 83세션 전부 합쳐 총소비의 **0.1%** 다 —
 * **`/clear` 자체는 비용이 아니다.** 재현: ~/.claude/projects 아래 세션 jsonl 전부에서
 * assistant usage 의 input+cache_read+cache_creation 을 message.id 로 중복제거해 합산.
 *
 * 🔴 이 훅은 `UserPromptSubmit` 에서만 돈다. 같은 기간 사람 턴 441회 / 요청 14,383건
 *    (턴당 32.6)이라 한 프롬프트 안에서 임계를 통째로 넘는 일이 흔하다 — 훅은 사후에
 *    다음 프롬프트에서 잡는다. 그래서 임계를 실측 분기점보다 **앞에** 둔다.
 *
 * 컨텍스트는 한 번 부풀면 그 세션의 **모든 후속 요청에서 다시 지불된다.** 그래서 늦게
 * 깨닫는 것이 곧 비용이다. CLAUDE.md 코딩 원칙 12 는 이미 "컨텍스트가 모자라면 밀어붙이지
 * 말고 인수인계"라고 적고 있었지만, 44시간 세션이 나왔다는 것은 규칙만으로는 안 지켜졌다는
 * 뜻이다. 이 훅은 그 판단 시점을 사람의 기억이 아니라 측정값에 건다.
 *
 * 🔴 2026-10-01 전환 — 인수인계 지시를 뺐다. 사용자 요청: "인수 인계 방식으로 하니까 너무
 *    작업이 느린데 그냥 한 세션에서 계속 자동 압축하면서 한번에 끝까지 작업하도록". 요청당
 *    컨텍스트 상한은 이제 사람이 아니라 자동 압축이 건다 — 사용자 설정 autoCompactWindow
 *    200k 라 약 187k 에서 돌고(실측 6회: 168k → 8~15k), 위 08-29 표의 200k 행(41%)에 해당한다.
 *    기억 연속성은 세션 상태 파일(session-state.mjs 가 압축 뒤 다시 주입)이 맡는다. 그래서
 *    이 훅은 (1) 압축 직전에 상태 파일을 갱신하라는 한 줄, (2) 압축이 안 돌 때의 안전망만 남는다.
 *    옛 200k·300k 인수인계 구간은 압축이 187k 에서 돌아 사실상 실행되지도 않았다.
 *
 * 🔴 이것은 정확성 가드가 아니라 **예산 넛지**라, 원칙 10(fail-closed)을 따르지 않는다.
 *    트랜스크립트를 못 읽을 때마다 프롬프트를 막으면 세션이 통째로 멈춘다. 그래서
 *    fail-open(조용히 exit 0) 이다. 원칙 10 의 취지는 테스트 쪽에서 지킨다 —
 *    session-context-budget.test.mjs 가 구간을 전수로 단언하고, 임계 미만에서
 *    **출력이 0바이트인지**까지 본다(훅 자신이 토큰을 쓰면 최적화가 역전된다).
 */

import fs from "node:fs";

/** 구간 경계(토큰). 근거는 위 2026-08-29 실측 — 소비의 69.7% 를 먹는 300k 벽을 정면으로 막는다. */
/**
 * 🔴 NOTICE 만 150k → 100k (2026-09-06 지연 실측). 위 08-29 근거는 **토큰 비용** 축이고
 * 이건 **응답 지연** 축이라 서로 대체하지 않는다 — 둘 다 남긴다.
 * 트랜스크립트 12세션의 assistant 턴 간 시간을 요청 컨텍스트 구간별로 가른 결과:
 *   40~80k  4,318ms (n=189) · 80~120k 5,646ms (n=784) · 120~160k **8,517ms** (n=702)
 * 즉 120k 를 넘기면 **턴 지연이 2배**가 되는데 옛 임계 150k 는 그 뒤에 울렸다. 100k 는
 * 지연이 꺾이기 시작하는 지점 바로 앞이다. HANDOFF·HARD 는 08-29 근거 그대로 둔다.
 * 재현: ~/.claude/projects 아래 code-destiny 세션 jsonl 에서 assistant 턴 간 timestamp
 * 차이를 그 턴 usage 의 input+cache_read+cache_creation 구간별로 평균낸다.
 *
 * 🔴 2026-10-01: NOTICE 100k → 150k, HANDOFF 구간 삭제. 압축 주기(약 10k → 187k)마다 100k 에서
 * "/clear 가 싸다"가 울리면 연속 세션 방침을 거스르는 소음이 된다. 150k 는 압축 직전 —
 * 상태 파일을 갱신할 마지막 프롬프트 자리다. HARD 300k 는 압축이 안 돌 때의 안전망이다.
 */
const NOTICE = 150_000;
const HARD = 300_000;

/** 꼬리에서 이만큼만 읽는다. 트랜스크립트는 30MB 까지 자란다(실측 최대 30,233,521 바이트). */
const TAIL_BYTES = 256 * 1024;
/** 한 줄이 256KB 를 넘는 경우(대형 도구 결과)를 위한 2차 시도. */
const TAIL_BYTES_WIDE = 4 * 1024 * 1024;

async function readStdin() {
  if (process.stdin.isTTY) return "";
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf-8");
}

/**
 * 파일 꼬리에서 `bytes` 만큼 읽어 줄 배열로 돌려준다.
 * 앞이 잘린 첫 줄은 버린다(파일 전체를 읽은 경우는 제외).
 */
function readTailLines(filePath, bytes) {
  const size = fs.statSync(filePath).size;
  const start = Math.max(0, size - bytes);
  const fd = fs.openSync(filePath, "r");
  try {
    const buf = Buffer.alloc(size - start);
    fs.readSync(fd, buf, 0, buf.length, start);
    const lines = buf.toString("utf-8").split("\n");
    if (start > 0) lines.shift();
    return lines;
  } finally {
    fs.closeSync(fd);
  }
}

/**
 * 가장 최근 요청의 컨텍스트 크기(토큰)를 구한다. 못 구하면 null.
 *
 * 🔴 `isSidechain` 줄은 건너뛴다. 서브에이전트의 usage 는 자기 컨텍스트라, 그걸 읽으면
 *    메인 세션이 900K 인데도 서브에이전트의 40K 가 최신값으로 잡혀 경고가 통째로 죽는다.
 */
export function latestContextTokens(lines) {
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i];
    if (!line || line[0] !== "{") continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    if (entry?.isSidechain) continue;
    const usage = entry?.message?.usage;
    if (!usage) continue;
    const total =
      (usage.input_tokens || 0) +
      (usage.cache_read_input_tokens || 0) +
      (usage.cache_creation_input_tokens || 0);
    if (total > 0) return total;
  }
  return null;
}

/** 구간별 문구. 임계 미만은 null — 아무것도 출력하지 않는다(훅 비용 0). */
export function messageFor(tokens) {
  if (tokens == null || tokens < NOTICE) return null;
  const k = Math.round(tokens / 1000);

  if (tokens < HARD) {
    return `⏳ 컨텍스트 ${k}k — 곧 자동 압축된다. 여러 단계 작업이면 지금 세션 상태 파일(경로는 세션 시작 안내)을 갱신하고 그대로 이어 가라.`;
  }

  return `🔴 컨텍스트 ${k}k — 자동 압축이 돌지 않고 있다(정상이면 200k 전에 돈다). 세션 상태 파일을 갱신한 뒤 사용자에게 /compact 를 요청하라.`;
}

async function main() {
  let raw = "";
  try {
    raw = await readStdin();
  } catch {
    process.exit(0);
  }

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const transcriptPath = event?.transcript_path;
  if (!transcriptPath || !fs.existsSync(transcriptPath)) process.exit(0);

  let tokens = null;
  try {
    tokens = latestContextTokens(readTailLines(transcriptPath, TAIL_BYTES));
    // 한 줄이 256KB 를 넘어 꼬리에 완전한 줄이 하나도 없었던 경우에만 넓혀 다시 본다.
    if (tokens == null) {
      tokens = latestContextTokens(readTailLines(transcriptPath, TAIL_BYTES_WIDE));
    }
  } catch {
    process.exit(0);
  }

  const message = messageFor(tokens);
  if (!message) process.exit(0);

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: message,
      },
    })
  );
  process.exit(0);
}

main().catch(() => process.exit(0));
