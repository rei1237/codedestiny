// /feedback 전체가 공유하는 로케일 카피.
//
// 🔴 이 파일은 FeedbackClient.tsx 등 여러 컴포넌트가 공유하지만, 그 컴포넌트들을
//    import 하지 않는 독립 모듈이다 — 순환참조 없이 어디서든 안전하게 가져다 쓸 수 있다.

import { useEffect, useState } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";
import type { FeedbackCategoryId } from "./categories";

export interface FeedbackCategoryFieldCopy {
  label: string;
  placeholder: string;
  options?: string[];
}

export interface FeedbackCategoryCopy {
  label: string;
  hint: string;
  warning?: string;
  rewardNote?: string;
  fields: Record<string, FeedbackCategoryFieldCopy>;
}

export interface FeedbackCopy {
  navAriaLabel: string;
  back: string;
  backAria: string;
  home: string;

  heroKicker: string;
  heroTitle: string;
  heroBodyLine1: string;
  heroBodyLine2: string;
  avgResponseNote: string;
  heroImageAlt: string;

  categoryGridAria: string;
  categoryHeading: string;
  categories: Record<FeedbackCategoryId, FeedbackCategoryCopy>;

  draftBannerText: string;
  draftContinue: string;
  draftRestart: string;

  titleFieldLabel: string;
  titlePlaceholder: string;
  contentFieldLabel: string;
  contentPlaceholder: string;
  contentMinLengthSuffix: string;
  urlFieldLabel: string;
  urlAutoFilledBadge: string;
  attachmentDisabledNote: string;
  savedAtPrefix: string;
  autoSaveNote: string;
  submitSending: string;
  submitUploading: string;
  submitSend: string;
  submitLoginAndSend: string;
  submitErrorFallback: string;

  loginGateTitle: string;
  loginGateBody: string;
  loginButton: string;

  envIntroPrefix: string;
  envIntroBold: string;
  envIntroSuffix: string;
  envDetailsSummary: string;
  envSentHeading: string;
  envNotCollectedHeading: string;
  envPrivacyPrefix: string;
  envPrivacyLink: string;
  envPrivacySuffix: string;
  envToggleLabel: string;
  envToggleOffWarning: string;

  attachmentLabel: string;
  attachmentEmphasizeNote: string;
  attachmentCountSuffix: string;
  attachmentPickButton: string;
  attachmentCameraButton: string;
  attachmentDropHint: string;
  attachmentUploadingTemplate: string;
  attachmentPreviewAlt: string;
  attachmentRemoveAria: string;
  attachmentPrivacyNote: string;

  successImageAlt: string;
  successTitle: string;
  successBody: string;
  successTicketLabel: string;
  successCopyAria: string;
  successWriteAnother: string;
  successGoHome: string;

  uploadErrorSelectImage: string;
  uploadErrorUnsupportedType: string;
  uploadErrorEmptyFile: string;
  uploadErrorTooLargeTemplate: string;
  uploadErrorReadDimensions: string;
  uploadErrorOptimizeLoad: string;
  uploadErrorTooLargeResponse: string;
  uploadErrorStorageUnavailable: string;
  uploadErrorGeneric: string;

  apiErrorLoginRequired: string;
  apiErrorRateLimited: string;
  apiErrorTemporary: string;
  apiErrorGeneric: string;
}

function fields(entries: Record<string, FeedbackCategoryFieldCopy>): Record<string, FeedbackCategoryFieldCopy> {
  return entries;
}

