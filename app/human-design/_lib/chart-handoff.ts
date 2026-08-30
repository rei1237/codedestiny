// 차트 화면 → 리포트 화면 인계.
//
// 리포트 화면은 차트 화면이 **방금** 계산·아카이브한 차트를 /api/human-design/chart 로 한 번
// 더 받아 왔다. 아카이브 히트라 재계산은 없지만 인증 + Mongo 왕복 한 벌은 그대로 들었고,
// 그 시간 동안 화면에는 "차트를 불러오는 중…" 한 줄만 떠 있었다. 같은 탭 안에서는 그 왕복이
// 통째로 필요 없다 — 방금 받은 응답을 세션에 놓고 가면 된다.
//
// 🔴 이 값은 **표시 전용**이다. 서버 생성 경로는 계속 자기 아카이브를 읽거나 다시 계산한다
//    (worker/routes/human-design-report.js 의 "클라이언트가 보낸 차트를 믿지 않는다" 계약).
//    여기 저장된 것이 위조돼도 유료 리포트의 근거는 한 글자도 바뀌지 않는다.
// 🔴 그래서 결제 상태·이용권·reportId 는 절대 넣지 않는다. 넣는 순간 표시 전용이 아니게 된다.
// 🔴 sessionStorage 다. 탭을 닫으면 사라지고, 그러면 리포트 화면은 예전처럼 서버에 묻는다.

import type { HdChart } from "./types";

/** 차트 화면이 남긴 출생 입력. 리포트 화면이 "무엇을 계산할지" 를 이 값에서 얻는다. */
export const BIRTH_STORAGE_KEY = "cd_hd_birth_v1";

/** 그 출생 입력으로 방금 받은 차트 응답. 위 키와 **같은 순간에** 쓰인다. */
export const CHART_HANDOFF_KEY = "cd_hd_chart_v1";

export type ChartHandoffBirth = {
  birthDate: string;
  birthTime: string;
  timezone: string;
  calendar: string;
};

type ChartHandoff = {
  birth: ChartHandoffBirth;
  inputHash: string;
  chart: HdChart;
};

/** 두 화면이 같은 출생을 말하고 있는지. 하나라도 어긋나면 캐시를 버리고 서버에 묻는다. */
function sameBirth(a: ChartHandoffBirth, b: ChartHandoffBirth): boolean {
  return a.birthDate === b.birthDate
    && a.birthTime === b.birthTime
    && a.timezone === b.timezone
    && a.calendar === b.calendar;
}

export function writeChartHandoff(birth: ChartHandoffBirth, inputHash: string, chart: HdChart): void {
  if (!inputHash || !chart) return;
  try {
    window.sessionStorage.setItem(CHART_HANDOFF_KEY, JSON.stringify({ birth, inputHash, chart }));
  } catch {
    /* 프라이빗 모드·용량 초과. 리포트 화면이 서버에 물어보면 되므로 조용히 넘어간다. */
  }
}

/** 같은 탭에서 방금 계산한 차트면 돌려준다. 아니면 null — 호출부는 그때 서버에 묻는다. */
export function readChartHandoff(birth: ChartHandoffBirth): ChartHandoff | null {
  try {
    const raw = window.sessionStorage.getItem(CHART_HANDOFF_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ChartHandoff>;
    if (!parsed?.inputHash || !parsed.chart || !parsed.birth) return null;
    if (!sameBirth(parsed.birth as ChartHandoffBirth, birth)) return null;
    return { birth: parsed.birth as ChartHandoffBirth, inputHash: String(parsed.inputHash), chart: parsed.chart as HdChart };
  } catch {
    return null;
  }
}
