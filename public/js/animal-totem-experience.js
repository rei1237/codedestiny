/* 애니멀 토템 — 리추얼 모달.
 *
 * 흐름: 인트로 → 질문 입력 → 의식 선택 → (결제) → 카드 뒤집기 → 결과 → 보관함
 *
 * 이 파일이 지키는 세 가지 계약:
 *  1) 🔴 결제 배관은 손대지 않는다. _cdCoinGatePerUse 호출부·featureKey·cost 는 그대로다.
 *     달라진 것은 requestId 를 모듈 상태로 올려 워커 증빙 조회에 넘긴다는 점 하나뿐이다.
 *  2) 🔴 카드를 뒤집는 시간이 곧 AI 로딩 시간이다. 결제 성공 직후 /api/animal-totem/reading 을
 *     쏘고, 사용자가 카드를 뒤집는 10~20초 동안 백그라운드로 받는다. 별도 로딩 화면이 없다.
 *     서버는 실패해도 200 + 템플릿 서사를 주므로 무한 대기가 없다.
 *  3) 🔴 재시도를 겹치지 않는다. 워커의 callGeminiJsonWithRetry 가 이미 재시도·폴백 체인을
 *     품고 있다. 여기서는 **단 한 번** 호출하고, 실패하면 즉시 정적 리딩으로 간다.
 *
 * 카드 아트는 이모지가 아니라 동물 id 를 시드로 만든 결정론적 성좌 시길이다(아래 sigil 섹션).
 * 시길을 별도 파일로 두지 않은 이유: 이 모달의 스크립트 로더가 5곳(index-inline-runtime 3곳,
 * uiBindings, mobile-interaction-patch)이라 한 곳만 놓쳐도 그 경로에서 아트가 죽는다.
 */
