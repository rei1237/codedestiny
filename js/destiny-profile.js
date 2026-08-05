/* ?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??   Destiny Profile Manager  쨌  v1.0
   Deep Space & Sacred Gold ???앸뀈?붿씪 & ?μ냼 湲곕컲 ?쒖감 蹂댁젙 ?꾨줈??   Namespace: FORTUNE_APP_USER_PROFILES
   CustomEvent: 'destinyProfileChanged' ???ъ＜ ?붿쭊 ?먮룞 ?곕룞
?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧?먥븧??*/
(function() {
  'use strict';

  /* 異쒖깮吏 ?쒕∼?ㅼ슫?먯꽌 ??λ맂 醫뚰몴??'媛??媛源뚯슫' ?꾩떆 ?듭뀡???좏깮?쒕떎.
     紐⑤뱺 ?쒓뎅 ?꾩떆媛 option.value='Asia/Seoul'濡??숈씪?섍퀬, ?몄젒 ?꾩떆(?? ?援?128.60째E쨌遺??129.08째E)??     寃쎈룄 李④? 1??誘몃쭔?대씪, 怨쇨굅??"寃쎈룄李?1??泥?留ㅼ묶"? 紐⑸줉?먯꽌 ?욎꽑 ?꾩떆濡??ㅼ꽑?앸릱???援??좏깮?믩???.
     tz媛 ?쇱튂?섎뒗 ?듭뀡 以?寃쎈룄(+?꾨룄) 嫄곕━媛 理쒖냼???듭뀡??怨좊Ⅴ誘濡??뱀젙 ?꾩떆 ?섎뱶肄붾뵫 ?놁씠 ??吏??씠 ?뺥솗??蹂듭썝?쒕떎. */
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

  /* ?? ?ㅽ넗由ъ? ???? */
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
      apiCooldown: '?쒕쾭 ?묐떟??遺덉븞?뺥븯???좎떆 ?湲?以묒엯?덈떎. ?좎떆 ???ㅼ떆 ?쒕룄??二쇱꽭??',
      apiConnectionFailed: 'API ?곌껐???ㅽ뙣?덉뒿?덈떎. ?좎떆 ???ㅼ떆 ?쒕룄??二쇱꽭??',
      networkError: '?ㅽ듃?뚰겕 ?ㅻ쪟媛 諛쒖깮?덉뒿?덈떎. ?좎떆 ???ㅼ떆 ?쒕룄??二쇱꽭??',
      passAppliedOverlay: '?댁슜沅뚯씠 ?곸슜?섏뿀?듬땲??\n?대쾲 肄섑뀗痢좊뒗 蹂댁쑀???댁슜沅뚯쑝濡?臾대즺 ?댁슜?⑸땲??\n異붽? 寃곗젣 ?놁씠 諛붾줈 ?댁뼱?쒕┫寃뚯슂.',
      monthlyAppliedOverlay: '?붿젙???ъ슜???꾨즺?섏뿀?듬땲??\n蹂댁쑀???붿젙?앹쑝濡??대쾲 肄섑뀗痢좊? ?댁슜?⑸땲??\n諛붾줈 ?댁뼱?쒕┫寃뚯슂.',
      paymentCompleteOverlay: '寃곗젣媛 ?꾨즺?섏뿀?듬땲??\n肄섑뀗痢좊? ?щ뒗 以묒엯?덈떎.\n?좎떆留?湲곕떎??二쇱꽭??',
      subscriptionIncluded: '?댁슜沅뚯쑝濡?異붽? 寃곗젣 ?놁씠 ?댁슜?⑸땲??',
      serviceTermDisclaimer: '寃곗젣 ?꾨즺 ??利됱떆 ?쒕퉬?ㅺ? ?쒓났?⑸땲?? 援щℓ???쒕퉬?ㅻ뒗 寃곗젣媛 ?뺤씤?섎뒗 ?쒓컙遺???댁슜???쒖옉?⑸땲??',
      paymentBeforeWarning: '?좑툘 ???쒕퉬?ㅻ뒗 寃곗젣 ?꾨즺 ??利됱떆 ?쒓났?섎ŉ, 援щℓ ?뺤씤 ?꾩뿉???섎텋??遺덇??ν빀?덈떎.',
      openProfileList: '?꾨줈??紐⑸줉 ?닿린',
      profileCardManage: '?꾨줈??移대뱶 愿由?,
      loginRequiredConfirm: '?뵏 ?꾨줈??移대뱶??濡쒓렇???꾩뿉留??앹꽦?????덉뒿?덈떎.\n濡쒓렇???섏씠吏濡??대룞?좉퉴??',
      close: '?リ린',
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
      paymentBeforeWarning: '?좑툘 This service is provided immediately upon payment completion, and refunds are not possible after purchase confirmation.',
      openProfileList: 'Open profile list',
      profileCardManage: 'Manage profile cards',
      loginRequiredConfirm: '?뵏 Profile cards can only be created after login.\nMove to the login page?',
      close: 'Close',
    },
    ja: {
      apiCooldown: '?듐꺖?먦꺖恙쒐춸?뚥툖若됧츣?ゃ걼?곥곥걮?겹굢?뤷푷艅잆걮?╉걚?얇걲?귛컩?쀥풄?㎯굚?녵?佯╉걡屋╉걮?뤵걽?뺛걚??,
      apiConnectionFailed: 'API?η텥?ュㅁ?쀣걮?얇걮?잆귛컩?쀥풄?㎯굚?녵?佯╉걡屋╉걮?뤵걽?뺛걚??,
      networkError: '?띲긿?덀꺈?쇈궚?ⓦ꺀?쇈걣?븀뵟?쀣겲?쀣걼?귛컩?쀥풄?㎯굚?녵?佯╉걡屋╉걮?뤵걽?뺛걚??,
      passAppliedOverlay: '?⑴뵪?멥걣?⑴뵪?뺛굦?얇걮?잆?n?볝겗?녈꺍?녴꺍?꾠겘?딀똻?▲겗?⑴뵪?멥겎?→뼑?㎩닶?ⓦ겎?띲겲?쇻?n瓦썲뒥黎뷸툑?ゃ걮?㎯걲?먦겓?뗣걤?얇걲??,
      monthlyAppliedOverlay: '?덄꼐?녈겗鵝욜뵪?뚦츑雅녴걮?얇걮?잆?n?볝겗?녈꺍?녴꺍?꾠겘?딀똻?▲겗?덄꼐?녈겎?⑴뵪?쀣겲?쇻?n?쇻걧?ラ뼀?띲겲?쇻?,
      paymentCompleteOverlay: '黎뷸툑?뚦츑雅녴걮?얇걮?잆?n?녈꺍?녴꺍?꾠굮?뗣걚?╉걚?얇걲??n弱묆끹걡孃끹걾?뤵걽?뺛걚??,
      subscriptionIncluded: '?⑴뵪?멥겎瓦썲뒥黎뷸툑?ゃ걮?ュ닶?ⓦ걮?얇걲??,
      serviceTermDisclaimer: '黎뷸툑若뚥틙孃뚣곥궢?쇈깛?밤걣?녑벨?ユ룓堊쎼걬?뚣겲?쇻귟낵?γ걮?잆궢?쇈깛?밤겘?곫군歷덀걣閻븃첀?뺛굦?잍셽?밤걢?됧닶?ⓦ걣?뗥쭓?뺛굦?얇걲??,
      paymentBeforeWarning: '?좑툘 ?볝겗?듐꺖?볝궧??군歷덂츑雅녶풄?ュ뜵佯㎯겓?먧풘?뺛굦?뗣걼?곥곮낵?η▶沃띶풄??퓭?묆겘?㎯걤?얇걵?볝?,
      openProfileList: '?쀣꺆?뺛궍?쇈꺂訝誤㎯굮?뗣걦',
      profileCardManage: '?쀣꺆?뺛궍?쇈꺂?ャ꺖?됬???,
      loginRequiredConfirm: '?뵏 ?쀣꺆?뺛궍?쇈꺂?ャ꺖?됥겘??궛?ㅳ꺍孃뚣겓??겳鵝쒏닇?㎯걤?얇걲??n??궛?ㅳ꺍?싥꺖?멥겦燁삣땿?쀣겲?쇻걢竊?,
      close: '?됥걯??,
    },
    'zh-CN': {
      apiCooldown: '?띶뒦?ⓨ뱧佯붶툖葉녑츣竊뚧??①윮?귞춬孃끹귟?葉띶릮?띹캊??,
      apiConnectionFailed: 'API 瓦욄렏鸚김뇰?귟?葉띶릮?띹캊??,
      networkError: '?묊뵟營묊퍥?숃??귟?葉띶릮?띹캊??,
      passAppliedOverlay: '藥꿨틪?ⓧ슴?ⓨ댏??n?у냵若밧룾鵝욜뵪壤볟뎺?곫쐣?꾡슴?ⓨ댏?띹뉩?η쐦??n?좈?窯앭쨼餓섉Ь竊뚦컛塋뗥뜵凉???,
      monthlyAppliedOverlay: '?덄꼐?념슴?ⓨ츑?먦?n?у냵若밧컛鵝욜뵪?ⓩ똻?됬쉪?덄꼐?녈?n?녑컛訝뷸궓凉???,
      paymentCompleteOverlay: '??퍡若뚧닇??n閭ｅ쑉訝뷸궓凉??냵若밤?n瑥루쮰?쇻?,
      subscriptionIncluded: '鵝욜뵪?멨럴?잍븞竊뚧뿞?窯앭쨼餓섉Ь??,
      serviceTermDisclaimer: '餓섉Ь若뚧닇?롳펽?띶뒦弱녺쳦?녔룓堊쎼귟눌阿곁쉪?띶뒦?ⓧ퍡轝양‘溫ㅷ쉪?ｄ??삣?冶뗤슴?ⓦ?,
      paymentBeforeWarning: '?좑툘 ?ф쐨?▼쑉若뚧닇餓섉Ь?롧쳦?녔룓堊쏉펽兀?물簾???롦뿞力뺡轝얇?,
      openProfileList: '?볟?訝や볶壅꾣뼑?쀨〃',
      profileCardManage: '嶸←릤訝や볶壅꾣뼑??,
      loginRequiredConfirm: '?뵏 訝や볶壅꾣뼑?▼룵?썲쑉?삣퐬?롥닗兩뷩?n誤곩뎺孃?삣퐬窈들씊?쀯폕',
      close: '?녜뿭',
    },
    'zh-TW': {
      apiCooldown: '鴉뷸쐨?ⓨ썮?됦툖令⒴츣竊뚧??①윮?ョ춬孃끹귟쳦葉띶풄?띹ĳ??,
      apiConnectionFailed: 'API ?ｇ퇉鸚길븮?귟쳦葉띶풄?띹ĳ??,
      networkError: '?쇘뵟泳꿱러??い?귟쳦葉띶풄?띹ĳ??,
      passAppliedOverlay: '藥꿨쪞?ⓧ슴?ⓨ댏??n?у뀱若밧룾鵝욜뵪??뎺?곫쐣?꾡슴?ⓨ댏?띹꼇?η쐦??n?↓?窈띶쨼餓섉Ь竊뚦컜塋뗥뜵?뗥븶??,
      monthlyAppliedOverlay: '?덄꼐?념슴?ⓨ츑?먦?n?у뀱若밧컜鵝욜뵪?ⓩ똻?됬쉪?덄꼐?녈?n?녑컜?뷸궓?뗥븶??,
      paymentCompleteOverlay: '餓섉Ь若뚧닇??n閭ｅ쑉?뷸궓?뗥븶?㎩???n獄뗧쮰?쇻?,
      subscriptionIncluded: '鵝욜뵪?멨럴?잍븞竊뚨꽒?窈띶쨼餓섉Ь??,
      serviceTermDisclaimer: '餓섉Ь若뚧닇孃뚳펽?띶떃弱뉒쳦?녔룓堊쎼귟낵縕루쉪?띶떃?ⓧ퍡轝양▶沃띸쉪?ｄ??삯뼀冶뗤슴?ⓦ?,
      paymentBeforeWarning: '?좑툘 ?ф쐨?쇿쑉若뚧닇餓섉Ь孃뚨쳦?녔룓堊쏉펽蘊쇠껭閻븃첀孃뚨꽒力뺡轝얇?,
      openProfileList: '?뗥븶?뗤볶蘊뉑뼑?쀨〃',
      profileCardManage: '嶸←릤?뗤볶蘊뉑뼑??,
      loginRequiredConfirm: '?뵏 ?뗤볶蘊뉑뼑?▼룵?썲쑉?삣뀯孃뚦뻠塋뗣?n誤곩뎺孃?삣뀯?곲씊?롳폕',
      close: '?쒒뻾',
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
        || _dpIsActiveMembershipStatusValue(user.profileSubscription.lastBillingStatus)
        || _dpHasFutureMembershipExpiry(user.profileSubscription.expiresAt)
      );
      safe.profileSubscription = {
        tier: tierValue,
        isActive: activeValue,
        isSubscribed: activeValue,
        expiresAt: user.profileSubscription.expiresAt || null,
      };
      var passLimit = Number(user.profileSubscription.passLimit || user.profileSubscription.freeLimit || user.profileSubscription.maxFreeCoinLimit || user.profileSubscription.maxCoveredCoin);
      var tierKey = String(safe.profileSubscription.tier || '').toLowerCase();
      var policyPassLimit = tierKey.indexOf('vvip') >= 0 ? 100 : (tierKey.indexOf('premium') >= 0 ? 50 : (tierKey.indexOf('standard') >= 0 ? 30 : 0));
      if (policyPassLimit > 0) {
        safe.profileSubscription.passLimit = policyPassLimit;
        safe.profileSubscription.freeLimit = policyPassLimit;
        safe.profileSubscription.maxCoveredCoin = policyPassLimit;
      } else if (Number.isFinite(passLimit) && passLimit > 0) {
        safe.profileSubscription.passLimit = Math.floor(passLimit);
        safe.profileSubscription.freeLimit = Math.floor(passLimit);
        safe.profileSubscription.maxCoveredCoin = Math.floor(passLimit);
      }
      if (user.profileSubscription.passTier) safe.profileSubscription.passTier = String(user.profileSubscription.passTier);
      var profileLimit = _dpReadProfileLimitValue(user.profileSubscription);
      if (Number.isFinite(profileLimit) && profileLimit >= 0) safe.profileSubscription.profileLimit = Math.floor(profileLimit);
      if (user.profileSubscription.plan) safe.profileSubscription.plan = String(user.profileSubscription.plan);
      if (user.profileSubscription.planId) safe.profileSubscription.planId = String(user.profileSubscription.planId);
      if (user.profileSubscription.productId) safe.profileSubscription.productId = String(user.profileSubscription.productId);
      if (user.profileSubscription.status) safe.profileSubscription.status = String(user.profileSubscription.status);
    }
    if (user.profilePolicySnapshot && typeof user.profilePolicySnapshot === 'object') {
      var policySnapshot = _dpNormalizeProfilePolicySnapshot(user.profilePolicySnapshot, 'auth_user');
      if (policySnapshot) safe.profilePolicySnapshot = policySnapshot;
    }
    return Object.keys(safe).length ? safe : null;
  }

  function _dpWriteAuthUser(user) {
    try {
      var safe = _dpSanitizeAuthUser(user);
      if (!safe) {
        localStorage.removeItem('fortune_auth_user');
        return null;
      }
      localStorage.setItem('fortune_auth_user', JSON.stringify(safe));
      return safe;
    } catch (e) {
      return null;
    }
  }

  function _dpResolveProfileScope(user) {
    var scope = _dpResolveIdScope(user);
    if (!scope && typeof _dpSessionVerify !== 'undefined' && _dpSessionVerify && _dpSessionVerify.ok && _dpSessionVerify.userId) {
      scope = String(_dpSessionVerify.userId).trim().toLowerCase();
    }
    return scope || 'guest';
  }

  function _dpGetProfileScope() {
    return _dpResolveProfileScope(_dpReadAuthUser());
  }

  function _dpGetScopedListKey(scope) {
    return KEY_LIST_PREFIX + String(scope || 'guest');
  }

  function _dpGetScopedCurrentKey(scope) {
    return KEY_CURR_PREFIX + String(scope || 'guest');
  }

  function _dpGetScopedMetaKey(scope) {
    return KEY_META_PREFIX + String(scope || 'guest');
  }

  function _dpGetScopedPolicyKey(scope) {
    return KEY_POLICY_PREFIX + String(scope || 'guest');
  }

  function _dpNormalizeProfilePolicySnapshot(snapshot, source) {
    if (!snapshot || typeof snapshot !== 'object') return null;
    var tier = _dpNormalizeTier(snapshot.tier || snapshot.passTier || snapshot.plan || 'free');
    var active = !!snapshot.isActive && tier !== 'free';
    var rawLimit = snapshot.maxProfileCount;
    if (rawLimit == null) rawLimit = snapshot.profileLimit;
    if (rawLimit == null) rawLimit = snapshot.maxProfiles;
    var resolvedLimit = _dpResolveProfileLimit(tier, rawLimit);
    if (!active) resolvedLimit = 1;
    var fetchedAt = Number(snapshot.fetchedAt);
    if (!isFinite(fetched…123846 tokens truncated…l;
            try {
              if (typeof window.__cdApplyMembershipPassBeforePayment === 'function') {
                passReady = await window.__cdApplyMembershipPassBeforePayment(Object.assign({}, opts, {
                  title: title,
                  coinPrice: cost,
                  cost: cost
                }));
              }
            } catch (_passProbeError) { passReady = null; }
            if (passReady && (passReady.status === 'pass_applied' || passReady.status === 'already_unlocked')) {
              _dpTrackCheckoutEvent('pass_verified_free', { option: 'pass', coinPrice: cost, featureKey: opts.featureKey });
              finish('pass');
              return;
            }
            // ?뺤씤 ?먯껜媛 ?ㅽ뙣(5xx/degrade/??꾩븘??硫??곸젏?쇰줈 蹂대궡吏 ?딅뒗????吏?곗쓣 誘몄빱踰?洹쇨굅濡??곕㈃
            // ?ㅼ젣 蹂댁쑀?먭? ?대? 媛吏??댁슜沅뚯쓣 ???щ윭 媛寃??쒕떎. 紐⑤떖???댁뼱 ??梨??ъ떆?꾨? ?덈궡?쒕떎.
            if (!passReady || passReady.status === 'error') {
              hit.removeAttribute('disabled');
              hit.classList.remove('is-loading');
              var passRetryNode = root.querySelector('[data-payment-status]');
              if (passRetryNode) {
                passRetryNode.textContent = _dpCheckoutText('payment.directModal.passCheckRetry', '?댁슜沅??곹깭瑜??뺤씤?섏? 紐삵뻽?듬땲?? ?좎떆 ???ㅼ떆 ?뚮윭 二쇱꽭??');
                passRetryNode.style.color = '#fca5a5';
              }
              return;
            }
            goPassStore();
            return;
          }
          if (hit.hasAttribute('disabled')) return; // ?붾웾 遺議깆쑝濡?鍮꾪솢?깊솕???붿젙??踰꾪듉
          if (act === 'direct' || act === 'monthly') {
            _dpTrackCheckoutEvent('checkout_option_click', { option: act, coinPrice: cost, featureKey: opts.featureKey });
          }
          finish(act);
          return;
        }
        if (e.target === root) finish('cancel'); // 諛곌꼍 ?대┃ = 痍⑥냼
      });
      document.addEventListener('keydown', onKey, true);
      document.body.appendChild(root);
      // ?쇰꼸 ?쒖옉?? ?ш린遺??checkout_option_click / checkout_dismissed 源뚯?媛 ???몄뀡?대떎.
      _dpTrackCheckoutEvent('checkout_opened', {
        coinPrice: cost,
        featureKey: opts.featureKey,
        hasPassHint: hasActivePassTier ? 'active' : 'unknown'
      });
      // ?먮룞 1???ъ“?? ?대━??利됱떆 理쒖떊 ?붿젙???붾웾??梨꾩슫???섎룞 踰꾪듉怨?蹂꾧컻).
      refreshStandaloneMoonbal();
    });
  }

  if (typeof window.__cdRestoreCanonicalPaymentMode === 'function') {
    try { window.__cdRestoreCanonicalPaymentMode(); } catch (_) {}
  }
  if (typeof window._cdChooseServicePaymentMode !== 'function' || window._cdChooseServicePaymentMode.__cdSupportsPassChoice !== true) {
    var _dpCanonicalPaymentChoice = function(options) {
      var restored = null;
      if (typeof window.__cdRestoreCanonicalPaymentMode === 'function') {
        try { restored = window.__cdRestoreCanonicalPaymentMode(); } catch (_) { restored = null; }
      }
      var canonical = restored || window.__cdChooseServicePaymentModeCanonical;
      if (typeof canonical === 'function' && canonical !== _dpCanonicalPaymentChoice && canonical.__cdSupportsPassChoice === true) {
        return canonical(options || {});
      }
      // canonical 紐⑤떖???녿뒗 ?낅┰(?뺤쟻) ?섏씠吏: ?뺤콉以???먯껜 寃곗젣 ?좏깮 紐⑤떖(?④굔/?붿젙???숇벑)???곕떎.
      return _dpRenderStandalonePaymentChoice(options || {});
    };
    _dpCanonicalPaymentChoice.__cdSupportsPassChoice = true;
    if (window.CodeDestinyPaymentService && typeof window.CodeDestinyPaymentService.registerPaymentWindow === 'function') {
      window.CodeDestinyPaymentService.registerPaymentWindow(_dpCanonicalPaymentChoice, 'standalone');
      var _dpPaymentServiceChoice = function(options) {
        return window.CodeDestinyPaymentService.openPaymentWindow(options || {});
      };
      _dpPaymentServiceChoice.__cdSupportsPassChoice = true;
      window._cdChooseServicePaymentMode = _dpPaymentServiceChoice;
    } else {
      window._cdChooseServicePaymentMode = _dpCanonicalPaymentChoice;
    }
  }

  window._cdCoinGatePerUse = function(cost, reason, cb, onCancel, options) {
    if (!options && onCancel && typeof onCancel === 'object' && typeof cb === 'function') {
      options = onCancel;
      onCancel = undefined;
    }

    var optionBag = (options && typeof options === 'object') ? options : {};
    var normalizedFeatureKey = _dpResolvePaidGateFeatureKey(optionBag, reason);
    var requestId = String(optionBag.requestId || '').trim().slice(0, 120);
    if (!requestId) {
      requestId = 'coin-gate-per-use-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
    }
    var token = '';
    try { token = localStorage.getItem('fortune_auth_token') || ''; } catch (_) {}

    if (_cdIsAdminLikeUser()) {
      if (typeof cb === 'function') cb();
      return;
    }

    var now = Date.now();
    var lockAt = Number(window.__cdCoinGatePerUseLockAt || 0);
    var lockAgeMs = lockAt > 0 ? (now - lockAt) : 0;
    var isStaleLock = !lockAt || lockAgeMs > 45000;
    if (window._cdCoinGatePerUseInFlight) {
      if (isStaleLock) {
        window._cdCoinGatePerUseInFlight = false;
        window.__cdCoinGatePerUseLockAt = 0;
        _dpSetPaymentPending(false);
        window.alert('?댁쟾 寃곗젣 ?곹깭瑜?蹂듦뎄?덉뒿?덈떎. ?ㅼ떆 ?쒕룄??二쇱꽭??');
      } else {
        window.alert('?댁쟾 寃곗젣 泥섎━ 以묒엯?덈떎. ?좎떆 ???ㅼ떆 ?쒕룄??二쇱꽭??');
      }
      if (typeof onCancel === 'function') onCancel();
      return;
    }

    var dedupeKey = normalizedFeatureKey + '|' + String(reason || '') + '|' + String(cost || 0);
    var dedupeMap = window.__cdCoinGatePromptDedup || (window.__cdCoinGatePromptDedup = {});
    if (dedupeMap[dedupeKey] && (now - dedupeMap[dedupeKey] < 2500)) {
      if (typeof onCancel === 'function') onCancel();
      return;
    }
    dedupeMap[dedupeKey] = now;

    var gateGrantedDelivered = false;
    function deliverGateGrant(transactionId, payload) {
      gateGrantedDelivered = true;
      _dpEmitPaymentSuccess(transactionId, payload, optionBag, normalizedFeatureKey, requestId);
      if (typeof cb === 'function') cb(String(transactionId || requestId), payload || {});
    }

    if (typeof window._cdOpenPaidServiceGate === 'function') {
      return window._cdOpenPaidServiceGate({
        title: reason,
        reason: reason,
        coinPrice: cost,
        cost: cost,
        featureKey: normalizedFeatureKey,
        requestId: requestId,
        categoryKey: optionBag.categoryKey,
        subFeatureKey: optionBag.subFeatureKey,
        contentKey: optionBag.contentKey,
        productId: optionBag.productId,
        reportType: optionBag.reportType,
        serviceKey: optionBag.serviceKey,
        reportId: optionBag.reportId,
        sessionId: optionBag.sessionId,
        reportSessionId: optionBag.reportSessionId || optionBag.sessionId,
        purchaseId: optionBag.purchaseId,
        actionType: optionBag.actionType,
        profileAction: optionBag.profileAction,
        action: optionBag.action,
        profileId: optionBag.profileId,
        selectedProfileId: optionBag.selectedProfileId,
        amountKrw: optionBag.amountKrw,
        membershipCreditCost: optionBag.membershipCreditCost,
        allowedPaymentModes: optionBag.allowedPaymentModes,
        disablePassFirst: optionBag.disablePassFirst,
        disablePassChoice: optionBag.disablePassChoice,
        onGranted: function(transactionId, payload) {
          deliverGateGrant(transactionId, payload);
        },
        onCancel: onCancel
      }).then(function(result) {
        if (result && result.status === 'granted' && !gateGrantedDelivered) {
          deliverGateGrant(result.transactionId, result.payload || result);
        } else if (result && result.status === 'cancelled' && result.reason === 'pass_applied_in_modal' && !gateGrantedDelivered) {
          deliverGateGrant(requestId, { __cdPassGateResolved: true, requestId: requestId, featureKey: normalizedFeatureKey });
        }
        return result;
      }).catch(function(error) {
        console.error('[main-paid-service-gate]', error);
        var gateMessage = String(error && error.message || '\uACB0\uC81C\uB97C \uC644\uB8CC\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.');
        var gateCode = String(error && error.code || '').toUpperCase();
        if (Number(error && error.status || 0) >= 500 || gateCode.indexOf('SERVICE_UNAVAILABLE') >= 0 || gateMessage.toLowerCase().indexOf('database is temporarily unavailable') >= 0) {
          gateMessage = '寃곗젣 ?쒕쾭 ?곌껐???쇱떆?곸쑝濡??먰솢?섏? ?딆뒿?덈떎. ?좎떆 ???ㅼ떆 ?쒕룄??二쇱꽭??';
        }
        window.alert(gateMessage);
        if (typeof onCancel === 'function') onCancel(error);
        return null;
      });
    }

    if (typeof window._cdResolvePaidContentAccess === 'function' && optionBag.disablePassFirst !== true && optionBag.disablePassChoice !== true) {
      return window._cdResolvePaidContentAccess({ title: reason, reason: reason, coinPrice: cost, cost: cost, featureKey: normalizedFeatureKey, requestId: requestId, categoryKey: optionBag.categoryKey, subFeatureKey: optionBag.subFeatureKey, contentKey: optionBag.contentKey, productId: optionBag.productId, reportType: optionBag.reportType, serviceKey: optionBag.serviceKey, reportId: optionBag.reportId, sessionId: optionBag.sessionId, reportSessionId: optionBag.reportSessionId || optionBag.sessionId, purchaseId: optionBag.purchaseId, actionType: optionBag.actionType, profileAction: optionBag.profileAction, action: optionBag.action, profileId: optionBag.profileId, selectedProfileId: optionBag.selectedProfileId, allowSnapshotFastPath: true }).then(function(access) {
        if (access && (access.status === 'already_unlocked' || access.status === 'pass_applied')) {
          var passPayload = access.payload || access.rawPayload || {};
          var passTransactionId = String(passPayload.transactionId || passPayload.paymentId || passPayload.purchaseId || passPayload.requestId || access.requestId || requestId);
          if (typeof cb === 'function') cb(passTransactionId, passPayload);
          return passPayload;
        }
        if (access && access.status === 'error') { window.alert(access.message || '\uC774\uC6A9\uAD8C \uD655\uC778\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.'); if (typeof onCancel === 'function') onCancel(access); return null; }
        if (typeof window._cdChooseServicePaymentMode === 'function') { return window._cdChooseServicePaymentMode({ title: reason, reason: reason, coinPrice: cost, cost: cost, featureKey: normalizedFeatureKey || undefined, amountKrw: optionBag.amountKrw, membershipCreditCost: optionBag.membershipCreditCost, allowedPaymentModes: optionBag.allowedPaymentModes, disablePassFirst: optionBag.disablePassFirst, disablePassChoice: optionBag.disablePassChoice }).then(function(choice) { if (choice === 'direct') return runDirectCheckout(); if (choice === 'monthly') return runMonthlyCreditGate(); if ((choice === 'pass' || choice === 'pass_applied') && optionBag.disablePassChoice !== true) { if (typeof cb === 'function') cb(); return null; } if (typeof onCancel === 'function') onCancel(); return null; }); }
        return runMonthlyCreditGate();
      }).catch(function(error) { window.alert(String(error && error.message || '\uC774\uC6A9\uAD8C \uD655\uC778 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.')); if (typeof onCancel === 'function') onCancel(error); return null; });
    }

    function runMonthlyCreditGate() {
      var consumeHeaders = { 'Content-Type': 'application/json' };
      if (token) consumeHeaders.Authorization = 'Bearer ' + token;
      window._cdCoinGatePerUseInFlight = true;
      window.__cdCoinGatePerUseLockAt = Date.now();
      var pendingLabel = String(reason || '').trim() || '?좊즺 ?쒕퉬??;
      _dpSetPaymentPending(true, pendingLabel + ' 寃곗젣 沅뚰븳???뺤씤?섍퀬 ?덉뒿?덈떎.', 'monthly');
      return _dpWaitForPaymentOverlayPaint().then(function() {
        return _dpFetchJsonWithFallback('/api/billing/coin-gate', {
          method: 'POST',
          headers: consumeHeaders,
          credentials: 'include',
          cache: 'no-store',
          body: JSON.stringify({
            cost: cost,
            reason: reason,
            featureKey: normalizedFeatureKey || undefined,
            reportType: optionBag.reportType,
            serviceKey: optionBag.serviceKey,
            reportId: optionBag.reportId,
            sessionId: optionBag.sessionId,
            reportSessionId: optionBag.reportSessionId || optionBag.sessionId,
            purchaseId: optionBag.purchaseId,
            actionType: optionBag.actionType,
            profileAction: optionBag.profileAction,
            action: optionBag.action,
            profileId: optionBag.profileId,
            selectedProfileId: optionBag.selectedProfileId,
            paymentMode: 'MOONLIGHT_STONE',
            requestId: requestId
          })
        }, {
          retryOn401: true,
          timeoutMs: _DP_FETCH_TIMEOUT_MS,
        });
      })
      .then(function(res) {
        window._cdCoinGatePerUseInFlight = false;
        window.__cdCoinGatePerUseLockAt = 0;
        _dpSetPaymentPending(false);
        if (_dpIsAuthRequiredResult(res)) {
          if (typeof window.__cdOpenLoginRequiredModal === 'function') {
            window.__cdOpenLoginRequiredModal({
              reason: '濡쒓렇?몄씠 ?꾩슂??湲곕뒫?낅땲??',
              redirectTo: window.location.pathname + window.location.search + window.location.hash,
            });
          }
          if (typeof onCancel === 'function') onCancel();
          return;
        }

        var rawData = (res && res.data && typeof res.data === 'object') ? res.data : {};
        var data = (rawData.data && typeof rawData.data === 'object') ? rawData.data : rawData;
        if (res.status === 402 || !res.ok || !data || data.ok === false) {
          var failMessage = String((data && data.message) || rawData.message || '寃곗젣 沅뚰븳???뺤씤?섏? 紐삵뻽?듬땲?? ?④굔 寃곗젣瑜??좏깮??二쇱꽭??');
          window.alert(failMessage);
          if (typeof onCancel === 'function') onCancel();
          return;
        }

        var consumeData = (data && data.consume && typeof data.consume === 'object') ? data.consume : {};
        var accessGrant = (data && data.accessGrant && typeof data.accessGrant === 'object') ? data.accessGrant : {};
        var transactionId = String(data.transactionId || consumeData.transactionId || accessGrant.evidenceId || accessGrant.purchaseId || accessGrant.requestId || '');
        if (typeof cb === 'function') cb(transactionId, data);
        return data;
      })
      .catch(function(error) {
        window._cdCoinGatePerUseInFlight = false;
        window.__cdCoinGatePerUseLockAt = 0;
        _dpSetPaymentPending(false);
        console.error('[coin-gate-per-use]', error);
        window.alert('寃곗젣瑜?泥섎━?섎뒗 以?臾몄젣媛 諛쒖깮?덉뒿?덈떎. ?좎떆 ???ㅼ떆 ?쒕룄??二쇱꽭??');
        if (typeof onCancel === 'function') onCancel();
      });
    }

    function runDirectCheckout() {
      if (typeof window._cdRunDirectKrwCheckout !== 'function') {
        window.alert('?④굔 寃곗젣 紐⑤뱢??李얠쓣 ???놁뒿?덈떎. ?섏씠吏瑜??덈줈怨좎묠?????ㅼ떆 ?쒕룄??二쇱꽭??');
        if (typeof onCancel === 'function') onCancel();
        return Promise.resolve();
      }
      window._cdCoinGatePerUseInFlight = true;
      window.__cdCoinGatePerUseLockAt = Date.now();
      // ?뵶 PG李쎌씠 ?대━湲??꾩뿉???대뼡 ?湲?UI??耳쒖? ?딅뒗?? ?덉쟾?먮뒗 ?ш린??'?④굔 寃곗젣瑜?吏꾪뻾
      // 以묒엯?덈떎' ?ㅻ쾭?덉씠瑜??꾩썱怨? ?ъ슜?먯뿉寃뚮뒗 寃곗젣?섎떒??怨좊Ⅸ ??????寃?濡쒕뵫???쇰뒗 寃껋쑝濡?蹂댁???
      // _cdRunDirectKrwCheckout ??吏꾩엯 ?쒖젏遺??PG ?ㅽ뵂源뚯? ?듭젣 李쎌쓣 嫄멸퀬 ?ㅼ뒪濡??ㅻ쾭?덉씠瑜??대┛??
      return window._cdRunDirectKrwCheckout({
        coinPrice: cost,
        cost: cost,
        title: reason,
        reason: reason,
        featureKey: normalizedFeatureKey,
        requestId: requestId,
        forceDirectPayment: true,
        internalMainGate: true,
        __cdPaymentGateAuthorized: true,
        checkoutPayload: {
          categoryKey: optionBag.categoryKey,
          subFeatureKey: optionBag.subFeatureKey,
          contentKey: optionBag.contentKey,
          productId: optionBag.productId,
          reportType: optionBag.reportType,
          serviceKey: optionBag.serviceKey,
          reportId: optionBag.reportId,
          sessionId: optionBag.sessionId,
          reportSessionId: optionBag.reportSessionId || optionBag.sessionId,
          purchaseId: optionBag.purchaseId,
          actionType: optionBag.actionType,
          profileAction: optionBag.profileAction,
          action: optionBag.action,
          profileId: optionBag.profileId,
          selectedProfileId: optionBag.selectedProfileId,
          paymentMode: 'DIRECT_KRW'
        }
      }).then(function(payload) {
        window._cdCoinGatePerUseInFlight = false;
        window.__cdCoinGatePerUseLockAt = 0;
        _dpSetPaymentPending(false);
        var txId = String((payload && (payload.transactionId || payload.paymentId || payload.purchaseId || payload.requestId)) || requestId);
        if (typeof cb === 'function') cb(txId, payload || {});
        return payload;
      }).catch(function(error) {
        window._cdCoinGatePerUseInFlight = false;
        window.__cdCoinGatePerUseLockAt = 0;
        _dpSetPaymentPending(false);
        console.error('[direct-checkout]', error);
        window.alert(String(error && error.message || '?④굔 寃곗젣瑜??꾨즺?섏? 紐삵뻽?듬땲?? 寃곗젣 ?섎떒???뺤씤?????ㅼ떆 ?쒕룄??二쇱꽭??'));
        if (typeof onCancel === 'function') onCancel(error);
      });
    }

    if (typeof window._cdChooseServicePaymentMode === 'function') {
      return window._cdChooseServicePaymentMode({
        title: reason,
        coinPrice: cost,
        cost: cost,
        reason: reason,
        featureKey: normalizedFeatureKey || undefined,
        reportType: optionBag.reportType,
        serviceKey: optionBag.serviceKey,
        actionType: optionBag.actionType,
        profileAction: optionBag.profileAction,
        action: optionBag.action,
        profileId: optionBag.profileId,
        selectedProfileId: optionBag.selectedProfileId,
        amountKrw: optionBag.amountKrw,
        membershipCreditCost: optionBag.membershipCreditCost,
        allowedPaymentModes: optionBag.allowedPaymentModes,
        disablePassFirst: optionBag.disablePassFirst,
        disablePassChoice: optionBag.disablePassChoice
      }).then(function(choice) {
        if (choice === 'direct') return runDirectCheckout();
        if (choice === 'monthly') return runMonthlyCreditGate();
        if ((choice === 'pass' || choice === 'pass_applied') && optionBag.disablePassChoice !== true) { if (typeof cb === 'function') cb(); return null; }
        if (typeof onCancel === 'function') onCancel();
      });
    }

    return runMonthlyCreditGate();
  };

  // 由щ떎?대젆??蹂듦? ?뺤젙? ??踰덈쭔 ?쒕룄?쒕떎(媛숈? ?섏씠吏?????ㅽ겕由쏀듃媛 ??踰?二쇱엯?섎뒗 寃쎌슦 ?鍮?.
  if (!window.__cdDirectPaymentResumeStarted) {
    window.__cdDirectPaymentResumeStarted = true;
    try { void _dpResumeDirectPaymentAfterRedirect(); } catch (_) {}
  }

})();
