// 버그 제보실(/feedback) 전 화면 공용 로케일 카피.
// destiny-compass/nakshatra 의 _lib/copy.ts 와 같은 패턴 — getCurrentLoadingLocale()/languagechange 이벤트로 갱신.
// FeedbackCategoryId(DB 스키마 고정값)는 절대 바꾸지 않는다 — 라벨/힌트/필드 문구만 대상.

import { useEffect, useState } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

export type FeedbackCategoryId =
  | "bug" | "feature" | "ui" | "typo" | "ai-quality" | "payment" | "translation" | "performance" | "mobile" | "etc";

interface CategoryCopy {
  label: string;
  hint: string;
  warning?: string;
  rewardNote?: string;
  fields: Record<string, { label: string; placeholder: string; options?: string[] }>;
}

export interface FeedbackCopy {
  // ── FeedbackHero ──────────────────────────────────────
  heroEyebrow: string;
  heroTitle: string;
  heroBodyLine1: string;
  heroBodyLine2: string;
  heroImageAlt: string;
  responseTimeNote: string;

  // ── FeedbackTopNav ────────────────────────────────────
  topNavAriaLabel: string;
  backButtonAriaLabel: string;
  backButtonLabel: string;
  homeButtonLabel: string;

  // ── FeedbackClient ────────────────────────────────────
  submitErrorFallback: string;
  draftBannerPrefix: string;
  draftResumeButton: string;
  draftDiscardButton: string;
  categoryQuestionLabel: string;

  // ── CategoryGrid ──────────────────────────────────────
  categoryGroupAriaLabel: string;

  // ── LoginGate ─────────────────────────────────────────
  loginGateTitle: string;
  loginGateBody: string;
  loginGateButton: string;

  // ── FeedbackForm ──────────────────────────────────────
  titleLabel: string;
  titlePlaceholder: string;
  contentLabel: string;
  contentPlaceholder: string;
  contentMinLengthSuffix: (min: number) => string;
  urlLabel: string;
  urlAutoFilledBadge: string;
  attachmentDisabledNote: string;
  draftAutoSavedDefault: string;
  draftSavedPrefix: string;
  submittingButton: string;
  uploadingButton: string;
  submitAuthedButton: string;
  submitUnauthedButton: string;

  // ── AttachmentDropzone ────────────────────────────────
  attachmentSectionLabel: string;
  attachmentEmphasizeBadge: string;
  attachmentCountSuffix: (max: number, perFileSize: string) => string;
  attachmentPickButton: string;
  attachmentCameraButton: string;
  attachmentDragHint: string;
  attachmentUploadingText: (count: number) => string;
  attachmentPreviewAlt: string;
  attachmentRemoveAriaLabel: string;
  attachmentPrivacyNote: string;

  // ── EnvironmentPanel ──────────────────────────────────
  envIntroPrefix: string;
  envIntroStrong: string;
  envIntroSuffix: string;
  envDetailsSummary: string;
  envSentTitle: string;
  envNotCollectedTitle: string;
  envPrivacyPrefix: string;
  envPrivacyLinkText: string;
  envPrivacySuffix: string;
  envToggleLabel: string;
  envDisabledNote: string;

  // ── SuccessScreen ─────────────────────────────────────
  successImageAlt: string;
  successTitle: string;
  successBody: string;
  ticketNoLabel: string;
  ticketCopyAriaLabel: string;
  writeAnotherButton: string;
  goHomeButton: string;

  // ── _lib/environment.ts ───────────────────────────────
  envLabelUrl: string;
  envLabelUserAgent: string;
  envLabelPlatform: string;
  envLabelViewport: string;
  envLabelScreen: string;
  envLabelDpr: string;
  envLabelLanguage: string;
  envLabelTimezone: string;
  envLabelTheme: string;
  envLabelConnection: string;
  envLabelAppVersion: string;
  envLabelBuildVersion: string;
  envLabelRuntime: string;
  envLabelSubmittedAt: string;
  notCollectedIp: string;
  notCollectedPersonalInfo: string;
  notCollectedCookies: string;
  notCollectedOtherTabs: string;
  notCollectedClipboard: string;
  personaNeo: string;
  personaYeoni: string;
  schemeDark: string;
  schemeLight: string;

  // ── _lib/api.ts ───────────────────────────────────────
  apiErrorLoginRequired: string;
  apiErrorTooFrequent: string;
  apiErrorTransient: string;
  apiErrorSubmitFailed: string;

  // ── _lib/attachmentUpload.ts ──────────────────────────
  uploadErrorNoFile: string;
  uploadErrorBadType: string;
  uploadErrorEmptyFile: string;
  uploadErrorTooLarge: (maxSizeLabel: string) => string;
  uploadErrorDimensionRead: string;
  uploadErrorOptimizeLoad: string;
  uploadErrorTooLargeShort: string;
  uploadErrorStorageUnavailable: string;
  uploadErrorGeneric: string;

  // ── FeedbackCategories ────────────────────────────────
  categories: Record<FeedbackCategoryId, CategoryCopy>;
}

const FEEDBACK_COPY_EN: FeedbackCopy = {
  heroEyebrow: "CODE DESTINY LAB",
  heroTitle: "Bug Report Room",
  heroBodyLine1: "When something looks off, a result feels strange, or you think “I wish this existed.”",
  heroBodyLine2: "Even one line helps — the lab reads it directly.",
  heroImageAlt: "A flower-pig waiting for your feedback",
  responseTimeNote: "Average review 1–2 days · We'll reply to your signup email",

  topNavAriaLabel: "Feedback room navigation",
  backButtonAriaLabel: "Go to the previous page",
  backButtonLabel: "Back",
  homeButtonLabel: "Home",

  submitErrorFallback: "Couldn't send the feedback.",
  draftBannerPrefix: "You have a draft in progress · ",
  draftResumeButton: "Resume writing",
  draftDiscardButton: "Start over",
  categoryQuestionLabel: "What's this about?",

  categoryGroupAriaLabel: "Feedback type",

  loginGateTitle: "Feel free to write first",
  loginGateBody: "You'll only need to sign in when sending (so we can reply). What you've written is saved automatically and carries over after you sign in.",
  loginGateButton: "Sign in",

  titleLabel: "Title",
  titlePlaceholder: "Summarize it in one line",
  contentLabel: "Details",
  contentPlaceholder: "Write freely about what situation and what felt off. You can paste a screenshot right here.",
  contentMinLengthSuffix: (min) => ` · Please enter at least ${min} characters`,
  urlLabel: "Page you're reporting about",
  urlAutoFilledBadge: "Auto-filled",
  attachmentDisabledNote: "Sign in to attach screenshots. What you've written so far is saved as is.",
  draftAutoSavedDefault: "What you write is saved automatically",
  draftSavedPrefix: "Draft saved ",
  submittingButton: "Sending…",
  uploadingButton: "Uploading image…",
  submitAuthedButton: "Send feedback",
  submitUnauthedButton: "Sign in and send",

  attachmentSectionLabel: "Attach screenshots",
  attachmentEmphasizeBadge: "This really helps",
  attachmentCountSuffix: (max, perFileSize) => `/${max} · up to ${perFileSize} each`,
  attachmentPickButton: "Choose photo",
  attachmentCameraButton: "Take photo",
  attachmentDragHint: "Or drag it here · paste into the text (Ctrl+V)",
  attachmentUploadingText: (count) => `Uploading ${count} image(s)…`,
  attachmentPreviewAlt: "Preview of the attached screenshot",
  attachmentRemoveAriaLabel: "Remove attachment",
  attachmentPrivacyNote: "Before attaching, please check that no personal info (name · contact · someone else's conversation) is visible.",

  envIntroPrefix: "To accurately reproduce the issue, we send your ",
  envIntroStrong: "browser · screen size · language · timezone · app version",
  envIntroSuffix: " together.",
  envDetailsSummary: "What gets sent along?",
  envSentTitle: "Information sent",
  envNotCollectedTitle: "Information we don't collect",
  envPrivacyPrefix: "See the ",
  envPrivacyLinkText: "Privacy Policy",
  envPrivacySuffix: " for details.",
  envToggleLabel: "Send environment info too",
  envDisabledNote: "Without environment info, it may take longer to confirm since the issue is harder to reproduce.",

  successImageAlt: "A flower-pig thanking you with a hug",
  successTitle: "Thank you!",
  successBody: "Your feedback helps make CODE DESTINY a better service. Our developers will review it carefully and reflect it in an update.",
  ticketNoLabel: "Ticket number",
  ticketCopyAriaLabel: "Copy ticket number",
  writeAnotherButton: "Send another one",
  goHomeButton: "Home",

  envLabelUrl: "Page you're reporting about",
  envLabelUserAgent: "Browser info",
  envLabelPlatform: "OS",
  envLabelViewport: "Window size",
  envLabelScreen: "Screen resolution",
  envLabelDpr: "Screen scale",
  envLabelLanguage: "Language setting",
  envLabelTimezone: "Timezone",
  envLabelTheme: "Theme",
  envLabelConnection: "Network type",
  envLabelAppVersion: "App version",
  envLabelBuildVersion: "Build",
  envLabelRuntime: "Runtime",
  envLabelSubmittedAt: "Submitted at",
  notCollectedIp: "IP address · location",
  notCollectedPersonalInfo: "Personal info you didn't type in directly, such as name or contact",
  notCollectedCookies: "Cookie · login token values",
  notCollectedOtherTabs: "Information from other tabs or sites",
  notCollectedClipboard: "Clipboard contents",
  personaNeo: "Neo",
  personaYeoni: "Yeoni",
  schemeDark: "Dark",
  schemeLight: "Light",

  apiErrorLoginRequired: "You need to sign in.",
  apiErrorTooFrequent: "Too many reports. Please try again in a moment.",
  apiErrorTransient: "Temporary error. Please send it again in a moment.",
  apiErrorSubmitFailed: "Couldn't send the feedback. Please try again in a moment.",

  uploadErrorNoFile: "Please choose an image file.",
  uploadErrorBadType: "Only jpg, png, or webp images can be attached.",
  uploadErrorEmptyFile: "An empty file can't be attached.",
  uploadErrorTooLarge: (maxSizeLabel) => `Images up to ${maxSizeLabel} can be attached.`,
  uploadErrorDimensionRead: "Couldn't read the image dimensions.",
  uploadErrorOptimizeLoad: "Failed to load the image while optimizing it.",
  uploadErrorTooLargeShort: "The image is too large.",
  uploadErrorStorageUnavailable: "Attachment storage is unavailable. Please send the report without an attachment.",
  uploadErrorGeneric: "Couldn't upload the image.",

  categories: {
    bug: {
      label: "Bug", hint: "Something isn't working",
      rewardNote: "If confirmed as a real bug, we'll give you 300 moonstones per report.",
      fields: {
        repro: { label: "Steps to reproduce", placeholder: "1. On the Saju result screen\n2. Tap the 'Share' button at the bottom\n3. Nothing happens" },
        expected: { label: "Expected result", placeholder: "I expected the share sheet to open" },
        actual: { label: "Actual result", placeholder: "The screen went dark for a moment and stayed that way" },
      },
    },
    feature: {
      label: "Feature request", hint: "I wish this existed",
      fields: {
        expected: { label: "Why is this feature needed?", placeholder: "I'd like to compare compatibility results side by side with a friend" },
      },
    },
    ui: {
      label: "UI improvement", hint: "It's uncomfortable to look at",
      fields: {
        expected: { label: "How should it change?", placeholder: "The text is too small to read. It'd be nice if it were a bit bigger" },
      },
    },
    typo: {
      label: "Typo", hint: "Text is wrong",
      fields: {
        wrongText: { label: "The wrong text", placeholder: "Please paste it exactly as shown on screen" },
        suggestedText: { label: "Please fix it to this", placeholder: "Your suggested text" },
      },
    },
    "ai-quality": {
      label: "AI result quality", hint: "The answer seems off",
      fields: {
        featureName: { label: "Which feature was it?", placeholder: "e.g. Saju expert consultation, Tarot reading" },
        inputSummary: { label: "What you entered", placeholder: "What question or info did you enter?" },
        outputSummary: { label: "What felt off about the answer", placeholder: "Please paste or summarize the answer" },
      },
    },
    payment: {
      label: "Payment issue", hint: "Payment isn't going through",
      warning: "Never enter payment info like card number, password, or CVC. An order number alone is enough to look it up.",
      fields: {
        orderId: { label: "Order number", placeholder: "You can find it on the order history screen" },
        payMethod: { label: "Payment method", placeholder: "Please choose", options: ["One-time payment (card)", "Pass", "Moonstones", "Other"] },
      },
    },
    translation: {
      label: "Translation error", hint: "The translation feels off",
      fields: {
        language: { label: "Language", placeholder: "Please choose", options: ["English", "日本語", "中文", "Other"] },
        wrongText: { label: "Awkward translation", placeholder: "The text shown on screen" },
        suggestedText: { label: "Suggested translation", placeholder: "It would read more naturally like this" },
      },
    },
    performance: {
      label: "Slowness", hint: "It's too slow",
      fields: {
        delay: {
          label: "How long did you wait?", placeholder: "Please choose",
          options: ["Under 3s but felt sluggish", "3–10s", "10–30s", "Over 30s", "Never finished"],
        },
        network: { label: "Network", placeholder: "Checked automatically" },
      },
    },
    mobile: {
      label: "Mobile-only issue", hint: "Only wrong on my phone",
      fields: {
        device: { label: "Device name", placeholder: "e.g. iPhone 15 Pro, Galaxy S24" },
        browser: { label: "Browser", placeholder: "Checked automatically" },
      },
    },
    etc: { label: "Other", hint: "Anything else", fields: {} },
  },
};

