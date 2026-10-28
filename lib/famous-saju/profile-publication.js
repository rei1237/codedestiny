import profiles from './public-profile-records.json' with { type: 'json' };

// Publication approval is independent of a verified birth time/calendar and of
// the historical human-authored editorial registry. It never enables ads.
/**
 * @param {(typeof profiles)[number] | null | undefined} profile
 * @returns {profile is (typeof profiles)[number] & { publication: { publishedAt: string } }}
 */
export function isProfilePublished(profile) {
  return Boolean(profile?.publication?.status === 'approved'
    && profile.publication.approvedBy && profile.publication.approvedAt
    && profile.publication.publishedAt && profile.publication.updatedAt
    && profile.question && profile.career && profile.reading
    && profile.sources?.some(source => /생년월일|출생/.test(source.label))
    && profile.sources?.some(source => /활동/.test(source.label)));
}

export function getPublishedProfiles() {
  return profiles.filter(isProfilePublished);
}

export function getPublishedProfile(slug) {
  return getPublishedProfiles().find(profile => profile.slug === slug) || null;
}
