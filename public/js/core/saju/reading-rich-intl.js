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
    function famList(list) { return list.map(function (x) { return C.fam[x.f]; }).join(', '); }
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
        table(t.distCap, t.cols, fams.map(function (x) { return [C.fam[x.f] + ' · ' + C.el[x.el], String(x.surface), String(x.hidden), x.gods.map(function (g) { return C.godName[g].replace(/ \(.*\)$/, '') + ' ' + (m.surface[g] || 0); }).join(' · '), x.role ? C.roleShort[roleOf(facts, x.el)] : '—']; })) +
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
        html += section(c.gmHead, para(fmt(c.gmText[k], {list:gm.join(' · '), hit:hit.length ? fmt(c.gmHit[k], {list:hit.join(', ')}) : c.gmMiss[k]})) + '<p class="saju-rich__note">' + esc(c.gmNote[k]) + '</p>');
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
        var meta = (C.stem[r.g] || r.g) + ' · ' + (BRANCH_ANIMAL[r.j] || r.j) + (year ? '' : (r.age != null ? fmt(f.age, {a:r.age, b:r.end}) : ''));
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
