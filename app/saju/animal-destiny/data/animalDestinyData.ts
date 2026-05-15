const ORDER = [
  "cheetah",
  "monkey",
  "black-panther",
  "koala",
  "tiger",
  "raccoon",
  "rhino",
  "elephant",
  "sheep",
  "pegasus",
  "wolf",
  "fawn",
];

const LEGACY_BASE_MARKER = [
  { id: "cheetah" },
  { id: "monkey" },
  { id: "black-panther" },
  { id: "koala" },
  { id: "tiger" },
  { id: "raccoon" },
  { id: "rhino" },
  { id: "elephant" },
  { id: "sheep" },
  { id: "pegasus" },
  { id: "wolf" },
  { id: "fawn" },
];

export {
  ANIMAL_DESTINY_DATA,
  ANIMAL_DESTINY_LIST,
  STAGE_KEY_TO_LABEL,
  STAGE_LABEL_TO_KEY,
  STAGE_KEY_TO_HANJA,
  STAGE_KEY_TO_ID,
  getProfileByStageKey,
  getProfileByStageLabel,
} from "@/components/fortune/animal-twelve/animalTwelveData";

export { ORDER, LEGACY_BASE_MARKER };
