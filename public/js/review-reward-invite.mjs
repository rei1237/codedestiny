import { reviewRewardCopy, reviewRewardLabel } from "./review-reward-copy.mjs";

const invite = document.getElementById("cdReviewInvite");
if (invite) {
  invite.querySelectorAll("[data-review-copy]").forEach((element) => {
    element.textContent = reviewRewardCopy[element.dataset.reviewCopy] || element.textContent;
  });
  fetch("/api/reviews/products", { headers: { accept: "application/json" } })
    .then(async (response) => response.ok ? response.json() : null)
    .then((data) => {
      invite.querySelector("[data-review-reward]").textContent = reviewRewardLabel(data?.rewardPolicy);
    })
    .catch(() => {});
}
