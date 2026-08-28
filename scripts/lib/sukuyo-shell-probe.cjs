#!/usr/bin/env node
/**
 * 셸(js/)의 **음력일 축 소비자**를 브라우저와 같은 로드 체인에서 실제로 실행하는 프로브.
 * `scripts/verify-sukuyo-korean-calendar.mjs` 가 자식 프로세스로 띄우고 stdout 봉투를 받는다.
 *
 *   echo '{"samples":[...],"times":[...]}' | node scripts/lib/sukuyo-shell-probe.cjs
 *
 * 🔴 **이것은 가드가 아니다.** 판정은 전부 부모가 한다 — 여기서는 값만 만든다.
 *
 * ── 왜 자식 프로세스인가 ────────────────────────────────────────────────────
 * 1. 부모는 ESM + `lunar-javascript` + esbuild 번들 + `loadTsModule` 을 쓴다. 하네스는
 *    `global.window = global` · `global.fetch = 던지는 스텁` · `delete global.Solar/Lunar` 를
 *    하므로, 부모 안에서 켜면 그 뒤 모든 모듈이 자기를 브라우저로 보게 된다.
 * 2. `js/core/index-inline-runtime.js` 는 DOM 스텁에서 **평가 도중 던지고**(`first.setAttribute
 *    is not a function`) `[SibylGuard]` 콘솔 소음을 낸다. 함수 선언은 호이스팅으로 살아남지만
 *    그 소음이 부모의 초록/빨강 출력에 섞이면 오독한다.
 * 3. 봉투 파싱 실패를 실패로 치면 **fail-closed 가 공짜로 붙는다.**
 *
 * 🔴 stdout 을 쓴 **직후에 `process.exit()` 를 부르지 말 것** — POSIX 파이프는 비동기로
 * 비워지므로 Windows 로컬만 멀쩡하고 CI 에서 봉투가 잘린다. **플러시 콜백 안에서** 끝낸다
 * (`verify-ganji-surface-parity.mjs:465-475` 가 같은 함정을 기록한 정본이다).
 *
 * 🔴 그리고 **자연 종료를 기다리면 안 된다** — `index-inline-runtime.js` 가 평가 중에 남기는
 * 타이머 때문에 프로세스가 늦게 끝난다. 실측 2026-08-28: 체인 로드 58ms · 두 파일 평가 9ms ·
 * 계산 전부 합쳐 72ms 인데 **종료는 12,843ms** 였다. 처음에 자연 종료로 뒀다가 가드가
 * 1.8초 → 14.8초가 됐다(fast 잡 예산 밖).
 *
 * 🔴 `shell-ganji-harness.cjs` 의 `SHELL_CHAIN` 은 건드리지 않는다 —
 * `verify:ganji-surface-parity` 검사 ② 가 그 목록을 브라우저 chain 과 대조한다.
 * 아래 `EXTRA_SCRIPTS` 는 이 프로브만의 목록이고, 부모의 전수 발견이 그 파일들을 실제로
 * 가리키는지 대조한다.
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const { loadShell, SHELL_CHAIN, REPO_ROOT } = require("./shell-ganji-harness.cjs");

/** 봉투 표식. 부모는 이 접두가 붙은 줄 하나만 읽고 나머지 콘솔 소음은 버린다. */
const ENVELOPE_PREFIX = "__SUKUYO_SHELL_PROBE__";

/**
 * 체인 뒤에 더 평가할 파일. 이 둘은 브라우저에서 셸 뒤에 실리는 소비자이고,
 * 각각 `_resolveSukuyoLunarObj` · `_dfExtractSukuyoLiveData` 를 전역에 남긴다.
 * 🔴 `index-inline-runtime.js` 는 평가 도중 던진다(위 §2). 던져도 선언은 남으므로 삼키되,
 *    **그 결과로 함수가 없으면 실패**로 만든다(아래 selfCheck) — 조용히 건너뛰지 않는다.
 */
const EXTRA_SCRIPTS = Object.freeze([
  "js/core/saju/modalProfileState.js",
  "js/core/index-inline-runtime.js",
]);

function pad2(n) {
  return String(n).padStart(2, "0");
}

/** 음력 객체를 비교 가능한 한 칸으로. `isLeap` 를 안 주는 표면이 있어 별도로 적는다. */
function lunarKey(lunar) {
  if (!lunar) return null;
  const m = Number(lunar.month);
  const d = Number(lunar.day);
  if (!Number.isFinite(m) || !Number.isFinite(d) || !m || !d) return null;
  return `${m}/${d}${lunar.isLeap ? "L" : ""}`;
}

