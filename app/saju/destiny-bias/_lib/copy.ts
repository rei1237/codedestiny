// 최애운명(destiny-bias) 결과 화면 공용 UI 크롬 카피 — 팬덤 프로필(fandomProfile)이 담긴
// vm.* 필드 자체(엔진이 생성하는 문장)는 대상이 아니다. 그 문장을 감싸는 정적 라벨/버튼만.
// getCurrentLoadingLocale()/languagechange 이벤트로 갱신 — app/nakshatra/_lib/copy.ts 와 같은 패턴.

import { useEffect, useState } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

export interface DestinyBiasCopy {
  auraLabel: string;
  backAriaLabel: string;
  headerTitle: string;

  finaleSectionLabel: string;
  heroTypeSectionLabel: string;
  persistenceSectionLabel: string;
  persistenceIntensityLabel: string;
  persistenceDurationLabel: string;
  detachmentSectionLabel: string;
  detachmentReasonLabel: string;
  detachmentStyleLabel: string;
  behaviorSectionLabel: string;
  behaviorDeepDiveLabel: string;
  behaviorRelationshipLabel: string;
  behaviorObsessionLabel: string;
  journeySectionLabel: string;
  journeyEntryTypeLabel: string;
  journeyTasteLabel: string;
  journeyFirstAttractionLabel: string;
  journeyLongTermLabel: string;

  shareCardMyDestinyLabel: string;
  albumCoverAltSuffix: string;

  stageStep1Label: string;
  stageStep1Desc: string;
  stageStep2Label: string;
  stageStep2Desc: string;
  stageStep3Label: string;
  stageStep3Desc: string;
  lineupHeading: string;
  lineupParagraph: string;

  mainCardLabel: string;
  mainCardChemiSummaryLabel: string;
  mainCardCheerPointLabel: string;
  mainCardRelationLabel: string;
  mainCardAdviceLabel: string;
  mainCardFallbackText: string;

  fiveSectionsLabel: string;
  fiveSectionsTipLabel: string;

  elementChartLabel: string;
  elementChartMeLabel: string;
  elementFavoriteFallback: string;
  elementWood: string;
  elementFire: string;
  elementEarth: string;
  elementMetal: string;
  elementWater: string;

  mzZoneLabel: string;
  mzRelationMbtiLabel: string;

  scoreGaugeAriaLabel: (total: number) => string;
  scoreGaugeTimeUnknownText: (biasName: string) => string;
  scoreGaugeEmotionalLabel: string;
  scoreGaugeFandomLabel: string;
  scoreGaugeLongTermLabel: string;
  scoreGaugeStabilityLabel: string;
  scoreGaugeChemiLabel: string;

  heroTitle: string;
  heroDescription: string;
  heroEnterButton: string;
  heroSkipButton: string;
  heroSyncText: string;

  myDestinyHeroDescription: string;

  actionBarHeading: string;
  actionBarSubtext: string;
  savePhotocardButton: string;
  shareButton: string;
  shareToXButton: string;
  shareToInstagramButton: string;
  shareToKakaoButton: string;
  saveSvgButton: string;
  copyTextButton: string;
  viewResultAgainButton: string;
  tryAnotherButton: string;

  photocardBottomNote: string;
  photocardUploadedImageAltSuffix: string;
  defaultChemistryType: string;

  // 아래는 EN/JA/ZH-CN/ZH-TW만 채운다 — 나머지 로케일은 getDestinyBiasCopy()가 EN과 병합해 자동 폴백한다.
  loadingSyncLine1?: string;
  loadingSyncLine2?: string;
  defaultShareKeywords?: string[];
  scoreSuffix?: string;

  // ── DestinyBiasClient (입력 마법사 + 결과 오케스트레이터) ──
  clientInsufficientNamePrompt?: string;
  clientMyBirthErrorPrefix?: (reason: string) => string;
  clientBiasNamePrompt?: string;
  clientBiasBirthErrorPrefix?: (reason: string) => string;
  clientImageTypeError?: string;
  clientImageSizeError?: (mb: number) => string;
  clientImageReadError?: string;
  clientImageProcessError?: string;
  clientImageReadyToast?: string;
  clientImageClearedToast?: string;
  clientPresetLoadedToast?: (sourceLabel: string) => string;
  clientPresetBirthOnlyToast?: (sourceLabel: string) => string;
  clientAnalysisCompleteToast?: string;
  clientSvgSavedToast?: string;
  clientPngSavedToast?: string;
  clientCopySummaryToast?: string;
  clientShareResultToast?: string;
  clientShareTextCopiedToast?: string;
  clientPlatformShareOpenedToast?: (platformLabel: string) => string;
  clientPlatformInstagram?: string;
  clientPlatformKakao?: string;
  clientShareToXToast?: string;
  clientInstagramSavedToast?: string;
  clientKakaoCopiedToast?: string;
  clientTryAnotherToast?: string;
  clientGenderLabel?: string;
  clientPrivacyNote?: string;
  clientNameSubLabel?: string;
  clientBirthDateSubLabel?: string;
  clientBirthTimeSubLabel?: string;
  clientGenderSubLabel?: string;
  clientBiasNameSubLabel?: string;
  clientArtistSubLabel?: string;
  clientBiasMoodSubLabel?: string;
  clientChemistrySubLabel?: string;
  clientStarArchiveSubLabel?: string;
  clientPhotoMergeSubLabel?: string;
  clientStarArchiveTitle?: string;
  clientStarArchiveDesc?: string;
  clientDisplayCountSuffix?: (n: number) => string;
  clientNarrowBySeriesLabel?: string;
  clientBirthdayPrefix?: string;
  clientTimePrefix?: string;
  clientTimeUnknownNote?: string;
  clientTimeHiddenNote?: string;
  clientReapplyButton?: string;
  clientLoadMoreButton?: (shown: number, total: number) => string;
  clientNoSearchResults?: string;
  clientBiasMoodLabel?: string;
  clientRelationMoodLabel?: string;
  clientUploadImageTitle?: string;
  clientUploadImageDesc?: string;
  clientSelectImageButton?: string;
  clientResetUploadButton?: string;
  clientUploadCompleteDefault?: string;
  clientUploadHint?: string;
  clientLightingRigLabel?: string;
  clientThemeAriaLabel?: (themeName: string, selected: boolean) => string;
  clientSelectedWord?: string;
  clientSelectWord?: string;
  clientMainReportTitle?: (biasName: string) => string;
  clientSupplementaryLabel?: string;
  clientSaveShareLabel?: string;
  clientPrevButton?: string;
  clientEnterStageButton?: string;
  clientPayingButton?: string;
  clientPayButton?: string;
  clientGenderOptionLabels?: Record<string, string>;
  clientBiasMoodOptionLabels?: Record<string, string>;
  clientRelationMoodOptionLabels?: Record<string, string>;

  clientGuideTitle?: string;
  clientLoginRequiredTitle?: string;
  clientLoginRequiredMessage?: string;
  clientAnalysisErrorDefault?: string;
  clientPngSaveFailed?: string;
  clientCopyResultFailed?: string;
  clientShareTitle?: string;
  clientShareTextCopyFailed?: string;
  clientInstagramSaveFailed?: string;
  clientKakaoCopyFailed?: string;
  clientStep1Title?: string;
  clientStep1Desc?: string;
  clientMyNameLabel?: string;
  clientMyNamePlaceholder?: string;
  clientMyBirthDateLabel?: string;
  clientMyBirthDatePlaceholder?: string;
  clientBirthTimeOptionalLabel?: string;
  clientMyBirthTimePlaceholder?: string;
  clientStep2Title?: string;
  clientStep2Desc?: string;
  clientBiasNameFieldLabel?: string;
  clientBiasNamePlaceholder?: string;
  clientBiasBirthDateLabel?: string;
  clientBiasBirthDatePlaceholder?: string;
  clientArtistLabel?: string;
  clientArtistPlaceholder?: string;
  clientBiasBirthTimePlaceholder?: string;
  clientSearchPlaceholder?: string;
  clientUploadPreviewAlt?: string;
  clientStep3Title?: string;
  clientStep3Desc?: string;
  clientSummaryScoreLabel?: string;
  clientSummaryEnergyLabel?: string;
  clientSummaryPairingLabel?: string;
  clientSummaryMessageLabel?: string;
  clientSummaryFansignLabel?: string;
  clientShareChemistryLine?: (biasName: string, score: number, grade: string, message: string) => string;
}

