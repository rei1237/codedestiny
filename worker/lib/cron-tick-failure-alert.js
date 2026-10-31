import { resolveOpsDeps, sendOperatorAlert, settleWithin } from './ops-alert.js';

/**
 * 10분 크론(payments-reconcile)의 태스크가 던졌을 때 운영자에게 **태스크별 시간당 1회** 알린다.
 *
 * 🔴 왜 필요한가: 이 분기는 태스크 18개를 각자 catch 로 격리해 돌리는데, catch 가 console.error 한 줄뿐이라
 * 복구 스윕이 매 틱 죽어도 아무에게도 닿지 않았다. 일일 분기(cron-failure-alert.js)는 이미 알린다.
 * 그쪽 모듈에 얹지 않은 이유: 채널(공개 Telegram vs 운영자 전용 notifyOperators)과 억제 계약(실행당 1통 vs
 * 태스크·시간당 1통)이 다르다. 하루 144틱이라 억제 없이 보내면 소음이 된다.
 *
 * 🔴 억제는 claim-first 다. `idempotency_keys` 에 `cron10-failure-alert` / `<task>:<KST YYYY-MM-DDTHH>` 를 먼저
 * 만들고(unique {userId,endpoint,keyHash}가 이미 있어 새 인덱스 불필요, TTL 은 expiresAt) 11000 이면
 * 같은 시간대에 이미 알렸다는 뜻이다. 발송이 실패해도 claim 은 지우지 않는다 — 최대 1시간 늦어질 뿐이고,
 * 실패 알림이 틱마다 재시도되는 폭주를 만들지 않는다.
 *
 * 🔴 DB 장애는 이 알림이 가장 필요한 순간이다. 11000 이 아닌 모든 DB 단계 실패(connect·create 던짐, 지연)는
 * isolate-local `Map<task,hourBucket>` 로 억제하고 **그래도 발송한다**. DB 단계는 waitMs 로 묶어
 * 멈춘 DB 가 알림을 붙잡지 못하게 한다.
 *
 * 🔴 사유는 호출부 catch 가 이미 로그에 남기는 문구 그대로만 받는다(error.message 에 고객 데이터가 실릴 수 있어
 * 로그에 안 남기는 catch 는 코드만 넘긴다). 운영자 전용 채널이지만 지워지지 않는 사본은 Workers Logs 다.
 * throw 하지 않는다 — 알림 실패가 크론을 죽이면 안 된다.
 */

const ENDPOINT = 'cron10-failure-alert';
const CLAIM_TTL_MS = 3 * 3600_000;
const DB_WAIT_MS = 3_000;
const REASON_MAX = 200;
const TASK_MAX = 70; // keyHash 상한 96 안에서 ":YYYY-MM-DDTHH"(14자)가 들어갈 자리

// 이 isolate 가 이번 시간대에 이미 클레임한 태스크. DB 를 못 쓸 때의 유일한 억제 수단이다.
const localBuckets = new Map();

const loadModel = async () => (await import('./models.js')).IdempotencyKey;
const notifyOperatorsLazily = async (env, message) => (await import('./feedback-notify.js')).notifyOperators(env, message);

const kstHourBucket = now => new Date(now.getTime() + 9 * 3600_000).toISOString().slice(0, 13);

function alertMessage(rows, bucket) {
  return {
    subject: `[크론] 10분 크론 태스크 ${rows.length}건 실패`,
    text: [
      `시간대: ${bucket.replace('T', ' ')}시 KST (같은 태스크는 시간당 1회만 알립니다)`,
      '',
      ...rows.map(({ name, message }) => `• ${name}: ${String(message || 'unknown').slice(0, REASON_MAX)}`),
      '',
      '이 태스크들은 이번 틱에서 일을 마치지 못했습니다. 사유가 잘렸으면 Cloudflare Workers Logs에서 아래 태그로 검색하세요.',
      ...rows.map(({ name }) => `Workers Logs에서 [${name}] 검색`),
    ].join('\n'),
  };
}

/**
 * @param {object} env
 * @param {Array<{name: string, message: string}>} failures
 * @param {{ now?: Date|number, send?: Function, model?: object, connectDb?: Function, withMongoRetry?: Function, waitMs?: number }} [options]
 *   now/send/model/connectDb/withMongoRetry — 테스트 주입구(ops-alert.js resolveOpsDeps 와 같은 이름).
 * @returns {Promise<{sent: string[], suppressed: string[]}>} sent — 발송이 전달된 태스크, suppressed — 이번 시간대에 이미 알린 태스크
 */
export async function notifyTickFailures(env, failures, options = {}) {
  const seen = new Set();
  const rows = (Array.isArray(failures) ? failures : [])
    .filter(item => item && item.name && !seen.has(item.name) && seen.add(item.name))
    .map(item => ({ name: String(item.name).slice(0, TASK_MAX), message: item.message }));
  if (rows.length === 0) return { sent: [], suppressed: [] };

  const now = options.now ? new Date(options.now) : new Date();
  const bucket = kstHourBucket(now);
  const expiresAt = new Date(now.getTime() + CLAIM_TTL_MS);
  // connect·모델 로드는 한 번만, 그리고 settleWithin 안에서만 기다린다(멈추면 모든 태스크가 같은 시한에 폴백한다).
  let ready;
  const connect = () => ready ||= (async () => {
    const deps = await resolveOpsDeps({ ...options, notify: undefined }, loadModel);
    await deps.connect(env);
    return deps;
  })();
  const claimInDb = async (name) => {
    const { model, retry } = await connect();
    try {
      await retry(env, () => model.create({ userId: null, endpoint: ENDPOINT, keyHash: `${name}:${bucket}`, expiresAt }), { retries: 0 });
      return { claimed: true };
    } catch (error) {
      if (error?.code === 11000) return { claimed: false };
      throw error;
    }
  };

  const verdicts = await Promise.all(rows.map(async (row) => {
    const db = await settleWithin('cron-tick-failure-alert', () => claimInDb(row.name), options.waitMs ?? DB_WAIT_MS);
    if (typeof db?.claimed === 'boolean') return db.claimed;
    if (localBuckets.get(row.name) === bucket) return false;
    localBuckets.set(row.name, bucket);
    return true;
  }));
  const claimed = rows.filter((_row, index) => verdicts[index]);
  const suppressed = rows.filter((_row, index) => !verdicts[index]).map(row => row.name);
  if (claimed.length === 0) return { sent: [], suppressed };

  const delivered = await sendOperatorAlert(env, options.send || notifyOperatorsLazily, alertMessage(claimed, bucket));
  return { sent: delivered ? claimed.map(row => row.name) : [], suppressed };
}
