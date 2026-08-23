"use client";

import { useEffect, useState } from "react";
import { getCurrentLoadingLocale, type LoadingLocale } from "@/constants/loadingMessages";

export interface PalmDestinyCopy {
  handRoleLabelInnate: string;
  handRoleLabelAcquired: string;
  handRoleLabelMixed: string;
  handRoleLabelUnknown: string;
  handRoleDescInnate: string;
  handRoleDescAcquired: string;
  handRoleDescMixed: string;
  handRoleDescUnknown: string;

  dominantHandLabelRight: string;
  dominantHandLabelLeft: string;
  dominantHandLabelBoth: string;
  dominantHandHintRight: string;
  dominantHandHintLeft: string;
  dominantHandHintBoth: string;

  shootingGuides: string[];
  loadingPhases: string[];

  cardLabelLifeLine: string;
  cardLabelHeadLine: string;
  cardLabelHeartLine: string;
  cardLabelFateLine: string;
  cardLabelSunLine: string;
  cardLabelMoneyLine: string;
  cardLabelMarriageLine: string;
  cardLabelMounts: string;

  purposeLabelGeneral: string;
  purposeLabelLove: string;
  purposeLabelWealth: string;
  purposeLabelCareer: string;
  purposeLabelPersonality: string;
  purposeLabelRelationship: string;

  categoryTitleGeneral: string;
  categoryTitleLove: string;
  categoryTitleWealth: string;
  categoryTitleCareer: string;
  categoryTitlePersonality: string;
  categoryTitleRelationship: string;

  qualityWarningResolution: string;
  qualityWarningBrightness: string;
  qualityWarningSharpness: string;
  qualityWarningPalmLikely: string;
  qualityWarningFullPalmLikely: string;
  qualityWarningGlareLow: string;
  qualityConfidenceSummaryHigh: string;
  qualityConfidenceSummaryMedium: string;
  qualityConfidenceSummaryLow: string;
  qualityConfidenceBadgeHigh: string;
  qualityConfidenceBadgeMedium: string;
  qualityConfidenceBadgeLow: string;

  lineLengthLong: string;
  lineLengthMedium: string;
  lineLengthShort: string;
  lineLengthDefault: string;
  lineDepthDeep: string;
  lineDepthMedium: string;
  lineDepthFaint: string;
  lineDepthDefault: string;
  lineCurvatureWideStrong: string;
  lineCurvatureNormalSoft: string;
  lineCurvatureNarrowStraight: string;
  lineCurvatureDefault: string;
  headDirectionStraight: string;
  headDirectionCurved: string;
  headDirectionDownward: string;
  headDirectionDefault: string;
  headLifeRelationJoined: string;
  headLifeRelationSeparated: string;
  headLifeRelationDefault: string;
  heartEndingUnderIndex: string;
  heartEndingUnderMiddle: string;
  heartEndingBetween: string;
  heartEndingDefault: string;
  fateStrengthStrong: string;
  fateStrengthMedium: string;
  fateStrengthWeakNone: string;
  fateStrengthDefault: string;
  fateStartWrist: string;
  fateStartLifeLine: string;
  fateStartMoonMount: string;
  fateStartMiddlePalm: string;
  fateStartDefault: string;
  minorStrengthHigh: string;
  minorStrengthMedium: string;
  minorStrengthLow: string;
  minorStrengthDefault: string;
  lineChangesNone: string;
  lineChangesBoth: (branchCount: number, breakCount: number) => string;
  lineChangesBranchOnly: (branchCount: number) => string;
  lineChangesBreakOnly: (breakCount: number) => string;

  mountFocusVenus: string;
  mountFocusMoon: string;
  mountFocusJupiter: string;
  mountFocusSaturn: string;
  mountFocusSun: string;
  mountFocusMercury: string;
  mountFocusMars: string;
  mountFocusNoReading: string;
  mountFocusBalanced: string;

  noReadingLabel: string;
  noReadingValue: string;
  lifeLineLengthLabel: string;
  lifeLineDepthLabel: string;
  lifeLineCurvatureLabel: string;
  lifeLineChangesLabel: string;
  lifeLineFallbackLabel: string;
  lifeLineFallbackValue: string;
  headLineLengthLabel: string;
  headLineDirectionLabel: string;
  headLineRelationLabel: string;
  headLineChangesLabel: string;
  headLineFallbackLabel: string;
  headLineFallbackValue: string;
  heartLineLengthLabel: string;
  heartLineCurvatureLabel: string;
  heartLineEndingLabel: string;
  heartLineChangesLabel: string;
  heartLineFallbackLabel: string;
  heartLineFallbackValue: string;
  fateLineStrengthLabel: string;
  fateLineStartLabel: string;
  fateLineChangesLabel: string;
  fateLineFallbackLabel: string;
  fateLineFallbackValue: string;
  sunLineStrengthLabel: string;
  sunLineReadingLabel: string;
  sunLineReadingDefaultValue: string;
  moneyLineStrengthLabel: string;
  moneyLineReadingLabel: string;
  moneyLineReadingDefaultValue: string;
  marriageLineStrengthLabel: string;
  marriageLineReadingLabel: string;
  marriageLineReadingDefaultValue: string;
  handShapeLabel: string;
  handShapeDefaultValue: string;
  centerPointLabel: string;
  overallLabel: string;
  overallDefaultValue: string;

  resultModeFull: string;
  resultModePartial: string;
  resultModeFallback: string;

  categoryGeneralDefaultSummary: string;
  categoryGeneralDefaultAction1: string;
  categoryGeneralDefaultAction2: string;
  categoryLoveDefaultSummary: string;
  categoryLoveDefaultAction: string;
  categoryWealthDefaultSummary: string;
  categoryWealthDefaultAction: string;
  categoryCareerDefaultSummary: string;
  categoryCareerDefaultAction: string;
  categoryPersonalityDefaultSummary: string;
  categoryPersonalityDefaultAction: string;
  categoryRelationshipDefaultSummary: string;
  categoryRelationshipDefaultAction: string;

  resultOneLinerDefault: string;
  resultPrimaryActionDefault: string;

  overlayAltLeft: string;
  overlayAltRight: string;
  overlayAltGeneric: string;

  handNameLeft: string;
  handNameRight: string;
  uploadSourceCamera: string;
  uploadSourceGallery: string;

  noFileSelectedMessage: string;
  unsupportedFileTypeMessage: string;
  fileTooLargeMessage: string;
  heicPreviewLimitedMessage: string;
  prepFallbackMessage: (errorMessage: string) => string;
  qualityCheckLimitedMessage: string;
  handNoHandDetectedMessage: (handName: string) => string;
  lowQualityContinueMessage: (warningSuffix: string) => string;
  heicConvertedMessage: (sourceLabel: string) => string;
  imageLoadedWithWarningMessage: (sourceLabel: string, prepWarning: string) => string;
  imageLoadedMessage: (sourceLabel: string) => string;
  heicUnreadableMessage: string;
  imageLoadFailedMessage: (errorMessage: string) => string;
  unknownErrorLabel: string;
  noFileSelectedRetryMessage: string;
  imageEncodingFailedError: string;
  duplicateInFlightMessage: string;
  duplicateRecentMessage: string;
  coinGateAuthRequiredMessage: string;
  coinGateInsufficientMessage: (serverCost: number) => string;
  coinGatePriceNotFoundMessage: string;
  coinGateGenericFailureMessage: string;
  checkingPassMessage: string;
  checkingImageQualityMessage: string;
  analyzingPalmPhotoMessage: string;
  readingGoldenLinesMessage: string;
  analysisErrorGenericMessage: string;
  palmNotFullyVisibleMessage: string;
  palmNotFullyVisibleRetryMessage: string;
  resultConfirmedCheckingPaymentMessage: string;
  requestCancelledStatusMessage: string;
  requestCancelledMessage: string;
  networkErrorStatusMessage: string;
  networkErrorMessage: string;
  analysisErrorWithReasonMessage: (errorMessage: string) => string;
  photoReselectKeepMessage: string;
  retryOtherHandKeepMessage: string;
  resetResultKeepMessage: string;
  resultModeFullQualityMessage: string;
  resultModePartialQualityMessage: string;
  resultModeFallbackQualityMessage: string;
  previewLoadFailedMessage: (handName: string) => string;

  selectButtonLabel: string;
  readSignalHeading: string;
  interpretationHeading: string;
  strengthHeading: string;
  cautionHeading: string;
  todayAdviceHeading: string;
  sevenDayPracticeHeading: string;

  palmInputBadge: string;
  palmInputDescription: string;
  registeredBadge: string;
  detectedBadge: string;
  estimatedBadge: string;
  photoQualityBadge: (confidenceLabel: string) => string;
  qualityOkMessage: string;
  retakePhotoAction: string;
  chooseAnotherPhotoAction: string;
  captureAgainAction: string;
  captureFirstAction: string;
  choosePhotoFirstAction: string;
  deletePhotoAction: (handName: string) => string;
  previewCaption: (title: string) => string;
  previewPlaceholder: string;
  cameraAriaLabel: (handName: string, hasPreview: boolean) => string;
  galleryAriaLabel: (handName: string, hasPreview: boolean) => string;
  deletePhotoAriaLabel: (handName: string) => string;
  galleryInputAriaLabel: (handName: string) => string;
  cameraInputAriaLabel: (handName: string) => string;

  pageTitle: string;
  pageSubtitle: string;
  pageTagline: string;
  pageDescription: string;
  pageDescriptionSub: string;
  captureSectionHeading: string;
  captureSectionDescription: string;
  oneHandNoteMain: string;
  oneHandNoteSub: string;
  leftHandInputLabel: string;
  rightHandInputLabel: string;
  captureNowAriaLabel: string;
  captureNowLabel: string;
  choosePhotoAriaLabel: string;
  choosePhotoLabel: string;
  currentTargetLabel: (handName: string) => string;
  flowStepUpload: string;
  flowStepPreview: string;
  flowStepAnalyzing: string;
  flowStepResult: string;
  previewOfHand: (handName: string) => string;
  selectedPreviewAlt: string;
  checklistFullPalm: string;
  checklistCreases: string;
  checklistGlare: string;
  checklistShake: string;
  analyzeThisPhotoAction: string;
  bothHandsUploadHeading: string;
  leftHandUploadTitle: string;
  rightHandUploadTitle: string;
  innateAcquiredHeading: string;
  innateAcquiredExplain1: string;
  innateAcquiredExplain2: string;
  innateAcquiredExplain3: string;
  dominantHandHeading: string;
  purposeFixedNote: string;
  shootingGuideHeading: string;
  analyzingButtonLabel: string;
  openPalmMapButtonLabel: string;
  lowQualityDetectedMessage: (handNames: string) => string;
  lowQualityAdviceMessage: string;
  activeConditionMessage: string;
  leftHandRoleLabel: (roleLabel: string) => string;
  rightHandRoleLabel: (roleLabel: string) => string;
  analyzingBanner: string;
  reselectPhotoAction: string;
  reanalyzeAction: string;
  resultOverlayHeading: string;
  resultOverlaySubheading: string;
  coordinateBasedBadge: string;
  symbolicGuideBadge: string;
  viewOtherHandAction: string;
  backToMainAction: string;
  viewLeftHandAction: string;
  viewRightHandAction: string;
  fullscreenExitLabel: string;
  fullscreenEnterLabel: string;
  fullscreenExitButton: string;
  fullscreenEnterButton: string;
  readingHeadline: string;
  readSignalStat: string;
  signalCountUnit: (count: number) => string;
  handShapeStat: string;
  centerPointStat: string;
  todayActionStat: string;
  specialPatternHeading: string;
  photoGuideHeading: string;
  photoGuideMessage: string;
  focusSummaryHeading: string;
  innateAcquiredComparisonHeading: string;
  innateAcquiredComparisonSub: string;
  categoryReportHeading: string;
  categoryReportSub: string;
  detailFlowHeading: string;
  actionSuggestionHeading: string;
  quickReportHeading: string;
  quickReportRowOneLiner: string;
  quickReportRowOneLinerDefault: string;
  quickReportRowOverall: string;
  quickReportRowOverallDefault: string;
  quickReportRowLove: string;
  quickReportRowLoveDefault: string;
  quickReportRowWealth: string;
  quickReportRowWealthDefault: string;
  quickReportRowCareer: string;
  quickReportRowCareerDefault: string;
  quickReportRowPersonality: string;
  quickReportRowPersonalityDefault: string;
  quickReportRowHealth: string;
  quickReportRowHealthDefault: string;
  quickReportRowRelationship: string;
  quickReportRowRelationshipDefault: string;
  quickReportRowAdvice: string;
  quickReportRowAdviceDefault: string;
  expertConsultHeading: string;
  expertConsultSub: string;
  expertConsultIncludedBadge: string;
  expertConsultMissingMessage: string;
}

