/**
 * Workers AI 를 **REST 로** 부르는 공용 러너.
 *
 * 왜 REST 인가: `env.AI.run` 은 워커 런타임 안에서만 존재한다. 로컬 Node 스크립트
 * (`scripts/local-dev-auth-api.mjs` 의 dev 서버, `scripts/i18n-translate-pending.mjs` 의 번역기)는
 * 그 바인딩을 못 부르므로 `POST /accounts/{id}/ai/run/{model}` 로 같은 일을 한다.
 * 시그니처를 `run(model, input)` 으로 맞춰 두었기 때문에 `env.AI` 자리에 그대로 꽂을 수 있다.
 *
 * 🔴 이 모듈을 부르는 것은 **과금 실호출**이다(CLAUDE.md 절대 규칙 1). 무료 할당을 넘기면
 * 요청이 에러로 실패하고, 그 순간 프로덕션의 Workers AI 폴백도 같이 죽는다 — 같은 계정
 * 할당량을 공유하기 때문이다. 호출자는 `neuronsFor()` 로 소비량을 세고 예산에서 끊어야 한다.
 */
import { existsSync, readFileSync } from "node:fs";

function clean(value) {
  return String(value || "").trim();
}

function cleanBearerToken(value) {
  return clean(value).replace(/^Bearer\s+/i, "");
}

/**
 * `.env` 계열 파일을 `process.env` 로 읽어 들인다. `=` 와 `:` 구분자를 모두 받는다.
 *
 * 🔴 `scripts/dev-with-local-auth.mjs` 에도 같은 함수가 복붙으로 남아 있다(이번 변경 범위 밖이라
 * 건드리지 않았다). 거기까지 정리하려면 그 파일의 로딩 순서를 함께 봐야 한다.
 */
export function loadEnvFile(path, override = true) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*[=:]\s*(.*)\s*$/);
    if (!match) continue;
    const key = match[1];
    if (!override && process.env[key] !== undefined && process.env[key] !== "") continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value.replace(/\\n/g, "\n");
  }
}

/**
 * 🔴 git worktree 안에서 돌 때 **저장소 루트의** 자격증명 파일도 본다.
 *
 * `.env.local` · `.env.cloudflare.local` 은 `.gitignore` 대상이라 워크트리에는 복사되지 않는다.
 * 그래서 워크트리에서 스크립트를 돌리면 자격증명이 통째로 안 잡히고, 증상은 "토큰이 없다"라
 * 원인을 엉뚱한 곳(대시보드 권한)에서 찾게 된다 — 2026-08-25 실제로 그랬다.
 *
 * 워크트리의 `.git` 은 디렉터리가 아니라 `gitdir: <루트>/.git/worktrees/<이름>` 이 든 **파일**이다.
 * 거기서 저장소 루트를 되짚는다. 루트 값이 현재 디렉터리보다 **먼저** 로드되므로,
 * 워크트리에 같은 이름의 파일이 있으면 그쪽이 이긴다(override=true).
 */
function mainWorktreeRoot() {
  try {
    const dotGit = ".git";
    if (!existsSync(dotGit)) return null;
    const text = readFileSync(dotGit, "utf8");
    const match = /^gitdir:\s*(.+?)\s*$/m.exec(text);
    if (!match) return null; // 디렉터리면 readFileSync 가 던진다 — 이미 저장소 루트다
    const gitDir = match[1].replace(/\\/g, "/");
    const rootGit = gitDir.replace(/\/worktrees\/[^/]+\/?$/, "");
    return rootGit.replace(/\/\.git$/, "");
  } catch {
    return null;
  }
}

/** dev 서버와 번역기가 같은 자격증명 파일을 본다. */
export function loadLocalEnvFiles() {
  const names = [".env", ".env.local", ".env.cloudflare.local", ".dev.vars"];
  const root = mainWorktreeRoot();
  if (root) for (const name of names) loadEnvFile(`${root}/${name}`, true);
  for (const name of names) loadEnvFile(name, true);
}

/**
 * 모델별 Neuron 단가 (Cloudflare 공식 가격표, 2026-08-25 조회).
 * 무료 할당은 **하루 10,000 Neuron** 이고 00:00 UTC 에 리셋된다.
 *
 * 🔴 이 표는 그날의 실측이다. 모델을 바꾸거나 시간이 지났으면
 * https://developers.cloudflare.com/workers-ai/platform/pricing/ 에서 다시 확인할 것 —
 * 틀린 단가로 예산을 세면 한도를 조용히 넘긴다.
 */
export const WORKERS_AI_NEURON_RATES = {
  "@cf/zai-org/glm-4.7-flash": { input: 5500, output: 36400 },
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast": { input: 26668, output: 204805 },
};

/** 무료 할당(하루). 초과하면 요청이 에러로 실패한다. */
export const WORKERS_AI_DAILY_FREE_NEURONS = 10000;

/**
 * 응답의 `usage` 로 실제 소비 Neuron 을 계산한다. 단가는 **M 토큰당**이다.
 *
 * 🔴 단가를 모르는 모델이면 던진다. 0 으로 치면 예산 가드가 통과해 버려 한도를 넘긴다
 * (CLAUDE.md 원칙 10 — 검사 대상이 없을 때 통과시키는 가드는 가드가 아니다).
 */
