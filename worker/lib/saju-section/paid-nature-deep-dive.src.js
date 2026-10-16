// 숙요 본성 심화 해석(sukuyo-nature-deep-dive) 유료 본문 정본. 브라우저로 내려가지 않는다.
// js/saju-engine-tarot-sukuyo-quantum.js 의 해금 화면 생성기(syBuildSukuyoNatureDeepDiveHtml)와 그것만 쓰는 헬퍼
// (연애·돈·일 문장 생성기, 중복 문장 정리, 하루 리듬 점수)를 그대로 옮겼다. syBuildBasicReading 은 정본 전체를 옮겼고
// 브라우저에는 무료 칸(hero·summaryCards·relationMiniMap·dailyPrescription·guardian)만 만드는 사본이 남는다.
// 바뀐 곳은 getDailyKarmicGuidance 의 현재 시각 한 줄뿐이다 — 원본의 new Date() 대신 _syNatureToday()(report.js 가 넘긴
// 요청 시각 ctx.now 의 한국 날짜·시각)를 읽는다. 브라우저 원본(무료 하루 흐름 칸)은 그대로 남는다.
// 27숙 표의 health·timing(기운 리듬·시기 감각 탭 문장)은 이 탭만 쓰므로 브라우저 표에서 빼고 SY_NATURE_PAID_TRAITS 로 옮겼다.
// scripts/extract-saju-section-runtime.mjs 가 타로 파일의 숙요 헬퍼(calcSukuyoData·syBuildLocalCanonicalData·수호 표 등)와 함께
// runtime.generated.mjs 로 묶는다.
function _syNatureToday() {
  var k = new Date((ctx.now instanceof Date ? ctx.now.getTime() : Date.now()) + 9 * 60 * 60 * 1000);
  return new Date(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate(), k.getUTCHours(), k.getUTCMinutes());
}

// 27숙 표(professionalSukuyoTraits)의 health·timing. 키는 window.SukuyoMansionReadings[].key(위숙은 위1·위2)다.
var SY_NATURE_PAID_TRAITS = {
  "각": {
    "health": "새로운 일을 발견하면 쉬는 시간까지 계획으로 채우기 쉽습니다. 하루를 마치기 전 시작한 일과 끝낸 일을 나누어 적고, 더하지 않을 시간도 남겨보세요.",
    "timing": "무언가를 처음 시작하는 착수기와 환절기에 운의 문이 크게 열립니다. 반대로 같은 일이 반복되는 정체기에는 집중력이 빠르게 떨어집니다. 흐름이 막히면 판을 키우기보다 새로 시작할 작은 과제 하나를 만들어 리듬을 되살리는 편이 좋습니다."
  },
  "항": {
    "health": "책임을 다하려는 마음이 커질수록 혼자 버티는 시간이 길어질 수 있습니다. 오늘 꼭 지킬 기준과 내려놓아도 되는 기준을 나누면 여유가 생깁니다.",
    "timing": "질서를 세우고 기준을 다듬는 시기, 조직이 재정비되는 국면에서 강점을 활용하기 좋습니다. 반대로 규칙 없이 흘러가는 혼란기에는 스트레스가 커집니다. 급하게 결론 내기보다 기준을 문서로 정리하는 시기로 삼으면 흐름이 안정됩니다."
  },
  "저": {
    "health": "한번 맡은 일을 오래 붙드는 성향은 생활의 리듬에도 이어집니다. 휴식까지 미루지 않도록 끝내는 시각을 먼저 정하고, 익숙한 산책이나 조용한 취미로 속도를 낮춰보세요.",
    "timing": "천천히 축적하는 시기, 장기 계획을 다지는 국면에서 운이 두터워집니다. 급격한 변화기에는 적응 속도가 느려 스트레스를 받습니다. 흐름이 바뀔 때는 한 번에 갈아타기보다 단계를 나눠 옮겨 가는 편이 안전합니다."
  },
  "방": {
    "health": "주변을 살피느라 자신의 피로는 뒤늦게 알아차릴 수 있습니다. 누군가를 챙긴 날에는 혼자 편히 머무를 시간을 함께 확보해 주세요.",
    "timing": "판을 키우고 성과를 거두는 확장기, 협상과 결정이 몰리는 시기에 강점을 활용하기 좋습니다. 성장이 멈춘 정체기에는 조급함이 커질 수 있습니다. 멈춘 시기에는 새 판을 벌이기보다 사람과 신뢰를 다지는 데 힘을 쓰는 편이 좋습니다."
  },
  "심": {
    "health": "분위기의 작은 변화까지 읽다 보면 생각이 쉽게 분주해집니다. 오늘 확인한 사실과 아직 모르는 일을 나누어 적고, 답이 없는 질문은 잠시 내려놓아 보세요.",
    "timing": "속을 들여다보고 핵심을 파악하는 시기, 전략과 판단이 필요한 국면에서 강점을 활용하기 좋습니다. 정보가 과하게 몰릴 때는 판단이 흐려질 수 있습니다. 결정을 앞두고는 사실과 느낌을 분리해 적어 보는 시간을 가지면 통찰이 선명해집니다."
  },
  "미": {
    "health": "한 가지에 깊이 몰입할 때 시간의 경계가 흐려지기 쉽습니다. 중간에 멈출 시점을 정해두면 집중을 끊는 아쉬움보다 다음 작업을 위한 여유가 남습니다.",
    "timing": "막힌 것을 뚫고 위기를 돌파하는 시기에 운이 가장 강하게 발휘됩니다. 평온하고 반복되는 시기에는 오히려 답답함을 느낍니다. 도전 대상이 없을 때는 운동이나 새 기술 습득처럼 건강한 승부처를 스스로 만드는 편이 좋습니다."
  },
  "기": {
    "health": "움직이며 답을 찾는 편이라 멈춤을 답답하게 느낄 수 있습니다. 일정 사이에 이동과 정리 시간을 충분히 두고, 새로운 약속 하나쯤은 다음으로 미뤄도 괜찮습니다.",
    "timing": "이동하고 확장하며 새 경험을 흡수하는 시기에 운이 크게 열립니다. 한곳에 묶여 반복하는 시기에는 활력이 급격히 줄어듭니다. 정체가 느껴지면 환경을 바꾸거나 새 배움을 시작해 시야를 넓히는 편이 좋습니다."
  },
  "두": {
    "health": "자신을 증명하려는 마음이 바쁠 때 쉬는 일도 뒤로 밀리기 쉽습니다. 오늘의 성과를 한 가지 기록한 뒤 남은 시간은 평가하지 않는 연습을 해보세요.",
    "timing": "가르치고 방향을 제시하며 체계를 세우는 시기에 강점을 활용하기 좋습니다. 배움 없이 소모만 반복되는 시기에는 정체됩니다. 흐름이 막히면 새로운 지식을 들이거나 배우는 입장에 서 보면 길이 다시 열립니다."
  },
  "여": {
    "health": "할 일을 꼼꼼히 챙기는 만큼 미완성인 부분이 오래 마음에 남을 수 있습니다. 오늘 마칠 범위를 작게 정하고, 그 안에서 충분히 했다는 기준을 세워보세요.",
    "timing": "다듬고 완성도를 높이는 시기, 품질과 마무리가 중요한 국면에서 강점을 활용하기 좋습니다. 거칠게 밀어붙여야 하는 속도전에서는 지칠 수 있습니다. 흐름이 급할 때는 완벽보다 적절한 완성을 택하면 리듬이 가벼워집니다."
  },
  "허": {
    "health": "혼자 생각을 가다듬는 시간이 중요한 편입니다. 감정이 복잡한 날에는 결론을 재촉하기보다 짧게 기록하고 익숙한 일상으로 돌아오는 시간을 가져보세요.",
    "timing": "성찰하고 의미를 정리하는 시기, 혼자 사유하는 국면에서 통찰이 살아납니다. 성과와 속도를 다투는 시기에는 소모감이 큽니다. 방향을 잃으면 잠시 물러나 본질을 정리하는 시간을 가지면 길이 보입니다."
  },
  "위1": {
    "health": "낯선 자극에서 활력을 얻지만 일정이 빽빽해지면 마음이 흩어질 수 있습니다. 하루에 새로 받아들일 일을 줄이고, 편안한 공간에서 쉬는 시간을 남겨보세요.",
    "timing": "전환점과 위기 국면에서 판단이 선명해지고 강점을 활용하기 좋습니다. 평온이 길게 이어지는 시기에는 오히려 불안해질 수 있습니다. 큰 변화를 앞두고는 리스크 목록을 먼저 만들어 두면 흐름을 안정적으로 탑니다."
  },
  "실": {
    "health": "앞장서서 일을 끌어갈수록 멈추는 시점을 놓치기 쉽습니다. 다음 목표를 세우기 전에 지금의 부담을 나누어 맡길 사람과 방식을 먼저 살펴보세요.",
    "timing": "새로 시작하고 판을 여는 착수기에 운이 가장 강합니다. 반복과 유지가 이어지는 시기에는 흥미가 빠르게 식습니다. 정체가 느껴지면 기존 일에 새 목표를 붙여 시작의 감각을 되살리는 편이 좋습니다."
  },
  "벽": {
    "health": "다른 사람의 기대를 오래 떠안으면 자신에게 필요한 시간이 줄어듭니다. 부탁을 듣자마자 답하기보다 일정부터 확인하는 짧은 간격을 두어보세요.",
    "timing": "사람 사이를 잇고 조율하는 시기, 협업이 중요한 국면에서 강점을 활용하기 좋습니다. 혼자 밀어붙여야 하는 독자 승부에서는 힘이 덜 실립니다. 갈등이 커질 때는 승패를 가르기보다 서로의 자리를 정리하는 편이 좋습니다."
  },
  "규": {
    "health": "단정하고 정돈된 상태를 지키려는 마음이 휴식까지 엄격하게 만들 수 있습니다. 결과를 남기지 않아도 즐거운 일을 골라 편하게 머무는 시간을 가져보세요.",
    "timing": "정돈하고 기록하며 가치를 세우는 시기에 강점을 활용하기 좋습니다. 급격한 변화와 파격이 요구되는 시기에는 답답함을 느낍니다. 흐름이 막히면 익숙한 틀에 새 관점을 한 가지 들여 보면 길이 열립니다."
  },
  "루": {
    "health": "주변의 필요에 빠르게 반응하다 보면 하루가 남의 일정으로 채워질 수 있습니다. 연락을 확인하는 시간과 혼자 쉬는 시간을 나누면 생활의 중심을 찾기 좋습니다.",
    "timing": "사람과 정보를 연결하고 관계망을 넓히는 시기에 강점을 활용하기 좋습니다. 홀로 깊이 파고들어야 하는 시기에는 집중이 흩어집니다. 흐름이 정체되면 새로운 사람과 자리를 만들어 연결을 넓히면 기회가 열립니다."
  },
  "위2": {
    "health": "목표가 보이면 끝까지 밀어붙이는 힘이 있지만 쉴 때도 다음 일을 생각하기 쉽습니다. 오늘 한 일을 확인하고, 이어갈 일은 내일의 목록으로 옮겨두세요.",
    "timing": "모으고 분석하며 자원을 정리하는 시기에 강점을 활용하기 좋습니다. 즉흥적인 속도전에서는 결정을 놓칠 수 있습니다. 흐름이 막히면 기준을 세워 실행으로 옮기는 시점을 정하면 정체가 풀립니다."
  },
  "묘": {
    "health": "만족할 만한 모습을 갖추려 애쓰는 날에는 사소한 부족함도 크게 느껴질 수 있습니다. 평가를 잠시 멈추고 음악이나 산책처럼 편안하게 즐길 수 있는 시간을 남겨보세요.",
    "timing": "사람을 살피고 공동체를 안정시키는 시기에 강점을 활용하기 좋습니다. 냉정한 경쟁만 이어지는 국면에서는 지칠 수 있습니다. 소진이 느껴지면 돌봄의 범위를 줄이고 자신을 돌보는 편이 좋습니다."
  },
  "필": {
    "health": "익숙한 방식은 안정감을 주지만 생활이 한 가지 리듬에만 묶일 수 있습니다. 큰 변화보다 잠깐의 산책이나 일하는 자리 정리처럼 작은 전환부터 시도해 보세요.",
    "timing": "오래 다듬어 결과물을 완성하는 시기에 강점을 활용하기 좋습니다. 빠른 전환과 즉흥이 요구되는 시기에는 답답함을 느낍니다. 막힘이 느껴지면 방식보다 목적을 먼저 확인하면 길이 트입니다."
  },
  "자": {
    "health": "말과 생각을 정교하게 다듬느라 쉬는 중에도 머릿속 대화가 이어질 수 있습니다. 결론이 나지 않는 생각을 적어두고 잠시 다른 활동으로 시선을 옮겨보세요.",
    "timing": "정보를 모아 핵심을 정리하고 전달하는 시기에 강점을 활용하기 좋습니다. 침묵과 인내가 필요한 국면에서는 실수가 나올 수 있습니다. 흐름이 급할 때는 말을 내보내기 전에 방향을 먼저 고르면 좋습니다."
  },
  "삼": {
    "health": "새로운 자극에 반응하는 속도가 빨라 일정이 쉽게 늘어날 수 있습니다. 다음 약속을 잡기 전 비워둘 시간을 확인하면 즐거움과 여유를 함께 지키기 좋습니다.",
    "timing": "낡은 틀을 깨고 새 구조를 만드는 전환기에 운이 가장 강합니다. 안정만 이어지는 시기에는 답답함을 느낍니다. 변화의 대상이 없을 때는 스스로 개선 과제를 만들어 힘을 생산적으로 쓰는 편이 좋습니다."
  },
  "정": {
    "health": "여러 사람의 의견을 정리하다 보면 자신이 원하는 것을 뒤로 미루기 쉽습니다. 하루 끝에 나에게 편했던 순간과 부담스러웠던 순간을 하나씩 돌아보세요.",
    "timing": "복잡한 것을 분류하고 기준을 세우는 시기에 강점을 활용하기 좋습니다. 감정과 직관이 앞서야 하는 국면에서는 경직될 수 있습니다. 흐름이 막히면 논리에 감정의 온도를 더하는 시점으로 삼으면 좋습니다."
  },
  "귀": {
    "health": "감정과 분위기에 민감하게 반응하는 날에는 혼자 조용히 머무는 시간이 도움이 됩니다. 다른 사람의 기분을 해결하려 하기보다 지금 감당할 수 있는 범위를 살펴보세요.",
    "timing": "변화의 조짐을 먼저 감지하는 전환기에 강점을 활용하기 좋습니다. 확실하고 반복되는 시기에는 감각이 무뎌질 수 있습니다. 예감이 올 때는 현실 확인을 거치면 직감이 지혜로 바뀝니다."
  },
  "류": {
    "health": "몰입과 애정이 깊어질수록 마음을 쉽게 떼어놓지 못할 수 있습니다. 상대의 답이나 일의 결과를 기다리는 동안에도 자신의 일상을 이어갈 작은 약속을 정해보세요.",
    "timing": "한 분야를 깊게 파고드는 시기, 장기 몰입이 필요한 국면에서 강점을 활용하기 좋습니다. 여러 일을 동시에 벌여야 하는 시기에는 소모가 큽니다. 집착이 굳는다 싶으면 주기적으로 숨을 고르는 시간을 넣으면 좋습니다."
  },
  "성": {
    "health": "목표를 향한 의욕이 커질 때는 쉼까지 성과로 평가하기 쉽습니다. 승패와 무관하게 지킨 생활 습관을 확인하며 속도를 조절해 보세요.",
    "timing": "목표를 향해 성과를 거두는 시기, 경쟁과 도전의 국면에서 강점을 활용하기 좋습니다. 성과가 보이지 않는 정체기에는 조급함이 커집니다. 멈춘 시기에는 승패 대신 실력을 다지는 데 힘을 쓰는 편이 좋습니다."
  },
  "장": {
    "health": "여러 곳에서 관심을 받으면 모든 자리에 응하고 싶어질 수 있습니다. 오늘 집중할 약속을 고르고, 아무것도 보여주지 않아도 되는 시간을 남겨보세요.",
    "timing": "자신을 드러내고 무대를 키우는 확장기에 강점을 활용하기 좋습니다. 조용히 안으로 다져야 하는 시기에는 흔들리기 쉽습니다. 흐름이 흩어지면 중심 주제 하나로 힘을 모으면 빛이 강해집니다."
  },
  "익": {
    "health": "완성도를 높이려는 마음이 끝없는 수정으로 이어질 수 있습니다. 마무리 기준을 미리 정하고, 끝낸 뒤에는 다시 검토하지 않는 시간을 가져보세요.",
    "timing": "품질과 완성도를 끌어올리는 시기에 강점을 활용하기 좋습니다. 거칠고 빠른 속도전에서는 지칠 수 있습니다. 기준이 너무 높아지면 지금 단계의 완성을 인정하는 편이 흐름을 가볍게 합니다."
  },
  "진": {
    "health": "가능성을 꼼꼼히 비교하다 보면 쉬는 중에도 검토가 이어질 수 있습니다. 지금 결정할 일과 나중에 확인할 일을 분리해 두면 마음의 부담을 덜기 좋습니다.",
    "timing": "복잡한 것을 마무리하고 다음을 준비하는 전환기에 강점을 활용하기 좋습니다. 새로 크게 벌여야 하는 시기에는 결정이 늦어질 수 있습니다. 흐름이 막히면 완벽한 답보다 지금 정리할 한 가지를 고르면 좋습니다."
  }
};

