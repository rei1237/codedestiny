/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??
   SIBYL SYSTEM ENGINE
   ?ъ씠踰꾪럱??吏꾨줈 ?곸꽦 횞 ?대챸 ?ㅼ틪 ?쒖뒪?????ъ＜ ?붿옄 ?뺣? 吏꾨떒
   Based on: G_PILLARS / G_NATAL / G_JONG / G_JOHU internal data
?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/
(function(window) {
  'use strict';

  /* ?? ?곸닔 ?? */
  var NS = 'FORTUNE_APP_USER_PROFILES';
  var SIBYL_REPORT_CACHE_VERSION = '20260522-local-dominator-v1';
  var SIBYL_REPORT_CACHE_NS = 'cd_sibyl_report_cache';
  var SIBYL_FEATURE_KEY = 'premium-sibyl-dominator';
  var SIBYL_FEATURE_REASON = '?쒕퉴???꾨??ㅼ씠??由ы룷??;
  var SIBYL_MIN_PREMIUM_CHAPTER_CHARS = 300;
  var SIBYL_MIN_PREMIUM_TOTAL_CHARS = 20000;
  var SIBYL_PREMIUM_CHAPTER_META = [
    { key: 'coreMatrix', title: 'CH.01 ?쒕퉴??肄붿뼱 留ㅽ듃由?뒪', focus: '?낅젰 ?ъ＜쨌?쇨컙쨌吏諛??ㅽ뻾쨌二쇰룄 ??꽦쨌?듭떖 ?먯닔 醫낇빀' },
    { key: 'riskAnalysis', title: 'CH.02 ?꾪뿕 怨꾩닔 ?뺣? 遺꾩꽍', focus: '?꾪뿕 ?먯닔 ?곗텧 洹쇨굅? 異⑸룎쨌蹂?숈꽦 遺꾪빐' },
    { key: 'aptitudeAnalysis', title: 'CH.03 ?곸꽦 怨꾩닔 ?뺣? 遺꾩꽍', focus: '?곸꽦 ?붿냼? ?깆옣쨌?섏씡???꾨왂' },
    { key: 'tenGodPattern', title: 'CH.04 二쇰룄 ??꽦怨??됰룞 ?⑦꽩', focus: '二쇰룄 ??꽦 湲곕컲 ?됰룞쨌愿怨꽷룹쓽?ш껐???⑦꽩' },
    { key: 'elementBalance', title: 'CH.05 ?ㅽ뻾 諛몃윴?ㅼ? ?먮꼫吏 ?ㅺ퀎', focus: '?ㅽ뻾 怨쇰?議? 蹂댁셿 猷⑦떞, ?섍꼍 ?ㅺ퀎' },
    { key: 'yearlyFlow', title: 'CH.06 10???꾪뿕 怨꾩닔 洹몃옒???댁꽕', focus: '?곕룄蹂??꾪뿕/湲고쉶 ?먮쫫怨??ㅽ뻾 ??대컢' },
    { key: 'monthlyPlanner', title: 'CH.07 ?붾퀎 由ъ뒪???뚮옒??, focus: '12媛쒖썡 ?꾪뿕/?붿쭊/諛고꽣由?湲곕컲 ?붾퀎 ?댁쁺 ?뚮옖' },
    { key: 'relationship', title: 'CH.08 愿怨꾩? ?좎젙 ?⑦꽩', focus: '愿怨?異⑸룎 ?⑦꽩怨??뚰듃?덉떗 ?댁쁺' },
    { key: 'moneyCareer', title: 'CH.09 ?щЪ怨?吏곸뾽 ?꾨왂', focus: '?ъ젙 ?댁슜쨌吏곸뾽 ?좏깮쨌由ъ뒪????? },
    { key: 'finalMessage', title: 'CH.10 理쒖쥌 ?ㅽ뻾 媛?대뱶', focus: '?듭떖 寃곕줎怨?7/30/90???ㅽ뻾 ?먯튃' }
  ];
  var SIBYL_PREMIUM_CHAPTER_KEYS = SIBYL_PREMIUM_CHAPTER_META.map(function(item) { return item.key; });
  var SibylState = Object.freeze({
    LOADING: 'LOADING',
    READY: 'READY',
    PROCESSING_PAYMENT: 'PROCESSING_PAYMENT',
    GENERATING_REPORT: 'GENERATING_REPORT',
    ERROR: 'ERROR'
  });
  var _sibylUiState = SibylState.LOADING;
  var _sibylLastPaidContext = null;
  var SIBYL_DEFAULT_RISK_SCORE = 45;
  var SIBYL_DEFAULT_APTITUDE_SCORE = 520;
  var SIBYL_DEFAULT_STABILITY_SCORE = 55;
  var SIBYL_DEFAULT_RELATIONSHIP_SCORE = 58;
  var SIBYL_DEFAULT_WEALTH_SCORE = 56;
  var SIBYL_DEFAULT_CAREER_SCORE = 60;
  var SIBYL_PRIMARY_TENGOD_FALLBACK = '以묒떖 湲곗쭏 遺꾩꽍 以?;
  var SIBYL_CORE_MATRIX_FALLBACK = '?ъ＜ 肄붿뼱 留ㅽ듃由?뒪 ?곗씠?곕? 蹂닿컯??湲곕낯 遺꾩꽍???ш뎄?깊뻽?듬땲?? ?듭떖 異뺤? ?좎??섎ŉ, ?꾨씫 ?꾨뱶???덉쟾??湲곗?媛믪쑝濡?蹂댁젙?⑸땲??';
  var SIBYL_FORBIDDEN_REPORT_PATTERNS = [
    /?ㅽ뻾\s*蹂닿컯\s*硫붾え\s*R\d*/i,
    /?먮룞\s*蹂듦뎄\s*?앹꽦/i,
    /?듭떖\s*?좏샇瑜?s*諛뷀깢?쇰줈\s*?꾩옱\s*?먮쫫??s*援ъ“?곸쑝濡?s*?댁꽍?⑸땲??i,
    /?대쾲\s*?댁꽍?\s*?⑥젙\s*?덉뼵??s*?꾨땲??i,
    /1?④퀎\s*?ㅽ뻾\s*?ъ씤??i,
    /?먯닔\s*?댁꽍??s*?됰룞\s*猷⑦떞?쇰줈\s*?꾪솚?섍퀬\s*7??s*?⑥쐞濡?s*?먭??⑸땲??i,
    /?꾪뿕\s*怨꾩닔\s*47\s*,?\s*?곸꽦\s*怨꾩닔\s*608\s*湲곗??쇰줈\s*?댁쁺\s*媛뺣룄瑜?s*議곗젅?⑸땲??i,
    /?ъ＜\s*吏덈Ц\s*?꾨＼?꾪듃\s*留뚮뱾湲?i,
    /寃곌낵\s*湲곕컲\s*怨좏뭹吏?s*吏덈Ц/i,
    /?앹꽦\s*鍮꾩슜\s*:\s*100肄붿씤/i,
    /?꾨옒\s*?댁슜??s*AI?먭쾶\s*洹몃?濡?s*遺숈뿬?ｌ뼱\s*吏덈Ц?대낫?몄슂/i,
    /?곗씠??s*?몄?/i
  ];
  var SIBYL_CHAPTER_CATEGORY_HINTS = {
    coreMatrix: ['?낅젰', '吏諛??ㅽ뻾', '二쇰룄 ??꽦', '?꾪뿕 怨꾩닔', '?곸꽦 怨꾩닔', '?좊ː??],
    riskAnalysis: ['由ъ뒪??, '?ㅽ뻾 遺덇퇏??, '??꽦', '異㈑룻삎쨌?뙿룻빐', '??는룹꽭??, '?붾퀎 蹂?숈꽦'],
    aptitudeAnalysis: ['Career', 'Wealth', 'Execution', 'Social', 'Recovery', '?곸꽦'],
    tenGodPattern: ['二쇰룄 ??꽦', '鍮꾧껄', '?ъ꽦', '愿??, '?몄꽦', '?됰룞 ?⑦꽩'],
    elementBalance: ['?ㅽ뻾 遺꾪룷', '吏諛??ㅽ뻾', '?좊━ ?ㅽ뻾', '二쇱쓽 ?ㅽ뻾', '?⑹떊', '湲곗떊'],
    yearlyFlow: ['10??, '?곕룄', '?꾪뿕', '湲고쉶', '?몄슫', '???],
    monthlyPlanner: ['?붾퀎', 'M01', '由ъ뒪??諛대뱶', '?ъ빱??, '二쇱쓽', '???],
    relationship: ['愿怨?, '?좎젙', '?곗븷', '?묒뾽', '媛덈벑', '?뚮났'],
    moneyCareer: ['吏곸뾽', '而ㅻ━??, '?щЪ', '?섏씡', '?ㅽ뻾 ?꾨왂', '30??],
    finalMessage: ['理쒖쥌', '7??, '30??, '90??, '媛쒖슫', '?ㅼ쟾 ?좎뼵臾?]
  };

  /* ??꽦 ???뱁꽣 留ㅽ븨 */
  var TENSTAR_SECTOR = {
    '?앹떊': { sector: 'CREATIVE & TECH', eng: 'Creative & Tech', jobs: '媛쒕컻?? 肄섑뀗痢??щ━?먯씠?? ?묎?, ?붿옄?대꼫, ?덉닠媛' },
    '?곴?': { sector: 'CREATIVE & TECH', eng: 'Creative & Tech', jobs: '媛쒕컻?? 肄섑뀗痢??щ━?먯씠?? ?묎?, ?붿옄?대꼫, ?덉닠媛' },
    '?몄옱': { sector: 'FINANCIAL CONTROL', eng: 'Financial Control', jobs: '?먯궛 ?댁슜, ?곗씠??遺꾩꽍, ?좏넻留?愿由? ?ъ옄 ?꾨왂' },
    '?뺤옱': { sector: 'FINANCIAL CONTROL', eng: 'Financial Control', jobs: '?먯궛 ?댁슜, ?뚭퀎, ?щТ 湲고쉷, 寃쎌쁺 愿由? },
    '?멸?': { sector: 'PUBLIC ORDER', eng: 'Public Order', jobs: '怨듦났湲곌?, ?湲곗뾽 愿由ъ쭅, 踰뺤“怨? 援걔룰꼍 ?꾨Ц吏? },
    '?뺢?': { sector: 'PUBLIC ORDER', eng: 'Public Order', jobs: '怨듬Т?? ?湲곗뾽 ?꾩썝, 踰뺣쪧 ?꾨Ц媛, 援먯쑁 ?됱젙' },
    '?몄씤': { sector: 'R&D & INTELLIGENCE', eng: 'R&D & Intelligence', jobs: '?곌뎄?? 湲고쉷?? ?꾨Ц ?곷떞媛, ?꾨왂 遺꾩꽍媛' },
    '?뺤씤': { sector: 'R&D & INTELLIGENCE', eng: 'R&D & Intelligence', jobs: '援먯닔, ?곌뎄?? 而⑥꽕?댄듃, ?щ━ ?곷떞?? ?꾨왂媛' },
    '鍮꾧껄': { sector: 'INDEPENDENCE FORCE', eng: 'Independence Force', jobs: '1??湲곗뾽, 李쎌뾽?? ?낅┰ 而⑥꽕?댄듃, ?먯쁺?낆옄' },
    '寃곸옱': { sector: 'COMPETITION SECTOR', eng: 'Competition Sector', jobs: '?ㅽ룷痢? 寃쎌웳 ?곗뾽, ?곸뾽쨌留덉??? 以묎컻?? }
  };

  /* ?ㅽ뻾 ?몃뜳??*/
  var EL_ORDER = ['wood','fire','earth','metal','water'];
  var EL_KR = { wood:'紐???', fire:'????', earth:'????', metal:'湲???', water:'??麗?' };
  var EL_BALANCE_LABEL = { wood:'紐?, fire:'??, earth:'??, metal:'湲?, water:'?? };
  var EL_COLOR = { wood:'#39ff14', fire:'#ff6a00', earth:'#ffd700', metal:'#c8e0ff', water:'#00bfff' };
  var EL_DESTINY_HUE = {
    wood:  { name:'?쒖씠??洹몃┛ (Jade Green)',   hex:'#39ff14', status:'clear' },
    fire:  { name:'移댁씠踰??덈뱶 (Khyber Red)',    hex:'#ff4500', status:'varied' },
    earth: { name:'怨⑤뱺 移대찞 (Golden Camel)',    hex:'#ffd700', status:'varied' },
    metal: { name:'?꾪겕???ㅻ쾭 (Arctic Silver)', hex:'#b0c8e0', status:'clear' },
    water: { name:'???ㅼ뀡 釉붾（ (Deep Ocean Blue)', hex:'#00bfff', status:'clear' }
  };

  function _isSibylDevMode() {
    try {
      if (window && window.__CD_ENV && String(window.__CD_ENV).toLowerCase() === 'development') return true;
    } catch (_) {}
    try {
      var host = String(window.location && window.location.hostname || '').toLowerCase();
      if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return true;
    } catch (_) {}
    return false;
  }

  function _sibylDevDebug(label, payload) {
    if (!_isSibylDevMode() || typeof console === 'undefined' || typeof console.debug !== 'function') return;
    console.debug(label, payload);
  }

  function _sibylDevWarn(label, payload) {
    if (!_isSibylDevMode() || typeof console === 'undefined' || typeof console.warn !== 'function') return;
    console.warn(label, payload);
  }

  function _sibylLogInfo(label, payload) {
    if (typeof console === 'undefined' || typeof console.info !== 'function') return;
    console.info(label, payload);
  }

  function _sibylLogWarn(label, payload) {
    if (typeof console === 'undefined' || typeof console.warn !== 'function') return;
    console.warn(label, payload);
  }

  function _sibylLogError(label, error) {
    if (typeof console === 'undefined' || typeof console.error !== 'function') return;
    console.error(label, error);
  }

  function _safeText(value, fallback) {
    var text = String(value == null ? '' : value).trim();
    return text || String(fallback || '').trim();
  }

  function _safeScore(value, fallback, min, max) {
    var num = Number(value);
    if (!Number.isFinite(num)) num = Number(fallback);
    if (!Number.isFinite(num)) num = 0;
    return _clamp(Math.round(num), Number(min), Number(max));
  }

  /* 鍮꾧쾪 怨쇰떎 ?꾧퀎 */
  var BIJAB_WARN_THRESHOLD = 3;

  /* ?? ?쇨컙蹂??怨좊궃 湲곗쭏 ?곗씠???? */
  var DAYGAN_NATURE = {
    '??: { name:'媛묐ぉ(?꿩쑉)', type:'吏곸쭊 由щ뜑??,
      nature:'???섎Т泥섎읆 ?꾨줈留??깆옣?섎젮??湲곗쭏???怨좊궗?듬땲?? 媛뺥븳 紐⑺몴 ?섏떇怨??좉뎄???뺤떊???먮뱶?ъ?硫? ?쒕쾲 諛⑺뼢???≪쑝硫?嫄곗묠?놁씠 ?섏븘媛???뚰뙆?μ씠 ?덉뒿?덈떎. 議곗쭅 ?댁뿉???먯뿰?ㅻ읇寃?由щ뜑 ??븷??留↔쾶 ?섎굹, ?좎뿰??遺議깆쑝濡??좎쨷???묒긽?대굹 ?고쉶 ?꾨왂?먯꽌 ?쎌젏???쒕윭?⑸땲??',
      strength:'媛쒖쿃쨌李쎌뾽쨌?ㅽ뵾?덉뼵 由щ뜑쨌湲고쉷 珥앷큵쨌鍮꾩쟾 ?쒖떆',
      weakness:'怨좎쭛?쇰줈 ?명븳 ? 媛덈벑, ?④린 ?댁씡 臾댁떆, ???嫄곕?濡?湲고쉶 ?곸떎',
      career:'李쎌뾽?? CEO, ?뺤튂?? ?ㅽ룷痢?媛먮룆, 嫄댁텞媛, ????꾨줈?앺듃 ?붾젆?? },
    '阿?: { name:'?꾨ぉ(阿숁쑉)', type:'?좎뿰 ?꾨왂??,
      nature:'?⑷뎬泥섎읆 ?대뼡 ?섍꼍?먯꽌???댁븘?⑤뒗 ?곸쓳?κ낵 ?몃궡?μ쓣 ?怨좊궗?듬땲?? 吏곸젒 異⑸룎蹂대떎 痢〓㈃ ?고쉶? ?몃㎘ ?쒖슜???듯빐 ?먰븯??寃곌낵瑜??살뼱?대뒗 ?꾨왂??蹂몃뒫???덉뒿?덈떎. 媛먯꽦 吏?μ씠 ?믪븘 ?멸컙愿怨꾩뿉??媛뺤젏??諛쒗쐶?섎굹, ?곗쑀遺?⑦븿怨??섏〈?깆씠 寃곗젙???쒓컙??諛쒕ぉ???≪쓣 ???덉뒿?덈떎.',
      strength:'愿怨?援ъ텞쨌?묒긽쨌留덉??끒룹쇅援먃룸Ц??湲고쉷쨌?덉닠 寃쎌쁺',
      weakness:'寃곕떒 吏?? 二쇰룄沅??뚰뵾, 媛뺤옄?????吏?섏튇 ?섏〈',
      career:'?멸탳愿, 留덉??? ?곷떞?? ?덉닠媛, 以묒옱?? PR ?꾨Ц媛' },
    '訝?: { name:'蹂묓솕(訝숂겓)', type:'?댁젙 ?뺤궛??,
      nature:'?쒖뼇泥섎읆 二쇰? ?꾩껜瑜?諛앺엳?ㅻ뒗 ?먮꼫吏媛 ?섏묩?덈떎. 紐낇솗??鍮꾩쟾怨???컻?곸씤 ?먮꼫吏濡?洹몃９ ?꾩껜???숆린瑜?遺?ы븯??泥쒕????먯쭏??媛吏怨??덉뒿?덈떎. ?덈Т 留롮? ?꾨줈?앺듃???숈떆???먮꼫吏瑜?遺꾩궛?쒖폒 ?꾨즺?⑥씠 ??븘吏嫄곕굹, 吏?섏튇 ?먭린 怨쇱떊?쇰줈 由ъ뒪??愿由ъ뿉 ?ㅽ뙣?섎뒗 ?⑦꽩??諛섎났?⑸땲??',
      strength:'由щ뜑??룸룞湲곕???룸?洹쒕え 湲고쉷쨌誘몃뵒?는룻띁?щ㉫??,
      weakness:'?먮꼫吏 遺꾩궛, ?ㅽ뻾???쏀솕, 踰덉븘?? 由ъ뒪??怨쇱냼?됯?',
      career:'?대깽??湲고쉷?? 諛곗슦, 媛뺤뿰媛, ?곸뾽 珥앷큵, ?뷀꽣?뚯씤癒쇳듃 PD' },
    '訝?: { name:'?뺥솕(訝곭겓)', type:'?뺣? 吏묒쨷??,
      nature:'珥쏅텋泥섎읆 ?묒?留??뺥솗??吏?먯쓣 源딆씠 ?뚭퀬?쒕뒗 吏묒쨷?μ씠 ?곸썡?⑸땲?? ?볤쾶 ?쇱?湲곕낫???뱀젙 遺꾩빞???ъ씤?섎뒗 ?깊뼢?대ŉ, ?ъ링 遺꾩꽍怨??μ씤 ?뺤떊???먮뱶?ъ쭛?덈떎. ?먯떊???꾨Ц ?곸뿭 諛뽰뿉?쒕뒗 ?먯떊媛먯씠 湲됯꺽???섎씫?섍퀬, 踰덉븘???댄썑 ?뚮났???먮┛ 寃껋씠 援ъ“???쎌젏?낅땲??',
      strength:'?꾨Ц?붋룹뿰援ш컻諛쑣룸뜲?댄꽣 遺꾩꽍쨌?뺣? 湲곗닠쨌?덉닠 ?μ씤',
      weakness:'?쒖빞 ?묒냼, ?몃? ?쇰뱶諛?嫄곕?, 踰덉븘?????щ읆??,
      career:'?곌뎄?? ?멸낵?섏궗, ?μ씤, ?곗씠???ъ씠?명떚?ㅽ듃, ?깆븙媛, ?щ━移섎즺?? },
    '??: { name:'臾댄넗(?듿쐿)', type:'?덉젙 ?섏슜??,
      nature:'???곗쿂??蹂???놁씠 二쇰???吏?깊븯???덉젙媛먭낵 ?ъ슜?μ씠 ?뱀쭠?낅땲?? 議곗쭅???ㅼ쭏?곸씤 ?덈━ ??븷???섑뻾?섎ŉ, ?꾧린 ?곹솴?먯꽌 移⑥갑?⑥쓣 ?좎??섎뒗 ?λ젰???곗뼱?⑸땲?? 蹂?붿뿉 ??????컧??媛뺥빐 ?붿????꾪솚?대굹 鍮좊Ⅸ ?쒖옣 蹂?붿뿉 ?ㅼ쿂吏???꾪뿕???덉쑝硫? 寃곕떒??遺議깆씠 ?깆옣???곹븳?좎쓣 留뚮뱾 ???덉뒿?덈떎.',
      strength:'議곗쭅 愿由?룹옱臾??덉젙쨌遺?숈궛쨌?κ린 ?ъ옄쨌?꾪넻 ?곗뾽',
      weakness:'蹂????? 蹂댁닔???먮떒, ?곸떊 湲고쉶 ?곸떎',
      career:'愿由ъ옄, 遺?숈궛?? 怨듬Т?? 湲덉쑖 愿由ъ쭅, ?꾪넻 ?쒖“?? },
    '藥?: { name:'湲고넗(藥긷쐿)', type:'?몃? 愿由ы삎',
      nature:'寃쎌옉吏泥섎읆 ?몃??섍쾶 ?쇱쓣 ?ㅻ벉怨??꾩꽦?섎뒗 瑗쇨세?⑥씠 ?먮뱶?ъ쭛?덈떎. ?믪? 湲곗?怨??꾩꽦??異붽뎄濡??덉쭏?먯꽌 媛뺤젏??諛쒗쐶?섎굹, ?꾨꼍二쇱쓽媛 吏?곌낵 ?멸컙愿怨?留덉같???좊컻?⑸땲?? ?댄뼢???깊뼢?쇰줈 ?먭린 PR???쏀빐 ?λ젰 ?鍮???됯? 諛쏆쓣 媛?μ꽦??援ъ“?곸쑝濡??댁옱?⑸땲??',
      strength:'?덉쭏 愿由?룻렪吏뫢룰컧??룰탳?≤룸뜲?댄꽣 ?뺣━쨌?몃? 湲고쉷',
      weakness:'?꾨꼍二쇱쓽濡??명븳 踰덉븘?? ?먭린 PR ?쏀븿, 寃곗젙 吏??,
      career:'?먮뵒?? ?뚭퀎?? 媛먯궗愿, 援먯궗, QA ?꾨Ц媛, 媛?대뱶' },
    '佯?: { name:'寃쎄툑(佯싮뇫)', type:'?⑥튌 寃곕떒??,
      nature:'媛뺤쿋泥섎읆 ?⑤떒???섏?? 利됯컖?곸씤 寃곕떒?μ씠 ?뱀쭠?낅땲?? 蹂듭옟???곹솴???⑥닚?뷀븯???좎냽??泥섎━?섎뒗 ?λ젰??留ㅼ슦 ?곗뼱?섎ŉ, ?먯튃怨?洹쒖쑉??以묒떆?⑸땲?? ??몄쓽 媛먯젙??異⑸텇??諛곕젮?섏? ?딅뒗 ?좎뭅濡쒖슫 吏곸꽕 ?붾쾿??遺덊븘?뷀븳 ?곷? 愿怨꾨? ?뺤꽦?섍퀬, ?좎뿰??遺議깆씠 ?묐젰 湲곕컲 ?낅Т?먯꽌 留덉같???쇱쑝?듬땲??',
      strength:'?⑦샇??寃곕떒쨌援ъ“ 媛쒗쁺쨌踰뺤쭛?됀룰꼍???곗뾽',
      weakness:'媛먯꽦 吏??遺議? ???留덉같, ?묒뾽 湲고뵾, 諛섍컧 異뺤쟻',
      career:'援곗씤, 寃쎌같, 踰뺣쪧媛, ?대룞?좎닔, 援ъ“議곗젙 ?꾨Ц媛, ?멸낵?섏궗' },
    '渦?: { name:'?좉툑(渦쏃뇫)', type:'?뺣? ?щ???,
      nature:'蹂댁꽍泥섎읆 ?좎뭅濡쒖슫 ?щ??덇낵 ?뺤젣??痍⑦뼢??媛吏怨??덉뒿?덈떎. ?명삎???꾩꽦?꾩? ?몃젴誘몄뿉 ?곸썡??媛먭컖???덉쑝硫? 媛먯??κ낵 遺꾩꽍?μ씠 留ㅼ슦 ?덈━?⑸땲?? ??몄쓽 ?쒖꽑??吏?섏튂寃?誘쇨컧?섏뿬 鍮꾪뙋???곸쿂諛쏄린 ?쎄퀬, ?먯〈??蹂댄샇瑜??꾪빐 ?붿쭅???쇰뱶諛??붿껌???뚰뵾?섎뒗 寃쏀뼢??諛섎났?곸씤 ?깆옣 ?뺤껜瑜?留뚮벊?덈떎.',
      strength:'?붿옄?맞룸??쇑룻뙣?샕룹떖誘몄쟻 ?덉쭏쨌?뺣? 遺꾩꽍쨌?щ━ ?듭같',
      weakness:'鍮꾪뙋??怨쇰?, ?먯〈?ъ쑝濡??명븳 ?숈뒿 李⑤떒, ?꾨꼍二쇱쓽 吏??,
      career:'?붿옄?대꼫, ?щ━?곷떞?? 蹂댁꽍 ?꾨Ц媛, ?깊삎?멸낵 ?꾨Ц?? ?먮젅?댄꽣, ?⑥뀡 ?붾젆?? },
    '鶯?: { name:'?꾩닔(鶯ф객)', type:'?좊룞 吏?듯삎',
      nature:'??媛뺤쿂???곹솴???곕씪 諛⑺뼢??諛붽씀??吏?듦낵 ?묒슜?μ씠 ?뱀텧?⑸땲?? 鍮좊Ⅸ ?곹솴 ?먮떒怨??듭떖 ?뚯븙 ?λ젰???덉쑝硫? ?ㅼ뼇??遺꾩빞瑜??섎굹?쒕뒗 ?щ줈?ㅼ삤踰???웾??媛뺤젏?낅땲?? 源딆씠 ?놁씠 ?쒕㈃留??묎퀬 ?ㅼ쓬?쇰줈 ?섏뼱媛???⑦꽩????遺꾩빞?먯꽌???꾨Ц??援ъ텞??諛⑺빐?섎ŉ, ?곕쭔?⑥씠 ?κ린 ?꾨줈?앺듃 ?꾩꽦??嫄몃┝?뚯씠 ?⑸땲??',
      strength:'?꾨왂 湲고쉷쨌?ㅻ텇??而⑥꽕?끒룸Т??룸??붿뼱쨌?ㅽ듃?뚰궧',
      weakness:'?쇨???遺議? 吏묒쨷??遺꾩궛, ?꾨Ц??寃곗뿬濡??뚰듃???좊ː ?쏀솕',
      career:'?꾨왂 而⑥꽕?댄듃, 臾댁뿭?? ??먮━?ㅽ듃, ?멸탳愿, ?ъ옄 遺꾩꽍媛' },
    '??: { name:'怨꾩닔(?멩객)', type:'?ъ링 ?듭같??,
      nature:'?댁뒳泥섎읆 ?뚮━ ?놁씠 移⑦닾?섎뒗 吏곴?怨??ъ링 ?듭같?μ씠 ?뱀쭠?낅땲?? 寃됱쑝濡??쒕윭?섏? ?딅뒗 ?대㈃??吏꾩떎??媛먯??섎뒗 ?λ젰??留ㅼ슦 ?곗뼱?섎ŉ, ?ъ꽭??媛먯닔?깆쑝濡??덉닠쨌移섏쑀쨌?곌뎄 遺꾩빞?먯꽌 ?먭컖???섑??낅땲?? ?먭린 ?몄텧??爰쇰━???댄뼢?깆씠 湲고쉶 ?댄븘??諛⑺빐?섎ŉ, 吏?섏튇 ?섎룞?깆씠 ?λ젰??鍮꾪빐 ??? ?ы쉶???꾩튂濡??댁뼱吏???꾪뿕???덉뒿?덈떎.',
      strength:'?щ━ 遺꾩꽍쨌?곌뎄쨌?덉닠 李쎌옉쨌移섏쑀쨌鍮꾨? ?뺣낫 愿由?,
      weakness:'?섎룞??愿怨? 湲고쉶 ?댄븘 誘명씉, 媛먯젙 ?뚯쭊, 怨쇰룄???댄뼢??,
      career:'?щ━?곷떞?? ?묎?, ?쒖닔 ?덉닠媛, ?곌뎄?? ?섎즺?? ?곸꽦 吏?꾩옄' }
  };

  /* ?? ??꽦蹂??ъ링 吏곸뾽 ?깊뼢 ?? */
  var TENSTAR_NATURE = {
    '?앹떊': { profile:'?앹떊(繇잏쪥)??二쇰룄?섎뒗 紐낆떇?낅땲?? 李쎌쓽???쒗쁽 ?뺢뎄媛 媛뺥븯硫???몄뿉寃??띿슂瑜?踰좏뫖???먮꼫吏媛 ?묐룞?⑸땲??',
      pro:'李쎌쓽??諛쒖긽怨??ㅽ뻾?μ씠 寃고빀????낆쑝濡??꾩씠?붿뼱瑜??섏씡?쇰줈 ?꾪솚?섎뒗 ?λ젰???덉뒿?덈떎. ?쇱쓣 利먭린硫댁꽌 ?섎뒗 ?깊뼢?쇰줈 踰덉븘???댁꽦???곷??곸쑝濡??믪뒿?덈떎.',
      con:'?댁긽???믪븘 ?꾩떎???쒖빟??臾댁떆?섍퀬 由ъ뒪?щ? 怨쇱냼?됯??섎뒗 寃쏀뼢???덉뒿?덈떎. 李쎌옉쨌?쒗쁽??移섏슦爾?愿由?룻넻???곸뿭?먯꽌 議곗쭅 留덉같???앷퉩?덈떎.' },
    '?곴?': { profile:'?곴?(?룟츟)??二쇰룄?섎뒗 紐낆떇?낅땲?? 湲곗〈 洹쒖튃怨?沅뚯쐞???꾩쟾?섎뒗 ?먮꼫吏媛 媛뺥븯硫??낆갹???묎렐?쇰줈 ?쒖옣???붾뱶???좎옱?μ씠 ?덉뒿?덈떎.',
      pro:'?곸썡???몃?怨??꾩씠?붿뼱濡??以묒쓣 ?ㅻ뱷?섎뒗 ?λ젰???덉쑝硫? 愿?됱쓣 ?뚭눼?섎뒗 ?곸떊 ??웾???곗뼱?⑸땲??',
      con:'?곸궗??議곗쭅 洹쒖쑉?????諛섎컻????븘 吏곸옣 ??媛덈벑??援ъ“?곸쑝濡?諛쒖깮?⑸땲?? 異⑸룞??諛쒖뼵??愿怨꾨? ?뚯씠?????놁씠 ?쇱넀?????덉뒿?덈떎.' },
    '?몄옱': { profile:'?몄옱(?뤺깹)媛 二쇰룄?섎뒗 紐낆떇?낅땲?? 鍮좊Ⅸ ?쒖옣 媛먯?? ?ш린???됰룞?μ씠 ?뱀쭠?쇰줈, 湲고쉶瑜??ъ갑???④린???섏씡?뷀븯???먮꼫吏媛 媛뺥빀?덈떎.',
      pro:'鍮좊Ⅸ ?먮떒?κ낵 ?곸뾽?? ?ㅼ뼇??遺꾩빞?먯꽌 ?덉쓽 ?먮쫫??媛먯??섎뒗 ?λ젰???곸썡?⑸땲??',
      con:'?κ린 ?쇨??깆씠 ?쏀븯硫?由ъ뒪??怨쇰떎 ?몄텧濡??명븳 ???먯떎 寃쏀뿕???댁옱?⑸땲?? ????듭젣 ?뺢뎄媛 遺꾩웳???쇨린?⑸땲??' },
    '?뺤옱': { profile:'?뺤옱(閭ｈ깹)媛 二쇰룄?섎뒗 紐낆떇?낅땲?? ?덉젙??異뺤옱? ?꾩떎 ?먯튃???낃컖???щЪ 愿由ш? 媛뺤젏?낅땲??',
      pro:'?깆떎?④낵 ?먯튃 以?섎줈 袁몄????깃낵瑜??볦쑝硫? ?щЪ??????꾩떎??愿由??λ젰???곗닔?⑸땲??',
      con:'吏?섏튇 ?덉쟾 吏?μ쑝濡?怨좎닔??湲고쉶瑜??ㅼ뒪濡?李⑤떒?섎뒗 ?⑦꽩???섑??⑸땲?? 蹂?????씠 ?쒓났(躍귞㈉)???볦튂寃??⑸땲??' },
    '?멸?': { profile:'?멸?(?뤷츟)??二쇰룄?섎뒗 紐낆떇?낅땲?? 洹뱁븳 ?뺣컯?먮룄 援댄븯吏 ?딅뒗 媛뺤쿋 硫섑깉怨?由щ뜑??移대━?ㅻ쭏媛 ?먮뱶?ъ쭛?덈떎.',
      pro:'?꾧린 ?곹솴?먯꽌 鍮쏅굹??寃곕떒?κ낵 ?듭넄?μ씠 ?덉쑝硫? 洹쒖쑉쨌沅뚯쐞 湲곕컲 議곗쭅?먯꽌 理쒖긽???깃낵瑜??낅땲??',
      con:'怨쇰룄??湲댁옣 吏?띿쑝濡??ъ떊 ?뚯쭊??鍮좊Ⅴ寃??듬땲?? 沅뚯쐞?????怨쇰? 諛섏쓳??遺덊븘?뷀븳 ?由쎌쓣 留뚮벊?덈떎.' },
    '?뺢?': { profile:'?뺢?(閭ｅ츟)??二쇰룄?섎뒗 紐낆떇?낅땲?? ?먯튃쨌?덉감쨌泥닿퀎瑜?以묒떆?섎ŉ 怨듭떇?곸씤 沅뚯쐞 援ъ“?먯꽌 ?먭컖???섑??대뒗 ?먮꼫吏?낅땲??',
      pro:'?좊ː?깃낵 梨낆엫媛먯씠 ?믪븘 ?κ린?곸쑝濡??ы쉶???꾩긽???볥뒗 ???좊━?⑸땲?? 洹쒖젙 ?댁뿉???곸썡???ㅽ뻾 ?λ젰??諛쒗쐶?⑸땲??',
      con:'吏?섏튇 ?꾨꼍二쇱쓽? ?꾧퀬???먯튃二쇱쓽媛 ?좎뿰???泥섎? 諛⑺빐?섏뿬 蹂?붽? 鍮좊Ⅸ ?섍꼍?먯꽌 ?ㅼ쿂吏????덉뒿?덈떎.' },
    '?몄씤': { profile:'?몄씤(?뤷뜲)??二쇰룄?섎뒗 紐낆떇?낅땲?? 鍮꾩꽑?뺤쟻 ?ш퀬? ?낆갹???숈뒿 諛⑹떇??媛뺤젏?대ŉ, 吏곴?怨??곴컧??二쇰맂 ?먮꼫吏?먯엯?덈떎.',
      pro:'湲곗〈 吏?앹쓣 ?낇듅??諛⑹떇?쇰줈 ?ъ“?⑺븯??李쎌쓽??臾몄젣?닿껐 ?λ젰???덉쑝硫? ?덉닠쨌?щ━쨌?곌뎄 遺꾩빞?먯꽌 ?⑤떎瑜??듭같??諛쒗쐶?⑸땲??',
      con:'吏묒쨷?μ씠 ?쇨??섏? ?딆븘 以묐룄 ?댄깉????퀬, ?꾩떎???ㅽ뻾蹂대떎 ?댁긽??援ъ긽??癒몃Т???쒓컙??怨쇰룄?⑸땲??' },
    '?뺤씤': { profile:'?뺤씤(閭ｅ뜲)??二쇰룄?섎뒗 紐낆떇?낅땲?? 泥닿퀎???숈뒿怨?吏??異뺤쟻??泥쒕????먯쭏???덉쑝硫? ?꾨Ц?깆쓣 ?ы쉶??沅뚯쐞濡??꾪솚?섎뒗 ?먮꼫吏媛 媛뺥빀?덈떎.',
      pro:'源딆씠 ?덈뒗 吏?앷낵 ?쇰━??泥닿퀎?깆씠 媛뺤젏?대ŉ, 援먯쑁쨌?곌뎄쨌?곷떞 遺꾩빞?먯꽌 ?κ린?곸씤 ?좊ː瑜?援ъ텞?⑸땲??',
      con:'?숈뒿??怨쇰룄?섍쾶 ?덉＜?섏뿬 ?ㅼ쟾 寃쏀뿕 遺議깆쑝濡??댁뼱吏????덉뒿?덈떎. ?덈줈???섍꼍 ?곸쓳 ?띾룄媛 ?먮┰?덈떎.' },
    '鍮꾧껄': { profile:'鍮꾧껄(驪붻궔)??二쇰룄?섎뒗 紐낆떇?낅땲?? ?낅┰???뺤껜?깃낵 ?먮┰ ?먮꼫吏媛 留ㅼ슦 媛뺥븯硫? ?ㅼ뒪濡쒖쓽 ?섏쑝濡??몄긽??媛쒖쿃?섎젮???뺢뎄媛 ?쒕졆?⑸땲??',
      pro:'?먭린 二쇰룄?깃낵 ?낅┰???ㅽ뻾?μ씠 ?곸썡?섏뿬 1??湲곗뾽쨌?꾨━?쒖꽌쨌?먯쁺?낆뿉??媛뺤젏??諛쒗쐶?⑸땲??',
      con:'?묐젰 湲고뵾? ?낅떒???먮떒??遺덊븘?뷀븳 怨좊┰??留뚮뱾硫? ?щЪ?????臾닿??ъ씠 寃쎌젣??遺덉븞?뺤쑝濡??댁뼱吏????덉뒿?덈떎.' },
    '寃곸옱': { profile:'寃곸옱(?ヨ깹)媛 二쇰룄?섎뒗 紐낆떇?낅땲?? 寃쎌웳?먯꽌 ?댁븘?⑤뒗 媛뺣젹???앹〈 ?먮꼫吏? 異붿쭊?μ씠 ?먮뱶?ъ쭛?덈떎.',
      pro:'洹뱁븳 寃쎌웳 ?섍꼍?먯꽌 ?ㅽ엳????웾????컻?섎ŉ, ?곸뾽쨌?ㅽ룷痢졖룻닾湲곗쟻 ?ъ뾽?먯꽌 ?곗뼱???깃낵瑜??낅땲??',
      con:'寃쎌웳??湲곕낯媛믪씠 ?섏뼱 ?뚰듃?덉떗???꾩슂濡??섎뒗 遺꾩빞?먯꽌 諛섎났?곸쑝濡??ㅽ뙣?⑸땲?? 媛먯젙 湲곕났???먮떒?μ쓣 ?먮┰?덈떎.' }
  };

  /* 泥쒓컙 / 吏吏 ??꽦 怨꾩궛 蹂댁“ */
  var GAN_EL = {
    '??:'wood','阿?:'wood','訝?:'fire','訝?:'fire','??:'earth',
    '藥?:'earth','佯?:'metal','渦?:'metal','鶯?:'water','??:'water'
  };
  var JI_EL = {
    '耶?:'water','訝?:'earth','野?:'wood','??:'wood','渦?:'earth','藥?:'fire',
    '??:'fire','??:'earth','??:'metal','??:'metal','??:'earth','雅?:'water'
  };
  var POLARITY_YIN  = ['阿?,'訝?,'藥?,'渦?,'??];
  var EL_CYCLE = ['wood','fire','earth','metal','water'];

  /* ??꽦 怨꾩궛 */
  function _calcTenStar(dayGan, targetChar) {
    var dayEl = GAN_EL[dayGan];
    var tEl   = GAN_EL[targetChar] || JI_EL[targetChar];
    if (!dayEl || !tEl) return null;
    var dayIdx = EL_CYCLE.indexOf(dayEl);
    var tIdx   = EL_CYCLE.indexOf(tEl);
    var diff   = (tIdx - dayIdx + 5) % 5;
    var daySame = POLARITY_YIN.indexOf(dayGan) >= 0;
    var tSame   = POLARITY_YIN.indexOf(targetChar) >= 0;
    var samePol = (daySame === tSame);
    if (diff === 0) return samePol ? '鍮꾧껄' : '寃곸옱';
    if (diff === 1) return samePol ? '?앹떊' : '?곴?';
    if (diff === 2) return samePol ? '?몄옱' : '?뺤옱';
    if (diff === 3) return samePol ? '?멸?' : '?뺢?';
    if (diff === 4) return samePol ? '?몄씤' : '?뺤씤';
    return null;
  }

  /* ?꾩옱 ?꾨줈???쎄린 */
  function _getCurrentProfile() {
    try {
      var list = JSON.parse(localStorage.getItem(NS + '.list') || '[]');
      var curr = localStorage.getItem(NS + '.current');
      var p = (curr && list.find(function(x){return x.id===curr;})) || list[0] || null;
      if (p && (!p.birth || !p.birth.year)) p = null;
      return p;
    } catch(e) { return null; }
  }

  function _normalizePillarsShape(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var src = raw;
    if (src.year && !src.y) {
      src = {
        y: { g: src.year && src.year.g, j: src.year && src.year.j },
        m: { g: src.month && src.month.g, j: src.month && src.month.j },
        d: { g: src.day && src.day.g, j: src.day && src.day.j },
        h: { g: src.hour && src.hour.g, j: src.hour && src.hour.j }
      };
    }

    var out = {
      y: Object.assign({}, src.y || {}),
      m: Object.assign({}, src.m || {}),
      d: Object.assign({}, src.d || {}),
      h: Object.assign({}, src.h || {})
    };

    var hasAny = !!(
      out.y.g || out.y.j || out.m.g || out.m.j || out.d.g || out.d.j || out.h.g || out.h.j
    );
    return hasAny ? out : null;
  }

  function _ensurePillarsWithProfileFallback(rawPillars, profile) {
    var normalized = _normalizePillarsShape(rawPillars) || _normalizePillarsShape(window.G_PILLARS || null);

    var hasCore = !!(normalized && normalized.y && normalized.y.g && normalized.y.j && normalized.m && normalized.m.g && normalized.m.j && normalized.d && normalized.d.g && normalized.d.j);
    var hasHour = !!(normalized && normalized.h && normalized.h.g && normalized.h.j);
    if (hasCore && hasHour) return normalized;

    if (profile && profile.birth && typeof window.computeProfileForModal === 'function') {
      try {
        var computed = window.computeProfileForModal(profile);
        var recomputed = _normalizePillarsShape((computed && computed.p) || window.G_PILLARS || null);
        if (recomputed && recomputed.d && recomputed.d.g && recomputed.d.j) {
          return recomputed;
        }
      } catch (_) {}
    }

    return normalized;
  }

  function _pillarChars(p) {
    var pp = _normalizePillarsShape(p) || { y: {}, m: {}, d: {}, h: {} };
    return {
      y: pp.y || {},
      m: pp.m || {},
      d: pp.d || {},
      h: pp.h || {}
    };
  }

  function _sibylHash(text) {
    var src = String(text || '');
    var hash = 2166136261;
    for (var i = 0; i < src.length; i += 1) {
      hash ^= src.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16);
  }

  function _sibylProfileCacheKey(profile) {
    if (!profile || !profile.birth) return '';
    var b = profile.birth || {};
    var scope = [
      profile.id || '',
      b.year || '', b.month || '', b.day || '', b.hour || '', b.minute || '',
      profile.gender || ''
    ].join('|');
    return SIBYL_REPORT_CACHE_NS + ':' + _sibylHash(scope);
  }

  function _loadSibylCachedReport(profile) {
    var key = _sibylProfileCacheKey(profile);
    if (!key) return null;
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      // Keep previously generated reports accessible even after cache version bumps.
      if (parsed.version && parsed.version !== SIBYL_REPORT_CACHE_VERSION) {
        _sibylLogWarn('[SIBYL] cache version mismatch, using legacy payload if valid', {
          cachedVersion: String(parsed.version || ''),
          expectedVersion: SIBYL_REPORT_CACHE_VERSION
        });
      }
      if (!parsed.reportData || !Array.isArray(parsed.reportData.chapters) || !parsed.reportData.chapters.length) return null;
      return parsed;
    } catch (_) {
      return null;
    }
  }

  function _saveSibylCachedReport(profile, reportData, analysisData) {
    var key = _sibylProfileCacheKey(profile);
    if (!key || !reportData || !Array.isArray(reportData.chapters) || !reportData.chapters.length) return false;
    var payload = {
      version: SIBYL_REPORT_CACHE_VERSION,
      savedAt: Date.now(),
      reportData: {
        source: reportData.source || 'gemini',
        model: reportData.model || '',
        totalChars: Number(reportData.totalChars || 0),
        minTotalChars: Number(reportData.minTotalChars || 0),
        chapterMap: reportData.chapterMap && typeof reportData.chapterMap === 'object' ? reportData.chapterMap : null,
        chapters: reportData.chapters,
        canonicalData: reportData.canonicalData || null
      },
      analysisData: {
        pillars: analysisData && analysisData.pillars ? analysisData.pillars : null,
        domEl: analysisData && analysisData.domEl,
        dominant: analysisData && analysisData.dominant,
        coeff: analysisData && analysisData.coeff,
        risk: analysisData && analysisData.risk
      }
    };
    try {
      localStorage.setItem(key, JSON.stringify(payload));
      return true;
    } catch (_) {
      return false;
    }
  }

  function _syncSibylUnlockButton(profile, unlockStatus) {
    var btn = _q('sbUnlockBtn');
    if (!btn) return;
    if (unlockStatus && unlockStatus.ok) {
      if (unlockStatus.unlocked) {
        btn.textContent = '????λ맂 DOMINATOR 由ы룷???닿린';
        btn.disabled = false;
        return;
      }
      btn.textContent = '??EXECUTE DOMINATOR ??100肄붿씤';
      btn.disabled = false;
      return;
    }

    btn.textContent = '??EXECUTE DOMINATOR ??100肄붿씤';
    btn.disabled = false;
  }

  function _openCachedDominatorReport(profile, fallbackAnalysis) {
    var cached = _loadSibylCachedReport(profile);
    if (!cached || !cached.reportData) return false;

    var lockEl = _q('sbLockOverlay');
    if (lockEl) lockEl.classList.add('sb-hidden');
    var genEl = _q('sbGenerating');
    if (genEl) genEl.classList.add('sb-hidden');

    var analysis = cached.analysisData || fallbackAnalysis || {};
    var canonicalData = (cached.reportData && cached.reportData.canonicalData)
      || (analysis && analysis.canonicalData)
      || null;
    var shaped = _shapeSibylPremiumReport(cached.reportData, canonicalData);
    var validation = _validateSibylPremiumChapterMap(shaped && shaped.chapterMap);
    if (!validation.ok) return false;

    _renderDominatorReport(shaped, analysis);
    _saveSibylCachedReport(profile, shaped, analysis);
    return true;
  }

  async function _openCachedDominatorReportIfUnlocked(profile, fallbackAnalysis) {
    if (_isAdminBypassUser()) {
      return _openCachedDominatorReport(profile, fallbackAnalysis);
    }

    var unlockStatus = await _resolveSibylUnlockStatus();
    _syncSibylUnlockButton(profile, unlockStatus);
    if (!(unlockStatus && unlockStatus.ok && unlockStatus.unlocked)) return false;
    return _openCachedDominatorReport(profile, fallbackAnalysis);
  }

  /* G_PILLARS ????꽦 移댁슫??*/
  function _analyzeTenStars(p) {
    var ps = _pillarChars(p);
    if (!ps.d || !ps.d.g) return {};
    var dayGan = ps.d.g;
    var chars = [ps.y.g, ps.y.j, ps.m.g, ps.m.j, ps.d.j, ps.h.g, ps.h.j];
    // ?쇱?(?ζ뵱)???ы븿, ?붿? 吏?κ컙? ?⑥닚????吏吏 ?먯껜留??ъ슜
    var counts = {};
    chars.forEach(function(c) {
      var ts = _calcTenStar(dayGan, c);
      if (ts) counts[ts] = (counts[ts] || 0) + 1;
    });
    return counts;
  }

  /* 二쇰룄 ??꽦 (媛??留롮? 寃? */
  function _dominantTenStar(counts) {
    var best = null, bestN = 0;
    Object.keys(counts).forEach(function(k) {
      if (counts[k] > bestN) { bestN = counts[k]; best = k; }
    });
    return best || '以묐┰';
  }

  /* 鍮꾧쾪 移댁슫??*/
  function _bijabCount(counts) {
    return (counts['鍮꾧껄']||0) + (counts['寃곸옱']||0);
  }

  function _clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function _createRequestId(prefix) {
    return String(prefix || 'sibyl') + ':' + Date.now().toString(36) + ':' + Math.random().toString(36).slice(2, 10);
  }

  function _buildApiCandidates(path) {
    var normalizedPath = String(path || '/').trim();
    if (normalizedPath.charAt(0) !== '/') normalizedPath = '/' + normalizedPath;

    var seen = Object.create(null);
    var out = [];
    function push(raw) {
      var value = String(raw || '').trim();
      if (!value || seen[value]) return;
      seen[value] = true;
      out.push(value);
    }

    push(normalizedPath);
    try {
      if (window && window.__CD_API_BASE_URL) {
        push(String(window.__CD_API_BASE_URL).replace(/\/+$/, '') + normalizedPath);
      }
    } catch (_) {}
    try {
      if (window && window.CODE_DESTINY_API_BASE_URL) {
        push(String(window.CODE_DESTINY_API_BASE_URL).replace(/\/+$/, '') + normalizedPath);
      }
    } catch (_) {}
    try {
      if (window && window.__CF_PAGES_API_BASE_URL) {
        push(String(window.__CF_PAGES_API_BASE_URL).replace(/\/+$/, '') + normalizedPath);
      }
    } catch (_) {}
    try {
      var customBase = localStorage.getItem('fortune_api_base_url');
      if (customBase) push(String(customBase).replace(/\/+$/, '') + normalizedPath);
    } catch (_) {}
    try {
      if (window && window.location && window.location.origin) {
        push(String(window.location.origin).replace(/\/+$/, '') + normalizedPath);
      }
    } catch (_) {}
    return out;
  }

  async function _fetchApiJson(path, options) {
    var candidates = _buildApiCandidates(path);
    var init = Object.assign({
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: {}
    }, options || {});
    var timeoutMs = Math.max(1000, Number(init && init.timeoutMs || 12000));
    delete init.timeoutMs;
    init.headers = Object.assign({}, init.headers || {});

    if (init.body && !init.headers['Content-Type']) {
      init.headers['Content-Type'] = 'application/json';
    }

    var lastResult = null;
    for (var i = 0; i < candidates.length; i += 1) {
      var url = candidates[i];
      var controller = typeof AbortController === 'function' ? new AbortController() : null;
      var timer = setTimeout(function() {
        if (controller) {
          try { controller.abort(); } catch (_) {}
        }
      }, timeoutMs);
      if (controller) init.signal = controller.signal;
      try {
        var res = await fetch(url, init);
        var payload = {};
        try { payload = await res.clone().json(); } catch (_) { payload = {}; }
        var result = {
          ok: res.ok,
          status: res.status,
          payload: payload,
          url: url
        };
        if (res.ok) return result;
        lastResult = result;
        if (res.status !== 404) return result;
      } catch (error) {
        var message = String(error && error.message || 'network-error');
        var isAbort = String(error && error.name || '').toLowerCase() === 'aborterror';
        lastResult = {
          ok: false,
          status: 0,
          payload: { error: { code: isAbort ? 'TIMEOUT' : 'NETWORK_ERROR', message: isAbort ? ('request-timeout-' + timeoutMs + 'ms') : message } },
          url: url
        };
      } finally {
        clearTimeout(timer);
      }
    }

    return lastResult || {
      ok: false,
      status: 0,
      payload: { error: { code: 'NETWORK_ERROR', message: 'API ?붿껌???ㅽ뙣?덉뒿?덈떎.' } },
      url: String(path || '')
    };
  }

  function _extractApiData(payload) {
    if (!payload || typeof payload !== 'object') return {};
    if (payload.data && typeof payload.data === 'object') return payload.data;
    return payload;
  }

  function _safeErrorMessage(responseLike) {
    var payload = responseLike && responseLike.payload;
    if (!payload || typeof payload !== 'object') return '';
    if (payload.error && typeof payload.error.message === 'string') return payload.error.message.trim();
    if (typeof payload.message === 'string') return payload.message.trim();
    return '';
  }

  function _toFriendlySibylErrorMessage(error, fallback) {
    var code = String(error && error.code || '').toUpperCase();
    var status = Number(error && error.status || 0);
    var msg = String(error && error.message || '').toLowerCase();

    if (code === 'AUTH_REQUIRED' || code === 'UNAUTHORIZED' || status === 401 || status === 403) {
      return '濡쒓렇?몄씠 ?꾩슂?⑸땲?? 濡쒓렇?????ㅼ떆 ?쒕룄??二쇱꽭??';
    }
    if (code === 'INSUFFICIENT_BALANCE' || msg.indexOf('insufficient') >= 0) {
      return '肄붿씤??遺議깊빀?덈떎. 肄붿씤 異⑹쟾 ???ㅼ떆 ?쒕룄??二쇱꽭??';
    }
    if (code === 'PRICE_NOT_FOUND' || code === 'UNKNOWN_FEATURE_KEY') {
      return '寃곗젣 媛寃??뺣낫瑜?遺덈윭?ㅼ? 紐삵뻽?듬땲?? ?좎떆 ???ㅼ떆 ?쒕룄??二쇱꽭??';
    }
    if (code === 'NETWORK_ERROR' || status === 0) {
      return '?ㅽ듃?뚰겕 ?곌껐??遺덉븞?뺥빀?덈떎. ?좎떆 ???ㅼ떆 ?쒕룄??二쇱꽭??';
    }
    return fallback || '?붿껌 泥섎━ 以?臾몄젣媛 諛쒖깮?덉뒿?덈떎. ?좎떆 ???ㅼ떆 ?쒕룄??二쇱꽭??';
  }

  function _setSibylErrorMessage(text) {
    var errMsg = _q('sbErrorMsg');
    if (!errMsg) return;
    errMsg.textContent = text || '?붿껌 泥섎━ 以?臾몄젣媛 諛쒖깮?덉뒿?덈떎. ?좎떆 ???ㅼ떆 ?쒕룄??二쇱꽭??';
  }

  function _setSibylState(nextState, message) {
    _sibylUiState = nextState;
    var genEl = _q('sbGenerating');
    var errEl = _q('sbErrorState');
    var statusEl = _q('sbGenStatus');

    if (nextState === SibylState.ERROR) {
      if (genEl) genEl.classList.add('sb-hidden');
      if (errEl) errEl.classList.remove('sb-hidden');
      _setSibylErrorMessage(message || '?붿껌 泥섎━ 以?臾몄젣媛 諛쒖깮?덉뒿?덈떎. ?좎떆 ???ㅼ떆 ?쒕룄??二쇱꽭??');
      return;
    }

    if (errEl) errEl.classList.add('sb-hidden');

    if (nextState === SibylState.GENERATING_REPORT) {
      if (genEl) genEl.classList.remove('sb-hidden');
      if (statusEl) statusEl.textContent = message || '>> ?쒕퉴??由ы룷?몃? ?앹꽦?섎뒗 以묒엯?덈떎??;
      return;
    }

    if (nextState === SibylState.PROCESSING_PAYMENT) {
      if (genEl) genEl.classList.add('sb-hidden');
      if (statusEl) statusEl.textContent = message || '>> 寃곗젣 ?곹깭瑜??뺤씤?섎뒗 以묒엯?덈떎??;
      return;
    }

    if (nextState === SibylState.READY) {
      if (genEl) genEl.classList.add('sb-hidden');
      return;
    }

    if (nextState === SibylState.LOADING) {
      if (genEl) genEl.classList.add('sb-hidden');
    }
  }

  function _mean(nums) {
    if (!Array.isArray(nums) || !nums.length) return 0;
    return nums.reduce(function(sum, n) { return sum + Number(n || 0); }, 0) / nums.length;
  }

  function _stddev(nums) {
    if (!Array.isArray(nums) || nums.length < 2) return 0;
    var mu = _mean(nums);
    var variance = nums.reduce(function(sum, n) {
      var v = Number(n || 0) - mu;
      return sum + (v * v);
    }, 0) / nums.length;
    return Math.sqrt(variance);
  }

  function _profileAge(profile) {
    try {
      var p = profile || _getCurrentProfile() || {};
      var b = p.birth || {};
      var y = Number(b.year || 0);
      if (!Number.isFinite(y) || y < 1900) return 30;
      var now = new Date();
      var age = now.getFullYear() - y + 1;
      return _clamp(Math.round(age), 1, 120);
    } catch (_) {
      return 30;
    }
  }

  function _evalDaewunBridge(gan, zhi) {
    try {
      if (!gan || !zhi) throw new Error('invalid-ganzhi');
      var fn = (typeof window.evalDaewun === 'function')
        ? window.evalDaewun
        : (typeof evalDaewun === 'function' ? evalDaewun : null);
      if (!fn) throw new Error('evalDaewun-unavailable');
      var ev = fn(gan, zhi) || {};
      var score = Number(ev.score);
      if (!Number.isFinite(score)) score = 50;
      var normalizedScore = _clamp(Math.round(score), 0, 100);
      return {
        score: normalizedScore,
        label: ev.label || (normalizedScore >= 70 ? '?몄“' : normalizedScore >= 45 ? '臾대궃' : '寃쎄퀎'),
        cls: ev.cls || 'neutral',
        evalSummary: ev.evalSummary || (gan + zhi + ' 湲곗슫??湲곕낯 由ъ뒪???ㅼ퐫?대줈 諛섏쁺?덉뒿?덈떎.'),
        hasChungBonus: !!ev.hasChungBonus,
        hasChungPenalty: !!ev.hasChungPenalty
      };
    } catch (err) {
      console.warn('[Sibyl] evalDaewun bridge fallback:', err && err.message ? err.message : err);
      return {
        score: 50,
        label: '以묐┰',
        cls: 'neutral',
        evalSummary: String(gan || '') + String(zhi || '') + ' 湲곗? 湲곕낯 ?ㅼ퐫??50)濡?蹂댁젙?덉뒿?덈떎.',
        hasChungBonus: false,
        hasChungPenalty: false
      };
    }
  }

  function _normalizeGanZhiPair(value) {
    if (!value) return null;
    if (typeof value === 'string') {
      if (value.length >= 2) return { g: value.charAt(0), j: value.charAt(1) };
      return null;
    }
    if (typeof value === 'object') {
      var g = value.g || value.gan || value[0];
      var j = value.j || value.zhi || value[1];
      if (g && j) return { g: String(g), j: String(j) };
    }
    return null;
  }

  function _getMonthGanZhiFor(year, month) {
    try {
      if (typeof window.getMonthGanZhi === 'function') {
        var fromFn = _normalizeGanZhiPair(window.getMonthGanZhi(year, month));
        if (fromFn) return fromFn;
      }
    } catch (_) {}
    try {
      if (typeof Solar !== 'undefined' && Solar && typeof Solar.fromYmdHms === 'function') {
        var s = Solar.fromYmdHms(year, month, 15, 12, 0, 0);
        var ec = s.getLunar().getEightChar();
        return { g: ec.getMonthGan(), j: ec.getMonthZhi() };
      }
    } catch (_) {}

    var monthZhi = ['野?,'??,'渦?,'藥?,'??,'??,'??,'??,'??,'雅?,'耶?,'訝?];
    var yz = monthZhi[(month - 1 + 12) % 12];
    var ygz = _getYearGanZhi(year);
    return { g: ygz.gan, j: yz };
  }

  function _analyzeFortuneBridge(gz, pillars, label) {
    var pair = _normalizeGanZhiPair(gz) || { g: '', j: '' };
    var pillarChars = _pillarChars(pillars);
    var dayGan = pillarChars && pillarChars.d && pillarChars.d.g;
    var fallbackGGod = (dayGan && pair.g) ? (_calcTenStar(dayGan, pair.g) || '以묐┰') : '以묐┰';
    var fallbackJGod = (dayGan && pair.j) ? (_calcTenStar(dayGan, pair.j) || '以묐┰') : '以묐┰';

    try {
      if (!pair) throw new Error('invalid-gz');
      var fn = (typeof window.analyzeFortuneGZ === 'function')
        ? window.analyzeFortuneGZ
        : (typeof analyzeFortuneGZ === 'function' ? analyzeFortuneGZ : null);
      if (!fn) throw new Error('analyzeFortuneGZ-unavailable');
      var res = fn(pair, pillars, label || '?쒕퉴???붿슫') || {};
      var battery = Number.isFinite(Number(res.batteryPercent)) ? _clamp(Math.round(Number(res.batteryPercent)), 0, 100) : 50;
      return {
        grade: res.grade || (battery >= 70 ? '?몄“' : battery >= 45 ? '臾대궃' : '寃쎄퀎'),
        icon: res.icon || '??,
        batteryPercent: battery,
        adviceItems: Array.isArray(res.adviceItems) ? res.adviceItems : [],
        luckyEl: res.luckyEl || null,
        gGod: res.gGod || fallbackGGod,
        jGod: res.jGod || fallbackJGod
      };
    } catch (err) {
      var ev = _evalDaewunBridge(pair.g, pair.j);
      var fallbackBattery = _clamp(Math.round(Number(ev && ev.score || 50)), 0, 100);
      return {
        grade: fallbackBattery >= 70 ? '?몄“' : fallbackBattery >= 45 ? '臾대궃' : '寃쎄퀎',
        icon: '?좑툘',
        batteryPercent: fallbackBattery,
        adviceItems: [{
          type: 'guide',
          body: (label || '?붿슫') + '? ' + fallbackGGod + '/' + fallbackJGod + ' 異뺤쑝濡?湲곕낯 蹂댁젙??諛섏쁺?덉뒿?덈떎.'
        }],
        luckyEl: null,
        gGod: fallbackGGod,
        jGod: fallbackJGod
      };
    }
  }

  function _pickDaewunForAge(age, daewunList) {
    if (!Array.isArray(daewunList) || !daewunList.length) return null;
    var list = daewunList.slice().sort(function(a, b) { return a.age - b.age; });
    var current = null;
    for (var i = 0; i < list.length; i += 1) {
      var st = Number(list[i].age || 0);
      var next = (i < list.length - 1) ? Number(list[i + 1].age || 999) : 999;
      if (age >= st && age < next) {
        current = list[i];
        break;
      }
    }
    return current || list[list.length - 1];
  }

  function _collectCollisionSignals(pillars, year) {
    var out = {
      chungCount: 0,
      hyungCount: 0,
      paCount: 0,
      haeCount: 0,
      score: 0,
      notes: []
    };
    if (!pillars || !pillars.d || !pillars.m) return out;

    var yZhi = _getYearGanZhi(year).zhi;
    var branches = [pillars.y && pillars.y.j, pillars.m && pillars.m.j, pillars.d && pillars.d.j, pillars.h && pillars.h.j].filter(Boolean);

    var CHONG = { '耶?:'??,'??:'耶?,'訝?:'??,'??:'訝?,'野?:'??,'??:'野?,'??:'??,'??:'??,'渦?:'??,'??:'渦?,'藥?:'雅?,'雅?:'藥? };
    var PA = { '耶?:'??,'??:'耶?,'??:'??,'??:'??,'渦?:'訝?,'訝?:'渦?,'??:'??,'??:'??,'野?:'雅?,'雅?:'野?,'藥?:'??,'??:'藥? };
    var HAE = { '耶?:'??,'??:'耶?,'訝?:'??,'??:'訝?,'野?:'藥?,'藥?:'野?,'??:'渦?,'渦?:'??,'??:'雅?,'雅?:'??,'??:'??,'??:'?? };

    branches.forEach(function(z) {
      if (CHONG[z] === yZhi) {
        out.chungCount += 1;
        out.notes.push('?곗?(' + yZhi + ')媛 ?먭뎅 ' + z + '怨?異?亦?');
      }
      if (PA[z] === yZhi) {
        out.paCount += 1;
        out.notes.push('?곗?(' + yZhi + ')媛 ?먭뎅 ' + z + '怨?????');
      }
      if (HAE[z] === yZhi) {
        out.haeCount += 1;
        out.notes.push('?곗?(' + yZhi + ')媛 ?먭뎅 ' + z + '怨???若?');
      }
    });

    var set = branches.concat([yZhi]);
    var hasInSaShin = ['野?, '藥?, '??].every(function(z) { return set.indexOf(z) >= 0; });
    var hasChukSulMi = ['訝?, '??, '??].every(function(z) { return set.indexOf(z) >= 0; });
    if (hasInSaShin) {
      out.hyungCount += 2;
      out.notes.push('?몄궗??野끻럼?? ?쇳삎 ?깅┰');
    }
    if (hasChukSulMi) {
      out.hyungCount += 2;
      out.notes.push('異뺤닠誘?訝묉닃?? ?쇳삎 ?깅┰');
    }

    out.score = _clamp(out.chungCount * 18 + out.hyungCount * 12 + out.paCount * 10 + out.haeCount * 8, 0, 100);
    return out;
  }

  function _resolveSeasonFromMonthBranch(monthBranch) {
    var branch = String(monthBranch || '').trim();
    if (branch === '野? || branch === '?? || branch === '渦?) return 'spring';
    if (branch === '藥? || branch === '?? || branch === '??) return 'summer';
    if (branch === '?? || branch === '?? || branch === '??) return 'autumn';
    if (branch === '雅? || branch === '耶? || branch === '訝?) return 'winter';
    return 'unknown';
  }

  function _normalizeJohuType(typeRaw, climateType, season) {
    var typeText = String(typeRaw || '').trim().toLowerCase();
    if (typeText === 'hot' || typeText === 'warm' || typeText === 'neutral' || typeText === 'cool' || typeText === 'cold') {
      return typeText;
    }

    var climate = String(climateType || '').trim().toLowerCase();
    if (climate.indexOf('hot') >= 0) return 'hot';
    if (climate.indexOf('cold') >= 0) return 'cold';
    if (climate.indexOf('warm') >= 0) return 'warm';
    if (climate.indexOf('cool') >= 0) return 'cool';
    if (climate.indexOf('balanced') >= 0 || climate.indexOf('neutral') >= 0) return 'neutral';

    if (season === 'summer') return 'warm';
    if (season === 'winter') return 'cool';
    return 'neutral';
  }

  function _normalizeJohuMoistType(moistTypeRaw, moistureProfile, climateType) {
    var moistText = String(moistTypeRaw || '').trim().toLowerCase();
    if (moistText === 'dry' || moistText === 'wet' || moistText === 'balanced') {
      return moistText;
    }

    var profile = (moistureProfile && typeof moistureProfile === 'object') ? moistureProfile : null;
    var dryness = Number(profile && profile.dryness || 0);
    var moisture = Number(profile && profile.moisture || 0);
    if (Number.isFinite(dryness) && Number.isFinite(moisture)) {
      if (dryness - moisture >= 4) return 'dry';
      if (moisture - dryness >= 4) return 'wet';
    }

    var climate = String(climateType || '').trim().toLowerCase();
    if (climate.indexOf('dry') >= 0) return 'dry';
    if (climate.indexOf('wet') >= 0 || climate.indexOf('moist') >= 0) return 'wet';
    return 'balanced';
  }

  function _createFallbackJohu(normalized) {
    var pillars = normalized && normalized.pillars;
    var dist = normalized && normalized.dist;
    var monthBranch = String(pillars && pillars.m && pillars.m.j || '').trim();
    var season = _resolveSeasonFromMonthBranch(monthBranch);

    var fire = Number(dist && dist.fire || 0);
    var water = Number(dist && dist.water || 0);
    var wood = Number(dist && dist.wood || 0);
    var metal = Number(dist && dist.metal || 0);

    var seasonalOffset = 0;
    if (season === 'summer') seasonalOffset = 2;
    else if (season === 'winter') seasonalOffset = -2;
    else if (season === 'spring') seasonalOffset = 1;
    else if (season === 'autumn') seasonalOffset = -1;

    var heatDelta = (fire - water) + seasonalOffset;
    var type = 'neutral';
    if (heatDelta >= 3) type = 'hot';
    else if (heatDelta >= 1) type = 'warm';
    else if (heatDelta <= -3) type = 'cold';
    else if (heatDelta <= -1) type = 'cool';

    var moistDelta = (water + wood) - (fire + metal);
    var moistType = 'balanced';
    if (moistDelta >= 2) moistType = 'wet';
    else if (moistDelta <= -2) moistType = 'dry';

    var climateType = type + '-' + moistType;
    var advice;
    if (type === 'hot' || type === 'warm') {
      advice = '?닿린 ?꾪솕瑜??꾪빐 ??麗?쨌湲??? 蹂댁셿 猷⑦떞???꾩슂?⑸땲??';
    } else if (type === 'cold' || type === 'cool') {
      advice = '?쒓린 ?꾪솕瑜??꾪빐 ????쨌紐??? 蹂댁셿 猷⑦떞???꾩슂?⑸땲??';
    } else {
      advice = '?쒕궃 洹좏삎? 以묐┰?대굹 ?붾퀎 蹂?숈꽦 愿由ш? ?꾩슂?⑸땲??';
    }

    return {
      score: Math.round(heatDelta * 1.8),
      type: type,
      moistType: moistType,
      climateType: climateType,
      season: season,
      birthSeason: season,
      monthBranch: monthBranch,
      advice: advice,
      source: 'fallback-derived',
      hasFallback: true,
      confidence: 'low'
    };
  }

  function _normalizeJohu(rawJohu, normalized) {
    var raw = (rawJohu && typeof rawJohu === 'object') ? rawJohu : null;
    if (!raw) return _createFallbackJohu(normalized);

    var monthBranch = String(raw.monthBranch || (normalized && normalized.pillars && normalized.pillars.m && normalized.pillars.m.j) || '').trim();
    var season = _safeText(raw.season || raw.birthSeason, _resolveSeasonFromMonthBranch(monthBranch));
    var climateType = _safeText(raw.climateType, '');
    var type = _normalizeJohuType(raw.type, climateType, season);
    var moistType = _normalizeJohuMoistType(raw.moistType, raw.moistureProfile, climateType);

    var normalizedJohu = {
      score: Number.isFinite(Number(raw.score)) ? Number(raw.score) : Math.round(((type === 'hot' || type === 'warm') ? 3 : (type === 'cold' || type === 'cool') ? -3 : 0)),
      type: type,
      moistType: moistType,
      climateType: climateType || (type + '-' + moistType),
      season: season,
      birthSeason: _safeText(raw.birthSeason, season),
      monthBranch: monthBranch,
      advice: _safeText(raw.advice, '議고썑 ?곗씠???쇰?媛 遺議깊븯??蹂댁닔?곸쑝濡??댁꽍?⑸땲??'),
      source: _safeText(raw.source, 'provided'),
      hasFallback: false,
      confidence: _safeText(raw.confidence, 'high')
    };

    if (!raw.type && !raw.climateType && !raw.moistType) {
      var fallback = _createFallbackJohu(normalized);
      normalizedJohu.type = fallback.type;
      normalizedJohu.moistType = fallback.moistType;
      normalizedJohu.climateType = fallback.climateType;
      normalizedJohu.hasFallback = true;
      normalizedJohu.confidence = 'low';
      normalizedJohu.source = 'fallback-derived';
    }

    return normalizedJohu;
  }

  function _normalizeSibylInput(payload, analysisData) {
    var profile = (payload && payload.profile) || _getCurrentProfile() || null;
    var rawPillars = (payload && payload.pillars) || (analysisData && analysisData.pillars) || window.G_PILLARS || null;
    var pillars = _ensurePillarsWithProfileFallback(rawPillars, profile);

    var integrity = { ok: true, messages: [] };
    if (!pillars || !pillars.d || !pillars.d.g || !pillars.d.j) {
      integrity.ok = false;
      integrity.messages.push('?ъ＜ ?먭뎅 ?쇱＜ ?뺣낫媛 ?꾨씫?섏뿀?듬땲??');
    }
    if (!pillars || !pillars.y || !pillars.y.g || !pillars.y.j || !pillars.m || !pillars.m.g || !pillars.m.j) {
      integrity.ok = false;
      integrity.messages.push('?곗＜/?붿＜ ?곗씠?곌? 遺덉셿?꾪븯???쇰? ?댁꽍? 蹂댁닔?곸쑝濡?泥섎━?⑸땲??');
    }
    if (!pillars || !pillars.h || !pillars.h.g || !pillars.h.j) {
      integrity.messages.push('異쒖깮 ?쒓컖 ?곗씠?곌? 遺덉셿?꾪븯???쒖＜ 湲곕컲 ?뺣??꾧? ??븘議뚯뒿?덈떎.');
    }

    var dist = _ohaengDist(pillars);
    if (!dist.total) {
      integrity.ok = false;
      integrity.messages.push('?ㅽ뻾 遺꾪룷 怨꾩궛媛믪씠 鍮꾩뼱 ?덉뒿?덈떎.');
    }

    var counts = _analyzeTenStars(pillars || window.G_PILLARS || {});
    var dominantTenStar = _dominantTenStar(counts);
    var hasTenStarSignal = Object.keys(counts || {}).some(function(k) { return Number(counts[k] || 0) > 0; });
    if (!hasTenStarSignal) {
      integrity.messages.push('二쇰룄 ??꽦???뺤젙???곗씠?곌? 遺議깊빀?덈떎.');
    }

    var domEl = (payload && payload.dominantEl) || (analysisData && analysisData.domEl) || _dominantEl(dist);
    var dayMaster = String(pillars && pillars.d && pillars.d.g || '').trim();
    var rawJohu = (payload && payload.johu) || (analysisData && analysisData.johu) || window.G_JOHU || null;
    var johu = _normalizeJohu(rawJohu, { pillars: pillars, dist: dist, dominantEl: domEl });
    if (johu && johu.hasFallback) {
      integrity.messages.push('議고썑 ?곗씠?곌? ?쇰? 遺議깊븯??怨꾩젅/?ㅽ뻾 湲곕컲 異붿젙移섎? ?ъ슜?덉뒿?덈떎.');
    }
    var currentYear = _toInt((payload && payload.currentYear) || new Date().getFullYear(), new Date().getFullYear());
    var currentAge = _profileAge(profile);

    var daewunRaw = Array.isArray(window.G_DAEWUN) ? window.G_DAEWUN : [];
    var daewunList = daewunRaw.map(function(item) {
      var age = Number(item && item.age);
      var g = item && item.g;
      var j = item && item.j;
      if (!Number.isFinite(age) || !g || !j) return null;
      var ev = _evalDaewunBridge(g, j);
      return {
        age: age,
        g: g,
        j: j,
        score: ev.score,
        label: ev.label,
        summary: ev.evalSummary,
        hasChungBonus: ev.hasChungBonus,
        hasChungPenalty: ev.hasChungPenalty
      };
    }).filter(Boolean).sort(function(a, b) { return a.age - b.age; });

    if (!daewunList.length) {
      integrity.messages.push('???諛곗뿴(window.G_DAEWUN)??鍮꾩뼱 ?덉뼱 ?곕룞 媛뺣룄媛 ??뒿?덈떎.');
    }

    var rawSourceStatus = (payload && payload.sourceStatus) || (analysisData && analysisData.sourceStatus) || {};

    return {
      profile: profile,
      pillars: pillars,
      dayMaster: dayMaster,
      dist: dist,
      tenStarCounts: counts,
      dominantTenStar: dominantTenStar,
      dominantEl: domEl,
      currentYear: currentYear,
      currentAge: currentAge,
      power: window.G_POWER || null,
      jong: window.G_JONG || null,
      johu: johu,
      daewunList: daewunList,
      sourceStatus: {
        hasKasi: Boolean(rawSourceStatus && rawSourceStatus.hasKasi),
        hasSolarTerms: Boolean(rawSourceStatus && rawSourceStatus.hasSolarTerms),
        hasLunar: Boolean(rawSourceStatus && rawSourceStatus.hasLunar),
        fallbackUsed: Boolean((rawSourceStatus && rawSourceStatus.fallbackUsed) || (johu && johu.hasFallback))
      },
      integrity: integrity
    };
  }

  function normalizeSibylInput(rawInput) {
    var input = rawInput || {};
    var genderRaw = String(input.gender || '').trim().toLowerCase();
    var gender = 'unknown';
    if (genderRaw === 'm' || genderRaw === 'male' || genderRaw === 'man' || genderRaw === '?? || genderRaw === '?⑥꽦') gender = 'male';
    if (genderRaw === 'f' || genderRaw === 'female' || genderRaw === 'woman' || genderRaw === '?? || genderRaw === '?ъ꽦') gender = 'female';

    var birthDate = _safeText(input.birthDate, '?낅젰媛??뺤씤 ?꾩슂');
    var birthTime = _safeText(input.birthTime, '?쒓컙 誘몄긽');
    var calendarType = String(input.calendarType || 'solar').toLowerCase() === 'lunar' ? 'lunar' : 'solar';

    return {
      birthDate: birthDate,
      birthTime: birthTime,
      gender: gender,
      calendarType: calendarType
    };
  }

  function classifySibylMode(scores, context) {
    var riskScore = _safeScore(scores && scores.riskScore, SIBYL_DEFAULT_RISK_SCORE, 0, 100);
    var stabilityScore = _safeScore(scores && scores.stabilityScore, SIBYL_DEFAULT_STABILITY_SCORE, 0, 100);
    var dominantElement = _safeText(context && context.dominantElement, 'water');
    var primaryTenGod = _safeText(context && context.primaryTenGod, SIBYL_PRIMARY_TENGOD_FALLBACK);

    var mode = 'growth';
    if (riskScore < 30) mode = 'stability';
    else if (riskScore < 55) mode = 'growth';
    else if (riskScore < 75) mode = 'warning';
    else mode = stabilityScore >= 46 ? 'breakthrough' : 'dominator';

    var riskLevel = 'medium';
    if (riskScore < 30) riskLevel = 'low';
    else if (riskScore < 55) riskLevel = 'medium';
    else if (riskScore < 75) riskLevel = 'high';
    else riskLevel = 'critical';

    var modeTitleMap = {
      stability: '?덉젙 ?좎? 紐⑤뱶',
      growth: '?깆옣 媛??紐⑤뱶',
      warning: '由ъ뒪??寃쎄퀎 紐⑤뱶',
      breakthrough: '?뚰뙆 ?ы렪 紐⑤뱶',
      dominator: '?꾨??ㅼ씠??紐⑤뱶'
    };

    var subtitle = (EL_KR[dominantElement] || dominantElement) + ' 以묒떖 異?쨌 ' + primaryTenGod + ' ?⑦꽩';
    var coreMessage = '?듭떖 異뺤? ' + (EL_KR[dominantElement] || dominantElement) + '?대ŉ, ' + primaryTenGod + ' ?깊뼢???ㅽ뻾 猷⑦떞?쇰줈 ?곌껐?????먯닔 ?鍮??깃낵媛 ?덉젙?⑸땲??';
    var warningMessage = riskScore >= 65
      ? '怨좎쐞??援ш컙? 寃곗젙 吏??洹쒖튃怨??먯떎 李⑤떒 泥댄겕由ъ뒪?몃? 癒쇱? ?곸슜?섏꽭??'
      : '以묐┰~寃쎄퀎 援ш컙?먯꽌???뺤옣蹂대떎 寃利?猷⑦봽瑜?吏㏐쾶 ?좎??섏꽭??';
    var opportunityMessage = riskScore < 45
      ? '?덉젙 援ш컙?먯꽌 ?듭떖 怨쇱젣 1媛쒕? 吏묒쨷 ?ㅽ뻾?섎㈃ ?깆옣 ?⑥쑉???쎈땲??'
      : '??꾪뿕 ?붿쓣 ?좊퀎??怨듦꺽 ?ㅽ뻾, 怨좎쐞???붿? 諛⑹뼱 ?댁슜?쇰줈 遺꾨━?섏꽭??';

    return {
      mode: mode,
      riskLevel: riskLevel,
      title: modeTitleMap[mode] || '?깆옣 媛??紐⑤뱶',
      subtitle: subtitle,
      coreMessage: coreMessage,
      warningMessage: warningMessage,
      opportunityMessage: opportunityMessage
    };
  }

  function calculateSibylScores(normalized, riskBreakdown, aptData) {
    var riskScore = _safeScore(riskBreakdown && riskBreakdown.total, SIBYL_DEFAULT_RISK_SCORE, 0, 100);
    var aptitudeScore = _safeScore(aptData && aptData.score, SIBYL_DEFAULT_APTITUDE_SCORE, 0, 999);
    var components = (aptData && aptData.components) || {};
    var careerScore = _safeScore(components.career, SIBYL_DEFAULT_CAREER_SCORE, 0, 100);
    var wealthScore = _safeScore(components.wealth, SIBYL_DEFAULT_WEALTH_SCORE, 0, 100);
    var relationshipScore = _safeScore(components.social, SIBYL_DEFAULT_RELATIONSHIP_SCORE, 0, 100);
    var stabilityScore = _safeScore(100 - riskScore + Math.round((components.recovery || 50) * 0.2), SIBYL_DEFAULT_STABILITY_SCORE, 0, 100);

    return {
      riskScore: riskScore,
      aptitudeScore: aptitudeScore,
      stabilityScore: stabilityScore,
      relationshipScore: relationshipScore,
      wealthScore: wealthScore,
      careerScore: careerScore
    };
  }

  function buildSibylReportSeed(profile) {
    var p = profile || {};
    var classification = p.classification || {};
    var saju = p.saju || {};
    var scores = p.scores || {};
    var keyRisk = _safeScore(scores.riskScore, SIBYL_DEFAULT_RISK_SCORE, 0, 100);

    var keywords = [
      _safeText(classification.mode, 'growth'),
      _safeText(saju.dominantElement, 'water'),
      _safeText(saju.tenGods && saju.tenGods.primary, SIBYL_PRIMARY_TENGOD_FALLBACK)
    ];

    return {
      keywords: keywords,
      strengths: [
        '?듭떖 ?ㅽ뻾 異뺤씠 紐낇솗?섏뿬 ?섏궗寃곗젙 湲곗????몄슦湲??쎌뒿?덈떎.',
        '?곸꽦 怨꾩닔瑜??ㅼ쟾 猷⑦떞?쇰줈 ?꾪솚?섎㈃ ?깃낵 ?ы쁽?깆씠 ?믪븘吏묐땲??'
      ],
      weaknesses: [
        keyRisk >= 65 ? '由ъ뒪???좏샇媛 ?믪? ?ъ뿉??怨쇱냽 ?먮떒?쇰줈 ?먯떎???뺣??????덉뒿?덈떎.' : '以묐┰ 援ш컙?먯꽌 ?곗꽑?쒖쐞 遺꾩궛 ???깃낵 吏묒쨷?꾧? ??븘吏????덉뒿?덈떎.',
        '愿怨??묒뾽 洹쒖튃??紐⑦샇?섎㈃ ??꽦 媛뺤젏??媛덈벑?쇰줈 ?꾪솚?????덉뒿?덈떎.'
      ],
      cautionPeriods: [
        '由ъ뒪???곸쐞 ??,
        '異⑺삎?뚰빐 異⑸룎 ?좏샇媛 寃뱀튂??援ш컙'
      ],
      recommendedActions: [
        '30???⑥쐞濡??ㅽ뻾 KPI 1媛쒖? 諛⑹뼱 洹쒖튃 2媛쒕? 怨좎젙?섏꽭??',
        '怨좎쐞??援ш컙?먮뒗 寃곗젙 吏??24?쒓컙)怨?臾몄꽌 ?⑹쓽 ?덉감瑜??곸슜?섏꽭??',
        '?덉젙 援ш컙?먮뒗 ?듭떖 怨쇱젣瑜??⑥씪 ?몃옓?쇰줈 諛???깃낵瑜?怨좎젙?섏꽭??'
      ]
    };
  }

  function mapSajuToSibylProfile(normalized, scores, classification, yearlyFlow, monthlyPlan) {
    var norm = normalized || {};
    var profile = norm.profile || {};
    var birth = profile.birth || {};
    var pillars = _pillarChars(norm.pillars || window.G_PILLARS || {});
    var dist = norm.dist || { wood:0, fire:0, earth:0, metal:0, water:0, total:0 };
    var tenStarCounts = norm.tenStarCounts || {};

    var weakElement = EL_ORDER.slice().sort(function(a, b) {
      return Number(dist[a] || 0) - Number(dist[b] || 0);
    })[0] || _safeText(norm.dominantEl, 'water');

    var input = normalizeSibylInput({
      birthDate: [birth.year || '', birth.month || '', birth.day || ''].filter(Boolean).join('-') || '?낅젰媛??뺤씤 ?꾩슂',
      birthTime: (String(birth.hour || '').trim() !== '' ? String(birth.hour).padStart(2, '0') : '??') + ':' + (String(birth.minute || '').trim() !== '' ? String(birth.minute).padStart(2, '0') : '??'),
      gender: profile.gender || 'unknown',
      calendarType: profile.calendarType || 'solar'
    });

    var base = {
      input: input,
      saju: {
        yearPillar: _safePillarLabel(pillars.y),
        monthPillar: _safePillarLabel(pillars.m),
        dayPillar: _safePillarLabel(pillars.d),
        hourPillar: _safePillarLabel(pillars.h),
        dayMaster: _safeText(pillars.d && pillars.d.g, '誘몄긽'),
        dayMasterElement: _safeText(GAN_EL[pillars.d && pillars.d.g], _safeText(norm.dominantEl, 'water')),
        dominantElement: _safeText(norm.dominantEl, _dominantEl(dist)),
        weakElement: _safeText(weakElement, _safeText(norm.dominantEl, 'water')),
        tenGods: {
          primary: _safeText(norm.dominantTenStar, SIBYL_PRIMARY_TENGOD_FALLBACK),
          secondary: Object.keys(tenStarCounts).sort(function(a, b) {
            return Number(tenStarCounts[b] || 0) - Number(tenStarCounts[a] || 0);
          }).filter(function(key) { return key !== norm.dominantTenStar; })[0] || '',
          distribution: Object.assign({}, tenStarCounts)
        },
        fiveElements: {
          wood: _safeScore(dist.wood, 0, 0, 99),
          fire: _safeScore(dist.fire, 0, 0, 99),
          earth: _safeScore(dist.earth, 0, 0, 99),
          metal: _safeScore(dist.metal, 0, 0, 99),
          water: _safeScore(dist.water, 0, 0, 99)
        }
      },
      scores: Object.assign({}, scores),
      classification: Object.assign({}, classification),
      basicSections: {
        coreMatrix: '?쇨컙 ' + _safeText(pillars.d && pillars.d.g, '誘몄긽') + ', 吏諛??ㅽ뻾 ' + (_safeText(EL_KR[norm.dominantEl], _safeText(norm.dominantEl, 'water'))) + ', 二쇰룄 ??꽦 ' + _safeText(norm.dominantTenStar, SIBYL_PRIMARY_TENGOD_FALLBACK) + '??以묒떖異뺤쑝濡??꾩옱 ?댁꽭 援ъ“瑜??댁꽍?⑸땲??',
        riskPattern: '?꾪뿕 怨꾩닔???ㅽ뻾 ?몄쨷, ??꽦 怨쇰??? 異⑺삎?뚰빐, ??는룹꽭??異⑸룎, ??蹂?숈꽦??寃고빀???곗텧?덉뒿?덈떎.',
        aptitudePattern: '?곸꽦 怨꾩닔??career쨌wealth쨌execution쨌social쨌recovery 5異뺤쓣 ?⑹궛??0~999 ?ㅼ??쇱엯?덈떎.',
        relationshipPattern: '愿怨??⑦꽩? 二쇰룄 ??꽦???μ젏/洹몃┝?먮? 遺꾨━??媛덈벑 ?좊컻 議곌굔怨??뚮났 猷⑦떞???쒖떆?⑸땲??',
        wealthPattern: '?щЪ ?⑦꽩? ?섏씡 湲고쉶? ?먯떎 諛⑹뼱瑜?遺꾨━???붾퀎 ?댁슜 ?곗꽑?쒖쐞瑜??덈궡?⑸땲??',
        careerPattern: '吏곸뾽/吏꾨줈 ?⑦꽩? 吏諛??ㅽ뻾怨???꽦 議고빀??留욎텣 ?ㅽ뻾 李쎌쓣 ?쒖븞?⑸땲??',
        timingAdvice: '怨좎쐞??援ш컙? ?섎퉬, ??꾪뿕 援ш컙? ?ㅽ뻾 媛뺥솕?쇰뒗 ?댁쨷 由щ벉 ?꾨왂???좎??섏꽭??'
      },
      reportSeed: {},
      yearlyFlow: Array.isArray(yearlyFlow) ? yearlyFlow.slice(0, 10) : [],
      monthlyFlow: Array.isArray(monthlyPlan) ? monthlyPlan.slice(0, 12) : [],
      debug: {
        source: norm.integrity && norm.integrity.ok ? 'local-engine' : 'fallback',
        missingFields: [],
        warnings: (norm.integrity && Array.isArray(norm.integrity.messages)) ? norm.integrity.messages.slice(0, 10) : []
      }
    };

    base.reportSeed = buildSibylReportSeed(base);
    return base;
  }

  function sanitizeSibylProfile(profile) {
    var src = profile || {};
    var out = JSON.parse(JSON.stringify(src || {}));
    out.input = normalizeSibylInput(out.input || {});
    out.saju = out.saju || {};
    out.saju.tenGods = out.saju.tenGods || {};
    out.saju.fiveElements = out.saju.fiveElements || {};
    out.scores = out.scores || {};
    out.classification = out.classification || {};
    out.basicSections = out.basicSections || {};
    out.reportSeed = out.reportSeed || buildSibylReportSeed(out);
    out.debug = out.debug || { source: 'fallback', missingFields: [], warnings: [] };

    out.saju.dominantElement = _safeText(out.saju.dominantElement, _safeText(out.saju.dayMasterElement, 'water'));
    out.saju.weakElement = _safeText(out.saju.weakElement, out.saju.dominantElement);
    out.saju.tenGods.primary = _safeText(out.saju.tenGods.primary, SIBYL_PRIMARY_TENGOD_FALLBACK);
    out.saju.tenGods.secondary = _safeText(out.saju.tenGods.secondary, '');
    out.saju.tenGods.distribution = out.saju.tenGods.distribution && typeof out.saju.tenGods.distribution === 'object'
      ? out.saju.tenGods.distribution
      : {};

    out.scores.riskScore = _safeScore(out.scores.riskScore, SIBYL_DEFAULT_RISK_SCORE, 0, 100);
    out.scores.aptitudeScore = _safeScore(out.scores.aptitudeScore, SIBYL_DEFAULT_APTITUDE_SCORE, 0, 999);
    out.scores.stabilityScore = _safeScore(out.scores.stabilityScore, SIBYL_DEFAULT_STABILITY_SCORE, 0, 100);
    out.scores.relationshipScore = _safeScore(out.scores.relationshipScore, SIBYL_DEFAULT_RELATIONSHIP_SCORE, 0, 100);
    out.scores.wealthScore = _safeScore(out.scores.wealthScore, SIBYL_DEFAULT_WEALTH_SCORE, 0, 100);
    out.scores.careerScore = _safeScore(out.scores.careerScore, SIBYL_DEFAULT_CAREER_SCORE, 0, 100);

    out.classification.mode = _safeText(out.classification.mode, 'growth');
    out.classification.riskLevel = _safeText(out.classification.riskLevel, 'medium');
    out.classification.title = _safeText(out.classification.title, '?깆옣 媛??紐⑤뱶');
    out.classification.subtitle = _safeText(out.classification.subtitle, '?듭떖 異??뺣젹 以?);
    out.classification.coreMessage = _safeText(out.classification.coreMessage, '?듭떖 ?먯닔瑜??ㅽ뻾 猷⑦떞?쇰줈 ?곌껐?섎㈃ 蹂?숈꽦??以꾩뼱??땲??');
    out.classification.warningMessage = _safeText(out.classification.warningMessage, '怨좎쐞??援ш컙? 諛⑹뼱 洹쒖튃??癒쇱? ?곸슜?섏꽭??');
    out.classification.opportunityMessage = _safeText(out.classification.opportunityMessage, '??꾪뿕 援ш컙? ?듭떖 怨쇱젣瑜??꾩쭊 諛곗튂?섏꽭??');

    out.basicSections.coreMatrix = _safeText(out.basicSections.coreMatrix, SIBYL_CORE_MATRIX_FALLBACK);
    out.basicSections.riskPattern = _safeText(out.basicSections.riskPattern, '?꾪뿕 ?⑦꽩 ?곗씠?곕? ?먭? 以묒엯?덈떎. ?꾩옱 蹂댁닔??遺꾩꽍媛믪쑝濡??쒖떆?⑸땲??');
    out.basicSections.aptitudePattern = _safeText(out.basicSections.aptitudePattern, '?곸꽦 ?⑦꽩 ?곗씠?곕? ?먭? 以묒엯?덈떎.');
    out.basicSections.relationshipPattern = _safeText(out.basicSections.relationshipPattern, '愿怨??⑦꽩? 二쇰룄 ??꽦 湲곗??쇰줈 蹂댁젙?덉뒿?덈떎.');
    out.basicSections.wealthPattern = _safeText(out.basicSections.wealthPattern, '?щЪ ?⑦꽩? 諛⑹뼱 ?곗꽑 湲곗??쇰줈 蹂댁젙?덉뒿?덈떎.');
    out.basicSections.careerPattern = _safeText(out.basicSections.careerPattern, '吏꾨줈 ?⑦꽩? 吏諛??ㅽ뻾 湲곗??쇰줈 蹂댁젙?덉뒿?덈떎.');
    out.basicSections.timingAdvice = _safeText(out.basicSections.timingAdvice, '怨좎쐞???섎퉬 / ??꾪뿕 ?ㅽ뻾 ?댁쨷 由щ벉???좎??섏꽭??');

    if (!Array.isArray(out.reportSeed.keywords)) out.reportSeed.keywords = [];
    if (!Array.isArray(out.reportSeed.strengths)) out.reportSeed.strengths = [];
    if (!Array.isArray(out.reportSeed.weaknesses)) out.reportSeed.weaknesses = [];
    if (!Array.isArray(out.reportSeed.cautionPeriods)) out.reportSeed.cautionPeriods = [];
    if (!Array.isArray(out.reportSeed.recommendedActions)) out.reportSeed.recommendedActions = [];

    if (!Array.isArray(out.debug.missingFields)) out.debug.missingFields = [];
    if (!Array.isArray(out.debug.warnings)) out.debug.warnings = [];
    return out;
  }

  function validateSibylProfile(profile) {
    var p = profile || {};
    var missingFields = [];

    function ensure(condition, key) {
      if (!condition) missingFields.push(key);
    }

    ensure(_safeText(p.input && p.input.birthDate, '') !== '', 'input.birthDate');
    ensure(_safeText(p.input && p.input.gender, '') !== '', 'input.gender');
    ensure(_safeText(p.saju && p.saju.dominantElement, '') !== '', 'saju.dominantElement');
    ensure(_safeText(p.saju && p.saju.tenGods && p.saju.tenGods.primary, '') !== '', 'saju.tenGods.primary');
    ensure(Number.isFinite(Number(p.scores && p.scores.riskScore)), 'scores.riskScore');
    ensure(Number.isFinite(Number(p.scores && p.scores.aptitudeScore)), 'scores.aptitudeScore');
    ensure(_safeText(p.classification && p.classification.mode, '') !== '', 'classification.mode');
    ensure(_safeText(p.classification && p.classification.title, '') !== '', 'classification.title');
    ensure(_safeText(p.basicSections && p.basicSections.coreMatrix, '') !== '', 'basicSections.coreMatrix');

    return {
      ok: missingFields.length === 0,
      missingFields: missingFields,
      warnings: missingFields.map(function(key) { return key + ' ?꾨씫'; })
    };
  }

  function buildNormalizedSibylProfile(normalized, riskBreakdown, aptData, annualPlan, monthlyPlan) {
    var scores = calculateSibylScores(normalized, riskBreakdown, aptData);
    var classification = classifySibylMode(scores, {
      dominantElement: normalized && normalized.dominantEl,
      primaryTenGod: normalized && normalized.dominantTenStar
    });

    var yearlyFlow = Array.isArray(annualPlan) ? annualPlan.slice(0, 10).map(function(item, index) {
      var rs = _safeScore(item && item.risk, 42 + index * 2, 0, 100);
      return {
        year: Number(item && item.year || (new Date().getFullYear() + index)),
        pillar: _safeText(item && item.ganZhi, '誘몄긽'),
        riskScore: rs,
        opportunityScore: _safeScore(100 - rs, 50, 0, 100),
        warning: _safeText(item && item.summary, classification.warningMessage),
        advice: _safeText(item && item.playbook, classification.opportunityMessage)
      };
    }) : [];

    var mapped = mapSajuToSibylProfile(normalized, scores, classification, yearlyFlow, monthlyPlan);
    var sanitized = sanitizeSibylProfile(mapped);
    var validation = validateSibylProfile(sanitized);
    sanitized.debug.missingFields = validation.missingFields.slice();
    sanitized.debug.warnings = sanitized.debug.warnings.concat(validation.warnings);

    _sibylDevDebug('[SIBYL] input', sanitized.input);
    _sibylDevDebug('[SIBYL] normalizedProfile', sanitized);
    if (validation.missingFields.length) {
      _sibylDevWarn('[SIBYL] missingFields', validation.missingFields);
    }

    return sanitized;
  }

  function _safePillarLabel(pair) {
    if (!pair || typeof pair !== 'object') return '誘몄긽';
    var g = String(pair.g || '').trim();
    var j = String(pair.j || '').trim();
    if (g && j) return g + j;
    return '誘몄긽';
  }

  function _buildSibylCanonicalData(normalized, riskBreakdown, aptData, annualPlan, monthlyPlan) {
    var profile = buildNormalizedSibylProfile(normalized, riskBreakdown, aptData, annualPlan, monthlyPlan);
    var riskParts = riskBreakdown && riskBreakdown.parts ? riskBreakdown.parts : {};
    var aptitudeComponents = aptData && aptData.components ? aptData.components : {};
    var supporting = Object.keys(profile.saju.tenGods.distribution || {}).filter(function(key) {
      return key !== profile.saju.tenGods.primary && Number(profile.saju.tenGods.distribution[key] || 0) >= 2;
    }).slice(0, 3);
    var lacking = Object.keys(TENSTAR_SECTOR).filter(function(key) {
      return Number(profile.saju.tenGods.distribution[key] || 0) <= 0;
    }).slice(0, 3);

    return {
      input: profile.input,
      saju: {
        yearPillar: profile.saju.yearPillar,
        monthPillar: profile.saju.monthPillar,
        dayPillar: profile.saju.dayPillar,
        hourPillar: profile.saju.hourPillar,
        dayMaster: profile.saju.dayMaster,
        dayMasterElement: profile.saju.dayMasterElement,
        dominantElement: profile.saju.dominantElement,
        weakElement: profile.saju.weakElement,
        favorableElements: ((normalized && normalized.power && Array.isArray(normalized.power.yongshin)) ? normalized.power.yongshin : []).slice(0, 3),
        unfavorableElements: ((normalized && normalized.power && Array.isArray(normalized.power.kijishin)) ? normalized.power.kijishin : []).slice(0, 3),
        tenGods: profile.saju.tenGods,
        tenGodSummary: {
          dominantTenGod: profile.saju.tenGods.primary,
          supportingTenGods: supporting,
          lackingTenGods: lacking
        },
        fiveElements: profile.saju.fiveElements
      },
      scores: profile.scores,
      classification: profile.classification,
      basicSections: profile.basicSections,
      reportSeed: profile.reportSeed,
      sibyl: {
        mode: profile.classification.mode,
        modeTitle: profile.classification.title,
        modeDescription: profile.classification.subtitle,
        riskScore: profile.scores.riskScore,
        aptitudeScore: profile.scores.aptitudeScore,
        dominantTenGod: profile.saju.tenGods.primary,
        dominantElement: profile.saju.dominantElement,
        warningKeywords: Object.keys(riskParts).sort(function(a, b) { return Number(riskParts[b] || 0) - Number(riskParts[a] || 0); }).slice(0, 3),
        strengthKeywords: Object.keys(aptitudeComponents).sort(function(a, b) { return Number(aptitudeComponents[b] || 0) - Number(aptitudeComponents[a] || 0); }).slice(0, 3),
        coreMessage: profile.classification.coreMessage,
        lifeStrategy: profile.basicSections.timingAdvice
      },
      yearlyFlow: Array.isArray(profile.yearlyFlow) ? profile.yearlyFlow.slice(0, 10) : [],
      monthlyFlow: Array.isArray(profile.monthlyFlow) ? profile.monthlyFlow.slice(0, 12) : [],
      debug: profile.debug,
      normalizedProfile: profile
    };
  }

  function _buildCanonicalFallbackChapter(chapterMeta, canonicalData, index) {
    var sibyl = canonicalData && canonicalData.sibyl ? canonicalData.sibyl : {};
    var saju = canonicalData && canonicalData.saju ? canonicalData.saju : {};
    var yearly = canonicalData && Array.isArray(canonicalData.yearlyFlow) ? canonicalData.yearlyFlow : [];
    var yearPreview = yearly.slice(0, 3).map(function(item) {
      return String(item.year) + '???꾪뿕 ' + item.riskScore + ' / 湲고쉶 ' + item.opportunityScore;
    }).join(' 쨌 ');

    var text = [
      chapterMeta.title,
      chapterMeta.focus,
      '?쇨컙 ' + (saju.dayMaster || '誘몄긽') + ', 吏諛??ㅽ뻾 ' + (sibyl.dominantElement || '誘몄긽') + ', 二쇰룄 ??꽦 ' + (sibyl.dominantTenGod || '誘몄긽') + '??以묒떖?쇰줈 遺꾩꽍?⑸땲??',
      '?꾪뿕 怨꾩닔 ' + _clamp(Number(sibyl.riskScore || 35), 5, 99) + ' / ?곸꽦 怨꾩닔 ' + _clamp(Number(sibyl.aptitudeScore || 420), 100, 999) + ' 湲곗??쇰줈 議곌굔-?됰룞-寃곌낵 ?꾨젅?꾩쓣 ?곸슜?⑸땲??',
      '?곌컙 ?먮쫫 ?붿빟: ' + (yearPreview || '?곌컙 ?먮쫫 ?곗씠???먭? ?꾩슂') + '.',
      '?ㅽ뻾 洹쒖튃: 怨좎쐞?섏뿉?쒕뒗 ?먯떎 李⑤떒, ??꾪뿕?먯꽌??吏묒쨷 ?ㅽ뻾, 以묐┰ 援ш컙?먯꽌??寃利?猷⑦봽瑜?吏㏐쾶 ?좎??섏꽭??',
      '?ㅽ뙣 諛⑹? 泥댄겕由ъ뒪?? 1) ?섏궗寃곗젙 ?꾩젣 湲곕줉 2) 7???먭? 3) 30??蹂댁젙 4) 90??由щ갭?곗떛.'
    ].join('\n\n');

    var guard = 0;
    while (text.length < SIBYL_MIN_PREMIUM_CHAPTER_CHARS && guard < 4) {
      text += '\n\n' + '異붽? ?댁꽕 ' + (guard + 1) + ': ?먯닔 ?댁꽍蹂대떎 ?ㅽ뻾 ?쒖꽌瑜?癒쇱? 怨좎젙?섍퀬, 吏?쒕? 留ㅼ＜ 媛깆떊?섏꽭?? ?숈씪???ъ＜ 援ъ“?먯꽌???ㅽ뻾 猷⑦떞???щ씪吏硫??꾪뿕 泥닿컧???ш쾶 ?щ씪吏묐땲??';
      guard += 1;
    }

    return text;
  }

  function _chapterMapFromReport(reportData) {
    var map = Object.create(null);
    if (reportData && reportData.chapterMap && typeof reportData.chapterMap === 'object') {
      SIBYL_PREMIUM_CHAPTER_KEYS.forEach(function(key) {
        map[key] = String(reportData.chapterMap[key] || '').trim();
      });
      return map;
    }
    if (reportData && Array.isArray(reportData.chapters)) {
      SIBYL_PREMIUM_CHAPTER_META.forEach(function(meta, idx) {
        var ch = reportData.chapters[idx] || {};
        map[meta.key] = String(ch.content || ch.text || '').trim();
      });
    }
    return map;
  }

  function _validateSibylPremiumChapterMap(chapterMap) {
    for (var i = 0; i < SIBYL_PREMIUM_CHAPTER_KEYS.length; i += 1) {
      var key = SIBYL_PREMIUM_CHAPTER_KEYS[i];
      var content = String(chapterMap && chapterMap[key] || '').trim();
      if (content.length < SIBYL_MIN_PREMIUM_CHAPTER_CHARS) {
        return { ok: false, key: key };
      }
    }
    return { ok: true };
  }

  function _dedupeSibylWordsInLine(line) {
    var tokens = String(line || '').split(/\s+/).filter(Boolean);
    if (!tokens.length) return '';
    var out = [];
    var prev = '';
    for (var i = 0; i < tokens.length; i += 1) {
      var token = tokens[i];
      var norm = token.toLowerCase();
      if (norm === prev) continue;
      out.push(token);
      prev = norm;
    }
    return out.join(' ');
  }

  function _sanitizeSibylChapterContent(content) {
    var lines = String(content || '').replace(/\r/g, '').split('\n');
    var seen = Object.create(null);
    var out = [];
    for (var i = 0; i < lines.length; i += 1) {
      var raw = lines[i];
      var dedupedLine = _dedupeSibylWordsInLine(raw);
      var trim = dedupedLine.trim();
      if (!trim) {
        if (out.length && out[out.length - 1] !== '') out.push('');
        continue;
      }
      var blocked = SIBYL_FORBIDDEN_REPORT_PATTERNS.some(function(rx) { return rx.test(trim); });
      if (blocked) continue;
      var key = trim.toLowerCase();
      if (seen[key]) continue;
      seen[key] = true;
      out.push(dedupedLine);
    }
    while (out.length && out[out.length - 1] === '') out.pop();
    return out.join('\n');
  }

  function _countSibylPlaceholdersInText(text) {
    var source = String(text || '');
    var count = 0;
    SIBYL_FORBIDDEN_REPORT_PATTERNS.forEach(function(rx) {
      var m = source.match(new RegExp(rx.source, 'gi'));
      if (m && m.length) count += m.length;
    });
    return count;
  }

  function dedupeSibylReportText(report) {
    if (!report || !Array.isArray(report.chapters)) return report;
    var seen = Object.create(null);
    var duplicateCount = 0;
    report.chapters = report.chapters.map(function(ch) {
      var lines = String(ch && ch.content || '').replace(/\r/g, '').split('\n');
      var kept = [];
      for (var i = 0; i < lines.length; i += 1) {
        var line = String(lines[i] || '').trim();
        if (!line) {
          if (kept.length && kept[kept.length - 1] !== '') kept.push('');
          continue;
        }
        var normalized = line.toLowerCase();
        if (seen[normalized]) {
          duplicateCount += 1;
          continue;
        }
        seen[normalized] = true;
        kept.push(line);
      }
      var cleanContent = _sanitizeSibylChapterContent(kept.join('\n'));
      return Object.assign({}, ch, { content: cleanContent });
    });
    report.__duplicateSentenceCount = duplicateCount;
    return report;
  }

  function assertNoPlaceholderText(report) {
    if (!report || !Array.isArray(report.chapters)) return { ok: true, placeholderCount: 0 };
    var total = report.chapters.reduce(function(sum, ch) {
      return sum + _countSibylPlaceholdersInText(ch && ch.content || '');
    }, 0);
    return { ok: total === 0, placeholderCount: total };
  }

  function assertChapterCategoryMatch(report) {
    if (!report || !Array.isArray(report.chapters)) return { ok: false, warnings: ['chapters missing'] };
    var warnings = [];
    report.chapters.forEach(function(ch) {
      var key = String(ch && ch.key || '').trim();
      var hints = SIBYL_CHAPTER_CATEGORY_HINTS[key] || [];
      if (!hints.length) return;
      var body = String(ch && ch.content || '');
      var hit = hints.reduce(function(sum, token) {
        return sum + (body.indexOf(token) >= 0 ? 1 : 0);
      }, 0);
      if (hit < 2) warnings.push(key + ':category-match-low');
    });
    return { ok: warnings.length === 0, warnings: warnings };
  }

  function validateSibylReportSections(report) {
    if (!report || !Array.isArray(report.chapters)) {
      return { ok: false, reason: 'chapters-missing' };
    }
    if (report.chapters.length !== 10) {
      return { ok: false, reason: 'chapter-count', count: report.chapters.length };
    }
    for (var i = 0; i < report.chapters.length; i += 1) {
      var ch = report.chapters[i] || {};
      var body = String(ch.content || '');
      var sectionCount = (body.match(/(^##\s+|^-\s+)/gm) || []).length;
      if (sectionCount < 5) {
        return { ok: false, reason: 'category-count', key: ch.key, count: sectionCount };
      }
      if (_countSibylPlaceholdersInText(body) > 0) {
        return { ok: false, reason: 'placeholder', key: ch.key };
      }
    }
    return { ok: true };
  }

  function _ensureSibylPremiumTotalChars(chapters, minTotalChars, canonicalData) {
    var list = Array.isArray(chapters) ? chapters : [];
    var minChars = _toInt(minTotalChars, SIBYL_MIN_PREMIUM_TOTAL_CHARS);
    if (minChars < SIBYL_MIN_PREMIUM_TOTAL_CHARS) minChars = SIBYL_MIN_PREMIUM_TOTAL_CHARS;
    var total = list.reduce(function(sum, chapter) { return sum + String(chapter && chapter.content || '').length; }, 0);
    if (!list.length || total >= minChars) return { chapters: list, totalChars: total };

    // ?덉쭏 蹂댁〈 ?곗꽑: ?꾩쓽 filler濡?湲몄씠瑜?媛뺤젣濡?梨꾩슦吏 ?딅뒗??
    return { chapters: list, totalChars: total };
  }

  function _shapeSibylPremiumReport(reportData, canonicalData) {
    var source = reportData && typeof reportData === 'object' ? Object.assign({}, reportData) : {};
    var map = _chapterMapFromReport(source);

    SIBYL_PREMIUM_CHAPTER_META.forEach(function(meta, idx) {
      var current = String(map[meta.key] || '').trim();
      if (current.length < SIBYL_MIN_PREMIUM_CHAPTER_CHARS) {
        var fallbackText = _buildCanonicalFallbackChapter(meta, canonicalData, idx);
        map[meta.key] = current ? (current + '\n\n' + fallbackText) : fallbackText;
      }
      if (String(map[meta.key] || '').trim().length < SIBYL_MIN_PREMIUM_CHAPTER_CHARS) {
        map[meta.key] = _buildCanonicalFallbackChapter(meta, canonicalData, idx + 20);
      }
    });

    var chapters = SIBYL_PREMIUM_CHAPTER_META.map(function(meta) {
      return {
        key: meta.key,
        title: meta.title,
        content: _sanitizeSibylChapterContent(String(map[meta.key] || '').trim())
      };
    });

    var shapedTotals = _ensureSibylPremiumTotalChars(chapters, Number(source.minTotalChars || 0), canonicalData);
    chapters = shapedTotals.chapters;
    chapters.forEach(function(chapter) {
      map[chapter.key] = String(chapter.content || '').trim();
    });

    var shaped = { chapters: chapters };
    dedupeSibylReportText(shaped);
    chapters = shaped.chapters;
    chapters.forEach(function(chapter) {
      map[chapter.key] = String(chapter.content || '').trim();
    });

    source.chapterMap = map;
    source.chapters = chapters;
    source.categoryCount = chapters.length;
    source.categories = SIBYL_PREMIUM_CHAPTER_META.map(function(item) { return item.title; });
    source.totalChars = shapedTotals.totalChars;
    source.minTotalChars = Math.max(_toInt(source.minTotalChars, 0), SIBYL_MIN_PREMIUM_TOTAL_CHARS);
    source.canonicalData = canonicalData || source.canonicalData || null;

    var placeholderState = assertNoPlaceholderText(source);
    var chapterMatchState = assertChapterCategoryMatch(source);
    var sectionState = validateSibylReportSections(source);
    source.__placeholderCount = placeholderState.placeholderCount;
    source.__chapterMatchWarnings = chapterMatchState.warnings || [];
    source.__sectionValidation = sectionState;

    return source;
  }

  function _riskElementImbalance(dist) {
    if (!dist || !dist.total) return 55;
    var ideal = dist.total / 5;
    var absSum = EL_ORDER.reduce(function(sum, el) {
      return sum + Math.abs((dist[el] || 0) - ideal);
    }, 0);
    var voidCount = EL_ORDER.filter(function(el) { return (dist[el] || 0) === 0; }).length;
    var maxEl = _dominantEl(dist);
    var concentration = (dist[maxEl] || 0) / dist.total;
    var score = (absSum / (ideal * 5)) * 58 + (voidCount * 14) + (concentration >= 0.55 ? 10 : 0);
    return _clamp(Math.round(score), 0, 100);
  }

  function _riskTenStarOverload(counts) {
    var keys = Object.keys(counts || {});
    if (!keys.length) return 48;
    var values = keys.map(function(k) { return Number(counts[k] || 0); });
    var maxV = Math.max.apply(null, values);
    var minV = Math.min.apply(null, values);
    var spread = maxV - minV;
    var skew = _stddev(values);
    var overloadStars = values.filter(function(v) { return v >= 3; }).length;
    var score = spread * 13 + skew * 16 + overloadStars * 10;
    return _clamp(Math.round(score), 0, 100);
  }

  function _riskCollision(conflict) {
    if (!conflict) return 40;
    var score = (conflict.chungCount || 0) * 20
      + (conflict.hyungCount || 0) * 14
      + (conflict.paCount || 0) * 10
      + (conflict.haeCount || 0) * 8;
    return _clamp(Math.round(score), 0, 100);
  }

  function _riskDaewunSeunConflict(annualPlan) {
    if (!Array.isArray(annualPlan) || !annualPlan.length) return 52;
    var risks = annualPlan.map(function(y) { return Number(y.risk || 0); });
    var avg = _mean(risks);
    var peak = Math.max.apply(null, risks);
    var trough = Math.min.apply(null, risks);
    var swing = peak - trough;
    var shockYears = annualPlan.filter(function(y) { return Number(y.shock || 0) >= 1; }).length;
    var score = avg * 0.55 + swing * 0.35 + shockYears * 6;
    return _clamp(Math.round(score), 0, 100);
  }

  function _riskMonthlyVolatility(monthlyPlan) {
    if (!Array.isArray(monthlyPlan) || !monthlyPlan.length) return 50;
    var risks = monthlyPlan.map(function(m) { return Number(m.risk || 0); });
    var sigma = _stddev(risks);
    var swing = Math.max.apply(null, risks) - Math.min.apply(null, risks);
    var highCount = monthlyPlan.filter(function(m) { return Number(m.risk || 0) >= 70; }).length;
    var score = sigma * 3.2 + swing * 0.55 + highCount * 4.5;
    return _clamp(Math.round(score), 0, 100);
  }

  function _riskJohuStress(johu, monthlyPlan) {
    var base = 35;
    if (johu && (johu.type === 'hot' || johu.type === 'cold')) base += 22;
    if (johu && (johu.moistType === 'dry' || johu.moistType === 'wet')) base += 12;
    if (Array.isArray(monthlyPlan) && monthlyPlan.length) {
      var lowBattery = monthlyPlan.filter(function(m) { return Number(m.battery || 0) < 45; }).length;
      base += lowBattery * 3;
    }
    return _clamp(Math.round(base), 0, 100);
  }

  function _calcRiskBreakdown(normalized, monthlyPlan, annualPlan, conflictSignals) {
    var partElement = _riskElementImbalance(normalized && normalized.dist);
    var partTenStar = _riskTenStarOverload(normalized && normalized.tenStarCounts);
    var partCollision = _riskCollision(conflictSignals || (normalized && normalized.collisionSignals));
    var partDaewun = _riskDaewunSeunConflict(annualPlan || (normalized && normalized.annualPlan));
    var partMonthly = _riskMonthlyVolatility(monthlyPlan || (normalized && normalized.monthlyPlan));
    var partJohu = _riskJohuStress(normalized && normalized.johu, monthlyPlan || (normalized && normalized.monthlyPlan));

    var total = Math.round(
      partElement * 0.22
      + partTenStar * 0.16
      + partCollision * 0.18
      + partDaewun * 0.20
      + partMonthly * 0.14
      + partJohu * 0.10
    );

    var label = total >= 75 ? '怨좎쐞?? : total >= 55 ? '寃쎄퀎' : total >= 35 ? '以묐┰' : '?덉젙';
    return {
      total: _clamp(total, 5, 99),
      label: label,
      parts: {
        elementImbalance: partElement,
        tenStarOverload: partTenStar,
        collision: partCollision,
        daewunSeunConflict: partDaewun,
        monthlyVolatility: partMonthly,
        johuStress: partJohu
      }
    };
  }

  function _calcAptitudeComponents(normalized, riskBreakdown) {
    var counts = (normalized && normalized.tenStarCounts) || {};
    var dist = (normalized && normalized.dist) || { wood:0, fire:0, earth:0, metal:0, water:0, total:1 };
    var total = Math.max(1, Number(dist.total || 1));
    var power = normalized && normalized.power;
    var jong = normalized && normalized.jong;
    var johu = (normalized && normalized.johu) || _createFallbackJohu(normalized || null);
    var riskParts = (riskBreakdown && riskBreakdown.parts) || {};

    var career = 35
      + (counts['?뺢?'] || 0) * 8
      + (counts['?멸?'] || 0) * 7
      + (counts['?앹떊'] || 0) * 5
      + (power && power.isStrong ? 5 : 0)
      - Math.round((riskParts.collision || 0) * 0.08);

    var wealth = 32
      + (counts['?몄옱'] || 0) * 10
      + (counts['?뺤옱'] || 0) * 9
      + (counts['?앹떊'] || 0) * 4
      - (counts['寃곸옱'] || 0) * 5
      - Math.round((riskParts.monthlyVolatility || 0) * 0.06);

    var execution = 34
      + (counts['鍮꾧껄'] || 0) * 6
      + (counts['?뺢?'] || 0) * 5
      + (counts['?곴?'] || 0) * 4
      + (power && power.isStrong ? 6 : -2)
      - Math.round((riskParts.tenStarOverload || 0) * 0.08);

    var social = 33
      + (counts['?뺤씤'] || 0) * 5
      + (counts['?앹떊'] || 0) * 5
      + (counts['?뺤옱'] || 0) * 3
      - (counts['?멸?'] || 0) * 2
      - Math.round((riskParts.collision || 0) * 0.07);

    var recovery = 30
      + (counts['?뺤씤'] || 0) * 8
      + (counts['?몄씤'] || 0) * 6
      + (johu && (johu.type === 'neutral' || johu.type === 'cool' || johu.type === 'warm') ? 6 : 0)
      + (jong && jong.isJong ? 4 : 0)
      - Math.round((riskParts.johuStress || 0) * 0.09);

    var components = {
      career: _clamp(Math.round(career), 5, 99),
      wealth: _clamp(Math.round(wealth), 5, 99),
      execution: _clamp(Math.round(execution), 5, 99),
      social: _clamp(Math.round(social), 5, 99),
      recovery: _clamp(Math.round(recovery), 5, 99)
    };

    var weighted = components.career * 0.26
      + components.wealth * 0.22
      + components.execution * 0.21
      + components.social * 0.16
      + components.recovery * 0.15;

    var harmony = 100 - _stddev([
      components.career,
      components.wealth,
      components.execution,
      components.social,
      components.recovery
    ]);

    var score = Math.round(120 + weighted * 8.4 + harmony * 1.6);
    return {
      score: _clamp(score, 100, 999),
      components: components
    };
  }

  function _toRiskBand(score) {
    var n = Number(score || 0);
    if (n >= 75) return '怨좎쐞??;
    if (n >= 55) return '寃쎄퀎';
    if (n >= 35) return '以묐┰';
    return '?덉젙';
  }

  function _collectQuantumDiagnostics(normalized) {
    var pillars = normalized && normalized.pillars;
    var jg = normalized && normalized.jong;
    var pw = normalized && normalized.power;
    var jh = normalized && normalized.johu;
    var quantumFn = (typeof window.getQuantumElType === 'function')
      ? window.getQuantumElType
      : (typeof getQuantumElType === 'function' ? getQuantumElType : null);
    var dist = normalized && normalized.dist ? normalized.dist : null;
    var ranked = EL_ORDER.map(function(el) {
      return { el: el, value: Number(dist && dist[el] || 0) };
    }).sort(function(a, b) { return a.value - b.value; });
    var fallbackGoodEls = ranked.slice(0, 2).map(function(item) { return item.el; });
    var fallbackBadEls = ranked.slice(-2).map(function(item) { return item.el; });

    var roles = EL_ORDER.map(function(el) {
      var raw = 'neutral';
      if (quantumFn && pillars) {
        try {
          raw = quantumFn(el, pillars, jg, pw, jh) || 'neutral';
        } catch (_) {
          raw = 'neutral';
        }
      }
      if (raw === 'neutral' && dist && Number(dist.total || 0) > 0) {
        if (fallbackGoodEls.indexOf(el) >= 0) raw = 'good';
        else if (fallbackBadEls.indexOf(el) >= 0) raw = 'bad';
      }
      var roleLabel = raw === 'good' ? '?좊━' : raw === 'bad' ? '二쇱쓽' : '以묐┰';
      return {
        el: el,
        label: EL_KR[el] || el,
        role: raw,
        roleLabel: roleLabel
      };
    });

    var favorable = roles.filter(function(item) { return item.role === 'good'; }).map(function(item) { return item.label; });
    var caution = roles.filter(function(item) { return item.role === 'bad'; }).map(function(item) { return item.label; });
    var yongshin = (pw && Array.isArray(pw.yongshin) && pw.yongshin.length)
      ? pw.yongshin.slice()
      : favorable.slice();
    var kishin = (pw && Array.isArray(pw.kijishin) && pw.kijishin.length)
      ? pw.kijishin.slice()
      : caution.slice();

    return {
      mode: jg && jg.isJong ? (jg.name || '醫낃꺽') : '?듬?+議고썑',
      johuType: (jh && jh.type) || 'neutral',
      yongshin: yongshin,
      kishin: kishin,
      roles: roles,
      favorableElements: favorable,
      cautionElements: caution
    };
  }

  function _buildCategoryMatrix(riskBreakdown, aptData, quantumDiagnostics, annualPlan, monthlyPlan) {
    var parts = (riskBreakdown && riskBreakdown.parts) || {};
    var apt = (aptData && aptData.components) || {};
    var annual = Array.isArray(annualPlan) ? annualPlan : [];
    var monthly = Array.isArray(monthlyPlan) ? monthlyPlan : [];

    var annualPeak = annual.length ? Math.max.apply(null, annual.map(function(item) { return Number(item.risk || 0); })) : 50;
    var annualLow = annual.length ? Math.min.apply(null, annual.map(function(item) { return Number(item.risk || 0); })) : 50;
    var monthlyPeak = monthly.length ? Math.max.apply(null, monthly.map(function(item) { return Number(item.risk || 0); })) : 50;
    var quantumGood = quantumDiagnostics && Array.isArray(quantumDiagnostics.roles)
      ? quantumDiagnostics.roles.filter(function(item) { return item.role === 'good'; }).length
      : 0;
    var quantumBad = quantumDiagnostics && Array.isArray(quantumDiagnostics.roles)
      ? quantumDiagnostics.roles.filter(function(item) { return item.role === 'bad'; }).length
      : 0;
    var quantumScore = _clamp(55 + (quantumGood * 12) - (quantumBad * 14), 5, 99);

    return [
      {
        key: 'core',
        title: '肄붿뼱 ?덉젙??,
        score: _clamp(100 - ((parts.elementImbalance || 50) * 0.45 + (parts.tenStarOverload || 50) * 0.55), 5, 99),
        summary: '?ㅽ뻾 ?몄감? ??꽦 怨쇰??섎? ?⑹퀜 湲곕낯 泥댁쭏???붾뱾由?媛뺣룄瑜??곗텧?⑸땲??',
        action: '怨좎쐞???붿뿉???섏궗寃곗젙 吏??洹쒖튃??媛뺤젣?섍퀬, ?덉젙 ?붿뿉 ?깆옣 怨쇱젣瑜?諛곗튂?섏꽭??'
      },
      {
        key: 'career',
        title: '而ㅻ━???ㅽ뻾??,
        score: _clamp((apt.career || 0) * 0.6 + (apt.execution || 0) * 0.4, 5, 99),
        summary: '而ㅻ━???ㅽ뻾 異뺤쓣 寃고빀???ㅼ젣 ?깃낵 ?꾪솚 媛?μ꽦??遊낅땲??',
        action: '?곌컙 ?쇳겕 由ъ뒪??' + annualPeak + ') ?꾪썑?먮뒗 ?뺤옣蹂대떎 寃利?以묒떖?쇰줈 ?댁슜?섏꽭??'
      },
      {
        key: 'money',
        title: '?ъ젙 ?댁슜??,
        score: _clamp((apt.wealth || 0) - (parts.monthlyVolatility || 0) * 0.22, 5, 99),
        summary: '?щЪ ?ъ갑?μ뿉????蹂?숈꽦??李④컧???ㅼ닔??吏?띿꽦??怨꾩궛?⑸땲??',
        action: '?붽컙 理쒓퀬 由ъ뒪??' + monthlyPeak + ') 援ш컙? 諛⑹뼱, ???援ш컙? ?뺤옣?쇰줈 遺꾨━?섏꽭??'
      },
      {
        key: 'relationship',
        title: '愿怨??묒뾽',
        score: _clamp((apt.social || 0) - (parts.collision || 0) * 0.25, 5, 99),
        summary: '?ы쉶???먯닔?먯꽌 異⑺삎?뚰빐 異⑸룎 媛뺣룄瑜?蹂댁젙???묒뾽 ?좊ː 吏?쒖엯?덈떎.',
        action: '媛덈벑 怨좎“ 援ш컙?먮뒗 臾몄옄 湲곕줉 湲곕컲 ?⑹쓽濡??ㅽ빐 鍮꾩슜??以꾩씠?몄슂.'
      },
      {
        key: 'recovery',
        title: '?뚮났 ?꾩꽦',
        score: _clamp((apt.recovery || 0) - (parts.johuStress || 0) * 0.22, 5, 99),
        summary: '?뚮났?κ낵 議고썑 ?ㅽ듃?덉뒪瑜??⑹퀜 踰덉븘???꾪뿕??怨꾨웾?뷀빀?덈떎.',
        action: '?곌컙 ???' + annualLow + ') ?쒓린 ?꾩뿉 ?뚮났 猷⑦떞???좊같移섑븯?몄슂.'
      },
      {
        key: 'quantum',
        title: '?? 紐낅━ ?뺥빀',
        score: quantumScore,
        summary: '議고썑/醫낃꺽/?듬?瑜??듯빀???ㅽ뻾 ?좊텋由щ? 5?먯냼 ?⑥쐞濡??뺤텞??吏?쒖엯?덈떎.',
        action: '?좊━ ?ㅽ뻾(' + ((quantumDiagnostics && quantumDiagnostics.favorableElements || []).join(', ') || '?놁쓬') + ') 以묒떖?쇰줈 ?섍꼍怨??쇱젙 由щ벉??留욎텛?몄슂.'
      }
    ].map(function(item) {
      return Object.assign({}, item, { band: _toRiskBand(100 - item.score) });
    });
  }

  /* ?곸꽦 怨꾩닔 (100~999 ?ㅼ??? */
  function _aptCoeff(dominant, counts, normalized, riskBreakdown) {
    var norm = normalized || {
      tenStarCounts: counts || {},
      dist: _ohaengDist((normalized && normalized.pillars) || window.G_PILLARS || null),
      power: window.G_POWER || null,
      jong: window.G_JONG || null,
      johu: window.G_JOHU || null
    };
    var apt = _calcAptitudeComponents(norm, riskBreakdown || null);
    return apt.score;
  }

  /* ?ㅽ뻾 遺꾪룷 (G_NATAL or 吏곸젒 怨꾩궛) */
  function _ohaengDist(p) {
    var natal = window.G_NATAL;
    if (natal && natal.el) {
      var el = natal.el;
      var total = (el.wood||0)+(el.fire||0)+(el.earth||0)+(el.metal||0)+(el.water||0);
      if (total > 0) return { wood:el.wood||0, fire:el.fire||0, earth:el.earth||0, metal:el.metal||0, water:el.water||0, total:total };
    }
    // 吏곸젒 怨꾩궛 fallback
    var dist = { wood:0, fire:0, earth:0, metal:0, water:0, total:0 };
    if (!p) return dist;
    var ps = _pillarChars(p);
    var chars = [ps.y.g, ps.y.j, ps.m.g, ps.m.j, ps.d.g, ps.d.j, ps.h.g, ps.h.j];
    chars.forEach(function(c) {
      var el = GAN_EL[c] || JI_EL[c];
      if (el) { dist[el]++; dist.total++; }
    });
    return dist;
  }

  /* 二쇰룄 ?ㅽ뻾 */
  function _dominantEl(dist) {
    var best='wood'; var bestN=0;
    EL_ORDER.forEach(function(k){ if((dist[k]||0)>bestN){bestN=dist[k];best=k;} });
    return best;
  }

  /* ?ㅽ뻾 紐낅즺??(Clear vs Cloudy) ??媛??媛뺥븳 ?ㅽ뻾??吏諛곗쑉 */
  function _hueClarityStatus(dist) {
    if (!dist.total) return 'unknown';
    var dominant = _dominantEl(dist);
    var ratio = (dist[dominant] || 0) / dist.total;
    // ?뱀젙 ?ㅽ뻾 40% ?댁긽?대㈃ Clear, 怨쇰떎(55%+) ?먮뒗 寃고븤(0) ?ㅽ뻾???덉쑝硫?Cloudy
    var hasVoid = EL_ORDER.some(function(k){ return (dist[k]||0) === 0; });
    if (hasVoid) return 'cloudy';
    if (ratio >= 0.55) return 'cloudy';
    return 'clear';
  }

  function _buildAnnualRiskPlan(normalized, year) {
    var plan = [];
    var baseYear = _toInt(year, new Date().getFullYear());
    var currentAge = _toInt((normalized && normalized.currentAge) || 30, 30);
    var daewunList = (normalized && normalized.daewunList) || [];

    for (var i = 0; i < 10; i += 1) {
      var y = baseYear + i;
      var yz = _getYearGanZhi(y);
      var yearEv = _evalDaewunBridge(yz.gan, yz.zhi);
      var dw = _pickDaewunForAge(currentAge + i, daewunList);
      var dwScore = dw ? Number(dw.score || 50) : 50;
      var conflict = normalized && normalized.pillars ? _collectCollisionSignals(normalized.pillars, y) : { score: 0 };
      var shock = (yearEv.hasChungPenalty ? 1 : 0) + ((conflict.chungCount || 0) >= 1 ? 1 : 0);

      var risk = Math.round(
        (100 - yearEv.score) * 0.56
        + (100 - dwScore) * 0.34
        + Number(conflict.score || 0) * 0.10
      );
      risk = _clamp(risk + (shock * 4), 8, 96);

      plan.push({
        year: y,
        ganZhi: yz.label,
        yearScore: yearEv.score,
        daewunScore: _clamp(Math.round(dwScore), 0, 100),
        risk: risk,
        score: 100 - risk,
        shock: shock,
        summary: (function() {
          var base = String(yearEv.evalSummary || '').trim();
          if (base && base.indexOf('?곗씠??遺議?) < 0) return base;
          var dayGan = normalized && normalized.pillars && normalized.pillars.d && normalized.pillars.d.g;
          var ganGod = (dayGan && _calcTenStar(dayGan, yz.gan)) || '以묐┰';
          var zhiGod = (dayGan && _calcTenStar(dayGan, yz.zhi)) || '以묐┰';
          return yz.label + '?꾩? ' + ganGod + '/' + zhiGod + ' 異?以묒떖??湲곕낯 ?댁슜 援ш컙?낅땲??';
        })(),
        daewunLabel: dw ? (dw.g + dw.j) : (yz.label + ' 湲곗?'),
        conflictNotes: conflict.notes || []
      });
    }

    return plan;
  }

  /* ?꾩옱 ?곕룄 湲곗? ?꾪뿕 怨꾩닔 怨꾩궛 */
  function _calcRiskCoeff(p, normalizedOpt) {
    var normalized = normalizedOpt || _normalizeSibylInput({ pillars: p }, { pillars: p });
    var annualPlan = _buildAnnualRiskPlan(normalized, normalized.currentYear || new Date().getFullYear());
    var monthlyPlan = _buildMonthlyRiskPlan(
      normalized.pillars,
      normalized.dominantEl,
      normalized.dominantTenStar,
      45,
      normalized.currentYear || new Date().getFullYear(),
      normalized
    );
    var conflict = _collectCollisionSignals(normalized.pillars, normalized.currentYear || new Date().getFullYear());
    var breakdown = _calcRiskBreakdown(normalized, monthlyPlan, annualPlan, conflict);
    return breakdown.total;
  }

  /* ?꾪뿕 怨꾩닔 ??Dominator 紐⑤뱶 */
  function _dominatorMode(riskScore) {
    if (riskScore <= 30) return 'nle';
    if (riskScore <= 60) return 'le';
    return 'dd';
  }

  function _toInt(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? Math.round(n) : fallback;
  }

  function _getYearGanZhi(year) {
    var GAN = ['??,'阿?,'訝?,'訝?,'??,'藥?,'佯?,'渦?,'鶯?,'??];
    var ZHI = ['耶?,'訝?,'野?,'??,'渦?,'藥?,'??,'??,'??,'??,'??,'雅?];
    var g = GAN[(year - 4 + 6000) % 10];
    var z = ZHI[(year - 4 + 6000) % 12];
    return { gan: g, zhi: z, label: g + z };
  }

  function _buildMonthlyRiskPlan(pillars, dominantEl, dominantTenStar, baseRisk, year, normalized) {
    var plan = [];
    var p = pillars || (normalized && normalized.pillars) || window.G_PILLARS || null;
    var y = _toInt(year, new Date().getFullYear());
    var base = _toInt(baseRisk, 45);
    var dayZhi = p && p.d ? p.d.j : null;
    var monthZhi = p && p.m ? p.m.j : null;
    var focusMap = {
      1: '?좏샇 ?섏쭛', 2: '愿怨?議곗쑉', 3: '?먭툑 ?듭젣', 4: '?ㅽ뻾 ?띾룄 議곗젅',
      5: '沅뚰븳 遺꾨같', 6: '以묎컙 ?먭?', 7: '由ъ뒪???덉뿰', 8: '?깃낵 ?뺤젙',
      9: '?묒뾽 ?щ같移?, 10: '以묒옣湲??ㅺ퀎', 11: '?뚯쭊 諛⑹?', 12: '?곕쭚 ?뺤궛'
    };
    var monthNarrative = [
      '珥덇린 議곌굔???뺣룉?댁빞 ?댄썑 蹂?숈꽦???≪닔?????덉뒿?덈떎.',
      '????섏궗寃곗젙?먯꽌 ?띾룄蹂대떎 ?⑹쓽 ?덉쭏???곗꽑?댁빞 ?⑸땲??',
      '?꾧툑 ?먮쫫??泥댁삩???덉젙?쒗궎???ъ엯?덈떎.',
      '?깃낵 ?뺤떖??而ㅼ???留뚰겮 ?덉쟾?μ튂媛 ?꾩슂?⑸땲??',
      '沅뚰븳怨?梨낆엫??寃쎄퀎瑜?紐낇솗???댁빞 ?먯떎??留됱뒿?덈떎.',
      '以묎컙 ?먭????듯빐 ?섎せ??媛?뺤쓣 議곌린???섏젙?댁빞 ?⑸땲??',
      '?몃? 蹂???좎엯??留롮븘 諛⑹뼱 ?꾨왂???듭떖???⑸땲??',
      '吏묒쨷 ?ㅽ뻾?쇰줈 ?깃낵瑜?怨좎젙?섍린 醫뗭? 援ш컙?낅땲??',
      '?묒뾽 援ъ“瑜??щ같移섑븯硫?留덉같 鍮꾩슜???ш쾶 以꾩뼱??땲??',
      '?대뀈???꾪븳 ?먯썝 ?щ같遺꾩씠 ?꾩슂???ъ엯?덈떎.',
      '泥대젰怨?媛먯젙 ?뚮났 猷⑦떞??癒쇱? ?뺣낫?댁빞 ?⑸땲??',
      '?곕쭚 寃곗궛怨??뺣━媛 ?ㅼ쓬 ?ъ씠?댁쓽 異쒕컻?먯쓣 留뚮벊?덈떎.'
    ];

    var CHONG = { '耶?:'??,'??:'耶?,'訝?:'??,'??:'訝?,'野?:'??,'??:'野?,'??:'??,'??:'??,'渦?:'??,'??:'渦?,'藥?:'雅?,'雅?:'藥? };

    for (var month = 1; month <= 12; month += 1) {
      var gz = _getMonthGanZhiFor(y, month);
      var ev = _evalDaewunBridge(gz.g, gz.j);
      var fortune = _analyzeFortuneBridge(gz, p, y + '??' + month + '??);
      var battery = Number(fortune.batteryPercent || 50);

      var structural = 0;
      if (dayZhi && CHONG[dayZhi] === gz.j) structural += 12;
      if (monthZhi && CHONG[monthZhi] === gz.j) structural += 8;
      if (ev.hasChungPenalty) structural += 10;
      if (ev.hasChungBonus) structural -= 8;

      var risk = Math.round(
        (100 - ev.score) * 0.56
        + (100 - battery) * 0.24
        + base * 0.20
        + structural
      );
      risk = _clamp(risk, 8, 95);

      var caution = (fortune.grade || '臾대궃') + ' 쨌 ' + (fortune.gGod || '以묐┰') + '/' + (fortune.jGod || '以묐┰');
      if (risk >= 70) caution += ' 쨌 異⑸룎 怨좎“ 援ш컙';
      if (dominantTenStar === '鍮꾧껄' || dominantTenStar === '寃곸옱') caution += ' 쨌 ?낅떒 寃쎄퀎';
      if (dominantTenStar === '?멸?' || dominantTenStar === '?뺢?') caution += ' 쨌 沅뚯쐞 留덉같 寃쎄퀎';

      var countermeasure;
      if (risk >= 75) {
        countermeasure = '?섏궗寃곗젙??24?쒓컙 ?좎삁?섍퀬 怨꾩빟/湲덉쟾? 2以?寃?? ?듭떖 愿怨꾨뒗 臾몄옄 湲곕줉?쇰줈 遺꾩웳 ?ъ?瑜?李⑤떒?섏꽭??';
      } else if (risk >= 55) {
        countermeasure = '二쇨컙 紐⑺몴瑜?3媛쒕줈 ?쒗븳?섍퀬, ?쇱젙쨌吏異쑣룸??붾? 媛숈? ???먭??섏꽭?? ?ㅽ뻾蹂대떎 議곗젙??鍮꾩쨷???믪씠?몄슂.';
      } else {
        countermeasure = '媛뺤젏 ?ㅽ뻾 李쎌엯?덈떎. ' + focusMap[month] + '??吏묒쨷?섍퀬 ?깃낵 濡쒓렇瑜??④꺼 ?ㅼ쓬 ??蹂?숈꽦 ?꾩땐 ?먯궛?쇰줈 ?꾪솚?섏꽭??';
      }

      plan.push({
        month: month,
        year: y,
        ganZhi: gz.g + gz.j,
        monthZhi: gz.j,
        risk: risk,
        engineScore: ev.score,
        battery: battery,
        caution: caution,
        countermeasure: countermeasure,
        focus: focusMap[month],
        summary: monthNarrative[month - 1],
        checkpoints: [
          month + '???듭떖 KPI 2媛쒕쭔 ?좎?',
          '愿怨?媛덈벑 ?좏샇 48?쒓컙 ?대궡 ?댁냼',
          '二쇨컙 ?뚮났 猷⑦떞 理쒖냼 2??怨좎젙'
        ],
        adviceItems: fortune.adviceItems || []
      });
    }
    return plan;
  }

  function _buildLocalDominatorReport(payload, analysisData) {
    var profile = payload && payload.profile ? payload.profile : {};
    var year = _toInt(payload && payload.currentYear, new Date().getFullYear());

    var normalized = _normalizeSibylInput(payload || {}, analysisData || {});
    var dominantTenStar = normalized.dominantTenStar || SIBYL_PRIMARY_TENGOD_FALLBACK;
    var dominantEl = normalized.dominantEl || 'water';

    var monthlyPlan = _buildMonthlyRiskPlan(
      normalized.pillars,
      dominantEl,
      dominantTenStar,
      _toInt(payload && payload.riskScore, 45),
      year,
      normalized
    );
    var annualPlan = _buildAnnualRiskPlan(normalized, year);
    var conflictSignals = _collectCollisionSignals(normalized.pillars, year);
    var riskBreakdown = _calcRiskBreakdown(normalized, monthlyPlan, annualPlan, conflictSignals);
    var aptData = _calcAptitudeComponents(normalized, riskBreakdown);
    var normalizedProfile = buildNormalizedSibylProfile(normalized, riskBreakdown, aptData, annualPlan, monthlyPlan);
    var validation = validateSibylProfile(normalizedProfile);

    var risk = _safeScore(normalizedProfile && normalizedProfile.scores && normalizedProfile.scores.riskScore, SIBYL_DEFAULT_RISK_SCORE, 0, 100);
    var coeff = _safeScore(normalizedProfile && normalizedProfile.scores && normalizedProfile.scores.aptitudeScore, SIBYL_DEFAULT_APTITUDE_SCORE, 0, 999);
    dominantTenStar = _safeText(normalizedProfile && normalizedProfile.saju && normalizedProfile.saju.tenGods && normalizedProfile.saju.tenGods.primary, dominantTenStar);
    dominantEl = _safeText(normalizedProfile && normalizedProfile.saju && normalizedProfile.saju.dominantElement, dominantEl);
    var quantumDiagnostics = _collectQuantumDiagnostics(normalized);
    var categoryMatrix = _buildCategoryMatrix(riskBreakdown, aptData, quantumDiagnostics, annualPlan, monthlyPlan);

    var topRiskMonths = monthlyPlan.slice().sort(function(a, b) { return b.risk - a.risk; }).slice(0, 3);
    var lowRiskMonths = monthlyPlan.slice().sort(function(a, b) { return a.risk - b.risk; }).slice(0, 3);
    var topRiskYears = annualPlan.slice().sort(function(a, b) { return b.risk - a.risk; }).slice(0, 3);
    var lowRiskYears = annualPlan.slice().sort(function(a, b) { return a.risk - b.risk; }).slice(0, 3);

    normalized.monthlyPlan = monthlyPlan;
    normalized.annualPlan = annualPlan;
    normalized.collisionSignals = conflictSignals;

    var chapter1 = [
      '## ?듭떖 吏꾨떒 ?붿빟',
      '- ?낅젰 ?ъ＜: ' + _safeText(normalizedProfile && normalizedProfile.input && normalizedProfile.input.birthDate, '?낅젰媛??뺤씤 ?꾩슂') + ' ' + _safeText(normalizedProfile && normalizedProfile.input && normalizedProfile.input.birthTime, '?쒓컙 誘몄긽') + ' / ' + _safeText(normalizedProfile && normalizedProfile.input && normalizedProfile.input.gender, 'unknown'),
      '- 吏諛??ㅽ뻾: ' + (EL_KR[dominantEl] || dominantEl),
      '- 二쇰룄 ??꽦: ' + dominantTenStar,
      '- ?곸꽦 怨꾩닔: ' + coeff + ' / 999',
      '- ?꾪뿕 怨꾩닔: ' + risk + ' / 100 (' + riskBreakdown.label + ')',
      '- ?곗씠???좊ː?? ' + (validation.ok ? '?묓샇' : '蹂닿컯 ?꾩슂'),
      '',
      '## ?곗씠???좊ː??寃쎄퀬',
      ((validation.missingFields.length || (normalizedProfile.debug && normalizedProfile.debug.warnings && normalizedProfile.debug.warnings.length))
        ? ([]
          .concat(validation.missingFields.map(function(msg) { return msg + ' ?꾨씫'; }))
          .concat(normalizedProfile.debug && normalizedProfile.debug.warnings ? normalizedProfile.debug.warnings : [])
          .slice(0, 8)
          .map(function(msg) { return '- ' + msg; }).join('\n'))
        : '- ?듭떖 怨꾩궛 ?꾨뱶媛 ?뺤긽?곸쑝濡??곌껐?섏뼱 ?덉뒿?덈떎.'),
      '',
      '## 由ъ뒪??6遺꾪빐 寃곌낵',
      '- ?ㅽ뻾 遺덇퇏?? ' + riskBreakdown.parts.elementImbalance,
      '- ??꽦怨쇰??? ' + riskBreakdown.parts.tenStarOverload,
      '- 異㈑룻삎쨌?뙿룻빐: ' + riskBreakdown.parts.collision,
      '- ??는룹꽭??異⑸룎: ' + riskBreakdown.parts.daewunSeunConflict,
      '- ?붾퀎 蹂?숈꽦: ' + riskBreakdown.parts.monthlyVolatility,
      '- 議고썑 ?ㅽ듃?덉뒪: ' + riskBreakdown.parts.johuStress,
      '',
      '???섏튂???⑥씪 ?먯닔 ?붿빟???꾨땲?? ?ㅼ젣 ?붿쭊 ?곗씠????댄룊媛/?붿슫?됯?)瑜?湲곕컲?쇰줈 ?꾪뿕??異쒖쿂瑜?遺꾨━??寃곌낵?낅땲?? ?곕씪???먯닔 蹂?붽? ?앷린硫??대뼡 ?섏쐞 異뺤씠 ?吏곸??붿? 利됱떆 異붿쟻?????덉뒿?덈떎.'
    ].join('\n');

    var chapter2 = [
      '## ?ㅽ뻾 遺덇퇏???곸꽭',
      '- 紐???: ' + (normalized.dist.wood || 0) + ' / ????: ' + (normalized.dist.fire || 0) + ' / ????: ' + (normalized.dist.earth || 0) + ' / 湲???: ' + (normalized.dist.metal || 0) + ' / ??麗?: ' + (normalized.dist.water || 0),
      '- 珥앺빀 湲곗? ?몄감媛 ?댁닔濡??ㅽ듃?덉뒪 ?ш굔???뱀젙 異뺤쑝濡?紐곕┰?덈떎.',
      '- 寃고븤 ?ㅽ뻾? ???猷⑦떞??留뚮뱾??蹂닿컯?섏? ?딆쑝硫? ?몄슫 異⑷꺽??????諛⑹뼱痢듭씠 湲됯꺽???뉗븘吏묐땲??',
      '',
      '## ??꽦 援ъ“? 吏곸뾽??湲댁옣',
      '- 鍮꾧껄/寃곸옱 ?? ' + _bijabCount(normalized.tenStarCounts),
      '- ?ъ꽦 ?? ' + ((normalized.tenStarCounts['?몄옱'] || 0) + (normalized.tenStarCounts['?뺤옱'] || 0)),
      '- 愿???? ' + ((normalized.tenStarCounts['?멸?'] || 0) + (normalized.tenStarCounts['?뺢?'] || 0)),
      '- ?몄꽦 ?? ' + ((normalized.tenStarCounts['?몄씤'] || 0) + (normalized.tenStarCounts['?뺤씤'] || 0)),
      '',
      '??꽦 怨쇰???援ш컙? ?μ젏???꾨땶 蹂묐ぉ?쇰줈 ?묐룞?⑸땲?? ?덈? ?ㅼ뼱 鍮꾧쾪??怨쇳븯硫??ㅽ뻾?μ씠 ?믪븘???묒뾽 鍮꾩슜??而ㅼ?怨? 愿?깆씠 怨쇳븯硫??덉젙?깆? ?믪븘??蹂??????띾룄媛 ?먮젮吏묐땲?? ?대쾲 由ы룷?몃뒗 ??蹂묐ぉ???붾퀎/?곕퀎 ??대컢怨??곌껐???몄젣 ?섎퉬?섍퀬 ?몄젣 諛?댁빞 ?섎뒗吏 ?쒖떆?⑸땲??'
    ].join('\n');

    var chapter3 = [
      '## ?곸꽦 5?붿냼 ?꾨줈?뚯씪',
      '- Career: ' + aptData.components.career,
      '- Wealth: ' + aptData.components.wealth,
      '- Execution: ' + aptData.components.execution,
      '- Social: ' + aptData.components.social,
      '- Recovery: ' + aptData.components.recovery,
      '',
      '## ?ㅽ뻾 ?꾨왂',
      '- 而ㅻ━?댁? ?ㅽ뻾 ?먯닔媛 ?믪쑝硫??꾨줈?앺듃 二쇰룄沅뚯쓣 吏곸젒 媛?멸??? ?ы쉶 ?먯닔媛 ??? ?ъ뿉???⑹쓽 吏??鍮꾩슜??怨좊젮?댁빞 ?⑸땲??',
      '- ?щЪ ?먯닔??湲고쉶 ?ъ갑?λ낫???먯떎 ?뚰뵾?κ낵 ?④퍡 ?쎌뼱???⑸땲?? 怨좎젏 ?붿뿉???뺣?, ????붿뿉???좊룞???뺣낫瑜??곗꽑?섏떗?쒖삤.',
      '- ?뚮났 ?먯닔???⑥닚 ?댁떇 吏?쒓? ?꾨땲???깃낵 吏?띿꽦 吏?쒖엯?덈떎. ?뚮났????? 援ш컙?먯꽌 臾대━?섎㈃ ?ㅼ쓬 遺꾧린???ㅽ뻾 ?먯닔源뚯? ?곗뇙 ?섎씫?⑸땲??',
      '',
      '利? ?곸꽦 怨꾩닔 999 ?ㅼ??쇱? ?붾젮???レ옄蹂대떎 諛곕텇 ?꾨왂???섎?媛 ?덉뒿?덈떎. 媛숈? ?먯닔?쇰룄 援ъ꽦?붿냼媛 ?ㅻⅤ硫?泥섎갑???꾩쟾???щ씪吏묐땲??'
    ].join('\n');

    var chapter4 = [
      '## 二쇰룄 ??꽦 ?붿빟',
      '- 二쇰룄 ??꽦: ' + dominantTenStar,
      '- 鍮꾧껄/寃곸옱 ?? ' + _bijabCount(normalized.tenStarCounts),
      '- ?ъ꽦 ?? ' + ((normalized.tenStarCounts['?몄옱'] || 0) + (normalized.tenStarCounts['?뺤옱'] || 0)),
      '- 愿???? ' + ((normalized.tenStarCounts['?멸?'] || 0) + (normalized.tenStarCounts['?뺢?'] || 0)),
      '- ?몄꽦 ?? ' + ((normalized.tenStarCounts['?몄씤'] || 0) + (normalized.tenStarCounts['?뺤씤'] || 0)),
      '',
      '## ?됰룞 ?⑦꽩 ?댁꽍',
      '- ?낅Т ?⑦꽩: 二쇰룄 ??꽦??媛뺥븳 援ш컙?먯꽌 ?ㅽ뻾 ?띾룄??鍮⑤씪吏?? 寃利??④퀎瑜??앸왂?섎㈃ ?ъ옉??鍮꾩슜??而ㅼ쭛?덈떎.',
      '- 愿怨??⑦꽩: 鍮꾧쾪/愿??洹좏삎??臾대꼫吏硫??ㅻ뱷蹂대떎 ?由쎌쑝濡??먮Ⅴ湲??ъ썙 湲곕줉 湲곕컲 ?⑹쓽媛 ?꾩슂?⑸땲??',
      '- ??寃곗젙 ?⑦꽩: ?ъ꽦 ?鍮?愿??鍮꾩쑉????? ?ъ뿉???댁씡蹂대떎 ?먯떎 諛⑹뼱 洹쒖튃??癒쇱? 怨좎젙?댁빞 ?⑸땲??',
      '- 媛먯젙 ?붾뱾由?諛섏쓳: ?뚮났 ?먯닔媛 ?대젮媛???ъ뿉??寃곗젙???섎（ 吏?고빐 ?ㅻ쪟 ?뺣쪧??以꾩씠?몄슂.',
      '',
      '## 二쇰룄 ??꽦??醫뗪쾶 ?곕뒗 諛⑸쾿',
      '- 媛뺤젏 異뺤? 二쇨컙 ?⑥쐞 ?ㅽ뻾 紐⑺몴 1媛쒕줈 吏묒쨷?섍퀬, ?쎌젏 異뺤? 泥댄겕由ъ뒪???먮룞?붾줈 蹂댁셿?⑸땲??',
      '- 怨쇱엵 ?묐룞 ?좏샇媛 蹂댁씠硫??쇱젙/????섏궗寃곗젙 ?띾룄瑜?遺꾨━???숈떆 由ъ뒪?щ? ??땅?덈떎.'
    ].join('\n');

    var annualNarrative = annualPlan.map(function(item, idx) {
      var rank = idx + 1;
      var riskBand = item.risk >= 75 ? '怨좎쐞?? : item.risk >= 55 ? '寃쎄퀎' : item.risk >= 35 ? '以묐┰' : '?덉젙';
      var playbook = item.risk >= 70
        ? '?섎퉬 ?곗꽑: ?좉퇋 ?뺤옣蹂대떎 由ъ뒪???덉뿰, 怨꾩빟? 遺꾪븷 泥닿껐.'
        : item.risk >= 50
          ? '洹좏삎 ?댁슜: ?ㅽ뻾怨?寃利앹쓣 5:5濡?諛곕텇.'
          : '怨듦꺽 ?댁슜: ?듭떖 怨쇱젣 1媛쒕? 媛뺥븯寃?諛???깃낵 怨좎젙.';
      var note = item.conflictNotes && item.conflictNotes.length
        ? item.conflictNotes.slice(0, 2).join(' / ')
        : '吏곴꺽 異⑺삎?뚰빐???쒗븳??';
      return [
        '## Y' + rank + ' 쨌 ' + item.year + '??(' + item.ganZhi + ')',
        '- ?듯빀 ?꾪뿕: ' + item.risk + ' (' + riskBand + ')',
        '- ?몄슫 ?먯닔: ' + item.yearScore + ' / ????먯닔: ' + item.daewunScore + ' [' + item.daewunLabel + ']',
        '- 異⑷꺽 ?좏샇: ' + item.shock + '?④퀎',
        '- ?듭떖 愿李? ' + note,
        '- ?ㅽ뻾 吏移? ' + playbook,
        '- ?붿빟: ' + item.summary
      ].join('\n');
    }).join('\n\n');

    var monthlyNarrative = monthlyPlan.map(function(item) {
      var band = item.risk >= 75 ? '怨좎쐞?? : item.risk >= 55 ? '寃쎄퀎' : item.risk >= 35 ? '以묐┰' : '?덉젙';
      var tactical = item.risk >= 70
        ? '以묒슂 ?덇굔? 24?쒓컙 ?숈꽦 ???뺤젙.'
        : item.risk >= 50
          ? '二쇨컙 ?곗꽑?쒖쐞 3媛??댄븯 ?좎?.'
          : '?뺤떊 援ш컙 怨쇱젣瑜??꾩쭊 諛곗튂.';
      var advice = (item.adviceItems && item.adviceItems.length)
        ? String(item.adviceItems[0].body || '').replace(/\s+/g, ' ').trim()
        : '?붿슫 議곗뼵 ?곗씠???놁쓬';
      return [
        '## M' + String(item.month).padStart(2, '0') + ' 쨌 ' + item.month + '??(' + item.ganZhi + ')',
        '- ?꾪뿕 ' + item.risk + ' / ?붿쭊?먯닔 ' + item.engineScore + ' / 諛고꽣由?' + item.battery,
        '- 由ъ뒪??諛대뱶: ' + band,
        '- ?ъ빱?? ' + item.focus,
        '- 二쇱쓽: ' + item.caution,
        '- ??? ' + item.countermeasure,
        '- ?꾨왂 ?ㅼ썙?? ' + tactical,
        '- ?붽컙 肄붾찘?? ' + item.summary,
        '- ?붿쭊 議곗뼵: ' + advice
      ].join('\n');
    }).join('\n\n');

    var chapter5 = [
      '## ?ㅽ뻾 遺꾪룷',
      '- 紐???: ' + (normalized.dist.wood || 0) + ' / ????: ' + (normalized.dist.fire || 0) + ' / ????: ' + (normalized.dist.earth || 0) + ' / 湲???: ' + (normalized.dist.metal || 0) + ' / ??麗?: ' + (normalized.dist.water || 0),
      '- 吏諛??ㅽ뻾: ' + (EL_KR[dominantEl] || dominantEl),
      '- 怨쇰떎/寃고븤 異뺤? ?붾퀎 吏묒쨷?κ낵 ?뚮났?μ뿉 吏곸젒 ?곹뼢??以띾땲??',
      '',
      '## ?? ?ㅽ뻾 ?좊텋由?,
      '- ?좊━ ?ㅽ뻾: ' + ((quantumDiagnostics.favorableElements || []).join(', ') || '以묐┰(異붿젙)'),
      '- 二쇱쓽 ?ㅽ뻾: ' + ((quantumDiagnostics.cautionElements || []).join(', ') || '以묐┰(異붿젙)'),
      '- ?⑹떊 諛곗뿴: ' + ((quantumDiagnostics.yongshin || []).join(', ') || '以묐┰(異붿젙)'),
      '- 湲곗떊 諛곗뿴: ' + ((quantumDiagnostics.kishin || []).join(', ') || '以묐┰(異붿젙)'),
      '',
      '## ?섍꼍/猷⑦떞 ?ㅺ퀎',
      '- ?좊━ ?ㅽ뻾??留욎텣 ?묒뾽 ?섍꼍??二쇨컙 猷⑦떞??怨좎젙???먮꼫吏 ?꾩닔瑜?以꾩엯?덈떎.',
      '- 二쇱쓽 ?ㅽ뻾??媛뺥븳 ?ъ뿉???硫??쇱젙怨?怨좊궃??寃곗젙??遺꾩궛 諛곗튂?⑸땲??'
    ].join('\n');

    var chapter6 = [
      '## 10??由ъ뒪??留?(?ㅼ뿰??',
      annualNarrative,
      '',
      '## 理쒓퀬 ?꾪뿕 3媛??곕룄',
      topRiskYears.map(function(yItem) { return '- ' + yItem.year + '?? ?꾪뿕 ' + yItem.risk + ' (' + yItem.ganZhi + ')'; }).join('\n'),
      '',
      '## ?덉젙 3媛??곕룄',
      lowRiskYears.map(function(yItem) { return '- ' + yItem.year + '?? ?꾪뿕 ' + yItem.risk + ' (' + yItem.ganZhi + ')'; }).join('\n')
    ].join('\n');

    var chapter7 = [
      '## ?붾퀎 由ъ뒪???뚮옒??(12媛쒖썡)',
      monthlyNarrative,
      '',
      '## 怨좎쐞??3媛쒖썡',
      topRiskMonths.map(function(mItem) { return '- ' + mItem.month + '?? ?꾪뿕 ' + mItem.risk + ' 쨌 ' + mItem.focus; }).join('\n'),
      '',
      '## ?덉젙 3媛쒖썡',
      lowRiskMonths.map(function(mItem) { return '- ' + mItem.month + '?? ?꾪뿕 ' + mItem.risk + ' 쨌 ' + mItem.focus; }).join('\n')
    ].join('\n');

    var chapter8 = [
      '## 愿怨?湲곕낯 ?깊뼢',
      '- Social ?먯닔: ' + aptData.components.social,
      '- 二쇰룄 ??꽦: ' + dominantTenStar,
      '- 異㈑룻삎쨌?뙿룻빐 ?좏샇: 異?' + (conflictSignals.chungCount || 0) + ' / ??' + (conflictSignals.hyungCount || 0) + ' / ??' + (conflictSignals.paCount || 0) + ' / ??' + (conflictSignals.haeCount || 0),
      '',
      '## 愿怨??좎젙 ?⑦꽩',
      '- 媛源뚯썙吏??? 怨듯넻 紐⑺몴媛 遺꾨챸?좎닔濡??좊ː ?뺤꽦??鍮좊쫭?덈떎.',
      '- 硫?댁쭏 ?? ?쇰줈媛 ?꾩쟻???ъ뿉???ㅻ챸 ?앸왂?쇰줈 ?ㅽ빐媛 而ㅼ?湲??쎌뒿?덈떎.',
      '- 媛덈벑 吏?? 怨좎쐞???붿뿉???띾룄????붾낫???뺤씤????붽? ?좊━?⑸땲??',
      '- ?묒뾽 二쇱쓽: ??븷/?꾨즺 湲곗???癒쇱? 臾몄꽌?뷀븯硫??ъ땐?뚯쓣 以꾩씪 ???덉뒿?덈떎.',
      '- ?뚮났 ?꾨왂: ?뚮났 ?먯닔 ????ъ뿉??愿怨??댁뒋瑜??쇨큵 泥섎━?섏? 留먭퀬 ?곗꽑?쒖쐞瑜?遺꾨━?섏꽭??'
    ].join('\n');

    var chapter9 = [
      '## 吏곸뾽/?щЪ ?꾨왂 ?붿빟',
      '- Career: ' + aptData.components.career + ' / Wealth: ' + aptData.components.wealth + ' / Execution: ' + aptData.components.execution,
      '- ?꾪뿕 怨꾩닔: ' + risk + ' / ?곸꽦 怨꾩닔: ' + coeff,
      '',
      '## 遺꾩빞蹂??ㅽ뻾 留ㅻ돱??,
      '- 吏곸뾽 ?깊뼢: 二쇰룄 ??꽦怨??ㅽ뻾 ?먯닔 異뺤쓣 湲곗??쇰줈 ??븷??醫곹? ?깃낵瑜?怨좎젙?⑸땲??',
      '- ?섏씡 ?꾨왂: 怨좎쐞???붿뿉???꾧툑?먮쫫 諛⑹뼱, ?덉젙 ?붿뿉??怨좏슚??梨꾨꼸 ?뺤옣???곸슜?⑸땲??',
      '- ?먯떎 ?⑦꽩: 蹂?숈꽦 ?곸쐞 ?붿뿉 ?ㅼ쨷 ?섏궗寃곗젙??寃뱀튂吏 ?딅뒗 寃껋씠 ?듭떖?낅땲??',
      '- ?꾨줈?앺듃 ?댁쁺: ?⑤룆/?묒뾽 鍮꾩쑉???붾퀎 由ъ뒪??諛대뱶??留욎떠 ?숈쟻?쇰줈 議곗젙?⑸땲??',
      '',
      '## 30/90/180???ㅽ뻾 ?꾨왂',
      '- 30?? ?먯떎 ?꾩닔 李⑤떒(怨꾩빟 寃??猷⑦떞, ?섏궗寃곗젙 濡쒓렇??.',
      '- 90?? ?깃낵 怨좎젙(?듭떖 ?꾨줈?앺듃 1媛?吏묒쨷, ?묒뾽 洹쒖튃 紐낅Ц??.',
      '- 180?? ?ы듃?대━???ы렪(媛뺤젏 ?곸뿭 ?뺤옣 + 怨좎쐞???낅Т ?먮룞??.'
    ].join('\n');

    var chapter10 = [
      '## 理쒖쥌 ?쒕퉴??硫붿떆吏',
      '- 吏湲?媛??以묒슂???꾪뿕 異? ' + (riskBreakdown.parts.daewunSeunConflict >= riskBreakdown.parts.elementImbalance ? '??는룹꽭??異⑸룎' : '?ㅽ뻾 遺덇퇏??),
      '- 吏湲?媛??媛뺥븳 湲고쉶 異? ' + Object.keys(aptData.components || {}).sort(function(a, b) { return (aptData.components[b] || 0) - (aptData.components[a] || 0); }).slice(0, 1).join(', '),
      '- ?뱀옣 諛붽퓭????1媛吏: 怨좎쐞?????섏궗寃곗젙 吏??洹쒖튃(24?쒓컙) ?곸슜.',
      '- ?뱀옣 媛뺥솕?댁빞 ??1媛吏: ?덉젙 ???듭떖 怨쇱젣 ?⑥씪?몃옓 吏묒쨷.',
      '',
      '## ?ㅽ뻾 猷⑦떞',
      '- 7?? ?꾪뿕 ?곸쐞 ?좏샇 1媛쒕쭔 異붿쟻?섎ŉ ?쇱젙 異⑸룎 ?쒓굅.',
      '- 30?? ?먯떎/?깃낵 吏??1媛쒖뵫 怨좎젙?섍퀬 猷⑦떞 ?좎????먭?.',
      '- 90?? ?꾨왂 ?좎?/?먭린 ??ぉ??遺꾨━???댁쁺 洹쒖튃 ?낅뜲?댄듃.',
      '',
      '## 媛쒖슫 泥섎갑??,
      '- 二쇰룄 ??꽦 ' + dominantTenStar + ' 媛뺤젏? ?좎??섎릺 怨쇱엵 援ш컙?먯꽌 ?띾룄蹂대떎 寃利앹쓣 ?곗꽑?⑸땲??',
      '- ?좊━ ?ㅽ뻾(' + ((quantumDiagnostics.favorableElements || []).join(', ') || '以묐┰') + ') 以묒떖???섍꼍쨌猷⑦떞??怨좎젙?⑸땲??',
      '',
      '?ㅼ쟾 ?좎뼵臾? "怨좎쐞??援ш컙?먮뒗 諛⑹뼱瑜??곗꽑?섍퀬, ??꾪뿕 援ш컙?먮뒗 吏묒쨷 ?ㅽ뻾?쒕떎. 遺꾩꽍 寃곌낵瑜??됰룞 洹쒖튃?쇰줈 ?꾪솚?쒕떎."'
    ].join('\n');

    var canonicalData = _buildSibylCanonicalData(normalized, riskBreakdown, aptData, annualPlan, monthlyPlan);

    var chapters = [
      { key: 'coreMatrix', title: 'CH.01 ?쒕퉴??肄붿뼱 留ㅽ듃由?뒪', content: chapter1 },
      { key: 'riskAnalysis', title: 'CH.02 ?꾪뿕 怨꾩닔 ?뺣? 遺꾩꽍', content: chapter2 },
      { key: 'aptitudeAnalysis', title: 'CH.03 ?곸꽦 怨꾩닔 ?뺣? 遺꾩꽍', content: chapter3 },
      { key: 'tenGodPattern', title: 'CH.04 二쇰룄 ??꽦怨??됰룞 ?⑦꽩', content: chapter4 },
      { key: 'elementBalance', title: 'CH.05 ?ㅽ뻾 諛몃윴?ㅼ? ?먮꼫吏 ?ㅺ퀎', content: chapter5 },
      { key: 'yearlyFlow', title: 'CH.06 10???꾪뿕 怨꾩닔 洹몃옒???댁꽕', content: chapter6 },
      { key: 'monthlyPlanner', title: 'CH.07 ?붾퀎 由ъ뒪???뚮옒??, content: chapter7 },
      { key: 'relationship', title: 'CH.08 愿怨꾩? ?좎젙 ?⑦꽩', content: chapter8 },
      { key: 'moneyCareer', title: 'CH.09 ?щЪ怨?吏곸뾽 ?꾨왂', content: chapter9 },
      { key: 'finalMessage', title: 'CH.10 理쒖쥌 ?ㅽ뻾 媛?대뱶', content: chapter10 }
    ];

    var localTotals = _ensureSibylPremiumTotalChars(chapters, SIBYL_MIN_PREMIUM_TOTAL_CHARS, canonicalData);
    chapters = localTotals.chapters.map(function(ch) {
      return {
        key: ch.key,
        title: ch.title,
        content: _sanitizeSibylChapterContent(String(ch.content || '').trim())
      };
    });

    var chapterMap = {};
    chapters.forEach(function(ch) {
      chapterMap[ch.key] = String(ch.content || '').trim();
    });

    var qualityState = {
      chapters: chapters,
      chapterMap: chapterMap
    };
    dedupeSibylReportText(qualityState);
    chapters = qualityState.chapters;
    chapterMap = {};
    chapters.forEach(function(ch) {
      chapterMap[ch.key] = String(ch.content || '').trim();
    });

    var placeholderCheck = assertNoPlaceholderText(qualityState);
    var chapterMatchCheck = assertChapterCategoryMatch(qualityState);
    var sectionCheck = validateSibylReportSections(qualityState);

    if (_isSibylDevMode()) {
      _sibylLogInfo('[SibylReport] seed resolved', {
        dominantEl: dominantEl,
        dominantTenStar: dominantTenStar,
        risk: risk,
        aptitude: coeff
      });
      _sibylLogInfo('[SibylReport] chapter count', chapters.length);
      _sibylLogInfo('[SibylReport] chart slots', ['risk-breakdown', 'aptitude-profile', 'quantum-element-balance', 'ten-year-risk-map', 'monthly-risk-planner']);
      _sibylLogInfo('[SibylReport] placeholder count', placeholderCheck.placeholderCount);
      _sibylLogInfo('[SibylReport] duplicate sentence count', qualityState.__duplicateSentenceCount || 0);
      _sibylLogInfo('[SibylReport] render body isolated', true);
      if (!chapterMatchCheck.ok) _sibylLogWarn('[SibylReport] chapter-category warnings', chapterMatchCheck.warnings);
      if (!sectionCheck.ok) _sibylLogWarn('[SibylReport] section validation warning', sectionCheck);
    }

    var totalChars = localTotals.totalChars;

    return {
      source: 'local-saju-engine-bridge',
      model: 'local',
      totalChars: totalChars,
      minTotalChars: SIBYL_MIN_PREMIUM_TOTAL_CHARS,
      generatedAt: Date.now(),
      riskScore: risk,
      aptCoeff: coeff,
      dominantTenStar: dominantTenStar,
      dominantEl: dominantEl,
      monthlyRiskPlan: monthlyPlan,
      annualRiskPlan: annualPlan,
      riskBreakdown: riskBreakdown,
      aptitudeComponents: aptData.components,
      quantumDiagnostics: quantumDiagnostics,
      categoryMatrix: categoryMatrix,
      integrity: normalized.integrity,
      chartSlots: {
        riskBreakdown: 'risk-breakdown',
        aptitudeProfile: 'aptitude-profile',
        quantumElementBalance: 'quantum-element-balance',
        tenYearRiskMap: 'ten-year-risk-map',
        monthlyRiskPlanner: 'monthly-risk-planner'
      },
      chapterMap: chapterMap,
      canonicalData: canonicalData,
      chapters: chapters
    };
  }

  /* 10???꾪뿕 洹몃옒???곗씠??*/
  function _buildRiskGraph(pOrNormalized, annualPlan) {
    if (Array.isArray(annualPlan) && annualPlan.length) {
      return annualPlan.map(function(item) {
        return {
          year: item.year,
          zhi: (item.ganZhi || '').slice(1),
          risk: _clamp(Math.round(item.risk), 8, 96)
        };
      });
    }

    var normalized = (pOrNormalized && pOrNormalized.pillars)
      ? pOrNormalized
      : _normalizeSibylInput({ pillars: pOrNormalized }, { pillars: pOrNormalized });
    var plan = _buildAnnualRiskPlan(normalized, normalized.currentYear || new Date().getFullYear());
    return plan.map(function(item) {
      return {
        year: item.year,
        zhi: (item.ganZhi || '').slice(1),
        risk: _clamp(Math.round(item.risk), 8, 96)
      };
    });
  }

  /* SVG 洹몃옒???뚮뜑留?*/
  function _renderRiskSVG(data, svgEl) {
    var W = 680, H = 160, PAD = { l: 40, r: 20, t: 20, b: 30 };
    var n = data.length;
    var xs = W - PAD.l - PAD.r;
    var ys = H - PAD.t - PAD.b;
    var pts = data.map(function(d, i) {
      var x = PAD.l + (i / (n - 1)) * xs;
      var y = PAD.t + (1 - d.risk / 100) * ys;
      return { x: x, y: y, d: d };
    });

    var fillPath = 'M ' + pts.map(function(p){ return p.x+' '+p.y; }).join(' L ') + ' L ' + (PAD.l + xs) + ' ' + (H - PAD.b) + ' L ' + PAD.l + ' ' + (H - PAD.b) + ' Z';
    var linePath = 'M ' + pts.map(function(p){ return p.x+' '+p.y; }).join(' L ');

    var svgContent = '<defs>'
      + '<linearGradient id="sbRiskGrad" x1="0" y1="0" x2="0" y2="1">'
      + '<stop offset="0%" stop-color="#ff2143" stop-opacity="0.5"/>'
      + '<stop offset="100%" stop-color="#ff2143" stop-opacity="0"/>'
      + '</linearGradient>'
      + '</defs>'
      // Grid lines
      + [25,50,75].map(function(v) {
          var gy = PAD.t + (1 - v/100) * ys;
          return '<line x1="'+PAD.l+'" y1="'+gy+'" x2="'+(PAD.l+xs)+'" y2="'+gy+'" stroke="rgba(0,200,255,0.1)" stroke-dasharray="4,4"/>'
               + '<text x="'+(PAD.l - 4)+'" y="'+(gy+4)+'" fill="rgba(0,200,255,0.4)" font-size="9" text-anchor="end" font-family="monospace">'+v+'</text>';
        }).join('')
      // Area
      + '<path d="'+fillPath+'" fill="url(#sbRiskGrad)"/>'
      // Line
      + '<path d="'+linePath+'" fill="none" stroke="#ff4560" stroke-width="2" stroke-linejoin="round"/>'
      // Dots
      + pts.map(function(pt) {
          var r = pt.d.risk >= 60 ? 5 : 3.5;
          var c = pt.d.risk >= 70 ? '#ff2143' : pt.d.risk >= 50 ? '#ffb800' : '#00c8ff';
          var label = pt.d.year.toString().slice(2) + '/' + pt.d.zhi;
          return '<circle cx="'+pt.x+'" cy="'+pt.y+'" r="'+r+'" fill="'+c+'" stroke="#000814" stroke-width="1.5"/>'
               + '<text x="'+pt.x+'" y="'+(H - PAD.b + 16)+'" fill="rgba(150,200,220,0.7)" font-size="8" text-anchor="middle" font-family="monospace">'+label+'</text>';
        }).join('');

    svgEl.setAttribute('viewBox', '0 0 '+W+' '+H);
    svgEl.innerHTML = svgContent;
  }

  /* 鍮꾧쾪 怨쇰떎 寃쎈낫 ???쇨컙 泥쒓컙 吏곸젒 異붿텧, G_POWER ?섏〈 ?쒓굅 */
  function _buildSmartWarning(pillars, dominant, counts, dist) {
    var power = window.G_POWER;
    var KE_LOCAL = { wood:'earth', fire:'metal', earth:'water', metal:'wood', water:'fire' };
    /* ???쇨컙 ?먯냼: 泥쒓컙?먯꽌 吏곸젒 怨꾩궛 (G_POWER 誘몃줈???쒖뿉???뺥솗) */
    var dayGan = pillars && pillars.d && pillars.d.g;
    var dayEl = (dayGan && GAN_EL[dayGan]) || (power && power.dayEl) || 'water';
    var jaeEl = KE_LOCAL[dayEl];
    var total = dist.total || 1;
    var bijabPct = Math.round((dist[dayEl] || 0) / total * 100);
    var jaeCount = jaeEl ? (dist[jaeEl] || 0) : 0;
    var jaePct   = Math.round(jaeCount / total * 100);
    /* ???좉컯/?좎빟: G_POWER ?곗꽑, ?놁쑝硫??앹븘+鍮꾧쾪 ?먯냼 鍮꾩쑉 怨꾩궛 */
    var isStrong;
    if (power && typeof power.isStrong === 'boolean') {
      isStrong = power.isStrong;
    } else {
      var PAIEL_W = { wood:'water', fire:'wood', earth:'fire', metal:'earth', water:'metal' };
      var parElW = PAIEL_W[dayEl];
      var friendW = (dist[dayEl] || 0) + (parElW ? (dist[parElW] || 0) : 0);
      isStrong = (friendW * 2 >= total);
    }
    var bc = (counts['鍮꾧껄'] || 0) + (counts['寃곸옱'] || 0);
    /* 鍮꾧쾪 怨쇰떎: G_POWER.isStrong + ?먯냼 鍮꾩쑉 25% ?댁긽 OR ??꽦 移댁슫??3媛??댁긽 */
    if ((isStrong && bijabPct >= 25) || bc >= BIJAB_WARN_THRESHOLD) {
      if (jaeCount === 0) {
        return '鍮꾧쾪(驪붷뒲) 洹밴컯 + ?ъ꽦(縕→삜) ?꾩쟾 怨듬쭩. 媛뺥븳 ?쇨컙 ?먮꼫吏??異쒓뎄媛 留됲? ?덉뒿?덈떎 ???낅떒, 怨좎쭛, ?щЪ 臾닿컧媛곸씠 ?숈떆??援ъ“?붾맗?덈떎. 媛??媛뺥븳 ?먭뎅??媛???꾪뿕???⑦꽩???섎뒗 ??꽕?낅땲??';
      }
      if (jaePct < 15) {
        return '鍮꾧쾪(驪붷뒲) 怨쇱엵 寃쎈낫. [?숇쪟 ?먯냼 鍮꾩쨷 ' + bijabPct + '%] ?щЪ ?먮꼫吏(' + (EL_KR[jaeEl] || jaeEl) + ' ' + jaePct + '%)媛 ?ш컖?섍쾶 痍⑥빟?⑸땲?? ?낅떒???먮떒 諛섎났怨?議곗뼵 嫄곕? ?⑦꽩???κ린 怨좊┰怨?寃쎌젣???뺤껜濡??댁뼱吏????덉뒿?덈떎.';
      }
      return '鍮꾧쾪(驪붷뒲) 怨쇰떎 寃쎈낫. [?숇쪟 ?먯냼 鍮꾩쨷 ' + bijabPct + '%] ?낅떒???먮떒怨??묐젰 嫄곕? ?깊뼢??? 湲곕컲 ?낅Т?먯꽌 諛섎났??留덉같???쇱쑝?듬땲?? 媛뺤젏??諛섎났?섎㈃ ?낆씠 ?⑸땲??';
    }
    /* 愿???뺣컯: ?좎빟?쒕뜲 愿?깆씠 二쇰룄?섎뒗 寃쎌슦 */
    if (!isStrong && (dominant === '?멸?' || dominant === '?뺢?')) {
      return '愿??若섉삜) ?뺣컯 媛먯?. 洹쒖쑉쨌?듭젣 ?먮꼫吏媛 ?쏀븳 ?쇨컙???쒖븬?섍퀬 ?덉뒿?덈떎. 怨쇰룄???꾨꼍二쇱쓽쨌?먭린鍮꾪뙋쨌?곴툒???덉튂媛 ?먮컻???깆옣 ?숇젰??李⑤떒?????덉뒿?덈떎.';
    }
    /* ?ъ꽦 怨쇱쨷: ?ㅼ젣濡??ъ꽦 ?먯냼 鍮꾩쨷 + ??꽦 移댁슫??紐⑤몢 ?믪쓣 ?뚮쭔 寃쎄퀬 */
    var jaeStarCount = (counts['?몄옱'] || 0) + (counts['?뺤옱'] || 0);
    if (!isStrong && jaeStarCount >= 2 && jaePct >= 25) {
      return '?ъ꽦(縕→삜) 怨쇱쨷 寃쎈낫. ?щЪ ?먮꼫吏 鍮꾩쨷(' + jaePct + '%)???쇨컙???뺣컯?⑸땲?? 湲덉쟾쨌?듭젣 ?뺢뎄媛 ?멸컙愿怨꾨? ?뚮え?쒗궎怨?吏??媛?μ꽦????섏떆?듬땲??';
    }
    return null;
  }
  /* ?섏쐞 ?명솚: 援щ쾭???몄텧遺 ???*/
  function _bijabWarning(counts, dominant) {
    return _buildSmartWarning(null, dominant, counts, _ohaengDist(window.G_PILLARS));
  }

  /* ?? 臾대즺 ?깊뼢 遺꾩꽍 HTML 鍮뚮뱶 (1000??) ?? */
  function _buildNatureAnalysis(pillars, dist, dominant, counts) {
    var dayGan = pillars && pillars.d && pillars.d.g;
    var nature = (dayGan && DAYGAN_NATURE[dayGan]) || DAYGAN_NATURE['鶯?];
    var tenNature = (dominant && TENSTAR_NATURE[dominant]) || TENSTAR_NATURE['?몄옱'];
    var power = window.G_POWER;
    var KE_LOCAL = { wood:'earth', fire:'metal', earth:'water', metal:'wood', water:'fire' };
    /* ?쇨컙 ?먯냼 吏곸젒 異붿텧 */
    var dayEl = (dayGan && GAN_EL[dayGan]) || (power && power.dayEl) || 'water';
    var jaeEl = KE_LOCAL[dayEl];
    var total = dist.total || 1;
    var bijabPct = Math.round((dist[dayEl] || 0) / total * 100);
    var jaePct = jaeEl ? Math.round((dist[jaeEl] || 0) / total * 100) : 0;
    /* ?좉컯/?좎빟 fallback */
    var isStrong;
    if (power && typeof power.isStrong === 'boolean') {
      isStrong = power.isStrong;
    } else {
      var PAIEL_N = { wood:'water', fire:'wood', earth:'fire', metal:'earth', water:'metal' };
      var parElN = PAIEL_N[dayEl];
      var friendCntN = (dist[dayEl] || 0) + (parElN ? (dist[parElN] || 0) : 0);
      isStrong = (friendCntN * 2 >= total);
    }
    var powerScore = power ? (power.score || 0) : 0;
    var powerLabel = isStrong
      ? '?좉컯(翁ュ성)' + (powerScore ? ' ' + powerScore + '?? : '') + ' ???쇨컙 ?먮꼫吏 怨쇱엵, ?ㅺ린(力꾣간)쨌?듭젣 ?꾩슂'
      : '?좎빟(翁ュ선)' + (powerScore ? ' ' + powerScore + '?? : '') + ' ???쇨컙 ?먮꼫吏 遺議? ?앹“(?잌뒰) ?꾩슂';
    var bc = (counts['鍮꾧껄'] || 0) + (counts['寃곸옱'] || 0);
    var html = '';

    /* ??Block 1: ?쇨컙 湲곗쭏 */
    html += '<div class="sb-nature-block">'
      + '<div class="sb-nature-tag">??INNATE DISPOSITION ???怨좊궃 湲곗쭏 遺꾩꽍</div>'
      + '<div class="sb-nature-label">' + nature.name + ' &nbsp;&middot;&nbsp; <span class="sb-nature-type">' + nature.type + '</span></div>'
      + '<p class="sb-nature-body">' + nature.nature + '</p>'
      + '<div class="sb-nature-row"><span class="sb-nature-key">吏곸뾽 媛뺤젏</span><span class="sb-nature-val">' + nature.strength + '</span></div>'
      + '<div class="sb-nature-row"><span class="sb-nature-key">援ъ“???쎌젏</span><span class="sb-nature-val sb-nature-val--warn">' + nature.weakness + '</span></div>'
      + '<div class="sb-nature-row"><span class="sb-nature-key">?곹빀 吏곴뎔</span><span class="sb-nature-val">' + nature.career + '</span></div>'
      + '</div>';

    /* ??Block 2: ??꽦 ?먮꼫吏 踰≫꽣 */
    html += '<div class="sb-nature-block">'
      + '<div class="sb-nature-tag">??TENSTAR VECTOR ??二쇰룄 ??꽦 [' + dominant + '] 吏곸뾽 ?먮꼫吏</div>'
      + '<p class="sb-nature-body">' + tenNature.profile + '</p>'
      + '<div class="sb-nature-row"><span class="sb-nature-key">?듭떖 ??웾</span><span class="sb-nature-val">' + tenNature.pro + '</span></div>'
      + '<div class="sb-nature-row"><span class="sb-nature-key">??二쇱쓽 ?⑦꽩</span><span class="sb-nature-val sb-nature-val--warn">' + tenNature.con + '</span></div>'
      + '</div>';

    /* ??Block 2-B: ??꽦 遺꾪룷 湲곕컲 ?멸컙愿怨??⑦꽩 遺꾩꽍 */
    (function() {
      var RELATIONSHIP_PATTERN = {
        '?앹떊': { title:'[?앹떊 二쇰룄] ?먯뿰?ㅻ윭??踰좏뭳??愿怨?, pattern:'愿怨꾩뿉??癒쇱? 二쇰뒗 ??븷??留≪븘 ?곷?瑜??몄븞?섍쾶 留뚮뱶???먮꼫吏瑜??怨좊궗?듬땲?? ?앹떊??媛뺥븳 ?щ엺? ???以??곷?瑜??껉쾶 留뚮뱾怨? ?꾩씠?붿뼱? ?좊㉧濡?遺꾩쐞湲곕? ?대걚???λ젰???덉뼱 ?먯뿰?ㅻ읇寃??멸린瑜??뺣땲?? 洹몃윭??吏?섏튂寃?踰좏???蹂대㈃ ?먮꼫吏媛 ?뚯쭊?섍퀬, 蹂댁긽??湲곕??섏? ?딅뒗 泥숉븯硫댁꽌???대㈃???볦씠???꾩돩???愿怨?洹좎뿴???⑥븮???⑸땲?? 吏곸젒 ?붿껌 ????뚮젮 留먰븯??諛⑹떇?쇰줈 ?뺢뎄瑜??쒗쁽?섎뒗 ?⑦꽩??諛섎났?섎㈃ ?뚰듃?덇? 吏꾩쭨 ?꾩슂瑜??뚯븙?섏? 紐삵빐 ?⑥젅???ы솕?⑸땲?? ?멸컙愿怨꾩뿉???먯떊???쒓퀎瑜?紐낇솗???ㅼ젙?섎뒗 "No ?곗뒿"???κ린 愿怨?吏?띿꽦??寃곗젙?곸엯?덈떎.', warning:'湲곕?? ?ㅻ쭩??諛섎났?쇰줈 ?명븳 ?쇰줈 ?꾩쟻. 踰좏뭳???쒓퀎 ?ㅼ젙 ?덈젴???꾩닔.' },
        '?곴?': { title:'[?곴? 二쇰룄] ?꾨컻?겶룹옄湲곗＜??媛뺥븳 愿怨?, pattern:'?곴???二쇰룄?섎뒗 紐낆떇? ?멸컙愿怨꾩뿉????몄쓽 遺덊빀由ы븿??利됱떆 吏?곹븯怨? 沅뚯쐞???꾩쟾?섎뒗 ?먮꼫吏媛 媛뺥빀?덈떎. ?좎뭅濡쒖슫 ?몄뼱???쒗쁽?μ쑝濡??곷?瑜??뺣룄?섏?留? 洹?怨쇱젙?먯꽌 ?섎룄移??딄쾶 源딆? ?곸쿂瑜??④린??寃쎌슦媛 諛섎났?⑸땲?? ?곴툒?먃룹꽑諛걔룸?紐⑥???愿怨꾩뿉??援ъ“??異⑸룎???쇱뼱?섍린 ?ъ슦硫? ?먯떊??紐⑤Ⅴ寃?愿怨꾩쓽 洹쒖튃???닿린???⑦꽩??吏꾨줈쨌?멸컙愿怨??⑥젅??二쇱슂 ?먯씤???⑸땲?? ?쒗렪, ?먯떊怨?鍮꾩듂???낅┰ ?깊뼢???뚰듃?덉???洹밸룄濡?媛뺣젰???쒕꼫吏瑜??????덉뒿?덈떎. 愿怨꾩뿉??"異⑸텇???앷컖?섍퀬 留먰븯湲?瑜??섏떇?곸쑝濡??덈젴?섎뒗 寃껋씠 ?앹〈 ?꾨왂?낅땲??', warning:'沅뚯쐞 異⑸룎怨?異⑸룞 諛쒖뼵?쇰줈 ?명븳 愿怨??뚭눼 ?⑦꽩. ?몃궡???덈젴???듭떖.' },
        '?몄옱': { title:'[?몄옱 二쇰룄] ?뺤궛?겶룻넻?쒖쟻 ????먮꼫吏', pattern:'?몄옱媛 二쇰룄?섎뒗 紐낆떇? ?볤퀬 鍮좊Ⅴ寃??몃㎘???뺤옣?섏?留? 源딆씠 ?덈뒗 ?⑥씪 愿怨??좎????대젮????덉뒿?덈떎. ?곷?瑜??먯떊??湲곗??쇰줈 ?듭젣?섍굅??愿由ы븯?ㅻ뒗 蹂몃뒫???뺢뎄媛 ?덉뼱, 愿怨꾧? 源딆뼱吏덉닔濡??뚰듃?덉뿉寃??뺣컯媛먯쓣 以????덉뒿?덈떎. ?щЪ怨??댄빐愿怨꾨? 湲곕컲?쇰줈 愿怨꾨? 媛쒖꽕?섍퀬 ?좎??섎뒗 ?⑦꽩???덉뼱, ?댁씡???щ씪吏硫?愿怨꾨룄 ?먮┸?댁???援ъ“媛 ?댁옱???덉뒿?덈떎. 媛먯꽦??怨듦컧蹂대떎 ?ㅼ슜??嫄곕옒 ?몄뼱媛 ?먯뿰?ㅻ윭?곕ŉ, ?닿쾬???κ린 媛먯꽦 ?뚰듃?덉떗?먯꽌 留덉같 ?먯씤???⑸땲?? 鍮꾩씠?닿?怨?湲곕컲 愿怨꾨? ?섎룄?곸쑝濡?援ъ텞?섎뒗 ?몃젰??以묒슂?⑸땲??', warning:'?몃㎘ 愿由ъ쓽 ?꾧뎄??寃쏀뼢. 媛먯꽦 怨듦컧 ?λ젰 ?섏떇??媛쒕컻???꾩슂.' },
        '?뺤옱': { title:'[?뺤옱 二쇰룄] ?좎쨷?섍퀬 ?뚯떊?곸씤 愿怨?, pattern:'?뺤옱媛 媛뺥븳 紐낆떇? ?쎌냽??吏?ㅺ퀬 梨낆엫???ㅽ븯???좊ː 湲곕컲 愿怨꾨? ?좏샇?⑸땲?? 愿怨꾨? ?⑤?濡?留븐? ?딄퀬, ?뚯닔??源딄퀬 ?덉젙?곸씤 ?몄뿰???κ린媛??좎??섎뒗 ?깊뼢???덉뒿?덈떎. 洹몃윭??蹂?붿뿉 ??????컧??媛뺥빐, 愿怨꾩뿉???덈줈????룞?대굹 媛덈벑???앷꺼??湲곗〈 ?⑦꽩??怨좎닔?섎뒗 寃쏀뼢???덉뒿?덈떎. ?곷????묒? ?ㅼ닔??遺덉씪移섎? ?ㅻ옒 湲곗뼲?섍퀬 ?대㈃???꾩쟻?섎뒗 ?깊뼢?? ?대뒓 ?쒓컙 ?덉긽移?紐삵븳 ??컻濡??댁뼱吏??寃껋씠 ??紐낆떇??愿怨??꾪뿕 ?⑦꽩?낅땲?? 遺덈쭔??議곌린???몄뼱濡?爰쇰궡???곗뒿??愿怨??덉쟾留앹쓣 媛뺥솕?⑸땲??', warning:'?대㈃ ?꾩쟻 ????컻 ?⑦꽩. 遺덈쭔 議곌린 ?몄뼱???덈젴???꾩닔.' },
        '?멸?': { title:'[?멸? 二쇰룄] 移대━?ㅻ쭏?겶룹?諛곗쟻 ???援ъ“', pattern:'?멸???二쇰룄?섎뒗 紐낆떇? 媛뺣젹??議댁옱媛먭낵 移대━?ㅻ쭏濡?二쇰????뺣룄?섏?留? ?닿쾬??愿怨꾩뿉??怨쇰룄??吏諛??뺢뎄濡??쒗쁽?????곷??먭쾶 ?듭븬媛먯쓣 以띾땲?? 愿怨꾨? ?섏쭅???쒖뿴濡??몄떇?섎뒗 寃쏀뼢???덉뼱, ?됰벑???섑룊 愿怨꾨? ?ㅼ젙?섎뒗 寃??먯껜媛 ??꽕怨?遺덊렪?섍쾶 ?먭뺨吏????덉뒿?덈떎. ?멸???媛뺥븳 ?щ엺?먭쾶 吏吏? ?몄젙??諛쏄린 ?꾪빐 二쇰??몃뱾??吏?섏튂寃??덉튂瑜?蹂대뒗 愿怨??앺깭怨꾧? ?뺤꽦?섍린 ?쎌뒿?덈떎. 異?烏? ?먮꼫吏媛 媛뺥븳 ?쒓린?먮뒗 愿怨꾩뿉????컻??媛덈벑 ?먮뒗 ?꾩쟾 ?⑥젅???쇱뼱?????덉뒿?덈떎. ?щ━???덉쟾 ?섍꼍???섏떇?곸쑝濡?留뚮뱾???곷?媛 ?붿쭅?????덈뒗 援ъ“瑜?援ъ텞?섎뒗 寃껋씠 愿怨??μ닔???듭떖?낅땲??', warning:'?섏쭅??愿怨?援ъ“濡??명븳 怨좊┰ ?꾪뿕. 痍⑥빟???쒗쁽 ?곗뒿??愿怨??뚮났?μ쓣 ?믪씤??' },
        '?뺢?': { title:'[?뺢? 二쇰룄] ?먯튃쨌梨낆엫 以묒떖 愿怨?, pattern:'?뺢???媛뺥븳 紐낆떇? 紐낇솗????븷 遺꾨떞怨??먯튃??以묒떆?섎ŉ, ?곷??먭쾶???숈씪???섏???梨낆엫媛먯쓣 ?붽뎄?⑸땲?? ??湲곗???異⑹”?섎뒗 ?뚰듃?덉???留ㅼ슦 ?덉젙?곸씠怨?吏?띿쟻??愿怨꾨? ?뺤꽦?섏?留? 湲곗???誘몃떖?섎뒗 ?곷?????댁꽌??鍮좊Ⅴ寃??좊ː瑜?嫄곕몢???⑦꽩???섑??⑸땲?? ?먯튃 以?섏뿉 ???吏묒갑????몄쓽 ?ㅼ닔??????⑹씤 ??쓣 醫곹?, 愿怨꾩뿉??怨쇰룄???먮떒????븷??留↔쾶 ?섎뒗 寃껋씠 二쇱슂 ?꾪뿕?낅땲?? ?ㅼ뒪濡쒖뿉寃?遺怨쇳븯??怨쇰룄??梨낆엫媛먯씠 留뚯꽦 ?ㅽ듃?덉뒪濡??곌껐?섎ŉ, ?닿쾬??媛源뚯슫 愿怨꾩뿉???됰떞???먮뒗 鍮꾪뙋?쇰줈 ?ъ쁺?⑸땲?? 遺덉셿?꾪븳 ??몄쓣 ?섏슜?섎뒗 愿???곗뒿??愿怨꾨? ???띿슂濡?쾶 留뚮벊?덈떎.', warning:'怨쇰룄??湲곗? ?곸슜?쇰줈 ?명븳 愿怨??⑥젅. 遺덉셿?꾩꽦 ?섏슜 ?덈젴??愿嫄?' },
        '?몄씤': { title:'[?몄씤 二쇰룄] ?낆갹?겶룰굅由ш컧 ?덈뒗 愿怨??⑦꽩', pattern:'?몄씤??媛뺥븳 紐낆떇? 源딆씠 ?덈뒗 吏??援먮쪟瑜??좏샇?섎ŉ, ?됰쾾???쇱긽????붿뿉 ?쎄쾶 吏猷⑦븿???먮굧?덈떎. ?먯떊留뚯쓽 ?대㈃ ?멸퀎媛 ?띾??섏뿬 ?꾩슂 ?댁긽?쇰줈 ??멸낵 ?섏〈??愿怨꾨? 留뚮뱾吏 ?딆쑝???섎뒗?? ?닿쾬???몃??먯꽌???됰떞?섍굅??嫄곕쭔?섍쾶 蹂댁씪 ???덉뒿?덈떎. ?몄씤???낇듅???쒓컖???뚯닔??源딆? ?몄뿰?먭쾶??援됱옣??留ㅻ젰???섏?留? ?ㅼ닔?먭쾶???댄빐?섍린 ?대젮???щ엺?쇰줈 遺꾨쪟?⑸땲?? ?꾩씠?붿뼱媛 異⑸텇??臾대Ⅴ?듦린 ?꾩뿉 愿怨꾩뿉???댄깉?섎뒗 ?⑦꽩??諛섎났?섏뼱, ?κ린 ?뚰듃?덉떗 ?뺤꽦??援ъ“???대젮????덉뒿?덈떎. ?쇨????덈뒗 愿怨??좎? ?섎룄瑜??섏떇?곸쑝濡??쒗쁽?섎뒗 ?몃젰???꾩슂?⑸땲??', warning:'?덉륫 遺덇????댄깉 ?⑦꽩?쇰줈 ?명븳 ?좊ː 援ъ텞 ?대젮?. ?쇨????덈젴???듭떖.' },
        '?뺤씤': { title:'[?뺤씤 二쇰룄] ?숈뒿쨌吏??以묒떖??愿怨?援ъ“', pattern:'?뺤씤??媛뺥븳 紐낆떇? 議곗뼵?섍퀬 媛瑜댁튂怨?吏?먰븯????븷?먯꽌 愿怨꾩쓽 ?섎?瑜?李얠뒿?덈떎. ??몄쓽 ?깆옣???뺣뒗 ?곗꽌 留뚯”???살뼱 援먯쑁쨌?곷떞쨌吏??愿怨꾩뿉??鍮쏆쓣 諛쒗빀?덈떎. 洹몃윭??吏?섏튇 蹂댄샇? 吏?먯씠 ?곷????먯쑉?깆쓣 移⑦빐?섎뒗 諛⑺뼢?쇰줈 ?먮? ?? ?섏〈-媛덈벑 援ъ“媛 ?뺤꽦?⑸땲?? ?곷?媛 ?낅┰???좎뼵?덉쓣 ??諛쏄쾶 ?섎뒗 ?щ━??怨듯뿀媛먯씠 愿怨꾩뿉??諛섎났?곸씤 留ㅻ떖由??⑦꽩?쇰줈 ?댁뼱吏????덉뒿?덈떎. ?먰븳, 吏?앷낵 寃쏀뿕??怨쇳븯寃?怨듭쑀?섎젮???깊뼢???곷??먭쾶 媛뺤슂濡??먭뺨吏??寃껋씠 愿怨?留덉같??二쇱슂 ?먯씤?낅땲??', warning:'?섏〈 援ъ“ ?뺤꽦 ??媛덈벑. ?곷? ?먯쑉??議댁쨷怨???븷 遺꾨━媛 愿嫄?' },
        '鍮꾧껄': { title:'[鍮꾧껄 二쇰룄] ?낅┰?겶룰꼍?곸쟻 ????먮꼫吏', pattern:'鍮꾧껄??媛뺥븳 紐낆떇? 愿怨꾩뿉??媛뺥븳 ?먯븘 寃쎄퀎?좎쓣 ?좎??섎ŉ, ?곷?? ?숇벑???꾩튂???덉뼱???몄븞?⑥쓣 ?먮굧?덈떎. ?먯떊???곸뿭??移⑤쾾???덉슜?섏? ?딅뒗 ?먯쑉?깆씠 媛뺥븳 ?뚰듃?덈? ?좏깮?섎뒗 寃쏀뼢???덉쑝硫? ??寃쎌슦 ?쒕줈瑜?議댁쨷?섏?留??뺤꽌?곸쑝濡?源딆씠 ?곌껐?섏? ?딅뒗 愿怨??ㅽ??쇱씠 ?뺤꽦?⑸땲?? 鍮꾧껄 怨쇰떎 紐낆떇? ?ъ꽦(縕→삜)???쏀빐吏??援ъ“濡? 湲덉쟾 媛먭컖 ?뷀솕? ?댁꽦 ?뚰듃?덉떗 ?댁뒋媛 ?숈떆???섑??섍린 ?쎌뒿?덈떎. 愿怨??댁뿉??寃쎌웳 ?щ━媛 諛쒕룞?섎㈃ ?뚰듃?덈? ?묐젰?먭? ?꾨땶 寃쎌웳?먮줈 ?몄떇?섍린 ?쒖옉?섎ŉ, ?닿쾬??媛??源딆? 愿怨꾨? 臾대꼫?⑤━???⑦꽩?낅땲??', warning:'?뚰듃?덈? 寃쎌웳?먮줈 ?몄떇?섎뒗 ?⑦꽩 ?꾪뿕. ?묐젰 ?몄뼱 援ъ궗 ?덈젴???듭떖.' },
        '寃곸옱': { title:'[寃곸옱 二쇰룄] ?앹〈?빧룹쟾?듭쟻 愿怨??⑦꽩', pattern:'寃곸옱媛 媛뺥븳 紐낆떇? 愿怨꾩뿉?쒕룄 寃쎌웳 ?곗쐞瑜??뺣낫?섎젮??蹂몃뒫???꾨왂???묐룞?⑸땲?? ?곷????먯썝쨌?뺣낫쨌?곹뼢?μ쓣 痍⑦븯?ㅻ뒗 ?먮꼫吏媛 臾댁쓽?앹쟻?쇰줈 諛쒕룞?섏뼱, 二쇰??먯꽌 ?먰빐 蹂대뒗 ?먮굦??諛쏅뒗 寃쎌슦媛 諛섎났?⑸땲?? ?④린?곸쑝濡?愿怨꾩뿉???곗쐞瑜??먰븯吏留? ?κ린?곸쑝濡??좊ː瑜??껋뼱 ?뚰듃?덉떗 湲곕컲???붾뱾由щ뒗 ?⑦꽩??援ъ“?붾맗?덈떎. 媛먯젙 湲곕났??愿怨꾩뿉???덉륫 遺덇???諛섏쓳?쇰줈 ?섑????곷?瑜?遺덉븞?섍쾶 留뚮뱾 ???덉뒿?덈떎. ?좊ː ?곗꽑쨌寃쎌웳 ?꾩닚???먯튃???섏떇?곸쑝濡?愿怨꾩뿉 ?곸슜?섎뒗 寃껋씠 愿怨??κ린?붿쓽 ?듭떖?낅땲??', warning:'?좊ː 湲곕컲 ?먯긽 援ъ“ 諛섎났. ?섎룄???좊ː 援ъ텞 ?됰룞??愿怨?吏?띿꽦 寃곗젙.' }
      };
      var relData = RELATIONSHIP_PATTERN[dominant] || RELATIONSHIP_PATTERN['?몄옱'];
      html += '<div class="sb-nature-block">'
        + '<div class="sb-nature-tag">??RELATIONSHIP MATRIX ???멸컙愿怨?& ?뚰넻 ?⑦꽩 遺꾩꽍</div>'
        + '<div class="sb-nature-label">' + relData.title + '</div>'
        + '<p class="sb-nature-body">' + relData.pattern + '</p>'
        + '<div class="sb-nature-row"><span class="sb-nature-key">??愿怨??꾪뿕 ?ъ씤??/span><span class="sb-nature-val sb-nature-val--warn">' + relData.warning + '</span></div>';
      // ??꽦 遺꾪룷 湲곕컲 異붽? 遺꾩꽍
      var bijabN = (counts['鍮꾧껄']||0) + (counts['寃곸옱']||0);
      var jaeN   = (counts['?몄옱']||0) + (counts['?뺤옱']||0);
      var gwanN  = (counts['?멸?']||0) + (counts['?뺢?']||0);
      var sikN   = (counts['?앹떊']||0) + (counts['?곴?']||0);
      var inN    = (counts['?몄씤']||0) + (counts['?뺤씤']||0);
      var patterns = [];
      if (bijabN >= 3) patterns.push('鍮꾧쾪 ' + bijabN + '媛?怨쇱엵 ???낅┰쨌寃쎌웳 ?먮꼫吏 ??＜, ?묐젰 愿怨?留덉같 援ъ“???꾪뿕');
      if (gwanN >= 3) patterns.push('愿??' + gwanN + '媛?吏묒쨷 ??吏곸뾽쨌?몃? ?됯? ?뺣컯??移쒕? 愿怨꾨? ?ъ깮?쒗궎???⑦꽩');
      if (jaeN >= 3) patterns.push('?ъ꽦 ' + jaeN + '媛?怨쇰떎 ???댄빐쨌?ㅻ━ 湲곕컲 愿怨??몄쨷, 媛먯꽦 ?뚰듃?덉떗 ?쏀솕');
      if (sikN >= 3) patterns.push('?앹긽 ' + sikN + '媛????쒗쁽 怨쇱엵, ?곷? ?쇰줈媛??꾩쟻. 寃쎌껌쨌移⑤У??鍮꾩쑉 ?ъ“???꾩슂');
      if (inN >= 3) patterns.push('?몄꽦 ' + inN + '媛???吏???곗쐞 ?⑦꽩 二쇱쓽. 吏???섏〈 愿怨??몄뿉 ?섑룊 愿怨?援ъ텞 ?섏떇???몃젰 ?꾩슂');
      if (patterns.length) {
        html += '<div class="sb-nature-row"><span class="sb-nature-key">??꽦 遺꾪룷 寃쎈낫</span><span class="sb-nature-val sb-nature-val--warn">' + patterns.join(' / ') + '</span></div>';
      }
      html += '<div class="sb-nature-row"><span class="sb-nature-key">?뚰넻 ?ㅽ?????/span><span class="sb-nature-val">'
        + (dominant === '?앹떊' || dominant === '?곴?' ? '?띾???怨듦컧 ?몄뼱瑜?媛뺤젏?쇰줈 ?쒖슜?섎릺, ?곷?媛 留먰븷 怨듦컙??癒쇱? 留뚮뱶?몄슂.' :
           dominant === '?멸?' || dominant === '?뺢?' ? '紐⑺몴 以묒떖 ??붽? ?먯뿰?ㅻ읇吏留? 媛먯꽦???덉쟾 ?쒗쁽??蹂묓뻾??愿怨??⑤룄瑜??좎??섏꽭??' :
           dominant === '?몄옱' || dominant === '?뺤옱' ? '?ㅼ슜???몄뼱媛 媛뺤젏?댁?留? ?섎룄 ?녿뒗 ????쒓컙???뺢린?곸쑝濡?媛吏硫?愿怨?源딆씠媛 ?щ씪吏묐땲??' :
           dominant === '?몄씤' || dominant === '?뺤씤' ? '源딆? ?듭같???섎닃 ???덈뒗 ?뚯닔 ?뚰듃?덉뿉寃?吏묒쨷?섍퀬, 洹?愿怨꾨? ?κ린 ?ъ옄 愿?먯쑝濡?愿由ы븯?몄슂.' :
           '愿怨꾩뿉??痍⑥빟?깆쓣 ?쒗쁽?섎뒗 ?곗뒿???좊ː 援ъ텞??媛??鍮좊Ⅸ 寃쎈줈?낅땲??')
        + '</span></div>'
        + '</div>';
    })();

    /* ??Block 3: ?듬? 吏꾨떒 */
    var kwanStarCount = (counts['?멸?'] || 0) + (counts['?뺢?'] || 0);
    html += '<div class="sb-nature-block">'
      + '<div class="sb-nature-tag">??POWER SCAN ???듬?(?묉돳) 吏꾨떒</div>'
      + '<div class="sb-nature-power">??' + powerLabel + '</div>';
    if (isStrong && bijabPct >= 25) {
      html += '<p class="sb-nature-body sb-nature-alert">???쇨컙 怨쇨컯 寃쎈낫: ?숇쪟 ?먯냼 鍮꾩쨷 ' + bijabPct + '%.'
        + (jaePct < 15
          ? ' ?ъ꽦(' + (EL_KR[jaeEl] || '') + ') ' + jaePct + '% ???щЪ쨌?꾩떎 媛먭컖쨌?댁꽦 ?먮꼫吏媛 ?ш컖?섍쾶 痍⑥빟?⑸땲?? 媛뺥븳 ?먯븘媛 ?꾩떎 媛먭컖蹂대떎 ?욎꽌硫? ?λ젰 ?鍮?寃쎌젣???깃낵媛 援ъ“?곸쑝濡???섎맗?덈떎.'
          : ' 媛뺥븳 ?낅┰ ?먮꼫吏媛 ?묐젰 湲곕컲 ?낅Т?먯꽌 諛섎났 留덉같???쇱쑝?듬땲?? ?섎룄???묐젰 ?덈젴 ?놁씠 由щ뜑??쓣 諛쒗쐶?섎㈃ ????꾨땲???곸쓣 留뚮뱶??援ъ“?낅땲??')
        + '</p>';
    } else if (!isStrong) {
      if (kwanStarCount >= 2) {
        html += '<p class="sb-nature-body sb-nature-alert">??愿??若섉삜) 怨쇱븬 援ъ“: ?멸???' + kwanStarCount + '媛??댁긽 吏묒쨷?섏뼱 ?쇨컙??吏?띿쟻?쇰줈 ?쒖븬?⑸땲?? '
          + '?몃? 沅뚯쐞?????怨쇰룄???뺣컯, 留뚯꽦 湲댁옣, ?먭린鍮꾪뙋 諛섎났???대㈃???꾩쟻?⑸땲?? '
          + '???먮꼫吏瑜?諛⑹튂?섎㈃ 踰덉븘????媛묒옉?ㅻ윭???댄깉 ???ы쉶??怨좊┰ ?쒖꽌濡?吏꾪뻾?⑸땲?? '
          + '愿?몄긽??若섇뜲?며뵟) ???몄꽦(?경삜)??愿?깆쓽 ?뺣컯??吏?씲룹옄寃⑹쑝濡??뱁솕?섎뒗 援ъ“瑜?留뚮뱶??寃껋씠 ?좎씪??異쒓뎄?낅땲??</p>';
      } else {
        html += '<p class="sb-nature-body">?좎빟(翁ュ선) 援ъ“. 二쇰룄???ㅽ뻾蹂대떎 ?꾨Ц???ы솕? 吏??湲곕컲 援ъ텞???곗꽑 ?꾨왂?낅땲?? 臾대━???낅┰ 李쎌뾽蹂대떎 議곗쭅 ???꾨Ц吏곸뿉????웾??寃利앺븳 ???낅┰?섎뒗 寃껋씠 ?κ린 ?덉쟾?낅땲??</p>';
      }
    } else {
      html += '<p class="sb-nature-body">?ㅽ뻾 洹좏삎??鍮꾧탳???묓샇?⑸땲?? ??는룹꽭?댁쓽 蹂?붿뿉 ?곕씪 ?꾨왂???좎뿰?섍쾶 議곗젙?섏떗?쒖삤.</p>';
    }
    html += '</div>';

    /* ??Block 4: ?쒖뒪???대뱶諛붿씠?由?(?좊즺 ?좊룄) */
    var yr0 = new Date().getFullYear();
    var YRNAME0 = { 2025:'?꾩궗(阿쇿럼)', 2026:'蹂묒삤(訝쇿뜄)', 2027:'?뺣?(訝곫쑋)', 2028:'臾댁떊(?딁뵵)', 2029:'湲곗쑀(藥깁뀎)', 2030:'寃쎌닠(佯싨닃)' };
    var yrLabel0 = (YRNAME0[yr0] || yr0 + '??);
    var GAN_CHONG0 = { '??:'佯?,'佯?:'??,'阿?:'渦?,'渦?:'阿?,'訝?:'鶯?,'鶯?:'訝?,'訝?:'??,'??:'訝? };
    var YEAR_GAN0 = { 2025:'阿?, 2026:'訝?, 2027:'訝?, 2028:'??, 2029:'藥?, 2030:'佯? };
    var yearGan0 = YEAR_GAN0[yr0] || '訝?;
    var hasGanChong0 = dayGan && GAN_CHONG0[yearGan0] === dayGan;
    var ctaExtra = hasGanChong0
      ? '?뱁엳 ' + yr0 + ' ' + yrLabel0 + ' ?몄슫 泥쒓컙(' + yearGan0 + ')???뱀떊???쇨컙(' + dayGan + ')怨?<strong>吏곴꺽 泥쒓컙 異?/strong>???대（怨??덉뒿?덈떎. ???댁뿉 吏꾨줈쨌愿怨꽷룹젙泥댁꽦??洹쇰낯???ы렪???쇱뼱??媛?μ꽦???믪뒿?덈떎. '
      : '';
    html += '<div class="sb-nature-block sb-nature-block--cta">'
      + '<div class="sb-nature-tag">??SYSTEM ADVISORY ??遺꾩꽍 ?ы솕 ?덈궡</div>'
      + '<p class="sb-nature-body">' + ctaExtra
      + '???곗씠?곕뒗 ?먭뎅??<strong>?뺤쟻 援ъ“ 遺꾩꽍</strong>?낅땲?? ?ㅼ젣 ?대챸? <strong>?꾩옱 ?대뒓 ??댁뿉 ?꾩튂?섎뒗吏</strong>???곕씪 ?꾩쟾???щ씪吏묐땲?? '
      + '<strong>10???꾪뿕 怨꾩닔 洹몃옒??/strong>, 吏곸뾽 ?꾪솚 理쒖쟻 ??대컢, 愿怨?由ъ뒪?? '
      + '媛쒖슫 泥섎갑?꾩? <em class="sb-nature-hl">DOMINATOR REPORT</em>?먯꽌留??대엺?⑸땲??</p>'
      + '<div class="sb-nature-cta-hint">???섎떒 ??EXECUTE DOMINATOR (100肄붿씤) ?쇰줈 ?꾩껜 由ы룷???대엺</div>'
      + '</div>';

    return html;
  }

  /* ?? YEAR PULSE ???몄슫 異⑺삎 ?먮꼫吏 ?ㅼ틪 ?? */
  var YEAR_GAN_TBL = { 2024:'??, 2025:'阿?, 2026:'訝?, 2027:'訝?, 2028:'??, 2029:'藥?, 2030:'佯?, 2031:'渦?, 2032:'鶯?, 2033:'?? };
  var YEAR_ZHI_TBL = { 2024:'渦?, 2025:'藥?, 2026:'??, 2027:'??, 2028:'??, 2029:'??, 2030:'??, 2031:'雅?, 2032:'耶?, 2033:'訝? };
  var YEAR_NAME_TBL = { 2024:'媛묒쭊', 2025:'?꾩궗', 2026:'蹂묒삤', 2027:'?뺣?', 2028:'臾댁떊', 2029:'湲곗쑀', 2030:'寃쎌닠', 2031:'?좏빐', 2032:'?꾩옄', 2033:'怨꾩텞' };
  var ZHI_CHONG_TBL = { '耶?:'??,'??:'耶?,'訝?:'??,'??:'訝?,'野?:'??,'??:'野?,'??:'??,'??:'??,'渦?:'??,'??:'渦?,'藥?:'雅?,'雅?:'藥? };
  var ZHI_HE6_TBL = { '耶?:'訝?,'訝?:'耶?,'野?:'雅?,'雅?:'野?,'??:'??,'??:'??,'渦?:'??,'??:'渦?,'藥?:'??,'??:'藥?,'??:'??,'??:'?? };
  var GAN_CHONG_TBL = { '??:'佯?,'佯?:'??,'阿?:'渦?,'渦?:'阿?,'訝?:'鶯?,'鶯?:'訝?,'訝?:'??,'??:'訝? };
  var BANHE_SETS = [[['野?,'??,'??],'????掠'],[['??,'耶?,'渦?],'??麗?掠'],[['雅?,'??,'??],'紐???掠'],[['藥?,'??,'訝?],'湲???掠']];

  function _buildYearPulseHTML(pillars) {
    if (!pillars || !pillars.d) return '';
    var yr = new Date().getFullYear();
    var yg = YEAR_GAN_TBL[yr]; var yz = YEAR_ZHI_TBL[yr]; var yn = YEAR_NAME_TBL[yr];
    if (!yg || !yz) return '';
    var dg = pillars.d.g; var dj = pillars.d.j;
    var mj = pillars.m && pillars.m.j;
    var yj_g = pillars.y && pillars.y.j;
    var signals = [];
    /* 泥쒓컙 異?*/
    if (GAN_CHONG_TBL[yg] === dg) {
      var ts = null; try { ts = _calcTenStar(dg, yg); } catch(e) {}
      signals.push({ lv:'danger', msg:'??' + yr + ' ' + yn + '?????몄슫 泥쒓컙(' + yg + ')???쇨컙(' + dg + ')怨?<strong>吏곴꺽 泥쒓컙 異?/strong>. [' + (ts || '異?) + '] 吏꾨줈쨌?뺤껜?굿룻빑??愿怨꾩뿉 洹쇰낯???붾뱾由쇱씠 諛쒖깮?⑸땲?? 湲곗〈 ?덉젙 湲곕컲(吏곸옣쨌?뚰듃?덉떗쨌嫄곗＜吏)???덉륫 遺덇? 洹좎뿴 媛?μ꽦.' });
    }
    /* ?쇱? 異?*/
    if (ZHI_CHONG_TBL[yz] === dj) {
      signals.push({ lv:'danger', msg:'???쇱?(' + dj + ')쨌?몄슫吏(' + yz + ') <strong>吏吏 異?/strong>. 諛곗슦?먃룰컧??湲곕컲쨌嫄닿컯(?ъ떊)??吏곸젒 異⑷꺽 ?먮꼫吏媛 ?좎엯?⑸땲?? ?대퀎, ?댁궗, ?섏닠 ?대깽??諛쒖깮 媛?μ꽦 利앷?.' });
    }
    /* ?붿? 異?*/
    if (mj && ZHI_CHONG_TBL[yz] === mj) {
      signals.push({ lv:'warn', msg:'???붿?(' + mj + ')쨌?몄슫吏(' + yz + ') 異? 吏곸뾽쨌?ъ젙 湲곕컲??蹂???먮꼫吏 ?좎엯. ?댁쭅쨌?꾩쭅쨌?ъ뾽 ?ы렪 媛?μ꽦 ?곸듅.' });
    }
    /* ?곗? 異?*/
    if (yj_g && ZHI_CHONG_TBL[yz] === yj_g) {
      signals.push({ lv:'warn', msg:'???곗?(' + yj_g + ')쨌?몄슫吏(' + yz + ') 異? 媛議굿룸퓣由?룰퀬?κ낵 ?곌???蹂???먮꼫吏 媛먯?.' });
    }
    /* ?쇱? ????洹??*/
    if (ZHI_HE6_TBL[yz] === dj) {
      signals.push({ lv:'ok', msg:'???몄슫吏(' + yz + ')쨌?쇱?(' + dj + ') ?≫빀(??릦). ' + yr + '??洹?맞룻뙆?몃꼫???뺤꽦 ?먮꼫吏 ?곸듅. 以묒슂???몄뿰???대┫ ???덉뒿?덈떎.' });
    }
    /* 諛섑빀 */
    BANHE_SETS.forEach(function(g) {
      var trio = g[0]; var nm = g[1];
      if (trio.indexOf(yz) >= 0 && (trio.indexOf(dj) >= 0 || trio.indexOf(mj) >= 0)) {
        var effMap = { '????掠':'?ъ꽦(縕→삜) ?쒖꽦?????щЪ쨌紐낆삁 湲고쉶 ?좎엯.', '??麗?掠':'鍮꾧쾪 媛뺥솕 ???낅┰ ?섏? ?곸듅, ?묐젰 留덉같 利앷?.', '紐???掠':'?앹긽 ??컻 ??李쎌옉쨌?쒗쁽쨌?먮? ?먮꼫吏 湲됱쬆.', '湲???掠':'?몄꽦 媛뺥솕 ???숇Ц쨌?먭꺽쨌洹??吏??利앺룺.' };
        signals.push({ lv:'info', msg:'???몄슫吏(' + yz + ')? 紐낆떇??<strong>' + nm + '</strong> ?뺤꽦. ' + (effMap[nm] || '') });
      }
    });
    if (!signals.length) {
      signals.push({ lv:'neutral', msg:'??' + yr + ' ' + yn + '????紐낆떇??吏곴꺽 異⑺삎 ?놁쓬. ?쇨컙 ?먮꼫吏 蹂댁〈 ?곹깭. ?닿났 異뺤쟻 ?곴린.' });
    }
    var html = '<div class="sb-nature-block sb-ypulse-block">';
    html += '<div class="sb-nature-tag">??YEAR PULSE ??' + yr + ' ' + yn + '???몄슫 異⑷꺽 ?ㅼ틪</div>';
    signals.forEach(function(s) {
      html += '<div class="sb-ypulse-row sb-ypulse-' + s.lv + '">' + s.msg + '</div>';
    });
    html += '<div class="sb-ypulse-cta">&#9660; ?몄슫 ?꾧린 ?꾪솕 ?꾨왂쨌3??蹂怨≪젏쨌媛쒖슫 泥섎갑? <strong>DOMINATOR REPORT</strong>?먯꽌留??뺤씤?⑸땲??</div>';
    html += '</div>';
    return html;
  }

  /* ?? INNER PALACE SCAN ???쇱?(?ζ뵱) 鍮꾨?沅?遺꾩꽍 ?? */
  var DAY_BRANCH_ORACLE = {
    '耶?:{ code:'AQUA_SEED_v1', title:'?먯닔(耶먩객) ???쒖옉???먯젏', oracle:'媛???쒖닔???쒖옉 ?먮꼫吏. ?좎옱?μ? 臾댄븳?섏?留?諛⑺뼢 ?놁씠??利앸컻?⑸땲?? ?대㈃??源딆? 吏?깆? 援ъ“瑜??ㅼ뒪濡?留뚮뱾?댁빞留??몃? ?멸퀎? ?곌껐?⑸땲??', spouse:'諛곗슦?먭턿 ?먮꼫吏: 鍮꾧쾪 怨꾩뿴 ???뚰듃?덇? 寃쎌웳?먭? ?????덉쓬. ?낅┰???뚰듃???좏샇 ?꾩뿰.' },
    '訝?:{ code:'EARTH_VAULT_v2', title:'異뺥넗(訝묈쐿) ??遊됱씤??蹂닿퀬(野뜹벴)', oracle:'?ロ엺 湲덇퀬. ?쒕㈃? ?뷀븯吏留??대????⑷툑 留μ씠 ?먮쫭?덈떎. ?대━?????쒓컙??嫄몃━吏留? ??踰?媛쒕갑?섎㈃ 留됱쓣 ???놁뒿?덈떎.', spouse:'諛곗슦?먭턿 ?먮꼫吏: 愿??鍮꾧쾪+?몄꽦 ?쇱옱 ???뚯떊-媛덈벑 二쇨린 諛섎났.' },
    '野?:{ code:'WOOD_IGNITION_v3', title:'?몃ぉ(野끾쑉) ???먰솕???⑥븮', oracle:'遊꾩쓽 泥??뚯뿴. 媛뺣젹???쒖옉 ?먮꼫吏媛 ??긽 ??컻??以鍮꾪빀?덈떎. ?쒖옉? ?뚮??섏?留??꾩＜ 蹂몃뒫??蹂꾨룄濡??ㅼ썙???⑸땲??', spouse:'諛곗슦?먭턿 ?먮꼫吏: ?앹긽+?ъ꽦+愿???쇱옱 ???쒕컻?섏?留??쒖뼱 ?대젮???뚰듃??' },
    '??:{ code:'SOFT_BLADE_v4', title:'臾섎ぉ(??쑉) ??議곗슜??????', oracle:'蹂댁씠吏 ?딄쾶 ?좎뭅濡쒖슫 紐??먮꼫吏. ??몄쓽 媛먯젙???뺥솗???섏떊?섎뒗 ???덊뀒?섍? 臾닿린媛 ?섍굅???곸쿂媛 ?⑸땲??', spouse:'諛곗슦?먭턿 ?먮꼫吏: 鍮꾧쾪 怨꾩뿴 ???낅┰?곸씠怨?寃쎌웳?곸씤 ?뚰듃??' },
    '渦?:{ code:'DRAGON_VAULT_v5', title:'吏꾪넗(渦겼쐿) ???⑹쓽 李쎄퀬(麗닷벴)', oracle:'紐⑤뱺 ?ㅽ뻾????ν븯???섍퀬(麗닷벴). ?쒕㈃? ?잛씠吏留??대???麗는룡쑉쨌?잕? 怨듭〈?⑸땲?? ??蹂듭옟???대㈃??李쎌쓽???꾨젰?깃낵 ?덉륫 遺덇????щ━ 蹂?숈쓣 ?숈떆??留뚮벊?덈떎. ?뺣컯??媛뺥븷?섎줉 ?대㈃?먯꽌 臾댁뼵媛 ??컻?⑸땲??', spouse:'諛곗슦?먭턿 ?먮꼫吏: ?멸?+?곴?+寃곸옱 ?쇱옱 ???듭젣-?먯쑀 媛덈벑 援ъ“ ?댁옱.' },
    '藥?:{ code:'FIRE_CIRCUIT_v6', title:'?ы솕(藥녕겓) ??湲고룺 ?뚮줈', oracle:'遊됱씤???붽린媛 ??컻 吏곸쟾 ?곹깭. ?쒗쁽 梨꾨꼸留??뺣낫?섎㈃ 遺덇만泥섎읆 踰덉쭛?덈떎. ?듭젣 ?녿뒗 ?댁젙? 紐⑤뱺 寃껋쓣 ?쒖슱 ???덉뒿?덈떎.', spouse:'諛곗슦?먭턿 ?먮꼫吏: ?ъ꽦+愿???몄꽦 ?쇱옱 ???λ젰 ?덈뒗 ?뚰듃?? ?뚯쑀??異⑸룎.' },
    '??:{ code:'SOLAR_PEAK_v7', title:'?ㅽ솕(?덄겓) ???쒖뼇???뺤젏', oracle:'理쒓퀬議곗쓽 鍮? ?붾젮?섏?留?鍮좊Ⅴ寃??뚯쭊?⑸땲?? 臾대? ?놁씠???먮꼫吏媛 ?대?濡??ν빐 ?먭린?뚭눼?곸씠 ?⑸땲??', spouse:'諛곗슦?먭턿 ?먮꼫吏: ?ъ꽦+?멸?+?뺤옱 ?쇱옱 ???붾젮?섏?留?蹂?뺤뒪?ъ슫 ?뚰듃???몄뿰.' },
    '??:{ code:'EARTH_DUSK_v8', title:'誘명넗(?ゅ쐿) ???щ쫫???⑺샎', oracle:'?띿슂濡??留??뚯쭊???먮꼫吏. 二쇰뒗 ???듭닕?섏?留?諛쏅뒗 力뺤쓣 諛곗슦吏 ?딆쑝硫??먮꼫吏 怨좉컝??諛섎났?⑸땲??', spouse:'諛곗슦?먭턿 ?먮꼫吏: 愿???곴?+?ъ꽦 ?쇱옱 ???ъ꽭?섍퀬 媛먯꽦?곸씤 ?뚰듃?? ?낅┰???붽뎄.' },
    '??:{ code:'METAL_ZERO_v9', title:'?좉툑(?녜뇫) ???됯컖??移?, oracle:'媛먯젙 ?놁씠 ?곹솴???대??섎뒗 ?됱젙??遺꾩꽍 ?먮꼫吏. ???됱젙?⑥씠 臾몄젣 ?닿껐??臾닿린?댁옄, ??멸낵??媛먯젙 ?곌껐???딅뒗 ?λ꼍?낅땲??', spouse:'諛곗슦?먭턿 ?먮꼫吏: ?몄꽦+鍮꾧쾪+愿???쇱옱 ??吏?곸씠怨??낅┰?곸씤 ?뚰듃??' },
    '??:{ code:'PURE_EDGE_v10', title:'?좉툑(?됮뇫) ???쒖닔???좊걹', oracle:'遺덉닚臾쇱쓣 ?덉슜?섏? ?딅뒗 ?꾨꼍二쇱쓽 ?먮꼫吏. ?곸썡???꾩꽦?꾨? 留뚮뱾吏留? 湲곗? 李⑥씠濡??명븳 ?ㅻ쭩怨?怨좊┰??諛섎났?⑸땲??', spouse:'諛곗슦?먭턿 ?먮꼫吏: 鍮꾧쾪 怨꾩뿴 ???쒕줈 ?낅┰??異붽뎄?섎뒗 ?뚰듃??援ъ“.' },
    '??:{ code:'FIRE_TOMB_v11', title:'?좏넗(?뚦쐿) ???붿쓽 臾대뜡', oracle:'?붽린??李쎄퀬?댁옄 臾대뜡. ?됱떆?먮뒗 ?좎옱?μ씠 ?⑥뼱 怨쇱냼?됯?諛쏆?留? ??컻?섎㈃ 嫄룹옟?????놁뒿?덈떎.', spouse:'諛곗슦?먭턿 ?먮꼫吏: 愿???몄꽦+?ъ꽦 ?쇱옱 ???λ젰 ?덇퀬 ?좊ː?????덈뒗 ?뚰듃??' },
    '雅?:{ code:'DEEP_CIRCUIT_v12', title:'?댁닔(雅ζ객) ???ъ링 ?뚮줈', oracle:'媛??源딆? ??麗???洹쇱썝. 臾댄븳???좎옱?μ씠 蹂댁씠吏 ?딅뒗 怨녹뿉 ?덉뒿?덈떎. 吏곴????곗뼱?섏?留?源딆? ?댄뼢?깆쑝濡????λ젰???몄긽怨??곌껐?섎뒗 寃껋씠 ?곴뎄 怨쇱젣?낅땲??', spouse:'諛곗슦?먭턿 ?먮꼫吏: 鍮꾧쾪+?앹떊 怨꾩뿴 ???먯쑀濡?퀬 李쎌쓽?곸씤 ?뚰듃?? 援ъ냽 嫄곕?.' }
  };

  function _buildDayBranchScan(pillars) {
    if (!pillars || !pillars.d) return '';
    var dj = pillars.d.j;
    var info = DAY_BRANCH_ORACLE[dj];
    if (!info) return '';
    var html = '<div class="sb-nature-block sb-dbs-block">';
    html += '<div class="sb-nature-tag">??INNER PALACE SCAN ???쇱?(?ζ뵱) ' + dj + ' 鍮꾨?沅?遺꾩꽍</div>';
    html += '<div class="sb-dbs-header">';
    html += '<span class="sb-dbs-chip">SOUL CHIP: ' + info.code + '</span>';
    html += '<span class="sb-dbs-title">' + info.title + '</span>';
    html += '</div>';
    html += '<p class="sb-nature-body">' + info.oracle + '</p>';
    html += '<div class="sb-nature-row"><span class="sb-nature-key">諛곗슦?먭턿</span><span class="sb-nature-val sb-nature-val--warn">' + info.spouse + '</span></div>';
    html += '<div class="sb-dbs-cta">&#9660; ?꾩옱 ?댁뿉?????먮꼫吏媛 ?대뼸寃?諛쒕룞?섎뒗吏, ?몄뿰쨌吏곸뾽 理쒖쟻 ??대컢? <strong>DOMINATOR REPORT</strong>?먯꽌 ?뺤씤?섏꽭??</div>';
    html += '</div>';
    return html;
  }

  function _buildSibylRecoveryOverview(pillars, knownRisk, knownCoeff) {
    var core = pillars || window.G_PILLARS || null;
    var dist;
    var counts;
    var domEl;
    var dominant;
    var risk = _safeScore(knownRisk, SIBYL_DEFAULT_RISK_SCORE, 0, 100);
    var coeff = _safeScore(knownCoeff, SIBYL_DEFAULT_APTITUDE_SCORE, 0, 999);

    try { dist = _ohaengDist(core); } catch (_) { dist = { wood: 1, fire: 1, earth: 1, metal: 1, water: 1, total: 5 }; }
    try { counts = _analyzeTenStars(core); } catch (_) { counts = {}; }
    try { domEl = _dominantEl(dist); } catch (_) { domEl = 'water'; }
    dominant = _safeText(_dominantTenStar(counts), SIBYL_PRIMARY_TENGOD_FALLBACK);

    var monthly = [];
    try {
      monthly = _buildMonthlyRiskPlan(core, domEl, dominant, risk, new Date().getFullYear(), {
        pillars: core,
        dominantEl: domEl,
        dominantTenStar: dominant
      }) || [];
    } catch (_) {
      monthly = [];
    }

    if (!Array.isArray(monthly) || !monthly.length) {
      monthly = [
        { month: 1, risk: risk, focus: '湲곕낯 猷⑦떞 怨좎젙', caution: '?섏궗寃곗젙 ?띾룄 怨쇱뿴 二쇱쓽' },
        { month: 2, risk: _clamp(risk + 6, 0, 100), focus: '愿怨?而ㅻ??덉??댁뀡 ?먭?', caution: '媛먯젙 諛섏쓳 ?꾩쟻 二쇱쓽' },
        { month: 3, risk: _clamp(risk - 4, 0, 100), focus: '?깃낵 ?뺣━/?뺤옣', caution: '臾대━???뺤옣 二쇱쓽' }
      ];
    }

    var ordered = monthly.slice().sort(function(a, b) { return b.risk - a.risk; }).slice(0, 3);
    var riskTone = risk >= 70 ? 'high' : (risk >= 45 ? 'medium' : 'low');
    var riskHeadline = riskTone === 'high'
      ? '?④린 蹂?숈꽦???믪? 援ш컙?낅땲?? 怨쇱냽 ?섏궗寃곗젙??二쇱쓽?섏꽭??'
      : (riskTone === 'medium'
        ? '?듭떖 猷⑦떞???좎??섎㈃ ?덉젙沅?吏꾩엯??媛?ν븳 援ш컙?낅땲??'
        : '?덉젙 ?먮쫫???곗꽭??援ш컙?낅땲?? ?뺤옣? ?④퀎?곸쑝濡?吏꾪뻾?섏꽭??');
    var action = dominant === '?멸?' || dominant === '?뺢?'
      ? '洹쒖튃쨌寃利?湲곕컲 ?ㅽ뻾???좎??섍퀬, 愿怨???붾뒗 寃곕줎蹂대떎 留λ씫 ?ㅻ챸??癒쇱? 諛곗튂?섏꽭??'
      : dominant === '?몄옱' || dominant === '?뺤옱'
        ? '?ъ젙쨌?쇱젙 濡쒓렇瑜?媛숈? 二쇨린??臾띠뼱 ?꾩닔遺??李⑤떒?섍퀬, ?덉젙 ?붿뿉留??뺤옣?섏꽭??'
        : '媛뺤젏 異뺤쓣 ??踰덉뿉 ?섎굹留?諛怨? 二쇨컙 ?뚮났 猷⑦떞??怨좎젙??蹂?숈꽦??癒쇱? 以꾩씠?몄슂.';

    return {
      risk: risk,
      coeff: coeff,
      dominant: dominant,
      domEl: domEl,
      topMonths: ordered,
      riskTone: riskTone,
      riskHeadline: riskHeadline,
      action: action,
    };
  }

  function _buildSibylRecoveryHtml(overview) {
    var esc = function(value) {
      return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
    var tone = overview.riskTone || (overview.risk >= 70 ? 'high' : (overview.risk >= 45 ? 'medium' : 'low'));
    var toneLabel = tone === 'high' ? '二쇱쓽 媛뺥솕 援ш컙' : (tone === 'medium' ? '洹좏삎 ?먭? 援ш컙' : '?덉젙 援ш컙');
    var monthCards = (overview.topMonths || []).map(function(item) {
      var monthValue = Number(item && item.month);
      var monthLabel = (isFinite(monthValue) ? monthValue : 0);
      var riskValue = _safeScore(item && item.risk, overview.risk, 0, 100);
      var focusText = esc(item && item.focus || '?듭떖 猷⑦떞 ?좎?');
      var cautionText = esc(item && item.caution || '蹂?숈꽦 紐⑤땲?곕쭅');
      return ''
        + '<article class="sb-free-recovery-month-card">'
        + '<div class="sb-free-recovery-month-head">'
        + '<span class="sb-free-recovery-month-label">' + String(monthLabel).padStart(2, '0') + '??/span>'
        + '<span class="sb-free-recovery-month-risk">?꾪뿕 ' + riskValue + '</span>'
        + '</div>'
        + '<p class="sb-free-recovery-month-focus">' + focusText + '</p>'
        + '<p class="sb-free-recovery-month-caution">二쇱쓽: ' + cautionText + '</p>'
        + '</article>';
    }).join('');
    if (!monthCards) {
      monthCards = '<div class="sb-free-recovery-month-empty">?붾퀎 ?꾪뿕 ?곗씠?곕? 怨꾩궛 以묒엯?덈떎.</div>';
    }

    return ''
      + '<div class="sb-nature-block">'
      + '<div class="sb-nature-tag">??CORE MATRIX ??臾대즺 湲곕낯 寃곌낵</div>'
      + '<div class="sb-free-recovery-chips">'
      + '<span class="sb-free-recovery-chip sb-free-recovery-chip--mode">RECOVERY MODE</span>'
      + '<span class="sb-free-recovery-chip sb-free-recovery-chip--risk-' + tone + '">' + toneLabel + '</span>'
      + '</div>'
      + '<p class="sb-nature-body">湲곕낯 怨꾩궛 ?붿쭊??蹂듦뎄 紐⑤뱶濡??꾪솚??臾대즺 寃곌낵瑜??곗꽑 ?쒓났?⑸땲?? ?좊즺 ?꾨??ㅼ씠??由ы룷?몄? 蹂꾧컻濡??듭떖 吏?쒕뒗 怨꾩냽 ?뺤씤?????덉뒿?덈떎.</p>'
      + '<div class="sb-nature-row"><span class="sb-nature-key">?꾪뿕 怨꾩닔</span><span class="sb-nature-val sb-nature-val--warn">' + overview.risk + ' / 100</span></div>'
      + '<div class="sb-nature-row"><span class="sb-nature-key">?곸꽦 怨꾩닔</span><span class="sb-nature-val">' + overview.coeff + ' / 999</span></div>'
      + '<div class="sb-nature-row"><span class="sb-nature-key">二쇰룄 ??꽦</span><span class="sb-nature-val">' + overview.dominant + '</span></div>'
      + '<div class="sb-nature-row"><span class="sb-nature-key">吏諛??ㅽ뻾</span><span class="sb-nature-val">' + (EL_KR[overview.domEl] || overview.domEl) + '</span></div>'
      + '<p class="sb-nature-body">' + esc(overview.riskHeadline || '') + '</p>'
      + '</div>'
      + '<div class="sb-nature-block">'
      + '<div class="sb-nature-tag">??TIMING SNAPSHOT ???붾퀎 ?꾪뿕 ?곸쐞 援ш컙</div>'
      + '<div class="sb-free-recovery-month-grid">' + monthCards + '</div>'
      + '</div>'
      + '<div class="sb-nature-block">'
      + '<div class="sb-nature-tag">??ACTION GUIDE ??臾대즺 ?ㅽ뻾 媛?대뱶</div>'
      + '<p class="sb-nature-body">' + overview.action + '</p>'
      + '<div class="sb-nature-row"><span class="sb-nature-key">?좊즺? 援щ텇</span><span class="sb-nature-val">臾대즺???붿빟/湲곕낯 吏?? 100肄붿씤? 10梨뺥꽣 ?λЦ 由ы룷???좉툑 ?댁젣 ?꾩슜?낅땲??</span></div>'
      + '<ul class="sb-free-recovery-checklist">'
      + '<li>臾대즺 寃곌낵??湲곕낯 吏?쒖? ?붾퀎 ?곗꽑?쒖쐞瑜?吏???쒓났?⑸땲??</li>'
      + '<li>?좊즺 100肄붿씤? ?꾨??ㅼ씠??10梨뺥꽣 由ы룷???좉툑 ?댁젣 ?꾩슜?낅땲??</li>'
      + '<li>蹂듦뎄 紐⑤뱶 ?댁젣 ???곸꽭 怨꾩궛 寃곌낵媛 ?먮룞?쇰줈 媛깆떊?⑸땲??</li>'
      + '</ul>'
      + '</div>';
  }

  /* ?? 媛쒖슫踰??앹꽦 (?⑹떊 湲곕컲) ?? */
  function _buildRemedies(dominant, dominantEl) {
    var remedyMap = {
      wood: ['?섍꼍: ?숈そ 諛⑺뼢 ?뺣━쨌?쒖꽦?? 珥덈줉 怨꾩뿴 ?앸Ъ 諛곗튂', '?됰룞: ?덈꼍 ?곗콉쨌?ㅽ듃?덉묶?쇰줈 紐??? ?먮꼫吏 異⑹쟾', '?됱긽: 珥덈줉쨌泥?깋 怨꾩뿴 ?섎쪟쨌?뚰뭹 ?쒖슜', '?앹씠: ?좊쭧 ?뚯떇(?덈が, ?뱀감, 諛쒗슚 ?뚮즺) ??랬'],
      fire: ['?섍꼍: 議곕룄 ?믪? 諛앹? 怨듦컙?먯꽌 ?쒕룞', '?됰룞: ?쒕컻???ㅽ듃?뚰궧쨌??붾줈 ???? 湲곗슫 利앺룺', '?됱긽: ?곸깋쨌?ㅻ젋吏 怨꾩뿴 ?ъ씤??, '?앹씠: ?대쭧 ?앺뭹(?꾨찓由ъ뭅?? ?? ?ъ＜) 沅뚯옣'],
      earth: ['?섍꼍: ?⑹깋쨌媛덉깋 怨꾩뿴 ?명뀒由ъ뼱, ?꾩옄湲??뚰뭹 諛곗튂', '?됰룞: 袁몄???猷⑦떞 ?좎?, ?덈줈???먭꺽利씲룻븰?듭쑝濡????? 媛뺥솕', '?됱긽: ?⑺넗쨌踰좎씠吏 怨꾩뿴', '?앹씠: ?⑤쭧 ?뚯떇(怨좉뎄留? 轅, ?異? ?곸젅??],
      metal: ['?섍꼍: ?쒖そ쨌遺곸꽌履?怨듦컙 ?뺣━?뺣룉, ?쨌?곗깋 怨꾩뿴', '?됰룞: 洹쒖쑉쨌?먯튃 媛뺥솕, 紐낆긽쨌吏묒쨷 ?덈젴', '?됱긽: ?곗깋쨌?뚯깋쨌???怨꾩뿴 ?섎쪟', '?앹씠: 留ㅼ슫留??앺뭹(怨좎텛, ?앷컯, 留덈뒛) ?곸젅??],
      water: ['?섍꼍: 遺곸そ 李쎄? ?묒뾽 怨듦컙, 釉붾（ 怨꾩뿴 ?뚰뭹', '?됰룞: ?곌뎄쨌?숈뒿쨌?낆꽌濡???麗? ?먮꼫吏 異뺤쟻', '?됱긽: 寃?빧룹쭊?⑥깋 怨꾩뿴 ?ъ씤??, '?앹씠: 吏좊쭧 ?앺뭹(?뺤젣 ?뚭툑, ?쒖옣, 誘몄뿭) 洹좏삎']
    };
    var base = remedyMap[dominantEl] || remedyMap.water;
    // ??꽦蹂?異붽? 泥섎갑
    var extraMap = {
      '?앹떊': '?앹떊쨌?곴? ?먮꼫吏: 李쎌쓽 ?쒕룞(湲?곌린쨌?뚯븙쨌?덉닠)???뺢린???ъ옄濡??щ뒫 梨꾨꼸留?,
      '?멸?': '?멸? 媛뺥솕 ?쒓린: 洹쒖튃?곸씤 ?대룞 猷⑦떞?쇰줈 愿??若섉삜)???뺣컯 ?먮꼫吏瑜?湲띿젙 ?댁냼',
      '?뺢?': '?뺢? ?덉젙湲? 怨듭떇 ?먭꺽利씲룹쭅??痍⑤뱷?쇰줈 愿?깆쓽 ?뺣떦??媛뺥솕',
      '?몄옱': '?몄옱 ?쒖꽦?? ?④린 ?ы뀒?щ낫???κ린 ?먯궛 諛곕텇?쇰줈 ?щЪ 遺꾩궛 由ъ뒪??愿由?,
      '?몄씤': '?몄씤 媛뺥솕: ?꾨Ц ?먭꺽쨌?ы솕 ?숈뒿?쇰줈 ?몄꽦(?경삜) 吏???먯궛???꾧툑 ?먮쫫怨??곌껐'
    };
    var extra = extraMap[dominant];
    if (extra) base = [extra].concat(base);
    return base.slice(0, 4);
  }

  /* ?????????????????????????????????
     UI ?낅뜲?댄듃 ?ы띁
  ????????????????????????????????? */
  function _q(id) { return document.getElementById(id); }
  function _t(id, text) { var el = _q(id); if (el) el.textContent = text; }
  function _html(id, html) { var el = _q(id); if (el) el.innerHTML = html; }

  /* ?? ?ㅼ틪 ?좊땲硫붿씠??(珥덇퀬???꾨━誘몄뾼 理쒖쟻??- 蹂묐ぉ 泥닿컧 ?꾩쟾 ?쒓굅) ?? */
  function _runScanAnim(onDone) {
    var scanSec = _q('sb-scan-section');
    if (scanSec) scanSec.classList.remove('sb-hidden');
 
    var barIds = ['sbBarOhaeng','sbBarTenstar','sbBarRisk','sbBarApt','sbBarHue'];
    var targets = [100, 100, 100, 100, 100];
    // 珥덇퀬???ㅼ틪 ?좊땲硫붿씠?섏쑝濡??쒕젅??李⑤떒 (0.6珥??대궡 ?꾨즺)
    barIds.forEach(function(id, i) {
      var fill = _q(id);
      if (!fill) return;
      var delay = i * 80;
      setTimeout(function() {
        fill.style.width = targets[i] + '%';
        var pct = _q(id + 'Pct');
        if (pct) {
          var start = 0, end = targets[i], dur = 350;
          var startTime = null;
          function step(ts) {
            if (!startTime) startTime = ts;
            var prog = Math.min((ts - startTime) / dur, 1);
            pct.textContent = Math.floor(prog * end) + '%';
            if (prog < 1) requestAnimationFrame(step);
          }
          requestAnimationFrame(step);
        }
      }, delay);
    });
 
    setTimeout(function() {
      if (scanSec) scanSec.classList.add('sb-hidden');
      if (onDone) onDone();
    }, 600);
  }

  /* ?? 臾대즺 ?뱀뀡 ?뚮뜑留??? */
  function _renderFreeSection(pillars, natal) {
    try {
      var normalized = _normalizeSibylInput({ pillars: pillars }, { pillars: pillars });
      _sibylLogInfo('[SIBYL] normalized input', normalized);
      if (normalized && normalized.sourceStatus && normalized.sourceStatus.fallbackUsed) {
        _sibylLogWarn('[SIBYL] KASI fallback used', {
          reason: 'normalized.sourceStatus.fallbackUsed',
          sourceStatus: normalized.sourceStatus
        });
      }
      var corePillars = normalized.pillars || pillars || window.G_PILLARS;
      var dist = normalized.dist || _ohaengDist(corePillars);
      var domEl = normalized.dominantEl || _dominantEl(dist);
      var clarity = _hueClarityStatus(dist);
      var hueData = EL_DESTINY_HUE[domEl] || EL_DESTINY_HUE.water;

      // Ohaeng bars
      EL_ORDER.forEach(function(el) {
        var pct = dist.total > 0 ? Math.round((dist[el]||0) / dist.total * 100) : 0;
        var fill = _q('sbOhaengFill_' + el);
        var pctEl = _q('sbOhaengPct_' + el);
        if (fill) setTimeout(function(){ fill.style.width = pct + '%'; }, 100);
        if (pctEl) pctEl.textContent = pct + '%';
      });

      // Destiny Hue swatch
      var swatch = _q('sbHueSwatch');
      if (swatch) swatch.style.background = hueData.hex;

      _t('sbHueName', hueData.name + ' 쨌 ' + EL_KR[domEl]);
      var statusEl = _q('sbHueStatus');
      if (statusEl) {
        statusEl.textContent = clarity === 'clear' ? '???대━??Clear) ???ㅽ뻾 洹좏삎???묓샇' : '???곹븿(Cloudy) ???ㅽ뻾 ?몄쨷 ?먮뒗 寃고븤 媛먯?';
        statusEl.className = 'sb-hue-status sb-hue-status--' + (clarity === 'clear' ? 'clear' : 'cloudy');
      }

      // Pillar display
      if (corePillars) {
        var cp = _pillarChars(corePillars);
        var cols = [
          { id:'sbPillarYanG', val:cp.y.g }, { id:'sbPillarYanJ', val:cp.y.j },
          { id:'sbPillarMoG',  val:cp.m.g }, { id:'sbPillarMoJ',  val:cp.m.j },
          { id:'sbPillarDaG',  val:cp.d.g }, { id:'sbPillarDaJ',  val:cp.d.j },
          { id:'sbPillarSiG',  val:cp.h.g }, { id:'sbPillarSiJ',  val:cp.h.j }
        ];
        cols.forEach(function(c){ _t(c.id, c.val || '誘몄젙'); });
      }

      var counts = normalized.tenStarCounts || {};
      var dominant = normalized.dominantTenStar || SIBYL_PRIMARY_TENGOD_FALLBACK;
      var secData = TENSTAR_SECTOR[dominant] || TENSTAR_SECTOR['?몄옱'];
      var annualPreview = _buildAnnualRiskPlan(normalized, normalized.currentYear || new Date().getFullYear());
      var monthlyPreview = _buildMonthlyRiskPlan(
        corePillars,
        domEl,
        dominant,
        45,
        normalized.currentYear || new Date().getFullYear(),
        normalized
      );
      var conflictSignals = _collectCollisionSignals(corePillars, normalized.currentYear || new Date().getFullYear());
      var riskBreakdown = _calcRiskBreakdown(normalized, monthlyPreview, annualPreview, conflictSignals);
      var aptData = _calcAptitudeComponents(normalized, riskBreakdown);
      var canonicalData = _buildSibylCanonicalData(normalized, riskBreakdown, aptData, annualPreview, monthlyPreview);
      var normalizedProfile = sanitizeSibylProfile((canonicalData && canonicalData.normalizedProfile) || canonicalData || {});
      var coeff = _safeScore(normalizedProfile && normalizedProfile.scores && normalizedProfile.scores.aptitudeScore, SIBYL_DEFAULT_APTITUDE_SCORE, 0, 999);
      var risk = _safeScore(normalizedProfile && normalizedProfile.scores && normalizedProfile.scores.riskScore, SIBYL_DEFAULT_RISK_SCORE, 0, 100);
      var profileDominant = _safeText(normalizedProfile && normalizedProfile.saju && normalizedProfile.saju.tenGods && normalizedProfile.saju.tenGods.primary, dominant);
      var profileDominantEl = _safeText(normalizedProfile && normalizedProfile.saju && normalizedProfile.saju.dominantElement, domEl);
      dominant = profileDominant;

      var metricsPreview = _q('sbFreeSection') && _q('sbFreeSection').querySelector('.sb-metrics-preview');
      if (metricsPreview) {
        metricsPreview.classList.add('sb-metrics-preview--expanded');
        metricsPreview.innerHTML = ''
          + '<div class="sb-metric-card">'
          + '<div class="sb-metric-label">?꾪뿕 怨꾩닔</div>'
          + '<div class="sb-metric-value" id="sbRiskBasicEl"><span id="sbRiskBasic">--</span></div>'
          + '</div>'
          + '<div class="sb-metric-card">'
          + '<div class="sb-metric-label">?곸꽦 怨꾩닔</div>'
          + '<div class="sb-metric-value sb-metric-value--ok"><span id="sbAptMetric">--</span></div>'
          + '</div>'
          + '<div class="sb-metric-card">'
          + '<div class="sb-metric-label">Career</div>'
          + '<div class="sb-metric-value" id="sbCareerComp">--</div>'
          + '</div>'
          + '<div class="sb-metric-card">'
          + '<div class="sb-metric-label">Wealth</div>'
          + '<div class="sb-metric-value" id="sbWealthComp">--</div>'
          + '</div>'
          + '<div class="sb-metric-card">'
          + '<div class="sb-metric-label">異㈑룻삎쨌?뙿룻빐</div>'
          + '<div class="sb-metric-value" id="sbRiskCollision">--</div>'
          + '</div>'
          + '<div class="sb-metric-card">'
          + '<div class="sb-metric-label">??蹂?숈꽦</div>'
          + '<div class="sb-metric-value" id="sbRiskVolatility">--</div>'
          + '</div>';
      }

      _t('sbAptCoeff', coeff);
      _t('sbAptMetric', coeff);
      _t('sbCareerComp', aptData.components.career);
      _t('sbWealthComp', aptData.components.wealth);
      _t('sbRiskCollision', riskBreakdown.parts.collision);
      _t('sbRiskVolatility', riskBreakdown.parts.monthlyVolatility);
      _t('sbSectorName', secData.sector);
      _t('sbSectorJobs', secData.jobs);
      _t('sbSectorTenstar', '二쇰룄 ??꽦: ' + profileDominant);

      // Caution / Warning ??G_POWER 湲곕컲 ?ㅻ쭏??寃쎈낫
      var warn = _buildSmartWarning(corePillars, dominant, counts, dist);
      var warnEl = _q('sbCautionArea');
      if (warnEl) {
        if (warn) {
          warnEl.classList.remove('sb-hidden');
          _t('sbCautionText', '??ALERT: ' + warn);
        } else {
          warnEl.classList.add('sb-hidden');
        }
      }

      // Risk gauge (basic)
      _t('sbRiskBasic', risk);
      var riskEl = _q('sbRiskBasicEl');
      if (riskEl) {
        riskEl.className = 'sb-metric-value' + (risk >= 70 ? ' sb-metric-value--danger' : risk >= 45 ? ' sb-metric-value--warn' : ' sb-metric-value--ok');
      }

      // Save current analysis state
      window._sibylCurrentData = {
        pillars: corePillars,
        dist: dist, domEl: profileDominantEl, dominant: profileDominant, coeff: coeff,
        risk: risk,
        counts: counts,
        riskBreakdown: riskBreakdown,
        aptitudeComponents: aptData.components,
        monthlyPreview: monthlyPreview,
        annualPreview: annualPreview,
        normalized: normalized,
        canonicalData: canonicalData,
        normalizedProfile: normalizedProfile
      };

      if (normalizedProfile && normalizedProfile.debug && Array.isArray(normalizedProfile.debug.missingFields) && normalizedProfile.debug.missingFields.length) {
        _sibylDevWarn('[SIBYL] missingFields', normalizedProfile.debug.missingFields);
      }

      // Nature + Year Pulse + Inner Palace ?꾩껜 ?뚮뜑
      var natSec = _q('sbNatureSection');
      if (natSec) {
        var p0 = corePillars;
        natSec.innerHTML = _buildNatureAnalysis(p0, dist, dominant, counts)
          + _buildYearPulseHTML(p0)
          + _buildDayBranchScan(p0);
      }

      var freeSec = _q('sbFreeSection');
      if (freeSec) freeSec.classList.remove('sb-hidden');
      freeSec && freeSec.classList.add('sb-fadein');
      _setSibylState(SibylState.READY);
    } catch (err) {
      _sibylLogWarn('[SIBYL] KASI fallback used', {
        reason: String(err && err.message || 'FREE_SECTION_RENDER_ERROR')
      });
      // Fail-open: 臾대즺 寃곌낵????긽 移댄뀒怨좊━?뺤쑝濡??몄텧?섍퀬, ?먮윭 ?ㅻ쾭?덉씠濡?媛由ъ? ?딅뒗??
      // 蹂듦뎄 紐⑤뱶 ?먯껜???덉쇅媛 ?섎㈃ ?뱀뀡??諛섎뱶???몄텧
      var freeSecFallback = _q('sbFreeSection');
      if (freeSecFallback) {
        freeSecFallback.classList.remove('sb-hidden');
        freeSecFallback.classList.add('sb-fadein');
      }
      try {
        var recovery = _buildSibylRecoveryOverview(pillars, window._sibylCurrentData && window._sibylCurrentData.risk, window._sibylCurrentData && window._sibylCurrentData.coeff);

        _t('sbSectorName', 'FREE BASIC RESULT MODE');
        _t('sbSectorJobs', '蹂듦뎄 紐⑤뱶濡?臾대즺 ?듭떖 寃곌낵瑜??곗꽑 ?쒓났?⑸땲?? ?좊즺 ?좉툑 ?댁젣 由ы룷?몄? 遺꾨━?섏뼱 ?숈옉?⑸땲??');
        _t('sbSectorTenstar', '二쇰룄 ??꽦: ' + recovery.dominant);
        _t('sbHueStatus', '??蹂듦뎄 紐⑤뱶(Recovery) ??臾대즺 湲곕낯 吏?쒕? ?곗꽑 ?쒓났?⑸땲??');
        _t('sbRiskBasic', recovery.risk);
        _t('sbAptCoeff', recovery.coeff);
        _t('sbAptMetric', recovery.coeff);

        var riskElFallback = _q('sbRiskBasicEl');
        if (riskElFallback) {
          riskElFallback.className = 'sb-metric-value' + (recovery.risk >= 70 ? ' sb-metric-value--danger' : recovery.risk >= 45 ? ' sb-metric-value--warn' : ' sb-metric-value--ok');
        }

        var natSecFallback = _q('sbNatureSection');
        if (natSecFallback) {
          natSecFallback.innerHTML = _buildSibylRecoveryHtml(recovery);
        }

        var cautionFallback = _q('sbCautionArea');
        if (cautionFallback) {
          cautionFallback.classList.remove('sb-hidden');
        }
        _t('sbCautionText', '???쇰? 怨꾩궛 ?곗씠?곌? 吏?곕릺??蹂듦뎄 紐⑤뱶濡??쒖떆 以묒엯?덈떎. 臾대즺 湲곕낯 寃곌낵???좎??섎ŉ ?좊즺 ?좉툑 ?댁젣 ?먮쫫怨?遺꾨━?⑸땲??');

        window._sibylCurrentData = Object.assign({}, window._sibylCurrentData || {}, {
          pillars: pillars || (window._sibylCurrentData && window._sibylCurrentData.pillars) || window.G_PILLARS || null,
          risk: recovery.risk,
          coeff: recovery.coeff,
          dominant: recovery.dominant,
          domEl: recovery.domEl,
          recoveryMode: true,
          recoveryReason: String(err && err.message || 'FREE_SECTION_RENDER_ERROR')
        });

        if (_isSibylDevMode()) {
          _sibylDevWarn('[SIBYL] free-recovery-fail-open', {
            reason: String(err && err.message || ''),
            risk: recovery.risk,
            coeff: recovery.coeff,
            dominant: recovery.dominant,
          });
        }
      } catch (recoveryErr) {
        // 蹂듦뎄 紐⑤뱶 ?먯껜???ㅽ뙣??寃쎌슦 - sbFreeSection留??뺤떎???몄텧?섍퀬 湲곕낯 硫붿떆吏 ?쒖떆
        _sibylLogWarn('[SIBYL] recovery mode also failed', { reason: String(recoveryErr && recoveryErr.message || '') });
        _t('sbSectorName', '湲곕낯 ?댁꽭 遺꾩꽍');
        _t('sbSectorJobs', '?곗씠?곕? 遺덈윭?ㅻ뒗 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎. ?좎떆 ???ㅼ떆 ?쒕룄??二쇱꽭??');
        _t('sbRiskBasic', '??);
        _t('sbAptCoeff', '??);
      }
      _setSibylState(SibylState.READY);
    }
  }

  function _isAdminBypassUser() {
    try {
      if (typeof window.__cdIsAdminLikeUser === 'function' && window.__cdIsAdminLikeUser()) return true;
    } catch (_) {}
    try {
      if (window.__cdAdminBypass === true) return true;
    } catch (_) {}
    try {
      if (typeof window.isAdminUser === 'function' && window.isAdminUser()) return true;
    } catch (_) {}
    return false;
  }

  function _toApiError(result, fallbackMessage) {
    var payload = result && result.payload ? result.payload : {};
    return {
      status: Number(result && result.status || 0),
      code: String(payload && payload.error && payload.error.code || '').trim() || 'SERVER_ERROR',
      message: _safeErrorMessage(result) || fallbackMessage || '?붿껌 泥섎━ 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.'
    };
  }

  async function _resolveSibylPricing() {
    var featureRes = await _fetchApiJson('/api/billing/features?featureKey=' + encodeURIComponent(SIBYL_FEATURE_KEY));
    if (!featureRes.ok) {
      throw _toApiError(featureRes, '寃곗젣 媛寃??뺣낫瑜?遺덈윭?ㅼ? 紐삵뻽?듬땲??');
    }
    var featureData = _extractApiData(featureRes.payload);
    var pricing = featureData && featureData.pricing ? featureData.pricing : null;
    var cost = Number(pricing && pricing.cost || 0);
    var reason = String(pricing && pricing.reason || SIBYL_FEATURE_REASON).trim();
    if (!Number.isFinite(cost) || cost <= 0 || !reason) {
      throw { status: 422, code: 'PRICE_NOT_FOUND', message: '寃곗젣 媛寃??뺣낫媛 ?щ컮瑜댁? ?딆뒿?덈떎.' };
    }
    return {
      featureKey: String(pricing.featureKey || SIBYL_FEATURE_KEY),
      cost: Math.floor(cost),
      reason: reason
    };
  }

  async function _resolveSibylBalance() {
    var balanceRes = await _fetchApiJson('/api/billing/balance');
    if (!balanceRes.ok) {
      throw _toApiError(balanceRes, '肄붿씤 ?붿븸???뺤씤?섏? 紐삵뻽?듬땲??');
    }
    var balanceData = _extractApiData(balanceRes.payload);
    var balance = Number(balanceData && balanceData.balance || 0);
    return Number.isFinite(balance) ? balance : 0;
  }

  async function _resolveSibylUnlockStatus() {
    var statusRes = await _fetchApiJson('/api/billing/unlock-status?featureKey=' + encodeURIComponent(SIBYL_FEATURE_KEY));
    if (!statusRes.ok) {
      return {
        ok: false,
        status: Number(statusRes.status || 0),
        error: _toApiError(statusRes, '?좉툑 ?댁젣 ?곹깭瑜??뺤씤?섏? 紐삵뻽?듬땲??')
      };
    }

    var statusData = _extractApiData(statusRes.payload);
    return {
      ok: true,
      unlocked: Boolean(statusData && statusData.unlocked),
      pricing: statusData && statusData.pricing ? statusData.pricing : null,
      currentBalance: Number(statusData && statusData.currentBalance || 0)
    };
  }

  async function _runSibylCoinGate(payloadHash) {
    var pricing = await _resolveSibylPricing();
    var balance = await _resolveSibylBalance();

    if (balance < pricing.cost) {
      throw { status: 400, code: 'INSUFFICIENT_BALANCE', message: '肄붿씤??遺議깊빀?덈떎.' };
    }

    var requestId = _createRequestId('sibyl-coin-gate');
    var gateRes = await _fetchApiJson('/api/billing/coin-gate', {
      method: 'POST',
      body: JSON.stringify({
        featureKey: pricing.featureKey,
        reason: pricing.reason,
        requestId: requestId,
        payloadHash: String(payloadHash || '').slice(0, 120),
        forceDeduct: true
      })
    });

    if (!gateRes.ok) {
      throw _toApiError(gateRes, '肄붿씤 寃곗젣媛 ?꾨즺?섏? ?딆븯?듬땲??');
    }

    return {
      requestId: requestId,
      pricing: pricing,
      consumePayload: gateRes.payload
    };
  }

  async function _requestSibylRefund(paymentContext, failReason) {
    if (!paymentContext || paymentContext.bypass || paymentContext.refundAttempted) {
      return { ok: false, skipped: true };
    }
    paymentContext.refundAttempted = true;

    var pricing = paymentContext.pricing || {};
    var consumeData = _extractApiData(paymentContext.consumePayload || {});
    var consumePayload = consumeData && consumeData.consume ? consumeData.consume : {};
    var txId = String(
      consumePayload.transactionId
      || consumePayload.pointHistoryId
      || consumePayload._id
      || ''
    ).trim();

    var refundRes = await _fetchApiJson('/api/fortune/pig-coin/refund', {
      method: 'POST',
      body: JSON.stringify({
        cost: Number(pricing.cost || 100),
        featureKey: String(pricing.featureKey || SIBYL_FEATURE_KEY),
        sourceTransactionId: txId || undefined,
        requestId: _createRequestId((paymentContext.requestId || 'sibyl') + '-refund'),
        reason: String(failReason || '?쒕퉴??由ы룷???앹꽦 ?ㅽ뙣 ?먮룞 ?섍툒').slice(0, 120)
      })
    });

    return refundRes;
  }

  /* ?? 肄붿씤 李④컧 ???꾨??ㅼ씠??由ы룷???몄텧 ?? */
  async function _unlockDominator() {
    var btn = _q('sbUnlockBtn');

    function _restoreUnlockBtn() {
      _syncSibylUnlockButton(_getCurrentProfile());
      _setSibylState(SibylState.READY);
    }

    if (btn) { btn.disabled = true; btn.textContent = '>> PROCESSING??; }

    var currentProfile = _getCurrentProfile();
    var currentData = window._sibylCurrentData || {};

    var lockEl = _q('sbLockOverlay');
    if (lockEl) lockEl.classList.add('sb-hidden');

    var payloadHash = _sibylHash(JSON.stringify({
      profileId: currentProfile && currentProfile.id,
      birth: currentProfile && currentProfile.birth,
      dominant: currentData && currentData.dominant,
      domEl: currentData && currentData.domEl,
      risk: currentData && currentData.risk,
      coeff: currentData && currentData.coeff
    }));

    var paymentContext = null;

    try {
      if (_isAdminBypassUser()) {
        paymentContext = {
          bypass: true,
          requestId: _createRequestId('sibyl-admin-bypass'),
          pricing: {
            featureKey: SIBYL_FEATURE_KEY,
            cost: 100,
            reason: SIBYL_FEATURE_REASON
          },
          consumePayload: {}
        };
      } else {
        _setSibylState(SibylState.PROCESSING_PAYMENT, '>> 寃곗젣 ?곹깭瑜??뺤씤?섎뒗 以묒엯?덈떎??);
        var unlockStatus = await _resolveSibylUnlockStatus();

        if (!unlockStatus || !unlockStatus.ok) {
          throw (unlockStatus && unlockStatus.error) || {
            status: 503,
            code: 'UNLOCK_STATUS_UNAVAILABLE',
            message: '?좉툑 ?댁젣 ?곹깭瑜??뺤씤?섏? 紐삵뻽?듬땲?? ?좎떆 ???ㅼ떆 ?쒕룄??二쇱꽭??'
          };
        }

        if (unlockStatus && unlockStatus.ok && unlockStatus.unlocked) {
          if (_openCachedDominatorReport(currentProfile, currentData)) {
            _restoreUnlockBtn();
            return;
          }
          paymentContext = {
            bypass: true,
            unlocked: true,
            requestId: _createRequestId('sibyl-unlocked-reopen'),
            pricing: {
              featureKey: String((unlockStatus.pricing && unlockStatus.pricing.featureKey) || SIBYL_FEATURE_KEY),
              cost: Number((unlockStatus.pricing && unlockStatus.pricing.cost) || 100),
              reason: String((unlockStatus.pricing && unlockStatus.pricing.reason) || SIBYL_FEATURE_REASON)
            },
            consumePayload: {}
          };
        } else {
          paymentContext = await _runSibylCoinGate(payloadHash);
        }
      }

      _sibylLastPaidContext = paymentContext;
      _setSibylState(SibylState.GENERATING_REPORT, '>> ?꾨??ㅼ씠??由ы룷?몃? ?앹꽦?섎뒗 以묒엯?덈떎??);
      await _generateDominatorReport(paymentContext);
      _restoreUnlockBtn();
    } catch (error) {
      _sibylLogError('[SIBYL] premium unlock failed', error);

      if (paymentContext && !paymentContext.bypass) {
        try {
          await _requestSibylRefund(paymentContext, '?쒕퉴??由ы룷???앹꽦 ?ㅽ뙣 ?먮룞 ?섍툒');
        } catch (refundErr) {
          _sibylLogError('[SIBYL] premium unlock failed', refundErr);
        }
      }

      var userMessage = _toFriendlySibylErrorMessage(error, '?쒕퉴??由ы룷?몃? ?앹꽦?섏? 紐삵뻽?듬땲?? ?좎떆 ???ㅼ떆 ?쒕룄??二쇱꽭??');
      _setSibylState(SibylState.ERROR, userMessage);
      _restoreUnlockBtn();
    }
  }

  /* ?? ?꾨??ㅼ씠??由ы룷???앹꽦 (濡쒖뺄 怨꾩궛 怨좎젙) ?? */
  async function _generateDominatorReport(paymentContext) {
    var data = window._sibylCurrentData || {};
    var profile = _getCurrentProfile();
    var pillars = _ensurePillarsWithProfileFallback(data.pillars || window.G_PILLARS, profile);
    var ps = _pillarChars(pillars);
    var normalizedProfile = sanitizeSibylProfile(
      data.normalizedProfile
      || (data.canonicalData && data.canonicalData.normalizedProfile)
      || {}
    );

    // Build local payload
    var payload = {
      profile: profile,
      pillars: pillars ? {
        year:  { g: ps.y.g || '', j: ps.y.j || '' },
        month: { g: ps.m.g || '', j: ps.m.j || '' },
        day:   { g: ps.d.g || '', j: ps.d.j || '' },
        hour:  { g: ps.h.g || '', j: ps.h.j || '' }
      } : null,
      natal: data.dist || null,
      dominantEl: _safeText(normalizedProfile && normalizedProfile.saju && normalizedProfile.saju.dominantElement, data.domEl || null),
      dominantTenStar: _safeText(normalizedProfile && normalizedProfile.saju && normalizedProfile.saju.tenGods && normalizedProfile.saju.tenGods.primary, data.dominant || null),
      aptCoeff: _safeScore(normalizedProfile && normalizedProfile.scores && normalizedProfile.scores.aptitudeScore, data.coeff || SIBYL_DEFAULT_APTITUDE_SCORE, 0, 999),
      riskScore: _safeScore(normalizedProfile && normalizedProfile.scores && normalizedProfile.scores.riskScore, data.risk || SIBYL_DEFAULT_RISK_SCORE, 0, 100),
      gender: (profile && profile.gender) || 'F',
      currentYear: new Date().getFullYear(),
      requestId: paymentContext && paymentContext.requestId ? paymentContext.requestId : '',
      kasiContext: (window.G_KASI_CONTEXT && typeof window.G_KASI_CONTEXT === 'object') ? {
        solar: window.G_KASI_CONTEXT.solar || null,
        lunar: window.G_KASI_CONTEXT.lunar || null,
        ganji: window.G_KASI_CONTEXT.ganji || null,
        solarTerms: window.G_KASI_CONTEXT.solarTerms || null,
        calendarType: window.G_KASI_CONTEXT.calendarType || null,
        source: window.G_KASI_CONTEXT.source || null
      } : null
    };

    var normalized = data.normalized || _normalizeSibylInput(payload, data);
    var annualPlan = Array.isArray(data.annualPreview) ? data.annualPreview : _buildAnnualRiskPlan(normalized, payload.currentYear);
    var monthlyPlan = Array.isArray(data.monthlyPreview) ? data.monthlyPreview : _buildMonthlyRiskPlan(pillars, payload.dominantEl || normalized.dominantEl, payload.dominantTenStar || normalized.dominantTenStar, payload.riskScore || 45, payload.currentYear, normalized);
    var conflictSignals = _collectCollisionSignals(pillars, payload.currentYear);
    var riskBreakdown = data.riskBreakdown || _calcRiskBreakdown(normalized, monthlyPlan, annualPlan, conflictSignals);
    var aptData = { score: payload.aptCoeff || 0, components: data.aptitudeComponents || null };
    if (!aptData.components) {
      aptData = _calcAptitudeComponents(normalized, riskBreakdown);
      payload.aptCoeff = aptData.score;
    }

    var canonicalData = data.canonicalData || _buildSibylCanonicalData(normalized, riskBreakdown, aptData, annualPlan, monthlyPlan);
    if (!canonicalData.normalizedProfile || !canonicalData.normalizedProfile.scores) {
      canonicalData.normalizedProfile = buildNormalizedSibylProfile(normalized, riskBreakdown, aptData, annualPlan, monthlyPlan);
    }
    payload.normalizedProfile = canonicalData.normalizedProfile;
    payload.canonicalData = canonicalData;

    // Progress animation
    var genBar = _q('sbGenBarFill');
    var genStatus = _q('sbGenStatus');
    var stages = [
      { pct:10, msg:'>> ?붿옄 ?먭뎅 ?뚯떛 以묅? },
      { pct:25, msg:'>> ?ъ＜ 紐낆떇 ?ㅽ뻾 遺꾪룷 遺꾩꽍 以묅? },
      { pct:40, msg:'>> 寃⑷뎅쨌?⑹떊 怨꾩궛 ?붿쭊 媛?쇺? },
      { pct:55, msg:'>> ??는룹꽭???꾪뿕 ?몄옄 泥섎━ 以묅? },
      { pct:70, msg:'>> ?꾨??ㅼ씠??由ы룷???앹꽦 以묅? },
      { pct:85, msg:'>> 吏꾨줈 ?곸꽦 踰≫꽣 理쒖쟻??以묅? },
      { pct:95, msg:'>> 理쒖쥌 由ы룷??而댄뙆??以묅? }
    ];
    var stageIdx = 0;
    function _advanceStage() {
      if (stageIdx < stages.length) {
        var s = stages[stageIdx++];
        if (genBar) genBar.style.width = s.pct + '%';
        if (genStatus) genStatus.textContent = s.msg;
      }
    }
    _advanceStage();
    var stageTimer = setInterval(_advanceStage, 2000);

    try {
      if (!payload.pillars || !payload.pillars.day || !payload.pillars.day.g) {
        throw new Error('?ъ＜ ?먭뎅 ?곗씠?곌? 鍮꾩뼱 ?덉뒿?덈떎. 癒쇱? ?ъ＜ 遺꾩꽍???꾨즺??二쇱꽭??');
      }

      await new Promise(function (r) { setTimeout(r, 240); });
      var reportData = _shapeSibylPremiumReport(_buildLocalDominatorReport(payload, data), canonicalData);

      var finalValidation = _validateSibylPremiumChapterMap(reportData.chapterMap);
      if (!finalValidation.ok) {
        throw {
          status: 422,
          code: 'SIBYL_REPORT_INVALID',
          message: '由ы룷???앹꽦 寃곌낵媛 湲곗???異⑹”?섏? 紐삵뻽?듬땲??'
        };
      }

      _saveSibylCachedReport(profile, reportData, data);

      clearInterval(stageTimer);
      if (genBar) genBar.style.width = '100%';
      _renderDominatorReport(reportData, data);
      _setSibylState(SibylState.READY);

    } catch(e) {
      clearInterval(stageTimer);
      throw e;
    }
  }

  function _renderMonthlyRiskPanel(monthlyPlan) {
    if (!Array.isArray(monthlyPlan) || !monthlyPlan.length) return '';
    var cards = monthlyPlan.map(function(item) {
      var tone = item.risk >= 70 ? 'danger' : item.risk >= 50 ? 'warn' : 'ok';
      return '<article class="sb-monthly-card sb-monthly-card--' + tone + '">'
        + '<div class="sb-monthly-card-head">'
        + '<span class="sb-monthly-month">' + String(item.month).padStart(2, '0') + '??/span>'
        + '<span class="sb-monthly-risk">?꾪뿕 ' + item.risk + '</span>'
        + '</div>'
        + '<div class="sb-monthly-label">二쇱쓽</div>'
        + '<p class="sb-monthly-text">' + item.caution + '</p>'
        + '<div class="sb-monthly-label">?梨?/div>'
        + '<p class="sb-monthly-text">' + item.countermeasure + '</p>'
        + '</article>';
    }).join('');
    return '<section class="sb-monthly-wrap">'
      + '<div class="sb-monthly-title">MONTHLY RISK TACTICS 쨌 ?붾퀎 ?댁꽭/?꾪뿕 ?梨?/div>'
      + '<div class="sb-monthly-grid">' + cards + '</div>'
      + '</section>';
  }

  function _renderDominatorInsightPanel(reportData) {
    if (!reportData) return '';
    var monthly = Array.isArray(reportData.monthlyRiskPlan) ? reportData.monthlyRiskPlan : [];
    var annual = Array.isArray(reportData.annualRiskPlan) ? reportData.annualRiskPlan : [];
    var categoryMatrix = Array.isArray(reportData.categoryMatrix) ? reportData.categoryMatrix : [];
    var quantum = reportData.quantumDiagnostics || {};
    var parts = reportData.riskBreakdown && reportData.riskBreakdown.parts ? reportData.riskBreakdown.parts : {};
    var apt = reportData.aptitudeComponents || {};

    var topMonths = monthly.slice().sort(function(a, b) { return b.risk - a.risk; }).slice(0, 3);
    var stableMonths = monthly.slice().sort(function(a, b) { return a.risk - b.risk; }).slice(0, 3);
    var topYears = annual.slice().sort(function(a, b) { return b.risk - a.risk; }).slice(0, 3);

    var strips = monthly.map(function(item) {
      var tone = item.risk >= 70 ? 'danger' : item.risk >= 50 ? 'warn' : 'ok';
      return '<div class="sb-risk-strip-item sb-risk-strip-item--' + tone + '">'
        + '<span class="sb-risk-strip-month">' + String(item.month).padStart(2, '0') + '??/span>'
        + '<span class="sb-risk-strip-bar"><i style="width:' + _clamp(item.risk, 5, 95) + '%"></i></span>'
        + '<span class="sb-risk-strip-value">' + item.risk + '</span>'
        + '</div>';
    }).join('');

    var radarRows = [
      { k: 'Career', v: apt.career || 0 },
      { k: 'Wealth', v: apt.wealth || 0 },
      { k: 'Execution', v: apt.execution || 0 },
      { k: 'Social', v: apt.social || 0 },
      { k: 'Recovery', v: apt.recovery || 0 }
    ].map(function(row) {
      return '<div class="sb-radar-row">'
        + '<span class="sb-radar-key">' + row.k + '</span>'
        + '<span class="sb-radar-bar"><i style="width:' + _clamp(row.v, 4, 99) + '%"></i></span>'
        + '<span class="sb-radar-value">' + row.v + '</span>'
        + '</div>';
    }).join('');

    var accordion = topYears.map(function(item, idx) {
      var notes = Array.isArray(item.conflictNotes) && item.conflictNotes.length
        ? item.conflictNotes.join(' / ')
        : '吏곴꺽 異⑺삎?뚰빐 硫붾え ?놁쓬';
      return '<details class="sb-insight-acc" ' + (idx === 0 ? 'open' : '') + '>'
        + '<summary>' + item.year + '??쨌 ?꾪뿕 ' + item.risk + ' 쨌 ' + item.ganZhi + '</summary>'
        + '<div class="sb-insight-acc-body">'
        + '<p>?몄슫 ?먯닔 ' + item.yearScore + ', ????먯닔 ' + item.daewunScore + ', 異⑷꺽 ?④퀎 ' + item.shock + '.</p>'
        + '<p>異⑸룎 ?좏샇: ' + notes + '</p>'
        + '<p>?ㅽ뻾 ?붿빟: ' + (item.summary || '湲곕낯 由ъ뒪??湲곗? ?댁슜 沅뚯옣') + '</p>'
        + '</div>'
        + '</details>';
    }).join('');

    var categoryCards = categoryMatrix.map(function(item) {
      var tone = item.score >= 75 ? 'ok' : item.score >= 55 ? 'warn' : 'danger';
      return '<article class="sb-cat-card sb-cat-card--' + tone + '">'
        + '<div class="sb-cat-card-head">'
        + '<h5>' + item.title + '</h5>'
        + '<span class="sb-cat-score">' + item.score + '</span>'
        + '</div>'
        + '<p class="sb-cat-summary">' + item.summary + '</p>'
        + '<p class="sb-cat-action">' + item.action + '</p>'
        + '</article>';
    }).join('');

    var quantumRows = Array.isArray(quantum.roles)
      ? quantum.roles.map(function(role) {
          var tone = role.role === 'good' ? 'ok' : role.role === 'bad' ? 'danger' : 'neutral';
          return '<span class="sb-quantum-chip sb-quantum-chip--' + tone + '">' + role.label + ' 쨌 ' + role.roleLabel + '</span>';
        }).join('')
      : '';

    return '<section class="sb-insight-panel">'
      + '<div class="sb-insight-head">RISK COMMAND CENTER</div>'
      + '<div class="sb-insight-grid">'
      + '<article class="sb-insight-box">'
      + '<h4>?붾퀎 ?꾪뿕 ?ㅽ듃由?/h4>'
      + '<div class="sb-risk-strip">' + strips + '</div>'
      + '</article>'
      + '<article class="sb-insight-box">'
      + '<h4>?곸꽦 ?덉씠??5異?</h4>'
      + '<div class="sb-radar-wrap">' + radarRows + '</div>'
      + '</article>'
      + '</div>'
      + '<div class="sb-insight-grid">'
      + '<article class="sb-insight-box">'
      + '<h4>?곸쐞 ?꾪뿕 ??TOP3</h4>'
      + '<ul class="sb-insight-list">' + topMonths.map(function(m) { return '<li>' + m.month + '??쨌 ?꾪뿕 ' + m.risk + ' 쨌 ' + m.focus + '</li>'; }).join('') + '</ul>'
      + '<h4>?덉젙 ??TOP3</h4>'
      + '<ul class="sb-insight-list">' + stableMonths.map(function(m) { return '<li>' + m.month + '??쨌 ?꾪뿕 ' + m.risk + ' 쨌 ' + m.focus + '</li>'; }).join('') + '</ul>'
      + '</article>'
      + '<article class="sb-insight-box">'
      + '<h4>移댄뀒怨좊━ 留ㅽ듃由?뒪</h4>'
      + '<div class="sb-cat-grid">' + categoryCards + '</div>'
      + '</article>'
      + '</div>'
      + '<div class="sb-insight-grid">'
      + '<article class="sb-insight-box">'
      + '<h4>由ъ뒪???섏쐞?붿씤</h4>'
      + '<ul class="sb-insight-list">'
      + '<li>?ㅽ뻾 遺덇퇏?? ' + (parts.elementImbalance || 0) + '</li>'
      + '<li>??꽦 怨쇰??? ' + (parts.tenStarOverload || 0) + '</li>'
      + '<li>異㈑룻삎쨌?뙿룻빐: ' + (parts.collision || 0) + '</li>'
      + '<li>??는룹꽭??異⑸룎: ' + (parts.daewunSeunConflict || 0) + '</li>'
      + '<li>??蹂?숈꽦: ' + (parts.monthlyVolatility || 0) + '</li>'
      + '<li>議고썑 ?ㅽ듃?덉뒪: ' + (parts.johuStress || 0) + '</li>'
      + '</ul>'
      + '</article>'
      + '<article class="sb-insight-box">'
      + '<h4>?? ?ㅽ뻾 吏꾨떒</h4>'
      + '<ul class="sb-insight-list">'
      + '<li>紐⑤뱶: ' + (quantum.mode || '?듬?+議고썑') + '</li>'
      + '<li>議고썑 ??? ' + (quantum.johuType || 'neutral') + '</li>'
      + '<li>?좊━ ?ㅽ뻾: ' + ((quantum.favorableElements || []).join(', ') || '以묐┰(異붿젙)') + '</li>'
      + '<li>二쇱쓽 ?ㅽ뻾: ' + ((quantum.cautionElements || []).join(', ') || '以묐┰(異붿젙)') + '</li>'
      + '</ul>'
      + '<div class="sb-quantum-chip-wrap">' + quantumRows + '</div>'
      + '</article>'
      + '</div>'
      + '<div class="sb-insight-grid sb-insight-grid--single">'
      + '<article class="sb-insight-box">'
      + '<h4>怨좎쐞???곕룄 ?곸꽭 ?꾩퐫?붿뼵</h4>'
      + accordion
      + '</article>'
      + '</div>'
      + '<div class="sb-insight-grid">'
      + '<article class="sb-insight-box sb-insight-box--warn"><h4>寃쎄퀬 諛뺤뒪</h4><p>怨좎쐞???붿뿉??寃곗젙 吏??洹쒖튃(24?쒓컙)怨?臾몄꽌 湲곕컲 ?⑹쓽 ?덉감瑜?媛뺤젣?섏꽭??</p></article>'
      + '<article class="sb-insight-box sb-insight-box--plan"><h4>?꾨왂 諛뺤뒪</h4><p>?덉젙 ?붿뿉???듭떖 怨쇱젣 1媛쒕? ?꾩쭊 諛곗튂???깃낵瑜?怨좎젙?섍퀬, 寃쎄퀎 ?붿뿉??寃利??④퀎 鍮꾩쨷???섎━?몄슂.</p></article>'
      + '<article class="sb-insight-box sb-insight-box--routine"><h4>猷⑦떞 諛뺤뒪</h4><p>二?2???뚮났 猷⑦떞(?섎㈃/?대룞/鍮꾩썙?먭린)??罹섎┛??怨좎젙?섎㈃ ??蹂?숈꽦 異⑷꺽???≪닔?????덉뒿?덈떎.</p></article>'
      + '</div>'
      + '</section>';
  }

  function _renderChapterBodyRich(text) {
    var src = String(text || '').replace(/\r/g, '');
    var lines = src.split('\n');
    var html = [];
    var listBuf = [];

    function flushList() {
      if (!listBuf.length) return;
      html.push('<ul class="sb-chapter-list">' + listBuf.map(function(item) {
        return '<li>' + item + '</li>';
      }).join('') + '</ul>');
      listBuf = [];
    }

    lines.forEach(function(raw) {
      var line = String(raw || '').trim();
      if (!line) {
        flushList();
        return;
      }
      if (line.indexOf('## ') === 0) {
        flushList();
        html.push('<h4 class="sb-chapter-subtitle">' + line.slice(3) + '</h4>');
        return;
      }
      if (line.indexOf('- ') === 0) {
        listBuf.push(line.slice(2));
        return;
      }
      flushList();
      html.push('<p>' + line + '</p>');
    });
    flushList();
    return html.join('');
  }

  /* ?? ?꾨??ㅼ씠??由ы룷???뚮뜑留??? */
  function _renderDominatorReport(reportData, analysisData) {
    var genEl = _q('sbGenerating');
    if (genEl) genEl.classList.add('sb-hidden');

    var domSec = _q('sbDominatorSection');
    if (domSec) {
      domSec.classList.remove('sb-hidden');
      domSec.classList.add('sb-fadein');
    }

    var reportProfile = sanitizeSibylProfile(
      (reportData && reportData.canonicalData && reportData.canonicalData.normalizedProfile)
      || (analysisData && analysisData.normalizedProfile)
      || {}
    );
    var risk = _safeScore(
      (reportData && reportData.riskBreakdown && Number(reportData.riskBreakdown.total))
      || (reportProfile && reportProfile.scores && reportProfile.scores.riskScore)
      || Number(analysisData && analysisData.risk),
      SIBYL_DEFAULT_RISK_SCORE,
      0,
      100
    );
    var coeff = _safeScore(
      (reportData && Number(reportData.aptCoeff))
      || (reportProfile && reportProfile.scores && reportProfile.scores.aptitudeScore)
      || Number(analysisData && analysisData.coeff),
      SIBYL_DEFAULT_APTITUDE_SCORE,
      0,
      999
    );
    var dominant = _safeText(
      (reportData && reportData.dominantTenStar)
      || (reportProfile && reportProfile.saju && reportProfile.saju.tenGods && reportProfile.saju.tenGods.primary)
      || (analysisData && analysisData.dominant),
      SIBYL_PRIMARY_TENGOD_FALLBACK
    );
    var dominantEl = _safeText(
      (reportData && reportData.dominantEl)
      || (reportProfile && reportProfile.saju && reportProfile.saju.dominantElement)
      || (analysisData && analysisData.domEl),
      'water'
    );
    var mode = _dominatorMode(risk);

    // Dominator Mode Banner
    var modeMeta = {
      nle: { cls:'nle', tag:'MODE: STABLE GROWTH TRACK', title:'?덉젙 ?깆옣 紐⑤뱶 ????沅ㅻ룄 ?뺣? ?좎?', desc:'?꾩옱 ?먮쫫? ?덉젙 援ш컙?낅땲?? ?깃낵瑜??ㅼ슦湲곕낫???ы쁽 媛?ν븳 猷⑦떞??怨좎젙??蹂?숈꽦????텛??寃껋씠 媛???④낵?곸엯?덈떎.' },
      le:  { cls:'le',  tag:'MODE: RISK ADJUSTMENT TRACK', title:'?꾪뿕 議곗젙 紐⑤뱶 ???ㅽ뻾 ?쒖꽌 ?щ같移?, desc:'寃쎄퀎 ?좏샇媛 媛먯???援ш컙?낅땲?? 以묒슂??寃곗젙? 寃利??④퀎瑜?癒쇱? ?먭퀬, ?ㅽ뻾 媛뺣룄瑜?議곗젅???먯떎 援ш컙??吏㏐쾶 愿由ы븯?몄슂.' },
      dd:  { cls:'dd',  tag:'MODE: INTENSIVE RESET TRACK', title:'吏묒쨷 ?ъ젙鍮?紐⑤뱶 ??援ъ“ 由ъ뀑 ?꾩슂', desc:'怨좎쐞??蹂??援ш컙?낅땲?? 湲곗〈 諛⑹떇???꾨㈃ 以묐떒???꾨땲???듭떖 ?꾨줈?몄뒪瑜??ъ젙?ы빐 由ъ뒪?щ? 以꾩씠怨??뚮났?μ쓣 ?곗꽑 ?뺣낫?섏꽭??' }
    };
    var mm = modeMeta[mode];
    var modeBanner = _q('sbDominatorModeBanner');
    if (modeBanner) {
      modeBanner.className = 'sb-dominator-mode sb-dominator-mode--' + mm.cls;
      modeBanner.innerHTML =
        '<div class="sb-dominator-mode-tag">' + mm.tag + '</div>'
        + '<div class="sb-dominator-mode-title">' + mm.title + '</div>'
        + '<div class="sb-dominator-mode-desc">' + mm.desc + '</div>';
    }

    // 10-year Risk Graph
    var svgEl = _q('sbRiskGraphSVG');
    if (svgEl && (analysisData && analysisData.pillars)) {
      var graphData = _buildRiskGraph(analysisData.pillars, reportData && reportData.annualRiskPlan);
      _renderRiskSVG(graphData, svgEl);
    }

    var metricsRow = domSec ? domSec.querySelector('.sb-metrics-row') : null;
    if (metricsRow) {
      metricsRow.classList.add('sb-metrics-row--expanded');
      var parts = reportData && reportData.riskBreakdown ? reportData.riskBreakdown.parts : null;
      metricsRow.innerHTML = ''
        + '<div class="sb-metric-card">'
        + '<div class="sb-metric-label">?꾪뿕 怨꾩닔</div>'
        + '<div class="sb-metric-value" id="sbDomRiskEl"><span id="sbDomRisk">0</span></div>'
        + '</div>'
        + '<div class="sb-metric-card">'
        + '<div class="sb-metric-label">?곸꽦 怨꾩닔</div>'
        + '<div class="sb-metric-value sb-metric-value--ok" id="sbDomCoeff">' + coeff + '</div>'
        + '</div>'
        + '<div class="sb-metric-card">'
        + '<div class="sb-metric-label">二쇰룄 ??꽦</div>'
        + '<div class="sb-metric-value" id="sbDomSector">' + dominant + '</div>'
        + '</div>'
        + '<div class="sb-metric-card">'
        + '<div class="sb-metric-label">異㈑룻삎쨌?뙿룻빐</div>'
        + '<div class="sb-metric-value">' + (parts ? parts.collision : 0) + '</div>'
        + '</div>'
        + '<div class="sb-metric-card">'
        + '<div class="sb-metric-label">??는룹꽭??異⑸룎</div>'
        + '<div class="sb-metric-value">' + (parts ? parts.daewunSeunConflict : 0) + '</div>'
        + '</div>'
        + '<div class="sb-metric-card">'
        + '<div class="sb-metric-label">??蹂?숈꽦</div>'
        + '<div class="sb-metric-value">' + (parts ? parts.monthlyVolatility : 0) + '</div>'
        + '</div>';
    }

    // Metrics row
    _t('sbDomRisk', risk);
    var rEl = _q('sbDomRiskEl');
    if (rEl) rEl.className = 'sb-metric-value' + (risk >= 70 ? ' sb-metric-value--danger' : risk >= 45 ? ' sb-metric-value--warn' : ' sb-metric-value--ok');
    _t('sbDomCoeff', coeff);
    _t('sbDomSector', dominant);

    // Remedies
    var remedies = _buildRemedies(dominant, dominantEl);
    var remedyEl = _q('sbRemedyList');
    if (remedyEl) {
      remedyEl.innerHTML = remedies.map(function(r){
        return '<div class="sb-remedy-item">'+r+'</div>';
      }).join('');
    }

    // Report chapters
    var chaptersEl = _q('sbReportChapters');
    if (chaptersEl && reportData && reportData.chapters) {
      chaptersEl.id = 'sibyl-system-report-body';
      chaptersEl.setAttribute('data-report-scope', 'sibyl-only');
      chaptersEl.innerHTML = '';
      var insightWrap = document.createElement('div');
      insightWrap.className = 'sb-report-insight';
      insightWrap.innerHTML = _renderDominatorInsightPanel(reportData);
      chaptersEl.appendChild(insightWrap);
      if (Array.isArray(reportData.monthlyRiskPlan) && reportData.monthlyRiskPlan.length) {
        var monthlyWrap = document.createElement('div');
        monthlyWrap.className = 'sb-report-monthly';
        monthlyWrap.innerHTML = _renderMonthlyRiskPanel(reportData.monthlyRiskPlan);
        chaptersEl.appendChild(monthlyWrap);
      }
      if (Array.isArray(reportData.chapters) && reportData.chapters.length) {
        var jumpNav = document.createElement('nav');
        jumpNav.className = 'sb-chapter-jump';
        jumpNav.innerHTML = reportData.chapters.map(function(ch, i) {
          var shortTitle = String(ch.title || ('CH' + String(i + 1))).replace(/^CH\d+\s*[쨌-]\s*/, '');
          return '<button type="button" class="sb-chapter-jump-btn" data-target="sbChapter_' + i + '">CH' + String(i + 1).padStart(2, '0') + ' 쨌 ' + shortTitle + '</button>';
        }).join('');
        chaptersEl.appendChild(jumpNav);

        if (!chaptersEl.__sbJumpBound) {
          chaptersEl.addEventListener('click', function(ev) {
            var btn = ev.target && ev.target.closest ? ev.target.closest('.sb-chapter-jump-btn') : null;
            if (!btn) return;
            var targetId = btn.getAttribute('data-target');
            if (!targetId) return;
            var target = document.getElementById(targetId);
            if (target && typeof target.scrollIntoView === 'function') {
              target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          });
          chaptersEl.__sbJumpBound = true;
        }
      }
      reportData.chapters.forEach(function(ch, i) {
        var div = document.createElement('div');
        div.className = 'sb-report-chapter';
        div.id = 'sbChapter_' + i;
        div.innerHTML = '<div class="sb-chapter-header">'
          + '<span class="sb-chapter-num">CH.' + String(i+1).padStart(2,'0') + '</span>'
          + '<span class="sb-chapter-title">' + (ch.title || '') + '</span>'
          + '</div>'
          + '<div class="sb-chapter-body" id="sbChapBody_'+i+'"></div>';
        chaptersEl.appendChild(div);
        var target = _q('sbChapBody_'+i);
        if (target) target.innerHTML = _renderChapterBodyRich(ch.content || '');
      });
      if (_isSibylDevMode()) {
        _sibylLogInfo('[SibylReport] render body isolated', chaptersEl.id === 'sibyl-system-report-body');
      }
    } else if (chaptersEl && reportData && reportData.text) {
      // Fallback: single text block
      chaptersEl.innerHTML = '<div class="sb-report-chapter"><div class="sb-chapter-body" id="sbChapBodyMain"></div></div>';
      _typewriterEffect('sbChapBodyMain', reportData.text, 0);
    }
  }

  /* ?? ??먭린 ?④낵 ?? */
  function _typewriterEffect(elId, text, startDelay) {
    var el = _q(elId);
    if (!el) return;
    // For large texts - perform chunked rendering (performance)
    var CHUNK = 120;
    var pos = 0;
    el.innerHTML = '';
    function write() {
      if (pos >= text.length) return;
      el.innerHTML += text.slice(pos, pos + CHUNK).replace(/\n/g, '<br>');
      pos += CHUNK;
      if (pos < text.length) requestAnimationFrame(write);
    }
    setTimeout(write, startDelay || 0);
  }

  /* ?? 硫붿씤 ?닿린/?リ린 ?? */
  window.openSibylModal = function() {
    var modal = _q('sibylModal');
    if (!modal) return;
    _setSibylState(SibylState.LOADING);
    _sibylLastPaidContext = null;

    // Reset state
    var scanSec = _q('sb-scan-section');
    if (scanSec) scanSec.classList.remove('sb-hidden');
    var freeSec = _q('sbFreeSection');
    if (freeSec) freeSec.classList.add('sb-hidden');
    var premSec = _q('sbPremiumSection');
    if (premSec) premSec.classList.remove('sb-hidden');
    var lockEl = _q('sbLockOverlay');
    if (lockEl) lockEl.classList.remove('sb-hidden');
    var genEl = _q('sbGenerating');
    if (genEl) genEl.classList.add('sb-hidden');
    var domSec = _q('sbDominatorSection');
    if (domSec) domSec.classList.add('sb-hidden');
    var errEl = _q('sbErrorState');
    if (errEl) errEl.classList.add('sb-hidden');

    // Check profile
    var profile = _getCurrentProfile();
    var pillars = window.G_PILLARS || null;
    var natal = window.G_NATAL || null;

    var noProfile = _q('sbNoProfile');
    var contentArea = _q('sbContentArea');

    if (!profile && !pillars) {
      if (noProfile) noProfile.classList.remove('sb-hidden');
      if (contentArea) contentArea.classList.add('sb-hidden');
      if (scanSec) scanSec.classList.add('sb-hidden');
    } else {
      if (noProfile) noProfile.classList.add('sb-hidden');
      if (contentArea) contentArea.classList.remove('sb-hidden');

      // If no G_PILLARS yet, compute from profile
      if (!pillars && profile && typeof window.computeProfileForModal === 'function') {
        var computed = window.computeProfileForModal(profile);
        if (computed) {
          pillars = computed.p || window.G_PILLARS;
          natal = computed.natal || window.G_NATAL;
        }
      }

      // Update profile display
      var profileChip = _q('sbProfileChip');
      if (profileChip && profile && profile.birth) {
        var b = profile.birth;
        profileChip.textContent = '??? ' + (b.year || '--') + '.' + (b.month || '--') + '.' + (b.day || '--') + ' 쨌 ' + ((profile.gender || 'F') === 'M' ? '?⑥꽦' : '?ъ꽦');
      }

      // Run scan animation then render free section
      _runScanAnim(function() {
        _renderFreeSection(pillars, natal);
        _syncSibylUnlockButton(profile);
        _openCachedDominatorReportIfUnlocked(profile, window._sibylCurrentData || {}).catch(function(err) {
          _sibylLogWarn('[SIBYL] unlock-state precheck failed', {
            code: String(err && err.code || ''),
            message: String(err && err.message || '')
          });
          _syncSibylUnlockButton(profile);
        });
      });
    }

    modal.classList.add('sb-open');
    document.body.style.overflow = 'hidden';
  };

  window.closeSibylModal = function() {
    var modal = _q('sibylModal');
    if (!modal) return;
    modal.classList.remove('sb-open');
    document.body.style.overflow = '';
  };

  /* ?? Unlock dominator (exposed) ?? */
  window._sibylUnlockDominator = function() {
    _unlockDominator().catch(function(e) {
      _sibylLogError('[SIBYL] premium unlock failed', e);
      _setSibylState(SibylState.ERROR, _toFriendlySibylErrorMessage(e, '?붿껌 泥섎━ 以?臾몄젣媛 諛쒖깮?덉뒿?덈떎. ?좎떆 ???ㅼ떆 ?쒕룄??二쇱꽭??'));
      var genEl = _q('sbGenerating');
      if (genEl) genEl.classList.add('sb-hidden');
    });
  };

  window._sibylRetryDominator = function() {
    if (!_sibylLastPaidContext && !_isAdminBypassUser()) {
      _setSibylState(SibylState.ERROR, '?ъ떆???꾩뿉 寃곗젣瑜??ㅼ떆 吏꾪뻾??二쇱꽭??');
      return;
    }

    _setSibylState(SibylState.GENERATING_REPORT, '>> 由ы룷???앹꽦???ъ떆?꾪븯??以묒엯?덈떎??);
    _generateDominatorReport(_sibylLastPaidContext).catch(function(e) {
      _sibylLogError('[SIBYL] premium unlock failed', e);
      _setSibylState(SibylState.ERROR, _toFriendlySibylErrorMessage(e, '?ъ떆?꾩뿉 ?ㅽ뙣?덉뒿?덈떎. ?좎떆 ???ㅼ떆 ?쒕룄??二쇱꽭??'));
    });
  };

  /* Action handler integration */
  document.addEventListener('DOMContentLoaded', function() {
    // Touch/click delegation is already in index.html ??register lazy loader
    if (!window.__cdLazyActionLoaders) window.__cdLazyActionLoaders = {};
    window.__cdLazyActionLoaders['openSibylModal'] = function() {
      // Already loaded
    };
    window.__cdLazyActionLoaders['closeSibylModal'] = function() {};
  });

  // Expose for tile preview data
  window._sibylSystemReady = true;

}(window));
