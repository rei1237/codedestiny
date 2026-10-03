/* Rich saju reading for non-Korean locales (display only). Same facts + mode in, HTML out, same API as reading-rich.js.
 * Layout pieces and score breakdowns come from SajuReadingRich (kit, powerParts, johuParts, godMap); this file holds only the
 * locale copy and the assembly. Engine strings that are Korean (ten-god names, twelve stages, free-text summaries) are mapped
 * through the tables below or left out — nothing Korean may reach the page. A locale without its own table reads in English.
 * Copy shape: [yeoni voice, neo voice] pairs, {placeholders} filled by fmt(). */
(function (root) {
  'use strict';
  var Rich = root.SajuReadingRich, K = Rich && Rich.kit;
  if (!K) return;
  var esc = K.esc, fmt = K.fmt, num = K.num, pct = K.pct, lib = K.lib, elOf = K.elOf, family = K.family, section = K.section, para = K.para, gauge = K.gauge, table = K.table, hero = K.hero, tiles = K.tiles, chips = K.chips, more = K.more, wrap = K.wrap, roleOf = K.roleOf;
  var GOD_FAMILY = K.GOD_FAMILY, FAMILY_ORDER = K.FAMILY_ORDER;
  var GODS = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'];
  var GOD_HAN = {'비견':'比肩', '겁재':'劫財', '식신':'食神', '상관':'傷官', '편재':'偏財', '정재':'正財', '편관':'偏官', '정관':'正官', '편인':'偏印', '정인':'正印'};
  var POS_ID = {'년간':'yg', '년지':'yj', '월간':'mg', '월지':'mj', '일간':'dg', '일지':'dj', '시간':'hg', '시지':'hj'};
  var KO_SEASON = {'봄':'spring', '여름':'summer', '가을':'autumn', '겨울':'winter'};
  var BRANCH_ANIMAL = {'子':'Rat', '丑':'Ox', '寅':'Tiger', '卯':'Rabbit', '辰':'Dragon', '巳':'Snake', '午':'Horse', '未':'Goat', '申':'Monkey', '酉':'Rooster', '戌':'Dog', '亥':'Pig'};

  var COPY = {};
  COPY.en = {
    voice: ['Yeoni', 'Neo'],
    el: {wood:'Wood (木)', fire:'Fire (火)', earth:'Earth (土)', metal:'Metal (金)', water:'Water (水)'},
    fam: {same:'Peers (比劫)', parent:'Resource (印星)', drain:'Output (食傷)', wealth:'Wealth (財星)', control:'Authority (官星)'},
    famMeaning: {same:['Energy like your own', 'allies and self-reliance'], parent:['Energy that supports you', 'learning and backing'], drain:['Energy you give out', 'expression and talent'], wealth:['Energy you manage', 'resources and practical results'], control:['Energy that shapes you', 'duty and structure']},
    pos: {yg:'Year stem', yj:'Year branch', mg:'Month stem', mj:'Month branch', dg:'Day stem', dj:'Day branch', hg:'Hour stem', hj:'Hour branch'},
    palace: {y:{label:'Year pillar', palace:'Ancestors · early life', span:'ages 0–15', domain:'roots, family, childhood setting'}, m:{label:'Month pillar', palace:'Parents · youth', span:'ages 16–30', domain:'parents, siblings, entering society'}, d:{label:'Day pillar', palace:'Self · partner', span:'ages 31–45', domain:'yourself and the partner palace'}, h:{label:'Hour pillar', palace:'Children · later life', span:'age 46+', domain:'children, later years, results'}},
    role: {'용신':'Key balance (用神)', '희신':'Supportive (喜神)', '기신':'Strain (忌神)', '구신':'Added strain (仇神)'},
    roleShort: {'용신':'Key balance', '희신':'Supportive', '기신':'Strain', '구신':'Added strain'},
    noonMark: ' (noon assumed)', unknownCell: 'Unknown', none: '—',
    stem: {'甲':'Jia · Yang Wood', '乙':'Yi · Yin Wood', '丙':'Bing · Yang Fire', '丁':'Ding · Yin Fire', '戊':'Wu · Yang Earth', '己':'Ji · Yin Earth', '庚':'Geng · Yang Metal', '辛':'Xin · Yin Metal', '壬':'Ren · Yang Water', '癸':'Gui · Yin Water'},
    stemNote: {
      '甲':'like a tall tree growing straight up: it sets a direction, takes the lead and holds its pride',
      '乙':'like a vine or flower that bends without breaking: soft, persistent and good at making a life work',
      '丙':'like the sun lighting everything: bright, expressive and clearly present',
      '丁':'like a lamp in the dark: delicate, warm and deep',
      '戊':'like a great mountain: steady, trustworthy and firmly centred',
      '己':'like fertile farmland: practical, accommodating and good with reality',
      '庚':'like raw ore and steel: decisive, loyal and competitive',
      '辛':'like a cut jewel: sensitive, exacting and good with aesthetics',
      '壬':'like a great river or sea: broad in thinking, flexible and generous',
      '癸':'like dew or a spring: bright, sensitive and quietly full of life'},
    stage12: {
      '장생':['Growth (長生)', 'the start of growing · energy for learning and beginning'], '목욕':['Bathing (沐浴)', 'first contact with the world · curiosity, sensitivity, change'],
      '관대':['Dressing (冠帶)', 'stepping into society · confidence and drive'], '건록':['Prime (建祿)', 'earning your own way · independence and practical skill'],
      '제왕':['Peak (帝旺)', 'energy at its fullest · initiative and strong self-belief'], '쇠':['Ease (衰)', 'past the peak and seasoned · experience and care'],
      '병':['Fading (病)', 'energy quietens and grows finer · empathy and consideration'], '사':['Stillness (死)', 'movement stops, thought deepens · focus and inquiry'],
      '묘':['Storing (墓)', 'gathering into the storehouse · saving, managing, substance'], '절':['Break (絶)', 'cutting from the old and changing · transition and decision'],
      '태':['Conception (胎)', 'a new life forms · planning and potential'], '양':['Nurture (養)', 'being raised in shelter · preparation and care']},
    hidden: {first:'residual', mid:'middle', last:'main'},
    ganji: 'Year · Month · Day · Hour',

    /* ── climate ── */
    temp: ['Cold side', 'Cool side', 'Even temperature', 'Warm side', 'Hot side'],
    moist: {dry:'On the dry side', balanced:'Balanced', wet:'On the damp side'},
    season: {spring:'spring', summer:'summer', autumn:'autumn', winter:'winter'},
    env: {
      colddry:{title:'A quiet, tidy winter lodge', text:['Calm reason and clear boundaries stand out in this climate. Focus returns in quiet places with less noise. Work that means digging deep alone, such as analysis, planning or research, can suit you, and a plain, respectful distance tends to turn into trust. Tell close people early that opening up takes you time, and misunderstandings shrink.', 'Environment type: winter lodge. Focus rises in a quiet, orderly setting. Suitable roles dig deep: analysis, planning, research. In relationships, kept boundaries become trust. Share in advance that you express feelings late.']},
      coldwet:{title:'A misty lake at dawn', text:['The surface is still, but thoughts and feelings link closely underneath. You gain energy where people share inner thoughts and deep conversation. Counselling, psychology and the arts, which read what lies behind people, can fit, and slowly built closeness lasts. On days when thinking sinks low, add warmth with sunlight and light movement.', 'Environment type: dawn lake. Quiet outside, heavy processing inside. Suitable roles read what lies behind people: counselling, psychology, the arts. Relationships deepen slowly. When thinking sinks, raise your rhythm with sunlight and light movement.']},
      hotdry:{title:'A desert at high noon', text:['Once a goal is visible you move without hesitating. Decisions come fast and grudges are few, so results come easily where speed matters. Starting things, sales and short projects can suit you, and not hiding your heart is part of your charm. As the heat rises, check the pace of the people beside you now and then.', 'Environment type: midday desert. Once a goal is set you go straight, and decide quickly. Suitable roles reward speed: launches, sales, short projects. Candour is a strength. When you speed up, check the other person’s pace.']},
      hotwet:{title:'A summer forest full of life', text:['You grow by mixing with people. Curiosity and friendliness are large, and energy moves around you wherever people gather. Teaching, HR, marketing and writing, which centre on communication, can fit, and you build experience by sharing feelings richly. Schedules fill easily, so reserve time to catch your breath alone.', 'Environment type: summer forest. Energy moves between people and you grow with it. Suitable roles centre on communication: teaching, HR, marketing, writing. Feelings are expressed richly. Schedules overfill easily, so secure time alone first.']}},
    rx: {
      hot:{need:'Water (水) · Metal (金)', color:'blue, black, white', dir:'north, west', act:'waterside walks, swimming, lukewarm foot baths, meditation', less:'intense exercise, hot places, too much red'},
      warm:{need:'Water (水)', color:'blue, sky blue, mint', dir:'north', act:'drinking water often, streams and seaside trips, cool-down stretching', less:'heavy drinking or eating, late-night snacks'},
      neutral:{need:'Seasonal adjustment', color:'change with the season', dir:'not fixed', act:'Wood and Metal activities in spring and autumn, Water in summer, Fire and Wood in winter', less:'a rhythm that leans one way'},
      cool:{need:'Fire (火) · Wood (木)', color:'orange, green, warm reds', dir:'south, east', act:'sunlight, half-body baths, stretching and yoga', less:'cold food, long stays in air conditioning'},
      cold:{need:'Fire (火) · Wood (木)', color:'red, orange, light green', dir:'south, east', act:'warm food, hot baths, warming cardio, plenty of sunlight', less:'cold plunges, heavy air conditioning, wearing only dark colours'}},
    moistRx: {dry:{need:'Water (水) · Wood (木)', act:'drinking water often, humidifying, walks by forests or water, keeping plants'}, wet:{need:'Metal (金) · Fire (火)', act:'airing out often, sun-dried bedding, white or gold accents, clearer boundaries in relationships'}, balanced:{need:'nothing extra', act:'damp and dry are balanced, so focus on the temperature side'}},
    rxLabel: ['Energy to add', 'Colours', 'Direction', 'Activities', 'Ease off', 'Moisture balance'],
    climate: {
      tempBadge:'Temperature score {s}',
      lead:['What Yeoni read in the climate', 'Neo’s assessment of the climate'], env:['Your environment by climate', 'Environment type by climate'], parts:'Temperature and moisture by character', count:'The four energies that move temperature',
      verdict:['You were born in a {season} month. The season sets a base temperature of {base}; adding the warmth and cold of the eight characters gives a temperature score of {score}, which reads as: {type}. Moisture shows {wet} damp signals and {dry} dry signals: {moist}.', 'Verdict: {type}; moisture: {moist}. Base for a {season} month {base}, plus each character’s contribution, gives a temperature score of {score}; damp {wet}, dry {dry}.'],
      versus:['Climate balance and strength balance', 'Climate balance versus strength balance'], rx:'Climate balance guide · everyday adjustments',
      rxIntro:['Traditional charts fill what is missing with symbols; here they are turned into everyday language. Pick just one that appeals and try it for about a week.', 'These are everyday ways to supplement what is missing. Pick one, do it for a week and note how your condition changes.'],
      note:'These suggestions translate a traditional symbol system. They are not health or medical advice. If something feels wrong in your body, speak to a professional first.',
      warm:'warmth', cold:'cold', tags:{fire:'Fire', wood:'Wood', metal:'Metal', water:'Water'}, tagNotes:{fire:'warmth +1.5', wood:'warmth +0.5', metal:'cold −0.5', water:'cold −1.5'},
      cols:['Position', 'Character', 'Element', 'Temp.', 'Damp · dry'], base:'Seasonal base', total:'Total', dampWord:'damp', dryWord:'dry',
      gaugeTemp:{ends:['Cold 寒', 'Hot 暖'], caption:'Temperature score {score}', aria:'Temperature gauge: score {score}, {type}'},
      gaugeHumid:{ends:['Dry 燥', 'Damp 濕'], caption:'Damp {wet} · dry {dry} (difference {diff})', aria:'Moisture gauge: {wet} damp signals, {dry} dry signals, {moist}'},
      vNone:['The temperature is even, so there is no urgent energy to add for climate. Reading the key balance from the strength side is enough.', 'Temperature is even, so no climate energy is urgent. Judge mainly by the strength balance.'],
      vJong:['By climate, {need} energy is welcome. But this chart was examined as a following structure, so follow the gathered momentum first and treat climate as an everyday supplement.', 'Climate wants {need}. Because the chart is a following structure, following the gathered momentum comes first.'],
      vSame:['The {need} energy that is welcome by climate overlaps with the key balance from strength ({yong}). Both views point the same way, so keeping this energy steadily near you is the clearest supplement.', 'Climate need ({need}) overlaps the strength-based key balance ({yong}). Same direction, so the supplement priority is clear.'],
      vExtreme:['Climate points to {need} and strength to {yong}, so the directions differ a little. With the temperature leaning strongly one way, put the seasonal balance of climate first and read strength second.', 'Climate points to {need}, strength to {yong}. The directions differ. Temperature is extreme, so climate leads and strength supports.'],
      vMild:['Climate points to {need} and strength to {yong}, so the directions differ a little. The temperature is not extreme, so centre on the key balance from strength and treat climate as a seasonal helper.', 'Climate points to {need}, strength to {yong}. The directions differ. Temperature is not extreme, so strength leads and climate supports.'],
      vNote:['Climate looks at the temperature and moisture of the birth season; strength looks at how large or small the day stem’s power is. Neither is treated as the only answer; the chart decides which comes first.', 'Climate reads the season’s warmth and moisture; strength reads whether the day stem has too much or too little power. Neither alone is the answer.'],
      what:'What are warmth, cold, dryness and damp?', whatText:['These describe the temperature (cold or hot) and moisture (dry or damp) of a chart. Just as nature has seasons and weather, a person’s temperament is said to have a climate, and this helps you see in which setting you feel at ease and use your strength well.', 'Warmth and moisture of the chart. They show in which environment strength is used well.'],
      four:[['Cold (寒)', 'The condensed energy of winter. Read as a calm, careful strength that consolidates inward.'], ['Warm (暖)', 'The outgoing energy of summer. Read as passion, expression and strength that reaches outward.'], ['Dry (燥)', 'The firm energy of autumn. Read as clear cut-offs and an uncluttered grain.'], ['Damp (濕)', 'The tangled energy of spring. Read as empathy, friendliness and growing together.']],
      how:'How it is calculated: the month branch sets the base temperature (子 and 丑 −4, 亥 −3, 戌 −2, 寅 and 酉 −1, 卯 and 申 +1, 辰 +2, 巳 +3, 午 and 未 +4). 寅 keeps some cold after the start of spring and 申 some heat after the start of autumn. Across the eight characters, Fire adds +1.5, Wood +0.5, Metal −0.5 and Water −1.5. Damp counts Water, Wood, 辰 and 丑; dry counts Fire, Metal, 戌 and 未, and the two are compared. A score of 5 or more reads hot, 2 or more warm, −2 or more even, −5 or more cool, and below that cold.'},

    /* ── strength ── */
    stage: ['Very weak', 'Weak', 'Weak, near balance', 'Strong, near balance', 'Strong', 'Very strong'],
    strengthLead: ['What Yeoni read in your strength', 'Neo’s assessment of strength'],
    str: {
      jongHead:['Following structure (從格)', 'Following structure'],
      jongLead:['Your chart gathers {dom} energy {pct}into what was examined as a {name}. A structure like this is not measured with the ordinary strong-or-weak ruler; it is read by following the gathered momentum.', 'Verdict: {name}. {dom} energy {pct}leads the chart. The ordinary strong/weak formula is not applied.'],
      jongBadge:'Strength {score} (reference)', jongPct:'at {pct}% ',
      jongWhat:'What is a following structure (從格)?', jongWhatText:['When one element is strong enough to overwhelm the whole chart, it is considered more natural to follow its momentum than to press against it. So the strength score above is only a reference and the description of the structure below is the centre.', 'When one element overwhelms the chart, following it is the remedy, so the strength score is only a reference.'],
      jongKind:{wood:'a Wood-dominant structure, natural when you use straight growth and planning energy as it is', fire:'a Fire-dominant structure, natural when you use bright passion and expression', earth:'an Earth-dominant structure, natural when you follow the energy of building up and protecting', metal:'a Metal-dominant structure, natural when you use decisive, refining firmness', water:'a Water-dominant structure, natural when you use flowing, flexible wisdom', parent:'a structure overwhelmed by Resource energy, which rides a large current of learning and backing', drain:'a structure overwhelmed by Output energy, which follows the flow of putting talent and expression into the world', wealth:'a structure overwhelmed by Wealth energy, which goes with the flow of resources and practical results', control:'a structure overwhelmed by Authority energy, which rides a large current of organisation and duty', change:'a transformed structure in which stems combined into one energy, read around that new energy', other:'a special structure led by a single energy, natural when you follow its momentum'},
      kindHead:['Your structure', 'Structure type'], dirHead:'Direction of cycles',
      dirText:['When a cycle feeds {dom} energy, the flow tends to continue smoothly; in cycles that run against that momentum, more adjustment may be needed. Rather than spreading strength thin, deepening one inborn strength fits this structure.', 'Cycles that feed {dom} energy tend to run smoothly; cycles that oppose it add adjustment. Concentrate on one strength.'],
      gaHead:'Partial following (假從格)', jinHead:'Close to a true following structure (眞從格)',
      gaText:['A weak root that supports the day stem remains, so with the cycles the chart may settle into a following structure or return to an ordinary one. Compare it with what you actually lived through.', 'A weak supporting root remains. Depending on cycles it can settle into a following structure or return to an ordinary one. Check it against your history.'],
      jinText:['The flow of following the dominant element is clear.', 'Following the dominant element is clear.'],
      leadNormal:['Your strength score is {score}, read as {stage}. The line between strong and weak is 30, and your {stem} day stem sits {gap} points {dir} it.', 'Verdict: {stage} ({sw}). Strength score {score}, {gap} points {dir} the 30 baseline.'],
      above:'above', below:'below', strongWord:'strong', weakWord:'weak',
      tagStrong:['You are closer to a self-driven type.', 'Type: self-driven.'], tagWeak:['You are closer to a sensitive, attentive and cooperative type.', 'Type: attentive and cooperative.'],
      badge:'Strength {score}', baseBadge:'Baseline 30', typeStrong:'Self-driven', typeWeak:'Cooperative',
      gauge:{ends:['Weaker side', 'Stronger side'], baseLabel:'Baseline 30', caption:'Strength score {score} (baseline 30)', aria:'Strength gauge: score {score}, {stage}, baseline 30'},
      threeHead:['The three forces behind it', 'Season, branch and support'], threeCap:'Season, branch, support', threeCols:['Factor', 'Characters', 'Verdict', 'Points'],
      rowMonth:'Season · month branch', rowDay:'Footing · day branch', rowRest:'Support · the other five', vMonthPos:'Gained', vMonthNeg:'Lost', vFootPos:'Rooted', vFootNeg:'Unrooted', vRestPos:'Supported', vRestNeg:'Unsupported', vFlat:'Level', sumLabel:'Total',
      partsOpen:['See points per character', 'Points per character'], partsCap:'Strength points per character', partsCols:['Position', 'Character', 'Element', 'Relation to day stem', 'Points'],
      whyHead:['Why {sw}', 'Why {sw}'],
      monthRel:{same:['Gained', 'The month shares the day stem’s element, so the roots are firm.', 'Month branch matches the day stem’s element. Firm roots.'], parent:['Gained', 'The month is a Resource month that gives birth to the day stem, so you receive a lot of support.', 'Month branch is Resource and feeds the day stem. Strong support.'], control:['Lost', 'The month is an Authority month that restrains the day stem, so the energy is easily pressed.', 'Month branch is Authority and restrains the day stem. Energy is pressed.'], drain:['Lost', 'The month is an Output month where the day stem pours its energy out, so energy flows outward.', 'Month branch is Output and drains the day stem. Energy flows out.'], wealth:['Lost', 'The month is a Wealth month the day stem has to manage, so you stand in a place where strength is spent.', 'Month branch is Wealth, managed by the day stem. A place where strength is spent.']},
      whySeason:['Looking at the birth month (season), it is {tag}. {rel} ', 'Season: {tag}. {rel} '], whyNeutral:['The birth month and day stem relate neutrally. ', 'The season is neutral. '],
      whySum:['Adding what the day branch and the other characters give or take from the day stem makes {score} points. ', 'Season plus the support and pressure of the day branch and other characters totals {score} points.'],
      whyStrong:'You have plenty of power to stand on your own, so it reads as strong.', whyWeak:'Your own strength is a little short compared with outside demands, so it reads as weak. That is not a flaw; it is the base of sensitivity and flexibility.',
      stemHead:['The grain of the {stem} day stem', 'Day stem {stem}'],
      stemStrong:['Because you have plenty of strength, you shine more when you spend it outward. Sharing results, helping people and taking responsible roles keep you balanced. Holding everything alone can feel stifling.', 'You carry surplus power, so efficiency comes from spending it outward. Share results and take responsible roles.'],
      stemWeak:['Your strength is used best beside people and settings that recognise you. Rather than pushing to the front, lay the roots first with learning, preparation and cooperation.', 'Resources run short, so secure the roots with preparation, learning and cooperation. Leading too hard is costly.'],
      stemLine:['{stem}: {note}. ', '{stem}: {note}. '],
      godHead:['Energies that support you · energies to watch', 'Key balance / strain'], godTags:{good:['Key balance', 'Supportive'], care:['Strain', 'Added strain']},
      godText:['When Key balance and Supportive elements arrive through a cycle, things tend to go smoothly and help is easier to meet. When Strain elements grow strong, slow down a beat and look a little longer before large expansions or decisions.', 'Things tend to go well when Key balance and Supportive elements arrive through cycles; when Strain elements grow stronger, a lower expansion speed is safer.'],
      godWhat:'What are Key balance, Supportive, Strain and Added strain?', godWhatText:'The Key balance element (用神) is what the chart most needs for balance, and the Supportive element (喜神) helps it. The Strain element (忌神) harms the Key balance, the Added strain element (仇神) feeds the Strain, and a neutral element (閑神) leans neither way. This chart’s calculation sorts all five elements into supporting and burdening sides, so no neutral element is kept apart.',
      cycHead:'Direction of cycles at a glance', cycStrong:['Cycles of Output, Wealth and Authority, which spend energy outward and turn it into achievement, are where social results tend to ripen.', 'Output, Wealth and Authority cycles, meaning power spent outward and turned into results, are favourable.'], cycWeak:['Cycles of Peers and Resource, which fill and support you, are where confidence and help tend to arrive together.', 'Peers and Resource cycles, meaning you are filled and supported, are favourable.'],
      what:'What is strength (抑扶)?', whatText:'Strength looks for balance by pressing down the day stem when it is too strong (抑) and lifting it when it is weak (扶). In this chart the month branch weighs most (same element +40, Resource +27, Authority −27, Output −10). The day branch is +13 for the same element or Resource and −9 for Authority; the other five characters are +7 for the same element or Resource and −7 for Authority. A total of 30 or more is read as strong and below that as weak, and the stage names only label score ranges. The score is not a grade of a person’s ability or worth.'},

    /* ── ten gods ── */
    godName: {'비견':'Peer (比肩)', '겁재':'Rival (劫財)', '식신':'Gentle Output (食神)', '상관':'Sharp Output (傷官)', '편재':'Roving Wealth (偏財)', '정재':'Steady Wealth (正財)', '편관':'Pressure (偏官)', '정관':'Order (正官)', '편인':'Insight (偏印)', '정인':'Care (正印)'},
    ten: {
      lead:['How the ten gods weigh in, as Yeoni sees it', 'Neo’s assessment of the ten gods'], most:['Most frequent group {n}', 'Leading {n}'], mostBadge:['Most frequent group: {n} characters', 'Leading: {n} characters'], noneBadge:['Empty: {list}', 'Absent: {list}'], allBadge:['All five groups present', 'No group absent'],
      leadText:['Among the seven characters other than the day stem, the most weight sits on {top}. The grain of {meaning} tends to show through daily life. {tail}', 'Verdict: {top} leads ({n} of the seven characters other than the day stem). {tail}'],
      tailNone:['By contrast {list} did not show on the surface.', 'Absent: {list}.'], tailAll:['All five groups show on the surface, so your toolbox is evenly stocked.', 'All five groups are present.'],
      distHead:['The five groups, spread out', 'Distribution by group'], distCap:'Ten-god distribution', cols:['Group', 'Surface', 'Hidden stems', 'Detailed gods', 'In strength'],
      distNote:['The surface count covers three stems and four branches besides the day stem; hidden stems counts every stem hidden inside the branches. A larger count is neither better nor worse.', 'Surface: three stems and four branches excluding the day stem. Hidden stems: every stem inside the branches. Counts are not ranks or odds of success.'], noonNote:['The hour stem and branch use noon as a stand-in.', 'Hour stem and branch are noon stand-ins.'],
      notesHead:['Strong energies · empty energies', 'Excess and absence'],
      hiddenOnly:['{fam} is not on the surface but {n} sit in the hidden stems. Read it as potential you take out slowly when needed.', '{fam}: absent on the surface, {n} in hidden stems. Latent potential drawn on late.'],
      over:{same:['Peers are many, so independence and pride stand out. You can do a lot alone but may clash over shares, so set rules before any money-linked partnership.', 'Peers in excess: strong views and frequent competition. Set rules first for shared funds and partnerships.'], drain:['Output is many, so expression and talent overflow. Ideas and words are plentiful, but sending so much outward can tire you. A habit of finishing what you start turns talent into results.', 'Output in excess: much expression and production, heavy drain. Schedule finishing as much as starting.'], wealth:['Wealth is many, so practical sense and money activity stand out. You tend to be busy with many tasks and people to look after.', 'Wealth in excess: many practical tasks and things to manage.'], control:['Authority is many, so duty and expectations can feel heavy. The more roles you hold, the more clear standards help.', 'Authority in excess: heavy duty and outside expectation. Set role boundaries first.'], parent:['Resource is many, so thought and learning run deep. If you grow used to receiving, though, action can slow down.', 'Resource in excess: deep thought and learning, slow action.']},
      none:{same:['Peers are not on the surface, so coordinating with others comes ahead of holding out alone. Keep a colleague to lean on when tired.', 'Peers absent: coordination over solo drive. Secure collaborators.'], drain:['Output is not on the surface, so the road for bringing inner thoughts out may be narrow. Make an outlet on purpose, such as writing or keeping notes.', 'Output absent: narrow expression channel. Build an output routine such as notes or talks.'], wealth:['Wealth is not on the surface, so you tend to chase meaning and people more than money. Habits and tools are enough to supplement money management.', 'Wealth absent: supplement financial sense with a system.'], control:['Authority is not on the surface, so the freedom of not being bound by frames is large. Deadlines and rules you set yourself keep you centred.', 'Authority absent: weak outside discipline. Set your own deadlines and rules.'], parent:['Resource is not on the surface, so you tend to learn by running into things rather than from others’ help. Make room on purpose for rest and a trusted adviser.', 'Resource absent: you learn by doing. Schedule rest and an adviser.']},
      noneTail:['The groups are spread evenly, with no strong excess or gap. This is a balanced structure in which several tools can be used as the situation calls.', 'No group is in excess (three or more) or absent. Tools are evenly spread.'],
      comboHead:['Combinations worth noticing', 'Structural combinations'],
      combos:[{name:'Output feeds Wealth (食傷生財)', text:['Output and Wealth appear together, so talent can flow into income. Turning what you love into steady work tends to connect to money.', 'Output leads to Wealth. Turning talent into products makes earning easier.']}, {name:'Authority feeds Resource (官印相生)', text:['Authority and Resource appear together, so duty turns into learning and learning into skill. Qualifications and reputation tend to build together in an organisation.', 'Authority to Resource to day stem. Favourable for qualifications and reputation in organisations.']}, {name:'Gentle Output restrains Pressure (食神制殺)', text:['The Gentle Output god keeps the Pressure god in check. When pressure comes, you have the power to resolve it with skill.', 'Gentle Output restrains Pressure. Pressure is solved with skill.']}, {name:'Sharp Output meets Order (傷官見官)', text:['Sharp Output and Order appear together, so your own thinking and the rules can collide. Following procedure when you speak up turns sharpness into persuasion.', 'Sharp Output and Order coexist. Collisions with rules are likely, so voice opinions through procedure.']}, {name:'Mixed Authority (官殺混雜)', text:['Order and Pressure appear together, so duties and roles can overlap in several directions. Clear priorities reduce the confusion.', 'Order and Pressure together. Roles overlap, so fix the priorities.']}],
      what:'How to read the ten gods (十星)', whatText:['The ten gods sort every other character into ten relationships to the day stem. The same element is Peers, the one you give birth to is Output, the one you manage is Wealth, the one that manages you is Authority, and the one that gives birth to you is Resource. Same polarity is "偏" and different polarity is "正" (Peer and Rival are the exception).', 'Stems show the outer manner, branches the base of life, and hidden stems the potential not yet shown. Branch gods here follow this service’s rule and are judged by the branch’s element and polarity.'],
      cardMore:'Read more', cardAt:'{at} · {more}', modalCap:'Where {god} sits', modalCols:['Position', 'Character', 'Palace', 'Area shown'], outer:'outer manner', base:'base of life', sitHead:['Where it sits in your chart', 'Basis'],
      sitText:['On the surface in {n} place(s); counting hidden stems, this energy is in {h}. ', '{n} surface place(s), {h} counting hidden stems. '], roleText:['In strength, this group is {role} for you. {tail}', 'In strength this group is {role}.'], roleGood:'The more you bring it up, the more balanced you become.', roleCare:'You are most at ease when you keep it from going too far.',
      natureHead:['Temperament as Yeoni reads it', 'Assessment'], careerHead:'Work and aptitude', loveHead:['The shape of relationships', 'Relationships'], adviceHead:['Yeoni’s advice', 'Action criteria']},
    god: {
      '비견':{line:['A base of self-direction: comfortable when you decide and own the result.', 'Self-standard and independence. Efficiency rises when your name is on it.'], nature:['The Peer god (比肩) shares both the element and the polarity of the day stem: another you, shoulder to shoulder. You gain strength when nobody interferes and you do it your way, and behind a quiet surface your pride and view are firm. You are loyal to colleagues and stay long with people you click with.', 'Peer shares element and polarity with the day stem. Core: independence and conviction. Results come where your name is on the work. Loyalty to colleagues is a strength.'],
        career:'Fits specialist work, freelancing or a small business where independence is protected, or roles with a clearly your own area inside an organisation. In a partnership, put shares and roles in writing from the start.', love:'You are at ease in friend-like relationships that value respect over restriction. You tend to last with someone who protects each other’s time and space.', advice:['Conviction is a big strength but can sound like stubbornness. In one important decision, leave room for “I could be wrong” and hear one more person.', 'Separate what you decide alone from what you decide together. Check for one opposing view in shared decisions.']},
      '겁재':{line:['Compete and cooperate: more energy when someone runs beside you.', 'Competitiveness and cohesion. Speed rises when there is a comparison.'], nature:['The Rival god (劫財) shares the element of the day stem but not its polarity: like you but different, so both competitor and colleague. You have a drive to win and a gift for gathering people and growing the stage. Behind the smile you may be counting your next move.', 'Rival shares the element but not the polarity. Core: drive and cohesion. Results come in competition, but resources tend to leave together.'],
        career:'You tend to stand out in sales, sport, entertainment, negotiation or politics, where competition and networks turn into results. Gathering people is your strength when leading a team.', love:'You are drawn to relationships with excitement and passion. Practise adjusting rather than winning so it does not turn into a contest of pride.', advice:['As much comes in, the leak can grow just as big. Make one mood-proof device, like auto-saving a share of income first.', 'Agree a cost ceiling and roles before competing. Avoid reckless investment and guarantees.']},
      '식신':{line:['Steady expression and ease: polishing and sharing what you love.', 'Steady production. Skill builds when you repeat what you like.'], nature:['The Gentle Output god (食神) is what the day stem gives birth to, with the same polarity: food, craft and relaxed expression. You are naturally optimistic and generous and make people near you comfortable. You have an artisan’s habit of digging into one thing, and in tradition it softens the rough Pressure god.', 'Gentle Output is born of the day stem with the same polarity. Core: steady production and expression. Skill and income build together when you repeat what you like. It also restrains Pressure.'],
        career:'Suits work where hands and head make something: cooking, teaching, design, research, content. You perform best when you do what you love.', love:'You build warm relationships that look after and enjoy together. You tend to feel love in sharing good food and daily life.', advice:['With so much generosity, you can run dry giving to anyone. Keep one small rule that moves your body so comfort does not turn into slackness.', 'Start with a repeatable amount and leave something finished. Cap how far you give.']},
      '상관':{line:['Questioning the frame and finding a better way: wit and improvement.', 'Critical thinking and speech. Strong at finding and fixing problems.'], nature:['The Sharp Output god (傷官) is what the day stem gives birth to, with different polarity: quick thinking, a gift for words and frame-breaking creativity. You cannot just pass over what is unreasonable and ask “why?” where everyone else accepts. That edge can become improvement and innovation, or friction with superiors.', 'Sharp Output is born of the day stem with different polarity. Core: critical thinking and expression. It collides with Order (rules, superiors), so how you express decides the result.'],
        career:'You tend to shine in planning, marketing, media, law, consulting or creative work where new views and words are tools. Organisations with very tight rules may feel stifling.', love:'You are drawn to witty partners you can talk with. Boredom is hard for you, so relationships that try new things together suit you.', advice:['One sentence can win or lose a heart. When you are heated, breathe three times and attach one alternative to the point you raise.', 'Offer an alternative when pointing out a problem. Postpone decisions while emotions are high.']},
      '편재':{line:['Moving through a wide world, catching chances and moving people.', 'Spotting chances and circulating resources. Strong on the big picture and distribution.'], nature:['The Roving Wealth god (偏財) is what the day stem manages, with the same polarity: flowing money and a wide field of action. You do not fuss over small things, you see the big flow, and humour and sociability draw people to you. You are better at circulating money than storing it.', 'Roving Wealth is managed by the day stem with the same polarity. Core: spotting chances and circulating resources. Income and spending swing wide together.'],
        career:'Fits trade, distribution, sales, investment, overseas work and business development, where moving people and resources makes results.', love:'You like fun, bold relationships and are good at making a partner happy. Interest can scatter, so keep the time you give one person on purpose. In tradition this group also reads as a partner star for men.', advice:['With so many chances, unplanned spending comes easily. When money arrives, tie some of it first where it is hard to take out.', 'Set a loss limit before investing or spending. Lock in a fixed share of income right away.']},
      '정재':{line:['Saving step by step and guarding carefully: diligence and management.', 'Management and accumulation. Grows steadily in stable structures.'], nature:['The Steady Wealth god (正財) is what the day stem manages, with different polarity: honestly earned fixed income and thrifty management. You tap the stone bridge before crossing, weigh promises and credit heavily and see a task through, so people like to trust you with things.', 'Steady Wealth is managed by the day stem with different polarity. Core: careful management and steady accumulation. Assets grow through stable repetition rather than one big win.'],
        career:'You tend to show strength in systematic fields where accuracy and trust matter: accounting, finance, administration, management, pharmacy. A stable salary structure suits you.', love:'You value trust and stability most. You prefer a serious, lasting bond over a casual start and are strong at running a life together. In tradition this group also reads as a partner star for men.', advice:['Too much carefulness can make you stingy with your own joy. Now and then spend one small romance without calculating.', 'Set spending standards, but keep a separate budget for experiences and relationships.']},
      '편관':{line:['Enduring hard things and carrying duty: charisma and overcoming.', 'Response to pressure. Decides and endures in a crisis.'], nature:['The Pressure god (偏官), also called the seven killings (七殺), is what restrains the day stem, with the same polarity. It means strong pressure and trial, but comes with the strength and charisma to endure it. You value pride and honour and have a chivalrous wish to protect the weak. With Gentle Output or Resource nearby, this rough force is polished into authority.', 'Pressure restrains the day stem with the same polarity. Core: decisiveness under pressure. A strong day stem turns it into authority; a weak one feels it as stress.'],
        career:'You tend to prove yourself on tense, high-responsibility fronts: military, police, law, medicine, safety, crisis management. Leadership shows where discipline is clear.', love:'You want a partner who acknowledges and respects you, and once you give your heart you guard it to the end. In tradition this group also reads as a partner star for women.', advice:['You swallow hardship inside, so the heart may tire first. Make one outlet for pressure, like sweaty exercise or an absorbing hobby.', 'Write down your scope of responsibility. Release stress through regular routines such as exercise.']},
      '정관':{line:['Keeping to the right path and building trust: duty and order.', 'Principle and trust. Reputation builds inside a system.'], nature:['The Order god (正官) is what restrains the day stem, with different polarity: the rules and honour that shape you properly. You keep principles and take responsibility in your post, so you are called “someone you can rely on” everywhere. Face and reputation matter to you.', 'Order restrains the day stem with different polarity. Core: principle and trust. Rewarded with evaluation and promotion in organised workplaces.'],
        career:'You tend to shine where system and procedure are clear: public bodies, administration, education, large companies, management.', love:'You prefer polite, tidy relationships and are drawn to a reliable partner who keeps promises. In tradition this group also reads as a partner star for women.', advice:['A proper standard can become a frame that binds you. Once in a while choose what feels right to you before what others will see.', 'Keep the rules, but tell apart the rules that can change from the ones that must hold.']},
      '편인':{line:['Seeing hidden principles from an unusual angle: intuition and insight.', 'Intuition and an independent view. Sees what others miss.'], nature:['The Insight god (偏印), also called the owl god (梟神), gives birth to the day stem with the same polarity. You have strong intuition and inspiration and quick tact, so you notice first what others miss behind the surface. You are drawn to fields that dig deep, such as philosophy, psychology and technology, and you need time to think alone.', 'Insight feeds the day stem with the same polarity. Core: intuition and independent reading. Many ideas, but execution tends to lag.'],
        career:'Fits research, IT development, psychology, counselling, medicine and art, where exceptional insight and specialist knowledge are needed.', love:'You value a meeting of souls more than conditions and want to be understood without having to say it.', advice:['With so much depth, thoughts can circle in your head until the moment passes. Move one idea into your hands this week, however small.', 'Give each idea a first action date. End a review by a deadline.']},
      '정인':{line:['Learning and care given and received: study and backing.', 'Learning and backing. Study and recognition drive growth.'], nature:['The Care god (正印) gives birth to the day stem with different polarity: the care of a mother’s arms and study. You are warm and love to learn, building knowledge and credentials step by step. Help from elders and good fortune with people tend to follow.', 'Care feeds the day stem with different polarity. Core: learning and backing. Credentials, degrees and mentors turn into results.'],
        career:'You tend to do well where people learn and teach: education, academia, counselling, publishing, credential-based professions.', love:'You like a warmly caring partner, and your heart opens to spiritual connection and praise.', advice:['Once you are used to receiving love, deciding for yourself can get hard. Make small decisions yourself, one at a time, to build the muscle of independence.', 'Decide for yourself where the decision is yours. Tie learning to a date for putting it into practice.']}},

    /* ── ilju ── */
    il: {
      leadHead:['The four pillars Yeoni laid out', 'Neo’s assessment'], dayBadge:'{name} day stem', branchBadge:'Day branch {god}', stageBadge:'Twelve stage {stage}',
      leadText:['Your centre is the {name} ({dg}) day stem, and just below it the day branch {dj} sits as {god} in the {stage} position. Spreading out the four pillars, it reads like this.', '{name} ({dg}) day stem, day branch {dj} ({god} · {stage}). The table below is the basis.'],
      cap:'The four pillars', cols:['Pillar', 'Stem · god', 'Branch · god', 'Hidden stems', 'Twelve stage', 'Palace'], dayStemMe:'Day stem (self)',
      note:['The twelve stages are read from the day stem; yin stems run in reverse (the yin-born, yang-dead standard). The ages for the palaces are the traditional root, sprout, flower and fruit split.', 'Twelve stages follow the day stem, with yin stems running backwards. Palace ages are the traditional root–fruit division.'],
      imgHead:'Image of the {name} day stem', imgText:['The {name} day stem is {note}. Every character in a chart is read by its relation to this day stem, so knowing its grain is the first step of interpretation.', '{name} day stem: {note}. The day stem is the reference point, and the other seven characters are read by their relation to it.'],
      spouseHead:['The energy seated in the partner palace', 'Day branch · partner palace'],
      spouse:{same:['A Peer sits in the day branch, so something like you sits in the partner seat. An equal, friend-like bond is comfortable and lasts when each respects the other’s space.', 'Day branch Peer: an equal partner type. Rules that respect each other’s space are the key.'], drain:['Output sits in the day branch, so expression and care flow from the partner seat. Happiness comes easily in a bond where you enjoy things together and say what you feel.', 'Day branch Output: lots of expression and care. Emotional expression keeps the bond going.'], wealth:['Wealth sits in the day branch, so the partner seat carries energy for building real life together. A bond that plans daily life together and looks after it closely fits.', 'Day branch Wealth: a practical, life-planning bond. Make finances and role splits clear.'], control:['Authority sits in the day branch, so the partner seat carries duty and order. You want a solid bond of mutual trust and weigh promises heavily.', 'Day branch Authority: a bond centred on duty and trust. Agree expectations in words.'], parent:['Resource sits in the day branch, so the partner seat carries care and understanding. You are at ease in a bond of emotional leaning and learning together.', 'Day branch Resource: a bond of emotional support. Do not let dependence tilt to one side.']},
      stageText:['The twelve stage of the day branch is {stage}: {first}. In daily life it tends to show as {second}.', 'Day branch twelve stage {stage}: {desc}.'],
      stagesHead:['Four seasons of life by twelve stage', 'Twelve-stage flow'],
      gmHead:'Void branches (空亡)', gmText:['Void branches are the two branches left without a partner in the ten-day cycle the day pillar belongs to; the energy in those places is said to feel empty. Yours are {list}. {hit}', 'Void branches: {list}. {hit}'],
      gmHit:['In your chart, {list} fall on void branches. Those areas may not fill as much as you hope, but used for the spiritual side or for learning they are read as deepening.', 'In the chart: {list}. Expect weaker felt results there than hoped; spend it on substance and study instead of gain.'], gmMiss:['No other place in your chart falls on a void branch.', 'No place in the chart is affected.'],
      gmNote:['Schools weigh void branches differently, so please read them as a reference only.', 'Weight on void branches differs by school. Use as a reference only.'],
      wordHead:['Yeoni’s word', 'Neo’s one-line summary'],
      word:{'甲':['A straight-growing tree does not get big all at once. This week, cut one big goal into a step you can take today.', 'Direction-setting is a strength. Break the big goal into this week’s units.'], '乙':['Vines reach far by finding something to lean on. Asking for help is also your strength, so reach out first to one person this week.', 'Connection is a strength. Ask one collaborator first this week.'], '丙':['The sun shines on its own but the night of rest matters too. Book one slot today for the rest you postponed while lighting others.', 'Expression is a strength. Put rest in the schedule first to avoid burn-out.'], '丁':['A lamp is warmest when it lights a near place for a long time. Today tell one person beside you, concretely, that you are grateful.', 'Focus is a strength. Narrow the scope and finish one thing.'], '戊':['A mountain gives trust by not moving. Sometimes let the wind pass too: answer “yes” to one new proposal this week.', 'Stability is a strength. Test one new proposal this week.'], '己':['A field changes with what is planted. In the field you tilled for others, plant one seed for yourself today.', 'Practicality is a strength. Assign one resource this week to investing in yourself.'], '庚':['Iron meets fire and becomes a useful tool. Today, do not avoid one hardship that tempers you: handle a little of it.', 'Decisiveness is a strength. Start one hard task you postponed today.'], '辛':['A jewel shines more when it takes care of itself. Say to yourself once today that it is fine not to be perfect.', 'Your standards are high. Practise sharing at 80% done.'], '壬':['A great water flows far only with banks. From the interests you have spread wide, pick the one to hold this week.', 'Your view is wide. Fix one priority this week.'], '癸':['Dew is small but wets exactly where it is needed. Jot down one gut feeling from today and it will guide you later.', 'Intuition is a strength. Note your reasons and check them.']}},

    /* ── flow ── */
    fl: {
      names: ['A flow needing much adjustment', 'A flow needing some adjustment', 'An ordinary flow', 'A smooth flow', 'A very smooth flow'],
      yearTitle: 'Your year (annual cycle) {gz}', yearPre: '{year} · ', periodTitle: 'Where you are now (current ten-year cycle) {gz}',
      age: ' · ages {a}–{b} (Korean age)', badgeScore: 'Flow score {score}', badgeYear: 'Annual cycle · one year', badgePeriod: 'Ten-year cycle · ten years', ends: ['Needs adjusting', 'Smooth'], caption: 'Flow score {score}', aria: {year:'This year’s flow score {score}', period:'Current ten-year cycle flow score {score}'},
      relNotes: {chung:'A push toward change or movement', transformed:'Combination transformation conditions met', he:'An occasion for bonding and cooperation'},
      relTypes: {stemChung:'Stem clash (天干沖)', branchChung:'Branch clash (地支沖)', stemHe:'Stem combination (天干合)', branchHe:'Branch combination (地支合)'},
      tblCap: {year:'Annual cycle pillar and your day stem', period:'Ten-year cycle pillar and your day stem'}, tblCols: ['Character', 'Element', 'Ten god', 'Twelve stage', 'In strength'], stemRow: 'Stem {c}', branchRow: 'Branch {c}', hiddenNote: 'Hidden stems of branch {c}: {list}',
      family: {same:['A cycle of energy like your own, so the wish to decide and stand alone tends to grow. Competition with colleagues can grow too, so setting shares first helps.', 'Peers cycle: independence and competition issues increase. Set shares and rules for shared resources first.'], drain:['A cycle of pouring what is inside out, so expressing, making and teaching tend to go well. A lot of energy leaves, so plan recovery time as well.', 'Output cycle: expression and production grow. Raise output but set a standard for managing drain.'], wealth:['A cycle when practical results and money catch the eye. It is a good time to widen the work, and writing down the range you can handle in numbers steadies the mind.', 'Wealth cycle: results and finance issues grow. Fix the ceiling of expansion in numbers.'], control:['A cycle in which duty and roles get heavier. Chances of recognition come along with bigger burdens, so sort what to take on from what to put down.', 'Authority cycle: duty and evaluation pressure grow. Separate roles to accept from roles to decline.'], parent:['A cycle when learning and help arrive. Studying, gaining qualifications or meeting a good adviser comes easily, so turn what you receive into small actions.', 'Resource cycle: learning and support arrive. Schedule turning input into action.']},
      noRel: ['No place directly combines or clashes with the characters in your chart.', 'No direct combination or clash with the chart.'],
      tone: {open:['The flow reads as smooth. Try the things you have prepared on a small scale first. The score is a reference for comparison and does not promise a result.', 'An easier band on the assessment. Run prepared work at small scale. The score does not guarantee results.'], even:['It reads as an ordinary flow that neither pushes nor pulls hard. Keep going with what you do and just check the direction now and then. The score is a reference for comparison and does not promise a result.', 'A middle band on the assessment. Keep ongoing work and check the direction. The score does not guarantee results.'], care:['It reads as a flow that needs adjusting. Lower the speed and tidy roles and schedules, and the same period becomes much easier. Please do not make big decisions on the score alone.', 'An adjustment band on the assessment. Tidy schedules and roles and keep options open. Do not conclude from the score alone.']},
      free: '※ Everything up to here is free. The full ten-year flow, the details of each annual cycle and the comprehensive reading continue in Premium below.'},

    /* ── daily ── */
    da: {
      dayTitle: 'Today’s day pillar {gz}', monthTitle: 'This month’s monthly pillar {gz}', today: 'today', month: 'this month', badge: 'Energy {bp}%',
      names: ['Recover first', 'Steady', 'Smooth', 'Strong momentum'], ends: ['Slow down', 'Strong'], caption: 'Energy gauge {bp}%', aria: 'Energy gauge {bp}% for {when}',
      tags: {fast:'Accelerate', even:'Balanced', rest:'Pause'}, boost: '{el} boost', tblCap: 'Energy arriving {when} and your day stem',
      godHead: ['Reading {when} by ten gods', 'Judgement by ten god'], nothing: ['No clash with your chart stands out. Read an important message once more before sending.', 'No notable relation. Recheck important messages before sending.'], checkHead: ['Please keep in mind', 'Checkpoints'],
      boostHead: 'Lucky booster', boostLabel: 'Element to add', boostNote: ['A light everyday tip for adding what is lacking. Enjoy it as a small change of mood.', 'An everyday tip for supplementing the key balance element. No effect is guaranteed.'],
      god: {'비견':['A time when your own judgement gets clearer. Deciding alone is fine, but write the reason in one line so you do not waver later.', 'Independent judgement is favourable. Record the reason in one line.'], '겁재':['Competitiveness and drive rise together. Postpone impulsive spending or bets by a day and you will feel easier.', 'Competition and impulse grow. Hold impulsive spending for a day.'], '식신':['Joy and ideas well up. Make one idea you have into something, however small, right away.', 'Productivity rises. Move one idea into an action step now.'], '상관':['Words and expression carry weight. Good for presentations and creative work; read a contract or an official statement once more before sending it out.', 'Expression strengthens. Recheck official documents and statements before release.'], '편재':['Chances and swings grow together. Start with small things you have confirmed rather than big bets.', 'Chance and volatility are both large. Proceed with small, verified items.'], '정재':['A time when careful practical work shines. Sorting income and spending once will lighten your mind.', 'Accuracy rises. Sort your income and spending records.'], '편관':['You may feel pressure. Rather than shouldering all of it, pick one thing you will keep and hold on, and it returns as trust.', 'Pressure comes. Focusing on one core duty returns as trust.'], '정관':['A time when duty and trust show. Good for official papers and procedures.', 'Suited to official procedures. Make your scope of responsibility clear.'], '편인':['Intuition grows sharp. Jot down the hunches that come and check them in a small way.', 'Intuition leads. Record hunches and run a small check.'], '정인':['A good time for learning and sorting things out. Asking a trusted person for advice makes your thinking clear.', 'Learning and analysis are efficient. Ask a trusted adviser.']},
      tone: {open:['Energy comes in with some strength. Pick one thing to do and finish it first, and you can ride the flow well.', 'Energy-surplus band. Finish one top-priority item first.'], care:['A time to look after your inner battery first. Slow down a little, and mistakes drop and relationships ease.', 'Energy-care band. Lower the speed and add one more check step.']},
      sumHead: ['Yeoni’s word', 'Neo’s summary']}
  };

  COPY.ja = {
    voice: ['Yeoni', 'Neo'],
    sep: '、',
    el: {wood:'木', fire:'火', earth:'土', metal:'金', water:'水'},
    fam: {same:'比劫（仲間）', parent:'印星（支え）', drain:'食傷（表現）', wealth:'財星（現実）', control:'官星（責任）'},
    famMeaning: {same:['自分と同じ気', '仲間意識と自立心'], parent:['あなたを支える気', '学びと後ろ盾'], drain:['外へ出していく気', '表現と才能'], wealth:['あなたが扱う気', '資源と現実的な成果'], control:['あなたを形づくる気', '責任と秩序']},
    pos: {yg:'年干', yj:'年支', mg:'月干', mj:'月支', dg:'日干', dj:'日支', hg:'時干', hj:'時支'},
    palace: {y:{label:'年柱', palace:'祖先・幼少期', span:'0〜15歳', domain:'ルーツ・家族・幼い頃の環境'}, m:{label:'月柱', palace:'両親・青年期', span:'16〜30歳', domain:'両親・きょうだい・社会への入口'}, d:{label:'日柱', palace:'自分・配偶者', span:'31〜45歳', domain:'自分自身と配偶者の宮'}, h:{label:'時柱', palace:'子ども・晩年', span:'46歳〜', domain:'子ども・晩年・結実'}},
    role: {'용신':'要の調和（用神）', '희신':'支え（喜神）', '기신':'負担（忌神）', '구신':'さらなる負担（仇神）'},
    roleShort: {'용신':'要の調和', '희신':'支え', '기신':'負担', '구신':'さらなる負担'},
    noonMark: '（正午で仮定）', unknownCell: '不明', none: '—',
    stem: {'甲':'甲（陽の木）', '乙':'乙（陰の木）', '丙':'丙（陽の火）', '丁':'丁（陰の火）', '戊':'戊（陽の土）', '己':'己（陰の土）', '庚':'庚（陽の金）', '辛':'辛（陰の金）', '壬':'壬（陽の水）', '癸':'癸（陰の水）'},
    animal: {'子':'鼠', '丑':'牛', '寅':'虎', '卯':'兎', '辰':'龍', '巳':'蛇', '午':'馬', '未':'羊', '申':'猿', '酉':'鶏', '戌':'犬', '亥':'猪'},
    godShort: {'비견':'比肩', '겁재':'劫財', '식신':'食神', '상관':'傷官', '편재':'偏財', '정재':'正財', '편관':'偏官', '정관':'正官', '편인':'偏印', '정인':'正印'},
    stemNote: {
      '甲':'天へまっすぐ伸びる大樹のように、方向を定めて先頭に立ち、誇りを守る気質',
      '乙':'曲がっても折れない蔓や花のように、柔らかく粘り強く、暮らしを整えるのが上手な気質',
      '丙':'すべてを照らす太陽のように、明るく表現豊かで存在感のある気質',
      '丁':'暗がりの灯のように、繊細で温かく、奥行きのある気質',
      '戊':'どっしりした大きな山のように、安定して信頼でき、中心がぶれない気質',
      '己':'肥えた畑のように、現実的で包容力があり、実務に強い気質',
      '庚':'鉱石や鋼のように、決断力があり義理堅く、勝負強い気質',
      '辛':'磨かれた宝石のように、感受性が鋭く几帳面で、美意識に長けた気質',
      '壬':'大河や海のように、考えが広く柔軟で、器の大きな気質',
      '癸':'露や泉のように、澄んで感受性が高く、静かに生命力を湛えた気質'},
    stage12: {
      '장생':['長生', '育ち始めの時期・学びと始まりの力'], '목욕':['沐浴', '世界と初めて触れる時期・好奇心と感受性、変化'],
      '관대':['冠帯', '社会へ踏み出す時期・自信と推進力'], '건록':['建禄', '自分の力で稼ぐ時期・自立と実務能力'],
      '제왕':['帝旺', '気が最も満ちる時期・主導力と強い自負'], '쇠':['衰', '頂点を過ぎて円熟する時期・経験と配慮'],
      '병':['病', '気が静まり細やかになる時期・共感と思いやり'], '사':['死', '動きが止まり思索が深まる時期・集中と探究'],
      '묘':['墓', '蔵へ収める時期・貯蓄と管理、中身づくり'], '절':['絶', '過去と断ち切って変わる時期・転換と決断'],
      '태':['胎', '新しい命が宿る時期・計画と可能性'], '양':['養', '守られて育つ時期・準備と手入れ']},
    hidden: {first:'余気', mid:'中気', last:'本気'},
    ganji: '年・月・日・時',

    /* ── climate ── */
    temp: ['寒い側', 'やや涼しい側', '寒暖が均衡', '暖かい側', '熱い側'],
    moist: {dry:'乾き気味', balanced:'均衡', wet:'湿り気味'},
    season: {spring:'春', summer:'夏', autumn:'秋', winter:'冬'},
    env: {
      colddry:{title:'静かに整った冬の山小屋', text:['この気候では、落ち着いた理性と明確な境界線が際立ちます。騒がしくない静かな場所で集中力が戻ります。分析・企画・研究のように一人で深く掘り下げる仕事が合いやすく、礼儀正しい適度な距離はそのまま信頼になりやすいでしょう。心を開くのに時間がかかることを身近な人に早めに伝えると、誤解が減ります。', '環境タイプ：冬の山小屋。静かで整った環境で集中力が上がる。適職は深く掘る仕事（分析・企画・研究）。人間関係では保たれた境界が信頼になる。感情表現が遅いことを事前に共有する。']},
      coldwet:{title:'夜明けの霧がかかる湖', text:['表面は静かでも、水面下では考えと感情が密に結びついています。内面や深い対話を分かち合える場で力が湧きます。人の裏側を読むカウンセリング・心理・芸術などが合いやすく、ゆっくり育てた親密さは長続きします。思考が沈みがちな日は、日光や軽い運動で温もりを足してください。', '環境タイプ：夜明けの湖。外は静か、内側は重い処理。適職は人の裏側を読む仕事（相談・心理・芸術）。関係はゆっくり深まる。思考が沈むときは日光と軽い運動でリズムを上げる。']},
      hotdry:{title:'真昼の砂漠', text:['目標が見えたらためらわずに動きます。決断が早く、根に持たないので、スピードが求められる場面で成果を出しやすいタイプです。立ち上げ・営業・短期プロジェクトが合いやすく、本心を隠さないところも魅力です。熱が上がってきたら、隣の人のペースをときどき確かめてください。', '環境タイプ：真昼の砂漠。目標が決まれば直進し、決断も速い。適職はスピード勝負の仕事（立ち上げ・営業・短期案件）。率直さは強み。加速するときは相手のペースを確認する。']},
      hotwet:{title:'生命力あふれる夏の森', text:['人と交わって成長するタイプです。好奇心と親しみやすさが大きく、人が集まる場所ならどこでも気が巡ります。教育・人事・マーケティング・執筆など、コミュニケーションが中心の仕事が合いやすく、感情を豊かに分かち合うことで経験を積みます。予定が詰まりやすいので、一人で息をつく時間を先に確保してください。', '環境タイプ：夏の森。人の間で気が動き、成長する。適職は対話が中心の仕事（教育・人事・マーケティング・執筆）。感情表現は豊か。予定が詰まりやすいので、一人の時間を先に確保する。']}},
    rx: {
      hot:{need:'水 · 金', color:'青、黒、白', dir:'北、西', act:'水辺の散歩、水泳、ぬるめの足湯、瞑想', less:'激しい運動、暑い場所、赤の使いすぎ'},
      warm:{need:'水', color:'青、水色、ミント', dir:'北', act:'こまめな水分補給、渓流や海辺への小旅行、クールダウンのストレッチ', less:'暴飲暴食、夜食'},
      neutral:{need:'季節に合わせた調整', color:'季節に応じて変える', dir:'固定しない', act:'春と秋は木・金の活動、夏は水、冬は火・木の活動', less:'どちらかに偏ったリズム'},
      cool:{need:'火 · 木', color:'オレンジ、緑、暖かい赤', dir:'南、東', act:'日光浴、半身浴、ストレッチやヨガ', less:'冷たい食べ物、冷房の中での長時間滞在'},
      cold:{need:'火 · 木', color:'赤、オレンジ、明るい緑', dir:'南、東', act:'温かい食事、熱めの入浴、体を温める有酸素運動、たっぷりの日光', less:'冷水浴、強い冷房、暗い色ばかりの服装'}},
    moistRx: {dry:{need:'水 · 木', act:'こまめな水分補給、加湿、森や水辺の散歩、観葉植物を置く'}, wet:{need:'金 · 火', act:'こまめな換気、日に干した寝具、白や金のアクセント、人間関係での明確な線引き'}, balanced:{need:'特になし', act:'湿と乾が釣り合っているので、温度の面に集中する'}},
    rxLabel: ['足す気', '色', '方角', '行動', '控えめに', '湿度のバランス'],
    climate: {
      tempBadge:'温度スコア {s}',
      lead:['Yeoniが読んだ気候', 'Neoの気候判定'], env:['気候で見るあなたの環境', '気候による環境タイプ'], parts:'文字別の温度と湿度', count:'温度を動かす四つの気',
      verdict:['あなたは{season}の月に生まれました。季節が決める基準温度は{base}で、八字の暖かさと冷たさを足すと温度スコアは{score}、「{type}」と読めます。湿り気は湿の兆し{wet}・乾の兆し{dry}で、{moist}です。', '判定：{type}、湿度：{moist}。{season}の月の基準{base}に各文字の寄与を足して温度スコア{score}。湿{wet}・乾{dry}。'],
      versus:['気候のバランスと強弱のバランス', '気候バランスと強弱バランスの比較'], rx:'気候バランスのガイド · 日常でできる調整',
      rxIntro:['伝統的な命式では足りないものを象徴で補いますが、ここでは日常の言葉に置き換えました。気に入ったものを一つだけ選んで、一週間ほど試してみてください。', '足りないものを補う日常の方法です。一つ選んで一週間続け、体調の変化を記録してください。'],
      note:'この提案は伝統的な象徴体系を言い換えたもので、健康・医療上の助言ではありません。体に不調を感じたら、まず専門家に相談してください。',
      warm:'暖', cold:'寒', tags:{fire:'火', wood:'木', metal:'金', water:'水'}, tagNotes:{fire:'暖 +1.5', wood:'暖 +0.5', metal:'寒 −0.5', water:'寒 −1.5'},
      cols:['位置', '文字', '五行', '温度', '湿・乾'], base:'季節の基準', total:'合計', dampWord:'湿', dryWord:'乾',
      gaugeTemp:{ends:['寒', '暖'], caption:'温度スコア {score}', aria:'温度ゲージ：スコア {score}、{type}'},
      gaugeHumid:{ends:['燥', '濕'], caption:'湿 {wet} · 乾 {dry}（差 {diff}）', aria:'湿度ゲージ：湿の兆し{wet}、乾の兆し{dry}、{moist}'},
      vNone:['温度が均衡しているため、気候の面で急いで足すべき気はありません。強弱の側から要の調和を読めば十分です。', '温度は均衡。気候上、急ぐ気はない。強弱バランスを中心に判断する。'],
      vJong:['気候では{need}の気が歓迎されます。ただしこの命式は従格として見立てたので、集まった勢いに従うことを優先し、気候は日常の補助として扱ってください。', '気候は{need}を求める。従格のため、集まった勢いに従うのが先。'],
      vSame:['気候で歓迎される{need}の気は、強弱で見た要の調和（{yong}）と重なります。二つの見方が同じ方向を指しているので、この気を身近に保ち続けるのが最も明快な補い方です。', '気候の必要（{need}）が強弱の要の調和（{yong}）と重なる。方向が同じで、補う優先順位は明確。'],
      vExtreme:['気候は{need}、強弱は{yong}を指していて、方向が少し異なります。温度が大きく片側に傾いているので、気候の季節バランスを先に置き、強弱は二番目に読んでください。', '気候は{need}、強弱は{yong}。方向が異なる。温度が極端なので気候が先導し、強弱が補う。'],
      vMild:['気候は{need}、強弱は{yong}を指していて、方向が少し異なります。温度は極端ではないので、強弱から出る要の調和を中心にし、気候は季節の助けとして扱ってください。', '気候は{need}、強弱は{yong}。方向が異なる。温度は極端でないので強弱が先導し、気候が補う。'],
      vNote:['気候は生まれた季節の温度と湿度を、強弱は日干の力が大きいか小さいかを見ます。どちらか一つだけを答えとはせず、命式によってどちらを先にするかが決まります。', '気候は季節の温湿度、強弱は日干の力の過不足を読む。どちらか一方だけが答えではない。'],
      what:'暖・寒・燥・湿とは？', whatText:['命式の温度（寒い・熱い）と湿度（乾き・湿り）を表す言葉です。自然に季節や天気があるように、人の気質にも気候があるとされ、どんな環境で安らぎ、力を発揮しやすいかが見えてきます。', '命式の温度と湿度。どの環境で力が活きるかを示す。'],
      four:[['寒', '冬の凝縮した気。内側へ固める、落ち着いて慎重な力と読みます。'], ['暖', '夏の外へ向かう気。情熱と表現、外へ伸びる力と読みます。'], ['燥', '秋の引き締まった気。きっぱりした区切りと、すっきりした質感と読みます。'], ['濕', '春の絡み合う気。共感と親しみやすさ、共に育つ力と読みます。']],
      how:'計算方法：月支が基準温度を決めます（子・丑 −4、亥 −3、戌 −2、寅・酉 −1、卯・申 +1、辰 +2、巳 +3、午・未 +4）。寅は立春後もまだ寒さが残り、申は立秋後もまだ暑さが残ると見ます。八字全体では、火が +1.5、木が +0.5、金が −0.5、水が −1.5 を加えます。湿は水・木・辰・丑、乾は火・金・戌・未を数えて比べます。スコアが 5 以上なら熱い、2 以上なら暖かい、−2 以上なら均衡、−5 以上なら涼しい、それ未満は寒いと読みます。'},

    /* ── strength ── */
    stage: ['非常に弱い', '弱い', '弱め（均衡に近い）', '強め（均衡に近い）', '強い', '非常に強い'],
    strengthLead: ['Yeoniが読んだ強弱', 'Neoの強弱判定'],
    str: {
      jongHead:['従格（從格）', '従格'],
      jongLead:['あなたの命式は、{dom}の気が{pct}集まり、{name}として見立てました。このような構造は一般的な強弱の物差しでは測らず、集まった勢いに従って読みます。', '判定：{name}。{dom}の気{pct}が命式を主導。通常の強弱の公式は適用しない。'],
      jongBadge:'強弱 {score}（参考）', jongPct:'{pct}%ほど',
      jongWhat:'従格（從格）とは？', jongWhatText:['一つの五行が全体を圧倒するほど強いとき、逆らうよりその勢いに従う方が自然とされます。そのため上の強弱スコアは参考にとどめ、下の構造の説明を中心に読みます。', '一つの五行が命式を圧倒するときは従うのが処方。強弱スコアは参考値。'],
      jongKind:{wood:'木が主導する構造で、まっすぐ伸びる成長と企画の気をそのまま使うと自然です', fire:'火が主導する構造で、明るい情熱と表現を使うと自然です', earth:'土が主導する構造で、積み上げて守る気に従うと自然です', metal:'金が主導する構造で、決断力と磨き上げる強さを使うと自然です', water:'水が主導する構造で、流れる柔軟な知恵を使うと自然です', parent:'印星に圧倒された構造で、学びと後ろ盾の大きな流れに乗ります', drain:'食傷に圧倒された構造で、才能と表現を世に出す流れに従います', wealth:'財星に圧倒された構造で、資源と現実的な成果の流れに乗ります', control:'官星に圧倒された構造で、組織と責任の大きな流れに乗ります', change:'干が合して一つの気に変わった化格で、その新しい気を中心に読みます', other:'単一の気が主導する特殊な構造で、その勢いに従うと自然です'},
      kindHead:['あなたの構造', '構造タイプ'], dirHead:'運の方向',
      dirText:['{dom}の気を養う運のときは流れが滑らかに続きやすく、その勢いに逆らう運では調整がより必要になることがあります。力を広く散らすより、生まれ持った強みを一つ深める方がこの構造に合います。', '{dom}の気を養う運は順調に流れやすく、逆らう運は調整が増える。強みを一つに集中する。'],
      gaHead:'仮従格（假從格）', jinHead:'真従格（眞從格）に近い構造',
      gaText:['日干を支える弱い根が残っているため、運とともに従格として落ち着くことも、通常の構造に戻ることもあります。実際に歩んできた経験と照らし合わせてみてください。', '弱い支えの根が残る。運によって従格に定まるか通常構造に戻るか分かれる。経歴と照合する。'],
      jinText:['優勢な五行に従う流れがはっきりしています。', '優勢な五行に従う流れが明確。'],
      leadNormal:['あなたの強弱スコアは{score}で、{stage}と読みます。強弱の境は30で、{stem}の日干はそれより{gap}点{dir}にあります。', '判定：{stage}（{sw}）。強弱スコア{score}、基準30から{gap}点{dir}。'],
      above:'上', below:'下', strongWord:'強', weakWord:'弱',
      tagStrong:['自分で動くタイプに近い人です。', 'タイプ：自走型。'], tagWeak:['繊細で気配りができ、協力的なタイプに近い人です。', 'タイプ：気配り・協調型。'],
      badge:'強弱 {score}', baseBadge:'基準 30', typeStrong:'自走型', typeWeak:'協調型',
      gauge:{ends:['弱い側', '強い側'], baseLabel:'基準 30', caption:'強弱スコア {score}（基準30）', aria:'強弱ゲージ：スコア {score}、{stage}、基準30'},
      threeHead:['その背景にある三つの力', '季節・支・支え'], threeCap:'季節・支・支え', threeCols:['要素', '文字', '判定', '点数'],
      rowMonth:'季節・月支', rowDay:'足場・日支', rowRest:'支え・残りの五字', vMonthPos:'得た', vMonthNeg:'失った', vFootPos:'根づいている', vFootNeg:'根がない', vRestPos:'支えられている', vRestNeg:'支えが少ない', vFlat:'同じ', sumLabel:'合計',
      partsOpen:['文字別の点数を見る', '文字別の点数'], partsCap:'文字別の強弱点数', partsCols:['位置', '文字', '五行', '日干との関係', '点数'],
      whyHead:['なぜ{sw}なのか', 'なぜ{sw}か'],
      monthRel:{same:['得た', '月が日干と同じ五行なので、根がしっかりしています。', '月支が日干と同じ五行。根が堅い。'], parent:['得た', '月が日干を生む印星の月なので、多くの支えを受けます。', '月支は印星で日干を生む。支えが強い。'], control:['失った', '月が日干を抑える官星の月なので、気が押されやすくなります。', '月支は官星で日干を抑える。気が押される。'], drain:['失った', '月が日干の気を外へ出す食傷の月なので、気が外へ流れ出ます。', '月支は食傷で日干の気を漏らす。気が外へ流れる。'], wealth:['失った', '月が日干の扱う財星の月なので、力を使う立場に立っています。', '月支は財星で日干が扱う対象。力を使う位置。']},
      whySeason:['生まれた月（季節）を見ると、{tag}です。{rel} ', '季節：{tag}。{rel} '], whyNeutral:['生まれた月と日干は中立的な関係です。', '季節は中立。'],
      whySum:['日支とその他の文字が日干に与えるものと奪うものを足すと、{score}点になります。', '季節に日支と他の文字の支えと圧力を足して合計{score}点。'],
      whyStrong:'自分の足で立つ力が十分にあるので、強いと読みます。', whyWeak:'外からの要求に比べて自分の力が少し足りないので、弱いと読みます。欠点ではなく、感受性と柔軟さの土台です。',
      stemHead:['{stem}の日干の質感', '日干 {stem}'],
      stemStrong:['力が十分にあるので、外へ使うほど輝きます。成果を分かち合い、人を助け、責任ある役割を担うとバランスが取れます。すべてを一人で抱え込むと息苦しくなりやすいでしょう。', '余力があるので、外へ使うと効率が上がる。成果を共有し、責任ある役割を担う。'],
      stemWeak:['あなたの力は、あなたを認めてくれる人や環境のそばで最もよく活きます。前に出ようと押すより、学び・準備・協力で先に根を張ってください。', '資源が不足気味。準備・学び・協力で根を固める。無理に主導すると損が大きい。'],
      stemLine:['{stem}：{note}。', '{stem}：{note}。'],
      godHead:['あなたを支える気 · 気をつける気', '要の調和／負担'], godTags:{good:['要の調和', '支え'], care:['負担', 'さらなる負担']},
      godText:['要の調和と支えの五行が運として巡ってくると、物事が順調に進み、助けにも出会いやすくなります。負担の五行が強まるときは、大きな拡大や決断の前に一拍置いて、少し長く見てください。', '要の調和と支えの五行が運で巡ると順調。負担の五行が強まるときは拡大の速度を落とす方が安全。'],
      godWhat:'要の調和・支え・負担・さらなる負担とは？', godWhatText:'要の調和（用神）は命式が均衡のために最も必要とする五行、支え（喜神）はそれを助ける五行です。負担（忌神）は要の調和を損なう五行、さらなる負担（仇神）は負担を育てる五行、中立（閑神）はどちらにも傾かない五行です。この命式の計算では五行すべてを支える側と負担になる側に分けるため、別枠の中立は置いていません。',
      cycHead:'運の方向を一目で', cycStrong:['食傷・財星・官星の運は、気を外へ使って成果に変えるもので、社会的な結果が実りやすい時期です。', '食傷・財星・官星の運（力を外へ使って成果にする）が追い風。'], cycWeak:['比劫・印星の運は、あなたを満たして支えるもので、自信と助けが一緒に届きやすい時期です。', '比劫・印星の運（満たされ支えられる）が追い風。'],
      what:'強弱（抑扶）とは？', whatText:'強弱は、日干が強すぎれば抑え（抑）、弱ければ引き上げる（扶）ことで均衡を探す見方です。この命式では月支の比重が最も大きく（同じ五行 +40、印星 +27、官星 −27、食傷 −10）、日支は同じ五行か印星なら +13、官星なら −9、残りの五字は同じ五行か印星なら +7、官星なら −7 です。合計 30 以上を強い、それ未満を弱いと読み、段階の名前は点数帯のラベルにすぎません。このスコアは人の能力や価値の等級ではありません。'},

    /* ── ten gods ── */
    godName: {'비견':'比肩（ひけん）', '겁재':'劫財（ごうざい）', '식신':'食神（しょくじん）', '상관':'傷官（しょうかん）', '편재':'偏財（へんざい）', '정재':'正財（せいざい）', '편관':'偏官（へんかん）', '정관':'正官（せいかん）', '편인':'偏印（へんいん）', '정인':'正印（せいいん）'},
    ten: {
      lead:['Yeoniが見た十神の重み', 'Neoの十神判定'], most:['最多のグループ {n}', '最多 {n}'], mostBadge:['最多のグループ：{n}字', '最多：{n}字'], noneBadge:['空：{list}', '不在：{list}'], allBadge:['五つのグループがそろう', '欠けるグループなし'],
      leadText:['日干を除く七字のうち、最も比重が置かれているのは{top}です。{meaning}の質感が日常に表れやすいでしょう。{tail}', '判定：{top}が主導（日干を除く七字のうち{n}字）。{tail}'],
      tailNone:['一方、{list}は表には表れていません。', '不在：{list}。'], tailAll:['五つのグループがすべて表に出ているので、道具箱はバランスよくそろっています。', '五つのグループすべてが存在。'],
      distHead:['五つのグループの分布', 'グループ別の分布'], distCap:'十神の分布', cols:['グループ', '表', '蔵干', '細かい十神', '強弱での役割'],
      distNote:['表の数は日干以外の三つの干と四つの支を数えたもの、蔵干は支の中に隠れたすべての干を数えたものです。数が多いほど良い・悪いということはありません。', '表：日干を除く三干四支。蔵干：支の中のすべての干。数は順位でも成功の確率でもない。'], noonNote:['時干と時支は正午で仮定しています。', '時干・時支は正午の仮定。'],
      notesHead:['強い気 · 空の気', '過多と不在'],
      hiddenOnly:['{fam}は表にはありませんが、蔵干に{n}つあります。必要なときにゆっくり取り出す潜在力として読んでください。', '{fam}：表に不在、蔵干に{n}。後から引き出す潜在力。'],
      over:{same:['比劫が多く、自立心と誇りが際立ちます。一人でも多くをこなせますが、取り分で衝突しやすいので、お金が絡む協力の前にルールを決めておきましょう。', '比劫が過多：主張が強く競争が多い。共有資金や協力関係は先にルールを決める。'], drain:['食傷が多く、表現と才能があふれています。アイデアも言葉も豊富ですが、外へ出しすぎると疲れやすくなります。始めたことを終わらせる習慣が、才能を成果に変えます。', '食傷が過多：表現と生産が多く消耗も大きい。始めるのと同じだけ終える予定を入れる。'], wealth:['財星が多く、現実感覚とお金の活動が際立ちます。多くの仕事と世話をする人に追われて忙しくなりやすいでしょう。', '財星が過多：実務と管理対象が多い。'], control:['官星が多く、責任と期待が重く感じられることがあります。役割が増えるほど、明確な基準が助けになります。', '官星が過多：責任と外からの期待が重い。先に役割の境界を決める。'], parent:['印星が多く、思考と学びが深くなります。ただ、受け取ることに慣れると行動が遅くなりがちです。', '印星が過多：思考と学びが深く、行動が遅い。']},
      none:{same:['比劫が表にないので、一人で踏ん張るより周りと調整することが先に来ます。疲れたときに頼れる仲間を一人確保しておきましょう。', '比劫が不在：単独の推進より調整。協力者を確保する。'], drain:['食傷が表にないので、内面を外へ出す道が細いかもしれません。書く・メモするなど、意識して出口を作りましょう。', '食傷が不在：表現の経路が細い。メモや対話などの出力ルーティンを作る。'], wealth:['財星が表にないので、お金より意味や人を追いかけがちです。お金の管理は習慣と道具で補えます。', '財星が不在：金銭感覚は仕組みで補う。'], control:['官星が表にないので、枠に縛られない自由が大きい命式です。自分で決めた締め切りやルールが軸を保ちます。', '官星が不在：外からの規律が弱い。自分で締め切りとルールを決める。'], parent:['印星が表にないので、他人の助けより、ぶつかって学ぶことが多くなりがちです。休息と信頼できる相談相手の余地を意識して作ってください。', '印星が不在：実践で学ぶ型。休息と相談相手を予定に入れる。']},
      noneTail:['グループが均等に分かれていて、強い過多も欠落もありません。状況に応じて複数の道具を使い分けられる、バランスの取れた構造です。', '過多（三つ以上）も不在もなし。道具が均等に分布。'],
      comboHead:['注目したい組み合わせ', '構造上の組み合わせ'],
      combos:[{name:'食傷が財を生む（食傷生財）', text:['食傷と財星がそろっているので、才能が収入へ流れやすい構造です。好きなことを安定した仕事にすると、お金につながりやすいでしょう。', '食傷から財星へ。才能を商品化すると稼ぎやすい。']}, {name:'官が印を生む（官印相生）', text:['官星と印星がそろっているので、責任が学びになり、学びが実力になります。組織の中で資格と評判が一緒に積み上がりやすいでしょう。', '官星→印星→日干。組織での資格と評判に有利。']}, {name:'食神が殺を制す（食神制殺）', text:['食神が偏官を抑えています。圧力が来たときに、腕前で解決する力があります。', '食神が偏官を制す。圧力を技術で解決する。']}, {name:'傷官が官に見える（傷官見官）', text:['傷官と正官がそろっているので、自分の考えとルールがぶつかることがあります。意見を述べるときに手順を踏むと、鋭さが説得力に変わります。', '傷官と正官が共存。ルールとの衝突が起きやすいので、手順を通して意見を述べる。']}, {name:'官殺混雑', text:['正官と偏官がそろっているので、責任や役割がいくつもの方向で重なることがあります。優先順位を明確にすると混乱が減ります。', '正官と偏官が同時にある。役割が重なるので優先順位を固定する。']}],
      what:'十神（十星）の読み方', whatText:['十神は、日干から見た他の文字との関係を十種類に分けたものです。同じ五行は比劫、自分が生むものは食傷、自分が扱うものは財星、自分を扱うものは官星、自分を生むものは印星です。陰陽が同じなら「偏」、異なれば「正」とします（比肩と劫財は例外です）。', '干は外に見せる姿、支は暮らしの土台、蔵干はまだ表れていない潜在力を示します。ここでの支の十神は、このサービスの基準に従い、支の五行と陰陽で判定しています。'],
      cardMore:'もっと読む', cardAt:'{at} · {more}', modalCap:'{god}の位置', modalCols:['位置', '文字', '宮', '表れる領域'], outer:'外に見せる姿', base:'暮らしの土台', sitHead:['命式のどこにあるか', '根拠'],
      sitText:['表に{n}か所、蔵干まで数えるとこの気は{h}あります。', '表{n}か所、蔵干まで数えて{h}。'], roleText:['強弱では、このグループはあなたにとって{role}です。{tail}', '強弱では、このグループは{role}。'], roleGood:'引き出すほどバランスが整います。', roleCare:'行きすぎないよう抑えると最も楽に過ごせます。',
      natureHead:['Yeoniが読む気質', '判定'], careerHead:'仕事と適性', loveHead:['人間関係の形', '人間関係'], adviceHead:['Yeoniからの助言', '行動の基準']},
    god: {
      '비견':{line:['自分で決めるのが土台：決めて責任を持つときに安心できる。', '自分の基準と自立。名前が載ると効率が上がる。'], nature:['比肩は日干と五行も陰陽も同じ、もう一人の自分が肩を並べる星です。誰にも干渉されず自分のやり方でやるときに力が出て、静かな表面の下には誇りと意見がしっかりあります。同僚には義理堅く、気が合う人とは長く続きます。', '比肩は日干と五行・陰陽が同じ。核心は自立と信念。名前が載る仕事で成果が出る。同僚への義理は強み。'],
        career:'自立が守られる専門職・フリーランス・小さな事業、または組織の中で明確に自分の領域がある役割が合います。共同事業では、取り分と役割を最初から文書にしておきましょう。', love:'制約より尊重を大切にする、友人のような関係で安らぎます。お互いの時間と空間を守る相手と長続きしやすいでしょう。', advice:['信念は大きな強みですが、頑固に聞こえることもあります。重要な決断を一つするとき、「間違っているかもしれない」という余白を残し、もう一人の意見を聞いてください。', '一人で決めることと一緒に決めることを分ける。共同の決定では反対意見を一つ確認する。']},
      '겁재':{line:['競い、協力する：隣を走る人がいると気が増す。', '競争心と結束。比較対象があると速度が上がる。'], nature:['劫財は日干と五行は同じで陰陽が異なる、似ているけれど違う星で、競争相手でもあり仲間でもあります。勝とうとする意欲と、人を集めて舞台を広げる才があります。笑顔の裏で次の一手を数えていることもあるでしょう。', '劫財は五行が同じで陰陽が異なる。核心は意欲と結束。競争で成果が出るが、資源も一緒に出ていきやすい。'],
        career:'競争と人脈が成果になる営業・スポーツ・芸能・交渉・政治で目立ちやすいでしょう。チームを率いるときは、人を集める力が強みになります。', love:'刺激と情熱のある関係に惹かれます。勝ち負けの自尊心の争いにならないよう、勝つことより合わせることを練習してください。', advice:['入ってくる分だけ、出ていく穴も大きくなりえます。収入の一部を先に自動で貯めるなど、気分に左右されない仕組みを一つ作ってください。', '競う前に費用の上限と役割を合意する。無謀な投資や保証は避ける。']},
      '식신':{line:['安定した表現とゆとり：好きなことを磨いて分かち合う。', '安定した生産。好きなことを繰り返すと技が積み上がる。'], nature:['食神は日干が生む、陰陽が同じ星で、食・技・ゆったりした表現を表します。生まれつき楽観的で寛大で、そばにいる人を心地よくします。一つのことを掘り下げる職人気質があり、伝統では荒々しい偏官をやわらげるとされます。', '食神は日干が生み、陰陽が同じ。核心は安定した生産と表現。好きなことを繰り返すと技と収入が一緒に育つ。偏官も抑える。'],
        career:'手と頭で何かを作る仕事、料理・教育・デザイン・研究・コンテンツが合います。好きなことをするときに最高の力を発揮します。', love:'世話をして、一緒に楽しむ温かい関係を築きます。おいしい食事と日常を分かち合うことで愛を感じやすいでしょう。', advice:['寛大さゆえに、誰にでも与えて枯れてしまうことがあります。体を動かす小さなルールを一つ持ち、心地よさがだらしなさにならないようにしてください。', '繰り返せる量から始めて、完成したものを残す。与える範囲に上限を設ける。']},
      '상관':{line:['枠を疑い、より良い方法を見つける：機知と改善。', '批判的な思考と話。問題を見つけて直すのが得意。'], nature:['傷官は日干が生む、陰陽が異なる星で、頭の回転の速さ、言葉の才、枠を破る創造性を表します。理不尽なことをそのまま見過ごせず、みんなが受け入れるところで「なぜ？」と問います。その鋭さは改善や革新になることも、上の人との摩擦になることもあります。', '傷官は日干が生み、陰陽が異なる。核心は批判的思考と表現。正官（ルール・上司）と衝突しやすいので、表現の仕方が結果を決める。'],
        career:'新しい視点と言葉が道具になる企画・マーケティング・メディア・法律・コンサルティング・創作で輝きやすいでしょう。規則が非常に厳しい組織は窮屈に感じるかもしれません。', love:'会話が弾む機知のある相手に惹かれます。退屈が苦手なので、一緒に新しいことを試す関係が合います。', advice:['一言で心を得ることも失うこともあります。熱くなったら三回息を吸い、指摘する点に代案を一つ添えてください。', '問題を指摘するときは代案を示す。感情が高ぶっている間は決定を延ばす。']},
      '편재':{line:['広い世界を動き、機会をつかんで人を動かす。', '機会の発見と資源の循環。大局と配分が得意。'], nature:['偏財は日干が扱う、陰陽が同じ星で、流れるお金と広い活動の場を表します。細かいことにこだわらず大きな流れを見て、ユーモアと社交性で人を惹きつけます。お金は貯めるより回すのが得意です。', '偏財は日干が扱い、陰陽が同じ。核心は機会の発見と資源の循環。収入も支出も大きく振れる。'],
        career:'人と資源を動かして成果を出す貿易・流通・営業・投資・海外・事業開発が合います。', love:'楽しく大胆な関係を好み、相手を喜ばせるのが上手です。関心が散りやすいので、一人に向ける時間を意識して確保してください。伝統では、男性にとっての配偶者の星とも読みます。', advice:['機会が多いぶん、計画外の出費も起きやすくなります。お金が入ったら、まず一部を引き出しにくい場所に結んでおいてください。', '投資や支出の前に損失の上限を決める。収入の一定割合をすぐに固定する。']},
      '정재':{line:['一歩ずつ貯めて慎重に守る：勤勉と管理。', '管理と蓄積。安定した構造で着実に育つ。'], nature:['正財は日干が扱う、陰陽が異なる星で、誠実に稼ぐ固定収入と倹約的な管理を表します。石橋を叩いて渡り、約束と信用を重く見て最後までやり遂げるので、人は安心して物事を任せたがります。', '正財は日干が扱い、陰陽が異なる。核心は慎重な管理と着実な蓄積。一度の大勝ちより、安定した反復で資産が育つ。'],
        career:'正確さと信頼が大切な会計・金融・事務・管理・薬学など、体系的な分野で力を発揮しやすいでしょう。安定した給与の構造が合います。', love:'信頼と安定を最も大切にします。気軽な始まりより、真剣で長く続く関係を好み、二人で暮らしを運営する力が強いです。伝統では、男性にとっての配偶者の星とも読みます。', advice:['慎重さが過ぎると、自分の楽しみにまでけちになります。ときどき小さなロマンを、計算せずに一つ使ってみてください。', '支出の基準は決めつつ、体験や人間関係のための予算は別に持つ。']},
      '편관':{line:['困難に耐え、責任を担う：カリスマと克服。', '圧力への対応。危機で決断し、耐える。'], nature:['偏官は七殺（しちさつ）とも呼ばれ、日干を抑える、陰陽が同じ星です。強い圧力と試練を意味しますが、それに耐える力とカリスマも備えています。誇りと名誉を重んじ、弱い者を守りたい義侠心があります。食神や印星が近くにあると、この荒い力は権威へと磨かれます。', '偏官は日干を抑え、陰陽が同じ。核心は圧力下での決断力。日干が強ければ権威になり、弱ければストレスとして感じる。'],
        career:'緊張感のある責任の重い現場、軍・警察・法律・医療・安全・危機管理で実力を証明しやすいでしょう。規律が明確な場所でリーダーシップが表れます。', love:'自分を認めて尊重してくれる相手を望み、一度心を許したら最後まで守ります。伝統では、女性にとっての配偶者の星とも読みます。', advice:['苦労を内に飲み込むので、心が先に疲れることがあります。汗をかく運動や没頭できる趣味など、圧力の逃げ道を一つ作ってください。', '責任の範囲を書き出す。運動などの定期的なルーティンでストレスを発散する。']},
      '정관':{line:['正しい道を守り、信頼を築く：責任と秩序。', '原則と信頼。仕組みの中で評判が築かれる。'], nature:['正官は日干を抑える、陰陽が異なる星で、あなたを正しく形づくる規則と名誉を表します。原則を守り、持ち場で責任を取るので、どこでも「頼れる人」と呼ばれます。体面と評判を大切にします。', '正官は日干を抑え、陰陽が異なる。核心は原則と信頼。組織だった職場で評価と昇進に恵まれる。'],
        career:'仕組みと手順が明確な公的機関・行政・教育・大企業・管理職で輝きやすいでしょう。', love:'礼儀正しく整った関係を好み、約束を守る頼れる相手に惹かれます。伝統では、女性にとっての配偶者の星とも読みます。', advice:['正しい基準が、あなたを縛る枠になることもあります。ときどき、人にどう見えるかより先に、自分がどう感じるかで選んでみてください。', 'ルールは守りつつ、変えてよいルールと守るべきルールを見分ける。']},
      '편인':{line:['変わった角度から隠れた原理を見る：直感と洞察。', '直感と独自の視点。他の人が見逃すものが見える。'], nature:['偏印は梟神（きょうしん）とも呼ばれ、日干を生む、陰陽が同じ星です。直感とひらめきが強く、機転も速いので、表の裏で他の人が見逃すものにいち早く気づきます。哲学・心理・技術のように深く掘る分野に惹かれ、一人で考える時間が必要です。', '偏印は日干を養い、陰陽が同じ。核心は直感と独自の読み。アイデアは多いが実行が遅れがち。'],
        career:'並外れた洞察と専門知識が求められる研究・IT開発・心理・カウンセリング・医療・芸術が合います。', love:'条件より魂の出会いを大切にし、言わなくても理解されることを望みます。', advice:['深みがあるぶん、考えが頭の中を回り続けて機を逃すことがあります。今週は、どんなに小さくても、アイデアを一つ手の中へ移してください。', 'アイデアごとに最初の行動の日付を決める。検討は期限までに終える。']},
      '정인':{line:['学びと世話を与え受ける：勉強と後ろ盾。', '学びと後ろ盾。勉強と承認が成長を牽引する。'], nature:['正印は日干を生む、陰陽が異なる星で、母の腕のような世話と学びを表します。温かく学ぶことが好きで、知識と資格を一歩ずつ積み上げます。目上の人の助けや人との縁にも恵まれやすいでしょう。', '正印は日干を養い、陰陽が異なる。核心は学びと後ろ盾。資格・学位・師が成果につながる。'],
        career:'人が学び教える教育・学術・カウンセリング・出版・資格職でうまくいきやすいでしょう。', love:'温かく世話をしてくれる相手を好み、精神的なつながりと褒め言葉に心が開きます。', advice:['愛を受けることに慣れると、自分で決めるのが難しくなりえます。小さな決定を一つずつ自分で下して、自立の筋肉を育ててください。', '自分が決めるべきところは自分で決める。学んだことは実践する日付と結びつける。']}},

    /* ── ilju ── */
    il: {
      leadHead:['Yeoniが広げた四柱', 'Neoの判定'], dayBadge:'{name}の日干', branchBadge:'日支 {god}', stageBadge:'十二運 {stage}',
      leadText:['あなたの中心は{name}の日干で、そのすぐ下の日支{dj}は、{stage}の位置にある{god}です。四柱を広げて読むと次のようになります。', '{name}の日干、日支{dj}（{god}・{stage}）。下の表が根拠。'],
      cap:'四柱', cols:['柱', '干・十神', '支・十神', '蔵干', '十二運', '宮'], dayStemMe:'日干（自分）',
      note:['十二運は日干から読み、陰干は逆行します（陰は生で陽は死とする基準）。宮の年齢は、根・芽・花・実という伝統的な区分です。', '十二運は日干基準で、陰干は逆行。宮の年齢は伝統的な根・実の区分。'],
      imgHead:'{name}の日干のイメージ', imgText:['{name}の日干は、{note}です。命式のすべての文字は、この日干との関係で読むので、その質感を知ることが解釈の第一歩です。', '{name}の日干：{note}。日干が基準点で、他の七字はそれとの関係で読む。'],
      spouseHead:['配偶者の宮に座る気', '日支・配偶者の宮'],
      spouse:{same:['日支に比肩があり、配偶者の席に自分と似たものが座っています。対等で友人のような関係が心地よく、お互いの空間を尊重するほど長続きします。', '日支が比劫：対等なパートナー型。互いの空間を尊重するルールが鍵。'], drain:['日支に食傷があり、配偶者の席から表現と世話が流れ出します。一緒に楽しみ、感じたことを言葉にする関係で幸せを感じやすいでしょう。', '日支が食傷：表現と世話が多い。感情表現が関係を保つ。'], wealth:['日支に財星があり、配偶者の席に現実の暮らしを一緒に築く気があります。日々の暮らしを一緒に計画し、細やかに世話をする関係が合います。', '日支が財星：現実的で暮らしを計画する関係。お金と役割分担を明確にする。'], control:['日支に官星があり、配偶者の席に責任と秩序があります。互いに信頼できる堅実な関係を望み、約束を重く見ます。', '日支が官星：責任と信頼が軸の関係。期待を言葉で合意する。'], parent:['日支に印星があり、配偶者の席に世話と理解があります。心を預け合い、一緒に学ぶ関係で安らぎます。', '日支が印星：精神的に支え合う関係。依存が片側に傾かないようにする。']},
      stageText:['日支の十二運は{stage}で、{first}。日常では、{second}として表れやすいでしょう。', '日支の十二運は{stage}：{desc}。'],
      stagesHead:['十二運で見る人生の四つの季節', '十二運の流れ'],
      gmHead:'空亡', gmText:['空亡は、日柱が属する十日の周期で相手のないまま残った二つの支のことで、そこにある気は空虚に感じられるとされます。あなたの空亡は{list}です。{hit}', '空亡：{list}。{hit}'],
      gmHit:['あなたの命式では、{list}が空亡にあたります。そこは期待したほど満たされないかもしれませんが、精神面や学びに使うと深まると読みます。', '命式では：{list}。期待より体感の成果が弱い。利益ではなく中身と学びに使う。'], gmMiss:['命式の他の場所は空亡にあたりません。', '命式で影響を受ける場所はない。'],
      gmNote:['空亡の重みは流派によって異なるので、参考程度にお読みください。', '空亡の比重は流派で異なる。参考としてのみ使う。'],
      wordHead:['Yeoniのひとこと', 'Neoの一行要約'],
      word:{'甲':['まっすぐ伸びる木は一度に大きくならない。今週、大きな目標を、今日できる一歩に切り分けてみましょう。', '方向を定めるのが強み。大きな目標を今週の単位に分ける。'], '乙':['蔓は寄りかかれるものを見つけて遠くまで届く。助けを求めるのもあなたの強みなので、今週は誰か一人に先に連絡してみましょう。', 'つながりが強み。今週は協力者に先に頼む。'], '丙':['太陽は自ら輝くけれど、休む夜も大切。人を照らして先延ばしにしてきた休息を、今日一枠だけ予約しましょう。', '表現が強み。燃え尽きを避けるため、先に休息を予定に入れる。'], '丁':['灯は近くを長く照らすときが一番温かい。今日、そばにいる一人に、感謝を具体的に伝えてみましょう。', '集中が強み。範囲を絞って一つ終わらせる。'], '戊':['山は動かないことで信頼を与える。ときには風を通してもいい。今週、新しい提案に一つ「はい」と答えてみましょう。', '安定が強み。今週は新しい提案を一つ試す。'], '己':['畑は植えるものによって変わる。人のために耕した畑に、今日は自分のための種を一つ蒔きましょう。', '現実性が強み。今週は資源を一つ、自分への投資に割り当てる。'], '庚':['鉄は火に出会って役に立つ道具になる。今日、自分を鍛える困難を一つ避けずに、少しだけ引き受けてみましょう。', '決断力が強み。先延ばしにしてきた難しい仕事を今日始める。'], '辛':['宝石は手入れをするほど輝く。今日一度、完璧でなくても大丈夫と自分に言ってあげましょう。', '基準が高い。八割できた段階で共有する練習をする。'], '壬':['大きな水は岸があってこそ遠くへ流れる。広げた関心の中から、今週抱えるものを一つ選びましょう。', '視野が広い。今週は優先事項を一つ固定する。'], '癸':['露は小さくても、必要な場所をちょうど濡らす。今日の直感を一つ書き留めておくと、後で道しるべになります。', '直感が強み。理由を書き留めて確認する。']}},

    /* ── flow ── */
    fl: {
      names: ['調整が多く必要な流れ', '調整が少し必要な流れ', '普通の流れ', '順調な流れ', '非常に順調な流れ'],
      yearTitle: 'あなたの一年（歳運）{gz}', yearPre: '{year}年 · ', periodTitle: '今いる場所（現在の十年運）{gz}',
      age: ' · {a}〜{b}歳（韓国式の数え年）', badgeScore: '流れのスコア {score}', badgeYear: '歳運 · 一年', badgePeriod: '十年運 · 十年', ends: ['調整が必要', '順調'], caption: '流れのスコア {score}', aria: {year:'今年の流れのスコア {score}', period:'現在の十年運の流れのスコア {score}'},
      relNotes: {chung:'変化や移動を促す力', transformed:'合化の条件を満たしている', he:'結びつきと協力の機会'},
      relTypes: {stemChung:'干の衝（天干沖）', branchChung:'支の衝（地支沖）', stemHe:'干の合（天干合）', branchHe:'支の合（地支合）'},
      tblCap: {year:'歳運の柱とあなたの日干', period:'十年運の柱とあなたの日干'}, tblCols: ['文字', '五行', '十神', '十二運', '強弱での役割'], stemRow: '干 {c}', branchRow: '支 {c}', hiddenNote: '支{c}の蔵干：{list}',
      family: {same:['自分と同じ気の運なので、自分で決めて自分で立ちたい気持ちが強まりやすい時期です。同僚との競争も増えやすいので、先に取り分を決めておくと助けになります。', '比劫の運：自立と競争の課題が増える。共有資源の取り分とルールを先に決める。'], drain:['内側のものを外へ注ぎ出す運なので、表現する・作る・教えることがうまくいきやすい時期です。多くの気が出ていくので、回復の時間も計画してください。', '食傷の運：表現と生産が増える。出力を上げつつ、消耗管理の基準を持つ。'], wealth:['現実的な成果とお金が目に入る運です。仕事を広げるのに良い時期で、扱える範囲を数字で書き出すと気持ちが安定します。', '財星の運：成果と財務の課題が増える。拡大の上限を数字で決める。'], control:['責任と役割が重くなる運です。認められる機会は、より大きな負担と一緒に来るので、引き受けることと手放すことを分けてください。', '官星の運：責任と評価の圧力が増える。受ける役割と断る役割を分ける。'], parent:['学びと助けが届く運です。勉強・資格取得・良い相談相手との出会いが得やすいので、受け取ったものを小さな行動に変えてください。', '印星の運：学びと支援が届く。インプットを行動に変える予定を入れる。']},
      noRel: ['あなたの命式の文字と直接合や衝になる場所はありません。', '命式との直接の合・衝はなし。'],
      tone: {open:['順調な流れと読みます。準備してきたことを、まず小さな規模で試してみてください。スコアは比較のための参考で、結果を約束するものではありません。', '判定上は楽な帯。準備したことを小規模で動かす。スコアは結果を保証しない。'], even:['強く押すことも引くこともない、普通の流れと読みます。今していることを続けながら、ときどき方向だけ確かめてください。スコアは比較のための参考で、結果を約束するものではありません。', '判定上は中間の帯。進行中のことを続け、方向を確認する。スコアは結果を保証しない。'], care:['調整が必要な流れと読みます。速度を落とし、役割とスケジュールを整えると、同じ時期がずっと楽になります。スコアだけで大きな決断はしないでください。', '判定上は調整の帯。スケジュールと役割を整え、選択肢を残す。スコアだけで結論しない。']},
      free: '※ ここまではすべて無料です。十年運の全体の流れ、各歳運の詳細、総合的な解釈は、下のプレミアムで続きます。'},

    /* ── daily ── */
    da: {
      dayTitle: '今日の日柱 {gz}', monthTitle: '今月の月柱 {gz}', today: '今日', month: '今月', badge: '気 {bp}%',
      names: ['まず回復', '安定', '順調', '勢いが強い'], ends: ['ゆっくり', '強い'], caption: '気のゲージ {bp}%', aria: '{when}の気のゲージ {bp}%',
      tags: {fast:'加速', even:'バランス', rest:'一休み'}, boost: '{el}を足す', tblCap: '{when}届く気とあなたの日干',
      godHead: ['{when}を十神で読む', '十神別の判定'], nothing: ['命式との衝突は目立ちません。大事なメッセージは、送る前にもう一度読み返しましょう。', '目立つ関係はなし。大事なメッセージは送る前に再確認する。'], checkHead: ['心に留めておいてください', '確認ポイント'],
      boostHead: 'ラッキーブースター', boostLabel: '足す五行', boostNote: ['足りないものを足す、軽い日常のヒントです。小さな気分転換として楽しんでください。', '要の調和の五行を補う日常のヒント。効果を保証するものではない。'],
      god: {'비견':['自分の判断が明確になる時期です。一人で決めても構いませんが、あとで迷わないよう、理由を一行で書いておきましょう。', '自立した判断が有利。理由を一行で記録する。'], '겁재':['競争心と意欲が一緒に高まります。衝動的な出費や賭けは一日延ばすと、気持ちが楽になります。', '競争と衝動が増す。衝動的な出費は一日保留する。'], '식신':['喜びとアイデアがわいてきます。思いついたアイデアを一つ、小さくてもすぐに形にしてみましょう。', '生産性が上がる。アイデアを一つ今すぐ行動のステップにする。'], '상관':['言葉と表現に重みが出ます。発表や創作に向いていますが、契約書や公式な声明は、出す前にもう一度読み返してください。', '表現が強まる。公式文書と声明は公開前に再確認する。'], '편재':['機会と変動が一緒に大きくなります。大きな賭けより、確認済みの小さなことから始めましょう。', '機会も変動も大きい。確認済みの小さな案件で進める。'], '정재':['丁寧な実務が光る時期です。収入と支出を一度整理すると、心が軽くなります。', '正確さが上がる。収支の記録を整理する。'], '편관':['圧力を感じるかもしれません。すべてを背負うより、守ると決めたことを一つ選んで持ち続けると、信頼として返ってきます。', '圧力が来る。核心の責任を一つに絞ると信頼として返る。'], '정관':['責任と信頼が表れる時期です。公式な書類や手続きに向いています。', '公式な手続きに向く。責任の範囲を明確にする。'], '편인':['直感が冴えます。浮かんだ予感を書き留め、小さく確かめてみましょう。', '直感が主導。予感を記録し、小さく検証する。'], '정인':['学びと整理に良い時期です。信頼できる人に助言を求めると、考えがはっきりします。', '学びと分析が効率的。信頼できる相談相手に聞く。']},
      tone: {open:['気がある程度の強さで入ってきます。やることを一つ選んでまず終わらせれば、流れにうまく乗れます。', '気の余剰帯。最優先の一件を先に終える。'], care:['内なるバッテリーを先に労る時期です。少しゆっくりすると、ミスが減って人間関係も和らぎます。', '気のケア帯。速度を落とし、確認の段階を一つ増やす。']},
      sumHead: ['Yeoniのひとこと', 'Neoの要約']}
  };

  COPY['zh-CN'] = {
    voice: ['Yeoni', 'Neo'],
    sep: '、',
    el: {wood:'木', fire:'火', earth:'土', metal:'金', water:'水'},
    fam: {same:'比劫（同伴）', parent:'印星（助力）', drain:'食伤（表达）', wealth:'财星（财务）', control:'官星（责任）'},
    famMeaning: {same:['与自己相同的能量', '同伴意识与自立'], parent:['支持你的能量', '学习与靠山'], drain:['向外输出的能量', '表达与才华'], wealth:['你去经营的能量', '资源与现实成果'], control:['塑造你的能量', '责任与秩序']},
    pos: {yg:'年干', yj:'年支', mg:'月干', mj:'月支', dg:'日干', dj:'日支', hg:'时干', hj:'时支'},
    palace: {y:{label:'年柱', palace:'祖辈 · 早年', span:'0–15岁', domain:'根基、家庭、童年环境'}, m:{label:'月柱', palace:'父母 · 青年', span:'16–30岁', domain:'父母、兄弟姐妹、踏入社会'}, d:{label:'日柱', palace:'自己 · 伴侣', span:'31–45岁', domain:'自己与伴侣宫'}, h:{label:'时柱', palace:'子女 · 晚年', span:'46岁以后', domain:'子女、晚年、成果'}},
    role: {'용신':'关键平衡（用神）', '희신':'助力（喜神）', '기신':'负担（忌神）', '구신':'加重负担（仇神）'},
    roleShort: {'용신':'关键平衡', '희신':'助力', '기신':'负担', '구신':'加重负担'},
    noonMark: '（按正午计）', unknownCell: '不详', none: '—',
    stem: {'甲':'甲（阳木）', '乙':'乙（阴木）', '丙':'丙（阳火）', '丁':'丁（阴火）', '戊':'戊（阳土）', '己':'己（阴土）', '庚':'庚（阳金）', '辛':'辛（阴金）', '壬':'壬（阳水）', '癸':'癸（阴水）'},
    animal: {'子':'鼠', '丑':'牛', '寅':'虎', '卯':'兔', '辰':'龙', '巳':'蛇', '午':'马', '未':'羊', '申':'猴', '酉':'鸡', '戌':'狗', '亥':'猪'},
    stemNote: {
      '甲':'像笔直向上生长的大树，认准方向、愿意带头，也守着自己的骄傲',
      '乙':'像弯而不折的藤蔓与花草，柔软而坚韧，擅长把日子经营得有条理',
      '丙':'像普照万物的太阳，明亮、善于表达、存在感鲜明',
      '丁':'像黑暗中的一盏灯，细腻、温暖、有深度',
      '戊':'像厚重的大山，稳定可靠、重心坚实',
      '己':'像肥沃的田地，务实、包容、擅长处理现实事务',
      '庚':'像矿石与钢铁，果断、重义气、有竞争力',
      '辛':'像打磨过的珠宝，感受敏锐、讲究精细、富有审美',
      '壬':'像大江大海，思路开阔、灵活、气度宽广',
      '癸':'像露水与泉水，清澈、敏感，静静蕴藏着生命力'},
    stage12: {
      '장생':['长生', '开始成长的阶段 · 学习与起步的力量'], '목욕':['沐浴', '初次接触世界的阶段 · 好奇、敏感与变化'],
      '관대':['冠带', '走入社会的阶段 · 自信与推进力'], '건록':['建禄', '靠自己谋生的阶段 · 自立与实务能力'],
      '제왕':['帝旺', '能量最饱满的阶段 · 主导力与强烈的自信'], '쇠':['衰', '过了顶点而趋于成熟 · 经验与体贴'],
      '병':['病', '能量安静下来、变得细腻 · 共情与体谅'], '사':['死', '动作停止、思考加深 · 专注与探究'],
      '묘':['墓', '收入仓库的阶段 · 积蓄、管理与充实内在'], '절':['绝', '与过去切断而转变 · 转折与决断'],
      '태':['胎', '新生命孕育的阶段 · 规划与潜力'], '양':['养', '在庇护中成长的阶段 · 准备与呵护']},
    hidden: {first:'余气', mid:'中气', last:'本气'},
    ganji: '年 · 月 · 日 · 时',

    /* ── climate ── */
    temp: ['偏寒', '偏凉', '寒暖均衡', '偏暖', '偏热'],
    moist: {dry:'偏干燥', balanced:'均衡', wet:'偏潮湿'},
    season: {spring:'春', summer:'夏', autumn:'秋', winter:'冬'},
    env: {
      colddry:{title:'安静整洁的冬日小屋', text:['在这样的气候里，沉静的理性与清晰的边界感格外突出。在没有嘈杂的安静之处，专注力会回来。分析、规划、研究这类需要独自深挖的工作比较适合你，保持礼貌而适度的距离，往往会变成信任。提前告诉身边的人你需要时间才能敞开心扉，误会就会减少。', '环境类型：冬日小屋。安静有序的环境里专注力上升。适合深挖型工作：分析、规划、研究。人际上，守住的边界会变成信任。提前说明自己表达感情较慢。']},
      coldwet:{title:'黎明时雾气笼罩的湖', text:['表面平静，水面之下思绪与情感紧密相连。在能分享内心、深入交谈的地方，你会获得能量。读懂人心背后的咨询、心理、艺术类工作比较适合，慢慢建立的亲近感会很持久。思绪下沉的日子，用阳光和轻度运动补一点暖意。', '环境类型：黎明之湖。外表安静，内在处理沉重。适合读懂人心背后的工作：咨询、心理、艺术。关系慢慢加深。思绪下沉时，用阳光和轻度运动提升节奏。']},
      hotdry:{title:'正午的沙漠', text:['目标一旦清晰，你就会毫不犹豫地行动。决断快、不记仇，所以在讲究速度的场合容易出成果。开创、销售、短期项目比较适合，不掩饰真心也是你的魅力。热度升高时，别忘了不时看看身边人的节奏。', '环境类型：正午沙漠。目标一定就直线前进，决断也快。适合讲究速度的工作：启动、销售、短期项目。坦率是优势。加速时留意对方的节奏。']},
      hotwet:{title:'生机勃勃的夏日森林', text:['你在与人交往中成长。好奇心与亲和力很强，人群聚集的地方，能量就会流动起来。以沟通为中心的教学、人事、营销、写作比较适合，丰富地分享感受能累积经验。日程容易排满，请先留出独自喘口气的时间。', '环境类型：夏日森林。能量在人与人之间流动，并随之成长。适合以沟通为中心的工作：教学、人事、营销、写作。情感表达丰富。日程容易超负荷，先确保独处时间。']}},
    rx: {
      hot:{need:'水 · 金', color:'蓝、黑、白', dir:'北、西', act:'水边散步、游泳、温水泡脚、冥想', less:'剧烈运动、炎热的地方、过多的红色'},
      warm:{need:'水', color:'蓝、天蓝、薄荷绿', dir:'北', act:'多喝水、去溪流和海边走走、降温拉伸', less:'暴饮暴食、吃夜宵'},
      neutral:{need:'随季节调整', color:'随季节变化', dir:'不固定', act:'春秋做木、金类活动，夏天亲近水，冬天做火、木类活动', less:'偏向一边的作息'},
      cool:{need:'火 · 木', color:'橙、绿、暖红', dir:'南、东', act:'晒太阳、半身浴、拉伸与瑜伽', less:'冷食、长时间待在空调房'},
      cold:{need:'火 · 木', color:'红、橙、浅绿', dir:'南、东', act:'吃热食、热水泡澡、暖身有氧运动、多晒太阳', less:'冷水浴、强空调、只穿深色衣服'}},
    moistRx: {dry:{need:'水 · 木', act:'多喝水、加湿、去森林或水边散步、养绿植'}, wet:{need:'金 · 火', act:'经常通风、晒被褥、用白色或金色点缀、在人际中划清界线'}, balanced:{need:'无需额外补充', act:'潮湿与干燥较为均衡，把重心放在温度一侧'}},
    rxLabel: ['要补的能量', '颜色', '方位', '行动', '适度减少', '湿度平衡'],
    climate: {
      tempBadge:'温度分数 {s}',
      lead:['Yeoni 读到的气候', 'Neo 的气候判断'], env:['从气候看你的环境', '气候对应的环境类型'], parts:'各字的温度与湿度', count:'推动温度的四种能量',
      verdict:['你出生在{season}月。季节决定的基准温度是{base}，加上八字的暖与寒，温度分数为{score}，读作“{type}”。湿度方面有{wet}个潮湿信号、{dry}个干燥信号，属于{moist}。', '判断：{type}；湿度：{moist}。{season}月基准{base}，加上各字贡献，温度分数{score}；潮湿{wet}、干燥{dry}。'],
      versus:['气候平衡与强弱平衡', '气候平衡与强弱平衡对比'], rx:'气候平衡指南 · 日常调整',
      rxIntro:['传统命盘用象征来补足缺失的部分，这里把它换成日常语言。挑一个你喜欢的，试上一周左右。', '这是补足缺失部分的日常方法。选一个坚持一周，记录状态的变化。'],
      note:'这些建议是对传统象征体系的转译，不是健康或医疗建议。身体如有不适，请先咨询专业人士。',
      warm:'暖', cold:'寒', tags:{fire:'火', wood:'木', metal:'金', water:'水'}, tagNotes:{fire:'暖 +1.5', wood:'暖 +0.5', metal:'寒 −0.5', water:'寒 −1.5'},
      cols:['位置', '字', '五行', '温度', '湿 · 燥'], base:'季节基准', total:'合计', dampWord:'湿', dryWord:'燥',
      gaugeTemp:{ends:['寒', '暖'], caption:'温度分数 {score}', aria:'温度仪表：分数 {score}，{type}'},
      gaugeHumid:{ends:['燥', '濕'], caption:'湿 {wet} · 燥 {dry}（差 {diff}）', aria:'湿度仪表：{wet}个潮湿信号，{dry}个干燥信号，{moist}'},
      vNone:['温度均衡，所以气候方面没有急需补充的能量。从强弱一侧读关键平衡就足够了。', '温度均衡，气候上无急需能量。以强弱平衡为主判断。'],
      vJong:['从气候看，{need}能量是受欢迎的。但这张命盘按从格来看，应先顺着聚集的势头，把气候当作日常的辅助。', '气候需要{need}。因为是从格，先顺着聚集的势头。'],
      vSame:['气候所需的{need}能量，与强弱得出的关键平衡（{yong}）重合。两种看法方向一致，把这种能量稳定地留在身边，是最清晰的补足方式。', '气候所需（{need}）与强弱的关键平衡（{yong}）重合。方向一致，补足的优先级明确。'],
      vExtreme:['气候指向{need}，强弱指向{yong}，方向略有不同。温度明显偏向一边，所以先考虑气候的季节平衡，再把强弱放在第二位。', '气候指向{need}，强弱指向{yong}。方向不同。温度极端，因此气候为主、强弱为辅。'],
      vMild:['气候指向{need}，强弱指向{yong}，方向略有不同。温度并不极端，所以以强弱得出的关键平衡为中心，把气候当作季节上的帮手。', '气候指向{need}，强弱指向{yong}。方向不同。温度不极端，因此强弱为主、气候为辅。'],
      vNote:['气候看的是出生季节的温度与湿度，强弱看的是日干的力量大还是小。两者都不被当作唯一答案，由命盘决定先看哪一个。', '气候读季节的冷暖干湿，强弱读日干力量的多寡。单看任何一方都不是答案。'],
      what:'暖、寒、燥、湿是什么？', whatText:['这些词描述命盘的温度（冷或热）与湿度（干或潮）。就像自然有四季和天气，人的气质也被认为有气候，由此可以看出你在怎样的环境里安心、更能发挥所长。', '命盘的冷暖与干湿。显示在怎样的环境里力量用得好。'],
      four:[['寒', '冬天凝聚的能量。读作向内收敛、沉静而谨慎的力量。'], ['暖', '夏天外放的能量。读作热情、表达与向外伸展的力量。'], ['燥', '秋天紧致的能量。读作干脆的取舍与清爽的质地。'], ['濕', '春天交织的能量。读作共情、亲和与共同成长。']],
      how:'计算方法：月支决定基准温度（子、丑 −4，亥 −3，戌 −2，寅、酉 −1，卯、申 +1，辰 +2，巳 +3，午、未 +4）。立春之后寅仍带寒意，立秋之后申仍带暑气。八字全盘中，火加 +1.5，木加 +0.5，金加 −0.5，水加 −1.5。潮湿计水、木、辰、丑，干燥计火、金、戌、未，再互相比较。分数 5 以上读作热，2 以上读作暖，−2 以上读作均衡，−5 以上读作凉，更低读作寒。'},

    /* ── strength ── */
    stage: ['极弱', '偏弱', '偏弱（接近均衡）', '偏强（接近均衡）', '偏强', '极强'],
    strengthLead: ['Yeoni 读到的强弱', 'Neo 的强弱判断'],
    str: {
      jongHead:['从格', '从格'],
      jongLead:['你的命盘把{dom}能量{pct}聚集起来，被判定为{name}。这样的结构不用一般的强弱尺度来衡量，而是顺着聚集的势头来读。', '判断：{name}。{dom}能量{pct}主导命盘。不适用一般的强弱公式。'],
      jongBadge:'强弱 {score}（参考）', jongPct:'约{pct}%',
      jongWhat:'什么是从格？', jongWhatText:['当某一种五行强到压过整张命盘时，顺着它的势头比逆着它更自然。所以上面的强弱分数只作参考，以下面的结构说明为中心。', '当某一种五行压倒命盘时，顺从它是对策，因此强弱分数只是参考。'],
      jongKind:{wood:'木主导的结构，用好笔直生长与规划的能量会很自然', fire:'火主导的结构，用好明亮的热情与表达会很自然', earth:'土主导的结构，顺着积累与守护的能量会很自然', metal:'金主导的结构，用好果断与精炼的刚劲会很自然', water:'水主导的结构，用好流动而灵活的智慧会很自然', parent:'被印星压倒的结构，乘着学习与靠山的大势前行', drain:'被食伤压倒的结构，顺着把才华与表达带到世间的流向', wealth:'被财星压倒的结构，顺着资源与现实成果的流向', control:'被官星压倒的结构，乘着组织与责任的大势前行', change:'干相合而化为一种能量的化格，围绕这种新能量来读', other:'由单一能量主导的特殊结构，顺着它的势头会很自然'},
      kindHead:['你的结构', '结构类型'], dirHead:'运势的方向',
      dirText:['当运势滋养{dom}能量时，流势往往顺畅延续；逆着这股势头的运势里，可能需要更多调整。与其把力量分散，不如把天生的一项强处做深，这更适合此结构。', '滋养{dom}能量的运势往往顺畅，逆着它的运势会增加调整。集中在一项强处上。'],
      gaHead:'假从格', jinHead:'接近真从格',
      gaText:['还残留着一点支撑日干的弱根，所以随着运势，命盘可能稳定为从格，也可能回到一般结构。请对照你实际走过的经历。', '仍有微弱的支撑根。随运势可能定为从格，也可能回到一般结构。对照自己的经历查验。'],
      jinText:['顺从优势五行的流向很清晰。', '顺从优势五行的流向清晰。'],
      leadNormal:['你的强弱分数是{score}，读作{stage}。强与弱的分界线是30，你的{stem}日干比它{dir}{gap}分。', '判断：{stage}（{sw}）。强弱分数{score}，比基准30{dir}{gap}分。'],
      above:'高', below:'低', strongWord:'强', weakWord:'弱',
      tagStrong:['你更接近自我驱动型。', '类型：自我驱动。'], tagWeak:['你更接近敏感、体贴、善于协作的类型。', '类型：体贴协作。'],
      badge:'强弱 {score}', baseBadge:'基准 30', typeStrong:'自我驱动', typeWeak:'协作型',
      gauge:{ends:['偏弱', '偏强'], baseLabel:'基准 30', caption:'强弱分数 {score}（基准30）', aria:'强弱仪表：分数 {score}，{stage}，基准30'},
      threeHead:['背后的三股力量', '季节、支与助力'], threeCap:'季节、支、助力', threeCols:['因素', '字', '判断', '分数'],
      rowMonth:'季节 · 月支', rowDay:'根基 · 日支', rowRest:'助力 · 其余五字', vMonthPos:'得令', vMonthNeg:'失令', vFootPos:'有根', vFootNeg:'无根', vRestPos:'有助力', vRestNeg:'缺助力', vFlat:'持平', sumLabel:'合计',
      partsOpen:['查看各字分数', '各字分数'], partsCap:'各字的强弱分数', partsCols:['位置', '字', '五行', '与日干的关系', '分数'],
      whyHead:['为什么是{sw}', '为什么{sw}'],
      monthRel:{same:['得令', '月份与日干五行相同，所以根基稳固。', '月支与日干五行相同。根基稳固。'], parent:['得令', '月份是生养日干的印星月，所以你得到很多支持。', '月支为印星，生养日干。支持强。'], control:['失令', '月份是克制日干的官星月，所以能量容易被压住。', '月支为官星，克制日干。能量受压。'], drain:['失令', '月份是日干向外倾泻能量的食伤月，所以能量向外流出。', '月支为食伤，泄耗日干。能量外流。'], wealth:['失令', '月份是日干需要经营的财星月，所以你处在要耗用力量的位置。', '月支为财星，由日干经营。是耗用力量的位置。']},
      whySeason:['看出生月（季节），是{tag}。{rel}', '季节：{tag}。{rel}'], whyNeutral:['出生月与日干的关系是中性的。', '季节中性。'],
      whySum:['再加上日支和其余各字给予或夺走日干的部分，合计{score}分。', '季节再加上日支及其他字的助力与压力，合计{score}分。'],
      whyStrong:'你有足够的力量独立站稳，所以读作强。', whyWeak:'相比外界的要求，你自身的力量略显不足，所以读作弱。这不是缺点，而是敏感与灵活的根基。',
      stemHead:['{stem}日干的质地', '日干 {stem}'],
      stemStrong:['你力量充足，向外使用时更能发光。分享成果、帮助他人、担任负责的角色能让你保持平衡。一个人包揽一切反而容易觉得憋闷。', '你有富余的力量，向外使用效率更高。分享成果，担任负责的角色。'],
      stemWeak:['你的力量在认可你的人和环境旁边用得最好。与其硬挤到前面，不如先用学习、准备与合作把根扎好。', '资源偏少，用准备、学习与合作稳住根基。过度强出头代价大。'],
      stemLine:['{stem}：{note}。', '{stem}：{note}。'],
      godHead:['支持你的能量 · 需要留意的能量', '关键平衡 / 负担'], godTags:{good:['关键平衡', '助力'], care:['负担', '加重负担']},
      godText:['当关键平衡与助力的五行随运势到来时，事情往往顺利，也更容易遇到帮助。当负担的五行转强时，在大幅扩张或做决定之前，放慢一拍、多看一会儿。', '关键平衡与助力五行随运势到来时往往顺利；负担五行转强时，降低扩张速度更稳妥。'],
      godWhat:'关键平衡、助力、负担、加重负担是什么？', godWhatText:'关键平衡（用神）是命盘为了平衡最需要的五行，助力（喜神）是帮助它的五行。负担（忌神）是损害关键平衡的五行，加重负担（仇神）是滋养负担的五行，中性（闲神）则不偏向任何一边。本命盘的算法把五行全部分成支持与负担两侧，所以不单独保留中性五行。',
      cycHead:'运势方向一览', cycStrong:['食伤、财星、官星的运势，是把能量向外使用并转化为成就的运势，社会成果容易成熟。', '食伤、财星、官星运势（力量向外使用并化为成果）有利。'], cycWeak:['比劫、印星的运势，是充实并支持你的运势，自信与帮助往往一起到来。', '比劫、印星运势（被充实、被支持）有利。'],
      what:'什么是强弱（抑扶）？', whatText:'强弱是通过日干太强时压制（抑）、偏弱时扶助（扶）来寻找平衡的看法。在这张命盘里，月支分量最重（同五行 +40，印星 +27，官星 −27，食伤 −10）。日支与日干同五行或为印星时 +13，为官星时 −9；其余五字同五行或为印星时 +7，为官星时 −7。合计 30 以上读作强，低于 30 读作弱，阶段名称只是分数区间的标签。这个分数不是对一个人能力或价值的评级。'},

    /* ── ten gods ── */
    godName: {'비견':'比肩', '겁재':'劫财', '식신':'食神', '상관':'伤官', '편재':'偏财', '정재':'正财', '편관':'偏官', '정관':'正官', '편인':'偏印', '정인':'正印'},
    ten: {
      lead:['Yeoni 眼中十神的分量', 'Neo 的十神判断'], most:['最多的一组 {n}', '最多 {n}'], mostBadge:['最多的一组：{n}个字', '最多：{n}个字'], noneBadge:['缺：{list}', '缺失：{list}'], allBadge:['五组齐全', '五组无缺'],
      leadText:['在日干以外的七个字里，分量最重的是{top}。{meaning}的质地容易在日常中显现。{tail}', '判断：{top}主导（日干以外七字中占{n}个）。{tail}'],
      tailNone:['相对地，{list}没有显现在表面。', '缺失：{list}。'], tailAll:['五组都显现在表面，你的工具箱配得很均衡。', '五组齐全。'],
      distHead:['五组的分布', '各组分布'], distCap:'十神分布', cols:['组', '表面', '藏干', '细分十神', '在强弱中'],
      distNote:['表面的数量计的是日干以外的三个天干和四个地支；藏干计的是藏在地支里的所有天干。数量多少没有好坏之分。', '表面：日干以外的三干四支。藏干：地支里的所有天干。数量不是排名，也不是成功几率。'], noonNote:['时干与时支按正午代入。', '时干、时支为正午代入。'],
      notesHead:['偏旺的能量 · 缺失的能量', '过多与缺失'],
      hiddenOnly:['{fam}没有出现在表面，但藏干里有{n}个。把它读作需要时慢慢取出的潜力。', '{fam}：表面缺失，藏干有{n}个。后期取用的潜力。'],
      over:{same:['比劫多，自立与自尊突出。你一个人能做很多事，但可能在分成上起冲突，涉及金钱的合作之前先定好规则。', '比劫过多：主见强、竞争多。共同资金与合作先定规则。'], drain:['食伤多，表达与才华外溢。点子和话语都很多，但向外输出太多会让你疲倦。养成把开了头的事做完的习惯，才能把才华变成成果。', '食伤过多：表达与产出多，耗损重。把收尾和开头同样排进日程。'], wealth:['财星多，现实感与金钱活动突出。你往往忙于很多事务和要照顾的人。', '财星过多：实务多、要管理的事多。'], control:['官星多，责任与期待可能显得沉重。承担的角色越多，清晰的标准越有帮助。', '官星过多：责任重、外界期待高。先划定角色边界。'], parent:['印星多，思考与学习深入。但如果习惯了接受，行动可能放慢。', '印星过多：思考与学习深，行动慢。']},
      none:{same:['比劫不在表面，所以与他人协调比独自硬撑更优先。累的时候，留一位可以依靠的同伴。', '比劫缺失：协调重于单打独斗。确保有合作者。'], drain:['食伤不在表面，把内心想法表达出来的通道可能偏窄。有意识地做一个出口，比如写作或记笔记。', '食伤缺失：表达通道偏窄。建立笔记或交谈等输出习惯。'], wealth:['财星不在表面，你往往比起金钱更追逐意义与人。理财可以靠习惯和工具来补足。', '财星缺失：用制度补足金钱观念。'], control:['官星不在表面，不被框架束缚的自由度很大。自己定下的期限和规则能让你保持重心。', '官星缺失：外在约束弱。自己设定期限与规则。'], parent:['印星不在表面，你往往靠亲身碰撞来学习，而不是靠别人的帮助。有意识地留出休息的时间和一位可信赖的顾问。', '印星缺失：边做边学。把休息与顾问排进日程。']},
      noneTail:['各组分布均匀，没有明显的过多或缺失。这是一个平衡的结构，可以根据情境灵活运用多种工具。', '没有任何一组过多（三个以上）或缺失。工具分布均匀。'],
      comboHead:['值得留意的组合', '结构组合'],
      combos:[{name:'食伤生财', text:['食伤与财星同时出现，才华容易转化为收入。把喜欢的事做成稳定的工作，往往能带来财运。', '食伤引向财星。把才华做成产品，赚钱更容易。']}, {name:'官印相生', text:['官星与印星同时出现，责任化为学习，学习化为实力。在组织里，资历与声望往往一起累积。', '官星生印星再生日干。有利于在组织中积累资历与声望。']}, {name:'食神制杀', text:['食神压制着偏官。压力来临时，你有用本事化解的力量。', '食神制住偏官。用技能化解压力。']}, {name:'伤官见官', text:['伤官与正官同时出现，你自己的想法可能与规则相撞。发表意见时遵循程序，就能把锋芒转化为说服力。', '伤官与正官并存。容易与规则冲突，所以通过程序表达意见。']}, {name:'官杀混杂', text:['正官与偏官同时出现，责任与角色可能从多个方向重叠。把优先级理清，混乱就会减少。', '正官与偏官并存。角色重叠，所以固定优先级。']}],
      what:'如何读十神（十星）', whatText:['十神把其他每个字与日干的关系分成十种。五行相同的是比劫，你所生的是食伤，你所克的是财星，克你的是官星，生你的是印星。阴阳相同称“偏”，阴阳不同称“正”（比肩与劫财是例外）。', '天干显示外在的样子，地支显示生活的根基，藏干显示尚未显现的潜力。这里地支的十神遵循本服务的规则，按地支的五行和阴阳来判断。'],
      cardMore:'展开阅读', cardAt:'{at} · {more}', modalCap:'{god}所在的位置', modalCols:['位置', '字', '宫位', '体现的领域'], outer:'外在的样子', base:'生活的根基', sitHead:['它在你命盘中的位置', '依据'],
      sitText:['表面上有{n}处；算上藏干，这种能量共有{h}个。', '表面{n}处，算藏干共{h}个。'], roleText:['在强弱中，这一组对你来说是{role}。{tail}', '在强弱中，这一组是{role}。'], roleGood:'越多地调动它，你越平衡。', roleCare:'不让它过头时，你最自在。',
      natureHead:['Yeoni 读到的气质', '判断'], careerHead:'工作与天赋', loveHead:['关系的样子', '关系'], adviceHead:['Yeoni 的建议', '行动标准']},
    god: {
      '비견':{line:['自主的根基：自己做决定并负责时最自在。', '自我标准与独立。署上自己的名字效率就会上升。'], nature:['比肩与日干五行相同、阴阳也相同：另一个你并肩而立。没人干涉、按自己的方式去做时你更有力量，安静的外表下，自尊与见解很坚定。你对同事讲义气，与合得来的人相处很久。', '比肩与日干五行阴阳均相同。核心：独立与信念。署上你名字的工作更出成果。对同事讲义气是优势。'],
        career:'适合保有独立性的专业工作、自由职业或小生意，或在组织里有明确属于自己领域的岗位。合伙时，从一开始就把分成与职责写下来。', love:'你在重视尊重而非束缚的朋友式关系里最自在。与彼此守护时间和空间的人往往能长久。', advice:['信念是很大的优势，但听起来也可能像固执。在一个重要决定上，留出“我也许错了”的余地，多听一个人的意见。', '分清自己决定的事与共同决定的事。共同决策时，确认有一个不同意见。']},
      '겁재':{line:['竞争与合作：身边有人同跑时更有劲。', '好胜与凝聚。有比较对象时速度更快。'], nature:['劫财与日干五行相同、阴阳不同：像你却不同，既是对手又是同伴。你有求胜的驱动力，也有聚集人心、扩大舞台的天赋。笑容背后，你可能已在盘算下一步。', '劫财五行相同、阴阳不同。核心：驱动力与凝聚。竞争中出成果，但资源也容易一起流失。'],
        career:'在竞争与人脉能转化为成果的销售、体育、娱乐、谈判、政治领域容易出头。带团队时，聚集人心是你的强项。', love:'你被有刺激、有激情的关系吸引。练习迁就而不是求胜，免得变成自尊心的较量。', advice:['进来多少，漏出去的口子可能同样大。做一个不受心情左右的机制，比如先自动存下一部分收入。', '竞争前先约定费用上限与分工。避免鲁莽投资和担保。']},
      '식신':{line:['稳定的表达与从容：打磨并分享你热爱的事。', '稳定的产出。重复自己喜欢的事，技艺就会累积。'], nature:['食神是日干所生、阴阳相同：饮食、手艺与从容的表达。你天性乐观大方，让身边的人舒服。你有工匠般钻研一件事的习惯，传统上它还能化解粗猛的偏官。', '食神由日干所生，阴阳相同。核心：稳定的产出与表达。重复喜欢的事，技艺与收入一同增长。也能制住偏官。'],
        career:'适合用手和头脑做出东西的工作：烹饪、教学、设计、研究、内容。做你热爱的事时，表现最好。', love:'你会建立互相照顾、一起享受的温暖关系。往往在分享美食与日常中感受到爱。', advice:['因为太大方，你可能对谁都给，把自己耗干。留一条让身体动起来的小规矩，别让舒适变成松懈。', '从可重复的量开始，留下完成的东西。给“付出”设个上限。']},
      '상관':{line:['质疑框架、找到更好的办法：机智与改进。', '批判性思考与表达。善于发现并修正问题。'], nature:['伤官是日干所生、阴阳不同：思维敏捷、能言善辩、敢于打破框架的创造力。你无法对不合理的事视而不见，在别人都接受的地方问“为什么”。这份锋利可以成为改进与创新，也可能与上级产生摩擦。', '伤官由日干所生，阴阳不同。核心：批判性思考与表达。会与正官（规则、上司）相撞，所以表达方式决定结果。'],
        career:'在策划、营销、媒体、法律、咨询或创意工作中容易发光，新的视角与语言就是你的工具。规则非常严密的组织可能让你觉得窒息。', love:'你被能聊得来的机智伴侣吸引。你难以忍受无聊，一起尝试新事物的关系更适合你。', advice:['一句话可能赢得人心，也可能失去人心。情绪激动时，先深呼吸三次，指出问题时再附上一个替代方案。', '指出问题时提出替代方案。情绪高涨时推迟决定。']},
      '편재':{line:['在广阔的世界里行动，抓住机会、带动人群。', '发现机会、流通资源。擅长大局与分配。'], nature:['偏财是日干所克、阴阳相同：流动的钱财与广阔的活动范围。你不纠结小事，看的是大势，幽默与社交能力让人亲近你。你更擅长让钱流动，而不是存钱。', '偏财由日干所克，阴阳相同。核心：发现机会、流通资源。收入与支出一起大幅波动。'],
        career:'适合贸易、流通、销售、投资、海外与业务拓展，通过调动人与资源来出成果。', love:'你喜欢有趣而大胆的关系，也擅长让伴侣开心。兴趣容易分散，要有意识地留出给一个人的时间。传统上，这一组也被读作男性的伴侣星。', advice:['机会多了，计划外的花销也容易发生。钱进来时，先把一部分锁在不容易取出的地方。', '投资或花钱前先设定亏损上限。立刻锁定固定比例的收入。']},
      '정재':{line:['一步步积攒、谨慎守成：勤勉与管理。', '管理与积累。在稳定的结构里稳步成长。'], nature:['正财是日干所克、阴阳不同：诚实赚来的固定收入与节俭的管理。你过桥先敲石头，看重承诺与信用，做事有始有终，所以人们乐意把事情交给你。', '正财由日干所克，阴阳不同。核心：谨慎管理与稳步积累。资产靠稳定的重复而非一次大赢来增长。'],
        career:'在会计、金融、行政、管理、药学等讲究准确与信任的体系化领域容易展现实力。稳定的薪资结构适合你。', love:'你最看重信任与稳定。比起随意开始，更喜欢认真而长久的关系，也擅长一起经营生活。传统上，这一组也被读作男性的伴侣星。', advice:['过于谨慎会让你对自己的快乐也吝啬。偶尔不计算地花一笔小小的浪漫。', '定好支出标准，同时为体验与关系另设一份预算。']},
      '편관':{line:['忍耐艰难、担起责任：魅力与克服。', '对压力的反应。在危机中决断并坚持。'], nature:['偏官又称七杀，是克制日干、阴阳相同的星。它意味着强大的压力与考验，也带来承受它的力量与魅力。你重视自尊与荣誉，有想保护弱者的侠义心。身边有食神或印星时，这股粗猛的力量会被磨成权威。', '偏官克制日干，阴阳相同。核心：压力下的决断力。日干强则化为权威，日干弱则感到压力。'],
        career:'在紧张、责任重的一线容易证明自己：军队、警察、法律、医疗、安全、危机管理。纪律清晰的地方，领导力会显现。', love:'你希望伴侣认可并尊重你，一旦交出真心就守到最后。传统上，这一组也被读作女性的伴侣星。', advice:['你把艰难咽在心里，所以心可能先累。给压力找一个出口，比如出汗的运动或能沉浸的爱好。', '写下你的责任范围。通过运动等规律习惯释放压力。']},
      '정관':{line:['守正道、建立信任：责任与秩序。', '原则与信任。在制度中建立声誉。'], nature:['正官是克制日干、阴阳不同的星：端正塑造你的规则与荣誉。你守原则、在岗位上负责，所以到哪里都被称为“靠得住的人”。你在意体面与声誉。', '正官克制日干，阴阳不同。核心：原则与信任。在有组织的职场中获得评价与晋升。'],
        career:'在制度和流程清晰的公共机构、行政、教育、大公司、管理岗位容易发光。', love:'你偏好有礼、整洁的关系，被守信用、靠得住的伴侣吸引。传统上，这一组也被读作女性的伴侣星。', advice:['正确的标准有时会变成束缚你的框架。偶尔先选自己觉得对的，再考虑别人怎么看。', '守规则，同时分清哪些规则可以改、哪些必须守。']},
      '편인':{line:['从不寻常的角度看到隐藏的原理：直觉与洞察。', '直觉与独立的视角。看见别人忽略的东西。'], nature:['偏印又称枭神，是生养日干、阴阳相同的星。你直觉与灵感都强，反应机敏，所以最先察觉到别人在表面之后忽略的东西。你被哲学、心理、技术这类深挖的领域吸引，需要独自思考的时间。', '偏印滋养日干，阴阳相同。核心：直觉与独立解读。点子多，但执行容易滞后。'],
        career:'适合需要非凡洞察与专业知识的研究、IT开发、心理、咨询、医疗与艺术。', love:'你看重灵魂的相遇胜过条件，希望不必开口就被理解。', advice:['因为很有深度，想法可能在脑子里打转，直到时机过去。这周把一个点子落到手上，哪怕很小。', '给每个点子定一个第一步行动的日期。复盘在截止日前结束。']},
      '정인':{line:['给予并接受学习与呵护：求学与靠山。', '学习与靠山。求学与认可推动成长。'], nature:['正印是生养日干、阴阳不同的星：母亲怀抱般的呵护与学习。你温暖、爱学习，一步步积累知识与资历。长辈的帮助和人缘运往往随之而来。', '正印滋养日干，阴阳不同。核心：学习与靠山。资历、学位与师长转化为成果。'],
        career:'在人们学习与传授的教育、学术、咨询、出版、凭资格执业的领域容易做得好。', love:'你喜欢温暖体贴的伴侣，对精神上的联结和赞美会敞开心扉。', advice:['习惯了接受爱之后，自己做决定可能变难。一次做一个小决定，培养独立的肌肉。', '该你决定的地方自己决定。把所学与付诸实践的日期绑在一起。']}},

    /* ── ilju ── */
    il: {
      leadHead:['Yeoni 为你排开的四柱', 'Neo 的判断'], dayBadge:'{name}日干', branchBadge:'日支 {god}', stageBadge:'十二长生 {stage}',
      leadText:['你的中心是{name}日干，其下的日支{dj}是{stage}位上的{god}。把四柱铺开来读，是这样的。', '{name}日干，日支{dj}（{god} · {stage}）。下表是依据。'],
      cap:'四柱', cols:['柱', '干 · 十神', '支 · 十神', '藏干', '十二长生', '宫位'], dayStemMe:'日干（自己）',
      note:['十二长生以日干为准来读，阴干逆行（阴生阳死的标准）。宫位对应的年龄是传统的根、苗、花、果划分。', '十二长生以日干为准，阴干逆行。宫位年龄为传统的根至果划分。'],
      imgHead:'{name}日干的意象', imgText:['{name}日干，{note}。命盘中的每个字都按与日干的关系来读，所以了解它的质地是解读的第一步。', '{name}日干：{note}。日干是基准点，其余七字按与它的关系来读。'],
      spouseHead:['坐在伴侣宫的能量', '日支 · 伴侣宫'],
      spouse:{same:['日支是比肩，伴侣位上坐着与你相似的能量。平等、朋友般的关系让你舒服，彼此尊重空间就能长久。', '日支比劫：平等伴侣型。尊重彼此空间的规则是关键。'], drain:['日支是食伤，表达与关怀从伴侣位流出。在一起享受、把感受说出口的关系里，幸福来得容易。', '日支食伤：表达与关怀多。情感表达维系关系。'], wealth:['日支是财星，伴侣位带着共同建设现实生活的能量。一起规划日常并细心照顾的关系适合你。', '日支财星：务实、规划生活的关系。把财务与分工讲清楚。'], control:['日支是官星，伴侣位带着责任与秩序。你想要互相信任的稳固关系，也看重承诺。', '日支官星：以责任与信任为中心的关系。用语言约定期待。'], parent:['日支是印星，伴侣位带着呵护与理解。你在情感上互相依靠、一起学习的关系里自在。', '日支印星：情感上互相扶持的关系。别让依赖倾向一方。']},
      stageText:['日支的十二长生是{stage}：{first}。在日常里，往往表现为{second}。', '日支十二长生{stage}：{desc}。'],
      stagesHead:['用十二长生看人生四季', '十二长生的流转'],
      gmHead:'空亡', gmText:['空亡是日柱所属的十天周期里没有配对的两个地支，据说落在那里的能量会感到空虚。你的空亡是{list}。{hit}', '空亡：{list}。{hit}'],
      gmHit:['在你的命盘里，{list}落在空亡上。这些方面可能不如期望的那样充实，但用在精神层面或学习上，则被读作加深。', '命盘中：{list}。那里实际感受到的成果可能弱于期待；把它用在内涵与学习上，而不是求利。'], gmMiss:['命盘中的其他位置都不落在空亡上。', '命盘中没有位置受影响。'],
      gmNote:['各流派对空亡的看重程度不同，请仅作参考。', '空亡的权重因流派而异。仅作参考。'],
      wordHead:['Yeoni 的话', 'Neo 的一句话总结'],
      word:{'甲':['笔直生长的树不会一下子长大。这周，把一个大目标切成今天就能迈出的一步。', '定方向是强项。把大目标拆成本周的单位。'], '乙':['藤蔓找到可以依靠的东西，才能伸得很远。求助也是你的强项，这周先联系一个人吧。', '联结是强项。这周先向一位合作者开口。'], '丙':['太阳自己会发光，但休息的夜晚也很重要。今天为那段一直推迟的休息预约一个时段吧。', '表达是强项。先把休息排进日程，避免耗尽。'], '丁':['灯在长时间照亮近处时最温暖。今天，具体地向身边的一个人说声谢谢。', '专注是强项。缩小范围，做完一件事。'], '戊':['山以不动给人信任。有时也让风吹过：这周对一个新提议回答“好”。', '稳定是强项。这周试一个新提议。'], '己':['田地会因所种之物而变。在你为别人耕耘的田里，今天为自己种下一粒种子。', '务实是强项。这周分配一项资源用于投资自己。'], '庚':['铁遇火成为有用的工具。今天，不要回避一件磨炼你的难事：接下一点。', '果断是强项。今天开始一件拖延已久的难事。'], '辛':['珠宝经过打理才更闪亮。今天对自己说一次：不完美也没关系。', '标准很高。练习做到八成就拿出来分享。'], '壬':['大水有堤岸才能流得远。从你铺开的诸多兴趣里，选出这周要守住的那一个。', '视野宽广。这周固定一个优先事项。'], '癸':['露水虽小，却恰好润湿需要的地方。记下今天的一个直觉，之后它会成为指引。', '直觉是强项。记下理由并核对。']}},

    /* ── flow ── */
    fl: {
      names: ['需要较多调整的运势', '需要些许调整的运势', '一般的运势', '顺畅的运势', '非常顺畅的运势'],
      yearTitle: '你的一年（流年）{gz}', yearPre: '{year}年 · ', periodTitle: '你现在所处的位置（当前大运）{gz}',
      age: ' · {a}–{b}岁（韩国虚岁）', badgeScore: '运势分数 {score}', badgeYear: '流年 · 一年', badgePeriod: '大运 · 十年', ends: ['需要调整', '顺畅'], caption: '运势分数 {score}', aria: {year:'今年的运势分数 {score}', period:'当前大运的运势分数 {score}'},
      relNotes: {chung:'推动变化或移动的力量', transformed:'满足合化条件', he:'结合与合作的契机'},
      relTypes: {stemChung:'天干冲', branchChung:'地支冲', stemHe:'天干合', branchHe:'地支合'},
      tblCap: {year:'流年柱与你的日干', period:'大运柱与你的日干'}, tblCols: ['字', '五行', '十神', '十二长生', '在强弱中'], stemRow: '天干 {c}', branchRow: '地支 {c}', hiddenNote: '地支{c}的藏干：{list}',
      family: {same:['与自己相同的能量之运，想自己拿主意、自己站稳的心往往会增强。与同事的竞争也可能增多，先定好分成会有帮助。', '比劫运：自立与竞争的议题增多。先为共享资源定好分成与规则。'], drain:['把内在向外倾注的运势，表达、创作、教学往往顺利。很多能量会流出，也请规划恢复的时间。', '食伤运：表达与产出增多。提高输出，同时设定管理耗损的标准。'], wealth:['现实成果与金钱引人注目的运势。适合拓展工作，把能承担的范围写成数字，心会更稳。', '财星运：成果与财务议题增多。用数字定下扩张上限。'], control:['责任与角色变重的运势。获得认可的机会会和更大的负担一同到来，分清哪些要接、哪些要放下。', '官星运：责任与评价压力增大。区分要接受的角色与要拒绝的角色。'], parent:['学习与帮助到来的运势。学习、考取资格或遇到好顾问都比较容易，把收到的东西变成小小的行动。', '印星运：学习与支持到来。排好把输入转为行动的计划。']},
      noRel: ['没有任何位置与你命盘中的字直接相合或相冲。', '与命盘没有直接的合或冲。'],
      tone: {open:['读作顺畅的运势。先小规模尝试你准备好的事。分数是比较用的参考，并不承诺结果。', '判断上属较轻松的区间。把准备好的事小规模推进。分数不保证结果。'], even:['读作既不用力推也不用力拉的一般运势。继续做手头的事，不时确认方向即可。分数是比较用的参考，并不承诺结果。', '判断上属中间区间。保持进行中的事，确认方向。分数不保证结果。'], care:['读作需要调整的运势。放慢速度，理顺角色与日程，同一段时期会轻松得多。请不要只凭分数做重大决定。', '判断上属调整区间。理顺日程与角色，保留选择余地。不要只凭分数下结论。']},
      free: '※ 到这里为止都是免费的。完整的十年运势、各个流年的详细内容与综合解读，将在下方的会员内容中继续。'},

    /* ── daily ── */
    da: {
      dayTitle: '今日日柱 {gz}', monthTitle: '本月月柱 {gz}', today: '今天', month: '本月', badge: '能量 {bp}%',
      names: ['先恢复', '平稳', '顺畅', '势头强劲'], ends: ['放慢', '强劲'], caption: '能量仪表 {bp}%', aria: '{when}的能量仪表 {bp}%',
      tags: {fast:'加速', even:'平衡', rest:'暂停'}, boost: '补{el}', tblCap: '{when}到来的能量与你的日干',
      godHead: ['用十神读{when}', '按十神判断'], nothing: ['没有明显与命盘相冲的地方。重要的消息发出前，再读一遍。', '没有明显的关系。重要消息发出前再次确认。'], checkHead: ['请留意', '检查要点'],
      boostHead: '幸运加成', boostLabel: '要补的五行', boostNote: ['补充所缺的轻松日常小提示。当作一点小小的心情调剂来享受吧。', '补充关键平衡五行的日常提示。不保证任何效果。'],
      god: {'비견':['自己的判断会更清晰的时期。独自决定也可以，但用一句话写下理由，以免之后动摇。', '独立判断有利。用一句话记录理由。'], '겁재':['好胜心与干劲一起上升。把冲动的花销或赌注推迟一天，心里会更轻松。', '竞争与冲动增强。冲动的花销搁置一天。'], '식신':['喜悦与点子涌现。把你想到的一个点子，哪怕很小，立刻做成点什么。', '产出力上升。现在就把一个点子化为行动步骤。'], '상관':['言语与表达有分量。适合演讲与创作；合同或正式声明发出前，请再读一遍。', '表达增强。正式文件与声明发布前再次确认。'], '편재':['机会与波动同时变大。先从确认过的小事开始，而不是大的赌注。', '机会与波动都大。以小而已验证的事项推进。'], '정재':['细致务实的工作发光的时期。梳理一遍收入与支出，心会变轻。', '准确度上升。整理收支记录。'], '편관':['你可能感到压力。与其全部扛下，不如选一件你要坚守的事，坚持住，它会以信任的形式回来。', '压力来临。聚焦一项核心责任，会以信任的形式回报。'], '정관':['责任与信任显现的时期。适合办理正式文件和手续。', '适合办理正式手续。明确责任范围。'], '편인':['直觉变得敏锐。记下浮现的预感，并小范围地验证。', '直觉主导。记录预感并小范围验证。'], '정인':['适合学习与整理的好时机。向信任的人请教，思路会变清晰。', '学习与分析高效。请教可信赖的顾问。']},
      tone: {open:['能量以不弱的力度进来。挑一件要做的事先做完，就能顺势而行。', '能量富余区间。先完成最优先的一件事。'], care:['先照顾好内在电量的时期。稍微放慢，失误会减少，人际也会缓和。', '能量养护区间。降低速度，多加一个确认步骤。']},
      sumHead: ['Yeoni 的话', 'Neo 的总结']}
  };

  COPY['zh-TW'] = {
    voice: ['Yeoni', 'Neo'],
    sep: '、',
    el: {wood:'木', fire:'火', earth:'土', metal:'金', water:'水'},
    fam: {same:'比劫（同伴）', parent:'印星（助力）', drain:'食傷（表達）', wealth:'財星（財務）', control:'官星（責任）'},
    famMeaning: {same:['與自己相同的能量', '同伴意識與自立'], parent:['支持你的能量', '學習與靠山'], drain:['向外輸出的能量', '表達與才華'], wealth:['由你去經營的能量', '資源與現實成果'], control:['塑造你的能量', '責任與秩序']},
    pos: {yg:'年干', yj:'年支', mg:'月干', mj:'月支', dg:'日干', dj:'日支', hg:'時干', hj:'時支'},
    palace: {y:{label:'年柱', palace:'祖輩 · 早年', span:'0–15歲', domain:'根基、家庭、童年環境'}, m:{label:'月柱', palace:'父母 · 青年', span:'16–30歲', domain:'父母、兄弟姊妹、踏入社會'}, d:{label:'日柱', palace:'自己 · 伴侶', span:'31–45歲', domain:'自己與伴侶宮'}, h:{label:'時柱', palace:'子女 · 晚年', span:'46歲以後', domain:'子女、晚年、成果'}},
    role: {'용신':'關鍵平衡（用神）', '희신':'助力（喜神）', '기신':'負擔（忌神）', '구신':'加重負擔（仇神）'},
    roleShort: {'용신':'關鍵平衡', '희신':'助力', '기신':'負擔', '구신':'加重負擔'},
    noonMark: '（以正午計）', unknownCell: '不詳', none: '—',
    stem: {'甲':'甲（陽木）', '乙':'乙（陰木）', '丙':'丙（陽火）', '丁':'丁（陰火）', '戊':'戊（陽土）', '己':'己（陰土）', '庚':'庚（陽金）', '辛':'辛（陰金）', '壬':'壬（陽水）', '癸':'癸（陰水）'},
    animal: {'子':'鼠', '丑':'牛', '寅':'虎', '卯':'兔', '辰':'龍', '巳':'蛇', '午':'馬', '未':'羊', '申':'猴', '酉':'雞', '戌':'狗', '亥':'豬'},
    stemNote: {
      '甲':'像筆直向上生長的大樹，認準方向、願意帶頭，也守著自己的驕傲',
      '乙':'像彎而不折的藤蔓與花草，柔軟而堅韌，擅長把日子經營得有條理',
      '丙':'像普照萬物的太陽，明亮、善於表達、存在感鮮明',
      '丁':'像黑暗中的一盞燈，細膩、溫暖、有深度',
      '戊':'像厚重的大山，穩定可靠、重心紮實',
      '己':'像肥沃的田地，務實、包容、擅長處理現實事務',
      '庚':'像礦石與鋼鐵，果斷、重義氣、有競爭力',
      '辛':'像打磨過的珠寶，感受敏銳、講究精細、富有美感',
      '壬':'像大江大海，思路開闊、靈活、氣度寬廣',
      '癸':'像露水與泉水，清澈、敏感，靜靜蘊藏著生命力'},
    stage12: {
      '장생':['長生', '開始成長的階段 · 學習與起步的力量'], '목욕':['沐浴', '初次接觸世界的階段 · 好奇、敏感與變化'],
      '관대':['冠帶', '走入社會的階段 · 自信與推進力'], '건록':['建祿', '靠自己謀生的階段 · 自立與實務能力'],
      '제왕':['帝旺', '能量最飽滿的階段 · 主導力與強烈的自信'], '쇠':['衰', '過了頂點而趨於成熟 · 經驗與體貼'],
      '병':['病', '能量安靜下來、變得細膩 · 共感與體諒'], '사':['死', '動作停止、思考加深 · 專注與探究'],
      '묘':['墓', '收入倉庫的階段 · 積蓄、管理與充實內在'], '절':['絕', '與過去切斷而轉變 · 轉折與決斷'],
      '태':['胎', '新生命孕育的階段 · 規劃與潛力'], '양':['養', '在庇護中成長的階段 · 準備與呵護']},
    hidden: {first:'餘氣', mid:'中氣', last:'本氣'},
    ganji: '年 · 月 · 日 · 時',

    /* ── climate ── */
    temp: ['偏寒', '偏涼', '寒暖均衡', '偏暖', '偏熱'],
    moist: {dry:'偏乾燥', balanced:'均衡', wet:'偏潮濕'},
    season: {spring:'春', summer:'夏', autumn:'秋', winter:'冬'},
    env: {
      colddry:{title:'安靜整潔的冬日小屋', text:['在這樣的氣候裡，沉靜的理性與清晰的界線感格外突出。在沒有嘈雜的安靜之處，專注力會回來。分析、規劃、研究這類需要獨自深挖的工作比較適合你，保持禮貌而適度的距離，往往會變成信任。事先告訴身邊的人你需要時間才能敞開心扉，誤會就會減少。', '環境類型：冬日小屋。安靜有序的環境裡專注力上升。適合深挖型工作：分析、規劃、研究。人際上，守住的界線會變成信任。事先說明自己表達感情較慢。']},
      coldwet:{title:'黎明時霧氣籠罩的湖', text:['表面平靜，水面之下思緒與情感緊密相連。在能分享內心、深入交談的地方，你會獲得能量。讀懂人心背後的諮商、心理、藝術類工作比較適合，慢慢建立的親近感會很持久。思緒下沉的日子，用陽光和輕度運動補一點暖意。', '環境類型：黎明之湖。外表安靜，內在處理沉重。適合讀懂人心背後的工作：諮商、心理、藝術。關係慢慢加深。思緒下沉時，用陽光和輕度運動提升節奏。']},
      hotdry:{title:'正午的沙漠', text:['目標一旦清晰，你就會毫不猶豫地行動。決斷快、不記仇，所以在講究速度的場合容易出成果。開創、銷售、短期專案比較適合，不掩飾真心也是你的魅力。熱度升高時，別忘了不時看看身邊人的節奏。', '環境類型：正午沙漠。目標一定就直線前進，決斷也快。適合講究速度的工作：啟動、銷售、短期專案。坦率是優勢。加速時留意對方的節奏。']},
      hotwet:{title:'生機蓬勃的夏日森林', text:['你在與人交往中成長。好奇心與親和力很強，人群聚集的地方，能量就會流動起來。以溝通為中心的教學、人資、行銷、寫作比較適合，豐富地分享感受能累積經驗。行程容易排滿，請先留出獨自喘口氣的時間。', '環境類型：夏日森林。能量在人與人之間流動，並隨之成長。適合以溝通為中心的工作：教學、人資、行銷、寫作。情感表達豐富。行程容易超載，先確保獨處時間。']}},
    rx: {
      hot:{need:'水 · 金', color:'藍、黑、白', dir:'北、西', act:'水邊散步、游泳、溫水泡腳、冥想', less:'劇烈運動、炎熱的地方、過多的紅色'},
      warm:{need:'水', color:'藍、天藍、薄荷綠', dir:'北', act:'多喝水、去溪流和海邊走走、降溫伸展', less:'暴飲暴食、吃宵夜'},
      neutral:{need:'隨季節調整', color:'隨季節變化', dir:'不固定', act:'春秋做木、金類活動，夏天親近水，冬天做火、木類活動', less:'偏向一邊的作息'},
      cool:{need:'火 · 木', color:'橙、綠、暖紅', dir:'南、東', act:'曬太陽、半身浴、伸展與瑜伽', less:'冷食、長時間待在冷氣房'},
      cold:{need:'火 · 木', color:'紅、橙、淺綠', dir:'南、東', act:'吃熱食、熱水泡澡、暖身有氧運動、多曬太陽', less:'冷水浴、強冷氣、只穿深色衣服'}},
    moistRx: {dry:{need:'水 · 木', act:'多喝水、加濕、去森林或水邊散步、養綠植'}, wet:{need:'金 · 火', act:'經常通風、曬被褥、用白色或金色點綴、在人際中劃清界線'}, balanced:{need:'無需額外補充', act:'潮濕與乾燥較為均衡，把重心放在溫度一側'}},
    rxLabel: ['要補的能量', '顏色', '方位', '行動', '適度減少', '濕度平衡'],
    climate: {
      tempBadge:'溫度分數 {s}',
      lead:['Yeoni 讀到的氣候', 'Neo 的氣候判斷'], env:['從氣候看你的環境', '氣候對應的環境類型'], parts:'各字的溫度與濕度', count:'推動溫度的四種能量',
      verdict:['你出生在{season}月。季節決定的基準溫度是{base}，加上八字的暖與寒，溫度分數為{score}，讀作「{type}」。濕度方面有{wet}個潮濕訊號、{dry}個乾燥訊號，屬於{moist}。', '判斷：{type}；濕度：{moist}。{season}月基準{base}，加上各字貢獻，溫度分數{score}；潮濕{wet}、乾燥{dry}。'],
      versus:['氣候平衡與強弱平衡', '氣候平衡與強弱平衡對比'], rx:'氣候平衡指南 · 日常調整',
      rxIntro:['傳統命盤用象徵來補足缺少的部分，這裡把它換成日常語言。挑一個你喜歡的，試上一週左右。', '這是補足缺少部分的日常方法。選一個堅持一週，記錄狀態的變化。'],
      note:'這些建議是對傳統象徵體系的轉譯，不是健康或醫療建議。身體如有不適，請先諮詢專業人士。',
      warm:'暖', cold:'寒', tags:{fire:'火', wood:'木', metal:'金', water:'水'}, tagNotes:{fire:'暖 +1.5', wood:'暖 +0.5', metal:'寒 −0.5', water:'寒 −1.5'},
      cols:['位置', '字', '五行', '溫度', '濕 · 燥'], base:'季節基準', total:'合計', dampWord:'濕', dryWord:'燥',
      gaugeTemp:{ends:['寒', '暖'], caption:'溫度分數 {score}', aria:'溫度儀表：分數 {score}，{type}'},
      gaugeHumid:{ends:['燥', '濕'], caption:'濕 {wet} · 燥 {dry}（差 {diff}）', aria:'濕度儀表：{wet}個潮濕訊號，{dry}個乾燥訊號，{moist}'},
      vNone:['溫度均衡，所以氣候方面沒有急需補充的能量。從強弱一側讀關鍵平衡就足夠了。', '溫度均衡，氣候上無急需能量。以強弱平衡為主判斷。'],
      vJong:['從氣候看，{need}能量是受歡迎的。但這張命盤按從格來看，應先順著聚集的勢頭，把氣候當作日常的輔助。', '氣候需要{need}。因為是從格，先順著聚集的勢頭。'],
      vSame:['氣候所需的{need}能量，與強弱得出的關鍵平衡（{yong}）重合。兩種看法方向一致，把這種能量穩定地留在身邊，是最清晰的補足方式。', '氣候所需（{need}）與強弱的關鍵平衡（{yong}）重合。方向一致，補足的優先順序明確。'],
      vExtreme:['氣候指向{need}，強弱指向{yong}，方向略有不同。溫度明顯偏向一邊，所以先考慮氣候的季節平衡，再把強弱放在第二位。', '氣候指向{need}，強弱指向{yong}。方向不同。溫度極端，因此氣候為主、強弱為輔。'],
      vMild:['氣候指向{need}，強弱指向{yong}，方向略有不同。溫度並不極端，所以以強弱得出的關鍵平衡為中心，把氣候當作季節上的幫手。', '氣候指向{need}，強弱指向{yong}。方向不同。溫度不極端，因此強弱為主、氣候為輔。'],
      vNote:['氣候看的是出生季節的溫度與濕度，強弱看的是日干的力量大還是小。兩者都不被當作唯一答案，由命盤決定先看哪一個。', '氣候讀季節的冷暖乾濕，強弱讀日干力量的多寡。單看任何一方都不是答案。'],
      what:'暖、寒、燥、濕是什麼？', whatText:['這些詞描述命盤的溫度（冷或熱）與濕度（乾或潮）。就像自然有四季和天氣，人的氣質也被認為有氣候，由此可以看出你在怎樣的環境裡安心、更能發揮所長。', '命盤的冷暖與乾濕。顯示在怎樣的環境裡力量用得好。'],
      four:[['寒', '冬天凝聚的能量。讀作向內收斂、沉靜而謹慎的力量。'], ['暖', '夏天外放的能量。讀作熱情、表達與向外伸展的力量。'], ['燥', '秋天緊緻的能量。讀作乾脆的取捨與清爽的質地。'], ['濕', '春天交織的能量。讀作共感、親和與共同成長。']],
      how:'計算方法：月支決定基準溫度（子、丑 −4，亥 −3，戌 −2，寅、酉 −1，卯、申 +1，辰 +2，巳 +3，午、未 +4）。立春之後寅仍帶寒意，立秋之後申仍帶暑氣。八字全盤中，火加 +1.5，木加 +0.5，金加 −0.5，水加 −1.5。潮濕計水、木、辰、丑，乾燥計火、金、戌、未，再互相比較。分數 5 以上讀作熱，2 以上讀作暖，−2 以上讀作均衡，−5 以上讀作涼，更低讀作寒。'},

    /* ── strength ── */
    stage: ['極弱', '偏弱', '偏弱（接近均衡）', '偏強（接近均衡）', '偏強', '極強'],
    strengthLead: ['Yeoni 讀到的強弱', 'Neo 的強弱判斷'],
    str: {
      jongHead:['從格', '從格'],
      jongLead:['你的命盤把{dom}能量{pct}聚集起來，被判定為{name}。這樣的結構不用一般的強弱尺度來衡量，而是順著聚集的勢頭來讀。', '判斷：{name}。{dom}能量{pct}主導命盤。不適用一般的強弱公式。'],
      jongBadge:'強弱 {score}（參考）', jongPct:'約{pct}%',
      jongWhat:'什麼是從格？', jongWhatText:['當某一種五行強到壓過整張命盤時，順著它的勢頭比逆著它更自然。所以上面的強弱分數只作參考，以下面的結構說明為中心。', '當某一種五行壓倒命盤時，順從它是對策，因此強弱分數只是參考。'],
      jongKind:{wood:'木主導的結構，用好筆直生長與規劃的能量會很自然', fire:'火主導的結構，用好明亮的熱情與表達會很自然', earth:'土主導的結構，順著累積與守護的能量會很自然', metal:'金主導的結構，用好果斷與精煉的剛勁會很自然', water:'水主導的結構，用好流動而靈活的智慧會很自然', parent:'被印星壓倒的結構，乘著學習與靠山的大勢前行', drain:'被食傷壓倒的結構，順著把才華與表達帶到世間的流向', wealth:'被財星壓倒的結構，順著資源與現實成果的流向', control:'被官星壓倒的結構，乘著組織與責任的大勢前行', change:'干相合而化為一種能量的化格，圍繞這種新能量來讀', other:'由單一能量主導的特殊結構，順著它的勢頭會很自然'},
      kindHead:['你的結構', '結構類型'], dirHead:'運勢的方向',
      dirText:['當運勢滋養{dom}能量時，流勢往往順暢延續；逆著這股勢頭的運勢裡，可能需要更多調整。與其把力量分散，不如把天生的一項強處做深，這更適合此結構。', '滋養{dom}能量的運勢往往順暢，逆著它的運勢會增加調整。集中在一項強處上。'],
      gaHead:'假從格', jinHead:'接近真從格',
      gaText:['還殘留著一點支撐日干的弱根，所以隨著運勢，命盤可能穩定為從格，也可能回到一般結構。請對照你實際走過的經歷。', '仍有微弱的支撐根。隨運勢可能定為從格，也可能回到一般結構。對照自己的經歷查驗。'],
      jinText:['順從優勢五行的流向很清晰。', '順從優勢五行的流向清晰。'],
      leadNormal:['你的強弱分數是{score}，讀作{stage}。強與弱的分界線是30，你的{stem}日干比它{dir}{gap}分。', '判斷：{stage}（{sw}）。強弱分數{score}，比基準30{dir}{gap}分。'],
      above:'高', below:'低', strongWord:'強', weakWord:'弱',
      tagStrong:['你更接近自我驅動型。', '類型：自我驅動。'], tagWeak:['你更接近敏感、體貼、善於協作的類型。', '類型：體貼協作。'],
      badge:'強弱 {score}', baseBadge:'基準 30', typeStrong:'自我驅動', typeWeak:'協作型',
      gauge:{ends:['偏弱', '偏強'], baseLabel:'基準 30', caption:'強弱分數 {score}（基準30）', aria:'強弱儀表：分數 {score}，{stage}，基準30'},
      threeHead:['背後的三股力量', '季節、支與助力'], threeCap:'季節、支、助力', threeCols:['因素', '字', '判斷', '分數'],
      rowMonth:'季節 · 月支', rowDay:'根基 · 日支', rowRest:'助力 · 其餘五字', vMonthPos:'得令', vMonthNeg:'失令', vFootPos:'有根', vFootNeg:'無根', vRestPos:'有助力', vRestNeg:'缺助力', vFlat:'持平', sumLabel:'合計',
      partsOpen:['查看各字分數', '各字分數'], partsCap:'各字的強弱分數', partsCols:['位置', '字', '五行', '與日干的關係', '分數'],
      whyHead:['為什麼是{sw}', '為什麼{sw}'],
      monthRel:{same:['得令', '月份與日干五行相同，所以根基穩固。', '月支與日干五行相同。根基穩固。'], parent:['得令', '月份是生養日干的印星月，所以你得到很多支持。', '月支為印星，生養日干。支持強。'], control:['失令', '月份是剋制日干的官星月，所以能量容易被壓住。', '月支為官星，剋制日干。能量受壓。'], drain:['失令', '月份是日干向外傾瀉能量的食傷月，所以能量向外流出。', '月支為食傷，洩耗日干。能量外流。'], wealth:['失令', '月份是日干需要經營的財星月，所以你處在要耗用力量的位置。', '月支為財星，由日干經營。是耗用力量的位置。']},
      whySeason:['看出生月（季節），是{tag}。{rel}', '季節：{tag}。{rel}'], whyNeutral:['出生月與日干的關係是中性的。', '季節中性。'],
      whySum:['再加上日支和其餘各字給予或奪走日干的部分，合計{score}分。', '季節再加上日支及其他字的助力與壓力，合計{score}分。'],
      whyStrong:'你有足夠的力量獨立站穩，所以讀作強。', whyWeak:'相比外界的要求，你自身的力量略顯不足，所以讀作弱。這不是缺點，而是敏感與靈活的根基。',
      stemHead:['{stem}日干的質地', '日干 {stem}'],
      stemStrong:['你力量充足，向外使用時更能發光。分享成果、幫助他人、擔任負責的角色能讓你保持平衡。一個人包攬一切反而容易覺得憋悶。', '你有富餘的力量，向外使用效率更高。分享成果，擔任負責的角色。'],
      stemWeak:['你的力量在認可你的人和環境旁邊用得最好。與其硬擠到前面，不如先用學習、準備與合作把根紮好。', '資源偏少，用準備、學習與合作穩住根基。過度強出頭代價大。'],
      stemLine:['{stem}：{note}。', '{stem}：{note}。'],
      godHead:['支持你的能量 · 需要留意的能量', '關鍵平衡 / 負擔'], godTags:{good:['關鍵平衡', '助力'], care:['負擔', '加重負擔']},
      godText:['當關鍵平衡與助力的五行隨運勢到來時，事情往往順利，也更容易遇到幫助。當負擔的五行轉強時，在大幅擴張或做決定之前，放慢一拍、多看一會兒。', '關鍵平衡與助力五行隨運勢到來時往往順利；負擔五行轉強時，降低擴張速度更穩妥。'],
      godWhat:'關鍵平衡、助力、負擔、加重負擔是什麼？', godWhatText:'關鍵平衡（用神）是命盤為了平衡最需要的五行，助力（喜神）是幫助它的五行。負擔（忌神）是損害關鍵平衡的五行，加重負擔（仇神）是滋養負擔的五行，中性（閒神）則不偏向任何一邊。本命盤的演算法把五行全部分成支持與負擔兩側，所以不單獨保留中性五行。',
      cycHead:'運勢方向一覽', cycStrong:['食傷、財星、官星的運勢，是把能量向外使用並轉化為成就的運勢，社會成果容易成熟。', '食傷、財星、官星運勢（力量向外使用並化為成果）有利。'], cycWeak:['比劫、印星的運勢，是充實並支持你的運勢，自信與幫助往往一起到來。', '比劫、印星運勢（被充實、被支持）有利。'],
      what:'什麼是強弱（抑扶）？', whatText:'強弱是透過日干太強時壓制（抑）、偏弱時扶助（扶）來尋找平衡的看法。在這張命盤裡，月支分量最重（同五行 +40，印星 +27，官星 −27，食傷 −10）。日支與日干同五行或為印星時 +13，為官星時 −9；其餘五字同五行或為印星時 +7，為官星時 −7。合計 30 以上讀作強，低於 30 讀作弱，階段名稱只是分數區間的標籤。這個分數不是對一個人能力或價值的評級。'},

    /* ── ten gods ── */
    godName: {'비견':'比肩', '겁재':'劫財', '식신':'食神', '상관':'傷官', '편재':'偏財', '정재':'正財', '편관':'偏官', '정관':'正官', '편인':'偏印', '정인':'正印'},
    ten: {
      lead:['Yeoni 眼中十神的分量', 'Neo 的十神判斷'], most:['最多的一組 {n}', '最多 {n}'], mostBadge:['最多的一組：{n}個字', '最多：{n}個字'], noneBadge:['缺：{list}', '缺失：{list}'], allBadge:['五組齊全', '五組無缺'],
      leadText:['在日干以外的七個字裡，分量最重的是{top}。{meaning}的質地容易在日常中顯現。{tail}', '判斷：{top}主導（日干以外七字中占{n}個）。{tail}'],
      tailNone:['相對地，{list}沒有顯現在表面。', '缺失：{list}。'], tailAll:['五組都顯現在表面，你的工具箱配得很均衡。', '五組齊全。'],
      distHead:['五組的分布', '各組分布'], distCap:'十神分布', cols:['組', '表面', '藏干', '細分十神', '在強弱中'],
      distNote:['表面的數量計的是日干以外的三個天干和四個地支；藏干計的是藏在地支裡的所有天干。數量多少沒有好壞之分。', '表面：日干以外的三干四支。藏干：地支裡的所有天干。數量不是排名，也不是成功機率。'], noonNote:['時干與時支按正午代入。', '時干、時支為正午代入。'],
      notesHead:['偏旺的能量 · 缺失的能量', '過多與缺失'],
      hiddenOnly:['{fam}沒有出現在表面，但藏干裡有{n}個。把它讀作需要時慢慢取出的潛力。', '{fam}：表面缺失，藏干有{n}個。後期取用的潛力。'],
      over:{same:['比劫多，自立與自尊突出。你一個人能做很多事，但可能在分成上起衝突，涉及金錢的合作之前先定好規則。', '比劫過多：主見強、競爭多。共同資金與合作先定規則。'], drain:['食傷多，表達與才華外溢。點子和話語都很多，但向外輸出太多會讓你疲倦。養成把開了頭的事做完的習慣，才能把才華變成成果。', '食傷過多：表達與產出多，耗損重。把收尾和開頭同樣排進行程。'], wealth:['財星多，現實感與金錢活動突出。你往往忙於很多事務和要照顧的人。', '財星過多：實務多、要管理的事多。'], control:['官星多，責任與期待可能顯得沉重。承擔的角色越多，清晰的標準越有幫助。', '官星過多：責任重、外界期待高。先劃定角色界線。'], parent:['印星多，思考與學習深入。但如果習慣了接受，行動可能放慢。', '印星過多：思考與學習深，行動慢。']},
      none:{same:['比劫不在表面，所以與他人協調比獨自硬撐更優先。累的時候，留一位可以依靠的同伴。', '比劫缺失：協調重於單打獨鬥。確保有合作者。'], drain:['食傷不在表面，把內心想法表達出來的通道可能偏窄。有意識地做一個出口，比如寫作或記筆記。', '食傷缺失：表達通道偏窄。建立筆記或交談等輸出習慣。'], wealth:['財星不在表面，你往往比起金錢更追逐意義與人。理財可以靠習慣和工具來補足。', '財星缺失：用制度補足金錢觀念。'], control:['官星不在表面，不被框架束縛的自由度很大。自己定下的期限和規則能讓你保持重心。', '官星缺失：外在約束弱。自己設定期限與規則。'], parent:['印星不在表面，你往往靠親身碰撞來學習，而不是靠別人的幫助。有意識地留出休息的時間和一位可信賴的顧問。', '印星缺失：邊做邊學。把休息與顧問排進行程。']},
      noneTail:['各組分布均勻，沒有明顯的過多或缺失。這是一個平衡的結構，可以根據情境靈活運用多種工具。', '沒有任何一組過多（三個以上）或缺失。工具分布均勻。'],
      comboHead:['值得留意的組合', '結構組合'],
      combos:[{name:'食傷生財', text:['食傷與財星同時出現，才華容易轉化為收入。把喜歡的事做成穩定的工作，往往能帶來財運。', '食傷引向財星。把才華做成產品，賺錢更容易。']}, {name:'官印相生', text:['官星與印星同時出現，責任化為學習，學習化為實力。在組織裡，資歷與聲望往往一起累積。', '官星生印星再生日干。有利於在組織中累積資歷與聲望。']}, {name:'食神制殺', text:['食神壓制著偏官。壓力來臨時，你有用本事化解的力量。', '食神制住偏官。用技能化解壓力。']}, {name:'傷官見官', text:['傷官與正官同時出現，你自己的想法可能與規則相撞。發表意見時遵循程序，就能把鋒芒轉化為說服力。', '傷官與正官並存。容易與規則衝突，所以透過程序表達意見。']}, {name:'官殺混雜', text:['正官與偏官同時出現，責任與角色可能從多個方向重疊。把優先順序理清，混亂就會減少。', '正官與偏官並存。角色重疊，所以固定優先順序。']}],
      what:'如何讀十神（十星）', whatText:['十神把其他每個字與日干的關係分成十種。五行相同的是比劫，你所生的是食傷，你所剋的是財星，剋你的是官星，生你的是印星。陰陽相同稱「偏」，陰陽不同稱「正」（比肩與劫財是例外）。', '天干顯示外在的樣子，地支顯示生活的根基，藏干顯示尚未顯現的潛力。這裡地支的十神遵循本服務的規則，按地支的五行和陰陽來判斷。'],
      cardMore:'展開閱讀', cardAt:'{at} · {more}', modalCap:'{god}所在的位置', modalCols:['位置', '字', '宮位', '體現的領域'], outer:'外在的樣子', base:'生活的根基', sitHead:['它在你命盤中的位置', '依據'],
      sitText:['表面上有{n}處；算上藏干，這種能量共有{h}個。', '表面{n}處，算藏干共{h}個。'], roleText:['在強弱中，這一組對你來說是{role}。{tail}', '在強弱中，這一組是{role}。'], roleGood:'越多地調動它，你越平衡。', roleCare:'不讓它過頭時，你最自在。',
      natureHead:['Yeoni 讀到的氣質', '判斷'], careerHead:'工作與天賦', loveHead:['關係的樣子', '關係'], adviceHead:['Yeoni 的建議', '行動標準']},
    god: {
      '비견':{line:['自主的根基：自己做決定並負責時最自在。', '自我標準與獨立。署上自己的名字效率就會上升。'], nature:['比肩與日干五行相同、陰陽也相同：另一個你並肩而立。沒人干涉、按自己的方式去做時你更有力量，安靜的外表下，自尊與見解很堅定。你對同事講義氣，與合得來的人相處很久。', '比肩與日干五行陰陽均相同。核心：獨立與信念。署上你名字的工作更出成果。對同事講義氣是優勢。'],
        career:'適合保有獨立性的專業工作、自由工作者或小生意，或在組織裡有明確屬於自己領域的職位。合夥時，從一開始就把分成與職責寫下來。', love:'你在重視尊重而非束縛的朋友式關係裡最自在。與彼此守護時間和空間的人往往能長久。', advice:['信念是很大的優勢，但聽起來也可能像固執。在一個重要決定上，留出「我也許錯了」的餘地，多聽一個人的意見。', '分清自己決定的事與共同決定的事。共同決策時，確認有一個不同意見。']},
      '겁재':{line:['競爭與合作：身邊有人同跑時更有勁。', '好勝與凝聚。有比較對象時速度更快。'], nature:['劫財與日干五行相同、陰陽不同：像你卻不同，既是對手又是同伴。你有求勝的驅動力，也有聚集人心、擴大舞台的天賦。笑容背後，你可能已在盤算下一步。', '劫財五行相同、陰陽不同。核心：驅動力與凝聚。競爭中出成果，但資源也容易一起流失。'],
        career:'在競爭與人脈能轉化為成果的銷售、體育、娛樂、談判、政治領域容易出頭。帶團隊時，聚集人心是你的強項。', love:'你被有刺激、有熱情的關係吸引。練習遷就而不是求勝，免得變成自尊心的較量。', advice:['進來多少，漏出去的口子可能同樣大。做一個不受心情左右的機制，比如先自動存下一部分收入。', '競爭前先約定費用上限與分工。避免魯莽投資和擔保。']},
      '식신':{line:['穩定的表達與從容：打磨並分享你熱愛的事。', '穩定的產出。重複自己喜歡的事，技藝就會累積。'], nature:['食神是日干所生、陰陽相同：飲食、手藝與從容的表達。你天性樂觀大方，讓身邊的人舒服。你有工匠般鑽研一件事的習慣，傳統上它還能化解粗猛的偏官。', '食神由日干所生，陰陽相同。核心：穩定的產出與表達。重複喜歡的事，技藝與收入一同增長。也能制住偏官。'],
        career:'適合用手和頭腦做出東西的工作：烹飪、教學、設計、研究、內容。做你熱愛的事時，表現最好。', love:'你會建立互相照顧、一起享受的溫暖關係。往往在分享美食與日常中感受到愛。', advice:['因為太大方，你可能對誰都給，把自己耗乾。留一條讓身體動起來的小規矩，別讓舒適變成鬆懈。', '從可重複的量開始，留下完成的東西。給「付出」設個上限。']},
      '상관':{line:['質疑框架、找到更好的辦法：機智與改進。', '批判性思考與表達。善於發現並修正問題。'], nature:['傷官是日干所生、陰陽不同：思維敏捷、能言善辯、敢於打破框架的創造力。你無法對不合理的事視而不見，在別人都接受的地方問「為什麼」。這份鋒利可以成為改進與創新，也可能與上級產生摩擦。', '傷官由日干所生，陰陽不同。核心：批判性思考與表達。會與正官（規則、上司）相撞，所以表達方式決定結果。'],
        career:'在企劃、行銷、媒體、法律、諮詢或創意工作中容易發光，新的視角與語言就是你的工具。規則非常嚴密的組織可能讓你覺得窒息。', love:'你被能聊得來的機智伴侶吸引。你難以忍受無聊，一起嘗試新事物的關係更適合你。', advice:['一句話可能贏得人心，也可能失去人心。情緒激動時，先深呼吸三次，指出問題時再附上一個替代方案。', '指出問題時提出替代方案。情緒高漲時延後決定。']},
      '편재':{line:['在廣闊的世界裡行動，抓住機會、帶動人群。', '發現機會、流通資源。擅長大局與分配。'], nature:['偏財是日干所剋、陰陽相同：流動的錢財與廣闊的活動範圍。你不糾結小事，看的是大勢，幽默與社交能力讓人親近你。你更擅長讓錢流動，而不是存錢。', '偏財由日干所剋，陰陽相同。核心：發現機會、流通資源。收入與支出一起大幅波動。'],
        career:'適合貿易、流通、銷售、投資、海外與業務拓展，透過調動人與資源來出成果。', love:'你喜歡有趣而大膽的關係，也擅長讓伴侶開心。興趣容易分散，要有意識地留出給一個人的時間。傳統上，這一組也被讀作男性的伴侶星。', advice:['機會多了，計畫外的花費也容易發生。錢進來時，先把一部分鎖在不容易取出的地方。', '投資或花錢前先設定虧損上限。立刻鎖定固定比例的收入。']},
      '정재':{line:['一步步積攢、謹慎守成：勤勉與管理。', '管理與累積。在穩定的結構裡穩步成長。'], nature:['正財是日干所剋、陰陽不同：誠實賺來的固定收入與節儉的管理。你過橋先敲石頭，看重承諾與信用，做事有始有終，所以人們樂意把事情交給你。', '正財由日干所剋，陰陽不同。核心：謹慎管理與穩步累積。資產靠穩定的重複而非一次大贏來增長。'],
        career:'在會計、金融、行政、管理、藥學等講究準確與信任的體系化領域容易展現實力。穩定的薪資結構適合你。', love:'你最看重信任與穩定。比起隨意開始，更喜歡認真而長久的關係，也擅長一起經營生活。傳統上，這一組也被讀作男性的伴侶星。', advice:['過於謹慎會讓你對自己的快樂也吝嗇。偶爾不計算地花一筆小小的浪漫。', '定好支出標準，同時為體驗與關係另設一份預算。']},
      '편관':{line:['忍耐艱難、擔起責任：魅力與克服。', '對壓力的反應。在危機中決斷並堅持。'], nature:['偏官又稱七殺，是剋制日干、陰陽相同的星。它意味著強大的壓力與考驗，也帶來承受它的力量與魅力。你重視自尊與榮譽，有想保護弱者的俠義心。身邊有食神或印星時，這股粗猛的力量會被磨成權威。', '偏官剋制日干，陰陽相同。核心：壓力下的決斷力。日干強則化為權威，日干弱則感到壓力。'],
        career:'在緊張、責任重的第一線容易證明自己：軍隊、警察、法律、醫療、安全、危機管理。紀律清晰的地方，領導力會顯現。', love:'你希望伴侶認可並尊重你，一旦交出真心就守到最後。傳統上，這一組也被讀作女性的伴侶星。', advice:['你把艱難嚥在心裡，所以心可能先累。給壓力找一個出口，比如流汗的運動或能沉浸的愛好。', '寫下你的責任範圍。透過運動等規律習慣釋放壓力。']},
      '정관':{line:['守正道、建立信任：責任與秩序。', '原則與信任。在制度中建立聲譽。'], nature:['正官是剋制日干、陰陽不同的星：端正塑造你的規則與榮譽。你守原則、在崗位上負責，所以到哪裡都被稱為「靠得住的人」。你在意體面與聲譽。', '正官剋制日干，陰陽不同。核心：原則與信任。在有組織的職場中獲得評價與晉升。'],
        career:'在制度和流程清晰的公共機關、行政、教育、大公司、管理職位容易發光。', love:'你偏好有禮、整潔的關係，被守信用、靠得住的伴侶吸引。傳統上，這一組也被讀作女性的伴侶星。', advice:['正確的標準有時會變成束縛你的框架。偶爾先選自己覺得對的，再考慮別人怎麼看。', '守規則，同時分清哪些規則可以改、哪些必須守。']},
      '편인':{line:['從不尋常的角度看到隱藏的原理：直覺與洞察。', '直覺與獨立的視角。看見別人忽略的東西。'], nature:['偏印又稱梟神，是生養日干、陰陽相同的星。你直覺與靈感都強，反應機敏，所以最先察覺到別人在表面之後忽略的東西。你被哲學、心理、技術這類深挖的領域吸引，需要獨自思考的時間。', '偏印滋養日干，陰陽相同。核心：直覺與獨立解讀。點子多，但執行容易滯後。'],
        career:'適合需要非凡洞察與專業知識的研究、IT開發、心理、諮商、醫療與藝術。', love:'你看重靈魂的相遇勝過條件，希望不必開口就被理解。', advice:['因為很有深度，想法可能在腦子裡打轉，直到時機過去。這週把一個點子落到手上，哪怕很小。', '給每個點子定一個第一步行動的日期。復盤在截止日前結束。']},
      '정인':{line:['給予並接受學習與呵護：求學與靠山。', '學習與靠山。求學與認可推動成長。'], nature:['正印是生養日干、陰陽不同的星：母親懷抱般的呵護與學習。你溫暖、愛學習，一步步累積知識與資歷。長輩的幫助和人緣運往往隨之而來。', '正印滋養日干，陰陽不同。核心：學習與靠山。資歷、學位與師長轉化為成果。'],
        career:'在人們學習與傳授的教育、學術、諮商、出版、憑資格執業的領域容易做得好。', love:'你喜歡溫暖體貼的伴侶，對精神上的聯結和讚美會敞開心扉。', advice:['習慣了接受愛之後，自己做決定可能變難。一次做一個小決定，培養獨立的肌肉。', '該你決定的地方自己決定。把所學與付諸實踐的日期綁在一起。']}},

    /* ── ilju ── */
    il: {
      leadHead:['Yeoni 為你排開的四柱', 'Neo 的判斷'], dayBadge:'{name}日干', branchBadge:'日支 {god}', stageBadge:'十二長生 {stage}',
      leadText:['你的中心是{name}日干，其下的日支{dj}是{stage}位上的{god}。把四柱鋪開來讀，是這樣的。', '{name}日干，日支{dj}（{god} · {stage}）。下表是依據。'],
      cap:'四柱', cols:['柱', '干 · 十神', '支 · 十神', '藏干', '十二長生', '宮位'], dayStemMe:'日干（自己）',
      note:['十二長生以日干為準來讀，陰干逆行（陰生陽死的標準）。宮位對應的年齡是傳統的根、苗、花、果劃分。', '十二長生以日干為準，陰干逆行。宮位年齡為傳統的根至果劃分。'],
      imgHead:'{name}日干的意象', imgText:['{name}日干，{note}。命盤中的每個字都按與日干的關係來讀，所以了解它的質地是解讀的第一步。', '{name}日干：{note}。日干是基準點，其餘七字按與它的關係來讀。'],
      spouseHead:['坐在伴侶宮的能量', '日支 · 伴侶宮'],
      spouse:{same:['日支是比肩，伴侶位上坐著與你相似的能量。平等、朋友般的關係讓你舒服，彼此尊重空間就能長久。', '日支比劫：平等伴侶型。尊重彼此空間的規則是關鍵。'], drain:['日支是食傷，表達與關懷從伴侶位流出。在一起享受、把感受說出口的關係裡，幸福來得容易。', '日支食傷：表達與關懷多。情感表達維繫關係。'], wealth:['日支是財星，伴侶位帶著共同建設現實生活的能量。一起規劃日常並細心照顧的關係適合你。', '日支財星：務實、規劃生活的關係。把財務與分工講清楚。'], control:['日支是官星，伴侶位帶著責任與秩序。你想要互相信任的穩固關係，也看重承諾。', '日支官星：以責任與信任為中心的關係。用語言約定期待。'], parent:['日支是印星，伴侶位帶著呵護與理解。你在情感上互相依靠、一起學習的關係裡自在。', '日支印星：情感上互相扶持的關係。別讓依賴傾向一方。']},
      stageText:['日支的十二長生是{stage}：{first}。在日常裡，往往表現為{second}。', '日支十二長生{stage}：{desc}。'],
      stagesHead:['用十二長生看人生四季', '十二長生的流轉'],
      gmHead:'空亡', gmText:['空亡是日柱所屬的十天週期裡沒有配對的兩個地支，據說落在那裡的能量會感到空虛。你的空亡是{list}。{hit}', '空亡：{list}。{hit}'],
      gmHit:['在你的命盤裡，{list}落在空亡上。這些方面可能不如期望的那樣充實，但用在精神層面或學習上，則被讀作加深。', '命盤中：{list}。那裡實際感受到的成果可能弱於期待；把它用在內涵與學習上，而不是求利。'], gmMiss:['命盤中的其他位置都不落在空亡上。', '命盤中沒有位置受影響。'],
      gmNote:['各流派對空亡的看重程度不同，請僅作參考。', '空亡的權重因流派而異。僅作參考。'],
      wordHead:['Yeoni 的話', 'Neo 的一句話總結'],
      word:{'甲':['筆直生長的樹不會一下子長大。這週，把一個大目標切成今天就能邁出的一步。', '定方向是強項。把大目標拆成本週的單位。'], '乙':['藤蔓找到可以依靠的東西，才能伸得很遠。求助也是你的強項，這週先聯絡一個人吧。', '聯結是強項。這週先向一位合作者開口。'], '丙':['太陽自己會發光，但休息的夜晚也很重要。今天為那段一直延後的休息預約一個時段吧。', '表達是強項。先把休息排進行程，避免耗盡。'], '丁':['燈在長時間照亮近處時最溫暖。今天，具體地向身邊的一個人說聲謝謝。', '專注是強項。縮小範圍，做完一件事。'], '戊':['山以不動給人信任。有時也讓風吹過：這週對一個新提議回答「好」。', '穩定是強項。這週試一個新提議。'], '己':['田地會因所種之物而變。在你為別人耕耘的田裡，今天為自己種下一粒種子。', '務實是強項。這週分配一項資源用於投資自己。'], '庚':['鐵遇火成為有用的工具。今天，不要迴避一件磨練你的難事：接下一點。', '果斷是強項。今天開始一件拖延已久的難事。'], '辛':['珠寶經過打理才更閃亮。今天對自己說一次：不完美也沒關係。', '標準很高。練習做到八成就拿出來分享。'], '壬':['大水有堤岸才能流得遠。從你鋪開的諸多興趣裡，選出這週要守住的那一個。', '視野寬廣。這週固定一個優先事項。'], '癸':['露水雖小，卻恰好潤濕需要的地方。記下今天的一個直覺，之後它會成為指引。', '直覺是強項。記下理由並核對。']}},

    /* ── flow ── */
    fl: {
      names: ['需要較多調整的運勢', '需要些許調整的運勢', '一般的運勢', '順暢的運勢', '非常順暢的運勢'],
      yearTitle: '你的一年（流年）{gz}', yearPre: '{year}年 · ', periodTitle: '你現在所處的位置（當前大運）{gz}',
      age: ' · {a}–{b}歲（韓國虛歲）', badgeScore: '運勢分數 {score}', badgeYear: '流年 · 一年', badgePeriod: '大運 · 十年', ends: ['需要調整', '順暢'], caption: '運勢分數 {score}', aria: {year:'今年的運勢分數 {score}', period:'當前大運的運勢分數 {score}'},
      relNotes: {chung:'推動變化或移動的力量', transformed:'滿足合化條件', he:'結合與合作的契機'},
      relTypes: {stemChung:'天干沖', branchChung:'地支沖', stemHe:'天干合', branchHe:'地支合'},
      tblCap: {year:'流年柱與你的日干', period:'大運柱與你的日干'}, tblCols: ['字', '五行', '十神', '十二長生', '在強弱中'], stemRow: '天干 {c}', branchRow: '地支 {c}', hiddenNote: '地支{c}的藏干：{list}',
      family: {same:['與自己相同的能量之運，想自己拿主意、自己站穩的心往往會增強。與同事的競爭也可能增多，先定好分成會有幫助。', '比劫運：自立與競爭的議題增多。先為共享資源定好分成與規則。'], drain:['把內在向外傾注的運勢，表達、創作、教學往往順利。很多能量會流出，也請規劃恢復的時間。', '食傷運：表達與產出增多。提高輸出，同時設定管理耗損的標準。'], wealth:['現實成果與金錢引人注目的運勢。適合拓展工作，把能承擔的範圍寫成數字，心會更穩。', '財星運：成果與財務議題增多。用數字定下擴張上限。'], control:['責任與角色變重的運勢。獲得認可的機會會和更大的負擔一同到來，分清哪些要接、哪些要放下。', '官星運：責任與評價壓力增大。區分要接受的角色與要拒絕的角色。'], parent:['學習與幫助到來的運勢。學習、考取證照或遇到好顧問都比較容易，把收到的東西變成小小的行動。', '印星運：學習與支持到來。排好把輸入轉為行動的計畫。']},
      noRel: ['沒有任何位置與你命盤中的字直接相合或相沖。', '與命盤沒有直接的合或沖。'],
      tone: {open:['讀作順暢的運勢。先小規模嘗試你準備好的事。分數是比較用的參考，並不承諾結果。', '判斷上屬較輕鬆的區間。把準備好的事小規模推進。分數不保證結果。'], even:['讀作既不用力推也不用力拉的一般運勢。繼續做手頭的事，不時確認方向即可。分數是比較用的參考，並不承諾結果。', '判斷上屬中間區間。保持進行中的事，確認方向。分數不保證結果。'], care:['讀作需要調整的運勢。放慢速度，理順角色與行程，同一段時期會輕鬆得多。請不要只憑分數做重大決定。', '判斷上屬調整區間。理順行程與角色，保留選擇餘地。不要只憑分數下結論。']},
      free: '※ 到這裡為止都是免費的。完整的十年運勢、各個流年的詳細內容與綜合解讀，將在下方的會員內容中繼續。'},

    /* ── daily ── */
    da: {
      dayTitle: '今日日柱 {gz}', monthTitle: '本月月柱 {gz}', today: '今天', month: '本月', badge: '能量 {bp}%',
      names: ['先恢復', '平穩', '順暢', '勢頭強勁'], ends: ['放慢', '強勁'], caption: '能量儀表 {bp}%', aria: '{when}的能量儀表 {bp}%',
      tags: {fast:'加速', even:'平衡', rest:'暫停'}, boost: '補{el}', tblCap: '{when}到來的能量與你的日干',
      godHead: ['用十神讀{when}', '按十神判斷'], nothing: ['沒有明顯與命盤相沖的地方。重要的訊息發出前，再讀一遍。', '沒有明顯的關係。重要訊息發出前再次確認。'], checkHead: ['請留意', '檢查要點'],
      boostHead: '幸運加成', boostLabel: '要補的五行', boostNote: ['補充所缺的輕鬆日常小提示。當作一點小小的心情調劑來享受吧。', '補充關鍵平衡五行的日常提示。不保證任何效果。'],
      god: {'비견':['自己的判斷會更清晰的時期。獨自決定也可以，但用一句話寫下理由，以免之後動搖。', '獨立判斷有利。用一句話記錄理由。'], '겁재':['好勝心與幹勁一起上升。把衝動的花費或賭注延後一天，心裡會更輕鬆。', '競爭與衝動增強。衝動的花費擱置一天。'], '식신':['喜悅與點子湧現。把你想到的一個點子，哪怕很小，立刻做成點什麼。', '產出力上升。現在就把一個點子化為行動步驟。'], '상관':['言語與表達有分量。適合演講與創作；合約或正式聲明發出前，請再讀一遍。', '表達增強。正式文件與聲明發布前再次確認。'], '편재':['機會與波動同時變大。先從確認過的小事開始，而不是大的賭注。', '機會與波動都大。以小而已驗證的事項推進。'], '정재':['細緻務實的工作發光的時期。梳理一遍收入與支出，心會變輕。', '準確度上升。整理收支記錄。'], '편관':['你可能感到壓力。與其全部扛下，不如選一件你要堅守的事，堅持住，它會以信任的形式回來。', '壓力來臨。聚焦一項核心責任，會以信任的形式回報。'], '정관':['責任與信任顯現的時期。適合辦理正式文件和手續。', '適合辦理正式手續。明確責任範圍。'], '편인':['直覺變得敏銳。記下浮現的預感，並小範圍地驗證。', '直覺主導。記錄預感並小範圍驗證。'], '정인':['適合學習與整理的好時機。向信任的人請教，思路會變清晰。', '學習與分析高效。請教可信賴的顧問。']},
      tone: {open:['能量以不弱的力度進來。挑一件要做的事先做完，就能順勢而行。', '能量富餘區間。先完成最優先的一件事。'], care:['先照顧好內在電量的時期。稍微放慢，失誤會減少，人際也會緩和。', '能量養護區間。降低速度，多加一個確認步驟。']},
      sumHead: ['Yeoni 的話', 'Neo 的總結']}
  };

  var CACHE = {};
  function forLang(lang) {
    if (CACHE[lang]) return CACHE[lang];
    var C = COPY[lang] || COPY.en;
    function pick(v, k) { return Array.isArray(v) ? v[k] : v; }
    function hourMark(facts, key) { return key === 'h' && facts.unknown ? C.noonMark : ''; }
    function posName(koLabel) { return C.pos[POS_ID[koLabel]] || koLabel; }
    function roleName(el, facts) { var r = roleOf(facts, el); return r ? C.role[r] : ''; }
    function seasonOf(j, parts, p) {
      var s = KO_SEASON[(j && j.season) || (parts && parts.season)] || KO_SEASON[K.SEASON[p.m.j]] || 'spring';
      return C.season[s];
    }
    function hiddenText(L, j) {
      var list = (L.CD_JANGGAN && L.CD_JANGGAN[j]) || [];
      return list.map(function (h, i) { return h + ' (' + (i === list.length - 1 ? C.hidden.last : i === 0 ? C.hidden.first : C.hidden.mid) + ')'; }).join(' ');
    }
    function stageOf(L, dg, c) { var f = L.cdTwelveStage; var s = f ? f(dg, c) : ''; return s && C.stage12[s] ? C.stage12[s] : null; }
    function palaceRows(L) { return ['y', 'm', 'd', 'h'].map(function (k) { return Object.assign({key:k}, C.palace[k]); }); }
    function palaceOf(k) { return Object.assign({key:k}, C.palace[k]); }

    /* ── climate ── */
    function climateVersus(facts, k) {
      var j = facts.johu, pw = facts.power, yong = (pw && pw.yongshin) || [], jong = facts.jong && facts.jong.isJong;
      var need = j.type === 'cold' || j.type === 'cool' ? ['fire', 'wood'] : j.type === 'hot' || j.type === 'warm' ? ['water', 'metal'] : [];
      var vars = {need:need.map(function (e) { return C.el[e]; }).join(' · '), yong:yong.slice(0, 2).map(function (e) { return C.el[e]; }).join(' · ')};
      var extreme = j.type === 'cold' || j.type === 'hot', same = need.some(function (e) { return yong.indexOf(e) >= 0; });
      var c = C.climate, t = [];
      t.push(fmt(pick(!need.length ? c.vNone : jong ? c.vJong : same ? c.vSame : extreme ? c.vExtreme : c.vMild, k), vars));
      t.push(pick(c.vNote, k));
      return t.map(para).join('');
    }
    function climate(facts, mode) {
      var j = facts && facts.johu, p = facts && facts.p;
      if (!j || !p || typeof j.score !== 'number') return '';
      var k = mode === 'neo' ? 1 : 0, c = C.climate, L = lib(facts);
      var parts = Rich.johuParts(p, L), ok = Rich.johuMatches(parts, j), diff = (j.moistCnt || 0) - (j.dryCnt || 0);
      var tIdx = {cold:0, cool:1, neutral:2, warm:3, hot:4}, typeName = C.temp[tIdx[j.type] != null ? tIdx[j.type] : 2], moistName = C.moist[j.moistType] || C.moist.balanced;
      var season = seasonOf(j, parts, p), env = C.env[(Math.max(-6, Math.min(6, j.score)) < 0 ? 'cold' : 'hot') + (diff < 0 ? 'dry' : 'wet')];
      var html = section(c.lead[k], hero(env.title, [typeName, moistName, fmt(c.tempBadge, {s:num(j.score)})]) + para(fmt(c.verdict[k], {season:season, base:num(parts ? parts.seasonTemp : (K.BRANCH_TEMP[p.m.j] || 0)), score:num(j.score), type:typeName, wet:j.moistCnt || 0, dry:j.dryCnt || 0, moist:moistName.toLowerCase()})), 'saju-rich__lead');
      html += '<div class="saju-rich__gauges">' +
        gauge({kind:'temp', value:j.score, min:-9, max:9, zones:[-5, -2, 2, 5], names:C.temp, ends:c.gaugeTemp.ends, caption:fmt(c.gaugeTemp.caption, {score:num(j.score)}), aria:fmt(c.gaugeTemp.aria, {score:num(j.score), type:typeName})}) +
        gauge({kind:'humid', value:diff, min:-6, max:6, zones:[-2.5, 3], names:[C.moist.dry, C.moist.balanced, C.moist.wet], ends:c.gaugeHumid.ends, caption:fmt(c.gaugeHumid.caption, {wet:j.moistCnt || 0, dry:j.dryCnt || 0, diff:num(diff)}), aria:fmt(c.gaugeHumid.aria, {wet:j.moistCnt || 0, dry:j.dryCnt || 0, moist:moistName.toLowerCase()})}) + '</div>';
      html += section(c.count, chips([{tag:c.tags.fire, text:' ' + (j.fc || 0), note:c.tagNotes.fire, el:'fire'}, {tag:c.tags.wood, text:' ' + (j.wdc || 0), note:c.tagNotes.wood, el:'wood'}, {tag:c.tags.metal, text:' ' + (j.mc || 0), note:c.tagNotes.metal, el:'metal'}, {tag:c.tags.water, text:' ' + (j.wc || 0), note:c.tagNotes.water, el:'water'}]) +
        (ok ? more(c.parts, table(c.parts, c.cols, [[c.base, season, '—', num(parts.seasonTemp), '—']].concat(parts.rows.map(function (r) {
          return [posName(r.label) + hourMark(facts, r.key), r.char, C.el[r.el] || '—', r.temp ? num(r.temp) : '0', (r.moist ? c.dampWord + (r.moist > 1 ? ' ×' + r.moist : '') : '') + (r.moist && r.dry ? ' · ' : '') + (r.dry ? c.dryWord + (r.dry > 1 ? ' ×' + r.dry : '') : '') || '—'];
        })), [c.total, '', '', num(parts.total), c.dampWord + ' ' + parts.moist + ' · ' + c.dryWord + ' ' + parts.dry])) : ''));
      html += section(c.env[k], '<p class="saju-rich__title">' + esc(env.title) + '</p>' + para(env.text[k]));
      html += section(c.versus[k], climateVersus(facts, k));
      var rx = C.rx[j.type] || C.rx.neutral, mrx = C.moistRx[j.moistType] || C.moistRx.balanced, lab = C.rxLabel;
      html += section(c.rx, para(c.rxIntro[k]) + tiles([[lab[0], rx.need, '氣'], [lab[1], rx.color, '色'], [lab[2], rx.dir, '方'], [lab[3], rx.act, '動'], [lab[4], rx.less, '減'], [lab[5] + ' (' + mrx.need + ')', mrx.act, j.moistType === 'wet' ? '燥' : '濕']]) + '<p class="saju-rich__note">' + esc(c.note) + '</p>', 'saju-rich__wide');
      html += more(c.what, '<p>' + esc(c.whatText[k]) + '</p><ul class="saju-tiles">' + c.four.map(function (x) { return '<li><b>' + esc(x[0]) + '</b><span>' + esc(x[1]) + '</span></li>'; }).join('') + '</ul>' + para(c.how));
      return wrap(mode, html, facts);
    }

    /* ── strength ── */
    function stageName(score) { return C.stage[score < -20 ? 0 : score < 10 ? 1 : score < 30 ? 2 : score < 50 ? 3 : score < 70 ? 4 : 5]; }
    function jongKey(name) {
      var n = String(name || '');
      return /곡직/.test(n) ? 'wood' : /염상/.test(n) ? 'fire' : /가색/.test(n) ? 'earth' : /종혁/.test(n) ? 'metal' : /윤하/.test(n) ? 'water' : /종강/.test(n) ? 'parent' : /종아/.test(n) ? 'drain' : /종재/.test(n) ? 'wealth' : /종살|종관/.test(n) ? 'control' : /화격|화기/.test(n) ? 'change' : 'other';
    }
    function godChips(L, dayEl, list, tags, tone, facts) {
      return list.filter(Boolean).map(function (e, i) {
        var f = family(L, dayEl, e);
        return {tag:tags[Math.min(i, tags.length - 1)], text:' ' + C.el[e] + (f ? ' · ' + C.fam[f] : ''), note:f ? C.famMeaning[f].join(' · ') : '', tone:tone, el:e};
      });
    }
    function strength(facts, mode) {
      var pw = facts && facts.power, p = facts && facts.p;
      if (!pw || !p || !p.d || typeof pw.score !== 'number') return '';
      var k = mode === 'neo' ? 1 : 0, s = C.str, L = lib(facts), jg = facts.jong, dg = p.d.g;
      var dayEl = pw.dayEl || (L.GAN[dg] && L.GAN[dg].e), stemName = C.stem[dg] || dg;
      var parts = Rich.powerParts(p, L), ok = Rich.powerMatches(parts, pw), strong = !!pw.isStrong, st = stageName(pw.score), html = '';
      var g = s.gauge, gaugeHtml = gauge({kind:'power', value:pw.score, min:-71, max:88, base:30, zones:[-20, 10, 30, 50, 70], names:C.stage, ends:g.ends, baseLabel:g.baseLabel, caption:fmt(g.caption, {score:pw.score}), aria:fmt(g.aria, {score:pw.score, stage:st})});
      if (jg && jg.isJong) {
        var dom = C.el[jg.dominant] || '', pc = jg.pct != null ? fmt(s.jongPct, {pct:jg.pct}) : '', key = jongKey(jg.name), kindName = s.jongHead[k];
        html += section(C.strengthLead[k], hero(kindName, [dom + (jg.pct != null ? ' ' + jg.pct + '%' : ''), fmt(s.jongBadge, {score:pw.score})]) + para(fmt(s.jongLead[k], {dom:dom, pct:pc, name:kindName})), 'saju-rich__lead');
        html += gaugeHtml;
        html += section(s.jongWhat, para(s.jongWhatText[k]));
        html += section(s.kindHead[k], para(s.jongKind[key] ? s.jongKind[key].charAt(0).toUpperCase() + s.jongKind[key].slice(1) + '.' : ''));
        html += section(s.dirHead, para(fmt(s.dirText[k], {dom:dom})));
        html += section(jg.isGaJong ? s.gaHead : s.jinHead, para((jg.isGaJong ? s.gaText : s.jinText)[k]));
      } else {
        var sw = strong ? s.strongWord : s.weakWord, gap = Math.abs(pw.score - 30);
        var lead = fmt(s.leadNormal[k], {score:pw.score, stage:st, stem:stemName, gap:gap, dir:pw.score >= 30 ? s.above : s.below, sw:sw}), tagline = (strong ? s.tagStrong : s.tagWeak)[k];
        html += section(C.strengthLead[k], hero(st, [fmt(s.badge, {score:pw.score}), s.baseBadge, strong ? s.typeStrong : s.typeWeak]) + para(lead + ' ' + tagline), 'saju-rich__lead');
        html += gaugeHtml;
        var mRow = parts && parts.rows.filter(function (r) { return r.group === 'month'; })[0];
        if (ok) {
          var dRow = parts.rows.filter(function (r) { return r.group === 'day'; })[0], rest = parts.rows.filter(function (r) { return r.group === 'rest'; }), restSum = rest.reduce(function (a, r) { return a + r.delta; }, 0), three = [];
          if (mRow) three.push([s.rowMonth, mRow.char + ' ' + C.el[mRow.el], mRow.delta > 0 ? s.vMonthPos : mRow.delta < 0 ? s.vMonthNeg : s.vFlat, num(mRow.delta)]);
          if (dRow) three.push([s.rowDay, dRow.char + ' ' + C.el[dRow.el], dRow.delta > 0 ? s.vFootPos : dRow.delta < 0 ? s.vFootNeg : s.vFlat, num(dRow.delta)]);
          three.push([s.rowRest, rest.map(function (r) { return r.char; }).join(' '), restSum > 0 ? s.vRestPos : restSum < 0 ? s.vRestNeg : s.vFlat, num(restSum)]);
          html += section(s.threeHead[k], table(s.threeCap, s.threeCols, three, [s.sumLabel, '', st, String(pw.score)]) +
            more(s.partsOpen[k], table(s.partsCap, s.partsCols, parts.rows.map(function (r) { return [posName(r.label) + hourMark(facts, r.key), r.char, C.el[r.el], C.fam[r.family] || '—', num(r.delta)]; }), [s.sumLabel, '', '', '', String(pw.score)])), 'saju-rich__wide');
        }
        var rel = mRow && s.monthRel[mRow.family];
        html += section(fmt(s.whyHead[k], {sw:sw}), para((rel ? fmt(s.whySeason[k], {tag:rel[0], rel:rel[1 + k]}) : pick(s.whyNeutral, k)) + fmt(s.whySum[k], {score:pw.score}) + (k === 0 ? (strong ? s.whyStrong : s.whyWeak) : '')));
        html += section(fmt(s.stemHead[k], {stem:stemName}), para(fmt(s.stemLine[k], {stem:stemName, note:C.stemNote[dg] || ''}) + (strong ? s.stemStrong : s.stemWeak)[k]));
        html += section(s.godHead[k], chips(godChips(L, dayEl, pw.yongshin || [], s.godTags.good, 'good', facts).concat(godChips(L, dayEl, pw.kijishin || [], s.godTags.care, 'care', facts))) + para(s.godText[k]) + more(s.godWhat, para(s.godWhatText)));
        html += section(s.cycHead, para((strong ? s.cycStrong : s.cycWeak)[k]));
      }
      html += more(s.what, para(s.whatText));
      return wrap(mode, html, facts);
    }

    /* ── ten gods ── */
    function famList(list) { return list.map(function (x) { return C.fam[x.f]; }).join(C.sep || ', '); }
    function tenOverview(facts, mode) {
      var p = facts && facts.p, L = lib(facts), m = p && Rich.godMap(p, L);
      if (!m) return '';
      var k = mode === 'neo' ? 1 : 0, t = C.ten, dayEl = L.GAN[p.d.g].e, strong = !!(facts.power && facts.power.isStrong), html = '';
      var fams = FAMILY_ORDER.map(function (f) {
        var gs = GODS.filter(function (g) { return GOD_FAMILY[g] === f; }), el = K.familyEl(L, dayEl, f);
        return {f:f, gods:gs, el:el, role:roleName(el, facts), surface:gs.reduce(function (a, g) { return a + (m.surface[g] || 0); }, 0), hidden:gs.reduce(function (a, g) { return a + (m.hidden[g] || 0); }, 0)};
      });
      var max = Math.max.apply(null, fams.map(function (x) { return x.surface; })), top = fams.filter(function (x) { return x.surface === max; }), none = fams.filter(function (x) { return x.surface === 0; });
      var tail = none.length ? fmt(t.tailNone[k], {list:famList(none)}) : t.tailAll[k];
      html += section(t.lead[k], hero(famList(top), [fmt(t.mostBadge[k], {n:max}), none.length ? fmt(t.noneBadge[k], {list:famList(none)}) : t.allBadge[k]]) + para(fmt(t.leadText[k], {top:famList(top), meaning:C.famMeaning[top[0].f][1], n:max, tail:tail})), 'saju-rich__lead');
      html += section(t.distHead[k], '<ul class="saju-bars">' + fams.map(function (x) { return '<li data-el="' + x.el + '"><span class="saju-bars__label">' + esc(C.fam[x.f]) + '</span><span class="saju-bars__track" aria-hidden="true"><i style="--pos:' + pct(x.surface, 0, 7) + '%"></i></span><span class="saju-bars__value">' + x.surface + '</span></li>'; }).join('') + '</ul>' +
        table(t.distCap, t.cols, fams.map(function (x) { return [C.fam[x.f] + ' · ' + C.el[x.el], String(x.surface), String(x.hidden), x.gods.map(function (g) { return (C.godShort ? C.godShort[g] : C.godName[g].replace(/ \(.*\)$/, '')) + ' ' + (m.surface[g] || 0); }).join(' · '), x.role ? C.roleShort[roleOf(facts, x.el)] : '—']; })) +
        '<p class="saju-rich__note">' + esc(t.distNote[k]) + (facts.unknown ? ' ' + esc(t.noonNote[k]) : '') + '</p>', 'saju-rich__wide');
      var notes = [];
      fams.forEach(function (x) {
        if (x.surface >= 3) notes.push(t.over[x.f][k]);
        else if (x.surface === 0) notes.push(x.hidden ? fmt(t.hiddenOnly[k], {fam:C.fam[x.f], n:x.hidden}) : t.none[x.f][k]);
      });
      html += section(t.notesHead[k], notes.length ? notes.map(para).join('') : para(t.noneTail[k]));
      var combos = [0, 1, 2, 3, 4].filter(function (i) { return [
        function (n) { return (n['식신'] || n['상관']) && (n['편재'] || n['정재']); }, function (n) { return (n['편관'] || n['정관']) && (n['편인'] || n['정인']); },
        function (n) { return n['식신'] && n['편관']; }, function (n) { return n['상관'] && n['정관']; }, function (n) { return n['편관'] && n['정관']; }][i](m.surface); });
      if (combos.length) html += section(t.comboHead[k], chips(combos.map(function (i) { var c = t.combos[i]; return {tag:c.name, text:'', note:c.text[k]}; })));
      html += more(t.what, para(t.whatText[0]) + para(t.whatText[1]));
      return wrap(mode, html, facts);
    }
    function tenCards(facts, mode) {
      var p = facts && facts.p, L = lib(facts), m = p && Rich.godMap(p, L);
      if (!m) return '';
      var k = mode === 'neo' ? 1 : 0, t = C.ten;
      return GODS.filter(function (g) { return m.surface[g]; }).map(function (g) {
        var at = m.where[g].map(function (w) { return C.pos[w.key + w.side] + hourMark(facts, w.key); }).join(' · '), e = elOf(L, m.where[g][0].char);
        return '<button class="saju-ten-button" type="button" data-saju-god="' + esc(g) + '"' + (e ? ' data-el="' + e + '"' : '') + '><strong><i class="saju-ten-button__seal" aria-hidden="true">' + esc(GOD_HAN[g].charAt(0)) + '</i>' + esc(C.godName[g]) + '</strong><span>' + esc(C.god[g].line[k]) + '</span><small>' + esc(fmt(t.cardAt, {at:at, more:t.cardMore})) + '</small></button>';
      }).join('');
    }
    function godDetail(key, facts, mode) {
      var d = C.god[key], p = facts && facts.p, L = lib(facts), m = p && Rich.godMap(p, L);
      if (!d || !m) return '';
      var k = mode === 'neo' ? 1 : 0, t = C.ten, f = GOD_FAMILY[key], dayEl = L.GAN[p.d.g].e, role = roleOf(facts, K.familyEl(L, dayEl, f));
      var where = m.where[key] || [], html = '<h3>' + esc(C.godName[key] + ' · ' + C.fam[f]) + '</h3>';
      html += section(t.natureHead[k], para(d.nature[k]));
      var rows = where.map(function (w) { var pal = C.palace[w.key]; return [C.pos[w.key + w.side] + hourMark(facts, w.key), w.char, pal.label + ' · ' + pal.palace, (w.side === 'g' ? t.outer : t.base) + ' · ' + pal.domain]; });
      html += section(t.sitHead[k], (rows.length ? table(fmt(t.modalCap, {god:C.godName[key]}), t.modalCols, rows) : '') +
        para(fmt(t.sitText[k], {n:where.length, h:m.hidden[key] || 0}) + (role ? fmt(t.roleText[k], {role:C.roleShort[role], tail:k === 0 ? (role === '용신' || role === '희신' ? t.roleGood : t.roleCare) : ''}) : '')));
      html += section(t.careerHead, para(d.career));
      html += section(t.loveHead[k], para(d.love));
      html += section(t.adviceHead[k], para(d.advice[k]));
      return wrap(mode, html, facts);
    }

    /* ── ilju ── */
    function ilju(facts, mode) {
      var p = facts && facts.p, L = lib(facts);
      if (!p || !p.d || !p.d.g || !p.d.j || !L.GAN[p.d.g] || !L.getTenGod) return '';
      var k = mode === 'neo' ? 1 : 0, c = C.il, dg = p.d.g, dj = p.d.j, stemName = C.stem[dg] || dg, html = '';
      var god = function (ch) { var g = L.getTenGod(dg, ch); return g && g !== '?' ? C.godName[g] || '' : ''; };
      var rows = ['y', 'm', 'd', 'h'].map(function (key) {
        var pal = C.palace[key], col = p[key] || {}, span = pal.palace + ' · ' + pal.span, st = stageOf(L, dg, col.j);
        if (key === 'h' && facts.unknown) return [pal.label, C.unknownCell, C.unknownCell, C.unknownCell, C.unknownCell, span];
        return [pal.label, col.g + ' · ' + (key === 'd' ? c.dayStemMe : god(col.g)), col.j + ' · ' + god(col.j), hiddenText(L, col.j), st ? st[0] : '—', span];
      });
      var sg = L.getTenGod(dg, dj), spouseGod = sg && sg !== '?' ? sg : '', spouseName = spouseGod ? C.godName[spouseGod] : '—', spouseStage = stageOf(L, dg, dj), spouseFam = GOD_FAMILY[spouseGod];
      html += section(c.leadHead[k], hero(dg + dj, [fmt(c.dayBadge, {name:stemName}), spouseGod ? fmt(c.branchBadge, {god:spouseName}) : '', spouseStage ? fmt(c.stageBadge, {stage:spouseStage[0]}) : ''], true) +
        para(fmt(c.leadText[k], {name:stemName, dg:dg, dj:dj, god:spouseName, stage:spouseStage ? spouseStage[0] : '—'})) + table(c.cap, c.cols, rows) + '<p class="saju-rich__note">' + esc(c.note[k]) + '</p>', 'saju-rich__lead saju-rich__wide');
      html += section(fmt(c.imgHead, {name:stemName}), para(fmt(c.imgText[k], {name:stemName, dg:dg, note:C.stemNote[dg] || ''})));
      html += section(c.spouseHead[k], para(spouseFam ? c.spouse[spouseFam][k] : '') + (spouseStage ? para(k === 0 ? fmt(c.stageText[0], {stage:spouseStage[0], first:spouseStage[1].split(' · ')[0], second:spouseStage[1].split(' · ')[1]}) : fmt(c.stageText[1], {stage:spouseStage[0], desc:spouseStage[1]})) : ''));
      var stages = ['y', 'm', 'd', 'h'].filter(function (key) { return !(key === 'h' && facts.unknown) && p[key] && p[key].j && stageOf(L, dg, p[key].j); }).map(function (key) {
        var s = stageOf(L, dg, p[key].j);
        return {tag:C.palace[key].label + ' · ' + s[0], text:'', note:s[1] + ' (' + C.palace[key].domain + ')'};
      });
      if (stages.length) html += section(c.stagesHead[k], chips(stages));
      var gm = L.cdGongMangBranches ? L.cdGongMangBranches(dg, dj) : [];
      if (gm.length) {
        var hit = ['y', 'm', 'h'].filter(function (key) { return !(key === 'h' && facts.unknown) && p[key] && gm.indexOf(p[key].j) >= 0; }).map(function (key) { return C.palace[key].label + ' (' + C.palace[key].domain + ')'; });
        html += section(c.gmHead, para(fmt(c.gmText[k], {list:gm.join(' · '), hit:hit.length ? fmt(c.gmHit[k], {list:hit.join(C.sep || ', ')}) : c.gmMiss[k]})) + '<p class="saju-rich__note">' + esc(c.gmNote[k]) + '</p>');
      }
      html += section(c.wordHead[k], para((c.word[dg] || ['', ''])[k]));
      return wrap(mode, html, facts);
    }

    /* ── flow ── */
    function relTag(type) {
      var stem = /간/.test(String(type)), chung = /충/.test(String(type)), r = C.fl.relTypes;
      return stem ? (chung ? r.stemChung : r.stemHe) : (chung ? r.branchChung : r.branchHe);
    }
    function flow(facts, mode) {
      var p = facts && facts.p, L = lib(facts), rows = (facts && facts.flow) || [], f = C.fl;
      if (!p || !p.d || !L.GAN || !L.GAN[p.d.g] || !L.getTenGod || !rows.length) return '';
      var k = mode === 'neo' ? 1 : 0, dg = p.d.g, toned = {};
      var html = rows.map(function (r) {
        var gd = L.GAN[r.g], jd = L.JI[r.j];
        if (!gd || !jd || typeof r.score !== 'number') return '';
        var year = r.kind === 'year', sg = L.getTenGod(dg, r.g), bg = L.getTenGod(dg, r.j), st = stageOf(L, dg, r.j), gz = r.g + r.j;
        var title = year ? (r.year ? fmt(f.yearPre, {year:r.year}) : '') + fmt(f.yearTitle, {gz:gz}) : fmt(f.periodTitle, {gz:gz});
        var meta = (C.stem[r.g] || r.g) + ' · ' + ((C.animal || BRANCH_ANIMAL)[r.j] || r.j) + (year ? '' : (r.age != null ? fmt(f.age, {a:r.age, b:r.end}) : ''));
        var at = [20, 40, 60, 80].filter(function (z) { return r.score >= z; }).length;
        var body = hero(gz, [fmt(f.badgeScore, {score:r.score}), f.names[at], year ? f.badgeYear : f.badgePeriod], true) + '<p class="saju-rich__note">' + esc(meta) + '</p>' +
          gauge({kind:'score', value:r.score, min:0, max:100, zones:[20, 40, 60, 80], names:f.names, ends:f.ends, caption:fmt(f.caption, {score:r.score}), aria:fmt(f.aria[year ? 'year' : 'period'], {score:r.score})});
        body += table(f.tblCap[year ? 'year' : 'period'], f.tblCols, [
          [fmt(f.stemRow, {c:r.g}), C.el[gd.e] || '', C.godName[sg] || '—', '—', roleName(gd.e, facts) ? C.roleShort[roleOf(facts, gd.e)] : '—'],
          [fmt(f.branchRow, {c:r.j}), C.el[jd.e] || '', C.godName[bg] || '—', st ? st[0] : '—', roleName(jd.e, facts) ? C.roleShort[roleOf(facts, jd.e)] : '—']
        ]) + '<p class="saju-rich__note">' + esc(fmt(f.hiddenNote, {c:r.j, list:hiddenText(L, r.j)})) + '</p>';
        var fam = GOD_FAMILY[sg];
        if (fam) body += para(f.family[fam][k]);
        var rel = r.relations || [];
        body += rel.length ? chips(rel.map(function (x) { return {tag:relTag(x.type), text:x.src + ' – ' + x.partner, note:x.isChung ? f.relNotes.chung : x.transformed ? f.relNotes.transformed : f.relNotes.he, tone:x.isChung ? 'care' : 'good'}; })) : para(f.noRel[k]);
        var tone = at >= 3 ? 'open' : at === 2 ? 'even' : 'care';
        if (!toned[tone]) { toned[tone] = true; body += para(f.tone[tone][k]); }
        return section(title, body, 'saju-rich__lead saju-flow saju-flow--' + (year ? 'year' : 'period'));
      }).join('');
      if (!html) return '';
      return wrap(mode, html + '<p class="saju-rich__note">' + esc(f.free) + '</p>', facts);
    }

    /* ── daily ── */
    function daily(row, index, facts, mode) {
      var p = facts && facts.p, L = lib(facts), d = C.da;
      if (!row || !row.gz || !p || !p.d || !L.GAN || !L.GAN[p.d.g] || typeof row.batteryPercent !== 'number') return '';
      var k = mode === 'neo' ? 1 : 0, dg = p.d.g, month = index === 1, when = month ? d.month : d.today;
      var g = row.gz.g, j = row.gz.j, gEl = row.gEl || (L.GAN[g] || {}).e, jEl = row.jEl || (L.JI[j] || {}).e, bp = row.batteryPercent, good = bp >= 60, gz = g + j;
      var html = section(fmt(month ? d.monthTitle : d.dayTitle, {gz:gz}),
        hero(gz, [fmt(d.badge, {bp:bp}), C.el[gEl] && C.el[jEl] ? C.el[gEl] + ' · ' + C.el[jEl] : ''], true) +
        gauge({kind:'energy', value:bp, min:0, max:100, zones:[40, 60, 80], names:d.names, ends:d.ends, caption:fmt(d.caption, {bp:bp}), aria:fmt(d.aria, {bp:bp, when:when})}) +
        chips([{tag:'#', text:bp >= 80 ? d.tags.fast : good ? d.tags.even : d.tags.rest}].concat(C.el[row.luckyEl] ? [{tag:'#', text:fmt(d.boost, {el:C.el[row.luckyEl].replace(/ \(.*\)$/, '')})}] : []), 'saju-chips--tags') +
        table(fmt(d.tblCap, {when:when}), C.fl.tblCols, [
          [fmt(C.fl.stemRow, {c:g}), C.el[gEl] || '', C.godName[row.gGod] || '—', '—', roleName(gEl, facts) ? C.roleShort[roleOf(facts, gEl)] : '—'],
          [fmt(C.fl.branchRow, {c:j}), C.el[jEl] || '', C.godName[row.jGod] || '—', (stageOf(L, dg, j) || ['—'])[0], roleName(jEl, facts) ? C.roleShort[roleOf(facts, jEl)] : '—']
        ]), 'saju-rich__lead');
      var advice = [row.gGod, row.jGod].filter(function (x, i, a) { return d.god[x] && a.indexOf(x) === i; }).map(function (x) { return {tag:C.godName[x], text:d.god[x][k]}; });
      html += section(fmt(d.godHead[k], {when:when}), advice.length ? chips(advice) : para(d.tone[good ? 'open' : 'care'][k]));
      html += section(d.checkHead[k], para(d.nothing[k]));
      if (C.el[row.luckyEl]) html += section(d.boostHead, tiles([[d.boostLabel, C.el[row.luckyEl], '氣']]) + '<p class="saju-rich__note">' + esc(d.boostNote[k]) + '</p>');
      html += section(d.sumHead[k], para(d.tone[good ? 'open' : 'care'][k]));
      return wrap(mode, html, facts);
    }

    return CACHE[lang] = {daily:daily, flow:flow, climate:climate, strength:strength, tenOverview:tenOverview, tenCards:tenCards, godDetail:godDetail, ilju:ilju};
  }

  root.SajuReadingRichIntl = {forLang:forLang, locales:function () { return Object.keys(COPY); }, copy:COPY};
})(typeof window === 'undefined' ? globalThis : window);