function getDailyKarmicGuidance(lunarObj, m) {
    const today = _syNatureToday();
    // deterministic seeds
    const seed1 = today.getDate() + today.getMonth() + (m ? m.charCodeAt(0) : 0);
    const seed2 = today.getDate() * 3 + (m ? m.charCodeAt(0)*2 : 0);
    const strDate = today.getFullYear()+""+today.getMonth()+today.getDate()+m;

    let hashScore1 = (seed1 * 13) % 40 + 60;
    let hashScore2 = (seed2 * 17) % 40 + 60;
    let hashScore3 = (strDate.length * seed1) % 40 + 60;
    let overall = Math.floor((hashScore1 + hashScore2 + hashScore3) / 3);

    function getBounded(base) {
       let val = base + ((seed1 % 11) - 5);
       if (val > 100) val = 100; if(val < 50) val = 50; return val;
    }

    function moonPhase(score) {
        if (score >= 93) return {emoji:'🌕', label:_sajuQuantumText("sq_6315_prop_label"), desc:'상징 리듬이 크게 차오른 날입니다. 결과를 단정하기보다 이미 잡은 방향을 정돈하기 좋습니다.'};
        if (score >= 83) return {emoji:'🌔', label:_sajuQuantumText("sq_6316_prop_label"), desc:'기운이 차오르는 흐름입니다. 새 일을 확정하기보다 준비를 한 걸음 앞으로 밀기 좋습니다.'};
        if (score >= 73) return {emoji:'🌓', label:_sajuQuantumText("sq_6317_prop_label"), desc:'빛과 그림자가 균형을 이루는 흐름입니다. 비교와 조율을 차분히 다루기 좋습니다.'};
        if (score >= 63) return {emoji:'🌒', label:_sajuQuantumText("sq_6318_prop_label"), desc:'작은 시작의 리듬입니다. 부담 없는 계획과 루틴을 조용히 심기 좋습니다.'};
        return               {emoji:'🌑', label:_sajuQuantumText("sq_6319_prop_label"), desc:'내면을 돌아보는 정화의 리듬입니다. 쉬고 비우며 다음 흐름을 기다리기 좋습니다.'};
    }

    const insightPool = [
        `오늘의 ${m}별 기운은 고요한 수면 위 달빛처럼 직관을 또렷하게 비춥니다. 마음속에서 오래 묵힌 질문을 차분히 정리하기 좋습니다.`,
        `${m}의 별자리 에너지가 오늘 말의 결을 다듬어줍니다. 중요한 대화나 글쓰기, 제안은 확정 전에 초안을 정리하기 좋습니다.`,
        `오늘 ${m}의 기운은 씨앗처럼 잠재적입니다. 눈에 띄는 결과보다 보이지 않는 토대를 쌓는 데 집중하면 흐름이 단단해집니다.`,
        `${m}별의 진동수가 오늘 인간관계의 감각을 깨웁니다. 오래된 인연은 성급히 붙잡기보다 가볍게 안부를 전하기 좋습니다.`,
        `오늘 ${m}의 우주적 파동은 창의력을 부드럽게 자극합니다. 평소와 다른 루트를 걸으며 작은 영감을 받아들이기 좋습니다.`,
        `${m}별은 오늘 돈을 다루는 습관을 점검하게 합니다. 오래 미룬 지출 기준이나 예산표를 차분히 정리해보세요.`,
        `${m}의 기운이 감정 에너지를 정화하는 날입니다. 과거의 집착이나 오해는 결론보다 거리 두기로 가볍게 내려놓기 좋습니다.`,
        `오늘 ${m}별의 주파수는 작은 용기를 깨웁니다. 두렵다고 미뤄온 일은 큰 결단보다 첫 준비를 시작하기 좋습니다.`,
        `${m}의 별빛이 오늘 집중력의 렌즈가 되어줍니다. 산만하게 흩어지는 에너지를 하나의 작은 목표에 모아보세요.`,
        `${m}별이 따뜻한 인연의 온기를 퍼뜨리는 날입니다. 주변 사람에게 작은 호의를 건네며 관계의 결을 부드럽게 다듬기 좋습니다.`
    ];

    const ritualColors = ['#c0a060','#7eb8d4','#c87070','#80c87e','#b080c8','#d49060','#70a8c8','#c8b070','#78c8a0','#c07090'];
    const ritualFoods = ['대추차','따뜻한 된장국','레몬물','홍삼 한 조각','흑임자죽','귤 하나','따뜻한 우유','현미밥','아몬드 한 줌','석류차'];
    const ritualActions = ['숨을 10번 고르게 쉬기','창문 열어 맑은 공기 맞기','5분간 하늘 바라보기','감사한 것 3가지 적기','좋아하는 음악 한 곡 온전히 듣기','손 씻고 물 마시기','10분 산책','잠시 눈 감고 오늘 하루 상상하기','아끼는 사람에게 메시지 보내기','일기 한 줄 쓰기'];

    const moon = moonPhase(overall);
    const insight = insightPool[seed1 % insightPool.length];
    const ritual = {
        color: ritualColors[seed2 % ritualColors.length],
        food: ritualFoods[seed1 % ritualFoods.length],
        action: ritualActions[seed2 % ritualActions.length]
    };

    return {
        overall: overall,
        relations: getBounded(hashScore1),
        love: getBounded(hashScore2),
        wealth: getBounded(hashScore3),
        moon: moon,
        insight: insight,
        ritual: ritual
    };
}