const DESTINY_BIAS_COPY_EN: DestinyBiasCopy = {
  auraLabel: "Fanlight Aura",
  backAriaLabel: "Go back",
  headerTitle: "My Destiny Bias",

  finaleSectionLabel: "In the end, what kind of fan am I",
  heroTypeSectionLabel: "My fandom type",
  persistenceSectionLabel: "How long it lasts",
  persistenceIntensityLabel: "Intensity",
  persistenceDurationLabel: "Duration",
  detachmentSectionLabel: "What cools it down",
  detachmentReasonLabel: "Why fans drift away",
  detachmentStyleLabel: "How they drift away",
  behaviorSectionLabel: "How you deepen",
  behaviorDeepDiveLabel: "How you dive deep",
  behaviorRelationshipLabel: "Relationship lens",
  behaviorObsessionLabel: "Obsession point",
  journeySectionLabel: "Entry & taste",
  journeyEntryTypeLabel: "Entry type",
  journeyTasteLabel: "Taste",
  journeyFirstAttractionLabel: "What draws you in first",
  journeyLongTermLabel: "What keeps you attached long-term",

  shareCardMyDestinyLabel: "My Destiny Bias",
  albumCoverAltSuffix: "album cover",

  stageStep1Label: "Check your fan profile",
  stageStep1Desc: "We read your Saju energy from your name and birth date.",
  stageStep2Label: "Link your bias",
  stageStep2Desc: "Enter your bias's info or pick one from the star archive.",
  stageStep3Label: "Glass photocard",
  stageStep3Desc: "Save a card with your chemistry reading and bias photo as a PNG.",
  lineupHeading: "One photo of your bias becomes a keepsake photocard",
  lineupParagraph:
    "Along with your Saju compatibility reading, we blend in the bias photo you uploaded to make a glass photocard.\nSave the finished card as a PNG and post it straight to your profile or feed.",

  mainCardLabel: "My Destiny Bias Card",
  mainCardChemiSummaryLabel: "Chemistry summary",
  mainCardCheerPointLabel: "What pulls you in most",
  mainCardRelationLabel: "The shape of your bond",
  mainCardAdviceLabel: "✨ Today's fandom & relationship advice",
  mainCardFallbackText: "We're still sharpening this line for you.",

  fiveSectionsLabel: "Saju chemistry reading",
  fiveSectionsTipLabel: "✨ Practical tip",

  elementChartLabel: "Five Elements distribution",
  elementChartMeLabel: "Me",
  elementFavoriteFallback: "Bias",
  elementWood: "Wood",
  elementFire: "Fire",
  elementEarth: "Earth",
  elementMetal: "Metal",
  elementWater: "Water",

  mzZoneLabel: "Just for fun",
  mzRelationMbtiLabel: "Our relationship MBTI",

  scoreGaugeAriaLabel: (total) => `Compatibility score ${total}`,
  scoreGaugeTimeUnknownText: (biasName) =>
    `${biasName}'s birth time isn't public, so we read this by year, month, and day only`,
  scoreGaugeEmotionalLabel: "Emotional",
  scoreGaugeFandomLabel: "Fandom",
  scoreGaugeLongTermLabel: "Longevity",
  scoreGaugeStabilityLabel: "Stability",
  scoreGaugeChemiLabel: "One-line chemistry",

  heroTitle: "My Destiny Bias Live Stage",
  heroDescription:
    "We sync the rhythm of your Saju energy with your bias's stage wavelength to find the fan signal resonating strongest right now.\nA spotlight reading begins the moment you enter.",
  heroEnterButton: "Enter the stage",
  heroSkipButton: "Skip rehearsal, analyze now",
  heroSyncText: "Syncing the stage sound with your destiny signal",

  myDestinyHeroDescription:
    "The moment your birthday energy meets your bias's stage aura ✨",

  actionBarHeading: "Save and share your photocard 💜",
  actionBarSubtext: "Save it and post straight to your story or feed — today's fandom log is complete!",
  savePhotocardButton: "Save photocard",
  shareButton: "Share",
  shareToXButton: "Share to X (Twitter)",
  shareToInstagramButton: "Share to Instagram",
  shareToKakaoButton: "Share to KakaoTalk",
  saveSvgButton: "Save SVG",
  copyTextButton: "Copy text",
  viewResultAgainButton: "View result again",
  tryAnotherButton: "Try another bias",

  photocardBottomNote: "✦ This card holds the resonance between your two energies",
  photocardUploadedImageAltSuffix: "uploaded image",
  defaultChemistryType: "Quiet Support Type",

  loadingSyncLine1: "The stage is opening",
  loadingSyncLine2: "and the two rhythms are syncing ✨",
  defaultShareKeywords: ["starlight", "resonance", "chemistry"],
  scoreSuffix: " pts",

  clientInsufficientNamePrompt: "Please enter your name or nickname.",
  clientMyBirthErrorPrefix: (reason) => `Your birth date: ${reason}`,
  clientBiasNamePrompt: "Please enter your bias's name.",
  clientBiasBirthErrorPrefix: (reason) => `Your bias's birth date: ${reason}`,
  clientImageTypeError: "Only PNG, JPG, WEBP, and GIF image files can be uploaded.",
  clientImageSizeError: (mb) => `Please upload an image ${mb}MB or smaller.`,
  clientImageReadError: "Couldn't read the image. Please choose another one.",
  clientImageProcessError: "An error occurred while processing the image. Please try a different file.",
  clientImageReadyToast: "Your bias's photo is ready to be blended into the card.",
  clientImageClearedToast: "Cleared the uploaded image.",
  clientPresetLoadedToast: (sourceLabel) => `Loaded ${sourceLabel}'s info.`,
  clientPresetBirthOnlyToast: (sourceLabel) =>
    `Filled in ${sourceLabel}'s birthday. Birth time is only auto-filled when it's public.`,
  clientAnalysisCompleteToast: "Your Destiny Bias report and digital photocard are ready.",
  clientSvgSavedToast: "Saved the SVG photocard.",
  clientPngSavedToast: "Saved the PNG photocard.",
  clientCopySummaryToast: "Copied the result summary.",
  clientShareResultToast: "Shared the result.",
  clientShareTextCopiedToast: "Copied the share text.",
  clientPlatformShareOpenedToast: (platformLabel) => `Opened the ${platformLabel} share sheet.`,
  clientPlatformInstagram: "Instagram",
  clientPlatformKakao: "KakaoTalk",
  clientShareToXToast: "Opened the X (Twitter) share window.",
  clientInstagramSavedToast: "Saved the card image for Instagram. Upload it from the Instagram app.",
  clientKakaoCopiedToast: "Copied the KakaoTalk share text. Paste it into KakaoTalk to share.",
  clientTryAnotherToast: "Please enter another bias's info.",
  clientGenderLabel: "Gender",
  clientPrivacyNote: "The info you enter is only used to calculate your Destiny Bias reading.",
  clientNameSubLabel: "NAME",
  clientBirthDateSubLabel: "BIRTH DATE",
  clientBirthTimeSubLabel: "BIRTH TIME",
  clientGenderSubLabel: "GENDER",
  clientBiasNameSubLabel: "BIAS NAME",
  clientArtistSubLabel: "ARTIST / GROUP",
  clientBiasMoodSubLabel: "BIAS MOOD",
  clientChemistrySubLabel: "CHEMISTRY",
  clientStarArchiveSubLabel: "STAR ARCHIVE / Quick-load a celebrity or character",
  clientPhotoMergeSubLabel: "PHOTO MERGE",
  clientStarArchiveTitle: "Fill your profile fast from the Saju analysis screen",
  clientStarArchiveDesc:
    "Search or tap through idols, actors, politicians, and anime characters to fill in a name and birth date at once.",
  clientDisplayCountSuffix: (n) => `Showing ${n}`,
  clientNarrowBySeriesLabel: "Narrow down by series",
  clientBirthdayPrefix: "Birthday",
  clientTimePrefix: "Time",
  clientTimeUnknownNote: " · Birth time is private, so only the birthday was auto-filled.",
  clientTimeHiddenNote: " · Time private",
  clientReapplyButton: "Apply again",
  clientLoadMoreButton: (shown, total) => `Load more (${shown}/${total})`,
  clientNoSearchResults: "No results. Try searching part of a name or group name.",
  clientBiasMoodLabel: "Bias mood",
  clientRelationMoodLabel: "Relationship vibe",
  clientUploadImageTitle: "Upload your bias's photo",
  clientUploadImageDesc:
    "The uploaded image is automatically blended into the result card's glass frame. 12MB or smaller, PNG/JPG/WEBP recommended.",
  clientSelectImageButton: "Choose image",
  clientResetUploadButton: "Reset upload",
  clientUploadCompleteDefault: "Upload complete",
  clientUploadHint: "It will be blended into a glass-textured photocard on the result screen.",
  clientLightingRigLabel: "Choose your stage lighting",
  clientThemeAriaLabel: (themeName, selected) => `${themeName} theme ${selected ? "selected" : "select"}`,
  clientSelectedWord: "selected",
  clientSelectWord: "select",
  clientMainReportTitle: (biasName) => `Your Destiny Bias main report with ${biasName}`,
  clientSupplementaryLabel: "Supplementary Saju reading",
  clientSaveShareLabel: "Save & Share",
  clientPrevButton: "Back",
  clientEnterStageButton: "Enter Cosmic Stage",
  clientPayingButton: "Processing payment...",
  clientPayButton: "Pay",
  clientGenderOptionLabels: { 여성: "Woman", 남성: "Man", 기타: "Other" },
  clientBiasMoodOptionLabels: { 청량: "Refreshing", 카리스마: "Charismatic", 몽환: "Dreamy", 러블리: "Lovely", 시크: "Chic", 힐링: "Healing" },
  clientRelationMoodOptionLabels: { 응원형: "Supportive", 성장형: "Growth", 설렘형: "Butterflies", 위로형: "Comforting", 운명형: "Destined" },

  clientGuideTitle: "Notice",
  clientLoginRequiredTitle: "Login required",
  clientLoginRequiredMessage: "Your Destiny Bias analysis runs after we verify your account. Please log in and try again.",
  clientAnalysisErrorDefault: "An error occurred during analysis.",
  clientPngSaveFailed: "Failed to save the PNG.",
  clientCopyResultFailed: "Failed to copy the result.",
  clientShareTitle: "My Destiny Bias",
  clientShareTextCopyFailed: "Failed to copy the share text.",
  clientInstagramSaveFailed: "Failed to save the image for Instagram sharing.",
  clientKakaoCopyFailed: "Failed to copy the KakaoTalk share text.",
  clientStep1Title: "Let's check your fanlight energy",
  clientStep1Desc: "Enter your name and birth date to align your Saju energy base before entering the stage.",
  clientMyNameLabel: "My name/nickname",
  clientMyNamePlaceholder: "e.g. Neo",
  clientMyBirthDateLabel: "My birth date",
  clientMyBirthDatePlaceholder: "e.g. 19910220",
  clientBirthTimeOptionalLabel: "Birth time is optional",
  clientMyBirthTimePlaceholder: "e.g. 1430 (optional)",
  clientStep2Title: "Let's link stage chemistry with your bias's profile",
  clientStep2Desc: "Enter your bias's info and mood to calculate resonance points with your Saju energy on stage.",
  clientBiasNameFieldLabel: "Bias name",
  clientBiasNamePlaceholder: "e.g. MY BIAS",
  clientBiasBirthDateLabel: "Bias's birth date",
  clientBiasBirthDatePlaceholder: "e.g. 20001225",
  clientArtistLabel: "Linked artist/group",
  clientArtistPlaceholder: "e.g. STARLIGHT UNIT",
  clientBiasBirthTimePlaceholder: "e.g. 0915 (optional)",
  clientSearchPlaceholder: "Search by name, group/work, or category",
  clientUploadPreviewAlt: "Preview of the uploaded bias image",
  clientStep3Title: "Choose your concert stage tone",
  clientStep3Desc: "Pick the stage's lighting temperature and aura color. The calculated result stays the same — only the card style changes.",
  clientSummaryScoreLabel: "Score",
  clientSummaryEnergyLabel: "Energy",
  clientSummaryPairingLabel: "Pairing",
  clientSummaryMessageLabel: "Destiny message",
  clientSummaryFansignLabel: "Fansign message",
  clientShareChemistryLine: (biasName, score, grade, message) => `Compatibility with ${biasName}: ${score} · ${grade}\n${message}`,
};

