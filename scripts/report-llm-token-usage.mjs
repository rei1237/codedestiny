#!/usr/bin/env node
/**
 * LLM 토큰 사용량 집계 리포트.
 *
 * lib/llm-client.ts 의 `[llm token_usage]` 로그를 라우트(serviceId)별로 모아
 * 호출수 / 평균 입력·출력 토큰 / 캐시 절감 / 추정 비용 표를 만든다.
 * 최적화 전후를 같은 방식으로 재실행해 감소율을 비교하는 것이 사용 목적이다.
 *
 * 사용법:
 *   npx wrangler tail --format json > llm.log   # 또는 대시보드 로그 export
 *   node scripts/report-llm-token-usage.mjs llm.log
 *   cat llm.log | node scripts/report-llm-token-usage.mjs
 *   node scripts/report-llm-token-usage.mjs llm.log --json   # 기계 판독용
 *
 * 🔴 로그 형식을 바꾸면(emitTokenUsageLog) 이 파서도 함께 고쳐야 한다.
 * 🔴 lib/llm-client.ts 를 안 거치는 경로는 여기 안 잡힌다:
 *    lib/tarot/mindscan-reading.mjs · lib/tarot/love-reading-llm.mjs
 */

import { readFileSync } from "node:fs";

// gemini-2.5-flash 기준 USD/1M tokens. 다른 모델을 쓰면 --in/--out 으로 덮어쓴다.
const DEFAULT_INPUT_USD_PER_M = 0.3;
const DEFAULT_OUTPUT_USD_PER_M = 2.5;

const MARKER = "[llm token_usage]";

function parseArgs(argv) {
  const args = { file: "", json: false, inputUsd: DEFAULT_INPUT_USD_PER_M, outputUsd: DEFAULT_OUTPUT_USD_PER_M };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--json") args.json = true;
    else if (arg === "--in") args.inputUsd = Number(argv[++i]) || DEFAULT_INPUT_USD_PER_M;
    else if (arg === "--out") args.outputUsd = Number(argv[++i]) || DEFAULT_OUTPUT_USD_PER_M;
    else if (!arg.startsWith("--")) args.file = arg;
  }
  return args;
}

