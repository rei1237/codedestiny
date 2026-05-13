import { fitTextToBox } from "./svgText";

export type DestinyBiasCardSvgInput = {
  userName: string;
  biasName: string;
  linkedArtist: string;
  compatibilityScore: number;
  auraType: string;
  auraMaterial: string;
  destinyGrade: string;
  destinyMessage: string;
  destinySignal: string;
  fansignMessage: string;
  destinyId: string;
  issuedAt: string;
  energyColor: string;
  pairingAlias: string;
  editionLabel: string;
  stageChemistryKeywords: string[];
  themeKey?: string;
  themeLabel: string;
};

export type DestinyBiasCardSvgModel = {
  biasName: ReturnType<typeof fitTextToBox>;
  linkedArtist: ReturnType<typeof fitTextToBox>;
  stageLine: ReturnType<typeof fitTextToBox>;
  sparkUnit: ReturnType<typeof fitTextToBox>;
  auraType: ReturnType<typeof fitTextToBox>;
  auraMaterial: ReturnType<typeof fitTextToBox>;
  destinyMessage: ReturnType<typeof fitTextToBox>;
  destinySignal: ReturnType<typeof fitTextToBox>;
  fansignMessage: ReturnType<typeof fitTextToBox>;
  userName: ReturnType<typeof fitTextToBox>;
  meta: {
    score: number;
    destinyGrade: string;
    destinyId: string;
    issuedAt: string;
    energyColor: string;
    editionLabel: string;
      themeKey: string;
    themeLabel: string;
    stageChemistryKeywords: string[];
  };
};

function trimText(value: string, fallback = "") {
  const text = String(value || "").trim();
  return text || fallback;
}

export function buildBiasCardSvgModel(input: DestinyBiasCardSvgInput): DestinyBiasCardSvgModel {
  const compactAlias = trimText(input.pairingAlias, "Destiny Pairing");
  const stageLine = compactAlias.replace(/\s*unit\s*$/i, "").trim() || compactAlias;

  return {
    biasName: fitTextToBox(trimText(input.biasName, "MY BIAS"), {
      maxWidth: 548,
      maxLines: 1,
      fontSize: 58,
      minFontSize: 24,
      lineHeight: 62,
    }),
    linkedArtist: fitTextToBox(`Linked Artist: ${trimText(input.linkedArtist, input.biasName)}`, {
      maxWidth: 700,
      maxLines: 1,
      fontSize: 28,
      minFontSize: 14,
      lineHeight: 32,
    }),
    stageLine: fitTextToBox(`Stage Line: ${stageLine}`, {
      maxWidth: 700,
      maxLines: 1,
      fontSize: 20,
      minFontSize: 13,
      lineHeight: 24,
    }),
    sparkUnit: fitTextToBox(`Spark Unit: ${compactAlias}`, {
      maxWidth: 700,
      maxLines: 1,
      fontSize: 20,
      minFontSize: 13,
      lineHeight: 24,
    }),
    auraType: fitTextToBox(trimText(input.auraType, "Aura Type"), {
      maxWidth: 318,
      maxLines: 2,
      fontSize: 27,
      minFontSize: 14,
      lineHeight: 31,
    }),
    auraMaterial: fitTextToBox(trimText(input.auraMaterial, "Aura Material"), {
      maxWidth: 318,
      maxLines: 2,
      fontSize: 22,
      minFontSize: 13,
      lineHeight: 26,
    }),
    destinyMessage: fitTextToBox(trimText(input.destinyMessage, "Tonight your destiny sparkles."), {
      maxWidth: 706,
      maxLines: 3,
      fontSize: 26,
      minFontSize: 14,
      lineHeight: 31,
    }),
    destinySignal: fitTextToBox(trimText(input.destinySignal, "Signal synchronized."), {
      maxWidth: 706,
      maxLines: 2,
      fontSize: 18,
      minFontSize: 13,
      lineHeight: 23,
    }),
    fansignMessage: fitTextToBox(trimText(input.fansignMessage, "Keep your glow."), {
      maxWidth: 700,
      maxLines: 2,
      fontSize: 34,
      minFontSize: 17,
      lineHeight: 38,
    }),
    userName: fitTextToBox(`For ${trimText(input.userName, "you")}`, {
      maxWidth: 240,
      maxLines: 1,
      fontSize: 20,
      minFontSize: 16,
      lineHeight: 24,
    }),
    meta: {
      score: Math.max(0, Math.min(100, Math.round(Number(input.compatibilityScore) || 0))),
      destinyGrade: trimText(input.destinyGrade, "SPECIAL"),
      destinyId: trimText(input.destinyId, "DB-00000000"),
      issuedAt: trimText(input.issuedAt, "0000.00.00"),
      energyColor: trimText(input.energyColor, "#ffffff"),
      editionLabel: trimText(input.editionLabel, "LIMITED AURA CARD"),
      themeKey: trimText(input.themeKey, "moonlight_neon"),
      themeLabel: trimText(input.themeLabel, "Aurora Glass"),
      stageChemistryKeywords: (Array.isArray(input.stageChemistryKeywords) ? input.stageChemistryKeywords : [])
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .slice(0, 3),
    },
  };
}
