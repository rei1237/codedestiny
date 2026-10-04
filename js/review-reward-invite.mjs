import { reviewRewardCopy, reviewRewardLabel, paidReviewCopy, reviewRewardWorthLabel, REVIEW_WRITE_URL } from "./review-reward-copy.mjs";

// Result renderers call this only after an authorized consultation is complete.
// Keep writing a review optional; the invitation never blocks the saved result.
export function mountPaidReviewInvite({ host, completed, paid, locale = 'ko' }) {
  host?.querySelector('[data-paid-review-invite]')?.remove();
  if (!host?.isConnected || completed !== true || paid !== true) return false;
  const copy = paidReviewCopy('ggulggul', locale);
  const section = document.createElement('section');
  section.className = 'cd-review-invite cd-review-invite--result';
  section.dataset.paidReviewInvite = ''; section.dataset.reviewCharacter = 'ggulggul';
  section.setAttribute('aria-label', locale === 'ko' ? '연이의 상담 후기 안내' : 'Yeoni’s review invitation');
  const text = document.createElement('div'); text.className = 'cd-review-invite__copy';
  const heading = document.createElement('h2'); heading.textContent = copy.title;
  const description = document.createElement('p'); description.textContent = copy.description;
  const reward = document.createElement('p'); reward.className = 'cd-review-invite__reward'; reward.setAttribute('aria-live', 'polite');
  reward.textContent = locale === 'ko' ? reviewRewardCopy.fallbackReward : 'Moonstones after publication approval';
  const detail = document.createElement('p'); detail.className = 'cd-review-invite__detail'; detail.textContent = copy.detail;
  const action = document.createElement('a'); action.className = 'cd-review-invite__action'; action.href = REVIEW_WRITE_URL; action.textContent = copy.action;
  text.append(heading, description, reward, detail, action);
  const image = document.createElement('img'); image.className = 'cd-review-invite__image'; image.src = copy.image; image.alt = copy.name; image.width = 240; image.height = 240; image.loading = 'lazy';
  section.append(text, image); host.appendChild(section);
  const krwPerStone = Number(document.getElementById('cdReviewInvite')?.dataset.reviewKrwPerStone);
  fetch('/api/reviews/products', { headers: { accept: 'application/json' } })
    .then(response => response.ok ? response.json() : null)
    .then(data => {
      if (!section.isConnected) return;
      const policy = data?.rewardPolicy;
      reward.textContent = locale === 'ko' ? reviewRewardLabel(policy) : policy?.currency === 'moonstone' && policy?.trigger === 'approved' && Number.isSafeInteger(policy?.amount) && policy.amount > 0 ? `${policy.amount} moonstones after publication approval` : 'Moonstones after publication approval';
      const worth = reviewRewardWorthLabel(policy, krwPerStone, locale);
      if (worth) reward.appendChild(document.createTextNode(` · ${worth}`));
    }).catch(() => {});
  return true;
}

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
