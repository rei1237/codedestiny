/**
 * 초융합 실호출 하네스의 **탈락 묶음 원문 덤프**.
 *
 * 왜 있는가: 2026-09-06 Phase 4 실검증에서 1단계 6묶음 중 5묶음이 탈락했는데, 하네스가
 * 원문을 안 남겨 **왜** 걸렸는지 눈으로 못 봤다. 남은 것은 issue 이름 다섯 개
 * (`section_depth` · `missing_key_points` · `parse_failed` · `unsafe_phrase`)뿐이라
 * "모델이 지시를 안 지킨 것"인지 "검증 임계가 실제 출력 대비 과한 것"인지 갈리지 않았다.
 * 🔴 실호출은 1회 한정 승인이므로, 태운 호출의 원문을 잃으면 재승인 없이는 다시 못 본다.
 *
 * 무엇을 남기는가 — 호출 1회당 두 파일:
 *   `<seq>-s<단계>-<묶음>-w<물결>.txt`   provider 응답 원문 그대로(잘라내지 않는다)
 *   `<seq>-s<단계>-<묶음>-w<물결>.json`  판정 + 키별 글자수/임계/keyPoints 개수
 * 그리고 `summary.md` 에 전 호출 표.
 *
 * 🔴 판정은 여기서 새로 만들지 않고 **프로덕션의 `validateFusionFortuneGroup` 을 그대로 부른다**
 *    (옵션도 `fusionValidationOptions` 로 세운다). 덤프가 자기만의 기준을 갖는 순간 "덤프는
 *    통과인데 실제로는 폴백"이 생겨 진단이 거짓말을 한다.
 *
 * 🔴 감싼 호출은 **응답도 예외도 손대지 않고 그대로 통과**시킨다 — 덤프를 켠 실행과 안 켠
 *    실행의 판정이 달라지면 그 측정값은 인용할 수 없다.
 *
 * 물결(wave)은 같은 (샘플·단계·묶음)의 몇 번째 호출인지다: 1 = 1차 병렬(compose),
 * 2 = 보완(repair). 보완 물결의 실패는 프로덕션이 로그를 남기지 않으므로
 * (`[fusion-fortune-group-failed]` 는 1차 물결만 찍는다) 여기가 유일한 기록이다.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  fusionValidationOptions,
  parseFusionFortuneLLMResponse,
  validateFusionFortuneGroup,
} from "../../worker/lib/fusion-fortune.js";
import { FUSION_FORTUNE_LENGTH, FUSION_SECTION_GROUP_SPECS } from "../../worker/lib/fusion-fortune-prompt.js";

/** worker/lib/fusion-fortune.js 의 `pickKeys` 와 같은 셈 — 빈 값은 안 담는다. */
function pickKeys(source, keys) {
  return keys.reduce((picked, key) => {
    const value = source?.[key];
    const empty = value === null || value === undefined || (typeof value === "string" && !value.trim());
    return empty ? picked : { ...picked, [key]: value };
  }, {});
}

/**
 * 그 키에서 **검증기가 재는 것과 같은 것**을 잰다.
 * 🔴 `content` 만 보던 옛 판이 2026-09-06 실호출 6차를 오진했다 — `finalVerdict`(검증 대상은
 *    `rationale`)와 `visualization` 이 `0자` 로 찍혀, 실제로는 1,480자를 쓴 정상 응답이
 *    "빈 필드가 검증을 통과하는 구멍"으로 기록됐다. 덤프는 판정의 근거로 읽히므로 0 을
 *    "못 쟀다"가 아니라 "비어 있다"로 오해하게 두면 안 된다.
 */
function contentChars(value) {
  if (typeof value === "string") return value.length;
  if (!value || typeof value !== "object") return 0;
  if (typeof value.content === "string") return value.content.length;
  if (typeof value.rationale === "string") return value.rationale.length;
  // 남은 객체(visualization 등)는 검증 임계가 없다 — 담긴 문자열 총량으로 규모만 보여 준다.
  return JSON.stringify(value).length;
}

