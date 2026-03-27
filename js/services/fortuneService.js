/**
 * Fortune / Tarot / Dream UI entry facade.
 * Delegates to legacy window.* implementations — no algorithm or API changes.
 * @see window.sajuService for computeProfileForModal and related saju helpers.
 */

function delegate(name) {
  return function delegated(...args) {
    var fn = typeof window !== 'undefined' ? window[name] : null;
    if (typeof fn === 'function') {
      return fn.apply(window, args);
    }
    return undefined;
  };
}

export const openTarotModal = delegate('openTarotModal');
export const openTarotLoveModal = delegate('openTarotLoveModal');
export const openTarotHealingModal = delegate('openTarotHealingModal');
export const openTarotReunionModal = delegate('openTarotReunionModal');
export const openTarotReunionCardLightbox = delegate('openTarotReunionCardLightbox');
export const openTarotYearFortuneModal = delegate('openTarotYearFortuneModal');
export const openTarotSelfEsteemModal = delegate('openTarotSelfEsteemModal');
export const openDreamModal = delegate('openDreamModal');
export const openPsychoDreamModal = delegate('openPsychoDreamModal');
export const openPhysiognomyApp = delegate('openPhysiognomyApp');
export const openMbtiModal = delegate('openMbtiModal');
export const openHwatuModal = delegate('openHwatuModal');
export const openDestinyFlowerStudio = delegate('openDestinyFlowerStudio');
export const openDestinyFlower = delegate('openDestinyFlower');
export const openAstrologyFlower = delegate('openAstrologyFlower');
export const openJamidusuFlower = delegate('openJamidusuFlower');
export const openSukuyoFlower = delegate('openSukuyoFlower');
export const openAstrologyFlowerStudio = delegate('openAstrologyFlowerStudio');
export const openJamidusuFlowerStudio = delegate('openJamidusuFlowerStudio');
export const openSukuyoFlowerStudio = delegate('openSukuyoFlowerStudio');
export const openAnimalTotemModal = delegate('openAnimalTotemModal');
export const openSajuAnimalPage = delegate('openSajuAnimalPage');

if (typeof window !== 'undefined') {
  window.fortuneService = Object.assign(window.fortuneService || {}, {
    openTarotModal,
    openTarotLoveModal,
    openTarotHealingModal,
    openTarotReunionModal,
    openTarotReunionCardLightbox,
    openTarotYearFortuneModal,
    openTarotSelfEsteemModal,
    openDreamModal,
    openPsychoDreamModal,
    openPhysiognomyApp,
    openMbtiModal,
    openHwatuModal,
    openDestinyFlowerStudio,
    openDestinyFlower,
    openAstrologyFlower,
    openJamidusuFlower,
    openSukuyoFlower,
    openAstrologyFlowerStudio,
    openJamidusuFlowerStudio,
    openSukuyoFlowerStudio,
    openAnimalTotemModal,
    openSajuAnimalPage,
  });
}
