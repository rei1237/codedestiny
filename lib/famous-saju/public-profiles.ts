import profiles from './public-profile-records.json';

// Source-backed profile drafts join the existing archive. They do not grant
// editorial approval, a verified hour pillar, indexing, or advertising consent.
export const publicProfiles = profiles;
const bySlug = new Map(publicProfiles.map(profile => [profile.slug, profile]));
export function getPublicProfile(slug: string) {
  return bySlug.get(slug) || null;
}
