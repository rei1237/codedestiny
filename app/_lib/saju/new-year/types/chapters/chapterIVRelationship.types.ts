import type { SajuNewYearChapterBase } from "../common.types";

export type SajuNewYearChapterIVSections = {
  yearlyRelationshipOverview?: string;
  friendsColleaguesByBigyeonGeopjae?: string;
  seniorsOrgByGwansung?: string;
  mentorsByInseong?: string;
  practicalNetworkByJaeseong?: string;
  communicationBySiksang?: string;
  helpfulPeopleType?: string;
  peopleToDistanceFrom?: string;
  collaborationLuck?: string;
  businessPartnershipLuck?: string;
  conflictPotential?: string;
  misunderstandingTiming?: string;
  noblemanTiming?: string;
  relationshipResetTiming?: string;
  oneLineAdvice?: string;
};

export type SajuNewYearChapterIVRelationship = SajuNewYearChapterBase<
  "IV",
  SajuNewYearChapterIVSections
>;
