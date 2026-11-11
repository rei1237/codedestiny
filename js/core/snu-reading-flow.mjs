import { SNU_SAJU_FEATURES } from './snu-campus-policy.mjs';

export const SNU_READING_URL = '/ggulggul/?action=cdOneStepFreeSajuEntry&entry=snulife';

export function hasCompleteSnuGift(state) {
  return Boolean(state?.verified && state.profileId && SNU_SAJU_FEATURES.every(({ featureKey }) => state.unlockedFeatureKeys?.includes(featureKey)));
}

// Both inputs must have just been read from the signed-in account's server endpoints.
// This chooses a presentation profile; content APIs still enforce every entitlement.
export function resolveSnuReadingProfile(state, profiles) {
  if (!state?.verified || !state.profileId || !Array.isArray(profiles)) return null;
  return profiles.find(profile => String(profile.id || profile.profileId || '') === String(state.profileId)) || null;
}

export function mountSnuReadingContents(document, state, profile) {
  // Entitlements still come from the server; everyone uses the same reading navigation.
  document.getElementById('snuReadingContents')?.remove();
}
