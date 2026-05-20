export type PalmDominantHand = "right" | "left" | "both";
export type PalmAnalysisPurpose =
  | "general"
  | "love"
  | "wealth"
  | "career"
  | "personality"
  | "relationship";

export type PalmUploadedHand = "left" | "right";
export type PalmHandRole = "innate" | "acquired" | "mixed" | "unknown";

export type PalmImageHandSide = "left" | "right" | "unknown";
export type PalmImageBrightness = "good" | "normal" | "dark";
export type PalmImageSharpness = "good" | "normal" | "blurry";

export type PalmLineLength = "long" | "medium" | "short" | "unknown";
export type PalmLineDepth = "deep" | "medium" | "faint" | "unknown";
export type PalmLineCurvature = "wide" | "normal" | "narrow" | "unknown";

export type PalmHeadLineDirection = "straight" | "curved" | "downward" | "unknown";
export type PalmHeadLifeRelation = "joined" | "separated" | "unknown";
export type PalmHeartEndingArea = "underIndex" | "underMiddle" | "between" | "unknown";
export type PalmFateStrength = "strong" | "medium" | "weak" | "none" | "unknown";
export type PalmFateStartArea = "wrist" | "lifeLine" | "moonMount" | "middlePalm" | "unknown";
export type PalmFateEndArea = "saturnMount" | "middlePalm" | "unknown";

export type PalmHandShapeType = "earth" | "fire" | "air" | "water" | "mixed" | "unknown";
export type PalmMountFullness = "strong" | "medium" | "weak" | "unknown";

export type PalmSpecialPatternCode = "m_shape" | "simian_line";

export type PalmSpecialPattern = {
  code: PalmSpecialPatternCode;
  label: string;
  detected: boolean;
  confidence: number;
  summary: string;
};

export type PalmLineBase = {
  detected: boolean;
  summary: string;
  advice: string;
};

export type PalmLifeLineReading = PalmLineBase & {
  length: PalmLineLength;
  depth: PalmLineDepth;
  curvature: PalmLineCurvature;
  breaks: number;
  branches: number;
};

export type PalmHeadLineReading = PalmLineBase & {
  length: PalmLineLength;
  direction: PalmHeadLineDirection;
  startRelationWithLifeLine: PalmHeadLifeRelation;
  breaks: number;
  branches: number;
};

export type PalmHeartLineReading = PalmLineBase & {
  length: PalmLineLength;
  curvature: "strong" | "soft" | "straight" | "unknown";
  endingArea: PalmHeartEndingArea;
  breaks: number;
  branches: number;
};

export type PalmFateLineReading = PalmLineBase & {
  strength: PalmFateStrength;
  startArea: PalmFateStartArea;
  endArea: PalmFateEndArea;
  breaks: number;
};

export type PalmMinorLineReading = {
  detected: boolean;
  strength: string | null;
  summary: string;
};

export type PalmMountReading = {
  fullness: PalmMountFullness;
  summary: string;
};

export type PalmHandReading = {
  handShape: {
    type: PalmHandShapeType;
    labelKo: string;
    palmRatio: string;
    fingerRatio: string;
    summary: string;
  };
  majorLines: {
    lifeLine: PalmLifeLineReading;
    headLine: PalmHeadLineReading;
    heartLine: PalmHeartLineReading;
    fateLine: PalmFateLineReading;
  };
  minorLines: {
    sunLine: PalmMinorLineReading;
    moneyLine: PalmMinorLineReading;
    marriageLine: PalmMinorLineReading;
    mercuryLine: PalmMinorLineReading;
  };
  mounts: {
    venus: PalmMountReading;
    moon: PalmMountReading;
    jupiter: PalmMountReading;
    saturn: PalmMountReading;
    sun: PalmMountReading;
    mercury: PalmMountReading;
    mars: PalmMountReading;
  };
  scores: {
    love: number | null;
    career: number | null;
    wealth: number | null;
    vitality: number | null;
    creativity: number | null;
    communication: number | null;
  };
  overall: {
    title: string;
    summary: string;
    strengths: string[];
    cautions: string[];
    recommendedActions: string[];
  };
};

