// CODE DESTINY 일일 콘텐츠 자동화 시스템
// 년/월/일 입력 + 기존 엔진(사주/자미두수/베다/숙요/점성술) 연동
(function () {
  "use strict";

  const CHEONGAN = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
  const JIJI = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
  const OHAENG_MAP = { 甲: "목(木)", 乙: "목(木)", 丙: "화(火)", 丁: "화(火)", 戊: "토(土)", 己: "토(土)", 庚: "금(金)", 辛: "금(金)", 壬: "수(水)", 癸: "수(水)" };
  const WEEK_DAYS = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
  const SUKYO28 = ["각(角)", "항(亢)", "저(氐)", "방(房)", "심(心)", "미(尾)", "기(箕)", "두(斗)", "우(牛)", "여(女)", "허(虛)", "위(危)", "실(室)", "벽(壁)", "규(奎)", "루(婁)", "위(胃)", "묘(昴)", "필(畢)", "자(觜)", "삼(參)", "정(井)", "귀(鬼)", "류(柱)", "성(별)", "장(張)", "익(翼)", "진(軫)"];
  const NAKSHATRA = ["Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra", "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni", "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha", "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishtha", "Shatabhisha", "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"];
  const MOON_SIGNS = ["양자리", "황소자리", "쌍둥이자리", "게자리", "사자자리", "처녀자리", "천칭자리", "전갈자리", "사수자리", "염소자리", "물병자리", "물고기자리"];
  const ZODIAC_SIGNS = MOON_SIGNS;

  function getDayHeavenlyStemIndex(date) {
    const base = new Date(2000, 0, 7);
    const diff = Math.floor((date - base) / 86400000);
    return ((6 + diff) % 10 + 10) % 10;
  }
  function getDayEarthlyBranchIndex(date) {
    const base = new Date(2000, 0, 7);
    const diff = Math.floor((date - base) / 86400000);
    return ((4 + diff) % 12 + 12) % 12;
  }
  function formatDateInput(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return { y, m, d };
  }
  function getSunSign(month, day) {
    const boundaries = [
      ["염소자리", 1, 19], ["물병자리", 2, 18], ["물고기자리", 3, 20], ["양자리", 4, 19],
      ["황소자리", 5, 20], ["쌍둥이자리", 6, 20], ["게자리", 7, 22], ["사자자리", 8, 22],
      ["처녀자리", 9, 22], ["천칭자리", 10, 22], ["전갈자리", 11, 21], ["사수자리", 12, 21],
      ["염소자리", 12, 31],
    ];
    for (const [sign, em, ed] of boundaries) {
      if (month < em || (month === em && day <= ed)) return sign;
    }
    return "염소자리";
  }
  function zodiacFromLongitude(deg) {
    const n = ((Number(deg) % 360) + 360) % 360;
    const idx = Math.floor(n / 30) % 12;
    return ZODIAC_SIGNS[idx] || "미확인";
  }

  async function resolveDateContext(date) {
    if (!window.KasiCalendarService || typeof window.KasiCalendarService.resolveDateContext !== "function") return null;
    const { y, m, d } = formatDateInput(date);
    return window.KasiCalendarService.resolveDateContext({
      calendarType: "solar",
      year: Number(y),
      month: Number(m),
      day: Number(d),
      hour: 12,
      minute: 0,
      second: 0,
      latitude: 37.5665,
      longitude: 126.9780,
      tzOffsetHours: 9,
    }, { setCurrent: false });
  }

  async function resolveVedic(date) {
    const { y, m, d } = formatDateInput(date);
    try {
      const res = await fetch("/api/vedic/planets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: y, month: Number(m), day: Number(d), hour: 12, minute: 0, timezone: 9 }),
      });
      const payload = await res.json();
      if (!res.ok || !payload?.ok) return null;
      const moon = payload?.planets?.Moon;
      const sun = payload?.planets?.Sun;
      return {
        nakshatraHint: NAKSHATRA[Math.floor((((Number(moon) % 360) + 360) % 360) / (360 / 27)) % 27],
        moonSign: zodiacFromLongitude(moon),
        sunSign: zodiacFromLongitude(sun),
        raw: payload.planets,
      };
    } catch (_) {
      return null;
    }
  }

  function extractZiweiSummary(date) {
    try {
      if (typeof window.calcZiweiPalaces !== "function") return { ok: false, summary: "자미두수 엔진 로드 필요" };
      const ziwei = window.calcZiweiPalaces(date.getFullYear(), date.getMonth() + 1, date.getDate(), 12, 0);
      if (!ziwei) return { ok: false, summary: "자미두수 계산 실패" };
      const meng = ziwei.meng || "미확인";
      const shen = ziwei.shen || "미확인";
      const ju = ziwei.juInfo || "미확인";
      return { ok: true, summary: `명궁 ${meng}, 신궁 ${shen}, ${ju}` };
    } catch (_) {
      return { ok: false, summary: "자미두수 계산 실패" };
    }
  }

  function extractSukuyoSummary(date) {
    try {
      let lunarObj = null;
      if (window.KasiEngine && typeof window.KasiEngine.solarToLunar === "function") {
        lunarObj = window.KasiEngine.solarToLunar(date);
      }
      if (!lunarObj || typeof window.calcSukuyoData !== "function") return { ok: false, summary: "숙요 엔진 로드 필요" };
      const s = window.calcSukuyoData(lunarObj);
      if (!s) return { ok: false, summary: "숙요 계산 실패" };
      const mansion = s.mansion_name || s.mansion || "미확인";
      const guardian = s.guardian_animal || "미확인";
      return { ok: true, summary: `${mansion}, 수호동물 ${guardian}` };
    } catch (_) {
      return { ok: false, summary: "숙요 계산 실패" };
    }
  }

  function buildPrompt(inputs) {
    return `
## 🌸 CODE DESTINY 일일 운세 콘텐츠 자동 생성

### ✅ 날짜 입력
- 날짜: ${inputs.날짜}
- 요일: ${inputs.요일}
- 타임스탬프: ${inputs.타임스탬프}

### ✅ 자동 계산(만세력 + 기존 엔진 연동)
- 음력: ${inputs.음력}
- 일진: ${inputs.일진_천간}${inputs.일진_지지}
- 오행: ${inputs.오늘의_오행}
- 이십팔수: ${inputs.이십팔수}
- 나크샤트라: ${inputs.나크샤트라}
- 태양 별자리: ${inputs.태양_별자리}
- 달 위치: ${inputs.달_위치}

### ✅ 기존 기능 연동 결과
- 사주 요약: ${inputs.연동_사주}
- 자미두수 요약: ${inputs.연동_자미두수}
- 숙요점 요약: ${inputs.연동_숙요점}
- 점성술 요약: ${inputs.연동_점성술}
- 베다점 요약: ${inputs.연동_베다점}

---
아래 작업을 생성하세요:
1) 사주/자미두수/숙요/점성술/베다점 섹션 각각 생성
2) KR/EN/JP/CN/FR 다국어 버전 생성
3) 인스타/X/블로그/이메일 포맷 생성
4) code-destiny.com 유입 CTA 포함
`;
  }

  async function generateDailyContentPrompt(targetDate) {
    const date = targetDate instanceof Date ? targetDate : new Date();
    const { y, m, d } = formatDateInput(date);
    const weekDay = WEEK_DAYS[date.getDay()];

    const ctx = await resolveDateContext(date);
    const ilgan = ctx?.ganji?.day?.[0] || CHEONGAN[getDayHeavenlyStemIndex(date)];
    const iiji = ctx?.ganji?.day?.[1] || JIJI[getDayEarthlyBranchIndex(date)];
    const ohaeng = OHAENG_MAP[ilgan] || "목(木)";
    const lunarStr = ctx?.lunar?.month && ctx?.lunar?.day
      ? `${ctx.lunar.month}월 ${ctx.lunar.day}일${ctx.lunar.isLeap ? " (윤달)" : ""}`
      : "음력 변환 중";

    const base28 = new Date(2000, 0, 7);
    const dayDiff = Math.floor((date - base28) / 86400000);
    const todaySukyo = SUKYO28[((dayDiff % 28) + 28) % 28];

    const baseNak = new Date(2000, 0, 1);
    const nakDiff = Math.floor((date - baseNak) / 86400000);
    const todayNak = NAKSHATRA[((nakDiff % 27) + 27) % 27];

    const sunSign = getSunSign(date.getMonth() + 1, date.getDate());
    const moonSignSimple = MOON_SIGNS[Math.floor((dayDiff % 354) / (354 / 12)) % 12];

    const ziwei = extractZiweiSummary(date);
    const sukuyo = extractSukuyoSummary(date);
    const vedic = await resolveVedic(date);
    const moonSign = vedic?.moonSign || moonSignSimple;
    const nak = vedic?.nakshatraHint || todayNak;

    const autoInputs = {
      날짜: `${y}년 ${m}월 ${d}일`,
      요일: weekDay,
      음력: lunarStr,
      일진_천간: ilgan,
      일진_지지: iiji,
      오늘의_오행: ohaeng,
      이십팔수: todaySukyo,
      나크샤트라: nak,
      태양_별자리: sunSign,
      달_위치: moonSign,
      타임스탬프: date.toISOString(),
      연동_사주: `일진 ${ilgan}${iiji}, 오행 ${ohaeng}`,
      연동_자미두수: ziwei.summary,
      연동_숙요점: sukuyo.summary,
      연동_점성술: `태양 ${sunSign}, 달 ${moonSign}`,
      연동_베다점: vedic ? `달궁 ${vedic.moonSign}, 태양궁 ${vedic.sunSign}, 나크샤트라 ${nak}` : "베다 API 응답 없음",
    };

    syncStatus(autoInputs);
    return buildPrompt(autoInputs);
  }

  function syncStatus(inputs) {
    const map = {
      stDate: inputs.날짜,
      stIljin: `${inputs.일진_천간}${inputs.일진_지지}`,
      stLunar: inputs.음력,
      st28: inputs.이십팔수,
      stNak: inputs.나크샤트라,
      stSunZodiac: inputs.태양_별자리,
      stMoonPos: inputs.달_위치,
    };
    Object.keys(map).forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = map[id];
    });
  }

  function generateFallbackPrompt(targetDate) {
    const date = targetDate instanceof Date ? targetDate : new Date();
    const { y, m, d } = formatDateInput(date);
    return buildPrompt({
      날짜: `${y}년 ${m}월 ${d}일`,
      요일: `${["일","월","화","수","목","금","토"][date.getDay()]}요일`,
      음력: "자동 계산 필요",
      일진_천간: "자동",
      일진_지지: "자동",
      오늘의_오행: "자동",
      이십팔수: "자동",
      나크샤트라: "자동",
      태양_별자리: "자동",
      달_위치: "자동",
      타임스탬프: date.toISOString(),
      연동_사주: "연동 실패",
      연동_자미두수: "연동 실패",
      연동_숙요점: "연동 실패",
      연동_점성술: "연동 실패",
      연동_베다점: "연동 실패",
    });
  }

  function getSelectedDate() {
    const y = Number(document.getElementById("dailyYear")?.value);
    const m = Number(document.getElementById("dailyMonth")?.value);
    const d = Number(document.getElementById("dailyDay")?.value);
    if (!y || !m || !d) return new Date();
    const dt = new Date(y, m - 1, d, 12, 0, 0);
    return Number.isNaN(dt.getTime()) ? new Date() : dt;
  }

  async function runAndCopy() {
    const targetDate = getSelectedDate();
    try {
      const prompt = await generateDailyContentPrompt(targetDate);
      await navigator.clipboard.writeText(prompt);
      const preview = document.getElementById("promptPreview");
      if (preview && "value" in preview) preview.value = prompt;
      alert("✅ 날짜 기준 자동 운세 연동 프롬프트가 복사되었습니다.");
      return prompt;
    } catch (error) {
      console.error("프롬프트 생성 오류:", error);
      const fallback = generateFallbackPrompt(targetDate);
      await navigator.clipboard.writeText(fallback);
      const preview = document.getElementById("promptPreview");
      if (preview && "value" in preview) preview.value = fallback;
      alert("⚠️ 일부 엔진 연동 실패. 기본 프롬프트로 복사했습니다.");
      return fallback;
    }
  }

  function injectDateControls() {
    if (document.getElementById("dailyDateControls")) return;
    const now = new Date();
    const wrap = document.createElement("div");
    wrap.id = "dailyDateControls";
    wrap.style.cssText = "display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px;padding:10px 12px;border:1px solid rgba(148,163,184,.2);border-radius:14px;background:rgba(2,6,23,.35);";
    wrap.innerHTML = `
      <span style="color:#cbd5e1;font-size:12px;font-weight:800;letter-spacing:.02em;">날짜 입력</span>
      <input id="dailyYear" type="number" value="${now.getFullYear()}" style="width:90px;border-radius:10px;border:1px solid rgba(148,163,184,.35);background:#0f172a;color:#fff;padding:8px;" />
      <input id="dailyMonth" type="number" min="1" max="12" value="${now.getMonth() + 1}" style="width:58px;border-radius:10px;border:1px solid rgba(148,163,184,.35);background:#0f172a;color:#fff;padding:8px;" />
      <input id="dailyDay" type="number" min="1" max="31" value="${now.getDate()}" style="width:58px;border-radius:10px;border:1px solid rgba(148,163,184,.35);background:#0f172a;color:#fff;padding:8px;" />
    `;

    // 카드 내부 우선 배치
    const nativeBtn = document.getElementById("btnGeneratePrompt");
    if (nativeBtn && nativeBtn.parentElement) {
      nativeBtn.parentElement.insertBefore(wrap, nativeBtn);
      return;
    }
    // fallback: body 하단
    document.body.appendChild(wrap);
  }

  function injectDailyButton() {
    if (document.getElementById("dailyContentBtn")) return;
    const btn = document.createElement("button");
    btn.id = "dailyContentBtn";
    btn.setAttribute("onclick", "runAndCopy()");
    btn.style.cssText = "position:fixed;bottom:30px;right:30px;background:linear-gradient(135deg,#f472b6,#a855f7);color:white;border:none;border-radius:50px;padding:15px 25px;font-size:16px;font-weight:bold;cursor:pointer;box-shadow:0 4px 20px rgba(244,114,182,0.4);z-index:9999;";
    btn.textContent = "🌸 오늘의 콘텐츠 프롬프트 생성";
    btn.addEventListener("click", runAndCopy);
    document.body.appendChild(btn);
  }

  window.buildPrompt = buildPrompt;
  window.generateDailyContentPrompt = generateDailyContentPrompt;
  window.generateFallbackPrompt = generateFallbackPrompt;
  window.runAndCopy = runAndCopy;

  window.addEventListener("DOMContentLoaded", () => {
    injectDateControls();
    injectDailyButton();
    const nativeBtn = document.getElementById("btnGeneratePrompt");
    if (nativeBtn) {
      nativeBtn.addEventListener("click", runAndCopy);
      // 카드 내부 버튼이 있으면 플로팅 버튼은 숨김(중복 방지)
      const floating = document.getElementById("dailyContentBtn");
      if (floating) floating.style.display = "none";
    }
  });
})();