const FEEDBACK_COPY_KO: FeedbackCopy = {
  navAriaLabel: "제보실 내비게이션",
  back: "뒤로",
  backAria: "이전 페이지로 이동",
  home: "홈",

  heroKicker: "CODE DESTINY 연구소",
  heroTitle: "버그 제보실",
  heroBodyLine1: "화면이 이상하거나, 결과가 어색하거나, “이런 게 있었으면” 싶을 때.",
  heroBodyLine2: "한 줄이라도 좋으니 알려주세요 — 연구소가 직접 읽습니다.",
  avgResponseNote: "평균 확인 1~2일 · 답변은 가입하신 이메일로 보내드립니다",
  heroImageAlt: "의견을 기다리는 꽃돼지 연이",

  categoryGridAria: "제보 유형",
  categoryHeading: "어떤 이야기인가요?",
  categories: {
    bug: {
      label: "버그",
      hint: "동작하지 않아요",
      rewardNote: "실제 버그로 확인되면 제보 1건당 월정석 300개를 드려요.",
      fields: fields({
        repro: { label: "재현 방법", placeholder: "1. 사주 결과 화면에서\n2. 하단 '공유' 버튼을 누르면\n3. 아무 반응이 없습니다" },
        expected: { label: "기대했던 결과", placeholder: "공유 시트가 열릴 것으로 기대했습니다" },
        actual: { label: "실제 결과", placeholder: "화면이 잠깐 어두워졌다가 그대로입니다" },
      }),
    },
    feature: {
      label: "기능 제안",
      hint: "이런 게 있었으면",
      fields: fields({
        expected: { label: "이 기능이 왜 필요한가요?", placeholder: "친구와 궁합을 본 뒤 결과를 나란히 비교하고 싶어요" },
      }),
    },
    ui: {
      label: "UI 개선",
      hint: "보기 불편해요",
      fields: fields({
        expected: { label: "어떻게 바뀌면 좋을까요?", placeholder: "글자가 작아서 읽기 힘들어요. 조금 더 크면 좋겠습니다" },
      }),
    },
    typo: {
      label: "오탈자",
      hint: "글자가 틀렸어요",
      fields: fields({
        wrongText: { label: "잘못된 문구", placeholder: "화면에 적힌 그대로 붙여넣어 주세요" },
        suggestedText: { label: "이렇게 고쳐주세요", placeholder: "제안하는 문구" },
      }),
    },
    "ai-quality": {
      label: "AI 결과 품질",
      hint: "답변이 이상해요",
      fields: fields({
        featureName: { label: "어떤 기능인가요?", placeholder: "예) 사주 전문가 상담, 타로 리딩" },
        inputSummary: { label: "입력한 내용", placeholder: "어떤 질문·정보를 넣으셨나요?" },
        outputSummary: { label: "받은 답변에서 이상했던 부분", placeholder: "답변을 붙여넣거나 요약해 주세요" },
      }),
    },
    payment: {
      label: "결제 문제",
      hint: "결제가 안 돼요",
      warning: "카드번호·비밀번호·CVC 등 결제 정보는 절대 입력하지 마세요. 주문번호만으로 확인할 수 있습니다.",
      fields: fields({
        orderId: { label: "주문번호", placeholder: "주문내역 화면에서 확인할 수 있습니다" },
        payMethod: { label: "결제 수단", placeholder: "선택해 주세요", options: ["단건 결제(카드)", "이용권", "월정석", "기타"] },
      }),
    },
    translation: {
      label: "번역 오류",
      hint: "번역이 어색해요",
      fields: fields({
        language: { label: "언어", placeholder: "선택해 주세요", options: ["English", "日本語", "中文", "기타"] },
        wrongText: { label: "어색한 번역", placeholder: "화면에 표시된 문구" },
        suggestedText: { label: "제안하는 번역", placeholder: "이렇게 바꾸면 자연스럽습니다" },
      }),
    },
    performance: {
      label: "속도 문제",
      hint: "너무 느려요",
      fields: fields({
        delay: { label: "얼마나 기다리셨나요?", placeholder: "선택해 주세요", options: ["3초 이내지만 답답함", "3~10초", "10~30초", "30초 이상", "끝내 안 나옴"] },
        network: { label: "네트워크", placeholder: "자동으로 확인합니다" },
      }),
    },
    mobile: {
      label: "모바일 문제",
      hint: "폰에서만 이상해요",
      fields: fields({
        device: { label: "기기명", placeholder: "예) iPhone 15 Pro, 갤럭시 S24" },
        browser: { label: "브라우저", placeholder: "자동으로 확인합니다" },
      }),
    },
    etc: {
      label: "기타",
      hint: "그 밖의 의견",
      fields: fields({}),
    },
  },

  draftBannerText: "작성 중이던 내용이 있어요",
  draftContinue: "이어서 쓰기",
  draftRestart: "새로 쓰기",

  titleFieldLabel: "제목",
  titlePlaceholder: "한 줄로 요약해 주세요",
  contentFieldLabel: "내용",
  contentPlaceholder: "어떤 상황에서 무엇이 이상했는지 편하게 적어주세요. 스크린샷은 여기에 바로 붙여넣어도 됩니다.",
  contentMinLengthSuffix: "자 이상 입력해 주세요",
  urlFieldLabel: "제보 대상 페이지",
  urlAutoFilledBadge: "자동 입력됨",
  attachmentDisabledNote: "로그인하면 스크린샷을 첨부할 수 있어요. 지금 쓰신 내용은 그대로 저장됩니다.",
  savedAtPrefix: "임시 저장됨",
  autoSaveNote: "작성 중인 내용은 자동으로 저장됩니다",
  submitSending: "보내는 중…",
  submitUploading: "이미지 올리는 중…",
  submitSend: "의견 보내기",
  submitLoginAndSend: "로그인하고 보내기",
  submitErrorFallback: "제보 전송에 실패했습니다.",

  loginGateTitle: "먼저 편하게 작성하세요",
  loginGateBody: "보낼 때만 로그인이 필요해요(회신을 드리기 위해서예요). 지금 쓰신 내용은 자동 저장돼서 로그인 후 그대로 이어집니다.",
  loginButton: "로그인",

  envIntroPrefix: "문제를 정확히 재현하기 위해",
  envIntroBold: "브라우저 · 화면 크기 · 언어 · 시간대 · 앱 버전",
  envIntroSuffix: "정보를 함께 보냅니다.",
  envDetailsSummary: "무엇이 함께 전송되나요?",
  envSentHeading: "함께 보내는 정보",
  envNotCollectedHeading: "수집하지 않는 정보",
  envPrivacyPrefix: "자세한 내용은",
  envPrivacyLink: "개인정보처리방침",
  envPrivacySuffix: "을 참고해 주세요.",
  envToggleLabel: "환경 정보 함께 보내기",
  envToggleOffWarning: "환경 정보 없이 보내면 문제를 재현하기 어려워 확인이 늦어질 수 있습니다.",

  attachmentLabel: "스크린샷 첨부",
  attachmentEmphasizeNote: "도움이 많이 됩니다",
  attachmentCountSuffix: "장당",
  attachmentPickButton: "사진 선택",
  attachmentCameraButton: "사진 촬영",
  attachmentDropHint: "또는 여기로 끌어다 놓기 · 본문에 붙여넣기(Ctrl+V)",
  attachmentUploadingTemplate: "이미지 {n}장 올리는 중…",
  attachmentPreviewAlt: "첨부한 스크린샷 미리보기",
  attachmentRemoveAria: "첨부 삭제",
  attachmentPrivacyNote: "첨부 전 개인정보(이름 · 연락처 · 타인의 대화)가 보이지 않는지 확인해 주세요.",

  successImageAlt: "고맙다는 인사를 건네는 꽃돼지 연이",
  successTitle: "감사합니다!",
  successBody: "보내주신 의견은 CODE DESTINY를 더 좋은 서비스로 만드는 데 큰 도움이 됩니다. 개발자가 꼼꼼히 확인한 뒤 업데이트에 반영하겠습니다.",
  successTicketLabel: "접수 번호",
  successCopyAria: "접수 번호 복사",
  successWriteAnother: "또 다른 의견 보내기",
  successGoHome: "홈으로",

  uploadErrorSelectImage: "이미지 파일을 선택해 주세요.",
  uploadErrorUnsupportedType: "jpg, png, webp 이미지만 첨부할 수 있습니다.",
  uploadErrorEmptyFile: "빈 파일은 첨부할 수 없습니다.",
  uploadErrorTooLargeTemplate: "이미지는 {size} 이하만 첨부할 수 있습니다.",
  uploadErrorReadDimensions: "이미지 크기를 읽지 못했습니다.",
  uploadErrorOptimizeLoad: "이미지 최적화 중 로드에 실패했습니다.",
  uploadErrorTooLargeResponse: "이미지가 너무 큽니다.",
  uploadErrorStorageUnavailable: "첨부 저장소를 사용할 수 없습니다. 첨부 없이 제보해 주세요.",
  uploadErrorGeneric: "이미지 업로드에 실패했습니다.",

  apiErrorLoginRequired: "로그인이 필요합니다.",
  apiErrorRateLimited: "제보가 너무 잦습니다. 잠시 후 다시 시도해 주세요.",
  apiErrorTemporary: "일시적인 오류입니다. 잠시 후 다시 보내주세요.",
  apiErrorGeneric: "제보 전송에 실패했습니다. 잠시 후 다시 시도해 주세요.",
};

