­r‡^Ñf¥–Ø¦{OlyÊ'vÃ®¶›­/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   Destiny Profile Manager  Â·  v1.0
   Deep Space & Sacred Gold â€” ìƒë…„ì›”ì¼ & ìž¥ì†Œ ê¸°ë°˜ ì‹œì°¨ ë³´ì • í”„ë¡œí•„
   Namespace: FORTUNE_APP_USER_PROFILES
   CustomEvent: 'destinyProfileChanged' â†’ ì‚¬ì£¼ ì—”ì§„ ìžë™ ì—°ë™
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
(function() {
  'use strict';

  /* ì¶œìƒì§€ ë“œë¡­ë‹¤ìš´ì—ì„œ ì €ìž¥ëœ ì¢Œí‘œì— 'ê°€ìž¥ ê°€ê¹Œìš´' ë„ì‹œ ì˜µì…˜ì„ ì„ íƒí•œë‹¤.
     ëª¨ë“  í•œêµ­ ë„ì‹œê°€ option.value='Asia/Seoul'ë¡œ ë™ì¼í•˜ê³ , ì¸ì ‘ ë„ì‹œ(ì˜ˆ: ëŒ€êµ¬ 128.60Â°EÂ·ë¶€ì‚° 129.08Â°E)ëŠ”
     ê²½ë„ ì°¨ê°€ 1ë„ ë¯¸ë§Œì´ë¼, ê³¼ê±°ì˜ "ê²½ë„ì°¨<1ë„ ì²« ë§¤ì¹­"ì€ ëª©ë¡ì—ì„œ ì•žì„  ë„ì‹œë¡œ ì˜¤ì„ íƒëë‹¤(ëŒ€êµ¬ ì„ íƒâ†’ë¶€ì‚°).
     tzê°€ ì¼ì¹˜í•˜ëŠ” ì˜µì…˜ ì¤‘ ê²½ë„(+ìœ„ë„) ê±°ë¦¬ê°€ ìµœì†Œì¸ ì˜µì…˜ì„ ê³ ë¥´ë¯€ë¡œ íŠ¹ì • ë„ì‹œ í•˜ë“œì½”ë”© ì—†ì´ ì „ ì§€ì—­ì´ ì •í™•ížˆ ë³µì›ëœë‹¤. */
  function _dpSelectBirthPlaceOption(countrySel, tz, lng, lat) {
    if (!countrySel || !tz) return false;
    var targetLng = Number(lng);
    var hasLng = isFinite(targetLng);
    var targetLat = Number(lat);
    var hasLat = isFinite(targetLat);
    var bestIdx = -1;
    var bestScore = Infinity;
    var tzFallbackIdx = -1;
    for (var i = 0; i < countrySel.options.length; i++) {
      var opt = countrySel.options[i];
      if (opt.value !== tz) continue;
      if (tzFallbackIdx < 0) tzFallbackIdx = i;
      if (!hasLng) continue;
      var optLng = parseFloat(opt.getAttribute('data-long'));
      if (!isFinite(optLng)) continue;
      var score = Math.abs(optLng - targetLng);
      if (hasLat) {
        var optLat = parseFloat(opt.getAttribute('data-lat'));
        if (isFinite(optLat)) score += Math.abs(optLat - targetLat);
      }
      if (score < bestScore) { bestScore = score; bestIdx = i; }
    }
    var chosen = bestIdx >= 0 ? bestIdx : tzFallbackIdx;
    if (chosen < 0) return false;
    countrySel.selectedIndex = chosen;
    try { countrySel.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {}
    return true;
  }

  /* â”€â”€ ìŠ¤í† ë¦¬ì§€ í‚¤ â”€â”€ */
  var NS       = 'FORTUNE_APP_USER_PROFILES';
  var KEY_LIST = NS + '.list';
  var KEY_CURR = NS + '.current';
  var KEY_SCOPE_HINT  = NS + '.scope';
  var KEY_LEGACY_OWNER = NS + '.legacyOwner';
  var KEY_LIST_PREFIX = NS + '.list::';
  var KEY_CURR_PREFIX = NS + '.current::';
  var KEY_META_PREFIX = NS + '.meta::';
  var KEY_POLICY_PREFIX = NS + '.policy::';
  var PROFILE_POLICY_TTL_MS = 10 * 60 * 1000;
  var _dpScopedStorageReadyScope = '';
  var _dpProfileMemoryScope = '';
  var _dpProfiles = [];
  var _dpCurrentId = '';
  var PROFILE_CARD_MANAGE_FEATURE_KEY = 'profile-card-manage';
  var PROFILE_CARD_MANAGE_COST = 50;
  var PROFILE_CARD_MANAGE_MONTHLY_COST = PROFILE_CARD_MANAGE_COST * 10;
  var DP_PROFILE_DELETE_GATE_MARKER = 'profile-delete-dedicated-gate-v20260618-monthly';
  var ACTIVE_PROFILE_CACHE_KEY = 'code-destiny.activeProfileCache.v1';
  var ACTIVE_PROFILE_ID_KEY = 'code-destiny.activeProfileId';
  var GUEST_PROFILE_KEY = 'codeDestiny:guestProfile';
  var _dpProfileMenuLastTouchAt = 0;
  var _dpProfileMenuPointerHandledAt = 0;
  var _dpProfileMenuSyntheticEvent = false;
  var DP_TEXT_TRANSLATIONS = {
    ko: {
      apiCooldown: 'ì„œë²„ ì‘ë‹µì´ ë¶ˆì•ˆì •í•˜ì—¬ ìž ì‹œ ëŒ€ê¸° ì¤‘ìž…ë‹ˆë‹¤. ìž ì‹œ í›„ ë‹¤ì‹œ ì‹œë„í•´ ì£¼ì„¸ìš”.',
      apiConnectionFailed: 'API ì—°ê²°ì— ì‹¤íŒ¨í–ˆìŠµë‹ˆë‹¤. ìž ì‹œ í›„ ë‹¤ì‹œ ì‹œë„í•´ ì£¼ì„¸ìš”.',
      networkError: 'ë„¤íŠ¸ì›Œí¬ ì˜¤ë¥˜ê°€ ë°œìƒí–ˆìŠµë‹ˆë‹¤. ìž ì‹œ í›„ ë‹¤ì‹œ ì‹œë„í•´ ì£¼ì„¸ìš”.',
      passAppliedOverlay: 'ì´ìš©ê¶Œì´ ì ìš©ë˜ì—ˆìŠµë‹ˆë‹¤.\nì´ë²ˆ ì½˜í…ì¸ ëŠ” ë³´ìœ í•œ ì´ìš©ê¶Œìœ¼ë¡œ ë¬´ë£Œ ì´ìš©ë©ë‹ˆë‹¤.\nì¶”ê°€ ê²°ì œ ì—†ì´ ë°”ë¡œ ì—´ì–´ë“œë¦´ê²Œìš”.',
      monthlyAppliedOverlay: 'ì›”ì •ì„ ì‚¬ìš©ì´ ì™„ë£Œë˜ì—ˆìŠµë‹ˆë‹¤.\në³´ìœ í•œ ì›”ì •ì„ìœ¼ë¡œ ì´ë²ˆ ì½˜í…ì¸ ë¥¼ ì´ìš©í•©ë‹ˆë‹¤.\në°”ë¡œ ì—´ì–´ë“œë¦´ê²Œìš”.',
      paymentCompleteOverlay: 'ê²°ì œê°€ ì™„ë£Œë˜ì—ˆìŠµë‹ˆë‹¤.\nì½˜í…ì¸ ë¥¼ ì—¬ëŠ” ì¤‘ìž…ë‹ˆë‹¤.\nìž ì‹œë§Œ ê¸°ë‹¤ë ¤ ì£¼ì„¸ìš”.',
      subscriptionIncluded: 'ì´ìš©ê¶Œìœ¼ë¡œ ì¶”ê°€ ê²°ì œ ì—†ì´ ì´ìš©í•©ë‹ˆë‹¤.',
      serviceTermDisclaimer: 'ê²°ì œ ì™„ë£Œ í›„ ì¦‰ì‹œ ì„œë¹„ìŠ¤ê°€ ì œê³µë©ë‹ˆë‹¤. êµ¬ë§¤í•œ ì„œë¹„ìŠ¤ëŠ” ê²°ì œê°€ í™•ì¸ë˜ëŠ” ìˆœê°„ë¶€í„° ì´ìš©ì´ ì‹œìž‘ë©ë‹ˆë‹¤.',
      paymentBeforeWarning: 'âš ï¸ ì´ ì„œë¹„ìŠ¤ëŠ” ê²°ì œ ì™„ë£Œ í›„ ì¦‰ì‹œ ì œê³µë˜ë©°, êµ¬ë§¤ í™•ì¸ í›„ì—ëŠ” í™˜ë¶ˆì´ ë¶ˆê°€ëŠ¥í•©ë‹ˆë‹¤.',
      openProfileList: 'í”„ë¡œí•„ ëª©ë¡ ì—´ê¸°',
      profileCardManage: 'í”„ë¡œí•„ ì¹´ë“œ ê´€ë¦¬',
      loginRequiredConfirm: 'ðŸ”’ í”„ë¡œí•„ ì¹´ë“œëŠ” ë¡œê·¸ì¸ í›„ì—ë§Œ ìƒì„±í•  ìˆ˜ ìžˆìŠµë‹ˆë‹¤.\në¡œê·¸ì¸ íŽ˜ì´ì§€ë¡œ ì´ë™í• ê¹Œìš”?',
      close: 'ë‹«ê¸°',
    },
    en: {
      apiCooldown: 'The server response is unstable, so we are waiting briefly. Please try again soon.',
      apiConnectionFailed: 'API connection failed. Please try again soon.',
      networkError: 'A network error occurred. Please try again soon.',
      passAppliedOverlay: 'Your pass has been applied.\nThis content is free with your current pass.\nIt will open without any extra payment.',
      monthlyAppliedOverlay: 'Your Moonlight Stones have been used.\nThis content is unlocked with your Moonlight Stones.\nOpening it now.',
      paymentCompleteOverlay: 'Payment complete.\nOpening your content now.\nPlease wait a moment.',
      subscriptionIncluded: 'Using your pass with no additional payment.',
      serviceTermDisclaimer: 'The service is provided immediately upon payment completion. Your purchased service begins the moment payment is confirmed.',
      paymentBeforeWarning: 'âš ï¸ This service is provided immediately upon payment completion, and refunds are not possible after purchase confirmation.',
      openProfileList: 'Open profile list',
      profileCardManage: 'Manage profile cards',
      loginRequiredConfirm: 'ðŸ”’ Profile cards can only be created after login.\nMove to the login page?',
      close: 'Close',
    },
    ja: {
      apiCooldown: 'ã‚µãƒ¼ãƒãƒ¼å¿œç­”ãŒä¸å®‰å®šãªãŸã‚ã€ã—ã°ã‚‰ãå¾…æ©Ÿã—ã¦ã„ã¾ã™ã€‚å°‘ã—å¾Œã§ã‚‚ã†ä¸€åº¦ãŠè©¦ã—ãã ã•ã„ã€‚',
      apiConnectionFailed: 'APIæŽ¥ç¶šã«å¤±æ•—ã—ã¾ã—ãŸã€‚å°‘ã—å¾Œã§ã‚‚ã†ä¸€åº¦ãŠè©¦ã—ãã ã•ã„ã€‚',
      networkError: 'ãƒãƒƒãƒˆãƒ¯ãƒ¼ã‚¯ã‚¨ãƒ©ãƒ¼ãŒç™ºç”Ÿã—ã¾ã—ãŸã€‚å°‘ã—å¾Œã§ã‚‚ã†ä¸€åº¦ãŠè©¦ã—ãã ã•ã„ã€‚',
      passAppliedOverlay: 'åˆ©ç”¨åˆ¸ãŒé©ç”¨ã•ã‚Œã¾ã—ãŸã€‚\nã“ã®ã‚³ãƒ³ãƒ†ãƒ³ãƒ„ã¯ãŠæŒã¡ã®åˆ©ç”¨åˆ¸ã§ç„¡æ–™ã§åˆ©ç”¨ã§ãã¾ã™ã€‚\nè¿½åŠ æ±ºæ¸ˆãªã—ã§ã™ãã«é–‹ãã¾ã™ã€‚',
      monthlyAppliedOverlay: 'æœˆç²¾çŸ³ã®ä½¿ç”¨ãŒå®Œäº†ã—ã¾ã—ãŸã€‚\nã“ã®ã‚³ãƒ³ãƒ†ãƒ³ãƒ„ã¯ãŠæŒã¡ã®æœˆç²¾çŸ³ã§åˆ©ç”¨ã—ã¾ã™ã€‚\nã™ãã«é–‹ãã¾ã™ã€‚',
      paymentCompleteOverlay: 'æ±ºæ¸ˆãŒå®Œäº†ã—ã¾ã—ãŸã€‚\nã‚³ãƒ³ãƒ†ãƒ³ãƒ„ã‚’é–‹ã„ã¦ã„ã¾ã™ã€‚\nå°‘ã€…ãŠå¾…ã¡ãã ã•ã„ã€‚',
      subscriptionIncluded: 'åˆ©ç”¨åˆ¸ã§è¿½åŠ æ±ºæ¸ˆãªã—ã«åˆ©ç”¨ã—ã¾ã™ã€‚',
      serviceTermDisclaimer: 'æ±ºæ¸ˆå®Œäº†å¾Œã€ã‚µãƒ¼ãƒ“ã‚¹ãŒå³åº§ã«æä¾›ã•ã‚Œã¾ã™ã€‚è³¼å…¥ã—ãŸã‚µãƒ¼ãƒ“ã‚¹ã¯ã€æ±ºæ¸ˆãŒç¢ºèªã•ã‚ŒãŸæ™‚ç‚¹ã‹ã‚‰åˆ©ç”¨ãŒé–‹å§‹ã•ã‚Œã¾ã™ã€‚',
      paymentBeforeWarning: 'âš ï¸ ã“ã®ã‚µãƒ¼ãƒ“ã‚¹ã¯æ±ºæ¸ˆå®Œäº†å¾Œã«å³åº§ã«æä¾›ã•ã‚Œã‚‹ãŸã‚ã€è³¼å…¥ç¢ºèªå¾Œã®è¿”é‡‘ã¯ã§ãã¾ã›ã‚“ã€‚',
      openProfileList: 'ãƒ—ãƒ­ãƒ•ã‚£ãƒ¼ãƒ«ä¸€è¦§ã‚’é–‹ã',
      profileCardManage: 'ãƒ—ãƒ­ãƒ•ã‚£ãƒ¼ãƒ«ã‚«ãƒ¼ãƒ‰ç®¡ç†',
      loginRequiredConfirm: 'ðŸ”’ ãƒ—ãƒ­ãƒ•ã‚£ãƒ¼ãƒ«ã‚«ãƒ¼ãƒ‰ã¯ãƒ­ã‚°ã‚¤ãƒ³å¾Œã«ã®ã¿ä½œæˆã§ãã¾ã™ã€‚\nãƒ­ã‚°ã‚¤ãƒ³ãƒšãƒ¼ã‚¸ã¸ç§»å‹•ã—ã¾ã™ã‹ï¼Ÿ',
      close: 'é–‰ã˜ã‚‹',
    },
    'zh-CN': {
      apiCooldown: 'æœåŠ¡å™¨å“åº”ä¸ç¨³å®šï¼Œæ­£åœ¨çŸ­æš‚ç­‰å¾…ã€‚è¯·ç¨åŽå†è¯•ã€‚',
      apiConnectionFailed: 'API è¿žæŽ¥å¤±è´¥ã€‚è¯·ç¨åŽå†è¯•ã€‚',
      networkError: 'å‘ç”Ÿç½‘ç»œé”™è¯¯ã€‚è¯·ç¨åŽå†è¯•ã€‚',
      passAppliedOverlay: 'å·²åº”ç”¨ä½¿ç”¨åˆ¸ã€‚\næœ¬å†…å®¹å¯ä½¿ç”¨å½“å‰æŒæœ‰çš„ä½¿ç”¨åˆ¸å…è´¹æŸ¥çœ‹ã€‚\næ— éœ€é¢å¤–ä»˜æ¬¾ï¼Œå°†ç«‹å³å¼€å¯ã€‚',
      monthlyAppliedOverlay: 'æœˆç²¾çŸ³ä½¿ç”¨å®Œæˆã€‚\næœ¬å†…å®¹å°†ä½¿ç”¨æ‚¨æŒæœ‰çš„æœˆç²¾çŸ³ã€‚\nå³å°†ä¸ºæ‚¨å¼€å¯ã€‚',
      paymentCompleteOverlay: 'æ”¯ä»˜å®Œæˆã€‚\næ­£åœ¨ä¸ºæ‚¨å¼€å¯å†…å®¹ã€‚\nè¯·ç¨å€™ã€‚',
      subscriptionIncluded: 'ä½¿ç”¨åˆ¸å·²ç”Ÿæ•ˆï¼Œæ— éœ€é¢å¤–ä»˜æ¬¾ã€‚',
      serviceTermDisclaimer: 'ä»˜æ¬¾å®ŒæˆåŽï¼ŒæœåŠ¡å°†ç«‹å³æä¾›ã€‚è´­ä¹°çš„æœåŠ¡åœ¨ä»˜æ¬¾ç¡®è®¤çš„é‚£ä¸€åˆ»å¼€å§‹ä½¿ç”¨ã€‚',
      paymentBeforeWarning: 'âš ï¸ æœ¬æœåŠ¡åœ¨å®Œæˆä»˜æ¬¾åŽç«‹å³æä¾›ï¼Œè´­ä¹°ç¡®è®¤åŽæ— æ³•é€€æ¬¾ã€‚',
      openProfileList: 'æ‰“å¼€ä¸ªäººèµ„æ–™åˆ—è¡¨',
      profileCardManage: 'ç®¡ç†ä¸ªäººèµ„æ–™å¡',
      loginRequiredConfirm: 'ðŸ”’ ä¸ªäººèµ„æ–™å¡åªèƒ½åœ¨ç™»å½•åŽåˆ›å»ºã€‚\nè¦å‰å¾€ç™»å½•é¡µé¢å—ï¼Ÿ',
      close: 'å…³é—­',
    },
    'zh-TW': {
      apiCooldown: 'ä¼ºæœå™¨å›žæ‡‰ä¸ç©©å®šï¼Œæ­£åœ¨çŸ­æš«ç­‰å¾…ã€‚è«‹ç¨å¾Œå†è©¦ã€‚',
      apiConnectionFailed: 'API é€£ç·šå¤±æ•—ã€‚è«‹ç¨å¾Œå†è©¦ã€‚',
      networkError: 'ç™¼ç”Ÿç¶²è·¯éŒ¯èª¤ã€‚è«‹ç¨å¾Œå†è©¦ã€‚',
      passAppliedOverlay: 'å·²å¥—ç”¨ä½¿ç”¨åˆ¸ã€‚\næœ¬å…§å®¹å¯ä½¿ç”¨ç›®å‰æŒæœ‰çš„ä½¿ç”¨åˆ¸å…è²»æŸ¥çœ‹ã€‚\nç„¡éœ€é¡å¤–ä»˜æ¬¾ï¼Œå°‡ç«‹å³é–‹å•Ÿã€‚',
      monthlyAppliedOverlay: 'æœˆç²¾çŸ³ä½¿ç”¨å®Œæˆã€‚\næœ¬å…§å®¹å°‡ä½¿ç”¨æ‚¨æŒæœ‰çš„æœˆç²¾çŸ³ã€‚\nå³å°‡ç‚ºæ‚¨é–‹å•Ÿã€‚',
      paymentCompleteOverlay: 'ä»˜æ¬¾å®Œæˆã€‚\næ­£åœ¨ç‚ºæ‚¨é–‹å•Ÿå…§å®¹ã€‚\nè«‹ç¨å€™ã€‚',
      subscriptionIncluded: 'ä½¿ç”¨åˆ¸å·²ç”Ÿæ•ˆï¼Œç„¡éœ€é¡å¤–ä»˜æ¬¾ã€‚',
      serviceTermDisclaimer: 'ä»˜æ¬¾å®Œæˆå¾Œï¼Œæœå‹™å°‡ç«‹å³æä¾›ã€‚è³¼è²·çš„æœå‹™åœ¨ä»˜æ¬¾ç¢ºèªçš„é‚£ä¸€åˆ»é–‹å§‹ä½¿ç”¨ã€‚',
      paymentBeforeWarning: 'âš ï¸ æœ¬æœå‹™åœ¨å®Œæˆä»˜æ¬¾å¾Œç«‹å³æä¾›ï¼Œè³¼è²·ç¢ºèªå¾Œç„¡æ³•é€€æ¬¾ã€‚',
      openProfileList: 'é–‹å•Ÿå€‹äººè³‡æ–™åˆ—è¡¨',
      profileCardManage: 'ç®¡ç†å€‹äººè³‡æ–™å¡',
      loginRequiredConfirm: 'ðŸ”’ å€‹äººè³‡æ–™å¡åªèƒ½åœ¨ç™»å…¥å¾Œå»ºç«‹ã€‚\nè¦å‰å¾€ç™»å…¥é é¢å—Žï¼Ÿ',
      close: 'é—œé–‰',
    },
  };

  function _dpTextLang() {
    var lang = 'ko';
    try {
      if (typeof window !== 'undefined' && typeof window.cdGetCurrentLanguage === 'function') lang = window.cdGetCurrentLanguage();
      else if (typeof window !== 'undefined' && window.localStorage) lang = window.localStorage.getItem('cd_lang') || lang;
    } catch (_) {}
    lang = String(lang || 'ko').toLowerCase();
    if (lang === 'zh' || lang === 'zh-cn' || lang === 'zh-hans') return 'zh-CN';
    if (lang === 'zh-tw' || lang === 'zh-hant' || lang === 'zh-hk') return 'zh-TW';
    if (lang.indexOf('ja') === 0) return 'ja';
    if (lang.indexOf('en') === 0) return 'en';
    return 'ko';
  }

  function _dpText(key) {
    var table = DP_TEXT_TRANSLATIONS[_dpTextLang()] || DP_TEXT_TRANSLATIONS.en;
    return table[key] || DP_TEXT_TRANSLATIONS.en[key] || 'Translation pending';
  }

  function _dpReadAuthUser() {
    try {
      var raw = localStorage.getItem('fortune_auth_user') || '';
      var parsed = raw ? JSON.parse(raw) : null;
      var safe = _dpSanitizeAuthUser(parsed);
      if (!safe) return null;
      var normalized = JSON.stringify(safe);
      if (raw !== normalized) localStorage.setItem('fortune_auth_user', normalized);
      return safe;
    } catch (e) {
      return null;
    }
  }

  function _dpIsAuthRequiredResult(result) {
    var data = result && result.data && typeof result.data === 'object' ? result.data : {};
    var error = data.error && typeof data.error === 'object' ? data.error : {};
    var code = String(data.code || error.code || result && result.code || '').trim().toUpperCase();
    return Number(result && result.status || 0) === 401
      || code === 'AUTH_REQUIRED'
      || code === 'LOGIN_REQUIRED'
      || code === 'NOT_LOGGED_IN'
      || code === 'TOKEN_EXPIRED';
  }

  function _dpResolveIdScope(user) {
    var scopeRaw = user && (user.id || user.userId || user._id || user.uid);
    return String(scopeRaw || '').trim().toLowerCase();
  }

  function _dpIsActiveMembershipStatusValue(value) {
    var status = String(value || '').trim().toLowerCase();
    return status === 'active'
      || status === 'paid'
      || status === 'current'
      || status === 'subscribed'
      || status === 'trialing'
      || status === 'success'
      || status === 'registered'
      || status === 'registering'
      || status === 'enrolled'
      || status === 'enabled'
      || status === 'valid'
      || status === 'ok'
      || status === 'complete'
      || status === 'completed'
      || status === 'confirmed'
      || status === 'approved'
      || status === '\uB4F1\uB85D\uC911'
      || status === '\uC774\uC6A9\uC911'
      || status === '\uC720\uD6A8'
      || status === '\uC644\uB8CC';
  }

  function _dpHasFutureMembershipExpiry(value) {
    if (!value) return false;
    var expiresAt = new Date(value);
    return isFinite(expiresAt.getTime()) && expiresAt.getTime() > Date.now();
  }

  function _dpSanitizeAuthUser(user) {
    if (!user || typeof user !== 'object') return null;
    var safe = {};
    if (user.id) safe.id = String(user.id);
    if (user.userId) safe.userId = String(user.userId);
    if (user._id) safe._id = String(user._id);
    if (user.uid) safe.uid = String(user.uid);
    if (user.name) safe.name = String(user.name);
    if (user.email) safe.email = String(user.email);
    if (user.userEmail) safe.userEmail = String(user.userEmail);
    if (user.phoneNumber) safe.phoneNumber = String(user.phoneNumber);
    if (user.phone) safe.phone = String(user.phone);
    if (user.role) safe.role = String(user.role);
    if (user.plan) safe.plan = String(user.plan);
    if (typeof user.hasLocalAuth === 'boolean') safe.hasLocalAuth = user.hasLocalAuth;
    var points = Number(user.points);
    if (Number.isFinite(points) && points >= 0) safe.points = points;
    if (user.profileSubscription && typeof user.profileSubscription === 'object') {
      var tierValue = String(user.profileSubscription.tier || user.profileSubscription.passTier || user.profileSubscription.plan || user.profileSubscription.planId || user.profileSubscription.productId || user.plan || 'free');
      var activeValue = Boolean(
        user.profileSubscription.isActive
        || user.profileSubscription.isSubscribed
        || user.profileSubscription.active
        || user.profileSubscription.enabled
        || user.profileSubscription.valid
        || user.profileSubscription.registered
        || _dpIsActiveMembershipStatusValue(user.profileSubscription.status)
        || _dpIsActiveMembershipStatusValue(user.profileSubscription.subscriptionStatus)
        || _dpIsActiveMembershipStatusValue(user.profileSubscription.membershipStatus)
        || _dpIsActiveMembershipStat×®{ÛËh‘éì¶»§q«^t\‹]\ÙKIÈ
È]K››ÝÊ
H
È	ËIÈ
ÈX]œ˜[™ÛJ
KÔÝš[™ÊÍŠKœÛXÙJ‹L
NÂˆBˆ˜\ˆÚÙ[ˆH	ÉÎÂˆžHÈÚÙ[ˆHØØ[ÝÜ˜YÙK™Ù]][J	Ù›Ü[™WØ]]ÝÚÙ[‰ÊH	ÉÎÈHØ]Ú
ÊHßB‚ˆYˆ
ØÙ\ÐYZ[“ZÙU\Ù\Š
JHÂˆYˆ
\[ÙˆØˆOOH	Ù[˜Ý[Û‰ÊHØŠ
NÂˆ™]\›ŽÂˆB‚ˆ˜\ˆ›ÝÈH]K››ÝÊ
NÂˆ˜\ˆØÚÐ]H[X™\ŠÚ[™ÝË—×ØÙÛÚ[‘Ø]T\•\ÙSØÚÐ]
NÂˆ˜\ˆØÚÐYÙS\ÈHØÚÐ]ˆÈ
›ÝÈHØÚÐ]
HˆÂˆ˜\ˆ\ÔÝ[SØÚÈH[ØÚÐ]ØÚÐYÙS\ÈˆLÂˆYˆ
Ú[™ÝË—ØÙÛÚ[‘Ø]T\•\ÙR[‘›YÚ
HÂˆYˆ
\ÔÝ[SØÚÊHÂˆÚ[™ÝË—ØÙÛÚ[‘Ø]T\•\ÙR[‘›YÚH˜[ÙNÂˆÚ[™ÝË—×ØÙÛÚ[‘Ø]T\•\ÙSØÚÐ]HÂˆÙÙ]^[Y[[™[™Ê˜[ÙJNÂˆÚ[™ÝË˜[\
	û'm;(!:¬¬;('; à{`ç:éo:ìíz­k;e¢;"­zââ:âéˆ:âé;"ç;"ç:ãá;em;(ï;!.;&¥‰ÊNÂˆH[ÙHÂˆÚ[™ÝË˜[\
	û'm;(!:¬¬;(';,¦:é«;)${'¡zââ:âéˆ;'¨;"ç;fá:âé;"ç;"ç:ãá;em;(ï;!.;&¥‰ÊNÂˆBˆYˆ
\[ÙˆÛØ[˜Ù[OOH	Ù[˜Ý[Û‰ÊHÛØ[˜Ù[

NÂˆ™]\›ŽÂˆB‚ˆ˜\ˆY\RÙ^HH›Ü›X[^™Y™X]\™RÙ^H
È	ß	È
ÈÝš[™Ê™X\ÛÛˆ	ÉÊH
È	ß	È
ÈÝš[™ÊÛÜÝ
NÂˆ˜\ˆY\SX\HÚ[™ÝË—×ØÙÛÚ[‘Ø]T›Û\Y\
Ú[™ÝË—×ØÙÛÚ[‘Ø]T›Û\Y\HßJNÂˆYˆ
Y\SX\ÙY\RÙ^WH	‰ˆ
›ÝÈHY\SX\ÙY\RÙ^WHL
JHÂˆYˆ
\[ÙˆÛØ[˜Ù[OOH	Ù[˜Ý[Û‰ÊHÛØ[˜Ù[

NÂˆ™]\›ŽÂˆBˆY\SX\ÙY\RÙ^WHH›ÝÎÂ‚ˆ˜\ˆØ]QÜ˜[Y[]™\™YH˜[ÙNÂˆ[˜Ý[Ûˆ[]™\‘Ø]QÜ˜[
˜[œØXÝ[Û’Y^[ØY
HÂˆØ]QÜ˜[Y[]™\™YHYNÂˆÙ[Z]^[Y[ÝXØÙ\ÜÊ˜[œØXÝ[Û’Y^[ØYÜ[Û˜YË›Ü›X[^™Y™X]\™RÙ^K™\]Y\ÝY
NÂˆYˆ
\[ÙˆØˆOOH	Ù[˜Ý[Û‰ÊHØŠÝš[™Ê˜[œØXÝ[Û’Y™\]Y\ÝY
K^[ØYßJNÂˆB‚ˆYˆ
\[ÙˆÚ[™ÝË—ØÙÜ[”ZYÙ\šXÙQØ]HOOH	Ù[˜Ý[Û‰ÊHÂˆ™]\›ˆÚ[™ÝË—ØÙÜ[”ZYÙ\šXÙQØ]JÂˆ]Nˆ™X\ÛÛ‹ˆ™X\ÛÛŽˆ™X\ÛÛ‹ˆÛÚ[”šXÙNˆÛÜÝˆÛÜÝˆÛÜÝˆ™X]\™RÙ^Nˆ›Ü›X[^™Y™X]\™RÙ^Kˆ™\]Y\ÝYˆ™\]Y\ÝYˆØ]YÛÜžRÙ^NˆÜ[Û˜YË˜Ø]YÛÜžRÙ^KˆÝX‘™X]\™RÙ^NˆÜ[Û˜YËœÝX‘™X]\™RÙ^KˆÛÛ[Ù^NˆÜ[Û˜YË˜ÛÛ[Ù^Kˆ›ÙXÝYˆÜ[Û˜YËœ›ÙXÝYˆ™\Ü\NˆÜ[Û˜YËœ™\Ü\KˆÙ\šXÙRÙ^NˆÜ[Û˜YËœÙ\šXÙRÙ^Kˆ™\ÜYˆÜ[Û˜YËœ™\ÜYˆÙ\ÜÚ[Û’YˆÜ[Û˜YËœÙ\ÜÚ[Û’Yˆ™\ÜÙ\ÜÚ[Û’YˆÜ[Û˜YËœ™\ÜÙ\ÜÚ[Û’YÜ[Û˜YËœÙ\ÜÚ[Û’Yˆ\˜Ú\ÙRYˆÜ[Û˜YËœ\˜Ú\ÙRYˆXÝ[Û•\NˆÜ[Û˜YË˜XÝ[Û•\Kˆ›Ùš[PXÝ[ÛŽˆÜ[Û˜YËœ›Ùš[PXÝ[Û‹ˆXÝ[ÛŽˆÜ[Û˜YË˜XÝ[Û‹ˆ›Ùš[RYˆÜ[Û˜YËœ›Ùš[RYˆÙ[XÝY›Ùš[RYˆÜ[Û˜YËœÙ[XÝY›Ùš[RYˆ[[Ý[ÜÎˆÜ[Û˜YË˜[[Ý[ÜËˆY[X™\œÚ\Ü™Y]ÛÜÝˆÜ[Û˜YË›Y[X™\œÚ\Ü™Y]ÛÜÝˆ[ÝÙY^[Y[[Ù\ÎˆÜ[Û˜YË˜[ÝÙY^[Y[[Ù\Ëˆ\ØX›T\ÜÑš\œÝˆÜ[Û˜YË™\ØX›T\ÜÑš\œÝˆ\ØX›T\ÜÐÚÚXÙNˆÜ[Û˜YË™\ØX›T\ÜÐÚÚXÙKˆÛ‘Ü˜[Yˆ[˜Ý[ÛŠ˜[œØXÝ[Û’Y^[ØY
HÂˆ[]™\‘Ø]QÜ˜[
˜[œØXÝ[Û’Y^[ØY
NÂˆKˆÛØ[˜Ù[ˆÛØ[˜Ù[ˆJK[Š[˜Ý[ÛŠ™\Ý[
HÂˆYˆ
™\Ý[	‰ˆ™\Ý[œÝ]\ÈOOH	ÙÜ˜[Y	È	‰ˆYØ]QÜ˜[Y[]™\™Y
HÂˆ[]™\‘Ø]QÜ˜[
™\Ý[˜[œØXÝ[Û’Y™\Ý[œ^[ØY™\Ý[
NÂˆH[ÙHYˆ
™\Ý[	‰ˆ™\Ý[œÝ]\ÈOOH	ØØ[˜Ù[Y	È	‰ˆ™\Ý[œ™X\ÛÛˆOOH	Ü\Ü×Ø\YYÚ[—Û[Ù[	È	‰ˆYØ]QÜ˜[Y[]™\™Y
HÂˆ[]™\‘Ø]QÜ˜[
™\]Y\ÝYÈ×ØÙ\ÜÑØ]T™\ÛÛ™YˆYK™\]Y\ÝYˆ™\]Y\ÝY™X]\™RÙ^Nˆ›Ü›X[^™Y™X]\™RÙ^HJNÂˆBˆ™]\›ˆ™\Ý[ÂˆJK˜Ø]Ú
[˜Ý[ÛŠ\œ›ÜŠHÂˆÛÛœÛÛK™\œ›ÜŠ	ÖÛXZ[‹\ZY\Ù\šXÙKYØ]WIË\œ›ÜŠNÂˆ˜\ˆØ]SY\ÜØYÙHHÝš[™Ê\œ›Üˆ	‰ˆ\œ›Ü‹›Y\ÜØYÙH	×PPÐŒPÎP×PŽMÐÈPÍPŽÐ×QMNPÎPÌPP—QNPÌWPŒÎPŒ‘M‰ÊNÂˆ˜\ˆØ]PÛÙHHÝš[™Ê\œ›Üˆ	‰ˆ\œ›Ü‹˜ÛÙH	ÉÊKÕ\\Ø\ÙJ
NÂˆYˆ
[X™\Š\œ›Üˆ	‰ˆ\œ›Ü‹œÝ]\È
HHLØ]PÛÙKš[™^ÙŠ	ÔÑT•’PÑWÕSURSP“IÊHHØ]SY\ÜØYÙKÓÝÙ\Ø\ÙJ
Kš[™^ÙŠ	Ù]X˜\ÙH\È[\Ü˜\š[H[˜]˜Z[X›IÊHH
HÂˆØ]SY\ÜØYÙHH	ú¬¬;(';!':ì¡;%ì:¬¬;'m;'o;"ç;( {'/:èg;&ä;fg;ef;)à;%b»"­zââ:âéˆ;'¨;"ç;fá:âé;"ç;"ç:ãá;em;(ï;!.;&¥‰ÎÂˆBˆÚ[™ÝË˜[\
Ø]SY\ÜØYÙJNÂˆYˆ
\[ÙˆÛØ[˜Ù[OOH	Ù[˜Ý[Û‰ÊHÛØ[˜Ù[
\œ›ÜŠNÂˆ™]\›ˆ[ÂˆJNÂˆB‚ˆYˆ
\[ÙˆÚ[™ÝË—ØÙ™\ÛÛ™TZYÛÛ[XØÙ\ÜÈOOH	Ù[˜Ý[Û‰È	‰ˆÜ[Û˜YË™\ØX›T\ÜÑš\œÝOOHYH	‰ˆÜ[Û˜YË™\ØX›T\ÜÐÚÚXÙHOOHYJHÂˆ™]\›ˆÚ[™ÝË—ØÙ™\ÛÛ™TZYÛÛ[XØÙ\ÜÊÈ]Nˆ™X\ÛÛ‹™X\ÛÛŽˆ™X\ÛÛ‹ÛÚ[”šXÙNˆÛÜÝÛÜÝˆÛÜÝ™X]\™RÙ^Nˆ›Ü›X[^™Y™X]\™RÙ^K™\]Y\ÝYˆ™\]Y\ÝYØ]YÛÜžRÙ^NˆÜ[Û˜YË˜Ø]YÛÜžRÙ^KÝX‘™X]\™RÙ^NˆÜ[Û˜YËœÝX‘™X]\™RÙ^KÛÛ[Ù^NˆÜ[Û˜YË˜ÛÛ[Ù^K›ÙXÝYˆÜ[Û˜YËœ›ÙXÝY™\Ü\NˆÜ[Û˜YËœ™\Ü\KÙ\šXÙRÙ^NˆÜ[Û˜YËœÙ\šXÙRÙ^K™\ÜYˆÜ[Û˜YËœ™\ÜYÙ\ÜÚ[Û’YˆÜ[Û˜YËœÙ\ÜÚ[Û’Y™\ÜÙ\ÜÚ[Û’YˆÜ[Û˜YËœ™\ÜÙ\ÜÚ[Û’YÜ[Û˜YËœÙ\ÜÚ[Û’Y\˜Ú\ÙRYˆÜ[Û˜YËœ\˜Ú\ÙRYXÝ[Û•\NˆÜ[Û˜YË˜XÝ[Û•\K›Ùš[PXÝ[ÛŽˆÜ[Û˜YËœ›Ùš[PXÝ[Û‹XÝ[ÛŽˆÜ[Û˜YË˜XÝ[Û‹›Ùš[RYˆÜ[Û˜YËœ›Ùš[RYÙ[XÝY›Ùš[RYˆÜ[Û˜YËœÙ[XÝY›Ùš[RY[ÝÔÛ˜\ÚÝ˜\Ý]ˆYHJK[Š[˜Ý[ÛŠXØÙ\ÜÊHÂˆYˆ
XØÙ\ÜÈ	‰ˆ
XØÙ\ÜËœÝ]\ÈOOH	Ø[™XYWÝ[›ØÚÙY	ÈXØÙ\ÜËœÝ]\ÈOOH	Ü\Ü×Ø\YY	ÊJHÂˆ˜\ˆ\ÜÔ^[ØYHXØÙ\ÜËœ^[ØYXØÙ\ÜËœ˜]Ô^[ØYßNÂˆ˜\ˆ\ÜÕ˜[œØXÝ[Û’YHÝš[™Ê\ÜÔ^[ØY˜[œØXÝ[Û’Y\ÜÔ^[ØYœ^[Y[Y\ÜÔ^[ØYœ\˜Ú\ÙRY\ÜÔ^[ØYœ™\]Y\ÝYXØÙ\ÜËœ™\]Y\ÝY™\]Y\ÝY
NÂˆYˆ
\[ÙˆØˆOOH	Ù[˜Ý[Û‰ÊHØŠ\ÜÕ˜[œØXÝ[Û’Y\ÜÔ^[ØY
NÂˆ™]\›ˆ\ÜÔ^[ØYÂˆBˆYˆ
XØÙ\ÜÈ	‰ˆXØÙ\ÜËœÝ]\ÈOOH	Ù\œ›Ü‰ÊHÈÚ[™ÝË˜[\
XØÙ\ÜË›Y\ÜØYÙH	×PÍÍÍPÍNWPQÈQMWPÍÍÎPÍQPÌ‘MQÌŽQNPÌWPŒÎPŒ‘M‰ÊNÈYˆ
\[ÙˆÛØ[˜Ù[OOH	Ù[˜Ý[Û‰ÊHÛØ[˜Ù[
XØÙ\ÜÊNÈ™]\›ˆ[ÈBˆYˆ
\[ÙˆÚ[™ÝË—ØÙÚÛÜÙTÙ\šXÙT^[Y[[ÙHOOH	Ù[˜Ý[Û‰ÊHÈ™]\›ˆÚ[™ÝË—ØÙÚÛÜÙTÙ\šXÙT^[Y[[ÙJÈ]Nˆ™X\ÛÛ‹™X\ÛÛŽˆ™X\ÛÛ‹ÛÚ[”šXÙNˆÛÜÝÛÜÝˆÛÜÝ™X]\™RÙ^Nˆ›Ü›X[^™Y™X]\™RÙ^H[™Yš[™Y[[Ý[ÜÎˆÜ[Û˜YË˜[[Ý[ÜËY[X™\œÚ\Ü™Y]ÛÜÝˆÜ[Û˜YË›Y[X™\œÚ\Ü™Y]ÛÜÝ[ÝÙY^[Y[[Ù\ÎˆÜ[Û˜YË˜[ÝÙY^[Y[[Ù\Ë\ØX›T\ÜÑš\œÝˆÜ[Û˜YË™\ØX›T\ÜÑš\œÝ\ØX›T\ÜÐÚÚXÙNˆÜ[Û˜YË™\ØX›T\ÜÐÚÚXÙHJK[Š[˜Ý[ÛŠÚÚXÙJHÈYˆ
ÚÚXÙHOOH	Ù\™XÝ	ÊH™]\›ˆ[‘\™XÝÚXÚÛÝ]

NÈYˆ
ÚÚXÙHOOH	Û[ÛIÊH™]\›ˆ[“[ÛPÜ™Y]Ø]J
NÈYˆ

ÚÚXÙHOOH	Ü\ÜÉÈÚÚXÙHOOH	Ü\Ü×Ø\YY	ÊH	‰ˆÜ[Û˜YË™\ØX›T\ÜÐÚÚXÙHOOHYJHÈYˆ
\[ÙˆØˆOOH	Ù[˜Ý[Û‰ÊHØŠ
NÈ™]\›ˆ[ÈHYˆ
\[ÙˆÛØ[˜Ù[OOH	Ù[˜Ý[Û‰ÊHÛØ[˜Ù[

NÈ™]\›ˆ[ÈJNÈBˆ™]\›ˆ[“[ÛPÜ™Y]Ø]J
NÂˆJK˜Ø]Ú
[˜Ý[ÛŠ\œ›ÜŠHÈÚ[™ÝË˜[\
Ýš[™Ê\œ›Üˆ	‰ˆ\œ›Ü‹›Y\ÜØYÙH	×PÍÍÍPÍNWPQÈQMWPÍÍÎPÎLLHPÍŒPŽMNPPÌPÌP×PÌQNPÌWPŒÎPŒ‘M‰ÊJNÈYˆ
\[ÙˆÛØ[˜Ù[OOH	Ù[˜Ý[Û‰ÊHÛØ[˜Ù[
\œ›ÜŠNÈ™]\›ˆ[ÈJNÂˆB‚ˆ[˜Ý[Ûˆ[“[ÛPÜ™Y]Ø]J
HÂˆ˜\ˆÛÛœÝ[YRXY\œÈHÈ	ÐÛÛ[U\IÎˆ	Ø\XØ][Û‹ÚœÛÛ‰ÈNÂˆYˆ
ÚÙ[ŠHÛÛœÝ[YRXY\œË]]Üš^˜][ÛˆH	Ð™X\™\ˆ	È
ÈÚÙ[ŽÂˆÚ[™ÝË—ØÙÛÚ[‘Ø]T\•\ÙR[‘›YÚHYNÂˆÚ[™ÝË—×ØÙÛÚ[‘Ø]T\•\ÙSØÚÐ]H]K››ÝÊ
NÂˆ˜\ˆ[™[™ÓX™[HÝš[™Ê™X\ÛÛˆ	ÉÊKš[J
H	û'(:èã;!':îa;"©	ÎÂˆÙÙ]^[Y[[™[™ÊYK[™[™ÓX™[
È	È:¬¬;(':­£;eg;'a;fe{'n;ef:¬è;'¢;"­zââ:âé‰Ë	Û[ÛIÊNÂˆ™]\›ˆÙØZ]›Ü”^[Y[Ý™\›^TZ[

K[Š[˜Ý[ÛŠ
HÂˆ™]\›ˆÙ™]ÚœÛÛ•Ú]˜[˜XÚÊ	ËØ\KØš[[™ËØÛÚ[‹YØ]IËÂˆY]Ùˆ	ÔÔÕ	ËˆXY\œÎˆÛÛœÝ[YRXY\œËˆÜ™Y[X[Îˆ	Ú[˜ÛYIËˆØXÚNˆ	Û›Ë\ÝÜ™IËˆ›ÙNˆ”ÓÓ‹œÝš[™ÚYžJÂˆÛÜÝˆÛÜÝˆ™X\ÛÛŽˆ™X\ÛÛ‹ˆ™X]\™RÙ^Nˆ›Ü›X[^™Y™X]\™RÙ^H[™Yš[™Yˆ™\Ü\NˆÜ[Û˜YËœ™\Ü\KˆÙ\šXÙRÙ^NˆÜ[Û˜YËœÙ\šXÙRÙ^Kˆ™\ÜYˆÜ[Û˜YËœ™\ÜYˆÙ\ÜÚ[Û’YˆÜ[Û˜YËœÙ\ÜÚ[Û’Yˆ™\ÜÙ\ÜÚ[Û’YˆÜ[Û˜YËœ™\ÜÙ\ÜÚ[Û’YÜ[Û˜YËœÙ\ÜÚ[Û’Yˆ\˜Ú\ÙRYˆÜ[Û˜YËœ\˜Ú\ÙRYˆXÝ[Û•\NˆÜ[Û˜YË˜XÝ[Û•\Kˆ›Ùš[PXÝ[ÛŽˆÜ[Û˜YËœ›Ùš[PXÝ[Û‹ˆXÝ[ÛŽˆÜ[Û˜YË˜XÝ[Û‹ˆ›Ùš[RYˆÜ[Û˜YËœ›Ùš[RYˆÙ[XÝY›Ùš[RYˆÜ[Û˜YËœÙ[XÝY›Ùš[RYˆ^[Y[[ÙNˆ	ÓSÓÓ“QÒÔÕÓ‘IËˆ™\]Y\ÝYˆ™\]Y\ÝYˆJBˆKÂˆ™]žSÛNˆYKˆ[Y[Ý]\ÎˆÑÑ‘UÒÕSQSÕUÓTËˆJNÂˆJBˆ[Š[˜Ý[ÛŠ™\ÊHÂˆÚ[™ÝË—ØÙÛÚ[‘Ø]T\•\ÙR[‘›YÚH˜[ÙNÂˆÚ[™ÝË—×ØÙÛÚ[‘Ø]T\•\ÙSØÚÐ]HÂˆÙÙ]^[Y[[™[™Ê˜[ÙJNÂˆYˆ
Ù\Ð]]™\]Z\™Y™\Ý[
™\ÊJHÂˆYˆ
\[ÙˆÚ[™ÝË—×ØÙÜ[“ÙÚ[”™\]Z\™Y[Ù[OOH	Ù[˜Ý[Û‰ÊHÂˆÚ[™ÝË—×ØÙÜ[“ÙÚ[”™\]Z\™Y[Ù[
Âˆ™X\ÛÛŽˆ	úèg:­î;'n;'m;ea;&¥;eg:®,:â©{'¡zââ:âé‰Ëˆ™Y\™XÝÎˆÚ[™ÝË›ØØ][Û‹œ]˜[YH
ÈÚ[™ÝË›ØØ][Û‹œÙX\˜Ú
ÈÚ[™ÝË›ØØ][Û‹š\ÚˆJNÂˆBˆYˆ
\[ÙˆÛØ[˜Ù[OOH	Ù[˜Ý[Û‰ÊHÛØ[˜Ù[

NÂˆ™]\›ŽÂˆB‚ˆ˜\ˆ˜]Ñ]HH
™\È	‰ˆ™\Ë™]H	‰ˆ\[Ùˆ™\Ë™]HOOH	ÛØš™XÝ	ÊHÈ™\Ë™]HˆßNÂˆ˜\ˆ]HH
˜]Ñ]K™]H	‰ˆ\[Ùˆ˜]Ñ]K™]HOOH	ÛØš™XÝ	ÊHÈ˜]Ñ]K™]Hˆ˜]Ñ]NÂˆYˆ
™\ËœÝ]\ÈOOHˆ\™\Ë›ÚÈY]H]K›ÚÈOOH˜[ÙJHÂˆ˜\ˆ˜Z[Y\ÜØYÙHHÝš[™Ê
]H	‰ˆ]K›Y\ÜØYÙJH˜]Ñ]K›Y\ÜØYÙH	ú¬¬;(':­£;eg;'a;fe{'n;ef;)à:ê®ûe¢;"­zââ:âéˆ:âê:¬m:¬¬;(':éo;!(;`ç{em;(ï;!.;&¥‰ÊNÂˆÚ[™ÝË˜[\
˜Z[Y\ÜØYÙJNÂˆYˆ
\[ÙˆÛØ[˜Ù[OOH	Ù[˜Ý[Û‰ÊHÛØ[˜Ù[

NÂˆ™]\›ŽÂˆB‚ˆ˜\ˆÛÛœÝ[YQ]HH
]H	‰ˆ]K˜ÛÛœÝ[YH	‰ˆ\[Ùˆ]K˜ÛÛœÝ[YHOOH	ÛØš™XÝ	ÊHÈ]K˜ÛÛœÝ[YHˆßNÂˆ˜\ˆXØÙ\ÜÑÜ˜[H
]H	‰ˆ]K˜XØÙ\ÜÑÜ˜[	‰ˆ\[Ùˆ]K˜XØÙ\ÜÑÜ˜[OOH	ÛØš™XÝ	ÊHÈ]K˜XØÙ\ÜÑÜ˜[ˆßNÂˆ˜\ˆ˜[œØXÝ[Û’YHÝš[™Ê]K˜[œØXÝ[Û’YÛÛœÝ[YQ]K˜[œØXÝ[Û’YXØÙ\ÜÑÜ˜[™]šY[˜ÙRYXØÙ\ÜÑÜ˜[œ\˜Ú\ÙRYXØÙ\ÜÑÜ˜[œ™\]Y\ÝY	ÉÊNÂˆYˆ
\[ÙˆØˆOOH	Ù[˜Ý[Û‰ÊHØŠ˜[œØXÝ[Û’Y]JNÂˆ™]\›ˆ]NÂˆJBˆ˜Ø]Ú
[˜Ý[ÛŠ\œ›ÜŠHÂˆÚ[™ÝË—ØÙÛÚ[‘Ø]T\•\ÙR[‘›YÚH˜[ÙNÂˆÚ[™ÝË—×ØÙÛÚ[‘Ø]T\•\ÙSØÚÐ]HÂˆÙÙ]^[Y[[™[™Ê˜[ÙJNÂˆÛÛœÛÛK™\œ›ÜŠ	ÖØÛÚ[‹YØ]K\\‹]\ÙWIË\œ›ÜŠNÂˆÚ[™ÝË˜[\
	ú¬¬;(':éo;,¦:é«;ef:â¥;)$H:ë.;(':¬ :ì'; ç{e¢;"­zââ:âéˆ;'¨;"ç;fá:âé;"ç;"ç:ãá;em;(ï;!.;&¥‰ÊNÂˆYˆ
\[ÙˆÛØ[˜Ù[OOH	Ù[˜Ý[Û‰ÊHÛØ[˜Ù[

NÂˆJNÂˆB‚ˆ[˜Ý[Ûˆ[‘\™XÝÚXÚÛÝ]

HÂˆYˆ
\[ÙˆÚ[™ÝË—ØÙ[‘\™XÝÜÐÚXÚÛÝ]OOH	Ù[˜Ý[Û‰ÊHÂˆÚ[™ÝË˜[\
	úâê:¬m:¬¬;(':êª:äâ;'a;,/»'a;"&;%á»"­zââ:âéˆ;c¦;'m;)à:éo; â:èg:¬è;.j;eg:ä©:âé;"ç;"ç:ãá;em;(ï;!.;&¥‰ÊNÂˆYˆ
\[ÙˆÛØ[˜Ù[OOH	Ù[˜Ý[Û‰ÊHÛØ[˜Ù[

NÂˆ™]\›ˆ›ÛZ\ÙKœ™\ÛÛ™J
NÂˆBˆÚ[™ÝË—ØÙÛÚ[‘Ø]T\•\ÙR[‘›YÚHYNÂˆÚ[™ÝË—×ØÙÛÚ[‘Ø]T\•\ÙSØÚÐ]H]K››ÝÊ
NÂˆËÈ<'å-û,/{'m;%í:é«:®,;(!;%ä:â¥;%­:å©:ã :®,Rzãá;/';)à;%bºâ¥:âéˆ;&";(!;%ä:â¥;%ë:®,;!'	úâê:¬m:¬¬;(':éo;)á;e¢BˆËÈ;)${'¡zââ:âé	È;&):ì¡:è";'m:éo:ça;&è:¬è; «;&ª{'¤;%ä:¬£:â¥:¬¬;(';"&:âê;'a:¬è:én:ä©:æ$;eg:¬®H:èg:å*{'m:ào:â¥:¬ û'/:èg:ìí;& :âé‚ˆËÈØÙ[‘\™XÝÜÐÚXÚÛÝ];'m;)á;'¡H;"ç;($:í ;a,È;&);e":®c;)à;%­{(';,/{'a:¬n:¬è;"©;"©:èg;&):ì¡:è";'m:éo:à­:é¬:âé‚ˆ™]\›ˆÚ[™ÝË—ØÙ[‘\™XÝÜÐÚXÚÛÝ]
ÂˆÛÚ[”šXÙNˆÛÜÝˆÛÜÝˆÛÜÝˆ]Nˆ™X\ÛÛ‹ˆ™X\ÛÛŽˆ™X\ÛÛ‹ˆ™X]\™RÙ^Nˆ›Ü›X[^™Y™X]\™RÙ^Kˆ™\]Y\ÝYˆ™\]Y\ÝYˆ›Ü˜ÙQ\™XÝ^[Y[ˆYKˆ[\›˜[XZ[‘Ø]NˆYKˆ×ØÙ^[Y[Ø]P]]Üš^™YˆYKˆÚXÚÛÝ]^[ØYˆÂˆØ]YÛÜžRÙ^NˆÜ[Û˜YË˜Ø]YÛÜžRÙ^KˆÝX‘™X]\™RÙ^NˆÜ[Û˜YËœÝX‘™X]\™RÙ^KˆÛÛ[Ù^NˆÜ[Û˜YË˜ÛÛ[Ù^Kˆ›ÙXÝYˆÜ[Û˜YËœ›ÙXÝYˆ™\Ü\NˆÜ[Û˜YËœ™\Ü\KˆÙ\šXÙRÙ^NˆÜ[Û˜YËœÙ\šXÙRÙ^Kˆ™\ÜYˆÜ[Û˜YËœ™\ÜYˆÙ\ÜÚ[Û’YˆÜ[Û˜YËœÙ\ÜÚ[Û’Yˆ™\ÜÙ\ÜÚ[Û’YˆÜ[Û˜YËœ™\ÜÙ\ÜÚ[Û’YÜ[Û˜YËœÙ\ÜÚ[Û’Yˆ\˜Ú\ÙRYˆÜ[Û˜YËœ\˜Ú\ÙRYˆXÝ[Û•\NˆÜ[Û˜YË˜XÝ[Û•\Kˆ›Ùš[PXÝ[ÛŽˆÜ[Û˜YËœ›Ùš[PXÝ[Û‹ˆXÝ[ÛŽˆÜ[Û˜YË˜XÝ[Û‹ˆ›Ùš[RYˆÜ[Û˜YËœ›Ùš[RYˆÙ[XÝY›Ùš[RYˆÜ[Û˜YËœÙ[XÝY›Ùš[RYˆ^[Y[[ÙNˆ	ÑT‘PÕÒÔ•ÉÂˆBˆJK[Š[˜Ý[ÛŠ^[ØY
HÂˆÚ[™ÝË—ØÙÛÚ[‘Ø]T\•\ÙR[‘›YÚH˜[ÙNÂˆÚ[™ÝË—×ØÙÛÚ[‘Ø]T\•\ÙSØÚÐ]HÂˆÙÙ]^[Y[[™[™Ê˜[ÙJNÂˆ˜\ˆYHÝš[™Ê
^[ØY	‰ˆ
^[ØY˜[œØXÝ[Û’Y^[ØYœ^[Y[Y^[ØYœ\˜Ú\ÙRY^[ØYœ™\]Y\ÝY
JH™\]Y\ÝY
NÂˆYˆ
\[ÙˆØˆOOH	Ù[˜Ý[Û‰ÊHØŠY^[ØYßJNÂˆ™]\›ˆ^[ØYÂˆJK˜Ø]Ú
[˜Ý[ÛŠ\œ›ÜŠHÂˆÚ[™ÝË—ØÙÛÚ[‘Ø]T\•\ÙR[‘›YÚH˜[ÙNÂˆÚ[™ÝË—×ØÙÛÚ[‘Ø]T\•\ÙSØÚÐ]HÂˆÙÙ]^[Y[[™[™Ê˜[ÙJNÂˆÛÛœÛÛK™\œ›ÜŠ	ÖÙ\™XÝXÚXÚÛÝ]IË\œ›ÜŠNÂˆÚ[™ÝË˜[\
Ýš[™Ê\œ›Üˆ	‰ˆ\œ›Ü‹›Y\ÜØYÙH	úâê:¬m:¬¬;(':éo;&a:èã;ef;)à:ê®ûe¢;"­zââ:âéˆ:¬¬;(';"&:âê;'a;fe{'n;eg:ä©:âé;"ç;"ç:ãá;em;(ï;!.;&¥‰ÊJNÂˆYˆ
\[ÙˆÛØ[˜Ù[OOH	Ù[˜Ý[Û‰ÊHÛØ[˜Ù[
\œ›ÜŠNÂˆJNÂˆB‚ˆYˆ
\[ÙˆÚ[™ÝË—ØÙÚÛÜÙTÙ\šXÙT^[Y[[ÙHOOH	Ù[˜Ý[Û‰ÊHÂˆ™]\›ˆÚ[™ÝË—ØÙÚÛÜÙTÙ\šXÙT^[Y[[ÙJÂˆ]Nˆ™X\ÛÛ‹ˆÛÚ[”šXÙNˆÛÜÝˆÛÜÝˆÛÜÝˆ™X\ÛÛŽˆ™X\ÛÛ‹ˆ™X]\™RÙ^Nˆ›Ü›X[^™Y™X]\™RÙ^H[™Yš[™Yˆ™\Ü\NˆÜ[Û˜YËœ™\Ü\KˆÙ\šXÙRÙ^NˆÜ[Û˜YËœÙ\šXÙRÙ^KˆXÝ[Û•\NˆÜ[Û˜YË˜XÝ[Û•\Kˆ›Ùš[PXÝ[ÛŽˆÜ[Û˜YËœ›Ùš[PXÝ[Û‹ˆXÝ[ÛŽˆÜ[Û˜YË˜XÝ[Û‹ˆ›Ùš[RYˆÜ[Û˜YËœ›Ùš[RYˆÙ[XÝY›Ùš[RYˆÜ[Û˜YËœÙ[XÝY›Ùš[RYˆ[[Ý[ÜÎˆÜ[Û˜YË˜[[Ý[ÜËˆY[X™\œÚ\Ü™Y]ÛÜÝˆÜ[Û˜YË›Y[X™\œÚ\Ü™Y]ÛÜÝˆ[ÝÙY^[Y[[Ù\ÎˆÜ[Û˜YË˜[ÝÙY^[Y[[Ù\Ëˆ\ØX›T\ÜÑš\œÝˆÜ[Û˜YË™\ØX›T\ÜÑš\œÝˆ\ØX›T\ÜÐÚÚXÙNˆÜ[Û˜YË™\ØX›T\ÜÐÚÚXÙBˆJK[Š[˜Ý[ÛŠÚÚXÙJHÂˆYˆ
ÚÚXÙHOOH	Ù\™XÝ	ÊH™]\›ˆ[‘\™XÝÚXÚÛÝ]

NÂˆYˆ
ÚÚXÙHOOH	Û[ÛIÊH™]\›ˆ[“[ÛPÜ™Y]Ø]J
NÂˆYˆ

ÚÚXÙHOOH	Ü\ÜÉÈÚÚXÙHOOH	Ü\Ü×Ø\YY	ÊH	‰ˆÜ[Û˜YË™\ØX›T\ÜÐÚÚXÙHOOHYJHÈYˆ
\[ÙˆØˆOOH	Ù[˜Ý[Û‰ÊHØŠ
NÈ™]\›ˆ[ÈBˆYˆ
\[ÙˆÛØ[˜Ù[OOH	Ù[˜Ý[Û‰ÊHÛØ[˜Ù[

NÂˆJNÂˆB‚ˆ™]\›ˆ[“[ÛPÜ™Y]Ø]J
NÂˆNÂ‚ˆËÈ:é«:âé;'m:è"{b®:ìíz­à;fe{(%{'`;eg:ì¢:éã;"ç:ãá;eg:âé
:¬&{'`;c¦;'m;)à;%ä;'m;"©;`k:é¯{b®:¬ :äd:ì¢;(ï;'¡zä&:â¥:¬¯{&¬:ã :îa
K‚ˆYˆ
]Ú[™ÝË—×ØÙ\™XÝ^[Y[™\Ý[YTÝ\Y
HÂˆÚ[™ÝË—×ØÙ\™XÝ^[Y[™\Ý[YTÝ\YHYNÂˆžHÈ›ÚYÙ™\Ý[YQ\™XÝ^[Y[Y\”™Y\™XÝ

NÈHØ]Ú
ÊHßBˆB‚ŸJJ
NÂ