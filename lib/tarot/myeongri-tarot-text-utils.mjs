const TEN_GOD_SUBJECTS = [
  "\ube44\uacac",
  "\uac81\uc7ac",
  "\uc2dd\uc2e0",
  "\uc0c1\uad00",
  "\ud3b8\uc7ac",
  "\uc815\uc7ac",
  "\ud3b8\uad00",
  "\uc815\uad00",
  "\ud3b8\uc778",
  "\uc815\uc778",
];

const ELEMENT_SUBJECTS = [
  "\ubaa9",
  "\ud654",
  "\ud1a0",
  "\uae08",
  "\uc218",
  "\ubaa9\uae30\uc6b4",
  "\ud654\uae30\uc6b4",
  "\ud1a0\uae30\uc6b4",
  "\uae08\uae30\uc6b4",
  "\uc218\uae30\uc6b4",
];

const TAROT_SUBJECTS = [
  "The Fool",
  "The Magician",
  "The High Priestess",
  "The Empress",
  "The Emperor",
  "The Hierophant",
  "The Lovers",
  "The Chariot",
  "Strength",
  "The Hermit",
  "Wheel of Fortune",
  "Justice",
  "The Hanged Man",
  "Death",
  "Temperance",
  "The Devil",
  "The Tower",
  "The Star",
  "The Moon",
  "The Sun",
  "Judgement",
  "The World",
  "\ubc14\ubcf4",
  "\ub9c8\ubc95\uc0ac",
  "\uc5ec\uc0ac\uc81c",
  "\uc5ec\ud669\uc81c",
  "\ud669\uc81c",
  "\uad50\ud669",
  "\uc5f0\uc778",
  "\uc804\ucc28",
  "\ud798",
  "\uc740\ub454\uc790",
  "\uc6b4\uba85\uc758 \ubc14\ud034",
  "\uc815\uc758",
  "\ub9e4\ub2ec\ub9b0 \uc0ac\ub78c",
  "\uc8fd\uc74c",
  "\uc808\uc81c",
  "\uc545\ub9c8",
  "\ud0d1",
  "\ubcc4",
  "\ub2ec",
  "\ud0dc\uc591",
  "\uc2ec\ud310",
  "\uc138\uacc4",
];

const SUBJECT_PARTICLES = [
  "\uc5d0\uc11c",
  "\uc73c\ub85c",
  "\uc740",
  "\ub294",
  "\uc774",
  "\uac00",
  "\uc744",
  "\ub97c",
  "\uc758",
  "\uc5d0",
  "\ub85c",
];

function toText(value) {
  return String(value || "").trim();
}

function escapeRegExp(value) {
  return toText(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function uniqueTextList(values) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    const text = toText(value);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    result.push(text);
  }
  return result;
}

function normalizeDuplicatedSubjectParticles(value, options = {}) {
  const source = String(value || "");
  if (!source) return "";

  const subjects = uniqueTextList([
    ...TEN_GOD_SUBJECTS,
    ...ELEMENT_SUBJECTS,
    ...TAROT_SUBJECTS,
    ...(Array.isArray(options.subjects) ? options.subjects : []),
    ...(Array.isArray(options.tarotNames) ? options.tarotNames : []),
  ]).sort((a, b) => b.length - a.length);

  if (!subjects.length) return source;

  const particlePattern = SUBJECT_PARTICLES.map(escapeRegExp).join("|");
  let next = source;

  for (const subject of subjects) {
    const subjectPattern = escapeRegExp(subject).replace(/\\ /g, "\\s+");
    const nounPhrasePattern = `${subjectPattern}(?:\\s+\\uCE74\\uB4DC)?`;
    const duplicatePattern = new RegExp(
      `(^|[\\s"'\\(\\[{])(${nounPhrasePattern})\\s*(${particlePattern})\\s+\\2\\s*\\3(?=\\s|[.,!?;:\\u3002\\uFF0C\\uFF01\\uFF1F]|$)`,
      "giu",
    );
    let previous = "";
    while (previous !== next) {
      previous = next;
      next = next.replace(duplicatePattern, "$1$2$3");
    }
  }

  return next;
}

function normalizeDuplicatedSubjectParagraphs(value, options = {}) {
  return String(value || "")
    .split(/(\n{2,})/g)
    .map((part) => (/\n{2,}/.test(part) ? part : normalizeDuplicatedSubjectParticles(part, options)))
    .join("");
}

export {
  TEN_GOD_SUBJECTS,
  ELEMENT_SUBJECTS,
  TAROT_SUBJECTS,
  SUBJECT_PARTICLES,
  normalizeDuplicatedSubjectParticles,
  normalizeDuplicatedSubjectParagraphs,
};