const PALM_DESTINY_COPY_EN: PalmDestinyCopy = {
  handRoleLabelInnate: "Innate hand",
  handRoleLabelAcquired: "Acquired hand",
  handRoleLabelMixed: "Blended hand",
  handRoleLabelUnknown: "Undetermined",
  handRoleDescInnate: "Shows your innate temperament and potential",
  handRoleDescAcquired: "Shows your current tendencies and life path so far",
  handRoleDescMixed: "Reflects both innate and acquired traits together",
  handRoleDescUnknown: "Determined after you choose your dominant hand.",

  dominantHandLabelRight: "Right hand",
  dominantHandLabelLeft: "Left hand",
  dominantHandLabelBoth: "Both hands",
  dominantHandHintRight: "Right-hand-centered reading",
  dominantHandHintLeft: "Left-hand-centered reading",
  dominantHandHintBoth: "Balanced reading of both hands",

  shootingGuides: [
    "Open your palm fully and include your wrist in the frame.",
    "Spread your fingers naturally so they don't overlap.",
    "Shoot near a window or in bright light, with the flash off.",
    "Get close so your palm fills the center of the frame.",
    "Photograph the palm side with the lines, not the back of the hand.",
    "Keep your hand parallel to the camera so it isn't tilted.",
    "Make sure the focus is sharp enough to see fine creases.",
  ],
  loadingPhases: [
    "Checking the outline of your palm.",
    "Finding your life, heart, and head lines.",
    "Analyzing your hand shape and overall flow.",
    "Putting together your category-by-category reading.",
  ],

  cardLabelLifeLine: "🌱 Life line",
  cardLabelHeadLine: "🧠 Head line",
  cardLabelHeartLine: "💗 Heart line",
  cardLabelFateLine: "🧭 Fate line",
  cardLabelSunLine: "✨ Sun line",
  cardLabelMoneyLine: "💰 Money line",
  cardLabelMarriageLine: "🤝 Marriage line",
  cardLabelMounts: "🌟 Mounts",

  purposeLabelGeneral: "Overall fortune",
  purposeLabelLove: "Love fortune",
  purposeLabelWealth: "Wealth fortune",
  purposeLabelCareer: "Career fortune",
  purposeLabelPersonality: "Personality analysis",
  purposeLabelRelationship: "Relationship pattern",

  categoryTitleGeneral: "🌟 Overall fortune",
  categoryTitleLove: "💗 Love fortune",
  categoryTitleWealth: "💰 Wealth fortune",
  categoryTitleCareer: "🧭 Career fortune",
  categoryTitlePersonality: "✨ Personality/charm",
  categoryTitleRelationship: "🤝 Relationship fortune",

  qualityWarningResolution: "Resolution is low, which may limit reading fine palm lines.",
  qualityWarningBrightness: "The photo is too dark or too bright.",
  qualityWarningSharpness: "The photo may be shaky or out of focus.",
  qualityWarningPalmLikely: "The palm appears tilted, making the line area hard to estimate.",
  qualityWarningFullPalmLikely: "Please shoot so your whole hand, from wrist to fingertips, is visible.",
  qualityWarningGlareLow: "Strong glare may be hiding some lines.",
  qualityConfidenceSummaryHigh: "High analysis confidence",
  qualityConfidenceSummaryMedium: "Medium analysis confidence",
  qualityConfidenceSummaryLow: "Low analysis confidence: the lighting or focus is weak, so some flows are read as reference only.",
  qualityConfidenceBadgeHigh: "High",
  qualityConfidenceBadgeMedium: "Medium",
  qualityConfidenceBadgeLow: "Low",

  lineLengthLong: "a flow that runs long",
  lineLengthMedium: "a flow that runs at a balanced length",
  lineLengthShort: "a flow that stays concentrated and short",
  lineLengthDefault: "a flow that reads weak",
  lineDepthDeep: "a clear, vivid line",
  lineDepthMedium: "a balanced, even line",
  lineDepthFaint: "a soft, quiet line",
  lineDepthDefault: "a faintly visible line",
  lineCurvatureWideStrong: "a flow that wraps gently around",
  lineCurvatureNormalSoft: "a flow that runs naturally",
  lineCurvatureNarrowStraight: "a straight, disciplined flow",
  lineCurvatureDefault: "a gentle, easy flow",
  headDirectionStraight: "centered on practical judgment",
  headDirectionCurved: "centered on sensitivity and imagination",
  headDirectionDownward: "centered on intuition and deep focus",
  headDirectionDefault: "balanced thinking",
  headLifeRelationJoined: "tends to start things carefully",
  headLifeRelationSeparated: "tends to judge independently",
  headLifeRelationDefault: "adjusts based on the situation",
  heartEndingUnderIndex: "values ideals and trust",
  heartEndingUnderMiddle: "values practical stability",
  heartEndingBetween: "balances the heart and reality",
  heartEndingDefault: "checks the relationship's temperature slowly",
  fateStrengthStrong: "a flow with a clear central goal",
  fateStrengthMedium: "a flow that's still refining its direction",
  fateStrengthWeakNone: "a flow where exploration outweighs a fixed path",
  fateStrengthDefault: "a flow that's slowly finding its direction",
  fateStartWrist: "a flow built steadily from the very start",
  fateStartLifeLine: "a flow that opens its path through daily life's foundation",
  fateStartMoonMount: "a flow where opportunity opens through people and environment",
  fateStartMiddlePalm: "a flow that becomes clear in direction after experience",
  fateStartDefault: "a flow that finds its path as it goes",
  minorStrengthHigh: "a flow that feels vivid and alive",
  minorStrengthMedium: "a flow that looks balanced",
  minorStrengthLow: "a flow that looks quiet",
  minorStrengthDefault: "a flow that shows itself subtly",
  lineChangesNone: "a line that continues without much disturbance",
  lineChangesBoth: (branchCount, breakCount) => `${branchCount} branch(es) · ${breakCount} shift(s)`,
  lineChangesBranchOnly: (branchCount) => `a line expanding with ${branchCount} branch(es)`,
  lineChangesBreakOnly: (breakCount) => `a line showing ${breakCount} shift(s)`,

  mountFocusVenus: "Affection",
  mountFocusMoon: "Intuition",
  mountFocusJupiter: "Growth",
  mountFocusSaturn: "Responsibility",
  mountFocusSun: "Expression",
  mountFocusMercury: "Communication",
  mountFocusMars: "Drive",
  mountFocusNoReading: "Overall palm flow",
  mountFocusBalanced: "Balanced type",

  noReadingLabel: "Photo flow",
  noReadingValue: "Read mainly through your overall palm flow.",
  lifeLineLengthLabel: "Length",
  lifeLineDepthLabel: "Depth",
  lifeLineCurvatureLabel: "Curve",
  lifeLineChangesLabel: "Changes",
  lifeLineFallbackLabel: "State",
  lifeLineFallbackValue: "Your life line was faint in this photo, so your energy flow was read broadly.",
  headLineLengthLabel: "Length",
  headLineDirectionLabel: "Direction",
  headLineRelationLabel: "Start point",
  headLineChangesLabel: "Changes",
  headLineFallbackLabel: "State",
  headLineFallbackValue: "Your head line was faint, so it was read together with your hand shape and surrounding flow.",
  heartLineLengthLabel: "Length",
  heartLineCurvatureLabel: "Curve",
  heartLineEndingLabel: "Ending",
  heartLineChangesLabel: "Changes",
  heartLineFallbackLabel: "State",
  heartLineFallbackValue: "Your heart line was faint, so relationship warmth was read cautiously.",
  fateLineStrengthLabel: "Strength",
  fateLineStartLabel: "Start point",
  fateLineChangesLabel: "Shift",
  fateLineFallbackLabel: "State",
  fateLineFallbackValue: "Your fate line was faint, so the reading focused on flexibility of choice rather than a fixed path.",
  sunLineStrengthLabel: "Expressiveness",
  sunLineReadingLabel: "Reading",
  sunLineReadingDefaultValue: "You're someone who builds momentum through work that puts your name on the line.",
  moneyLineStrengthLabel: "Wealth flow",
  moneyLineReadingLabel: "Reading",
  moneyLineReadingDefaultValue: "Rather than making big claims about money, this reads your habits of managing and valuing it.",
  marriageLineStrengthLabel: "Relationship flow",
  marriageLineReadingLabel: "Reading",
  marriageLineReadingDefaultValue: "This reads intimacy and how you keep commitments, not the number of relationships.",
  handShapeLabel: "Hand shape",
  handShapeDefaultValue: "Blended type",
  centerPointLabel: "Center point",
  overallLabel: "Overall texture",
  overallDefaultValue: "A synthesis of your overall palm flow.",

  resultModeFull: "Precision reading",
  resultModePartial: "Core reading",
  resultModeFallback: "Basic reading",

  categoryGeneralDefaultSummary: "This is a palm reading that lays out your current flow simply.",
  categoryGeneralDefaultAction1: "Finish one thing you've been putting off today and open up your flow.",
  categoryGeneralDefaultAction2: "If the reading feels long, start with a short check-in conversation.",
  categoryLoveDefaultSummary: "Your love fortune looks strongest around stability and honest conversation.",
  categoryLoveDefaultAction: "In relationships, adjust your own tone first before reacting to the other person.",
  categoryWealthDefaultSummary: "Your wealth fortune gains strength when you build steadily over time.",
  categoryWealthDefaultAction: "Fixing your spending baseline first makes your direction clear much faster.",
  categoryCareerDefaultSummary: "Your career fortune grows stronger as you build your own style and skill.",
  categoryCareerDefaultAction: "Break your schedule into short units to build an execution rhythm and results will follow.",
  categoryPersonalityDefaultSummary: "This is a light reading of your personality and charm.",
  categoryPersonalityDefaultAction: "Consistency lands better than exaggeration when it comes to how you express yourself.",
  categoryRelationshipDefaultSummary: "Your relationship fortune improves through comfortable communication.",
  categoryRelationshipDefaultAction: "What matters most is the pattern of keeping a single promise.",

  resultOneLinerDefault: "We read your overall palm flow and mapped out the direction you need right now.",
  resultPrimaryActionDefault: "Finish one small action today and open up your flow.",

  overlayAltLeft: "Left palm overlay",
  overlayAltRight: "Right palm overlay",
  overlayAltGeneric: "Palm overlay",

  handNameLeft: "Left hand",
  handNameRight: "Right hand",
  uploadSourceCamera: "Camera photo",
  uploadSourceGallery: "Gallery photo",

  noFileSelectedMessage: "No photo was selected. Please choose your palm image again.",
  unsupportedFileTypeMessage: "This file type isn't supported. Please choose a JPG, PNG, WEBP, or HEIC/HEIF image.",
  fileTooLargeMessage: "The file is too large. Please choose an image under 25MB.",
  heicPreviewLimitedMessage: "HEIC/HEIF preview optimization is limited on this device. Analysis will proceed with the original file.",
  prepFallbackMessage: (errorMessage) => `Skipping browser preprocessing and analyzing the original file. (${errorMessage})`,
  qualityCheckLimitedMessage: "Quality pre-check is limited on this browser, so guidance will follow the server analysis result.",
  handNoHandDetectedMessage: (handName) => `We couldn't find a hand in the ${handName} photo. Please open your palm and shoot again so it fills the frame from wrist to fingertips.`,
  lowQualityContinueMessage: (warningSuffix) => `Analysis is possible, but the photo may be a bit dark or blurry. Please treat the result as reference only.${warningSuffix}`,
  heicConvertedMessage: (sourceLabel) => `Converted your ${sourceLabel} HEIC image to JPEG for analysis. Please check the preview, then start the analysis.`,
  imageLoadedWithWarningMessage: (sourceLabel, prepWarning) => `Loaded your ${sourceLabel} image. ${prepWarning} Please check the preview, then start the analysis.`,
  imageLoadedMessage: (sourceLabel) => `Loaded your ${sourceLabel} image. Please check the preview, then start the analysis.`,
  heicUnreadableMessage: "This browser couldn't read the HEIC/HEIF image. Please shoot in JPG on iPhone, or convert it and choose again.",
  imageLoadFailedMessage: (errorMessage) => `Image loading failed: ${errorMessage}. Please try a different photo.`,
  unknownErrorLabel: "Unknown error",
  noFileSelectedRetryMessage: "No photo was selected. Please try again.",
  imageEncodingFailedError: "Image encoding failed.",
  duplicateInFlightMessage: "The same image is already being analyzed. Please wait a moment.",
  duplicateRecentMessage: "The same image request was just processed. Please try again shortly or change your photo.",
  coinGateAuthRequiredMessage: "You need to log in. Please log in and try the palm reading analysis again.",
  coinGateInsufficientMessage: (serverCost) => `Your available balance isn't enough. A payment of ${serverCost} is required.`,
  coinGatePriceNotFoundMessage: "Couldn't find the pricing for palm reading analysis. Please try again shortly.",
  coinGateGenericFailureMessage: "The payment failed.",
  checkingPassMessage: "Checking your pass",
  checkingImageQualityMessage: "Checking your palm image quality...",
  analyzingPalmPhotoMessage: "Analyzing your palm photo",
  readingGoldenLinesMessage: "Reading the golden lines of your palm...",
  analysisErrorGenericMessage: "An error occurred during analysis.",
  palmNotFullyVisibleMessage: "Your whole palm isn't in frame.",
  palmNotFullyVisibleRetryMessage: "Your whole palm isn't in frame. Please retake the photo so it's visible from wrist to fingertips.",
  resultConfirmedCheckingPaymentMessage: "Your analysis result has been confirmed. Checking your payment...",
  requestCancelledStatusMessage: "The request was cancelled.",
  requestCancelledMessage: "The request was cancelled. Please try the analysis again.",
  networkErrorStatusMessage: "The analysis request failed due to a network/API error.",
  networkErrorMessage: "The analysis request failed due to a network/API error. Please check your connection and try again.",
  analysisErrorWithReasonMessage: (errorMessage) => `An error occurred during analysis: ${errorMessage}`,
  photoReselectKeepMessage: "You can choose your photo again to restart the palm reading analysis.",
  retryOtherHandKeepMessage: "Please choose your dominant hand again to view the reading based on a different hand.",
  resetResultKeepMessage: "The previous analysis result was reset. You can analyze again with the same input.",
  resultModeFullQualityMessage: "Your palm was fully recognized. A precision analysis result was generated.",
  resultModePartialQualityMessage: "Your palm was detected and a partial analysis result was generated. Uploading a sharper photo will improve accuracy.",
  resultModeFallbackQualityMessage: "Your palm was detected, but the sharpness was low, so the result was generated with a basic/conservative reading.",
  previewLoadFailedMessage: (handName) => `Couldn't load the ${handName} preview. Please upload again in JPG/PNG/WEBP format.`,

  selectButtonLabel: "Select",
  readSignalHeading: "Signals read",
  interpretationHeading: "Interpretation",
  strengthHeading: "Strengths to build on",
  cautionHeading: "Points to adjust",
  todayAdviceHeading: "Today's advice",
  sevenDayPracticeHeading: "7-day practice",

  palmInputBadge: "Palm input",
  palmInputDescription: "Please upload or take a clear photo of your palm.",
  registeredBadge: "Registered",
  detectedBadge: "Hand detected",
  estimatedBadge: "Hand position estimated",
  photoQualityBadge: (confidenceLabel) => `Photo quality: ${confidenceLabel}`,
  qualityOkMessage: "The quality check looks good. You can proceed to analyze with this photo.",
  retakePhotoAction: "Retake photo",
  chooseAnotherPhotoAction: "Choose another photo",
  captureAgainAction: "Retake",
  captureFirstAction: "Take photo",
  choosePhotoFirstAction: "Choose from gallery",
  deletePhotoAction: (handName) => `Delete ${handName} photo`,
  previewCaption: (title) => `${title} preview`,
  previewPlaceholder: "It will appear here after you upload.",
  cameraAriaLabel: (handName, hasPreview) => `${handName} ${hasPreview ? "retake photo" : "take photo"}`,
  galleryAriaLabel: (handName, hasPreview) => `${handName} ${hasPreview ? "choose another photo" : "choose photo from gallery"}`,
  deletePhotoAriaLabel: (handName) => `Delete registered ${handName} photo`,
  galleryInputAriaLabel: (handName) => `${handName} gallery file input`,
  cameraInputAriaLabel: (handName) => `${handName} camera capture input`,

  pageTitle: "Palm Map",
  pageSubtitle: "Innate Form · Acquired Flow",
  pageTagline: "Reading the flow of love, wealth, career, and heart etched into your palm",
  pageDescription: "Palm reading isn't a tool for declaring lifespan or illness — it's a map that symbolically reads your temperament, relationships, wealth, and career flow.",
  pageDescriptionSub: "We read the hand you were born with together with the hand shaped by your life. Your palm holds both your original nature and the path you've walked.",
  captureSectionHeading: "Photograph/upload your palm",
  captureSectionDescription: "Please shoot so your palm is centered in the frame. Good lighting with your whole hand visible improves accuracy.",
  oneHandNoteMain: "Analysis works with just one hand registered.",
  oneHandNoteSub: "Registering both hands adds a comparison between your innate and acquired traits.",
  leftHandInputLabel: "Left hand input",
  rightHandInputLabel: "Right hand input",
  captureNowAriaLabel: "Take a photo of your palm now",
  captureNowLabel: "Take a photo of your palm now",
  choosePhotoAriaLabel: "Choose a photo from your gallery",
  choosePhotoLabel: "Choose a photo from your gallery",
  currentTargetLabel: (handName) => `Currently selected: ${handName}`,
  flowStepUpload: "1. Upload",
  flowStepPreview: "2. Preview/quality check",
  flowStepAnalyzing: "3. Analyze",
  flowStepResult: "4. Result",
  previewOfHand: (handName) => `${handName} preview`,
    selectedPreviewAlt: "Selected palm preview",
  checklistFullPalm: "Is your whole hand visible?",
  checklistCreases: "Can you see the lines on your palm?",
  checklistGlare: "Is there no strong glare?",
  checklistShake: "Is the photo free of camera shake?",
  analyzeThisPhotoAction: "Analyze with this photo as-is",
  bothHandsUploadHeading: "Compare both hands (optional)",
  leftHandUploadTitle: "Left hand image upload",
  rightHandUploadTitle: "Right hand image upload",
  innateAcquiredHeading: "Innate vs. acquired hand",
  innateAcquiredExplain1: "In palm reading, your dominant hand is read as your acquired hand, and your non-dominant hand as your innate hand.",
  innateAcquiredExplain2: "Your acquired hand shows your current tendencies and life flow; your innate hand shows the temperament and potential you were born with.",
  innateAcquiredExplain3: "By reading your innate form together with your acquired flow, we offer a practical, grounded direction.",
  dominantHandHeading: "Choose your dominant hand",
  purposeFixedNote: "The analysis focus is fixed to overall fortune, showing love/wealth/career/personality/relationship categories all at once.",
  shootingGuideHeading: "Shooting guide",
  analyzingButtonLabel: "Analyzing your palm reading...",
  openPalmMapButtonLabel: "Open your palm destiny map",
  lowQualityDetectedMessage: (handNames) => `The photo quality for ${handNames} was measured as low`,
  lowQualityAdviceMessage: "Reshooting in brighter light with your whole palm clearly visible will make the reading much more accurate.",
  activeConditionMessage: "Active when: at least one left- or right-hand photo, plus your dominant hand selected",
  leftHandRoleLabel: (roleLabel) => `Left hand role: ${roleLabel}`,
  rightHandRoleLabel: (roleLabel) => `Right hand role: ${roleLabel}`,
  analyzingBanner: "Reading the golden lines of your palm...",
  reselectPhotoAction: "Choose photo again",
  reanalyzeAction: "Analyze again",
  resultOverlayHeading: "Palm reading result overlay",
  resultOverlaySubheading: "Compare your innate form and acquired flow in one view.",
  coordinateBasedBadge: "Coordinate-based + partial correction",
  symbolicGuideBadge: "Symbolic guide overlay",
  viewOtherHandAction: "View the other hand again",
  backToMainAction: "Return to main",
  viewLeftHandAction: "View left hand",
  viewRightHandAction: "View right hand",
  fullscreenExitLabel: "View in standard screen",
  fullscreenEnterLabel: "View in fullscreen",
  fullscreenExitButton: "Standard screen",
  fullscreenEnterButton: "Fullscreen",
  readingHeadline: "Your palm reading at a glance",
  readSignalStat: "Signals read",
  signalCountUnit: (count) => `${count}`,
  handShapeStat: "Hand shape",
  centerPointStat: "Center point",
  todayActionStat: "Today's action",
  specialPatternHeading: "Special palm patterns detected",
  photoGuideHeading: "Photo guide",
  photoGuideMessage: "Getting your whole palm in frame with less shadow will make the reading much richer.",
  focusSummaryHeading: "Interpretation focus",
  innateAcquiredComparisonHeading: "Innate/acquired comparison summary",
  innateAcquiredComparisonSub: "Reading the hand you were born with together with the hand shaped by your life.",
  categoryReportHeading: "Full category report",
  categoryReportSub: "See your love, wealth, career, personality, and relationship flow all at once.",
  detailFlowHeading: "Detailed flow",
  actionSuggestionHeading: "Suggested action",
  quickReportHeading: "🌙 Your palm reading at a glance",
  quickReportRowOneLiner: "🌙 One-line summary",
  quickReportRowOneLinerDefault: "We put your palm reading flow into an easy, fun summary.",
  quickReportRowOverall: "🌟 Overall fortune",
  quickReportRowOverallDefault: "Right now, the more you find your own rhythm, the more stable your fortune becomes.",
  quickReportRowLove: "💗 Love fortune",
  quickReportRowLoveDefault: "Your love fortune improves with honest conversation.",
  quickReportRowWealth: "💰 Wealth fortune",
  quickReportRowWealthDefault: "Your wealth fortune thrives when you build it steadily.",
  quickReportRowCareer: "🧭 Career fortune",
  quickReportRowCareerDefault: "Your career fortune grows stronger as you build your own style and skill.",
  quickReportRowPersonality: "✨ Personality/charm",
  quickReportRowPersonalityDefault: "A quiet sense of trustworthiness is your charm point.",
  quickReportRowHealth: "🌱 Health/energy",
  quickReportRowHealthDefault: "Managing your rhythm, rather than pushing hard, keeps your luck alive.",
  quickReportRowRelationship: "🤝 Relationship fortune",
  quickReportRowRelationshipDefault: "Your relationship fortune gains strength through comfortable communication.",
  quickReportRowAdvice: "🔮 Today's advice",
  quickReportRowAdviceDefault: "Finish one small thing you've been putting off today.",
  expertConsultHeading: "In-depth expert interpretation",
  expertConsultSub: "Based on your reading, an expert breaks it down item by item.",
  expertConsultIncludedBadge: "Included",
  expertConsultMissingMessage: "We couldn't generate the in-depth interpretation for this reading. The category reports below are still provided as normal.",
};