function syPickDistinctText(candidates, fallbackText, usedMap) {
  var pool = Array.isArray(candidates) ? candidates : [candidates];
  for (var i = 0; i < pool.length; i += 1) {
    var candidate = String(pool[i] == null ? '' : pool[i]).replace(/\s+/g, ' ').trim();
    if (!candidate) continue;
    var key = candidate.replace(/[.!?。！？]+$/g, '').toLowerCase();
    if (!key) continue;
    if (usedMap && usedMap[key]) continue;
    if (usedMap) usedMap[key] = true;
    return syEnsureSentenceEnding(candidate);
  }
  return syEnsureSentenceEnding(fallbackText || '정보 없음');
}

function syReadingTextKey(text) {
  return String(text == null ? '' : text)
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[.,!?。！？'"`~@#$%^&*()_+=\-\[\]{}:;<>/\\|]/g, '')
    .trim();
}

function syPickUniqueReadingText(currentText, candidates, fallbackText, usedMap) {
  var pool = [currentText].concat(Array.isArray(candidates) ? candidates : []);
  for (var i = 0; i < pool.length; i += 1) {
    var raw = String(pool[i] == null ? '' : pool[i]).replace(/\s+/g, ' ').trim();
    if (!raw) continue;
    var sentence = syEnsureSentenceEnding(raw);
    var key = syReadingTextKey(sentence);
    if (!key) continue;
    var tokenKeys = syCanonicalTokenize(sentence, '').map(function(part) {
      return syReadingTextKey(part);
    }).filter(function(partKey) {
      return !!partKey;
    });
    var hasConflict = false;
    if (usedMap) {
      if (usedMap[key]) hasConflict = true;
      for (var t = 0; t < tokenKeys.length; t += 1) {
        if (usedMap[tokenKeys[t]]) {
          hasConflict = true;
          break;
        }
      }
    }
    if (hasConflict) continue;
    if (usedMap) {
      usedMap[key] = true;
      for (var m = 0; m < tokenKeys.length; m += 1) {
        usedMap[tokenKeys[m]] = true;
      }
    }
    return sentence;
  }
  var fallback = syEnsureSentenceEnding(fallbackText || '정보 없음');
  var fallbackKey = syReadingTextKey(fallback);
  if (usedMap && fallbackKey) {
    usedMap[fallbackKey] = true;
    var fallbackTokenKeys = syCanonicalTokenize(fallback, '').map(function(part) {
      return syReadingTextKey(part);
    }).filter(function(partKey) {
      return !!partKey;
    });
    for (var k = 0; k < fallbackTokenKeys.length; k += 1) {
      usedMap[fallbackTokenKeys[k]] = true;
    }
  }
  return fallback;
}

function syReadingBand(score) {
  var n = Number(score);
  if (!Number.isFinite(n)) return '보통';
  if (n >= 80) return '강함';
  if (n >= 68) return '안정';
  if (n >= 56) return '보통';
  return '주의';
}

function syReadingMetricClamp(score) {
  var n = Number(score);
  if (!Number.isFinite(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function syComputeReadingMetrics(daily) {
  var overall = Number(daily && daily.overall);
  var relations = Number(daily && daily.relations);
  var love = Number(daily && daily.love);
  var wealth = Number(daily && daily.wealth);

  var emotionalStability = syReadingMetricClamp((overall * 0.45) + (relations * 0.3) + (love * 0.25));
  var relationalInitiative = syReadingMetricClamp((love * 0.55) + (relations * 0.35) + (overall * 0.1));
  var cautionLoad = syReadingMetricClamp(((100 - overall) * 0.45) + ((100 - relations) * 0.25) + ((100 - love) * 0.3));
  var financialDiscipline = syReadingMetricClamp((wealth * 0.65) + (overall * 0.2) + ((100 - love) * 0.15));
  var collaborationPower = syReadingMetricClamp((relations * 0.5) + (overall * 0.3) + (wealth * 0.2));
  var burnoutRisk = syReadingMetricClamp(((100 - overall) * 0.4) + ((100 - wealth) * 0.2) + ((100 - love) * 0.2) + ((100 - relations) * 0.2));

  return {
    overall: syReadingMetricClamp(overall),
    relations: syReadingMetricClamp(relations),
    love: syReadingMetricClamp(love),
    wealth: syReadingMetricClamp(wealth),
    emotionalStability: emotionalStability,
    relationalInitiative: relationalInitiative,
    cautionLoad: cautionLoad,
    financialDiscipline: financialDiscipline,
    collaborationPower: collaborationPower,
    burnoutRisk: burnoutRisk,
    loveBand: syReadingBand(love),
    relationBand: syReadingBand(relations),
    wealthBand: syReadingBand(wealth)
  };
}

function syBuildLoveAttractionType(traits, loveTokens, karmaTokens, mansionIdx, metrics) {
  var override = syReadingOverrideByIndex(mansionIdx, 'attractionType');
  if (override) return override;
  var calculated = metrics && metrics.relationalInitiative >= 72
    ? '관계 신호를 빠르게 읽고 감정적으로 일관된 사람에게 끌림이 강하게 형성됩니다.'
    : (metrics && metrics.relationalInitiative <= 55
      ? '속도보다 안정성을 지키는 사람, 약속을 천천히 지켜가는 사람에게 마음이 깊어집니다.'
      : '신뢰와 책임감이 분명한 사람에게 자연스럽게 끌리는 흐름입니다.');
  return syComposeFromTokens(
    syCanonicalTokenize((traits.love || '') + '. ' + (traits.karma || '') + '. ' + calculated, '신뢰감이 선명한 사람에게 끌림이 커집니다.'),
    '신뢰감이 선명한 사람에게 끌림이 커집니다.'
  );
}

function syBuildLoveStyleText(traits, loveTokens, hiddenTokens, mansionIdx, metrics) {
  var override = syReadingOverrideByIndex(mansionIdx, 'loveStyle');
  if (override) return override;
  var calculated = metrics && metrics.emotionalStability >= 70
    ? '감정 기복을 스스로 관리하며 따뜻한 표현을 유지하는 방식이 관계 만족도를 높입니다.'
    : '감정이 흔들릴 때 침묵으로 버티기보다 짧은 공유 대화를 넣을수록 관계가 안정됩니다.';
  return syComposeFromTokens(
    syCanonicalTokenize((traits.love || '') + '. ' + (traits.hidden || '') + '. ' + calculated, '표현보다 돌봄으로 애정을 전하는 타입입니다.'),
    '표현보다 돌봄으로 애정을 전하는 타입입니다.'
  );
}

function syBuildDeepeningMomentText(traits, karmaTokens, relationTokens, mansionIdx, metrics) {
  var override = syReadingOverrideByIndex(mansionIdx, 'deepeningMoment');
  if (override) return override;
  var calculated = metrics && metrics.relations >= 72
    ? '합의와 실행이 같은 날에 연결될 때 신뢰 심화 속도가 빨라집니다.'
    : '기대치와 경계선을 대화로 명확히 맞추는 순간 관계의 깊이가 올라갑니다.';
  return syComposeFromTokens(
    syCanonicalTokenize((traits.karma || '') + '. ' + (traits.love || '') + '. ' + calculated, '기대와 경계를 솔직히 확인할 때 관계가 깊어집니다.'),
    '기대와 경계를 솔직히 확인할 때 관계가 깊어집니다.'
  );
}

function syBuildLoveAnxietyPointText(traits, hiddenTokens, mansionIdx, metrics) {
  var override = syReadingOverrideByIndex(mansionIdx, 'anxietyPoint');
  if (override) return override;
  var calculated = metrics && metrics.cautionLoad >= 64
    ? '현재 지표상 감정 과부하 구간이 겹치므로 즉시 해석보다 감정 안정 루틴을 먼저 두는 편이 안전합니다.'
    : '불안 신호가 낮은 편이라도 오해를 줄이기 위해 의도 확인 질문을 짧게 넣는 것이 효과적입니다.';
  return syComposeFromTokens(
    syCanonicalTokenize((traits.hidden || '') + '. ' + calculated, '감정을 혼자 정리하려고 버티면 오해가 커질 수 있습니다.'),
    '감정을 혼자 정리하려고 버티면 오해가 커질 수 있습니다.'
  );
}

function syBuildLoveLongTermAdviceText(traits, karmaTokens, mansionIdx, metrics) {
  var override = syReadingOverrideByIndex(mansionIdx, 'longTermAdvice');
  if (override) return override;
  var calculated = metrics && metrics.relations >= 70
    ? '장기적으로는 공감과 실행 균형을 유지하면 관계의 회복 탄력이 커집니다.'
    : '장기적으로는 주간 대화 루틴을 고정해 관계 해석 비용을 낮추는 전략이 유효합니다.';
  return syComposeFromTokens(
    syCanonicalTokenize((traits.karma || '') + '. ' + calculated, '상대의 속도를 존중하는 대화 루틴이 관계 수명을 늘립니다.'),
    '상대의 속도를 존중하는 대화 루틴이 관계 수명을 늘립니다.'
  );
}

function syBuildLoveAvoidPatternText(traits, hiddenTokens, mansionIdx, metrics) {
  var override = syReadingOverrideByIndex(mansionIdx, 'avoidPattern');
  if (override) return override;
  var calculated = metrics && metrics.cautionLoad >= 64
    ? '감정 피크 구간에서 즉시 결론 내리기'
    : '상대 의도를 단정하고 대화를 생략하기';
  return syFirstToken(
    syCanonicalTokenize((traits.hidden || '') + '. ' + calculated, '감정이 격할 때 즉시 결론 내리기'),
    '감정이 격할 때 즉시 결론 내리기'
  );
}

function syBuildSpendingHabitText(traits, wealthTokens, mansionIdx, metrics) {
  var override = syReadingOverrideByIndex(mansionIdx, 'spendingHabit');
  if (override) return override;
  var calculated = metrics && metrics.financialDiscipline >= 70
    ? '재물 지표가 안정권이라 가치 지출은 유지하되 변동 지출만 상한을 두면 효율이 올라갑니다.'
    : '재물 지표 변동성이 있어 보상성 지출 한도를 선제 설정해야 현금흐름이 안정됩니다.';
  return syComposeFromTokens(
    syCanonicalTokenize((traits.wealth || '') + '. ' + calculated, '기준이 분명할수록 지출 효율이 높아집니다.'),
    '기준이 분명할수록 지출 효율이 높아집니다.'
  );
}

function syBuildWorkCautionText(traits, workTokens, careerTokens, mansionIdx, metrics) {
  var override = syReadingOverrideByIndex(mansionIdx, 'workCaution');
  if (override) return override;
  var calculated = metrics && metrics.burnoutRisk >= 62
    ? '현재 번아웃 위험 지표가 높아 업무량 자체보다 전환 휴식 타이밍 관리가 우선 과제입니다.'
    : '리스크 지표는 보통 수준이지만 역할 과부하가 누적되면 판단 품질이 빠르게 떨어질 수 있습니다.';
  return syComposeFromTokens(
    syCanonicalTokenize((traits.work || '') + '. ' + calculated, '역할 과부하를 방치하면 집중력과 판단력이 떨어질 수 있습니다.'),
    '역할 과부하를 방치하면 집중력과 판단력이 떨어질 수 있습니다.'
  );
}

function syBuildCollaborationTipText(traits, workTokens, careerTokens, mansionIdx, metrics) {
  var override = syReadingOverrideByIndex(mansionIdx, 'collaborationTip');
  if (override) return override;
  var calculated = metrics && metrics.collaborationPower >= 72
    ? '협업 강점이 높은 날이라 초기 기준만 맞추면 속도와 품질을 동시에 확보하기 쉽습니다.'
    : '협업 지표가 흔들리는 날에는 역할·마감·승인 기준을 문서화해 해석 비용을 줄여야 합니다.';
  return syComposeFromTokens(
    syCanonicalTokenize((traits.work || '') + '. ' + syComposeFromTokens(careerTokens, '') + '. ' + calculated, '역할과 마감 기준을 먼저 합의할수록 협업 품질이 높아집니다.'),
    '역할과 마감 기준을 먼저 합의할수록 협업 품질이 높아집니다.'
  );
}

function syDedupeReadingTexts(reading, seed) {
  if (!reading) return reading;
  var loveProfile = reading.loveProfile || {};
  var workMoney = reading.workMoney || {};
  var traits = seed && seed.traits ? seed.traits : {};
  var usedMap = {};

  loveProfile.attractionType = syPickUniqueReadingText(
    loveProfile.attractionType,
    [
      syComposeFromTokens(seed && seed.loveTokens, ''),
      syComposeFromTokens(syCanonicalTokenize((traits.love || '') + '. 신뢰와 안정감을 주는 사람에게 끌림이 커집니다.', ''), ''),
      syComposeFromTokens(seed && seed.karmaTokens, '')
    ],
    '신뢰감이 선명한 사람에게 자연스럽게 마음이 기웁니다.',
    usedMap
  );

  loveProfile.loveStyle = syPickUniqueReadingText(
    loveProfile.loveStyle,
    [
      syComposeFromTokens(syCanonicalTokenize((traits.love || '') + '. 감정을 행동으로 보여줄 때 관계가 안정됩니다.', ''), ''),
      syComposeFromTokens(syCanonicalTokenize((traits.hidden || '') + '. 돌봄과 경계를 함께 유지할수록 사랑이 길게 이어집니다.', ''), '')
    ],
    '표현과 배려의 균형을 지킬수록 사랑의 결이 단단해집니다.',
    usedMap
  );

  loveProfile.deepeningMoment = syPickUniqueReadingText(
    loveProfile.deepeningMoment,
    [
      syComposeFromTokens(syCanonicalTokenize((traits.karma || '') + '. 기대와 경계를 솔직하게 합의하는 순간 관계가 깊어집니다.', ''), ''),
      syComposeFromTokens(syCanonicalTokenize((traits.love || '') + '. 서로의 속도를 존중하면 신뢰가 빠르게 쌓입니다.', ''), '')
    ],
    '기대와 경계를 솔직하게 맞추는 순간 관계의 깊이가 커집니다.',
    usedMap
  );

  loveProfile.anxietyPoint = syPickUniqueReadingText(
    loveProfile.anxietyPoint,
    [
      syComposeFromTokens(syCanonicalTokenize((traits.hidden || '') + '. 혼자 버티기보다 먼저 감정을 공유하세요.', ''), ''),
      syComposeFromTokens(syCanonicalTokenize((traits.hidden || '') + '. 불안을 해석보다 대화로 풀면 오해가 줄어듭니다.', ''), '')
    ],
    '불안을 혼자 정리하려고 할수록 오해가 커질 수 있으니 먼저 감정을 공유하세요.',
    usedMap
  );

  loveProfile.longTermAdvice = syPickUniqueReadingText(
    loveProfile.longTermAdvice,
    [
      syComposeFromTokens(seed && seed.karmaTokens, ''),
      syComposeFromTokens(syCanonicalTokenize((traits.karma || '') + '. 서로의 리듬을 맞추는 대화 루틴이 장기 안정의 핵심입니다.', ''), '')
    ],
    '장기적으로는 조언보다 경청의 비율을 높여 신뢰를 축적하세요.',
    usedMap
  );

  loveProfile.avoidPattern = syPickUniqueReadingText(
    loveProfile.avoidPattern,
    [
      syFirstToken(syCanonicalTokenize((traits.hidden || '') + '. 감정이 격해진 직후 결론 내리기', ''), ''),
      '감정이 흔들릴 때 상대의 의도를 단정하기'
    ],
    '감정이 격해진 직후 결론 내리기',
    usedMap
  );

  workMoney.spendingHabit = syPickUniqueReadingText(
    workMoney.spendingHabit,
    [
      syComposeFromTokens(seed && seed.wealthTokens, ''),
      syComposeFromTokens(syCanonicalTokenize((traits.wealth || '') + '. 기준 없는 보상 지출을 줄이면 흐름이 안정됩니다.', ''), '')
    ],
    '지출 기준을 먼저 정해두면 소비 리듬이 안정됩니다.',
    usedMap
  );

  workMoney.workCaution = syPickUniqueReadingText(
    workMoney.workCaution,
    [
      syComposeFromTokens(seed && seed.workTokens, ''),
      syComposeFromTokens(syCanonicalTokenize((traits.work || '') + '. 과부하 신호를 초기에 끊어야 번아웃을 피할 수 있습니다.', ''), ''),
      syComposeFromTokens(syCanonicalTokenize((traits.hidden || '') + '. 완벽주의 압박을 내려놓아야 판단력이 유지됩니다.', ''), '')
    ],
    '역할 과부하를 방치하지 말고 휴식 구간을 먼저 고정하세요.',
    usedMap
  );

  workMoney.collaborationTip = syPickUniqueReadingText(
    workMoney.collaborationTip,
    [
      syComposeFromTokens(seed && seed.careerTokens, ''),
      syComposeFromTokens(syCanonicalTokenize((traits.work || '') + '. 역할과 마감 기준을 문서로 맞추면 협업 품질이 높아집니다.', ''), ''),
      syComposeFromTokens(syCanonicalTokenize((traits.karma || '') + '. 조율 역할을 분담하면 성과와 관계가 함께 안정됩니다.', ''), '')
    ],
    '협업에서는 역할 분담과 기준 합의를 먼저 맞추는 것이 가장 중요합니다.',
    usedMap
  );

  reading.loveProfile = loveProfile;
  reading.workMoney = workMoney;

  return reading;
}

function syBuildBasicReading(canonicalData, sData, daily, guardian) {
  if (!sData || !daily) return null;

  var natal = canonicalData && canonicalData.natalSukuyo ? canonicalData.natalSukuyo : {};
  var traits = sData.traits || {};
  var moon = daily.moon || { emoji: '🌙', label: _sajuQuantumText("sq_7378_prop_label"), desc: '' };
  var coreTokens = syCanonicalTokenize(traits.core || traits.desc, '고요하지만 오래가는 빛을 가진 별입니다.');
  var hiddenTokens = syCanonicalTokenize(traits.hidden || traits.desc, '조용한 시간에 감정 리듬이 더 또렷해집니다.');
  var karmaTokens = syCanonicalTokenize(traits.karma || traits.love, '좋은 인연은 작은 배려에서 자라납니다.');
  var loveTokens = syCanonicalTokenize(traits.love, '감정의 속도를 맞추는 대화가 중요합니다.');
  var workTokens = syCanonicalTokenize(traits.work, '역할을 분명히 하면 성과가 안정됩니다.');
  var wealthTokens = syCanonicalTokenize(traits.wealth, '작은 절약과 큰 집중이 돈의 흐름을 지켜줍니다.');
  var relationTokens = syCanonicalList(canonicalData && canonicalData.sukuyoAttributes && canonicalData.sukuyoAttributes.relationshipStyle, []);
  var recoveryTokens = syCanonicalList(canonicalData && canonicalData.sukuyoAttributes && canonicalData.sukuyoAttributes.recoveryPattern, []);
  var careerTokens = syCanonicalList(canonicalData && canonicalData.sukuyoAttributes && canonicalData.sukuyoAttributes.careerStyle, []);
  var wealthStyleTokens = syCanonicalList(canonicalData && canonicalData.sukuyoAttributes && canonicalData.sukuyoAttributes.wealthStyle, []);
  var emotionTokens = syCanonicalTokenize((traits.hidden || '') + '. ' + (daily.insight || ''), '감정 파도를 미리 알아차리면 하루가 부드러워집니다.');
  var readingMetrics = syComputeReadingMetrics(daily);
  var mansionIndex = Number.isFinite(Number(sData.mansionIdx))
    ? Number(sData.mansionIdx)
    : (Number.isFinite(Number(natal.index)) ? Number(natal.index) : null);
  var ritual = daily.ritual || { color: '#c0a060', food: '따뜻한 차', action: '심호흡 10번' };
  var mansionLabel = sData.mansion || ((natal.nameKo || '미상') + '宿(' + (natal.nameHan || '?') + ')');
  var relationDirection = syComposeFromTokens(relationTokens.length ? relationTokens : karmaTokens, '배려와 경계를 함께 지킬수록 인연이 깊어집니다.');
  var recoveryKeyword = syFirstToken(recoveryTokens, syFirstToken(syCanonicalTokenize(ritual.action, '호흡'), '호흡'));
  var guardianName = guardian && guardian.name ? guardian.name : '달빛 지표';
  var guardianEmoji = guardian && guardian.emoji ? guardian.emoji : '✨';
  var guardianColor = syGuardianColorByIndex(sData.mansionIdx);
  var guardianPlace = syGuardianPlaceByIndex(sData.mansionIdx);
  var scoreSeed = Number.isFinite(Number(sData.mansionIdx)) ? Math.abs(Number(sData.mansionIdx)) % 9 : 4;
  var moonLabelText = String(moon && moon.label ? moon.label : '');
  var moonBias = moonLabelText.indexOf('보름') >= 0 ? 6 : (moonLabelText.indexOf('그믐') >= 0 ? -4 : 0);
  var morningScore = syClampScore((daily.relations * 0.57) + (daily.overall * 0.32) + (scoreSeed * 1.4) + moonBias);
  var dayScore = syClampScore((daily.wealth * 0.55) + (daily.overall * 0.35) + ((8 - scoreSeed) * 1.3));
  var nightScore = syClampScore((daily.love * 0.6) + (daily.relations * 0.24) + (daily.overall * 0.1) + (scoreSeed * 0.9) + (moonBias * 0.5));
  var relationshipBodyUsed = {};
  var loveTabBody = syPickDistinctText([
    syComposeFromTokens(loveTokens, ''),
    syComposeFromTokens(syCanonicalTokenize((traits.love || '') + '. ' + relationDirection, ''), ''),
    syComposeFromTokens(syCanonicalTokenize((traits.love || '') + '. ' + (daily.insight || ''), ''), '')
  ], '느린 신뢰와 따뜻한 표현이 사랑을 자라게 합니다.', relationshipBodyUsed);
  var friendTabBody = syPickDistinctText([
    syComposeFromTokens(syCanonicalTokenize((traits.karma || '') + '. ' + relationDirection, ''), ''),
    syComposeFromTokens(karmaTokens, ''),
    syComposeFromTokens(relationTokens, '')
  ], '서로의 결을 존중할수록 관계가 깊어집니다.', relationshipBodyUsed);
  var workTabBody = syPickDistinctText([
    syComposeFromTokens(syCanonicalTokenize((traits.work || '') + '. ' + syComposeFromTokens(careerTokens, ''), ''), ''),
    syComposeFromTokens(workTokens, ''),
    syComposeFromTokens(careerTokens, '')
  ], '역할이 분명할수록 힘이 모입니다.', relationshipBodyUsed);
  var familyTabBody = syPickDistinctText([
    syComposeFromTokens(syCanonicalTokenize((traits.hidden || '') + '. ' + syComposeFromTokens(recoveryTokens, ''), ''), ''),
    syComposeFromTokens(hiddenTokens.concat(recoveryTokens), '')
  ], '가족과의 관계는 회복 리듬을 함께 맞출 때 안정됩니다.', relationshipBodyUsed);
  var careTabBody = syPickDistinctText([
    syComposeFromTokens(syCanonicalTokenize((traits.hidden || '') + '. ' + (daily.insight || ''), ''), ''),
    syComposeFromTokens(syCanonicalTokenize((traits.karma || '') + '. ' + (traits.hidden || ''), ''), '')
  ], '지친 날에는 결론보다 휴식을 먼저 선택하세요.', relationshipBodyUsed);
  var attractionTypeText = syBuildLoveAttractionType(traits, loveTokens, karmaTokens, mansionIndex, readingMetrics);
  var loveStyleText = syBuildLoveStyleText(traits, loveTokens, hiddenTokens, mansionIndex, readingMetrics);
  var deepeningMomentText = syBuildDeepeningMomentText(traits, karmaTokens, relationTokens, mansionIndex, readingMetrics);
  var anxietyPointText = syBuildLoveAnxietyPointText(traits, hiddenTokens, mansionIndex, readingMetrics);
  var longTermAdviceText = syBuildLoveLongTermAdviceText(traits, karmaTokens, mansionIndex, readingMetrics);
  var avoidPatternText = syBuildLoveAvoidPatternText(traits, hiddenTokens, mansionIndex, readingMetrics);
  var spendingHabitText = syBuildSpendingHabitText(traits, wealthTokens, mansionIndex, readingMetrics);
  var workCautionText = syBuildWorkCautionText(traits, workTokens, careerTokens, mansionIndex, readingMetrics);
  var collaborationTipText = syBuildCollaborationTipText(traits, workTokens, careerTokens, mansionIndex, readingMetrics);

  var reading = {
    hero: {
      title: _sajuQuantumText("sq_7444_prop_title"),
      subtitle: _sajuQuantumText("sq_7445_prop_subtitle"),
      mansionLabel: mansionLabel,
      moonLabel: moon.label || '달빛 흐름'
    },
    summaryCards: [
      { label: _sajuQuantumText("sq_7450_prop_label"), value: mansionLabel, tone: '타고난 별', note: syComposeFromTokens(coreTokens, '당신의 중심성이 오늘의 방향을 정합니다.') },
      { label: _sajuQuantumText("sq_7451_prop_label"), value: syFirstToken(coreTokens, '고요한 집중형'), tone: syScoreBand(daily.overall), note: syComposeFromTokens(hiddenTokens, '내면의 리듬을 지키면 안정이 커집니다.') },
      { label: _sajuQuantumText("sq_7452_prop_label"), value: relationDirection, tone: syScoreBand(daily.relations), note: syComposeFromTokens(karmaTokens, '가까운 관계에서 따뜻한 말 한마디가 큰 힘이 됩니다.') },
      { label: _sajuQuantumText("sq_7453_prop_label"), value: recoveryKeyword, tone: syScoreBand(daily.love), note: syComposeFromTokens(recoveryTokens, '무리하지 않는 회복 루틴이 감정 균형을 지켜줍니다.') }
    ],
    moonProfile: {
      firstImpression: syComposeFromTokens(coreTokens, '첫인상에서 고요한 신뢰를 남기는 별입니다.'),
      innerRhythm: syComposeFromTokens(hiddenTokens, '혼자 정리하는 시간이 길수록 중심이 단단해집니다.'),
      emotionalPattern: syComposeFromTokens(emotionTokens, '감정 파고를 빠르게 읽고 균형을 회복하는 타입입니다.'),
      stressPattern: syComposeFromTokens(syCanonicalTokenize((traits.karma || '') + '. ' + (traits.hidden || ''), '관계 피로가 쌓이면 말수를 줄이는 경향이 있습니다.'), '관계 피로가 쌓이면 말수를 줄이는 경향이 있습니다.'),
      recoveryPattern: syComposeFromTokens(recoveryTokens, '짧은 휴식과 호흡 루틴이 회복 속도를 높입니다.')
    },
    relationshipTabs: [
      { key: 'love', label: _sajuQuantumText("sq_7463_prop_label"), title: '사랑의 온도', body: loveTabBody },
      { key: 'friend', label: _sajuQuantumText("sq_7464_prop_label"), title: '우정의 결', body: friendTabBody },
      { key: 'work', label: _sajuQuantumText("sq_7465_prop_label"), title: '함께 일할 때', body: workTabBody },
      { key: 'family', label: _sajuQuantumText("sq_7466_prop_label"), title: '가까운 관계', body: familyTabBody },
      { key: 'care', label: _sajuQuantumText("sq_7467_prop_label"), title: '지켜볼 포인트', body: careTabBody }
    ],
    relationMiniMap: [
      {
        label: _sajuQuantumText("sq_7471_prop_label"),
        han: '榮親',
        essence: '서로를 살리고 돌보는 번영과 보호의 인연입니다.',
        light: '응원, 신뢰, 생활의 안정감이 자연스럽게 자라납니다.',
        shadow: '편안함이 의존으로 흐르면 경계가 흐려질 수 있습니다.',
        guide: '고마움과 개인 시간을 함께 지키면 오래 빛납니다.',
        tone: 'bloom'
      },
      {
        label: _sajuQuantumText("sq_7480_prop_label"),
        han: '業胎',
        essence: '전생의 숙제처럼 반복되는 배움과 성장의 인연입니다.',
        light: '같은 과제를 마주하며 서로의 성숙을 빠르게 깨웁니다.',
        shadow: '책임을 떠넘기거나 구원하려 들면 피로가 누적됩니다.',
        guide: '역할, 약속, 부담의 선을 분명히 나누어야 합니다.',
        tone: 'karma'
      },
      {
        label: _sajuQuantumText("sq_7489_prop_label"),
        han: '友衰',
        essence: '친구 같은 위로와 섬세한 정서 교감의 인연입니다.',
        light: '취향, 대화, 쉼의 리듬이 맞아 마음을 부드럽게 풉니다.',
        shadow: '불편한 말을 미루면 서운함이 조용히 깊어집니다.',
        guide: '다정함 안에서도 현실 문제를 제때 말해야 합니다.',
        tone: 'moon'
      },
      {
        label: _sajuQuantumText("sq_7498_prop_label"),
        han: '成危',
        essence: '서로 다른 관점이 현실의 성취를 자극하는 인연입니다.',
        light: '일, 목표, 생활 기반을 함께 다룰 때 서로의 부족한 면을 보완합니다.',
        shadow: '속도와 판단 기준이 어긋나면 가까이 있어도 거리감이 생길 수 있습니다.',
        guide: '역할, 기대치, 결정권을 먼저 나누면 긴장이 성장 동력으로 바뀝니다.',
        tone: 'axis'
      },
      {
        label: _sajuQuantumText("sq_7507_prop_label"),
        han: '安壞',
        essence: '강한 끌림과 흔들림이 동시에 오는 각성의 인연입니다.',
        light: '오래 묵은 패턴을 깨고 변화를 시작하게 만듭니다.',
        shadow: '자극이 집착과 상처로 번지면 서로를 소모시킵니다.',
        guide: '감정 냉각 시간과 경계선을 관계의 의식처럼 정하세요.',
        tone: 'storm'
      },
      {
        label: '명',
        han: '命',
        essence: '서로를 거울처럼 비추는 동질감의 인연입니다.',
        light: '말하지 않아도 비슷한 결을 알아보고 빠르게 편안해집니다.',
        shadow: '같은 약점이 반복되면 관계가 제자리에서 맴돌 수 있습니다.',
        guide: '닮은 점을 확인한 뒤 서로 다른 역할을 의식적으로 맡으세요.',
        tone: 'mirror'
      }
    ],
    loveProfile: {
      attractionType: attractionTypeText,
      loveStyle: loveStyleText,
      deepeningMoment: deepeningMomentText,
      anxietyPoint: anxietyPointText,
      longTermAdvice: longTermAdviceText,
      avoidPattern: avoidPatternText
    },
    workMoney: {
      moneyFlow: syReadingOverrideByIndex(mansionIndex, 'moneyFlow') || syComposeFromTokens(wealthTokens, '수입과 지출의 기준을 가볍게 나누면 돈의 흐름이 안정됩니다.'),
      spendingHabit: spendingHabitText,
      savingPoint: syReadingOverrideByIndex(mansionIndex, 'savingPoint') || syComposeFromTokens(syCanonicalTokenize((ritual.action || '') + '. ' + (traits.work || ''), '고정 지출을 먼저 정리하면 저축 속도가 빨라집니다.'), '고정 지출을 먼저 정리하면 저축 속도가 빨라집니다.'),
      workStrength: syReadingOverrideByIndex(mansionIndex, 'workStrength') || syComposeFromTokens(workTokens, '역할을 분명히 하면 성과가 안정됩니다.'),
      workCaution: workCautionText,
      collaborationTip: collaborationTipText,
      talent: Number(sData.talent) || 80,
      talentLabel: syReferenceBand(Number(sData.talent) || 80)
    },
    emotionRhythm: {
      morning: '아침 참고 구간 · ' + syReferenceBand(morningScore) + ' · ' + (morningScore >= 75 ? '차분한 집중이 잘 붙는 시간입니다.' : '시동이 느릴 수 있어 루틴 워밍업이 필요합니다.') + ' 추천: 가장 작은 할 일 1개를 먼저 완료하세요.',
      day: '낮 참고 구간 · ' + syReferenceBand(dayScore) + ' · ' + (dayScore >= 75 ? '실행력과 판단력이 안정되는 구간입니다.' : '결정 피로가 올라오기 쉬운 시간대입니다.') + ' 추천: 우선순위 1개만 고정하고 나머지는 보류하세요.',
      night: '밤 참고 구간 · ' + syReferenceBand(nightScore) + ' · ' + (nightScore >= 75 ? '감정 공감과 대화가 부드럽게 열립니다.' : '감정 파고가 커질 수 있어 정리 대화가 유리합니다.') + ' 추천: 결론보다 의도 확인 질문을 먼저 하세요.',
      trigger: syComposeFromTokens(syCanonicalTokenize((traits.hidden || '') + '. ' + (traits.karma || ''), '감정 방아쇠를 미리 알면 소모를 줄일 수 있습니다.'), '감정 방아쇠를 미리 알면 소모를 줄일 수 있습니다.'),
      balance: syComposeFromTokens(recoveryTokens, '짧은 호흡 루틴으로 균형 회복')
    },
    dailyPrescription: {
      moon: moon,
      insight: daily.insight || '',
      ritual: ritual,
      overall: daily.overall,
      relations: daily.relations,
      love: daily.love,
      wealth: daily.wealth,
      message: syComposeFromTokens(syCanonicalTokenize(daily.insight, '오늘은 감정의 속도를 한 템포 낮추면 흐름이 좋아집니다.'), '오늘은 감정의 속도를 한 템포 낮추면 흐름이 좋아집니다.'),
      action: ritual.action || '심호흡 10번',
      avoid: syFirstToken(syCanonicalTokenize(traits.hidden, '서둘러 결론 내리기'), '서둘러 결론 내리기'),
      luckyColor: ritual.color || '#c0a060',
      luckyPlace: syGuardianPlaceByIndex(sData.mansionIdx)
    },
    guardian: {
      name: guardianName,
      emoji: guardianEmoji,
      color: guardianColor,
      place: guardianPlace,
      action: ritual.action || '심호흡 10번',
      mantra: traits.mantra || '오늘의 한 걸음이 내일의 별빛이 됩니다.'
    }
  };

  return syDedupeReadingTexts(reading, {
    traits: traits,
    loveTokens: loveTokens,
    karmaTokens: karmaTokens,
    workTokens: workTokens,
    wealthTokens: wealthTokens,
    careerTokens: careerTokens
  });
}

function syBuildSukuyoNatureDeepDiveHtml(sData, reading, dailyFlow, lunarObj) {
  if (!sData || !reading) return '';
  var tr = sData.traits || {};
  var legacyDaily = dailyFlow || (lunarObj ? getDailyKarmicGuidance(lunarObj, sData.mansion) : null);
  var renderLegacyGauge = function(lbl, val, color) {
    return '<div class="daily-flow-row">'
      + '<div class="daily-flow-label">' + syCanonicalEsc(lbl) + '</div>'
      + '<div class="daily-flow-gauge"><div class="sy-gauge-bg"><div class="sy-gauge-fill" style="width:0%; background:' + color + ';" data-target="' + syCanonicalEsc(val) + '%"></div></div></div>'
      + '<div class="daily-flow-val">' + syCanonicalEsc(syReferenceBand(val)) + '</div>'
      + '</div>';
  };

  var legacyDailyCard = '';
  var coreText = String(tr.core || tr.desc || '').trim();
  var hiddenText = String(tr.hidden || tr.desc || '').trim();
  var karmaText = String(tr.karma || tr.love || '').trim();
  var mantraText = String(tr.mantra || '"나답게 사는 것이 가장 위대한 일이다."').trim();
  var workText = String(tr.work || '').trim();
  var loveText = String(tr.love || '').trim();
  var wealthText = String(tr.wealth || '').trim();
  var healthText = String(tr.health || '').trim();
  var timingText = String(tr.timing || '').trim();
  var socialText = String(tr.social || '').trim();
  var adviceText = String(tr.advice || '').trim();
  var mansionName = String(sData.mansion || '본명숙').trim();
  var moonToneLabel = legacyDaily && legacyDaily.moon && legacyDaily.moon.label ? String(legacyDaily.moon.label) : '달빛 리듬';
  var moonToneDesc = legacyDaily && legacyDaily.moon && legacyDaily.moon.desc ? String(legacyDaily.moon.desc) : '지금의 정서는 고요하게 수렴되는 위상입니다.';
  var coreTokens = syCanonicalTokenize(coreText, '당신의 중심 축은 안정적으로 빛납니다.');
  var hiddenTokens = syCanonicalTokenize(hiddenText, '감정의 파도는 조용한 시간에 정돈됩니다.');
  var karmaTokens = syCanonicalTokenize(karmaText, '관계는 작은 배려에서 깊어집니다.');
  var workTokens = syCanonicalTokenize(workText, '역할을 분명히 할수록 성과가 안정됩니다.');
  var loveTokens = syCanonicalTokenize(loveText, '감정의 속도를 맞추는 대화가 중요합니다.');
  var wealthTokens = syCanonicalTokenize(wealthText, '지출 기준을 세우면 돈의 흐름이 고르게 유지됩니다.');
  var healthTokens = syCanonicalTokenize(healthText, '기운의 리듬을 관찰하면 컨디션이 안정됩니다.');
  var timingTokens = syCanonicalTokenize(timingText, '때를 기다려 힘을 모으면 흐름이 열립니다.');
  var socialTokens = syCanonicalTokenize(socialText, '진심과 경계를 함께 지킬 때 신뢰가 쌓입니다.');
  var adviceTokens = syCanonicalTokenize(adviceText, '오늘 할 수 있는 한 가지에 집중하면 흐름이 정돈됩니다.');
  var decisionActionAdvice = syComposeFromTokens(
    syCanonicalTokenize(
      (workText || '') + '. ' + (hiddenText || '') + '. ' + (legacyDaily && legacyDaily.insight ? legacyDaily.insight : ''),
      '중요한 의사결정은 감정이 가라앉은 뒤 핵심 기준 1가지를 확인하고 실행하세요.'
    ),
    '중요한 의사결정은 감정이 가라앉은 뒤 핵심 기준 1가지를 확인하고 실행하세요.'
  );
  var renderNarrCard = function(title, body) {
    return '<article class="sy-narr-card rounded-xl border border-slate-300/20 bg-slate-900/45 p-3 backdrop-blur-sm">'
      + '<h5 class="text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-200">' + syCanonicalEsc(title) + '</h5>'
      + '<p class="text-sm leading-7 text-slate-100/90">' + syCanonicalEsc(body) + '</p>'
      + '</article>';
  };

  var nexusHtml = `
        <div class="sy-grid">
          <div class="sy-card" style="grid-column: 1 / -1; border-left-color: #a78bfa;">
            <div class="sy-nexus-shell rounded-2xl border border-indigo-200/20 bg-gradient-to-br from-slate-950/90 via-indigo-950/65 to-slate-900/90 p-4 shadow-2xl backdrop-blur-md">
              <div class="sy-lunar-head">
                <span class="sy-lunar-seal" aria-hidden="true"></span>
                <h4 style="margin:0; color:#d8d4fe; font-size:1.05rem;">본성 심화 해석</h4>
              </div>
              <p style="margin:0 0 10px 0; font-size:0.86rem; color:#cbd5e1; line-height:1.8;">${syCanonicalEsc(mansionName)}의 핵심 좌표와 ${syCanonicalEsc(moonToneLabel)} 리듬을 함께 반영해, 성향·관계·실행 루틴을 문맥형으로 더 길고 세밀하게 읽어드립니다.</p>
              <div class="sy-moon-chip-wrap">
                <span class="sy-moon-chip rounded-full border border-slate-300/25 bg-slate-900/60 px-3 py-1 text-[11px] tracking-[0.04em] text-slate-200"><span class="sy-moon-chip-dot"></span>본명숙 ${syCanonicalEsc(mansionName)}</span>
                <span class="sy-moon-chip rounded-full border border-indigo-300/30 bg-indigo-900/30 px-3 py-1 text-[11px] tracking-[0.04em] text-indigo-100"><span class="sy-moon-chip-dot"></span>${syCanonicalEsc(moonToneLabel)}</span>
                <span class="sy-moon-chip rounded-full border border-cyan-300/30 bg-cyan-900/20 px-3 py-1 text-[11px] tracking-[0.04em] text-cyan-100"><span class="sy-moon-chip-dot"></span>달 결 ${syCanonicalEsc(moonToneDesc)}</span>
              </div>
            <div class="sy-natal-tab-bar" role="tablist" aria-label="' + _sajuQuantumText("sq_8402_attr_aria_label") + '">
              <button class="sy-ntab active" id="syNTabCore" role="tab" aria-selected="true" aria-controls="sy-panel-core" data-ntab="core"><span class="sy-ntab-glyph"></span><span>천성의 빛</span></button>
              <button class="sy-ntab" id="syNTabHidden" role="tab" aria-selected="false" aria-controls="sy-panel-hidden" data-ntab="hidden"><span class="sy-ntab-glyph sy-ntab-glyph--hidden"></span><span>달의 이면</span></button>
              <button class="sy-ntab" id="syNTabKarma" role="tab" aria-selected="false" aria-controls="sy-panel-karma" data-ntab="karma"><span class="sy-ntab-glyph sy-ntab-glyph--karma"></span><span>인연의 궤도</span></button>
              <button class="sy-ntab" id="syNTabMantra" role="tab" aria-selected="false" aria-controls="sy-panel-mantra" data-ntab="mantra"><span class="sy-ntab-glyph sy-ntab-glyph--mantra"></span><span>수호의 문장</span></button>
              <button class="sy-ntab" id="syNTabDaily" role="tab" aria-selected="false" aria-controls="sy-panel-daily" data-ntab="daily"><span class="sy-ntab-glyph sy-ntab-glyph--daily"></span><span>일상 적용</span></button>
              <button class="sy-ntab" id="syNTabGrowth" role="tab" aria-selected="false" aria-controls="sy-panel-growth" data-ntab="growth"><span class="sy-ntab-glyph sy-ntab-glyph--growth"></span><span>기운·성장</span></button>
            </div>
            <div class="sy-natal-panel active" id="sy-panel-core" role="tabpanel" aria-labelledby="syNTabCore">
              <p class="sy-natal-text">${syCanonicalEsc(coreText)}</p>
              <div class="sy-narr-grid">
                ${renderNarrCard('핵심 파동', coreTokens[0] || coreText)}
                ${renderNarrCard('현실 발현', workTokens[0] || workText || coreTokens[1] || coreText)}
                ${renderNarrCard('돈 습관', wealthTokens[0] || wealthText || coreTokens[2] || coreText)}
              </div>
              <div class="sy-narr-tail rounded-xl border border-indigo-200/30 bg-slate-900/60 p-3 text-sm leading-7 text-slate-100/90">${syCanonicalEsc(mansionName + '(의 핵심 기운):\n' + syComposeFromTokens(coreTokens, coreText) + '\n\n이 기질이 현실에서 작동하는 방식:\n• 일과 사회생활: ' + syFirstToken(workTokens, workText || '안정적인 실행력') + '을(를) 통해 신뢰를 만듭니다.\n• 재물과 돈의 흐름: ' + syFirstToken(wealthTokens, wealthText || '지속 가능한 축적 감각') + '으로 연결됩니다.\n\n성장의 길:\n감정의 속도를 조절하면서 작은 실행을 누적할 때, 안정적인 성과와 신뢰의 자산이 쌓입니다.')}</div>
            </div>
            <div class="sy-natal-panel" id="sy-panel-hidden" role="tabpanel" aria-labelledby="syNTabHidden">
              <p class="sy-natal-text">${syCanonicalEsc(hiddenText)}</p>
              <div class="sy-narr-grid">
                ${renderNarrCard('감정 저수지', hiddenTokens[0] || hiddenText)}
                ${renderNarrCard('그림자 신호', hiddenTokens[1] || hiddenText)}
                ${renderNarrCard('회복 단서', hiddenTokens[2] || moonToneDesc)}
              </div>
              <div class="sy-narr-tail rounded-xl border border-cyan-200/30 bg-slate-900/60 p-3 text-sm leading-7 text-slate-100/90">${syCanonicalEsc('달의 이면에서는 ' + syComposeFromTokens(hiddenTokens, hiddenText) + '이 반복됩니다. 특히 ' + syFirstToken(loveTokens, loveText || '관계 장면') + '에서 내면 반응이 커질 수 있으니, 즉시 결론보다 감정 기록 3줄과 휴식 10분을 먼저 적용하면 불필요한 소모를 크게 줄일 수 있습니다.')}</div>
            </div>
            <div class="sy-natal-panel" id="sy-panel-karma" role="tabpanel" aria-labelledby="syNTabKarma">
              <p class="sy-natal-text">${syCanonicalEsc(karmaText)}</p>
              <div class="sy-narr-grid">
                ${renderNarrCard('끌림 축', karmaTokens[0] || karmaText)}
                ${renderNarrCard('관계 확장', karmaTokens[1] || loveText || karmaText)}
                ${renderNarrCard('경계 포인트', karmaTokens[2] || hiddenTokens[0] || karmaText)}
              </div>
              <div class="sy-narr-tail rounded-xl border border-pink-200/30 bg-slate-900/60 p-3 text-sm leading-7 text-slate-100/90">${syCanonicalEsc('인연의 궤도는 ' + syComposeFromTokens(karmaTokens, karmaText) + '을 중심으로 회전합니다. 여기에 ' + syFirstToken(loveTokens, loveText || '관계 리듬') + '를 더하면 매력은 커지지만, 경계선이 흐려질 수 있습니다. 한 달 기준으로 대화의 강약을 조절하면 관계의 안정성과 깊이가 동시에 올라갑니다.')}</div>
            </div>
            <div class="sy-natal-panel" id="sy-panel-mantra" role="tabpanel" aria-labelledby="syNTabMantra">
              <p class="sy-mantra">${syCanonicalEsc(mantraText)}</p>
              <div class="sy-mantra-stack">
                ${renderNarrCard('문장 해석', syFirstToken(syCanonicalTokenize(mantraText, mantraText), mantraText))}
                ${renderNarrCard('실천 번역', '오늘은 마음이 흔들릴 때 이 문장을 기준점으로 삼아 한 가지 행동만 끝까지 완수해 보세요.')}
                ${renderNarrCard('관계 적용', '대화 전에 내 의도를 한 줄로 정리하면 말의 온도와 정확도가 동시에 올라갑니다.')}
                ${renderNarrCard('현실 적용', decisionActionAdvice)}
              </div>
            </div>
            <div class="sy-natal-panel" id="sy-panel-growth" role="tabpanel" aria-labelledby="syNTabGrowth">
              <p class="sy-natal-text">${syCanonicalEsc(healthText || '기운의 리듬을 관찰하며 규칙적인 수면과 휴식을 지키면 컨디션이 안정됩니다.')}</p>
              <div class="sy-narr-grid">
                ${renderNarrCard('기운 리듬', healthTokens[0] || healthText)}
                ${renderNarrCard('회복 습관', healthTokens[2] || healthTokens[1] || healthText)}
                ${renderNarrCard('시기 감각', timingTokens[0] || timingText)}
              </div>
              <p class="sy-natal-text" style="margin-top:12px;">${syCanonicalEsc(timingText || '흐름을 거스르기보다 때를 기다려 힘을 모으면 운이 열립니다.')}</p>
              <div class="sy-narr-grid">
                ${renderNarrCard('사회적 역할', socialTokens[0] || socialText)}
                ${renderNarrCard('관계 함정', socialTokens[1] || socialText)}
                ${renderNarrCard('성장 한 걸음', adviceTokens[0] || adviceText)}
              </div>
              <div class="sy-narr-tail rounded-xl border border-amber-200/30 bg-slate-900/60 p-3 text-sm leading-7 text-slate-100/90">${syCanonicalEsc(mansionName + '의 성장 방향을 정리하면 이렇습니다. ' + (adviceText || '오늘 할 수 있는 한 가지에 집중하면 흐름이 정돈됩니다.') + ' 기운이 흔들릴 때는 건강 리듬을, 흐름이 막힐 때는 시기 감각을 먼저 점검하면 타고난 강점이 오래 유지됩니다.')}</div>
            </div>
            <div class="sy-natal-panel" id="sy-panel-daily" role="tabpanel" aria-labelledby="syNTabDaily">
              <div class="sy-daily-grid">
                <div style="padding:9px 12px; background:rgba(0,0,0,0.18); border-radius:7px; border-left:2px solid rgba(167,139,250,0.4);"><span style="font-size:0.72rem; color:#9ca3af; letter-spacing:0.05em;">일 · 사회성</span><p style="margin:5px 0 0; font-size:0.88rem; line-height:1.7; color:#d8d0ee;">${syCanonicalEsc(workText)}</p></div>
                <div style="padding:9px 12px; background:rgba(0,0,0,0.18); border-radius:7px; border-left:2px solid rgba(251,139,160,0.4);"><span style="font-size:0.72rem; color:#9ca3af; letter-spacing:0.05em;">연애 · 관계</span><p style="margin:5px 0 0; font-size:0.88rem; line-height:1.7; color:#d8d0ee;">${syCanonicalEsc(loveText)}</p></div>
                <div style="padding:9px 12px; background:rgba(0,0,0,0.18); border-radius:7px; border-left:2px solid rgba(251,191,36,0.4);"><span style="font-size:0.72rem; color:#9ca3af; letter-spacing:0.05em;">재물 · 현실</span><p style="margin:5px 0 0; font-size:0.88rem; line-height:1.7; color:#d8d0ee;">${syCanonicalEsc(wealthText)}</p></div>
                <div style="padding:9px 12px; background:rgba(0,0,0,0.18); border-radius:7px; border-left:2px solid rgba(125,211,252,0.4);"><span style="font-size:0.72rem; color:#9ca3af; letter-spacing:0.05em;">달빛 루틴</span><p style="margin:5px 0 0; font-size:0.88rem; line-height:1.7; color:#d8d0ee;">${syCanonicalEsc('오늘은 ' + moonToneLabel + ' 리듬입니다. ' + moonToneDesc)}</p></div>
                <div style="padding:9px 12px; background:rgba(0,0,0,0.18); border-radius:7px; border-left:2px solid rgba(110,231,183,0.4);"><span style="font-size:0.72rem; color:#9ca3af; letter-spacing:0.05em;">실행 체크</span><p style="margin:5px 0 0; font-size:0.88rem; line-height:1.7; color:#d8d0ee;">${syCanonicalEsc('하루의 우선순위 1가지를 먼저 끝내고, 관계 대화는 밤 시간대에 진행하면 리듬이 안정됩니다.')}</p></div>
              </div>
              <div class="sy-narr-tail rounded-xl border border-emerald-200/25 bg-slate-900/60 p-3 text-sm leading-7 text-slate-100/90">${syCanonicalEsc('일상 적용의 핵심은 과한 결심보다 리듬 유지입니다. 오늘은 "짧은 실행 → 감정 정리 → 관계 대화" 순서를 지키면 에너지 누수를 줄이면서도 만족도가 오래 지속됩니다.')}</div>
              </div>
            </div>
            </div>
          </div>
          ${legacyDailyCard}
        </div>`;

  var moonProfileHtml = `<div class="sy-card" style="border-left-color:#a5b4fc;">
            <h4 style="margin:0 0 10px 0; color:#c7d2fe;">달빛 성향 카드</h4>
            <div class="sy-profile-grid">
              <article class="sy-profile-box"><h5>첫인상</h5><p>${syCanonicalEsc(reading.moonProfile.firstImpression)}</p></article>
              <article class="sy-profile-box"><h5>내면 리듬</h5><p>${syCanonicalEsc(reading.moonProfile.innerRhythm)}</p></article>
              <article class="sy-profile-box"><h5>감정 패턴</h5><p>${syCanonicalEsc(reading.moonProfile.emotionalPattern)}</p></article>
              <article class="sy-profile-box"><h5>스트레스 패턴</h5><p>${syCanonicalEsc(reading.moonProfile.stressPattern)}</p></article>
              <article class="sy-profile-box"><h5>회복 패턴</h5><p>${syCanonicalEsc(reading.moonProfile.recoveryPattern)}</p></article>
            </div>
          </div>`;

  var relationshipHtml = `<div class="sy-card" style="border-left-color:#fb7185;">
            <h4 style="margin:0 0 8px 0; color:#fda4af;">관계 해석</h4>
            <div class="sy-rel-tabs">
              ${reading.relationshipTabs.map(function(tab, idx) {
                return '<button type="button" class="sy-rel-tab' + (idx === 0 ? ' active' : '') + '" data-rel-tab="' + syCanonicalEsc(tab.key) + '">' + syCanonicalEsc(tab.label) + '</button>';
              }).join('')}
            </div>
            ${reading.relationshipTabs.map(function(tab, idx) {
              return '<div class="sy-rel-panel' + (idx === 0 ? ' active' : '') + '" data-rel-panel="' + syCanonicalEsc(tab.key) + '">'
                + '<h5>' + syCanonicalEsc(tab.title) + '</h5>'
                + '<p>' + syCanonicalEsc(tab.body) + '</p>'
                + '</div>';
            }).join('')}
            ${syRenderRelationMiniMapCard(reading, { inline: true })}
          </div>`;

  var loveProfileHtml = `<div class="sy-card" style="border-left-color:#f472b6;">
            <h4 style="margin:0 0 8px 0; color:#fbcfe8;">연애 성향 프로필</h4>
            <div class="sy-dual-grid">
              <article class="sy-dual-card"><h5>끌림 유형</h5><p>${syCanonicalEsc(reading.loveProfile.attractionType)}</p></article>
              <article class="sy-dual-card"><h5>사랑 방식</h5><p>${syCanonicalEsc(reading.loveProfile.loveStyle)}</p></article>
              <article class="sy-dual-card"><h5>관계가 깊어지는 순간</h5><p>${syCanonicalEsc(reading.loveProfile.deepeningMoment)}</p></article>
              <article class="sy-dual-card"><h5>불안 포인트</h5><p>${syCanonicalEsc(reading.loveProfile.anxietyPoint)}</p></article>
            </div>
            <div class="sy-dual-card" style="margin-top:8px;"><h5>장기 조언</h5><p>${syCanonicalEsc(reading.loveProfile.longTermAdvice)}</p></div>
            <div class="sy-dual-card" style="margin-top:8px;"><h5>피하면 좋은 패턴</h5><p>${syCanonicalEsc(reading.loveProfile.avoidPattern)}</p></div>
          </div>`;

  var workMoneyHtml = `<div class="sy-card" style="border-left-color:#facc15;">
            <h4 style="margin:0 0 8px 0; color:#fde68a;">돈 습관 · 일 성향</h4>
            <div class="sy-dual-grid">
              <article class="sy-dual-card"><h5>돈을 다루는 방식</h5><p>${syCanonicalEsc(reading.workMoney.moneyFlow)}</p></article>
              <article class="sy-dual-card"><h5>소비 습관</h5><p>${syCanonicalEsc(reading.workMoney.spendingHabit)}</p></article>
              <article class="sy-dual-card"><h5>저축 포인트</h5><p>${syCanonicalEsc(reading.workMoney.savingPoint)}</p></article>
              <article class="sy-dual-card"><h5>일 강점</h5><p>${syCanonicalEsc(reading.workMoney.workStrength)}</p></article>
              <article class="sy-dual-card"><h5>일 주의점</h5><p>${syCanonicalEsc(reading.workMoney.workCaution)}</p></article>
              <article class="sy-dual-card"><h5>협업 키워드</h5><p>${syCanonicalEsc(reading.workMoney.collaborationTip)}</p></article>
            </div>
            <div class="sy-talent-bar" style="margin-top:11px;">
              <span style="font-size:0.78rem; color:#fef3c7; white-space:nowrap;">성향 활용 구간</span>
              <div class="sy-talent-track"><div class="sy-talent-fill" style="width:0%" data-target="${reading.workMoney.talent}%"></div></div>
              <strong style="color:#fde047; font-size:0.9rem; white-space:nowrap;">${syCanonicalEsc(reading.workMoney.talentLabel || syReferenceBand(reading.workMoney.talent))}</strong>
            </div>
          </div>`;

  var emotionRhythmHtml = `<div class="sy-card" style="border-left-color:#38bdf8;">
            <h4 style="margin:0 0 8px 0; color:#7dd3fc;">나의 감정 리듬</h4>
            <div class="sy-dual-grid">
              <article class="sy-dual-card"><h5>아침</h5><p>${syCanonicalEsc(reading.emotionRhythm.morning)}</p></article>
              <article class="sy-dual-card"><h5>낮</h5><p>${syCanonicalEsc(reading.emotionRhythm.day)}</p></article>
              <article class="sy-dual-card"><h5>밤</h5><p>${syCanonicalEsc(reading.emotionRhythm.night)}</p></article>
              <article class="sy-dual-card"><h5>감정 방아쇠</h5><p>${syCanonicalEsc(reading.emotionRhythm.trigger)}</p></article>
            </div>
            <div class="sy-dual-card" style="margin-top:8px;"><h5>균형 회복 포인트</h5><p>${syCanonicalEsc(reading.emotionRhythm.balance)}</p></div>
          </div>`;

  return nexusHtml + moonProfileHtml + relationshipHtml + loveProfileHtml + workMoneyHtml + emotionRhythmHtml;
}

// 해금 화면(renderSukuyo → syBindSukuyoNatureDeepDiveUnlock)과 같은 순서로 그린다. lunarObj 는 report.js 가 서버 출생 정보로
// 계산한 달 황경({moonEclipticLongitude})만 담는다 — 본명숙은 이 값으로 calcSukuyoData 가 정한다.
function renderSukuyoNatureDeepDivePaid(lunarObj) {
  var sData = calcSukuyoData(lunarObj);
  if (!sData) return null;
  var record = window.SukuyoMansionReadings && window.SukuyoMansionReadings[sData.mansionIdx];
  sData.traits = Object.assign({}, sData.traits, record ? SY_NATURE_PAID_TRAITS[record.key] : null);
  var dailyFlow = getDailyKarmicGuidance(lunarObj, sData.mansion);
  var canonicalData = syBuildLocalCanonicalData(lunarObj, sData, dailyFlow, null);
  var guardian;
  try { guardian = syResolveMansionGuardian(sData.mansion, sData.mansionIdx); }
  catch (_e) { guardian = { name: '달빛 지표', emoji: '✨' }; }
  var reading = syBuildBasicReading(canonicalData, sData, dailyFlow, guardian);
  return { html: syBuildSukuyoNatureDeepDiveHtml(sData, reading, dailyFlow, lunarObj), mansion: sData.mansion, mansionIdx: sData.mansionIdx };
}
