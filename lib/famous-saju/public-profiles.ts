import profiles from './public-profile-records.json';

// Source-backed profiles join the existing archive. Publication approval is
// separate from birth classification, human authorship, and advertising consent.
export const publicProfiles = profiles;
const bySlug = new Map(publicProfiles.map(profile => [profile.slug, profile]));
export function getPublicProfile(slug: string) {
  return bySlug.get(slug) || null;
}