export type CanonicalPalmReading = {
  reportType: "palm-reading";
  profile: {
    dominantHand: PalmDominantHand | null;
    analysisPurpose: PalmAnalysisPurpose;
  };
  handContext: {
    uploadedHands: PalmUploadedHand[];
    leftHandRole: PalmHandRole;
    rightHandRole: PalmHandRole;
    interpretationBasis: {
      innateMeaning: string;
      acquiredMeaning: string;
      mixedMeaning: string;
    };
  };
  imageQuality: {
    isPalmDetected: boolean;
    handSide: PalmImageHandSide;
    brightness: PalmImageBrightness;
    sharpness: PalmImageSharpness;
    palmCoverage: number;
    rotation: number;
    warnings: string[];
  };
  leftHandReading: PalmHandReading | null;
  rightHandReading: PalmHandReading | null;
  bothHandsComparison: {
    enabled: boolean;
    innateSummary: string;
    acquiredSummary: string;
    differenceSummary: string;
    growthSummary: string;
    loveSummary: string;
    careerSummary: string;
    wealthSummary: string;
  };
  specialPatterns: {
    detected: PalmSpecialPattern[];
    summary: string;
  };
  validation: {
    hasPalm: boolean;
    hasEnoughQuality: boolean;
    hasMajorLines: boolean;
    missingFields: string[];
    analysisMode: "failed" | "estimated" | "detailed";
    qualityWarning: string | null;
  };
  purposeAnalysis?: {
    summary: string;
    evidence: { label: string; text: string }[];
    details: string;
    cautions: string[];
    actions: string[];
    sections: { title: string; content: string }[];
  };
};

export type canonicalPalmReading = CanonicalPalmReading;

export type CreateCanonicalPalmReadingParams = {
  dominantHand?: PalmDominantHand | null;
  analysisPurpose?: PalmAnalysisPurpose;
  uploadedHands?: PalmUploadedHand[];
  leftHandRole?: PalmHandRole;
  rightHandRole?: PalmHandRole;
  imageQuality?: Partial<CanonicalPalmReading["imageQuality"]>;
  leftHandReading?: PalmHandReading | null;
  rightHandReading?: PalmHandReading | null;
  comparison?: Partial<CanonicalPalmReading["bothHandsComparison"]>;
  specialPatterns?: Partial<CanonicalPalmReading["specialPatterns"]>;
  purposeAnalysis?: CanonicalPalmReading["purposeAnalysis"];
};

function createEmptyMinorLineReading(): PalmMinorLineReading {
  return {
    detected: false,
    strength: null,
    summary: "",
  };
}

function createEmptyMountReading(): PalmMountReading {
  return {
    fullness: "unknown",
    summary: "",
  };
}

export function createEmptyPalmHandReading(): PalmHandReading {
  return {
    handShape: {
      type: "unknown",
      labelKo: "",
      palmRatio: "unknown",
      fingerRatio: "unknown",
      summary: "",
    },
    majorLines: {
      lifeLine: {
        detected: false,
        length: "unknown",
        depth: "unknown",
        curvature: "unknown",
        breaks: 0,
        branches: 0,
        summary: "",
        advice: "",
      },
      headLine: {
        detected: false,
        length: "unknown",
        direction: "unknown",
        startRelationWithLifeLine: "unknown",
        breaks: 0,
        branches: 0,
        summary: "",
        advice: "",
      },
      heartLine: {
        detected: false,
        length: "unknown",
        curvature: "unknown",
        endingArea: "unknown",
        breaks: 0,
        branches: 0,
        summary: "",
        advice: "",
      },
      fateLine: {
        detected: false,
        strength: "unknown",
        startArea: "unknown",
        endArea: "unknown",
        breaks: 0,
        summary: "",
        advice: "",
      },
    },
    minorLines: {
      sunLine: createEmptyMinorLineReading(),
      moneyLine: createEmptyMinorLineReading(),
      marriageLine: createEmptyMinorLineReading(),
      mercuryLine: createEmptyMinorLineReading(),
    },
    mounts: {
      venus: createEmptyMountReading(),
      moon: createEmptyMountReading(),
      jupiter: createEmptyMountReading(),
      saturn: createEmptyMountReading(),
      sun: createEmptyMountReading(),
      mercury: createEmptyMountReading(),
      mars: createEmptyMountReading(),
    },
    scores: {
      love: null,
      career: null,
      wealth: null,
      vitality: null,
      creativity: null,
      communication: null,
    },
    overall: {
      title: "",
      summary: "",
      strengths: [],
      cautions: [],
      recommendedActions: [],
    },
  };
}

