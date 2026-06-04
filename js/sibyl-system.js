/* ?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§??
   SIBYL SYSTEM ENGINE
   ??? è¸°ê¾ªëŸ±??ï§ê¾¨ì¤??ê³¸ê½¦ ????€ì±???¼í‹ª ??–ë’ª??????ï¼??ë¶¿ì˜„ ?ëº? ï§ê¾¨??   Based on: G_PILLARS / G_NATAL / G_JONG / G_JOHU internal data
?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§?ë¨¥ë¸§??*/
(function(window) {
  'use strict';

  /* ???? ?ê³¸ë‹” ???? */
  var NS = 'FORTUNE_APP_USER_PROFILES';
  var SIBYL_REPORT_CACHE_VERSION = '20260522-local-dominator-v1';
  var SIBYL_REPORT_CACHE_NS = 'cd_sibyl_report_cache';
  var SIBYL_FEATURE_KEY = 'premium-sibyl-dominator';
  var SIBYL_FEATURE_REASON = '??•í‰´???ê¾???¼ì” ???±Ñ‹ë£·??;
  var SIBYL_MIN_PREMIUM_CHAPTER_CHARS = 300;
  var SIBYL_MIN_PREMIUM_TOTAL_CHARS = 20000;
  var SIBYL_PREMIUM_CHAPTER_META = [
    { key: 'coreMatrix', title: 'CH.01 ??•í‰´???„ë¶¿ë¼?ï§ã…½?ƒç”±???, focus: '??…ì ° ??ï¼œì¨Œ??¨ì»™ì¨Œï§?è«???½ë»¾ì¨ŒäºŒ?°ë£„ ??ê½?¨Œ???–– ?ë¨?‹” ?«ë‚‡ë¹€' },
    { key: 'riskAnalysis', title: 'CH.02 ?ê¾ªë¿• ?¨ê¾©???ëº? ?ºê¾©ê½?, focus: '?ê¾ªë¿• ?ë¨?‹” ?ê³—í…§ æ´¹ì‡¨êµ?? ?°â‘¸ë£ì¨Œè¹‚Â€??ˆê½¦ ?ºê¾ªë¹? },
    { key: 'aptitudeAnalysis', title: 'CH.03 ?ê³¸ê½¦ ?¨ê¾©???ëº? ?ºê¾©ê½?, focus: '?ê³¸ê½¦ ?ë¶¿ëƒ¼?? ?ê¹†ì˜£ì¨??ì”¡???ê¾¨ì™‚' },
    { key: 'tenGodPattern', title: 'CH.04 äºŒì‡°ë£???ê½?€???°ë£ ???½©', focus: 'äºŒì‡°ë£???ê½?æ¹²ê³•ì»???°ë£ì¨Œæ„¿??¨ê½·ë£¹ì“½??ê»?????½©' },
    { key: 'elementBalance', title: 'CH.05 ??½ë»¾ è«›ëªƒ???? ?ë¨?¼«ï§Â€ ??ºí€?, focus: '??½ë»¾ ?¨ì‡°?è­? è¹‚ëŒ???·â‘¦?? ??ê¼ ??ºí€? },
    { key: 'yearlyFlow', title: 'CH.06 10???ê¾ªë¿• ?¨ê¾©??æ´¹ëªƒ?????ê½•', focus: '?ê³•ë£„è¹??ê¾ªë¿•/æ¹²ê³ ???ë¨?««????½ë»¾ ????€ì»? },
    { key: 'monthlyPlanner', title: 'CH.07 ?ë¶¾í€??±ÑŠë’ª?????˜’??, focus: '12åª›ì’–???ê¾ªë¿•/?ë¶¿ì­Š/è«›ê³ ê½£ç”±?æ¹²ê³•ì»??ë¶¾í€???ìº ???˜–' },
    { key: 'relationship', title: 'CH.08 ?¿Â€?¨ê¾©? ?ì¢ì ™ ???½©', focus: '?¿Â€???°â‘¸ë£????½©????°ë“ƒ??‰ë–— ??ìº' },
    { key: 'moneyCareer', title: 'CH.09 ??Ğª??ï§ê³¸ë¾??ê¾¨ì™‚', focus: '??????ìŠœì¨Œï§ê³¸ë¾½ ?ì¢ê¹®ì¨Œç”±???????? },
    { key: 'finalMessage', title: 'CH.10 ï§¤ì’–ì¥???½ë»¾ åª›Â€??€ë±?, focus: '???–– å¯ƒê³•ì¤æ€?7/30/90????½ë»¾ ?ë¨?Šƒ' }
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
  var SIBYL_PRIMARY_TENGOD_FALLBACK = 'ä»¥ë¬’??æ¹²ê³—ì­??ºê¾©ê½?ä»?;
  var SIBYL_CORE_MATRIX_FALLBACK = '??ï¼??„ë¶¿ë¼?ï§ã…½?ƒç”±????ê³—ì” ?ê³? è¹‚ë‹¿ì»??æ¹²ê³•???ºê¾©ê½??????ê¹Šë»½??¬ë•²?? ???–– ?°ëº¤? ?ì¢???Å? ?ê¾¨ì”« ?ê¾¨ë±¶????‰ìŸ¾??æ¹²ê³—?åª›ë??æ¿¡?è¹‚ëŒ???¸ë•²??';
  var SIBYL_FORBIDDEN_REPORT_PATTERNS = [
    /??½ë»¾\s*è¹‚ë‹¿ì»?s*ï§ë¶¾??s*R\d*/i,
    /?ë¨?£\s*è¹‚ë“¦??s*??¹ê½¦/i,
    /???––\s*?ì¢ìƒ‡??s*è«›ë?ê¹??°ì¤ˆ\s*?ê¾©ì˜±\s*?ë¨?««??s*?´ÑŠâ€?ê³¸ì‘æ¿?s*??ê½??¸ë•²??i,
    /??€ì¾?s*??ê½??\s*??¥ì ™\s*??‰ë¼µ??s*?ê¾¨ë•²??i,
    /1??£í€?s*??½ë»¾\s*?????i,
    /?ë¨?‹”\s*??ê½??s*??°ë£\s*?·â‘¦???°ì¤ˆ\s*?ê¾ªì†š??í€?s*7??s*??¥ìæ¿?s*?ë¨???¸ë•²??i,
    /?ê¾ªë¿•\s*?¨ê¾©??s*47\s*,?\s*?ê³¸ê½¦\s*?¨ê¾©??s*608\s*æ¹²ê³—???°ì¤ˆ\s*??ìº\s*åª›ëº£ë£„ç‘œ?s*è­°ê³—???¸ë•²??i,
    /??ï¼?s*ï§ëˆĞ¦\s*?ê¾¨ï¼¼?ê¾ªë“ƒ\s*ï§ëš®ë±¾æ¹²?i,
    /å¯ƒê³Œ??s*æ¹²ê³•ì»?s*?¨ì¢ë­¹ï§?s*ï§ëˆĞ¦/i,
    /??¹ê½¦\s*??¾©??s*:\s*100?„ë¶¿??i,
    /?ê¾¨ì˜’\s*??ìŠœ??s*AI?ë¨?¾¶\s*æ´¹ëªƒ?æ¿?s*?ºìˆˆë¿?ï½Œë¼±\s*ï§ëˆĞ¦??€??ëª„ìŠ‚/i,
    /?ê³—ì” ??s*?ëª?/i
  ];
  var SIBYL_CHAPTER_CATEGORY_HINTS = {
    coreMatrix: ['??…ì °', 'ï§Â€è«???½ë»¾', 'äºŒì‡°ë£???ê½?, '?ê¾ªë¿• ?¨ê¾©??, '?ê³¸ê½¦ ?¨ê¾©??, '?ì¢ŠË??],
    riskAnalysis: ['?±ÑŠë’ª??, '??½ë»¾ ?ºë‡???, '??ê½?, '?°ãˆ‘ë£»ì‚ì¨??¿ë£»ë¹?, '????”ë£¹ê½??, '?ë¶¾í€?è¹‚Â€??ˆê½¦'],
    aptitudeAnalysis: ['Career', 'Wealth', 'Execution', 'Social', 'Recovery', '?ê³¸ê½¦'],
    tenGodPattern: ['äºŒì‡°ë£???ê½?, '??¾§ê»?, '??ê½?, '?¿Â€??, '?ëª„ê½¦', '??°ë£ ???½©'],
    elementBalance: ['??½ë»¾ ?ºê¾ªë£?, 'ï§Â€è«???½ë»¾', '?ì¢Šâ” ??½ë»¾', 'äºŒì‡±????½ë»¾', '??¹ë–Š', 'æ¹²ê³—??],
    yearlyFlow: ['10??, '?ê³•ë£„', '?ê¾ªë¿•', 'æ¹²ê³ ??, '?ëª„ìŠ«', '????],
    monthlyPlanner: ['?ë¶¾í€?, 'M01', '?±ÑŠë’ª??è«›ë?ë±?, '??ë¹??, 'äºŒì‡±??, '????],
    relationship: ['?¿Â€??, '?ì¢ì ™', '?ê³—ë¸·', '?ë¬’ë¾½', 'åª›ëˆë²?, '???‚¬'],
    moneyCareer: ['ï§ê³¸ë¾?, '?Œã…»???, '??Ğª', '??ì”¡', '??½ë»¾ ?ê¾¨ì™‚', '30??],
    finalMessage: ['ï§¤ì’–ì¥?, '7??, '30??, '90??, 'åª›ì’–??, '??¼ìŸ¾ ?ì¢ë¼µ??]
  };

  /* ??ê½????ë±ê½£ ï§ã…½ë¸?*/
  var TENSTAR_SECTOR = {
    '??¹ë–Š': { sector: 'CREATIVE & TECH', eng: 'Creative & Tech', jobs: 'åª›ì’•ì»?? ?„ì„‘?—ï§¥?????ë¨?” ?? ?ë¬?, ?ë¶¿ì˜„??€ê¼? ??‰ë‹ åª›Â€' },
    '?ê³?': { sector: 'CREATIVE & TECH', eng: 'Creative & Tech', jobs: 'åª›ì’•ì»?? ?„ì„‘?—ï§¥?????ë¨?” ?? ?ë¬?, ?ë¶¿ì˜„??€ê¼? ??‰ë‹ åª›Â€' },
    '?ëª„ì˜±': { sector: 'FINANCIAL CONTROL', eng: 'Financial Control', jobs: '?ë¨?¶› ??ìŠœ, ?ê³—ì” ???ºê¾©ê½? ?ì¢ë„»ï§??¿Â€?? ?????ê¾¨ì™‚' },
    '?ëº¤ì˜±': { sector: 'FINANCIAL CONTROL', eng: 'Financial Control', jobs: '?ë¨?¶› ??ìŠœ, ???€? ??Ğ¢ æ¹²ê³ ?? å¯ƒìŒ???¿Â€?? },
    '?ë©?': { sector: 'PUBLIC ORDER', eng: 'Public Order', jobs: '?¨ë“¦?¬æ¹²ê³?, ??æ¹²ê³—ë¾??¿Â€?±ÑŠì­…, è¸°ëº¤?œæ€? ?´ê±”ë£°ê¼ ?ê¾¨Ğ?§? },
    '?ëº?': { sector: 'PUBLIC ORDER', eng: 'Public Order', jobs: '?¨ë“¬Ğ¢?? ??æ¹²ê³—ë¾??ê¾©ì, è¸°ëº£ìª??ê¾¨Ğ?ª›?, ?´ë¨¯????±ì ™' },
    '?ëª„ì”¤': { sector: 'R&D & INTELLIGENCE', eng: 'R&D & Intelligence', jobs: '?ê³Œë„?? æ¹²ê³ ??? ?ê¾¨Ğ??ê³·ë–åª›Â€, ?ê¾¨ì™‚ ?ºê¾©ê½åª›?' },
    '?ëº¤ì”¤': { sector: 'R&D & INTELLIGENCE', eng: 'R&D & Intelligence', jobs: '?´ë¨¯?? ?ê³Œë„?? ?Œâ‘¥ê½??„ë“ƒ, ?????ê³·ë–?? ?ê¾¨ì™‚åª›Â€' },
    '??¾§ê»?: { sector: 'INDEPENDENCE FORCE', eng: 'Independence Force', jobs: '1??æ¹²ê³—ë¾? ï§¡ìŒë¾?? ??…â”° ?Œâ‘¥ê½??„ë“ƒ, ?ë¨?º??†ì˜„' },
    'å¯ƒê³¸??: { sector: 'COMPETITION SECTOR', eng: 'Competition Sector', jobs: '??½ë£·ï§? å¯ƒìŒ???ê³—ë¾½, ?ê³¸ë¾½ì¨Œï§???? ä»¥ë¬ì»?? }
  };

  /* ??½ë»¾ ?ëªƒëœ³??*/
  var EL_ORDER = ['wood','fire','earth','metal','water'];
  var EL_KR = { wood:'ï§???', fire:'????', earth:'????', metal:'æ¹???', water:'??ï¦?' };
  var EL_BALANCE_LABEL = { wood:'ï§?, fire:'??, earth:'??, metal:'æ¹?, water:'?? };
  var EL_COLOR = { wood:'#39ff14', fire:'#ff6a00', earth:'#ffd700', metal:'#c8e0ff', water:'#00bfff' };
  var EL_DESTINY_HUE = {
    wood:  { name:'??–ì” ??æ´¹ëªƒ??(Jade Green)',   hex:'#39ff14', status:'clear' },
    fire:  { name:'ç§»ëŒ? è¸°???ˆë±¶ (Khyber Red)',    hex:'#ff4500', status:'varied' },
    earth: { name:'?¨â‘¤ë±?ç§»ë?ì°?(Golden Camel)',    hex:'#ffd700', status:'varied' },
    metal: { name:'?ê¾ªê²•????»ì¾­ (Arctic Silver)', hex:'#b0c8e0', status:'clear' },
    water: { name:'????¼ë€??‰ë¶¾ï¼?(Deep Ocean Blue)', hex:'#00bfff', status:'clear' }
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

  /* ??¾§ì¾??¨ì‡°???ê¾§í€?*/
  var BIJAB_WARN_THRESHOLD = 3;

  /* ???? ??¨ì»™è¹????¨ì¢Šê¶?æ¹²ê³—ì­??ê³—ì” ?????? */
  var DAYGAN_NATURE = {
    '??: { name:'åª›ë¬???ê¿©ì‘‰)', type:'ï§ê³¸ì­??±Ñ‰ëœ‘??,
      nature:'????Ğ?§£?ì† ?ê¾¨ì¤ˆï§??ê¹†ì˜£??ì ®??æ¹²ê³—ì­?????¨ì¢Šê¶??¬ë•²?? åª›ëº¥ë¸?ï§â‘ºëª???ë–‡???ì¢‰ë„???ëº¤ë–Š???ë¨?±¶???ï§? ??•ì¾² è«›â‘ºë¼????ªì‘ï§?å«„ê³—ë¬??ì”  ??ë¸˜åª›Â€????°ë™†?Î¼????‰ë’¿??ˆë–. è­°ê³—ì­???ë¿‰???ë¨?¿°??»ì‡å¯??±Ñ‰ëœ‘ ??ë¸??ï§â†”ì¾???êµ¹, ?ì¢ë¿°???ºÂ€è­°ê¹†?æ¿¡??ì¢ì¨·???ë¬’ê¸½??€êµ??ê³ ì‰¶ ?ê¾¨ì™‚?ë¨?½Œ ??Œì ????•ìœ­??¸ë•²??',
      strength:'åª›ì’–ì¿ƒì¨Œï§¡ìŒë¾½ì¨Œ??½ëµ¾??‰ë¼µ ?±Ñ‰ëœ‘ì¨Œæ¹²ê³ ì‰· ?¥ì•·?µì¨Œ??¾©????–ë–†',
      weakness:'?¨ì¢ì­??°ì¤ˆ ?ëª…ë¸³ ?? åª›ëˆë²? ??£ë¦° ??ì”¡ ?¾ëŒ?? ????å«„ê³•?æ¿?æ¹²ê³ ???ê³¸ë–',
      career:'ï§¡ìŒë¾?? CEO, ?ëº¤íŠ‚?? ??½ë£·ï§?åª›ë¨®ë£? å«„ëŒ?åª›?, ?????ê¾¨ì¤ˆ??ºë“ƒ ?ë¶¾ì †?? },
    '??: { name:'?ê¾¨ã‰(?¿ìˆ??', type:'?ì¢ë¿° ?ê¾¨ì™‚??,
      nature:'??·ë¬ï§£ì„????€ë¼???ê¼?ë¨?½Œ????ë¸˜??¤ë’— ?ê³¸ì“³?Îº???ëªƒê¶¡?Î¼?????¨ì¢Šê¶??¬ë•²?? ï§ê³¸???°â‘¸ë£è¹‚?€??ï§¥ã€“ãˆƒ ?ê³ ì‰¶?? ?ëªƒã˜ ??–ìŠœ?????¹ ?ë¨°ë¸¯??å¯ƒê³Œ?µç‘œ???´ë¼±??€???ê¾¨ì™‚??è¹‚ëªƒ?????‰ë’¿??ˆë–. åª›ë¨¯ê½?ï§Â€?Î¼???ë¯ªë¸˜ ?ë©¸ì»™?¿Â€?¨ê¾©ë¿??åª›ëº¤???è«›ì’—???êµ¹, ?ê³—ì??ºÂ€???¸¿????ã€?ê¹†ì”  å¯ƒê³—?????“ì»™??è«›ì’•?????ªì“£ ????‰ë’¿??ˆë–.',
      strength:'?¿Â€???´ÑŠí…ì¨?ë¬’ê¸½ì¨Œï§????’ë£¹?…æ´ë¨ƒë£¸Ğ¦??æ¹²ê³ ?·ì¨Œ??‰ë‹  å¯ƒìŒ??,
      weakness:'å¯ƒê³•??ï§Â€?? äºŒì‡°ë£„æ²…???°ëµ¾, åª›ëº¤???????ï§Â€??íŠ‡ ??ã€?,
      career:'?ë©¸íƒ³?¿Â€, ï§ë‰??? ?ê³·ë–?? ??‰ë‹ åª›Â€, ä»¥ë¬’??? PR ?ê¾¨Ğ?ª›?' },
    'è¨?: { name:'è¹‚ë¬“??è¨ìˆ‚ê²?', type:'??ì ™ ?ëº¤ê¶›??,
      nature:'??–ë¼‡ï§£ì„??äºŒì‡°? ?ê¾©ê»œ??è«›ì•º???»ë’— ?ë¨?¼«ï§Â€åª›Â€ ??ë¬©??ˆë–. ï§ë‚‡?????¾©?¾æ€???ì»?ê³¸ì”¤ ?ë¨?¼«ï§Â€æ¿?æ´¹ëªƒï¼??ê¾©ê»œ????†ë¦°???ºÂ€??ë¸??ï§£ì’•????ë¨?­??åª›Â€ï§Â€????‰ë’¿??ˆë–. ??ˆĞ?ï§ë¡®? ?ê¾¨ì¤ˆ??ºë“ƒ????ˆë–†???ë¨?¼«ï§Â€???ºê¾©ê¶??–í’ ?ê¾¨ì¦º??¥ì”  ??ë¸˜ï§?å«„ê³•êµ? ï§Â€??íŠ‡ ?ë¨?¦° ?¨ì‡±???°ì¤ˆ ?±ÑŠë’ª???¿Â€?±ÑŠë¿‰ ??½ë™£??ë’— ???½©??è«›ì„???¸ë•²??',
      strength:'?±Ñ‰ëœ‘??ë£¸ë£æ¹²ê³•???ë£?æ´¹ì’•??æ¹²ê³ ?·ì¨Œèª˜ëªƒëµ??”ë£»??????,
      weakness:'?ë¨?¼«ï§Â€ ?ºê¾©ê¶? ??½ë»¾????€?? è¸°ë‰ë¸?? ?±ÑŠë’ª???¨ì‡±????',
      career:'??€ê¹??æ¹²ê³ ??? è«›ê³—?? åª›ëº¤ë¿°åª›?, ?ê³¸ë¾½ ?¥ì•·?? ?ë·€ê½???”¤?’ì‡³??PD' },
    'è¨?: { name:'?ëº¥ì†•(è¨ê³­ê²?', type:'?ëº? ï§ë¬’ì¨??,
      nature:'?¥ì…?‹ï§£?ì† ?ë¬?ï§??ëº¥ì†—??ï§Â€?ë¨?“£ æºë”†?????€??•ë’— ï§ë¬’ì¨?Î¼???ê³¸ì¡??¸ë•²?? ?ë³¤ì¾¶ ???æ¹²ê³•????ë±€???ºê¾©ë¹???????ë’— ?ê¹Šë¼¢??€Å‰, ??ë§??ºê¾©ê½æ€??Î¼???ëº¤ë–Š???ë¨?±¶??ì­??ˆë–. ?ë¨?–Š???ê¾¨Ğ??ê³¸ë¿­ è«›ë½°ë¿??•ë’— ?ë¨?–Šåª›ë¨¯??æ¹²ë¯êº????ì”«??í€? è¸°ë‰ë¸????„ì‘ ???‚¬???ë¨?”› å¯ƒê»‹???´ÑŠâ€????Œì ??…ë•²??',
      strength:'?ê¾¨Ğ?ë¶‹ë£¹ë¿°æ´?ì»»è«›?£ë£¸???„ê½£ ?ºê¾©ê½ì¨Œ?ëº? æ¹²ê³—? ì¨Œ??‰ë‹  ?Î¼??,
      weakness:'??–ë¹ ?ë¬’ëƒ¼, ?ëª? ??°ë±¶è«?å«„ê³•?, è¸°ë‰ë¸?????????,
      career:'?ê³Œë„?? ?ë©¸ë‚µ??ê¶—, ?Î¼?? ?ê³—ì” ??????ëª…ë–š??½ë“ƒ, ?ê¹†ë¸™åª›Â€, ???ç§»?ì¦º?? },
    '??: { name:'?¾ëŒ„????¿ì¿)', type:'??‰ì ™ ??ìŠœ??,
      nature:'???ê³—ì¿‚??è¹‚Â€????ì”  äºŒì‡°???ï§Â€?ê¹Šë¸¯????‰ì ™åª›ë¨­??????Î¼???ë±€ì­??…ë•²?? è­°ê³—ì­????¼ì­?ê³¸ì”¤ ??ˆâ” ??ë¸????‘ë»¾??Å? ?ê¾§ë¦° ?ê³¹ì†´?ë¨?½Œ ç§»â‘¥ê°??¥ì“£ ?ì¢???ë’— ?Î»????ê³—ë¼±??¸ë•²?? è¹‚Â€?ë¶¿ë¿‰ ????????ì»??åª›ëº¥ë¹??ë¶????ê¾ªì†š??€êµ???¢Š????–ì˜£ è¹‚Â€?ë¶¿ë¿‰ ??¼ì¿‚ï§Â€???ê¾ªë¿•????‰ì‘ï§? å¯ƒê³•????ºÂ€è­°ê¹†???ê¹†ì˜£???ê³¹ë¸³?ì¢ì“£ ï§ëš®ë±?????‰ë’¿??ˆë–.',
      strength:'è­°ê³—ì­??¿Â€??ë£¹ì˜±????‰ì ™ì¨Œéº???ˆê¶›ì¨?Îºë¦????„ì¨Œ?ê¾ªë„» ?ê³—ë¾½',
      weakness:'è¹‚Â€?????? è¹‚ëŒ????ë¨?–’, ?ê³¸ë–Š æ¹²ê³ ???ê³¸ë–',
      career:'?¿Â€?±ÑŠì˜„, ?ºÂ€??ˆê¶›?? ?¨ë“¬Ğ¢?? æ¹²ë‰???¿Â€?±ÑŠì­…, ?ê¾ªë„» ??–â€?? },
    '??: { name:'æ¹²ê³ ???¥ê¸·??', type:'?ëª? ?¿Â€?±Ñ‹ì‚',
      nature:'å¯ƒìŒ?‰ï§?ï§£ì„???ëª???ì¾¶ ??±ì“£ ??»ë²‰???ê¾©ê½¦??ë’— ?—ì‡¨???¥ì”  ?ë¨?±¶??ì­??ˆë–. ?ë¯? æ¹²ê³—????ê¾©ê½¦???°ë¶½?„æ¿¡???‰ì­?ë¨?½Œ åª›ëº¤???è«›ì’—???êµ¹, ?ê¾¨ê¼äºŒì‡±?½åª›? ï§Â€?ê³Œë‚µ ?ë©¸ì»™?¿Â€??ï§ë‰ê°???ì¢Šì»»??¸ë•²?? ??„ë¼¢???ê¹Šë¼¢??°ì¤ˆ ?ë¨?¦° PR????€ë¹??Î»??????????? è«›ì†??åª›Â€?Î¼ê½???´ÑŠâ€?ê³¸ì‘æ¿???ì˜±??¸ë•²??',
      strength:'??‰ì­ ?¿Â€??ë£»ë ªï§ë«¢ë£°ì»§??ë£°íƒ³??¤ë£¸???„ê½£ ?ëº£â”ì¨?ëª? æ¹²ê³ ??,
      weakness:'?ê¾¨ê¼äºŒì‡±?½æ¿¡??ëª…ë¸³ è¸°ë‰ë¸?? ?ë¨?¦° PR ??€ë¸? å¯ƒê³—??ï§Â€??,
      career:'?ë¨?µ’?? ???€?? åª›ë¨¯ê¶—æ„¿?, ?´ë¨¯ê¶? QA ?ê¾¨Ğ?ª›?, åª›Â€??€ë±? },
    'ä½?: { name:'å¯ƒì„??ä½?‹®??', type:'??¥íŠŒ å¯ƒê³•???,
      nature:'åª›ëº¤ì¿‹ï§£?ì† ??¤ë–’??????? ï§ë¯ì»?ê³¸ì”¤ å¯ƒê³•??Î¼???ë±€ì­??…ë•²?? è¹‚ë“­????ê³¹ì†´????¥ë‹š?ë·€ë¸???ì¢ëƒ½??ï§£ì„???ë’— ?Î»???ï§ã…¼???ê³—ë¼±??Å? ?ë¨?Šƒ??æ´¹ì’–???ä»¥ë¬’???¸ë•²?? ???ëª„ì“½ åª›ë¨¯????°â‘¸???è«›ê³•???? ??…ë’— ?ì¢ë­…æ¿¡ì’–??ï§ê³¸ê½??ë¶¾ì¾¿???ºëŠë¸?ë·€ë¸??ê³? ?¿Â€?¨ê¾¨? ?ëº¤ê½¦??í€? ?ì¢ë¿°???ºÂ€è­°ê¹†???ë¬ì ° æ¹²ê³•ì»???…Ğ?ë¨?½Œ ï§ë‰ê°????±ì‘??¬ë•²??',
      strength:'???ƒ‡??å¯ƒê³•?’ì¨Œ?´ÑŠâ€?åª›ì’—?ºì¨Œè¸°ëº¤ì­??€ë£°ê¼???ê³—ë¾½',
      weakness:'åª›ë¨¯ê½?ï§Â€???ºÂ€è­? ????ï§ë‰ê°? ?ë¬’ë¾½ æ¹²ê³ ëµ? è«›ì„ì»??°ëº¤??,
      career:'?´ê³—?? å¯ƒìŒê°? è¸°ëº£ìª§åª›?, ??€ë£?ì¢ë‹”, ?´ÑŠâ€œè?ê³—ì ™ ?ê¾¨Ğ?ª›?, ?ë©¸ë‚µ??ê¶—' },
    'æ¸?: { name:'?ì¢‰íˆ‘(æ¸?ƒ??', type:'?ëº? ?????,
      nature:'è¹‚ëŒê½ï§£?ì† ?ì¢ë­…æ¿¡ì’–???????‡ë‚µ ?ëº¤ì £???â‘¦ë¼??åª›Â€ï§Â€????‰ë’¿??ˆë–. ?ëª…ì‚???ê¾©ê½¦?ê¾? ?ëªƒì ´èª˜ëª„ë¿??ê³¸ì¡??åª›ë¨­ì»????‰ì‘ï§? åª›ë¨¯??Îº???ºê¾©ê½?Î¼??ï§ã…¼????ˆâ”??¸ë•²?? ???ëª„ì“½ ??–ê½‘??ï§Â€??íŠ‚å¯?èª˜ì‡¨ì»??ë¿¬ ??¾ª????ê³¸ì¿‚è«›ì„ë¦???„í€? ?ë¨?€??è¹‚ëŒ„?‡ç‘œ??ê¾ªë¹ ?ë¶¿ì­…????°ë±¶è«??ë¶¿ê»Œ????°ëµ¾??ë’— å¯ƒì?ë¼??è«›ì„??ê³¸ì”¤ ?ê¹†ì˜£ ?ëº¤ê»œ??ï§ëš®ë²??ˆë–.',
      strength:'?ë¶¿ì˜„?ë§ë£¸???‘ë£»???•ë£¹?–èª˜ëª„ìŸ» ??‰ì­ì¨?ëº? ?ºê¾©ê½ì¨Œ???????°™',
      weakness:'??¾ª????¨ì‡°?, ?ë¨?€???æ¿¡??ëª…ë¸³ ??ˆë’¿ ï§¡â‘¤?? ?ê¾¨ê¼äºŒì‡±??ï§Â€??,
      career:'?ë¶¿ì˜„??€ê¼? ????ê³·ë–?? è¹‚ëŒê½??ê¾¨Ğ?ª›?, ?ê¹Šì‚?ë©¸ë‚µ ?ê¾¨Ğ?? ?ë¨? …??„ê½£, ??¥ë€??ë¶¾ì †?? },
    'é¶?: { name:'?ê¾©ë‹”(é¶?„ê°)', type:'?ì¢Šë£ ï§Â€???‚',
      nature:'??åª›ëº¤ì¿???ê³¹ì†´???ê³•ì”ª è«›â‘ºë¼??è«›ë¶½?€??ï§Â€???‚µ ?ë¬’ìŠœ?Î¼???ë±€???¸ë•²?? ??¢Š???ê³¹ì†´ ?ë¨?–’?????–– ???¸™ ?Î»?????‰ì‘ï§? ??¼ë¼‡???ºê¾©ë¹ç‘œ???êµ¹??•ë’— ??ì¤??¼ì‚¤è¸??????åª›ëº¤???…ë•²?? æºë”†????ì”  ??•ãˆƒï§??ë¬í€???¼ì“¬??°ì¤ˆ ??ë¼±åª›Â€?????½©?????ºê¾©ë¹?ë¨?½Œ???ê¾¨Ğ???´ÑŠí…??è«›â‘ºë¹??Å? ?ê³•ì­”??¥ì”  ?Îºë¦??ê¾¨ì¤ˆ??ºë“ƒ ?ê¾©ê½¦??å«„ëªƒ????”  ??¸ë•²??',
      strength:'?ê¾¨ì™‚ æ¹²ê³ ?·ì¨Œ??»í…‡???Œâ‘¥ê½??’ë£¸Ğ¢??ë£??ë¶¿ë¼±ì¨??½ë“ƒ??°ê¶§',
      weakness:'??????ºÂ€è­? ï§ë¬’ì¨???ºê¾©ê¶? ?ê¾¨Ğ??å¯ƒê³—ë¿¬æ¿¡???°ë“ƒ???ì¢ŠË???€??,
      career:'?ê¾¨ì™‚ ?Œâ‘¥ê½??„ë“ƒ, ?¾ëŒë¿?? ???ë¨?”??½ë“ƒ, ?ë©¸íƒ³?¿Â€, ?????ºê¾©ê½åª›?' },
    '??: { name:'?¨ê¾©???ë©©ê°)', type:'??ë§????°™??,
      nature:'??ë’³ï§£ì„?????” ??ì”  ç§»â‘¦???ë’— ï§ê³´?????ë§????°™?Î¼???ë±€ì­??…ë•²?? å¯ƒë±?æ¿¡???•ìœ­??? ??…ë’— ??€???ï§ê¾©???åª›ë¨¯???ë’— ?Î»???ï§ã…¼???ê³—ë¼±??Å? ??ê½??åª›ë¨¯??ê¹†ì‘æ¿???‰ë‹ ì¨Œç§»?ì?ì¨?ê³Œë„ ?ºê¾©ë¹?ë¨?½Œ ?ë¨?»–???????…ë•²?? ?ë¨?¦° ?ëª„í…§???°ì‡°?????„ë¼¢?ê¹†ì”  æ¹²ê³ ????„ë¸˜??è«›â‘ºë¹??Å? ï§Â€??íŠ‡ ??ë£?ê¹†ì”  ?Î»?????¾ªë¹???? ??????ê¾©íŠ‚æ¿???ë¼±ï§Â€???ê¾ªë¿•????‰ë’¿??ˆë–.',
      strength:'?????ºê¾©ê½ì¨Œ?ê³Œë„ì¨??‰ë‹  ï§¡ìŒ?‰ì¨Œç§»ì„?€ì¨Œé®ê¾? ?ëº£ë‚« ?¿Â€??,
      weakness:'??ë£???¿Â€?? æ¹²ê³ ????„ë¸˜ èª˜ëª…?? åª›ë¨¯?????­Š, ?¨ì‡°ë£????„ë¼¢??,
      career:'????ê³·ë–?? ?ë¬?, ??–ë‹” ??‰ë‹ åª›Â€, ?ê³Œë„?? ??ì¦º?? ?ê³¸ê½¦ ï§Â€?ê¾©ì˜„' }
  };

  /* ???? ??ê½?¹‚???ë§?ï§ê³¸ë¾??ê¹Šë¼¢ ???? */
  var TENSTAR_NATURE = {
    '??¹ë–Š': { profile:'??¹ë–Š(ç¹‡ììª???äºŒì‡°ë£??ë’— ï§ë‚†???…ë•²?? ï§¡ìŒ?????—ì½ ?ëº?„åª›Â€ åª›ëº¥ë¸?§????ëª„ë¿‰å¯???¿ìŠ‚??è¸°ì¢ë«???ë¨?¼«ï§Â€åª›Â€ ?ë¬ë£??¸ë•²??',
      pro:'ï§¡ìŒ???è«›ì’–ê¸½æ€???½ë»¾?Î¼??å¯ƒê³ ë¹€??????†ì‘æ¿??ê¾©ì” ?ë¶¿ë¼±????ì”¡??°ì¤ˆ ?ê¾ªì†š??ë’— ?Î»?????‰ë’¿??ˆë–. ??±ì“£ ï§ë¨­ë¦°ï§?ê½Œ ??ë’— ?ê¹Šë¼¢??°ì¤ˆ è¸°ë‰ë¸????ê½¦???ê³??ê³¸ì‘æ¿??ë¯ªë’¿??ˆë–.',
      con:'??ê¸½???ë¯ªë¸˜ ?ê¾©ë–????–ë¹Ÿ???¾ëŒ???í€??±ÑŠë’ª??? ?¨ì‡±??????ë’— å¯ƒì?ë¼????‰ë’¿??ˆë–. ï§¡ìŒ?‰ì¨Œ??—ì½??ç§»ì„??ˆ¾??¿Â€??ë£»ë„»???ê³¸ë¿­?ë¨?½Œ è­°ê³—ì­?ï§ë‰ê°????·í‰©??ˆë–.' },
    '?ê³?': { profile:'?ê³?(?ë£Ÿì¸Ÿ)??äºŒì‡°ë£??ë’— ï§ë‚†???…ë•²?? æ¹²ê³—??æ´¹ì’–?ƒæ€?æ²…ëš¯????ê¾©ìŸ¾??ë’— ?ë¨?¼«ï§Â€åª›Â€ åª›ëº¥ë¸?§???†ê°¹???ë¬ë ??°ì¤ˆ ??–ì˜£???ë¶¾ë±¶???ì¢ì˜±?Î¼????‰ë’¿??ˆë–.',
      pro:'?ê³¸ì¡???ëª????ê¾©ì” ?ë¶¿ë¼±æ¿???ä»¥ë¬’????»ë±·??ë’— ?Î»?????‰ì‘ï§? ?¿Â€??±ì“£ ???ˆ¼??ë’— ?ê³¸ë–Š ??????ê³—ë¼±??¸ë•²??',
      con:'?ê³¸ê¶—??è­°ê³—ì­?æ´¹ì’–???????è«›ì„ì»????ë¸?ï§ê³¸????åª›ëˆë²???´ÑŠâ€?ê³¸ì‘æ¿?è«›ì’–ê¹??¸ë•²?? ?°â‘¸ë£??è«›ì’–ë¼???¿Â€?¨ê¾¨? ???” ??????ì”  ??±ë???????‰ë’¿??ˆë–.' },
    '?ëª„ì˜±': { profile:'?ëª„ì˜±(?ë¤ºê¹¹)åª›Â€ äºŒì‡°ë£??ë’— ï§ë‚†???…ë•²?? ??¢Š????–ì˜£ åª›ë¨¯??? ??ë¦????°ë£?Î¼???ë±€ì­??°ì¤ˆ, æ¹²ê³ ?¶ç‘œ???ê°????£ë¦°????ì”¡?ë·€ë¸???ë¨?¼«ï§Â€åª›Â€ åª›ëº¥ë¹€??ˆë–.',
      pro:'??¢Š???ë¨?–’?Îº???ê³¸ë¾½?? ??¼ë¼‡???ºê¾©ë¹?ë¨?½Œ ??‰ì“½ ?ë¨?««??åª›ë¨¯???ë’— ?Î»????ê³¸ì¡??¸ë•²??',
      con:'?Îºë¦?????ê¹†ì”  ??€ë¸?§??±ÑŠë’ª???¨ì‡°???ëª„í…§æ¿??ëª…ë¸³ ???ë¨?– å¯ƒì?ë¿????ì˜±??¸ë•²?? ??????? £ ?ëº?„åª›Â€ ?ºê¾©?????¨ë¦°??¸ë•²??' },
    '?ëº¤ì˜±': { profile:'?ëº¤ì˜±(ï¦†ï½ˆê¹?åª›Â€ äºŒì‡°ë£??ë’— ï§ë‚†???…ë•²?? ??‰ì ™???°ëº¤??? ?ê¾©ë– ?ë¨?Šƒ????ƒì»–????Ğª ?¿Â€?±Ñ? åª›ëº¤???…ë•²??',
      pro:'?ê¹†ë–??£ë‚µ ?ë¨?Šƒ ä»¥Â€??ì¤ˆ è¢ëª„????ê¹ƒë‚µ???ë³?‘ï§? ??Ğª???????ê¾©ë–???¿Â€???Î»????ê³—ë‹”??¸ë•²??',
      con:'ï§Â€??íŠ‡ ??‰ìŸ¾ ï§Â€?Î¼?æ¿¡??¨ì¢???æ¹²ê³ ?¶ç‘œ???¼ë’ªæ¿?ï§¡â‘¤???ë’— ???½©???????¸ë•²?? è¹‚Â€??????????“ë‚¬(èºê·?????ë³?Š‚å¯???¸ë•²??' },
    '?ë©?': { profile:'?ë©?(?ë¤·ì¸Ÿ)??äºŒì‡°ë£??ë’— ï§ë‚†???…ë•²?? æ´¹ë±ë¸??ëº£ì»¯?ë¨?£„ ?´ëŒ„ë¸?§? ??…ë’— åª›ëº¤ì¿?ï§ì„‘ê¹‰æ€??±Ñ‰ëœ‘??ç§»ë????»ì­åª›Â€ ?ë¨?±¶??ì­??ˆë–.',
      pro:'?ê¾§ë¦° ?ê³¹ì†´?ë¨?½Œ ??…êµ??å¯ƒê³•??Îº?????„„?Î¼????‰ì‘ï§? æ´¹ì’–?‰ì¨Œæ²…ëš¯??æ¹²ê³•ì»?è­°ê³—ì­?ë¨?½Œ ï§¤ì’–ê¸???ê¹ƒë‚µ????…ë•²??',
      con:'?¨ì‡°ë£??æ¹²ëŒ??ï§Â€??¿ì‘æ¿????????­Š????¢Š?¤å¯ƒ???¬ë•²?? æ²…ëš¯????????¨ì‡°? è«›ì„????ºëŠë¸?ë·€ë¸????±ìŒ??ï§ëš®ë²??ˆë–.' },
    '?ëº?': { profile:'?ëº?(ï¦†ï½…ì¸???äºŒì‡°ë£??ë’— ï§ë‚†???…ë•²?? ?ë¨?Šƒì¨??‰ê°ì¨Œï§£?¿í€ç‘œ?ä»¥ë¬’???Å??¨ë“­??ê³¸ì”¤ æ²…ëš¯???´ÑŠâ€?ë¨?½Œ ?ë¨?»–???????€???ë¨?¼«ï§Â€??…ë•²??',
      pro:'?ì¢ŠË?ê¹ƒë‚µ ï§?‚†?«åª›ë¨?”  ?ë¯ªë¸˜ ?Îºë¦?ê³¸ì‘æ¿???????ê¾©ê¸½???ë³¥ë’— ???ì¢Šâ”??¸ë•²?? æ´¹ì’–????ë¿‰???ê³¸ì¡????½ë»¾ ?Î»???è«›ì’—???¸ë•²??',
      con:'ï§Â€??íŠ‡ ?ê¾¨ê¼äºŒì‡±??? ?ê¾§í€???ë¨?ŠƒäºŒì‡±?½åª›? ?ì¢ë¿°????ï§£ì„? è«›â‘ºë¹??ë¿¬ è¹‚Â€?ë¶? ??¢Š????ê¼?ë¨?½Œ ??¼ì¿‚ï§?????‰ë’¿??ˆë–.' },
    '?ëª„ì”¤': { profile:'?ëª„ì”¤(?ë¤·ëœ²)??äºŒì‡°ë£??ë’— ï§ë‚†???…ë•²?? ??¾©ê½?ëº¤ìŸ» ????? ??†ê°¹????ˆë’¿ è«›â‘¹???åª›ëº¤???€Å‰, ï§ê³´????ê³´ì»§??äºŒì‡°ë§??ë¨?¼«ï§Â€?ë¨?—¯??ˆë–.',
      pro:'æ¹²ê³—??ï§Â€??¹ì“£ ??‡ë“…??è«›â‘¹???°ì¤ˆ ?????ºë¸¯??ï§¡ìŒ????¾ëª„???¿ê» ?Î»?????‰ì‘ï§? ??‰ë‹ ì¨???ì¨Œ?ê³Œë„ ?ºê¾©ë¹?ë¨?½Œ ??¤ë–?????°™??è«›ì’—???¸ë•²??',
      con:'ï§ë¬’ì¨?Î¼???????? ??†ë¸˜ ä»¥ë¬ë£???„ê¹‰?????? ?ê¾©ë–????½ë»¾è¹‚ë?????ê¸½???´ÑŠê¸½???’ëªƒĞ¢????“ì»™???¨ì‡°ë£??¸ë•²??' },
    '?ëº¤ì”¤': { profile:'?ëº¤ì”¤(ï¦†ï½…????äºŒì‡°ë£??ë’— ï§ë‚†???…ë•²?? ï§£ë‹¿?????ˆë’¿??ï§Â€???°ëº¤???ï§£ì’•????ë¨?­????‰ì‘ï§? ?ê¾¨Ğ?ê¹†ì“£ ?????æ²…ëš¯?æ¿¡??ê¾ªì†š??ë’— ?ë¨?¼«ï§Â€åª›Â€ åª›ëº¥ë¹€??ˆë–.',
      pro:'æºë”†????ˆë’— ï§Â€??·ë‚µ ??°â”??ï§£ë‹¿??ê¹†ì”  åª›ëº¤???€Å‰, ?´ë¨¯?ì¨Œ?ê³Œë„ì¨?ê³·ë– ?ºê¾©ë¹?ë¨?½Œ ?Îºë¦?ê³¸ì”¤ ?ì¢ŠËç‘œ??´ÑŠí…??¸ë•²??',
      con:'??ˆë’¿???¨ì‡°ë£??ì¾¶ ??‰ï¼œ??ë¿¬ ??¼ìŸ¾ å¯ƒì?ë¿??ºÂ€è­°ê¹†?æ¿¡???ë¼±ï§?????‰ë’¿??ˆë–. ??ˆì¤ˆ????ê¼ ?ê³¸ì“³ ??¾ë£„åª›Â€ ?ë¨?”°??ˆë–.' },
    '??¾§ê»?: { profile:'??¾§ê»?ï¦‡ë¶»ê¶???äºŒì‡°ë£??ë’— ï§ë‚†???…ë•²?? ??…â”°???ëº¤ê»œ?ê¹ƒë‚µ ?ë¨?”° ?ë¨?¼«ï§Â€åª›Â€ ï§ã…¼??åª›ëº¥ë¸?§? ??¼ë’ªæ¿¡ì’–????ì‘æ¿??ëª„ê¸½??åª›ì’–ì¿??ì ®???ëº?„åª›Â€ ??•ì¡†??¸ë•²??',
      pro:'?ë¨?¦° äºŒì‡°ë£?ê¹ƒë‚µ ??…â”°????½ë»¾?Î¼???ê³¸ì¡??ë¿¬ 1??æ¹²ê³—ë¾½ì¨Œ?ê¾¨â”??–ê½Œì¨?ë¨?º??†ë¿‰??åª›ëº¤???è«›ì’—???¸ë•²??',
      con:'?ë¬ì ° æ¹²ê³ ëµ?? ??…ë–’???ë¨?–’???ºëŠë¸?ë·€ë¸??¨ì¢Š???ï§ëš®ë±¾ï§? ??Ğª???????¾ë‹¿?????å¯ƒìŒ????ºë‰ë¸?ëº¤ì‘æ¿???ë¼±ï§?????‰ë’¿??ˆë–.' },
    'å¯ƒê³¸??: { profile:'å¯ƒê³¸????¨ê¹¹)åª›Â€ äºŒì‡°ë£??ë’— ï§ë‚†???…ë•²?? å¯ƒìŒ??ë¨?½Œ ??ë¸˜??¤ë’— åª›ëº£?????¹ã€??ë¨?¼«ï§Â€?? ?°ë¶¿ì­?Î¼???ë¨?±¶??ì­??ˆë–.',
      pro:'æ´¹ë±ë¸?å¯ƒìŒ????ê¼?ë¨?½Œ ??½ì—³?????????ì»??Å? ?ê³¸ë¾½ì¨??½ë£·ï§¥ì¡–ë£»ë‹¾æ¹²ê³—????ë¾?ë¨?½Œ ?ê³—ë¼±???ê¹ƒë‚µ????…ë•²??',
      con:'å¯ƒìŒ???æ¹²ê³•??ª›ë¯ªì”  ??ë¼± ??°ë“ƒ??‰ë–—???ê¾©ìŠ‚æ¿???ë’— ?ºê¾©ë¹?ë¨?½Œ è«›ì„??ê³¸ì‘æ¿???½ë™£??¸ë•²?? åª›ë¨¯??æ¹²ê³•????ë¨?–’?Î¼???ë¨?”°??ˆë–.' }
  };

  /* ï§£ì’“ì»?/ ï§Â€ï§Â€ ??ê½??¨ê¾©ê¶?è¹‚ëŒ??*/
  var GAN_EL = {
    '??:'wood','??:'wood','è¨?:'fire','è¨?:'fire','??:'earth',
    '??:'earth','ä½?:'metal','æ¸?:'metal','é¶?:'water','??:'water'
  };
  var JI_EL = {
    '??:'water','è¨?:'earth','??:'wood','??:'wood','æ¸?:'earth','??:'fire',
    '??:'fire','??:'earth','??:'metal','??:'metal','??:'earth','??:'water'
  };
  var POLARITY_YIN  = ['??,'è¨?,'??,'æ¸?,'??];
  var EL_CYCLE = ['wood','fire','earth','metal','water'];

  /* ??ê½??¨ê¾©ê¶?*/
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
    if (diff === 0) return samePol ? '??¾§ê»? : 'å¯ƒê³¸??;
    if (diff === 1) return samePol ? '??¹ë–Š' : '?ê³?';
    if (diff === 2) return samePol ? '?ëª„ì˜±' : '?ëº¤ì˜±';
    if (diff === 3) return samePol ? '?ë©?' : '?ëº?';
    if (diff === 4) return samePol ? '?ëª„ì”¤' : '?ëº¤ì”¤';
    return null;
  }

  /* ?ê¾©ì˜± ?ê¾¨ì¤ˆ????„ë¦° */
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
        btn.textContent = '?????Î»ë§?DOMINATOR ?±Ñ‹ë£·????¿ë¦°';
        btn.disabled = false;
        return;
      }
      btn.textContent = '??EXECUTE DOMINATOR ??100?„ë¶¿??;
      btn.disabled = false;
      return;
    }

    btn.textContent = '??EXECUTE DOMINATOR ??100?„ë¶¿??;
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

  /* G_PILLARS ????ê½?ç§»ëŒ???*/
  function _analyzeTenStars(p) {
    var ps = _pillarChars(p);
    if (!ps.d || !ps.d.g) return {};
    var dayGan = ps.d.g;
    var chars = [ps.y.g, ps.y.j, ps.m.g, ps.m.j, ps.d.j, ps.h.g, ps.h.j];
    // ???(?Î¶ëµ?????ë¸? ?ë¶? ï§Â€?Îºì»?? ??¥ë‹š????ï§Â€ï§Â€ ?ë¨?»œï§?????    var counts = {};
    chars.forEach(function(c) {
      var ts = _calcTenStar(dayGan, c);
      if (ts) counts[ts] = (counts[ts] || 0) + 1;
    });
    return counts;
  }

  /* äºŒì‡°ë£???ê½?(åª›Â€??ï§ë¡®? å¯? */
  function _dominantTenStar(counts) {
    var best = null, bestN = 0;
    Object.keys(counts).forEach(function(k) {
      if (counts[k] > bestN) { bestN = counts[k]; best = k; }
    });
    return best || 'ä»¥ë¬??;
  }

  /* ??¾§ì¾?ç§»ëŒ???*/
  function _bijabCount(counts) {
    return (counts['??¾§ê»?]||0) + (counts['å¯ƒê³¸??]||0);
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
      payload: { error: { code: 'NETWORK_ERROR', message: 'API ?ë¶¿ê»Œ????½ë™£??‰ë’¿??ˆë–.' } },
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
      return 'æ¿¡ì’“??ëª„ì”  ?ê¾©ìŠ‚??¸ë•²?? æ¿¡ì’“???????¼ë–† ??•ë£„??äºŒì‡±ê½??';
    }
    if (code === 'INSUFFICIENT_BALANCE' || msg.indexOf('insufficient') >= 0) {
      return '?„ë¶¿????ºÂ€è­°ê¹Šë¹€??ˆë–. ?„ë¶¿???°â‘¹??????¼ë–† ??•ë£„??äºŒì‡±ê½??';
    }
    if (code === 'PRICE_NOT_FOUND' || code === 'UNKNOWN_FEATURE_KEY') {
      return 'å¯ƒê³—??åª›Â€å¯??ëº£ë‚«???ºëˆ???? ï§ì‚µë»??¬ë•²?? ?ì¢ë–† ????¼ë–† ??•ë£„??äºŒì‡±ê½??';
    }
    if (code === 'NETWORK_ERROR' || status === 0) {
      return '??½ë“ƒ??°ê²• ?ê³Œê»???ºë‰ë¸?ëº¥ë???ˆë–. ?ì¢ë–† ????¼ë–† ??•ë£„??äºŒì‡±ê½??';
    }
    return fallback || '?ë¶¿ê»Œ ï§£ì„??ä»??¾ëª„?£åª›? è«›ì’–ê¹??‰ë’¿??ˆë–. ?ì¢ë–† ????¼ë–† ??•ë£„??äºŒì‡±ê½??';
  }

  function _setSibylErrorMessage(text) {
    var errMsg = _q('sbErrorMsg');
    if (!errMsg) return;
    errMsg.textContent = text || '?ë¶¿ê»Œ ï§£ì„??ä»??¾ëª„?£åª›? è«›ì’–ê¹??‰ë’¿??ˆë–. ?ì¢ë–† ????¼ë–† ??•ë£„??äºŒì‡±ê½??';
  }

  function _setSibylState(nextState, message) {
    _sibylUiState = nextState;
    var genEl = _q('sbGenerating');
    var errEl = _q('sbErrorState');
    var statusEl = _q('sbGenStatus');

    if (nextState === SibylState.ERROR) {
      if (genEl) genEl.classList.add('sb-hidden');
      if (errEl) errEl.classList.remove('sb-hidden');
      _setSibylErrorMessage(message || '?ë¶¿ê»Œ ï§£ì„??ä»??¾ëª„?£åª›? è«›ì’–ê¹??‰ë’¿??ˆë–. ?ì¢ë–† ????¼ë–† ??•ë£„??äºŒì‡±ê½??');
      return;
    }

    if (errEl) errEl.classList.add('sb-hidden');

    if (nextState === SibylState.GENERATING_REPORT) {
      if (genEl) genEl.classList.remove('sb-hidden');
      if (statusEl) statusEl.textContent = message || '>> ??•í‰´???±Ñ‹ë£·?ëª? ??¹ê½¦??ë’— ä»¥ë¬’???ˆë–??;
      return;
    }

    if (nextState === SibylState.PROCESSING_PAYMENT) {
      if (genEl) genEl.classList.add('sb-hidden');
      if (statusEl) statusEl.textContent = message || '>> å¯ƒê³—???ê³¹ê¹­???ëº¤ì”¤??ë’— ä»¥ë¬’???ˆë–??;
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
        label: ev.label || (normalizedScore >= 70 ? '?ëª„â€? : normalizedScore >= 45 ? '?¾ë?ê¶? : 'å¯ƒì„??),
        cls: ev.cls || 'neutral',
        evalSummary: ev.evalSummary || (gan + zhi + ' æ¹²ê³—???æ¹²ê³•???±ÑŠë’ª????¼í«??€ì¤?è«›ì„???‰ë’¿??ˆë–.'),
        hasChungBonus: !!ev.hasChungBonus,
        hasChungPenalty: !!ev.hasChungPenalty
      };
    } catch (err) {
      console.warn('[Sibyl] evalDaewun bridge fallback:', err && err.message ? err.message : err);
      return {
        score: 50,
        label: 'ä»¥ë¬??,
        cls: 'neutral',
        evalSummary: String(gan || '') + String(zhi || '') + ' æ¹²ê³—? æ¹²ê³•????¼í«??50)æ¿?è¹‚ëŒ???‰ë’¿??ˆë–.',
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

    var monthZhi = ['??,'??,'æ¸?,'??,'??,'??,'??,'??,'??,'??,'??,'è¨?];
    var yz = monthZhi[(month - 1 + 12) % 12];
    var ygz = _getYearGanZhi(year);
    return { g: ygz.gan, j: yz };
  }

  function _analyzeFortuneBridge(gz, pillars, label) {
    var pair = _normalizeGanZhiPair(gz) || { g: '', j: '' };
    var pillarChars = _pillarChars(pillars);
    var dayGan = pillarChars && pillarChars.d && pillarChars.d.g;
    var fallbackGGod = (dayGan && pair.g) ? (_calcTenStar(dayGan, pair.g) || 'ä»¥ë¬??) : 'ä»¥ë¬??;
    var fallbackJGod = (dayGan && pair.j) ? (_calcTenStar(dayGan, pair.j) || 'ä»¥ë¬??) : 'ä»¥ë¬??;

    try {
      if (!pair) throw new Error('invalid-gz');
      var fn = (typeof window.analyzeFortuneGZ === 'function')
        ? window.analyzeFortuneGZ
        : (typeof analyzeFortuneGZ === 'function' ? analyzeFortuneGZ : null);
      if (!fn) throw new Error('analyzeFortuneGZ-unavailable');
      var res = fn(pair, pillars, label || '??•í‰´???ë¶¿ìŠ«') || {};
      var battery = Number.isFinite(Number(res.batteryPercent)) ? _clamp(Math.round(Number(res.batteryPercent)), 0, 100) : 50;
      return {
        grade: res.grade || (battery >= 70 ? '?ëª„â€? : battery >= 45 ? '?¾ë?ê¶? : 'å¯ƒì„??),
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
        grade: fallbackBattery >= 70 ? '?ëª„â€? : fallbackBattery >= 45 ? '?¾ë?ê¶? : 'å¯ƒì„??,
        icon: '?ì¢‘íˆ˜',
        batteryPercent: fallbackBattery,
        adviceItems: [{
          type: 'guide',
          body: (label || '?ë¶¿ìŠ«') + '?? ' + fallbackGGod + '/' + fallbackJGod + ' ?°ëº¤?æ¿¡?æ¹²ê³•??è¹‚ëŒ???è«›ì„???‰ë’¿??ˆë–.'
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

    var CHONG = { '??:'??,'??:'??,'è¨?:'??,'??:'è¨?,'??:'??,'??:'??,'??:'??,'??:'??,'æ¸?:'??,'??:'æ¸?,'??:'??,'??:'?? };
    var PA = { '??:'??,'??:'??,'??:'??,'??:'??,'æ¸?:'è¨?,'è¨?:'æ¸?,'??:'??,'??:'??,'??:'??,'??:'??,'??:'??,'??:'?? };
    var HAE = { '??:'??,'??:'??,'è¨?:'??,'??:'è¨?,'??:'??,'??:'??,'??:'æ¸?,'æ¸?:'??,'??:'??,'??:'??,'??:'??,'??:'?? };

    branches.forEach(function(z) {
      if (CHONG[z] === yZhi) {
        out.chungCount += 1;
        out.notes.push('?ê³?(' + yZhi + ')åª›Â€ ?ë¨?… ' + z + '????äº?');
      }
      if (PA[z] === yZhi) {
        out.paCount += 1;
        out.notes.push('?ê³?(' + yZhi + ')åª›Â€ ?ë¨?… ' + z + '??????');
      }
      if (HAE[z] === yZhi) {
        out.haeCount += 1;
        out.notes.push('?ê³?(' + yZhi + ')åª›Â€ ?ë¨?… ' + z + '????ï¥?');
      }
    });

    var set = branches.concat([yZhi]);
    var hasInSaShin = ['??, '??, '??].every(function(z) { return set.indexOf(z) >= 0; });
    var hasChukSulMi = ['è¨?, '??, '??].every(function(z) { return set.indexOf(z) >= 0; });
    if (hasInSaShin) {
      out.hyungCount += 2;
      out.notes.push('?ëª„ê¶—???ë»??? ??³ì‚ ?ê¹…â”°');
    }
    if (hasChukSulMi) {
      out.hyungCount += 2;
      out.notes.push('?°ëº¤? èª˜?è¨ë¬‰??? ??³ì‚ ?ê¹…â”°');
    }

    out.score = _clamp(out.chungCount * 18 + out.hyungCount * 12 + out.paCount * 10 + out.haeCount * 8, 0, 100);
    return out;
  }

  function _resolveSeasonFromMonthBranch(monthBranch) {
    var branch = String(monthBranch || '').trim();
    if (branch === '?? || branch === '?? || branch === 'æ¸?) return 'spring';
    if (branch === '?? || branch === '?? || branch === '??) return 'summer';
    if (branch === '?? || branch === '?? || branch === '??) return 'autumn';
    if (branch === '?? || branch === '?? || branch === 'è¨?) return 'winter';
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
      advice = '??¿ë¦° ?ê¾ªì†•???ê¾ªë¹ ??ï¦?ì¨Œæ¹²??? è¹‚ëŒ???·â‘¦????ê¾©ìŠ‚??¸ë•²??';
    } else if (type === 'cold' || type === 'cool') {
      advice = '??“ë¦° ?ê¾ªì†•???ê¾ªë¹ ????ì¨Œï§??? è¹‚ëŒ???·â‘¦????ê¾©ìŠ‚??¸ë•²??';
    } else {
      advice = '??•ê¶ƒ æ´¹ì¢??? ä»¥ë¬???€êµ??ë¶¾í€?è¹‚Â€??ˆê½¦ ?¿Â€?±Ñ? ?ê¾©ìŠ‚??¸ë•²??';
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
      advice: _safeText(raw.advice, 'è­°ê³ ???ê³—ì” ?????åª›Â€ ?ºÂ€è­°ê¹Šë¸??è¹‚ëŒ??ê³¸ì‘æ¿???ê½??¸ë•²??'),
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
      integrity.messages.push('??ï¼??ë¨?… ??±ï¼œ ?ëº£ë‚«åª›Â€ ?ê¾¨ì”«??ë???¬ë•²??');
    }
    if (!pillars || !pillars.y || !pillars.y.g || !pillars.y.j || !pillars.m || !pillars.m.g || !pillars.m.j) {
      integrity.ok = false;
      integrity.messages.push('?ê³—ï¼œ/?ë¶¿ï¼œ ?ê³—ì” ?ê³? ?ºë‰??ê¾ªë¸¯????? ??ê½?? è¹‚ëŒ??ê³¸ì‘æ¿?ï§£ì„???¸ë•²??');
    }
    if (!pillars || !pillars.h || !pillars.h.g || !pillars.h.j) {
      integrity.messages.push('?°ì’–ê¹???“ì»– ?ê³—ì” ?ê³? ?ºë‰??ê¾ªë¸¯????–ï¼œ æ¹²ê³•ì»??ëº??ê¾? ??ë¸˜è???’¿??ˆë–.');
    }

    var dist = _ohaengDist(pillars);
    if (!dist.total) {
      integrity.ok = false;
      integrity.messages.push('??½ë»¾ ?ºê¾ªë£??¨ê¾©ê¶›åª›ë¯ªì”  ??¾©ë¼???‰ë’¿??ˆë–.');
    }

    var counts = _analyzeTenStars(pillars || window.G_PILLARS || {});
    var dominantTenStar = _dominantTenStar(counts);
    var hasTenStarSignal = Object.keys(counts || {}).some(function(k) { return Number(counts[k] || 0) > 0; });
    if (!hasTenStarSignal) {
      integrity.messages.push('äºŒì‡°ë£???ê½???ëº¤ì ™???ê³—ì” ?ê³? ?ºÂ€è­°ê¹Šë¹€??ˆë–.');
    }

    var domEl = (payload && payload.dominantEl) || (analysisData && analysisData.domEl) || _dominantEl(dist);
    var dayMaster = String(pillars && pillars.d && pillars.d.g || '').trim();
    var rawJohu = (payload && payload.johu) || (analysisData && analysisData.johu) || window.G_JOHU || null;
    var johu = _normalizeJohu(rawJohu, { pillars: pillars, dist: dist, dominantEl: domEl });
    if (johu && johu.hasFallback) {
      integrity.messages.push('è­°ê³ ???ê³—ì” ?ê³? ??? ?ºÂ€è­°ê¹Šë¸???¨ê¾©????½ë»¾ æ¹²ê³•ì»??°ë¶¿?™ç§»?? ?????‰ë’¿??ˆë–.');
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
      integrity.messages.push('????è«›ê³—ë¿?window.G_DAEWUN)????¾©ë¼???‰ë¼± ?ê³•ë£ åª›ëº£ë£„åª›? ?????ˆë–.');
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
    if (genderRaw === 'm' || genderRaw === 'male' || genderRaw === 'man' || genderRaw === '?? || genderRaw === '??¥ê½¦') gender = 'male';
    if (genderRaw === 'f' || genderRaw === 'female' || genderRaw === 'woman' || genderRaw === '?? || genderRaw === '??ê½?) gender = 'female';

    var birthDate = _safeText(input.birthDate, '??…ì °åª??ëº¤ì”¤ ?ê¾©ìŠ‚');
    var birthTime = _safeText(input.birthTime, '??“ì»™ èª˜ëª„ê¸?);
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
      stability: '??‰ì ™ ?ì¢? ï§â‘¤ë±?,
      growth: '?ê¹†ì˜£ åª›Â€??ï§â‘¤ë±?,
      warning: '?±ÑŠë’ª??å¯ƒì„??ï§â‘¤ë±?,
      breakthrough: '??°ë™† ????ï§â‘¤ë±?,
      dominator: '?ê¾???¼ì” ??ï§â‘¤ë±?
    };

    var subtitle = (EL_KR[dominantElement] || dominantElement) + ' ä»¥ë¬’????ì¨?' + primaryTenGod + ' ???½©';
    var coreMessage = '???–– ?°ëº¤? ' + (EL_KR[dominantElement] || dominantElement) + '??€Å‰, ' + primaryTenGod + ' ?ê¹Šë¼¢????½ë»¾ ?·â‘¦???°ì¤ˆ ?ê³Œê»?????ë¨?‹” ?????ê¹ƒë‚µåª›Â€ ??‰ì ™??¸ë•²??';
    var warningMessage = riskScore >= 65
      ? '?¨ì¢????´Ñˆì»™?? å¯ƒê³—??ï§Â€??æ´¹ì’–?ƒæ€??ë¨?– ï§¡â‘¤??ï§£ëŒ„ê²•ç”±???ëª? ?’ì‡±? ?ê³¸ìŠœ??ê½­??'
      : 'ä»¥ë¬??å¯ƒì„???´Ñˆì»™?ë¨?½Œ???ëº¤ì˜£è¹‚ë???å¯ƒÂ€ï§??·â‘¦ë´½ç‘œ?ï§ãì¾??ì¢???ê½­??';
    var opportunityMessage = riskScore < 45
      ? '??‰ì ™ ?´Ñˆì»™?ë¨?½Œ ???–– ?¨ì‡±??1åª›ì’•? ï§ë¬’ì¨???½ë»¾??ãˆƒ ?ê¹†ì˜£ ??¥ì‘‰????ˆë•²??'
      : '???ê¾ªë¿• ?ë¶¿ì“£ ?ì¢Ší€???¨ë“¦êº???½ë»¾, ?¨ì¢????ë¶? è«›â‘¹ë¼???ìŠœ??°ì¤ˆ ?ºê¾¨???ê½­??';

    return {
      mode: mode,
      riskLevel: riskLevel,
      title: modeTitleMap[mode] || '?ê¹†ì˜£ åª›Â€??ï§â‘¤ë±?,
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
        '???–– ??½ë»¾ ?°ëº¤??ï§ë‚‡???ë¿¬ ??ê¶—å¯ƒê³—??æ¹²ê³—????ëª„ìŠ¦æ¹???Œë’¿??ˆë–.',
        '?ê³¸ê½¦ ?¨ê¾©?”ç‘œ???¼ìŸ¾ ?·â‘¦???°ì¤ˆ ?ê¾ªì†š??ãˆƒ ?ê¹ƒë‚µ ????ê¹†ì”  ?ë¯ªë¸˜ï§ë¬???'
      ],
      weaknesses: [
        keyRisk >= 65 ? '?±ÑŠë’ª???ì¢ìƒ‡åª›Â€ ?ë¯? ??ë¿???¨ì‡±???ë¨?–’??°ì¤ˆ ?ë¨?–???ëº???????‰ë’¿??ˆë–.' : 'ä»¥ë¬???´Ñˆì»™?ë¨?½Œ ?ê³—ê½‘??–ì ?ºê¾©ê¶????ê¹ƒë‚µ ï§ë¬’ì¨?ê¾? ??ë¸˜ï§?????‰ë’¿??ˆë–.',
        '?¿Â€???ë¬’ë¾½ æ´¹ì’–???ï§â‘¦???ãˆƒ ??ê½?åª›ëº¤???åª›ëˆë²??°ì¤ˆ ?ê¾ªì†š??????‰ë’¿??ˆë–.'
      ],
      cautionPeriods: [
        '?±ÑŠë’ª???ê³¸ì ??,
        '?°â‘º???°ë¹ ?°â‘¸ë£??ì¢ìƒ‡åª›Â€ å¯ƒë?????´Ñˆì»™'
      ],
      recommendedActions: [
        '30????¥ìæ¿???½ë»¾ KPI 1åª›ì’–? è«›â‘¹ë¼?æ´¹ì’–??2åª›ì’•? ?¨ì¢???ê½­??',
        '?¨ì¢????´Ñˆì»™?ë¨?’— å¯ƒê³—??ï§Â€??24??“ì»™)???¾ëª„ê½???¹ì“½ ??‰ê°???ê³¸ìŠœ??ê½­??',
        '??‰ì ™ ?´Ñˆì»™?ë¨?’— ???–– ?¨ì‡±?£ç‘œ???¥ì”ª ?ëªƒì˜“??°ì¤ˆ è«›Â€???ê¹ƒë‚µ???¨ì¢???ê½­??'
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
      birthDate: [birth.year || '', birth.month || '', birth.day || ''].filter(Boolean).join('-') || '??…ì °åª??ëº¤ì”¤ ?ê¾©ìŠ‚',
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
        dayMaster: _safeText(pillars.d && pillars.d.g, 'èª˜ëª„ê¸?),
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
        coreMatrix: '??¨ì»™ ' + _safeText(pillars.d && pillars.d.g, 'èª˜ëª„ê¸?) + ', ï§Â€è«???½ë»¾ ' + (_safeText(EL_KR[norm.dominantEl], _safeText(norm.dominantEl, 'water'))) + ', äºŒì‡°ë£???ê½?' + _safeText(norm.dominantTenStar, SIBYL_PRIMARY_TENGOD_FALLBACK) + '??ä»¥ë¬’?–ç•°ëº¤ì‘æ¿??ê¾©ì˜± ??ê½­ ?´ÑŠâ€œç‘œ???ê½??¸ë•²??',
        riskPattern: '?ê¾ªë¿• ?¨ê¾©?????½ë»¾ ?ëª„ì¨·, ??ê½??¨ì‡°??? ?°â‘º???°ë¹, ????”ë£¹ê½???°â‘¸ë£? ??è¹‚Â€??ˆê½¦??å¯ƒê³ ë¹€???ê³—í…§??‰ë’¿??ˆë–.',
        aptitudePattern: '?ê³¸ê½¦ ?¨ê¾©???careerì¨Œwealthì¨Œexecutionì¨Œsocialì¨Œrecovery 5?°ëº¤????¹ê¶›??0~999 ?????±ì—¯??ˆë–.',
        relationshipPattern: '?¿Â€?????½©?? äºŒì‡°ë£???ê½???Î¼??æ´¹ëªƒ??ë¨? ?ºê¾¨???åª›ëˆë²??ì¢Šì»» è­°ê³Œêµ”æ€????‚¬ ?·â‘¦?????–ë–†??¸ë•²??',
        wealthPattern: '??Ğª ???½©?? ??ì”¡ æ¹²ê³ ??? ?ë¨?– è«›â‘¹ë¼±ç‘œ??ºê¾¨????ë¶¾í€???ìŠœ ?ê³—ê½‘??–ì????ˆê¶¡??¸ë•²??',
        careerPattern: 'ï§ê³¸ë¾?ï§ê¾¨ì¤????½©?? ï§Â€è«???½ë»¾????ê½?è­°ê³ ë¹€??ï§ìš????½ë»¾ ï§¡ìŒ????–ë¸??¸ë•²??',
        timingAdvice: '?¨ì¢????´Ñˆì»™?? ??í‰¬, ???ê¾ªë¿• ?´Ñˆì»™?? ??½ë»¾ åª›ëº¥???°ë’— ??ì¨· ?±Ñ‰ë²‰ ?ê¾¨ì™‚???ì¢???ê½­??'
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
    out.classification.title = _safeText(out.classification.title, '?ê¹†ì˜£ åª›Â€??ï§â‘¤ë±?);
    out.classification.subtitle = _safeText(out.classification.subtitle, '???–– ???ëº£ì ¹ ä»?);
    out.classification.coreMessage = _safeText(out.classification.coreMessage, '???–– ?ë¨?‹”????½ë»¾ ?·â‘¦???°ì¤ˆ ?ê³Œê»??ãˆƒ è¹‚Â€??ˆê½¦??ä»¥ê¾©ë¼?????');
    out.classification.warningMessage = _safeText(out.classification.warningMessage, '?¨ì¢????´Ñˆì»™?? è«›â‘¹ë¼?æ´¹ì’–????’ì‡±? ?ê³¸ìŠœ??ê½­??');
    out.classification.opportunityMessage = _safeText(out.classification.opportunityMessage, '???ê¾ªë¿• ?´Ñˆì»™?? ???–– ?¨ì‡±?£ç‘œ??ê¾©ì­Š è«›ê³—???ê½­??');

    out.basicSections.coreMatrix = _safeText(out.basicSections.coreMatrix, SIBYL_CORE_MATRIX_FALLBACK);
    out.basicSections.riskPattern = _safeText(out.basicSections.riskPattern, '?ê¾ªë¿• ???½© ?ê³—ì” ?ê³? ?ë¨? ä»¥ë¬’???ˆë–. ?ê¾©ì˜± è¹‚ëŒ????ºê¾©ê½åª›ë¯ªì‘æ¿???–ë–†??¸ë•²??');
    out.basicSections.aptitudePattern = _safeText(out.basicSections.aptitudePattern, '?ê³¸ê½¦ ???½© ?ê³—ì” ?ê³? ?ë¨? ä»¥ë¬’???ˆë–.');
    out.basicSections.relationshipPattern = _safeText(out.basicSections.relationshipPattern, '?¿Â€?????½©?? äºŒì‡°ë£???ê½?æ¹²ê³—???°ì¤ˆ è¹‚ëŒ???‰ë’¿??ˆë–.');
    out.basicSections.wealthPattern = _safeText(out.basicSections.wealthPattern, '??Ğª ???½©?? è«›â‘¹ë¼??ê³—ê½‘ æ¹²ê³—???°ì¤ˆ è¹‚ëŒ???‰ë’¿??ˆë–.');
    out.basicSections.careerPattern = _safeText(out.basicSections.careerPattern, 'ï§ê¾¨ì¤????½©?? ï§Â€è«???½ë»¾ æ¹²ê³—???°ì¤ˆ è¹‚ëŒ???‰ë’¿??ˆë–.');
    out.basicSections.timingAdvice = _safeText(out.basicSections.timingAdvice, '?¨ì¢?????í‰¬ / ???ê¾ªë¿• ??½ë»¾ ??ì¨· ?±Ñ‰ë²‰???ì¢???ê½­??');

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
      warnings: missingFields.map(function(key) { return key + ' ?ê¾¨ì”«'; })
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
        pillar: _safeText(item && item.ganZhi, 'èª˜ëª„ê¸?),
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
    if (!pair || typeof pair !== 'object') return 'èª˜ëª„ê¸?;
    var g = String(pair.g || '').trim();
    var j = String(pair.j || '').trim();
    if (g && j) return g + j;
    return 'èª˜ëª„ê¸?;
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
      return String(item.year) + '???ê¾ªë¿• ' + item.riskScore + ' / æ¹²ê³ ??' + item.opportunityScore;
    }).join(' ì¨?');

    var text = [
      chapterMeta.title,
      chapterMeta.focus,
      '??¨ì»™ ' + (saju.dayMaster || 'èª˜ëª„ê¸?) + ', ï§Â€è«???½ë»¾ ' + (sibyl.dominantElement || 'èª˜ëª„ê¸?) + ', äºŒì‡°ë£???ê½?' + (sibyl.dominantTenGod || 'èª˜ëª„ê¸?) + '??ä»¥ë¬’???°ì¤ˆ ?ºê¾©ê½??¸ë•²??',
      '?ê¾ªë¿• ?¨ê¾©??' + _clamp(Number(sibyl.riskScore || 35), 5, 99) + ' / ?ê³¸ê½¦ ?¨ê¾©??' + _clamp(Number(sibyl.aptitudeScore || 420), 100, 999) + ' æ¹²ê³—???°ì¤ˆ è­°ê³Œêµ???°ë£-å¯ƒê³Œ???ê¾¨ì …?ê¾©ì“£ ?ê³¸ìŠœ??¸ë•²??',
      '?ê³Œì»™ ?ë¨?«« ?ë¶¿ë¹Ÿ: ' + (yearPreview || '?ê³Œì»™ ?ë¨?«« ?ê³—ì” ???ë¨? ?ê¾©ìŠ‚') + '.',
      '??½ë»¾ æ´¹ì’–?? ?¨ì¢???ë¿‰??•ë’— ?ë¨?– ï§¡â‘¤?? ???ê¾ªë¿•?ë¨?½Œ??ï§ë¬’ì¨???½ë»¾, ä»¥ë¬???´Ñˆì»™?ë¨?½Œ??å¯ƒÂ€ï§??·â‘¦ë´½ç‘œ?ï§ãì¾??ì¢???ê½­??',
      '??½ë™£ è«›â‘¹? ï§£ëŒ„ê²•ç”±???? 1) ??ê¶—å¯ƒê³—???ê¾©ì £ æ¹²ê³•ì¤?2) 7???ë¨? 3) 30??è¹‚ëŒ??4) 90???±Ñ‰ê°­?ê³—ë–›.'
    ].join('\n\n');

    var guard = 0;
    while (text.length < SIBYL_MIN_PREMIUM_CHAPTER_CHARS && guard < 4) {
      text += '\n\n' + '?°ë¶½? ??ê½• ' + (guard + 1) + ': ?ë¨?‹” ??ê½è¹‚ë?????½ë»¾ ??–ê½Œ???’ì‡±? ?¨ì¢???í€? ï§Â€??? ï§ã…¼ï¼?åª›ê¹†???ê½­?? ??ˆì”ª????ï¼??´ÑŠâ€?ë¨?½Œ????½ë»¾ ?·â‘¦??????ªï§?ï§??ê¾ªë¿• ï§£ë‹¿ì»????ì¾????ªï§ë¬ë•²??';
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

    // ??‰ì­ è¹‚ëŒ???ê³—ê½‘: ?ê¾©ì“½ filleræ¿?æ¹²ëª„? ç‘œ?åª›ëº¤?£æ¿¡?ï§?¾©??§? ??…ë’—??
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

    var label = total >= 75 ? '?¨ì¢??? : total >= 55 ? 'å¯ƒì„?? : total >= 35 ? 'ä»¥ë¬?? : '??‰ì ™';
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
      + (counts['?ëº?'] || 0) * 8
      + (counts['?ë©?'] || 0) * 7
      + (counts['??¹ë–Š'] || 0) * 5
      + (power && power.isStrong ? 5 : 0)
      - Math.round((riskParts.collision || 0) * 0.08);

    var wealth = 32
      + (counts['?ëª„ì˜±'] || 0) * 10
      + (counts['?ëº¤ì˜±'] || 0) * 9
      + (counts['??¹ë–Š'] || 0) * 4
      - (counts['å¯ƒê³¸??] || 0) * 5
      - Math.round((riskParts.monthlyVolatility || 0) * 0.06);

    var execution = 34
      + (counts['??¾§ê»?] || 0) * 6
      + (counts['?ëº?'] || 0) * 5
      + (counts['?ê³?'] || 0) * 4
      + (power && power.isStrong ? 6 : -2)
      - Math.round((riskParts.tenStarOverload || 0) * 0.08);

    var social = 33
      + (counts['?ëº¤ì”¤'] || 0) * 5
      + (counts['??¹ë–Š'] || 0) * 5
      + (counts['?ëº¤ì˜±'] || 0) * 3
      - (counts['?ë©?'] || 0) * 2
      - Math.round((riskParts.collision || 0) * 0.07);

    var recovery = 30
      + (counts['?ëº¤ì”¤'] || 0) * 8
      + (counts['?ëª„ì”¤'] || 0) * 6
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
    if (n >= 75) return '?¨ì¢???;
    if (n >= 55) return 'å¯ƒì„??;
    if (n >= 35) return 'ä»¥ë¬??;
    return '??‰ì ™';
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
      var roleLabel = raw === 'good' ? '?ì¢Šâ”' : raw === 'bad' ? 'äºŒì‡±?? : 'ä»¥ë¬??;
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
      mode: jg && jg.isJong ? (jg.name || '?«ë‚ƒêº?) : '???+è­°ê³ ??,
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
        title: '?„ë¶¿ë¼???‰ì ™??,
        score: _clamp(100 - ((parts.elementImbalance || 50) * 0.45 + (parts.tenStarOverload || 50) * 0.55), 5, 99),
        summary: '??½ë»¾ ?ëª„ê°?? ??ê½??¨ì‡°???? ??¹í€?æ¹²ê³•??ï§£ëŒì­???ë¶¾ë±¾??åª›ëº£ë£„ç‘œ??ê³—í…§??¸ë•²??',
        action: '?¨ì¢????ë¶¿ë¿‰????ê¶—å¯ƒê³—??ï§Â€??æ´¹ì’–???åª›ëº¤???í€? ??‰ì ™ ?ë¶¿ë¿‰ ?ê¹†ì˜£ ?¨ì‡±?£ç‘œ?è«›ê³—???ê½­??'
      },
      {
        key: 'career',
        title: '?Œã…»?????½ë»¾??,
        score: _clamp((apt.career || 0) * 0.6 + (apt.execution || 0) * 0.4, 5, 99),
        summary: '?Œã…»?????½ë»¾ ?°ëº¤??å¯ƒê³ ë¹€????¼ì £ ?ê¹ƒë‚µ ?ê¾ªì†š åª›Â€?Î¼ê½???Šë‚…???',
        action: '?ê³Œì»™ ??³ê²• ?±ÑŠë’ª??' + annualPeak + ') ?ê¾ªì‘?ë¨?’— ?ëº¤ì˜£è¹‚ë???å¯ƒÂ€ï§?ä»¥ë¬’???°ì¤ˆ ??ìŠœ??ê½­??'
      },
      {
        key: 'money',
        title: '??????ìŠœ??,
        score: _clamp((apt.wealth || 0) - (parts.monthlyVolatility || 0) * 0.22, 5, 99),
        summary: '??Ğª ??ê°?Î¼ë¿????è¹‚Â€??ˆê½¦??ï§¡â‘£ì»????¼ë‹”??ï§Â€??¿ê½¦???¨ê¾©ê¶??¸ë•²??',
        action: '?ë¶½ì»™ ï§¤ì’“???±ÑŠë’ª??' + monthlyPeak + ') ?´Ñˆì»™?? è«›â‘¹ë¼? ?????´Ñˆì»™?? ?ëº¤ì˜£??°ì¤ˆ ?ºê¾¨???ê½­??'
      },
      {
        key: 'relationship',
        title: '?¿Â€???ë¬’ë¾½',
        score: _clamp((apt.social || 0) - (parts.collision || 0) * 0.25, 5, 99),
        summary: '??????ë¨?‹”?ë¨?½Œ ?°â‘º???°ë¹ ?°â‘¸ë£?åª›ëº£ë£„ç‘œ?è¹‚ëŒ????ë¬’ë¾½ ?ì¢ŠË?ï§Â€??–ì—¯??ˆë–.',
        action: 'åª›ëˆë²??¨ì¢???´Ñˆì»™?ë¨?’— ?¾ëª„??æ¹²ê³•ì¤?æ¹²ê³•ì»???¹ì“½æ¿???½ë¹ ??¾©???ä»¥ê¾©??ëª„ìŠ‚.'
      },
      {
        key: 'recovery',
        title: '???‚¬ ?ê¾©ê½¦',
        score: _clamp((apt.recovery || 0) - (parts.johuStress || 0) * 0.22, 5, 99),
        summary: '???‚¬?Îº??è­°ê³ ????½ë“ƒ??‰ë’ª????¹í€?è¸°ë‰ë¸???ê¾ªë¿•???¨ê¾¨??ë·€ë¹€??ˆë–.',
        action: '?ê³Œì»™ ????' + annualLow + ') ??“ë¦° ?ê¾©ë¿‰ ???‚¬ ?·â‘¦????ì¢Šê°™ç§»ì„‘ë¸?ëª„ìŠ‚.'
      },
      {
        key: 'quantum',
        title: '???? ï§ë‚…???ëº¥ë?',
        score: quantumScore,
        summary: 'è­°ê³ ???«ë‚ƒêº??????????????½ë»¾ ?ì¢Ší…‹?±Ñ? 5?ë¨?ƒ¼ ??¥ìæ¿??ëº¤í…??ï§Â€??–ì—¯??ˆë–.',
        action: '?ì¢Šâ” ??½ë»¾(' + ((quantumDiagnostics && quantumDiagnostics.favorableElements || []).join(', ') || '??ì“¬') + ') ä»¥ë¬’???°ì¤ˆ ??ê¼????±ì ™ ?±Ñ‰ë²‰??ï§ìš??ëª„ìŠ‚.'
      }
    ].map(function(item) {
      return Object.assign({}, item, { band: _toRiskBand(100 - item.score) });
    });
  }

  /* ?ê³¸ê½¦ ?¨ê¾©??(100~999 ????? */
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

  /* ??½ë»¾ ?ºê¾ªë£?(G_NATAL or ï§ê³¸???¨ê¾©ê¶? */
  function _ohaengDist(p) {
    var natal = window.G_NATAL;
    if (natal && natal.el) {
      var el = natal.el;
      var total = (el.wood||0)+(el.fire||0)+(el.earth||0)+(el.metal||0)+(el.water||0);
      if (total > 0) return { wood:el.wood||0, fire:el.fire||0, earth:el.earth||0, metal:el.metal||0, water:el.water||0, total:total };
    }
    // ï§ê³¸???¨ê¾©ê¶?fallback
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

  /* äºŒì‡°ë£???½ë»¾ */
  function _dominantEl(dist) {
    var best='wood'; var bestN=0;
    EL_ORDER.forEach(function(k){ if((dist[k]||0)>bestN){bestN=dist[k];best=k;} });
    return best;
  }

  /* ??½ë»¾ ï§ë‚…ì¦??(Clear vs Cloudy) ??åª›Â€??åª›ëº¥ë¸???½ë»¾??ï§Â€è«›ê³—??*/
  function _hueClarityStatus(dist) {
    if (!dist.total) return 'unknown';
    var dominant = _dominantEl(dist);
    var ratio = (dist[dominant] || 0) / dist.total;
    // ?ë±€????½ë»¾ 40% ??ê¸½??€??Clear, ?¨ì‡°??55%+) ?ë¨?’— å¯ƒê³ ë¸?0) ??½ë»¾????‰ì‘ï§?Cloudy
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
          if (base && base.indexOf('?ê³—ì” ???ºÂ€è­?) < 0) return base;
          var dayGan = normalized && normalized.pillars && normalized.pillars.d && normalized.pillars.d.g;
          var ganGod = (dayGan && _calcTenStar(dayGan, yz.gan)) || 'ä»¥ë¬??;
          var zhiGod = (dayGan && _calcTenStar(dayGan, yz.zhi)) || 'ä»¥ë¬??;
          return yz.label + '?ê¾? ' + ganGod + '/' + zhiGod + ' ??ä»¥ë¬’???æ¹²ê³•????ìŠœ ?´Ñˆì»™??…ë•²??';
        })(),
        daewunLabel: dw ? (dw.g + dw.j) : (yz.label + ' æ¹²ê³—?'),
        conflictNotes: conflict.notes || []
      });
    }

    return plan;
  }

  /* ?ê¾©ì˜± ?ê³•ë£„ æ¹²ê³—? ?ê¾ªë¿• ?¨ê¾©???¨ê¾©ê¶?*/
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

  /* ?ê¾ªë¿• ?¨ê¾©????Dominator ï§â‘¤ë±?*/
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
    var GAN = ['??,'??,'è¨?,'è¨?,'??,'??,'ä½?,'æ¸?,'é¶?,'??];
    var ZHI = ['??,'è¨?,'??,'??,'æ¸?,'??,'??,'??,'??,'??,'??,'??];
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
      1: '?ì¢ìƒ‡ ??ì­›', 2: '?¿Â€??è­°ê³—??, 3: '?ë¨?ˆ‘ ??? £', 4: '??½ë»¾ ??¾ë£„ è­°ê³—??,
      5: 'æ²…ëš°ë¸??ºê¾¨ê°?, 6: 'ä»¥ë¬ì»??ë¨?', 7: '?±ÑŠë’ª????‰ë¿°', 8: '?ê¹ƒë‚µ ?ëº¤ì ™',
      9: '?ë¬’ë¾½ ??ê°™ç§»?, 10: 'ä»¥ë¬’?£æ¹²???ºí€?, 11: '???­Š è«›â‘¹?', 12: '?ê³•ì­š ?ëº¤ê¶›'
    };
    var monthNarrative = [
      '?¥ë‡ë¦?è­°ê³Œêµ???ëº£ë£‰??ë¹ ??„ì‘ è¹‚Â€??ˆê½¦????ªë‹”??????‰ë’¿??ˆë–.',
      '??????ê¶—å¯ƒê³—??ë¨?½Œ ??¾ë£„è¹‚ë?????¹ì“½ ??‰ì­???ê³—ê½‘??ë¹ ??¸ë•²??',
      '?ê¾§íˆ‘ ?ë¨?««??ï§£ëŒ?????‰ì ™??—ê¶???????ˆë–.',
      '?ê¹ƒë‚µ ?ëº¤ë––???Œã…¼???ï§ëš°ê²???‰ìŸ¾?Î¼?‚åª›? ?ê¾©ìŠ‚??¸ë•²??',
      'æ²…ëš°ë¸³æ€?ï§?‚†???å¯ƒì„?ç‘œ?ï§ë‚‡?????ë¹ ?ë¨?–??ï§ë±???ˆë–.',
      'ä»¥ë¬ì»??ë¨??????¹ ??ã›??åª›Â€?ëº¤ì“£ è­°ê³Œë¦????ì ™??ë¹ ??¸ë•²??',
      '?ëª? è¹‚Â€???ì¢ì—¯??ï§ë¡®ë¸?è«›â‘¹ë¼??ê¾¨ì™‚?????––????¸ë•²??',
      'ï§ë¬’ì¨???½ë»¾??°ì¤ˆ ?ê¹ƒë‚µ???¨ì¢???ë¦° ?«ë—­? ?´Ñˆì»™??…ë•²??',
      '?ë¬’ë¾½ ?´ÑŠâ€œç‘œ???ê°™ç§»?‘ë¸¯ï§?ï§ë‰ê°???¾©?????ì¾?ä»¥ê¾©ë¼?????',
      '??€????ê¾ªë¸³ ?ë¨? ??ê°™éºê¾©ì”  ?ê¾©ìŠ‚???????ˆë–.',
      'ï§£ë??°æ€?åª›ë¨¯?????‚¬ ?·â‘¦????’ì‡±? ?ëº£ë‚«??ë¹ ??¸ë•²??',
      '?ê³•ì­š å¯ƒê³—ê¶›æ€??ëº£â”åª›Â€ ??¼ì“¬ ?????ì“½ ?°ì’•ì»?ë¨?“£ ï§ëš®ë²??ˆë–.'
    ];

    var CHONG = { '??:'??,'??:'??,'è¨?:'??,'??:'è¨?,'??:'??,'??:'??,'??:'??,'??:'??,'æ¸?:'??,'??:'æ¸?,'??:'??,'??:'?? };

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

      var caution = (fortune.grade || '?¾ë?ê¶?) + ' ì¨?' + (fortune.gGod || 'ä»¥ë¬??) + '/' + (fortune.jGod || 'ä»¥ë¬??);
      if (risk >= 70) caution += ' ì¨??°â‘¸ë£??¨ì¢???´Ñˆì»™';
      if (dominantTenStar === '??¾§ê»? || dominantTenStar === 'å¯ƒê³¸??) caution += ' ì¨???…ë–’ å¯ƒì„??;
      if (dominantTenStar === '?ë©?' || dominantTenStar === '?ëº?') caution += ' ì¨?æ²…ëš¯??ï§ë‰ê°?å¯ƒì„??;

      var countermeasure;
      if (risk >= 75) {
        countermeasure = '??ê¶—å¯ƒê³—???24??“ì»™ ?ì¢ì‚??í€??¨ê¾©ë¹?æ¹²ë‰??? 2ä»?å¯ƒÂ€?? ???–– ?¿Â€?¨ê¾¨???¾ëª„??æ¹²ê³•ì¤??°ì¤ˆ ?ºê¾©???????ï§¡â‘¤???ê½­??';
      } else if (risk >= 55) {
        countermeasure = 'äºŒì‡¨ì»?ï§â‘ºëª´ç‘œ?3åª›ì’•ì¤???—ë¸³??í€? ??±ì ™ì¨Œï§??°ì‘£ë£??ë¶? åª›ìˆˆ? ???ë¨???ê½­?? ??½ë»¾è¹‚ë???è­°ê³—?????¾©ì¨???ë¯ªì” ?ëª„ìŠ‚.';
      } else {
        countermeasure = 'åª›ëº¤????½ë»¾ ï§¡ìŒ???ˆë–. ' + focusMap[month] + '??ï§ë¬’ì¨??í€??ê¹ƒë‚µ æ¿¡ì’“?‡ç‘œ???£êº¼ ??¼ì“¬ ??è¹‚Â€??ˆê½¦ ?ê¾©ë• ?ë¨?¶›??°ì¤ˆ ?ê¾ªì†š??ê½­??';
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
          month + '?????–– KPI 2åª›ì’•ì­??ì¢?',
          '?¿Â€??åª›ëˆë²??ì¢ìƒ‡ 48??“ì»™ ??€ê¶???ëƒ¼',
          'äºŒì‡¨ì»????‚¬ ?·â‘¦??ï§¤ì’–??2???¨ì¢??
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
      '## ???–– ï§ê¾¨???ë¶¿ë¹Ÿ',
      '- ??…ì ° ??ï¼? ' + _safeText(normalizedProfile && normalizedProfile.input && normalizedProfile.input.birthDate, '??…ì °åª??ëº¤ì”¤ ?ê¾©ìŠ‚') + ' ' + _safeText(normalizedProfile && normalizedProfile.input && normalizedProfile.input.birthTime, '??“ì»™ èª˜ëª„ê¸?) + ' / ' + _safeText(normalizedProfile && normalizedProfile.input && normalizedProfile.input.gender, 'unknown'),
      '- ï§Â€è«???½ë»¾: ' + (EL_KR[dominantEl] || dominantEl),
      '- äºŒì‡°ë£???ê½? ' + dominantTenStar,
      '- ?ê³¸ê½¦ ?¨ê¾©?? ' + coeff + ' / 999',
      '- ?ê¾ªë¿• ?¨ê¾©?? ' + risk + ' / 100 (' + riskBreakdown.label + ')',
      '- ?ê³—ì” ???ì¢ŠË?? ' + (validation.ok ? '?ë¬“ìƒ‡' : 'è¹‚ë‹¿ì»??ê¾©ìŠ‚'),
      '',
      '## ?ê³—ì” ???ì¢ŠË??å¯ƒì„??,
      ((validation.missingFields.length || (normalizedProfile.debug && normalizedProfile.debug.warnings && normalizedProfile.debug.warnings.length))
        ? ([]
          .concat(validation.missingFields.map(function(msg) { return msg + ' ?ê¾¨ì”«'; }))
          .concat(normalizedProfile.debug && normalizedProfile.debug.warnings ? normalizedProfile.debug.warnings : [])
          .slice(0, 8)
          .map(function(msg) { return '- ' + msg; }).join('\n'))
        : '- ???–– ?¨ê¾©ê¶??ê¾¨ë±¶åª›Â€ ?ëº¤ê¸½?ê³¸ì‘æ¿??ê³Œê»??ë¼± ??‰ë’¿??ˆë–.'),
      '',
      '## ?±ÑŠë’ª??6?ºê¾ªë¹?å¯ƒê³Œ??,
      '- ??½ë»¾ ?ºë‡??? ' + riskBreakdown.parts.elementImbalance,
      '- ??ê½?€¨ì‡°??? ' + riskBreakdown.parts.tenStarOverload,
      '- ?°ãˆ‘ë£»ì‚ì¨??¿ë£»ë¹? ' + riskBreakdown.parts.collision,
      '- ????”ë£¹ê½???°â‘¸ë£? ' + riskBreakdown.parts.daewunSeunConflict,
      '- ?ë¶¾í€?è¹‚Â€??ˆê½¦: ' + riskBreakdown.parts.monthlyVolatility,
      '- è­°ê³ ????½ë“ƒ??‰ë’ª: ' + riskBreakdown.parts.johuStress,
      '',
      '????íŠ‚????¥ì”ª ?ë¨?‹” ?ë¶¿ë¹Ÿ???ê¾¨ë•²?? ??¼ì £ ?ë¶¿ì­Š ?ê³—ì” ??????„ë£Šåª›Â€/?ë¶¿ìŠ«???)??æ¹²ê³•ì»??°ì¤ˆ ?ê¾ªë¿•???°ì’–ì¿‚ç‘œ??ºê¾¨???å¯ƒê³Œ???…ë•²?? ?ê³•ì”ª???ë¨?‹” è¹‚Â€?ë¶? ??·ë¦°ï§???€ë¼???ì ?°ëº¤????ï§ê³¸??ë¶? ï§ë±???°ë¶¿???????‰ë’¿??ˆë–.'
    ].join('\n');

    var chapter2 = [
      '## ??½ë»¾ ?ºë‡????ê³¸ê½­',
      '- ï§???: ' + (normalized.dist.wood || 0) + ' / ????: ' + (normalized.dist.fire || 0) + ' / ????: ' + (normalized.dist.earth || 0) + ' / æ¹???: ' + (normalized.dist.metal || 0) + ' / ??ï¦?: ' + (normalized.dist.water || 0),
      '- ?¥ì•ºë¹€ æ¹²ê³—? ?ëª„ê°åª›Â€ ??ë‹”æ¿???½ë“ƒ??‰ë’ª ??êµ???ë±€???°ëº¤?æ¿¡?ï§ê³•???ˆë–.',
      '- å¯ƒê³ ë¸???½ë»¾?? ?????·â‘¦???ï§ëš®ë±??è¹‚ë‹¿ì»??? ??†ì‘ï§? ?ëª„ìŠ« ?°â‘·êº??????è«›â‘¹ë¼±ï§¥??”  æ¹²ë¯êº????—ë¸˜ï§ë¬???',
      '',
      '## ??ê½??´ÑŠâ€?? ï§ê³¸ë¾??æ¹²ëŒ??,
      '- ??¾§ê»?å¯ƒê³¸???? ' + _bijabCount(normalized.tenStarCounts),
      '- ??ê½??? ' + ((normalized.tenStarCounts['?ëª„ì˜±'] || 0) + (normalized.tenStarCounts['?ëº¤ì˜±'] || 0)),
      '- ?¿Â€???? ' + ((normalized.tenStarCounts['?ë©?'] || 0) + (normalized.tenStarCounts['?ëº?'] || 0)),
      '- ?ëª„ê½¦ ?? ' + ((normalized.tenStarCounts['?ëª„ì”¤'] || 0) + (normalized.tenStarCounts['?ëº¤ì”¤'] || 0)),
      '',
      '??ê½??¨ì‡°????´Ñˆì»™?? ?Î¼????ê¾¨ë•¶ è¹‚ë¬???°ì¤ˆ ?ë¬ë£??¸ë•²?? ??? ??¼ë¼± ??¾§ì¾???¨ì‡³ë¸?§???½ë»¾?Î¼???ë¯ªë¸˜???ë¬’ë¾½ ??¾©????Œã…¼??? ?¿Â€?ê¹†ì”  ?¨ì‡³ë¸?§???‰ì ™?ê¹? ?ë¯ªë¸˜??è¹‚Â€????????¾ë£„åª›Â€ ?ë¨? ®ï§ë¬??? ??€ì¾??±Ñ‹ë£·?ëªƒë’— ??è¹‚ë¬????ë¶¾í€??ê³•í€?????€ì»¢æ€??ê³Œê»???ëª„ì £ ??í‰¬??í€??ëª„ì £ è«›Â€??ë¹ ??ë’—ï§Â€ ??–ë–†??¸ë•²??'
    ].join('\n');

    var chapter3 = [
      '## ?ê³¸ê½¦ 5?ë¶¿ëƒ¼ ?ê¾¨ì¤ˆ???”ª',
      '- Career: ' + aptData.components.career,
      '- Wealth: ' + aptData.components.wealth,
      '- Execution: ' + aptData.components.execution,
      '- Social: ' + aptData.components.social,
      '- Recovery: ' + aptData.components.recovery,
      '',
      '## ??½ë»¾ ?ê¾¨ì™‚',
      '- ?Œã…»???? ??½ë»¾ ?ë¨?‹”åª›Â€ ?ë¯ªì‘ï§??ê¾¨ì¤ˆ??ºë“ƒ äºŒì‡°ë£„æ²…??“£ ï§ê³¸??åª›Â€?ë©??? ?????ë¨?‹”åª›Â€ ??? ??ë¿????¹ì“½ ï§Â€????¾©????¨ì¢Š???ë¹ ??¸ë•²??',
      '- ??Ğª ?ë¨?‹”??æ¹²ê³ ????ê°?Î»????ë¨?– ??°ëµ¾?Îº????£í¡ ??Œë¼±????¸ë•²?? ?¨ì¢???ë¶¿ë¿‰???ëº?, ?????ë¶¿ë¿‰???ì¢Šë£???ëº£ë‚«???ê³—ê½‘??ë–—??–ì‚¤.',
      '- ???‚¬ ?ë¨?‹”????¥ë‹š ??ë–‡ ï§Â€??? ?ê¾¨ë•²???ê¹ƒë‚µ ï§Â€??¿ê½¦ ï§Â€??–ì—¯??ˆë–. ???‚¬????? ?´Ñˆì»™?ë¨?½Œ ?¾ë????ãˆƒ ??¼ì“¬ ?ºê¾§ë¦????½ë»¾ ?ë¨?‹”æºëš¯? ?ê³—ë‡™ ??ì”«??¸ë•²??',
      '',
      'ï§? ?ê³¸ê½¦ ?¨ê¾©??999 ?????? ?ë¶¾ì ®????¬ì˜„è¹‚ë???è«›ê³•???ê¾¨ì™‚?????åª›Â€ ??‰ë’¿??ˆë–. åª›ìˆˆ? ?ë¨?‹”??°ë£„ ?´ÑŠê½¦?ë¶¿ëƒ¼åª›Â€ ??»â…¤ï§?ï§£ì„ê°???ê¾©ìŸ¾?????ªï§ë¬ë•²??'
    ].join('\n');

    var chapter4 = [
      '## äºŒì‡°ë£???ê½??ë¶¿ë¹Ÿ',
      '- äºŒì‡°ë£???ê½? ' + dominantTenStar,
      '- ??¾§ê»?å¯ƒê³¸???? ' + _bijabCount(normalized.tenStarCounts),
      '- ??ê½??? ' + ((normalized.tenStarCounts['?ëª„ì˜±'] || 0) + (normalized.tenStarCounts['?ëº¤ì˜±'] || 0)),
      '- ?¿Â€???? ' + ((normalized.tenStarCounts['?ë©?'] || 0) + (normalized.tenStarCounts['?ëº?'] || 0)),
      '- ?ëª„ê½¦ ?? ' + ((normalized.tenStarCounts['?ëª„ì”¤'] || 0) + (normalized.tenStarCounts['?ëº¤ì”¤'] || 0)),
      '',
      '## ??°ë£ ???½© ??ê½',
      '- ??…Ğ????½©: äºŒì‡°ë£???ê½??åª›ëº¥ë¸??´Ñˆì»™?ë¨?½Œ ??½ë»¾ ??¾ë£„????‘¤?ªï§??? å¯ƒÂ€ï§???£í€ç‘œ???¸ì™‚??ãˆƒ ???????¾©????Œã…¼ì­??ˆë–.',
      '- ?¿Â€?????½©: ??¾§ì¾??¿Â€??æ´¹ì¢????¾ë?ê¼«ï§?ï§???»ë±·è¹‚ë??????±ìŒ?æ¿¡??ë¨?…¤æ¹?????æ¹²ê³•ì¤?æ¹²ê³•ì»???¹ì“½åª›Â€ ?ê¾©ìŠ‚??¸ë•²??',
      '- ??å¯ƒê³—?????½©: ??ê½??????¿Â€????¾©?????? ??ë¿????ì”¡è¹‚ë????ë¨?– è«›â‘¹ë¼?æ´¹ì’–????’ì‡±? ?¨ì¢???ë¹ ??¸ë•²??',
      '- åª›ë¨¯???ë¶¾ë±¾??è«›ì„?? ???‚¬ ?ë¨?‹”åª›Â€ ??€??ª›?????ë¿??å¯ƒê³—?????ï¼ˆ ï§Â€?ê³ ë¹ ??»ìªŸ ?ëº£ìª§??ä»¥ê¾©??ëª„ìŠ‚.',
      '',
      '## äºŒì‡°ë£???ê½???«ë—ªì¾??ê³•ë’— è«›â‘¸ì¾?,
      '- åª›ëº¤???°ëº¤? äºŒì‡¨ì»???¥ì ??½ë»¾ ï§â‘ºëª?1åª›ì’•ì¤?ï§ë¬’ì¨??í€? ??Œì  ?°ëº¤? ï§£ëŒ„ê²•ç”±?????ë¨?£?ë¶¾ì¤ˆ è¹‚ëŒ???¸ë•²??',
      '- ?¨ì‡±???ë¬ë£ ?ì¢ìƒ‡åª›Â€ è¹‚ëŒ? ï§???±ì ™/??????ê¶—å¯ƒê³—????¾ë£„???ºê¾¨?????ˆë–† ?±ÑŠë’ª??? ?????ˆë–.'
    ].join('\n');

    var annualNarrative = annualPlan.map(function(item, idx) {
      var rank = idx + 1;
      var riskBand = item.risk >= 75 ? '?¨ì¢??? : item.risk >= 55 ? 'å¯ƒì„?? : item.risk >= 35 ? 'ä»¥ë¬?? : '??‰ì ™';
      var playbook = item.risk >= 70
        ? '??í‰¬ ?ê³—ê½‘: ?ì¢‰í‡‹ ?ëº¤ì˜£è¹‚ë????±ÑŠë’ª????‰ë¿°, ?¨ê¾©ë¹?? ?ºê¾ªë¸?ï§£ë‹¿ê»?'
        : item.risk >= 50
          ? 'æ´¹ì¢????ìŠœ: ??½ë»¾??å¯ƒÂ€ï§ì•¹??5:5æ¿?è«›ê³•??'
          : '?¨ë“¦êº???ìŠœ: ???–– ?¨ì‡±??1åª›ì’•? åª›ëº¥ë¸?¯ƒ?è«›Â€???ê¹ƒë‚µ ?¨ì¢??';
      var note = item.conflictNotes && item.conflictNotes.length
        ? item.conflictNotes.slice(0, 2).join(' / ')
        : 'ï§ê³´êº??°â‘º???°ë¹????—ë¸³??';
      return [
        '## Y' + rank + ' ì¨?' + item.year + '??(' + item.ganZhi + ')',
        '- ???? ?ê¾ªë¿•: ' + item.risk + ' (' + riskBand + ')',
        '- ?ëª„ìŠ« ?ë¨?‹”: ' + item.yearScore + ' / ?????ë¨?‹”: ' + item.daewunScore + ' [' + item.daewunLabel + ']',
        '- ?°â‘·êº??ì¢ìƒ‡: ' + item.shock + '??£í€?,
        '- ???–– ?¿Â€ï§? ' + note,
        '- ??½ë»¾ ï§Â€ç§? ' + playbook,
        '- ?ë¶¿ë¹Ÿ: ' + item.summary
      ].join('\n');
    }).join('\n\n');

    var monthlyNarrative = monthlyPlan.map(function(item) {
      var band = item.risk >= 75 ? '?¨ì¢??? : item.risk >= 55 ? 'å¯ƒì„?? : item.risk >= 35 ? 'ä»¥ë¬?? : '??‰ì ™';
      var tactical = item.risk >= 70
        ? 'ä»¥ë¬’????‡êµ”?? 24??“ì»™ ??ˆê½¦ ???ëº¤ì ™.'
        : item.risk >= 50
          ? 'äºŒì‡¨ì»??ê³—ê½‘??–ì 3åª???„ë¸¯ ?ì¢?.'
          : '?ëº¤ë–Š ?´Ñˆì»™ ?¨ì‡±?£ç‘œ??ê¾©ì­Š è«›ê³—??';
      var advice = (item.adviceItems && item.adviceItems.length)
        ? String(item.adviceItems[0].body || '').replace(/\s+/g, ' ').trim()
        : '?ë¶¿ìŠ« è­°ê³—ë¼??ê³—ì” ????ì“¬';
      return [
        '## M' + String(item.month).padStart(2, '0') + ' ì¨?' + item.month + '??(' + item.ganZhi + ')',
        '- ?ê¾ªë¿• ' + item.risk + ' / ?ë¶¿ì­Š?ë¨?‹” ' + item.engineScore + ' / è«›ê³ ê½£ç”±?' + item.battery,
        '- ?±ÑŠë’ª??è«›ë?ë±? ' + band,
        '- ??ë¹?? ' + item.focus,
        '- äºŒì‡±?? ' + item.caution,
        '- ???? ' + item.countermeasure,
        '- ?ê¾¨ì™‚ ??¼ì™?? ' + tactical,
        '- ?ë¶½ì»™ ?„ë¶¾ì°?? ' + item.summary,
        '- ?ë¶¿ì­Š è­°ê³—ë¼? ' + advice
      ].join('\n');
    }).join('\n\n');

    var chapter5 = [
      '## ??½ë»¾ ?ºê¾ªë£?,
      '- ï§???: ' + (normalized.dist.wood || 0) + ' / ????: ' + (normalized.dist.fire || 0) + ' / ????: ' + (normalized.dist.earth || 0) + ' / æ¹???: ' + (normalized.dist.metal || 0) + ' / ??ï¦?: ' + (normalized.dist.water || 0),
      '- ï§Â€è«???½ë»¾: ' + (EL_KR[dominantEl] || dominantEl),
      '- ?¨ì‡°??å¯ƒê³ ë¸??°ëº¤? ?ë¶¾í€?ï§ë¬’ì¨?Îº?????‚¬?Î¼ë¿?ï§ê³¸???ê³¹ë¼¢??ä»¥ë¾???',
      '',
      '## ???? ??½ë»¾ ?ì¢Ší…‹??,
      '- ?ì¢Šâ” ??½ë»¾: ' + ((quantumDiagnostics.favorableElements || []).join(', ') || 'ä»¥ë¬???°ë¶¿??'),
      '- äºŒì‡±????½ë»¾: ' + ((quantumDiagnostics.cautionElements || []).join(', ') || 'ä»¥ë¬???°ë¶¿??'),
      '- ??¹ë–Š è«›ê³—ë¿? ' + ((quantumDiagnostics.yongshin || []).join(', ') || 'ä»¥ë¬???°ë¶¿??'),
      '- æ¹²ê³—??è«›ê³—ë¿? ' + ((quantumDiagnostics.kishin || []).join(', ') || 'ä»¥ë¬???°ë¶¿??'),
      '',
      '## ??ê¼/?·â‘¦????ºí€?,
      '- ?ì¢Šâ” ??½ë»¾??ï§ìš???ë¬’ë¾½ ??ê¼??äºŒì‡¨ì»??·â‘¦????¨ì¢????ë¨?¼«ï§Â€ ?ê¾©ë‹”??ä»¥ê¾©???ˆë–.',
      '- äºŒì‡±????½ë»¾??åª›ëº¥ë¸???ë¿????ï§???±ì ™???¨ì¢Šê¶??å¯ƒê³—????ºê¾©ê¶?è«›ê³—???¸ë•²??'
    ].join('\n');

    var chapter6 = [
      '## 10???±ÑŠë’ª??ï§?(??¼ë¿°??',
      annualNarrative,
      '',
      '## ï§¤ì’“???ê¾ªë¿• 3åª??ê³•ë£„',
      topRiskYears.map(function(yItem) { return '- ' + yItem.year + '?? ?ê¾ªë¿• ' + yItem.risk + ' (' + yItem.ganZhi + ')'; }).join('\n'),
      '',
      '## ??‰ì ™ 3åª??ê³•ë£„',
      lowRiskYears.map(function(yItem) { return '- ' + yItem.year + '?? ?ê¾ªë¿• ' + yItem.risk + ' (' + yItem.ganZhi + ')'; }).join('\n')
    ].join('\n');

    var chapter7 = [
      '## ?ë¶¾í€??±ÑŠë’ª?????˜’??(12åª›ì’–??',
      monthlyNarrative,
      '',
      '## ?¨ì¢???3åª›ì’–??,
      topRiskMonths.map(function(mItem) { return '- ' + mItem.month + '?? ?ê¾ªë¿• ' + mItem.risk + ' ì¨?' + mItem.focus; }).join('\n'),
      '',
      '## ??‰ì ™ 3åª›ì’–??,
      lowRiskMonths.map(function(mItem) { return '- ' + mItem.month + '?? ?ê¾ªë¿• ' + mItem.risk + ' ì¨?' + mItem.focus; }).join('\n')
    ].join('\n');

    var chapter8 = [
      '## ?¿Â€??æ¹²ê³•???ê¹Šë¼¢',
      '- Social ?ë¨?‹”: ' + aptData.components.social,
      '- äºŒì‡°ë£???ê½? ' + dominantTenStar,
      '- ?°ãˆ‘ë£»ì‚ì¨??¿ë£»ë¹??ì¢ìƒ‡: ??' + (conflictSignals.chungCount || 0) + ' / ??' + (conflictSignals.hyungCount || 0) + ' / ??' + (conflictSignals.paCount || 0) + ' / ??' + (conflictSignals.haeCount || 0),
      '',
      '## ?¿Â€???ì¢ì ™ ???½©',
      '- åª›Â€æºëš¯?™ï§??? ?¨ë“¯??ï§â‘ºëª´åª›? ?ºê¾¨ì±?ì¢ë‹”æ¿??ì¢ŠË??ëº¤ê½¦????¢Šì«??ˆë–.',
      '- ï§Â€??ì­ ?? ??°ì¤ˆåª›Â€ ?ê¾©ìŸ»????ë¿????»ì±¸ ??¸ì™‚??°ì¤ˆ ??½ë¹åª›Â€ ?Œã…¼?æ¹???Œë’¿??ˆë–.',
      '- åª›ëˆë²?ï§Â€?? ?¨ì¢????ë¶¿ë¿‰????¾ë£„?????ë¶¾ë‚«???ëº¤ì”¤?????ë¶? ?ì¢Šâ”??¸ë•²??',
      '- ?ë¬’ë¾½ äºŒì‡±?? ??ë¸??ê¾¨ì¦º æ¹²ê³—????’ì‡±? ?¾ëª„ê½?ë·€ë¸?§???????“£ ä»¥ê¾©??????‰ë’¿??ˆë–.',
      '- ???‚¬ ?ê¾¨ì™‚: ???‚¬ ?ë¨?‹” ??????ë¿???¿Â€????ë’‹????¨íµ ï§£ì„???? ï§ë¨­???ê³—ê½‘??–ì???ºê¾¨???ê½­??'
    ].join('\n');

    var chapter9 = [
      '## ï§ê³¸ë¾???Ğª ?ê¾¨ì™‚ ?ë¶¿ë¹Ÿ',
      '- Career: ' + aptData.components.career + ' / Wealth: ' + aptData.components.wealth + ' / Execution: ' + aptData.components.execution,
      '- ?ê¾ªë¿• ?¨ê¾©?? ' + risk + ' / ?ê³¸ê½¦ ?¨ê¾©?? ' + coeff,
      '',
      '## ?ºê¾©ë¹è¹‚???½ë»¾ ï§ã…»???,
      '- ï§ê³¸ë¾??ê¹Šë¼¢: äºŒì‡°ë£???ê½?€???½ë»¾ ?ë¨?‹” ?°ëº¤??æ¹²ê³—???°ì¤ˆ ??ë¸???«ê³¹? ?ê¹ƒë‚µ???¨ì¢???¸ë•²??',
      '- ??ì”¡ ?ê¾¨ì™‚: ?¨ì¢????ë¶¿ë¿‰???ê¾§íˆ‘?ë¨?«« è«›â‘¹ë¼? ??‰ì ™ ?ë¶¿ë¿‰???¨ì¢???ï§?¾¨ê¼??ëº¤ì˜£???ê³¸ìŠœ??¸ë•²??',
      '- ?ë¨?– ???½©: è¹‚Â€??ˆê½¦ ?ê³¸ì ?ë¶¿ë¿‰ ??¼ì¨· ??ê¶—å¯ƒê³—???å¯ƒë??‚ï§? ??…ë’— å¯ƒê»‹?????––??…ë•²??',
      '- ?ê¾¨ì¤ˆ??ºë“ƒ ??ìº: ??¤ë£†/?ë¬’ë¾½ ??¾©????ë¶¾í€??±ÑŠë’ª??è«›ë?ë±??ï§ìš????ˆìŸ»??°ì¤ˆ è­°ê³—???¸ë•²??',
      '',
      '## 30/90/180????½ë»¾ ?ê¾¨ì™‚',
      '- 30?? ?ë¨?– ?ê¾©ë‹” ï§¡â‘¤???¨ê¾©ë¹?å¯ƒÂ€???·â‘¦?? ??ê¶—å¯ƒê³—??æ¿¡ì’“???.',
      '- 90?? ?ê¹ƒë‚µ ?¨ì¢?????–– ?ê¾¨ì¤ˆ??ºë“ƒ 1åª?ï§ë¬’ì¨? ?ë¬’ë¾½ æ´¹ì’–??ï§ë‚…Ğ¦??.',
      '- 180?? ?????€???????åª›ëº¤???ê³¸ë¿­ ?ëº¤ì˜£ + ?¨ì¢?????…Ğ??ë¨?£??.'
    ].join('\n');

    var chapter10 = [
      '## ï§¤ì’–ì¥???•í‰´??ï§ë¶¿?†ï§?',
      '- ï§Â€æ¹?åª›Â€??ä»¥ë¬’????ê¾ªë¿• ?? ' + (riskBreakdown.parts.daewunSeunConflict >= riskBreakdown.parts.elementImbalance ? '????”ë£¹ê½???°â‘¸ë£? : '??½ë»¾ ?ºë‡???),
      '- ï§Â€æ¹?åª›Â€??åª›ëº¥ë¸?æ¹²ê³ ???? ' + Object.keys(aptData.components || {}).sort(function(a, b) { return (aptData.components[b] || 0) - (aptData.components[a] || 0); }).slice(0, 1).join(', '),
      '- ?ë±€??è«›ë¶½?????1åª›Â€ï§Â€: ?¨ì¢???????ê¶—å¯ƒê³—??ï§Â€??æ´¹ì’–??24??“ì»™) ?ê³¸ìŠœ.',
      '- ?ë±€??åª›ëº¥???ë¹ ??1åª›Â€ï§Â€: ??‰ì ™ ?????–– ?¨ì‡±????¥ì”ª?ëªƒì˜“ ï§ë¬’ì¨?',
      '',
      '## ??½ë»¾ ?·â‘¦??,
      '- 7?? ?ê¾ªë¿• ?ê³¸ì ?ì¢ìƒ‡ 1åª›ì’•ì­??°ë¶¿???Å???±ì ™ ?°â‘¸ë£???“êµ….',
      '- 30?? ?ë¨?–/?ê¹ƒë‚µ ï§Â€??1åª›ì’–ëµ??¨ì¢???í€??·â‘¦???ì¢????ë¨?.',
      '- 90?? ?ê¾¨ì™‚ ?ì¢?/?ë¨?¦° ??????ºê¾¨?????ìº æ´¹ì’–????…ëœ²??„ë“ƒ.',
      '',
      '## åª›ì’–??ï§£ì„ê°??,
      '- äºŒì‡°ë£???ê½?' + dominantTenStar + ' åª›ëº¤??? ?ì¢???ë¦º ?¨ì‡±???´Ñˆì»™?ë¨?½Œ ??¾ë£„è¹‚ë???å¯ƒÂ€ï§ì•¹???ê³—ê½‘??¸ë•²??',
      '- ?ì¢Šâ” ??½ë»¾(' + ((quantumDiagnostics.favorableElements || []).join(', ') || 'ä»¥ë¬??) + ') ä»¥ë¬’?????ê¼ì¨ŒçŒ·??–???¨ì¢???¸ë•²??',
      '',
      '??¼ìŸ¾ ?ì¢ë¼µ?? "?¨ì¢????´Ñˆì»™?ë¨?’— è«›â‘¹ë¼±ç‘œ??ê³—ê½‘??í€? ???ê¾ªë¿• ?´Ñˆì»™?ë¨?’— ï§ë¬’ì¨???½ë»¾??•ë–. ?ºê¾©ê½?å¯ƒê³Œ?µç‘œ???°ë£ æ´¹ì’–???°ì¤ˆ ?ê¾ªì†š??•ë–."'
    ].join('\n');

    var canonicalData = _buildSibylCanonicalData(normalized, riskBreakdown, aptData, annualPlan, monthlyPlan);

    var chapters = [
      { key: 'coreMatrix', title: 'CH.01 ??•í‰´???„ë¶¿ë¼?ï§ã…½?ƒç”±???, content: chapter1 },
      { key: 'riskAnalysis', title: 'CH.02 ?ê¾ªë¿• ?¨ê¾©???ëº? ?ºê¾©ê½?, content: chapter2 },
      { key: 'aptitudeAnalysis', title: 'CH.03 ?ê³¸ê½¦ ?¨ê¾©???ëº? ?ºê¾©ê½?, content: chapter3 },
      { key: 'tenGodPattern', title: 'CH.04 äºŒì‡°ë£???ê½?€???°ë£ ???½©', content: chapter4 },
      { key: 'elementBalance', title: 'CH.05 ??½ë»¾ è«›ëªƒ???? ?ë¨?¼«ï§Â€ ??ºí€?, content: chapter5 },
      { key: 'yearlyFlow', title: 'CH.06 10???ê¾ªë¿• ?¨ê¾©??æ´¹ëªƒ?????ê½•', content: chapter6 },
      { key: 'monthlyPlanner', title: 'CH.07 ?ë¶¾í€??±ÑŠë’ª?????˜’??, content: chapter7 },
      { key: 'relationship', title: 'CH.08 ?¿Â€?¨ê¾©? ?ì¢ì ™ ???½©', content: chapter8 },
      { key: 'moneyCareer', title: 'CH.09 ??Ğª??ï§ê³¸ë¾??ê¾¨ì™‚', content: chapter9 },
      { key: 'finalMessage', title: 'CH.10 ï§¤ì’–ì¥???½ë»¾ åª›Â€??€ë±?, content: chapter10 }
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

  /* 10???ê¾ªë¿• æ´¹ëªƒ????ê³—ì” ??*/
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

  /* SVG æ´¹ëªƒ??????œ‘ï§?*/
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

  /* ??¾§ì¾??¨ì‡°??å¯ƒìˆ??????¨ì»™ ï§£ì’“ì»?ï§ê³¸???°ë¶¿?? G_POWER ??ã€???“êµ… */
  function _buildSmartWarning(pillars, dominant, counts, dist) {
    var power = window.G_POWER;
    var KE_LOCAL = { wood:'earth', fire:'metal', earth:'water', metal:'wood', water:'fire' };
    /* ????¨ì»™ ?ë¨?ƒ¼: ï§£ì’“ì»?ë¨?½Œ ï§ê³¸???¨ê¾©ê¶?(G_POWER èª˜ëªƒì¤????–ë¿‰???ëº¥ì†—) */
    var dayGan = pillars && pillars.d && pillars.d.g;
    var dayEl = (dayGan && GAN_EL[dayGan]) || (power && power.dayEl) || 'water';
    var jaeEl = KE_LOCAL[dayEl];
    var total = dist.total || 1;
    var bijabPct = Math.round((dist[dayEl] || 0) / total * 100);
    var jaeCount = jaeEl ? (dist[jaeEl] || 0) : 0;
    var jaePct   = Math.round(jaeCount / total * 100);
    /* ???ì¢‰ì»¯/?ì¢ë¹Ÿ: G_POWER ?ê³—ê½‘, ??ì‘ï§???¹ë¸˜+??¾§ì¾??ë¨?ƒ¼ ??¾©???¨ê¾©ê¶?*/
    var isStrong;
    if (power && typeof power.isStrong === 'boolean') {
      isStrong = power.isStrong;
    } else {
      var PAIEL_W = { wood:'water', fire:'wood', earth:'fire', metal:'earth', water:'metal' };
      var parElW = PAIEL_W[dayEl];
      var friendW = (dist[dayEl] || 0) + (parElW ? (dist[parElW] || 0) : 0);
      isStrong = (friendW * 2 >= total);
    }
    var bc = (counts['??¾§ê»?] || 0) + (counts['å¯ƒê³¸??] || 0);
    /* ??¾§ì¾??¨ì‡°?? G_POWER.isStrong + ?ë¨?ƒ¼ ??¾©??25% ??ê¸½ OR ??ê½?ç§»ëŒ???3åª???ê¸½ */
    if ((isStrong && bijabPct >= 25) || bc >= BIJAB_WARN_THRESHOLD) {
      if (jaeCount === 0) {
        return '??¾§ì¾?ï¦‡ë¶·?? æ´¹ë°´ì»?+ ??ê½?ç¸•â†’?? ?ê¾©ìŸ¾ ?¨ë“¬ì­? åª›ëº¥ë¸???¨ì»™ ?ë¨?¼«ï§Â€???°ì’“?„åª›? ï§ë²? ??‰ë’¿??ˆë– ????…ë–’, ?¨ì¢ì­? ??Ğª ?¾ë‹¿ì»§åª›ê³¸ì”  ??ˆë–†???´ÑŠâ€?ë¶¾ë§—??ˆë–. åª›Â€??åª›ëº¥ë¸??ë¨?…??åª›Â€???ê¾ªë¿•?????½©????ë’— ??ê½??…ë•²??';
      }
      if (jaePct < 15) {
        return '??¾§ì¾?ï¦‡ë¶·?? ?¨ì‡±??å¯ƒìˆ?? [??‡ìªŸ ?ë¨?ƒ¼ ??¾©ì¨?' + bijabPct + '%] ??Ğª ?ë¨?¼«ï§Â€(' + (EL_KR[jaeEl] || jaeEl) + ' ' + jaePct + '%)åª›Â€ ??ì»??ì¾¶ ?â‘¥ë¹??¸ë•²?? ??…ë–’???ë¨?–’ è«›ì„?¬æ€?è­°ê³—ë¼?å«„ê³•? ???½©???Îºë¦??¨ì¢Š?°æ€?å¯ƒìŒ????ëº¤ê»œæ¿???ë¼±ï§?????‰ë’¿??ˆë–.';
      }
      return '??¾§ì¾?ï¦‡ë¶·?? ?¨ì‡°??å¯ƒìˆ?? [??‡ìªŸ ?ë¨?ƒ¼ ??¾©ì¨?' + bijabPct + '%] ??…ë–’???ë¨?–’???ë¬ì ° å«„ê³•? ?ê¹Šë¼¢???? æ¹²ê³•ì»???…Ğ?ë¨?½Œ è«›ì„???ï§ë‰ê°????±ì‘??¬ë•²?? åª›ëº¤???è«›ì„???ãˆƒ ??†ì”  ??¸ë•²??';
    }
    /* ?¿Â€???ëº£ì»¯: ?ì¢ë¹Ÿ??•ëœ² ?¿Â€?ê¹†ì”  äºŒì‡°ë£??ë’— å¯ƒìŒ??*/
    if (!isStrong && (dominant === '?ë©?' || dominant === '?ëº?')) {
      return '?¿Â€??ï¥´ì„‰?? ?ëº£ì»¯ åª›ë¨¯?. æ´¹ì’–?‰ì¨Œ??? £ ?ë¨?¼«ï§Â€åª›Â€ ??€ë¸???¨ì»™????–ë¸¬??í€???‰ë’¿??ˆë–. ?¨ì‡°ë£???ê¾¨ê¼äºŒì‡±?½ì¨Œ?ë¨?¦°??¾ª?‹ì¨Œ?ê³´íˆ’????‰íŠ‚åª›Â€ ?ë¨?»»???ê¹†ì˜£ ??‡ì °??ï§¡â‘¤???????‰ë’¿??ˆë–.';
    }
    /* ??ê½??¨ì‡±ì¨? ??¼ì £æ¿???ê½??ë¨?ƒ¼ ??¾©ì¨?+ ??ê½?ç§»ëŒ???ï§â‘¤ëª??ë¯ªì“£ ???­” å¯ƒì„??*/
    var jaeStarCount = (counts['?ëª„ì˜±'] || 0) + (counts['?ëº¤ì˜±'] || 0);
    if (!isStrong && jaeStarCount >= 2 && jaePct >= 25) {
      return '??ê½?ç¸•â†’?? ?¨ì‡±ì¨?å¯ƒìˆ?? ??Ğª ?ë¨?¼«ï§Â€ ??¾©ì¨?' + jaePct + '%)????¨ì»™???ëº£ì»¯??¸ë•²?? æ¹²ë‰?¾ì¨Œ??? £ ?ëº?„åª›Â€ ?ë©¸ì»™?¿Â€?¨ê¾¨? ???ˆ??—ê¶??ï§Â€??åª›Â€?Î¼ê½??????ë–†??¬ë•²??';
    }
    return null;
  }
  /* ??ì ?ëª…ì†š: ?´Ñ‰ì¾­???ëª„í…§?ºÂ€ ????*/
  function _bijabWarning(counts, dominant) {
    return _buildSmartWarning(null, dominant, counts, _ohaengDist(window.G_PILLARS));
  }

  /* ???? ?¾ë?ì¦??ê¹Šë¼¢ ?ºê¾©ê½?HTML ??š®ë±?(1000??) ???? */
  function _buildNatureAnalysis(pillars, dist, dominant, counts) {
    var dayGan = pillars && pillars.d && pillars.d.g;
    var nature = (dayGan && DAYGAN_NATURE[dayGan]) || DAYGAN_NATURE['é¶?];
    var tenNature = (dominant && TENSTAR_NATURE[dominant]) || TENSTAR_NATURE['?ëª„ì˜±'];
    var power = window.G_POWER;
    var KE_LOCAL = { wood:'earth', fire:'metal', earth:'water', metal:'wood', water:'fire' };
    /* ??¨ì»™ ?ë¨?ƒ¼ ï§ê³¸???°ë¶¿??*/
    var dayEl = (dayGan && GAN_EL[dayGan]) || (power && power.dayEl) || 'water';
    var jaeEl = KE_LOCAL[dayEl];
    var total = dist.total || 1;
    var bijabPct = Math.round((dist[dayEl] || 0) / total * 100);
    var jaePct = jaeEl ? Math.round((dist[jaeEl] || 0) / total * 100) : 0;
    /* ?ì¢‰ì»¯/?ì¢ë¹Ÿ fallback */
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
      ? '?ì¢‰ì»¯(ç¿ãƒ¥??' + (powerScore ? ' ' + powerScore + '?? : '') + ' ????¨ì»™ ?ë¨?¼«ï§Â€ ?¨ì‡±?? ??ºë¦°(ï¦Šê¾£ê°?ì¨??? £ ?ê¾©ìŠ‚'
      : '?ì¢ë¹Ÿ(ç¿ãƒ¥??' + (powerScore ? ' ' + powerScore + '?? : '') + ' ????¨ì»™ ?ë¨?¼«ï§Â€ ?ºÂ€è­? ??¹â€???Œë’°) ?ê¾©ìŠ‚';
    var bc = (counts['??¾§ê»?] || 0) + (counts['å¯ƒê³¸??] || 0);
    var html = '';

    /* ??Block 1: ??¨ì»™ æ¹²ê³—ì­?*/
    html += '<div class="sb-nature-block">'
      + '<div class="sb-nature-tag">??INNATE DISPOSITION ?????¨ì¢Šê¶?æ¹²ê³—ì­??ºê¾©ê½?/div>'
      + '<div class="sb-nature-label">' + nature.name + ' &nbsp;&middot;&nbsp; <span class="sb-nature-type">' + nature.type + '</span></div>'
      + '<p class="sb-nature-body">' + nature.nature + '</p>'
      + '<div class="sb-nature-row"><span class="sb-nature-key">ï§ê³¸ë¾?åª›ëº¤??/span><span class="sb-nature-val">' + nature.strength + '</span></div>'
      + '<div class="sb-nature-row"><span class="sb-nature-key">?´ÑŠâ€????Œì </span><span class="sb-nature-val sb-nature-val--warn">' + nature.weakness + '</span></div>'
      + '<div class="sb-nature-row"><span class="sb-nature-key">?ê³¹ë? ï§ê³´??/span><span class="sb-nature-val">' + nature.career + '</span></div>'
      + '</div>';

    /* ??Block 2: ??ê½??ë¨?¼«ï§Â€ è¸°â‰«ê½?*/
    html += '<div class="sb-nature-block">'
      + '<div class="sb-nature-tag">??TENSTAR VECTOR ??äºŒì‡°ë£???ê½?[' + dominant + '] ï§ê³¸ë¾??ë¨?¼«ï§Â€</div>'
      + '<p class="sb-nature-body">' + tenNature.profile + '</p>'
      + '<div class="sb-nature-row"><span class="sb-nature-key">???–– ????/span><span class="sb-nature-val">' + tenNature.pro + '</span></div>'
      + '<div class="sb-nature-row"><span class="sb-nature-key">??äºŒì‡±?????½©</span><span class="sb-nature-val sb-nature-val--warn">' + tenNature.con + '</span></div>'
      + '</div>';

    /* ??Block 2-B: ??ê½??ºê¾ªë£?æ¹²ê³•ì»??ë©¸ì»™?¿Â€?????½© ?ºê¾©ê½?*/
    (function() {
      var RELATIONSHIP_PATTERN = {
        '??¹ë–Š': { title:'[??¹ë–Š äºŒì‡°ë£? ?ë¨?¿°??»ìœ­??è¸°ì¢ë­???¿Â€??, pattern:'?¿Â€?¨ê¾©ë¿???’ì‡±? äºŒì‡°????ë¸??ï§â‰ªë¸??ê³????ëª„ë¸??ì¾¶ ï§ëš®ë±???ë¨?¼«ï§Â€?????¨ì¢Šê¶??¬ë•²?? ??¹ë–Š??åª›ëº¥ë¸?????? ????ä»??ê³????ê»‰ì¾¶ ï§ëš®ë±¾æ€? ?ê¾©ì” ?ë¶¿ë¼±?? ?ì¢Šã‰§æ¿??ºê¾©?æ¹²ê³? ??€ê±???Î»?????‰ë¼± ?ë¨?¿°??»ì‡å¯??ë©¸ë¦°???ëº£ë•²?? æ´¹ëªƒ???ï§Â€??íŠ‚å¯?è¸°ì¢???è¹‚ë????ë¨?¼«ï§Â€åª›Â€ ???­Š??í€? è¹‚ëŒê¸??æ¹²ê³•???? ??…ë’— ï§£ìˆ‰ë¸?§?ê½Œ????€????ë³?” ???ê¾©ë©?????¿Â€??æ´¹ì¢ë¿????¥ë¸®????¸ë•²?? ï§ê³¸???ë¶¿ê»Œ ??????? ® ï§ë?ë¸??è«›â‘¹???°ì¤ˆ ?ëº?„????—ì½??ë’— ???½©??è«›ì„???ãˆƒ ??°ë“ƒ??? ï§ê¾©ì­??ê¾©ìŠ‚?????¸™??? ï§ì‚µë¹???¥ì …???????¸ë•²?? ?ë©¸ì»™?¿Â€?¨ê¾©ë¿???ë¨?–Š????“í€ç‘œ?ï§ë‚‡?????¼ì ™??ë’— "No ?ê³—ë’¿"???Îºë¦??¿Â€??ï§Â€??¿ê½¦??å¯ƒê³—??ê³¸ì—¯??ˆë–.', warning:'æ¹²ê³•??? ??»ì???è«›ì„???°ì¤ˆ ?ëª…ë¸³ ??°ì¤ˆ ?ê¾©ìŸ». è¸°ì¢ë­????“í€???¼ì ™ ??ˆì ´???ê¾©ë‹”.' },
        '?ê³?': { title:'[?ê³? äºŒì‡°ë£? ?ê¾¨ì»»?ê²¶ë£¹?„æ¹²ê³—ï¼œ??åª›ëº¥ë¸??¿Â€??, pattern:'?ê³???äºŒì‡°ë£??ë’— ï§ë‚†??? ?ë©¸ì»™?¿Â€?¨ê¾©ë¿?????ëª„ì“½ ?ºëŠë¹€?±Ñ‹ë¸¿??ï§ë±??ï§Â€?ê³¹ë¸¯?? æ²…ëš¯????ê¾©ìŸ¾??ë’— ?ë¨?¼«ï§Â€åª›Â€ åª›ëº¥ë¹€??ˆë–. ?ì¢ë­…æ¿¡ì’–???ëª„ë¼±????—ì½?Î¼?æ¿¡??ê³????ëº£ë£„???ï§? æ´??¨ì‡±??ë¨?½Œ ??ë£„ç§???„ì¾¶ æºë”†? ?ê³¸ì¿‚????£ë¦°??å¯ƒìŒ??ª›? è«›ì„???¸ë•²?? ?ê³´íˆ’?ë¨ƒë£¹ê½‘è«›ê±”ë£¸?ï§â‘¥????¿Â€?¨ê¾©ë¿???´ÑŠâ€???°â‘¸ë£????±ë¼±??ë¦° ????§? ?ë¨?–Š??ï§â‘¤?¤å¯ƒ??¿Â€?¨ê¾©??æ´¹ì’–?????¿ë¦°?????½©??ï§ê¾¨ì¤ˆì¨Œ?ë©¸ì»™?¿Â€????¥ì …??äºŒì‡±???ë¨?”¤????¸ë•²?? ??—ë ª, ?ë¨?–Š????¾©?????…â”° ?ê¹Šë¼¢????°ë“ƒ?????æ´¹ë°¸ë£„æ¿¡?åª›ëº£?????•ê¼«ï§Â€????????‰ë’¿??ˆë–. ?¿Â€?¨ê¾©ë¿??"?°â‘¸?????·ì»–??í€?ï§ë?ë¸?¹²?????ë–‡?ê³¸ì‘æ¿???ˆì ´??ë’— å¯ƒê»‹????¹ã€??ê¾¨ì™‚??…ë•²??', warning:'æ²…ëš¯???°â‘¸ë£æ€??°â‘¸ë£?è«›ì’–ë¼??°ì¤ˆ ?ëª…ë¸³ ?¿Â€?????ˆ¼ ???½©. ?ëªƒê¶¡????ˆì ´?????––.' },
        '?ëª„ì˜±': { title:'[?ëª„ì˜± äºŒì‡°ë£? ?ëº¤ê¶›?ê²¶ë£»???–ìŸ» ?????ë¨?¼«ï§Â€', pattern:'?ëª„ì˜±åª›Â€ äºŒì‡°ë£??ë’— ï§ë‚†??? ?ë³¤í€???¢Š?¤å¯ƒ??ëªƒã˜???ëº¤ì˜£???ï§? æºë”†????ˆë’— ??¥ì”ª ?¿Â€???ì¢?????€???????‰ë’¿??ˆë–. ?ê³????ë¨?–Š??æ¹²ê³—???°ì¤ˆ ??? £??êµ…???¿Â€?±Ñ‹ë¸¯??»ë’— è¹‚ëªƒ????ëº?„åª›Â€ ??‰ë¼±, ?¿Â€?¨ê¾§? æºë”†ë¼±ï§?‰ë‹”æ¿???°ë“ƒ??‰ë¿‰å¯??ëº£ì»¯åª›ë¨¯??ä»?????‰ë’¿??ˆë–. ??Ğª????„ë¹?¿Â€?¨ê¾¨? æ¹²ê³•ì»??°ì¤ˆ ?¿Â€?¨ê¾¨? åª›ì’–ê½??í€??ì¢???ë’— ???½©????‰ë¼±, ??ì”¡?????ªï§?ï§??¿Â€?¨ê¾¨ë£??ë¨?”¸??????´ÑŠâ€œåª›? ??ì˜±????‰ë’¿??ˆë–. åª›ë¨¯ê½???¨ë“¦ì»§è¹‚?€????¼ìŠœ??å«„ê³•???ëª„ë¼±åª›Â€ ?ë¨?¿°??»ìœ­?ê³•Å? ??¿ì¾¬???Îºë¦?åª›ë¨¯ê½???°ë“ƒ??‰ë–—?ë¨?½Œ ï§ë‰ê°??ë¨?”¤????¸ë•²?? ??¾©??????æ¹²ê³•ì»??¿Â€?¨ê¾¨? ??ë£„?ê³¸ì‘æ¿??´ÑŠí…??ë’— ?ëªƒì °??ä»¥ë¬’???¸ë•²??', warning:'?ëªƒã˜ ?¿Â€?±ÑŠì“½ ?ê¾§ë„??å¯ƒì?ë¼? åª›ë¨¯ê½??¨ë“¦ì»??Î»????ë–‡??åª›ì’•ì»???ê¾©ìŠ‚.' },
        '?ëº¤ì˜±': { title:'[?ëº¤ì˜± äºŒì‡°ë£? ?ì¢ì¨·??í€????–Š?ê³¸ì”¤ ?¿Â€??, pattern:'?ëº¤ì˜±åª›Â€ åª›ëº¥ë¸?ï§ë‚†??? ??Œëƒ½??ï§Â€??ºí€?ï§?‚†?????½ë¸¯???ì¢ŠË?æ¹²ê³•ì»??¿Â€?¨ê¾¨? ?ì¢ìƒ‡??¸ë•²?? ?¿Â€?¨ê¾¨? ???æ¿?ï§ë¸? ??„í€? ???‹”??æºë”„????‰ì ™?ê³¸ì”¤ ?ëª„ë¿°???Îºë¦°åª›??ì¢???ë’— ?ê¹Šë¼¢????‰ë’¿??ˆë–. æ´¹ëªƒ???è¹‚Â€?ë¶¿ë¿‰ ????????ì»??åª›ëº¥ë¹? ?¿Â€?¨ê¾©ë¿????ˆì¤ˆ????ë£??€êµ?åª›ëˆë²????·êº¼??æ¹²ê³—?????½©???¨ì¢???ë’— å¯ƒì?ë¼????‰ë’¿??ˆë–. ?ê³????ë¬? ??¼ë‹”???ºë‰?ªç§»?? ??»ì˜’ æ¹²ê³—ë¼??í€???€????ê¾©ìŸ»??ë’— ?ê¹Šë¼¢?? ??€????“ì»™ ??‰ê¸½ç§?ï§ì‚µë¸???ì»»æ¿¡???ë¼±ï§Â€??å¯ƒê»‹????ï§ë‚†????¿Â€???ê¾ªë¿• ???½©??…ë•²?? ?ºëˆì­??è­°ê³Œë¦???ëª„ë¼±æ¿??°ì‡°ê¶???ê³—ë’¿???¿Â€????‰ìŸ¾ï§ì•¹??åª›ëº¥???¸ë•²??', warning:'??€???ê¾©ìŸ» ????ì»????½©. ?ºëˆì­?è­°ê³Œë¦??ëª„ë¼±????ˆì ´???ê¾©ë‹”.' },
        '?ë©?': { title:'[?ë©? äºŒì‡°ë£? ç§»ë????»ì­?ê²¶ë£¹?è«›ê³—???????´ÑŠâ€?, pattern:'?ë©???äºŒì‡°ë£??ë’— ï§ë‚†??? åª›ëº£???è­°ëŒ?±åª›ë¨?‚µ ç§»ë????»ì­æ¿?äºŒì‡°????ëº£ë£„???ï§? ??¿ì¾¬???¿Â€?¨ê¾©ë¿???¨ì‡°ë£??ï§Â€è«??ëº?„æ¿???—ì½?????ê³??ë¨?¾¶ ???¸¬åª›ë¨¯??ä»¥ë¾??? ?¿Â€?¨ê¾¨? ??ì­…????–ë¿´æ¿??ëª„ë–‡??ë’— å¯ƒì?ë¼????‰ë¼±, ??°ë²‘????‘ë£Š ?¿Â€?¨ê¾¨? ??¼ì ™??ë’— å¯??ë¨?»œåª›Â€ ??ê½•æ€??ºëŠ???ì¾¶ ?ë¨?º¨ï§?????‰ë’¿??ˆë–. ?ë©???åª›ëº¥ë¸?????ë¨?¾¶ ï§Â€ï§Â€?? ?ëª„ì ™??è«›ì„ë¦??ê¾ªë¹ äºŒì‡°??ëªƒë±¾??ï§Â€??íŠ‚å¯???‰íŠ‚??è¹‚ë????¿Â€????ºê¹­?¨ê¾§? ?ëº¤ê½¦??ë¦° ??Œë’¿??ˆë–. ???? ?ë¨?¼«ï§Â€åª›Â€ åª›ëº¥ë¸???“ë¦°?ë¨?’— ?¿Â€?¨ê¾©ë¿????ì»??åª›ëˆë²??ë¨?’— ?ê¾©ìŸ¾ ??¥ì …????±ë¼±??????‰ë’¿??ˆë–. ???????‰ìŸ¾ ??ê¼????ë–‡?ê³¸ì‘æ¿?ï§ëš®ë±???ê³?åª›Â€ ?ë¶¿ì­…??????ˆë’— ?´ÑŠâ€œç‘œ??´ÑŠí…??ë’— å¯ƒê»‹???¿Â€???Î¼??????––??…ë•²??', warning:'??ì­…???¿Â€???´ÑŠâ€œæ¿¡??ëª…ë¸³ ?¨ì¢Š???ê¾ªë¿•. ?â‘¥ë¹????—ì½ ?ê³—ë’¿???¿Â€?????‚¬?Î¼???ë¯ªì”¤??' },
        '?ëº?': { title:'[?ëº? äºŒì‡°ë£? ?ë¨?Šƒì¨Œï§¢?†ì—« ä»¥ë¬’???¿Â€??, pattern:'?ëº???åª›ëº¥ë¸?ï§ë‚†??? ï§ë‚‡?????ë¸??ºê¾¨?æ€??ë¨?Šƒ??ä»¥ë¬’???Å? ?ê³??ë¨?¾¶????ˆì”ª???????ï§?‚†?«åª›ë¨?“£ ?ë¶½ë„??¸ë•²?? ??æ¹²ê³—????°â‘¹???ë’— ??°ë“ƒ?????ï§ã…¼????‰ì ™?ê³¸ì” ??ï§Â€??¿ìŸ»???¿Â€?¨ê¾¨? ?ëº¤ê½¦???ï§? æ¹²ê³—???èª˜ëªƒ???ë’— ?ê³???????ê½Œ????¢Š?¤å¯ƒ??ì¢ŠËç‘œ?å«„ê³•ëª?????½©???????¸ë•²?? ?ë¨?Šƒ ä»¥Â€??ë¿‰ ????ï§ë¬’ê°?????ëª„ì“½ ??¼ë‹”????????¹ì”¤ ?????«ê³¹?, ?¿Â€?¨ê¾©ë¿???¨ì‡°ë£???ë¨?–’????ë¸??ï§â†”ì¾???ë’— å¯ƒê»‹??äºŒì‡±???ê¾ªë¿•??…ë•²?? ??¼ë’ªæ¿¡ì’–ë¿‰å¯ƒ??ºÂ€?¨ì‡³ë¸???¨ì‡°ë£??ï§?‚†?«åª›ë¨?”  ï§ëš¯ê½???½ë“ƒ??‰ë’ªæ¿??ê³Œê»??Å? ??¿ì¾¬??åª›Â€æºëš¯???¿Â€?¨ê¾©ë¿????°ë–???ë¨?’— ??¾ª???°ì¤ˆ ?????¸ë•²?? ?ºë‰??ê¾ªë¸³ ???ëª„ì“£ ??ìŠœ??ë’— ?¿Â€???ê³—ë’¿???¿Â€?¨ê¾¨? ????¿ìŠ‚æ¿?ì¾?ï§ëš®ë²??ˆë–.', warning:'?¨ì‡°ë£??æ¹²ê³—? ?ê³¸ìŠœ??°ì¤ˆ ?ëª…ë¸³ ?¿Â€????¥ì …. ?ºë‰??ê¾©ê½¦ ??ìŠœ ??ˆì ´???¿Â€å«?' },
        '?ëª„ì”¤': { title:'[?ëª„ì”¤ äºŒì‡°ë£? ??†ê°¹?ê²¶ë£°êµ…ç”±?ì»???ˆë’— ?¿Â€?????½©', pattern:'?ëª„ì”¤??åª›ëº¥ë¸?ï§ë‚†??? æºë”†????ˆë’— ï§Â€???´ë¨®ìªŸç‘œ??ì¢ìƒ‡??Å? ??°ì¾¾????±ê¸½?????ë¶¿ë¿‰ ??„ì¾¶ ï§Â€?·â‘¦ë¸???ë¨?µ§??ˆë–. ?ë¨?–Šï§ëš¯????€???ë©¸í€åª›? ?????ë¿¬ ?ê¾©ìŠ‚ ??ê¸½??°ì¤ˆ ???ë©¸ë‚µ ??ã€???¿Â€?¨ê¾¨? ï§ëš®ë±¾ï§? ??†ì‘????ë’—?? ??¿ì¾¬???ëª??ë¨?½Œ????°ë–??êµ…??å«„ê³•ì­??ì¾¶ è¹‚ëŒ??????‰ë’¿??ˆë–. ?ëª„ì”¤????‡ë“…????“ì»–?????‹”??æºë”†? ?ëª„ë¿°?ë¨?¾¶???´ë±???ï§ã…»??????ï§? ??¼ë‹”?ë¨?¾¶????„ë¹??ë¦° ??€????????°ì¤ˆ ?ºê¾¨ìª??¸ë•²?? ?ê¾©ì” ?ë¶¿ë¼±åª›Â€ ?°â‘¸????¾ë?????¦° ?ê¾©ë¿‰ ?¿Â€?¨ê¾©ë¿????„ê¹‰??ë’— ???½©??è«›ì„???ë¼±, ?Îºë¦???°ë“ƒ??‰ë–— ?ëº¤ê½¦???´ÑŠâ€????€???????‰ë’¿??ˆë–. ???????ˆë’— ?¿Â€???ì¢? ??ë£„????ë–‡?ê³¸ì‘æ¿???—ì½??ë’— ?ëªƒì °???ê¾©ìŠ‚??¸ë•²??', warning:'??‰ë? ?ºë‡?????„ê¹‰ ???½©??°ì¤ˆ ?ëª…ë¸³ ?ì¢ŠË??´ÑŠí… ??€???. ???????ˆì ´?????––.' },
        '?ëº¤ì”¤': { title:'[?ëº¤ì”¤ äºŒì‡°ë£? ??ˆë’¿ì¨Œï§???ä»¥ë¬’????¿Â€???´ÑŠâ€?, pattern:'?ëº¤ì”¤??åª›ëº¥ë¸?ï§ë‚†??? è­°ê³—ë¼??í€?åª›Â€?œëŒ?‚æ€?ï§Â€?ë¨°ë¸¯????ë¸?ë¨?½Œ ?¿Â€?¨ê¾©???????ï§¡ì– ???ˆë–. ???ëª„ì“½ ?ê¹†ì˜£???ëº£ë’— ?ê³—ê½Œ ï§ëš¯?????´ë¼± ?´ë¨¯?ì¨Œ?ê³·ë–ì¨Œï§????¿Â€?¨ê¾©ë¿????†??è«›ì’—ë¹€??ˆë–. æ´¹ëªƒ???ï§Â€??íŠ‡ è¹‚ëŒ„??? ï§Â€?ë¨?”  ?ê³????ë¨?‘‰?ê¹†ì“£ ç§»â‘¦ë¹??ë’— è«›â‘ºë¼??°ì¤ˆ ?ë¨? ?? ??ã€?åª›ëˆë²??´ÑŠâ€œåª›? ?ëº¤ê½¦??¸ë•²?? ?ê³?åª›Â€ ??…â”°???ì¢ë¼µ??‰ì“£ ??è«›ì„ì¾???ë’— ??????¨ë“¯ë¿€åª›ë¨¯???¿Â€?¨ê¾©ë¿??è«›ì„??ê³¸ì”¤ ï§ã…»?–ç”±????½©??°ì¤ˆ ??ë¼±ï§?????‰ë’¿??ˆë–. ?ë¨°ë¸³, ï§Â€??·ë‚µ å¯ƒì?ë¿???¨ì‡³ë¸?¯ƒ??¨ë“­?€??ì ®???ê¹Šë¼¢???ê³??ë¨?¾¶ åª›ëº¤?‚æ¿¡??ë¨?º¨ï§Â€??å¯ƒê»‹???¿Â€??ï§ë‰ê°??äºŒì‡±???ë¨?”¤??…ë•²??', warning:'??ã€??´ÑŠâ€??ëº¤ê½¦ ??åª›ëˆë²? ?ê³? ?ë¨?‘‰??è­°ëŒì¨·æ€???ë¸??ºê¾¨?åª›? ?¿Â€å«?' },
        '??¾§ê»?: { title:'[??¾§ê»?äºŒì‡°ë£? ??…â”°?ê²¶ë£°ê¼?ê³¸ìŸ» ?????ë¨?¼«ï§Â€', pattern:'??¾§ê»??åª›ëº¥ë¸?ï§ë‚†??? ?¿Â€?¨ê¾©ë¿??åª›ëº¥ë¸??ë¨?¸˜ å¯ƒì„??ì¢ì“£ ?ì¢???Å? ?ê³??? ??‡ë²‘???ê¾©íŠ‚????‰ë¼±???ëª„ë¸??¥ì“£ ?ë¨?µ§??ˆë–. ?ë¨?–Š???ê³¸ë¿­??ç§»â‘¤ì¾????‰ìŠœ??? ??…ë’— ?ë¨?‘‰?ê¹†ì”  åª›ëº¥ë¸???°ë“ƒ??? ?ì¢ê¹®??ë’— å¯ƒì?ë¼????‰ì‘ï§? ??å¯ƒìŒ????•ì¤ˆ??è­°ëŒì¨???ï§??ëº¤ê½Œ?ê³¸ì‘æ¿?æºë”†???ê³Œê»??? ??…ë’— ?¿Â€???????±ì”  ?ëº¤ê½¦??¸ë•²?? ??¾§ê»??¨ì‡°??ï§ë‚†??? ??ê½?ç¸•â†’??????€ë¹ï§????´ÑŠâ€œæ¿¡? æ¹²ë‰??åª›ë¨­ì»??ë·€??? ??ê½¦ ??°ë“ƒ??‰ë–— ??ë’‹åª›Â€ ??ˆë–†???????ë¦° ??Œë’¿??ˆë–. ?¿Â€????ë¿‰??å¯ƒìŒ?????åª›? è«›ì’•ë£??ãˆƒ ??°ë“ƒ??? ?ë¬ì °?ë¨? ?ê¾¨ë•¶ å¯ƒìŒ??ë¨?¤ˆ ?ëª„ë–‡??ë¦° ??–ì˜‰??Å? ??¿ì¾¬??åª›Â€??æºë”†? ?¿Â€?¨ê¾¨? ?¾ë?ê¼??¤â”?????½©??…ë•²??', warning:'??°ë“ƒ??? å¯ƒìŒ??ë¨?¤ˆ ?ëª„ë–‡??ë’— ???½© ?ê¾ªë¿•. ?ë¬ì ° ?ëª„ë¼± ?´ÑŠê¶— ??ˆì ´?????––.' },
        'å¯ƒê³¸??: { title:'[å¯ƒê³¸??äºŒì‡°ë£? ??¹ã€?ë¹§ë£¹????Ÿ» ?¿Â€?????½©', pattern:'å¯ƒê³¸?±åª›? åª›ëº¥ë¸?ï§ë‚†??? ?¿Â€?¨ê¾©ë¿??•ë£„ å¯ƒìŒ???ê³—ì???ëº£ë‚«??ì ®??è¹‚ëªƒ????ê¾¨ì™‚???ë¬ë£??¸ë•²?? ?ê³????ë¨?ì¨?ëº£ë‚«ì¨?ê³¹ë¼¢?Î¼???â‘¦ë¸??»ë’— ?ë¨?¼«ï§Â€åª›Â€ ?¾ëŒ???¹ìŸ»??°ì¤ˆ è«›ì’•ë£??ë¼±, äºŒì‡°??ë¨?½Œ ?ë¨°ë¹ è¹‚ë????ë¨?µ¦??è«›ì…??å¯ƒìŒ??ª›? è«›ì„???¸ë•²?? ??£ë¦°?ê³¸ì‘æ¿??¿Â€?¨ê¾©ë¿???ê³—ì???ë¨°ë¸¯ï§Â€ï§? ?Îºë¦?ê³¸ì‘æ¿??ì¢ŠËç‘œ??ê»‹ë¼± ??°ë“ƒ??‰ë–— æ¹²ê³•ì»???ë¶¾ë±¾?±Ñ‰ë’— ???½©???´ÑŠâ€?ë¶¾ë§—??ˆë–. åª›ë¨¯??æ¹²ê³•????¿Â€?¨ê¾©ë¿????‰ë? ?ºë‡???è«›ì„???°ì¤ˆ ??????ê³????ºë‰ë¸??ì¾¶ ï§ëš®ë±?????‰ë’¿??ˆë–. ?ì¢ŠË??ê³—ê½‘ì¨Œå¯ƒ?Œì›³ ?ê¾©ë‹š???ë¨?Šƒ????ë–‡?ê³¸ì‘æ¿??¿Â€?¨ê¾©ë¿??ê³¸ìŠœ??ë’— å¯ƒê»‹???¿Â€???Îºë¦?ë¶¿ì“½ ???––??…ë•²??', warning:'?ì¢ŠË?æ¹²ê³•ì»??ë¨?¸½ ?´ÑŠâ€?è«›ì„?? ??ë£„???ì¢ŠË??´ÑŠí… ??°ë£???¿Â€??ï§Â€??¿ê½¦ å¯ƒê³—??' }
      };
      var relData = RELATIONSHIP_PATTERN[dominant] || RELATIONSHIP_PATTERN['?ëª„ì˜±'];
      html += '<div class="sb-nature-block">'
        + '<div class="sb-nature-tag">??RELATIONSHIP MATRIX ???ë©¸ì»™?¿Â€??& ??°ë„» ???½© ?ºê¾©ê½?/div>'
        + '<div class="sb-nature-label">' + relData.title + '</div>'
        + '<p class="sb-nature-body">' + relData.pattern + '</p>'
        + '<div class="sb-nature-row"><span class="sb-nature-key">???¿Â€???ê¾ªë¿• ?????/span><span class="sb-nature-val sb-nature-val--warn">' + relData.warning + '</span></div>';
      // ??ê½??ºê¾ªë£?æ¹²ê³•ì»??°ë¶½? ?ºê¾©ê½?      var bijabN = (counts['??¾§ê»?]||0) + (counts['å¯ƒê³¸??]||0);
      var jaeN   = (counts['?ëª„ì˜±']||0) + (counts['?ëº¤ì˜±']||0);
      var gwanN  = (counts['?ë©?']||0) + (counts['?ëº?']||0);
      var sikN   = (counts['??¹ë–Š']||0) + (counts['?ê³?']||0);
      var inN    = (counts['?ëª„ì”¤']||0) + (counts['?ëº¤ì”¤']||0);
      var patterns = [];
      if (bijabN >= 3) patterns.push('??¾§ì¾?' + bijabN + 'åª??¨ì‡±??????…â”°ì¨Œå¯ƒ?Œì›³ ?ë¨?¼«ï§Â€ ??ï¼? ?ë¬ì ° ?¿Â€??ï§ë‰ê°??´ÑŠâ€???ê¾ªë¿•');
      if (gwanN >= 3) patterns.push('?¿Â€??' + gwanN + 'åª?ï§ë¬’ì¨???ï§ê³¸ë¾½ì¨Œ?ëª? ??? ?ëº£ì»¯??ç§»ì’•? ?¿Â€?¨ê¾¨? ??ê¹??—ê¶?????½©');
      if (jaeN >= 3) patterns.push('??ê½?' + jaeN + 'åª??¨ì‡°??????„ë¹ì¨??»â” æ¹²ê³•ì»??¿Â€???ëª„ì¨·, åª›ë¨¯ê½???°ë“ƒ??‰ë–— ??€??);
      if (sikN >= 3) patterns.push('??¹ê¸½ ' + sikN + 'åª?????—ì½ ?¨ì‡±?? ?ê³? ??°ì¤ˆåª??ê¾©ìŸ». å¯ƒìŒê»Œì¨Œç§»â‘¤Ğ£????¾©????????ê¾©ìŠ‚');
      if (inN >= 3) patterns.push('?ëª„ê½¦ ' + inN + 'åª???ï§Â€???ê³—ì ???½© äºŒì‡±?? ï§Â€????ã€??¿Â€???ëª„ë¿‰ ??‘ë£Š ?¿Â€???´ÑŠí… ??ë–‡???ëªƒì ° ?ê¾©ìŠ‚');
      if (patterns.length) {
        html += '<div class="sb-nature-row"><span class="sb-nature-key">??ê½??ºê¾ªë£?å¯ƒìˆ??/span><span class="sb-nature-val sb-nature-val--warn">' + patterns.join(' / ') + '</span></div>';
      }
      html += '<div class="sb-nature-row"><span class="sb-nature-key">??°ë„» ???????/span><span class="sb-nature-val">'
        + (dominant === '??¹ë–Š' || dominant === '?ê³?' ? '??????¨ë“¦ì»??ëª„ë¼±??åª›ëº¤???°ì¤ˆ ??–ìŠœ??ë¦º, ?ê³?åª›Â€ ï§ë?ë¸??¨ë“¦ì»???’ì‡±? ï§ëš®ë±?ëª„ìŠ‚.' :
           dominant === '?ë©?' || dominant === '?ëº?' ? 'ï§â‘ºëª?ä»¥ë¬’?????ë¶? ?ë¨?¿°??»ì‡ï§Â€ï§? åª›ë¨¯ê½????‰ìŸ¾ ??—ì½??è¹‚ë¬“ë»???¿Â€????¤ë£„???ì¢???ê½­??' :
           dominant === '?ëª„ì˜±' || dominant === '?ëº¤ì˜±' ? '??¼ìŠœ???ëª„ë¼±åª›Â€ åª›ëº¤????ï§? ??ë£„ ??¿ë’— ??????“ì»™???ëº?¦°?ê³¸ì‘æ¿?åª›Â€ï§Â€ï§??¿Â€??æºë”†? åª›? ???ªï§ë¬ë•²??' :
           dominant === '?ëª„ì”¤' || dominant === '?ëº¤ì”¤' ? 'æºë”†? ???°™????ë‹ƒ ????ˆë’— ???‹” ??°ë“ƒ??‰ë¿‰å¯?ï§ë¬’ì¨??í€? æ´??¿Â€?¨ê¾¨? ?Îºë¦??????¿Â€?ë¨?‘æ¿??¿Â€?±Ñ‹ë¸¯?ëª„ìŠ‚.' :
           '?¿Â€?¨ê¾©ë¿???â‘¥ë¹?ê¹†ì“£ ??—ì½??ë’— ?ê³—ë’¿???ì¢ŠË??´ÑŠí…??åª›Â€????¢Š??å¯ƒìˆì¤??…ë•²??')
        + '</span></div>'
        + '</div>';
    })();

    /* ??Block 3: ??? ï§ê¾¨??*/
    var kwanStarCount = (counts['?ë©?'] || 0) + (counts['?ëº?'] || 0);
    html += '<div class="sb-nature-block">'
      + '<div class="sb-nature-tag">??POWER SCAN ?????(?ë¬‰ë³) ï§ê¾¨??/div>'
      + '<div class="sb-nature-power">??' + powerLabel + '</div>';
    if (isStrong && bijabPct >= 25) {
      html += '<p class="sb-nature-body sb-nature-alert">????¨ì»™ ?¨ì‡¨ì»?å¯ƒìˆ?? ??‡ìªŸ ?ë¨?ƒ¼ ??¾©ì¨?' + bijabPct + '%.'
        + (jaePct < 15
          ? ' ??ê½?' + (EL_KR[jaeEl] || '') + ') ' + jaePct + '% ????Ğªì¨?ê¾©ë– åª›ë¨­ì»–ì¨Œ??ê½¦ ?ë¨?¼«ï§Â€åª›Â€ ??ì»??ì¾¶ ?â‘¥ë¹??¸ë•²?? åª›ëº¥ë¸??ë¨?¸˜åª›Â€ ?ê¾©ë– åª›ë¨­ì»–è¹‚?€????ê½Œï§? ?Î»??????å¯ƒìŒ????ê¹ƒë‚µåª›Â€ ?´ÑŠâ€?ê³¸ì‘æ¿?????ë§—??ˆë–.'
          : ' åª›ëº¥ë¸???…â”° ?ë¨?¼«ï§Â€åª›Â€ ?ë¬ì ° æ¹²ê³•ì»???…Ğ?ë¨?½Œ è«›ì„??ï§ë‰ê°????±ì‘??¬ë•²?? ??ë£„???ë¬ì ° ??ˆì ´ ??ì”  ?±Ñ‰ëœ‘????è«›ì’—???ãˆƒ ?????ê¾¨ë•²???ê³¸ì“£ ï§ëš®ë±???´ÑŠâ€??…ë•²??')
        + '</p>';
    } else if (!isStrong) {
      if (kwanStarCount >= 2) {
        html += '<p class="sb-nature-body sb-nature-alert">???¿Â€??ï¥´ì„‰?? ?¨ì‡±ë¸??´ÑŠâ€? ?ë©???' + kwanStarCount + 'åª???ê¸½ ï§ë¬’ì¨??ë¼± ??¨ì»™??ï§Â€??¿ìŸ»??°ì¤ˆ ??–ë¸¬??¸ë•²?? '
          + '?ëª? æ²…ëš¯????????¨ì‡°ë£???ëº£ì»¯, ï§ëš¯ê½?æ¹²ëŒ?? ?ë¨?¦°??¾ª??è«›ì„?????€????ê¾©ìŸ»??¸ë•²?? '
          + '???ë¨?¼«ï§Â€??è«›â‘¹???ãˆƒ è¸°ë‰ë¸????åª›ë¬’???»ìœ­????„ê¹‰ ????????¨ì¢Š????–ê½Œæ¿?ï§ê¾ªë»??¸ë•²?? '
          + '?¿Â€?ëª„ê¸½??ï¥´ì„‡??ë©°ëµŸ) ???ëª„ê½¦(?ê²½ì‚œ)???¿Â€?ê¹†ì“½ ?ëº£ì»¯??ï§Â€??²ë£¹?„å¯ƒ?¹ì‘æ¿??ë±ì†•??ë’— ?´ÑŠâ€œç‘œ?ï§ëš®ë±??å¯ƒê»‹???ì¢ì”ª???°ì’“???…ë•²??</p>';
      } else {
        html += '<p class="sb-nature-body">?ì¢ë¹Ÿ(ç¿ãƒ¥?? ?´ÑŠâ€? äºŒì‡°ë£????½ë»¾è¹‚ë????ê¾¨Ğ??????? ï§Â€??æ¹²ê³•ì»??´ÑŠí…???ê³—ê½‘ ?ê¾¨ì™‚??…ë•²?? ?¾ë??????…â”° ï§¡ìŒë¾½è¹‚?€??è­°ê³—ì­????ê¾¨Ğ?§ê³¸ë¿‰???????å¯ƒÂ€ï§ì•ºë¸?????…â”°??ë’— å¯ƒê»‹???Îºë¦???‰ìŸ¾??…ë•²??</p>';
      }
    } else {
      html += '<p class="sb-nature-body">??½ë»¾ æ´¹ì¢?????¾§????ë¬“ìƒ‡??¸ë•²?? ????”ë£¹ê½??ì“½ è¹‚Â€?ë¶¿ë¿‰ ?ê³•ì”ª ?ê¾¨ì™‚???ì¢ë¿°??ì¾¶ è­°ê³—???ë–—??–ì‚¤.</p>';
    }
    html += '</div>';

    /* ??Block 4: ??–ë’ª????€ë±¶è«›ë¶¿ì” ????(?ì¢Šì¦º ?ì¢Šë£„) */
    var yr0 = new Date().getFullYear();
    var YRNAME0 = { 2025:'?ê¾©ê¶—(?¿ì‡¿??', 2026:'è¹‚ë¬’??è¨ì‡¿??', 2027:'?ëº?(è¨ê³«??', 2028:'?¾ëŒ????ëµµ)', 2029:'æ¹²ê³—?€(?¥ê¹??', 2030:'å¯ƒìŒ??ä½?‹¨??' };
    var yrLabel0 = (YRNAME0[yr0] || yr0 + '??);
    var GAN_CHONG0 = { '??:'ä½?,'ä½?:'??,'??:'æ¸?,'æ¸?:'??,'è¨?:'é¶?,'é¶?:'è¨?,'è¨?:'??,'??:'è¨? };
    var YEAR_GAN0 = { 2025:'??, 2026:'è¨?, 2027:'è¨?, 2028:'??, 2029:'??, 2030:'ä½? };
    var yearGan0 = YEAR_GAN0[yr0] || 'è¨?;
    var hasGanChong0 = dayGan && GAN_CHONG0[yearGan0] === dayGan;
    var ctaExtra = hasGanChong0
      ? '?ë±ì—³ ' + yr0 + ' ' + yrLabel0 + ' ?ëª„ìŠ« ï§£ì’“ì»?' + yearGan0 + ')???ë±€?????¨ì»™(' + dayGan + ')??<strong>ï§ê³´êº?ï§£ì’“ì»???/strong>????€ï¼ˆæ€???‰ë’¿??ˆë–. ????ë¿‰ ï§ê¾¨ì¤ˆì¨Œ?¿Â€?¨ê½·ë£¹ì ™ï§£ëŒê½??æ´¹ì‡°??????????±ë¼±??åª›Â€?Î¼ê½???ë¯ªë’¿??ˆë–. '
      : '';
    html += '<div class="sb-nature-block sb-nature-block--cta">'
      + '<div class="sb-nature-tag">??SYSTEM ADVISORY ???ºê¾©ê½???????ˆê¶¡</div>'
      + '<p class="sb-nature-body">' + ctaExtra
      + '???ê³—ì” ?ê³•ë’— ?ë¨?…??<strong>?ëº¤ìŸ» ?´ÑŠâ€??ºê¾©ê½?/strong>??…ë•²?? ??¼ì £ ??€ì±?? <strong>?ê¾©ì˜± ??€??????ë¿‰ ?ê¾©íŠ‚??ë’—ï§Â€</strong>???ê³•ì”ª ?ê¾©ìŸ¾?????ªï§ë¬ë•²?? '
      + '<strong>10???ê¾ªë¿• ?¨ê¾©??æ´¹ëªƒ???/strong>, ï§ê³¸ë¾??ê¾ªì†š ï§¤ì’–??????€ì»? ?¿Â€???±ÑŠë’ª?? '
      + 'åª›ì’–??ï§£ì„ê°?ê¾? <em class="sb-nature-hl">DOMINATOR REPORT</em>?ë¨?½Œï§???€???¸ë•²??</p>'
      + '<div class="sb-nature-cta-hint">????ë–’ ??EXECUTE DOMINATOR (100?„ë¶¿?? ??°ì¤ˆ ?ê¾©ê»œ ?±Ñ‹ë£·????€??/div>'
      + '</div>';

    return html;
  }

  /* ???? YEAR PULSE ???ëª„ìŠ« ?°â‘º???ë¨?¼«ï§Â€ ??¼í‹ª ???? */
  var YEAR_GAN_TBL = { 2024:'??, 2025:'??, 2026:'è¨?, 2027:'è¨?, 2028:'??, 2029:'??, 2030:'ä½?, 2031:'æ¸?, 2032:'é¶?, 2033:'?? };
  var YEAR_ZHI_TBL = { 2024:'æ¸?, 2025:'??, 2026:'??, 2027:'??, 2028:'??, 2029:'??, 2030:'??, 2031:'??, 2032:'??, 2033:'è¨? };
  var YEAR_NAME_TBL = { 2024:'åª›ë¬’ì­?, 2025:'?ê¾©ê¶—', 2026:'è¹‚ë¬’??, 2027:'?ëº?', 2028:'?¾ëŒ??, 2029:'æ¹²ê³—?€', 2030:'å¯ƒìŒ??, 2031:'?ì¢ë¹', 2032:'?ê¾©ì˜„', 2033:'?¨ê¾©?? };
  var ZHI_CHONG_TBL = { '??:'??,'??:'??,'è¨?:'??,'??:'è¨?,'??:'??,'??:'??,'??:'??,'??:'??,'æ¸?:'??,'??:'æ¸?,'??:'??,'??:'?? };
  var ZHI_HE6_TBL = { '??:'è¨?,'è¨?:'??,'??:'??,'??:'??,'??:'??,'??:'??,'æ¸?:'??,'??:'æ¸?,'??:'??,'??:'??,'??:'??,'??:'?? };
  var GAN_CHONG_TBL = { '??:'ä½?,'ä½?:'??,'??:'æ¸?,'æ¸?:'??,'è¨?:'é¶?,'é¶?:'è¨?,'è¨?:'??,'??:'è¨? };
  var BANHE_SETS = [[['??,'??,'??],'????ï¥µÂ€'],[['??,'??,'æ¸?],'??ï¦?ï¥µÂ€'],[['??,'??,'??],'ï§???ï¥µÂ€'],[['??,'??,'è¨?],'æ¹???ï¥µÂ€']];

  function _buildYearPulseHTML(pillars) {
    if (!pillars || !pillars.d) return '';
    var yr = new Date().getFullYear();
    var yg = YEAR_GAN_TBL[yr]; var yz = YEAR_ZHI_TBL[yr]; var yn = YEAR_NAME_TBL[yr];
    if (!yg || !yz) return '';
    var dg = pillars.d.g; var dj = pillars.d.j;
    var mj = pillars.m && pillars.m.j;
    var yj_g = pillars.y && pillars.y.j;
    var signals = [];
    /* ï§£ì’“ì»???*/
    if (GAN_CHONG_TBL[yg] === dg) {
      var ts = null; try { ts = _calcTenStar(dg, yg); } catch(e) {}
      signals.push({ lv:'danger', msg:'??' + yr + ' ' + yn + '?????ëª„ìŠ« ï§£ì’“ì»?' + yg + ')????¨ì»™(' + dg + ')??<strong>ï§ê³´êº?ï§£ì’“ì»???/strong>. [' + (ts || '??) + '] ï§ê¾¨ì¤ˆì¨Œ?ëº¤ê»œ?êµ¿ë£»ë¹???¿Â€?¨ê¾©ë¿?æ´¹ì‡°????ë¶¾ë±¾?±ì‡±??è«›ì’–ê¹??¸ë•²?? æ¹²ê³—????‰ì ™ æ¹²ê³•ì»?ï§ê³¸?£ì¨Œ??°ë“ƒ??‰ë–—ì¨Œå«„ê³—ï¼œï§Â€)????‰ë? ?ºë‡? æ´¹ì¢ë¿?åª›Â€?Î¼ê½?' });
    }
    /* ??? ??*/
    if (ZHI_CHONG_TBL[yz] === dj) {
      signals.push({ lv:'danger', msg:'?????(' + dj + ')ì¨?ëª„ìŠ«ï§Â€(' + yz + ') <strong>ï§Â€ï§Â€ ??/strong>. è«›ê³—??ë¨ƒë£°ì»??æ¹²ê³•ì»²ì¨Œå«„ë‹¿ì»???????ï§ê³¸???°â‘·êº??ë¨?¼«ï§Â€åª›Â€ ?ì¢ì—¯??¸ë•²?? ??€?? ??ê¶—, ??ë‹  ??€ê¹??è«›ì’–ê¹?åª›Â€?Î¼ê½?ï§ì•·?.' });
    }
    /* ?ë¶? ??*/
    if (mj && ZHI_CHONG_TBL[yz] === mj) {
      signals.push({ lv:'warn', msg:'???ë¶?(' + mj + ')ì¨?ëª„ìŠ«ï§Â€(' + yz + ') ?? ï§ê³¸ë¾½ì¨Œ????æ¹²ê³•ì»??è¹‚Â€???ë¨?¼«ï§Â€ ?ì¢ì—¯. ??ì­…ì¨?ê¾©ì­…ì¨??ë¾?????åª›Â€?Î¼ê½??ê³¸ë“….' });
    }
    /* ?ê³? ??*/
    if (yj_g && ZHI_CHONG_TBL[yz] === yj_g) {
      signals.push({ lv:'warn', msg:'???ê³?(' + yj_g + ')ì¨?ëª„ìŠ«ï§Â€(' + yz + ') ?? åª›Â€è­°êµ¿ë£¸í“£??ë£°í€?Îº???ê³???è¹‚Â€???ë¨?¼«ï§Â€ åª›ë¨¯?.' });
    }
    /* ??? ????æ´¹Â€??*/
    if (ZHI_HE6_TBL[yz] === dj) {
      signals.push({ lv:'ok', msg:'???ëª„ìŠ«ï§Â€(' + yz + ')ì¨???(' + dj + ') ??«ë?(??ë¦?. ' + yr + '??æ´¹Â€?ë§ë£»??ëªƒê¼«???ëº¤ê½¦ ?ë¨?¼«ï§Â€ ?ê³¸ë“…. ä»¥ë¬’????ëª„ë¿°????€??????‰ë’¿??ˆë–.' });
    }
    /* è«›ì„‘ë¹€ */
    BANHE_SETS.forEach(function(g) {
      var trio = g[0]; var nm = g[1];
      if (trio.indexOf(yz) >= 0 && (trio.indexOf(dj) >= 0 || trio.indexOf(mj) >= 0)) {
        var effMap = { '????ï¥µÂ€':'??ê½?ç¸•â†’?? ??–ê½¦??????Ğªì¨Œï§?†ì‚ æ¹²ê³ ???ì¢ì—¯.', '??ï¦?ï¥µÂ€':'??¾§ì¾?åª›ëº¥??????…â”° ??? ?ê³¸ë“…, ?ë¬ì ° ï§ë‰ê°?ï§ì•·?.', 'ï§???ï¥µÂ€':'??¹ê¸½ ??ì»???ï§¡ìŒ?‰ì¨Œ??—ì½ì¨?ë¨? ?ë¨?¼«ï§Â€ æ¹²ë±ì¬?', 'æ¹???ï¥µÂ€':'?ëª„ê½¦ åª›ëº¥??????‡Ğ?¨Œ?ë¨?º½ì¨Œæ´¹???ï§Â€??ï§ì•ºë£?' };
        signals.push({ lv:'info', msg:'???ëª„ìŠ«ï§Â€(' + yz + ')?? ï§ë‚†???<strong>' + nm + '</strong> ?ëº¤ê½¦. ' + (effMap[nm] || '') });
      }
    });
    if (!signals.length) {
      signals.push({ lv:'neutral', msg:'??' + yr + ' ' + yn + '????ï§ë‚†???ï§ê³´êº??°â‘º????ì“¬. ??¨ì»™ ?ë¨?¼«ï§Â€ è¹‚ëŒ???ê³¹ê¹­. ??¿ë‚¬ ?°ëº¤???ê³´ë¦°.' });
    }
    var html = '<div class="sb-nature-block sb-ypulse-block">';
    html += '<div class="sb-nature-tag">??YEAR PULSE ??' + yr + ' ' + yn + '???ëª„ìŠ« ?°â‘·êº???¼í‹ª</div>';
    signals.forEach(function(s) {
      html += '<div class="sb-ypulse-row sb-ypulse-' + s.lv + '">' + s.msg + '</div>';
    });
    html += '<div class="sb-ypulse-cta">&#9660; ?ëª„ìŠ« ?ê¾§ë¦° ?ê¾ªì†• ?ê¾¨ì™‚ì¨???è¹‚Â€?¨â‰ª?ì¨Œåª›ì’–??ï§£ì„ê°?? <strong>DOMINATOR REPORT</strong>?ë¨?½Œï§??ëº¤ì”¤??¸ë•²??</div>';
    html += '</div>';
    return html;
  }

  /* ???? INNER PALACE SCAN ?????(?Î¶ëµ? ??¾¨?æ²??ºê¾©ê½????? */
  var DAY_BRANCH_ORACLE = {
    '??:{ code:'AQUA_SEED_v1', title:'?ë¨?‹”(?¶ë¨©ê°? ????–ì˜‰???ë¨? ', oracle:'åª›Â€????–ë‹”????–ì˜‰ ?ë¨?¼«ï§Â€. ?ì¢ì˜±?Î¼? ?¾ëŒ„ë¸???ï§?è«›â‘ºë¼???ì” ??ï§ì•¸ì»??¸ë•²?? ??€???æºë”†? ï§Â€?ê¹? ?´ÑŠâ€œç‘œ???¼ë’ªæ¿?ï§ëš®ë±??ë¹ï§??ëª? ?ë©¸í€?? ?ê³Œê»??¸ë•²??', spouse:'è«›ê³—??ë¨?„¿ ?ë¨?¼«ï§Â€: ??¾§ì¾??¨ê¾©ë¿?????°ë“ƒ??? å¯ƒìŒ??ë¨? ??????‰ì“¬. ??…â”°????°ë“ƒ???ì¢ìƒ‡ ?ê¾©ë¿°.' },
    'è¨?:{ code:'EARTH_VAULT_v2', title:'?°ëº¥??è¨ë¬ˆ?? ???Šë±???è¹‚ë‹¿???ëœ¹ë²?', oracle:'???—º æ¹²ë‡?? ??•ãˆƒ?? ?ë·€ë¸?§?ï§???€?????·íˆ‘ ï§Î¼ì”  ?ë¨?«­??ˆë–. ??€???????“ì»™??å«„ëªƒ?ï§?ï§? ??è¸?åª›ì’•ê°??ãˆƒ ï§ë±??????ë’¿??ˆë–.', spouse:'è«›ê³—??ë¨?„¿ ?ë¨?¼«ï§Â€: ?¿Â€????¾§ì¾??ëª„ê½¦ ??±ì˜± ?????–Š-åª›ëˆë²?äºŒì‡¨ë¦?è«›ì„??' },
    '??:{ code:'WOOD_IGNITION_v3', title:'?ëªƒã‰(?ë¾?? ???ë¨°ì†•????¥ë¸®', oracle:'?Šê¾©??ï§????¿´. åª›ëº£?????–ì˜‰ ?ë¨?¼«ï§Â€åª›Â€ ??ê¸???ì»??ä»¥Â€??¾ªë¹€??ˆë–. ??–ì˜‰?? ??????ï§??ê¾©ï¼œ è¹‚ëªƒ???è¹‚ê¾¨ë£„æ¿¡???¼ì™????¸ë•²??', spouse:'è«›ê³—??ë¨?„¿ ?ë¨?¼«ï§Â€: ??¹ê¸½+??ê½??¿Â€????±ì˜± ????•ì»»???ï§???–ë¼± ??€?????°ë“ƒ??' },
    '??:{ code:'SOFT_BLADE_v4', title:'?¾ì„?????? ??è­°ê³—???????', oracle:'è¹‚ëŒ? ï§? ??„ì¾¶ ?ì¢ë­…æ¿¡ì’–??ï§??ë¨?¼«ï§Â€. ???ëª„ì“½ åª›ë¨¯????ëº¥ì†—????ë–Š??ë’— ????Šë€??? ?¾ë‹¿ë¦°åª›? ??êµ…???ê³¸ì¿‚åª›Â€ ??¸ë•²??', spouse:'è«›ê³—??ë¨?„¿ ?ë¨?¼«ï§Â€: ??¾§ì¾??¨ê¾©ë¿?????…â”°?ê³¸ì” ??å¯ƒìŒ??ê³¸ì”¤ ??°ë“ƒ??' },
    'æ¸?:{ code:'DRAGON_VAULT_v5', title:'ï§ê¾ª??æ¸?²¼?? ????¹ì“½ ï§¡ì„??ï¦ˆë‹·ë²?', oracle:'ï§â‘¤ë±???½ë»¾?????Î½ë¸????í€?ï¦ˆë‹·ë²?. ??•ãˆƒ?? ??›ì” ï§Â€ï§???€???ï¦ˆëŠ”ë£¡ì‘‰ì¨??? ?¨ë“­???¸ë•²?? ??è¹‚ë“­?????€???ï§¡ìŒ????ê¾¨ì °?ê¹ƒë‚µ ??‰ë? ?ºë‡???????è¹‚Â€??ˆì“£ ??ˆë–†??ï§ëš®ë²??ˆë–. ?ëº£ì»¯??åª›ëº¥ë¸??ì¤‰ ??€??ë¨?½Œ ?¾ëŒë¼µåª›? ??ì»??¸ë•²??', spouse:'è«›ê³—??ë¨?„¿ ?ë¨?¼«ï§Â€: ?ë©?+?ê³?+å¯ƒê³¸????±ì˜± ????? £-?ë¨?? åª›ëˆë²??´ÑŠâ€???ì˜±.' },
    '??:{ code:'FIRE_CIRCUIT_v6', title:'?????¥ë…•ê²? ??æ¹²ê³ ë£????¤ˆ', oracle:'?Šë±????ë¶½ë¦°åª›Â€ ??ì»?ï§ê³¸???ê³¹ê¹­. ??—ì½ ï§?¾¨ê¼¸ï§??ëº£ë‚«??ãˆƒ ?ºë‡ë§Œï§£?ì† è¸°ë‰ì­??ˆë–. ??? £ ??¿ë’— ??ì ™?? ï§â‘¤ë±?å¯ƒê»‹????–ìŠ± ????‰ë’¿??ˆë–.', spouse:'è«›ê³—??ë¨?„¿ ?ë¨?¼«ï§Â€: ??ê½??¿Â€???ëª„ê½¦ ??±ì˜± ???Î»????ˆë’— ??°ë“ƒ?? ???????°â‘¸ë£?' },
    '??:{ code:'SOLAR_PEAK_v7', title:'??½ì†•(??„ê²“) ????–ë¼‡???ëº¤ì ', oracle:'ï§¤ì’“?¬è?ê³—ì“½ ?? ?ë¶¾ì ®???ï§???¢Š?¤å¯ƒ????­Š??¸ë•²?? ?¾ë?? ??ì” ???ë¨?¼«ï§Â€åª›Â€ ??€?æ¿??Î½ë¹??ë¨?¦°???ˆ¼?ê³¸ì”  ??¸ë•²??', spouse:'è«›ê³—??ë¨?„¿ ?ë¨?¼«ï§Â€: ??ê½??ë©?+?ëº¤ì˜± ??±ì˜± ???ë¶¾ì ®???ï§?è¹‚Â€?ëº¤ë’ª??????°ë“ƒ???ëª„ë¿°.' },
    '??:{ code:'EARTH_DUSK_v8', title:'èª˜ëª…????…ì¿) ????ì«????ºìƒ', oracle:'??¿ìŠ‚æ¿??ï§????­Š???ë¨?¼«ï§Â€. äºŒì‡°???????‹•???ï§?è«›ì…??ï¦Šëº¤??è«›ê³—??§? ??†ì‘ï§??ë¨?¼«ï§Â€ ?¨ì¢‰ì»??è«›ì„???¸ë•²??', spouse:'è«›ê³—??ë¨?„¿ ?ë¨?¼«ï§Â€: ?¿Â€???ê³?+??ê½???±ì˜± ????ê½??í€?åª›ë¨¯ê½?ê³¸ì”¤ ??°ë“ƒ?? ??…â”°???ë¶½ë„.' },
    '??:{ code:'METAL_ZERO_v9', title:'?ì¢‰íˆ‘(??œë‡«) ?????»–??ç§?, oracle:'åª›ë¨¯????ì”  ?ê³¹ì†´????€???ë’— ??±ì ™???ºê¾©ê½??ë¨?¼«ï§Â€. ????±ì ™??¥ì”  ?¾ëª„????¿ê»???¾ë‹¿ë¦??ì˜„, ???ë©¸ë‚µ??åª›ë¨¯???ê³Œê»????…ë’— ?Î»ê¼??…ë•²??', spouse:'è«›ê³—??ë¨?„¿ ?ë¨?¼«ï§Â€: ?ëª„ê½¦+??¾§ì¾??¿Â€????±ì˜± ??ï§Â€?ê³¸ì” ????…â”°?ê³¸ì”¤ ??°ë“ƒ??' },
    '??:{ code:'PURE_EDGE_v10', title:'?ì¢‰íˆ‘(???‡«) ????–ë‹”???ì¢Šê±¹', oracle:'?ºë‰?šè‡¾?±ì“£ ??‰ìŠœ??? ??…ë’— ?ê¾¨ê¼äºŒì‡±???ë¨?¼«ï§Â€. ?ê³¸ì¡???ê¾©ê½¦?ê¾? ï§ëš®ë±¾ï§?ï§? æ¹²ê³—? ï§¡â‘¥? æ¿¡??ëª…ë¸³ ??»ì????¨ì¢Š???è«›ì„???¸ë•²??', spouse:'è«›ê³—??ë¨?„¿ ?ë¨?¼«ï§Â€: ??¾§ì¾??¨ê¾©ë¿?????•ì¤ˆ ??…â”°???°ë¶½???ë’— ??°ë“ƒ???´ÑŠâ€?' },
    '??:{ code:'FIRE_TOMB_v11', title:'?ì¢ë„—(???¿) ???ë¶¿ì“½ ?¾ë???, oracle:'?ë¶½ë¦°??ï§¡ì„???ì˜„ ?¾ë??? ??±ë–†?ë¨?’— ?ì¢ì˜±?Î¼????¥ë¼± ?¨ì‡±????è«›ì†?ï§? ??ì»??ãˆƒ å«„ë£¹???????ë’¿??ˆë–.', spouse:'è«›ê³—??ë¨?„¿ ?ë¨?¼«ï§Â€: ?¿Â€???ëª„ê½¦+??ê½???±ì˜± ???Î»????‡í€??ì¢ŠË??????ˆë’— ??°ë“ƒ??' },
    '??:{ code:'DEEP_CIRCUIT_v12', title:'??ë‹”(?…Î¶ê°) ????ë§????¤ˆ', oracle:'åª›Â€??æºë”†? ??ï¦???æ´¹ì‡±?? ?¾ëŒ„ë¸???ì¢ì˜±?Î¼??è¹‚ëŒ? ï§? ??…ë’— ?¨ë…¹ë¿???‰ë’¿??ˆë–. ï§ê³´????ê³—ë¼±???ï§?æºë”†? ??„ë¼¢?ê¹†ì‘æ¿????Î»????ëª„ê¸½???ê³Œê»??ë’— å¯ƒê»‹???ê³´ë„ ?¨ì‡±???…ë•²??', spouse:'è«›ê³—??ë¨?„¿ ?ë¨?¼«ï§Â€: ??¾§ì¾???¹ë–Š ?¨ê¾©ë¿????ë¨??æ¿???ï§¡ìŒ??ê³¸ì”¤ ??°ë“ƒ?? ?´ÑŠëƒ½ å«„ê³•?.' }
  };

  function _buildDayBranchScan(pillars) {
    if (!pillars || !pillars.d) return '';
    var dj = pillars.d.j;
    var info = DAY_BRANCH_ORACLE[dj];
    if (!info) return '';
    var html = '<div class="sb-nature-block sb-dbs-block">';
    html += '<div class="sb-nature-tag">??INNER PALACE SCAN ?????(?Î¶ëµ? ' + dj + ' ??¾¨?æ²??ºê¾©ê½?/div>';
    html += '<div class="sb-dbs-header">';
    html += '<span class="sb-dbs-chip">SOUL CHIP: ' + info.code + '</span>';
    html += '<span class="sb-dbs-title">' + info.title + '</span>';
    html += '</div>';
    html += '<p class="sb-nature-body">' + info.oracle + '</p>';
    html += '<div class="sb-nature-row"><span class="sb-nature-key">è«›ê³—??ë¨?„¿</span><span class="sb-nature-val sb-nature-val--warn">' + info.spouse + '</span></div>';
    html += '<div class="sb-dbs-cta">&#9660; ?ê¾©ì˜± ??ë¿‰?????ë¨?¼«ï§Â€åª›Â€ ??€ë¼¸å¯ƒ?è«›ì’•ë£??ë’—ï§Â€, ?ëª„ë¿°ì¨Œï§ê³¸ë¾½ ï§¤ì’–??????€ì»?? <strong>DOMINATOR REPORT</strong>?ë¨?½Œ ?ëº¤ì”¤??ê½­??</div>';
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
        { month: 1, risk: risk, focus: 'æ¹²ê³•???·â‘¦???¨ì¢??, caution: '??ê¶—å¯ƒê³—????¾ë£„ ?¨ì‡±ë¿?äºŒì‡±?? },
        { month: 2, risk: _clamp(risk + 6, 0, 100), focus: '?¿Â€???Œã…»??????ë€??ë¨?', caution: 'åª›ë¨¯??è«›ì„???ê¾©ìŸ» äºŒì‡±?? },
        { month: 3, risk: _clamp(risk - 4, 0, 100), focus: '?ê¹ƒë‚µ ?ëº£â”/?ëº¤ì˜£', caution: '?¾ë?????ëº¤ì˜£ äºŒì‡±?? }
      ];
    }

    var ordered = monthly.slice().sort(function(a, b) { return b.risk - a.risk; }).slice(0, 3);
    var riskTone = risk >= 70 ? 'high' : (risk >= 45 ? 'medium' : 'low');
    var riskHeadline = riskTone === 'high'
      ? '??£ë¦° è¹‚Â€??ˆê½¦???ë¯? ?´Ñˆì»™??…ë•²?? ?¨ì‡±????ê¶—å¯ƒê³—???äºŒì‡±???ê½­??'
      : (riskTone === 'medium'
        ? '???–– ?·â‘¦????ì¢???ãˆƒ ??‰ì ™æ²?ï§ê¾©???åª›Â€?Î½ë¸??´Ñˆì»™??…ë•²??'
        : '??‰ì ™ ?ë¨?««???ê³—ê½­???´Ñˆì»™??…ë•²?? ?ëº¤ì˜£?? ??£í€?ê³¸ì‘æ¿?ï§ê¾ªë»??ê½­??');
    var action = dominant === '?ë©?' || dominant === '?ëº?'
      ? 'æ´¹ì’–?ƒì¨Œå¯ƒÂ€ï§?æ¹²ê³•ì»???½ë»¾???ì¢???í€? ?¿Â€?????ë¶¾ë’— å¯ƒê³•ì¤è¹‚?€??ï§Î»ì”« ??»ì±¸???’ì‡±? è«›ê³—???ê½­??'
      : dominant === '?ëª„ì˜±' || dominant === '?ëº¤ì˜±'
        ? '???™ì¨Œ??±ì ™ æ¿¡ì’“?‡ç‘œ?åª›ìˆˆ? äºŒì‡¨ë¦???¾ë ë¼??ê¾©ë‹”?ºÂ€??ï§¡â‘¤???í€? ??‰ì ™ ?ë¶¿ë¿‰ï§??ëº¤ì˜£??ê½­??'
        : 'åª›ëº¤???°ëº¤????è¸°ë‰ë¿???êµ¹ï§?è«›Â€?? äºŒì‡¨ì»????‚¬ ?·â‘¦????¨ì¢???è¹‚Â€??ˆê½¦???’ì‡±? ä»¥ê¾©??ëª„ìŠ‚.';

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
    var toneLabel = tone === 'high' ? 'äºŒì‡±??åª›ëº¥???´Ñˆì»™' : (tone === 'medium' ? 'æ´¹ì¢???ë¨? ?´Ñˆì»™' : '??‰ì ™ ?´Ñˆì»™');
    var monthCards = (overview.topMonths || []).map(function(item) {
      var monthValue = Number(item && item.month);
      var monthLabel = (isFinite(monthValue) ? monthValue : 0);
      var riskValue = _safeScore(item && item.risk, overview.risk, 0, 100);
      var focusText = esc(item && item.focus || '???–– ?·â‘¦???ì¢?');
      var cautionText = esc(item && item.caution || 'è¹‚Â€??ˆê½¦ ï§â‘¤??ê³•ì­…');
      return ''
        + '<article class="sb-free-recovery-month-card">'
        + '<div class="sb-free-recovery-month-head">'
        + '<span class="sb-free-recovery-month-label">' + String(monthLabel).padStart(2, '0') + '??/span>'
        + '<span class="sb-free-recovery-month-risk">?ê¾ªë¿• ' + riskValue + '</span>'
        + '</div>'
        + '<p class="sb-free-recovery-month-focus">' + focusText + '</p>'
        + '<p class="sb-free-recovery-month-caution">äºŒì‡±?? ' + cautionText + '</p>'
        + '</article>';
    }).join('');
    if (!monthCards) {
      monthCards = '<div class="sb-free-recovery-month-empty">?ë¶¾í€??ê¾ªë¿• ?ê³—ì” ?ê³? ?¨ê¾©ê¶?ä»¥ë¬’???ˆë–.</div>';
    }

    return ''
      + '<div class="sb-nature-block">'
      + '<div class="sb-nature-tag">??CORE MATRIX ???¾ë?ì¦?æ¹²ê³•??å¯ƒê³Œ??/div>'
      + '<div class="sb-free-recovery-chips">'
      + '<span class="sb-free-recovery-chip sb-free-recovery-chip--mode">RECOVERY MODE</span>'
      + '<span class="sb-free-recovery-chip sb-free-recovery-chip--risk-' + tone + '">' + toneLabel + '</span>'
      + '</div>'
      + '<p class="sb-nature-body">æ¹²ê³•???¨ê¾©ê¶??ë¶¿ì­Š??è¹‚ë“¦??ï§â‘¤ë±¶æ¿¡??ê¾ªì†š???¾ë?ì¦?å¯ƒê³Œ?µç‘œ??ê³—ê½‘ ??“ë‚¬??¸ë•²?? ?ì¢Šì¦º ?ê¾???¼ì” ???±Ñ‹ë£·?ëª? è¹‚ê¾§ì»»æ¿¡????–– ï§Â€??•ë’— ?¨ê¾©???ëº¤ì”¤??????‰ë’¿??ˆë–.</p>'
      + '<div class="sb-nature-row"><span class="sb-nature-key">?ê¾ªë¿• ?¨ê¾©??/span><span class="sb-nature-val sb-nature-val--warn">' + overview.risk + ' / 100</span></div>'
      + '<div class="sb-nature-row"><span class="sb-nature-key">?ê³¸ê½¦ ?¨ê¾©??/span><span class="sb-nature-val">' + overview.coeff + ' / 999</span></div>'
      + '<div class="sb-nature-row"><span class="sb-nature-key">äºŒì‡°ë£???ê½?/span><span class="sb-nature-val">' + overview.dominant + '</span></div>'
      + '<div class="sb-nature-row"><span class="sb-nature-key">ï§Â€è«???½ë»¾</span><span class="sb-nature-val">' + (EL_KR[overview.domEl] || overview.domEl) + '</span></div>'
      + '<p class="sb-nature-body">' + esc(overview.riskHeadline || '') + '</p>'
      + '</div>'
      + '<div class="sb-nature-block">'
      + '<div class="sb-nature-tag">??TIMING SNAPSHOT ???ë¶¾í€??ê¾ªë¿• ?ê³¸ì ?´Ñˆì»™</div>'
      + '<div class="sb-free-recovery-month-grid">' + monthCards + '</div>'
      + '</div>'
      + '<div class="sb-nature-block">'
      + '<div class="sb-nature-tag">??ACTION GUIDE ???¾ë?ì¦???½ë»¾ åª›Â€??€ë±?/div>'
      + '<p class="sb-nature-body">' + overview.action + '</p>'
      + '<div class="sb-nature-row"><span class="sb-nature-key">?ì¢Šì¦º?? ?´Ñ‰í…‡</span><span class="sb-nature-val">?¾ë?ì¦???ë¶¿ë¹Ÿ/æ¹²ê³•??ï§Â€?? 100?„ë¶¿??? 10ï§?º¥ê½??Î»Ğ¦ ?±Ñ‹ë£·???ì¢‰íˆ‘ ??ì £ ?ê¾©ìŠœ??…ë•²??</span></div>'
      + '<ul class="sb-free-recovery-checklist">'
      + '<li>?¾ë?ì¦?å¯ƒê³Œ???æ¹²ê³•??ï§Â€??? ?ë¶¾í€??ê³—ê½‘??–ì??ï§Â€????“ë‚¬??¸ë•²??</li>'
      + '<li>?ì¢Šì¦º 100?„ë¶¿??? ?ê¾???¼ì” ??10ï§?º¥ê½??±Ñ‹ë£·???ì¢‰íˆ‘ ??ì £ ?ê¾©ìŠœ??…ë•²??</li>'
      + '<li>è¹‚ë“¦??ï§â‘¤ë±???ì £ ???ê³¸ê½­ ?¨ê¾©ê¶?å¯ƒê³Œ?µåª›? ?ë¨?£??°ì¤ˆ åª›ê¹†???¸ë•²??</li>'
      + '</ul>'
      + '</div>';
  }

  /* ???? åª›ì’–?«è¸°???¹ê½¦ (??¹ë–Š æ¹²ê³•ì»? ???? */
  function _buildRemedies(dominant, dominantEl) {
    var remedyMap = {
      wood: ['??ê¼: ??ˆã è«›â‘ºë¼??ëº£â”ì¨??–ê½¦?? ?¥ëˆì¤??¨ê¾©ë¿???¸Ğ?è«›ê³—??, '??°ë£: ??ˆê¼ ?ê³—ì½‰ì¨??½ë“ƒ??‰ë¬¶??°ì¤ˆ ï§??? ?ë¨?¼«ï§Â€ ?°â‘¹??, '??±ê¸½: ?¥ëˆì¤‰ì¨Œï§?ê¹??¨ê¾©ë¿???ìªŸì¨??°ë? ??–ìŠœ', '??¹ì” : ?ì¢Šì? ???–‡(??ˆãŒ, ?ë±€ê°? è«›ì’—?????¦º) ????],
      fire: ['??ê¼: è­°ê³•ë£??ë¯? è«›ì•¹? ?¨ë“¦ì»?ë¨?½Œ ??•ë£', '??°ë£: ??•ì»»????½ë“ƒ??°ê¶§ì¨???ë¶¾ì¤ˆ ???? æ¹²ê³—??ï§ì•ºë£?, '??±ê¸½: ?ê³¸ê¹‹ì¨??»ì ‹ï§Â€ ?¨ê¾©ë¿??????, '??¹ì” : ??€ì­???ºë?(?ê¾¨ì°“?±ÑŠë­…?? ?? ??ï¼? æ²…ëš¯??],
      earth: ['??ê¼: ??¹ê¹‹ì¨Œåª›?‰ê¹‹ ?¨ê¾©ë¿??ëª…ë€’ç”±?ë¼? ?ê¾©ì˜„æ¹???°ë? è«›ê³—??, '??°ë£: è¢ëª„????·â‘¦???ì¢?, ??ˆì¤ˆ???ë¨?º½ï§ì”²ë£»ë¸°???‘æ¿????? åª›ëº¥??, '??±ê¸½: ??ºë„—ì¨Œè¸°ì¢ì” ï§Â€ ?¨ê¾©ë¿?, '??¹ì” : ??¤ì? ???–‡(?¨ì¢‰?„ï§? è½…Â€, ???? ?ê³¸ì …??],
      metal: ['??ê¼: ??–ãì¨Œéºê³¸ê½Œï§??¨ë“¦ì»??ëº£â”?ëº£ë£‰, ??ì¨?ê³—ê¹‹ ?¨ê¾©ë¿?, '??°ë£: æ´¹ì’–?‰ì¨Œ?ë¨?Šƒ åª›ëº¥?? ï§ë‚†ê¸½ì¨Œï§ë¬’ì¨???ˆì ´', '??±ê¸½: ?ê³—ê¹‹ì¨???¹‹ì¨?????¨ê¾©ë¿???ìªŸ', '??¹ì” : ï§ã…¼?«ï§???ºë?(?¨ì¢?? ??·ì»¯, ï§ëˆ?? ?ê³¸ì …??],
      water: ['??ê¼: ?ºê³¸??ï§¡ì„? ?ë¬’ë¾½ ?¨ë“¦ì»? ?‰ë¶¾ï¼??¨ê¾©ë¿???°ë?', '??°ë£: ?ê³Œë„ì¨??ˆë’¿ì¨??†ê½Œæ¿???ï¦? ?ë¨?¼«ï§Â€ ?°ëº¤??, '??±ê¸½: å¯ƒÂ€?ë¹§ë£¹ì­??¥ê¹‹ ?¨ê¾©ë¿??????, '??¹ì” : ï§ì¢Šì­???ºë?(?ëº¤ì £ ???ˆ‘, ??–ì˜£, èª˜ëª„ë¿? æ´¹ì¢??]
    };
    var base = remedyMap[dominantEl] || remedyMap.water;
    // ??ê½?¹‚??°ë¶½? ï§£ì„ê°?    var extraMap = {
      '??¹ë–Š': '??¹ë–Šì¨?ê³? ?ë¨?¼«ï§Â€: ï§¡ìŒ????•ë£(æ¹²Â€?ê³Œë¦°ì¨???¸™ì¨??‰ë‹ )???ëº?¦°?????„æ¿¡?????ï§?¾¨ê¼¸ï§?,
      '?ë©?': '?ë©? åª›ëº¥????“ë¦°: æ´¹ì’–??ê³¸ì”¤ ??€ë£??·â‘¦???°ì¤ˆ ?¿Â€??ï¥´ì„‰?????ëº£ì»¯ ?ë¨?¼«ï§Â€??æ¹²ë¿????ëƒ¼',
      '?ëº?': '?ëº? ??‰ì ™æ¹? ?¨ë“­???ë¨?º½ï§ì”²ë£¹ì­…???â‘¤ë±??°ì¤ˆ ?¿Â€?ê¹†ì“½ ?ëº£ë–¦??åª›ëº¥??,
      '?ëª„ì˜±': '?ëª„ì˜± ??–ê½¦?? ??£ë¦° ?????????Îºë¦??ë¨?¶› è«›ê³•???°ì¤ˆ ??Ğª ?ºê¾©ê¶??±ÑŠë’ª???¿Â€??,
      '?ëª„ì”¤': '?ëª„ì”¤ åª›ëº¥?? ?ê¾¨Ğ??ë¨?º½ì¨??????ˆë’¿??°ì¤ˆ ?ëª„ê½¦(?ê²½ì‚œ) ï§Â€???ë¨?¶›???ê¾§íˆ‘ ?ë¨?««???ê³Œê»'
    };
    var extra = extraMap[dominant];
    if (extra) base = [extra].concat(base);
    return base.slice(0, 4);
  }

  /* ??????????????????????????????????????????????????????????????????
     UI ??…ëœ²??„ë“ƒ ????  ?????????????????????????????????????????????????????????????????? */
  function _q(id) { return document.getElementById(id); }
  function _t(id, text) { var el = _q(id); if (el) el.textContent = text; }
  function _html(id, html) { var el = _q(id); if (el) el.innerHTML = html; }

  /* ???? ??¼í‹ª ?ì¢Šë•²ï§ë¶¿???(?¥ë‡????ê¾¨â”èª˜ëª„ë¾?ï§¤ì’–???- è¹‚ë¬??ï§£ë‹¿ì»??ê¾©ìŸ¾ ??“êµ…) ???? */
  function _runScanAnim(onDone) {
    var scanSec = _q('sb-scan-section');
    if (scanSec) scanSec.classList.remove('sb-hidden');
 
    var barIds = ['sbBarOhaeng','sbBarTenstar','sbBarRisk','sbBarApt','sbBarHue'];
    var targets = [100, 100, 100, 100, 100];
    // ?¥ë‡?????¼í‹ª ?ì¢Šë•²ï§ë¶¿???ì‘æ¿???•ì …??ï§¡â‘¤??(0.6????€ê¶??ê¾¨ì¦º)
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

  /* ???? ?¾ë?ì¦??ë±€?????œ‘ï§????? */
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

      _t('sbHueName', hueData.name + ' ì¨?' + EL_KR[domEl]);
      var statusEl = _q('sbHueStatus');
      if (statusEl) {
        statusEl.textContent = clarity === 'clear' ? '????€???Clear) ????½ë»¾ æ´¹ì¢????ë¬“ìƒ‡' : '???ê³¹ë¸¿(Cloudy) ????½ë»¾ ?ëª„ì¨· ?ë¨?’— å¯ƒê³ ë¸?åª›ë¨¯?';
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
        cols.forEach(function(c){ _t(c.id, c.val || 'èª˜ëª„??); });
      }

      var counts = normalized.tenStarCounts || {};
      var dominant = normalized.dominantTenStar || SIBYL_PRIMARY_TENGOD_FALLBACK;
      var secData = TENSTAR_SECTOR[dominant] || TENSTAR_SECTOR['?ëª„ì˜±'];
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
          + '<div class="sb-metric-label">?ê¾ªë¿• ?¨ê¾©??/div>'
          + '<div class="sb-metric-value" id="sbRiskBasicEl"><span id="sbRiskBasic">--</span></div>'
          + '</div>'
          + '<div class="sb-metric-card">'
          + '<div class="sb-metric-label">?ê³¸ê½¦ ?¨ê¾©??/div>'
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
          + '<div class="sb-metric-label">?°ãˆ‘ë£»ì‚ì¨??¿ë£»ë¹?/div>'
          + '<div class="sb-metric-value" id="sbRiskCollision">--</div>'
          + '</div>'
          + '<div class="sb-metric-card">'
          + '<div class="sb-metric-label">??è¹‚Â€??ˆê½¦</div>'
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
      _t('sbSectorTenstar', 'äºŒì‡°ë£???ê½? ' + profileDominant);

      // Caution / Warning ??G_POWER æ¹²ê³•ì»???»ì­??å¯ƒìˆ??      var warn = _buildSmartWarning(corePillars, dominant, counts, dist);
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

      // Nature + Year Pulse + Inner Palace ?ê¾©ê»œ ???œ‘
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
      // Fail-open: ?¾ë?ì¦?å¯ƒê³Œ?????ê¸?ç§»ëŒ„?’æ€¨ì¢Š??ëº¤ì‘æ¿??ëª„í…§??í€? ?ë¨?œ­ ??»ì¾­??‰ì” æ¿?åª›Â€?±Ñ? ??…ë’—??
      // è¹‚ë“¦??ï§â‘¤ë±??ë¨?»œ????‰ì‡…åª›Â€ ??ãˆƒ ?ë±€???è«›ì„ë±???ëª„í…§
      var freeSecFallback = _q('sbFreeSection');
      if (freeSecFallback) {
        freeSecFallback.classList.remove('sb-hidden');
        freeSecFallback.classList.add('sb-fadein');
      }
      try {
        var recovery = _buildSibylRecoveryOverview(pillars, window._sibylCurrentData && window._sibylCurrentData.risk, window._sibylCurrentData && window._sibylCurrentData.coeff);

        _t('sbSectorName', 'FREE BASIC RESULT MODE');
        _t('sbSectorJobs', 'è¹‚ë“¦??ï§â‘¤ë±¶æ¿¡??¾ë?ì¦????–– å¯ƒê³Œ?µç‘œ??ê³—ê½‘ ??“ë‚¬??¸ë•²?? ?ì¢Šì¦º ?ì¢‰íˆ‘ ??ì £ ?±Ñ‹ë£·?ëª? ?ºê¾¨???ë¼± ??ˆì˜‰??¸ë•²??');
        _t('sbSectorTenstar', 'äºŒì‡°ë£???ê½? ' + recovery.dominant);
        _t('sbHueStatus', '??è¹‚ë“¦??ï§â‘¤ë±?Recovery) ???¾ë?ì¦?æ¹²ê³•??ï§Â€??? ?ê³—ê½‘ ??“ë‚¬??¸ë•²??');
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
        _t('sbCautionText', '????? ?¨ê¾©ê¶??ê³—ì” ?ê³? ï§Â€?ê³•ë¦º??è¹‚ë“¦??ï§â‘¤ë±¶æ¿¡???–ë–† ä»¥ë¬’???ˆë–. ?¾ë?ì¦?æ¹²ê³•??å¯ƒê³Œ????ì¢???Å??ì¢Šì¦º ?ì¢‰íˆ‘ ??ì £ ?ë¨?««???ºê¾¨???¸ë•²??');

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
        // è¹‚ë“¦??ï§â‘¤ë±??ë¨?»œ????½ë™£??å¯ƒìŒ??- sbFreeSectionï§??ëº¤ë–???ëª„í…§??í€?æ¹²ê³•??ï§ë¶¿?†ï§? ??–ë–†
        _sibylLogWarn('[SIBYL] recovery mode also failed', { reason: String(recoveryErr && recoveryErr.message || '') });
        _t('sbSectorName', 'æ¹²ê³•????ê½­ ?ºê¾©ê½?);
        _t('sbSectorJobs', '?ê³—ì” ?ê³? ?ºëˆ???»ë’— ä»???»ìªŸåª›Â€ è«›ì’–ê¹??‰ë’¿??ˆë–. ?ì¢ë–† ????¼ë–† ??•ë£„??äºŒì‡±ê½??');
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
      message: _safeErrorMessage(result) || fallbackMessage || '?ë¶¿ê»Œ ï§£ì„??ä»???»ìªŸåª›Â€ è«›ì’–ê¹??‰ë’¿??ˆë–.'
    };
  }

  async function _resolveSibylPricing() {
    var featureRes = await _fetchApiJson('/api/billing/features?featureKey=' + encodeURIComponent(SIBYL_FEATURE_KEY));
    if (!featureRes.ok) {
      throw _toApiError(featureRes, 'å¯ƒê³—??åª›Â€å¯??ëº£ë‚«???ºëˆ???? ï§ì‚µë»??¬ë•²??');
    }
    var featureData = _extractApiData(featureRes.payload);
    var pricing = featureData && featureData.pricing ? featureData.pricing : null;
    var cost = Number(pricing && pricing.cost || 0);
    var reason = String(pricing && pricing.reason || SIBYL_FEATURE_REASON).trim();
    if (!Number.isFinite(cost) || cost <= 0 || !reason) {
      throw { status: 422, code: 'PRICE_NOT_FOUND', message: 'å¯ƒê³—??åª›Â€å¯??ëº£ë‚«åª›Â€ ??ì»?‘œ?? ??†ë’¿??ˆë–.' };
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
      throw _toApiError(balanceRes, '?„ë¶¿???ë¶¿ë¸¸???ëº¤ì”¤??? ï§ì‚µë»??¬ë•²??');
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
        error: _toApiError(statusRes, '?ì¢‰íˆ‘ ??ì £ ?ê³¹ê¹­???ëº¤ì”¤??? ï§ì‚µë»??¬ë•²??')
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
    try {
      var pendingRaw = localStorage.getItem('fortune_pending_subscription_pass') || '';
      if (pendingRaw) {
        var pending = JSON.parse(pendingRaw);
        var pendingTier = String(pending && pending.tier || '').trim().toLowerCase();
        if (pendingTier === 'standard' || pendingTier === 'premium' || pendingTier === 'vvip') {
          if (typeof window._cdShowSubscriptionShieldNotice === 'function') {
            window._cdShowSubscriptionShieldNotice({
              message: 'ÀÌ¿ë±Ç µî·Ï È®ÀÎ ÁßÀÔ´Ï´Ù. ÄÚÀÎÀº Â÷°¨µÇÁö ¾Ê¾Ò½À´Ï´Ù.',
              subscriptionTier: pendingTier,
              freeLimit: null,
              requiredCoins: 0
            });
          }
          return {
            requestId: _createRequestId('sibyl-pending-subscription'),
            pricing: {
              featureKey: SIBYL_FEATURE_KEY,
              cost: 0,
              reason: SIBYL_FEATURE_REASON
            },
            consumePayload: {
              ok: true,
              bypass: true,
              pendingSubscription: true,
              chargedCoins: 0,
              subscriptionTier: pendingTier,
              message: 'ÀÌ¿ë±Ç µî·Ï È®ÀÎ ÁßÀÔ´Ï´Ù. ÄÚÀÎÀº Â÷°¨µÇÁö ¾Ê¾Ò½À´Ï´Ù.'
            },
            bypass: true
          };
        }
      }
    } catch (_) {}
    var pricing = await _resolveSibylPricing();

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
        reason: String(failReason || '??•í‰´???±Ñ‹ë£·????¹ê½¦ ??½ë™£ ?ë¨?£ ??íˆ’').slice(0, 120)
      })
    });

    return refundRes;
  }

  /* ???? ?„ë¶¿??ï§¡â‘£ì»????ê¾???¼ì” ???±Ñ‹ë£·???ëª„í…§ ???? */
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
        _setSibylState(SibylState.PROCESSING_PAYMENT, '>> å¯ƒê³—???ê³¹ê¹­???ëº¤ì”¤??ë’— ä»¥ë¬’???ˆë–??);
        var unlockStatus = await _resolveSibylUnlockStatus();

        if (!unlockStatus || !unlockStatus.ok) {
          throw (unlockStatus && unlockStatus.error) || {
            status: 503,
            code: 'UNLOCK_STATUS_UNAVAILABLE',
            message: '?ì¢‰íˆ‘ ??ì £ ?ê³¹ê¹­???ëº¤ì”¤??? ï§ì‚µë»??¬ë•²?? ?ì¢ë–† ????¼ë–† ??•ë£„??äºŒì‡±ê½??'
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
      _setSibylState(SibylState.GENERATING_REPORT, '>> ?ê¾???¼ì” ???±Ñ‹ë£·?ëª? ??¹ê½¦??ë’— ä»¥ë¬’???ˆë–??);
      await _generateDominatorReport(paymentContext);
      _restoreUnlockBtn();
    } catch (error) {
      _sibylLogError('[SIBYL] premium unlock failed', error);

      if (paymentContext && !paymentContext.bypass) {
        try {
          await _requestSibylRefund(paymentContext, '??•í‰´???±Ñ‹ë£·????¹ê½¦ ??½ë™£ ?ë¨?£ ??íˆ’');
        } catch (refundErr) {
          _sibylLogError('[SIBYL] premium unlock failed', refundErr);
        }
      }

      var userMessage = _toFriendlySibylErrorMessage(error, '??•í‰´???±Ñ‹ë£·?ëª? ??¹ê½¦??? ï§ì‚µë»??¬ë•²?? ?ì¢ë–† ????¼ë–† ??•ë£„??äºŒì‡±ê½??');
      _setSibylState(SibylState.ERROR, userMessage);
      _restoreUnlockBtn();
    }
  }

  /* ???? ?ê¾???¼ì” ???±Ñ‹ë£·????¹ê½¦ (æ¿¡ì’–ëº??¨ê¾©ê¶??¨ì¢?? ???? */
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
      { pct:10, msg:'>> ?ë¶¿ì˜„ ?ë¨?… ???–› ä»¥ë¬…?? },
      { pct:25, msg:'>> ??ï¼?ï§ë‚†????½ë»¾ ?ºê¾ªë£??ºê¾©ê½?ä»¥ë¬…?? },
      { pct:40, msg:'>> å¯ƒâ‘·?…ì¨Œ??¹ë–Š ?¨ê¾©ê¶??ë¶¿ì­Š åª›Â€??ºÂ€? },
      { pct:55, msg:'>> ????”ë£¹ê½???ê¾ªë¿• ?ëª„ì˜„ ï§£ì„??ä»¥ë¬…?? },
      { pct:70, msg:'>> ?ê¾???¼ì” ???±Ñ‹ë£·????¹ê½¦ ä»¥ë¬…?? },
      { pct:85, msg:'>> ï§ê¾¨ì¤??ê³¸ê½¦ è¸°â‰«ê½?ï§¤ì’–???ä»¥ë¬…?? },
      { pct:95, msg:'>> ï§¤ì’–ì¥??±Ñ‹ë£·???ŒëŒ„???ä»¥ë¬…?? }
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
        throw new Error('??ï¼??ë¨?… ?ê³—ì” ?ê³? ??¾©ë¼???‰ë’¿??ˆë–. ?’ì‡±? ??ï¼??ºê¾©ê½???ê¾¨ì¦º??äºŒì‡±ê½??');
      }

      await new Promise(function (r) { setTimeout(r, 240); });
      var reportData = _shapeSibylPremiumReport(_buildLocalDominatorReport(payload, data), canonicalData);

      var finalValidation = _validateSibylPremiumChapterMap(reportData.chapterMap);
      if (!finalValidation.ok) {
        throw {
          status: 422,
          code: 'SIBYL_REPORT_INVALID',
          message: '?±Ñ‹ë£·????¹ê½¦ å¯ƒê³Œ?µåª›? æ¹²ê³—????°â‘¹???? ï§ì‚µë»??¬ë•²??'
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
        + '<span class="sb-monthly-risk">?ê¾ªë¿• ' + item.risk + '</span>'
        + '</div>'
        + '<div class="sb-monthly-label">äºŒì‡±??/div>'
        + '<p class="sb-monthly-text">' + item.caution + '</p>'
        + '<div class="sb-monthly-label">??ï§?/div>'
        + '<p class="sb-monthly-text">' + item.countermeasure + '</p>'
        + '</article>';
    }).join('');
    return '<section class="sb-monthly-wrap">'
      + '<div class="sb-monthly-title">MONTHLY RISK TACTICS ì¨??ë¶¾í€???ê½­/?ê¾ªë¿• ??ï§?/div>'
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
        : 'ï§ê³´êº??°â‘º???°ë¹ ï§ë¶¾????ì“¬';
      return '<details class="sb-insight-acc" ' + (idx === 0 ? 'open' : '') + '>'
        + '<summary>' + item.year + '??ì¨??ê¾ªë¿• ' + item.risk + ' ì¨?' + item.ganZhi + '</summary>'
        + '<div class="sb-insight-acc-body">'
        + '<p>?ëª„ìŠ« ?ë¨?‹” ' + item.yearScore + ', ?????ë¨?‹” ' + item.daewunScore + ', ?°â‘·êº???£í€?' + item.shock + '.</p>'
        + '<p>?°â‘¸ë£??ì¢ìƒ‡: ' + notes + '</p>'
        + '<p>??½ë»¾ ?ë¶¿ë¹Ÿ: ' + (item.summary || 'æ¹²ê³•???±ÑŠë’ª??æ¹²ê³—? ??ìŠœ æ²…ëš¯??) + '</p>'
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
          return '<span class="sb-quantum-chip sb-quantum-chip--' + tone + '">' + role.label + ' ì¨?' + role.roleLabel + '</span>';
        }).join('')
      : '';

    return '<section class="sb-insight-panel">'
      + '<div class="sb-insight-head">RISK COMMAND CENTER</div>'
      + '<div class="sb-insight-grid">'
      + '<article class="sb-insight-box">'
      + '<h4>?ë¶¾í€??ê¾ªë¿• ??½ë“ƒ??/h4>'
      + '<div class="sb-risk-strip">' + strips + '</div>'
      + '</article>'
      + '<article class="sb-insight-box">'
      + '<h4>?ê³¸ê½¦ ??‰ì” ??5??</h4>'
      + '<div class="sb-radar-wrap">' + radarRows + '</div>'
      + '</article>'
      + '</div>'
      + '<div class="sb-insight-grid">'
      + '<article class="sb-insight-box">'
      + '<h4>?ê³¸ì ?ê¾ªë¿• ??TOP3</h4>'
      + '<ul class="sb-insight-list">' + topMonths.map(function(m) { return '<li>' + m.month + '??ì¨??ê¾ªë¿• ' + m.risk + ' ì¨?' + m.focus + '</li>'; }).join('') + '</ul>'
      + '<h4>??‰ì ™ ??TOP3</h4>'
      + '<ul class="sb-insight-list">' + stableMonths.map(function(m) { return '<li>' + m.month + '??ì¨??ê¾ªë¿• ' + m.risk + ' ì¨?' + m.focus + '</li>'; }).join('') + '</ul>'
      + '</article>'
      + '<article class="sb-insight-box">'
      + '<h4>ç§»ëŒ„?’æ€¨ì¢Š??ï§ã…½?ƒç”±???/h4>'
      + '<div class="sb-cat-grid">' + categoryCards + '</div>'
      + '</article>'
      + '</div>'
      + '<div class="sb-insight-grid">'
      + '<article class="sb-insight-box">'
      + '<h4>?±ÑŠë’ª????ì?ë¶¿ì”¤</h4>'
      + '<ul class="sb-insight-list">'
      + '<li>??½ë»¾ ?ºë‡??? ' + (parts.elementImbalance || 0) + '</li>'
      + '<li>??ê½??¨ì‡°??? ' + (parts.tenStarOverload || 0) + '</li>'
      + '<li>?°ãˆ‘ë£»ì‚ì¨??¿ë£»ë¹? ' + (parts.collision || 0) + '</li>'
      + '<li>????”ë£¹ê½???°â‘¸ë£? ' + (parts.daewunSeunConflict || 0) + '</li>'
      + '<li>??è¹‚Â€??ˆê½¦: ' + (parts.monthlyVolatility || 0) + '</li>'
      + '<li>è­°ê³ ????½ë“ƒ??‰ë’ª: ' + (parts.johuStress || 0) + '</li>'
      + '</ul>'
      + '</article>'
      + '<article class="sb-insight-box">'
      + '<h4>???? ??½ë»¾ ï§ê¾¨??/h4>'
      + '<ul class="sb-insight-list">'
      + '<li>ï§â‘¤ë±? ' + (quantum.mode || '???+è­°ê³ ??) + '</li>'
      + '<li>è­°ê³ ?????? ' + (quantum.johuType || 'neutral') + '</li>'
      + '<li>?ì¢Šâ” ??½ë»¾: ' + ((quantum.favorableElements || []).join(', ') || 'ä»¥ë¬???°ë¶¿??') + '</li>'
      + '<li>äºŒì‡±????½ë»¾: ' + ((quantum.cautionElements || []).join(', ') || 'ä»¥ë¬???°ë¶¿??') + '</li>'
      + '</ul>'
      + '<div class="sb-quantum-chip-wrap">' + quantumRows + '</div>'
      + '</article>'
      + '</div>'
      + '<div class="sb-insight-grid sb-insight-grid--single">'
      + '<article class="sb-insight-box">'
      + '<h4>?¨ì¢????ê³•ë£„ ?ê³¸ê½­ ?ê¾©í«?ë¶¿ë¼µ</h4>'
      + accordion
      + '</article>'
      + '</div>'
      + '<div class="sb-insight-grid">'
      + '<article class="sb-insight-box sb-insight-box--warn"><h4>å¯ƒì„??è«›ëº¤??/h4><p>?¨ì¢????ë¶¿ë¿‰??å¯ƒê³—??ï§Â€??æ´¹ì’–??24??“ì»™)???¾ëª„ê½?æ¹²ê³•ì»???¹ì“½ ??‰ê°??åª›ëº¤???ê½­??</p></article>'
      + '<article class="sb-insight-box sb-insight-box--plan"><h4>?ê¾¨ì™‚ è«›ëº¤??/h4><p>??‰ì ™ ?ë¶¿ë¿‰?????–– ?¨ì‡±??1åª›ì’•? ?ê¾©ì­Š è«›ê³—????ê¹ƒë‚µ???¨ì¢???í€? å¯ƒì„???ë¶¿ë¿‰??å¯ƒÂ€ï§???£í€???¾©ì¨????â”?ëª„ìŠ‚.</p></article>'
      + '<article class="sb-insight-box sb-insight-box--routine"><h4>?·â‘¦??è«›ëº¤??/h4><p>äº?2?????‚¬ ?·â‘¦????ãˆƒ/??€ë£???¾©??ë¨?¦°)??ï§?„????¨ì¢???ãˆƒ ??è¹‚Â€??ˆê½¦ ?°â‘·êº????ªë‹”??????‰ë’¿??ˆë–.</p></article>'
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

  /* ???? ?ê¾???¼ì” ???±Ñ‹ë£·?????œ‘ï§????? */
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
      nle: { cls:'nle', tag:'MODE: STABLE GROWTH TRACK', title:'??‰ì ™ ?ê¹†ì˜£ ï§â‘¤ë±?????æ²…ã…»ë£??ëº? ?ì¢?', desc:'?ê¾©ì˜± ?ë¨?««?? ??‰ì ™ ?´Ñˆì»™??…ë•²?? ?ê¹ƒë‚µ????¼ìŠ¦æ¹²ê³•???????åª›Â€?Î½ë¸??·â‘¦????¨ì¢???è¹‚Â€??ˆê½¦???????å¯ƒê»‹??åª›Â€????£ë‚µ?ê³¸ì—¯??ˆë–.' },
      le:  { cls:'le',  tag:'MODE: RISK ADJUSTMENT TRACK', title:'?ê¾ªë¿• è­°ê³—??ï§â‘¤ë±?????½ë»¾ ??–ê½Œ ??ê°™ç§»?, desc:'å¯ƒì„???ì¢ìƒ‡åª›Â€ åª›ë¨¯????´Ñˆì»™??…ë•²?? ä»¥ë¬’???å¯ƒê³—??? å¯ƒÂ€ï§???£í€ç‘œ??’ì‡±? ?ë¨?€? ??½ë»¾ åª›ëº£ë£„ç‘œ?è­°ê³—????ë¨?– ?´Ñˆì»™??ï§ãì¾??¿Â€?±Ñ‹ë¸¯?ëª„ìŠ‚.' },
      dd:  { cls:'dd',  tag:'MODE: INTENSIVE RESET TRACK', title:'ï§ë¬’ì¨????™é®?ï§â‘¤ë±????´ÑŠâ€??±ÑŠë€??ê¾©ìŠ‚', desc:'?¨ì¢???è¹‚Â€???´Ñˆì»™??…ë•²?? æ¹²ê³—??è«›â‘¹????ê¾¨ãˆƒ ä»¥ë¬????ê¾¨ë•²?????–– ?ê¾¨ì¤ˆ?ëª„ë’ª???????ë¹??±ÑŠë’ª??? ä»¥ê¾©? æ€????‚¬?Î¼???ê³—ê½‘ ?ëº£ë‚«??ê½­??' }
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
        + '<div class="sb-metric-label">?ê¾ªë¿• ?¨ê¾©??/div>'
        + '<div class="sb-metric-value" id="sbDomRiskEl"><span id="sbDomRisk">0</span></div>'
        + '</div>'
        + '<div class="sb-metric-card">'
        + '<div class="sb-metric-label">?ê³¸ê½¦ ?¨ê¾©??/div>'
        + '<div class="sb-metric-value sb-metric-value--ok" id="sbDomCoeff">' + coeff + '</div>'
        + '</div>'
        + '<div class="sb-metric-card">'
        + '<div class="sb-metric-label">äºŒì‡°ë£???ê½?/div>'
        + '<div class="sb-metric-value" id="sbDomSector">' + dominant + '</div>'
        + '</div>'
        + '<div class="sb-metric-card">'
        + '<div class="sb-metric-label">?°ãˆ‘ë£»ì‚ì¨??¿ë£»ë¹?/div>'
        + '<div class="sb-metric-value">' + (parts ? parts.collision : 0) + '</div>'
        + '</div>'
        + '<div class="sb-metric-card">'
        + '<div class="sb-metric-label">????”ë£¹ê½???°â‘¸ë£?/div>'
        + '<div class="sb-metric-value">' + (parts ? parts.daewunSeunConflict : 0) + '</div>'
        + '</div>'
        + '<div class="sb-metric-card">'
        + '<div class="sb-metric-label">??è¹‚Â€??ˆê½¦</div>'
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
          var shortTitle = String(ch.title || ('CH' + String(i + 1))).replace(/^CH\d+\s*[ì¨?]\s*/, '');
          return '<button type="button" class="sb-chapter-jump-btn" data-target="sbChapter_' + i + '">CH' + String(i + 1).padStart(2, '0') + ' ì¨?' + shortTitle + '</button>';
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

  /* ???? ???ë¨?¦° ??£ë‚µ ???? */
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

  /* ???? ï§ë¶¿????¿ë¦°/??ªë¦° ???? */
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
        profileChip.textContent = '???? ' + (b.year || '--') + '.' + (b.month || '--') + '.' + (b.day || '--') + ' ì¨?' + ((profile.gender || 'F') === 'M' ? '??¥ê½¦' : '??ê½?);
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

  /* ???? Unlock dominator (exposed) ???? */
  window._sibylUnlockDominator = function() {
    _unlockDominator().catch(function(e) {
      _sibylLogError('[SIBYL] premium unlock failed', e);
      _setSibylState(SibylState.ERROR, _toFriendlySibylErrorMessage(e, '?ë¶¿ê»Œ ï§£ì„??ä»??¾ëª„?£åª›? è«›ì’–ê¹??‰ë’¿??ˆë–. ?ì¢ë–† ????¼ë–† ??•ë£„??äºŒì‡±ê½??'));
      var genEl = _q('sbGenerating');
      if (genEl) genEl.classList.add('sb-hidden');
    });
  };

  window._sibylRetryDominator = function() {
    if (!_sibylLastPaidContext && !_isAdminBypassUser()) {
      _setSibylState(SibylState.ERROR, '??????ê¾©ë¿‰ å¯ƒê³—?£ç‘œ???¼ë–† ï§ê¾ªë»??äºŒì‡±ê½??');
      return;
    }

    _setSibylState(SibylState.GENERATING_REPORT, '>> ?±Ñ‹ë£·????¹ê½¦??????ê¾ªë¸¯??ä»¥ë¬’???ˆë–??);
    _generateDominatorReport(_sibylLastPaidContext).catch(function(e) {
      _sibylLogError('[SIBYL] premium unlock failed', e);
      _setSibylState(SibylState.ERROR, _toFriendlySibylErrorMessage(e, '????ê¾©ë¿‰ ??½ë™£??‰ë’¿??ˆë–. ?ì¢ë–† ????¼ë–† ??•ë£„??äºŒì‡±ê½??'));
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
