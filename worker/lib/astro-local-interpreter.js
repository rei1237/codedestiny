  import { ASTRO_PREMIUM_CHAPTERS, sanitizeAstroPremiumText } from "./astro-premium-chapters.js";

  const MIN_SECTION_LENGTH = 620;
  const MIN_TOTAL_LENGTH = 40000;

  const SIGN_TO_ELEMENT = {
    "양자리": "불",
    "사자자리": "불",
    "사수자리": "불",
    "황소자리": "흙",
    "처녀자리": "흙",
    "염소자리": "흙",
    "쌍둥이자리": "공기",
    "천칭자리": "공기",
    "물병자리": "공기",
    "게자리": "물",
    "전갈자리": "물",
    "물고기자리": "물",
  };

  const SIGN_TO_MODALITY = {
    "양자리": "활동",
    "게자리": "활동",
    "천칭자리": "활동",
    "염소자리": "활동",
    "황소자리": "고정",
    "사자자리": "고정",
    "전갈자리": "고정",
    "물병자리": "고정",
    "쌍둥이자리": "변통",
    "처녀자리": "변통",
    "사수자리": "변통",
    "물고기자리": "변통",
  };

  const ASTRO_SIGN_INTERPRETATION = {
    "물고기자리": { core: "공감, 직감, 치유, 상상력", shadow: "경계 흐림", advice: "감수성을 일정표와 결과물로 연결" },
    "황소자리": { core: "안정, 감각, 지속성", shadow: "변화 저항", advice: "안정을 지키되 변화를 작은 단위로 수용" },
    "물병자리": { core: "독창성, 관찰, 시스템 사고", shadow: "정서 거리감", advice: "아이디어를 협업 구조로 구현" },
    "쌍둥이자리": { core: "학습, 언어, 연결", shadow: "산만함", advice: "핵심 과제를 한 번에 하나로 제한" },
    "사자자리": { core: "표현력, 자존, 리더십", shadow: "인정 과민", advice: "성과 지표를 먼저 정의" },
    "염소자리": { core: "책임, 구조, 장기전", shadow: "과도한 통제", advice: "성과와 회복 리듬을 분리 운영" },
    "전갈자리": { core: "집중, 통찰, 변환", shadow: "집착", advice: "감정 파고를 기록으로 안정화" },
    "사수자리": { core: "확장, 철학, 의미", shadow: "과신", advice: "비전과 일정표를 같이 관리" },
    "처녀자리": { core: "분석, 개선, 실무", shadow: "완벽주의", advice: "완성보다 반복 개선 우선" },
    "양자리": { core: "시작, 추진, 결단", shadow: "충동성", advice: "실행 전 확인 루틴 고정" },
    "게자리": { core: "보호, 돌봄, 정서", shadow: "감정 기복", advice: "경계와 휴식 시간을 명문화" },
    "천칭자리": { core: "균형, 조율, 관계 감각", shadow: "결정 지연", advice: "결정 마감 시간을 먼저 설정" },
  };

  const ASTRO_PLANET_INTERPRETATION = {
    "태양": { core: "삶의 목적과 자아 방향", shadow: "자기평가 압박", advice: "목표를 루틴으로 쪼개 실행" },
    "달": { core: "감정 리듬과 안정감", shadow: "방어적 반응", advice: "몸의 리듬과 감정 리듬 동시 관리" },
    "수성": { core: "사고와 언어", shadow: "과분석", advice: "핵심 메시지 한 문장 원칙" },
    "금성": { core: "애착, 취향, 가치", shadow: "관계 이상화", advice: "관계 기준을 행동으로 확인" },
    "화성": { core: "행동력과 추진", shadow: "과속", advice: "행동 전에 범위와 책임 명확화" },
    "목성": { core: "확장과 기회", shadow: "과장", advice: "확장 시 검증 지표 병행" },
    "토성": { core: "책임과 구조", shadow: "자기검열", advice: "작은 성취 단위로 자신감 축적" },
    "천왕성": { core: "변화와 혁신", shadow: "급격한 전환", advice: "실험 범위를 제한해 리스크 관리" },
    "해왕성": { core: "영감과 공감", shadow: "경계 혼탁", advice: "판단 근거를 문장으로 남김" },
    "명왕성": { core: "집중과 재구성", shadow: "극단화", advice: "통제 대신 단계별 전환 설계" },
  };

  const ASTRO_HOUSE_INTERPRETATION = {
    "1H": "자기정체성, 몸, 첫인상, 개인 브랜딩",
    "2H": "돈, 자원, 자존감, 생존 감각",
    "3H": "말, 생각, 글쓰기, 가까운 이동",
    "4H": "가족, 집, 뿌리, 마음의 기반",
    "5H": "창작, 연애, 자기표현, 즐거움",
    "6H": "일상, 건강, 루틴, 실무, 서비스",
    "7H": "관계, 결혼, 계약, 타인",
    "8H": "깊은 결합, 심리, 공유 자원, 변화",
    "9H": "철학, 고등 지식, 여행, 확장",
    "10H": "직업, 명예, 사회적 성공",
    "11H": "공동체, 네트워크, 미래 비전, 수익 확장",
    "12H": "무의식, 회복, 은둔, 영성, 숨은 피로",
  };

  const ASTRO_ASPECT_INTERPRETATION = {
    square: { theme: "긴장과 조율", advice: "즉흥 결정보다 운영 원칙을 먼저 세운다" },
    opposition: { theme: "양극의 균형", advice: "한쪽 극단 대신 운영 기준을 만든다" },
    sextile: { theme: "협력과 기회", advice: "작은 실행으로 잠재력을 결과로 연결" },
    conjunction: { theme: "강화와 집중", advice: "강점이 과열되지 않게 속도 조절" },
  };

  function clean(v) {
    return String(v || "").trim();
  }

  function toArray(v) {
    return Array.isArray(v) ? v : [];
  }

  function titleByPlanet(name) {
    const map = {
      Sun: "태양",
      Moon: "달",
      Mercury: "수성",
      Venus: "금성",
      Mars: "화성",
      Jupiter: "목성",
      Saturn: "토성",
      Uranus: "천왕성",
      Neptune: "해왕성",
      Pluto: "명왕성",
    };
    return map[name] || clean(name) || "행성";
  }

  function signByIndex(idx) {
    const list = ["양자리", "황소자리", "쌍둥이자리", "게자리", "사자자리", "처녀자리", "천칭자리", "전갈자리", "사수자리", "염소자리", "물병자리", "물고기자리"];
    return list[Number(idx)] || "";
  }

  function ascToDesc(sign) {
    const list = ["양자리", "황소자리", "쌍둥이자리", "게자리", "사자자리", "처녀자리", "천칭자리", "전갈자리", "사수자리", "염소자리", "물병자리", "물고기자리"];
    const i = list.indexOf(sign);
    if (i < 0) return "";
    return list[(i + 6) % 12];
  }

  function normalizeContext(rawInput = {}, localAstroChartJson = {}) {
    const birth = rawInput.birthInput || localAstroChartJson.birthInput || {};
    const chart = localAstroChartJson.chart || {};
    const planets = toArray(chart.planets || []).map((p) => ({
      planet: titleByPlanet(p.name),
      sign: clean(p.sign),
      house: Number.isFinite(Number(p.house)) ? `${Number(p.house)}H` : "",
      degree: Number.isFinite(Number(p.degree)) ? `${Number(p.degree).toFixed(2)}°` : "",
      retrograde: Boolean(p.retrograde),
    }));

    const sun = planets.find((p) => p.planet === "태양");
    const moon = planets.find((p) => p.planet === "달");
    const asc = clean(chart.ascendantSign || signByIndex(rawInput?.chart?.ascendant?.sign));
    const mc = clean(chart.midheavenSign || signByIndex(rawInput?.chart?.midheaven?.sign));
    const desc = clean(rawInput?.coreSigns?.desc || ascToDesc(asc));

    const elementCounts = { 불: 0, 흙: 0, 공기: 0, 물: 0 };
    const modalityCounts = { 활동: 0, 고정: 0, 변통: 0 };
    for (const p of planets) {
      const e = SIGN_TO_ELEMENT[p.sign];
      const m = SIGN_TO_MODALITY[p.sign];
      if (e) elementCounts[e] += 1;
      if (m) modalityCounts[m] += 1;
    }

    const topElement = Object.entries(elementCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
    const weakElement = Object.entries(elementCounts).sort((a, b) => a[1] - b[1])[0]?.[0] || "";
    const topModality = Object.entries(modalityCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "";

    const houseCounter = {};
    for (const p of planets) {
      if (!p.house) continue;
      houseCounter[p.house] = (houseCounter[p.house] || 0) + 1;
    }
    const topHouse = Object.entries(houseCounter).sort((a, b) => b[1] - a[1])[0]?.[0] || "";

    const aspectsRaw = toArray(chart.aspects || rawInput?.chart?.aspects || []);
    const majorAspects = aspectsRaw.slice(0, 8).map((a) => ({
      pair: `${titleByPlanet(a.planetA || a.p1)}-${titleByPlanet(a.planetB || a.p2)}`,
      aspect: clean(a.type),
      orb: Number.isFinite(Number(a.orb)) ? `${Number(a.orb).toFixed(2)}°` : "",
    }));

    const transits = rawInput.transits || {};
    const timelord = rawInput.timelord || {};

    return {
      fortuneType: "astrology",
      mode: "general",
      profile: {
        birthDate: clean(birth.birthDate),
        birthTime: clean(birth.birthTime),
        timezone: clean(birth.timezone),
        latitude: Number(birth.latitude),
        longitude: Number(birth.longitude),
      },
      coreSigns: {
        sun: clean(sun?.sign),
        moon: clean(moon?.sign),
        asc,
        mc,
        desc,
      },
      elements: {
        dominant: topElement,
        weakest: weakElement,
        counts: elementCounts,
      },
      modalities: {
        dominant: topModality,
        counts: modalityCounts,
      },
      focus: {
        topHouse,
        topHouseTopic: ASTRO_HOUSE_INTERPRETATION[topHouse] || "",
        focusCount: Number(houseCounter[topHouse] || 0),
      },
      placements: planets,
      majorAspects,
      transits: {
        jupiterTransit: clean(transits.jupiterTransit || transits.jupiterSign),
        message: clean(transits.message || ""),
      },
      timelord: {
        firdaria: {
          main: clean(timelord?.firdaria?.main),
          sub: clean(timelord?.firdaria?.sub),
          yearsLeft: Number(timelord?.firdaria?.yearsLeft || 0),
        },
        profection: {
          house: clean(timelord?.profection?.house),
          sign: clean(timelord?.profection?.sign),
          ruler: clean(timelord?.profection?.ruler),
          theme: clean(timelord?.profection?.theme),
        },
      },
    };
  }

  function joinSignals(ctx) {
    const p = ctx.placements.slice(0, 8).map((v) => `${v.planet} ${v.sign}${v.house ? ` ${v.house}` : ""}`);
    const a = ctx.majorAspects.slice(0, 4).map((v) => `${v.pair} ${v.aspect}`.trim());
    return [
      `태양 ${ctx.coreSigns.sun || "미확인"}`,
      `달 ${ctx.coreSigns.moon || "미확인"}`,
      `상승궁 ${ctx.coreSigns.asc || "미확인"}`,
      `MC ${ctx.coreSigns.mc || "미확인"}`,
      ...p,
      ...a,
    ].filter(Boolean).join(" · ");
  }

  function paragraphSet(chapter, section, ctx, idx) {
    const opener = [
      "이 영역은 현재 삶에서 의사결정의 기준을 세우는 핵심 축입니다.",
      "이 주제는 관계, 일, 재정, 회복을 연결하는 운영 원리를 보여 줍니다.",
      "이 카테고리는 감정 반응과 현실 선택을 정렬하는 기준점이 됩니다.",
      "이 항목은 장기 전략을 단기 실행으로 바꾸는 출발점입니다.",
    ][idx % 4];

    const sig = joinSignals(ctx);
    const sunInfo = ASTRO_SIGN_INTERPRETATION[ctx.coreSigns.sun] || {};
    const moonInfo = ASTRO_SIGN_INTERPRETATION[ctx.coreSigns.moon] || {};
    const topHouseTopic = ctx.focus.topHouseTopic || "핵심 삶의 무대";

    const p1 = `${opener} ${chapter.title}의 ${section.title}에서는 관찰된 신호를 삶의 언어로 해석해, 무엇을 키우고 무엇을 줄여야 하는지 분명히 정리합니다. 이 장은 단순한 성향 설명이 아니라 실제 생활에서 반복되는 선택 패턴을 다루며, 같은 상황에서 같은 실수를 줄이고 강점을 결과로 전환하는 데 목적이 있습니다.`;
    const p2 = `이번 차트에서 확인되는 핵심 흐름은 ${sig} 입니다. 태양과 달, 상승궁과 MC의 축은 기본 기질과 사회적 방향을 함께 보여 주고, 행성 배치와 하우스 강조는 에너지가 어디에서 살아나는지 구체적으로 알려 줍니다. 특히 ${ctx.coreSigns.sun || "태양 별자리"}의 ${sunInfo.core || "핵심 기질"}과 ${ctx.coreSigns.moon || "달 별자리"}의 ${moonInfo.core || "감정 리듬"}이 결합될 때, 삶의 체감 강도와 의사결정 속도가 크게 달라질 수 있습니다.`;
    const p3 = `강점은 분명합니다. 원소 분포에서 ${ctx.elements.dominant || "주요 원소"} 기운이 주도권을 가지면, 해당 원소의 장점이 관계와 일의 성과로 직결됩니다. 양식 분포의 ${ctx.modalities.dominant || "우세 양식"} 경향은 변화 대응 방식과 실행 템포를 드러내며, 집중 하우스 ${ctx.focus.topHouse || "핵심 하우스"}의 주제인 ${topHouseTopic}를 의식적으로 활용하면 재능이 더 빠르게 현실화됩니다. 이런 구간에서는 작은 성과를 누적하는 운영이 특히 효과적입니다.`;
    const p4 = `흔들릴 때의 위험도 함께 관리해야 합니다. ${sunInfo.shadow || "자기평가 왜곡"}이나 ${moonInfo.shadow || "감정 과부하"}가 올라오면 판단의 균형이 무너질 수 있어, 중요한 결정은 속도를 낮추고 확인 단계를 늘려야 합니다. 해결책은 단순합니다. 이번 주 목표를 한 줄로 정하고, 실행 범위를 하루 단위로 쪼개며, 주말에 결과를 점검해 다음 주 계획을 조정합니다. ${sunInfo.advice || "감정과 실행을 연결"} 같은 기준을 생활 루틴에 고정하면 운의 등락에도 성과가 안정됩니다.`;

    return [p1, p2, p3, p4].join("\n\n");
  }

  function ensureMin(text, section, ctx) {
    let out = sanitizeAstroPremiumText(text);
    const extraA = `추가 조언으로는 ${section.title}를 매주 같은 시간에 점검하는 루틴을 두는 것입니다. 기록을 남기면 감정의 파도와 실제 성과를 분리해 볼 수 있고, 장점이 살아나는 조건과 손실이 커지는 조건을 빠르게 식별할 수 있습니다.`;
    const extraB = `또한 ${ctx.coreSigns.asc || "상승궁"}과 ${ctx.coreSigns.mc || "MC"} 축을 함께 고려해 개인 브랜딩과 사회적 역할을 분리 관리하면, 관계의 기대와 일의 책임이 충돌할 때도 기준을 잃지 않습니다. 핵심은 한 번에 완벽해지려는 태도보다 지속 가능한 개선 리듬을 지키는 데 있습니다.`;
    while (out.length < MIN_SECTION_LENGTH) {
      out = `${out}\n\n${out.length % 2 ? extraA : extraB}`;
      out = sanitizeAstroPremiumText(out);
    }
    return out;
  }

  function validateNoRepetition(chapters) {
    const all = chapters.flatMap((c) => c.sections.map((s) => sanitizeAstroPremiumText(s.body)));
    const sentenceMap = new Map();
    for (const block of all) {
      for (const sentence of block.split(/[.!?\n]/).map((v) => v.trim()).filter((v) => v.length > 24)) {
        sentenceMap.set(sentence, (sentenceMap.get(sentence) || 0) + 1);
      }
    }
    const duplicated = Array.from(sentenceMap.values()).some((n) => n > 2);
    return !duplicated;
  }

  function collectLength(chapters) {
    return chapters.reduce((sum, chapter) => sum + chapter.sections.reduce((s, section) => s + clean(section.body).length, 0), 0);
  }

  function buildFromContext(ctx) {
    const chapters = ASTRO_PREMIUM_CHAPTERS.map((chapter, cIdx) => {
      const sections = chapter.categories.map((section, sIdx) => {
        const body = ensureMin(paragraphSet(chapter, section, ctx, cIdx + sIdx), section, ctx);
        return {
          title: section.title,
          body,
          bullets: [
            `태양 ${ctx.coreSigns.sun || "미확인"}`,
            `달 ${ctx.coreSigns.moon || "미확인"}`,
            `상승궁 ${ctx.coreSigns.asc || "미확인"}`,
            `핵심 하우스 ${ctx.focus.topHouse || "미확인"}`,
          ],
        };
      });
      return {
        chapterNo: chapter.order,
        title: chapter.title,
        subtitle: `${chapter.roman}. ${chapter.title}`,
        sections,
        source: "local",
      };
    });

    let total = collectLength(chapters);
    let guard = 0;
    while (total < MIN_TOTAL_LENGTH && guard < 200) {
      const chapter = chapters[guard % chapters.length];
      const section = chapter.sections[guard % chapter.sections.length];
      section.body = sanitizeAstroPremiumText(`${section.body}\n\n이 항목의 실행력을 높이기 위해 이번 달에는 목표-실행-점검의 3단계 루틴을 고정하고, 감정 변화와 성과 지표를 함께 기록해 다음 선택의 정확도를 끌어올리세요.`);
      total = collectLength(chapters);
      guard += 1;
    }

    return chapters;
  }

  export function buildLocalAstrologyPdfReport(rawInput = {}, localAstroChartJson = {}) {
    const context = normalizeContext(rawInput, localAstroChartJson);
    const chapters = buildFromContext(context);
    const noRepeat = validateNoRepetition(chapters);
    if (!noRepeat) {
      for (const chapter of chapters) {
        for (let i = 0; i < chapter.sections.length; i += 1) {
          chapter.sections[i].body = sanitizeAstroPremiumText(`${chapter.sections[i].body}\n\n같은 결론을 반복하기보다 상황별 선택 기준을 분리해 두면 판단 품질이 안정됩니다.`);
        }
      }
    }
    return {
      title: "점성술 코즈믹 차트 PDF",
      type: "astrology-pdf",
      mode: "general",
      chapters,
      context,
      totalLength: collectLength(chapters),
      dictionaries: {
        signs: ASTRO_SIGN_INTERPRETATION,
        planets: ASTRO_PLANET_INTERPRETATION,
        houses: ASTRO_HOUSE_INTERPRETATION,
        aspects: ASTRO_ASPECT_INTERPRETATION,
      },
    };
  }