/**
 * `getGanjiFromParts` 가 실제로 값을 내는 해를 **셸에 물어서** 찾는다.
 * 🔴 손으로 `1990` 을 적지 않는다 — 검증캐시(`_VALIDATED_SOLAR_TERMS_BY_YEAR`)가 늘면 표본도
 * 따라 늘어야 한다. 이 해가 표본에 없으면 간지 축 열이 전부 `null` 이 되고, ⑥-f 가
 * `null == null` 로 조용히 통과한다(`README-ganji-surface.md` ① 과 같은 함정).
 */
function discoverGanjiAnsweringYears(win) {
  const years = [];
  for (let year = 1900; year <= 2100; year += 1) {
    let value = null;
    try {
      value = win.KasiEngine.getGanjiFromParts(win.KasiEngine.partsOf(year, 6, 15, 12, 0, 0));
    } catch { /* 못 내면 그 해가 아니다 */ }
    if (value && value.secha && value.weolgeon && value.iljin) years.push(year);
  }
  return years;
}

function main(request) {
  const win = loadShell(SHELL_CHAIN);

  if (request && request.discover) {
    return { ok: true, ganjiAnsweringYears: discoverGanjiAnsweringYears(win) };
  }

  const evaluated = [];
  for (const relative of EXTRA_SCRIPTS) {
    const abs = path.resolve(REPO_ROOT, relative);
    let threw = null;
    try {
      vm.runInThisContext(fs.readFileSync(abs, "utf8"), { filename: abs });
    } catch (error) {
      threw = String((error && error.message) || error).slice(0, 160);
    }
    evaluated.push({ file: relative, threw });
  }

  /**
   * 음력 → 27수 이름. 셸 자신의 변환기를 쓴다 — 부모가 따로 구현하면 두 벌이 갈린다.
   * 🔴 이름은 한자를 포함한다(`"위(胃)"`). 한글만 쓰면 위(危,10)와 위(胃,15)가 충돌한다.
   */
  function mansionOf(lunar) {
    if (!lunar || typeof win.calcSukuyoData !== "function") return null;
    try {
      const data = win.calcSukuyoData(lunar);
      return data && data.mansion ? String(data.mansion) : null;
    } catch {
      return null;
    }
  }

  /**
   * 음력일 축 소비자. 각자 `{ lunar }` 또는 `{ mansion }` 을 낸다.
   * 🔴 `syBuildMonthlySukuyoLunar` 는 시각 인자를 안 받아 표본 축이 다르다 — 여기 넣지 않고
   *    아래 `monthly` 블록에서 따로 잰다.
   */
  const CONSUMERS = [
    {
      id: "KasiEngine.solarToLunarFromParts",
      async run(s) {
        return { lunar: win.KasiEngine.solarToLunarFromParts(win.KasiEngine.partsOf(s.year, s.month, s.day, s.hour, s.minute, 0)) };
      },
    },
    {
      id: "calcZiweiPalaces:calcMeta",
      async run(s) {
        global.GENDER = "M";
        const chart = win.calcZiweiPalaces(s.year, s.month, s.day, s.hour, s.minute);
        const meta = chart && chart.calcMeta;
        if (!meta) return { lunar: null };
        // 🔴 calcMeta 에는 isLeap 이 없다. 윤달 여부는 이 열에서 잴 수 없으므로 그대로 둔다.
        return { lunar: { year: s.year, month: meta.lunarMonth, day: meta.lunarDay, isLeap: false }, partial: "isLeap 없음" };
      },
    },
    {
      id: "buildFallbackDateContext",
      async run(s) {
        const ctx = win.buildFallbackDateContext(
          { calendarType: "solar", year: s.year, month: s.month, day: s.day, hour: s.hour, minute: s.minute, second: 0 },
          "sukuyo-shell-probe",
        );
        return { lunar: ctx && ctx.lunar };
      },
    },
    {
      id: "modalProfileState._resolveSukuyoLunarObj",
      async run(s) {
        const lunar = await win._resolveSukuyoLunarObj({
          birth: { year: s.year, month: s.month, day: s.day, hour: s.hour, minute: s.minute, calType: "solar" },
        });
        return { lunar };
      },
    },
    {
      id: "indexInlineRuntime._dfExtractSukuyoLiveData",
      async run(s) {
        const live = win._dfExtractSukuyoLiveData({ year: s.year, month: s.month, day: s.day, hour: s.hour, minute: s.minute });
        // 이 표면은 음력을 안 돌려준다 — 본명숙 이름만 나온다. 그래서 비교 축이 이름이다.
        return { mansion: live && live.mansion ? String(live.mansion) : null };
      },
    },
    {
      id: "quantum.syRadarResolveLunar",
      async run(s) {
        const lunar = await win.syRadarResolveLunar(
          `${s.year}-${pad2(s.month)}-${pad2(s.day)}`,
          "solar",
          `${pad2(s.hour)}:${pad2(s.minute)}`,
        );
        return { lunar };
      },
    },
    {
      id: "resolvePrimaryCalendarContext",
      async run(s) {
        const ctx = await win.resolvePrimaryCalendarContext(
          {
            calendarType: "solar",
            year: s.year, month: s.month, day: s.day, hour: s.hour, minute: s.minute, second: 0,
            latitude: 37.5665, longitude: 126.978, tzOffsetHours: 9,
          },
          { setCurrent: false, localOnly: false },
        );
        return { lunar: ctx && ctx.lunar, diagnostics: (ctx && ctx.meta && ctx.meta.diagnostics) || [] };
      },
    },
  ];

  const diagnosticsSeen = new Set();
  let ran = 0;
  let threwCount = 0;

  /** 표본 × 시각 × 소비자를 한 바퀴 돈다. 같은 절차를 두 번 돌려 순서 오염을 잰다. */
  async function collect() {
    const rows = [];
    for (const sample of request.samples) {
      for (const time of request.times) {
        const [hour, minute] = time.split(":").map((v) => Number(v));
        const s = { year: sample.year, month: sample.month, day: sample.day, hour, minute };

        // 🔴 표본마다 로컬 패치 스토어를 비우고 **같은 순서로** 돈다.
        //    `registerCalendarReference`(js/saju-engine.js:866)가 서비스 경로에서 양력→음력을
        //    심고 `solarToLunarFromParts` 가 그것을 코어보다 먼저 읽으므로, 순서가 값에 스밀
        //    여지가 있다. 실제로 스미는지는 부모의 멱등 검사(⑥-g)가 판정한다.
        win._kasiLocalPatchStore = { solarToLunar: {}, lunarToSolar: {} };

        const values = [];
        const notes = [];
        for (const consumer of CONSUMERS) {
          let out = null;
          try {
            out = await consumer.run(s);
            ran += 1;
          } catch (error) {
            threwCount += 1;
            values.push(null);
            notes.push(`${consumer.id} 던짐: ${String((error && error.message) || error).slice(0, 90)}`);
            continue;
          }
          for (const tag of out.diagnostics || []) diagnosticsSeen.add(String(tag));
          const mansion = out.mansion != null ? out.mansion : mansionOf(out.lunar);
          values.push(mansion ? { mansion, lunar: lunarKey(out.lunar) } : null);
        }

        rows.push({
          key: `${sample.year}-${pad2(sample.month)}-${pad2(sample.day)} ${time}`,
          year: sample.year, month: sample.month, day: sample.day, hour, minute,
          values,
          notes,
        });
      }
    }
    return rows;
  }

  return (async () => {
    const rows = await collect();
    // 🔴 같은 프로세스에서 한 바퀴 더 돈다 — 프로세스를 새로 띄우면 오염이 리셋돼 안 잡힌다.
    const repeat = (await collect()).map((row) => ({ key: row.key, values: row.values }));

    // ── 야자시 축 자체 ────────────────────────────────────────────────────
    // 🔴 **명시 옵션**으로 잰다. 기본값(`options || …`)이 바뀌어도 이 블록은 같은 것을 재야
    //    하기 때문이다 — 기본값에 기대면 정책이 바뀌는 순간 이 저울이 같이 무너진다.
    const yajaAxis = [];
    const ganjiAxis = [];
    for (const sample of request.samples) {
      for (const time of request.times) {
        const [hour, minute] = time.split(":").map((v) => Number(v));
        const parts = () => win.KasiEngine.partsOf(sample.year, sample.month, sample.day, hour, minute, 0);
        const key = `${sample.year}-${pad2(sample.month)}-${pad2(sample.day)} ${time}`;

        // 음력일 축: 야자시 ON/OFF 를 명시했을 때 본명숙이 옮겨가는가.
        const on = mansionOf(win.KasiEngine.solarToLunarFromParts(parts(), { yaja: true }));
        const off = mansionOf(win.KasiEngine.solarToLunarFromParts(parts(), { yaja: false }));
        yajaAxis.push({ key, hour, on, off, moved: !!(on && off && on !== off) });

        // 간지 축: 여기는 ON 이 정본이다. PR-3(음력 축 OFF 통일)이 이 축을 건드리지 않았다는
        // 안전벨트로 쓴다 — 23시대에서 ON/OFF 일주가 갈려야 정상이다.
        const gOn = win.KasiEngine.getGanjiFromParts(parts(), { yaja: true });
        const gOff = win.KasiEngine.getGanjiFromParts(parts(), { yaja: false });
        ganjiAxis.push({
          key,
          hour,
          on: gOn && gOn.iljin ? String(gOn.iljin) : null,
          off: gOff && gOff.iljin ? String(gOff.iljin) : null,
        });
      }
    }

    // `syBuildMonthlySukuyoLunar` — 시각 인자를 안 받는 축. 표본의 (연, 월)로만 잰다.
    const monthly = [];
    for (const sample of request.samples) {
      let lunar = null;
      try {
        lunar = win.syBuildMonthlySukuyoLunar(sample.year, sample.month - 1);
      } catch { /* 값이 없으면 null 로 남고 부모가 실패시킨다 */ }
      monthly.push({ key: `${sample.year}-${pad2(sample.month)}`, lunar: lunarKey(lunar) });
    }

    return {
      ok: true,
      tz: process.env.TZ || null,
      offsetMinutes: new Date(Date.UTC(2000, 0, 1, 12)).getTimezoneOffset(),
      chain: SHELL_CHAIN.slice(),
      extraScripts: EXTRA_SCRIPTS.slice(),
      consumers: CONSUMERS.map((c) => c.id),
      selfCheck: {
        evaluated,
        calcSukuyoData: typeof win.calcSukuyoData,
        // 🔴 던지고 남은 선언이 실제로 살아 있는지. 없으면 부모가 실패시킨다 — 건너뛰지 않는다.
        resolveSukuyoLunarObj: typeof win._resolveSukuyoLunarObj,
        dfExtractSukuyoLiveData: typeof win._dfExtractSukuyoLiveData,
        syRadarResolveLunar: typeof win.syRadarResolveLunar,
        syBuildMonthlySukuyoLunar: typeof win.syBuildMonthlySukuyoLunar,
        // 서비스 갈래가 "네트워크가 없어서" 가 아니라 **코어 보정이 돌아서** 안 미는 것임을 박는다.
        diagnostics: [...diagnosticsSeen].sort(),
        // 간지 축 열이 살아 있는 해. 표본이 이 해를 안 담으면 ⑥-f 가 null==null 로 통과한다.
        ganjiAnsweringYears: discoverGanjiAnsweringYears(win),
        ran,
        threw: threwCount,
        // 두 바퀴를 돌므로 기대 실행 수도 두 배다.
        expectedRuns: request.samples.length * request.times.length * CONSUMERS.length * 2,
      },
      rows,
      repeat,
      yajaAxis,
      ganjiAxis,
      monthly,
    };
  })();
}