function analyzeKeys(group, picked) {
  return group.keys.map((key) => {
    const value = picked?.[key];
    const min = group.minChars?.[key] ?? null;
    const chars = contentChars(value);
    return {
      key,
      present: value !== undefined,
      chars,
      minChars: min,
      shortfall: min === null ? null : chars - min,
      keyPoints: Array.isArray(value?.keyPoints) ? value.keyPoints.length : null,
      titleChars: typeof value?.title === "string" ? value.title.length : null,
      // 🔴 모델이 실제로 쓴 필드명. `keyPoints` 를 빠뜨린 것과 다른 이름으로 쓴 것은 다음
      //    행동이 다르다(전자는 스키마 강제, 후자는 키 이름 정정) — 이게 없으면 구분이 안 된다.
      fields: value && typeof value === "object" && !Array.isArray(value) ? Object.keys(value) : null,
    };
  });
}

/**
 * 🔴 판정 결과만 남긴다 — `validateFusionFortuneGroup` 은 통과 시 본문 전체를 `value` 로
 * 돌려주는데, 그대로 담으면 정상 묶음의 JSON 이 원문만큼 부푼다(원문은 이미 .txt 에 있다).
 */
function slimVerdict(verdict) {
  const slim = { ok: verdict?.ok === true, issue: verdict?.issue ?? null };
  return verdict?.detail === undefined ? slim : { ...slim, detail: verdict.detail };
}

function analyze(group, response, validationOptions) {
  if (!response?.ok) {
    return { stage: "provider", verdict: slimVerdict({ ok: false, issue: String(response?.error || "provider_failed") }), keys: [], droppedKeys: [] };
  }
  const parsed = parseFusionFortuneLLMResponse(response.text);
  if (!parsed.ok) {
    return { stage: "parse", verdict: slimVerdict({ ok: false, issue: "parse_failed", detail: parsed.errorCode }), keys: [], droppedKeys: [] };
  }
  const picked = pickKeys(parsed.value, group.keys);
  return {
    stage: "validate",
    verdict: slimVerdict(validateFusionFortuneGroup(picked, group, validationOptions)),
    keys: analyzeKeys(group, picked),
    // 묶음 키가 아닌 것을 모델이 반환했다면 프로덕션이 조용히 버린다 — 형태 이탈의 신호다.
    droppedKeys: Object.keys(parsed.value || {}).filter((key) => !group.keys.includes(key)),
  };
}

function verdictLine(record) {
  const { verdict } = record;
  if (verdict?.ok) return "ok";
  return verdict?.detail ? `${verdict.issue}(${verdict.detail})` : String(verdict?.issue || "?");
}

/**
 * @param {{ dir?: string }} options 덤프 디렉터리. 기본값은 `_tmp_fusion-live/<타임스탬프>`
 *   — 리포 `.gitignore` 의 `_tmp_*` 에 걸려 커밋되지 않는다(응답 원문에 입력값이 섞인다).
 */