const FEEDBACK_COPY_EN: FeedbackCopy = {
  navAriaLabel: "Feedback lab navigation",
  back: "Back",
  backAria: "Go to previous page",
  home: "Home",

  heroKicker: "CODE DESTINY LAB",
  heroTitle: "Bug Report Desk",
  heroBodyLine1: "When something looks off, a result feels strange, or you think “this would be nice to have.”",
  heroBodyLine2: "Even one line is enough — our team reads every report directly.",
  avgResponseNote: "Average response 1-2 days · we'll reply to the email on your account",
  heroImageAlt: "Yeon the flower piglet waiting for your feedback",

  categoryGridAria: "Report type",
  categoryHeading: "What's this about?",
  categories: {
    bug: {
      label: "Bug",
      hint: "Something isn't working",
      rewardNote: "If it's confirmed as a real bug, you'll get 300 moonstones per report.",
      fields: fields({
        repro: { label: "How to reproduce it", placeholder: "1. On the saju result screen\n2. Tap the 'Share' button at the bottom\n3. Nothing happens" },
        expected: { label: "What you expected", placeholder: "I expected the share sheet to open" },
        actual: { label: "What actually happened", placeholder: "The screen briefly went dark and stayed that way" },
      }),
    },
    feature: {
      label: "Feature idea",
      hint: "It would be nice to have this",
      fields: fields({
        expected: { label: "Why would this feature help?", placeholder: "I'd like to compare compatibility results side by side with a friend" },
      }),
    },
    ui: {
      label: "UI improvement",
      hint: "It's hard to use",
      fields: fields({
        expected: { label: "How should it change?", placeholder: "The text is too small and hard to read. It would be nice if it were a bit bigger" },
      }),
    },
    typo: {
      label: "Typo",
      hint: "Some text is wrong",
      fields: fields({
        wrongText: { label: "The incorrect text", placeholder: "Please paste it exactly as shown on screen" },
        suggestedText: { label: "Suggested fix", placeholder: "Your suggested wording" },
      }),
    },
    "ai-quality": {
      label: "AI result quality",
      hint: "The answer feels off",
      fields: fields({
        featureName: { label: "Which feature?", placeholder: "e.g. Saju expert reading, Tarot reading" },
        inputSummary: { label: "What you entered", placeholder: "What question or details did you enter?" },
        outputSummary: { label: "What was off about the answer", placeholder: "Paste or summarize the answer" },
      }),
    },
    payment: {
      label: "Payment issue",
      hint: "Payment isn't working",
      warning: "Never enter payment details like your card number, password, or CVC. An order number is enough for us to check.",
      fields: fields({
        orderId: { label: "Order number", placeholder: "You can find this on your order history screen" },
        payMethod: { label: "Payment method", placeholder: "Please select", options: ["One-time card payment", "Pass", "Moonstones", "Other"] },
      }),
    },
    translation: {
      label: "Translation issue",
      hint: "The translation feels off",
      fields: fields({
        language: { label: "Language", placeholder: "Please select", options: ["English", "日本語", "中文", "Other"] },
        wrongText: { label: "The awkward translation", placeholder: "The text shown on screen" },
        suggestedText: { label: "Suggested translation", placeholder: "This wording would sound more natural" },
      }),
    },
    performance: {
      label: "Speed issue",
      hint: "It's too slow",
      fields: fields({
        delay: { label: "How long did you wait?", placeholder: "Please select", options: ["Under 3s but felt slow", "3-10s", "10-30s", "Over 30s", "It never finished"] },
        network: { label: "Network", placeholder: "Checked automatically" },
      }),
    },
    mobile: {
      label: "Mobile-only issue",
      hint: "It's only broken on my phone",
      fields: fields({
        device: { label: "Device name", placeholder: "e.g. iPhone 15 Pro, Galaxy S24" },
        browser: { label: "Browser", placeholder: "Checked automatically" },
      }),
    },
    etc: {
      label: "Other",
      hint: "Anything else",
      fields: fields({}),
    },
  },

  draftBannerText: "You have a draft in progress",
  draftContinue: "Continue writing",
  draftRestart: "Start over",

  titleFieldLabel: "Title",
  titlePlaceholder: "Summarize it in one line",
  contentFieldLabel: "Details",
  contentPlaceholder: "Feel free to describe what happened and what seemed off. You can paste a screenshot directly here too.",
  contentMinLengthSuffix: " characters minimum",
  urlFieldLabel: "Page you're reporting about",
  urlAutoFilledBadge: "Auto-filled",
  attachmentDisabledNote: "Log in to attach screenshots. What you've written so far is saved as-is.",
  savedAtPrefix: "Draft saved",
  autoSaveNote: "What you write is saved automatically",
  submitSending: "Sending…",
  submitUploading: "Uploading image…",
  submitSend: "Send feedback",
  submitLoginAndSend: "Log in and send",
  submitErrorFallback: "Failed to send your report.",

  loginGateTitle: "Feel free to write first",
  loginGateBody: "You'll only need to log in when you send it (so we can reply to you). What you've written is saved automatically and carries over after you log in.",
  loginButton: "Log in",

  envIntroPrefix: "To reproduce the issue accurately, we send along your",
  envIntroBold: "browser, screen size, language, timezone, and app version",
  envIntroSuffix: ".",
  envDetailsSummary: "What gets sent along?",
  envSentHeading: "Information sent",
  envNotCollectedHeading: "Information we do not collect",
  envPrivacyPrefix: "See our",
  envPrivacyLink: "privacy policy",
  envPrivacySuffix: "for details.",
  envToggleLabel: "Send environment information",
  envToggleOffWarning: "Without environment information, it may be harder to reproduce the issue, which can delay our response.",

  attachmentLabel: "Attach screenshots",
  attachmentEmphasizeNote: "This helps a lot",
  attachmentCountSuffix: "up to",
  attachmentPickButton: "Choose photo",
  attachmentCameraButton: "Take photo",
  attachmentDropHint: "or drag and drop here · paste into the text box (Ctrl+V)",
  attachmentUploadingTemplate: "Uploading {n} image(s)…",
  attachmentPreviewAlt: "Attached screenshot preview",
  attachmentRemoveAria: "Remove attachment",
  attachmentPrivacyNote: "Before attaching, please check that no personal information (names, contact info, other people's conversations) is visible.",

  successImageAlt: "Yeon the flower piglet saying thank you",
  successTitle: "Thank you!",
  successBody: "Your feedback helps a lot in making CODE DESTINY a better service. Our developers will review it carefully and reflect it in a future update.",
  successTicketLabel: "Ticket number",
  successCopyAria: "Copy ticket number",
  successWriteAnother: "Send another report",
  successGoHome: "Go home",

  uploadErrorSelectImage: "Please choose an image file.",
  uploadErrorUnsupportedType: "Only jpg, png, and webp images can be attached.",
  uploadErrorEmptyFile: "Empty files can't be attached.",
  uploadErrorTooLargeTemplate: "Images must be {size} or smaller.",
  uploadErrorReadDimensions: "Couldn't read the image size.",
  uploadErrorOptimizeLoad: "Failed to load the image while optimizing it.",
  uploadErrorTooLargeResponse: "The image is too large.",
  uploadErrorStorageUnavailable: "Attachment storage is unavailable right now. Please send your report without an attachment.",
  uploadErrorGeneric: "Failed to upload the image.",

  apiErrorLoginRequired: "Login required.",
  apiErrorRateLimited: "You're sending reports too frequently. Please try again shortly.",
  apiErrorTemporary: "A temporary error occurred. Please try sending it again shortly.",
  apiErrorGeneric: "Failed to send your report. Please try again shortly.",
};

