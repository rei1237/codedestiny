import { redirect } from "next/navigation";
import { ROBOTS_META } from "../../../lib/seo/index-policy.mjs";

export const metadata = {
  alternates: {
    canonical: "https://code-destiny.com/saju/animal-destiny",
  },
  robots: ROBOTS_META.NOINDEX_FOLLOW,
};

export default function AnimalTestAliasPage() {
  redirect("/saju/animal-destiny");
}