const PALM_DESTINY_COPY: Partial<Record<LoadingLocale, PalmDestinyCopy>> = {
  ko: {
    handRoleLabelInnate: "선천적 손",
    handRoleLabelAcquired: "후천적 손",
    handRoleLabelMixed: "선후천 혼합 손",
    handRoleLabelUnknown: "미확정",
    handRoleDescInnate: "타고난 기질과 잠재력을 보여주는 손",
    handRoleDescAcquired: "현재의 성향과 살아온 흐름을 보여주는 손",
    handRoleDescMixed: "선천성과 후천성이 함께 반영된 손",
    handRoleDescUnknown: "주로 쓰는 손 선택 후 판별됩니다.",

    dominantHandLabelRight: "오른손",
    dominantHandLabelLeft: "왼손",
    dominantHandLabelBoth: "양손",
    dominantHandHintRight: "오른손 중심 해석",
    dominantHandHintLeft: "왼손 중심 해석",
    dominantHandHintBoth: "양손 균형 해석",

    shootingGuides: [
      "손바닥을 활짝 펴고 손목까지 함께 담아 주세요.",
      "손가락을 자연스럽게 벌려 서로 겹치지 않게 해 주세요.",
      "창가나 밝은 조명 아래에서, 정면 플래시는 끄고 촬영해 주세요.",
      "손바닥이 화면 중앙을 꽉 채우도록 가까이 찍어 주세요.",
      "손등이 아니라 손금이 있는 손바닥 면을 촬영해 주세요.",
      "손을 카메라와 나란히 두어 기울어지지 않게 해 주세요.",
      "초점이 맞아 잔주름까지 보이는지 확인하고 촬영해 주세요.",
    ],
    loadingPhases: [
      "손바닥 윤곽을 확인하고 있습니다.",
      "생명선·감정선·지능선을 찾고 있습니다.",
      "손의 형태와 전체 흐름을 분석하고 있습니다.",
      "카테고리별 상담 결과를 정리하고 있습니다.",
    ],

    cardLabelLifeLine: "🌱 에너지",
    cardLabelHeadLine: "🧠 생각",
    cardLabelHeartLine: "💗 연애",
    cardLabelFateLine: "🧭 진로",
    cardLabelSunLine: "✨ 매력",
    cardLabelMoneyLine: "💰 재물",
    cardLabelMarriageLine: "🤝 관계",
    cardLabelMounts: "🌟 종합",

    purposeLabelGeneral: "전체 운세",
    purposeLabelLove: "연애운",
    purposeLabelWealth: "재물운",
    purposeLabelCareer: "직업운",
    purposeLabelPersonality: "성격 분석",
    purposeLabelRelationship: "관계 패턴",

    categoryTitleGeneral: "🌟 전체 운세",
    categoryTitleLove: "💗 연애운",
    categoryTitleWealth: "💰 재물운",
    categoryTitleCareer: "🧭 직업운",
    categoryTitlePersonality: "✨ 성격/매력",
    categoryTitleRelationship: "🤝 관계운",

    qualityWarningResolution: "해상도가 낮아 세부 손금 인식이 제한될 수 있습니다.",
    qualityWarningBrightness: "사진 밝기가 너무 어둡거나 밝습니다.",
    qualityWarningSharpness: "사진이 흔들렸거나 초점이 흐릴 수 있습니다.",
    qualityWarningPalmLikely: "손바닥 구도가 기울어 손금 영역 추정이 어렵습니다.",
    qualityWarningFullPalmLikely: "손목부터 손가락 끝까지 전체가 보이도록 촬영해 주세요.",
    qualityWarningGlareLow: "빛 반사가 강해 일부 선이 가려질 수 있습니다.",
    qualityConfidenceSummaryHigh: "분석 확신도 높음",
    qualityConfidenceSummaryMedium: "분석 확신도 보통",
    qualityConfidenceSummaryLow: "분석 확신도 낮음: 사진의 빛이나 초점이 약해 일부 흐름은 참고용으로 읽습니다.",
    qualityConfidenceBadgeHigh: "높음",
    qualityConfidenceBadgeMedium: "보통",
    qualityConfidenceBadgeLow: "낮음",

    lineLengthLong: "길게 이어지는 흐름",
    lineLengthMedium: "균형 있게 이어지는 흐름",
    lineLengthShort: "짧게 집중되는 흐름",
    lineLengthDefault: "흐름이 약한 상태",
    lineDepthDeep: "선명한 결",
    lineDepthMedium: "균형 있는 결",
    lineDepthFaint: "잔잔한 결",
    lineDepthDefault: "옅게 보이는 결",
    lineCurvatureWideStrong: "부드럽게 감싸는 흐름",
    lineCurvatureNormalSoft: "자연스럽게 이어지는 흐름",
    lineCurvatureNarrowStraight: "곧고 절제된 흐름",
    lineCurvatureDefault: "완만한 흐름",
    headDirectionStraight: "현실 판단 중심",
    headDirectionCurved: "감각과 상상력 중심",
    headDirectionDownward: "직관과 몰입 중심",
    headDirectionDefault: "균형형 사고",
    headLifeRelationJoined: "신중하게 시작하는 편",
    headLifeRelationSeparated: "독립적으로 판단하는 편",
    headLifeRelationDefault: "상황을 보며 조절하는 편",
    heartEndingUnderIndex: "이상과 신뢰를 중시",
    heartEndingUnderMiddle: "현실적 안정감을 중시",
    heartEndingBetween: "마음과 현실의 균형",
    heartEndingDefault: "관계 온도를 천천히 확인",
    fateStrengthStrong: "목표축이 선명한 흐름",
    fateStrengthMedium: "방향을 다듬는 흐름",
    fateStrengthWeakNone: "정해진 길보다 탐색이 강한 흐름",
    fateStrengthDefault: "천천히 방향을 잡는 흐름",
    fateStartWrist: "초기부터 꾸준히 쌓는 흐름",
    fateStartLifeLine: "생활 기반에서 길을 여는 흐름",
    fateStartMoonMount: "사람과 환경에서 기회가 열리는 흐름",
    fateStartMiddlePalm: "경험 뒤 방향이 또렷해지는 흐름",
    fateStartDefault: "상황에 맞춰 길을 찾는 흐름",
    minorStrengthHigh: "선명하게 살아 있는 흐름",
    minorStrengthMedium: "균형 있게 보이는 흐름",
    minorStrengthLow: "잔잔하게 보이는 흐름",
    minorStrengthDefault: "은은하게 드러나는 흐름",
    lineChangesNone: "큰 흔들림 없이 이어지는 결",
    lineChangesBoth: (branchCount, breakCount) => `가지 ${branchCount}개 · 전환 ${breakCount}개`,
    lineChangesBranchOnly: (branchCount) => `가지 ${branchCount}개로 확장되는 결`,
    lineChangesBreakOnly: (breakCount) => `전환 ${breakCount}개가 보이는 결`,

    mountFocusVenus: "애정",
    mountFocusMoon: "직관",
    mountFocusJupiter: "성장",
    mountFocusSaturn: "책임",
    mountFocusSun: "표현",
    mountFocusMercury: "소통",
    mountFocusMars: "추진",
    mountFocusNoReading: "손바닥 전체 흐름",
    mountFocusBalanced: "균형형",

    noReadingLabel: "사진 흐름",
    noReadingValue: "손바닥 전체 흐름을 중심으로 읽었어요.",
    lifeLineLengthLabel: "길이",
    lifeLineDepthLabel: "깊이",
    lifeLineCurvatureLabel: "곡선",
    lifeLineChangesLabel: "변화",
    lifeLineFallbackLabel: "상태",
    lifeLineFallbackValue: "이번 사진에서는 생명선이 옅어 에너지 흐름을 넓게 읽었어요.",
    headLineLengthLabel: "길이",
    headLineDirectionLabel: "방향",
    headLineRelationLabel: "시작",
    headLineChangesLabel: "변화",
    headLineFallbackLabel: "상태",
    headLineFallbackValue: "두뇌선이 옅어 손 형태와 주변 흐름까지 함께 읽었어요.",
    heartLineLengthLabel: "길이",
    heartLineCurvatureLabel: "곡선",
    heartLineEndingLabel: "끝맺음",
    heartLineChangesLabel: "변화",
    heartLineFallbackLabel: "상태",
    heartLineFallbackValue: "감정선이 옅어 관계 온도는 조심스럽게 읽었어요.",
    fateLineStrengthLabel: "힘",
    fateLineStartLabel: "시작",
    fateLineChangesLabel: "전환",
    fateLineFallbackLabel: "상태",
    fateLineFallbackValue: "운명선이 옅어 정해진 길보다 선택의 유연성을 중심으로 읽었어요.",
    sunLineStrengthLabel: "표현력",
    sunLineReadingLabel: "리딩",
    sunLineReadingDefaultValue: "이름을 걸고 보여주는 일에서 흐름을 키우는 손입니다.",
    moneyLineStrengthLabel: "재물 흐름",
    moneyLineReadingLabel: "리딩",
    moneyLineReadingDefaultValue: "돈을 크게 단정하기보다 관리와 가치화 습관을 읽었습니다.",
    marriageLineStrengthLabel: "관계 흐름",
    marriageLineReadingLabel: "리딩",
    marriageLineReadingDefaultValue: "관계의 횟수가 아니라 친밀감과 약속 방식을 읽었습니다.",
    handShapeLabel: "손 형태",
    handShapeDefaultValue: "복합형",
    centerPointLabel: "중심 포인트",
    overallLabel: "전체 결",
    overallDefaultValue: "손바닥 전체 흐름을 종합해 읽었습니다.",

    resultModeFull: "정밀 리딩",
    resultModePartial: "핵심 리딩",
    resultModeFallback: "기본 리딩",

    categoryGeneralDefaultSummary: "지금 흐름을 쉽게 정리한 손금 리딩이에요.",
    categoryGeneralDefaultAction1: "오늘은 미뤄둔 일 하나를 끝내고 흐름을 열어 보세요.",
    categoryGeneralDefaultAction2: "해석이 길어지면 짧게라도 확인 대화를 시작해 보세요.",
    categoryLoveDefaultSummary: "연애운은 안정감과 솔직한 대화가 핵심으로 보여요.",
    categoryLoveDefaultAction: "관계는 상대의 반응보다 내 톤을 먼저 정돈해 보세요.",
    categoryWealthDefaultSummary: "재물운은 꾸준히 쌓을 때 힘이 붙는 흐름이에요.",
    categoryWealthDefaultAction: "지출 기준선을 먼저 고치면 방향이 훨씬 빨리 선명해집니다.",
    categoryCareerDefaultSummary: "직업운은 내 방식과 실력을 쌓을수록 강해져요.",
    categoryCareerDefaultAction: "일정 단위를 짧게 쪼개서 실행 리듬을 만들면 성과가 붙습니다.",
    categoryPersonalityDefaultSummary: "성격과 매력을 가볍게 정리한 리딩이에요.",
    categoryPersonalityDefaultAction: "표현은 과장보다 일관성으로 가면 반응이 좋아집니다.",
    categoryRelationshipDefaultSummary: "관계운은 편안한 소통에서 더 좋아져요.",
    categoryRelationshipDefaultAction: "가장 중요한 것은 약속 하나를 지키는 패턴입니다.",

    resultOneLinerDefault: "손바닥 전체 흐름을 읽어 지금 필요한 방향을 정리했어요.",
    resultPrimaryActionDefault: "오늘은 작은 행동 하나를 끝내며 흐름을 열어 보세요.",

    overlayAltLeft: "왼손 손바닥 오버레이",
    overlayAltRight: "오른손 손바닥 오버레이",
    overlayAltGeneric: "손바닥 오버레이",

    handNameLeft: "왼손",
    handNameRight: "오른손",
    uploadSourceCamera: "카메라 촬영",
    uploadSourceGallery: "앨범 선택",

    noFileSelectedMessage: "사진을 선택하지 않았습니다. 손바닥 이미지를 다시 선택해 주세요.",
    unsupportedFileTypeMessage: "파일 형식을 지원하지 않습니다. JPG, PNG, WEBP, HEIC/HEIF 이미지를 선택해 주세요.",
    fileTooLargeMessage: "파일 크기가 너무 큽니다. 25MB 이하 이미지를 선택해 주세요.",
    heicPreviewLimitedMessage: "이 기기에서는 HEIC/HEIF 미리보기 최적화가 제한됩니다. 원본 파일로 분석을 진행합니다.",
    prepFallbackMessage: (errorMessage) => `브라우저 전처리를 건너뛰고 원본으로 분석합니다. (${errorMessage})`,
    qualityCheckLimitedMessage: "이 브라우저에서는 품질 사전점검이 제한되어 서버 분석 결과를 기준으로 안내합니다.",
    handNoHandDetectedMessage: (handName) => `${handName} 사진에서 손을 찾지 못했습니다. 손바닥을 펴고 손목부터 손가락 끝까지 화면에 담아 다시 촬영해 주세요.`,
    lowQualityContinueMessage: (warningSuffix) => `분석은 가능하지만 사진이 조금 어둡거나 흐릴 수 있습니다. 결과는 참고용으로 확인해 주세요.${warningSuffix}`,
    heicConvertedMessage: (sourceLabel) => `${sourceLabel} HEIC 이미지를 분석용 JPEG로 변환했습니다. 미리보기 확인 후 분석을 시작해 주세요.`,
    imageLoadedWithWarningMessage: (sourceLabel, prepWarning) => `${sourceLabel} 이미지를 불러왔습니다. ${prepWarning} 미리보기 확인 후 분석을 시작해 주세요.`,
    imageLoadedMessage: (sourceLabel) => `${sourceLabel} 이미지를 불러왔습니다. 미리보기 확인 후 분석을 시작해 주세요.`,
    heicUnreadableMessage: "HEIC/HEIF 이미지를 브라우저에서 해석하지 못했습니다. iPhone에서 JPG로 촬영하거나 변환 후 다시 선택해 주세요.",
    imageLoadFailedMessage: (errorMessage) => `이미지 로딩 실패: ${errorMessage}. 다른 사진으로 다시 시도해 주세요.`,
    unknownErrorLabel: "알 수 없는 오류",
    noFileSelectedRetryMessage: "사진을 선택하지 않았습니다. 다시 시도해 주세요.",
    imageEncodingFailedError: "이미지 인코딩에 실패했습니다.",
    duplicateInFlightMessage: "동일 이미지 분석이 이미 진행 중입니다. 잠시만 기다려 주세요.",
    duplicateRecentMessage: "같은 이미지 요청이 방금 처리되었습니다. 잠시 후 다시 시도하거나 사진을 변경해 주세요.",
    coinGateAuthRequiredMessage: "로그인이 필요합니다. 로그인 후 다시 손금 분석을 시도해 주세요.",
    coinGateInsufficientMessage: (serverCost) => `결제 가능 금액이 부족합니다. ${serverCost}결제가 필요합니다.`,
    coinGatePriceNotFoundMessage: "손금 분석 가격표를 찾을 수 없습니다. 잠시 후 다시 시도해 주세요.",
    coinGateGenericFailureMessage: "원화 결제에 실패했습니다.",
    checkingPassMessage: "이용권 확인 중",
    checkingImageQualityMessage: "손바닥 이미지 품질을 확인하고 있습니다...",
    analyzingPalmPhotoMessage: "손바닥 사진을 분석하고 있어요",
    readingGoldenLinesMessage: "손바닥의 금빛 선을 읽고 있습니다...",
    analysisErrorGenericMessage: "분석 중 오류가 발생했습니다.",
    palmNotFullyVisibleMessage: "손바닥 전체가 화면에 들어오지 않았습니다.",
    palmNotFullyVisibleRetryMessage: "손바닥 전체가 화면에 들어오지 않았습니다. 손목부터 손가락 끝까지 보이게 다시 촬영해 주세요.",
    resultConfirmedCheckingPaymentMessage: "분석 결과를 확인했습니다. 결제를 확인하고 있습니다...",
    requestCancelledStatusMessage: "요청이 취소되었습니다.",
    requestCancelledMessage: "요청이 취소되었습니다. 다시 분석을 시도해 주세요.",
    networkErrorStatusMessage: "네트워크/API 오류로 분석 요청에 실패했습니다.",
    networkErrorMessage: "네트워크/API 오류로 분석 요청에 실패했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.",
    analysisErrorWithReasonMessage: (errorMessage) => `분석 중 오류가 발생했습니다: ${errorMessage}`,
    photoReselectKeepMessage: "사진을 다시 선택해 손금 분석을 재시작할 수 있습니다.",
    retryOtherHandKeepMessage: "다른 손 기준으로 다시 보기 위해 주로 쓰는 손을 다시 선택해 주세요.",
    resetResultKeepMessage: "이전 분석 결과를 초기화했습니다. 같은 입력으로 다시 분석할 수 있습니다.",
    resultModeFullQualityMessage: "손바닥 인식이 완료되었습니다. 정밀 분석 결과가 생성되었습니다.",
    resultModePartialQualityMessage: "손바닥은 감지되었고 부분 분석 결과가 생성되었습니다. 더 선명한 사진을 올리면 정확도가 올라갑니다.",
    resultModeFallbackQualityMessage: "손바닥은 감지되었지만 선명도가 낮아 기본/보수 해석으로 결과를 생성했습니다.",
    previewLoadFailedMessage: (handName) => `${handName} 미리보기를 불러오지 못했습니다. JPG/PNG/WEBP 형식으로 다시 업로드해 주세요.`,

    selectButtonLabel: "선택",
    readSignalHeading: "읽힌 신호",
    interpretationHeading: "해석",
    strengthHeading: "살릴 힘",
    cautionHeading: "조율할 점",
    todayAdviceHeading: "오늘의 조언",
    sevenDayPracticeHeading: "7일 실천법",

    palmInputBadge: "손바닥 입력",
    palmInputDescription: "손바닥이 선명하게 보이는 사진을 업로드하거나 촬영해 주세요.",
    registeredBadge: "등록 완료",
    detectedBadge: "손 인식됨",
    estimatedBadge: "손 위치 추정",
    photoQualityBadge: (confidenceLabel) => `사진 품질 ${confidenceLabel}`,
    qualityOkMessage: "품질 체크가 양호합니다. 이 사진으로 분석을 진행할 수 있습니다.",
    retakePhotoAction: "다시 촬영",
    chooseAnotherPhotoAction: "다른 사진 선택",
    captureAgainAction: "다시 촬영",
    captureFirstAction: "촬영하기",
    choosePhotoFirstAction: "앨범에서 선택",
    deletePhotoAction: (handName) => `${handName} 사진 삭제`,
    previewCaption: (title) => `${title} 이미지 미리보기`,
    previewPlaceholder: "업로드 후 이 영역에 표시됩니다.",
    cameraAriaLabel: (handName, hasPreview) => `${handName} ${hasPreview ? "다시 촬영" : "카메라 촬영"}`,
    galleryAriaLabel: (handName, hasPreview) => `${handName} ${hasPreview ? "다른 사진 선택" : "앨범에서 사진 선택"}`,
    deletePhotoAriaLabel: (handName) => `${handName} 등록 사진 삭제`,
    galleryInputAriaLabel: (handName) => `${handName} 앨범 파일 선택 입력`,
    cameraInputAriaLabel: (handName) => `${handName} 카메라 촬영 입력`,

    pageTitle: "손금 지도",
    pageSubtitle: "先天의 結 · 後天의 流",
    pageTagline: "손바닥에 새겨진 사랑 · 재물 · 직업 · 마음의 흐름을 읽다",
    pageDescription: "손금은 수명이나 질병을 단정하는 도구가 아니라, 성향·관계·재물·직업 흐름을 상징적으로 읽는 지도입니다.",
    pageDescriptionSub: "타고난 손과 살아온 손을 함께 읽습니다. 손바닥에는 본래의 기질과 지금의 발자취가 함께 새겨집니다.",
    captureSectionHeading: "손바닥 촬영/업로드",
    captureSectionDescription: "손바닥이 화면 중앙에 오도록 촬영해 주세요. 밝은 곳에서 손 전체가 보이면 분석 정확도가 높아집니다.",
    oneHandNoteMain: "한 손만 등록해도 분석됩니다.",
    oneHandNoteSub: "양손을 모두 등록하면 선천·후천을 비교한 해석이 더해집니다.",
    leftHandInputLabel: "왼손 입력",
    rightHandInputLabel: "오른손 입력",
    captureNowAriaLabel: "손바닥 바로 촬영하기",
    captureNowLabel: "손바닥 바로 촬영하기",
    choosePhotoAriaLabel: "앨범에서 사진 선택하기",
    choosePhotoLabel: "앨범에서 사진 선택하기",
    currentTargetLabel: (handName) => `현재 선택 대상: ${handName}`,
    flowStepUpload: "1. 업로드",
    flowStepPreview: "2. 미리보기/품질 안내",
    flowStepAnalyzing: "3. 분석",
    flowStepResult: "4. 결과",
    previewOfHand: (handName) => `${handName} 미리보기`,
    selectedPreviewAlt: "선택된 손바닥 미리보기",
    checklistFullPalm: "손 전체가 보이나요?",
    checklistCreases: "손바닥 주름이 보이나요?",
    checklistGlare: "빛 반사가 심하지 않나요?",
    checklistShake: "사진이 너무 흔들리지 않았나요?",
    analyzeThisPhotoAction: "이 사진 그대로 분석하기",
    bothHandsUploadHeading: "양손 비교 업로드(선택)",
    leftHandUploadTitle: "왼손 이미지 업로드",
    rightHandUploadTitle: "오른손 이미지 업로드",
    innateAcquiredHeading: "선천 · 후천 설명",
    innateAcquiredExplain1: "손금에서는 자주 쓰는 손을 후천적 손, 자주 쓰지 않는 손을 선천적 손으로 읽습니다.",
    innateAcquiredExplain2: "후천적 손은 현재의 성향과 삶의 흐름을, 선천적 손은 타고난 기질과 잠재력을 보여줍니다.",
    innateAcquiredExplain3: "선천의 결, 후천의 흐름을 함께 읽어 현실적인 방향을 제안합니다.",
    dominantHandHeading: "주로 쓰는 손 선택",
    purposeFixedNote: "분석 목적은 전체 운세로 고정되어 있으며, 연애/재물/직업/성격/관계 카테고리를 한 번에 표시합니다.",
    shootingGuideHeading: "촬영 가이드",
    analyzingButtonLabel: "손금 분석 진행 중...",
    openPalmMapButtonLabel: "손바닥 운명 지도 열기",
    lowQualityDetectedMessage: (handNames) => `${handNames} 사진 품질이 낮게 측정됐습니다`,
    lowQualityAdviceMessage: "더 밝은 곳에서 손바닥 전체가 또렷하게 나오도록 다시 찍으면 해석이 훨씬 정확해집니다.",
    activeConditionMessage: "활성 조건: 왼손 또는 오른손 사진 1장 이상 + 주로 쓰는 손 선택",
    leftHandRoleLabel: (roleLabel) => `왼손 역할: ${roleLabel}`,
    rightHandRoleLabel: (roleLabel) => `오른손 역할: ${roleLabel}`,
    analyzingBanner: "손바닥의 금빛 선을 읽고 있습니다...",
    reselectPhotoAction: "사진 다시 선택",
    reanalyzeAction: "다시 분석",
    resultOverlayHeading: "손금 결과 오버레이",
    resultOverlaySubheading: "선천의 결, 후천의 흐름을 한 화면에서 비교합니다.",
    coordinateBasedBadge: "좌표 기반 + 일부 보정",
    symbolicGuideBadge: "상징적 안내 오버레이",
    viewOtherHandAction: "다른 손으로 다시 보기",
    backToMainAction: "메인으로 돌아가기",
    viewLeftHandAction: "왼손 보기",
    viewRightHandAction: "오른손 보기",
    fullscreenExitLabel: "기본 화면으로 보기",
    fullscreenEnterLabel: "전체화면으로 보기",
    fullscreenExitButton: "기본 화면",
    fullscreenEnterButton: "전체화면",
    readingHeadline: "한눈에 보는 손금 리딩",
    readSignalStat: "읽힌 흐름",
    signalCountUnit: (count) => `${count}개`,
    handShapeStat: "손 형태",
    centerPointStat: "중심 포인트",
    todayActionStat: "오늘 행동",
    specialPatternHeading: "특수 손금 감지",
    photoGuideHeading: "사진 가이드",
    photoGuideMessage: "손바닥 전체가 화면에 들어오고 그림자가 적으면 리딩이 훨씬 더 풍부해져요.",
    focusSummaryHeading: "해석 중심",
    innateAcquiredComparisonHeading: "선천 · 후천 비교 요약",
    innateAcquiredComparisonSub: "타고난 손과 살아온 손을 함께 읽습니다.",
    categoryReportHeading: "카테고리 리포트 전체",
    categoryReportSub: "사랑, 재물, 직업, 성격, 관계의 흐름을 한 번에 펼쳐 읽습니다.",
    detailFlowHeading: "세부 흐름",
    actionSuggestionHeading: "실천 제안",
    quickReportHeading: "🌙 한눈에 보는 손금 리딩",
    quickReportRowOneLiner: "🌙 한 줄 요약",
    quickReportRowOneLinerDefault: "이번 손금 흐름을 쉽고 재밌게 정리해 드렸어요.",
    quickReportRowOverall: "🌟 전체 운세",
    quickReportRowOverallDefault: "지금은 내 리듬을 찾을수록 운이 안정되는 시기예요.",
    quickReportRowLove: "💗 연애운",
    quickReportRowLoveDefault: "연애운은 솔직한 대화에서 더 좋아지는 흐름이에요.",
    quickReportRowWealth: "💰 재물운",
    quickReportRowWealthDefault: "재물운은 꾸준히 쌓을 때 더 잘 살아나요.",
    quickReportRowCareer: "🧭 직업운",
    quickReportRowCareerDefault: "직업운은 내 방식과 실력을 쌓을수록 강해져요.",
    quickReportRowPersonality: "✨ 성격/매력",
    quickReportRowPersonalityDefault: "묵직한 신뢰감이 당신의 매력 포인트예요.",
    quickReportRowHealth: "🌱 건강/에너지",
    quickReportRowHealthDefault: "무리보다 리듬 관리가 운을 살려줘요.",
    quickReportRowRelationship: "🤝 관계운",
    quickReportRowRelationshipDefault: "관계운은 편안한 소통에서 힘이 붙어요.",
    quickReportRowAdvice: "🔮 오늘의 조언",
    quickReportRowAdviceDefault: "오늘은 미뤄둔 작은 일 하나를 끝내 보세요.",
    expertConsultHeading: "손금 전문가 심층 해석",
    expertConsultSub: "판독 결과를 바탕으로 전문가가 항목별로 풀어 드립니다.",
    expertConsultIncludedBadge: "포함",
    expertConsultMissingMessage: "이번 판독에서는 심층 해석문을 생성하지 못했습니다. 아래 항목별 리포트는 정상적으로 제공됩니다.",
  },

  ja: {
    handRoleLabelInnate: "先天の手",
    handRoleLabelAcquired: "後天の手",
    handRoleLabelMixed: "先後天混合の手",
    handRoleLabelUnknown: "未確定",
    handRoleDescInnate: "生まれ持った気質と潜在力を示す手",
    handRoleDescAcquired: "現在の性向と歩んできた流れを示す手",
    handRoleDescMixed: "先天性と後天性がともに反映された手",
    handRoleDescUnknown: "利き手を選択すると判別されます。",

    dominantHandLabelRight: "右手",
    dominantHandLabelLeft: "左手",
    dominantHandLabelBoth: "両手",
    dominantHandHintRight: "右手中心の解釈",
    dominantHandHintLeft: "左手中心の解釈",
    dominantHandHintBoth: "両手バランス解釈",

    shootingGuides: [
      "手のひらを大きく開き、手首まで一緒に写してください。",
      "指を自然に開いて、指同士が重ならないようにしてください。",
      "窓際や明るい照明の下で、正面フラッシュはオフにして撮影してください。",
      "手のひらが画面の中央いっぱいに収まるよう近づいて撮影してください。",
      "手の甲ではなく、手相のある手のひらの面を撮影してください。",
      "手をカメラと平行に置き、傾かないようにしてください。",
      "細かいしわまで見えるようピントを確認して撮影してください。",
    ],
    loadingPhases: [
      "手のひらの輪郭を確認しています。",
      "生命線・感情線・頭脳線を探しています。",
      "手の形と全体の流れを分析しています。",
      "カテゴリー別の鑑定結果をまとめています。",
    ],

    cardLabelLifeLine: "🌱 エネルギー",
    cardLabelHeadLine: "🧠 思考",
    cardLabelHeartLine: "💗 恋愛",
    cardLabelFateLine: "🧭 進路",
    cardLabelSunLine: "✨ 魅力",
    cardLabelMoneyLine: "💰 金運",
    cardLabelMarriageLine: "🤝 対人関係",
    cardLabelMounts: "🌟 総合",

    purposeLabelGeneral: "全体運",
    purposeLabelLove: "恋愛運",
    purposeLabelWealth: "金運",
    purposeLabelCareer: "仕事運",
    purposeLabelPersonality: "性格分析",
    purposeLabelRelationship: "対人関係パターン",

    categoryTitleGeneral: "🌟 全体運",
    categoryTitleLove: "💗 恋愛運",
    categoryTitleWealth: "💰 金運",
    categoryTitleCareer: "🧭 仕事運",
    categoryTitlePersonality: "✨ 性格・魅力",
    categoryTitleRelationship: "🤝 対人運",

    qualityWarningResolution: "解像度が低く、細かい手相の認識が制限される可能性があります。",
    qualityWarningBrightness: "写真の明るさが暗すぎるか明るすぎます。",
    qualityWarningSharpness: "写真が手ブレしているか、ピントがぼやけている可能性があります。",
    qualityWarningPalmLikely: "手のひらの構図が傾いていて、手相の領域推定が難しいです。",
    qualityWarningFullPalmLikely: "手首から指先まで全体が見えるように撮影してください。",
    qualityWarningGlareLow: "光の反射が強く、一部の線が隠れる可能性があります。",
    qualityConfidenceSummaryHigh: "分析確信度：高い",
    qualityConfidenceSummaryMedium: "分析確信度：普通",
    qualityConfidenceSummaryLow: "分析確信度：低い（光やピントが弱く、一部の流れは参考程度に読み取ります）",
    qualityConfidenceBadgeHigh: "高い",
    qualityConfidenceBadgeMedium: "普通",
    qualityConfidenceBadgeLow: "低い",

    lineLengthLong: "長く続く流れ",
    lineLengthMedium: "バランスよく続く流れ",
    lineLengthShort: "短く集中する流れ",
    lineLengthDefault: "流れが弱い状態",
    lineDepthDeep: "はっきりとした線",
    lineDepthMedium: "バランスの取れた線",
    lineDepthFaint: "静かな線",
    lineDepthDefault: "薄く見える線",
    lineCurvatureWideStrong: "柔らかく包み込む流れ",
    lineCurvatureNormalSoft: "自然に続く流れ",
    lineCurvatureNarrowStraight: "まっすぐで抑制的な流れ",
    lineCurvatureDefault: "緩やかな流れ",
    headDirectionStraight: "現実的な判断が中心",
    headDirectionCurved: "感覚と想像力が中心",
    headDirectionDownward: "直感と没入が中心",
    headDirectionDefault: "バランス型の思考",
    headLifeRelationJoined: "慎重に始めるタイプ",
    headLifeRelationSeparated: "独立して判断するタイプ",
    headLifeRelationDefault: "状況を見ながら調整するタイプ",
    heartEndingUnderIndex: "理想と信頼を重視",
    heartEndingUnderMiddle: "現実的な安定感を重視",
    heartEndingBetween: "心と現実のバランス",
    heartEndingDefault: "関係の温度をゆっくり確認するタイプ",
    fateStrengthStrong: "目標軸がはっきりした流れ",
    fateStrengthMedium: "方向を整えている流れ",
    fateStrengthWeakNone: "決まった道より探索が強い流れ",
    fateStrengthDefault: "ゆっくりと方向を定める流れ",
    fateStartWrist: "初期から着実に積み上げる流れ",
    fateStartLifeLine: "生活基盤から道を開く流れ",
    fateStartMoonMount: "人や環境からチャンスが開ける流れ",
    fateStartMiddlePalm: "経験の後で方向がはっきりする流れ",
    fateStartDefault: "状況に合わせて道を見つける流れ",
    minorStrengthHigh: "鮮明に生きている流れ",
    minorStrengthMedium: "バランスよく見える流れ",
    minorStrengthLow: "静かに見える流れ",
    minorStrengthDefault: "ほのかに現れる流れ",
    lineChangesNone: "大きな乱れなく続く線",
    lineChangesBoth: (branchCount, breakCount) => `枝分かれ${branchCount}個・転換${breakCount}個`,
    lineChangesBranchOnly: (branchCount) => `枝分かれ${branchCount}個で広がる線`,
    lineChangesBreakOnly: (breakCount) => `転換が${breakCount}個見える線`,

    mountFocusVenus: "愛情",
    mountFocusMoon: "直感",
    mountFocusJupiter: "成長",
    mountFocusSaturn: "責任",
    mountFocusSun: "表現",
    mountFocusMercury: "コミュニケーション",
    mountFocusMars: "推進力",
    mountFocusNoReading: "手のひら全体の流れ",
    mountFocusBalanced: "バランス型",

    noReadingLabel: "写真の流れ",
    noReadingValue: "手のひら全体の流れを中心に読み取りました。",
    lifeLineLengthLabel: "長さ",
    lifeLineDepthLabel: "深さ",
    lifeLineCurvatureLabel: "曲線",
    lifeLineChangesLabel: "変化",
    lifeLineFallbackLabel: "状態",
    lifeLineFallbackValue: "今回の写真では生命線が薄く、エネルギーの流れを広く読み取りました。",
    headLineLengthLabel: "長さ",
    headLineDirectionLabel: "方向",
    headLineRelationLabel: "起点",
    headLineChangesLabel: "変化",
    headLineFallbackLabel: "状態",
    headLineFallbackValue: "頭脳線が薄く、手の形と周りの流れも合わせて読み取りました。",
    heartLineLengthLabel: "長さ",
    heartLineCurvatureLabel: "曲線",
    heartLineEndingLabel: "終点",
    heartLineChangesLabel: "変化",
    heartLineFallbackLabel: "状態",
    heartLineFallbackValue: "感情線が薄く、対人関係の温度は慎重に読み取りました。",
    fateLineStrengthLabel: "強さ",
    fateLineStartLabel: "起点",
    fateLineChangesLabel: "転換",
    fateLineFallbackLabel: "状態",
    fateLineFallbackValue: "運命線が薄く、決まった道より選択の柔軟性を中心に読み取りました。",
    sunLineStrengthLabel: "表現力",
    sunLineReadingLabel: "鑑定",
    sunLineReadingDefaultValue: "自分の名前をかけて示す仕事で流れを伸ばすタイプです。",
    moneyLineStrengthLabel: "金運の流れ",
    moneyLineReadingLabel: "鑑定",
    moneyLineReadingDefaultValue: "お金を大きく断定するより、管理と価値化の習慣を読み取りました。",
    marriageLineStrengthLabel: "対人関係の流れ",
    marriageLineReadingLabel: "鑑定",
    marriageLineReadingDefaultValue: "関係の回数ではなく、親密さと約束の守り方を読み取りました。",
    handShapeLabel: "手の形",
    handShapeDefaultValue: "複合型",
    centerPointLabel: "中心ポイント",
    overallLabel: "全体の質感",
    overallDefaultValue: "手のひら全体の流れを総合して読み取りました。",

    resultModeFull: "精密鑑定",
    resultModePartial: "コア鑑定",
    resultModeFallback: "基本鑑定",

    categoryGeneralDefaultSummary: "今の流れをわかりやすくまとめた手相鑑定です。",
    categoryGeneralDefaultAction1: "今日は先延ばしにしていたことを一つ終えて、流れを開いてみましょう。",
    categoryGeneralDefaultAction2: "解釈が長く感じたら、短くても確認の会話から始めてみましょう。",
    categoryLoveDefaultSummary: "恋愛運は安定感と率直な会話が鍵になりそうです。",
    categoryLoveDefaultAction: "関係は相手の反応より先に自分のトーンを整えてみましょう。",
    categoryWealthDefaultSummary: "金運はコツコツ積み上げるほど力がつく流れです。",
    categoryWealthDefaultAction: "支出の基準をまず整えると、方向がずっと早くはっきりします。",
    categoryCareerDefaultSummary: "仕事運は自分のやり方と実力を積み上げるほど強くなります。",
    categoryCareerDefaultAction: "予定を短く区切って実行のリズムを作ると成果につながります。",
    categoryPersonalityDefaultSummary: "性格と魅力を軽くまとめた鑑定です。",
    categoryPersonalityDefaultAction: "表現は誇張より一貫性を保つと反応が良くなります。",
    categoryRelationshipDefaultSummary: "対人運は心地よいコミュニケーションでより良くなります。",
    categoryRelationshipDefaultAction: "一番大切なのは、一つの約束を守るパターンです。",

    resultOneLinerDefault: "手のひら全体の流れを読み取り、今必要な方向をまとめました。",
    resultPrimaryActionDefault: "今日は小さな行動を一つ終えて、流れを開いてみましょう。",

    overlayAltLeft: "左手のひらオーバーレイ",
    overlayAltRight: "右手のひらオーバーレイ",
    overlayAltGeneric: "手のひらオーバーレイ",

    handNameLeft: "左手",
    handNameRight: "右手",
    uploadSourceCamera: "カメラ撮影",
    uploadSourceGallery: "アルバム選択",

    noFileSelectedMessage: "写真が選択されていません。手のひらの画像をもう一度選択してください。",
    unsupportedFileTypeMessage: "対応していないファイル形式です。JPG、PNG、WEBP、HEIC/HEIF画像を選択してください。",
    fileTooLargeMessage: "ファイルサイズが大きすぎます。25MB以下の画像を選択してください。",
    heicPreviewLimitedMessage: "このデバイスではHEIC/HEIFプレビューの最適化が制限されます。元のファイルで分析を進めます。",
    prepFallbackMessage: (errorMessage) => `ブラウザでの前処理をスキップし、元の画像のまま分析します。（${errorMessage}）`,
    qualityCheckLimitedMessage: "このブラウザでは品質の事前チェックが制限されるため、サーバー分析結果を基準にご案内します。",
    handNoHandDetectedMessage: (handName) => `${handName}の写真から手を見つけられませんでした。手のひらを開き、手首から指先まで画面に収めて再度撮影してください。`,
    lowQualityContinueMessage: (warningSuffix) => `分析は可能ですが、写真が少し暗いかぼやけている可能性があります。結果は参考としてご確認ください。${warningSuffix}`,
    heicConvertedMessage: (sourceLabel) => `${sourceLabel}のHEIC画像を分析用JPEGに変換しました。プレビューを確認後、分析を開始してください。`,
    imageLoadedWithWarningMessage: (sourceLabel, prepWarning) => `${sourceLabel}の画像を読み込みました。${prepWarning} プレビュー確認後、分析を開始してください。`,
    imageLoadedMessage: (sourceLabel) => `${sourceLabel}の画像を読み込みました。プレビュー確認後、分析を開始してください。`,
    heicUnreadableMessage: "HEIC/HEIF画像をこのブラウザで解析できませんでした。iPhoneでJPGで撮影するか、変換してから再度選択してください。",
    imageLoadFailedMessage: (errorMessage) => `画像の読み込みに失敗しました：${errorMessage}。別の写真で再度お試しください。`,
    unknownErrorLabel: "不明なエラー",
    noFileSelectedRetryMessage: "写真が選択されていません。もう一度お試しください。",
    imageEncodingFailedError: "画像のエンコードに失敗しました。",
    duplicateInFlightMessage: "同じ画像の分析がすでに進行中です。少々お待ちください。",
    duplicateRecentMessage: "同じ画像のリクエストがたった今処理されました。しばらくしてから再度お試しいただくか、写真を変更してください。",
    coinGateAuthRequiredMessage: "ログインが必要です。ログイン後、もう一度手相分析をお試しください。",
    coinGateInsufficientMessage: (serverCost) => `決済可能な金額が不足しています。${serverCost}分の決済が必要です。`,
    coinGatePriceNotFoundMessage: "手相分析の価格表が見つかりませんでした。しばらくしてから再度お試しください。",
    coinGateGenericFailureMessage: "決済に失敗しました。",
    checkingPassMessage: "利用権を確認中",
    checkingImageQualityMessage: "手のひら画像の品質を確認しています…",
    analyzingPalmPhotoMessage: "手のひらの写真を分析しています",
    readingGoldenLinesMessage: "手のひらの金色の線を読み取っています…",
    analysisErrorGenericMessage: "分析中にエラーが発生しました。",
    palmNotFullyVisibleMessage: "手のひら全体が画面に入っていません。",
    palmNotFullyVisibleRetryMessage: "手のひら全体が画面に入っていません。手首から指先まで見えるように再度撮影してください。",
    resultConfirmedCheckingPaymentMessage: "分析結果を確認しました。決済を確認しています…",
    requestCancelledStatusMessage: "リクエストがキャンセルされました。",
    requestCancelledMessage: "リクエストがキャンセルされました。もう一度分析をお試しください。",
    networkErrorStatusMessage: "ネットワーク/APIエラーで分析リクエストに失敗しました。",
    networkErrorMessage: "ネットワーク/APIエラーで分析リクエストに失敗しました。接続状態を確認してから再度お試しください。",
    analysisErrorWithReasonMessage: (errorMessage) => `分析中にエラーが発生しました：${errorMessage}`,
    photoReselectKeepMessage: "写真を選び直して手相分析を再開できます。",
    retryOtherHandKeepMessage: "別の手を基準に見るために、利き手をもう一度選択してください。",
    resetResultKeepMessage: "以前の分析結果をリセットしました。同じ入力で再度分析できます。",
    resultModeFullQualityMessage: "手のひらの認識が完了しました。精密な分析結果が生成されました。",
    resultModePartialQualityMessage: "手のひらは検出され、部分的な分析結果が生成されました。より鮮明な写真をアップロードすると精度が上がります。",
    resultModeFallbackQualityMessage: "手のひらは検出されましたが、鮮明さが低いため、基本／控えめな解釈で結果を生成しました。",
    previewLoadFailedMessage: (handName) => `${handName}のプレビューを読み込めませんでした。JPG/PNG/WEBP形式で再度アップロードしてください。`,

    selectButtonLabel: "選択",
    readSignalHeading: "読み取ったサイン",
    interpretationHeading: "解釈",
    strengthHeading: "活かせる力",
    cautionHeading: "調整すべき点",
    todayAdviceHeading: "今日のアドバイス",
    sevenDayPracticeHeading: "7日間の実践法",

    palmInputBadge: "手のひら入力",
    palmInputDescription: "手のひらがはっきり見える写真をアップロードするか撮影してください。",
    registeredBadge: "登録完了",
    detectedBadge: "手を認識",
    estimatedBadge: "手の位置を推定",
    photoQualityBadge: (confidenceLabel) => `写真品質：${confidenceLabel}`,
    qualityOkMessage: "品質チェックは良好です。この写真で分析を進められます。",
    retakePhotoAction: "再撮影",
    chooseAnotherPhotoAction: "別の写真を選択",
    captureAgainAction: "再撮影",
    captureFirstAction: "撮影する",
    choosePhotoFirstAction: "アルバムから選択",
    deletePhotoAction: (handName) => `${handName}の写真を削除`,
    previewCaption: (title) => `${title}のプレビュー`,
    previewPlaceholder: "アップロード後にこの領域に表示されます。",
    cameraAriaLabel: (handName, hasPreview) => `${handName}${hasPreview ? "再撮影" : "カメラ撮影"}`,
    galleryAriaLabel: (handName, hasPreview) => `${handName}${hasPreview ? "別の写真を選択" : "アルバムから写真を選択"}`,
    deletePhotoAriaLabel: (handName) => `${handName}の登録写真を削除`,
    galleryInputAriaLabel: (handName) => `${handName}のアルバムファイル選択入力`,
    cameraInputAriaLabel: (handName) => `${handName}のカメラ撮影入力`,

    pageTitle: "手相マップ",
    pageSubtitle: "先天の結・後天の流",
    pageTagline: "手のひらに刻まれた愛・お金・仕事・心の流れを読む",
    pageDescription: "手相は寿命や病気を断定する道具ではなく、性向・対人関係・金運・仕事運の流れを象徴的に読み解く地図です。",
    pageDescriptionSub: "生まれ持った手と歩んできた手をともに読み取ります。手のひらには本来の気質と今の歩みがともに刻まれています。",
    captureSectionHeading: "手のひらの撮影/アップロード",
    captureSectionDescription: "手のひらが画面の中央に来るように撮影してください。明るい場所で手全体が見えると分析精度が上がります。",
    oneHandNoteMain: "片手だけ登録しても分析されます。",
    oneHandNoteSub: "両手を登録すると、先天・後天を比較した解釈が加わります。",
    leftHandInputLabel: "左手入力",
    rightHandInputLabel: "右手入力",
    captureNowAriaLabel: "手のひらをすぐ撮影する",
    captureNowLabel: "手のひらをすぐ撮影する",
    choosePhotoAriaLabel: "アルバムから写真を選択する",
    choosePhotoLabel: "アルバムから写真を選択する",
    currentTargetLabel: (handName) => `現在の選択対象：${handName}`,
    flowStepUpload: "1. アップロード",
    flowStepPreview: "2. プレビュー/品質案内",
    flowStepAnalyzing: "3. 分析",
    flowStepResult: "4. 結果",
    previewOfHand: (handName) => `${handName}のプレビュー`,
    selectedPreviewAlt: "選択した手のひらのプレビュー",
    checklistFullPalm: "手全体が見えていますか？",
    checklistCreases: "手のひらのしわが見えていますか？",
    checklistGlare: "光の反射が強すぎませんか？",
    checklistShake: "写真がブレすぎていませんか？",
    analyzeThisPhotoAction: "この写真のまま分析する",
    bothHandsUploadHeading: "両手比較アップロード（任意）",
    leftHandUploadTitle: "左手画像アップロード",
    rightHandUploadTitle: "右手画像アップロード",
    innateAcquiredHeading: "先天・後天の説明",
    innateAcquiredExplain1: "手相では、よく使う手を後天の手、あまり使わない手を先天の手として読み取ります。",
    innateAcquiredExplain2: "後天の手は現在の性向と人生の流れを、先天の手は生まれ持った気質と潜在力を示します。",
    innateAcquiredExplain3: "先天の結と後天の流れをともに読み取り、現実的な方向をご提案します。",
    dominantHandHeading: "利き手を選択",
    purposeFixedNote: "分析目的は全体運に固定されており、恋愛/金運/仕事/性格/対人関係のカテゴリーを一度に表示します。",
    shootingGuideHeading: "撮影ガイド",
    analyzingButtonLabel: "手相分析を進行中...",
    openPalmMapButtonLabel: "手のひら運命マップを開く",
    lowQualityDetectedMessage: (handNames) => `${handNames}の写真品質が低いと測定されました`,
    lowQualityAdviceMessage: "より明るい場所で手のひら全体がはっきり写るように撮り直すと、解釈がずっと正確になります。",
    activeConditionMessage: "有効条件：左手または右手の写真1枚以上＋利き手の選択",
    leftHandRoleLabel: (roleLabel) => `左手の役割：${roleLabel}`,
    rightHandRoleLabel: (roleLabel) => `右手の役割：${roleLabel}`,
    analyzingBanner: "手のひらの金色の線を読み取っています…",
    reselectPhotoAction: "写真を選び直す",
    reanalyzeAction: "再分析",
    resultOverlayHeading: "手相結果オーバーレイ",
    resultOverlaySubheading: "先天の結、後天の流れを一画面で比較します。",
    coordinateBasedBadge: "座標ベース＋一部補正",
    symbolicGuideBadge: "象徴的ガイドオーバーレイ",
    viewOtherHandAction: "別の手でもう一度見る",
    backToMainAction: "メインに戻る",
    viewLeftHandAction: "左手を見る",
    viewRightHandAction: "右手を見る",
    fullscreenExitLabel: "標準画面で見る",
    fullscreenEnterLabel: "全画面で見る",
    fullscreenExitButton: "標準画面",
    fullscreenEnterButton: "全画面",
    readingHeadline: "手相鑑定を一目で見る",
    readSignalStat: "読み取ったサイン",
    signalCountUnit: (count) => `${count}個`,
    handShapeStat: "手の形",
    centerPointStat: "中心ポイント",
    todayActionStat: "今日の行動",
    specialPatternHeading: "特殊な手相を検出",
    photoGuideHeading: "写真ガイド",
    photoGuideMessage: "手のひら全体が画面に収まり、影が少ないと鑑定がずっと豊かになります。",
    focusSummaryHeading: "解釈の中心",
    innateAcquiredComparisonHeading: "先天・後天比較まとめ",
    innateAcquiredComparisonSub: "生まれ持った手と歩んできた手をともに読み取ります。",
    categoryReportHeading: "カテゴリー別レポート全体",
    categoryReportSub: "愛情、金運、仕事、性格、対人関係の流れを一度に広げて読み取ります。",
    detailFlowHeading: "詳細な流れ",
    actionSuggestionHeading: "実践提案",
    quickReportHeading: "🌙 手相鑑定を一目で見る",
    quickReportRowOneLiner: "🌙 一言まとめ",
    quickReportRowOneLinerDefault: "今回の手相の流れを分かりやすく楽しくまとめました。",
    quickReportRowOverall: "🌟 全体運",
    quickReportRowOverallDefault: "今は自分のリズムを見つけるほど運気が安定する時期です。",
    quickReportRowLove: "💗 恋愛運",
    quickReportRowLoveDefault: "恋愛運は率直な会話でより良くなる流れです。",
    quickReportRowWealth: "💰 金運",
    quickReportRowWealthDefault: "金運はコツコツ積み上げるほどうまく育ちます。",
    quickReportRowCareer: "🧭 仕事運",
    quickReportRowCareerDefault: "仕事運は自分のやり方と実力を積み上げるほど強くなります。",
    quickReportRowPersonality: "✨ 性格・魅力",
    quickReportRowPersonalityDefault: "どっしりとした信頼感があなたの魅力ポイントです。",
    quickReportRowHealth: "🌱 健康/エネルギー",
    quickReportRowHealthDefault: "無理をするよりリズムを整えることが運気を活かします。",
    quickReportRowRelationship: "🤝 対人運",
    quickReportRowRelationshipDefault: "対人運は心地よいコミュニケーションで力がつきます。",
    quickReportRowAdvice: "🔮 今日のアドバイス",
    quickReportRowAdviceDefault: "今日は先延ばしにしていた小さなことを一つ終わらせてみましょう。",
    expertConsultHeading: "手相専門家による深層解釈",
    expertConsultSub: "鑑定結果をもとに専門家が項目別に解説します。",
    expertConsultIncludedBadge: "含む",
    expertConsultMissingMessage: "今回の鑑定では深層解釈文を生成できませんでした。以下の項目別レポートは正常に提供されます。",
  },

  "zh-CN": {
    handRoleLabelInnate: "先天之手",
    handRoleLabelAcquired: "后天之手",
    handRoleLabelMixed: "先后天混合之手",
    handRoleLabelUnknown: "未确定",
    handRoleDescInnate: "展示与生俱来的气质与潜力的手",
    handRoleDescAcquired: "展示当前性情与人生轨迹的手",
    handRoleDescMixed: "先天与后天特质共同体现的手",
    handRoleDescUnknown: "选择惯用手后即可判定。",

    dominantHandLabelRight: "右手",
    dominantHandLabelLeft: "左手",
    dominantHandLabelBoth: "双手",
    dominantHandHintRight: "以右手为中心解读",
    dominantHandHintLeft: "以左手为中心解读",
    dominantHandHintBoth: "双手平衡解读",

    shootingGuides: [
      "请充分展开手掌，并将手腕一并入镜。",
      "手指自然张开，避免相互重叠。",
      "请在窗边或明亮光线下拍摄,关闭正面闪光灯。",
      "请靠近拍摄,让手掌充满画面中央。",
      "请拍摄有掌纹的手心一面,而非手背。",
      "请让手与相机保持平行,避免倾斜。",
      "请确认对焦清晰,能看清细小纹路后再拍摄。",
    ],
    loadingPhases: [
      "正在确认手掌轮廓。",
      "正在寻找生命线·感情线·智慧线。",
      "正在分析手型与整体走势。",
      "正在整理各分类的解读结果。",
    ],

    cardLabelLifeLine: "🌱 能量",
    cardLabelHeadLine: "🧠 思维",
    cardLabelHeartLine: "💗 恋爱",
    cardLabelFateLine: "🧭 前程",
    cardLabelSunLine: "✨ 魅力",
    cardLabelMoneyLine: "💰 财运",
    cardLabelMarriageLine: "🤝 人际",
    cardLabelMounts: "🌟 综合",

    purposeLabelGeneral: "整体运势",
    purposeLabelLove: "恋爱运",
    purposeLabelWealth: "财运",
    purposeLabelCareer: "事业运",
    purposeLabelPersonality: "性格分析",
    purposeLabelRelationship: "人际关系模式",

    categoryTitleGeneral: "🌟 整体运势",
    categoryTitleLove: "💗 恋爱运",
    categoryTitleWealth: "💰 财运",
    categoryTitleCareer: "🧭 事业运",
    categoryTitlePersonality: "✨ 性格/魅力",
    categoryTitleRelationship: "🤝 人际运",

    qualityWarningResolution: "分辨率较低,可能会限制细部掌纹的识别。",
    qualityWarningBrightness: "照片亮度过暗或过亮。",
    qualityWarningSharpness: "照片可能有抖动或对焦模糊。",
    qualityWarningPalmLikely: "手掌构图倾斜,较难估算掌纹区域。",
    qualityWarningFullPalmLikely: "请拍摄到手腕至指尖的完整手部。",
    qualityWarningGlareLow: "反光较强,部分纹路可能被遮挡。",
    qualityConfidenceSummaryHigh: "分析可信度：高",
    qualityConfidenceSummaryMedium: "分析可信度：中",
    qualityConfidenceSummaryLow: "分析可信度：低（照片光线或对焦较弱,部分走势仅作参考）",
    qualityConfidenceBadgeHigh: "高",
    qualityConfidenceBadgeMedium: "中",
    qualityConfidenceBadgeLow: "低",

    lineLengthLong: "延伸较长的走势",
    lineLengthMedium: "均衡延伸的走势",
    lineLengthShort: "短而集中的走势",
    lineLengthDefault: "走势较弱的状态",
    lineDepthDeep: "清晰的纹路",
    lineDepthMedium: "均衡的纹路",
    lineDepthFaint: "柔和的纹路",
    lineDepthDefault: "较浅的纹路",
    lineCurvatureWideStrong: "柔和包裹的走势",
    lineCurvatureNormalSoft: "自然延伸的走势",
    lineCurvatureNarrowStraight: "笔直克制的走势",
    lineCurvatureDefault: "平缓的走势",
    headDirectionStraight: "以现实判断为主",
    headDirectionCurved: "以感性与想象力为主",
    headDirectionDownward: "以直觉与专注为主",
    headDirectionDefault: "均衡型思维",
    headLifeRelationJoined: "倾向谨慎起步",
    headLifeRelationSeparated: "倾向独立判断",
    headLifeRelationDefault: "视情况灵活调整",
    heartEndingUnderIndex: "重视理想与信任",
    heartEndingUnderMiddle: "重视现实的安定感",
    heartEndingBetween: "内心与现实的平衡",
    heartEndingDefault: "慢慢确认关系的温度",
    fateStrengthStrong: "目标轴清晰的走势",
    fateStrengthMedium: "正在调整方向的走势",
    fateStrengthWeakNone: "探索强于既定路径的走势",
    fateStrengthDefault: "慢慢确立方向的走势",
    fateStartWrist: "从起点开始稳步积累的走势",
    fateStartLifeLine: "从生活根基开辟道路的走势",
    fateStartMoonMount: "机会从人际与环境中打开的走势",
    fateStartMiddlePalm: "经历之后方向逐渐清晰的走势",
    fateStartDefault: "顺应情况寻找道路的走势",
    minorStrengthHigh: "鲜活明显的走势",
    minorStrengthMedium: "较为均衡的走势",
    minorStrengthLow: "较为柔和的走势",
    minorStrengthDefault: "隐约显现的走势",
    lineChangesNone: "没有明显起伏、持续延伸的纹路",
    lineChangesBoth: (branchCount, breakCount) => `分支${branchCount}条 · 转折${breakCount}处`,
    lineChangesBranchOnly: (branchCount) => `以${branchCount}条分支延展的纹路`,
    lineChangesBreakOnly: (breakCount) => `可见${breakCount}处转折的纹路`,

    mountFocusVenus: "情感",
    mountFocusMoon: "直觉",
    mountFocusJupiter: "成长",
    mountFocusSaturn: "责任",
    mountFocusSun: "表现",
    mountFocusMercury: "沟通",
    mountFocusMars: "推动力",
    mountFocusNoReading: "手掌整体走势",
    mountFocusBalanced: "均衡型",

    noReadingLabel: "照片走势",
    noReadingValue: "以手掌整体走势为中心进行了解读。",
    lifeLineLengthLabel: "长度",
    lifeLineDepthLabel: "深浅",
    lifeLineCurvatureLabel: "曲线",
    lifeLineChangesLabel: "变化",
    lifeLineFallbackLabel: "状态",
    lifeLineFallbackValue: "本次照片中生命线较浅,因此较宽泛地解读了能量走势。",
    headLineLengthLabel: "长度",
    headLineDirectionLabel: "方向",
    headLineRelationLabel: "起点",
    headLineChangesLabel: "变化",
    headLineFallbackLabel: "状态",
    headLineFallbackValue: "智慧线较浅,因此结合手型与周边走势一并解读。",
    heartLineLengthLabel: "长度",
    heartLineCurvatureLabel: "曲线",
    heartLineEndingLabel: "终点",
    heartLineChangesLabel: "变化",
    heartLineFallbackLabel: "状态",
    heartLineFallbackValue: "感情线较浅,人际关系的温度做了较为谨慎的解读。",
    fateLineStrengthLabel: "力度",
    fateLineStartLabel: "起点",
    fateLineChangesLabel: "转折",
    fateLineFallbackLabel: "状态",
    fateLineFallbackValue: "命运线较浅,相比既定道路更侧重解读选择的灵活性。",
    sunLineStrengthLabel: "表现力",
    sunLineReadingLabel: "解读",
    sunLineReadingDefaultValue: "是那种以自己名义展现的工作中积累走势的人。",
    moneyLineStrengthLabel: "财运走势",
    moneyLineReadingLabel: "解读",
    moneyLineReadingDefaultValue: "相比对金钱做出笼统判断,更多解读了管理与增值的习惯。",
    marriageLineStrengthLabel: "人际走势",
    marriageLineReadingLabel: "解读",
    marriageLineReadingDefaultValue: "解读的重点不是关系的数量,而是亲密感与守约的方式。",
    handShapeLabel: "手型",
    handShapeDefaultValue: "复合型",
    centerPointLabel: "核心焦点",
    overallLabel: "整体纹理",
    overallDefaultValue: "综合解读了手掌整体走势。",

    resultModeFull: "精密解读",
    resultModePartial: "核心解读",
    resultModeFallback: "基础解读",

    categoryGeneralDefaultSummary: "这是把当下走势简单整理而成的掌纹解读。",
    categoryGeneralDefaultAction1: "今天不妨完成一件拖延已久的事,打开新的走势。",
    categoryGeneralDefaultAction2: "如果解读内容较长,不妨先从简短的沟通开始。",
    categoryLoveDefaultSummary: "恋爱运的关键似乎在于安定感与坦诚的沟通。",
    categoryLoveDefaultAction: "在关系中,先调整好自己的语气,而非只关注对方的反应。",
    categoryWealthDefaultSummary: "财运是持续积累就会逐渐增强的走势。",
    categoryWealthDefaultAction: "先理清消费基准,方向会更快清晰起来。",
    categoryCareerDefaultSummary: "事业运会随着你积累自己的方式与实力而增强。",
    categoryCareerDefaultAction: "把日程拆分成短单位、建立执行节奏,就更容易出成果。",
    categoryPersonalityDefaultSummary: "这是对性格与魅力的轻松整理。",
    categoryPersonalityDefaultAction: "表达时,一致性比夸张更能带来好反应。",
    categoryRelationshipDefaultSummary: "人际运会在轻松自在的沟通中变得更好。",
    categoryRelationshipDefaultAction: "最重要的是守住一个承诺的习惯。",

    resultOneLinerDefault: "我们解读了你手掌的整体走势,整理出了当下需要的方向。",
    resultPrimaryActionDefault: "今天完成一件小事,打开你的走势吧。",

    overlayAltLeft: "左手掌叠加图",
    overlayAltRight: "右手掌叠加图",
    overlayAltGeneric: "手掌叠加图",

    handNameLeft: "左手",
    handNameRight: "右手",
    uploadSourceCamera: "相机拍摄",
    uploadSourceGallery: "相册选择",

    noFileSelectedMessage: "尚未选择照片。请重新选择手掌图片。",
    unsupportedFileTypeMessage: "不支持该文件格式。请选择JPG、PNG、WEBP或HEIC/HEIF格式的图片。",
    fileTooLargeMessage: "文件过大。请选择25MB以下的图片。",
    heicPreviewLimitedMessage: "此设备上HEIC/HEIF预览优化受限,将以原始文件继续分析。",
    prepFallbackMessage: (errorMessage) => `跳过浏览器预处理,以原始图片进行分析。（${errorMessage}）`,
    qualityCheckLimitedMessage: "此浏览器的质量预检受限,将以服务器分析结果为准进行提示。",
    handNoHandDetectedMessage: (handName) => `未能在${handName}照片中识别出手部。请张开手掌,将手腕至指尖完整入镜后重新拍摄。`,
    lowQualityContinueMessage: (warningSuffix) => `可以继续分析,但照片可能略暗或模糊。请将结果作为参考。${warningSuffix}`,
    heicConvertedMessage: (sourceLabel) => `已将${sourceLabel}的HEIC图片转换为可分析的JPEG格式。请确认预览后开始分析。`,
    imageLoadedWithWarningMessage: (sourceLabel, prepWarning) => `已加载${sourceLabel}的图片。${prepWarning} 请确认预览后开始分析。`,
    imageLoadedMessage: (sourceLabel) => `已加载${sourceLabel}的图片。请确认预览后开始分析。`,
    heicUnreadableMessage: "此浏览器无法解析HEIC/HEIF图片。请在iPhone上以JPG格式拍摄,或转换格式后重新选择。",
    imageLoadFailedMessage: (errorMessage) => `图片加载失败：${errorMessage}。请尝试其他照片。`,
    unknownErrorLabel: "未知错误",
    noFileSelectedRetryMessage: "尚未选择照片。请重试。",
    imageEncodingFailedError: "图片编码失败。",
    duplicateInFlightMessage: "同一张图片正在分析中。请稍候。",
    duplicateRecentMessage: "同一张图片的请求刚刚处理完毕。请稍后重试或更换照片。",
    coinGateAuthRequiredMessage: "需要登录。请登录后重新尝试手相分析。",
    coinGateInsufficientMessage: (serverCost) => `可用余额不足,需要支付${serverCost}。`,
    coinGatePriceNotFoundMessage: "未找到手相分析的价格信息。请稍后重试。",
    coinGateGenericFailureMessage: "支付失败。",
    checkingPassMessage: "正在确认权益",
    checkingImageQualityMessage: "正在确认手掌图片质量...",
    analyzingPalmPhotoMessage: "正在分析手掌照片",
    readingGoldenLinesMessage: "正在解读手掌的金色纹路...",
    analysisErrorGenericMessage: "分析过程中发生了错误。",
    palmNotFullyVisibleMessage: "手掌整体未能完整入镜。",
    palmNotFullyVisibleRetryMessage: "手掌整体未能完整入镜。请重新拍摄,确保从手腕到指尖都清晰可见。",
    resultConfirmedCheckingPaymentMessage: "已确认分析结果。正在确认支付...",
    requestCancelledStatusMessage: "请求已取消。",
    requestCancelledMessage: "请求已取消。请重新尝试分析。",
    networkErrorStatusMessage: "由于网络/API错误,分析请求失败。",
    networkErrorMessage: "由于网络/API错误,分析请求失败。请检查网络连接后重试。",
    analysisErrorWithReasonMessage: (errorMessage) => `分析过程中发生了错误：${errorMessage}`,
    photoReselectKeepMessage: "您可以重新选择照片,重新开始手相分析。",
    retryOtherHandKeepMessage: "如需以另一只手为准查看,请重新选择惯用手。",
    resetResultKeepMessage: "之前的分析结果已重置。您可以用相同的输入重新分析。",
    resultModeFullQualityMessage: "手掌识别已完成,已生成精密分析结果。",
    resultModePartialQualityMessage: "已检测到手掌并生成了部分分析结果。上传更清晰的照片可提升准确度。",
    resultModeFallbackQualityMessage: "已检测到手掌,但清晰度较低,因此以基础/保守解读方式生成了结果。",
    previewLoadFailedMessage: (handName) => `未能加载${handName}的预览。请以JPG/PNG/WEBP格式重新上传。`,

    selectButtonLabel: "选择",
    readSignalHeading: "已解读信号",
    interpretationHeading: "解读",
    strengthHeading: "可发挥的优势",
    cautionHeading: "需调整之处",
    todayAdviceHeading: "今日建议",
    sevenDayPracticeHeading: "7天实践法",

    palmInputBadge: "手掌输入",
    palmInputDescription: "请上传或拍摄手掌清晰可见的照片。",
    registeredBadge: "已登记",
    detectedBadge: "已识别手部",
    estimatedBadge: "手部位置估算",
    photoQualityBadge: (confidenceLabel) => `照片质量 ${confidenceLabel}`,
    qualityOkMessage: "质量检测良好,可以用此照片进行分析。",
    retakePhotoAction: "重新拍摄",
    chooseAnotherPhotoAction: "选择其他照片",
    captureAgainAction: "重新拍摄",
    captureFirstAction: "拍摄",
    choosePhotoFirstAction: "从相册选择",
    deletePhotoAction: (handName) => `删除${handName}照片`,
    previewCaption: (title) => `${title}图片预览`,
    previewPlaceholder: "上传后将显示在此区域。",
    cameraAriaLabel: (handName, hasPreview) => `${handName}${hasPreview ? "重新拍摄" : "相机拍摄"}`,
    galleryAriaLabel: (handName, hasPreview) => `${handName}${hasPreview ? "选择其他照片" : "从相册选择照片"}`,
    deletePhotoAriaLabel: (handName) => `删除${handName}已登记的照片`,
    galleryInputAriaLabel: (handName) => `${handName}相册文件选择输入`,
    cameraInputAriaLabel: (handName) => `${handName}相机拍摄输入`,

    pageTitle: "掌纹地图",
    pageSubtitle: "先天之结 · 后天之流",
    pageTagline: "解读镌刻在手掌中的爱情、财富、事业与内心走势",
    pageDescription: "手相并非用来断定寿命或疾病的工具,而是象征性地解读性情、人际、财富、事业走势的地图。",
    pageDescriptionSub: "我们会同时解读与生俱来的手与后天历练的手。手掌中同时刻着你本来的气质与如今走过的足迹。",
    captureSectionHeading: "拍摄/上传手掌照片",
    captureSectionDescription: "请让手掌位于画面中央拍摄。在明亮处拍到完整的手会提高分析准确度。",
    oneHandNoteMain: "仅登记一只手也可以进行分析。",
    oneHandNoteSub: "登记双手可加入先天·后天的对比解读。",
    leftHandInputLabel: "左手输入",
    rightHandInputLabel: "右手输入",
    captureNowAriaLabel: "立即拍摄手掌",
    captureNowLabel: "立即拍摄手掌",
    choosePhotoAriaLabel: "从相册选择照片",
    choosePhotoLabel: "从相册选择照片",
    currentTargetLabel: (handName) => `当前选择对象：${handName}`,
    flowStepUpload: "1. 上传",
    flowStepPreview: "2. 预览/质量提示",
    flowStepAnalyzing: "3. 分析",
    flowStepResult: "4. 结果",
    previewOfHand: (handName) => `${handName}预览`,
    selectedPreviewAlt: "已选手掌预览",
    checklistFullPalm: "手是否完整可见？",
    checklistCreases: "手掌纹路是否清晰？",
    checklistGlare: "反光是否严重？",
    checklistShake: "照片是否过于抖动？",
    analyzeThisPhotoAction: "就用这张照片分析",
    bothHandsUploadHeading: "双手对比上传（可选）",
    leftHandUploadTitle: "左手图片上传",
    rightHandUploadTitle: "右手图片上传",
    innateAcquiredHeading: "先天·后天说明",
    innateAcquiredExplain1: "手相中,将常用手解读为后天之手,不常用手解读为先天之手。",
    innateAcquiredExplain2: "后天之手体现当下的性情与人生走势,先天之手体现与生俱来的气质与潜力。",
    innateAcquiredExplain3: "同时解读先天之结与后天之流,提出切合现实的方向建议。",
    dominantHandHeading: "选择惯用手",
    purposeFixedNote: "分析目的固定为整体运势,将一次性展示恋爱/财运/事业/性格/人际各分类。",
    shootingGuideHeading: "拍摄指南",
    analyzingButtonLabel: "手相分析进行中...",
    openPalmMapButtonLabel: "开启手掌命运地图",
    lowQualityDetectedMessage: (handNames) => `${handNames}照片的质量被检测为较低`,
    lowQualityAdviceMessage: "在更明亮处重新拍摄、使手掌整体清晰呈现,解读会更加准确。",
    activeConditionMessage: "启用条件：至少1张左手或右手照片＋已选择惯用手",
    leftHandRoleLabel: (roleLabel) => `左手角色：${roleLabel}`,
    rightHandRoleLabel: (roleLabel) => `右手角色：${roleLabel}`,
    analyzingBanner: "正在解读手掌的金色纹路...",
    reselectPhotoAction: "重新选择照片",
    reanalyzeAction: "重新分析",
    resultOverlayHeading: "掌纹结果叠加图",
    resultOverlaySubheading: "在同一画面中对比先天之结与后天之流。",
    coordinateBasedBadge: "坐标基础 + 部分校正",
    symbolicGuideBadge: "象征性引导叠加图",
    viewOtherHandAction: "换另一只手再看",
    backToMainAction: "返回主页",
    viewLeftHandAction: "查看左手",
    viewRightHandAction: "查看右手",
    fullscreenExitLabel: "切换为标准画面",
    fullscreenEnterLabel: "切换为全屏",
    fullscreenExitButton: "标准画面",
    fullscreenEnterButton: "全屏",
    readingHeadline: "一览掌纹解读",
    readSignalStat: "已解读走势",
    signalCountUnit: (count) => `${count}个`,
    handShapeStat: "手型",
    centerPointStat: "核心焦点",
    todayActionStat: "今日行动",
    specialPatternHeading: "检测到特殊掌纹",
    photoGuideHeading: "照片指南",
    photoGuideMessage: "手掌整体入镜、阴影较少时,解读会更加丰富。",
    focusSummaryHeading: "解读重点",
    innateAcquiredComparisonHeading: "先天·后天对比总结",
    innateAcquiredComparisonSub: "同时解读与生俱来的手与后天历练的手。",
    categoryReportHeading: "完整分类报告",
    categoryReportSub: "一次性展开阅读爱情、财富、事业、性格、人际的走势。",
    detailFlowHeading: "详细走势",
    actionSuggestionHeading: "实践建议",
    quickReportHeading: "🌙 一览掌纹解读",
    quickReportRowOneLiner: "🌙 一句话总结",
    quickReportRowOneLinerDefault: "我们把这次的掌纹走势整理得轻松又有趣。",
    quickReportRowOverall: "🌟 整体运势",
    quickReportRowOverallDefault: "现在越是找到自己的节奏,运势就越稳定。",
    quickReportRowLove: "💗 恋爱运",
    quickReportRowLoveDefault: "恋爱运在坦诚的沟通中会变得更好。",
    quickReportRowWealth: "💰 财运",
    quickReportRowWealthDefault: "财运会在持续积累中变得越来越顺。",
    quickReportRowCareer: "🧭 事业运",
    quickReportRowCareerDefault: "事业运会随着你积累自己的方式与实力而增强。",
    quickReportRowPersonality: "✨ 性格/魅力",
    quickReportRowPersonalityDefault: "沉稳的信赖感是你的魅力所在。",
    quickReportRowHealth: "🌱 健康/精力",
    quickReportRowHealthDefault: "比起硬撑,调理好节奏更能激活运势。",
    quickReportRowRelationship: "🤝 人际运",
    quickReportRowRelationshipDefault: "人际运在轻松自在的沟通中会更有力量。",
    quickReportRowAdvice: "🔮 今日建议",
    quickReportRowAdviceDefault: "今天不妨完成一件拖延已久的小事。",
    expertConsultHeading: "掌纹专家深度解读",
    expertConsultSub: "专家将根据解读结果按项目为您详细说明。",
    expertConsultIncludedBadge: "已包含",
    expertConsultMissingMessage: "本次未能生成深度解读文本。下方各分类报告仍会正常提供。",
  },

  "zh-TW": {
    handRoleLabelInnate: "先天之手",
    handRoleLabelAcquired: "後天之手",
    handRoleLabelMixed: "先後天混合之手",
    handRoleLabelUnknown: "未確定",
    handRoleDescInnate: "展現與生俱來的氣質與潛力的手",
    handRoleDescAcquired: "展現當前性向與人生軌跡的手",
    handRoleDescMixed: "先天與後天特質共同體現的手",
    handRoleDescUnknown: "選擇慣用手後即可判別。",

    dominantHandLabelRight: "右手",
    dominantHandLabelLeft: "左手",
    dominantHandLabelBoth: "雙手",
    dominantHandHintRight: "以右手為中心解讀",
    dominantHandHintLeft: "以左手為中心解讀",
    dominantHandHintBoth: "雙手平衡解讀",

    shootingGuides: [
      "請充分展開手掌,並將手腕一併入鏡。",
      "手指自然張開,避免相互重疊。",
      "請在窗邊或明亮光線下拍攝,關閉正面閃光燈。",
      "請靠近拍攝,讓手掌佔滿畫面中央。",
      "請拍攝有掌紋的手心一面,而非手背。",
      "請讓手與相機保持平行,避免傾斜。",
      "請確認對焦清晰,能看清細小紋路後再拍攝。",
    ],
    loadingPhases: [
      "正在確認手掌輪廓。",
      "正在尋找生命線·感情線·智慧線。",
      "正在分析手型與整體走勢。",
      "正在整理各分類的解讀結果。",
    ],

    cardLabelLifeLine: "🌱 能量",
    cardLabelHeadLine: "🧠 思維",
    cardLabelHeartLine: "💗 戀愛",
    cardLabelFateLine: "🧭 前程",
    cardLabelSunLine: "✨ 魅力",
    cardLabelMoneyLine: "💰 財運",
    cardLabelMarriageLine: "🤝 人際",
    cardLabelMounts: "🌟 綜合",

    purposeLabelGeneral: "整體運勢",
    purposeLabelLove: "戀愛運",
    purposeLabelWealth: "財運",
    purposeLabelCareer: "事業運",
    purposeLabelPersonality: "性格分析",
    purposeLabelRelationship: "人際關係模式",

    categoryTitleGeneral: "🌟 整體運勢",
    categoryTitleLove: "💗 戀愛運",
    categoryTitleWealth: "💰 財運",
    categoryTitleCareer: "🧭 事業運",
    categoryTitlePersonality: "✨ 性格/魅力",
    categoryTitleRelationship: "🤝 人際運",

    qualityWarningResolution: "解析度較低,可能會限制細部掌紋的辨識。",
    qualityWarningBrightness: "照片亮度過暗或過亮。",
    qualityWarningSharpness: "照片可能有手震或對焦模糊。",
    qualityWarningPalmLikely: "手掌構圖傾斜,較難估算掌紋區域。",
    qualityWarningFullPalmLikely: "請拍攝到手腕至指尖的完整手部。",
    qualityWarningGlareLow: "反光較強,部分紋路可能被遮蔽。",
    qualityConfidenceSummaryHigh: "分析確信度：高",
    qualityConfidenceSummaryMedium: "分析確信度：中",
    qualityConfidenceSummaryLow: "分析確信度：低（照片光線或對焦較弱,部分走勢僅供參考）",
    qualityConfidenceBadgeHigh: "高",
    qualityConfidenceBadgeMedium: "中",
    qualityConfidenceBadgeLow: "低",

    lineLengthLong: "延伸較長的走勢",
    lineLengthMedium: "均衡延伸的走勢",
    lineLengthShort: "短而集中的走勢",
    lineLengthDefault: "走勢較弱的狀態",
    lineDepthDeep: "清晰的紋路",
    lineDepthMedium: "均衡的紋路",
    lineDepthFaint: "柔和的紋路",
    lineDepthDefault: "較淺的紋路",
    lineCurvatureWideStrong: "柔和包裹的走勢",
    lineCurvatureNormalSoft: "自然延伸的走勢",
    lineCurvatureNarrowStraight: "筆直克制的走勢",
    lineCurvatureDefault: "平緩的走勢",
    headDirectionStraight: "以現實判斷為主",
    headDirectionCurved: "以感性與想像力為主",
    headDirectionDownward: "以直覺與專注為主",
    headDirectionDefault: "均衡型思維",
    headLifeRelationJoined: "傾向謹慎起步",
    headLifeRelationSeparated: "傾向獨立判斷",
    headLifeRelationDefault: "視情況靈活調整",
    heartEndingUnderIndex: "重視理想與信任",
    heartEndingUnderMiddle: "重視現實的安定感",
    heartEndingBetween: "內心與現實的平衡",
    heartEndingDefault: "慢慢確認關係的溫度",
    fateStrengthStrong: "目標軸清晰的走勢",
    fateStrengthMedium: "正在調整方向的走勢",
    fateStrengthWeakNone: "探索強於既定路徑的走勢",
    fateStrengthDefault: "慢慢確立方向的走勢",
    fateStartWrist: "從起點開始穩步累積的走勢",
    fateStartLifeLine: "從生活根基開闢道路的走勢",
    fateStartMoonMount: "機會從人際與環境中開啟的走勢",
    fateStartMiddlePalm: "經歷之後方向逐漸清晰的走勢",
    fateStartDefault: "順應情況尋找道路的走勢",
    minorStrengthHigh: "鮮活明顯的走勢",
    minorStrengthMedium: "較為均衡的走勢",
    minorStrengthLow: "較為柔和的走勢",
    minorStrengthDefault: "隱約顯現的走勢",
    lineChangesNone: "沒有明顯起伏、持續延伸的紋路",
    lineChangesBoth: (branchCount, breakCount) => `分支${branchCount}條 · 轉折${breakCount}處`,
    lineChangesBranchOnly: (branchCount) => `以${branchCount}條分支延展的紋路`,
    lineChangesBreakOnly: (breakCount) => `可見${breakCount}處轉折的紋路`,

    mountFocusVenus: "情感",
    mountFocusMoon: "直覺",
    mountFocusJupiter: "成長",
    mountFocusSaturn: "責任",
    mountFocusSun: "表現",
    mountFocusMercury: "溝通",
    mountFocusMars: "推動力",
    mountFocusNoReading: "手掌整體走勢",
    mountFocusBalanced: "均衡型",

    noReadingLabel: "照片走勢",
    noReadingValue: "以手掌整體走勢為中心進行了解讀。",
    lifeLineLengthLabel: "長度",
    lifeLineDepthLabel: "深淺",
    lifeLineCurvatureLabel: "曲線",
    lifeLineChangesLabel: "變化",
    lifeLineFallbackLabel: "狀態",
    lifeLineFallbackValue: "本次照片中生命線較淺,因此較寬泛地解讀了能量走勢。",
    headLineLengthLabel: "長度",
    headLineDirectionLabel: "方向",
    headLineRelationLabel: "起點",
    headLineChangesLabel: "變化",
    headLineFallbackLabel: "狀態",
    headLineFallbackValue: "智慧線較淺,因此結合手型與周邊走勢一併解讀。",
    heartLineLengthLabel: "長度",
    heartLineCurvatureLabel: "曲線",
    heartLineEndingLabel: "終點",
    heartLineChangesLabel: "變化",
    heartLineFallbackLabel: "狀態",
    heartLineFallbackValue: "感情線較淺,人際關係的溫度做了較為謹慎的解讀。",
    fateLineStrengthLabel: "力度",
    fateLineStartLabel: "起點",
    fateLineChangesLabel: "轉折",
    fateLineFallbackLabel: "狀態",
    fateLineFallbackValue: "命運線較淺,相比既定道路更側重解讀選擇的靈活性。",
    sunLineStrengthLabel: "表現力",
    sunLineReadingLabel: "解讀",
    sunLineReadingDefaultValue: "是那種以自己名義展現的工作中累積走勢的人。",
    moneyLineStrengthLabel: "財運走勢",
    moneyLineReadingLabel: "解讀",
    moneyLineReadingDefaultValue: "相比對金錢做出籠統判斷,更多解讀了管理與增值的習慣。",
    marriageLineStrengthLabel: "人際走勢",
    marriageLineReadingLabel: "解讀",
    marriageLineReadingDefaultValue: "解讀的重點不是關係的次數,而是親密感與守約的方式。",
    handShapeLabel: "手型",
    handShapeDefaultValue: "複合型",
    centerPointLabel: "核心焦點",
    overallLabel: "整體紋理",
    overallDefaultValue: "綜合解讀了手掌整體走勢。",

    resultModeFull: "精密解讀",
    resultModePartial: "核心解讀",
    resultModeFallback: "基礎解讀",

    categoryGeneralDefaultSummary: "這是把當下走勢簡單整理而成的掌紋解讀。",
    categoryGeneralDefaultAction1: "今天不妨完成一件拖延已久的事,打開新的走勢。",
    categoryGeneralDefaultAction2: "如果解讀內容較長,不妨先從簡短的溝通開始。",
    categoryLoveDefaultSummary: "戀愛運的關鍵似乎在於安定感與坦誠的溝通。",
    categoryLoveDefaultAction: "在關係中,先調整好自己的語氣,而非只關注對方的反應。",
    categoryWealthDefaultSummary: "財運是持續累積就會逐漸增強的走勢。",
    categoryWealthDefaultAction: "先理清消費基準,方向會更快清晰起來。",
    categoryCareerDefaultSummary: "事業運會隨著你累積自己的方式與實力而增強。",
    categoryCareerDefaultAction: "把日程拆分成短單位、建立執行節奏,就更容易出成果。",
    categoryPersonalityDefaultSummary: "這是對性格與魅力的輕鬆整理。",
    categoryPersonalityDefaultAction: "表達時,一致性比誇張更能帶來好反應。",
    categoryRelationshipDefaultSummary: "人際運會在輕鬆自在的溝通中變得更好。",
    categoryRelationshipDefaultAction: "最重要的是守住一個承諾的習慣。",

    resultOneLinerDefault: "我們解讀了你手掌的整體走勢,整理出了當下需要的方向。",
    resultPrimaryActionDefault: "今天完成一件小事,打開你的走勢吧。",

    overlayAltLeft: "左手掌疊加圖",
    overlayAltRight: "右手掌疊加圖",
    overlayAltGeneric: "手掌疊加圖",

    handNameLeft: "左手",
    handNameRight: "右手",
    uploadSourceCamera: "相機拍攝",
    uploadSourceGallery: "相簿選擇",

    noFileSelectedMessage: "尚未選擇照片。請重新選擇手掌圖片。",
    unsupportedFileTypeMessage: "不支援此檔案格式。請選擇JPG、PNG、WEBP或HEIC/HEIF格式的圖片。",
    fileTooLargeMessage: "檔案過大。請選擇25MB以下的圖片。",
    heicPreviewLimitedMessage: "此裝置上HEIC/HEIF預覽最佳化受限,將以原始檔案繼續分析。",
    prepFallbackMessage: (errorMessage) => `跳過瀏覽器前處理,以原始圖片進行分析。（${errorMessage}）`,
    qualityCheckLimitedMessage: "此瀏覽器的品質預檢受限,將以伺服器分析結果為準進行提示。",
    handNoHandDetectedMessage: (handName) => `未能在${handName}照片中辨識出手部。請張開手掌,將手腕至指尖完整入鏡後重新拍攝。`,
    lowQualityContinueMessage: (warningSuffix) => `可以繼續分析,但照片可能略暗或模糊。請將結果作為參考。${warningSuffix}`,
    heicConvertedMessage: (sourceLabel) => `已將${sourceLabel}的HEIC圖片轉換為可分析的JPEG格式。請確認預覽後開始分析。`,
    imageLoadedWithWarningMessage: (sourceLabel, prepWarning) => `已載入${sourceLabel}的圖片。${prepWarning} 請確認預覽後開始分析。`,
    imageLoadedMessage: (sourceLabel) => `已載入${sourceLabel}的圖片。請確認預覽後開始分析。`,
    heicUnreadableMessage: "此瀏覽器無法解析HEIC/HEIF圖片。請在iPhone上以JPG格式拍攝,或轉換格式後重新選擇。",
    imageLoadFailedMessage: (errorMessage) => `圖片載入失敗：${errorMessage}。請嘗試其他照片。`,
    unknownErrorLabel: "未知錯誤",
    noFileSelectedRetryMessage: "尚未選擇照片。請重試。",
    imageEncodingFailedError: "圖片編碼失敗。",
    duplicateInFlightMessage: "同一張圖片正在分析中。請稍候。",
    duplicateRecentMessage: "同一張圖片的請求剛剛處理完畢。請稍後重試或更換照片。",
    coinGateAuthRequiredMessage: "需要登入。請登入後重新嘗試手相分析。",
    coinGateInsufficientMessage: (serverCost) => `可用餘額不足,需要支付${serverCost}。`,
    coinGatePriceNotFoundMessage: "未找到手相分析的價格資訊。請稍後重試。",
    coinGateGenericFailureMessage: "支付失敗。",
    checkingPassMessage: "正在確認權益",
    checkingImageQualityMessage: "正在確認手掌圖片品質...",
    analyzingPalmPhotoMessage: "正在分析手掌照片",
    readingGoldenLinesMessage: "正在解讀手掌的金色紋路...",
    analysisErrorGenericMessage: "分析過程中發生了錯誤。",
    palmNotFullyVisibleMessage: "手掌整體未能完整入鏡。",
    palmNotFullyVisibleRetryMessage: "手掌整體未能完整入鏡。請重新拍攝,確保從手腕到指尖都清晰可見。",
    resultConfirmedCheckingPaymentMessage: "已確認分析結果。正在確認付款...",
    requestCancelledStatusMessage: "請求已取消。",
    requestCancelledMessage: "請求已取消。請重新嘗試分析。",
    networkErrorStatusMessage: "由於網路/API錯誤,分析請求失敗。",
    networkErrorMessage: "由於網路/API錯誤,分析請求失敗。請確認網路連線後重試。",
    analysisErrorWithReasonMessage: (errorMessage) => `分析過程中發生了錯誤：${errorMessage}`,
    photoReselectKeepMessage: "您可以重新選擇照片,重新開始手相分析。",
    retryOtherHandKeepMessage: "如需以另一隻手為準查看,請重新選擇慣用手。",
    resetResultKeepMessage: "先前的分析結果已重置。您可以用相同的輸入重新分析。",
    resultModeFullQualityMessage: "手掌辨識已完成,已產生精密分析結果。",
    resultModePartialQualityMessage: "已偵測到手掌並產生部分分析結果。上傳更清晰的照片可提升準確度。",
    resultModeFallbackQualityMessage: "已偵測到手掌,但清晰度較低,因此以基礎/保守解讀方式產生了結果。",
    previewLoadFailedMessage: (handName) => `未能載入${handName}的預覽。請以JPG/PNG/WEBP格式重新上傳。`,

    selectButtonLabel: "選擇",
    readSignalHeading: "已解讀訊號",
    interpretationHeading: "解讀",
    strengthHeading: "可發揮的優勢",
    cautionHeading: "需調整之處",
    todayAdviceHeading: "今日建議",
    sevenDayPracticeHeading: "7天實踐法",

    palmInputBadge: "手掌輸入",
    palmInputDescription: "請上傳或拍攝手掌清晰可見的照片。",
    registeredBadge: "已登錄",
    detectedBadge: "已辨識手部",
    estimatedBadge: "手部位置估算",
    photoQualityBadge: (confidenceLabel) => `照片品質 ${confidenceLabel}`,
    qualityOkMessage: "品質檢測良好,可以用此照片進行分析。",
    retakePhotoAction: "重新拍攝",
    chooseAnotherPhotoAction: "選擇其他照片",
    captureAgainAction: "重新拍攝",
    captureFirstAction: "拍攝",
    choosePhotoFirstAction: "從相簿選擇",
    deletePhotoAction: (handName) => `刪除${handName}照片`,
    previewCaption: (title) => `${title}圖片預覽`,
    previewPlaceholder: "上傳後將顯示在此區域。",
    cameraAriaLabel: (handName, hasPreview) => `${handName}${hasPreview ? "重新拍攝" : "相機拍攝"}`,
    galleryAriaLabel: (handName, hasPreview) => `${handName}${hasPreview ? "選擇其他照片" : "從相簿選擇照片"}`,
    deletePhotoAriaLabel: (handName) => `刪除${handName}已登錄的照片`,
    galleryInputAriaLabel: (handName) => `${handName}相簿檔案選擇輸入`,
    cameraInputAriaLabel: (handName) => `${handName}相機拍攝輸入`,

    pageTitle: "掌紋地圖",
    pageSubtitle: "先天之結 · 後天之流",
    pageTagline: "解讀鐫刻在手掌中的愛情、財富、事業與內心走勢",
    pageDescription: "手相並非用來斷定壽命或疾病的工具,而是象徵性地解讀性向、人際、財富、事業走勢的地圖。",
    pageDescriptionSub: "我們會同時解讀與生俱來的手與後天歷練的手。手掌中同時刻著你本來的氣質與如今走過的足跡。",
    captureSectionHeading: "拍攝/上傳手掌照片",
    captureSectionDescription: "請讓手掌位於畫面中央拍攝。在明亮處拍到完整的手會提高分析準確度。",
    oneHandNoteMain: "僅登錄一隻手也可以進行分析。",
    oneHandNoteSub: "登錄雙手可加入先天·後天的比較解讀。",
    leftHandInputLabel: "左手輸入",
    rightHandInputLabel: "右手輸入",
    captureNowAriaLabel: "立即拍攝手掌",
    captureNowLabel: "立即拍攝手掌",
    choosePhotoAriaLabel: "從相簿選擇照片",
    choosePhotoLabel: "從相簿選擇照片",
    currentTargetLabel: (handName) => `目前選擇對象：${handName}`,
    flowStepUpload: "1. 上傳",
    flowStepPreview: "2. 預覽/品質提示",
    flowStepAnalyzing: "3. 分析",
    flowStepResult: "4. 結果",
    previewOfHand: (handName) => `${handName}預覽`,
    selectedPreviewAlt: "已選手掌預覽",
    checklistFullPalm: "手是否完整可見？",
    checklistCreases: "手掌紋路是否清晰？",
    checklistGlare: "反光是否嚴重？",
    checklistShake: "照片是否過於晃動？",
    analyzeThisPhotoAction: "就用這張照片分析",
    bothHandsUploadHeading: "雙手比較上傳（可選）",
    leftHandUploadTitle: "左手圖片上傳",
    rightHandUploadTitle: "右手圖片上傳",
    innateAcquiredHeading: "先天·後天說明",
    innateAcquiredExplain1: "手相中,將常用手解讀為後天之手,不常用手解讀為先天之手。",
    innateAcquiredExplain2: "後天之手體現當下的性向與人生走勢,先天之手體現與生俱來的氣質與潛力。",
    innateAcquiredExplain3: "同時解讀先天之結與後天之流,提出切合現實的方向建議。",
    dominantHandHeading: "選擇慣用手",
    purposeFixedNote: "分析目的固定為整體運勢,將一次性顯示戀愛/財運/事業/性格/人際各分類。",
    shootingGuideHeading: "拍攝指南",
    analyzingButtonLabel: "手相分析進行中...",
    openPalmMapButtonLabel: "開啟手掌命運地圖",
    lowQualityDetectedMessage: (handNames) => `${handNames}照片的品質被偵測為較低`,
    lowQualityAdviceMessage: "在更明亮處重新拍攝、使手掌整體清晰呈現,解讀會更加準確。",
    activeConditionMessage: "啟用條件：至少1張左手或右手照片＋已選擇慣用手",
    leftHandRoleLabel: (roleLabel) => `左手角色：${roleLabel}`,
    rightHandRoleLabel: (roleLabel) => `右手角色：${roleLabel}`,
    analyzingBanner: "正在解讀手掌的金色紋路...",
    reselectPhotoAction: "重新選擇照片",
    reanalyzeAction: "重新分析",
    resultOverlayHeading: "掌紋結果疊加圖",
    resultOverlaySubheading: "在同一畫面中比較先天之結與後天之流。",
    coordinateBasedBadge: "座標基礎 + 部分校正",
    symbolicGuideBadge: "象徵性引導疊加圖",
    viewOtherHandAction: "換另一隻手再看",
    backToMainAction: "返回主頁",
    viewLeftHandAction: "查看左手",
    viewRightHandAction: "查看右手",
    fullscreenExitLabel: "切換為標準畫面",
    fullscreenEnterLabel: "切換為全螢幕",
    fullscreenExitButton: "標準畫面",
    fullscreenEnterButton: "全螢幕",
    readingHeadline: "一覽掌紋解讀",
    readSignalStat: "已解讀走勢",
    signalCountUnit: (count) => `${count}個`,
    handShapeStat: "手型",
    centerPointStat: "核心焦點",
    todayActionStat: "今日行動",
    specialPatternHeading: "偵測到特殊掌紋",
    photoGuideHeading: "照片指南",
    photoGuideMessage: "手掌整體入鏡、陰影較少時,解讀會更加豐富。",
    focusSummaryHeading: "解讀重點",
    innateAcquiredComparisonHeading: "先天·後天比較總結",
    innateAcquiredComparisonSub: "同時解讀與生俱來的手與後天歷練的手。",
    categoryReportHeading: "完整分類報告",
    categoryReportSub: "一次性展開閱讀愛情、財富、事業、性格、人際的走勢。",
    detailFlowHeading: "詳細走勢",
    actionSuggestionHeading: "實踐建議",
    quickReportHeading: "🌙 一覽掌紋解讀",
    quickReportRowOneLiner: "🌙 一句話總結",
    quickReportRowOneLinerDefault: "我們把這次的掌紋走勢整理得輕鬆又有趣。",
    quickReportRowOverall: "🌟 整體運勢",
    quickReportRowOverallDefault: "現在越是找到自己的節奏,運勢就越穩定。",
    quickReportRowLove: "💗 戀愛運",
    quickReportRowLoveDefault: "戀愛運在坦誠的溝通中會變得更好。",
    quickReportRowWealth: "💰 財運",
    quickReportRowWealthDefault: "財運會在持續累積中變得越來越順。",
    quickReportRowCareer: "🧭 事業運",
    quickReportRowCareerDefault: "事業運會隨著你累積自己的方式與實力而增強。",
    quickReportRowPersonality: "✨ 性格/魅力",
    quickReportRowPersonalityDefault: "沉穩的信賴感是你的魅力所在。",
    quickReportRowHealth: "🌱 健康/精力",
    quickReportRowHealthDefault: "比起硬撐,調理好節奏更能激活運勢。",
    quickReportRowRelationship: "🤝 人際運",
    quickReportRowRelationshipDefault: "人際運在輕鬆自在的溝通中會更有力量。",
    quickReportRowAdvice: "🔮 今日建議",
    quickReportRowAdviceDefault: "今天不妨完成一件拖延已久的小事。",
    expertConsultHeading: "掌紋專家深度解讀",
    expertConsultSub: "專家將根據解讀結果按項目為您詳細說明。",
    expertConsultIncludedBadge: "已包含",
    expertConsultMissingMessage: "本次未能產生深度解讀文本。下方各分類報告仍會正常提供。",
  },
};

export function getPalmDestinyCopy(locale: LoadingLocale): PalmDestinyCopy {
  return { ...PALM_DESTINY_COPY_EN, ...(PALM_DESTINY_COPY[locale] || {}) };
}

export function usePalmDestinyCopy(): PalmDestinyCopy {
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

  return getPalmDestinyCopy(locale);
}