export function createFusionLiveDump({ dir = "" } = {}) {
  const root = dir || path.join("_tmp_fusion-live", new Date().toISOString().replace(/[:.]/g, "-"));
  const records = [];
  const waves = new Map();
  let sample = { index: 0, label: "", validationOptions: {} };
  let seq = 0;

  return {
    dir: root,

    beginSample({ index = 0, label = "", context = {}, input = {} } = {}) {
      sample = { index, label, validationOptions: fusionValidationOptions(context, input) };
    },

    /** 실호출 provider 를 감싼다 — 응답·예외는 그대로 통과시키고 기록만 곁들인다. */
    wrap(providerCall) {
      return async (env, userPrompt, options = {}) => {
        const groupId = String(options?.logContext?.sectionGroup || "");
        const stage = Number(options?.logContext?.stage) || 0;
        const group = FUSION_SECTION_GROUP_SPECS.find((spec) => spec.id === groupId)
          || { id: groupId || "unknown", keys: [], minChars: {}, targetChars: 0 };
        const waveKey = `${sample.index}|${stage}|${group.id}`;
        const wave = (waves.get(waveKey) || 0) + 1;
        waves.set(waveKey, wave);
        seq += 1;
        const name = `${String(seq).padStart(2, "0")}-s${stage}-${group.id}-w${wave}`;
        const startedAt = Date.now();

        let response;
        let thrown;
        try {
          response = await providerCall(env, userPrompt, options);
        } catch (error) {
          thrown = error;
          response = { ok: false, error: error?.code || error?.message || "provider_exception" };
        }
        const elapsedMs = Date.now() - startedAt;

        const analysis = analyze(group, response, sample.validationOptions);
        const record = {
          name,
          sample: sample.label,
          stage,
          group: group.id,
          wave,
          waveLabel: wave === 1 ? "compose" : "repair",
          elapsedMs,
          targetChars: group.targetChars,
          prompt: {
            userChars: typeof userPrompt === "string" ? userPrompt.length : 0,
            systemChars: typeof options?.systemPrompt === "string" ? options.systemPrompt.length : 0,
            maxOutputTokens: options?.maxOutputTokens ?? null,
            timeoutMs: options?.timeoutMs ?? null,
            // 보완 물결에서 어떤 지시가 덧붙었는지가 "재프롬프트로 풀리는가"의 답이다.
            extraInstructionInPrompt: typeof userPrompt === "string" && userPrompt.includes("처음부터 다시 쓰되"),
          },
          response: {
            ok: response?.ok === true,
            error: response?.ok ? null : String(response?.error || "provider_failed"),
            provider: response?.provider || null,
            model: response?.model || null,
            textChars: typeof response?.text === "string" ? response.text.length : 0,
            threw: Boolean(thrown),
          },
          failedAt: analysis.stage,
          verdict: analysis.verdict,
          keys: analysis.keys,
          droppedKeys: analysis.droppedKeys,
        };
        records.push(record);

        await mkdir(root, { recursive: true });
        await writeFile(path.join(root, `${name}.json`), `${JSON.stringify(record, null, 2)}\n`, "utf8");
        // 🔴 원문은 자르지 않는다 — 잘린 꼬리가 곧 parse_failed 의 원인일 수 있다.
        await writeFile(path.join(root, `${name}.txt`), typeof response?.text === "string" ? response.text : "", "utf8");

        if (thrown) throw thrown;
        return response;
      };
    },

    async finish({ command = "" } = {}) {
      if (!records.length) return { dir: root, records };
      const rows = records.map((record) => {
        const keys = record.keys.map((key) => (key.minChars === null
          ? `${key.key} ${key.chars.toLocaleString("ko-KR")}자`
          : `${key.key} ${key.chars.toLocaleString("ko-KR")}/${key.minChars.toLocaleString("ko-KR")}자·kp${key.keyPoints ?? "-"}`)).join("<br>") || "-";
        return `| ${record.name} | ${record.sample} | ${record.stage} | ${record.group} | ${record.waveLabel} | ${(record.elapsedMs / 1000).toFixed(1)}s | ${record.response.textChars.toLocaleString("ko-KR")} | ${verdictLine(record)} | ${keys} |`;
      });
      const failed = records.filter((record) => !record.verdict?.ok);
      const byIssue = failed.reduce((map, record) => map.set(verdictLine(record), (map.get(verdictLine(record)) || 0) + 1), new Map());
      const summary = [
        `# 초융합 실호출 덤프 — ${new Date().toISOString()}`,
        "",
        `- 호출 ${records.length}회 · 탈락 ${failed.length}회`,
        ...[...byIssue].map(([issue, count]) => `  - ${issue} × ${count}`),
        `- 임계: 섹션 ${FUSION_FORTUNE_LENGTH.section.toLocaleString("ko-KR")}자 · keyPoints 3개 · 총 하한 ${FUSION_FORTUNE_LENGTH.total.min.toLocaleString("ko-KR")}자`,
        ...(command ? [`- 재현: \`${command}\``] : []),
        "",
        "🔴 이 디렉터리에는 사용자 입력이 섞인 모델 원문이 있다 — 커밋하지 않는다(`.gitignore` 의 `_tmp_*`).",
        "",
        "| 파일 | 샘플 | 단계 | 묶음 | 물결 | 소요 | 응답자수 | 판정 | 키별 본문/임계 |",
        "|---|---|---|---|---|---|---|---|---|",
        ...rows,
        "",
      ].join("\n");
      await mkdir(root, { recursive: true });
      await writeFile(path.join(root, "summary.md"), `${summary}\n`, "utf8");
      return { dir: root, records, failed };
    },
  };
}
