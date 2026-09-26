/* Display-only saju reading. No calculation, access checks, storage of results, or requests. */
(function (root) {
  'use strict';
  var elements = ['wood', 'fire', 'earth', 'metal', 'water'];
  var gods = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'];
  var copy = {
    ko: {
      yeon: '연이', neo: '네오', garden: '기질을 이해하는 정원', room: '선택을 점검하는 작전실',
      same: '같은 명식, 다른 읽기 방식입니다. 계산값과 무료·유료 범위는 같아요.',
      compareNeo: '연이가 발견한 단서를 네오의 기준으로 살펴보기', compareYeon: '네오가 정리한 기준을 연이의 이야기로 읽기',
      observe: '연이가 발견한 단서', life: '생활에서 만나는 모습', practice: '오늘의 작은 실천', diagnosis: '네오의 진단', basis: '계산 근거', action: '행동 기준',
      element: '오행의 분포', temperament: '타고난 기질', ten: '십성으로 읽는 역할', climate: '조후 · 계절의 감각', strength: '억부 · 힘을 쓰는 방식', flow: '현재 흐름', letter: '마지막으로 건네는 말',
      names: ['목(木)', '화(火)', '토(土)', '금(金)', '수(水)'],
      traits: ['새 일을 시작하고 방향을 넓혀 가는 힘', '생각과 감정을 밖으로 표현하는 힘', '관계와 일을 안정적으로 이어 가는 힘', '기준을 세우고 불필요한 것을 정리하는 힘', '정보를 살피고 상황에 맞춰 움직이는 힘'],
      scenes: ['관심사가 많아 여러 일을 시작할 수 있어요. 끝맺을 자리를 남겨두면 성장의 힘이 더 잘 쓰입니다.', '대화에 생기를 더할 수 있어요. 마음이 앞설 때는 상대가 답할 틈도 함께 남겨보세요.', '익숙한 역할을 지키는 데 마음이 놓일 수 있어요. 다른 사람의 몫까지 떠안고 있는지도 살펴보세요.', '모호한 상황에서 기준을 찾을 수 있어요. 기준이 너무 촘촘해지면 나와 타인의 여유가 줄기도 합니다.', '쉽게 지나치는 변화를 알아차릴 수 있어요. 생각이 길어질 때는 작은 실행으로 확인해 보세요.'],
      actions: ['새 일을 더하기 전에 진행 중인 일 하나를 마무리해 보세요.', '중요한 말을 전한 뒤에는 상대의 반응을 기다려 보세요.', '이번 주 맡은 일에서 내가 책임질 범위를 한 줄로 적어 보세요.', '꼭 지킬 기준 하나와 유연하게 바꿀 기준 하나를 나눠 보세요.', '더 알아볼 것과 지금 시험해 볼 것을 하나씩 정해 보세요.'],
      rules: ['목표와 마감이 정해졌을 때 추진하세요. 시작만 늘어난다면 새 과제부터 줄이세요.', '전달할 내용과 상대의 여유가 맞을 때 표현하세요. 감정이 앞서면 답을 재촉하지 마세요.', '책임과 자원이 맞을 때 맡으세요. 내 몫이 계속 늘어난다면 범위를 다시 합의하세요.', '기준이 목적에 도움이 될 때 적용하세요. 완벽함 때문에 멈춘다면 최소 조건부터 정하세요.', '확인할 질문이 분명할 때 조사하세요. 정보만 쌓인다면 작은 시험의 기한을 정하세요.'],
      godNames: ['비견 · 자기 기준', '겁재 · 경쟁과 협력', '식신 · 꾸준한 표현', '상관 · 질문과 개선', '편재 · 기회와 자원', '정재 · 관리와 축적', '편관 · 압박과 대응', '정관 · 책임과 질서', '편인 · 다른 관점', '정인 · 학습과 지지'],
      godTraits: ["자율적으로 방향을 정하려는 경향", "협력과 경쟁에서 힘을 얻는 경향", "반복하며 표현을 다듬는 경향", "익숙한 규칙을 검토하는 경향", "여러 기회를 연결하려는 경향", "약속과 자원을 꾸준히 관리하는 경향", "부담이 있는 과제에 집중하는 경향", "역할과 기준을 중시하는 경향", "낯선 관점을 깊이 살피는 경향", "배움과 지원을 통해 준비하는 경향"],
      godLife: ['스스로 결정할 때 편안할 수 있어요. 다른 의견도 한 번 들어보세요.', '다른 사람과 나란히 달릴 때 힘이 날 수 있어요. 비교가 소모로 이어지는지도 살펴보세요.', '익숙한 일을 꾸준히 표현하고 다듬는 데 강점이 있을 수 있어요.', '당연한 규칙에도 질문을 던질 수 있어요. 바꾸려는 이유를 먼저 설명해 보세요.', '여러 기회를 연결하는 데 관심이 갈 수 있어요. 감당할 수 있는 범위를 함께 살펴보세요.', '작은 수입과 약속을 지키며 안정감을 얻을 수 있어요.', '어려운 과제에서 집중력이 살아날 수 있어요. 회복할 시간도 일정에 넣어보세요.', '역할과 기준이 분명할 때 편안할 수 있어요. 기준이 바뀌는 상황도 연습해 보세요.', '익숙하지 않은 관점을 깊이 살필 수 있어요. 생각을 현실에서 확인할 기회를 만들어 보세요.', '배우거나 도움을 주고받으며 힘을 얻을 수 있어요. 배운 것을 작게 써보세요.'],
      godRules: ['내 결정과 공동 결정을 구분하고, 협의가 필요한 일에는 의견을 확인하세요.', '경쟁 전에 비용과 역할을 합의하세요. 비교가 목표를 바꾸면 잠시 멈추세요.', '반복할 수 있는 분량으로 시작하세요. 완성된 결과를 기준으로 다음 단계를 정하세요.', '문제를 지적할 때 대안을 함께 제시하세요. 상대를 평가하는 말은 빼세요.', '기회마다 필요한 시간과 손실 한도를 적으세요. 범위를 넘으면 보류하세요.', '수입·지출과 약속을 기록하세요. 안정 때문에 필요한 변화까지 미루지는 마세요.', '압박을 감당할 자원부터 확인하세요. 수면과 회복이 무너지면 일을 나누세요.', '책임 범위를 먼저 확인하세요. 규칙이 목적과 어긋나면 근거를 들고 조정하세요.', '직관은 가설로 두고 실제 사례로 확인하세요. 근거 없이 큰 결정을 내리지 마세요.', '배운 내용 하나를 직접 적용하세요. 도움을 받더라도 최종 선택은 점검하세요.'],
      distribution: '월지 가중치를 포함한 기존 계산 비율입니다. 많고 적음은 우열이나 성공 확률이 아닙니다.',
      dominant: '{element} {value}%가 상대적으로 두드러집니다. {trait}을 살펴볼 단서예요.',
      balanced: '가장 큰 비율이 여러 오행에 걸쳐 있습니다. 하나의 성향으로만 묶기보다 상황에 따라 달라지는 힘을 살펴보세요.',
      dayBasis: '일간 {stem} · 일지 {branch}. 일간은 나를 읽는 기준 글자이며, 여기서는 {element}의 상징을 생활 언어로 풉니다.',
      godBasis: '현재 명식에서 {name}이 {count}곳에 나타납니다. 일간과 다른 글자의 관계를 센 값이며 성격의 확정 진단은 아닙니다.',
      unknown: '출생시간 미상: 정오를 대입한 참고 계산입니다. 시주와 시간에 영향을 받는 오행 비율·강약·시기 해석은 확정할 수 없어요.',
      cold: '차가운 쪽의 조후 신호입니다. 활동을 시작하기 전 몸과 마음이 준비될 시간을 살펴보세요.',
      hot: '따뜻한 쪽의 조후 신호입니다. 속도를 높일 때 회복할 간격도 함께 살펴보세요.',
      neutral: '온도 점수가 가운데에 있습니다. 한 방향으로 보완하기보다 실제 생활 리듬을 관찰해 보세요.',
      climateBasis: '조후 온도 점수 {score} · 습한 신호 {wet} / 건조한 신호 {dry}. 계절과 글자의 상징적 계산이며 건강 진단이 아닙니다.',
      climateAction: '잘 지낸 날의 활동과 휴식 간격을 기록하세요. 상징 점수보다 실제 컨디션을 기준으로 조절하세요.',
      strong: '일간을 지지하는 힘이 비교적 큰 구조입니다. 혼자 끌고 가는 힘과 나누어 맡기는 여유를 함께 살펴보세요.',
      weak: '일간의 힘에 비해 주변 역할의 요구가 큰 구조입니다. 도움과 준비 시간을 확보하는 방식이 단서가 됩니다.',
      jong: '한 방향의 기세를 따르는 종격 가능성이 검토된 구조입니다. 일반 신강·신약 조언을 그대로 적용하지 않습니다.',
      strengthBasis: '기존 억부 점수 {score} · 보완 후보 {support}. 점수는 사람의 능력이나 가치를 매기는 등급이 아닙니다.',
      strengthAction: '역할을 늘리기 전에 시간과 지원을 확인하세요. 선택 후의 집중력·소모·회복을 기록해 기준을 조정하세요.',
      flowBasis: '{label} {stem}{branch} · 기존 평가 점수 {score}. 길흉의 확정 예측이 아닌 흐름을 비교하는 참고값입니다.',
      flowOpen: '기존 평가에서 비교적 수월한 쪽으로 읽히는 흐름입니다. 준비해 온 일을 작은 범위에서 시험해 보세요.',
      flowCare: '기존 평가에서 조율이 필요한 쪽으로 읽히는 흐름입니다. 속도를 낮추고 역할과 일정을 정돈해 보세요.',
      flowRuleOpen: '자원과 계획이 준비됐을 때 작은 실행부터 시작하세요. 점수가 결과를 보장하지는 않습니다.',
      flowRuleCare: '일정을 조정하고 선택지를 남기세요. 점수만으로 관계·직업·투자의 결론을 내리지 마세요.',
      period: '현재 대운', year: '올해 세운', more: '자세히 읽기', sample: '샘플 · 가상 명식의 설명 예시',
      sampleNote: '설명 형식을 보여주는 예시이며 회원님의 결과가 아닙니다.',
      paidDifference: '무료에서는 현재 흐름과 기질을, 아래 정적 풀이에서는 더 넓은 기간과 주제별 해설을 읽습니다. 입력한 명식의 계산값에 연결된 정적 해설입니다.',
      paidDaeun: '10년 단위 흐름, 대운별 근거와 연도별 상세를 비교하고 싶은 분께 맞습니다.',
      paidSummary: '일간·월령·오행·십성을 성격·일·관계 등 여러 주제로 이어 읽고 싶은 분께 맞습니다.',
      recovery: '기존 계정과 프로필로 사주 결과를 다시 열고 해당 풀이의 해금 상태를 확인하세요. 결제 후 열리지 않으면 새로 결제하지 말고 결제 내역과 함께 고객센터에 문의하세요.',
      inputs: '현재 사주에 입력한 생년 정보와 계산값을 사용합니다. 출생시간을 모르면 시간에 의존하는 해석은 참고 범위가 제한됩니다.',
      pricePending: '가격 확인 중', priceUnavailable: '가격은 결제 안내에서 확인해 주세요', summaryTitle: '종합 풀이', paidRead: '풀이 확인하기',
      catTitle: '영냥이 상담', catPurpose: '명식의 흐름을 고양이 상담사와', catGo: '살펴보기', catPrice: '{price}부터',
      endYeon: '오늘 읽은 모든 문장을 나에게 맞추려 애쓰지 않아도 괜찮아요. 실제 내 모습과 맞닿은 단서 하나부터 천천히 살펴보세요.',
      endNeo: '명식은 선택을 대신하지 않습니다. 맞는 근거와 맞지 않는 해석을 구분하고, 오늘 확인할 행동 하나만 정하세요.'
    },
    en: {
      yeon: 'Yeoni', neo: 'Neo', garden: 'A garden for understanding yourself', room: 'A strategy room for reviewing choices', same: 'One chart, two reading styles. Calculations and free/paid access stay the same.', compareNeo: 'Review Yeoni’s clues with Neo', compareYeon: 'Read Neo’s criteria with Yeoni', observe: 'What Yeoni notices', life: 'In everyday life', practice: 'One small practice', diagnosis: 'Neo’s assessment', basis: 'Chart evidence', action: 'Decision criteria', element: 'Five-element balance', temperament: 'Natural temperament', ten: 'Roles in the Ten Gods', climate: 'Seasonal balance', strength: 'How support is distributed', flow: 'Current cycles', letter: 'A final note',
      names: ['Wood', 'Fire', 'Earth', 'Metal', 'Water'], traits: ['starting and developing ideas', 'expressing thoughts and feelings', 'sustaining commitments', 'setting standards and simplifying', 'observing and adapting'],
      scenes: ['You may start several things at once. Leave room to finish them.', 'You may bring energy to conversations. Give others time to respond.', 'Familiar responsibilities may feel reassuring. Check whether you are carrying someone else’s share.', 'Clear standards may help with uncertainty. Too many rules can leave little room to breathe.', 'You may notice subtle changes. When reflection stretches on, try a small experiment.'],
      actions: ['Finish one existing task before adding another.', 'Pause after an important message and listen to the response.', 'Write down the boundary of one responsibility this week.', 'Separate one essential standard from one flexible preference.', 'Choose one thing to research and one thing to test now.'],
      rules: ['Proceed with a clear goal and deadline. Reduce new tasks if unfinished work grows.', 'Speak when the message and the listener’s availability align. Do not press for an immediate answer.', 'Accept a role when resources match its demands. Renegotiate a growing workload.', 'Apply standards that serve the goal. Define a minimum if perfection stalls progress.', 'Research a specific question. Set a small test deadline if information only accumulates.'],
      godNames: ['Peer · autonomy', 'Competitor · cooperation', 'Expression · consistency', 'Challenger · improvement', 'Opportunity · resources', 'Stewardship · accumulation', 'Pressure · response', 'Responsibility · order', 'Insight · perspective', 'Learning · support'],
      godTraits: ["A preference for self-directed choices", "Energy from cooperation and competition", "Expression refined through practice", "A habit of reviewing familiar rules", "Interest in connecting opportunities", "Steady attention to resources and commitments", "Focus on demanding tasks", "Attention to roles and standards", "Deep exploration of unfamiliar views", "Preparation through learning and support"],
      godLife: ['Making your own decisions may feel comfortable. Hear another view too.', 'Working alongside others may energise you. Notice when comparison becomes draining.', 'Regular practice and expression may help you develop a skill.', 'You may question familiar rules. Explain the reason for a proposed change.', 'Connecting opportunities may interest you. Check what you can realistically manage.', 'Keeping small financial commitments and promises may bring stability.', 'Demanding tasks may focus your attention. Make recovery part of the schedule.', 'Clear roles may feel comfortable. Practise adjusting when expectations change.', 'You may explore unfamiliar perspectives deeply. Test them against experience.', 'Learning and support may renew your energy. Put one lesson into practice.'],
      godRules: ['Separate individual from shared decisions and consult where needed.', 'Agree on costs and roles before competing. Pause if comparison replaces the goal.', 'Start with a repeatable workload. Use completed work to plan the next step.', 'Offer an alternative when identifying a problem. Avoid judging the person.', 'List time and downside limits for each opportunity. Defer what exceeds them.', 'Record income, costs and commitments. Do not let stability prevent necessary change.', 'Check resources before accepting pressure. Share work if rest suffers.', 'Clarify responsibility. Adjust rules with evidence when they undermine their purpose.', 'Treat intuition as a hypothesis. Verify before making a major decision.', 'Apply one lesson directly. Review the final choice even when receiving help.'],
      distribution: 'Existing chart ratios include the month-branch weighting. A larger share is not a rank or a probability of success.', dominant: '{element} at {value}% is relatively prominent: a clue to {trait}.', balanced: 'Several elements share the largest proportion. Consider how different situations bring out different strengths.', dayBasis: 'Day stem {stem} · day branch {branch}. The day stem is the reference for this reading; here its {element} symbolism is translated into daily life.', godBasis: '{name} appears in {count} chart positions. This counts relationships to the day stem, not a definitive personality diagnosis.', unknown: 'Birth time unknown: noon is used as a reference. The hour pillar and time-dependent ratios, strength and timing cannot be treated as certain.', cold: 'The seasonal score leans cooler. Notice what helps you prepare before starting an activity.', hot: 'The seasonal score leans warmer. Leave recovery intervals when increasing your pace.', neutral: 'The temperature score is centred. Observe your actual routine rather than compensating in one direction.', climateBasis: 'Temperature score {score} · moist signals {wet} / dry signals {dry}. These are symbolic seasonal calculations, not a medical assessment.', climateAction: 'Record activity and rest on days that went well. Adjust to actual wellbeing, not a symbolic score.', strong: 'The day stem receives relatively strong support. Consider both independent effort and sharing responsibilities.', weak: 'Surrounding demands are relatively large compared with support for the day stem. Preparation and help are useful questions to explore.', jong: 'The engine considers a following structure. Ordinary strong/weak advice does not apply unchanged.', strengthBasis: 'Existing support score {score} · balancing candidates {support}. This does not rank your ability or worth.', strengthAction: 'Check time and support before adding a responsibility. Review focus, effort and recovery after the choice.', flowBasis: '{label} {stem}{branch} · existing score {score}. A comparison aid, not a certain prediction.', flowOpen: 'The existing assessment reads this as relatively supportive. Test a prepared idea on a small scale.', flowCare: 'The existing assessment suggests adjustment. Review pace, responsibilities and schedules.', flowRuleOpen: 'Start small when resources and plans are ready. A score does not guarantee an outcome.', flowRuleCare: 'Adjust schedules and keep options open. Do not make relationship, career or investment decisions from a score alone.', period: 'Current ten-year cycle', year: 'Current annual cycle', more: 'Read more', sample: 'Sample · a fictional chart', sampleNote: 'An example of the format, not your personal result.', paidDifference: 'The free reading covers temperament and current cycles. These static readings add longer periods and thematic detail, using explanations linked to the calculated chart.', paidDaeun: 'For comparing ten-year periods, chart evidence and annual details.', paidSummary: 'For connecting the day stem, season, elements and Ten Gods across temperament, work and relationships.', recovery: 'Reopen the chart with the same account and profile and check access. If payment succeeded but access is missing, do not pay again; contact support with the payment record.', inputs: 'Uses the birth information and calculations already entered for this chart. Unknown birth time limits time-dependent interpretation.', pricePending: 'Checking price', priceUnavailable: 'Confirm the price in the payment information', summaryTitle: 'Comprehensive reading', paidRead: 'View reading', catTitle: 'Yeongnyangi readings', catPurpose: 'Explore your chart with the cat guide', catGo: 'Explore', catPrice: 'From {price}', endYeon: 'You do not need to fit every sentence. Start with one clue that connects with your own experience.', endNeo: 'A chart does not decide for you. Separate supported observations from mismatches and choose one action to test.'
    }
  };
  function locale() {
    return typeof root._sajuEngineCurrentLang === 'function' ? root._sajuEngineCurrentLang() : (document.documentElement.lang || 'ko');
  }
  copy.ko.catFree='무료 운세';copy.en.catFree='Free fortune';
  copy.ko.today='오늘의 흐름';copy.en.today='Today’s cycle';
  copy.ko.month='이달의 흐름';copy.en.month='This month’s cycle';
  function langCopy(lang) {
    var fallback=copy[lang]||copy.en, result={};
    Object.keys(fallback).forEach(function(key){
      function translated(value,suffix){
        if(typeof root.cdTranslate!=='function')return value;
        var full='sajuReading.'+key+(suffix===undefined?'':'.'+suffix), found=root.cdTranslate(full,{},'');
        return found&&found!==full&&found!=='Translation pending'?found:value;
      }
      result[key]=Array.isArray(fallback[key])?fallback[key].map(function(value,i){return translated(value,i);}):translated(fallback[key]);
    });
    return result;
  }
  function esc(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function fmt(text, values) { return String(text).replace(/\{(\w+)\}/g, function (_, key) { return values[key] == null ? '' : String(values[key]); }); }
  function mode() { try { return root.localStorage.getItem('fortuneThemeModeStateV1') === 'neo' ? 'neo' : 'pig'; } catch (_) { return document.body.classList.contains('neo-mode') ? 'neo' : 'pig'; } }
  function build(input, selected, lang) {
    if (!input) return null;
    var c = langCopy(lang), neo = selected === 'neo', p = input.p, n = input.natal;
    if (!p || !n) return null;
    var dominant = elements.indexOf(n.dominant), day = elements.indexOf(p.d.gE);
    if (dominant < 0 || day < 0) return null;
    function section(title, observation, evidence, example, action) {
      return { title: title, blocks: neo ? [{label:c.diagnosis,text:observation},{label:c.basis,text:evidence},{label:c.action,text:action}] : [{label:c.observe,text:observation},{label:c.life,text:example},{label:c.practice,text:action}], evidence: evidence };
    }
    var ratios = elements.map(function (e) { return Number(n.ratios[e]) || 0; });
    var top = Math.max.apply(Math, ratios), tied = ratios.filter(function (v) { return Math.abs(v-top)<0.001; }).length > 1;
    var evidence = elements.map(function (e,i) { return c.names[i]+' '+ratios[i].toFixed(0)+'%'; }).join(' · ') + '. ' + c.distribution;
    var elementText = tied ? c.balanced : fmt(c.dominant,{element:c.names[dominant],value:ratios[dominant].toFixed(0),trait:c.traits[dominant]});
    var model = { mode:selected, unknown:input.unknown===true, warning:c.unknown, ratios:ratios, elements:section(c.element,elementText,evidence,c.scenes[dominant],neo?c.rules[dominant]:c.actions[dominant]) };
    model.day = section(c.temperament,c.names[day]+' · '+c.traits[day],fmt(c.dayBasis,{stem:p.d.g,branch:p.d.j,element:c.names[day]}),c.scenes[day],neo?c.rules[day]:c.actions[day]);
    model.ten = gods.filter(function (g) { return input.ten[g]>0; }).map(function (g) {
      var i=gods.indexOf(g), basis=fmt(c.godBasis,{name:c.godNames[i],count:input.ten[g]});
      return { key:g, count:input.ten[g], reading:section(c.godNames[i],neo?c.godTraits[i]:c.godLife[i],basis,c.godLife[i],c.godRules[i]) };
    });
    var j=input.johu||{}, pw=input.power||{}, jong=input.jong||{};
    var cool=j.type==='cool'||j.type==='cold', warm=j.type==='warm'||j.type==='hot';
    model.climate=section(c.climate,cool?c.cold:warm?c.hot:c.neutral,fmt(c.climateBasis,{score:j.score,wet:j.moistCnt,dry:j.dryCnt}),cool?c.scenes[4]:warm?c.scenes[1]:c.scenes[2],c.climateAction);
    model.strength=section(c.strength,jong.isJong?c.jong:pw.isStrong?c.strong:c.weak,fmt(c.strengthBasis,{score:pw.score,support:(pw.yongshin||[]).map(function(e){return c.names[elements.indexOf(e)]||e;}).join(' · ')}),pw.isStrong?c.scenes[0]:c.scenes[2],c.strengthAction);
    model.flow=(input.flow||[]).map(function(row) { var good=row.score>=60; return section(row.kind==='year'?c.year:c.period,good?c.flowOpen:c.flowCare,fmt(c.flowBasis,{label:row.kind==='year'?c.year:c.period,stem:row.g,branch:row.j,score:row.score}),good?c.flowOpen:c.flowCare,good?c.flowRuleOpen:c.flowRuleCare); });
    model.letter=section(c.letter,elementText,model.day.evidence,c.scenes[day],neo?c.endNeo:c.endYeon);
    return model;
  }
  var state = null, flow = [], daily = [], openGod = null;
  function snapshot() {
    if (!root.G_PILLARS || !root.G_NATAL) return null;
    var p=root.G_PILLARS, ten={};
    [p.y.g,p.y.j,p.m.g,p.m.j,p.d.j,p.h.g,p.h.j].forEach(function(ch){var g=root.getTenGod(p.d.g,ch);if(g&&g!=='?')ten[g]=(ten[g]||0)+1;});
    var birth=root.G_KASI_CONTEXT||{};
    return {p:p,natal:root.G_NATAL,ten:ten,johu:root.G_JOHU,power:root.G_POWER,jong:root.G_JONG,unknown:birth.unknownHour===true||birth.timeDefault===true||root.__cdSajuTimeUnknown===true,flow:flow};
  }
  function markup(reading, model, heading) {
    var c=langCopy(locale());
    return '<div class="saju-reading" data-reading-mode="'+model.mode+'">'+(heading?'<h3>'+esc(reading.title)+'</h3>':'')+'<div class="saju-reading__body">'+reading.blocks.map(function(b){return '<section><h4>'+esc(b.label)+'</h4><p>'+esc(b.text)+'</p></section>';}).join('')+'</div>'+(model.mode==='pig'?'<details class="saju-reading__evidence"><summary>'+esc(c.basis)+'</summary><p>'+esc(reading.evidence)+'</p></details>':'')+(model.unknown?'<p class="saju-reading__uncertain">'+esc(model.warning)+'</p>':'')+'</div>';
  }
  function write(id, html) { var el=document.getElementById(id);if(el)el.innerHTML=html; }
  function ensureHeader() {
    var result=document.getElementById('resultPage');if(!result)return;
    if(!document.getElementById('sajuReadingHeader')) {var header=document.createElement('section');header.id='sajuReadingHeader';header.className='saju-reading-header';result.prepend(header);}
  }
  function controls() {
    var c=langCopy(locale()), selected=mode();
    return '<div class="saju-reading-switch" role="group" aria-label="'+esc(c.same)+'">'+['pig','neo'].map(function(m){return '<button type="button" data-saju-mode="'+m+'" aria-pressed="'+(selected===m)+'">'+esc(m==='neo'?c.neo:c.yeon)+'</button>';}).join('')+'</div>';
  }
  function renderHeader() {
    var c=langCopy(locale()), selected=mode(), neo=selected==='neo';ensureHeader();
    write('sajuReadingHeader','<img src="/images/saju/'+(neo?'neo-plan':'yeoni-clue')+'-160.webp" width="80" height="80" alt="" decoding="async"><div><h2>'+esc(neo?c.room:c.garden)+'</h2><p>'+esc(c.same)+'</p>'+controls()+'<button type="button" class="saju-reading-compare" data-saju-mode="'+(neo?'pig':'neo')+'">'+esc(neo?c.compareYeon:c.compareNeo)+'</button></div>');
    var form=document.getElementById('destinyCardForm');
    if(form&&!document.getElementById('sajuInputModes')){var host=document.createElement('div');host.id='sajuInputModes';host.className='saju-input-modes';form.prepend(host);}
    write('sajuInputModes',controls()+'<p>'+esc(neo?c.room:c.garden)+'</p>');
  }
  function render(section, supplied) {
    state=supplied||snapshot();var model=build(state,mode(),locale());if(!model)return;
    var c=langCopy(locale());
    if(section==='ilju'||section==='all') {
      var host=document.getElementById('iljuCard');
      if(host&&!document.getElementById('sajuElementReading')){var el=document.createElement('section');el.id='sajuElementReading';host.insertBefore(el,host.querySelector('.ilju-v2-grid')||host.firstChild);}
      write('sajuElementReading',markup(model.elements,model,true));
      write('iljuSummaryList','<li>'+esc(model.day.blocks[0].text)+'</li>');
      write('iljuDetailList',(model.mode==='neo'?'':'<li>'+esc(model.day.evidence)+'</li>')+'<li>'+esc(model.day.blocks[1].text)+'</li>');
      write('iljuAdviceList','<li>'+esc(model.day.blocks[2].text)+'</li>'+(model.unknown?'<li>'+esc(c.unknown)+'</li>':''));
    }
    if(section==='ten'||section==='all') {
      write('tsGrid',model.ten.map(function(g){return '<button class="saju-ten-button" type="button" data-saju-god="'+esc(g.key)+'"><strong>'+esc(g.reading.title)+'</strong><span>'+esc(g.reading.blocks[0].text)+'</span><small>'+esc(c.more)+' · '+g.count+'</small></button>';}).join(''));
      if(openGod&&document.getElementById('tsModal')?.classList.contains('show')) showGod(openGod,false);
    }
    if(section==='climate'||section==='all') write('johuContent',markup(model.climate,model,false));
    if(section==='strength'||section==='all') write('ukbuSection',markup(model.strength,model,false));
    if(section==='flow'||section==='all') write('currentSeasonSummary',model.flow.map(function(r){return markup(r,model,true);}).join(''));
    if(section==='daily'||section==='all') daily.forEach(function(row,i){
      var gi=gods.indexOf(row.gGod), good=row.batteryPercent>=60;
      var title=i===0?c.today:c.month;
      var reading={title:title,evidence:fmt(c.flowBasis,{label:title,stem:row.gz.g,branch:row.gz.j,score:row.batteryPercent}),blocks:[]};
      reading.blocks=model.mode==='neo'?[{label:c.diagnosis,text:good?c.flowOpen:c.flowCare},{label:c.basis,text:reading.evidence},{label:c.action,text:gi>=0?c.godRules[gi]:c.strengthAction}]:[{label:c.observe,text:good?c.flowOpen:c.flowCare},{label:c.life,text:gi>=0?c.godLife[gi]:c.scenes[0]},{label:c.practice,text:gi>=0?c.godRules[gi]:c.strengthAction}];
      write(i===0?'dailyPanel':'monthlyPanel',markup(reading,model,true));
    });
    if(section==='letter'||section==='all') {write('letterTitle',esc(mode()==='neo'?c.neo:c.yeon)+' · '+esc(c.letter));write('letterContent',markup(model.letter,model,false));}
    renderHeader();
  }
  function refreshCopy() {
    var c=langCopy(locale());
    document.querySelectorAll('[data-saju-copy]').forEach(function(el){var key=el.getAttribute('data-saju-copy');if(c[key])el.textContent=c[key];});
    var cat=document.querySelector('[data-soulcat-price]');
    if(cat)cat.textContent=root.__cdSajuCatPrice?fmt(c.catPrice,{price:new Intl.NumberFormat(locale(),{style:'currency',currency:'KRW',maximumFractionDigits:0}).format(root.__cdSajuCatPrice)}):c.pricePending;
    document.querySelectorAll('[data-saju-offer]').forEach(function(el){
      var key=el.getAttribute('data-saju-offer');
      if(el.dataset.readingLocale===locale()+':'+mode())return;
      el.dataset.readingLocale=locale()+':'+mode();
      var sample=build({p:{d:{g:'辛',j:'酉',gE:'metal'}},natal:{dominant:'metal',ratios:{wood:100/3,fire:100/9,earth:100/9,metal:400/9,water:0}},ten:{'비견':2},flow:[{kind:'period',g:'甲',j:'午',score:60}]},mode(),locale());
      var price=document.querySelector('[data-saju-price-key="'+key+'"]');
      el.innerHTML='<img class="saju-static-offer__guide" src="/images/saju/'+(mode()==='neo'?'neo-plan':'yeoni-clue')+'-160.webp" width="56" height="56" alt="" decoding="async"><h3>'+esc(key==='section_daewun'?c.period:c.summaryTitle)+'</h3><strong class="saju-static-offer__price">'+esc(price?price.textContent:c.pricePending)+'</strong><p>'+esc(key==='section_daewun'?c.paidDaeun:c.paidSummary)+'</p><p>'+esc(c.paidDifference)+'</p><details data-saju-sample="'+key+'"><summary>'+esc(c.sample)+'</summary>'+markup(key==='section_daewun'?sample.flow[0]:sample.elements,sample,false)+'<p>'+esc(c.sampleNote)+'</p></details><p>'+esc(c.inputs)+'</p><p>'+esc(c.recovery)+'</p>';
    });
  }
  function showGod(key, open) {
    var data=snapshot(), model=build(data,mode(),locale());if(!model)return false;
    var item=model.ten.find(function(g){return g.key===key;});if(!item)return false;
    root.ensureSajuDetailModal();openGod=key;write('modalBody',markup(item.reading,model,true));if(open!==false)root.openSajuDetailModal();return true;
  }
  var preserving = false;
  function preserve(callback) {
    if(preserving){callback();return;}
    preserving=true;
    var visible=Array.from(document.querySelectorAll('#sajuReadingHeader, #resultPage .card[id]')).filter(function(e){var r=e.getBoundingClientRect();return r.height>0&&r.bottom>0&&r.top<innerHeight;}).sort(function(a,b){return Math.abs(a.getBoundingClientRect().top)-Math.abs(b.getBoundingClientRect().top);})[0];
    var offset=visible?visible.getBoundingClientRect().top:0, focus=document.activeElement, focusId=focus&&focus.id, focusMode=focus&&focus.getAttribute('data-saju-mode'), focusHost=focus&&focus.closest('#sajuInputModes')?'#sajuInputModes':'#sajuReadingHeader';
    var expanded=Array.from(document.querySelectorAll('#resultPage details')).map(function(e){var parent=e.parentElement.closest('[id]');return {el:e,parent:parent&&parent.id,index:parent?Array.from(parent.querySelectorAll('details')).indexOf(e):0,open:e.open};});
    callback();
    expanded.forEach(function(s){var parent=s.parent&&document.getElementById(s.parent);var e=s.el.isConnected?s.el:parent&&parent.querySelectorAll('details')[s.index];if(e)e.open=s.open;});
    requestAnimationFrame(function(){requestAnimationFrame(function(){if(visible&&visible.isConnected)window.scrollBy({top:visible.getBoundingClientRect().top-offset,behavior:'instant'});var f=focusId?document.getElementById(focusId):focusMode?document.querySelector(focusHost+' [data-saju-mode="'+focusMode+'"]'):null;if(f)f.focus({preventScroll:true});preserving=false;});});
  }
  function changed() {preserve(function(){render('all');refreshCopy();if(!root.G_PILLARS)renderHeader();});}
  root.SajuReadingPresentation={build:build,render:render,changed:changed,showGod:showGod,setFlow:function(rows){flow=rows.map(function(r){return Object.assign({},r);});render('flow');},setDaily:function(day,month){daily=[day,month];render('daily');},copy:langCopy,sourceCopy:copy,escape:esc,locale:locale,refreshCopy:refreshCopy};
  if(typeof document==='undefined')return;
  document.addEventListener('click',function(event){
    var button=event.target.closest('[data-saju-mode]');
    if(button){var selected=button.getAttribute('data-saju-mode');if(selected===mode())return;preserve(function(){var checkbox=document.getElementById('themeCheckbox');if(checkbox){checkbox.checked=selected==='neo';checkbox.dispatchEvent(new Event('change',{bubbles:true}));}});if(typeof root.cdTrack==='function')root.cdTrack('saju_reading_mode_change',{mode:selected,surface:root.G_PILLARS?'result':'input'});}
    var god=event.target.closest('[data-saju-god]');if(god)showGod(god.getAttribute('data-saju-god'),true);
  });
  root.addEventListener('cd:locale-ready',changed);
  document.addEventListener('toggle',function(event){var el=event.target;if(el.open&&el.matches('[data-saju-sample]')&&typeof root.cdTrack==='function')root.cdTrack('saju_static_detail_view',{item_id:el.getAttribute('data-saju-sample'),mode:mode()});},true);
  function init(){renderHeader();refreshCopy();['yeoni-clue','neo-plan'].forEach(function(name){var asset=new Image();asset.decoding='async';asset.src='/images/saju/'+name+'-160.webp';});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(typeof window==='undefined'?globalThis:window);