(function(global) {
  "use strict";

  var state = {
    mode: "three",
    question: "",
    spread: null,
    consultation: null,
    narrative: null,
    narrativePromise: null,
    narrativeSource: "",
    requestId: "",
    revealedOrder: [],
    activeResultTab: 0,
    canvasLoop: null,
    canvasStars: [],
    touchStart: null,
    lastFocusedElement: null,
    isFlowBusy: false
  };

  var refs = {};
  var TAP_THRESHOLD = 12;
  var QUESTION_MAX = 300;
  var ARCHIVE_KEY = "cd_animal_totem_archive_v1";
  var ARCHIVE_LIMIT = 20;
  var QUESTION_DRAFT_KEY = "cd_animal_totem_question_draft";
  /* 마지막 카드를 뒤집었는데 해설이 아직이면 이만큼만 더 기다린다.
     서버가 항상 200 을 주므로 이건 네트워크 지연 상한일 뿐이다. */
  var NARRATIVE_GRACE_MS = 9000;
  var NARRATIVE_REQUEST_TIMEOUT_MS = 32000;

  var ANIMAL_TOTEM_TEXT_TRANSLATIONS = {
    ko: {
      billing: {
        reasonBasic: "애니멀 토템 리딩",
        reasonDeep: "애니멀 토템 심화 리딩",
        oneLabel: "달빛 한 장",
        threeLabel: "숲의 세 길",
        fiveLabel: "별자리 다섯 동물"
      },
      overlay: {
        checkingTitle: "결제를 확인 중입니다...",
        checkingStatus: "잠시만 기다려 주세요.",
        processing: "결제를 진행 중입니다.",
        checkingPayment: "결제를 확인 중입니다..."
      },
      auth: {
        requiredReason: "로그인 후 이용할 수 있는 기능입니다.",
        confirm: "로그인이 필요합니다. 로그인 페이지로 이동할까요?"
      },
      payment: {
        retryAfterPayment: "단건 결제가 필요합니다. 결제 후 다시 시도해 주세요.",
        krwFailed: "원화 결제 확인에 실패했습니다.",
        processError: "결제 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
        gateLoadFailed: "결제 게이트를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요."
      },
      slots: {
        today_guide: "오늘의 수호 메시지",
        past_wound: "과거 상처",
        present_energy: "현재 에너지",
        integration_path: "통합 방향",
        mind: "이성/사고",
        heart: "감정/욕구",
        shadow: "그림자",
        gift: "잠재 선물",
        next_action: "다음 행동"
      },
      cardFlip: "{slot} 카드 뒤집기",
      guidance: {
        essence: "수호의 본질",
        whisper: "오늘의 속삭임",
        action: "작은 실천",
        ritual: "짧은 치유 리추얼",
        journaling: "스스로에게 묻기",
        shadow: "그림자 주의",
        affirmation: "오늘의 확언"
      },
      focus: {
        title: "무엇이 마음에 걸리나요?",
        hint: "질문을 적으면 연이가 그 질문을 축에 두고 카드를 읽어 드려요. 비워 두셔도 괜찮아요.",
        placeholder: "예) 지금 이 일을 계속해도 될지 모르겠어요.",
        chipsLabel: "이런 고민이라면",
        chips: [
          { label: "연애", value: "지금 이 사람과의 관계를 어떻게 이어가야 할지 모르겠어요." },
          { label: "일·진로", value: "지금 하는 일을 계속해도 괜찮을지 마음이 흔들려요." },
          { label: "관계", value: "가까운 사람과 자꾸 어긋나서 마음이 지쳐요." },
          { label: "돈", value: "돈 문제로 마음이 조급해지는데 어디서부터 풀어야 할까요." },
          { label: "건강", value: "몸도 마음도 지쳐 있는데 무엇부터 돌봐야 할까요." },
          { label: "모르겠어요", value: "무엇이 문제인지도 모르겠고 그냥 마음이 무거워요." }
        ],
        skip: "지금 마음 상태로 봐 주세요",
        next: "다음 · 의식 선택",
        back: "↺ 처음으로",
        counter: "{count}/{max}자",
        profilePrefix: "님",
        profileSuffix: " 기준으로 읽어 드릴게요",
        profileChange: "프로필 변경"
      },
      modes: {
        badge: "✦ 수호 동물 의식 선택 ✦",
        title: "지금의 마음에 맞는 의식을 고르세요",
        hint: "장수가 아니라 '어떻게 읽을지'가 다릅니다.",
        one: {
          title: "달빛 한 장",
          price: "3,000원",
          tagline: "동물 한 마리를 끝까지 정독",
          perks: ["본질 · 속삭임 전문 수록", "실천 5가지 + 치유 리추얼", "저널링 3문항 · 그림자 · 확언"]
        },
        three: {
          title: "숲의 세 길",
          price: "3,000원",
          tagline: "과거 → 현재 → 통합의 흐름",
          perks: ["세 마리가 만드는 하나의 서사", "카드마다 질문 연결 해설", "오늘의 실천 플랜 3가지"]
        },
        five: {
          title: "별자리 다섯 동물",
          price: "6,000원",
          tagline: "이성 · 감정 · 그림자 · 선물 · 행동",
          perks: ["다섯 자리 전체 심층 리딩", "그림자 ↔ 선물 통합 해설", "오늘의 실천 플랜 3가지"]
        },
        draw: "✦ 카드 소환하기",
        back: "↺ 질문 다시 쓰기"
      },
      draw: {
        badge: "카드를 순서대로 뒤집어 주세요",
        header: "왼쪽부터 한 장씩, 천천히",
        hint: "뒤집는 동안 연이가 당신의 질문에 맞춰 이야기를 잇고 있어요.",
        weaving: "연이가 이야기를 잇는 중...",
        ready: "이야기가 준비됐어요"
      },
      result: {
        title: "✨ 수호 동물의 메시지",
        tabOverview: "종합 해설",
        yeoniTitle: "연이의 종합 해설",
        questionLabel: "나의 질문",
        actionPlan: "오늘의 실천 플랜",
        shadowGift: "그림자 ↔ 선물",
        openingTitle: "🌱 오프닝 메시지",
        closingTitle: "🌸 힐링 클로징",
        save: "🗂 보관함에 저장",
        saved: "보관함에 저장했어요",
        archive: "🗂 지난 리딩",
        archiveEmpty: "아직 보관된 리딩이 없어요.",
        archiveTitle: "지난 리딩 다시 보기",
        archiveOpen: "다시 보기",
        archiveClose: "닫기",
        degradedNote: "연결이 잠시 불안정해 기본 해설로 전해 드려요. 카드별 메시지는 그대로예요."
      },
      errors: {
        engineMissing: "애니멀 토템 엔진을 불러오지 못했습니다. 페이지를 새로고침해 주세요.",
        drawFailed: "카드 소환 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."
      },
      share: {
        title: "🧸 애니멀 토템 리딩",
        cta: "👉 나의 수호 동물 만나러 가기: https://code-destiny.com",
        copied: "카카오톡 앱이 없거나 PC에서는 링크를 복사했어요! 카카오톡에 붙여넣기 하세요 💬"
      }
    },
    en: {
      billing: {
        reasonBasic: "Animal Totem Reading",
        reasonDeep: "Deep Animal Totem Reading",
        oneLabel: "One Moonlit Card",
        threeLabel: "Three Paths in the Forest",
        fiveLabel: "Five Constellation Animals"
      },
      overlay: {
        checkingTitle: "Checking your payment...",
        checkingStatus: "Please wait a moment.",
        processing: "Processing your payment.",
        checkingPayment: "Checking your payment..."
      },
      auth: {
        requiredReason: "Please log in to use this feature.",
        confirm: "Login is required. Go to the login page?"
      },
      payment: {
        retryAfterPayment: "A one-time payment is needed. Please pay and try again.",
        krwFailed: "We could not confirm the KRW payment.",
        processError: "An error occurred while processing payment. Please try again shortly.",
        gateLoadFailed: "Could not load the payment gate. Refresh the page and try again."
      },
      slots: {
        today_guide: "Today's Guardian Message",
        past_wound: "Past Wound",
        present_energy: "Present Energy",
        integration_path: "Path of Integration",
        mind: "Mind / Thought",
        heart: "Heart / Desire",
        shadow: "Shadow",
        gift: "Hidden Gift",
        next_action: "Next Action"
      },
      cardFlip: "Flip the {slot} card",
      guidance: {
        essence: "Essence of Protection",
        whisper: "Today's Whisper",
        action: "Small Practice",
        ritual: "Short Healing Ritual",
        journaling: "Ask Yourself",
        shadow: "Shadow Warning",
        affirmation: "Today's Affirmation"
      },
      focus: {
        title: "What is weighing on you?",
        hint: "Write a question and Yeoni will read the cards around it. Leaving it blank is fine.",
        placeholder: "e.g. I am not sure whether to keep going with this.",
        chipsLabel: "If it is about",
        chips: [
          { label: "Love", value: "I am unsure how to move forward with this person." },
          { label: "Work", value: "I am wavering about whether to keep doing this work." },
          { label: "People", value: "I keep clashing with someone close and it is wearing me down." },
          { label: "Money", value: "Money worries make me anxious. Where should I start?" },
          { label: "Health", value: "My body and mind are worn out. What should I care for first?" },
          { label: "Not sure", value: "I cannot name the problem. My heart just feels heavy." }
        ],
        skip: "Just read how I feel now",
        next: "Next · Choose a ritual",
        back: "↺ Start over",
        counter: "{count}/{max}",
        profilePrefix: "",
        profileSuffix: " — reading based on this profile",
        profileChange: "Change profile"
      },
      modes: {
        badge: "✦ CHOOSE YOUR RITUAL ✦",
        title: "Pick the ritual that fits you today",
        hint: "It is not about the number of cards — it is how they are read.",
        one: {
          title: "One Moonlit Card",
          price: "KRW 3,000",
          tagline: "One animal, read all the way through",
          perks: ["Full essence and whisper text", "5 practices + healing ritual", "3 journaling prompts, shadow, affirmation"]
        },
        three: {
          title: "Three Paths in the Forest",
          price: "KRW 3,000",
          tagline: "Past → Present → Integration",
          perks: ["One story woven from three animals", "Each card tied to your question", "3 practical steps for today"]
        },
        five: {
          title: "Five Constellation Animals",
          price: "KRW 6,000",
          tagline: "Mind · Heart · Shadow · Gift · Action",
          perks: ["Deep reading across all five seats", "Shadow ↔ Gift synthesis", "3 practical steps for today"]
        },
        draw: "✦ Summon the cards",
        back: "↺ Edit my question"
      },
      draw: {
        badge: "Flip the cards in order",
        header: "One at a time, from the left",
        hint: "While you flip, Yeoni is weaving your question into the reading.",
        weaving: "Yeoni is weaving the story...",
        ready: "The story is ready"
      },
      result: {
        title: "✨ Message from your guardians",
        tabOverview: "Overview",
        yeoniTitle: "Yeoni's Reading",
        questionLabel: "Your question",
        actionPlan: "Today's steps",
        shadowGift: "Shadow ↔ Gift",
        openingTitle: "🌱 Opening",
        closingTitle: "🌸 Closing",
        save: "🗂 Save to archive",
        saved: "Saved to your archive",
        archive: "🗂 Past readings",
        archiveEmpty: "No saved readings yet.",
        archiveTitle: "Revisit a past reading",
        archiveOpen: "Open",
        archiveClose: "Close",
        degradedNote: "The connection wavered, so this is the standard reading. Your card messages are unchanged."
      },
      errors: {
        engineMissing: "The Animal Totem engine could not be loaded. Please refresh the page.",
        drawFailed: "An error occurred while summoning the cards. Please try again shortly."
      },
      share: {
        title: "🧸 Animal Totem Reading",
        cta: "👉 Meet your guardian animal: https://code-destiny.com",
        copied: "KakaoTalk is not available or you are on PC, so the link was copied. Paste it into KakaoTalk 💬"
      }
    },
    ja: {
      billing: {
        reasonBasic: "アニマルトーテムリーディング",
        reasonDeep: "アニマルトーテム深層リーディング",
        oneLabel: "月明かりの一枚",
        threeLabel: "森の三つの道",
        fiveLabel: "星座の五つの動物"
      },
      overlay: {
        checkingTitle: "お支払いを確認しています...",
        checkingStatus: "少しだけお待ちください。",
        processing: "お支払いを処理しています。",
        checkingPayment: "お支払いを確認しています..."
      },
      auth: {
        requiredReason: "ログイン後に利用できる機能です。",
        confirm: "ログインが必要です。ログインページへ移動しますか？"
      },
      payment: {
        retryAfterPayment: "単回決済が必要です。お支払い後にもう一度お試しください。",
        krwFailed: "ウォン決済を確認できませんでした。",
        processError: "お支払い処理中にエラーが発生しました。しばらくしてからもう一度お試しください。",
        gateLoadFailed: "決済ゲートを読み込めませんでした。ページを再読み込みしてもう一度お試しください。"
      },
      slots: {
        today_guide: "今日の守護メッセージ",
        past_wound: "過去の傷",
        present_energy: "現在のエネルギー",
        integration_path: "統合の道",
        mind: "理性・思考",
        heart: "感情・欲求",
        shadow: "影",
        gift: "潜在する贈り物",
        next_action: "次の行動"
      },
      cardFlip: "{slot}のカードをめくる",
      guidance: {
        essence: "守護の本質",
        whisper: "今日のささやき",
        action: "小さな実践",
        ritual: "短い癒しのリチュアル",
        journaling: "自分に問いかける",
        shadow: "影への注意",
        affirmation: "今日のアファメーション"
      },
      focus: {
        title: "今、心にかかっていることは？",
        hint: "質問を書くと、ヨニがその問いを軸にカードを読み解きます。空欄のままでも大丈夫です。",
        placeholder: "例）このまま続けていいのか分かりません。",
        chipsLabel: "こんな悩みなら",
        chips: [
          { label: "恋愛", value: "この人との関係をどう続けていけばいいか分かりません。" },
          { label: "仕事", value: "今の仕事を続けていいのか気持ちが揺れています。" },
          { label: "人間関係", value: "近しい人とすれ違ってばかりで心が疲れています。" },
          { label: "お金", value: "お金のことで焦ってしまいます。何から手をつければいいでしょう。" },
          { label: "健康", value: "心も体も疲れています。まず何を大切にすべきでしょう。" },
          { label: "分からない", value: "何が problem なのかも分からず、ただ心が重いです。" }
        ],
        skip: "今の気持ちのまま見てほしい",
        next: "次へ · 儀式を選ぶ",
        back: "↺ 最初から",
        counter: "{count}/{max}字",
        profilePrefix: "さん",
        profileSuffix: " を基準に読み解きます",
        profileChange: "プロフィール変更"
      },
      modes: {
        badge: "✦ 守護動物の儀式を選ぶ ✦",
        title: "今の心に合う儀式をお選びください",
        hint: "枚数ではなく「どう読むか」が違います。",
        one: {
          title: "月明かりの一枚",
          price: "3,000ウォン",
          tagline: "一匹をとことん読み込む",
          perks: ["本質・ささやきを全文収録", "実践5つ＋癒しのリチュアル", "ジャーナリング3問・影・アファメーション"]
        },
        three: {
          title: "森の三つの道",
          price: "3,000ウォン",
          tagline: "過去 → 現在 → 統合の流れ",
          perks: ["三匹が織りなす一つの物語", "カードごとに質問と接続", "今日の実践プラン3つ"]
        },
        five: {
          title: "星座の五つの動物",
          price: "6,000ウォン",
          tagline: "理性・感情・影・贈り物・行動",
          perks: ["五つの席すべてを深く読む", "影 ↔ 贈り物の統合解説", "今日の実践プラン3つ"]
        },
        draw: "✦ カードを召喚する",
        back: "↺ 質問を書き直す"
      },
      draw: {
        badge: "順番にカードをめくってください",
        header: "左から一枚ずつ、ゆっくりと",
        hint: "めくっている間に、ヨニがあなたの質問に沿って物語を織っています。",
        weaving: "ヨニが物語を織っています...",
        ready: "物語の準備ができました"
      },
      result: {
        title: "✨ 守護動物からのメッセージ",
        tabOverview: "総合解説",
        yeoniTitle: "ヨニの総合解説",
        questionLabel: "あなたの質問",
        actionPlan: "今日の実践プラン",
        shadowGift: "影 ↔ 贈り物",
        openingTitle: "🌱 オープニング",
        closingTitle: "🌸 クロージング",
        save: "🗂 保管する",
        saved: "保管しました",
        archive: "🗂 過去のリーディング",
        archiveEmpty: "保管されたリーディングはまだありません。",
        archiveTitle: "過去のリーディングを見る",
        archiveOpen: "開く",
        archiveClose: "閉じる",
        degradedNote: "接続が不安定だったため基本解説でお届けします。カードごとのメッセージはそのままです。"
      },
      errors: {
        engineMissing: "アニマルトーテムエンジンを読み込めませんでした。ページを再読み込みしてください。",
        drawFailed: "カード召喚中にエラーが発生しました。しばらくしてからもう一度お試しください。"
      },
      share: {
        title: "🧸 アニマルトーテムリーディング",
        cta: "👉 守護動物に会いに行く: https://code-destiny.com",
        copied: "KakaoTalkアプリがない、またはPCのためリンクをコピーしました。KakaoTalkに貼り付けてください 💬"
      }
    }
  };

  /* zh 는 예전 테이블에 아예 없어서 중국어 사용자가 한국어를 그대로 봤다.
     ja 를 베이스로 필요한 항목만 덮어쓴다(구조 중복을 만들지 않는다). */
  ANIMAL_TOTEM_TEXT_TRANSLATIONS.zh = (function() {
    function deepCopy(value) {
      return JSON.parse(JSON.stringify(value));
    }
    var zh = deepCopy(ANIMAL_TOTEM_TEXT_TRANSLATIONS.ja);
    zh.billing = {
      reasonBasic: "动物图腾解读",
      reasonDeep: "动物图腾深度解读",
      oneLabel: "月光一张",
      threeLabel: "森林三径",
      fiveLabel: "星座五兽"
    };
    zh.overlay = {
      checkingTitle: "正在确认支付...",
      checkingStatus: "请稍候。",
      processing: "正在处理支付。",
      checkingPayment: "正在确认支付..."
    };
    zh.auth = { requiredReason: "登录后即可使用此功能。", confirm: "需要登录。要前往登录页面吗？" };
    zh.payment = {
      retryAfterPayment: "需要单次支付。支付后请再试一次。",
      krwFailed: "无法确认韩元支付。",
      processError: "支付处理中发生错误。请稍后再试。",
      gateLoadFailed: "无法加载支付通道。请刷新页面后重试。"
    };
    zh.slots = {
      today_guide: "今日守护讯息",
      past_wound: "过往伤痕",
      present_energy: "当下能量",
      integration_path: "整合之路",
      mind: "理性・思考",
      heart: "情感・渴望",
      shadow: "阴影",
      gift: "潜在礼物",
      next_action: "下一步行动"
    };
    zh.cardFlip = "翻开{slot}卡片";
    zh.guidance = {
      essence: "守护的本质",
      whisper: "今日的低语",
      action: "小小实践",
      ritual: "简短疗愈仪式",
      journaling: "问问自己",
      shadow: "阴影提醒",
      affirmation: "今日的肯定语"
    };
    zh.focus = {
      title: "此刻，什么让你挂心？",
      hint: "写下问题，妍伊会围绕它为你解读卡片。留白也没关系。",
      placeholder: "例）我不确定是否该继续下去。",
      chipsLabel: "如果是这些困扰",
      chips: [
        { label: "感情", value: "我不知道该如何继续与这个人的关系。" },
        { label: "工作", value: "我在犹豫是否该继续现在的工作。" },
        { label: "人际", value: "我总是和亲近的人错过，心很累。" },
        { label: "金钱", value: "为钱的事焦虑，该从哪里着手呢。" },
        { label: "健康", value: "身心都很疲惫，该先照顾什么呢。" },
        { label: "说不清", value: "我说不清问题在哪，只是心里很沉。" }
      ],
      skip: "就照我现在的心情来看",
      next: "下一步 · 选择仪式",
      back: "↺ 重新开始",
      counter: "{count}/{max}字",
      profilePrefix: "",
      profileSuffix: " 以此档案为准解读",
      profileChange: "更换档案"
    };
    zh.modes.badge = "✦ 选择守护动物仪式 ✦";
    zh.modes.title = "请选择契合此刻心境的仪式";
    zh.modes.hint = "差别不在张数，而在如何解读。";
    zh.modes.one = {
      title: "月光一张",
      price: "3,000韩元",
      tagline: "把一只动物读到底",
      perks: ["本质与低语全文收录", "5项实践 + 疗愈仪式", "3道书写问题・阴影・肯定语"]
    };
    zh.modes.three = {
      title: "森林三径",
      price: "3,000韩元",
      tagline: "过去 → 当下 → 整合",
      perks: ["三只动物织成一个故事", "每张卡都连接你的问题", "今日3项可行步骤"]
    };
    zh.modes.five = {
      title: "星座五兽",
      price: "6,000韩元",
      tagline: "理性・情感・阴影・礼物・行动",
      perks: ["五个位置全面深读", "阴影 ↔ 礼物整合解说", "今日3项可行步骤"]
    };
    zh.modes.draw = "✦ 召唤卡片";
    zh.modes.back = "↺ 重写问题";
    zh.draw = {
      badge: "请按顺序翻开卡片",
      header: "从左边开始，一张一张慢慢来",
      hint: "在你翻牌时，妍伊正围绕你的问题编织故事。",
      weaving: "妍伊正在编织故事...",
      ready: "故事已经准备好了"
    };
    zh.result = {
      title: "✨ 守护动物的讯息",
      tabOverview: "综合解读",
      yeoniTitle: "妍伊的综合解读",
      questionLabel: "你的问题",
      actionPlan: "今日实践计划",
      shadowGift: "阴影 ↔ 礼物",
      openingTitle: "🌱 开场",
      closingTitle: "🌸 收束",
      save: "🗂 存入收藏",
      saved: "已存入收藏",
      archive: "🗂 往期解读",
      archiveEmpty: "还没有收藏的解读。",
      archiveTitle: "重温往期解读",
      archiveOpen: "打开",
      archiveClose: "关闭",
      degradedNote: "连接不稳定，为你送上基础解读。每张卡的讯息不变。"
    };
    zh.errors = {
      engineMissing: "无法加载动物图腾引擎。请刷新页面。",
      drawFailed: "召唤卡片时发生错误。请稍后再试。"
    };
    zh.share = {
      title: "🧸 动物图腾解读",
      cta: "👉 去见你的守护动物: https://code-destiny.com",
      copied: "没有 KakaoTalk 应用或在电脑上，已复制链接。请粘贴到 KakaoTalk 💬"
    };
    return zh;
  })();

  function animalTotemLocale() {
    try {
      var stored = global.localStorage && (
        localStorage.getItem("cd_locale")
        || localStorage.getItem("codeDestinyLocale")
        || localStorage.getItem("lang")
      );
      if (stored) return normalizeAnimalTotemLocale(stored);
    } catch (_) {}
    try {
      var cookieLang = String(document.cookie || "").split(";").map(function(part) { return part.trim(); }).filter(function(part) { return part.indexOf("cd_locale=") === 0; })[0];
      if (cookieLang) return normalizeAnimalTotemLocale(decodeURIComponent(cookieLang.slice("cd_locale=".length)));
    } catch (_) {}
    var attrLang = document.documentElement && (document.documentElement.getAttribute("data-cd-lang") || document.documentElement.lang);
    return normalizeAnimalTotemLocale(attrLang);
  }

  function normalizeAnimalTotemLocale(locale) {
    var value = String(locale || "ko").trim().toLowerCase();
    if (value.indexOf("ja") === 0) return "ja";
    if (value.indexOf("zh") === 0) return "zh";
    if (value.indexOf("en") === 0) return "en";
    return "ko";
  }

  function getAnimalTotemCopy() {
    return ANIMAL_TOTEM_TEXT_TRANSLATIONS[animalTotemLocale()] || ANIMAL_TOTEM_TEXT_TRANSLATIONS.ko;
  }

  function animalTotemText(path, vars) {
    var parts = String(path || "").split(".");
    var value = getAnimalTotemCopy();
    for (var i = 0; i < parts.length; i += 1) {
      value = value && value[parts[i]];
    }
    if (typeof value !== "string") return path;
    return Object.keys(vars || {}).reduce(function(text, key) {
      return text.replace(new RegExp("\\{" + key + "\\}", "g"), String(vars[key]));
    }, value);
  }

  function animalTotemValue(path) {
    var parts = String(path || "").split(".");
    var value = getAnimalTotemCopy();
    for (var i = 0; i < parts.length; i += 1) {
      value = value && value[parts[i]];
    }
    return value;
  }

  /* 🔴 결제 사양은 한 글자도 바뀌지 않았다. featureKey·cost 는 워커 레지스트리
     (worker/lib/paid-feature-registry.js)와 verify:paid-feature-billing-policy 가 강제한다. */
  var ANIMAL_TOTEM_BILLING_BY_MODE = {
    one: {
      subFeatureKey: "basic",
      featureKey: "animal-totem-basic",
      cost: 30,
      reasonKey: "billing.reasonBasic",
      labelKey: "billing.oneLabel"
    },
    three: {
      subFeatureKey: "basic",
      featureKey: "animal-totem-basic",
      cost: 30,
      reasonKey: "billing.reasonBasic",
      labelKey: "billing.threeLabel"
    },
    five: {
      subFeatureKey: "deep",
      featureKey: "animal-totem-deep",
      cost: 60,
      reasonKey: "billing.reasonDeep",
      labelKey: "billing.fiveLabel"
    }
  };

  function byId(id) { return document.getElementById(id); }
  var bodyLockState = {
    mode: null,
    bodyOverflow: "",
    htmlOverflow: ""
  };

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getBillingSpec(mode) {
    var base = ANIMAL_TOTEM_BILLING_BY_MODE[mode] || ANIMAL_TOTEM_BILLING_BY_MODE.three;
    return Object.assign({}, base, {
      reason: animalTotemText(base.reasonKey),
      label: animalTotemText(base.labelKey)
    });
  }

  /* ═══════════════════════ 성좌 시길 (결정론적 카드 아트) ═══════════════════════
   * 🔴 같은 동물은 언제 그려도 같은 문양이어야 사용자가 "그 카드"를 알아본다.
   *    그래서 Math.random 이 아니라 동물 id 를 시드로 쓴다. 외부 자산 의존 0. */

  var SIGIL_W = 100;
  var SIGIL_H = 140;

  function sigilSeed(value) {
    var hash = 2166136261;
    var text = String(value || "totem");
    for (var i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function sigilRng(seed) {
    var seedState = seed >>> 0;
    return function next() {
      seedState = (seedState + 0x6D2B79F5) >>> 0;
      var t = seedState;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function sigilRound(value) {
    return Math.round(value * 10) / 10;
  }

  /* 순수 산포는 별자리가 아니라 노이즈로 보인다.
     척추(위→아래 주선) + 곁가지 구조로 '형상'을 만든다. */
  function buildConstellation(animalId) {
    var rng = sigilRng(sigilSeed(animalId));
    var spineCount = 3 + Math.floor(rng() * 2);
    var branchCount = 2 + Math.floor(rng() * 3);
    var nodes = [];
    var edges = [];
    var topPad = 26;
    var usableH = SIGIL_H - topPad - 34;

    for (var i = 0; i < spineCount; i += 1) {
      var t = spineCount === 1 ? 0.5 : i / (spineCount - 1);
      nodes.push({
        x: sigilRound(SIGIL_W / 2 + (rng() - 0.5) * 34),
        y: sigilRound(topPad + t * usableH),
        r: i === 0 ? 3.1 : 2.1,
        spine: true
      });
      if (i > 0) edges.push([i - 1, i]);
    }

    for (var b = 0; b < branchCount; b += 1) {
      var anchorIdx = Math.floor(rng() * spineCount);
      var anchor = nodes[anchorIdx];
      var side = rng() < 0.5 ? -1 : 1;
      var reach = 16 + rng() * 20;
      nodes.push({
        x: sigilRound(Math.min(SIGIL_W - 10, Math.max(10, anchor.x + side * reach))),
        y: sigilRound(Math.min(SIGIL_H - 26, Math.max(16, anchor.y + (rng() - 0.5) * 30))),
        r: sigilRound(1.5 + rng() * 0.9),
        spine: false
      });
      edges.push([anchorIdx, nodes.length - 1]);
    }
    return { nodes: nodes, edges: edges };
  }

  function renderSigil(animal) {
    var id = (animal && animal.id) || "totem";
    var theme = (animal && animal.color_theme) || {};
    var primary = escapeHtml(theme.primary || "#f4bed1");
    var glow = escapeHtml(theme.glow || "#fde68a");
    var gradId = "atsg-" + escapeHtml(id);
    var shape = buildConstellation(id);

    var lines = shape.edges.map(function(edge) {
      var a = shape.nodes[edge[0]];
      var b = shape.nodes[edge[1]];
      return '<line x1="' + a.x + '" y1="' + a.y + '" x2="' + b.x + '" y2="' + b.y + '"/>';
    }).join("");

    var stars = shape.nodes.map(function(node) {
      return '<circle cx="' + node.x + '" cy="' + node.y + '" r="' + node.r + '" class="atsg-star'
        + (node.spine ? " atsg-star--key" : "") + '"/>';
    }).join("");

    return '<svg class="atsg" viewBox="0 0 ' + SIGIL_W + " " + SIGIL_H + '" xmlns="http://www.w3.org/2000/svg"'
      + ' aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet">'
      + '<defs><radialGradient id="' + gradId + '" cx="50%" cy="42%" r="62%">'
      + '<stop offset="0%" stop-color="' + glow + '" stop-opacity="0.5"/>'
      + '<stop offset="100%" stop-color="' + glow + '" stop-opacity="0"/>'
      + "</radialGradient></defs>"
      + '<rect width="' + SIGIL_W + '" height="' + SIGIL_H + '" fill="url(#' + gradId + ')"/>'
      + '<g class="atsg-lines" stroke="' + primary + '">' + lines + "</g>"
      + '<g fill="' + glow + '">' + stars + "</g>"
      + "</svg>";
  }

  /* 카드 뒷면은 덱 전체가 공유하는 하나의 문양이다.
     예전 뒷면은 노르드 룬(ᚠᚨᚱ) + 로마숫자 + 🌲 이모지 + 영어 대문자가 섞여 세계관이 무너져 있었다. */
  function renderCardBack() {
    var rng = sigilRng(sigilSeed("animal-totem-card-back"));
    var dots = "";
    for (var i = 0; i < 14; i += 1) {
      dots += '<circle cx="' + sigilRound(10 + rng() * (SIGIL_W - 20))
        + '" cy="' + sigilRound(10 + rng() * (SIGIL_H - 20))
        + '" r="' + sigilRound(0.7 + rng() * 0.9) + '"/>';
    }
    return '<svg class="atsg atsg--back" viewBox="0 0 ' + SIGIL_W + " " + SIGIL_H + '"'
      + ' xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet">'
      + '<g class="atsg-back-dots">' + dots + "</g>"
      + '<circle class="atsg-back-ring" cx="50" cy="62" r="30"/>'
      + '<g class="atsg-back-moon"><path d="M62 46a20 20 0 1 0 0 32 17 17 0 0 1 0-32z"/></g>'
      + "</svg>";
  }

  /* ═══════════════════════ 결제 게이트 (기존 배관 유지) ═══════════════════════ */

  function ensureLocalPaymentOverlay() {
    if (refs.paymentOverlay && document.contains(refs.paymentOverlay)) return refs.paymentOverlay;
    ensureRefs();
    var host = refs.overlay || document.body;
    if (!host) return null;
    var overlay = document.createElement("div");
    overlay.id = "animalTotemPaymentOverlay";
    overlay.setAttribute("aria-live", "polite");
    overlay.style.cssText = [
      "position:absolute",
      "inset:0",
      "display:none",
      "align-items:center",
      "justify-content:center",
      "z-index:9999",
      "background:linear-gradient(135deg,rgba(7,10,27,.82),rgba(20,12,38,.74))",
      "backdrop-filter:blur(6px)",
      "pointer-events:auto"
    ].join(";");

    var card = document.createElement("div");
    card.style.cssText = [
      "min-width:240px",
      "max-width:86%",
      "padding:14px 16px",
      "border-radius:14px",
      "border:1px solid rgba(167,243,208,.3)",
      "background:linear-gradient(135deg,rgba(15,23,42,.8),rgba(6,78,59,.45))",
      "box-shadow:0 14px 30px rgba(2,6,23,.45)",
      "text-align:center",
      "color:#ecfeff"
    ].join(";");
    card.innerHTML = '<p style="margin:0;font-size:15px;font-weight:800">' + escapeHtml(animalTotemText("overlay.checkingTitle")) + '</p><p id="animalTotemPaymentOverlayStatus" style="margin:8px 0 0;font-size:12px;opacity:.92">' + escapeHtml(animalTotemText("overlay.checkingStatus")) + '</p>';
    overlay.appendChild(card);

    var computed = host === document.body ? null : global.getComputedStyle(host);
    if (host !== document.body && computed && computed.position === "static") {
      host.style.position = "relative";
    }
    host.appendChild(overlay);
    refs.paymentOverlay = overlay;
    refs.paymentOverlayStatus = overlay.querySelector("#animalTotemPaymentOverlayStatus");
    return overlay;
  }

  function togglePaymentOverlay(show, message) {
    var text = String(message || "").trim() || animalTotemText("overlay.processing");
    if (typeof global._cdSetCoinGateOverlay === "function") {
      global._cdSetCoinGateOverlay(!!show, text);
      return;
    }
    var overlay = ensureLocalPaymentOverlay();
    if (!overlay) return;
    if (refs.paymentOverlayStatus) refs.paymentOverlayStatus.textContent = text;
    overlay.style.display = show ? "flex" : "none";
  }

  function openAuthRequiredUi() {
    if (typeof global.__cdOpenLoginRequiredModal === "function") {
      global.__cdOpenLoginRequiredModal({
        reason: animalTotemText("auth.requiredReason"),
        redirectTo: global.location.pathname + global.location.search + global.location.hash
      });
      return;
    }
    if (global.confirm(animalTotemText("auth.confirm"))) {
      global.location.href = "/login?next=" + encodeURIComponent(global.location.pathname + global.location.search);
    }
  }

  // 402 는 공용 게이트(_cdOpenPaidServiceGate)가 결제창(이용권/단건/월정석 3옵션)을 이미 재제안한 뒤에 올라온다.
  // 여기서 코인 시대의 "충전 상점 열기"를 한 겹 더 붙이면 3옵션 결제창을 우회하는 별도 경로가 되므로,
  // 자매 기능(js/tarot-*-experience.js)과 같이 안내만 남긴다.
  function openInsufficientCoinsUi() {
    global.alert(animalTotemText("payment.retryAfterPayment"));
  }

  async function consumeAnimalTotemViaCommonGate(spec) {
    if (typeof global._cdCoinGatePerUse !== "function") return null;

    var granted = false;
    try {
      /* 🔴 requestId 를 모듈 상태로 올린다. 이 값이 그대로 PointHistory.metadata.requestId 로
         저장되고(worker/routes/billing.js), 워커의 verifyPerUsePayment 가 그 열쇠로 증빙을 찾는다.
         예전에는 지역변수라 결제 후 서버에 "내가 낸 그 건"을 지목할 방법이 없었다. */
      var requestId = "animal-totem:" + spec.subFeatureKey + ":" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 9);
      state.requestId = requestId;

      var immediate = global._cdCoinGatePerUse(
        spec.cost,
        spec.reason,
        function(_transactionId, payload) {
          granted = true;
          syncUserPointsFromBilling(payload);
        },
        function() {
          granted = false;
        },
        {
          categoryKey: "animal-totem",
          subFeatureKey: spec.subFeatureKey,
          featureKey: spec.featureKey,
          serviceKey: "animal-totem",
          action: "drawAnimalTotemSpread",
          requestId: requestId,
        }
      );

      var result = immediate;
      if (result && typeof result.then === "function") {
        result = await result;
      }
      if (result == null) {
        return granted === true;
      }
      result = result || {};

      var ok = result.ok !== false;
      var code = String(result.code || (result.error && result.error.code) || "").toUpperCase();
      var status = Number(result.status || 0);

      if (!ok) {
        if (status === 401 || status === 403 || code === "AUTH_REQUIRED") {
          openAuthRequiredUi();
          return false;
        }
        if (status === 402 || code === "INSUFFICIENT_COINS") {
          openInsufficientCoinsUi();
          return false;
        }
        var errorMessage = String(result.message || (result.error && result.error.message) || animalTotemText("payment.krwFailed"));
        global.alert(errorMessage);
        return false;
      }

      syncUserPointsFromBilling(result);
      return true;
    } catch (error) {
      console.error("[animal-totem][common-coin-gate]", error);
      global.alert(animalTotemText("payment.processError"));
      return false;
    } finally {
      togglePaymentOverlay(false);
    }
  }

  function syncUserPointsFromBilling(payload) {
    try {
      var data = payload && payload.data ? payload.data : payload;
      var consume = data && data.consume ? data.consume : null;
      var user = data && data.user ? data.user : (consume && consume.user ? consume.user : null);
      var candidates = [
        data && data.balance,
        user && user.points,
        consume && consume.remainingPoints
      ];
      var remaining = NaN;
      for (var i = 0; i < candidates.length; i += 1) {
        var candidate = Number(candidates[i]);
        if (Number.isFinite(candidate)) {
          remaining = candidate;
          break;
        }
      }
      // 뱃지(__cdSetGoldenBalance)의 단위는 '월정석'이다. 위 remaining 은 data.balance 를 1순위로
      // 집는데 그건 서버가 아직 함께 내려주는 레거시 코인(user.points)이라 뱃지에 넣으면 안 된다.
      // 응답에 월정석 잔량이 실제로 있을 때만 출처를 밝혀 넘기고, 없으면 정본을 다시 받는다.
      var monthlyStoneRaw = (data && data.monthlyStoneBalance) != null
        ? data.monthlyStoneBalance
        : (data && data.membershipCreditBalance);
      var monthlyStone = Number(monthlyStoneRaw);
      if (Number.isFinite(monthlyStone) && monthlyStone >= 0) {
        if (typeof global.__cdSetGoldenBalance === "function") {
          global.__cdSetGoldenBalance(monthlyStone, { source: "coin-gate-monthly-stone" });
        }
      } else if (typeof global.__cdRefreshGoldenBalance === "function") {
        global.__cdRefreshGoldenBalance({ forceAuthProbe: true });
      }

      if (!Number.isFinite(remaining)) return;
      localStorage.setItem("fortune_user_points", String(remaining));
      var authRaw = localStorage.getItem("fortune_auth_user") || "";
      var authUser = authRaw ? JSON.parse(authRaw) : {};
      authUser.points = remaining;
      localStorage.setItem("fortune_auth_user", JSON.stringify(authUser));
    } catch (_) {}
  }

  async function consumeAnimalTotemPerUse(mode) {
    var spec = getBillingSpec(mode);
    if (!spec || !(spec.cost > 0)) return true;
    if (typeof global.__cdIsAdminLikeUser === "function" && global.__cdIsAdminLikeUser()) return true;

    var commonGateResult = await consumeAnimalTotemViaCommonGate(spec);
    if (commonGateResult !== null) return commonGateResult;
    global.alert(animalTotemText("payment.gateLoadFailed"));
    return false;
  }

  /* ═══════════════════════ 연이 종합 해설 (백그라운드 fetch) ═══════════════════════ */

  function getAuthToken() {
    try {
      return localStorage.getItem("fortune_auth_token") || localStorage.getItem("cdToken") || "";
    } catch (_) {
      return "";
    }
  }

  /* 프로필 카드는 정본이 js/destiny-profile.js 다. 여기서 새로 조회 로직을 만들지 않고
     그쪽이 발행하는 전역과 이벤트만 구독한다(CLAUDE.md 프로필 프리필 규칙). */
  function readActiveProfile() {
    try {
      var profile = global.__cdCurrentDestinyProfile;
      if (!profile || typeof profile !== "object") return null;
      return profile;
    } catch (_) {
      return null;
    }
  }

  function buildBirthSeed() {
    var profile = readActiveProfile();
    if (!profile) return null;
    var birthDate = String(profile.birthDate || profile.birth_date || "").trim();
    if (!birthDate && profile.birthYear && profile.birthMonth && profile.birthDay) {
      birthDate = [
        String(profile.birthYear).padStart(4, "0"),
        String(profile.birthMonth).padStart(2, "0"),
        String(profile.birthDay).padStart(2, "0")
      ].join("-");
    }
    if (!/^\d{4}-\d{2}-\d{2}/.test(birthDate)) return null;
    return {
      birthDate: birthDate.slice(0, 10),
      birthTime: String(profile.birthTime || "").slice(0, 5),
      gender: String(profile.gender || "").slice(0, 12),
      calendarType: String(profile.calendarType || profile.calType || "solar").slice(0, 8)
    };
  }

  /* 🔴 한 번만 호출한다. 워커의 callGeminiJsonWithRetry 가 이미 재시도 + Workers AI 폴백 체인을
     품고 있어서, 여기서 또 감싸면 시도 배수만 늘고 카드 뒤집기 예산을 넘긴다(CLAUDE.md 원칙 6).
     실패하면 정적 리딩으로 그대로 간다 — 사용자는 이미 완결된 카드별 리딩을 갖고 있다. */
  function requestYeoniNarrative() {
    state.narrative = null;
    state.narrativeSource = "";

    var engine = global.AnimalTotemContentEngine;
    if (!engine || typeof engine.buildReadingCards !== "function" || !state.spread) {
      state.narrativePromise = Promise.resolve(null);
      return;
    }

    var payload = {
      mode: state.mode,
      requestId: state.requestId,
      question: state.question,
      cards: engine.buildReadingCards(state.spread)
    };
    var birth = buildBirthSeed();
    if (birth) payload.birth = birth;

    var headers = { "Content-Type": "application/json" };
    var token = getAuthToken();
    if (token) headers.Authorization = "Bearer " + token;

    var controller = typeof AbortController === "function" ? new AbortController() : null;
    var timeoutId = controller
      ? setTimeout(function() { controller.abort(); }, NARRATIVE_REQUEST_TIMEOUT_MS)
      : null;

    state.narrativePromise = fetch("/api/animal-totem/reading", {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: controller ? controller.signal : undefined
    })
      .then(function(response) {
        return response.json().catch(function() { return null; });
      })
      .then(function(data) {
        if (!data || data.ok !== true || !data.narrative) return null;
        state.narrative = data.narrative;
        state.narrativeSource = String(data.source || "");
        return data.narrative;
      })
      .catch(function(error) {
        console.warn("[animal-totem][narrative]", String((error && error.message) || error).slice(0, 200));
        return null;
      })
      .finally(function() {
        if (timeoutId) clearTimeout(timeoutId);
      });
  }

  function waitForNarrative() {
    if (!state.narrativePromise) return Promise.resolve(null);
    if (state.narrative) return Promise.resolve(state.narrative);
    return Promise.race([
      state.narrativePromise,
      new Promise(function(resolve) { setTimeout(function() { resolve(null); }, NARRATIVE_GRACE_MS); })
    ]);
  }

  /* ═══════════════════════ 모달 골격 ═══════════════════════ */

  function shouldUseSoftBodyLock() {
    var mq = global.matchMedia ? global.matchMedia("(max-width: 900px)") : null;
    var coarse = global.matchMedia ? global.matchMedia("(pointer: coarse)") : null;
    return !!((mq && mq.matches) || (coarse && coarse.matches));
  }

  function lockBody() {
    if (bodyLockState.mode) return;
    /* 현재 overflow 상태 저장 (unlock 시 복원용) */
    bodyLockState.bodyOverflow = document.body.style.overflow || "";
    bodyLockState.htmlOverflow = (document.documentElement && document.documentElement.style.overflow) || "";
    /* 모바일: body overflow:hidden 시 iOS Safari에서 오버레이 내부 스크롤이 막힘. overscroll-behavior로 대체 */
    if (shouldUseSoftBodyLock()) {
      bodyLockState.mode = "soft";
      return;
    }
    if (global._perf && global._perf.lockBody) {
      bodyLockState.mode = "perf";
      global._perf.lockBody();
      return;
    }
    bodyLockState.mode = "fallback";
    document.body.style.overflow = "hidden";
  }

  function unlockBody() {
    if (!bodyLockState.mode) return;
    if (bodyLockState.mode === "soft") {
      document.body.style.overflow = bodyLockState.bodyOverflow;
      document.documentElement.style.overflow = bodyLockState.htmlOverflow;
    } else if (bodyLockState.mode === "perf") {
      if (global._perf && global._perf.unlockBody) global._perf.unlockBody();
    } else {
      document.body.style.overflow = bodyLockState.bodyOverflow;
    }
    bodyLockState.mode = null;
    bodyLockState.bodyOverflow = "";
    bodyLockState.htmlOverflow = "";
  }

  function ensureRefs() {
    refs.overlay = byId("animalTotemOverlay");
    refs.introStage = byId("animalTotemIntroStage");
    refs.focusStage = byId("animalTotemFocusStage");
    refs.modeStage = byId("animalTotemModeStage");
    refs.drawStage = byId("animalTotemDrawStage");
    refs.resultStage = byId("animalTotemResultStage");
    refs.cardRail = byId("animalTotemCardRail");
    refs.drawStatus = byId("animalTotemDrawStatus");
    refs.readingPanels = byId("animalTotemReadingPanels");
    refs.resultCards = byId("animalTotemResultCards");
    refs.narrativePanel = byId("animalTotemNarrative");
    refs.resultTabs = byId("animalTotemResultTabs");
    refs.archivePanel = byId("animalTotemArchive");
    refs.openingText = byId("animalTotemOpeningText");
    refs.closingText = byId("animalTotemClosingText");
    refs.flowStrip = byId("animalTotemFlowStrip");
    refs.modeGrid = refs.modeStage ? refs.modeStage.querySelector(".totem-mode-grid") : null;
    refs.modeButtons = document.querySelectorAll(".totem-mode-btn");
    refs.canvas = byId("animalTotemStarCanvas");
    refs.panel = refs.overlay ? refs.overlay.querySelector(".animal-totem-panel") : null;
    refs.closeButton = refs.overlay ? refs.overlay.querySelector(".animal-totem-close") : null;
    refs.stumpWrap = refs.overlay ? refs.overlay.querySelector(".totem-stump-wrap") : null;
    if (refs.stumpWrap) refs.stumpWrap.removeAttribute("aria-hidden");
  }

  function allStages() {
    return [refs.introStage, refs.focusStage, refs.modeStage, refs.drawStage, refs.resultStage];
  }

  function focusWithoutJump(el) {
    if (!el || typeof el.focus !== "function") return;
    try { el.focus({ preventScroll: true }); }
    catch (_) { el.focus(); }
  }

  function rememberFocusedElement() {
    var active = document.activeElement;
    if (!active || active === document.body || typeof active.focus !== "function") return;
    state.lastFocusedElement = active;
  }

  function restoreFocusToInvoker() {
    var target = state.lastFocusedElement;
    state.lastFocusedElement = null;
    if (!target) return;
    if (!document.contains(target)) return;
    if (target.hasAttribute && target.hasAttribute("disabled")) return;
    focusWithoutJump(target);
  }

  function focusModalEntryPoint() {
    ensureRefs();
    var preferred = refs.overlay && refs.overlay.querySelector('[data-action="startAnimalTotemRitual"]');
    focusWithoutJump(preferred || refs.closeButton);
  }

  function currentStageElement() {
    var stages = allStages();
    for (var i = 0; i < stages.length; i += 1) {
      if (stages[i] && stages[i].classList && stages[i].classList.contains("is-active")) return stages[i];
    }
    return null;
  }

  function syncStumpAccessibility(stageEl) {
    if (!refs.stumpWrap) return;
    var isDrawStage = stageEl === refs.drawStage;
    var shouldInert = !isDrawStage || state.isFlowBusy;
    var active = document.activeElement;
    if (shouldInert && active && refs.stumpWrap.contains(active)) {
      if (typeof active.blur === "function") active.blur();
      focusWithoutJump(refs.closeButton || refs.panel);
    }
    refs.stumpWrap.removeAttribute("aria-hidden");
    refs.stumpWrap.toggleAttribute("inert", shouldInert);
    refs.stumpWrap.setAttribute("aria-busy", state.isFlowBusy ? "true" : "false");
  }

  function updateDeckInteractivity() {
    if (!refs.cardRail) return;
    var nextIdx = state.revealedOrder.length;
    var cards = refs.cardRail.children;
    for (var i = 0; i < cards.length; i += 1) {
      var card = cards[i];
      var revealed = card.classList.contains("is-revealed");
      var enabled = !state.isFlowBusy && !revealed && i === nextIdx;
      card.classList.toggle("is-disabled", !enabled);
      card.disabled = !enabled;
      card.setAttribute("aria-disabled", enabled ? "false" : "true");
      card.tabIndex = enabled ? 0 : -1;
    }
  }

  function setFlowBusy(nextBusy) {
    state.isFlowBusy = !!nextBusy;
    if (refs.drawStage) refs.drawStage.setAttribute("aria-busy", state.isFlowBusy ? "true" : "false");
    updateDeckInteractivity();
    syncStumpAccessibility(currentStageElement());
  }

  function activateStage(stageEl) {
    allStages().forEach(function(el) {
      if (!el || !el.classList) return;
      el.classList.remove("is-active");
      el.toggleAttribute("inert", true);
      el.setAttribute("aria-hidden", "true");
    });
    if (stageEl && stageEl.classList) {
      stageEl.classList.add("is-active");
      stageEl.toggleAttribute("inert", false);
      stageEl.removeAttribute("aria-hidden");
    }
    if (refs.overlay) {
      refs.overlay.classList.toggle("is-result-view", stageEl === refs.resultStage);
    }
    if (stageEl === refs.resultStage && refs.cardRail) {
      refs.cardRail.innerHTML = "";
      refs.cardRail._totemTouchBound = false;
    }
    if (refs.overlay) refs.overlay.scrollTop = 0;
    syncStumpAccessibility(stageEl);
  }

  function startCanvas() {
    if (!refs.canvas) return;
    var c = refs.canvas;
    var rect = c.getBoundingClientRect();
    c.width = Math.max(240, Math.floor(rect.width));
    c.height = Math.max(120, Math.floor(rect.height));
    var ctx = c.getContext("2d");
    var starCount = shouldUseSoftBodyLock() ? 20 : 48;
    state.canvasStars = Array.from({ length: starCount }, function() {
      return {
        x: Math.random() * c.width,
        y: Math.random() * c.height,
        r: 0.6 + Math.random() * 1.7,
        speed: 0.12 + Math.random() * 0.44,
        alpha: 0.15 + Math.random() * 0.75
      };
    });
    function tick() {
      ctx.clearRect(0, 0, c.width, c.height);
      for (var i = 0; i < state.canvasStars.length; i += 1) {
        var s = state.canvasStars[i];
        s.y -= s.speed;
        if (s.y < -4) {
          s.y = c.height + 3;
          s.x = Math.random() * c.width;
        }
        ctx.beginPath();
        ctx.fillStyle = "rgba(255,236,168," + s.alpha.toFixed(2) + ")";
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      /* TASK5: 탭 비활성 시 RAF 중단으로 CPU/배터리 절약 */
      if (document.hidden) {
        state.canvasLoop = null;
      } else {
        state.canvasLoop = global.requestAnimationFrame(tick);
      }
    }
    stopCanvas();
    /* TASK5: visibilitychange 리스너 — 탭 복귀 시 루프 재개 */
    if (state._visibilityHandler) {
      document.removeEventListener('visibilitychange', state._visibilityHandler);
    }
    state._visibilityHandler = function() {
      if (!document.hidden && !state.canvasLoop) tick();
    };
    document.addEventListener('visibilitychange', state._visibilityHandler);
    tick();
  }

  function stopCanvas() {
    if (state.canvasLoop) {
      global.cancelAnimationFrame(state.canvasLoop);
      state.canvasLoop = null;
    }
    if (state._visibilityHandler) {
      document.removeEventListener('visibilitychange', state._visibilityHandler);
      state._visibilityHandler = null;
    }
  }

  function setMode(mode) {
    state.mode = (mode === "five" ? "five" : mode === "one" ? "one" : "three");
    ensureRefs();
    if (refs.modeGrid) {
      Array.prototype.forEach.call(refs.modeGrid.querySelectorAll(".totem-mode-btn"), function(btn) {
        var active = btn.getAttribute("data-mode") === state.mode;
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-pressed", active ? "true" : "false");
      });
    }
  }

  function slotLabel(slot) {
    return animalTotemText("slots." + slot) || slot;
  }

  /* ═══════════════════════ 질문 입력 스테이지 ═══════════════════════ */

  function readQuestionDraft() {
    try { return String(sessionStorage.getItem(QUESTION_DRAFT_KEY) || ""); }
    catch (_) { return ""; }
  }

  function writeQuestionDraft(value) {
    try {
      if (value) sessionStorage.setItem(QUESTION_DRAFT_KEY, value);
      else sessionStorage.removeItem(QUESTION_DRAFT_KEY);
    } catch (_) {}
  }

  function profileBadgeHtml() {
    var profile = readActiveProfile();
    if (!profile) return "";
    var name = String(profile.name || profile.label || "").trim();
    var seed = buildBirthSeed();
    if (!name && !seed) return "";
    var bits = [];
    if (seed && seed.birthDate) {
      var year = Number(seed.birthDate.slice(0, 4));
      if (year >= 1900) {
        var zodiac = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"][(((year - 4) % 12) + 12) % 12];
        var age = new Date().getFullYear() - year;
        if (animalTotemLocale() === "ko" && zodiac) bits.push(zodiac + "띠");
        if (age >= 10 && age < 100) bits.push(Math.floor(age / 10) * 10 + (animalTotemLocale() === "ko" ? "대" : ""));
      }
    }
    var label = escapeHtml(name) + escapeHtml(name ? animalTotemText("focus.profilePrefix") : "")
      + (bits.length ? " (" + escapeHtml(bits.join(" · ")) + ")" : "")
      + escapeHtml(animalTotemText("focus.profileSuffix"));
    return '<p class="totem-focus-profile">🐾 <span>' + label + "</span></p>";
  }

  function renderFocusStage() {
    ensureRefs();
    if (!refs.focusStage) return;
    var chips = animalTotemValue("focus.chips") || [];
    var chipHtml = chips.map(function(chip, idx) {
      return '<button type="button" class="totem-focus-chip" data-totem-chip="' + idx + '">'
        + escapeHtml(chip.label) + "</button>";
    }).join("");

    refs.focusStage.innerHTML =
      '<div class="totem-focus-head">'
      + '<h3 class="totem-focus-title">' + escapeHtml(animalTotemText("focus.title")) + "</h3>"
      + '<p class="totem-focus-hint">' + escapeHtml(animalTotemText("focus.hint")) + "</p>"
      + profileBadgeHtml()
      + "</div>"
      + '<div class="totem-focus-chips" role="group" aria-label="' + escapeHtml(animalTotemText("focus.chipsLabel")) + '">'
      + '<span class="totem-focus-chips-label">' + escapeHtml(animalTotemText("focus.chipsLabel")) + "</span>"
      + chipHtml
      + "</div>"
      + '<div class="totem-focus-field">'
      + '<textarea id="animalTotemQuestionInput" class="totem-focus-input" rows="3" maxlength="' + QUESTION_MAX + '"'
      + ' placeholder="' + escapeHtml(animalTotemText("focus.placeholder")) + '"></textarea>'
      + '<p class="totem-focus-counter" id="animalTotemQuestionCounter" aria-live="polite"></p>'
      + "</div>"
      + '<div class="totem-result-actions totem-focus-actions">'
      + '<button type="button" class="totem-btn totem-btn--spread" data-totem-focus-next>' + escapeHtml(animalTotemText("focus.next")) + "</button>"
      + '<button type="button" class="totem-btn totem-btn--subtle" data-totem-focus-skip>' + escapeHtml(animalTotemText("focus.skip")) + "</button>"
      + '<button type="button" class="totem-btn totem-btn--subtle" data-action="resetAnimalTotemFlow">' + escapeHtml(animalTotemText("focus.back")) + "</button>"
      + "</div>";

    var input = byId("animalTotemQuestionInput");
    var counter = byId("animalTotemQuestionCounter");
    function syncCounter() {
      if (!counter || !input) return;
      counter.textContent = animalTotemText("focus.counter", { count: input.value.length, max: QUESTION_MAX });
    }
    if (input) {
      input.value = state.question || readQuestionDraft();
      input.addEventListener("input", function() {
        state.question = input.value.trim().slice(0, QUESTION_MAX);
        writeQuestionDraft(state.question);
        syncCounter();
      });
      syncCounter();
    }

    /* 🔴 리스너는 컨테이너에 한 번만 건다. renderFocusStage 는 프로필 변경 때마다 다시 도는데,
       innerHTML 만 갈아끼우고 컨테이너는 그대로라 매번 붙이면 클릭이 N번 처리된다. */
    if (refs.focusStage._totemBound) return;
    refs.focusStage._totemBound = true;
    refs.focusStage.addEventListener("click", function(event) {
      var target = event.target;
      if (!target || !target.closest) return;
      var field = byId("animalTotemQuestionInput");
      var chipBtn = target.closest("[data-totem-chip]");
      if (chipBtn && field) {
        var chip = (animalTotemValue("focus.chips") || [])[Number(chipBtn.getAttribute("data-totem-chip"))];
        if (chip) {
          field.value = chip.value;
          state.question = chip.value;
          writeQuestionDraft(state.question);
          field.dispatchEvent(new Event("input", { bubbles: true }));
          focusWithoutJump(field);
        }
        return;
      }
      if (target.closest("[data-totem-focus-skip]")) {
        state.question = "";
        writeQuestionDraft("");
        if (field) {
          field.value = "";
          field.dispatchEvent(new Event("input", { bubbles: true }));
        }
        goToModeStage();
        return;
      }
      if (target.closest("[data-totem-focus-next]")) {
        if (field) state.question = field.value.trim().slice(0, QUESTION_MAX);
        goToModeStage();
      }
    });
  }

  /* ═══════════════════════ 의식 선택 스테이지 ═══════════════════════ */

  function renderModeStage() {
    ensureRefs();
    if (!refs.modeStage) return;
    var header = refs.modeStage.querySelector(".totem-mode-header");
    if (header) {
      header.innerHTML =
        '<span class="totem-mode-badge">' + escapeHtml(animalTotemText("modes.badge")) + "</span>"
        + '<h3 class="totem-mode-title">' + escapeHtml(animalTotemText("modes.title")) + "</h3>"
        + '<p class="totem-mode-hint">' + escapeHtml(animalTotemText("modes.hint")) + "</p>";
    }

    if (refs.modeGrid) {
      var order = [
        { key: "one", glyph: "☾" },
        { key: "three", glyph: "❋" },
        { key: "five", glyph: "✦" }
      ];
      refs.modeGrid.innerHTML = order.map(function(entry) {
        var copy = animalTotemValue("modes." + entry.key) || {};
        var perks = (copy.perks || []).map(function(perk) {
          return "<li>" + escapeHtml(perk) + "</li>";
        }).join("");
        return '<button type="button" class="totem-mode-btn" data-mode="' + entry.key + '"'
          + ' aria-pressed="false" data-action="setAnimalTotemSpreadMode" data-action-args="' + entry.key + '">'
          + '<span class="totem-mode-icon" aria-hidden="true">' + entry.glyph + "</span>"
          + '<span class="totem-mode-content">'
          + '<b class="totem-mode-name">' + escapeHtml(copy.title || entry.key) + "</b>"
          + '<span class="totem-mode-price">' + escapeHtml(copy.price || "") + "</span>"
          + '<span class="totem-mode-tagline">' + escapeHtml(copy.tagline || "") + "</span>"
          + '<ul class="totem-mode-perks">' + perks + "</ul>"
          + "</span></button>";
      }).join("");
    }

    var actions = refs.modeStage.querySelector(".totem-mode-actions");
    if (actions) {
      actions.innerHTML =
        '<button type="button" class="totem-btn totem-btn--spread" data-action="drawAnimalTotemSpread">'
        + escapeHtml(animalTotemText("modes.draw")) + "</button>"
        + '<button type="button" class="totem-btn totem-btn--subtle" data-totem-mode-back>'
        + escapeHtml(animalTotemText("modes.back")) + "</button>";
      // 리스너는 컨테이너에 한 번만 — renderModeStage 는 이 스테이지에 들어올 때마다 다시 돈다.
      if (!actions._totemBound) {
        actions._totemBound = true;
        actions.addEventListener("click", function(event) {
          if (event.target && event.target.closest && event.target.closest("[data-totem-mode-back]")) {
            startAnimalTotemRitual();
          }
        });
      }
    }
    setMode(state.mode);
  }

  function goToModeStage() {
    ensureRefs();
    renderModeStage();
    activateStage(refs.modeStage);
    var firstMode = refs.modeGrid && refs.modeGrid.querySelector(".totem-mode-btn.is-active");
    focusWithoutJump(firstMode);
  }

  /* ═══════════════════════ 뽑기 스테이지 ═══════════════════════ */

  function getTouchPoint(e) {
    if (e.changedTouches && e.changedTouches.length) {
      var changed = e.changedTouches[0];
      return { x: changed.clientX, y: changed.clientY };
    }
    if (e.touches && e.touches.length) {
      var touch = e.touches[0];
      return { x: touch.clientX, y: touch.clientY };
    }
    if (typeof e.clientX === "number") return { x: e.clientX, y: e.clientY };
    return null;
  }

  function bindCardRailTouch() {
    if (!refs.cardRail || refs.cardRail._totemTouchBound) return;
    refs.cardRail._totemTouchBound = true;

    refs.cardRail.addEventListener("touchstart", function(ev) {
      var pt = getTouchPoint(ev);
      if (pt) state.touchStart = { x: pt.x, y: pt.y };
    }, { passive: true });

    refs.cardRail.addEventListener("touchend", function(ev) {
      if (!state.touchStart || !state.spread) return;
      var pt = getTouchPoint(ev);
      if (!pt) return;
      var dx = Math.abs(pt.x - state.touchStart.x);
      var dy = Math.abs(pt.y - state.touchStart.y);
      if (dx > TAP_THRESHOLD || dy > TAP_THRESHOLD) {
        state.touchStart = null;
        return;
      }
      var target = ev.target && ev.target.closest && ev.target.closest(".totem-draw-card");
      if (!target || target.classList.contains("is-disabled") || target.classList.contains("is-revealed")) {
        state.touchStart = null;
        return;
      }
      var idx = parseInt(target.getAttribute("data-action-args"), 10);
      if (idx !== state.revealedOrder.length) {
        state.touchStart = null;
        return;
      }
      ev.preventDefault();
      ev.stopPropagation();
      state.touchStart = null;
      revealAnimalTotemCard(target, idx);
    }, { passive: false });
  }

  function renderDeck() {
    if (!refs.cardRail || !state.spread) return;
    refs.cardRail.innerHTML = "";
    refs.cardRail._totemTouchBound = false;
    refs.cardRail.className = "totem-card-grid totem-card-grid--" + state.spread.cards.length;
    state.revealedOrder = [];
    var cardBack = renderCardBack();

    state.spread.cards.forEach(function(entry, idx) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "totem-draw-card";
      btn.setAttribute("data-action", "revealAnimalTotemCard");
      btn.setAttribute("data-action-pass-self", "1");
      btn.setAttribute("data-action-args", String(idx));
      btn.setAttribute("aria-label", animalTotemText("cardFlip", { slot: slotLabel(entry.slot) }));
      var theme = entry.card.color_theme || {};
      if (theme.glow) btn.style.setProperty("--card-glow", theme.glow);
      if (theme.primary) btn.style.setProperty("--card-primary", theme.primary);
      if (theme.particle) btn.style.setProperty("--card-particle", theme.particle);

      btn.innerHTML =
        '<span class="totem-draw-card-inner">'
        + '<span class="totem-card-face totem-card-face--back">'
        + cardBack
        + '<small class="atc-slot">' + escapeHtml(slotLabel(entry.slot)) + "</small>"
        + "</span>"
        + '<span class="totem-card-face totem-card-face--front">'
        + renderSigil(entry.card)
        + '<span class="atc-name">' + escapeHtml(entry.card.name_ko) + "</span>"
        + '<small class="atc-cat">' + escapeHtml(entry.card.category) + "</small>"
        + '<small class="atc-emoji" aria-hidden="true">' + escapeHtml(entry.card.emoji) + "</small>"
        + "</span></span>";
      refs.cardRail.appendChild(btn);
    });
    bindCardRailTouch();
    updateDeckInteractivity();
  }

  function renderDrawStageChrome() {
    ensureRefs();
    if (!refs.drawStage) return;
    var wrap = refs.drawStage.querySelector(".totem-draw-header-wrap");
    if (!wrap) return;
    wrap.innerHTML =
      '<span class="totem-draw-badge">' + escapeHtml(animalTotemText("draw.badge")) + "</span>"
      + '<h3 class="totem-draw-header">' + escapeHtml(animalTotemText("draw.header")) + "</h3>"
      + '<p class="totem-draw-hint">' + escapeHtml(animalTotemText("draw.hint")) + "</p>"
      + '<p class="totem-draw-status" id="animalTotemDrawStatus" aria-live="polite"></p>';
    refs.drawStatus = byId("animalTotemDrawStatus");
  }

  function setDrawStatus(message, busy) {
    if (!refs.drawStatus) return;
    refs.drawStatus.textContent = message || "";
    refs.drawStatus.classList.toggle("is-busy", !!busy);
  }

  function burstAt(btn, color) {
    if (!btn) return;
    for (var i = 0; i < 14; i += 1) {
      var particle = document.createElement("i");
      particle.className = "totem-burst";
      particle.style.background = color;
      particle.style.left = "50%";
      particle.style.top = "50%";
      var angle = (Math.PI * 2 * i) / 14;
      particle.style.setProperty("--tx", Math.cos(angle) * (24 + Math.random() * 22) + "px");
      particle.style.setProperty("--ty", Math.sin(angle) * (24 + Math.random() * 22) + "px");
      btn.appendChild(particle);
      setTimeout((function(node) {
        return function() { if (node && node.parentNode) node.parentNode.removeChild(node); };
      })(particle), 700);
    }
  }

  function applyAmbientClass() {
    if (!refs.overlay || !state.spread) return;
    refs.overlay.classList.remove("env-ground", "env-air", "env-water");
    var score = { "지상": 0, "공중": 0, "물/기타": 0, "기본": 0 };
    state.spread.cards.forEach(function(item) {
      var cat = item.card.category || "기본";
      score[cat] = (score[cat] || 0) + 1;
    });
    var maxCat = "기본";
    Object.keys(score).forEach(function(key) { if (score[key] > score[maxCat]) maxCat = key; });
    if (maxCat === "지상") refs.overlay.classList.add("env-ground");
    else if (maxCat === "공중") refs.overlay.classList.add("env-air");
    else refs.overlay.classList.add("env-water");
  }

  /* ═══════════════════════ 결과 스테이지 ═══════════════════════ */

  function paragraphsHtml(value) {
    return String(value || "")
      .split(/\n{2,}/)
      .map(function(block) { return block.trim(); })
      .filter(Boolean)
      .map(function(block) { return "<p>" + escapeHtml(block).replace(/\n/g, "<br>") + "</p>"; })
      .join("");
  }

  function listHtml(items) {
    return (items || []).filter(Boolean).map(function(item) {
      return "<li>" + escapeHtml(item) + "</li>";
    }).join("");
  }

  function renderResultCards() {
    if (!refs.resultCards || !state.spread) return;
    refs.resultCards.innerHTML = "";
    refs.resultCards.className = "totem-result-cards totem-result-cards--" + state.spread.cards.length;
    state.spread.cards.forEach(function(entry, idx) {
      var card = document.createElement("button");
      card.type = "button";
      card.className = "totem-result-card";
      card.setAttribute("data-totem-tab", String(idx + 1));
      card.setAttribute("aria-label", slotLabel(entry.slot) + " — " + entry.card.name_ko);
      var theme = entry.card.color_theme || {};
      if (theme.glow) card.style.setProperty("--card-glow", theme.glow);
      if (theme.primary) card.style.setProperty("--card-primary", theme.primary);
      card.innerHTML =
        '<span class="totem-result-card-inner">'
        + renderSigil(entry.card)
        + '<span class="totem-result-card-name">' + escapeHtml(entry.card.name_ko) + "</span>"
        + '<small class="totem-result-card-slot">' + escapeHtml(slotLabel(entry.slot)) + "</small>"
        + "</span>";
      refs.resultCards.appendChild(card);
    });
  }

  function narrativeBridgeFor(slot) {
    var narrative = state.narrative;
    if (!narrative || !Array.isArray(narrative.card_bridges)) return "";
    var found = narrative.card_bridges.filter(function(bridge) { return bridge && bridge.slot === slot; })[0];
    return found ? String(found.line || "") : "";
  }

  /* 🔴 여기서 문장을 자르지 않는다. 예전에는 takeSentences(..., 2) 가 이미 집필된 본문을
     2문장으로 자르고 journaling·shadow_warning·affirmation 은 아예 렌더하지 않아,
     3,000원을 낸 사용자가 콘텐츠의 60%만 받았다. */
  function renderCardPanel(entry, idx) {
    var reading = entry.layered_reading;
    var bridge = narrativeBridgeFor(entry.slot);
    var isOne = state.mode === "one";
    var actions = isOne ? (reading.daily_actions || []) : (reading.daily_actions || []).slice(0, 3);

    return '<article class="totem-guidance-card" data-totem-panel="' + (idx + 1) + '">'
      + '<div class="totem-guidance-aura" style="--aura-color:' + escapeHtml((entry.animal.color_theme || {}).glow || "#facc15") + ';"></div>'
      + '<div class="totem-guidance-head">'
      + '<div class="totem-guidance-sigil">' + renderSigil(entry.animal) + "</div>"
      + "<div>"
      + '<p class="totem-guidance-slot">' + escapeHtml(slotLabel(entry.slot)) + "</p>"
      + '<h3 class="totem-guidance-name">' + escapeHtml(entry.animal.name_ko) + "</h3>"
      + '<p class="totem-guidance-cat">' + escapeHtml(entry.animal.category) + "</p>"
      + "</div></div>"
      + (bridge ? '<blockquote class="totem-guidance-bridge">' + escapeHtml(bridge) + "</blockquote>" : "")
      + '<section class="totem-guidance-section"><h4>' + escapeHtml(animalTotemText("guidance.essence")) + "</h4>"
      + paragraphsHtml(reading.essence) + "</section>"
      + '<section class="totem-guidance-section"><h4>' + escapeHtml(animalTotemText("guidance.whisper")) + "</h4>"
      + paragraphsHtml(reading.direct_message) + "</section>"
      + '<section class="totem-guidance-section"><h4>' + escapeHtml(animalTotemText("guidance.action")) + "</h4>"
      + "<ul>" + listHtml(actions) + "</ul></section>"
      + '<section class="totem-guidance-section"><h4>' + escapeHtml(animalTotemText("guidance.ritual")) + "</h4>"
      + paragraphsHtml(reading.ritual) + "</section>"
      + '<section class="totem-guidance-section totem-guidance-section--journal"><h4>' + escapeHtml(animalTotemText("guidance.journaling")) + "</h4>"
      + "<ul>" + listHtml(reading.journaling) + "</ul></section>"
      + '<section class="totem-guidance-section totem-guidance-section--shadow"><h4>' + escapeHtml(animalTotemText("guidance.shadow")) + "</h4>"
      + paragraphsHtml(reading.shadow_warning) + "</section>"
      + '<p class="totem-guidance-affirmation">' + escapeHtml(reading.affirmation) + "</p>"
      + "</article>";
  }

  function renderNarrativePanel() {
    var narrative = state.narrative;
    var consultation = state.consultation;
    var opening = (narrative && narrative.opening) || (consultation && consultation.opening_message) || "";
    var closing = (narrative && narrative.closing) || (consultation && consultation.closing_guidance) || "";
    var body = narrative && narrative.question_answer ? narrative.question_answer : "";
    var plan = (narrative && narrative.action_plan) || [];
    var synthesis = (narrative && narrative.shadow_gift_synthesis) || "";

    return '<article class="totem-narrative" data-totem-panel="0">'
      + '<h3 class="totem-narrative-title">' + escapeHtml(animalTotemText("result.yeoniTitle")) + "</h3>"
      + (state.question
        ? '<p class="totem-narrative-question"><span>' + escapeHtml(animalTotemText("result.questionLabel")) + "</span>"
          + escapeHtml(state.question) + "</p>"
        : "")
      + '<div class="totem-narrative-opening">' + paragraphsHtml(opening) + "</div>"
      + (body ? '<div class="totem-narrative-body">' + paragraphsHtml(body) + "</div>" : "")
      + (synthesis
        ? '<section class="totem-narrative-synthesis"><h4>' + escapeHtml(animalTotemText("result.shadowGift")) + "</h4>"
          + paragraphsHtml(synthesis) + "</section>"
        : "")
      + (plan.length
        ? '<section class="totem-narrative-plan"><h4>' + escapeHtml(animalTotemText("result.actionPlan")) + "</h4>"
          + "<ol>" + listHtml(plan) + "</ol></section>"
        : "")
      + '<div class="totem-narrative-closing">' + paragraphsHtml(closing) + "</div>"
      + (state.narrativeSource === "template"
        ? '<p class="totem-narrative-note">' + escapeHtml(animalTotemText("result.degradedNote")) + "</p>"
        : "")
      + "</article>";
  }

  function setResultTab(index) {
    state.activeResultTab = index;
    if (refs.resultTabs) {
      Array.prototype.forEach.call(refs.resultTabs.querySelectorAll("[data-totem-tab]"), function(tab) {
        var active = Number(tab.getAttribute("data-totem-tab")) === index;
        tab.classList.toggle("is-active", active);
        tab.setAttribute("aria-selected", active ? "true" : "false");
      });
    }
    if (refs.readingPanels) {
      Array.prototype.forEach.call(refs.readingPanels.querySelectorAll("[data-totem-panel]"), function(panel) {
        panel.hidden = Number(panel.getAttribute("data-totem-panel")) !== index;
      });
    }
    if (refs.resultCards) {
      Array.prototype.forEach.call(refs.resultCards.querySelectorAll("[data-totem-tab]"), function(card) {
        card.classList.toggle("is-active", Number(card.getAttribute("data-totem-tab")) === index);
      });
    }
  }

  function renderConsultation() {
    ensureRefs();
    if (!refs.readingPanels || !state.consultation) return;
    renderResultCards();

    if (refs.flowStrip) {
      refs.flowStrip.innerHTML = state.consultation.cards.map(function(entry, idx) {
        var arrow = idx < state.consultation.cards.length - 1 ? '<span class="totem-flow-arrow">→</span>' : "";
        return '<div class="totem-flow-node">'
          + '<span class="totem-flow-label">' + escapeHtml(slotLabel(entry.slot)) + "</span>"
          + '<span class="totem-flow-name">' + escapeHtml(entry.animal.name_ko) + "</span>"
          + "</div>" + arrow;
      }).join("");
    }

    if (refs.resultTabs) {
      var tabs = ['<button type="button" class="totem-tab" role="tab" data-totem-tab="0" aria-selected="false">'
        + escapeHtml(animalTotemText("result.tabOverview")) + "</button>"];
      state.consultation.cards.forEach(function(entry, idx) {
        tabs.push('<button type="button" class="totem-tab" role="tab" data-totem-tab="' + (idx + 1) + '" aria-selected="false">'
          + escapeHtml(entry.animal.name_ko) + "</button>");
      });
      refs.resultTabs.innerHTML = tabs.join("");
    }

    refs.readingPanels.innerHTML = renderNarrativePanel()
      + state.consultation.cards.map(renderCardPanel).join("");

    /* 결과 액션 버튼 라벨은 셸이 아니라 이 테이블에서 온다(로케일 4종).
       저장 버튼은 리딩마다 다시 눌릴 수 있어야 하므로 상태를 초기화한다. */
    var saveBtn = refs.resultStage && refs.resultStage.querySelector("[data-totem-save]");
    if (saveBtn) {
      saveBtn.textContent = animalTotemText("result.save");
      saveBtn.disabled = false;
    }
    var archiveBtn = refs.resultStage && refs.resultStage.querySelector("[data-totem-archive]");
    if (archiveBtn) archiveBtn.textContent = animalTotemText("result.archive");

    setResultTab(0);
  }

  function bindResultInteractions() {
    if (!refs.resultStage || refs.resultStage._totemTabsBound) return;
    refs.resultStage._totemTabsBound = true;
    refs.resultStage.addEventListener("click", function(event) {
      var tab = event.target && event.target.closest && event.target.closest("[data-totem-tab]");
      if (tab) {
        setResultTab(Number(tab.getAttribute("data-totem-tab")) || 0);
        return;
      }
      if (event.target && event.target.closest && event.target.closest("[data-totem-save]")) {
        saveCurrentReadingToArchive(event.target.closest("[data-totem-save]"));
        return;
      }
      if (event.target && event.target.closest && event.target.closest("[data-totem-archive]")) {
        toggleArchivePanel();
      }
    });
  }

  /* ═══════════════════════ 보관함 (localStorage) ═══════════════════════ */

  /* 회당결제인데 모달을 닫으면 결과가 사라지던 것이 체감 가치를 크게 깎았다.
     카드 id 만 저장하고 본문은 엔진에서 다시 조립하므로 저장 용량이 작다. */
  function readArchive() {
    try {
      var raw = localStorage.getItem(ARCHIVE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function writeArchive(entries) {
    try {
      localStorage.setItem(ARCHIVE_KEY, JSON.stringify(entries.slice(0, ARCHIVE_LIMIT)));
      return true;
    } catch (_) {
      return false;
    }
  }

  function saveCurrentReadingToArchive(button) {
    if (!state.spread || !state.consultation) return;
    var entries = readArchive();
    entries.unshift({
      id: state.requestId || String(Date.now()),
      savedAt: new Date().toISOString(),
      mode: state.mode,
      question: state.question,
      narrative: state.narrative || null,
      narrativeSource: state.narrativeSource || "",
      cards: state.spread.cards.map(function(entry) {
        return { slot: entry.slot, animalId: entry.card.id };
      })
    });
    writeArchive(entries);
    if (button) {
      button.textContent = animalTotemText("result.saved");
      button.disabled = true;
    }
  }

  function restoreArchivedReading(entryId) {
    var engine = global.AnimalTotemContentEngine;
    if (!engine) return;
    var record = readArchive().filter(function(item) { return item && item.id === entryId; })[0];
    if (!record) return;

    var cards = (record.cards || []).map(function(item) {
      var animal = engine.getAnimalById(item.animalId);
      return animal ? { slot: item.slot, card: animal } : null;
    }).filter(Boolean);
    if (!cards.length) return;

    state.mode = record.mode || "three";
    state.question = String(record.question || "");
    state.spread = { mode: state.mode, cards: cards, created_at: record.savedAt };
    state.consultation = engine.composeConsultation(state.spread, { focus: state.question });
    state.narrative = record.narrative || null;
    state.narrativeSource = record.narrativeSource || "";
    state.requestId = record.id || "";

    renderConsultation();
    applyAmbientClass();
    bindResultInteractions();
    activateStage(refs.resultStage);
  }

  function toggleArchivePanel() {
    ensureRefs();
    if (!refs.archivePanel) return;
    var isOpen = refs.archivePanel.hasAttribute("hidden") === false;
    if (isOpen) {
      refs.archivePanel.setAttribute("hidden", "");
      refs.archivePanel.innerHTML = "";
      return;
    }
    var entries = readArchive();
    var slots = (global.AnimalTotemContentEngine && global.AnimalTotemContentEngine.slotLabels) || {};
    refs.archivePanel.innerHTML =
      '<h4 class="totem-archive-title">' + escapeHtml(animalTotemText("result.archiveTitle")) + "</h4>"
      + (entries.length
        ? '<ul class="totem-archive-list">' + entries.map(function(entry) {
          var names = (entry.cards || []).map(function(card) {
            var animal = global.AnimalTotemContentEngine && global.AnimalTotemContentEngine.getAnimalById(card.animalId);
            return animal ? animal.name_ko : (slots[card.slot] || "");
          }).filter(Boolean).join(" · ");
          var when = String(entry.savedAt || "").slice(0, 10);
          return '<li class="totem-archive-item">'
            + '<div class="totem-archive-meta"><b>' + escapeHtml(names) + "</b>"
            + '<span>' + escapeHtml(when) + "</span></div>"
            + (entry.question ? '<p class="totem-archive-q">' + escapeHtml(entry.question) + "</p>" : "")
            + '<button type="button" class="totem-btn totem-btn--subtle" data-totem-restore="' + escapeHtml(entry.id) + '">'
            + escapeHtml(animalTotemText("result.archiveOpen")) + "</button></li>";
        }).join("") + "</ul>"
        : '<p class="totem-archive-empty">' + escapeHtml(animalTotemText("result.archiveEmpty")) + "</p>");
    refs.archivePanel.removeAttribute("hidden");

    if (!refs.archivePanel._totemBound) {
      refs.archivePanel._totemBound = true;
      refs.archivePanel.addEventListener("click", function(event) {
        var restoreBtn = event.target && event.target.closest && event.target.closest("[data-totem-restore]");
        if (!restoreBtn) return;
        refs.archivePanel.setAttribute("hidden", "");
        refs.archivePanel.innerHTML = "";
        restoreArchivedReading(restoreBtn.getAttribute("data-totem-restore"));
      });
    }
  }

  /* ═══════════════════════ 공개 액션 ═══════════════════════ */

  function openAnimalTotemModal() {
    try {
      ensureRefs();
      if (!refs.overlay) return;
      rememberFocusedElement();
      /* 이미 열려 있으면 중복 호출 방지 (이중 핸들러/더블탭 시 화면 멈춤 방지) */
      if (refs.overlay.classList.contains("is-open")) return;
      /* 모바일: overlay가 main 내부에 있으면 transform/overflow 조상으로 viewport 전체 미덮음 → body로 이동 */
      if (refs.overlay.parentNode && refs.overlay.parentNode !== document.body) {
        document.body.appendChild(refs.overlay);
      }
      refs.overlay.classList.remove("env-ground", "env-air", "env-water");
      refs.overlay.classList.add("is-open");
      refs.overlay.setAttribute("role", "dialog");
      refs.overlay.setAttribute("aria-modal", "true");
      refs.overlay.removeAttribute("aria-hidden");
      refs.overlay.toggleAttribute("inert", false);
      refs.overlay.scrollTop = 0;
      /* 모바일: 언어 선택 등 상단 UI가 overlay 위에 보이지 않도록 (z-index·겹침 방지) */
      document.body.classList.add("animal-totem-modal-open");
      lockBody();
      resetAnimalTotemFlow();
      focusModalEntryPoint();
      /* 모바일: 애니메이션 과부하로 Main Thread 차단 방지 — 다음 프레임으로 미룬다.
         예전에는 룬 필드 26개 + 부유 이모지 18개를 만드느라 requestIdleCallback 으로 3단 분산까지
         해야 했는데, 그 장식을 걷어내고 별 캔버스만 남겨 한 번에 켤 수 있게 됐다. */
      var raf = global.requestAnimationFrame || function(cb) { return setTimeout(cb, 0); };
      raf(function() {
        try { startCanvas(); }
        catch (err) { console.error("[animal-totem] init error:", err); }
      });
    } catch (err) {
      console.error("[animal-totem] openAnimalTotemModal error:", err);
      try {
        if (refs.overlay) refs.overlay.classList.remove("is-open");
        document.body.classList.remove("animal-totem-modal-open");
        unlockBody();
      } catch (_) {}
    }
  }

  function closeAnimalTotemModal() {
    ensureRefs();
    if (!refs.overlay) return;
    setFlowBusy(false);
    refs.overlay.classList.remove("is-open");
    refs.overlay.setAttribute("aria-hidden", "true");
    refs.overlay.toggleAttribute("inert", true);
    document.body.classList.remove("animal-totem-modal-open");
    unlockBody();
    stopCanvas();
    /* 모바일: body overflow 복원 보장 (다른 경로로 닫혀도 스크롤 잠금 해제) */
    try {
      if (document.body && document.body.style.overflow === "hidden" && !bodyLockState.mode) {
        document.body.style.overflow = bodyLockState.bodyOverflow || "";
      }
    } catch (_) {}
    setTimeout(restoreFocusToInvoker, 0);
  }

  function resetAnimalTotemFlow() {
    ensureRefs();
    state.spread = null;
    state.consultation = null;
    state.narrative = null;
    state.narrativePromise = null;
    state.narrativeSource = "";
    state.revealedOrder = [];
    state.activeResultTab = 0;
    setFlowBusy(false);
    activateStage(refs.introStage);
    if (refs.cardRail) refs.cardRail.innerHTML = "";
    if (refs.resultCards) refs.resultCards.innerHTML = "";
    if (refs.readingPanels) refs.readingPanels.innerHTML = "";
    if (refs.resultTabs) refs.resultTabs.innerHTML = "";
    if (refs.archivePanel) {
      refs.archivePanel.setAttribute("hidden", "");
      refs.archivePanel.innerHTML = "";
    }
    setMode("three");
  }

  function startAnimalTotemRitual() {
    ensureRefs();
    renderFocusStage();
    activateStage(refs.focusStage);
    focusWithoutJump(byId("animalTotemQuestionInput"));
  }

  function setAnimalTotemSpreadMode(mode) {
    ensureRefs();
    setMode(mode);
  }

  function drawAnimalTotemSpread() {
    ensureRefs();
    if (state.isFlowBusy) return;
    if (!global.AnimalTotemContentEngine) {
      alert(animalTotemText("errors.engineMissing"));
      return;
    }
    setFlowBusy(true);
    consumeAnimalTotemPerUse(state.mode).then(function(ok) {
      if (!ok) {
        setFlowBusy(false);
        return;
      }
      state.spread = global.AnimalTotemContentEngine.getRandomSpread(state.mode);
      state.consultation = global.AnimalTotemContentEngine.composeConsultation(state.spread, { focus: state.question });

      /* 🔴 결제 성공 직후 곧바로 쏜다. 사용자가 카드를 뒤집는 10~20초가 로딩 시간이 된다.
         await 하지 않는다 — 여기서 기다리면 별도 로딩 화면이 생기고 리추얼의 결이 끊긴다. */
      requestYeoniNarrative();

      renderDrawStageChrome();
      renderDeck();
      applyAmbientClass();
      activateStage(refs.drawStage);
      setDrawStatus("", false);
      setFlowBusy(false);
      focusWithoutJump(refs.cardRail && refs.cardRail.children && refs.cardRail.children[0]);
    }).catch(function(error) {
      console.error("[animal-totem][draw]", error);
      setFlowBusy(false);
      alert(animalTotemText("errors.drawFailed"));
    });
  }

  function revealAnimalTotemCard(btn, idxRaw) {
    ensureRefs();
    if (!state.spread || !state.consultation) return;
    if (state.isFlowBusy) return;
    var idx = parseInt(idxRaw, 10);
    if (Number.isNaN(idx)) return;
    if (state.revealedOrder.indexOf(idx) >= 0) return;
    if (idx !== state.revealedOrder.length) return;
    if (navigator.vibrate) navigator.vibrate(12);
    var card = refs.cardRail ? refs.cardRail.children[idx] : null;
    if (!card) return;
    setFlowBusy(true);
    card.classList.add("is-revealed");
    card.classList.remove("is-disabled");
    burstAt(card, (state.spread.cards[idx].card.color_theme || {}).glow || "#facc15");
    state.revealedOrder.push(idx);
    updateDeckInteractivity();

    if (state.revealedOrder.length === state.spread.cards.length) {
      /* 마지막 카드 — 여기서만 해설을 기다린다. 이미 도착했으면 즉시 통과한다. */
      if (!state.narrative) setDrawStatus(animalTotemText("draw.weaving"), true);
      waitForNarrative().then(function() {
        setDrawStatus(state.narrative ? animalTotemText("draw.ready") : "", false);
        renderConsultation();
        bindResultInteractions();
        activateStage(refs.resultStage);
        setFlowBusy(false);
      });
      return;
    }
    setTimeout(function() {
      setFlowBusy(false);
      focusWithoutJump(refs.cardRail && refs.cardRail.children ? refs.cardRail.children[state.revealedOrder.length] : null);
    }, 120);
  }

  function shareAnimalTotemResult() {
    if (!state.consultation) return;
    var titles = state.consultation.cards.map(function(entry) {
      return entry.animal.emoji + " " + entry.animal.name_ko;
    }).join(" · ");
    var lead = (state.narrative && state.narrative.opening) || state.consultation.opening_message || "";
    var text = animalTotemText("share.title") + "\n" + titles
      + (state.question ? "\n\nQ. " + state.question : "")
      + "\n\n" + lead + "\n\n" + animalTotemText("share.cta");
    var anchor = document.createElement("a");
    anchor.href = "kakaotalk://send?text=" + encodeURIComponent(text);
    anchor.click();
    setTimeout(function() {
      if (typeof copyToClipboard === "function") {
        copyToClipboard(text, animalTotemText("share.copied"));
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function() { alert(animalTotemText("share.copied")); }).catch(function() { alert(text); });
      } else {
        alert(text);
      }
    }, 800);
  }

  /* 프로필을 바꾸면 질문 스테이지의 배지를 갱신한다(정본은 js/destiny-profile.js). */
  function handleProfileChanged() {
    if (!refs.focusStage || !refs.focusStage.classList.contains("is-active")) return;
    var input = byId("animalTotemQuestionInput");
    if (input) state.question = input.value.trim().slice(0, QUESTION_MAX);
    renderFocusStage();
  }
  global.addEventListener("destinyProfileChanged", handleProfileChanged);
  document.addEventListener("destinyProfileChanged", handleProfileChanged);

  global.openAnimalTotemModal = openAnimalTotemModal;
  global.closeAnimalTotemModal = closeAnimalTotemModal;
  global.startAnimalTotemRitual = startAnimalTotemRitual;
  global.setAnimalTotemSpreadMode = setAnimalTotemSpreadMode;
  global.drawAnimalTotemSpread = drawAnimalTotemSpread;
  global.revealAnimalTotemCard = revealAnimalTotemCard;
  global.resetAnimalTotemFlow = resetAnimalTotemFlow;
  global.shareAnimalTotemResult = shareAnimalTotemResult;
  global.startAnimalTotemMeditation = startAnimalTotemRitual;
  global.drawAnimalTotemCard = revealAnimalTotemCard;
})(window);