const FEEDBACK_COPY: Partial<Record<LoadingLocale, FeedbackCopy>> = {
  ko: {
    heroEyebrow: "CODE DESTINY 연구소",
    heroTitle: "버그 제보실",
    heroBodyLine1: "화면이 이상하거나, 결과가 어색하거나, “이런 게 있었으면” 싶을 때.",
    heroBodyLine2: "한 줄이라도 좋으니 알려주세요 — 연구소가 직접 읽습니다.",
    heroImageAlt: "의견을 기다리는 꽃돼지 연이",
    responseTimeNote: "평균 확인 1~2일 · 답변은 가입하신 이메일로 보내드립니다",

    topNavAriaLabel: "제보실 내비게이션",
    backButtonAriaLabel: "이전 페이지로 이동",
    backButtonLabel: "뒤로",
    homeButtonLabel: "홈",

    submitErrorFallback: "제보 전송에 실패했습니다.",
    draftBannerPrefix: "작성 중이던 내용이 있어요 · ",
    draftResumeButton: "이어서 쓰기",
    draftDiscardButton: "새로 쓰기",
    categoryQuestionLabel: "어떤 이야기인가요?",

    categoryGroupAriaLabel: "제보 유형",

    loginGateTitle: "먼저 편하게 작성하세요",
    loginGateBody: "보낼 때만 로그인이 필요해요(회신을 드리기 위해서예요). 지금 쓰신 내용은 자동 저장돼서 로그인 후 그대로 이어집니다.",
    loginGateButton: "로그인",

    titleLabel: "제목",
    titlePlaceholder: "한 줄로 요약해 주세요",
    contentLabel: "내용",
    contentPlaceholder: "어떤 상황에서 무엇이 이상했는지 편하게 적어주세요. 스크린샷은 여기에 바로 붙여넣어도 됩니다.",
    contentMinLengthSuffix: (min) => ` · ${min}자 이상 입력해 주세요`,
    urlLabel: "제보 대상 페이지",
    urlAutoFilledBadge: "자동 입력됨",
    attachmentDisabledNote: "로그인하면 스크린샷을 첨부할 수 있어요. 지금 쓰신 내용은 그대로 저장됩니다.",
    draftAutoSavedDefault: "작성 중인 내용은 자동으로 저장됩니다",
    draftSavedPrefix: "임시 저장됨 ",
    submittingButton: "보내는 중…",
    uploadingButton: "이미지 올리는 중…",
    submitAuthedButton: "의견 보내기",
    submitUnauthedButton: "로그인하고 보내기",

    attachmentSectionLabel: "스크린샷 첨부",
    attachmentEmphasizeBadge: "도움이 많이 됩니다",
    attachmentCountSuffix: (max, perFileSize) => `/${max} · 장당 ${perFileSize} 이하`,
    attachmentPickButton: "사진 선택",
    attachmentCameraButton: "사진 촬영",
    attachmentDragHint: "또는 여기로 끌어다 놓기 · 본문에 붙여넣기(Ctrl+V)",
    attachmentUploadingText: (count) => `이미지 ${count}장 올리는 중…`,
    attachmentPreviewAlt: "첨부한 스크린샷 미리보기",
    attachmentRemoveAriaLabel: "첨부 삭제",
    attachmentPrivacyNote: "첨부 전 개인정보(이름 · 연락처 · 타인의 대화)가 보이지 않는지 확인해 주세요.",

    envIntroPrefix: "문제를 정확히 재현하기 위해 ",
    envIntroStrong: "브라우저 · 화면 크기 · 언어 · 시간대 · 앱 버전",
    envIntroSuffix: " 정보를 함께 보냅니다.",
    envDetailsSummary: "무엇이 함께 전송되나요?",
    envSentTitle: "함께 보내는 정보",
    envNotCollectedTitle: "수집하지 않는 정보",
    envPrivacyPrefix: "자세한 내용은 ",
    envPrivacyLinkText: "개인정보처리방침",
    envPrivacySuffix: "을 참고해 주세요.",
    envToggleLabel: "환경 정보 함께 보내기",
    envDisabledNote: "환경 정보 없이 보내면 문제를 재현하기 어려워 확인이 늦어질 수 있습니다.",

    successImageAlt: "고맙다는 인사를 건네는 꽃돼지 연이",
    successTitle: "감사합니다!",
    successBody: "보내주신 의견은 CODE DESTINY를 더 좋은 서비스로 만드는 데 큰 도움이 됩니다. 개발자가 꼼꼼히 확인한 뒤 업데이트에 반영하겠습니다.",
    ticketNoLabel: "접수 번호",
    ticketCopyAriaLabel: "접수 번호 복사",
    writeAnotherButton: "또 다른 의견 보내기",
    goHomeButton: "홈으로",

    envLabelUrl: "제보 대상 페이지",
    envLabelUserAgent: "브라우저 정보",
    envLabelPlatform: "운영체제",
    envLabelViewport: "창 크기",
    envLabelScreen: "화면 해상도",
    envLabelDpr: "화면 배율",
    envLabelLanguage: "언어 설정",
    envLabelTimezone: "시간대",
    envLabelTheme: "테마",
    envLabelConnection: "네트워크 종류",
    envLabelAppVersion: "앱 버전",
    envLabelBuildVersion: "빌드",
    envLabelRuntime: "실행 환경",
    envLabelSubmittedAt: "제출 시각",
    notCollectedIp: "IP 주소·접속 위치",
    notCollectedPersonalInfo: "이름·연락처 등 직접 입력하지 않은 개인정보",
    notCollectedCookies: "쿠키·로그인 토큰 값",
    notCollectedOtherTabs: "다른 탭이나 다른 사이트의 정보",
    notCollectedClipboard: "클립보드 내용",
    personaNeo: "네오",
    personaYeoni: "연이",
    schemeDark: "다크",
    schemeLight: "라이트",

    apiErrorLoginRequired: "로그인이 필요합니다.",
    apiErrorTooFrequent: "제보가 너무 잦습니다. 잠시 후 다시 시도해 주세요.",
    apiErrorTransient: "일시적인 오류입니다. 잠시 후 다시 보내주세요.",
    apiErrorSubmitFailed: "제보 전송에 실패했습니다. 잠시 후 다시 시도해 주세요.",

    uploadErrorNoFile: "이미지 파일을 선택해 주세요.",
    uploadErrorBadType: "jpg, png, webp 이미지만 첨부할 수 있습니다.",
    uploadErrorEmptyFile: "빈 파일은 첨부할 수 없습니다.",
    uploadErrorTooLarge: (maxSizeLabel) => `이미지는 ${maxSizeLabel} 이하만 첨부할 수 있습니다.`,
    uploadErrorDimensionRead: "이미지 크기를 읽지 못했습니다.",
    uploadErrorOptimizeLoad: "이미지 최적화 중 로드에 실패했습니다.",
    uploadErrorTooLargeShort: "이미지가 너무 큽니다.",
    uploadErrorStorageUnavailable: "첨부 저장소를 사용할 수 없습니다. 첨부 없이 제보해 주세요.",
    uploadErrorGeneric: "이미지 업로드에 실패했습니다.",

    categories: {
      bug: {
        label: "버그", hint: "동작하지 않아요",
        rewardNote: "실제 버그로 확인되면 제보 1건당 월정석 300개를 드려요.",
        fields: {
          repro: { label: "재현 방법", placeholder: "1. 사주 결과 화면에서\n2. 하단 '공유' 버튼을 누르면\n3. 아무 반응이 없습니다" },
          expected: { label: "기대했던 결과", placeholder: "공유 시트가 열릴 것으로 기대했습니다" },
          actual: { label: "실제 결과", placeholder: "화면이 잠깐 어두워졌다가 그대로입니다" },
        },
      },
      feature: {
        label: "기능 제안", hint: "이런 게 있었으면",
        fields: { expected: { label: "이 기능이 왜 필요한가요?", placeholder: "친구와 궁합을 본 뒤 결과를 나란히 비교하고 싶어요" } },
      },
      ui: {
        label: "UI 개선", hint: "보기 불편해요",
        fields: { expected: { label: "어떻게 바뀌면 좋을까요?", placeholder: "글자가 작아서 읽기 힘들어요. 조금 더 크면 좋겠습니다" } },
      },
      typo: {
        label: "오탈자", hint: "글자가 틀렸어요",
        fields: {
          wrongText: { label: "잘못된 문구", placeholder: "화면에 적힌 그대로 붙여넣어 주세요" },
          suggestedText: { label: "이렇게 고쳐주세요", placeholder: "제안하는 문구" },
        },
      },
      "ai-quality": {
        label: "AI 결과 품질", hint: "답변이 이상해요",
        fields: {
          featureName: { label: "어떤 기능인가요?", placeholder: "예) 사주 전문가 상담, 타로 리딩" },
          inputSummary: { label: "입력한 내용", placeholder: "어떤 질문·정보를 넣으셨나요?" },
          outputSummary: { label: "받은 답변에서 이상했던 부분", placeholder: "답변을 붙여넣거나 요약해 주세요" },
        },
      },
      payment: {
        label: "결제 문제", hint: "결제가 안 돼요",
        warning: "카드번호·비밀번호·CVC 등 결제 정보는 절대 입력하지 마세요. 주문번호만으로 확인할 수 있습니다.",
        fields: {
          orderId: { label: "주문번호", placeholder: "주문내역 화면에서 확인할 수 있습니다" },
          payMethod: { label: "결제 수단", placeholder: "선택해 주세요", options: ["단건 결제(카드)", "이용권", "월정석", "기타"] },
        },
      },
      translation: {
        label: "번역 오류", hint: "번역이 어색해요",
        fields: {
          language: { label: "언어", placeholder: "선택해 주세요", options: ["English", "日本語", "中文", "기타"] },
          wrongText: { label: "어색한 번역", placeholder: "화면에 표시된 문구" },
          suggestedText: { label: "제안하는 번역", placeholder: "이렇게 바꾸면 자연스럽습니다" },
        },
      },
      performance: {
        label: "속도 문제", hint: "너무 느려요",
        fields: {
          delay: { label: "얼마나 기다리셨나요?", placeholder: "선택해 주세요", options: ["3초 이내지만 답답함", "3~10초", "10~30초", "30초 이상", "끝내 안 나옴"] },
          network: { label: "네트워크", placeholder: "자동으로 확인합니다" },
        },
      },
      mobile: {
        label: "모바일 문제", hint: "폰에서만 이상해요",
        fields: {
          device: { label: "기기명", placeholder: "예) iPhone 15 Pro, 갤럭시 S24" },
          browser: { label: "브라우저", placeholder: "자동으로 확인합니다" },
        },
      },
      etc: { label: "기타", hint: "그 밖의 의견", fields: {} },
    },
  },
  ja: {
    heroEyebrow: "CODE DESTINY 研究所",
    heroTitle: "バグ報告室",
    heroBodyLine1: "画面がおかしい、結果が不自然、または“こんな機能があれば”と思ったとき。",
    heroBodyLine2: "一行だけでも構いません — 研究所が直接読みます。",
    heroImageAlt: "ご意見を待っている花豚ヨニ",
    responseTimeNote: "平均確認1〜2日 · 回答は登録メールにお送りします",

    topNavAriaLabel: "報告室ナビゲーション",
    backButtonAriaLabel: "前のページに戻る",
    backButtonLabel: "戻る",
    homeButtonLabel: "ホーム",

    submitErrorFallback: "報告の送信に失敗しました。",
    draftBannerPrefix: "作成中の内容があります · ",
    draftResumeButton: "続きを書く",
    draftDiscardButton: "新しく書く",
    categoryQuestionLabel: "どんな内容ですか?",

    categoryGroupAriaLabel: "報告の種類",

    loginGateTitle: "まずは気軽に書いてください",
    loginGateBody: "送信時のみログインが必要です(返信のためです)。今書いた内容は自動保存され、ログイン後もそのまま続きます。",
    loginGateButton: "ログイン",

    titleLabel: "タイトル",
    titlePlaceholder: "一行で要約してください",
    contentLabel: "内容",
    contentPlaceholder: "どんな状況で何がおかしかったか、気軽に書いてください。スクリーンショットはここに直接貼り付けられます。",
    contentMinLengthSuffix: (min) => ` · ${min}文字以上入力してください`,
    urlLabel: "報告対象のページ",
    urlAutoFilledBadge: "自動入力済み",
    attachmentDisabledNote: "ログインするとスクリーンショットを添付できます。今書いた内容はそのまま保存されます。",
    draftAutoSavedDefault: "作成中の内容は自動的に保存されます",
    draftSavedPrefix: "一時保存済み ",
    submittingButton: "送信中…",
    uploadingButton: "画像アップロード中…",
    submitAuthedButton: "意見を送る",
    submitUnauthedButton: "ログインして送る",

    attachmentSectionLabel: "スクリーンショット添付",
    attachmentEmphasizeBadge: "とても助かります",
    attachmentCountSuffix: (max, perFileSize) => `/${max} · 1枚あたり${perFileSize}以下`,
    attachmentPickButton: "写真を選択",
    attachmentCameraButton: "写真を撮影",
    attachmentDragHint: "またはここにドラッグ · 本文に貼り付け(Ctrl+V)",
    attachmentUploadingText: (count) => `画像${count}枚アップロード中…`,
    attachmentPreviewAlt: "添付したスクリーンショットのプレビュー",
    attachmentRemoveAriaLabel: "添付を削除",
    attachmentPrivacyNote: "添付前に個人情報(氏名·連絡先·他人との会話)が写っていないか確認してください。",

    envIntroPrefix: "問題を正確に再現するため、",
    envIntroStrong: "ブラウザ·画面サイズ·言語·タイムゾーン·アプリバージョン",
    envIntroSuffix: "の情報を一緒に送信します。",
    envDetailsSummary: "何が一緒に送信されますか?",
    envSentTitle: "一緒に送る情報",
    envNotCollectedTitle: "収集しない情報",
    envPrivacyPrefix: "詳しくは",
    envPrivacyLinkText: "プライバシーポリシー",
    envPrivacySuffix: "をご覧ください。",
    envToggleLabel: "環境情報も一緒に送る",
    envDisabledNote: "環境情報なしで送ると再現が難しくなり、確認が遅れる場合があります。",

    successImageAlt: "感謝のハグを送る花豚ヨニ",
    successTitle: "ありがとうございます!",
    successBody: "お寄せいただいた意見は、CODE DESTINYをより良いサービスにするための大きな助けになります。開発者が入念に確認したうえでアップデートに反映します。",
    ticketNoLabel: "受付番号",
    ticketCopyAriaLabel: "受付番号をコピー",
    writeAnotherButton: "別の意見を送る",
    goHomeButton: "ホームへ",

    envLabelUrl: "報告対象のページ",
    envLabelUserAgent: "ブラウザ情報",
    envLabelPlatform: "OS",
    envLabelViewport: "ウィンドウサイズ",
    envLabelScreen: "画面解像度",
    envLabelDpr: "画面倍率",
    envLabelLanguage: "言語設定",
    envLabelTimezone: "タイムゾーン",
    envLabelTheme: "テーマ",
    envLabelConnection: "ネットワーク種別",
    envLabelAppVersion: "アプリバージョン",
    envLabelBuildVersion: "ビルド",
    envLabelRuntime: "実行環境",
    envLabelSubmittedAt: "送信時刻",
    notCollectedIp: "IPアドレス·接続位置",
    notCollectedPersonalInfo: "氏名·連絡先など直接入力していない個人情報",
    notCollectedCookies: "Cookie·ログイントークン値",
    notCollectedOtherTabs: "他のタブや他のサイトの情報",
    notCollectedClipboard: "クリップボードの内容",
    personaNeo: "ネオ",
    personaYeoni: "ヨニ",
    schemeDark: "ダーク",
    schemeLight: "ライト",

    apiErrorLoginRequired: "ログインが必要です。",
    apiErrorTooFrequent: "報告が頻繁すぎます。しばらくしてからもう一度お試しください。",
    apiErrorTransient: "一時的なエラーです。しばらくしてからもう一度送信してください。",
    apiErrorSubmitFailed: "報告の送信に失敗しました。しばらくしてからもう一度お試しください。",

    uploadErrorNoFile: "画像ファイルを選択してください。",
    uploadErrorBadType: "jpg、png、webp画像のみ添付できます。",
    uploadErrorEmptyFile: "空のファイルは添付できません。",
    uploadErrorTooLarge: (maxSizeLabel) => `画像は${maxSizeLabel}以下のみ添付できます。`,
    uploadErrorDimensionRead: "画像サイズを読み取れませんでした。",
    uploadErrorOptimizeLoad: "画像最適化中の読み込みに失敗しました。",
    uploadErrorTooLargeShort: "画像が大きすぎます。",
    uploadErrorStorageUnavailable: "添付ストレージが利用できません。添付なしで報告してください。",
    uploadErrorGeneric: "画像のアップロードに失敗しました。",

    categories: {
      bug: {
        label: "バグ", hint: "動作しません",
        rewardNote: "実際のバグと確認されると、報告1件につき月精石300個を差し上げます。",
        fields: {
          repro: { label: "再現方法", placeholder: "1. 四柱推命の結果画面で\n2. 下部の「共有」ボタンを押すと\n3. 何も反応しません" },
          expected: { label: "期待していた結果", placeholder: "共有シートが開くと思っていました" },
          actual: { label: "実際の結果", placeholder: "画面が一瞬暗くなり、そのままです" },
        },
      },
      feature: {
        label: "機能提案", hint: "こんな機能があれば",
        fields: { expected: { label: "この機能がなぜ必要ですか?", placeholder: "友達と相性を見た後、結果を並べて比較したいです" } },
      },
      ui: {
        label: "UI改善", hint: "見づらいです",
        fields: { expected: { label: "どう変わればいいですか?", placeholder: "文字が小さくて読みにくいです。もう少し大きいといいですね" } },
      },
      typo: {
        label: "誤字脱字", hint: "文字が間違っています",
        fields: {
          wrongText: { label: "間違った文言", placeholder: "画面に書かれている通りに貼り付けてください" },
          suggestedText: { label: "こう直してください", placeholder: "提案する文言" },
        },
      },
      "ai-quality": {
        label: "AI結果の品質", hint: "回答がおかしいです",
        fields: {
          featureName: { label: "どの機能ですか?", placeholder: "例)四柱推命の専門家相談、タロットリーディング" },
          inputSummary: { label: "入力した内容", placeholder: "どんな質問·情報を入れましたか?" },
          outputSummary: { label: "受け取った回答でおかしかった部分", placeholder: "回答を貼り付けるか要約してください" },
        },
      },
      payment: {
        label: "決済の問題", hint: "決済ができません",
        warning: "カード番号·パスワード·CVCなどの決済情報は絶対に入力しないでください。注文番号だけで確認できます。",
        fields: {
          orderId: { label: "注文番号", placeholder: "注文履歴画面で確認できます" },
          payMethod: { label: "決済手段", placeholder: "選択してください", options: ["都度決済(カード)", "利用券", "月精石", "その他"] },
        },
      },
      translation: {
        label: "翻訳エラー", hint: "翻訳が不自然です",
        fields: {
          language: { label: "言語", placeholder: "選択してください", options: ["English", "日本語", "中文", "その他"] },
          wrongText: { label: "不自然な翻訳", placeholder: "画面に表示されている文言" },
          suggestedText: { label: "提案する翻訳", placeholder: "こう変えると自然です" },
        },
      },
      performance: {
        label: "速度の問題", hint: "遅すぎます",
        fields: {
          delay: { label: "どのくらい待ちましたか?", placeholder: "選択してください", options: ["3秒以内だがもどかしい", "3〜10秒", "10〜30秒", "30秒以上", "結局出なかった"] },
          network: { label: "ネットワーク", placeholder: "自動で確認します" },
        },
      },
      mobile: {
        label: "モバイルのみの問題", hint: "スマホでだけおかしいです",
        fields: {
          device: { label: "機種名", placeholder: "例)iPhone 15 Pro、Galaxy S24" },
          browser: { label: "ブラウザ", placeholder: "自動で確認します" },
        },
      },
      etc: { label: "その他", hint: "その他のご意見", fields: {} },
    },
  },
  "zh-CN": {
    heroEyebrow: "CODE DESTINY 研究所",
    heroTitle: "问题反馈室",
    heroBodyLine1: "当画面出现异常、结果感觉不对,或是想到“要是有这个功能就好了”的时候。",
    heroBodyLine2: "哪怕一句话也好,请告诉我们 — 研究所会亲自阅读。",
    heroImageAlt: "等待意见的花猪连伊",
    responseTimeNote: "平均确认1~2天 · 回复将发送至您注册的邮箱",

    topNavAriaLabel: "反馈室导航",
    backButtonAriaLabel: "返回上一页",
    backButtonLabel: "返回",
    homeButtonLabel: "首页",

    submitErrorFallback: "反馈发送失败。",
    draftBannerPrefix: "有正在撰写的内容 · ",
    draftResumeButton: "继续撰写",
    draftDiscardButton: "重新撰写",
    categoryQuestionLabel: "是什么内容呢?",

    categoryGroupAriaLabel: "反馈类型",

    loginGateTitle: "请先随意撰写",
    loginGateBody: "仅在发送时需要登录(以便我们回复)。您现在写的内容会自动保存,登录后可继续。",
    loginGateButton: "登录",

    titleLabel: "标题",
    titlePlaceholder: "请用一句话概括",
    contentLabel: "内容",
    contentPlaceholder: "请随意描述是在什么情况下、什么地方感觉不对劲。截图可以直接粘贴在这里。",
    contentMinLengthSuffix: (min) => ` · 请输入至少${min}个字符`,
    urlLabel: "反馈对象页面",
    urlAutoFilledBadge: "已自动填写",
    attachmentDisabledNote: "登录后即可附加截图。您现在写的内容会原样保存。",
    draftAutoSavedDefault: "撰写中的内容会自动保存",
    draftSavedPrefix: "已临时保存 ",
    submittingButton: "发送中…",
    uploadingButton: "图片上传中…",
    submitAuthedButton: "发送反馈",
    submitUnauthedButton: "登录并发送",

    attachmentSectionLabel: "附加截图",
    attachmentEmphasizeBadge: "非常有帮助",
    attachmentCountSuffix: (max, perFileSize) => `/${max} · 每张不超过${perFileSize}`,
    attachmentPickButton: "选择照片",
    attachmentCameraButton: "拍照",
    attachmentDragHint: "或拖到这里 · 在正文中粘贴(Ctrl+V)",
    attachmentUploadingText: (count) => `正在上传${count}张图片…`,
    attachmentPreviewAlt: "所附截图预览",
    attachmentRemoveAriaLabel: "删除附件",
    attachmentPrivacyNote: "请在附加前确认没有个人信息(姓名·联系方式·他人对话)显示在截图中。",

    envIntroPrefix: "为了准确重现问题,我们会一并发送您的",
    envIntroStrong: "浏览器·屏幕尺寸·语言·时区·应用版本",
    envIntroSuffix: "信息。",
    envDetailsSummary: "会一并发送哪些内容?",
    envSentTitle: "一并发送的信息",
    envNotCollectedTitle: "不会收集的信息",
    envPrivacyPrefix: "详情请参阅",
    envPrivacyLinkText: "隐私政策",
    envPrivacySuffix: "。",
    envToggleLabel: "同时发送环境信息",
    envDisabledNote: "不发送环境信息可能导致难以重现问题,确认时间可能延长。",

    successImageAlt: "送上感谢拥抱的花猪连伊",
    successTitle: "谢谢您!",
    successBody: "您的反馈对让CODE DESTINY变得更好有很大帮助。开发者会仔细确认后反映到更新中。",
    ticketNoLabel: "受理编号",
    ticketCopyAriaLabel: "复制受理编号",
    writeAnotherButton: "发送其他反馈",
    goHomeButton: "返回首页",

    envLabelUrl: "反馈对象页面",
    envLabelUserAgent: "浏览器信息",
    envLabelPlatform: "操作系统",
    envLabelViewport: "窗口大小",
    envLabelScreen: "屏幕分辨率",
    envLabelDpr: "屏幕缩放比例",
    envLabelLanguage: "语言设置",
    envLabelTimezone: "时区",
    envLabelTheme: "主题",
    envLabelConnection: "网络类型",
    envLabelAppVersion: "应用版本",
    envLabelBuildVersion: "构建版本",
    envLabelRuntime: "运行环境",
    envLabelSubmittedAt: "提交时间",
    notCollectedIp: "IP地址·接入位置",
    notCollectedPersonalInfo: "姓名·联系方式等未直接输入的个人信息",
    notCollectedCookies: "Cookie·登录令牌值",
    notCollectedOtherTabs: "其他标签页或其他网站的信息",
    notCollectedClipboard: "剪贴板内容",
    personaNeo: "尼奥",
    personaYeoni: "连伊",
    schemeDark: "深色",
    schemeLight: "浅色",

    apiErrorLoginRequired: "需要登录。",
    apiErrorTooFrequent: "反馈过于频繁。请稍后重试。",
    apiErrorTransient: "临时错误。请稍后重新发送。",
    apiErrorSubmitFailed: "反馈发送失败。请稍后重试。",

    uploadErrorNoFile: "请选择图片文件。",
    uploadErrorBadType: "只能附加jpg、png、webp格式的图片。",
    uploadErrorEmptyFile: "无法附加空文件。",
    uploadErrorTooLarge: (maxSizeLabel) => `图片大小不能超过${maxSizeLabel}。`,
    uploadErrorDimensionRead: "无法读取图片尺寸。",
    uploadErrorOptimizeLoad: "图片优化过程中加载失败。",
    uploadErrorTooLargeShort: "图片过大。",
    uploadErrorStorageUnavailable: "附件存储不可用。请不带附件发送反馈。",
    uploadErrorGeneric: "图片上传失败。",

    categories: {
      bug: {
        label: "错误", hint: "无法正常运行",
        rewardNote: "确认为真实错误后,每条反馈可获得300颗月精石。",
        fields: {
          repro: { label: "复现方法", placeholder: "1. 在八字结果画面\n2. 点击底部的'分享'按钮\n3. 没有任何反应" },
          expected: { label: "期望的结果", placeholder: "本期望分享面板会打开" },
          actual: { label: "实际结果", placeholder: "画面瞬间变暗后就一直保持这样" },
        },
      },
      feature: {
        label: "功能建议", hint: "希望有这样的功能",
        fields: { expected: { label: "为什么需要这个功能?", placeholder: "希望和朋友查看缘分后能并排比较结果" } },
      },
      ui: {
        label: "界面改进", hint: "看起来不舒服",
        fields: { expected: { label: "希望怎么改进?", placeholder: "字太小看不清,希望能大一点" } },
      },
      typo: {
        label: "错别字", hint: "文字有误",
        fields: {
          wrongText: { label: "错误的文字", placeholder: "请按画面上显示的原样粘贴" },
          suggestedText: { label: "请改成这样", placeholder: "您建议的文字" },
        },
      },
      "ai-quality": {
        label: "AI结果质量", hint: "回答感觉不对",
        fields: {
          featureName: { label: "是哪个功能?", placeholder: "例:八字专家咨询、塔罗牌解读" },
          inputSummary: { label: "您输入的内容", placeholder: "您输入了什么问题或信息?" },
          outputSummary: { label: "收到的回答中哪里不对劲", placeholder: "请粘贴或概括该回答" },
        },
      },
      payment: {
        label: "支付问题", hint: "无法完成支付",
        warning: "请绝对不要输入卡号·密码·CVC等支付信息。仅凭订单号即可查询。",
        fields: {
          orderId: { label: "订单号", placeholder: "可在订单记录画面确认" },
          payMethod: { label: "支付方式", placeholder: "请选择", options: ["单次支付(信用卡)", "使用权", "月精石", "其他"] },
        },
      },
      translation: {
        label: "翻译错误", hint: "翻译感觉不自然",
        fields: {
          language: { label: "语言", placeholder: "请选择", options: ["English", "日本語", "中文", "其他"] },
          wrongText: { label: "不自然的翻译", placeholder: "画面上显示的文字" },
          suggestedText: { label: "建议的翻译", placeholder: "这样改会更自然" },
        },
      },
      performance: {
        label: "速度问题", hint: "太慢了",
        fields: {
          delay: { label: "您等待了多久?", placeholder: "请选择", options: ["3秒以内但感觉憋闷", "3~10秒", "10~30秒", "30秒以上", "始终没出来"] },
          network: { label: "网络", placeholder: "自动确认" },
        },
      },
      mobile: {
        label: "移动端问题", hint: "只有手机上出问题",
        fields: {
          device: { label: "设备名称", placeholder: "例:iPhone 15 Pro、Galaxy S24" },
          browser: { label: "浏览器", placeholder: "自动确认" },
        },
      },
      etc: { label: "其他", hint: "其他意见", fields: {} },
    },
  },
  "zh-TW": {
    heroEyebrow: "CODE DESTINY 研究所",
    heroTitle: "問題回報室",
    heroBodyLine1: "當畫面出現異常、結果感覺不對,或是想到“要是有這個功能就好了”的時候。",
    heroBodyLine2: "哪怕一句話也好,請告訴我們 — 研究所會親自閱讀。",
    heroImageAlt: "等待意見的花豬連伊",
    responseTimeNote: "平均確認1~2天 · 回覆將發送至您註冊的信箱",

    topNavAriaLabel: "回報室導覽",
    backButtonAriaLabel: "返回上一頁",
    backButtonLabel: "返回",
    homeButtonLabel: "首頁",

    submitErrorFallback: "回報發送失敗。",
    draftBannerPrefix: "有正在撰寫的內容 · ",
    draftResumeButton: "繼續撰寫",
    draftDiscardButton: "重新撰寫",
    categoryQuestionLabel: "是什麼內容呢?",

    categoryGroupAriaLabel: "回報類型",

    loginGateTitle: "請先隨意撰寫",
    loginGateBody: "僅在發送時需要登入(以便我們回覆)。您現在寫的內容會自動儲存,登入後可繼續。",
    loginGateButton: "登入",

    titleLabel: "標題",
    titlePlaceholder: "請用一句話概括",
    contentLabel: "內容",
    contentPlaceholder: "請隨意描述是在什麼情況下、什麼地方感覺不對勁。截圖可以直接貼在這裡。",
    contentMinLengthSuffix: (min) => ` · 請輸入至少${min}個字元`,
    urlLabel: "回報對象頁面",
    urlAutoFilledBadge: "已自動填寫",
    attachmentDisabledNote: "登入後即可附加截圖。您現在寫的內容會原樣儲存。",
    draftAutoSavedDefault: "撰寫中的內容會自動儲存",
    draftSavedPrefix: "已暫存 ",
    submittingButton: "發送中…",
    uploadingButton: "圖片上傳中…",
    submitAuthedButton: "發送意見",
    submitUnauthedButton: "登入並發送",

    attachmentSectionLabel: "附加截圖",
    attachmentEmphasizeBadge: "非常有幫助",
    attachmentCountSuffix: (max, perFileSize) => `/${max} · 每張不超過${perFileSize}`,
    attachmentPickButton: "選擇照片",
    attachmentCameraButton: "拍照",
    attachmentDragHint: "或拖到這裡 · 在內文中貼上(Ctrl+V)",
    attachmentUploadingText: (count) => `正在上傳${count}張圖片…`,
    attachmentPreviewAlt: "所附截圖預覽",
    attachmentRemoveAriaLabel: "刪除附件",
    attachmentPrivacyNote: "請在附加前確認沒有個人資訊(姓名·聯絡方式·他人對話)顯示在截圖中。",

    envIntroPrefix: "為了準確重現問題,我們會一併發送您的",
    envIntroStrong: "瀏覽器·螢幕尺寸·語言·時區·應用程式版本",
    envIntroSuffix: "資訊。",
    envDetailsSummary: "會一併發送哪些內容?",
    envSentTitle: "一併發送的資訊",
    envNotCollectedTitle: "不會收集的資訊",
    envPrivacyPrefix: "詳情請參閱",
    envPrivacyLinkText: "隱私政策",
    envPrivacySuffix: "。",
    envToggleLabel: "同時發送環境資訊",
    envDisabledNote: "不發送環境資訊可能導致難以重現問題,確認時間可能延長。",

    successImageAlt: "送上感謝擁抱的花豬連伊",
    successTitle: "謝謝您!",
    successBody: "您的意見對讓CODE DESTINY變得更好有很大幫助。開發者會仔細確認後反映到更新中。",
    ticketNoLabel: "受理編號",
    ticketCopyAriaLabel: "複製受理編號",
    writeAnotherButton: "發送其他意見",
    goHomeButton: "回首頁",

    envLabelUrl: "回報對象頁面",
    envLabelUserAgent: "瀏覽器資訊",
    envLabelPlatform: "作業系統",
    envLabelViewport: "視窗大小",
    envLabelScreen: "螢幕解析度",
    envLabelDpr: "螢幕縮放比例",
    envLabelLanguage: "語言設定",
    envLabelTimezone: "時區",
    envLabelTheme: "主題",
    envLabelConnection: "網路類型",
    envLabelAppVersion: "應用程式版本",
    envLabelBuildVersion: "組建版本",
    envLabelRuntime: "執行環境",
    envLabelSubmittedAt: "送出時間",
    notCollectedIp: "IP位址·連線位置",
    notCollectedPersonalInfo: "姓名·聯絡方式等未直接輸入的個人資訊",
    notCollectedCookies: "Cookie·登入權杖值",
    notCollectedOtherTabs: "其他分頁或其他網站的資訊",
    notCollectedClipboard: "剪貼簿內容",
    personaNeo: "尼歐",
    personaYeoni: "連伊",
    schemeDark: "深色",
    schemeLight: "淺色",

    apiErrorLoginRequired: "需要登入。",
    apiErrorTooFrequent: "回報過於頻繁。請稍後再試。",
    apiErrorTransient: "暫時性錯誤。請稍後重新發送。",
    apiErrorSubmitFailed: "回報發送失敗。請稍後再試。",

    uploadErrorNoFile: "請選擇圖片檔案。",
    uploadErrorBadType: "只能附加jpg、png、webp格式的圖片。",
    uploadErrorEmptyFile: "無法附加空白檔案。",
    uploadErrorTooLarge: (maxSizeLabel) => `圖片大小不能超過${maxSizeLabel}。`,
    uploadErrorDimensionRead: "無法讀取圖片尺寸。",
    uploadErrorOptimizeLoad: "圖片最佳化過程中載入失敗。",
    uploadErrorTooLargeShort: "圖片過大。",
    uploadErrorStorageUnavailable: "附件儲存空間無法使用。請不附加檔案發送回報。",
    uploadErrorGeneric: "圖片上傳失敗。",

    categories: {
      bug: {
        label: "錯誤", hint: "無法正常運作",
        rewardNote: "確認為真實錯誤後,每則回報可獲得300顆月精石。",
        fields: {
          repro: { label: "重現方法", placeholder: "1. 在八字結果畫面\n2. 點擊下方的「分享」按鈕\n3. 沒有任何反應" },
          expected: { label: "期望的結果", placeholder: "本期望分享面板會開啟" },
          actual: { label: "實際結果", placeholder: "畫面瞬間變暗後就一直保持這樣" },
        },
      },
      feature: {
        label: "功能建議", hint: "希望有這樣的功能",
        fields: { expected: { label: "為什麼需要這個功能?", placeholder: "希望和朋友查看緣分後能並排比較結果" } },
      },
      ui: {
        label: "介面改進", hint: "看起來不舒服",
        fields: { expected: { label: "希望怎麼改進?", placeholder: "字太小看不清,希望能大一點" } },
      },
      typo: {
        label: "錯別字", hint: "文字有誤",
        fields: {
          wrongText: { label: "錯誤的文字", placeholder: "請按畫面上顯示的原樣貼上" },
          suggestedText: { label: "請改成這樣", placeholder: "您建議的文字" },
        },
      },
      "ai-quality": {
        label: "AI結果品質", hint: "回答感覺不對",
        fields: {
          featureName: { label: "是哪個功能?", placeholder: "例:八字專家諮詢、塔羅牌解讀" },
          inputSummary: { label: "您輸入的內容", placeholder: "您輸入了什麼問題或資訊?" },
          outputSummary: { label: "收到的回答中哪裡不對勁", placeholder: "請貼上或概括該回答" },
        },
      },
      payment: {
        label: "付款問題", hint: "無法完成付款",
        warning: "請絕對不要輸入卡號·密碼·CVC等付款資訊。僅憑訂單編號即可查詢。",
        fields: {
          orderId: { label: "訂單編號", placeholder: "可在訂單記錄畫面確認" },
          payMethod: { label: "付款方式", placeholder: "請選擇", options: ["單次付款(信用卡)", "使用權", "月精石", "其他"] },
        },
      },
      translation: {
        label: "翻譯錯誤", hint: "翻譯感覺不自然",
        fields: {
          language: { label: "語言", placeholder: "請選擇", options: ["English", "日本語", "中文", "其他"] },
          wrongText: { label: "不自然的翻譯", placeholder: "畫面上顯示的文字" },
          suggestedText: { label: "建議的翻譯", placeholder: "這樣改會更自然" },
        },
      },
      performance: {
        label: "速度問題", hint: "太慢了",
        fields: {
          delay: { label: "您等待了多久?", placeholder: "請選擇", options: ["3秒以內但感覺憋悶", "3~10秒", "10~30秒", "30秒以上", "始終沒出來"] },
          network: { label: "網路", placeholder: "自動確認" },
        },
      },
      mobile: {
        label: "行動裝置問題", hint: "只有手機上出問題",
        fields: {
          device: { label: "裝置名稱", placeholder: "例:iPhone 15 Pro、Galaxy S24" },
          browser: { label: "瀏覽器", placeholder: "自動確認" },
        },
      },
      etc: { label: "其他", hint: "其他意見", fields: {} },
    },
  },
  vi: {
    heroEyebrow: "PHÒNG NGHIÊN CỨU CODE DESTINY",
    heroTitle: "Phòng Báo Cáo Lỗi",
    heroBodyLine1: "Khi màn hình có vẻ lạ, kết quả cảm thấy kỳ, hoặc bạn nghĩ “giá mà có tính năng này”.",
    heroBodyLine2: "Chỉ một dòng cũng được — phòng nghiên cứu sẽ đọc trực tiếp.",
    heroImageAlt: "Chú heo hoa đang chờ ý kiến của bạn",
    responseTimeNote: "Xác nhận trung bình 1–2 ngày · Chúng tôi sẽ trả lời qua email đăng ký của bạn",

    topNavAriaLabel: "Điều hướng phòng báo cáo",
    backButtonAriaLabel: "Đi đến trang trước",
    backButtonLabel: "Quay lại",
    homeButtonLabel: "Trang chủ",

    submitErrorFallback: "Không thể gửi phản hồi.",
    draftBannerPrefix: "Bạn có một bản nháp đang viết dở · ",
    draftResumeButton: "Viết tiếp",
    draftDiscardButton: "Viết lại từ đầu",
    categoryQuestionLabel: "Nội dung này là gì?",

    categoryGroupAriaLabel: "Loại phản hồi",

    loginGateTitle: "Cứ viết thoải mái trước đã",
    loginGateBody: "Bạn chỉ cần đăng nhập khi gửi (để chúng tôi có thể trả lời). Nội dung bạn đã viết được tự động lưu và sẽ tiếp tục sau khi đăng nhập.",
    loginGateButton: "Đăng nhập",

    titleLabel: "Tiêu đề",
    titlePlaceholder: "Tóm tắt trong một dòng",
    contentLabel: "Nội dung",
    contentPlaceholder: "Hãy viết thoải mái về tình huống và điều gì cảm thấy không ổn. Bạn có thể dán ảnh chụp màn hình trực tiếp vào đây.",
    contentMinLengthSuffix: (min) => ` · Vui lòng nhập ít nhất ${min} ký tự`,
    urlLabel: "Trang bạn đang báo cáo",
    urlAutoFilledBadge: "Đã tự động điền",
    attachmentDisabledNote: "Đăng nhập để đính kèm ảnh chụp màn hình. Nội dung bạn đã viết sẽ được giữ nguyên.",
    draftAutoSavedDefault: "Nội dung bạn viết được tự động lưu",
    draftSavedPrefix: "Đã lưu tạm ",
    submittingButton: "Đang gửi…",
    uploadingButton: "Đang tải ảnh lên…",
    submitAuthedButton: "Gửi phản hồi",
    submitUnauthedButton: "Đăng nhập và gửi",

    attachmentSectionLabel: "Đính kèm ảnh chụp màn hình",
    attachmentEmphasizeBadge: "Điều này rất hữu ích",
    attachmentCountSuffix: (max, perFileSize) => `/${max} · tối đa ${perFileSize} mỗi ảnh`,
    attachmentPickButton: "Chọn ảnh",
    attachmentCameraButton: "Chụp ảnh",
    attachmentDragHint: "Hoặc kéo thả vào đây · dán vào nội dung (Ctrl+V)",
    attachmentUploadingText: (count) => `Đang tải lên ${count} ảnh…`,
    attachmentPreviewAlt: "Xem trước ảnh chụp màn hình đính kèm",
    attachmentRemoveAriaLabel: "Xóa tệp đính kèm",
    attachmentPrivacyNote: "Trước khi đính kèm, hãy kiểm tra xem thông tin cá nhân (tên · liên hệ · cuộc trò chuyện của người khác) có hiển thị không.",

    envIntroPrefix: "Để tái hiện chính xác vấn đề, chúng tôi sẽ gửi kèm ",
    envIntroStrong: "trình duyệt · kích thước màn hình · ngôn ngữ · múi giờ · phiên bản ứng dụng",
    envIntroSuffix: " của bạn.",
    envDetailsSummary: "Những gì được gửi kèm?",
    envSentTitle: "Thông tin được gửi kèm",
    envNotCollectedTitle: "Thông tin chúng tôi không thu thập",
    envPrivacyPrefix: "Xem chi tiết tại ",
    envPrivacyLinkText: "Chính sách bảo mật",
    envPrivacySuffix: ".",
    envToggleLabel: "Gửi kèm thông tin môi trường",
    envDisabledNote: "Nếu không gửi thông tin môi trường, việc tái hiện vấn đề sẽ khó hơn và có thể mất nhiều thời gian xác nhận hơn.",

    successImageAlt: "Chú heo hoa gửi lời cảm ơn bằng cái ôm",
    successTitle: "Cảm ơn bạn!",
    successBody: "Phản hồi của bạn giúp CODE DESTINY trở thành dịch vụ tốt hơn. Đội ngũ phát triển sẽ xem xét kỹ lưỡng và phản ánh vào bản cập nhật.",
    ticketNoLabel: "Số phiếu",
    ticketCopyAriaLabel: "Sao chép số phiếu",
    writeAnotherButton: "Gửi phản hồi khác",
    goHomeButton: "Về trang chủ",

    envLabelUrl: "Trang bạn đang báo cáo",
    envLabelUserAgent: "Thông tin trình duyệt",
    envLabelPlatform: "Hệ điều hành",
    envLabelViewport: "Kích thước cửa sổ",
    envLabelScreen: "Độ phân giải màn hình",
    envLabelDpr: "Tỷ lệ màn hình",
    envLabelLanguage: "Cài đặt ngôn ngữ",
    envLabelTimezone: "Múi giờ",
    envLabelTheme: "Giao diện",
    envLabelConnection: "Loại mạng",
    envLabelAppVersion: "Phiên bản ứng dụng",
    envLabelBuildVersion: "Bản dựng",
    envLabelRuntime: "Môi trường chạy",
    envLabelSubmittedAt: "Thời điểm gửi",
    notCollectedIp: "Địa chỉ IP · vị trí truy cập",
    notCollectedPersonalInfo: "Thông tin cá nhân bạn không nhập trực tiếp, như tên hay liên hệ",
    notCollectedCookies: "Giá trị cookie · token đăng nhập",
    notCollectedOtherTabs: "Thông tin từ các tab hoặc trang web khác",
    notCollectedClipboard: "Nội dung khay nhớ tạm",
    personaNeo: "Neo",
    personaYeoni: "Yeoni",
    schemeDark: "Tối",
    schemeLight: "Sáng",

    apiErrorLoginRequired: "Bạn cần đăng nhập.",
    apiErrorTooFrequent: "Báo cáo quá thường xuyên. Vui lòng thử lại sau một chút.",
    apiErrorTransient: "Lỗi tạm thời. Vui lòng gửi lại sau một chút.",
    apiErrorSubmitFailed: "Không thể gửi phản hồi. Vui lòng thử lại sau một chút.",

    uploadErrorNoFile: "Vui lòng chọn tệp ảnh.",
    uploadErrorBadType: "Chỉ có thể đính kèm ảnh jpg, png, webp.",
    uploadErrorEmptyFile: "Không thể đính kèm tệp rỗng.",
    uploadErrorTooLarge: (maxSizeLabel) => `Chỉ có thể đính kèm ảnh tối đa ${maxSizeLabel}.`,
    uploadErrorDimensionRead: "Không thể đọc kích thước ảnh.",
    uploadErrorOptimizeLoad: "Tải ảnh thất bại trong lúc tối ưu hóa.",
    uploadErrorTooLargeShort: "Ảnh quá lớn.",
    uploadErrorStorageUnavailable: "Kho lưu trữ tệp đính kèm không khả dụng. Vui lòng gửi báo cáo không kèm tệp.",
    uploadErrorGeneric: "Không thể tải ảnh lên.",

    categories: {
      bug: {
        label: "Lỗi", hint: "Không hoạt động",
        rewardNote: "Nếu được xác nhận là lỗi thật, bạn sẽ nhận 300 đá trăng cho mỗi báo cáo.",
        fields: {
          repro: { label: "Các bước tái hiện", placeholder: "1. Trên màn hình kết quả Saju\n2. Nhấn nút 'Chia sẻ' ở dưới\n3. Không có phản hồi gì" },
          expected: { label: "Kết quả mong đợi", placeholder: "Tôi mong đợi bảng chia sẻ sẽ mở ra" },
          actual: { label: "Kết quả thực tế", placeholder: "Màn hình tối lại một chút rồi giữ nguyên như vậy" },
        },
      },
      feature: {
        label: "Đề xuất tính năng", hint: "Giá mà có tính năng này",
        fields: { expected: { label: "Tại sao cần tính năng này?", placeholder: "Tôi muốn so sánh kết quả hợp duyên cạnh nhau sau khi xem cùng bạn" } },
      },
      ui: {
        label: "Cải thiện giao diện", hint: "Nhìn khó chịu",
        fields: { expected: { label: "Nên thay đổi như thế nào?", placeholder: "Chữ quá nhỏ khó đọc. Sẽ tốt hơn nếu to hơn một chút" } },
      },
      typo: {
        label: "Lỗi chính tả", hint: "Chữ bị sai",
        fields: {
          wrongText: { label: "Văn bản sai", placeholder: "Vui lòng dán đúng như hiển thị trên màn hình" },
          suggestedText: { label: "Vui lòng sửa thành thế này", placeholder: "Văn bản bạn đề xuất" },
        },
      },
      "ai-quality": {
        label: "Chất lượng kết quả AI", hint: "Câu trả lời có vẻ lạ",
        fields: {
          featureName: { label: "Đó là tính năng nào?", placeholder: "VD) Tư vấn chuyên gia Saju, đọc bài Tarot" },
          inputSummary: { label: "Nội dung bạn đã nhập", placeholder: "Bạn đã nhập câu hỏi hoặc thông tin gì?" },
          outputSummary: { label: "Phần nào trong câu trả lời cảm thấy lạ", placeholder: "Vui lòng dán hoặc tóm tắt câu trả lời" },
        },
      },
      payment: {
        label: "Vấn đề thanh toán", hint: "Không thể thanh toán",
        warning: "Tuyệt đối không nhập thông tin thanh toán như số thẻ, mật khẩu, CVC. Chỉ cần mã đơn hàng là có thể kiểm tra được.",
        fields: {
          orderId: { label: "Mã đơn hàng", placeholder: "Bạn có thể kiểm tra trên màn hình lịch sử đơn hàng" },
          payMethod: { label: "Phương thức thanh toán", placeholder: "Vui lòng chọn", options: ["Thanh toán một lần (thẻ)", "Vé sử dụng", "Đá trăng", "Khác"] },
        },
      },
      translation: {
        label: "Lỗi dịch thuật", hint: "Bản dịch nghe không tự nhiên",
        fields: {
          language: { label: "Ngôn ngữ", placeholder: "Vui lòng chọn", options: ["English", "日本語", "中文", "Khác"] },
          wrongText: { label: "Bản dịch không tự nhiên", placeholder: "Văn bản hiển thị trên màn hình" },
          suggestedText: { label: "Bản dịch đề xuất", placeholder: "Đổi thành thế này sẽ tự nhiên hơn" },
        },
      },
      performance: {
        label: "Vấn đề tốc độ", hint: "Quá chậm",
        fields: {
          delay: { label: "Bạn đã chờ bao lâu?", placeholder: "Vui lòng chọn", options: ["Dưới 3 giây nhưng cảm thấy sốt ruột", "3–10 giây", "10–30 giây", "Trên 30 giây", "Cuối cùng không hiện ra"] },
          network: { label: "Mạng", placeholder: "Tự động kiểm tra" },
        },
      },
      mobile: {
        label: "Vấn đề chỉ trên di động", hint: "Chỉ bị lỗi trên điện thoại",
        fields: {
          device: { label: "Tên thiết bị", placeholder: "VD) iPhone 15 Pro, Galaxy S24" },
          browser: { label: "Trình duyệt", placeholder: "Tự động kiểm tra" },
        },
      },
      etc: { label: "Khác", hint: "Ý kiến khác", fields: {} },
    },
  },
  hi: {
    heroEyebrow: "CODE DESTINY लैब",
    heroTitle: "बग रिपोर्ट रूम",
    heroBodyLine1: "जब स्क्रीन अजीब लगे, परिणाम अटपटा लगे, या आपको लगे “काश यह फ़ीचर होता”।",
    heroBodyLine2: "एक लाइन भी काफी है — लैब इसे सीधे पढ़ती है।",
    heroImageAlt: "आपकी प्रतिक्रिया का इंतजार करता फूल-सुअर योनी",
    responseTimeNote: "औसत समीक्षा 1–2 दिन · हम आपके साइनअप ईमेल पर जवाब देंगे",

    topNavAriaLabel: "फीडबैक रूम नेविगेशन",
    backButtonAriaLabel: "पिछले पेज पर जाएं",
    backButtonLabel: "वापस",
    homeButtonLabel: "होम",

    submitErrorFallback: "फीडबैक भेजना विफल रहा।",
    draftBannerPrefix: "आपका एक ड्राफ्ट लिखा जा रहा है · ",
    draftResumeButton: "लिखना जारी रखें",
    draftDiscardButton: "नए सिरे से लिखें",
    categoryQuestionLabel: "यह किस बारे में है?",

    categoryGroupAriaLabel: "फीडबैक प्रकार",

    loginGateTitle: "पहले आराम से लिखें",
    loginGateBody: "भेजते समय ही साइन इन की आवश्यकता होगी (ताकि हम जवाब दे सकें)। आपने जो लिखा है वह अपने आप सहेजा जाता है और साइन इन के बाद जारी रहता है।",
    loginGateButton: "साइन इन करें",

    titleLabel: "शीर्षक",
    titlePlaceholder: "एक पंक्ति में सारांश दें",
    contentLabel: "विवरण",
    contentPlaceholder: "किस स्थिति में क्या गलत लगा, स्वतंत्र रूप से लिखें। आप स्क्रीनशॉट सीधे यहां पेस्ट कर सकते हैं।",
    contentMinLengthSuffix: (min) => ` · कृपया कम से कम ${min} अक्षर दर्ज करें`,
    urlLabel: "जिस पेज की आप रिपोर्ट कर रहे हैं",
    urlAutoFilledBadge: "स्वतः भरा गया",
    attachmentDisabledNote: "स्क्रीनशॉट संलग्न करने के लिए साइन इन करें। अब तक जो लिखा है वह वैसे ही सहेजा जाएगा।",
    draftAutoSavedDefault: "आप जो लिखते हैं वह अपने आप सहेजा जाता है",
    draftSavedPrefix: "अस्थायी रूप से सहेजा गया ",
    submittingButton: "भेजा जा रहा है…",
    uploadingButton: "छवि अपलोड हो रही है…",
    submitAuthedButton: "फीडबैक भेजें",
    submitUnauthedButton: "साइन इन करके भेजें",

    attachmentSectionLabel: "स्क्रीनशॉट संलग्न करें",
    attachmentEmphasizeBadge: "यह बहुत मददगार है",
    attachmentCountSuffix: (max, perFileSize) => `/${max} · प्रत्येक ${perFileSize} तक`,
    attachmentPickButton: "फोटो चुनें",
    attachmentCameraButton: "फोटो लें",
    attachmentDragHint: "या इसे यहां खींचकर छोड़ें · पाठ में पेस्ट करें (Ctrl+V)",
    attachmentUploadingText: (count) => `${count} छवि(यां) अपलोड हो रही हैं…`,
    attachmentPreviewAlt: "संलग्न स्क्रीनशॉट का पूर्वावलोकन",
    attachmentRemoveAriaLabel: "अटैचमेंट हटाएं",
    attachmentPrivacyNote: "संलग्न करने से पहले जांच लें कि कोई व्यक्तिगत जानकारी (नाम · संपर्क · किसी और की बातचीत) दिखाई न दे।",

    envIntroPrefix: "समस्या को सही ढंग से पुन: उत्पन्न करने के लिए, हम आपका ",
    envIntroStrong: "ब्राउज़र · स्क्रीन आकार · भाषा · समय क्षेत्र · ऐप संस्करण",
    envIntroSuffix: " भी साथ भेजते हैं।",
    envDetailsSummary: "साथ में क्या भेजा जाता है?",
    envSentTitle: "साथ भेजी गई जानकारी",
    envNotCollectedTitle: "हम जो जानकारी एकत्र नहीं करते",
    envPrivacyPrefix: "विवरण के लिए देखें ",
    envPrivacyLinkText: "गोपनीयता नीति",
    envPrivacySuffix: "।",
    envToggleLabel: "पर्यावरण जानकारी भी भेजें",
    envDisabledNote: "पर्यावरण जानकारी के बिना भेजने पर समस्या को पुन: उत्पन्न करना कठिन हो सकता है और पुष्टि में देरी हो सकती है।",

    successImageAlt: "गले लगाकर धन्यवाद देता फूल-सुअर योनी",
    successTitle: "धन्यवाद!",
    successBody: "आपकी प्रतिक्रिया CODE DESTINY को बेहतर सेवा बनाने में बहुत मदद करती है। डेवलपर सावधानीपूर्वक जांच के बाद इसे अपडेट में शामिल करेंगे।",
    ticketNoLabel: "टिकट नंबर",
    ticketCopyAriaLabel: "टिकट नंबर कॉपी करें",
    writeAnotherButton: "एक और फीडबैक भेजें",
    goHomeButton: "होम पर जाएं",

    envLabelUrl: "जिस पेज की आप रिपोर्ट कर रहे हैं",
    envLabelUserAgent: "ब्राउज़र जानकारी",
    envLabelPlatform: "ऑपरेटिंग सिस्टम",
    envLabelViewport: "विंडो का आकार",
    envLabelScreen: "स्क्रीन रिज़ॉल्यूशन",
    envLabelDpr: "स्क्रीन स्केल",
    envLabelLanguage: "भाषा सेटिंग",
    envLabelTimezone: "समय क्षेत्र",
    envLabelTheme: "थीम",
    envLabelConnection: "नेटवर्क प्रकार",
    envLabelAppVersion: "ऐप संस्करण",
    envLabelBuildVersion: "बिल्ड",
    envLabelRuntime: "रनटाइम",
    envLabelSubmittedAt: "सबमिट समय",
    notCollectedIp: "आईपी पता · पहुंच स्थान",
    notCollectedPersonalInfo: "नाम · संपर्क जैसी सीधे दर्ज न की गई व्यक्तिगत जानकारी",
    notCollectedCookies: "कुकी · लॉगिन टोकन मान",
    notCollectedOtherTabs: "अन्य टैब या अन्य साइट की जानकारी",
    notCollectedClipboard: "क्लिपबोर्ड सामग्री",
    personaNeo: "नियो",
    personaYeoni: "योनी",
    schemeDark: "डार्क",
    schemeLight: "लाइट",

    apiErrorLoginRequired: "आपको साइन इन करना होगा।",
    apiErrorTooFrequent: "रिपोर्ट बहुत बार भेजी गई है। कृपया कुछ देर बाद फिर कोशिश करें।",
    apiErrorTransient: "अस्थायी त्रुटि। कृपया कुछ देर बाद फिर से भेजें।",
    apiErrorSubmitFailed: "फीडबैक भेजना विफल रहा। कृपया कुछ देर बाद फिर कोशिश करें।",

    uploadErrorNoFile: "कृपया एक छवि फ़ाइल चुनें।",
    uploadErrorBadType: "केवल jpg, png, webp छवियां ही संलग्न की जा सकती हैं।",
    uploadErrorEmptyFile: "खाली फ़ाइल संलग्न नहीं की जा सकती।",
    uploadErrorTooLarge: (maxSizeLabel) => `केवल ${maxSizeLabel} तक की छवियां संलग्न की जा सकती हैं।`,
    uploadErrorDimensionRead: "छवि का आकार नहीं पढ़ा जा सका।",
    uploadErrorOptimizeLoad: "अनुकूलन के दौरान लोड करने में विफल रहा।",
    uploadErrorTooLargeShort: "छवि बहुत बड़ी है।",
    uploadErrorStorageUnavailable: "अटैचमेंट स्टोरेज उपलब्ध नहीं है। कृपया बिना अटैचमेंट के रिपोर्ट भेजें।",
    uploadErrorGeneric: "छवि अपलोड करने में विफल रहा।",

    categories: {
      bug: {
        label: "बग", hint: "काम नहीं कर रहा",
        rewardNote: "वास्तविक बग के रूप में पुष्टि होने पर, प्रति रिपोर्ट 300 मूनस्टोन दिए जाते हैं।",
        fields: {
          repro: { label: "पुन: उत्पन्न करने का तरीका", placeholder: "1. साजू परिणाम स्क्रीन पर\n2. नीचे 'शेयर' बटन दबाने पर\n3. कोई प्रतिक्रिया नहीं होती" },
          expected: { label: "अपेक्षित परिणाम", placeholder: "मुझे उम्मीद थी कि शेयर शीट खुलेगी" },
          actual: { label: "वास्तविक परिणाम", placeholder: "स्क्रीन क्षण भर के लिए काली हुई और वैसी ही रह गई" },
        },
      },
      feature: {
        label: "फीचर सुझाव", hint: "काश यह होता",
        fields: { expected: { label: "इस फीचर की आवश्यकता क्यों है?", placeholder: "मैं दोस्त के साथ अनुकूलता देखने के बाद परिणामों की साथ में तुलना करना चाहता/चाहती हूं" } },
      },
      ui: {
        label: "यूआई सुधार", hint: "देखने में असुविधाजनक",
        fields: { expected: { label: "यह कैसे बदलना चाहिए?", placeholder: "अक्षर छोटे होने से पढ़ना मुश्किल है। थोड़ा बड़ा हो तो अच्छा होगा" } },
      },
      typo: {
        label: "टाइपो", hint: "पाठ गलत है",
        fields: {
          wrongText: { label: "गलत पाठ", placeholder: "कृपया इसे स्क्रीन पर दिखाई देने वाले पाठ के अनुसार पेस्ट करें" },
          suggestedText: { label: "कृपया इसे इस तरह ठीक करें", placeholder: "आपका सुझाया गया पाठ" },
        },
      },
      "ai-quality": {
        label: "एआई परिणाम गुणवत्ता", hint: "जवाब अजीब लगता है",
        fields: {
          featureName: { label: "यह कौन सा फीचर है?", placeholder: "उदा.) साजू विशेषज्ञ परामर्श, टैरो रीडिंग" },
          inputSummary: { label: "आपने जो दर्ज किया", placeholder: "आपने कौन सा प्रश्न या जानकारी दर्ज की?" },
          outputSummary: { label: "प्राप्त उत्तर में क्या अजीब लगा", placeholder: "कृपया उत्तर पेस्ट करें या सारांशित करें" },
        },
      },
      payment: {
        label: "भुगतान समस्या", hint: "भुगतान नहीं हो रहा",
        warning: "कार्ड नंबर, पासवर्ड, सीवीसी जैसी भुगतान जानकारी कभी दर्ज न करें। केवल ऑर्डर नंबर से ही जांच की जा सकती है।",
        fields: {
          orderId: { label: "ऑर्डर नंबर", placeholder: "ऑर्डर इतिहास स्क्रीन पर जांचा जा सकता है" },
          payMethod: { label: "भुगतान विधि", placeholder: "कृपया चुनें", options: ["एकमुश्त भुगतान (कार्ड)", "पास", "मूनस्टोन", "अन्य"] },
        },
      },
      translation: {
        label: "अनुवाद त्रुटि", hint: "अनुवाद अटपटा लगता है",
        fields: {
          language: { label: "भाषा", placeholder: "कृपया चुनें", options: ["English", "日本語", "中文", "अन्य"] },
          wrongText: { label: "अटपटा अनुवाद", placeholder: "स्क्रीन पर दिखाया गया पाठ" },
          suggestedText: { label: "सुझाया गया अनुवाद", placeholder: "इस तरह बदलने पर स्वाभाविक लगेगा" },
        },
      },
      performance: {
        label: "गति समस्या", hint: "बहुत धीमा है",
        fields: {
          delay: { label: "आपने कितनी देर इंतजार किया?", placeholder: "कृपया चुनें", options: ["3 सेकंड के भीतर लेकिन अटपटा लगा", "3–10 सेकंड", "10–30 सेकंड", "30 सेकंड से अधिक", "अंत तक नहीं आया"] },
          network: { label: "नेटवर्क", placeholder: "स्वतः जांचा जाता है" },
        },
      },
      mobile: {
        label: "केवल मोबाइल समस्या", hint: "केवल फोन पर गड़बड़ है",
        fields: {
          device: { label: "डिवाइस का नाम", placeholder: "उदा.) iPhone 15 Pro, Galaxy S24" },
          browser: { label: "ब्राउज़र", placeholder: "स्वतः जांचा जाता है" },
        },
      },
      etc: { label: "अन्य", hint: "अन्य राय", fields: {} },
    },
  },
  es: {
    heroEyebrow: "LABORATORIO CODE DESTINY",
    heroTitle: "Sala de Reportes de Errores",
    heroBodyLine1: "Cuando la pantalla se ve mal, un resultado se siente extraño, o piensas “ojalá existiera esto”.",
    heroBodyLine2: "Aunque sea una línea, ayuda — el laboratorio la lee directamente.",
    heroImageAlt: "Un cerdito de flores esperando tu opinión",
    responseTimeNote: "Revisión promedio 1–2 días · Responderemos a tu correo de registro",

    topNavAriaLabel: "Navegación de la sala de reportes",
    backButtonAriaLabel: "Ir a la página anterior",
    backButtonLabel: "Atrás",
    homeButtonLabel: "Inicio",

    submitErrorFallback: "No se pudo enviar el reporte.",
    draftBannerPrefix: "Tienes un borrador en progreso · ",
    draftResumeButton: "Continuar escribiendo",
    draftDiscardButton: "Empezar de nuevo",
    categoryQuestionLabel: "¿De qué se trata esto?",

    categoryGroupAriaLabel: "Tipo de reporte",

    loginGateTitle: "Escribe primero con confianza",
    loginGateBody: "Solo necesitarás iniciar sesión al enviar (para poder responderte). Lo que has escrito se guarda automáticamente y continúa después de iniciar sesión.",
    loginGateButton: "Iniciar sesión",

    titleLabel: "Título",
    titlePlaceholder: "Resúmelo en una línea",
    contentLabel: "Detalles",
    contentPlaceholder: "Escribe libremente sobre qué situación y qué se sintió mal. Puedes pegar una captura de pantalla aquí mismo.",
    contentMinLengthSuffix: (min) => ` · Ingresa al menos ${min} caracteres`,
    urlLabel: "Página sobre la que estás reportando",
    urlAutoFilledBadge: "Rellenado automáticamente",
    attachmentDisabledNote: "Inicia sesión para adjuntar capturas de pantalla. Lo que has escrito hasta ahora se guarda tal cual.",
    draftAutoSavedDefault: "Lo que escribes se guarda automáticamente",
    draftSavedPrefix: "Borrador guardado ",
    submittingButton: "Enviando…",
    uploadingButton: "Subiendo imagen…",
    submitAuthedButton: "Enviar reporte",
    submitUnauthedButton: "Iniciar sesión y enviar",

    attachmentSectionLabel: "Adjuntar capturas de pantalla",
    attachmentEmphasizeBadge: "Esto ayuda mucho",
    attachmentCountSuffix: (max, perFileSize) => `/${max} · hasta ${perFileSize} cada una`,
    attachmentPickButton: "Elegir foto",
    attachmentCameraButton: "Tomar foto",
    attachmentDragHint: "O arrástralo aquí · pega en el texto (Ctrl+V)",
    attachmentUploadingText: (count) => `Subiendo ${count} imagen(es)…`,
    attachmentPreviewAlt: "Vista previa de la captura de pantalla adjunta",
    attachmentRemoveAriaLabel: "Quitar adjunto",
    attachmentPrivacyNote: "Antes de adjuntar, verifica que no se vea información personal (nombre · contacto · conversación de otra persona).",

    envIntroPrefix: "Para reproducir el problema con precisión, enviamos tu ",
    envIntroStrong: "navegador · tamaño de pantalla · idioma · zona horaria · versión de la app",
    envIntroSuffix: " junto con el reporte.",
    envDetailsSummary: "¿Qué se envía junto con el reporte?",
    envSentTitle: "Información enviada",
    envNotCollectedTitle: "Información que no recopilamos",
    envPrivacyPrefix: "Consulta la ",
    envPrivacyLinkText: "Política de privacidad",
    envPrivacySuffix: " para más detalles.",
    envToggleLabel: "Enviar también información del entorno",
    envDisabledNote: "Sin la información del entorno, puede tardar más en confirmarse ya que es más difícil reproducir el problema.",

    successImageAlt: "Un cerdito de flores agradeciendo con un abrazo",
    successTitle: "¡Gracias!",
    successBody: "Tu comentario ayuda a que CODE DESTINY sea un mejor servicio. Nuestros desarrolladores lo revisarán cuidadosamente y lo reflejarán en una actualización.",
    ticketNoLabel: "Número de ticket",
    ticketCopyAriaLabel: "Copiar número de ticket",
    writeAnotherButton: "Enviar otro comentario",
    goHomeButton: "Inicio",

    envLabelUrl: "Página sobre la que estás reportando",
    envLabelUserAgent: "Información del navegador",
    envLabelPlatform: "Sistema operativo",
    envLabelViewport: "Tamaño de ventana",
    envLabelScreen: "Resolución de pantalla",
    envLabelDpr: "Escala de pantalla",
    envLabelLanguage: "Configuración de idioma",
    envLabelTimezone: "Zona horaria",
    envLabelTheme: "Tema",
    envLabelConnection: "Tipo de red",
    envLabelAppVersion: "Versión de la app",
    envLabelBuildVersion: "Build",
    envLabelRuntime: "Entorno de ejecución",
    envLabelSubmittedAt: "Hora de envío",
    notCollectedIp: "Dirección IP · ubicación de acceso",
    notCollectedPersonalInfo: "Información personal que no ingresaste directamente, como nombre o contacto",
    notCollectedCookies: "Valores de cookies · token de inicio de sesión",
    notCollectedOtherTabs: "Información de otras pestañas o sitios",
    notCollectedClipboard: "Contenido del portapapeles",
    personaNeo: "Neo",
    personaYeoni: "Yeoni",
    schemeDark: "Oscuro",
    schemeLight: "Claro",

    apiErrorLoginRequired: "Necesitas iniciar sesión.",
    apiErrorTooFrequent: "Demasiados reportes. Inténtalo de nuevo en un momento.",
    apiErrorTransient: "Error temporal. Envíalo de nuevo en un momento.",
    apiErrorSubmitFailed: "No se pudo enviar el reporte. Inténtalo de nuevo en un momento.",

    uploadErrorNoFile: "Por favor elige un archivo de imagen.",
    uploadErrorBadType: "Solo se pueden adjuntar imágenes jpg, png o webp.",
    uploadErrorEmptyFile: "No se puede adjuntar un archivo vacío.",
    uploadErrorTooLarge: (maxSizeLabel) => `Solo se pueden adjuntar imágenes de hasta ${maxSizeLabel}.`,
    uploadErrorDimensionRead: "No se pudieron leer las dimensiones de la imagen.",
    uploadErrorOptimizeLoad: "Error al cargar la imagen durante la optimización.",
    uploadErrorTooLargeShort: "La imagen es demasiado grande.",
    uploadErrorStorageUnavailable: "El almacenamiento de adjuntos no está disponible. Envía el reporte sin adjuntos.",
    uploadErrorGeneric: "No se pudo subir la imagen.",

    categories: {
      bug: {
        label: "Error", hint: "Algo no funciona",
        rewardNote: "Si se confirma como un error real, te daremos 300 piedras lunares por reporte.",
        fields: {
          repro: { label: "Pasos para reproducir", placeholder: "1. En la pantalla de resultado de Saju\n2. Toca el botón 'Compartir' abajo\n3. No pasa nada" },
          expected: { label: "Resultado esperado", placeholder: "Esperaba que se abriera la hoja de compartir" },
          actual: { label: "Resultado real", placeholder: "La pantalla se oscureció un momento y se quedó así" },
        },
      },
      feature: {
        label: "Solicitud de función", hint: "Ojalá existiera esto",
        fields: { expected: { label: "¿Por qué se necesita esta función?", placeholder: "Me gustaría comparar resultados de compatibilidad lado a lado con un amigo" } },
      },
      ui: {
        label: "Mejora de interfaz", hint: "Es incómodo de ver",
        fields: { expected: { label: "¿Cómo debería cambiar?", placeholder: "El texto es muy pequeño para leer. Sería bueno que fuera un poco más grande" } },
      },
      typo: {
        label: "Error tipográfico", hint: "El texto está mal",
        fields: {
          wrongText: { label: "El texto incorrecto", placeholder: "Pégalo exactamente como aparece en pantalla" },
          suggestedText: { label: "Corrígelo a esto", placeholder: "Tu texto sugerido" },
        },
      },
      "ai-quality": {
        label: "Calidad del resultado de IA", hint: "La respuesta parece incorrecta",
        fields: {
          featureName: { label: "¿Cuál función era?", placeholder: "ej. Consulta de experto en Saju, lectura de Tarot" },
          inputSummary: { label: "Lo que ingresaste", placeholder: "¿Qué pregunta o información ingresaste?" },
          outputSummary: { label: "Qué se sintió incorrecto en la respuesta", placeholder: "Pega o resume la respuesta" },
        },
      },
      payment: {
        label: "Problema de pago", hint: "El pago no se procesa",
        warning: "Nunca ingreses información de pago como número de tarjeta, contraseña o CVC. Un número de pedido es suficiente para buscarlo.",
        fields: {
          orderId: { label: "Número de pedido", placeholder: "Puedes encontrarlo en la pantalla de historial de pedidos" },
          payMethod: { label: "Método de pago", placeholder: "Por favor elige", options: ["Pago único (tarjeta)", "Pase", "Piedras lunares", "Otro"] },
        },
      },
      translation: {
        label: "Error de traducción", hint: "La traducción se siente rara",
        fields: {
          language: { label: "Idioma", placeholder: "Por favor elige", options: ["English", "日本語", "中文", "Otro"] },
          wrongText: { label: "Traducción incómoda", placeholder: "El texto mostrado en pantalla" },
          suggestedText: { label: "Traducción sugerida", placeholder: "Se leería más natural así" },
        },
      },
      performance: {
        label: "Lentitud", hint: "Es demasiado lento",
        fields: {
          delay: { label: "¿Cuánto tiempo esperaste?", placeholder: "Por favor elige", options: ["Menos de 3s pero se sintió lento", "3–10s", "10–30s", "Más de 30s", "Nunca terminó"] },
          network: { label: "Red", placeholder: "Verificado automáticamente" },
        },
      },
      mobile: {
        label: "Problema solo en móvil", hint: "Solo falla en mi teléfono",
        fields: {
          device: { label: "Nombre del dispositivo", placeholder: "ej. iPhone 15 Pro, Galaxy S24" },
          browser: { label: "Navegador", placeholder: "Verificado automáticamente" },
        },
      },
      etc: { label: "Otro", hint: "Cualquier otra cosa", fields: {} },
    },
  },
  fr: {
    heroEyebrow: "LABORATOIRE CODE DESTINY",
    heroTitle: "Salle de Signalement de Bugs",
    heroBodyLine1: "Quand un écran a l'air étrange, un résultat semble bizarre, ou vous pensez “j'aimerais que cette fonctionnalité existe”.",
    heroBodyLine2: "Même une ligne aide — le laboratoire la lit directement.",
    heroImageAlt: "Un petit cochon fleur attendant votre avis",
    responseTimeNote: "Vérification moyenne 1 à 2 jours · Nous répondrons à votre e-mail d'inscription",

    topNavAriaLabel: "Navigation de la salle de signalement",
    backButtonAriaLabel: "Aller à la page précédente",
    backButtonLabel: "Retour",
    homeButtonLabel: "Accueil",

    submitErrorFallback: "Impossible d'envoyer le signalement.",
    draftBannerPrefix: "Vous avez un brouillon en cours · ",
    draftResumeButton: "Continuer l'écriture",
    draftDiscardButton: "Recommencer",
    categoryQuestionLabel: "De quoi s'agit-il?",

    categoryGroupAriaLabel: "Type de signalement",

    loginGateTitle: "Écrivez d'abord librement",
    loginGateBody: "Vous n'aurez besoin de vous connecter qu'au moment de l'envoi (pour que nous puissions vous répondre). Ce que vous avez écrit est enregistré automatiquement et se poursuit après la connexion.",
    loginGateButton: "Se connecter",

    titleLabel: "Titre",
    titlePlaceholder: "Résumez en une ligne",
    contentLabel: "Détails",
    contentPlaceholder: "Décrivez librement la situation et ce qui semblait anormal. Vous pouvez coller une capture d'écran directement ici.",
    contentMinLengthSuffix: (min) => ` · Veuillez saisir au moins ${min} caractères`,
    urlLabel: "Page que vous signalez",
    urlAutoFilledBadge: "Rempli automatiquement",
    attachmentDisabledNote: "Connectez-vous pour joindre des captures d'écran. Ce que vous avez écrit jusqu'à présent est enregistré tel quel.",
    draftAutoSavedDefault: "Ce que vous écrivez est enregistré automatiquement",
    draftSavedPrefix: "Brouillon enregistré ",
    submittingButton: "Envoi en cours…",
    uploadingButton: "Téléversement de l'image…",
    submitAuthedButton: "Envoyer le commentaire",
    submitUnauthedButton: "Se connecter et envoyer",

    attachmentSectionLabel: "Joindre des captures d'écran",
    attachmentEmphasizeBadge: "Cela aide vraiment",
    attachmentCountSuffix: (max, perFileSize) => `/${max} · jusqu'à ${perFileSize} chacune`,
    attachmentPickButton: "Choisir une photo",
    attachmentCameraButton: "Prendre une photo",
    attachmentDragHint: "Ou glissez-la ici · collez dans le texte (Ctrl+V)",
    attachmentUploadingText: (count) => `Téléversement de ${count} image(s)…`,
    attachmentPreviewAlt: "Aperçu de la capture d'écran jointe",
    attachmentRemoveAriaLabel: "Retirer la pièce jointe",
    attachmentPrivacyNote: "Avant de joindre, vérifiez qu'aucune information personnelle (nom · contact · conversation d'une autre personne) n'est visible.",

    envIntroPrefix: "Pour reproduire le problème avec précision, nous envoyons vos ",
    envIntroStrong: "navigateur · taille d'écran · langue · fuseau horaire · version de l'application",
    envIntroSuffix: " en même temps.",
    envDetailsSummary: "Qu'est-ce qui est envoyé en même temps?",
    envSentTitle: "Informations envoyées",
    envNotCollectedTitle: "Informations que nous ne collectons pas",
    envPrivacyPrefix: "Consultez la ",
    envPrivacyLinkText: "Politique de confidentialité",
    envPrivacySuffix: " pour plus de détails.",
    envToggleLabel: "Envoyer aussi les informations d'environnement",
    envDisabledNote: "Sans les informations d'environnement, il peut être plus difficile de reproduire le problème et la confirmation peut prendre plus de temps.",

    successImageAlt: "Un petit cochon fleur remerciant avec un câlin",
    successTitle: "Merci!",
    successBody: "Votre commentaire aide à faire de CODE DESTINY un meilleur service. Nos développeurs l'examineront attentivement et le prendront en compte dans une mise à jour.",
    ticketNoLabel: "Numéro de ticket",
    ticketCopyAriaLabel: "Copier le numéro de ticket",
    writeAnotherButton: "Envoyer un autre commentaire",
    goHomeButton: "Accueil",

    envLabelUrl: "Page que vous signalez",
    envLabelUserAgent: "Informations du navigateur",
    envLabelPlatform: "Système d'exploitation",
    envLabelViewport: "Taille de la fenêtre",
    envLabelScreen: "Résolution d'écran",
    envLabelDpr: "Échelle d'écran",
    envLabelLanguage: "Paramètre de langue",
    envLabelTimezone: "Fuseau horaire",
    envLabelTheme: "Thème",
    envLabelConnection: "Type de réseau",
    envLabelAppVersion: "Version de l'application",
    envLabelBuildVersion: "Build",
    envLabelRuntime: "Environnement d'exécution",
    envLabelSubmittedAt: "Heure d'envoi",
    notCollectedIp: "Adresse IP · emplacement de connexion",
    notCollectedPersonalInfo: "Informations personnelles non saisies directement, comme le nom ou le contact",
    notCollectedCookies: "Valeurs de cookies · jeton de connexion",
    notCollectedOtherTabs: "Informations d'autres onglets ou d'autres sites",
    notCollectedClipboard: "Contenu du presse-papiers",
    personaNeo: "Neo",
    personaYeoni: "Yeoni",
    schemeDark: "Sombre",
    schemeLight: "Clair",

    apiErrorLoginRequired: "Vous devez vous connecter.",
    apiErrorTooFrequent: "Signalements trop fréquents. Réessayez dans un instant.",
    apiErrorTransient: "Erreur temporaire. Renvoyez dans un instant.",
    apiErrorSubmitFailed: "Impossible d'envoyer le signalement. Réessayez dans un instant.",

    uploadErrorNoFile: "Veuillez choisir un fichier image.",
    uploadErrorBadType: "Seules les images jpg, png ou webp peuvent être jointes.",
    uploadErrorEmptyFile: "Un fichier vide ne peut pas être joint.",
    uploadErrorTooLarge: (maxSizeLabel) => `Seules les images jusqu'à ${maxSizeLabel} peuvent être jointes.`,
    uploadErrorDimensionRead: "Impossible de lire les dimensions de l'image.",
    uploadErrorOptimizeLoad: "Échec du chargement de l'image pendant l'optimisation.",
    uploadErrorTooLargeShort: "L'image est trop volumineuse.",
    uploadErrorStorageUnavailable: "Le stockage des pièces jointes n'est pas disponible. Envoyez le signalement sans pièce jointe.",
    uploadErrorGeneric: "Impossible de téléverser l'image.",

    categories: {
      bug: {
        label: "Bug", hint: "Ça ne fonctionne pas",
        rewardNote: "Si confirmé comme un vrai bug, nous vous donnerons 300 pierres de lune par signalement.",
        fields: {
          repro: { label: "Étapes de reproduction", placeholder: "1. Sur l'écran de résultat Saju\n2. Appuyez sur le bouton 'Partager' en bas\n3. Rien ne se passe" },
          expected: { label: "Résultat attendu", placeholder: "Je m'attendais à ce que la feuille de partage s'ouvre" },
          actual: { label: "Résultat réel", placeholder: "L'écran s'est assombri un instant et est resté ainsi" },
        },
      },
      feature: {
        label: "Demande de fonctionnalité", hint: "J'aimerais que cette fonctionnalité existe",
        fields: { expected: { label: "Pourquoi cette fonctionnalité est-elle nécessaire?", placeholder: "J'aimerais comparer les résultats de compatibilité côte à côte avec un ami" } },
      },
      ui: {
        label: "Amélioration de l'interface", hint: "C'est inconfortable à regarder",
        fields: { expected: { label: "Comment devrait-il changer?", placeholder: "Le texte est trop petit pour être lu. Ce serait bien qu'il soit un peu plus grand" } },
      },
      typo: {
        label: "Faute de frappe", hint: "Le texte est incorrect",
        fields: {
          wrongText: { label: "Le texte incorrect", placeholder: "Veuillez le coller exactement comme affiché à l'écran" },
          suggestedText: { label: "Veuillez le corriger ainsi", placeholder: "Votre texte suggéré" },
        },
      },
      "ai-quality": {
        label: "Qualité du résultat IA", hint: "La réponse semble incorrecte",
        fields: {
          featureName: { label: "Quelle fonctionnalité était-ce?", placeholder: "ex. Consultation d'expert Saju, lecture de Tarot" },
          inputSummary: { label: "Ce que vous avez saisi", placeholder: "Quelle question ou information avez-vous saisie?" },
          outputSummary: { label: "Ce qui semblait incorrect dans la réponse", placeholder: "Collez ou résumez la réponse" },
        },
      },
      payment: {
        label: "Problème de paiement", hint: "Le paiement ne passe pas",
        warning: "Ne saisissez jamais d'informations de paiement comme le numéro de carte, le mot de passe ou le CVC. Un numéro de commande suffit pour vérifier.",
        fields: {
          orderId: { label: "Numéro de commande", placeholder: "Vous pouvez le trouver sur l'écran d'historique des commandes" },
          payMethod: { label: "Mode de paiement", placeholder: "Veuillez choisir", options: ["Paiement unique (carte)", "Pass", "Pierres de lune", "Autre"] },
        },
      },
      translation: {
        label: "Erreur de traduction", hint: "La traduction semble maladroite",
        fields: {
          language: { label: "Langue", placeholder: "Veuillez choisir", options: ["English", "日本語", "中文", "Autre"] },
          wrongText: { label: "Traduction maladroite", placeholder: "Le texte affiché à l'écran" },
          suggestedText: { label: "Traduction suggérée", placeholder: "Cela se lirait plus naturellement ainsi" },
        },
      },
      performance: {
        label: "Problème de lenteur", hint: "C'est trop lent",
        fields: {
          delay: { label: "Combien de temps avez-vous attendu?", placeholder: "Veuillez choisir", options: ["Moins de 3s mais lent", "3 à 10s", "10 à 30s", "Plus de 30s", "N'a jamais terminé"] },
          network: { label: "Réseau", placeholder: "Vérifié automatiquement" },
        },
      },
      mobile: {
        label: "Problème uniquement sur mobile", hint: "Bug uniquement sur mon téléphone",
        fields: {
          device: { label: "Nom de l'appareil", placeholder: "ex. iPhone 15 Pro, Galaxy S24" },
          browser: { label: "Navigateur", placeholder: "Vérifié automatiquement" },
        },
      },
      etc: { label: "Autre", hint: "Autre avis", fields: {} },
    },
  },
  de: {
    heroEyebrow: "CODE DESTINY LABOR",
    heroTitle: "Fehlermelde-Raum",
    heroBodyLine1: "Wenn ein Bildschirm seltsam aussieht, ein Ergebnis sich merkwürdig anfühlt oder du denkst “ich wünschte, es gäbe diese Funktion”.",
    heroBodyLine2: "Selbst eine Zeile hilft — das Labor liest sie direkt.",
    heroImageAlt: "Ein Blumenschwein, das auf dein Feedback wartet",
    responseTimeNote: "Durchschnittliche Prüfung 1–2 Tage · Wir antworten an deine Anmelde-E-Mail",

    topNavAriaLabel: "Navigation des Meldebereichs",
    backButtonAriaLabel: "Zur vorherigen Seite gehen",
    backButtonLabel: "Zurück",
    homeButtonLabel: "Start",

    submitErrorFallback: "Feedback konnte nicht gesendet werden.",
    draftBannerPrefix: "Du hast einen Entwurf in Arbeit · ",
    draftResumeButton: "Weiterschreiben",
    draftDiscardButton: "Neu beginnen",
    categoryQuestionLabel: "Worum geht es?",

    categoryGroupAriaLabel: "Feedback-Typ",

    loginGateTitle: "Schreib zuerst frei drauflos",
    loginGateBody: "Du musst dich nur beim Senden anmelden (damit wir antworten können). Was du geschrieben hast, wird automatisch gespeichert und nach der Anmeldung fortgesetzt.",
    loginGateButton: "Anmelden",

    titleLabel: "Titel",
    titlePlaceholder: "Fasse es in einer Zeile zusammen",
    contentLabel: "Details",
    contentPlaceholder: "Schreibe frei über die Situation und was sich falsch angefühlt hat. Du kannst einen Screenshot direkt hier einfügen.",
    contentMinLengthSuffix: (min) => ` · Bitte gib mindestens ${min} Zeichen ein`,
    urlLabel: "Seite, die du meldest",
    urlAutoFilledBadge: "Automatisch ausgefüllt",
    attachmentDisabledNote: "Melde dich an, um Screenshots anzuhängen. Was du bisher geschrieben hast, wird unverändert gespeichert.",
    draftAutoSavedDefault: "Was du schreibst wird automatisch gespeichert",
    draftSavedPrefix: "Entwurf gespeichert ",
    submittingButton: "Wird gesendet…",
    uploadingButton: "Bild wird hochgeladen…",
    submitAuthedButton: "Feedback senden",
    submitUnauthedButton: "Anmelden und senden",

    attachmentSectionLabel: "Screenshots anhängen",
    attachmentEmphasizeBadge: "Das hilft sehr",
    attachmentCountSuffix: (max, perFileSize) => `/${max} · bis zu ${perFileSize} pro Bild`,
    attachmentPickButton: "Foto auswählen",
    attachmentCameraButton: "Foto aufnehmen",
    attachmentDragHint: "Oder hierher ziehen · in den Text einfügen (Strg+V)",
    attachmentUploadingText: (count) => `${count} Bild(er) werden hochgeladen…`,
    attachmentPreviewAlt: "Vorschau des angehängten Screenshots",
    attachmentRemoveAriaLabel: "Anhang entfernen",
    attachmentPrivacyNote: "Prüfe vor dem Anhängen, ob keine persönlichen Daten (Name · Kontakt · fremde Unterhaltung) sichtbar sind.",

    envIntroPrefix: "Um das Problem genau nachzuvollziehen, senden wir deinen ",
    envIntroStrong: "Browser · Bildschirmgröße · Sprache · Zeitzone · App-Version",
    envIntroSuffix: " mit.",
    envDetailsSummary: "Was wird mitgesendet?",
    envSentTitle: "Mitgesendete Informationen",
    envNotCollectedTitle: "Informationen, die wir nicht erfassen",
    envPrivacyPrefix: "Details siehe ",
    envPrivacyLinkText: "Datenschutzrichtlinie",
    envPrivacySuffix: ".",
    envToggleLabel: "Umgebungsinformationen mitsenden",
    envDisabledNote: "Ohne Umgebungsinformationen kann es schwieriger sein, das Problem nachzuvollziehen, und die Bestätigung kann sich verzögern.",

    successImageAlt: "Ein Blumenschwein, das sich mit einer Umarmung bedankt",
    successTitle: "Danke!",
    successBody: "Dein Feedback hilft dabei, CODE DESTINY zu einem besseren Service zu machen. Unsere Entwickler prüfen es sorgfältig und berücksichtigen es in einem Update.",
    ticketNoLabel: "Ticketnummer",
    ticketCopyAriaLabel: "Ticketnummer kopieren",
    writeAnotherButton: "Weiteres Feedback senden",
    goHomeButton: "Zur Startseite",

    envLabelUrl: "Seite, die du meldest",
    envLabelUserAgent: "Browser-Informationen",
    envLabelPlatform: "Betriebssystem",
    envLabelViewport: "Fenstergröße",
    envLabelScreen: "Bildschirmauflösung",
    envLabelDpr: "Bildschirmskalierung",
    envLabelLanguage: "Spracheinstellung",
    envLabelTimezone: "Zeitzone",
    envLabelTheme: "Thema",
    envLabelConnection: "Netzwerktyp",
    envLabelAppVersion: "App-Version",
    envLabelBuildVersion: "Build",
    envLabelRuntime: "Laufzeitumgebung",
    envLabelSubmittedAt: "Sendezeitpunkt",
    notCollectedIp: "IP-Adresse · Zugriffsort",
    notCollectedPersonalInfo: "Nicht direkt eingegebene persönliche Daten wie Name oder Kontakt",
    notCollectedCookies: "Cookie- · Anmelde-Token-Werte",
    notCollectedOtherTabs: "Informationen aus anderen Tabs oder Websites",
    notCollectedClipboard: "Zwischenablage-Inhalt",
    personaNeo: "Neo",
    personaYeoni: "Yeoni",
    schemeDark: "Dunkel",
    schemeLight: "Hell",

    apiErrorLoginRequired: "Du musst dich anmelden.",
    apiErrorTooFrequent: "Zu viele Meldungen. Bitte versuche es in einem Moment erneut.",
    apiErrorTransient: "Vorübergehender Fehler. Bitte sende es in einem Moment erneut.",
    apiErrorSubmitFailed: "Feedback konnte nicht gesendet werden. Bitte versuche es in einem Moment erneut.",

    uploadErrorNoFile: "Bitte wähle eine Bilddatei aus.",
    uploadErrorBadType: "Es können nur jpg-, png- oder webp-Bilder angehängt werden.",
    uploadErrorEmptyFile: "Eine leere Datei kann nicht angehängt werden.",
    uploadErrorTooLarge: (maxSizeLabel) => `Es können nur Bilder bis ${maxSizeLabel} angehängt werden.`,
    uploadErrorDimensionRead: "Die Bildabmessungen konnten nicht gelesen werden.",
    uploadErrorOptimizeLoad: "Laden während der Optimierung fehlgeschlagen.",
    uploadErrorTooLargeShort: "Das Bild ist zu groß.",
    uploadErrorStorageUnavailable: "Der Anhangsspeicher ist nicht verfügbar. Bitte sende die Meldung ohne Anhang.",
    uploadErrorGeneric: "Das Bild konnte nicht hochgeladen werden.",

    categories: {
      bug: {
        label: "Fehler", hint: "Funktioniert nicht",
        rewardNote: "Wenn als echter Fehler bestätigt, erhältst du 300 Mondsteine pro Meldung.",
        fields: {
          repro: { label: "Schritte zur Reproduktion", placeholder: "1. Auf dem Saju-Ergebnisbildschirm\n2. Wenn ich unten auf 'Teilen' tippe\n3. Passiert nichts" },
          expected: { label: "Erwartetes Ergebnis", placeholder: "Ich erwartete, dass sich das Teilen-Blatt öffnet" },
          actual: { label: "Tatsächliches Ergebnis", placeholder: "Der Bildschirm wurde kurz dunkel und blieb so" },
        },
      },
      feature: {
        label: "Funktionswunsch", hint: "Ich wünschte, es gäbe diese Funktion",
        fields: { expected: { label: "Warum wird diese Funktion benötigt?", placeholder: "Ich möchte Kompatibilitätsergebnisse mit einem Freund nebeneinander vergleichen" } },
      },
      ui: {
        label: "UI-Verbesserung", hint: "Unangenehm anzusehen",
        fields: { expected: { label: "Wie sollte es sich ändern?", placeholder: "Der Text ist zu klein zum Lesen. Etwas größer wäre schön" } },
      },
      typo: {
        label: "Tippfehler", hint: "Text ist falsch",
        fields: {
          wrongText: { label: "Der falsche Text", placeholder: "Bitte füge ihn genau so ein, wie er auf dem Bildschirm steht" },
          suggestedText: { label: "Bitte so korrigieren", placeholder: "Dein vorgeschlagener Text" },
        },
      },
      "ai-quality": {
        label: "KI-Ergebnisqualität", hint: "Die Antwort wirkt seltsam",
        fields: {
          featureName: { label: "Welche Funktion war es?", placeholder: "z. B. Saju-Expertenberatung, Tarot-Lesung" },
          inputSummary: { label: "Was du eingegeben hast", placeholder: "Welche Frage oder Information hast du eingegeben?" },
          outputSummary: { label: "Was an der Antwort seltsam war", placeholder: "Bitte füge die Antwort ein oder fasse sie zusammen" },
        },
      },
      payment: {
        label: "Zahlungsproblem", hint: "Zahlung geht nicht durch",
        warning: "Gib niemals Zahlungsdaten wie Kartennummer, Passwort oder CVC ein. Eine Bestellnummer allein reicht zur Überprüfung aus.",
        fields: {
          orderId: { label: "Bestellnummer", placeholder: "Du findest sie im Bestellverlauf" },
          payMethod: { label: "Zahlungsmethode", placeholder: "Bitte wählen", options: ["Einmalzahlung (Karte)", "Pass", "Mondsteine", "Sonstiges"] },
        },
      },
      translation: {
        label: "Übersetzungsfehler", hint: "Die Übersetzung wirkt seltsam",
        fields: {
          language: { label: "Sprache", placeholder: "Bitte wählen", options: ["English", "日本語", "中文", "Sonstiges"] },
          wrongText: { label: "Ungeschickte Übersetzung", placeholder: "Der auf dem Bildschirm angezeigte Text" },
          suggestedText: { label: "Vorgeschlagene Übersetzung", placeholder: "So würde es sich natürlicher lesen" },
        },
      },
      performance: {
        label: "Geschwindigkeitsproblem", hint: "Viel zu langsam",
        fields: {
          delay: { label: "Wie lange hast du gewartet?", placeholder: "Bitte wählen", options: ["Unter 3s, fühlte sich aber zäh an", "3–10s", "10–30s", "Über 30s", "Kam nie"] },
          network: { label: "Netzwerk", placeholder: "Wird automatisch geprüft" },
        },
      },
      mobile: {
        label: "Nur mobiles Problem", hint: "Nur auf meinem Handy falsch",
        fields: {
          device: { label: "Gerätename", placeholder: "z. B. iPhone 15 Pro, Galaxy S24" },
          browser: { label: "Browser", placeholder: "Wird automatisch geprüft" },
        },
      },
      etc: { label: "Sonstiges", hint: "Sonstige Meinung", fields: {} },
    },
  },
  nl: {
    heroEyebrow: "CODE DESTINY LAB",
    heroTitle: "Bugmeldingsruimte",
    heroBodyLine1: "Als een scherm er raar uitziet, een resultaat vreemd aanvoelt, of je denkt “was deze functie er maar”.",
    heroBodyLine2: "Zelfs één regel helpt — het lab leest het direct.",
    heroImageAlt: "Een bloemenvarken dat op jouw feedback wacht",
    responseTimeNote: "Gemiddelde beoordeling 1–2 dagen · We antwoorden op je aanmeld-e-mail",

    topNavAriaLabel: "Navigatie van de meldruimte",
    backButtonAriaLabel: "Ga naar de vorige pagina",
    backButtonLabel: "Terug",
    homeButtonLabel: "Start",

    submitErrorFallback: "Kon de melding niet versturen.",
    draftBannerPrefix: "Je hebt een concept in bewerking · ",
    draftResumeButton: "Verder schrijven",
    draftDiscardButton: "Opnieuw beginnen",
    categoryQuestionLabel: "Waar gaat dit over?",

    categoryGroupAriaLabel: "Type melding",

    loginGateTitle: "Schrijf eerst vrijuit",
    loginGateBody: "Je hoeft alleen in te loggen bij het versturen (zodat we kunnen reageren). Wat je hebt geschreven wordt automatisch opgeslagen en gaat door na het inloggen.",
    loginGateButton: "Inloggen",

    titleLabel: "Titel",
    titlePlaceholder: "Vat het samen in één regel",
    contentLabel: "Details",
    contentPlaceholder: "Schrijf vrijuit over de situatie en wat er niet klopte. Je kunt hier direct een screenshot plakken.",
    contentMinLengthSuffix: (min) => ` · Voer minstens ${min} tekens in`,
    urlLabel: "Pagina die je meldt",
    urlAutoFilledBadge: "Automatisch ingevuld",
    attachmentDisabledNote: "Log in om screenshots toe te voegen. Wat je tot nu toe hebt geschreven, wordt zoals het is bewaard.",
    draftAutoSavedDefault: "Wat je schrijft wordt automatisch opgeslagen",
    draftSavedPrefix: "Tijdelijk opgeslagen ",
    submittingButton: "Versturen…",
    uploadingButton: "Afbeelding uploaden…",
    submitAuthedButton: "Feedback versturen",
    submitUnauthedButton: "Inloggen en versturen",

    attachmentSectionLabel: "Screenshots toevoegen",
    attachmentEmphasizeBadge: "Dit helpt enorm",
    attachmentCountSuffix: (max, perFileSize) => `/${max} · max. ${perFileSize} per stuk`,
    attachmentPickButton: "Foto kiezen",
    attachmentCameraButton: "Foto maken",
    attachmentDragHint: "Of hierheen slepen · in de tekst plakken (Ctrl+V)",
    attachmentUploadingText: (count) => `${count} afbeelding(en) uploaden…`,
    attachmentPreviewAlt: "Voorbeeld van de bijgevoegde screenshot",
    attachmentRemoveAriaLabel: "Bijlage verwijderen",
    attachmentPrivacyNote: "Controleer voor het toevoegen of er geen persoonlijke informatie (naam · contact · gesprek van iemand anders) zichtbaar is.",

    envIntroPrefix: "Om het probleem nauwkeurig te reproduceren, sturen we je ",
    envIntroStrong: "browser · schermgrootte · taal · tijdzone · app-versie",
    envIntroSuffix: " mee.",
    envDetailsSummary: "Wat wordt er meegestuurd?",
    envSentTitle: "Meegestuurde informatie",
    envNotCollectedTitle: "Informatie die we niet verzamelen",
    envPrivacyPrefix: "Zie het ",
    envPrivacyLinkText: "Privacybeleid",
    envPrivacySuffix: " voor details.",
    envToggleLabel: "Ook omgevingsinformatie meesturen",
    envDisabledNote: "Zonder omgevingsinformatie kan het lastiger zijn het probleem te reproduceren en kan bevestiging langer duren.",

    successImageAlt: "Een bloemenvarken dat je bedankt met een knuffel",
    successTitle: "Bedankt!",
    successBody: "Je feedback helpt om CODE DESTINY een betere service te maken. Onze ontwikkelaars bekijken het zorgvuldig en verwerken het in een update.",
    ticketNoLabel: "Ticketnummer",
    ticketCopyAriaLabel: "Ticketnummer kopiëren",
    writeAnotherButton: "Nog een reactie versturen",
    goHomeButton: "Naar start",

    envLabelUrl: "Pagina die je meldt",
    envLabelUserAgent: "Browserinformatie",
    envLabelPlatform: "Besturingssysteem",
    envLabelViewport: "Venstergrootte",
    envLabelScreen: "Schermresolutie",
    envLabelDpr: "Schermschaal",
    envLabelLanguage: "Taalinstelling",
    envLabelTimezone: "Tijdzone",
    envLabelTheme: "Thema",
    envLabelConnection: "Netwerktype",
    envLabelAppVersion: "App-versie",
    envLabelBuildVersion: "Build",
    envLabelRuntime: "Runtime-omgeving",
    envLabelSubmittedAt: "Verzendtijd",
    notCollectedIp: "IP-adres · toegangslocatie",
    notCollectedPersonalInfo: "Niet direct ingevoerde persoonlijke informatie zoals naam of contact",
    notCollectedCookies: "Cookie- · inlogtokenwaarden",
    notCollectedOtherTabs: "Informatie van andere tabbladen of sites",
    notCollectedClipboard: "Klembordinhoud",
    personaNeo: "Neo",
    personaYeoni: "Yeoni",
    schemeDark: "Donker",
    schemeLight: "Licht",

    apiErrorLoginRequired: "Je moet inloggen.",
    apiErrorTooFrequent: "Te veel meldingen. Probeer het straks opnieuw.",
    apiErrorTransient: "Tijdelijke fout. Verstuur het straks opnieuw.",
    apiErrorSubmitFailed: "Kon de melding niet versturen. Probeer het straks opnieuw.",

    uploadErrorNoFile: "Kies een afbeeldingsbestand.",
    uploadErrorBadType: "Alleen jpg-, png- of webp-afbeeldingen kunnen worden toegevoegd.",
    uploadErrorEmptyFile: "Een leeg bestand kan niet worden toegevoegd.",
    uploadErrorTooLarge: (maxSizeLabel) => `Alleen afbeeldingen tot ${maxSizeLabel} kunnen worden toegevoegd.`,
    uploadErrorDimensionRead: "Kon de afbeeldingsafmetingen niet lezen.",
    uploadErrorOptimizeLoad: "Laden tijdens optimalisatie mislukt.",
    uploadErrorTooLargeShort: "De afbeelding is te groot.",
    uploadErrorStorageUnavailable: "Bijlageopslag is niet beschikbaar. Verstuur de melding zonder bijlage.",
    uploadErrorGeneric: "Kon de afbeelding niet uploaden.",

    categories: {
      bug: {
        label: "Bug", hint: "Werkt niet",
        rewardNote: "Als bevestigd als echte bug, ontvang je 300 maanstenen per melding.",
        fields: {
          repro: { label: "Reproductiestappen", placeholder: "1. Op het Saju-resultatenscherm\n2. Als ik onderaan op 'Delen' tik\n3. Gebeurt er niets" },
          expected: { label: "Verwacht resultaat", placeholder: "Ik verwachtte dat het deelblad zou openen" },
          actual: { label: "Werkelijk resultaat", placeholder: "Het scherm werd even donker en bleef zo" },
        },
      },
      feature: {
        label: "Functiesuggestie", hint: "Was deze functie er maar",
        fields: { expected: { label: "Waarom is deze functie nodig?", placeholder: "Ik wil compatibiliteitsresultaten naast elkaar vergelijken met een vriend" } },
      },
      ui: {
        label: "UI-verbetering", hint: "Onprettig om naar te kijken",
        fields: { expected: { label: "Hoe zou het moeten veranderen?", placeholder: "De tekst is te klein om te lezen. Iets groter zou fijn zijn" } },
      },
      typo: {
        label: "Typfout", hint: "Tekst klopt niet",
        fields: {
          wrongText: { label: "De verkeerde tekst", placeholder: "Plak het precies zoals het op het scherm staat" },
          suggestedText: { label: "Corrigeer het naar dit", placeholder: "Je voorgestelde tekst" },
        },
      },
      "ai-quality": {
        label: "Kwaliteit AI-resultaat", hint: "Het antwoord lijkt vreemd",
        fields: {
          featureName: { label: "Welke functie was het?", placeholder: "bijv. Saju-expertconsult, Tarot-lezing" },
          inputSummary: { label: "Wat je hebt ingevoerd", placeholder: "Welke vraag of informatie heb je ingevoerd?" },
          outputSummary: { label: "Wat vreemd was aan het antwoord", placeholder: "Plak of vat het antwoord samen" },
        },
      },
      payment: {
        label: "Betalingsprobleem", hint: "Betaling lukt niet",
        warning: "Voer nooit betaalgegevens in zoals kaartnummer, wachtwoord of CVC. Alleen een bestelnummer is al genoeg om na te kijken.",
        fields: {
          orderId: { label: "Bestelnummer", placeholder: "Te vinden in het bestelgeschiedenisscherm" },
          payMethod: { label: "Betaalmethode", placeholder: "Kies alstublieft", options: ["Eenmalige betaling (kaart)", "Pas", "Maanstenen", "Anders"] },
        },
      },
      translation: {
        label: "Vertaalfout", hint: "De vertaling voelt onnatuurlijk",
        fields: {
          language: { label: "Taal", placeholder: "Kies alstublieft", options: ["English", "日本語", "中文", "Anders"] },
          wrongText: { label: "Onnatuurlijke vertaling", placeholder: "De tekst zoals getoond op het scherm" },
          suggestedText: { label: "Voorgestelde vertaling", placeholder: "Zo zou het natuurlijker klinken" },
        },
      },
      performance: {
        label: "Snelheidsprobleem", hint: "Veel te traag",
        fields: {
          delay: { label: "Hoelang heb je gewacht?", placeholder: "Kies alstublieft", options: ["Binnen 3s maar voelde traag", "3–10s", "10–30s", "Meer dan 30s", "Kwam nooit"] },
          network: { label: "Netwerk", placeholder: "Automatisch gecontroleerd" },
        },
      },
      mobile: {
        label: "Alleen mobiel probleem", hint: "Alleen op mijn telefoon fout",
        fields: {
          device: { label: "Apparaatnaam", placeholder: "bijv. iPhone 15 Pro, Galaxy S24" },
          browser: { label: "Browser", placeholder: "Automatisch gecontroleerd" },
        },
      },
      etc: { label: "Anders", hint: "Andere mening", fields: {} },
    },
  },
  ms: {
    heroEyebrow: "MAKMAL CODE DESTINY",
    heroTitle: "Bilik Laporan Pepijat",
    heroBodyLine1: "Apabila skrin kelihatan pelik, keputusan terasa ganjil, atau anda terfikir “andai kata ada ciri ini”.",
    heroBodyLine2: "Walaupun satu baris pun membantu — makmal membacanya secara terus.",
    heroImageAlt: "Babi bunga yang menunggu maklum balas anda",
    responseTimeNote: "Semakan purata 1–2 hari · Kami akan membalas ke e-mel pendaftaran anda",

    topNavAriaLabel: "Navigasi bilik laporan",
    backButtonAriaLabel: "Pergi ke halaman sebelumnya",
    backButtonLabel: "Kembali",
    homeButtonLabel: "Laman Utama",

    submitErrorFallback: "Gagal menghantar maklum balas.",
    draftBannerPrefix: "Anda mempunyai draf yang sedang ditulis · ",
    draftResumeButton: "Sambung menulis",
    draftDiscardButton: "Tulis semula",
    categoryQuestionLabel: "Ini tentang apa?",

    categoryGroupAriaLabel: "Jenis maklum balas",

    loginGateTitle: "Tulis dahulu dengan selesa",
    loginGateBody: "Anda hanya perlu log masuk semasa menghantar (supaya kami dapat membalas). Apa yang anda tulis disimpan secara automatik dan diteruskan selepas log masuk.",
    loginGateButton: "Log masuk",

    titleLabel: "Tajuk",
    titlePlaceholder: "Ringkaskan dalam satu baris",
    contentLabel: "Butiran",
    contentPlaceholder: "Tulis dengan bebas tentang situasi apa dan apa yang terasa ganjil. Anda boleh tampal tangkapan skrin terus di sini.",
    contentMinLengthSuffix: (min) => ` · Sila masukkan sekurang-kurangnya ${min} aksara`,
    urlLabel: "Halaman yang anda laporkan",
    urlAutoFilledBadge: "Diisi automatik",
    attachmentDisabledNote: "Log masuk untuk melampirkan tangkapan skrin. Apa yang anda tulis setakat ini disimpan seadanya.",
    draftAutoSavedDefault: "Apa yang anda tulis disimpan secara automatik",
    draftSavedPrefix: "Disimpan sementara ",
    submittingButton: "Menghantar…",
    uploadingButton: "Memuat naik imej…",
    submitAuthedButton: "Hantar maklum balas",
    submitUnauthedButton: "Log masuk dan hantar",

    attachmentSectionLabel: "Lampirkan tangkapan skrin",
    attachmentEmphasizeBadge: "Ini sangat membantu",
    attachmentCountSuffix: (max, perFileSize) => `/${max} · sehingga ${perFileSize} setiap satu`,
    attachmentPickButton: "Pilih foto",
    attachmentCameraButton: "Ambil foto",
    attachmentDragHint: "Atau seret ke sini · tampal dalam teks (Ctrl+V)",
    attachmentUploadingText: (count) => `Memuat naik ${count} imej…`,
    attachmentPreviewAlt: "Pratonton tangkapan skrin yang dilampirkan",
    attachmentRemoveAriaLabel: "Buang lampiran",
    attachmentPrivacyNote: "Sebelum melampirkan, sila pastikan tiada maklumat peribadi (nama · hubungan · perbualan orang lain) kelihatan.",

    envIntroPrefix: "Untuk menghasilkan semula isu dengan tepat, kami menghantar ",
    envIntroStrong: "pelayar · saiz skrin · bahasa · zon waktu · versi aplikasi",
    envIntroSuffix: " anda sekali.",
    envDetailsSummary: "Apa yang dihantar sekali?",
    envSentTitle: "Maklumat yang dihantar",
    envNotCollectedTitle: "Maklumat yang tidak kami kumpul",
    envPrivacyPrefix: "Lihat ",
    envPrivacyLinkText: "Dasar Privasi",
    envPrivacySuffix: " untuk butiran.",
    envToggleLabel: "Hantar maklumat persekitaran sekali",
    envDisabledNote: "Tanpa maklumat persekitaran, isu mungkin lebih sukar dihasilkan semula dan pengesahan mungkin mengambil masa lebih lama.",

    successImageAlt: "Babi bunga yang berterima kasih dengan pelukan",
    successTitle: "Terima kasih!",
    successBody: "Maklum balas anda membantu menjadikan CODE DESTINY perkhidmatan yang lebih baik. Pembangun kami akan menyemak dengan teliti dan memasukkannya dalam kemas kini.",
    ticketNoLabel: "Nombor tiket",
    ticketCopyAriaLabel: "Salin nombor tiket",
    writeAnotherButton: "Hantar maklum balas lain",
    goHomeButton: "Ke laman utama",

    envLabelUrl: "Halaman yang anda laporkan",
    envLabelUserAgent: "Maklumat pelayar",
    envLabelPlatform: "Sistem operasi",
    envLabelViewport: "Saiz tetingkap",
    envLabelScreen: "Resolusi skrin",
    envLabelDpr: "Skala skrin",
    envLabelLanguage: "Tetapan bahasa",
    envLabelTimezone: "Zon waktu",
    envLabelTheme: "Tema",
    envLabelConnection: "Jenis rangkaian",
    envLabelAppVersion: "Versi aplikasi",
    envLabelBuildVersion: "Binaan",
    envLabelRuntime: "Persekitaran masa jalan",
    envLabelSubmittedAt: "Masa hantar",
    notCollectedIp: "Alamat IP · lokasi capaian",
    notCollectedPersonalInfo: "Maklumat peribadi yang tidak dimasukkan terus seperti nama atau hubungan",
    notCollectedCookies: "Nilai kuki · token log masuk",
    notCollectedOtherTabs: "Maklumat dari tab atau laman lain",
    notCollectedClipboard: "Kandungan papan keratan",
    personaNeo: "Neo",
    personaYeoni: "Yeoni",
    schemeDark: "Gelap",
    schemeLight: "Cerah",

    apiErrorLoginRequired: "Anda perlu log masuk.",
    apiErrorTooFrequent: "Laporan terlalu kerap. Sila cuba lagi sebentar lagi.",
    apiErrorTransient: "Ralat sementara. Sila hantar semula sebentar lagi.",
    apiErrorSubmitFailed: "Gagal menghantar maklum balas. Sila cuba lagi sebentar lagi.",

    uploadErrorNoFile: "Sila pilih fail imej.",
    uploadErrorBadType: "Hanya imej jpg, png, webp boleh dilampirkan.",
    uploadErrorEmptyFile: "Fail kosong tidak boleh dilampirkan.",
    uploadErrorTooLarge: (maxSizeLabel) => `Hanya imej sehingga ${maxSizeLabel} boleh dilampirkan.`,
    uploadErrorDimensionRead: "Gagal membaca dimensi imej.",
    uploadErrorOptimizeLoad: "Gagal memuatkan semasa pengoptimuman.",
    uploadErrorTooLargeShort: "Imej terlalu besar.",
    uploadErrorStorageUnavailable: "Storan lampiran tidak tersedia. Sila hantar laporan tanpa lampiran.",
    uploadErrorGeneric: "Gagal memuat naik imej.",

    categories: {
      bug: {
        label: "Pepijat", hint: "Tidak berfungsi",
        rewardNote: "Jika disahkan sebagai pepijat sebenar, anda akan diberi 300 batu bulan setiap laporan.",
        fields: {
          repro: { label: "Langkah untuk menghasilkan semula", placeholder: "1. Pada skrin keputusan Saju\n2. Apabila menekan butang 'Kongsi' di bawah\n3. Tiada tindak balas" },
          expected: { label: "Keputusan yang dijangka", placeholder: "Saya menjangkakan helaian kongsi akan terbuka" },
          actual: { label: "Keputusan sebenar", placeholder: "Skrin menjadi gelap seketika dan kekal begitu" },
        },
      },
      feature: {
        label: "Cadangan ciri", hint: "Andai kata ada ciri ini",
        fields: { expected: { label: "Kenapa ciri ini diperlukan?", placeholder: "Saya ingin membandingkan keputusan keserasian bersebelahan dengan rakan" } },
      },
      ui: {
        label: "Penambahbaikan UI", hint: "Tidak selesa dilihat",
        fields: { expected: { label: "Bagaimana ia patut berubah?", placeholder: "Tulisan terlalu kecil untuk dibaca. Lebih baik jika lebih besar sedikit" } },
      },
      typo: {
        label: "Kesilapan taip", hint: "Teks salah",
        fields: {
          wrongText: { label: "Teks yang salah", placeholder: "Sila tampal tepat seperti yang dipaparkan pada skrin" },
          suggestedText: { label: "Sila betulkan kepada ini", placeholder: "Teks yang anda cadangkan" },
        },
      },
      "ai-quality": {
        label: "Kualiti keputusan AI", hint: "Jawapan kelihatan pelik",
        fields: {
          featureName: { label: "Ciri yang mana?", placeholder: "cth) Konsultasi pakar Saju, bacaan Tarot" },
          inputSummary: { label: "Apa yang anda masukkan", placeholder: "Soalan atau maklumat apa yang anda masukkan?" },
          outputSummary: { label: "Bahagian yang pelik dalam jawapan yang diterima", placeholder: "Sila tampal atau ringkaskan jawapan tersebut" },
        },
      },
      payment: {
        label: "Isu pembayaran", hint: "Pembayaran tidak berjaya",
        warning: "Jangan sesekali masukkan maklumat pembayaran seperti nombor kad, kata laluan, CVC. Nombor pesanan sahaja sudah memadai untuk disemak.",
        fields: {
          orderId: { label: "Nombor pesanan", placeholder: "Boleh disemak pada skrin sejarah pesanan" },
          payMethod: { label: "Kaedah pembayaran", placeholder: "Sila pilih", options: ["Bayaran sekali (kad)", "Pas", "Batu bulan", "Lain-lain"] },
        },
      },
      translation: {
        label: "Ralat terjemahan", hint: "Terjemahan terasa janggal",
        fields: {
          language: { label: "Bahasa", placeholder: "Sila pilih", options: ["English", "日本語", "中文", "Lain-lain"] },
          wrongText: { label: "Terjemahan janggal", placeholder: "Teks yang dipaparkan pada skrin" },
          suggestedText: { label: "Terjemahan yang dicadangkan", placeholder: "Akan lebih semula jadi jika ditukar begini" },
        },
      },
      performance: {
        label: "Isu kelajuan", hint: "Terlalu perlahan",
        fields: {
          delay: { label: "Berapa lama anda menunggu?", placeholder: "Sila pilih", options: ["Dalam 3s tetapi terasa perlahan", "3–10s", "10–30s", "Lebih 30s", "Tidak muncul langsung"] },
          network: { label: "Rangkaian", placeholder: "Disemak secara automatik" },
        },
      },
      mobile: {
        label: "Isu khusus mudah alih", hint: "Hanya pelik pada telefon saya",
        fields: {
          device: { label: "Nama peranti", placeholder: "cth) iPhone 15 Pro, Galaxy S24" },
          browser: { label: "Pelayar", placeholder: "Disemak secara automatik" },
        },
      },
      etc: { label: "Lain-lain", hint: "Pendapat lain", fields: {} },
    },
  },
};

export function getFeedbackCopy(locale: LoadingLocale): FeedbackCopy {
  return FEEDBACK_COPY[locale] || FEEDBACK_COPY_EN;
}

export function useFeedbackCopy(): FeedbackCopy {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  useEffect(() => {
    const sync = () => setLocale(getCurrentLoadingLocale());
    window.addEventListener("languagechange", sync);
    document.addEventListener("cd:language-change", sync);
    return () => {
      window.removeEventListener("languagechange", sync);
      document.removeEventListener("cd:language-change", sync);
    };
  }, []);
  return getFeedbackCopy(locale);
}
