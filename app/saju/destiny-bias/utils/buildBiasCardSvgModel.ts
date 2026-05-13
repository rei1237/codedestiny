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
  themeLabel: string;
};

export type DestinyBiasCardSvgModel = {
  biasName: ReturnType<typeof fitTextToBox>;
  linkedArtist: ReturnType<typeof fitTextToBox>;
  pairingAlias: ReturnType<typeof fitTextToBox>;
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
    themeLabel: string;
    stageChemistryKeywords: string[];
  };
};

function trimText(value: string, fallback = "") {
  const text = String(value || "").trim();
  return text || fallback;
}

export function buildBiasCardSvgModel(input: DestinyBiasCardSvgInput): DestinyBiasCardSvgModel {
  return {
    biasName: fitTextToBox(trimText(input.biasName, "MY BIAS"), {
      maxWidth: 590,
      maxLines: 2,
      fontSize: 68,
      minFontSize: 38,
      lineHeight: 74,
    }),
    linkedArtist: fitTextToBox(`Linked Artist: ${trimText(input.linkedArtist, input.biasName)}`, {
      maxWidth: 590,
      maxLines: 2,
      fontSize: 28,
      minFontSize: 18,
      lineHeight: 36,
    }),
    pairingAlias: fitTextToBox(trimText(input.pairingAlias, "Destiny Pairing"), {
      maxWidth: 590,
      maxLines: 2,
      fontSize: 24,
      minFontSize: 16,
      lineHeight: 30,
    }),
    auraType: fitTextToBox(trimText(input.auraType, "Aura Type"), {
      maxWidth: 268,
      maxLines: 2,
      fontSize: 34,
      minFontSize: 20,
      lineHeight: 38,
    }),
    auraMaterial: fitTextToBox(trimText(input.auraMaterial, "Aura Material"), {
      maxWidth: 268,
      maxLines: 2,
      fontSize: 28,
      minFontSize: 16,
      lineHeight: 32,
    }),
    destinyMessage: fitTextToBox(trimText(input.destinyMessage, "Tonight your destiny sparkles."), {
      maxWidth: 740,
      maxLines: 3,
      fontSize: 36,
      minFontSize: 20,
      lineHeight: 44,
    }),
    destinySignal: fitTextToBox(trimText(input.destinySignal, "Signal synchronized."), {
      maxWidth: 740,
      maxLines: 2,
      fontSize: 24,
      minFontSize: 15,
      lineHeight: 30,
    }),
    fansignMessage: fitTextToBox(trimText(input.fansignMessage, "Keep your glow."), {
      maxWidth: 600,
      maxLines: 2,
      fontSize: 40,
      minFontSize: 22,
      lineHeight: 44,
    }),
    userName: fitTextToBox(`For ${trimText(input.userName, "you")}`, {
      maxWidth: 200,
      maxLines: 1,
      fontSize: 22,
      minFontSize: 16,
      lineHeight: 26,
    }),
    meta: {
      score: Math.max(0, Math.min(100, Math.round(Number(input.compatibilityScore) || 0))),
      destinyGrade: trimText(input.destinyGrade, "SPECIAL"),
      destinyId: trimText(input.destinyId, "DB-00000000"),
      issuedAt: trimText(input.issuedAt, "0000.00.00"),
      energyColor: trimText(input.energyColor, "#ffffff"),
      editionLabel: trimText(input.editionLabel, "LIMITED AURA CARD"),
      themeLabel: trimText(input.themeLabel, "Aurora Glass"),
      stageChemistryKeywords: (Array.isArray(input.stageChemistryKeywords) ? input.stageChemistryKeywords : [])
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .slice(0, 3),
    },
  };
}
