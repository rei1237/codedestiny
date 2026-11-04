/* Rich saju flow and daily-energy readings for non-Korean locales (display only). Same facts + mode in, HTML out, same API as reading-rich.js.
 * Layout pieces come from SajuReadingRich (kit); this file holds only the locale copy and the assembly for the free-screen flow/daily cards.
 * The natal reading (climate, strength, ten gods, ilju) is a bundle-only product built on the server (worker/lib/saju-section/paid-natal-intl.src.js),
 * so none of its sentences ship in this public file. A locale without its own table reads in English.
 * Copy shape: [yeoni voice, neo voice] pairs, {placeholders} filled by fmt(). */
(function (root) {
  'use strict';
  var Rich = root.SajuReadingRich, K = Rich && Rich.kit;
  if (!K) return;
  var esc = K.esc, fmt = K.fmt, lib = K.lib, section = K.section, para = K.para, gauge = K.gauge, table = K.table, hero = K.hero, tiles = K.tiles, chips = K.chips, wrap = K.wrap, roleOf = K.roleOf;
  var GOD_FAMILY = K.GOD_FAMILY;
  var BRANCH_ANIMAL = {'子':'Rat', '丑':'Ox', '寅':'Tiger', '卯':'Rabbit', '辰':'Dragon', '巳':'Snake', '午':'Horse', '未':'Goat', '申':'Monkey', '酉':'Rooster', '戌':'Dog', '亥':'Pig'};

  var COPY = {};
  COPY.en = {
    el: {wood:'Wood (木)', fire:'Fire (火)', earth:'Earth (土)', metal:'Metal (金)', water:'Water (水)'},
    role: {'용신':'Key balance (用神)', '희신':'Supportive (喜神)', '기신':'Strain (忌神)', '구신':'Added strain (仇神)'},
    roleShort: {'용신':'Key balance', '희신':'Supportive', '기신':'Strain', '구신':'Added strain'},
    stem: {'甲':'Jia · Yang Wood', '乙':'Yi · Yin Wood', '丙':'Bing · Yang Fire', '丁':'Ding · Yin Fire', '戊':'Wu · Yang Earth', '己':'Ji · Yin Earth', '庚':'Geng · Yang Metal', '辛':'Xin · Yin Metal', '壬':'Ren · Yang Water', '癸':'Gui · Yin Water'},
    stage12: {
      '장생':['Growth (長生)', 'the start of growing · energy for learning and beginning'], '목욕':['Bathing (沐浴)', 'first contact with the world · curiosity, sensitivity, change'],
      '관대':['Dressing (冠帶)', 'stepping into society · confidence and drive'], '건록':['Prime (建祿)', 'earning your own way · independence and practical skill'],
      '제왕':['Peak (帝旺)', 'energy at its fullest · initiative and strong self-belief'], '쇠':['Ease (衰)', 'past the peak and seasoned · experience and care'],
      '병':['Fading (病)', 'energy quietens and grows finer · empathy and consideration'], '사':['Stillness (死)', 'movement stops, thought deepens · focus and inquiry'],
      '묘':['Storing (墓)', 'gathering into the storehouse · saving, managing, substance'], '절':['Break (絶)', 'cutting from the old and changing · transition and decision'],
      '태':['Conception (胎)', 'a new life forms · planning and potential'], '양':['Nurture (養)', 'being raised in shelter · preparation and care']},
    hidden: {first:'residual', mid:'middle', last:'main'},
    godName: {'비견':'Peer (比肩)', '겁재':'Rival (劫財)', '식신':'Gentle Output (食神)', '상관':'Sharp Output (傷官)', '편재':'Roving Wealth (偏財)', '정재':'Steady Wealth (正財)', '편관':'Pressure (偏官)', '정관':'Order (正官)', '편인':'Insight (偏印)', '정인':'Care (正印)'},
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
      continueReading: 'After reviewing your current period and year, select a period in the chart below to explore its annual details.'},
    da: {
      dayTitle: 'Today’s day pillar {gz}', monthTitle: 'This month’s monthly pillar {gz}', today: 'today', month: 'this month', badge: 'Energy {bp}%',
      names: ['Recover first', 'Steady', 'Smooth', 'Strong momentum'], ends: ['Slow down', 'Strong'], caption: 'Energy gauge {bp}%', aria: 'Energy gauge {bp}% for {when}',
      tags: {fast:'Accelerate', even:'Balanced', rest:'Pause'}, boost: '{el} boost', tblCap: 'Energy arriving {when} and your day stem',
      godHead: ['Reading {when} by ten gods', 'Judgement by ten god'], nothing: ['No clash with your chart stands out. Read an important message once more before sending.', 'No notable relation. Recheck important messages before sending.'], checkHead: ['Please keep in mind', 'Checkpoints'],
      boostHead: 'Lucky booster', boostLabel: 'Element to add', boostNote: ['A light everyday tip for adding what is lacking. Enjoy it as a small change of mood.', 'An everyday tip for supplementing the key balance element. No effect is guaranteed.'],
      god: {'비견':['A time when your own judgement gets clearer. Deciding alone is fine, but write the reason in one line so you do not waver later.', 'Independent judgement is favourable. Record the reason in one line.'], '겁재':['Competitiveness and drive rise together. Postpone impulsive spending or bets by a day and you will feel easier.', 'Competition and impulse grow. Hold impulsive spending for a day.'], '식신':['Joy and ideas well up. Make one idea you have into something, however small, right away.', 'Productivity rises. Move one idea into an action step now.'], '상관':['Words and expression carry weight. Good for presentations and creative work; read a contract or an official statement once more before sending it out.', 'Expression strengthens. Recheck official documents and statements before release.'], '편재':['Chances and swings grow together. Start with small things you have confirmed rather than big bets.', 'Chance and volatility are both large. Proceed with small, verified items.'], '정재':['A time when careful practical work shines. Sorting income and spending once will lighten your mind.', 'Accuracy rises. Sort your income and spending records.'], '편관':['You may feel pressure. Rather than shouldering all of it, pick one thing you will keep and hold on, and it returns as trust.', 'Pressure comes. Focusing on one core duty returns as trust.'], '정관':['A time when duty and trust show. Good for official papers and procedures.', 'Suited to official procedures. Make your scope of responsibility clear.'], '편인':['Intuition grows sharp. Jot down the hunches that come and check them in a small way.', 'Intuition leads. Record hunches and run a small check.'], '정인':['A good time for learning and sorting things out. Asking a trusted person for advice makes your thinking clear.', 'Learning and analysis are efficient. Ask a trusted adviser.']},
      tone: {open:['Energy comes in with some strength. Pick one thing to do and finish it first, and you can ride the flow well.', 'Energy-surplus band. Finish one top-priority item first.'], care:['A time to look after your inner battery first. Slow down a little, and mistakes drop and relationships ease.', 'Energy-care band. Lower the speed and add one more check step.']},
      sumHead: ['Yeoni’s word', 'Yeongnyangi’s summary']}
  };

  COPY.ja = {
    el: {wood:'木', fire:'火', earth:'土', metal:'金', water:'水'},
    role: {'용신':'要の調和（用神）', '희신':'支え（喜神）', '기신':'負担（忌神）', '구신':'さらなる負担（仇神）'},
    roleShort: {'용신':'要の調和', '희신':'支え', '기신':'負担', '구신':'さらなる負担'},
    stem: {'甲':'甲（陽の木）', '乙':'乙（陰の木）', '丙':'丙（陽の火）', '丁':'丁（陰の火）', '戊':'戊（陽の土）', '己':'己（陰の土）', '庚':'庚（陽の金）', '辛':'辛（陰の金）', '壬':'壬（陽の水）', '癸':'癸（陰の水）'},
    animal: {'子':'鼠', '丑':'牛', '寅':'虎', '卯':'兎', '辰':'龍', '巳':'蛇', '午':'馬', '未':'羊', '申':'猿', '酉':'鶏', '戌':'犬', '亥':'猪'},
    stage12: {
      '장생':['長生', '育ち始めの時期・学びと始まりの力'], '목욕':['沐浴', '世界と初めて触れる時期・好奇心と感受性、変化'],
      '관대':['冠帯', '社会へ踏み出す時期・自信と推進力'], '건록':['建禄', '自分の力で稼ぐ時期・自立と実務能力'],
      '제왕':['帝旺', '気が最も満ちる時期・主導力と強い自負'], '쇠':['衰', '頂点を過ぎて円熟する時期・経験と配慮'],
      '병':['病', '気が静まり細やかになる時期・共感と思いやり'], '사':['死', '動きが止まり思索が深まる時期・集中と探究'],
      '묘':['墓', '蔵へ収める時期・貯蓄と管理、中身づくり'], '절':['絶', '過去と断ち切って変わる時期・転換と決断'],
      '태':['胎', '新しい命が宿る時期・計画と可能性'], '양':['養', '守られて育つ時期・準備と手入れ']},
    hidden: {first:'余気', mid:'中気', last:'本気'},
    godName: {'비견':'比肩（ひけん）', '겁재':'劫財（ごうざい）', '식신':'食神（しょくじん）', '상관':'傷官（しょうかん）', '편재':'偏財（へんざい）', '정재':'正財（せいざい）', '편관':'偏官（へんかん）', '정관':'正官（せいかん）', '편인':'偏印（へんいん）', '정인':'正印（せいいん）'},
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
      continueReading: '今の大運と今年の流れを確認したら、下の大運表から時期を選び、年ごとの変化を続けてお読みください。'},
    da: {
      dayTitle: '今日の日柱 {gz}', monthTitle: '今月の月柱 {gz}', today: '今日', month: '今月', badge: '気 {bp}%',
      names: ['まず回復', '安定', '順調', '勢いが強い'], ends: ['ゆっくり', '強い'], caption: '気のゲージ {bp}%', aria: '{when}の気のゲージ {bp}%',
      tags: {fast:'加速', even:'バランス', rest:'一休み'}, boost: '{el}を足す', tblCap: '{when}届く気とあなたの日干',
      godHead: ['{when}を十神で読む', '十神別の判定'], nothing: ['命式との衝突は目立ちません。大事なメッセージは、送る前にもう一度読み返しましょう。', '目立つ関係はなし。大事なメッセージは送る前に再確認する。'], checkHead: ['心に留めておいてください', '確認ポイント'],
      boostHead: 'ラッキーブースター', boostLabel: '足す五行', boostNote: ['足りないものを足す、軽い日常のヒントです。小さな気分転換として楽しんでください。', '要の調和の五行を補う日常のヒント。効果を保証するものではない。'],
      god: {'비견':['自分の判断が明確になる時期です。一人で決めても構いませんが、あとで迷わないよう、理由を一行で書いておきましょう。', '自立した判断が有利。理由を一行で記録する。'], '겁재':['競争心と意欲が一緒に高まります。衝動的な出費や賭けは一日延ばすと、気持ちが楽になります。', '競争と衝動が増す。衝動的な出費は一日保留する。'], '식신':['喜びとアイデアがわいてきます。思いついたアイデアを一つ、小さくてもすぐに形にしてみましょう。', '生産性が上がる。アイデアを一つ今すぐ行動のステップにする。'], '상관':['言葉と表現に重みが出ます。発表や創作に向いていますが、契約書や公式な声明は、出す前にもう一度読み返してください。', '表現が強まる。公式文書と声明は公開前に再確認する。'], '편재':['機会と変動が一緒に大きくなります。大きな賭けより、確認済みの小さなことから始めましょう。', '機会も変動も大きい。確認済みの小さな案件で進める。'], '정재':['丁寧な実務が光る時期です。収入と支出を一度整理すると、心が軽くなります。', '正確さが上がる。収支の記録を整理する。'], '편관':['圧力を感じるかもしれません。すべてを背負うより、守ると決めたことを一つ選んで持ち続けると、信頼として返ってきます。', '圧力が来る。核心の責任を一つに絞ると信頼として返る。'], '정관':['責任と信頼が表れる時期です。公式な書類や手続きに向いています。', '公式な手続きに向く。責任の範囲を明確にする。'], '편인':['直感が冴えます。浮かんだ予感を書き留め、小さく確かめてみましょう。', '直感が主導。予感を記録し、小さく検証する。'], '정인':['学びと整理に良い時期です。信頼できる人に助言を求めると、考えがはっきりします。', '学びと分析が効率的。信頼できる相談相手に聞く。']},
      tone: {open:['気がある程度の強さで入ってきます。やることを一つ選んでまず終わらせれば、流れにうまく乗れます。', '気の余剰帯。最優先の一件を先に終える。'], care:['内なるバッテリーを先に労る時期です。少しゆっくりすると、ミスが減って人間関係も和らぎます。', '気のケア帯。速度を落とし、確認の段階を一つ増やす。']},
      sumHead: ['Yeoniのひとこと', 'Yeongnyangiの要約']}
  };

  COPY['zh-CN'] = {
    el: {wood:'木', fire:'火', earth:'土', metal:'金', water:'水'},
    role: {'용신':'关键平衡（用神）', '희신':'助力（喜神）', '기신':'负担（忌神）', '구신':'加重负担（仇神）'},
    roleShort: {'용신':'关键平衡', '희신':'助力', '기신':'负担', '구신':'加重负担'},
    stem: {'甲':'甲（阳木）', '乙':'乙（阴木）', '丙':'丙（阳火）', '丁':'丁（阴火）', '戊':'戊（阳土）', '己':'己（阴土）', '庚':'庚（阳金）', '辛':'辛（阴金）', '壬':'壬（阳水）', '癸':'癸（阴水）'},
    animal: {'子':'鼠', '丑':'牛', '寅':'虎', '卯':'兔', '辰':'龙', '巳':'蛇', '午':'马', '未':'羊', '申':'猴', '酉':'鸡', '戌':'狗', '亥':'猪'},
    stage12: {
      '장생':['长生', '开始成长的阶段 · 学习与起步的力量'], '목욕':['沐浴', '初次接触世界的阶段 · 好奇、敏感与变化'],
      '관대':['冠带', '走入社会的阶段 · 自信与推进力'], '건록':['建禄', '靠自己谋生的阶段 · 自立与实务能力'],
      '제왕':['帝旺', '能量最饱满的阶段 · 主导力与强烈的自信'], '쇠':['衰', '过了顶点而趋于成熟 · 经验与体贴'],
      '병':['病', '能量安静下来、变得细腻 · 共情与体谅'], '사':['死', '动作停止、思考加深 · 专注与探究'],
      '묘':['墓', '收入仓库的阶段 · 积蓄、管理与充实内在'], '절':['绝', '与过去切断而转变 · 转折与决断'],
      '태':['胎', '新生命孕育的阶段 · 规划与潜力'], '양':['养', '在庇护中成长的阶段 · 准备与呵护']},
    hidden: {first:'余气', mid:'中气', last:'本气'},
    godName: {'비견':'比肩', '겁재':'劫财', '식신':'食神', '상관':'伤官', '편재':'偏财', '정재':'正财', '편관':'偏官', '정관':'正官', '편인':'偏印', '정인':'正印'},
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
      continueReading: '看过当前大运和今年的走势后，可在下方大运表中选择时期，继续了解逐年的变化。'},
    da: {
      dayTitle: '今日日柱 {gz}', monthTitle: '本月月柱 {gz}', today: '今天', month: '本月', badge: '能量 {bp}%',
      names: ['先恢复', '平稳', '顺畅', '势头强劲'], ends: ['放慢', '强劲'], caption: '能量仪表 {bp}%', aria: '{when}的能量仪表 {bp}%',
      tags: {fast:'加速', even:'平衡', rest:'暂停'}, boost: '补{el}', tblCap: '{when}到来的能量与你的日干',
      godHead: ['用十神读{when}', '按十神判断'], nothing: ['没有明显与命盘相冲的地方。重要的消息发出前，再读一遍。', '没有明显的关系。重要消息发出前再次确认。'], checkHead: ['请留意', '检查要点'],
      boostHead: '幸运加成', boostLabel: '要补的五行', boostNote: ['补充所缺的轻松日常小提示。当作一点小小的心情调剂来享受吧。', '补充关键平衡五行的日常提示。不保证任何效果。'],
      god: {'비견':['自己的判断会更清晰的时期。独自决定也可以，但用一句话写下理由，以免之后动摇。', '独立判断有利。用一句话记录理由。'], '겁재':['好胜心与干劲一起上升。把冲动的花销或赌注推迟一天，心里会更轻松。', '竞争与冲动增强。冲动的花销搁置一天。'], '식신':['喜悦与点子涌现。把你想到的一个点子，哪怕很小，立刻做成点什么。', '产出力上升。现在就把一个点子化为行动步骤。'], '상관':['言语与表达有分量。适合演讲与创作；合同或正式声明发出前，请再读一遍。', '表达增强。正式文件与声明发布前再次确认。'], '편재':['机会与波动同时变大。先从确认过的小事开始，而不是大的赌注。', '机会与波动都大。以小而已验证的事项推进。'], '정재':['细致务实的工作发光的时期。梳理一遍收入与支出，心会变轻。', '准确度上升。整理收支记录。'], '편관':['你可能感到压力。与其全部扛下，不如选一件你要坚守的事，坚持住，它会以信任的形式回来。', '压力来临。聚焦一项核心责任，会以信任的形式回报。'], '정관':['责任与信任显现的时期。适合办理正式文件和手续。', '适合办理正式手续。明确责任范围。'], '편인':['直觉变得敏锐。记下浮现的预感，并小范围地验证。', '直觉主导。记录预感并小范围验证。'], '정인':['适合学习与整理的好时机。向信任的人请教，思路会变清晰。', '学习与分析高效。请教可信赖的顾问。']},
      tone: {open:['能量以不弱的力度进来。挑一件要做的事先做完，就能顺势而行。', '能量富余区间。先完成最优先的一件事。'], care:['先照顾好内在电量的时期。稍微放慢，失误会减少，人际也会缓和。', '能量养护区间。降低速度，多加一个确认步骤。']},
      sumHead: ['Yeoni 的话', 'Yeongnyangi 的总结']}
  };

  COPY['zh-TW'] = {
    el: {wood:'木', fire:'火', earth:'土', metal:'金', water:'水'},
    role: {'용신':'關鍵平衡（用神）', '희신':'助力（喜神）', '기신':'負擔（忌神）', '구신':'加重負擔（仇神）'},
    roleShort: {'용신':'關鍵平衡', '희신':'助力', '기신':'負擔', '구신':'加重負擔'},
    stem: {'甲':'甲（陽木）', '乙':'乙（陰木）', '丙':'丙（陽火）', '丁':'丁（陰火）', '戊':'戊（陽土）', '己':'己（陰土）', '庚':'庚（陽金）', '辛':'辛（陰金）', '壬':'壬（陽水）', '癸':'癸（陰水）'},
    animal: {'子':'鼠', '丑':'牛', '寅':'虎', '卯':'兔', '辰':'龍', '巳':'蛇', '午':'馬', '未':'羊', '申':'猴', '酉':'雞', '戌':'狗', '亥':'豬'},
    stage12: {
      '장생':['長生', '開始成長的階段 · 學習與起步的力量'], '목욕':['沐浴', '初次接觸世界的階段 · 好奇、敏感與變化'],
      '관대':['冠帶', '走入社會的階段 · 自信與推進力'], '건록':['建祿', '靠自己謀生的階段 · 自立與實務能力'],
      '제왕':['帝旺', '能量最飽滿的階段 · 主導力與強烈的自信'], '쇠':['衰', '過了頂點而趨於成熟 · 經驗與體貼'],
      '병':['病', '能量安靜下來、變得細膩 · 共感與體諒'], '사':['死', '動作停止、思考加深 · 專注與探究'],
      '묘':['墓', '收入倉庫的階段 · 積蓄、管理與充實內在'], '절':['絕', '與過去切斷而轉變 · 轉折與決斷'],
      '태':['胎', '新生命孕育的階段 · 規劃與潛力'], '양':['養', '在庇護中成長的階段 · 準備與呵護']},
    hidden: {first:'餘氣', mid:'中氣', last:'本氣'},
    godName: {'비견':'比肩', '겁재':'劫財', '식신':'食神', '상관':'傷官', '편재':'偏財', '정재':'正財', '편관':'偏官', '정관':'正官', '편인':'偏印', '정인':'正印'},
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
      continueReading: '看過當前大運和今年的走勢後，可在下方大運表中選擇時期，繼續了解逐年的變化。'},
    da: {
      dayTitle: '今日日柱 {gz}', monthTitle: '本月月柱 {gz}', today: '今天', month: '本月', badge: '能量 {bp}%',
      names: ['先恢復', '平穩', '順暢', '勢頭強勁'], ends: ['放慢', '強勁'], caption: '能量儀表 {bp}%', aria: '{when}的能量儀表 {bp}%',
      tags: {fast:'加速', even:'平衡', rest:'暫停'}, boost: '補{el}', tblCap: '{when}到來的能量與你的日干',
      godHead: ['用十神讀{when}', '按十神判斷'], nothing: ['沒有明顯與命盤相沖的地方。重要的訊息發出前，再讀一遍。', '沒有明顯的關係。重要訊息發出前再次確認。'], checkHead: ['請留意', '檢查要點'],
      boostHead: '幸運加成', boostLabel: '要補的五行', boostNote: ['補充所缺的輕鬆日常小提示。當作一點小小的心情調劑來享受吧。', '補充關鍵平衡五行的日常提示。不保證任何效果。'],
      god: {'비견':['自己的判斷會更清晰的時期。獨自決定也可以，但用一句話寫下理由，以免之後動搖。', '獨立判斷有利。用一句話記錄理由。'], '겁재':['好勝心與幹勁一起上升。把衝動的花費或賭注延後一天，心裡會更輕鬆。', '競爭與衝動增強。衝動的花費擱置一天。'], '식신':['喜悅與點子湧現。把你想到的一個點子，哪怕很小，立刻做成點什麼。', '產出力上升。現在就把一個點子化為行動步驟。'], '상관':['言語與表達有分量。適合演講與創作；合約或正式聲明發出前，請再讀一遍。', '表達增強。正式文件與聲明發布前再次確認。'], '편재':['機會與波動同時變大。先從確認過的小事開始，而不是大的賭注。', '機會與波動都大。以小而已驗證的事項推進。'], '정재':['細緻務實的工作發光的時期。梳理一遍收入與支出，心會變輕。', '準確度上升。整理收支記錄。'], '편관':['你可能感到壓力。與其全部扛下，不如選一件你要堅守的事，堅持住，它會以信任的形式回來。', '壓力來臨。聚焦一項核心責任，會以信任的形式回報。'], '정관':['責任與信任顯現的時期。適合辦理正式文件和手續。', '適合辦理正式手續。明確責任範圍。'], '편인':['直覺變得敏銳。記下浮現的預感，並小範圍地驗證。', '直覺主導。記錄預感並小範圍驗證。'], '정인':['適合學習與整理的好時機。向信任的人請教，思路會變清晰。', '學習與分析高效。請教可信賴的顧問。']},
      tone: {open:['能量以不弱的力度進來。挑一件要做的事先做完，就能順勢而行。', '能量富餘區間。先完成最優先的一件事。'], care:['先照顧好內在電量的時期。稍微放慢，失誤會減少，人際也會緩和。', '能量養護區間。降低速度，多加一個確認步驟。']},
      sumHead: ['Yeoni 的話', 'Yeongnyangi 的總結']}
  };

  var CACHE = {};
  function forLang(lang) {
    if (CACHE[lang]) return CACHE[lang];
    var C = COPY[lang] || COPY.en;
    function roleName(el, facts) { var r = roleOf(facts, el); return r ? C.role[r] : ''; }
    function hiddenText(L, j) {
      var list = (L.CD_JANGGAN && L.CD_JANGGAN[j]) || [];
      return list.map(function (h, i) { return h + ' (' + (i === list.length - 1 ? C.hidden.last : i === 0 ? C.hidden.first : C.hidden.mid) + ')'; }).join(' ');
    }
    function stageOf(L, dg, c) { var f = L.cdTwelveStage; var s = f ? f(dg, c) : ''; return s && C.stage12[s] ? C.stage12[s] : null; }

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
      return wrap(mode, html + '<p class="saju-rich__note">' + esc(f.continueReading) + '</p>', facts);
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

    return CACHE[lang] = {daily:daily, flow:flow};
  }

  root.SajuReadingRichIntl = {forLang:forLang, locales:function () { return Object.keys(COPY); }, copy:COPY};
})(typeof window === 'undefined' ? globalThis : window);
