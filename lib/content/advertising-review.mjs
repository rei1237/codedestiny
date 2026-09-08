import { canLoadAdsenseForCanonicalUrl } from "../../app/components/adsense-route-policy.js";
import { hasAdvertisingReview } from "./editorial-review.mjs";

// Route eligibility and actual publication approval are independent requirements.
export function canServeReviewedAdsense(pathname, canonicalHref, currentHref, records) {
  return canLoadAdsenseForCanonicalUrl(pathname, canonicalHref, currentHref)
    && hasAdvertisingReview(pathname, records);
}
