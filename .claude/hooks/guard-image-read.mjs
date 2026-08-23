#!/usr/bin/env node
/**
 * PreToolUse 가드 — 비싼 이미지를 컨텍스트에 들이기 전에 멈춘다.
 *
 * 왜 (2026-08-24 실측): 08-19 이후 세션들의 Read 결과 총량 45.5MB 중 **스크린샷이
 * 71%(32.4MB, 132회)** 였다 — 텍스트 파일 2,538회를 전부 합친 것의 2.5배다. 이미지 토큰은
 * 파일 크기가 아니라 **치수**로 정해지고(`가로×세로/750`), 실측된 `desktop-full.png` 는
 * 1440×15019 = **약 28,800 토큰**이었다. 그리고 한 번 들어오면 그 세션의 **모든 후속
 * 요청에서 다시 지불된다** — 이후 1,000 요청이면 캐시 재읽기로만 2,880만 토큰이다.
 *
 * 텍스트 파일은 이 훅이 건드리지 않는다. 실측상 텍스트 Read 는 문제가 아니었고(29%),
 * 게다가 이 레포에는 부분 Read 후 편집이 CRLF 를 떨궈 3줄 수정이 1000줄 diff 가 된
 * 전례가 있다. 여기서 막는 것은 **이미지뿐**이다.
 *
 * 판정은 fail-closed 다 — 이미지인 것은 확실한데 크기를 못 재면 통과가 아니라 `ask` 로 간다.
 * 다만 sharp 로드/치수 측정 실패는 **파일 바이트 수 폴백**으로 먼저 시도한다. 여기까지
 * 곧장 ask 로 보내면 sharp 가 없는 환경에서 모든 이미지 Read 가 막힌다.
 *
 * `deny` 가 아니라 `ask` 인 이유: 사용자가 직접 보라고 지시한 스크린샷까지 막으면 안 된다.
 * 비용을 알린 뒤 사람이 고르게 하는 것이 목적이다.
 */

const ASK = (reason) => {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "ask",
        permissionDecisionReason: reason,
      },
    })
  );
  process.exit(0);
};

const WARN = (context) => {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext: context,
      },
    })
  );
  process.exit(0);
};

const PASS = () => process.exit(0);

/** 이 값을 넘으면 안내, 그 위를 넘으면 승인창. 근거는 위 실측 — 뷰포트 샷 1장이 약 1,700 토큰이다. */
const WARN_TOKENS = 4_000;
const ASK_TOKENS = 15_000;

const IMAGE_EXT = /\.(png|jpe?g|webp|gif|bmp|tiff?|avif)$/i;

/** 이미지 토큰 추정식. 정확한 값은 모델이 정하지만 판단에는 이 비율로 충분하다. */
const tokensFor = (w, h) => Math.round((w * h) / 750);

/**
 * 치수를 못 잴 때의 폴백. 실측 표본(1440x900 = 566~946KB, 1440x15019 = 6,617KB)에서
 * 토큰당 235~335 바이트였다. 작은 쪽을 쓰면 과대추정 = 안전한 방향으로 기운다.
 */
const tokensFromBytes = (bytes) => Math.round(bytes / 250);

async function readStdin() {
  if (process.stdin.isTTY) return "";
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf-8");
}

function advice(filePath, tokens, dims) {
  const size = dims ? `${dims.width}x${dims.height}` : "치수 미상";
  return [
    `🖼️ 이 이미지는 약 ${tokens.toLocaleString()} 토큰이다 (${size}).`,
    "🔴 이미지는 한 번 들어오면 이 세션의 **모든 후속 요청에서 다시 지불된다.** 1회 비용이 아니다.",
    "",
    "더 싼 길을 먼저 보라:",
    `1. 판정만 필요하면 \`visual-checker\` 서브에이전트로 보내라 — 이미지는 그쪽 컨텍스트에만 들어가고 결론만 돌아온다.`,
    `2. 직접 봐야 하면 줄여서 봐라:`,
    `   node scripts/shrink-shot.mjs "${filePath}"`,
    `   node scripts/shrink-shot.mjs "${filePath}" --crop <left,top,width,height>`,
    "3. 관심 영역이 분명하면 축소보다 크롭이 항상 낫다 — 정확도는 그대로고 토큰은 훨씬 준다.",
  ].join("\n");
}

async function measure(filePath) {
  const fs = await import("node:fs");
  let bytes = null;
  try {
    bytes = fs.statSync(filePath).size;
  } catch {
    // 파일이 없으면 Read 가 알아서 실패한다 — 우리가 막을 일이 아니다.
    return { missing: true };
  }

  try {
    const { default: sharp } = await import("sharp");
    const meta = await sharp(filePath).metadata();
    if (meta?.width && meta?.height) {
      return { tokens: tokensFor(meta.width, meta.height), dims: meta, bytes };
    }
  } catch {
    // sharp 가 없거나 못 읽는 형식 — 바이트 폴백으로 내려간다.
  }

  if (bytes != null) return { tokens: tokensFromBytes(bytes), dims: null, bytes };
  return {};
}

async function main() {
  let raw = "";
  try {
    raw = await readStdin();
  } catch {
    ASK("이미지 Read 가드: 훅 입력을 읽지 못했다");
  }

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    ASK("이미지 Read 가드: 훅 입력이 JSON 이 아니다");
  }

  if (event?.tool_name !== "Read") PASS();

  const filePath = String(event?.tool_input?.file_path || "");
  if (!filePath) PASS();
  if (!IMAGE_EXT.test(filePath)) PASS();

  const measured = await measure(filePath);
  if (measured.missing) PASS();
  if (measured.tokens == null) {
    ASK(`이미지 Read 가드: ${filePath} 의 크기를 재지 못했다 — 컨텍스트 비용을 모른 채 들이지 않는다`);
  }

  if (measured.tokens >= ASK_TOKENS) {
    ASK(advice(filePath, measured.tokens, measured.dims));
  }
  if (measured.tokens >= WARN_TOKENS) {
    WARN(advice(filePath, measured.tokens, measured.dims));
  }
  PASS();
}

main().catch(() => {
  // 예상 못 한 실패에서도 통과시키지 않는다 — 이 가드의 목적은 비용을 모른 채 들이지 않는 것이다.
  ASK("이미지 Read 가드: 훅이 예기치 않게 실패했다");
});
