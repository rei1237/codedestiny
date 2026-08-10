/**
 * 결제 재작성 기간의 **구 결제 코드 동결 가드**.
 *
 * ## 왜 필요한가
 *
 * 결제 컨텍스트를 worker/payments/ 로 새로 짓는 동안, 구현이 두 벌 존재한다. 이때 가장 비싼 사고는
 * 충돌이 아니라 **조용한 분기(divergence)** 다 — 누군가 구 코드에만 정책을 하나 더 얹으면, 신규 모듈로
 * 넘어가는 순간 그 정책이 소리 없이 사라진다. 이 레포에는 이미 그 전례가 있다: 결제창 렌더러가 3벌로
 * 갈라진 뒤 TTL 이 5분/15분으로 서로 달라진 채 배포됐고(js/core/pass-verdict.js:5-8), 그걸 잡으려고
 * verify-payment-choice-parity 라는 가드를 따로 만들어야 했다.
 *
 * ## 벽이 아니라 트립와이어다
 *
 * 구 코드는 **아직 프로덕션 트래픽을 전부 받고 있다.** 그래서 이 가드는 변경을 막지 않는다 —
 * 변경하려면 `--update` 로 매니페스트를 갱신해 **같은 커밋에 담아야** 할 뿐이다. 그 한 줄이 리뷰에서
 * 눈에 띄는 것이 목적이다. env 우회는 없다(있으면 트립와이어가 아니라 장식이 된다).
 *
 * ## 세 가지 방식을 쓰는 이유
 *
 *   · regions      — index.html 은 콘텐츠 사유로 매일 바뀌고 public 미러 5벌은 생성물이다.
 *                    파일 단위로 얼리면 무관한 변경마다 걸려서, 사람이 가드를 꺼 버린다.
 *                    그래서 결제 함수 **본문만** 중괄호 균형으로 잘라 해시한다.
 *   · wholeFiles   — 파일 전체가 결제 전용인 것들. 통째로 얼어도 오탐이 없다.
 *   · growthCeilings — billing.js·payments.js 는 일부러 얼리지 않는다. 라이브 코드라 버그 수정이
 *                    계속 필요하고, 실제로 재작성 중에도 두 세션이 고쳤다. 대신 **줄 수 상한**을 둔다:
 *                    고치는 것은 되고 **키우는 것은 안 된다**. 재작성의 방향(이 파일들은 0 이 된다)을
 *                    그대로 기계 조건으로 옮긴 것이다.
 *
 * 사용법:
 *   node scripts/verify-payment-freeze.mjs            # 검사 (드리프트면 exit 1)
 *   node scripts/verify-payment-freeze.mjs --update   # 매니페스트 재기록 (의도한 변경일 때)
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { sliceFunction } from "./lib/js-source-slice.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST_PATH = join(ROOT, "config", "payment-freeze.json");
const UPDATE = process.argv.slice(2).includes("--update");

/* CRLF 정규화는 선택이 아니다. 이 레포는 줄바꿈이 섞여 있어(git 이 LF→CRLF 경고를 낸다)
   정규화하지 않으면 체크아웃만 해도 해시가 달라져 가드가 늑대소년이 된다. */
function normalize(text) {
  return text.replace(/\r\n/g, "\n");
}

function hash(text) {
  return createHash("sha256").update(normalize(text), "utf8").digest("hex").slice(0, 16);
}

function readSource(relPath) {
  return normalize(readFileSync(join(ROOT, relPath), "utf8"));
}

function regionText(entry) {
  const source = readSource(entry.file);
  return sliceFunction(source, entry.marker, `${entry.file} :: ${entry.marker.trim()}`);
}

function countLines(text) {
  return text.split("\n").length;
}

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
const drift = [];
const notes = [];

for (const entry of manifest.regions) {
  const actual = hash(regionText(entry));
  if (UPDATE) { entry.sha256 = actual; continue; }
  if (entry.sha256 !== actual) {
    drift.push(`  [region] ${entry.file} :: ${entry.marker.trim()}\n           기대 ${entry.sha256} · 실제 ${actual}`);
  }
}

for (const entry of manifest.wholeFiles) {
  const actual = hash(readSource(entry.file));
  if (UPDATE) { entry.sha256 = actual; continue; }
  if (entry.sha256 !== actual) {
    drift.push(`  [file]   ${entry.file}\n           기대 ${entry.sha256} · 실제 ${actual}`);
  }
}

for (const entry of manifest.growthCeilings) {
  const actual = countLines(readSource(entry.file));
  if (UPDATE) { entry.maxLines = Math.max(actual, entry.maxLines || 0); continue; }
  if (actual > entry.maxLines) {
    drift.push(`  [growth] ${entry.file}\n           상한 ${entry.maxLines}줄 · 실제 ${actual}줄 (+${actual - entry.maxLines})`);
  } else if (actual < entry.maxLines) {
    // 줄어드는 것은 언제나 환영이고, 상한을 자동으로 조여 되돌아오지 못하게 한다.
    notes.push(`  ${entry.file}: ${entry.maxLines} → ${actual}줄로 상한을 조입니다.`);
    entry.maxLines = actual;
  }
}

if (UPDATE) {
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log("[payment-freeze] 매니페스트를 갱신했습니다. 이 변경을 같은 커밋에 담으세요.");
  process.exit(0);
}

if (notes.length) {
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log("[payment-freeze] 상한 자동 조정:");
  for (const note of notes) console.log(note);
}

if (drift.length) {
  console.error("\n[payment-freeze] 동결된 구 결제 코드가 바뀌었습니다.\n");
  console.error(drift.join("\n"));
  console.error(`\n이유: ${manifest.reason}`);
  console.error(
    "\n막으려는 것이 아니라 **눈에 띄게** 하려는 것입니다. 의도한 변경이면:\n"
    + "  1) worker/payments/ 의 신규 구현에도 같은 변경이 필요한지 먼저 확인하세요.\n"
    + "     (구 코드에만 얹으면 컷오버 때 그 정책이 소리 없이 사라집니다.)\n"
    + "  2) node scripts/verify-payment-freeze.mjs --update\n"
    + "  3) config/payment-freeze.json 을 **같은 커밋에** 담으세요.\n",
  );
  process.exit(1);
}

console.log(
  `[payment-freeze] 통과 — region ${manifest.regions.length} · file ${manifest.wholeFiles.length} · 상한 ${manifest.growthCeilings.length}`,
);