export function createDefaultCanonicalPalmReading(
  params: CreateCanonicalPalmReadingParams = {},
): CanonicalPalmReading {
  const canonical: CanonicalPalmReading = {
    reportType: "palm-reading",
    profile: {
      dominantHand: params.dominantHand ?? null,
      analysisPurpose: params.analysisPurpose ?? "general",
    },
    handContext: {
      uploadedHands: params.uploadedHands ?? [],
      leftHandRole: params.leftHandRole ?? "unknown",
      rightHandRole: params.rightHandRole ?? "unknown",
      interpretationBasis: {
        innateMeaning: "타고난 기질, 잠재력, 본래 성향, 무의식적 패턴",
        acquiredMeaning: "현재의 성향, 후천적 변화, 사회적 자아, 현재 삶의 흐름",
        mixedMeaning: "선천성과 후천성이 함께 반영된 손",
      },
    },
    imageQuality: {
      isPalmDetected: params.imageQuality?.isPalmDetected ?? false,
      handSide: params.imageQuality?.handSide ?? "unknown",
      brightness: params.imageQuality?.brightness ?? "normal",
      sharpness: params.imageQuality?.sharpness ?? "normal",
      palmCoverage: params.imageQuality?.palmCoverage ?? 0,
      rotation: params.imageQuality?.rotation ?? 0,
      warnings: params.imageQuality?.warnings ?? [],
    },
    leftHandReading: params.leftHandReading ?? null,
    rightHandReading: params.rightHandReading ?? null,
    bothHandsComparison: {
      enabled: params.comparison?.enabled ?? false,
      innateSummary: params.comparison?.innateSummary ?? "",
      acquiredSummary: params.comparison?.acquiredSummary ?? "",
      differenceSummary: params.comparison?.differenceSummary ?? "",
      growthSummary: params.comparison?.growthSummary ?? "",
      loveSummary: params.comparison?.loveSummary ?? "",
      careerSummary: params.comparison?.careerSummary ?? "",
      wealthSummary: params.comparison?.wealthSummary ?? "",
    },
    specialPatterns: {
      detected: Array.isArray(params.specialPatterns?.detected) ? params.specialPatterns?.detected : [],
      summary: params.specialPatterns?.summary ?? "",
    },
    validation: {
      hasPalm: false,
      hasEnoughQuality: false,
      hasMajorLines: false,
      missingFields: [],
      analysisMode: "failed",
      qualityWarning: null,
    },
    purposeAnalysis: params.purposeAnalysis,
  };

  return updateCanonicalPalmReadingValidation(canonical);
}

export function updateCanonicalPalmReadingValidation(
  canonical: CanonicalPalmReading,
): CanonicalPalmReading {
  const missingFields: string[] = [];
  const hasPalm = canonical.handContext.uploadedHands.length > 0;
  if (!hasPalm) {
    missingFields.push("handContext.uploadedHands");
  }

  if (!canonical.profile.dominantHand) {
    missingFields.push("profile.dominantHand");
  }

  if (!canonical.profile.analysisPurpose) {
    missingFields.push("profile.analysisPurpose");
  }

  const hasLeftMajor =
    canonical.leftHandReading?.majorLines.lifeLine.detected ||
    canonical.leftHandReading?.majorLines.headLine.detected ||
    canonical.leftHandReading?.majorLines.heartLine.detected ||
    canonical.leftHandReading?.majorLines.fateLine.detected ||
    false;

  const hasRightMajor =
    canonical.rightHandReading?.majorLines.lifeLine.detected ||
    canonical.rightHandReading?.majorLines.headLine.detected ||
    canonical.rightHandReading?.majorLines.heartLine.detected ||
    canonical.rightHandReading?.majorLines.fateLine.detected ||
    false;

  const hasMajorLines = hasLeftMajor || hasRightMajor;
  if (!hasMajorLines) {
    missingFields.push("majorLines");
  }

  const qualityByImage =
    canonical.imageQuality.isPalmDetected &&
    canonical.imageQuality.sharpness !== "blurry" &&
    canonical.imageQuality.brightness !== "dark" &&
    canonical.imageQuality.palmCoverage >= 0.42;

  const hasEnoughQuality = qualityByImage || hasMajorLines;

  if (!canonical.imageQuality.isPalmDetected) {
    missingFields.push("imageQuality.isPalmDetected");
  }
  if (!hasMajorLines && canonical.imageQuality.palmCoverage < 0.42) {
    missingFields.push("imageQuality.palmCoverage");
  }

  const analysisMode = !hasPalm ? "failed" : hasEnoughQuality ? "detailed" : "estimated";
  const qualityWarning = analysisMode === "estimated" 
    ? "이미지 품질이 다소 낮아 일부 손금은 추정 기반으로 분석되었습니다. 더 밝고 선명한 손바닥 사진을 올리면 정밀 분석이 가능합니다."
    : null;

  return {
    ...canonical,
    validation: {
      hasPalm,
      hasEnoughQuality,
      hasMajorLines,
      missingFields,
      analysisMode,
      qualityWarning,
    },
  };
}

export function isPalmUnknownValue(value: unknown): boolean {
  return value == null || value === "unknown";
}