/**
 * 관리자 화면(app/admin/feedback/page.tsx)은 details[].label 을 그대로 렌더한다 — 제보자
 * 로케일에 따라 라벨 언어가 섞이면 관리자 검토가 어려워지므로, 서버로 보내는 라벨은
 * 항상 이 한국어 카피에서 가져온다(화면에 보여주는 라벨만 리포터의 로케일을 따른다).
 */
export const FEEDBACK_COPY_KO_CATEGORIES = FEEDBACK_COPY_KO.categories;

const FEEDBACK_COPY: Partial<Record<LoadingLocale, FeedbackCopy>> = {
  ko: FEEDBACK_COPY_KO,
  en: FEEDBACK_COPY_EN,
};

export function getFeedbackCopy(locale: LoadingLocale): FeedbackCopy {
  return FEEDBACK_COPY[locale] || FEEDBACK_COPY_EN;
}

export function useFeedbackCopy(): FeedbackCopy {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());

  useEffect(() => {
    const syncLocale = () => setLocale(getCurrentLoadingLocale());
    syncLocale();
    window.addEventListener("cd:locale-ready", syncLocale);
    window.addEventListener("cd:locale-change", syncLocale);
    return () => {
      window.removeEventListener("cd:locale-ready", syncLocale);
      window.removeEventListener("cd:locale-change", syncLocale);
    };
  }, []);

  return getFeedbackCopy(locale);
}

export function getFeedbackDateLocaleTag(locale: LoadingLocale): string {
  switch (locale) {
    case "ko": return "ko-KR";
    case "ja": return "ja-JP";
    case "zh-CN": return "zh-CN";
    case "zh-TW": return "zh-TW";
    case "vi": return "vi-VN";
    case "hi": return "hi-IN";
    case "es": return "es-ES";
    case "fr": return "fr-FR";
    case "de": return "de-DE";
    case "nl": return "nl-NL";
    case "ms": return "ms-MY";
    default: return "en-US";
  }
}
