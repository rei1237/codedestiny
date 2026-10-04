// Validate saved display data before selecting a component that expects a full
// report. Incomplete snapshots stay available through the structural reader;
// this module never fills missing fields or recalculates a result.
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const string = value => typeof value === 'string';
const number = value => typeof value === 'number' && Number.isFinite(value);
const array = (value, check, minimum = 0) => Array.isArray(value) && value.length >= minimum && Array.from(value).every(check);
const strings = value => array(value, string);
const fields = (value, names, check = string) => object(value) && names.every(name => check(value[name]));
const optionalString = value => value === undefined || string(value);
const elements = ['wood', 'fire', 'earth', 'metal', 'water'];
const element = value => elements.includes(value);
const distribution = value => fields(value, elements, number);

function detailedTabs(value) {
  return array(value, tab => fields(tab, ['id', 'label', 'shortLabel', 'title']) &&
    strings(tab.keywords) && array(tab.sections, section =>
      fields(section, ['title', 'text']) && strings(section.usedSignals) && optionalString(section.action)));
}

/** The legacy archive renders only its main card, element chart and sections. */
export function isStoredBiasViewModel(value) {
  return fields(value, [
    'userName', 'biasName', 'auraType', 'auraMaterial', 'energyColor',
    'oneLineDestinyMessage', 'chemistrySummary', 'biasPersonalityReport',
    'cheerPoint', 'todayMission', 'cardCaption', 'chemistryType', 'destinyId', 'issuedAt',
  ]) && number(value.totalScore) && strings(value.stageChemistryKeywords) &&
    detailedTabs(value.detailedTabs) && object(value.elementDistribution) &&
    distribution(value.elementDistribution.user) && distribution(value.elementDistribution.favorite) &&
    object(value.sajuSignals) && ['harmonySignals', 'conflictSignals', 'charmSignals', 'longTermSignals']
      .every(key => strings(value.sajuSignals[key]));
}

function completeViewModel(value) {
  return isStoredBiasViewModel(value) && strings(value.moodKeywords) && string(value.destinyGrade) &&
    fields(value, ['emotionalScore', 'fandomScore', 'longTermScore', 'supportStyleScore'], number) &&
    fields(value.birthDataStatus, ['user', 'favorite']) &&
    fields(value.fandomProfile, [
      'biasCharacterTitle', 'biasCharacterOneLiner', 'entryType', 'entryText',
      'tasteFirstAttraction', 'tasteLongTermReason', 'deepDivePattern', 'deepDiveText',
      'relationshipLens', 'relationshipText', 'obsessionPoint', 'obsessionText',
      'persistenceIntensity', 'persistenceDuration', 'persistenceText',
      'detachmentReason', 'detachmentReasonText', 'detachmentStyle', 'detachmentStyleText', 'finalPhilosophy',
    ]) && object(value.mzLayer) && fields(value.mzLayer.relationMbti, ['type', 'desc']) &&
    fields(value.mzLayer.pastLife, ['title', 'story']) && string(value.mzLayer.gradeMeme) &&
    strings(value.mzLayer.hashtags);
}

function pillars(value) {
  return object(value) && ['year', 'month', 'day'].every(key =>
    fields(value[key], ['ganji', 'ganjiHanja'])) && distribution(value.elementCounts) &&
    element(value.strongest) && element(value.weakest);
}

function result(value) {
  return fields(value, [
    'chemiTypeId', 'chemiTypeNameKo', 'chemiTypeShortKo', 'chemiTypeRuleKo',
    'engineVersion', 'rulesVersion', 'rosterVersion', 'inputHash',
  ]) && fields(value.partner, ['kind', 'id', 'displayName', 'groupLabel']) &&
    (value.partner.groupId === null || string(value.partner.groupId)) &&
    object(value.pillars) && pillars(value.pillars.user) && pillars(value.pillars.partner) &&
    strings(value.matchedSignalKeys) && array(value.signals, signal =>
      fields(signal, ['key', 'evidenceKo']) && ['harmony', 'friction', 'neutral'].includes(signal.tone) && number(signal.weight));
}

function copy(value) {
  return fields(value, ['oneLiner']) && array(value.points, point =>
    fields(point, ['label', 'text', 'evidenceKo']), 1) &&
    fields(value.scenario, ['label', 'setting', 'text']) &&
    fields(value.caution, ['label', 'text', 'evidenceKo']) &&
    fields(value.finish, ['label', 'text']) && strings(value.notices);
}

/** All four Chemi readers, including expandable fandom/meme/evidence panels. */
export function isStoredChemiReport(value) {
  return fields(value, ['grade', 'gradeTitle', 'serial', 'issuedAt']) &&
    number(value.totalScore) && typeof value.minorMode === 'boolean' &&
    array(value.subScores, score => fields(score, ['key', 'label']) && number(score.value), 1) &&
    result(value.result) && copy(value.copy) && completeViewModel(value.vm);
}
