import type { ZiweiPremiumReportData } from "@/app/_lib/ziwei/premium/types";
import Chapter1_MyungpanOverview from "./Chapter1_MyungpanOverview";
import Chapter2_MyungShin from "./Chapter2_MyungShin";
import Chapter3_FourTransformations from "./Chapter3_FourTransformations";
import Chapter4_MainStars from "./Chapter4_MainStars";
import Chapter5_AssistAndKillerStars from "./Chapter5_AssistAndKillerStars";
import Chapter6_WealthCareer from "./Chapter6_WealthCareer";
import Chapter7_RelationshipFamily from "./Chapter7_RelationshipFamily";
import Chapter8_MoveHome from "./Chapter8_MoveHome";
import Chapter9_Network from "./Chapter9_Network";
import Chapter10_MindAndParents from "./Chapter10_MindAndParents";
import Chapter11_Health from "./Chapter11_Health";
import Chapter12_DecadeFlow from "./Chapter12_DecadeFlow";
import Chapter13_YearRoadmap from "./Chapter13_YearRoadmap";
import Chapter14_MasterPlan from "./Chapter14_MasterPlan";
import Chapter15_FinalStrategy from "./Chapter15_FinalStrategy";

type Props = {
  report: ZiweiPremiumReportData | null | undefined;
};

export default function ZiweiPremiumPdfBuilder({ report }: Props) {
  const chapters = report?.chapters;

  return (
    <article>
      <Chapter1_MyungpanOverview chapter={chapters?.I} />
      <Chapter2_MyungShin chapter={chapters?.II} />
      <Chapter3_FourTransformations chapter={chapters?.III} />
      <Chapter4_MainStars chapter={chapters?.IV} />
      <Chapter5_AssistAndKillerStars chapter={chapters?.V} />
      <Chapter6_WealthCareer chapter={chapters?.VI} />
      <Chapter7_RelationshipFamily chapter={chapters?.VII} />
      <Chapter8_MoveHome chapter={chapters?.VIII} />
      <Chapter9_Network chapter={chapters?.IX} />
      <Chapter10_MindAndParents chapter={chapters?.X} />
      <Chapter11_Health chapter={chapters?.XI} />
      <Chapter12_DecadeFlow chapter={chapters?.XII} />
      <Chapter13_YearRoadmap chapter={chapters?.XIII} />
      <Chapter14_MasterPlan chapter={chapters?.XIV} />
      <Chapter15_FinalStrategy chapter={chapters?.XV} />
    </article>
  );
}
