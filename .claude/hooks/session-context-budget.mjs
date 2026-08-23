#!/usr/bin/env node
/**
 * UserPromptSubmit 훅 — 세션 컨텍스트가 커지면 인수인계로 넘기게 만든다.
 *
 * 왜 (2026-08-24 실측): 토큰 소비는 요청 수가 아니라 **요청당 컨텍스트 크기**가 정한다.
 * 트랜스크립트 85개 디렉터리·요청 50,853건을 파싱한 결과, 08-19 → 08-22 사이 요청 수는
 * +22% 인데 평균 컨텍스트는 262K → 463K 로 +77% 올랐고, 800K 초과 요청이 0건 → 1,092건이
 * 됐다. 소비의 34%가 **단일 세션 하나**에서 나왔다 — 13,184 요청 / 44.7시간 / 자동압축 32회.
 *
 * 컨텍스트는 한 번 부풀면 그 세션의 **모든 후속 요청에서 다시 지불된다.** 그래서 늦게
 * 깨닫는 것이 곧 비용이다. CLAUDE.md 코딩 원칙 12 는 이미 "컨텍스트가 모자라면 밀어붙이지
 * 말고 인수인계"라고 적고 있었지만, 44시간 세션이 나왔다는 것은 규칙만으로는 안 지켜졌다는
 * 뜻이다. 이 훅은 그 판단 시점을 사람의 기억이 아니라 측정값에 건다.
 *
 * 🔴 이것은 정확성 가드가 아니라 **예산 넛지**라, 원칙 10(fail-closed)을 따르지 않는다.
 *    트랜스크립트를 못 읽을 때마다 프롬프트를 막으면 세션이 통째로 멈춘다. 그래서
 *    fail-open(조용히 exit 0) 이다. 원칙 10 의 취지는 테스트 쪽에서 지킨다 —
 *    session-context-budget.test.mjs 가 구간을 전수로 단언하고, 임계 미만에서
 *    **출력이 0바이트인지**까지 본다(훅 자신이 토큰을 쓰면 최적화가 역전된다).
 */

import fs from "node:fs";

/** 구간 경계(토큰). 근거는 위 실측 — 800K 초과가 나오기 시작한 지점보다 앞에 둔다. */
const NOTICE = 300_000;
const HANDOFF = 450_000;
const HARD = 650_000;

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

const HANDOFF_ITEMS = [
  "①왜 하는 작업인지(사용자 요구 원문 포함)",
  "②이미 끝난 것(PR 번호·머지 여부 — 다음 세션이 다시 하지 않도록)",
  "③남은 작업의 정확한 대상과 개수",
  "④방법(무엇을 근거로 판정하는지, 확인 명령)",
  "⑤정본 예시 하나를 근거 파일·줄번호와 함께",
  "⑥이 레포 고유의 작업 규칙(sync:public·격리 워크트리·머지는 사용자)",
  "⑦검증 명령 목록",
  '⑧"근거 못 찾으면 추측하지 말고 물어라"',
].join(" · ");

/** 구간별 문구. 임계 미만은 null — 아무것도 출력하지 않는다(훅 비용 0). */
export function messageFor(tokens) {
  if (tokens == null || tokens < NOTICE) return null;
  const k = Math.round(tokens / 1000);

  if (tokens < HANDOFF) {
    return `⚠️ 세션 컨텍스트 ${k}k. 여기서부터는 모든 후속 요청이 이 크기를 다시 지불한다. 새 작업을 시작하는 프롬프트라면 지금 /clear 하는 편이 싸다.`;
  }

  if (tokens < HARD) {
    return [
      `🔴 세션 컨텍스트 ${k}k — 인수인계 구간이다(CLAUDE.md 코딩 원칙 12).`,
      "",
      "지금 하던 작업은 **끊어도 되는 지점까지만** 마무리하고, 새 작업으로 넘어가지 마라. 그 다음:",
      "1. `docs/handoff/<주제>.md` 를 작성한다. 다음 세션이 **그 문서만 읽고 시작할 수 있어야** 한다.",
      `2. 반드시 담을 것: ${HANDOFF_ITEMS}`,
      "3. 정본 예시: `docs/handoff/detail-sheet-copy-rewrite.md`",
      "4. 문서를 커밋한 뒤 사용자에게 `/clear` 를 요청한다. **넘긴 범위를 '완료'로 적지 마라.**",
      "",
      "절반만 해놓고 '했다'고 보고하거나 후반부를 근거 없이 채우는 것이 이 규칙이 막으려는 것이다.",
    ].join("\n");
  }

  return [
    `🔴🔴 세션 컨텍스트 ${k}k — 한계 구간이다. **새 작업 착수 금지.**`,
    "",
    "이 세션에서 지금부터 허용되는 일은 인수인계 문서 작성과 그 커밋뿐이다.",
    `1. 즉시 \`docs/handoff/<주제>.md\` 를 쓴다 — ${HANDOFF_ITEMS}`,
    "2. 정본 예시: `docs/handoff/detail-sheet-copy-rewrite.md`",
    "3. 무엇이 남았는지 사용자에게 분명히 보고하고 `/clear` 를 요청한다.",
    "",
    "사용자가 새 작업을 요청했더라도, 먼저 이 상태를 알리고 인수인계부터 끝내라.",
  ].join("\n");
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
