// Review-only text export. No credentials, network calls or Console updates.
import { pathToFileURL } from 'node:url';
import { listAppContentTiers } from '../worker/lib/app-store-pricing.js';
import { CURRENT_PASS_GOOGLE_PLAY_APPROVED_PRODUCT_IDS, currentPassPlan } from '../lib/payment/pass-policy.js';
import { calculateKrwAmountFromCoins } from '../worker/lib/billing-policy.js';

const locales = {
  'ko-KR': {
    title: '운세·상담 콘텐츠', one: '선택한 운세·상담 콘텐츠 1건의 단건 결제입니다. 실제 결제 금액은 Google Play 결제창에서 확인해 주세요.',
    passes: ['작은 꿀단지', '중간 꿀단지', '큰 꿀단지'],
    pass: (coverage, limit) => `이용권 대상 콘텐츠 중 건당 ${coverage} KRW 이하를 총 ${limit} KRW 상당까지 이용합니다. 구매 가격과 이용 한도는 다릅니다. 기간 제한 없이 한도를 모두 사용하면 종료되며 자동 갱신되지 않습니다.`,
  },
  'en-US': {
    title: 'Fortune & consultation content', one: 'One-time purchase of the selected fortune or consultation content. Check the final charge in Google Play before paying.',
    passes: ['Small Honey Jar', 'Medium Honey Jar', 'Large Honey Jar'],
    pass: (coverage, limit) => `Access eligible content valued at up to KRW ${coverage} per use, with a total allowance equivalent to KRW ${limit}. The allowance is not the purchase price. No time limit; ends when the allowance is used. Does not renew automatically.`,
  },
  'ja-JP': {
    title: '占い・相談コンテンツ', one: '選択した占い・相談コンテンツ1件の都度購入です。お支払い前にGoogle Playで最終金額をご確認ください。',
    passes: ['小さなはちみつ壺', '中くらいのはちみつ壺', '大きなはちみつ壺'],
    pass: (coverage, limit) => `利用券の対象コンテンツのうち1回${coverage} KRW以下のものを、合計${limit} KRW相当まで利用できます。利用上限と購入価格は異なります。有効期間の制限はなく、上限を使い切ると終了します。自動更新はありません。`,
  },
  'zh-CN': {
    title: '运势与咨询内容', one: '一次性购买所选的单项运势或咨询内容。付款前请在Google Play确认最终金额。',
    passes: ['小蜂蜜罐', '中蜂蜜罐', '大蜂蜜罐'],
    pass: (coverage, limit) => `可使用单次价值不超过${coverage} KRW的适用内容，累计额度相当于${limit} KRW。使用额度不等于购买价格。无使用期限，额度用完后结束，不会自动续费。`,
  },
  'zh-TW': {
    title: '運勢與諮詢內容', one: '一次性購買所選的單項運勢或諮詢內容。付款前請在Google Play確認最終金額。',
    passes: ['小蜂蜜罐', '中蜂蜜罐', '大蜂蜜罐'],
    pass: (coverage, limit) => `可使用單次價值不超過${coverage} KRW的適用內容，累計額度相當於${limit} KRW。使用額度不等於購買價格。無使用期限，額度用完後結束，不會自動續費。`,
  },
};

export function buildLocalizedListings() {
  const content = listAppContentTiers().map(({ productId, amountKRW }) => ({
    productId, referencePriceKRW: amountKRW,
    listings: Object.fromEntries(Object.entries(locales).map(([locale, copy]) => [locale, { title: copy.title, description: copy.one }])),
  }));
  const passes = ['standard', 'premium', 'vvip'].map((tier, index) => {
    const plan = currentPassPlan(tier);
    const productId = plan.appProductId;
    if (!CURRENT_PASS_GOOGLE_PLAY_APPROVED_PRODUCT_IDS.includes(productId)) throw new Error(`Unapproved product: ${productId}`);
    return {
      productId, referencePriceKRW: plan.wonPrice,
      listings: Object.fromEntries(Object.entries(locales).map(([locale, copy]) => [locale, {
        title: copy.passes[index],
        description: copy.pass(calculateKrwAmountFromCoins(plan.maxCoveredCoin).toLocaleString(locale), calculateKrwAmountFromCoins(plan.monthlyLimitCoin).toLocaleString(locale)),
      }])),
    };
  });
  return { mode: 'review-only', note: 'Text proposals only. Preserve existing prices, purchase options and product IDs. Do not run the legacy bulk creation script to apply these texts.', products: [...content, ...passes] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.stdout.write(JSON.stringify(buildLocalizedListings(), null, 2) + '\n');
}