export function neuronsFor(model, usage) {
  const rate = WORKERS_AI_NEURON_RATES[model];
  if (!rate) {
    throw new Error(
      `[workers-ai] ${model} 의 Neuron 단가를 모른다 — WORKERS_AI_NEURON_RATES 에 추가하고 공식 가격표로 확인할 것`,
    );
  }
  const input = Number(usage?.prompt_tokens || 0);
  const output = Number(usage?.completion_tokens || 0);
  return (input / 1e6) * rate.input + (output / 1e6) * rate.output;
}

/**
 * `env.AI` 와 같은 모양의 러너를 만든다. 자격증명이 하나도 없으면 `undefined` 를 돌려준다
 * (호출자가 "바인딩 없음"으로 다루게 하려는 것 — dev 서버가 그렇게 쓴다).
 *
 * 계정 ID·토큰 후보를 순서대로 시도한다. 어떤 이름으로 넣어 뒀는지 사람마다 다르기 때문이다.
 * 🔴 429/할당량 소진은 **즉시 던진다** — 다음 후보 토큰으로 넘어가면 같은 계정에 재시도를
 * 퍼붓는 꼴이 된다.
 */
/**
 * 한 번의 `run()` 이 기다리는 최대 시간(ms). `WORKERS_AI_TIMEOUT_MS` 로 조정한다.
 *
 * 🔴 워커 런타임의 `env.AI.run` 은 AbortSignal 을 받는다는 보장이 없어 못 끊는다
 * (`lib/llm-client.ts` 헤더에 그 메모가 있다). REST 는 fetch 라 끊을 수 있으므로 **여기서는
 * 반드시 끊는다** — 안 그러면 배치가 한 청크에 걸려 무한정 매달린다.
 *
 * 🔴 기본값이 크다. `@cf/zai-org/glm-4.7-flash` 는 추론 모델이라 50키짜리 번역 청크 하나에
 * **2~5분**이 걸린다(2026-08-25 실측). 120초로 잡았더니 정상 요청이 전부 타임아웃으로 죽었고,
 * 서버는 이미 처리 중이라 **끊어도 과금은 될 수 있다** — 짧은 타임아웃이 오히려 돈을 태운다.
 */
const DEFAULT_TIMEOUT_MS = 420_000;

export function createWorkersAiRunner(env) {
  const accountIds = [
    clean(env.CLOUDFLARE_WORKERS_AI_ACCOUNT_ID),
    clean(env.WORKERS_AI_ACCOUNT_ID),
    clean(env.CLOUDFLARE_ACCOUNT_ID),
    clean(env.Account_ID),
    clean(env.ACCOUNT_ID),
    clean(env.CF_ACCOUNT_ID),
  ].filter(Boolean);
  const tokens = [
    cleanBearerToken(env.WorkerAi),
    cleanBearerToken(env.WORKERAI),
    cleanBearerToken(env.WORKER_AI_KEY),
    cleanBearerToken(env.WORKER_AI_TOKEN),
    cleanBearerToken(env.WORKERS_AI_API_TOKEN),
    cleanBearerToken(env.WORKERS_AI_TOKEN),
    cleanBearerToken(env.CLOUDFLARE_WORKERS_AI_API_TOKEN),
    cleanBearerToken(env.CLOUDFLARE_WORKERS_AI_TOKEN),
    cleanBearerToken(env.CLOUDFLARE_API_TOKEN),
    cleanBearerToken(env.CF_API_TOKEN),
    cleanBearerToken(env.CLOUDFLARE_APITOKEN),
  ].filter(Boolean);
  if (!accountIds.length || !tokens.length) return undefined;

  return {
    async run(model, input) {
      let lastError = "";
      const modelPath = String(model || "")
        .split("/")
        .map((segment) => encodeURIComponent(segment))
        .join("/");
      for (const accountId of accountIds) {
        for (const token of tokens) {
          const endpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${modelPath}`;
          const timeoutMs = Number(env.WORKERS_AI_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
          let response;
          try {
            response = await fetch(endpoint, {
              method: "POST",
              headers: {
                authorization: `Bearer ${token}`,
                "content-type": "application/json",
              },
              body: JSON.stringify(input || {}),
              signal: AbortSignal.timeout(timeoutMs),
            });
          } catch (error) {
            // 타임아웃/네트워크 오류는 자격증명 문제가 아니다 — 다음 토큰으로 넘어가 봐야
            // 같은 요청을 다시 던질 뿐이라 바로 던진다(호출자의 재시도 로직이 받는다).
            throw new Error(`local_workers_ai_failed:${error?.name === "TimeoutError" ? `timeout ${timeoutMs}ms` : String(error?.message || error)}`);
          }

          const payload = await response.json().catch(() => ({}));
          if (response.ok && payload?.success !== false) {
            return payload?.result || payload;
          }
          const message = clean(payload?.errors?.[0]?.message || payload?.message || response.statusText);
          lastError = message;
          if (response.status === 429 || /daily free allocation|quota|rate/i.test(message)) {
            throw Object.assign(new Error(`local_workers_ai_failed:${message || "Workers AI quota exceeded"}`), {
              status: response.status,
            });
          }
        }
      }
      throw new Error(`local_workers_ai_failed:${lastError || "Workers AI authentication failed"}`);
    },
  };
}