const DESTINY_BIAS_COPY: Partial<Record<LoadingLocale, DestinyBiasCopy>> = {
  ko: {
    auraLabel: "팬라이트 오라",
    backAriaLabel: "뒤로 가기",
    headerTitle: "최애운명",

    finaleSectionLabel: "결국 나는 어떤 팬인가",
    heroTypeSectionLabel: "나의 덕질 체질",
    persistenceSectionLabel: "덕질 지속력",
    persistenceIntensityLabel: "강도",
    persistenceDurationLabel: "기간",
    detachmentSectionLabel: "무엇 때문에 식는가",
    detachmentReasonLabel: "탈덕 이유",
    detachmentStyleLabel: "탈덕 방식",
    behaviorSectionLabel: "어떻게 깊어지는가",
    behaviorDeepDiveLabel: "덕질 방식",
    behaviorRelationshipLabel: "관계성 유형",
    behaviorObsessionLabel: "과몰입 포인트",
    journeySectionLabel: "입덕 & 취향",
    journeyEntryTypeLabel: "입덕 유형",
    journeyTasteLabel: "취향",
    journeyFirstAttractionLabel: "처음 끌리는 요소",
    journeyLongTermLabel: "오래 좋아하게 만드는 요소",

    shareCardMyDestinyLabel: "나의 최애운명",
    albumCoverAltSuffix: "앨범 커버",

    stageStep1Label: "팬 프로필 체크",
    stageStep1Desc: "이름과 생년월일로 내 사주 에너지를 읽습니다.",
    stageStep2Label: "최애 링크",
    stageStep2Desc: "최애 정보를 입력하거나 스타 아카이브에서 고릅니다.",
    stageStep3Label: "글래스 포토카드",
    stageStep3Desc: "케미 리딩과 최애 사진을 담은 카드를 PNG로 저장합니다.",
    lineupHeading: "최애 사진 한 장이면, 소장용 포토카드가 됩니다",
    lineupParagraph:
      "사주 궁합 리딩과 함께, 올려주신 최애 사진을 그대로 합성한 글래스 포토카드를 만들어드려요.\n완성된 카드는 PNG로 저장해 프로필·SNS에 바로 올릴 수 있습니다.",

    mainCardLabel: "나의 최애운명 카드",
    mainCardChemiSummaryLabel: "케미 요약",
    mainCardCheerPointLabel: "강하게 끌리는 포인트",
    mainCardRelationLabel: "관계의 결",
    mainCardAdviceLabel: "✨ 오늘의 덕질/관계 조언",
    mainCardFallbackText: "지금 이 문장을 더 선명하게 완성하는 중이에요.",

    fiveSectionsLabel: "사주 케미 리딩",
    fiveSectionsTipLabel: "✨ 실전 팁",

    elementChartLabel: "오행 분포",
    elementChartMeLabel: "나",
    elementFavoriteFallback: "최애",
    elementWood: "목",
    elementFire: "화",
    elementEarth: "토",
    elementMetal: "금",
    elementWater: "수",

    mzZoneLabel: "MZ 재미 존",
    mzRelationMbtiLabel: "우리 관계 MBTI",

    scoreGaugeAriaLabel: (total) => `궁합 점수 ${total}점`,
    scoreGaugeTimeUnknownText: (biasName) =>
      `${biasName}의 태어난 시간은 공개되지 않아, 년·월·일 기준으로 풀이했어요`,
    scoreGaugeEmotionalLabel: "감정선",
    scoreGaugeFandomLabel: "팬심",
    scoreGaugeLongTermLabel: "장기",
    scoreGaugeStabilityLabel: "안정",
    scoreGaugeChemiLabel: "한줄 케미",

    heroTitle: "최애운명 라이브 스테이지",
    heroDescription:
      "사주 에너지의 박자와 최애의 무대 파장을 맞춰, 지금 가장 강하게 공명하는 팬심 시그널을 찾아냅니다.\n입장과 동시에 스포트라이트 리딩이 시작됩니다.",
    heroEnterButton: "스테이지 입장하기",
    heroSkipButton: "리허설 없이 바로 분석",
    heroSyncText: "무대 음향과 운명 시그널을 동기화 중입니다",

    myDestinyHeroDescription: "내 생일 에너지가 최애의 무대 아우라와 만나는 우주적인 순간을 포토카드로 담아드려요 ✨",

    actionBarHeading: "포토카드 저장하고 공유해요 💜",
    actionBarSubtext: "저장하고 바로 스토리/피드에 올리면 오늘 덕심 기록 완료!",
    savePhotocardButton: "포토카드 저장하기",
    shareButton: "공유하기",
    shareToXButton: "X(트위터) 공유",
    shareToInstagramButton: "인스타 공유",
    shareToKakaoButton: "카카오 공유",
    saveSvgButton: "SVG 저장",
    copyTextButton: "텍스트 복사",
    viewResultAgainButton: "결과 다시 보기",
    tryAnotherButton: "다른 최애로 다시 해볼게요",

    photocardBottomNote: "✦ 이 카드엔 두 사람의 에너지 공명이 담겨 있어요",
    photocardUploadedImageAltSuffix: "업로드 이미지",
    defaultChemistryType: "잔잔응원형",

    loadingSyncLine1: "무대가 열리고",
    loadingSyncLine2: "두 사람의 리듬이 동기화 중이에요 ✨",
    defaultShareKeywords: ["별빛", "공명", "케미"],
    scoreSuffix: "점",

    clientInsufficientNamePrompt: "나의 이름/닉네임을 입력해 주세요.",
    clientMyBirthErrorPrefix: (reason) => `나의 생년월일: ${reason}`,
    clientBiasNamePrompt: "최애 이름을 입력해 주세요.",
    clientBiasBirthErrorPrefix: (reason) => `최애의 생년월일: ${reason}`,
    clientImageTypeError: "PNG, JPG, WEBP, GIF 이미지 파일만 업로드할 수 있어요.",
    clientImageSizeError: (mb) => `이미지 용량은 ${mb}MB 이하로 업로드해 주세요.`,
    clientImageReadError: "이미지를 읽지 못했어요. 다시 선택해 주세요.",
    clientImageProcessError: "이미지 처리 중 오류가 발생했어요. 다른 파일로 다시 시도해 주세요.",
    clientImageReadyToast: "최애 이미지를 카드에 합성할 준비를 끝냈어요.",
    clientImageClearedToast: "업로드 이미지를 초기화했어요.",
    clientPresetLoadedToast: (sourceLabel) => `${sourceLabel} 정보를 바로 불러왔어요.`,
    clientPresetBirthOnlyToast: (sourceLabel) =>
      `${sourceLabel} 생일을 바로 넣었어요. 시간은 공개된 경우만 자동 입력됩니다.`,
    clientAnalysisCompleteToast: "최애운명 리포트와 디지털 포토카드가 완성됐어요.",
    clientSvgSavedToast: "SVG 포토카드를 저장했어요.",
    clientPngSavedToast: "PNG 포토카드를 저장했어요.",
    clientCopySummaryToast: "결과 요약을 복사했어요.",
    clientShareResultToast: "결과를 공유했어요.",
    clientShareTextCopiedToast: "공유용 텍스트를 복사했어요.",
    clientPlatformShareOpenedToast: (platformLabel) => `${platformLabel} 공유 창을 열었어요.`,
    clientPlatformInstagram: "인스타그램",
    clientPlatformKakao: "카카오",
    clientShareToXToast: "X(트위터) 공유 창을 열었어요.",
    clientInstagramSavedToast: "인스타 공유용 카드 이미지를 저장했어요. 인스타 앱에서 업로드해 주세요.",
    clientKakaoCopiedToast: "카카오 공유용 문구를 복사했어요. 카카오톡에 붙여넣어 공유해 주세요.",
    clientTryAnotherToast: "다른 최애 정보를 입력해 주세요.",
    clientGenderLabel: "성별",
    clientPrivacyNote: "입력 정보는 최애운명 분석 목적의 계산에만 사용됩니다.",
    clientNameSubLabel: "NAME / 이름",
    clientBirthDateSubLabel: "BIRTH DATE / 생년월일",
    clientBirthTimeSubLabel: "BIRTH TIME / 태어난 시간",
    clientGenderSubLabel: "GENDER / 성별",
    clientBiasNameSubLabel: "BIAS NAME / 최애 이름",
    clientArtistSubLabel: "ARTIST / 그룹 또는 아티스트",
    clientBiasMoodSubLabel: "BIAS MOOD / 최애 분위기",
    clientChemistrySubLabel: "CHEMISTRY / 관계 감성",
    clientStarArchiveSubLabel: "STAR ARCHIVE / 유명인·캐릭터 바로 불러오기",
    clientPhotoMergeSubLabel: "PHOTO MERGE / 포토카드 합성",
    clientStarArchiveTitle: "사주 분석 화면 기반 프로필을 빠르게 채우기",
    clientStarArchiveDesc: "아이돌, 배우, 정치인, 애니 캐릭터까지 검색하거나 탭으로 골라서 이름과 생년월일을 한 번에 입력할 수 있어요.",
    clientDisplayCountSuffix: (n) => `${n}명 표시 중`,
    clientNarrowBySeriesLabel: "작품별로 좁혀보기",
    clientBirthdayPrefix: "생일",
    clientTimePrefix: "시간",
    clientTimeUnknownNote: " · 시간 정보는 비공개라 생일만 자동 입력했어요.",
    clientTimeHiddenNote: " · 시간 비공개",
    clientReapplyButton: "다시 넣기",
    clientLoadMoreButton: (shown, total) => `더보기 (${shown}/${total})`,
    clientNoSearchResults: "검색 결과가 없어요. 이름 일부나 그룹명으로 다시 찾아보세요.",
    clientBiasMoodLabel: "최애 분위기",
    clientRelationMoodLabel: "관계 감성",
    clientUploadImageTitle: "최애 이미지 업로드하기",
    clientUploadImageDesc: "업로드한 이미지를 결과 카드의 글래스 프레임에 자동 합성해요. 12MB 이하, PNG/JPG/WEBP 권장.",
    clientSelectImageButton: "이미지 선택",
    clientResetUploadButton: "업로드 초기화",
    clientUploadCompleteDefault: "업로드 완료",
    clientUploadHint: "결과 카드에서 유리 질감 포토카드로 합성됩니다.",
    clientLightingRigLabel: "무대 조명을 고르세요",
    clientThemeAriaLabel: (themeName, selected) => `${themeName} 테마 ${selected ? "선택됨" : "선택"}`,
    clientSelectedWord: "선택됨",
    clientSelectWord: "선택",
    clientMainReportTitle: (biasName) => `${biasName}와의 최애운명 메인 리포트`,
    clientSupplementaryLabel: "보조 사주 분석",
    clientSaveShareLabel: "저장 · 공유",
    clientPrevButton: "이전",
    clientEnterStageButton: "Cosmic Stage 입장",
    clientPayingButton: "결제 진행 중...",
    clientPayButton: "결제하기",
    clientGenderOptionLabels: { 여성: "여성", 남성: "남성", 기타: "기타" },
    clientBiasMoodOptionLabels: { 청량: "청량", 카리스마: "카리스마", 몽환: "몽환", 러블리: "러블리", 시크: "시크", 힐링: "힐링" },
    clientRelationMoodOptionLabels: { 응원형: "응원형", 성장형: "성장형", 설렘형: "설렘형", 위로형: "위로형", 운명형: "운명형" },

    clientGuideTitle: "안내",
    clientLoginRequiredTitle: "로그인이 필요해요",
    clientLoginRequiredMessage: "최애운명 분석은 계정 확인 후 진행됩니다. 로그인 후 다시 시도해 주세요.",
    clientAnalysisErrorDefault: "분석 중 오류가 발생했습니다.",
    clientPngSaveFailed: "PNG 저장에 실패했습니다.",
    clientCopyResultFailed: "결과 복사에 실패했습니다.",
    clientShareTitle: "My Destiny Bias",
    clientShareTextCopyFailed: "공유 텍스트 복사에 실패했습니다.",
    clientInstagramSaveFailed: "인스타 공유용 이미지 저장에 실패했습니다.",
    clientKakaoCopyFailed: "카카오 공유 문구 복사에 실패했습니다.",
    clientStep1Title: "당신의 팬라이트 에너지를 확인할게요",
    clientStep1Desc: "이름과 생년월일을 입력하면 무대 입장 전 당신의 사주 에너지 베이스를 먼저 정렬합니다.",
    clientMyNameLabel: "나의 이름/닉네임",
    clientMyNamePlaceholder: "예: 네오",
    clientMyBirthDateLabel: "나의 생년월일",
    clientMyBirthDatePlaceholder: "예: 19910220",
    clientBirthTimeOptionalLabel: "태어난 시간은 선택 입력",
    clientMyBirthTimePlaceholder: "예: 1430 (선택)",
    clientStep2Title: "최애 프로필로 스테이지 케미를 연결할게요",
    clientStep2Desc: "최애 정보와 무드를 입력하면 나의 사주 에너지와 겹치는 공명 포인트를 스테이지 기준으로 계산합니다.",
    clientBiasNameFieldLabel: "최애 이름",
    clientBiasNamePlaceholder: "예: MY BIAS",
    clientBiasBirthDateLabel: "최애의 생년월일",
    clientBiasBirthDatePlaceholder: "예: 20001225",
    clientArtistLabel: "연결 아티스트/그룹",
    clientArtistPlaceholder: "예: STARLIGHT UNIT",
    clientBiasBirthTimePlaceholder: "예: 0915 (선택)",
    clientSearchPlaceholder: "이름, 그룹/작품, 카테고리로 검색해 보세요",
    clientUploadPreviewAlt: "업로드한 최애 이미지 미리보기",
    clientStep3Title: "콘서트 무대 톤을 선택해 주세요",
    clientStep3Desc: "무대의 조명 온도와 오라 색감을 선택합니다. 계산 결과는 동일하고, 표현되는 카드 스타일만 달라집니다.",
    clientSummaryScoreLabel: "점수",
    clientSummaryEnergyLabel: "에너지",
    clientSummaryPairingLabel: "페어링",
    clientSummaryMessageLabel: "운명 메시지",
    clientSummaryFansignLabel: "팬싸인 감성 메시지",
    clientShareChemistryLine: (biasName, score, grade, message) => `${biasName}와의 궁합 ${score}점 · ${grade}\n${message}`,
  },
  ja: {
    auraLabel: "ペンライトオーラ",
    backAriaLabel: "戻る",
    headerTitle: "推し運命",

    finaleSectionLabel: "結局私はどんなファンなのか",
    heroTypeSectionLabel: "私の推し活体質",
    persistenceSectionLabel: "推し活の持続力",
    persistenceIntensityLabel: "強度",
    persistenceDurationLabel: "期間",
    detachmentSectionLabel: "何が冷める原因か",
    detachmentReasonLabel: "卒業の理由",
    detachmentStyleLabel: "卒業の仕方",
    behaviorSectionLabel: "どう深まっていくか",
    behaviorDeepDiveLabel: "推し活のスタイル",
    behaviorRelationshipLabel: "関係性のタイプ",
    behaviorObsessionLabel: "のめり込みポイント",
    journeySectionLabel: "沼落ち & 好み",
    journeyEntryTypeLabel: "沼落ちタイプ",
    journeyTasteLabel: "好み",
    journeyFirstAttractionLabel: "最初に惹かれる要素",
    journeyLongTermLabel: "長く好きでいさせる要素",

    shareCardMyDestinyLabel: "私の推し運命",
    albumCoverAltSuffix: "アルバムカバー",

    stageStep1Label: "ファンプロフィールチェック",
    stageStep1Desc: "名前と生年月日からあなたの四柱推命エネルギーを読み取ります。",
    stageStep2Label: "推しをリンク",
    stageStep2Desc: "推しの情報を入力するか、スターアーカイブから選びます。",
    stageStep3Label: "グラスフォトカード",
    stageStep3Desc: "ケミ診断と推しの写真を入れたカードをPNGで保存します。",
    lineupHeading: "推しの写真一枚で、保存版フォトカードに",
    lineupParagraph:
      "四柱推命の相性診断とともに、アップロードした推しの写真を合成したグラスフォトカードを作ります。\n完成したカードはPNGで保存して、プロフィールやSNSにすぐ投稿できます。",

    mainCardLabel: "私の推し運命カード",
    mainCardChemiSummaryLabel: "ケミ要約",
    mainCardCheerPointLabel: "強く惹かれるポイント",
    mainCardRelationLabel: "関係性の質感",
    mainCardAdviceLabel: "✨ 今日の推し活・関係アドバイス",
    mainCardFallbackText: "この一文を、今よりくっきりさせている最中です。",

    fiveSectionsLabel: "四柱推命ケミ診断",
    fiveSectionsTipLabel: "✨ 実践ヒント",

    elementChartLabel: "五行分布",
    elementChartMeLabel: "私",
    elementFavoriteFallback: "推し",
    elementWood: "木",
    elementFire: "火",
    elementEarth: "土",
    elementMetal: "金",
    elementWater: "水",

    mzZoneLabel: "お楽しみゾーン",
    mzRelationMbtiLabel: "私たちの関係MBTI",

    scoreGaugeAriaLabel: (total) => `相性スコア ${total}点`,
    scoreGaugeTimeUnknownText: (biasName) =>
      `${biasName}の生まれた時間は公開されていないため、年・月・日を基準に読み解きました`,
    scoreGaugeEmotionalLabel: "感情線",
    scoreGaugeFandomLabel: "推し心",
    scoreGaugeLongTermLabel: "持続性",
    scoreGaugeStabilityLabel: "安定",
    scoreGaugeChemiLabel: "一言ケミ",

    heroTitle: "推し運命ライブステージ",
    heroDescription:
      "四柱推命エネルギーのリズムと推しのステージの波長を合わせ、今いちばん強く共鳴するファン心シグナルを見つけます。\n入場と同時にスポットライト診断が始まります。",
    heroEnterButton: "ステージに入場する",
    heroSkipButton: "リハーサルなしですぐ診断",
    heroSyncText: "ステージの音響と運命シグナルを同期しています",

    myDestinyHeroDescription: "あなたの誕生日エネルギーが推しのステージオーラと出会う宇宙的な瞬間をフォトカードに",

    actionBarHeading: "フォトカードを保存してシェアしよう 💜",
    actionBarSubtext: "保存してそのままストーリー/フィードに投稿すれば、今日の推し活記録完了！",
    savePhotocardButton: "フォトカードを保存",
    shareButton: "シェアする",
    shareToXButton: "X(旧Twitter)でシェア",
    shareToInstagramButton: "Instagramでシェア",
    shareToKakaoButton: "カカオトークでシェア",
    saveSvgButton: "SVGで保存",
    copyTextButton: "テキストをコピー",
    viewResultAgainButton: "結果をもう一度見る",
    tryAnotherButton: "別の推しでもう一度試す",

    photocardBottomNote: "✦ このカードには二人のエネルギー共鳴が込められています",
    photocardUploadedImageAltSuffix: "アップロード画像",
    defaultChemistryType: "静かな応援タイプ",

    loadingSyncLine1: "ステージが開き",
    loadingSyncLine2: "二人のリズムが同期しています ✨",
    defaultShareKeywords: ["星明かり", "共鳴", "ケミ"],
    scoreSuffix: "点",

    clientInsufficientNamePrompt: "あなたの名前/ニックネームを入力してください。",
    clientMyBirthErrorPrefix: (reason) => `あなたの生年月日: ${reason}`,
    clientBiasNamePrompt: "推しの名前を入力してください。",
    clientBiasBirthErrorPrefix: (reason) => `推しの生年月日: ${reason}`,
    clientImageTypeError: "PNG、JPG、WEBP、GIF画像ファイルのみアップロードできます。",
    clientImageSizeError: (mb) => `画像サイズは${mb}MB以下でアップロードしてください。`,
    clientImageReadError: "画像を読み込めませんでした。別の画像を選び直してください。",
    clientImageProcessError: "画像処理中にエラーが発生しました。別のファイルで再試行してください。",
    clientImageReadyToast: "推しの画像をカードに合成する準備ができました。",
    clientImageClearedToast: "アップロード画像をリセットしました。",
    clientPresetLoadedToast: (sourceLabel) => `${sourceLabel}の情報を読み込みました。`,
    clientPresetBirthOnlyToast: (sourceLabel) =>
      `${sourceLabel}の誕生日を入力しました。時間は公開されている場合のみ自動入力されます。`,
    clientAnalysisCompleteToast: "推し運命レポートとデジタルフォトカードが完成しました。",
    clientSvgSavedToast: "SVGフォトカードを保存しました。",
    clientPngSavedToast: "PNGフォトカードを保存しました。",
    clientCopySummaryToast: "結果の要約をコピーしました。",
    clientShareResultToast: "結果をシェアしました。",
    clientShareTextCopiedToast: "シェア用テキストをコピーしました。",
    clientPlatformShareOpenedToast: (platformLabel) => `${platformLabel}のシェアウィンドウを開きました。`,
    clientPlatformInstagram: "Instagram",
    clientPlatformKakao: "カカオトーク",
    clientShareToXToast: "X(旧Twitter)のシェアウィンドウを開きました。",
    clientInstagramSavedToast: "Instagramシェア用のカード画像を保存しました。Instagramアプリからアップロードしてください。",
    clientKakaoCopiedToast: "カカオトークシェア用の文章をコピーしました。カカオトークに貼り付けてシェアしてください。",
    clientTryAnotherToast: "別の推しの情報を入力してください。",
    clientGenderLabel: "性別",
    clientPrivacyNote: "入力情報は推し運命診断の計算にのみ使用されます。",
    clientNameSubLabel: "NAME / 名前",
    clientBirthDateSubLabel: "BIRTH DATE / 生年月日",
    clientBirthTimeSubLabel: "BIRTH TIME / 生まれた時間",
    clientGenderSubLabel: "GENDER / 性別",
    clientBiasNameSubLabel: "BIAS NAME / 推しの名前",
    clientArtistSubLabel: "ARTIST / グループまたはアーティスト",
    clientBiasMoodSubLabel: "BIAS MOOD / 推しの雰囲気",
    clientChemistrySubLabel: "CHEMISTRY / 関係性の雰囲気",
    clientStarArchiveSubLabel: "STAR ARCHIVE / 有名人・キャラクターをすぐ読み込む",
    clientPhotoMergeSubLabel: "PHOTO MERGE / フォトカード合成",
    clientStarArchiveTitle: "四柱推命分析画面ベースのプロフィールをすばやく入力",
    clientStarArchiveDesc: "アイドル、俳優、政治家、アニメキャラクターまで検索やタップで選んで、名前と生年月日を一度に入力できます。",
    clientDisplayCountSuffix: (n) => `${n}件表示中`,
    clientNarrowBySeriesLabel: "作品ごとに絞り込む",
    clientBirthdayPrefix: "誕生日",
    clientTimePrefix: "時間",
    clientTimeUnknownNote: " · 時間は非公開のため誕生日のみ自動入力しました。",
    clientTimeHiddenNote: " · 時間非公開",
    clientReapplyButton: "もう一度入れる",
    clientLoadMoreButton: (shown, total) => `もっと見る (${shown}/${total})`,
    clientNoSearchResults: "検索結果がありません。名前の一部やグループ名で再検索してください。",
    clientBiasMoodLabel: "推しの雰囲気",
    clientRelationMoodLabel: "関係性の雰囲気",
    clientUploadImageTitle: "推しの画像をアップロード",
    clientUploadImageDesc: "アップロードした画像は結果カードのガラスフレームに自動合成されます。12MB以下、PNG/JPG/WEBP推奨。",
    clientSelectImageButton: "画像を選択",
    clientResetUploadButton: "アップロードをリセット",
    clientUploadCompleteDefault: "アップロード完了",
    clientUploadHint: "結果画面でガラス質感のフォトカードに合成されます。",
    clientLightingRigLabel: "ステージ照明を選んでください",
    clientThemeAriaLabel: (themeName, selected) => `${themeName}テーマ ${selected ? "選択済み" : "選択"}`,
    clientSelectedWord: "選択済み",
    clientSelectWord: "選択",
    clientMainReportTitle: (biasName) => `${biasName}との推し運命メインレポート`,
    clientSupplementaryLabel: "補助的な四柱推命診断",
    clientSaveShareLabel: "保存・シェア",
    clientPrevButton: "戻る",
    clientEnterStageButton: "Cosmic Stageに入場",
    clientPayingButton: "決済処理中...",
    clientPayButton: "決済する",
    clientGenderOptionLabels: { 여성: "女性", 남성: "男性", 기타: "その他" },
    clientBiasMoodOptionLabels: { 청량: "清涼", 카리스마: "カリスマ", 몽환: "夢幻", 러블리: "ラブリー", 시크: "シック", 힐링: "ヒーリング" },
    clientRelationMoodOptionLabels: { 응원형: "応援型", 성장형: "成長型", 설렘형: "ときめき型", 위로형: "癒やし型", 운명형: "運命型" },

    clientGuideTitle: "お知らせ",
    clientLoginRequiredTitle: "ログインが必要です",
    clientLoginRequiredMessage: "推し運命診断はアカウント確認後に進みます。ログイン後、再度お試しください。",
    clientAnalysisErrorDefault: "診断中にエラーが発生しました。",
    clientPngSaveFailed: "PNGの保存に失敗しました。",
    clientCopyResultFailed: "結果のコピーに失敗しました。",
    clientShareTitle: "My Destiny Bias",
    clientShareTextCopyFailed: "シェアテキストのコピーに失敗しました。",
    clientInstagramSaveFailed: "Instagramシェア用画像の保存に失敗しました。",
    clientKakaoCopyFailed: "カカオトークシェア文のコピーに失敗しました。",
    clientStep1Title: "あなたのペンライトエネルギーを確認します",
    clientStep1Desc: "名前と生年月日を入力すると、ステージ入場前にあなたの四柱推命エネルギーベースを整えます。",
    clientMyNameLabel: "あなたの名前/ニックネーム",
    clientMyNamePlaceholder: "例: ネオ",
    clientMyBirthDateLabel: "あなたの生年月日",
    clientMyBirthDatePlaceholder: "例: 19910220",
    clientBirthTimeOptionalLabel: "生まれた時間は任意入力",
    clientMyBirthTimePlaceholder: "例: 1430 (任意)",
    clientStep2Title: "推しのプロフィールでステージケミを繋げます",
    clientStep2Desc: "推しの情報とムードを入力すると、あなたの四柱推命エネルギーと重なる共鳴ポイントをステージ基準で計算します。",
    clientBiasNameFieldLabel: "推しの名前",
    clientBiasNamePlaceholder: "例: MY BIAS",
    clientBiasBirthDateLabel: "推しの生年月日",
    clientBiasBirthDatePlaceholder: "例: 20001225",
    clientArtistLabel: "所属アーティスト/グループ",
    clientArtistPlaceholder: "例: STARLIGHT UNIT",
    clientBiasBirthTimePlaceholder: "例: 0915 (任意)",
    clientSearchPlaceholder: "名前、グループ/作品、カテゴリーで検索してみてください",
    clientUploadPreviewAlt: "アップロードした推し画像のプレビュー",
    clientStep3Title: "コンサートステージのトーンを選んでください",
    clientStep3Desc: "ステージの照明温度とオーラの色味を選びます。診断結果は同じで、表現されるカードのスタイルだけが変わります。",
    clientSummaryScoreLabel: "スコア",
    clientSummaryEnergyLabel: "エネルギー",
    clientSummaryPairingLabel: "ペアリング",
    clientSummaryMessageLabel: "運命メッセージ",
    clientSummaryFansignLabel: "ファンサインメッセージ",
    clientShareChemistryLine: (biasName, score, grade, message) => `${biasName}との相性 ${score}点 · ${grade}\n${message}`,
  },
  "zh-CN": {
    auraLabel: "应援灯光环",
    backAriaLabel: "返回",
    headerTitle: "命定本命",

    finaleSectionLabel: "到头来我是哪种粉丝",
    heroTypeSectionLabel: "我的追星体质",
    persistenceSectionLabel: "追星持续力",
    persistenceIntensityLabel: "强度",
    persistenceDurationLabel: "持续时间",
    detachmentSectionLabel: "是什么让你脱粉",
    detachmentReasonLabel: "脱粉原因",
    detachmentStyleLabel: "脱粉方式",
    behaviorSectionLabel: "你是如何越陷越深的",
    behaviorDeepDiveLabel: "追星方式",
    behaviorRelationshipLabel: "关系类型",
    behaviorObsessionLabel: "沉迷点",
    journeySectionLabel: "入坑 & 喜好",
    journeyEntryTypeLabel: "入坑类型",
    journeyTasteLabel: "喜好",
    journeyFirstAttractionLabel: "最初被吸引的要素",
    journeyLongTermLabel: "让你长久喜欢下去的要素",

    shareCardMyDestinyLabel: "我的命定本命",
    albumCoverAltSuffix: "专辑封面",

    stageStep1Label: "粉丝档案确认",
    stageStep1Desc: "根据姓名和出生日期解读你的四柱能量。",
    stageStep2Label: "关联本命",
    stageStep2Desc: "输入本命信息,或从明星档案库中挑选。",
    stageStep3Label: "玻璃写真卡",
    stageStep3Desc: "将缘分解读与本命照片制成卡片,保存为PNG。",
    lineupHeading: "一张本命照片,就能做成收藏版写真卡",
    lineupParagraph:
      "在四柱缘分解读的同时,将你上传的本命照片合成到玻璃写真卡中。\n完成的卡片可保存为PNG,直接发布到主页或社交平台。",

    mainCardLabel: "我的命定本命卡",
    mainCardChemiSummaryLabel: "缘分摘要",
    mainCardCheerPointLabel: "最吸引你的点",
    mainCardRelationLabel: "关系的质感",
    mainCardAdviceLabel: "✨ 今日追星/关系建议",
    mainCardFallbackText: "这句话正在为你打磨得更清晰。",

    fiveSectionsLabel: "四柱缘分解读",
    fiveSectionsTipLabel: "✨ 实用建议",

    elementChartLabel: "五行分布",
    elementChartMeLabel: "我",
    elementFavoriteFallback: "本命",
    elementWood: "木",
    elementFire: "火",
    elementEarth: "土",
    elementMetal: "金",
    elementWater: "水",

    mzZoneLabel: "趣味专区",
    mzRelationMbtiLabel: "我们的关系MBTI",

    scoreGaugeAriaLabel: (total) => `缘分分数 ${total}分`,
    scoreGaugeTimeUnknownText: (biasName) =>
      `${biasName}的出生时间未公开,因此仅按年·月·日进行了解读`,
    scoreGaugeEmotionalLabel: "情感线",
    scoreGaugeFandomLabel: "粉丝心",
    scoreGaugeLongTermLabel: "持久度",
    scoreGaugeStabilityLabel: "稳定度",
    scoreGaugeChemiLabel: "一句话缘分",

    heroTitle: "命定本命现场舞台",
    heroDescription:
      "将你的四柱能量节奏与本命的舞台波长同步,找到此刻共鸣最强的粉丝信号。\n入场的瞬间,聚光灯解读即刻开始。",
    heroEnterButton: "进入舞台",
    heroSkipButton: "跳过彩排直接分析",
    heroSyncText: "正在同步舞台音效与命运信号",

    myDestinyHeroDescription: "把你的生日能量与本命舞台气场相遇的宇宙瞬间,做成写真卡 ✨",

    actionBarHeading: "保存并分享你的写真卡 💜",
    actionBarSubtext: "保存后直接发布到限时动态或信息流,今日追星记录完成！",
    savePhotocardButton: "保存写真卡",
    shareButton: "分享",
    shareToXButton: "分享到X(推特)",
    shareToInstagramButton: "分享到Instagram",
    shareToKakaoButton: "分享到KakaoTalk",
    saveSvgButton: "保存SVG",
    copyTextButton: "复制文本",
    viewResultAgainButton: "再次查看结果",
    tryAnotherButton: "换一个本命再试一次",

    photocardBottomNote: "✦ 这张卡片承载着两人能量的共鸣",
    photocardUploadedImageAltSuffix: "上传的图片",
    defaultChemistryType: "静静守护型",

    loadingSyncLine1: "舞台正在开启",
    loadingSyncLine2: "两人的节奏正在同步 ✨",
    defaultShareKeywords: ["星光", "共鸣", "缘分"],
    scoreSuffix: "分",

    clientInsufficientNamePrompt: "请输入你的姓名/昵称。",
    clientMyBirthErrorPrefix: (reason) => `你的出生日期: ${reason}`,
    clientBiasNamePrompt: "请输入本命的姓名。",
    clientBiasBirthErrorPrefix: (reason) => `本命的出生日期: ${reason}`,
    clientImageTypeError: "仅可上传PNG、JPG、WEBP、GIF格式的图片文件。",
    clientImageSizeError: (mb) => `请上传${mb}MB以下的图片。`,
    clientImageReadError: "无法读取图片,请重新选择。",
    clientImageProcessError: "处理图片时发生错误,请用其他文件重试。",
    clientImageReadyToast: "已准备好将本命照片合成到卡片中。",
    clientImageClearedToast: "已重置上传的图片。",
    clientPresetLoadedToast: (sourceLabel) => `已加载${sourceLabel}的信息。`,
    clientPresetBirthOnlyToast: (sourceLabel) =>
      `已填入${sourceLabel}的生日。出生时间仅在公开时才会自动填入。`,
    clientAnalysisCompleteToast: "命定本命报告和数字写真卡已完成。",
    clientSvgSavedToast: "已保存SVG写真卡。",
    clientPngSavedToast: "已保存PNG写真卡。",
    clientCopySummaryToast: "已复制结果摘要。",
    clientShareResultToast: "已分享结果。",
    clientShareTextCopiedToast: "已复制分享文本。",
    clientPlatformShareOpenedToast: (platformLabel) => `已打开${platformLabel}分享窗口。`,
    clientPlatformInstagram: "Instagram",
    clientPlatformKakao: "KakaoTalk",
    clientShareToXToast: "已打开X(推特)分享窗口。",
    clientInstagramSavedToast: "已保存用于Instagram分享的卡片图片,请从Instagram应用上传。",
    clientKakaoCopiedToast: "已复制KakaoTalk分享文案,请粘贴到KakaoTalk中分享。",
    clientTryAnotherToast: "请输入另一个本命的信息。",
    clientGenderLabel: "性别",
    clientPrivacyNote: "输入的信息仅用于命定本命分析的计算。",
    clientNameSubLabel: "NAME / 姓名",
    clientBirthDateSubLabel: "BIRTH DATE / 出生日期",
    clientBirthTimeSubLabel: "BIRTH TIME / 出生时间",
    clientGenderSubLabel: "GENDER / 性别",
    clientBiasNameSubLabel: "BIAS NAME / 本命姓名",
    clientArtistSubLabel: "ARTIST / 所属团体或艺人",
    clientBiasMoodSubLabel: "BIAS MOOD / 本命氛围",
    clientChemistrySubLabel: "CHEMISTRY / 关系氛围",
    clientStarArchiveSubLabel: "STAR ARCHIVE / 快速加载名人或角色",
    clientPhotoMergeSubLabel: "PHOTO MERGE / 写真卡合成",
    clientStarArchiveTitle: "基于四柱分析界面快速填写资料",
    clientStarArchiveDesc: "搜索或点选偶像、演员、政治人物、动漫角色,一次性填入姓名和出生日期。",
    clientDisplayCountSuffix: (n) => `显示${n}位`,
    clientNarrowBySeriesLabel: "按作品筛选",
    clientBirthdayPrefix: "生日",
    clientTimePrefix: "时间",
    clientTimeUnknownNote: " · 出生时间未公开,仅自动填入了生日。",
    clientTimeHiddenNote: " · 时间未公开",
    clientReapplyButton: "重新填入",
    clientLoadMoreButton: (shown, total) => `加载更多 (${shown}/${total})`,
    clientNoSearchResults: "没有搜索结果。请尝试用姓名或团体名称的一部分重新搜索。",
    clientBiasMoodLabel: "本命氛围",
    clientRelationMoodLabel: "关系氛围",
    clientUploadImageTitle: "上传本命照片",
    clientUploadImageDesc: "上传的图片将自动合成到结果卡片的玻璃相框中。建议12MB以下,PNG/JPG/WEBP格式。",
    clientSelectImageButton: "选择图片",
    clientResetUploadButton: "重置上传",
    clientUploadCompleteDefault: "上传完成",
    clientUploadHint: "将在结果画面中合成为玻璃质感写真卡。",
    clientLightingRigLabel: "请选择舞台灯光",
    clientThemeAriaLabel: (themeName, selected) => `${themeName}主题 ${selected ? "已选择" : "选择"}`,
    clientSelectedWord: "已选择",
    clientSelectWord: "选择",
    clientMainReportTitle: (biasName) => `与${biasName}的命定本命主报告`,
    clientSupplementaryLabel: "辅助四柱分析",
    clientSaveShareLabel: "保存·分享",
    clientPrevButton: "上一步",
    clientEnterStageButton: "进入Cosmic Stage",
    clientPayingButton: "支付处理中...",
    clientPayButton: "支付",
    clientGenderOptionLabels: { 여성: "女性", 남성: "男性", 기타: "其他" },
    clientBiasMoodOptionLabels: { 청량: "清凉", 카리스마: "魅力", 몽환: "梦幻", 러블리: "可爱", 시크: "冷艳", 힐링: "治愈" },
    clientRelationMoodOptionLabels: { 응원형: "应援型", 성장형: "成长型", 설렘형: "心动型", 위로형: "慰藉型", 운명형: "命定型" },

    clientGuideTitle: "提示",
    clientLoginRequiredTitle: "需要登录",
    clientLoginRequiredMessage: "命定本命分析需要先验证账户,请登录后重试。",
    clientAnalysisErrorDefault: "分析过程中发生了错误。",
    clientPngSaveFailed: "PNG保存失败。",
    clientCopyResultFailed: "结果复制失败。",
    clientShareTitle: "My Destiny Bias",
    clientShareTextCopyFailed: "分享文本复制失败。",
    clientInstagramSaveFailed: "Instagram分享图片保存失败。",
    clientKakaoCopyFailed: "KakaoTalk分享文案复制失败。",
    clientStep1Title: "让我们确认你的应援灯能量",
    clientStep1Desc: "输入姓名和出生日期,在进入舞台前先校准你的四柱能量基础。",
    clientMyNameLabel: "我的姓名/昵称",
    clientMyNamePlaceholder: "例: 네오",
    clientMyBirthDateLabel: "我的出生日期",
    clientMyBirthDatePlaceholder: "例: 19910220",
    clientBirthTimeOptionalLabel: "出生时间为选填",
    clientMyBirthTimePlaceholder: "例: 1430 (选填)",
    clientStep2Title: "让我们用本命档案连接舞台缘分",
    clientStep2Desc: "输入本命的信息和氛围,以舞台为基准计算与你四柱能量重叠的共鸣点。",
    clientBiasNameFieldLabel: "本命姓名",
    clientBiasNamePlaceholder: "例: MY BIAS",
    clientBiasBirthDateLabel: "本命的出生日期",
    clientBiasBirthDatePlaceholder: "例: 20001225",
    clientArtistLabel: "所属艺人/团体",
    clientArtistPlaceholder: "例: STARLIGHT UNIT",
    clientBiasBirthTimePlaceholder: "例: 0915 (选填)",
    clientSearchPlaceholder: "试试用姓名、团体/作品或分类搜索",
    clientUploadPreviewAlt: "已上传的本命图片预览",
    clientStep3Title: "请选择演唱会舞台色调",
    clientStep3Desc: "选择舞台的灯光色温与气场色彩。计算结果不变,只有卡片风格会不同。",
    clientSummaryScoreLabel: "分数",
    clientSummaryEnergyLabel: "能量",
    clientSummaryPairingLabel: "配对",
    clientSummaryMessageLabel: "命定讯息",
    clientSummaryFansignLabel: "签售感性讯息",
    clientShareChemistryLine: (biasName, score, grade, message) => `与${biasName}的缘分 ${score}分 · ${grade}\n${message}`,
  },
  "zh-TW": {
    auraLabel: "應援燈光環",
    backAriaLabel: "返回",
    headerTitle: "命定本命",

    finaleSectionLabel: "到頭來我是哪種粉絲",
    heroTypeSectionLabel: "我的追星體質",
    persistenceSectionLabel: "追星持續力",
    persistenceIntensityLabel: "強度",
    persistenceDurationLabel: "持續時間",
    detachmentSectionLabel: "是什麼讓你脫粉",
    detachmentReasonLabel: "脫粉原因",
    detachmentStyleLabel: "脫粉方式",
    behaviorSectionLabel: "你是如何越陷越深的",
    behaviorDeepDiveLabel: "追星方式",
    behaviorRelationshipLabel: "關係類型",
    behaviorObsessionLabel: "沉迷點",
    journeySectionLabel: "入坑 & 喜好",
    journeyEntryTypeLabel: "入坑類型",
    journeyTasteLabel: "喜好",
    journeyFirstAttractionLabel: "最初被吸引的要素",
    journeyLongTermLabel: "讓你長久喜歡下去的要素",

    shareCardMyDestinyLabel: "我的命定本命",
    albumCoverAltSuffix: "專輯封面",

    stageStep1Label: "粉絲檔案確認",
    stageStep1Desc: "根據姓名與出生日期解讀你的四柱能量。",
    stageStep2Label: "關聯本命",
    stageStep2Desc: "輸入本命資訊,或從明星檔案庫中挑選。",
    stageStep3Label: "玻璃寫真卡",
    stageStep3Desc: "將緣分解讀與本命照片製成卡片,保存為PNG。",
    lineupHeading: "一張本命照片,就能做成收藏版寫真卡",
    lineupParagraph:
      "在四柱緣分解讀的同時,將你上傳的本命照片合成到玻璃寫真卡中。\n完成的卡片可保存為PNG,直接發布到主頁或社群平台。",

    mainCardLabel: "我的命定本命卡",
    mainCardChemiSummaryLabel: "緣分摘要",
    mainCardCheerPointLabel: "最吸引你的點",
    mainCardRelationLabel: "關係的質感",
    mainCardAdviceLabel: "✨ 今日追星/關係建議",
    mainCardFallbackText: "這句話正在為你打磨得更清晰。",

    fiveSectionsLabel: "四柱緣分解讀",
    fiveSectionsTipLabel: "✨ 實用建議",

    elementChartLabel: "五行分布",
    elementChartMeLabel: "我",
    elementFavoriteFallback: "本命",
    elementWood: "木",
    elementFire: "火",
    elementEarth: "土",
    elementMetal: "金",
    elementWater: "水",

    mzZoneLabel: "趣味專區",
    mzRelationMbtiLabel: "我們的關係MBTI",

    scoreGaugeAriaLabel: (total) => `緣分分數 ${total}分`,
    scoreGaugeTimeUnknownText: (biasName) =>
      `${biasName}的出生時間未公開,因此僅按年·月·日進行了解讀`,
    scoreGaugeEmotionalLabel: "情感線",
    scoreGaugeFandomLabel: "粉絲心",
    scoreGaugeLongTermLabel: "持久度",
    scoreGaugeStabilityLabel: "穩定度",
    scoreGaugeChemiLabel: "一句話緣分",

    heroTitle: "命定本命現場舞台",
    heroDescription:
      "將你的四柱能量節奏與本命的舞台波長同步,找到此刻共鳴最強的粉絲信號。\n入場的瞬間,聚光燈解讀即刻開始。",
    heroEnterButton: "進入舞台",
    heroSkipButton: "跳過彩排直接分析",
    heroSyncText: "正在同步舞台音效與命運信號",

    myDestinyHeroDescription: "把你的生日能量與本命舞台氣場相遇的宇宙瞬間,做成寫真卡 ✨",

    actionBarHeading: "保存並分享你的寫真卡 💜",
    actionBarSubtext: "保存後直接發布到限時動態或動態消息,今日追星記錄完成！",
    savePhotocardButton: "保存寫真卡",
    shareButton: "分享",
    shareToXButton: "分享到X(推特)",
    shareToInstagramButton: "分享到Instagram",
    shareToKakaoButton: "分享到KakaoTalk",
    saveSvgButton: "保存SVG",
    copyTextButton: "複製文字",
    viewResultAgainButton: "再次查看結果",
    tryAnotherButton: "換一個本命再試一次",

    photocardBottomNote: "✦ 這張卡片承載著兩人能量的共鳴",
    photocardUploadedImageAltSuffix: "上傳的圖片",
    defaultChemistryType: "靜靜守護型",

    loadingSyncLine1: "舞台正在開啟",
    loadingSyncLine2: "兩人的節奏正在同步 ✨",
    defaultShareKeywords: ["星光", "共鳴", "緣分"],
    scoreSuffix: "分",

    clientInsufficientNamePrompt: "請輸入你的姓名/暱稱。",
    clientMyBirthErrorPrefix: (reason) => `你的出生日期: ${reason}`,
    clientBiasNamePrompt: "請輸入本命的姓名。",
    clientBiasBirthErrorPrefix: (reason) => `本命的出生日期: ${reason}`,
    clientImageTypeError: "僅可上傳PNG、JPG、WEBP、GIF格式的圖片檔案。",
    clientImageSizeError: (mb) => `請上傳${mb}MB以下的圖片。`,
    clientImageReadError: "無法讀取圖片,請重新選擇。",
    clientImageProcessError: "處理圖片時發生錯誤,請用其他檔案重試。",
    clientImageReadyToast: "已準備好將本命照片合成到卡片中。",
    clientImageClearedToast: "已重置上傳的圖片。",
    clientPresetLoadedToast: (sourceLabel) => `已載入${sourceLabel}的資訊。`,
    clientPresetBirthOnlyToast: (sourceLabel) =>
      `已填入${sourceLabel}的生日。出生時間僅在公開時才會自動填入。`,
    clientAnalysisCompleteToast: "命定本命報告和數位寫真卡已完成。",
    clientSvgSavedToast: "已保存SVG寫真卡。",
    clientPngSavedToast: "已保存PNG寫真卡。",
    clientCopySummaryToast: "已複製結果摘要。",
    clientShareResultToast: "已分享結果。",
    clientShareTextCopiedToast: "已複製分享文字。",
    clientPlatformShareOpenedToast: (platformLabel) => `已開啟${platformLabel}分享視窗。`,
    clientPlatformInstagram: "Instagram",
    clientPlatformKakao: "KakaoTalk",
    clientShareToXToast: "已開啟X(推特)分享視窗。",
    clientInstagramSavedToast: "已保存用於Instagram分享的卡片圖片,請從Instagram應用程式上傳。",
    clientKakaoCopiedToast: "已複製KakaoTalk分享文案,請貼到KakaoTalk中分享。",
    clientTryAnotherToast: "請輸入另一個本命的資訊。",
    clientGenderLabel: "性別",
    clientPrivacyNote: "輸入的資訊僅用於命定本命分析的計算。",
    clientNameSubLabel: "NAME / 姓名",
    clientBirthDateSubLabel: "BIRTH DATE / 出生日期",
    clientBirthTimeSubLabel: "BIRTH TIME / 出生時間",
    clientGenderSubLabel: "GENDER / 性別",
    clientBiasNameSubLabel: "BIAS NAME / 本命姓名",
    clientArtistSubLabel: "ARTIST / 所屬團體或藝人",
    clientBiasMoodSubLabel: "BIAS MOOD / 本命氛圍",
    clientChemistrySubLabel: "CHEMISTRY / 關係氛圍",
    clientStarArchiveSubLabel: "STAR ARCHIVE / 快速載入名人或角色",
    clientPhotoMergeSubLabel: "PHOTO MERGE / 寫真卡合成",
    clientStarArchiveTitle: "基於四柱分析畫面快速填寫資料",
    clientStarArchiveDesc: "搜尋或點選偶像、演員、政治人物、動漫角色,一次填入姓名和出生日期。",
    clientDisplayCountSuffix: (n) => `顯示${n}位`,
    clientNarrowBySeriesLabel: "依作品篩選",
    clientBirthdayPrefix: "生日",
    clientTimePrefix: "時間",
    clientTimeUnknownNote: " · 出生時間未公開,僅自動填入了生日。",
    clientTimeHiddenNote: " · 時間未公開",
    clientReapplyButton: "重新填入",
    clientLoadMoreButton: (shown, total) => `載入更多 (${shown}/${total})`,
    clientNoSearchResults: "沒有搜尋結果。請嘗試用姓名或團體名稱的一部分重新搜尋。",
    clientBiasMoodLabel: "本命氛圍",
    clientRelationMoodLabel: "關係氛圍",
    clientUploadImageTitle: "上傳本命照片",
    clientUploadImageDesc: "上傳的圖片將自動合成到結果卡片的玻璃相框中。建議12MB以下,PNG/JPG/WEBP格式。",
    clientSelectImageButton: "選擇圖片",
    clientResetUploadButton: "重置上傳",
    clientUploadCompleteDefault: "上傳完成",
    clientUploadHint: "將在結果畫面中合成為玻璃質感寫真卡。",
    clientLightingRigLabel: "請選擇舞台燈光",
    clientThemeAriaLabel: (themeName, selected) => `${themeName}主題 ${selected ? "已選擇" : "選擇"}`,
    clientSelectedWord: "已選擇",
    clientSelectWord: "選擇",
    clientMainReportTitle: (biasName) => `與${biasName}的命定本命主報告`,
    clientSupplementaryLabel: "輔助四柱分析",
    clientSaveShareLabel: "保存·分享",
    clientPrevButton: "上一步",
    clientEnterStageButton: "進入Cosmic Stage",
    clientPayingButton: "支付處理中...",
    clientPayButton: "支付",
    clientGenderOptionLabels: { 여성: "女性", 남성: "男性", 기타: "其他" },
    clientBiasMoodOptionLabels: { 청량: "清涼", 카리스마: "魅力", 몽환: "夢幻", 러블리: "可愛", 시크: "冷豔", 힐링: "治癒" },
    clientRelationMoodOptionLabels: { 응원형: "應援型", 성장형: "成長型", 설렘형: "心動型", 위로형: "慰藉型", 운명형: "命定型" },

    clientGuideTitle: "提示",
    clientLoginRequiredTitle: "需要登入",
    clientLoginRequiredMessage: "命定本命分析需要先驗證帳戶,請登入後重試。",
    clientAnalysisErrorDefault: "分析過程中發生了錯誤。",
    clientPngSaveFailed: "PNG保存失敗。",
    clientCopyResultFailed: "結果複製失敗。",
    clientShareTitle: "My Destiny Bias",
    clientShareTextCopyFailed: "分享文字複製失敗。",
    clientInstagramSaveFailed: "Instagram分享圖片保存失敗。",
    clientKakaoCopyFailed: "KakaoTalk分享文案複製失敗。",
    clientStep1Title: "讓我們確認你的應援燈能量",
    clientStep1Desc: "輸入姓名和出生日期,在進入舞台前先校準你的四柱能量基礎。",
    clientMyNameLabel: "我的姓名/暱稱",
    clientMyNamePlaceholder: "例: 네오",
    clientMyBirthDateLabel: "我的出生日期",
    clientMyBirthDatePlaceholder: "例: 19910220",
    clientBirthTimeOptionalLabel: "出生時間為選填",
    clientMyBirthTimePlaceholder: "例: 1430 (選填)",
    clientStep2Title: "讓我們用本命檔案連接舞台緣分",
    clientStep2Desc: "輸入本命的資訊和氛圍,以舞台為基準計算與你四柱能量重疊的共鳴點。",
    clientBiasNameFieldLabel: "本命姓名",
    clientBiasNamePlaceholder: "例: MY BIAS",
    clientBiasBirthDateLabel: "本命的出生日期",
    clientBiasBirthDatePlaceholder: "例: 20001225",
    clientArtistLabel: "所屬藝人/團體",
    clientArtistPlaceholder: "例: STARLIGHT UNIT",
    clientBiasBirthTimePlaceholder: "例: 0915 (選填)",
    clientSearchPlaceholder: "試試用姓名、團體/作品或分類搜尋",
    clientUploadPreviewAlt: "已上傳的本命圖片預覽",
    clientStep3Title: "請選擇演唱會舞台色調",
    clientStep3Desc: "選擇舞台的燈光色溫與氣場色彩。計算結果不變,只有卡片風格會不同。",
    clientSummaryScoreLabel: "分數",
    clientSummaryEnergyLabel: "能量",
    clientSummaryPairingLabel: "配對",
    clientSummaryMessageLabel: "命定訊息",
    clientSummaryFansignLabel: "簽售感性訊息",
    clientShareChemistryLine: (biasName, score, grade, message) => `與${biasName}的緣分 ${score}分 · ${grade}\n${message}`,
  },
  vi: {
    auraLabel: "Vầng hào quang lightstick",
    backAriaLabel: "Quay lại",
    headerTitle: "Định Mệnh Thần Tượng",

    finaleSectionLabel: "Rốt cuộc tôi là fan kiểu gì",
    heroTypeSectionLabel: "Kiểu fan của tôi",
    persistenceSectionLabel: "Độ bền của tình yêu fan",
    persistenceIntensityLabel: "Cường độ",
    persistenceDurationLabel: "Thời gian",
    detachmentSectionLabel: "Điều gì khiến bạn nguội lạnh",
    detachmentReasonLabel: "Lý do rời fandom",
    detachmentStyleLabel: "Cách rời fandom",
    behaviorSectionLabel: "Bạn đắm chìm sâu hơn thế nào",
    behaviorDeepDiveLabel: "Cách bạn theo đuổi",
    behaviorRelationshipLabel: "Kiểu mối quan hệ",
    behaviorObsessionLabel: "Điểm khiến bạn say mê",
    journeySectionLabel: "Bén duyên & Sở thích",
    journeyEntryTypeLabel: "Kiểu bén duyên",
    journeyTasteLabel: "Sở thích",
    journeyFirstAttractionLabel: "Điều thu hút bạn đầu tiên",
    journeyLongTermLabel: "Điều giữ chân bạn lâu dài",

    shareCardMyDestinyLabel: "Định mệnh thần tượng của tôi",
    albumCoverAltSuffix: "bìa album",

    stageStep1Label: "Kiểm tra hồ sơ fan",
    stageStep1Desc: "Đọc năng lượng Saju của bạn từ tên và ngày sinh.",
    stageStep2Label: "Liên kết thần tượng",
    stageStep2Desc: "Nhập thông tin thần tượng hoặc chọn từ kho sao.",
    stageStep3Label: "Thẻ ảnh kính",
    stageStep3Desc: "Lưu thẻ chứa kết quả hợp duyên và ảnh thần tượng dưới dạng PNG.",
    lineupHeading: "Chỉ một tấm ảnh thần tượng, có ngay thẻ ảnh lưu niệm",
    lineupParagraph:
      "Cùng với kết quả hợp duyên Saju, chúng tôi ghép ảnh thần tượng bạn tải lên thành thẻ ảnh kính.\nThẻ hoàn thành có thể lưu dạng PNG và đăng ngay lên trang cá nhân hoặc mạng xã hội.",

    mainCardLabel: "Thẻ định mệnh thần tượng của tôi",
    mainCardChemiSummaryLabel: "Tóm tắt hợp duyên",
    mainCardCheerPointLabel: "Điểm cuốn hút bạn nhất",
    mainCardRelationLabel: "Sắc thái mối quan hệ",
    mainCardAdviceLabel: "✨ Lời khuyên fandom & mối quan hệ hôm nay",
    mainCardFallbackText: "Chúng tôi vẫn đang trau chuốt câu này rõ hơn cho bạn.",

    fiveSectionsLabel: "Đọc hợp duyên Saju",
    fiveSectionsTipLabel: "✨ Mẹo thực tế",

    elementChartLabel: "Phân bố Ngũ Hành",
    elementChartMeLabel: "Tôi",
    elementFavoriteFallback: "Thần tượng",
    elementWood: "Mộc",
    elementFire: "Hỏa",
    elementEarth: "Thổ",
    elementMetal: "Kim",
    elementWater: "Thủy",

    mzZoneLabel: "Khu vực giải trí",
    mzRelationMbtiLabel: "MBTI mối quan hệ của chúng ta",

    scoreGaugeAriaLabel: (total) => `Điểm hợp duyên ${total}`,
    scoreGaugeTimeUnknownText: (biasName) =>
      `Giờ sinh của ${biasName} không được công khai, nên chỉ luận theo năm, tháng, ngày`,
    scoreGaugeEmotionalLabel: "Cảm xúc",
    scoreGaugeFandomLabel: "Lòng fan",
    scoreGaugeLongTermLabel: "Lâu dài",
    scoreGaugeStabilityLabel: "Ổn định",
    scoreGaugeChemiLabel: "Hợp duyên một dòng",

    heroTitle: "Sân khấu trực tiếp Định Mệnh Thần Tượng",
    heroDescription:
      "Đồng bộ nhịp năng lượng Saju của bạn với tần sóng sân khấu của thần tượng, tìm ra tín hiệu fan cộng hưởng mạnh nhất lúc này.\nBài đọc dưới ánh đèn sân khấu bắt đầu ngay khi bạn bước vào.",
    heroEnterButton: "Bước vào sân khấu",
    heroSkipButton: "Bỏ qua tổng duyệt, phân tích ngay",
    heroSyncText: "Đang đồng bộ âm thanh sân khấu với tín hiệu định mệnh",

    myDestinyHeroDescription:
      "Khoảnh khắc vũ trụ khi năng lượng sinh nhật của bạn gặp hào quang sân khấu của thần tượng ✨",

    actionBarHeading: "Lưu và chia sẻ thẻ ảnh của bạn 💜",
    actionBarSubtext: "Lưu lại và đăng ngay lên story/feed — vậy là hoàn thành nhật ký fan hôm nay!",
    savePhotocardButton: "Lưu thẻ ảnh",
    shareButton: "Chia sẻ",
    shareToXButton: "Chia sẻ lên X (Twitter)",
    shareToInstagramButton: "Chia sẻ lên Instagram",
    shareToKakaoButton: "Chia sẻ lên KakaoTalk",
    saveSvgButton: "Lưu SVG",
    copyTextButton: "Sao chép văn bản",
    viewResultAgainButton: "Xem lại kết quả",
    tryAnotherButton: "Thử với thần tượng khác",

    photocardBottomNote: "✦ Thẻ này chứa đựng sự cộng hưởng năng lượng của hai người",
    photocardUploadedImageAltSuffix: "ảnh đã tải lên",
    defaultChemistryType: "Kiểu ủng hộ thầm lặng",
  },
  hi: {
    auraLabel: "फ़ैनलाइट आभा",
    backAriaLabel: "वापस जाएं",
    headerTitle: "माय डेस्टिनी बायस",

    finaleSectionLabel: "आख़िर में मैं किस तरह का फैन हूं",
    heroTypeSectionLabel: "मेरा फैंडम टाइप",
    persistenceSectionLabel: "यह कितने समय तक टिकता है",
    persistenceIntensityLabel: "तीव्रता",
    persistenceDurationLabel: "अवधि",
    detachmentSectionLabel: "क्या चीज़ इसे ठंडा करती है",
    detachmentReasonLabel: "दूर होने की वजह",
    detachmentStyleLabel: "दूर होने का तरीका",
    behaviorSectionLabel: "आप कैसे गहरे जुड़ते हैं",
    behaviorDeepDiveLabel: "आपकी लगन का तरीका",
    behaviorRelationshipLabel: "रिश्ते का नज़रिया",
    behaviorObsessionLabel: "जुनून का बिंदु",
    journeySectionLabel: "शुरुआत और पसंद",
    journeyEntryTypeLabel: "शुरुआत का प्रकार",
    journeyTasteLabel: "पसंद",
    journeyFirstAttractionLabel: "सबसे पहले आकर्षित करने वाली चीज़",
    journeyLongTermLabel: "लंबे समय तक जोड़े रखने वाली चीज़",

    shareCardMyDestinyLabel: "मेरा डेस्टिनी बायस",
    albumCoverAltSuffix: "एल्बम कवर",

    stageStep1Label: "फैन प्रोफ़ाइल जांचें",
    stageStep1Desc: "आपके नाम और जन्मतिथि से आपकी साजू ऊर्जा पढ़ी जाती है।",
    stageStep2Label: "अपने बायस को लिंक करें",
    stageStep2Desc: "बायस की जानकारी दर्ज करें या स्टार आर्काइव से चुनें।",
    stageStep3Label: "ग्लास फ़ोटोकार्ड",
    stageStep3Desc: "केमिस्ट्री रीडिंग और बायस की फ़ोटो वाला कार्ड PNG में सेव करें।",
    lineupHeading: "बायस की एक फ़ोटो से बनता है यादगार फ़ोटोकार्ड",
    lineupParagraph:
      "साजू कम्पैटिबिलिटी रीडिंग के साथ, आपकी अपलोड की गई बायस फ़ोटो को मिलाकर ग्लास फ़ोटोकार्ड बनाया जाता है।\nतैयार कार्ड को PNG में सेव कर प्रोफ़ाइल या सोशल मीडिया पर तुरंत पोस्ट करें।",

    mainCardLabel: "मेरा डेस्टिनी बायस कार्ड",
    mainCardChemiSummaryLabel: "केमिस्ट्री सारांश",
    mainCardCheerPointLabel: "सबसे ज़्यादा आकर्षित करने वाली बात",
    mainCardRelationLabel: "रिश्ते का स्वरूप",
    mainCardAdviceLabel: "✨ आज की फैंडम और रिश्ते की सलाह",
    mainCardFallbackText: "हम इस पंक्ति को आपके लिए और स्पष्ट बना रहे हैं।",

    fiveSectionsLabel: "साजू केमिस्ट्री रीडिंग",
    fiveSectionsTipLabel: "✨ व्यावहारिक सुझाव",

    elementChartLabel: "पंच तत्व वितरण",
    elementChartMeLabel: "मैं",
    elementFavoriteFallback: "बायस",
    elementWood: "लकड़ी",
    elementFire: "अग्नि",
    elementEarth: "पृथ्वी",
    elementMetal: "धातु",
    elementWater: "जल",

    mzZoneLabel: "मज़े का ज़ोन",
    mzRelationMbtiLabel: "हमारे रिश्ते का MBTI",

    scoreGaugeAriaLabel: (total) => `कम्पैटिबिलिटी स्कोर ${total}`,
    scoreGaugeTimeUnknownText: (biasName) =>
      `${biasName} का जन्म समय सार्वजनिक नहीं है, इसलिए केवल वर्ष, माह और दिन के आधार पर पढ़ा गया है`,
    scoreGaugeEmotionalLabel: "भावनात्मक",
    scoreGaugeFandomLabel: "फैन भावना",
    scoreGaugeLongTermLabel: "दीर्घकालिक",
    scoreGaugeStabilityLabel: "स्थिरता",
    scoreGaugeChemiLabel: "एक-पंक्ति केमिस्ट्री",

    heroTitle: "माय डेस्टिनी बायस लाइव स्टेज",
    heroDescription:
      "आपकी साजू ऊर्जा की लय को बायस की स्टेज तरंग से मिलाकर, अभी सबसे तेज़ गूंजने वाला फैन सिग्नल खोजा जाता है।\nप्रवेश करते ही स्पॉटलाइट रीडिंग शुरू हो जाती है।",
    heroEnterButton: "स्टेज में प्रवेश करें",
    heroSkipButton: "रिहर्सल छोड़ें, सीधे विश्लेषण करें",
    heroSyncText: "स्टेज की ध्वनि को डेस्टिनी सिग्नल से सिंक किया जा रहा है",

    myDestinyHeroDescription:
      "वह ब्रह्मांडीय पल जब आपकी जन्मदिन ऊर्जा आपके बायस की स्टेज आभा से मिलती है ✨",

    actionBarHeading: "अपना फ़ोटोकार्ड सेव और शेयर करें 💜",
    actionBarSubtext: "सेव करें और सीधे स्टोरी/फ़ीड पर पोस्ट करें — आज की फैंडम डायरी पूरी!",
    savePhotocardButton: "फ़ोटोकार्ड सेव करें",
    shareButton: "शेयर करें",
    shareToXButton: "X (ट्विटर) पर शेयर करें",
    shareToInstagramButton: "इंस्टाग्राम पर शेयर करें",
    shareToKakaoButton: "काकाओटॉक पर शेयर करें",
    saveSvgButton: "SVG सेव करें",
    copyTextButton: "टेक्स्ट कॉपी करें",
    viewResultAgainButton: "फिर से परिणाम देखें",
    tryAnotherButton: "किसी और बायस के साथ फिर आज़माएं",

    photocardBottomNote: "✦ इस कार्ड में दो लोगों की ऊर्जा की गूंज समाई है",
    photocardUploadedImageAltSuffix: "अपलोड की गई फ़ोटो",
    defaultChemistryType: "शांत समर्थन प्रकार",
  },
  es: {
    auraLabel: "Aura de lightstick",
    backAriaLabel: "Volver",
    headerTitle: "Mi Destino Bias",

    finaleSectionLabel: "Al final, ¿qué tipo de fan soy?",
    heroTypeSectionLabel: "Mi tipo de fandom",
    persistenceSectionLabel: "Cuánto dura",
    persistenceIntensityLabel: "Intensidad",
    persistenceDurationLabel: "Duración",
    detachmentSectionLabel: "Qué lo enfría",
    detachmentReasonLabel: "Motivo del alejamiento",
    detachmentStyleLabel: "Forma de alejarse",
    behaviorSectionLabel: "Cómo te involucras más",
    behaviorDeepDiveLabel: "Tu forma de seguirlo",
    behaviorRelationshipLabel: "Tipo de vínculo",
    behaviorObsessionLabel: "Punto de obsesión",
    journeySectionLabel: "Cómo empezó y tus gustos",
    journeyEntryTypeLabel: "Cómo te enganchaste",
    journeyTasteLabel: "Gustos",
    journeyFirstAttractionLabel: "Lo primero que te atrajo",
    journeyLongTermLabel: "Lo que te mantiene enganchado a largo plazo",

    shareCardMyDestinyLabel: "Mi Destino Bias",
    albumCoverAltSuffix: "portada del álbum",

    stageStep1Label: "Revisa tu perfil de fan",
    stageStep1Desc: "Leemos tu energía Saju a partir de tu nombre y fecha de nacimiento.",
    stageStep2Label: "Vincula a tu bias",
    stageStep2Desc: "Ingresa los datos de tu bias o elige uno del archivo de estrellas.",
    stageStep3Label: "Tarjeta fotográfica de cristal",
    stageStep3Desc: "Guarda una tarjeta con tu lectura de compatibilidad y la foto de tu bias en PNG.",
    lineupHeading: "Una foto de tu bias se convierte en una tarjeta de colección",
    lineupParagraph:
      "Junto con tu lectura de compatibilidad Saju, combinamos la foto de tu bias que subiste en una tarjeta fotográfica de cristal.\nGuarda la tarjeta terminada en PNG y publícala directamente en tu perfil o feed.",

    mainCardLabel: "Mi tarjeta de Destino Bias",
    mainCardChemiSummaryLabel: "Resumen de química",
    mainCardCheerPointLabel: "Lo que más te atrae",
    mainCardRelationLabel: "La forma de vuestro vínculo",
    mainCardAdviceLabel: "✨ Consejo de fandom y relación de hoy",
    mainCardFallbackText: "Todavía estamos puliendo esta frase para ti.",

    fiveSectionsLabel: "Lectura de química Saju",
    fiveSectionsTipLabel: "✨ Consejo práctico",

    elementChartLabel: "Distribución de los Cinco Elementos",
    elementChartMeLabel: "Yo",
    elementFavoriteFallback: "Bias",
    elementWood: "Madera",
    elementFire: "Fuego",
    elementEarth: "Tierra",
    elementMetal: "Metal",
    elementWater: "Agua",

    mzZoneLabel: "Zona de diversión",
    mzRelationMbtiLabel: "El MBTI de nuestra relación",

    scoreGaugeAriaLabel: (total) => `Puntuación de compatibilidad ${total}`,
    scoreGaugeTimeUnknownText: (biasName) =>
      `La hora de nacimiento de ${biasName} no es pública, así que lo leímos solo por año, mes y día`,
    scoreGaugeEmotionalLabel: "Emocional",
    scoreGaugeFandomLabel: "Fandom",
    scoreGaugeLongTermLabel: "Duración",
    scoreGaugeStabilityLabel: "Estabilidad",
    scoreGaugeChemiLabel: "Química en una línea",

    heroTitle: "Escenario en vivo de Mi Destino Bias",
    heroDescription:
      "Sincronizamos el ritmo de tu energía Saju con la frecuencia del escenario de tu bias para encontrar la señal de fan que resuena más fuerte ahora mismo.\nLa lectura bajo los focos comienza justo al entrar.",
    heroEnterButton: "Entrar al escenario",
    heroSkipButton: "Saltar el ensayo, analizar ya",
    heroSyncText: "Sincronizando el sonido del escenario con la señal del destino",

    myDestinyHeroDescription:
      "El momento cósmico en que tu energía de cumpleaños se encuentra con el aura de escenario de tu bias ✨",

    actionBarHeading: "Guarda y comparte tu tarjeta fotográfica 💜",
    actionBarSubtext: "Guárdala y publícala directo en tu historia o feed: ¡diario de fandom de hoy completado!",
    savePhotocardButton: "Guardar tarjeta",
    shareButton: "Compartir",
    shareToXButton: "Compartir en X (Twitter)",
    shareToInstagramButton: "Compartir en Instagram",
    shareToKakaoButton: "Compartir en KakaoTalk",
    saveSvgButton: "Guardar SVG",
    copyTextButton: "Copiar texto",
    viewResultAgainButton: "Ver el resultado de nuevo",
    tryAnotherButton: "Probar con otro bias",

    photocardBottomNote: "✦ Esta tarjeta guarda la resonancia entre las energías de ambos",
    photocardUploadedImageAltSuffix: "imagen subida",
    defaultChemistryType: "Tipo de apoyo silencioso",
  },
  fr: {
    auraLabel: "Aura de lightstick",
    backAriaLabel: "Retour",
    headerTitle: "Mon Destin Bias",

    finaleSectionLabel: "Au final, quel genre de fan suis-je",
    heroTypeSectionLabel: "Mon type de fandom",
    persistenceSectionLabel: "Combien de temps ça dure",
    persistenceIntensityLabel: "Intensité",
    persistenceDurationLabel: "Durée",
    detachmentSectionLabel: "Ce qui refroidit tout",
    detachmentReasonLabel: "Raison de l'éloignement",
    detachmentStyleLabel: "Façon de s'éloigner",
    behaviorSectionLabel: "Comment vous vous investissez",
    behaviorDeepDiveLabel: "Votre façon de suivre",
    behaviorRelationshipLabel: "Type de lien",
    behaviorObsessionLabel: "Point d'obsession",
    journeySectionLabel: "Coup de cœur & goûts",
    journeyEntryTypeLabel: "Type de coup de cœur",
    journeyTasteLabel: "Goûts",
    journeyFirstAttractionLabel: "Ce qui vous attire en premier",
    journeyLongTermLabel: "Ce qui vous garde attaché sur la durée",

    shareCardMyDestinyLabel: "Mon Destin Bias",
    albumCoverAltSuffix: "pochette d'album",

    stageStep1Label: "Vérifiez votre profil de fan",
    stageStep1Desc: "Nous lisons votre énergie Saju à partir de votre nom et de votre date de naissance.",
    stageStep2Label: "Associez votre bias",
    stageStep2Desc: "Entrez les infos de votre bias ou choisissez-en un dans les archives d'étoiles.",
    stageStep3Label: "Carte photo en verre",
    stageStep3Desc: "Enregistrez une carte avec votre lecture de compatibilité et la photo de votre bias en PNG.",
    lineupHeading: "Une seule photo de votre bias devient une carte photo à collectionner",
    lineupParagraph:
      "Avec votre lecture de compatibilité Saju, nous intégrons la photo de votre bias téléchargée dans une carte photo en verre.\nEnregistrez la carte finie en PNG et publiez-la directement sur votre profil ou fil d'actualité.",

    mainCardLabel: "Ma carte Destin Bias",
    mainCardChemiSummaryLabel: "Résumé de la alchimie",
    mainCardCheerPointLabel: "Ce qui vous attire le plus",
    mainCardRelationLabel: "La nature de votre lien",
    mainCardAdviceLabel: "✨ Conseil fandom & relation du jour",
    mainCardFallbackText: "Nous affinons encore cette phrase pour vous.",

    fiveSectionsLabel: "Lecture d'alchimie Saju",
    fiveSectionsTipLabel: "✨ Astuce pratique",

    elementChartLabel: "Répartition des Cinq Éléments",
    elementChartMeLabel: "Moi",
    elementFavoriteFallback: "Bias",
    elementWood: "Bois",
    elementFire: "Feu",
    elementEarth: "Terre",
    elementMetal: "Métal",
    elementWater: "Eau",

    mzZoneLabel: "Zone détente",
    mzRelationMbtiLabel: "Le MBTI de notre relation",

    scoreGaugeAriaLabel: (total) => `Score de compatibilité ${total}`,
    scoreGaugeTimeUnknownText: (biasName) =>
      `L'heure de naissance de ${biasName} n'est pas publique, donc la lecture se base uniquement sur l'année, le mois et le jour`,
    scoreGaugeEmotionalLabel: "Émotionnel",
    scoreGaugeFandomLabel: "Fandom",
    scoreGaugeLongTermLabel: "Durée",
    scoreGaugeStabilityLabel: "Stabilité",
    scoreGaugeChemiLabel: "Alchimie en une ligne",

    heroTitle: "Scène en direct de Mon Destin Bias",
    heroDescription:
      "Nous synchronisons le rythme de votre énergie Saju avec la fréquence de scène de votre bias pour trouver le signal de fan qui résonne le plus fort maintenant.\nLa lecture sous les projecteurs commence dès l'entrée.",
    heroEnterButton: "Entrer sur scène",
    heroSkipButton: "Passer la répétition, analyser tout de suite",
    heroSyncText: "Synchronisation du son de la scène avec le signal du destin",

    myDestinyHeroDescription:
      "Le moment cosmique où votre énergie d'anniversaire rencontre l'aura de scène de votre bias ✨",

    actionBarHeading: "Enregistrez et partagez votre carte photo 💜",
    actionBarSubtext: "Enregistrez-la et publiez-la directement en story/fil — journal de fandom du jour complet !",
    savePhotocardButton: "Enregistrer la carte photo",
    shareButton: "Partager",
    shareToXButton: "Partager sur X (Twitter)",
    shareToInstagramButton: "Partager sur Instagram",
    shareToKakaoButton: "Partager sur KakaoTalk",
    saveSvgButton: "Enregistrer en SVG",
    copyTextButton: "Copier le texte",
    viewResultAgainButton: "Revoir le résultat",
    tryAnotherButton: "Essayer avec un autre bias",

    photocardBottomNote: "✦ Cette carte porte la résonance des énergies de vous deux",
    photocardUploadedImageAltSuffix: "image téléchargée",
    defaultChemistryType: "Type soutien discret",
  },
  de: {
    auraLabel: "Lightstick-Aura",
    backAriaLabel: "Zurück",
    headerTitle: "Mein Destiny Bias",

    finaleSectionLabel: "Was für ein Fan ich am Ende wirklich bin",
    heroTypeSectionLabel: "Mein Fandom-Typ",
    persistenceSectionLabel: "Wie lange es anhält",
    persistenceIntensityLabel: "Intensität",
    persistenceDurationLabel: "Dauer",
    detachmentSectionLabel: "Was es abkühlen lässt",
    detachmentReasonLabel: "Grund fürs Loslassen",
    detachmentStyleLabel: "Art des Loslassens",
    behaviorSectionLabel: "Wie du dich vertiefst",
    behaviorDeepDiveLabel: "Deine Art des Verfolgens",
    behaviorRelationshipLabel: "Beziehungstyp",
    behaviorObsessionLabel: "Obsessionspunkt",
    journeySectionLabel: "Einstieg & Geschmack",
    journeyEntryTypeLabel: "Einstiegstyp",
    journeyTasteLabel: "Geschmack",
    journeyFirstAttractionLabel: "Was dich zuerst anzieht",
    journeyLongTermLabel: "Was dich langfristig hält",

    shareCardMyDestinyLabel: "Mein Destiny Bias",
    albumCoverAltSuffix: "Albumcover",

    stageStep1Label: "Fan-Profil prüfen",
    stageStep1Desc: "Wir lesen deine Saju-Energie aus Name und Geburtsdatum.",
    stageStep2Label: "Bias verknüpfen",
    stageStep2Desc: "Gib die Bias-Infos ein oder wähle eine aus dem Star-Archiv.",
    stageStep3Label: "Glas-Fotokarte",
    stageStep3Desc: "Speichere eine Karte mit Chemie-Analyse und Bias-Foto als PNG.",
    lineupHeading: "Ein Foto deines Bias wird zur Sammelkarte",
    lineupParagraph:
      "Zusammen mit deiner Saju-Kompatibilitätsanalyse fügen wir das hochgeladene Bias-Foto zu einer Glas-Fotokarte zusammen.\nSpeichere die fertige Karte als PNG und poste sie direkt in deinem Profil oder Feed.",

    mainCardLabel: "Meine Destiny-Bias-Karte",
    mainCardChemiSummaryLabel: "Chemie-Zusammenfassung",
    mainCardCheerPointLabel: "Was dich am meisten anzieht",
    mainCardRelationLabel: "Die Art eurer Verbindung",
    mainCardAdviceLabel: "✨ Heutiger Fandom- & Beziehungstipp",
    mainCardFallbackText: "Wir schärfen diesen Satz gerade noch für dich.",

    fiveSectionsLabel: "Saju-Chemie-Analyse",
    fiveSectionsTipLabel: "✨ Praxistipp",

    elementChartLabel: "Verteilung der Fünf Elemente",
    elementChartMeLabel: "Ich",
    elementFavoriteFallback: "Bias",
    elementWood: "Holz",
    elementFire: "Feuer",
    elementEarth: "Erde",
    elementMetal: "Metall",
    elementWater: "Wasser",

    mzZoneLabel: "Spaß-Zone",
    mzRelationMbtiLabel: "Der MBTI unserer Beziehung",

    scoreGaugeAriaLabel: (total) => `Kompatibilitätswert ${total}`,
    scoreGaugeTimeUnknownText: (biasName) =>
      `Die Geburtszeit von ${biasName} ist nicht öffentlich, daher wurde nur nach Jahr, Monat und Tag gelesen`,
    scoreGaugeEmotionalLabel: "Emotional",
    scoreGaugeFandomLabel: "Fan-Herz",
    scoreGaugeLongTermLabel: "Langfristig",
    scoreGaugeStabilityLabel: "Stabilität",
    scoreGaugeChemiLabel: "Chemie in einer Zeile",

    heroTitle: "Live-Bühne von Mein Destiny Bias",
    heroDescription:
      "Wir synchronisieren den Rhythmus deiner Saju-Energie mit der Bühnenwellenlänge deines Bias, um das gerade stärkste Fan-Signal zu finden.\nDie Spotlight-Analyse beginnt in dem Moment, in dem du eintrittst.",
    heroEnterButton: "Bühne betreten",
    heroSkipButton: "Probe überspringen, sofort analysieren",
    heroSyncText: "Bühnensound wird mit dem Schicksalssignal synchronisiert",

    myDestinyHeroDescription:
      "Der kosmische Moment, in dem deine Geburtstagsenergie auf die Bühnenaura deines Bias trifft ✨",

    actionBarHeading: "Speichere und teile deine Fotokarte 💜",
    actionBarSubtext: "Speichern und direkt in Story/Feed posten — das heutige Fandom-Tagebuch ist komplett!",
    savePhotocardButton: "Fotokarte speichern",
    shareButton: "Teilen",
    shareToXButton: "Auf X (Twitter) teilen",
    shareToInstagramButton: "Auf Instagram teilen",
    shareToKakaoButton: "Auf KakaoTalk teilen",
    saveSvgButton: "Als SVG speichern",
    copyTextButton: "Text kopieren",
    viewResultAgainButton: "Ergebnis erneut ansehen",
    tryAnotherButton: "Mit einem anderen Bias erneut versuchen",

    photocardBottomNote: "✦ Diese Karte trägt die Resonanz eurer beider Energien",
    photocardUploadedImageAltSuffix: "hochgeladenes Bild",
    defaultChemistryType: "Ruhiger Unterstützer-Typ",
  },
  nl: {
    auraLabel: "Lightstick-aura",
    backAriaLabel: "Terug",
    headerTitle: "Mijn Destiny Bias",

    finaleSectionLabel: "Wat voor fan ik uiteindelijk ben",
    heroTypeSectionLabel: "Mijn fandomtype",
    persistenceSectionLabel: "Hoe lang het duurt",
    persistenceIntensityLabel: "Intensiteit",
    persistenceDurationLabel: "Duur",
    detachmentSectionLabel: "Wat het laat afkoelen",
    detachmentReasonLabel: "Reden om los te laten",
    detachmentStyleLabel: "Manier van loslaten",
    behaviorSectionLabel: "Hoe je je verdiept",
    behaviorDeepDiveLabel: "Jouw manier van volgen",
    behaviorRelationshipLabel: "Type band",
    behaviorObsessionLabel: "Obsessiepunt",
    journeySectionLabel: "Instap & smaak",
    journeyEntryTypeLabel: "Instaptype",
    journeyTasteLabel: "Smaak",
    journeyFirstAttractionLabel: "Wat je als eerste aantrekt",
    journeyLongTermLabel: "Wat je op lange termijn vasthoudt",

    shareCardMyDestinyLabel: "Mijn Destiny Bias",
    albumCoverAltSuffix: "albumhoes",

    stageStep1Label: "Controleer je fanprofiel",
    stageStep1Desc: "We lezen je Saju-energie uit je naam en geboortedatum.",
    stageStep2Label: "Koppel je bias",
    stageStep2Desc: "Vul de gegevens van je bias in of kies er een uit het sterrenarchief.",
    stageStep3Label: "Glazen fotokaart",
    stageStep3Desc: "Sla een kaart met je chemie-analyse en bias-foto op als PNG.",
    lineupHeading: "Eén foto van je bias wordt een verzamelfotokaart",
    lineupParagraph:
      "Samen met je Saju-compatibiliteitsanalyse combineren we de geüploade bias-foto tot een glazen fotokaart.\nSla de voltooide kaart op als PNG en plaats hem direct op je profiel of feed.",

    mainCardLabel: "Mijn Destiny Bias-kaart",
    mainCardChemiSummaryLabel: "Chemie-samenvatting",
    mainCardCheerPointLabel: "Wat je het meest aantrekt",
    mainCardRelationLabel: "De aard van jullie band",
    mainCardAdviceLabel: "✨ Fandom- en relatietip van vandaag",
    mainCardFallbackText: "We verfijnen deze zin nog voor je.",

    fiveSectionsLabel: "Saju-chemie-analyse",
    fiveSectionsTipLabel: "✨ Praktische tip",

    elementChartLabel: "Verdeling van de Vijf Elementen",
    elementChartMeLabel: "Ik",
    elementFavoriteFallback: "Bias",
    elementWood: "Hout",
    elementFire: "Vuur",
    elementEarth: "Aarde",
    elementMetal: "Metaal",
    elementWater: "Water",

    mzZoneLabel: "Pretzone",
    mzRelationMbtiLabel: "De MBTI van onze relatie",

    scoreGaugeAriaLabel: (total) => `Compatibiliteitsscore ${total}`,
    scoreGaugeTimeUnknownText: (biasName) =>
      `De geboortetijd van ${biasName} is niet openbaar, dus is er alleen gelezen op basis van jaar, maand en dag`,
    scoreGaugeEmotionalLabel: "Emotioneel",
    scoreGaugeFandomLabel: "Fanhart",
    scoreGaugeLongTermLabel: "Langdurig",
    scoreGaugeStabilityLabel: "Stabiliteit",
    scoreGaugeChemiLabel: "Chemie in één regel",

    heroTitle: "Livepodium van Mijn Destiny Bias",
    heroDescription:
      "We synchroniseren het ritme van je Saju-energie met de podiumgolflengte van je bias om het fansignaal te vinden dat nu het sterkst resoneert.\nDe spotlight-analyse begint zodra je binnenkomt.",
    heroEnterButton: "Betreed het podium",
    heroSkipButton: "Sla repetitie over, analyseer direct",
    heroSyncText: "Podiumgeluid wordt gesynchroniseerd met het lotssignaal",

    myDestinyHeroDescription:
      "Het kosmische moment waarop jouw verjaardagsenergie de podiumaura van je bias ontmoet ✨",

    actionBarHeading: "Sla je fotokaart op en deel hem 💜",
    actionBarSubtext: "Sla hem op en post hem direct op je story/feed — het fandomlogboek van vandaag is compleet!",
    savePhotocardButton: "Fotokaart opslaan",
    shareButton: "Delen",
    shareToXButton: "Delen op X (Twitter)",
    shareToInstagramButton: "Delen op Instagram",
    shareToKakaoButton: "Delen op KakaoTalk",
    saveSvgButton: "SVG opslaan",
    copyTextButton: "Tekst kopiëren",
    viewResultAgainButton: "Resultaat opnieuw bekijken",
    tryAnotherButton: "Probeer een andere bias",

    photocardBottomNote: "✦ Deze kaart draagt de resonantie van jullie beider energieën",
    photocardUploadedImageAltSuffix: "geüploade afbeelding",
    defaultChemistryType: "Stille supporter-type",
  },
  ms: {
    auraLabel: "Aura lightstick",
    backAriaLabel: "Kembali",
    headerTitle: "Destiny Bias Saya",

    finaleSectionLabel: "Akhirnya, peminat jenis apa saya ini",
    heroTypeSectionLabel: "Jenis fandom saya",
    persistenceSectionLabel: "Berapa lama ia bertahan",
    persistenceIntensityLabel: "Keamatan",
    persistenceDurationLabel: "Tempoh",
    detachmentSectionLabel: "Apa yang menyejukkannya",
    detachmentReasonLabel: "Sebab menjauhkan diri",
    detachmentStyleLabel: "Cara menjauhkan diri",
    behaviorSectionLabel: "Bagaimana anda semakin mendalam",
    behaviorDeepDiveLabel: "Cara anda menghayati",
    behaviorRelationshipLabel: "Jenis hubungan",
    behaviorObsessionLabel: "Titik obsesi",
    journeySectionLabel: "Permulaan & Citarasa",
    journeyEntryTypeLabel: "Jenis permulaan",
    journeyTasteLabel: "Citarasa",
    journeyFirstAttractionLabel: "Perkara yang menarik anda mula-mula",
    journeyLongTermLabel: "Perkara yang mengekalkan minat anda dalam jangka panjang",

    shareCardMyDestinyLabel: "Destiny Bias Saya",
    albumCoverAltSuffix: "kulit album",

    stageStep1Label: "Semak profil peminat",
    stageStep1Desc: "Kami membaca tenaga Saju anda daripada nama dan tarikh lahir.",
    stageStep2Label: "Pautkan bias anda",
    stageStep2Desc: "Masukkan maklumat bias atau pilih daripada arkib bintang.",
    stageStep3Label: "Kad foto kaca",
    stageStep3Desc: "Simpan kad yang mengandungi bacaan kimia dan foto bias sebagai PNG.",
    lineupHeading: "Satu foto bias sudah cukup untuk jadi kad foto koleksi",
    lineupParagraph:
      "Bersama bacaan keserasian Saju anda, kami menggabungkan foto bias yang dimuat naik ke dalam kad foto kaca.\nSimpan kad yang siap sebagai PNG dan muat naik terus ke profil atau suapan anda.",

    mainCardLabel: "Kad Destiny Bias Saya",
    mainCardChemiSummaryLabel: "Ringkasan kimia",
    mainCardCheerPointLabel: "Perkara yang paling menarik minat anda",
    mainCardRelationLabel: "Corak hubungan anda",
    mainCardAdviceLabel: "✨ Nasihat fandom & hubungan hari ini",
    mainCardFallbackText: "Kami sedang menghalusi ayat ini untuk anda.",

    fiveSectionsLabel: "Bacaan kimia Saju",
    fiveSectionsTipLabel: "✨ Petua praktikal",

    elementChartLabel: "Taburan Lima Unsur",
    elementChartMeLabel: "Saya",
    elementFavoriteFallback: "Bias",
    elementWood: "Kayu",
    elementFire: "Api",
    elementEarth: "Bumi",
    elementMetal: "Logam",
    elementWater: "Air",

    mzZoneLabel: "Zon keseronokan",
    mzRelationMbtiLabel: "MBTI hubungan kita",

    scoreGaugeAriaLabel: (total) => `Skor keserasian ${total}`,
    scoreGaugeTimeUnknownText: (biasName) =>
      `Waktu lahir ${biasName} tidak diketahui umum, jadi bacaan hanya berdasarkan tahun, bulan dan hari`,
    scoreGaugeEmotionalLabel: "Emosi",
    scoreGaugeFandomLabel: "Semangat peminat",
    scoreGaugeLongTermLabel: "Jangka panjang",
    scoreGaugeStabilityLabel: "Kestabilan",
    scoreGaugeChemiLabel: "Kimia satu baris",

    heroTitle: "Pentas Langsung Destiny Bias Saya",
    heroDescription:
      "Kami menyelaraskan rentak tenaga Saju anda dengan gelombang pentas bias anda untuk mencari isyarat peminat yang paling kuat bergema sekarang.\nBacaan spotlight bermula sebaik sahaja anda masuk.",
    heroEnterButton: "Masuk ke pentas",
    heroSkipButton: "Langkau latihan, analisis terus",
    heroSyncText: "Menyelaraskan bunyi pentas dengan isyarat destini",

    myDestinyHeroDescription:
      "Detik kosmik apabila tenaga hari lahir anda bertemu aura pentas bias anda ✨",

    actionBarHeading: "Simpan dan kongsi kad foto anda 💜",
    actionBarSubtext: "Simpan dan muat naik terus ke story/suapan — log fandom hari ini selesai!",
    savePhotocardButton: "Simpan kad foto",
    shareButton: "Kongsi",
    shareToXButton: "Kongsi ke X (Twitter)",
    shareToInstagramButton: "Kongsi ke Instagram",
    shareToKakaoButton: "Kongsi ke KakaoTalk",
    saveSvgButton: "Simpan SVG",
    copyTextButton: "Salin teks",
    viewResultAgainButton: "Lihat semula keputusan",
    tryAnotherButton: "Cuba dengan bias lain",

    photocardBottomNote: "✦ Kad ini membawa resonansi tenaga kedua-dua orang",
    photocardUploadedImageAltSuffix: "imej yang dimuat naik",
    defaultChemistryType: "Jenis sokongan senyap",
  },
  en: DESTINY_BIAS_COPY_EN,
};

export function getDestinyBiasCopy(locale: LoadingLocale): DestinyBiasCopy {
  // 스프레드 병합 — 로케일 전체가 없거나(vi/hi/es/fr/de/nl/ms), 있어도 옵셔널 필드 일부만
  // 빠졌으면(en/ja/zh만 채운 신규 필드) 항상 EN 값으로 자동 채워진다.
  return { ...DESTINY_BIAS_COPY_EN, ...(DESTINY_BIAS_COPY[locale] || {}) };
}

export function useDestinyBiasCopy(): DestinyBiasCopy {
  const [locale, setLocale] = useState<LoadingLocale>(() => getCurrentLoadingLocale());
  useEffect(() => {
    const sync = () => setLocale(getCurrentLoadingLocale());
    window.addEventListener("languagechange", sync);
    window.addEventListener("cd:locale-ready", sync);
    return () => {
      window.removeEventListener("languagechange", sync);
      window.removeEventListener("cd:locale-ready", sync);
    };
  }, []);
  return getDestinyBiasCopy(locale);
}