// 🔴 부모는 이 파일을 `require` 해서 `ENVELOPE_PREFIX` 와 `EXTRA_SCRIPTS` 를 읽는다(전수 발견
// 대조에 쓴다). 그때 stdin 을 물면 부모가 안 끝나므로, 배선은 직접 실행일 때만 한다.
if (require.main === module) {
  let stdin = "";
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => { stdin += chunk; });
  process.stdin.on("end", () => {
    // 🔴 플러시 콜백 안에서 끝낸다(위 머리주석). 이 아래에 코드가 없어야 콜백 exit 이
    //    폴스루를 안 만든다 — `verify-ganji-surface-parity.mjs:471-473` 이 기록한 사고다.
    const finish = (value) => {
      process.stdout.write(`${ENVELOPE_PREFIX}${JSON.stringify(value)}\n`, () => process.exit(0));
    };
    let envelope;
    try {
      envelope = main(JSON.parse(stdin));
    } catch (error) {
      finish({ ok: false, error: String((error && error.stack) || error) });
      return;
    }
    Promise.resolve(envelope)
      .then(finish)
      .catch((error) => finish({ ok: false, error: String((error && error.stack) || error) }));
  });
}

module.exports = { ENVELOPE_PREFIX, EXTRA_SCRIPTS };