function readInput(file) {
  if (file) return readFileSync(file, "utf8");
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

/**
 * 한 줄에서 필드를 뽑는다. console.info 가 객체를 어떻게 직렬화하든
 * (JSON / JS 객체 표기 / wrangler tail 래핑) key 뒤의 값만 집으면 되므로 정규식으로 처리한다.
 */
function readField(line, key) {
  // wrangler tail --format json 은 메시지를 JSON 문자열 안에 한 번 더 넣어 보내 따옴표가
  // \" 로 이스케이프된다. 그래서 따옴표 앞뒤의 백슬래시를 모두 선택적으로 허용한다.
  const q = `\\\\?["']`;
  const match = line.match(
    new RegExp(`${q}?${key}${q}?\\s*[:=]\\s*(?:${q}([^"'\\\\]*)${q}|([\\d.]+)|(true|false))`),
  );
  if (!match) return "";
  return match[1] ?? match[2] ?? match[3] ?? "";
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function collect(text) {
  const rows = [];
  // 마커 기준으로 자른다(줄 단위가 아니다). Node 의 console.info 는 객체를 여러 줄에 걸쳐
  // 예쁘게 출력하고, wrangler tail 은 한 줄에 여러 메시지를 담기 때문에 둘 다 받으려면
  // "마커 다음부터 다음 마커 전까지"를 한 레코드로 봐야 한다.
  const chunks = String(text).split(MARKER).slice(1);
  for (const raw of chunks) {
    // 레코드 하나는 길어야 수백 바이트다. 뒤따르는 무관한 로그까지 긁지 않도록 창을 제한한다.
    const chunk = raw.slice(0, 800);
    {
      rows.push({
        // serviceId 는 라우트가 logContext 로 넘길 때만 있다. 없으면 taskType 으로라도 갈라
        // "어느 종류가 큰지"는 보이게 한다(라벨 없는 라우트는 후속으로 logContext 를 붙인다).
        serviceId: readField(chunk, "serviceId") || `(unlabeled:${readField(chunk, "taskType") || "general"})`,
        taskType: readField(chunk, "taskType") || "general",
        provider: readField(chunk, "provider") || "gemini",
        model: readField(chunk, "model") || "",
        inputTokens: toNumber(readField(chunk, "inputTokens")),
        outputTokens: toNumber(readField(chunk, "outputTokens")),
        cachedInputTokens: toNumber(readField(chunk, "cachedInputTokens")),
        thinkingTokens: toNumber(readField(chunk, "thinkingTokens")),
        maxTokens: toNumber(readField(chunk, "maxTokens")),
        estimated: readField(chunk, "estimated") === "true",
      });
    }
  }
  return rows;
}

function aggregate(rows, inputUsd, outputUsd) {
  const byService = new Map();
  for (const row of rows) {
    let acc = byService.get(row.serviceId);
    if (!acc) {
      acc = {
        serviceId: row.serviceId,
        calls: 0,
        inputTokens: 0,
        outputTokens: 0,
        cachedInputTokens: 0,
        thinkingTokens: 0,
        estimatedCalls: 0,
        truncationRisk: 0,
        models: new Set(),
      };
      byService.set(row.serviceId, acc);
    }
    acc.calls += 1;
    acc.inputTokens += row.inputTokens;
    acc.outputTokens += row.outputTokens;
    acc.cachedInputTokens += row.cachedInputTokens;
    acc.thinkingTokens += row.thinkingTokens;
    if (row.estimated) acc.estimatedCalls += 1;
    // 출력이 상한의 95% 이상이면 잘렸을 가능성이 높다 — 재생성 루프의 선행 지표.
    if (row.maxTokens > 0 && row.outputTokens >= row.maxTokens * 0.95) acc.truncationRisk += 1;
    if (row.model) acc.models.add(row.model);
  }

  const list = [...byService.values()].map((acc) => {
    const billedInput = Math.max(0, acc.inputTokens - acc.cachedInputTokens);
    const costUsd = (billedInput * inputUsd + acc.outputTokens * outputUsd) / 1_000_000;
    return {
      ...acc,
      models: [...acc.models],
      avgInput: Math.round(acc.inputTokens / acc.calls),
      avgOutput: Math.round(acc.outputTokens / acc.calls),
      costUsd,
      costPerCallUsd: costUsd / acc.calls,
    };
  });
  list.sort((a, b) => b.costUsd - a.costUsd);
  return list;
}

function pad(value, width, align = "left") {
  const text = String(value);
  if (text.length >= width) return text.slice(0, width);
  const fill = " ".repeat(width - text.length);
  return align === "right" ? fill + text : text + fill;
}

function formatUsd(value) {
  if (value >= 1) return `$${value.toFixed(2)}`;
  if (value >= 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(6)}`;
}

function render(list, inputUsd, outputUsd) {
  if (!list.length) {
    console.log("집계할 [llm token_usage] 로그가 없습니다.");
    console.log("LLM_PROVIDER_CALL_LOG 가 꺼져 있지 않은지, 로그에 마커가 있는지 확인하세요.");
    return;
  }

  const totals = list.reduce(
    (acc, row) => ({
      calls: acc.calls + row.calls,
      inputTokens: acc.inputTokens + row.inputTokens,
      outputTokens: acc.outputTokens + row.outputTokens,
      cachedInputTokens: acc.cachedInputTokens + row.cachedInputTokens,
      thinkingTokens: acc.thinkingTokens + row.thinkingTokens,
      costUsd: acc.costUsd + row.costUsd,
      truncationRisk: acc.truncationRisk + row.truncationRisk,
    }),
    { calls: 0, inputTokens: 0, outputTokens: 0, cachedInputTokens: 0, thinkingTokens: 0, costUsd: 0, truncationRisk: 0 },
  );

  const header = [
    pad("기능(serviceId)", 34),
    pad("호출", 6, "right"),
    pad("평균입력", 10, "right"),
    pad("평균출력", 10, "right"),
    pad("총비용", 12, "right"),
    pad("건당", 12, "right"),
    pad("상한근접", 9, "right"),
  ].join(" ");
  console.log(header);
  console.log("-".repeat(header.length));

  for (const row of list) {
    console.log([
      pad(row.serviceId, 34),
      pad(row.calls, 6, "right"),
      pad(row.avgInput.toLocaleString("en-US"), 10, "right"),
      pad(row.avgOutput.toLocaleString("en-US"), 10, "right"),
      pad(formatUsd(row.costUsd), 12, "right"),
      pad(formatUsd(row.costPerCallUsd), 12, "right"),
      pad(row.truncationRisk ? `${row.truncationRisk}/${row.calls}` : "-", 9, "right"),
    ].join(" "));
  }

  console.log("-".repeat(header.length));
  console.log([
    pad("합계", 34),
    pad(totals.calls, 6, "right"),
    pad(Math.round(totals.inputTokens / totals.calls).toLocaleString("en-US"), 10, "right"),
    pad(Math.round(totals.outputTokens / totals.calls).toLocaleString("en-US"), 10, "right"),
    pad(formatUsd(totals.costUsd), 12, "right"),
    pad(formatUsd(totals.costUsd / totals.calls), 12, "right"),
    pad(totals.truncationRisk ? `${totals.truncationRisk}/${totals.calls}` : "-", 9, "right"),
  ].join(" "));

  const inputCost = ((totals.inputTokens - totals.cachedInputTokens) * inputUsd) / 1_000_000;
  const outputCost = (totals.outputTokens * outputUsd) / 1_000_000;
  const outputShare = totals.costUsd > 0 ? (outputCost / totals.costUsd) * 100 : 0;

  console.log("");
  console.log(`입력 토큰 합계 : ${totals.inputTokens.toLocaleString("en-US")} (캐시 할인 ${totals.cachedInputTokens.toLocaleString("en-US")}) → ${formatUsd(inputCost)}`);
  console.log(`출력 토큰 합계 : ${totals.outputTokens.toLocaleString("en-US")} → ${formatUsd(outputCost)}`);
  console.log(`출력이 총비용에서 차지하는 비중 : ${outputShare.toFixed(1)}%`);
  if (totals.thinkingTokens > 0) {
    console.log(`⚠️ thinking 토큰 ${totals.thinkingTokens.toLocaleString("en-US")} 발생 — 기본값은 0(OFF)이므로 어딘가 옵트인되어 있다.`);
  }
  if (totals.truncationRisk > 0) {
    console.log(`⚠️ 출력 상한 95% 이상 도달 ${totals.truncationRisk}건 — 재생성/수리 루프가 도는 지점이다.`);
  }
  console.log(`단가 기준 : 입력 $${inputUsd}/1M · 출력 $${outputUsd}/1M`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const rows = collect(readInput(args.file));
  const list = aggregate(rows, args.inputUsd, args.outputUsd);
  if (args.json) {
    console.log(JSON.stringify({ rows: rows.length, services: list }, null, 2));
    return;
  }
  render(list, args.inputUsd, args.outputUsd);
}

main();
