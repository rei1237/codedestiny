// Shared identity only; prices and access remain server registry responsibilities.
export const CHAT_DOMAINS=Object.freeze(['saju','ziwei','sukuyo','vedic','astrology','tarot']);
export const CHAT_FEATURE_KEY = 'fortune-chat-consultation';
export const CHAT_QUESTION_FISH = Object.freeze(['mackerel','salmon','flounder','tuna']);
export const chatFishForDomain=domain=>CHAT_DOMAINS.includes(domain)?CHAT_QUESTION_FISH.filter(fish=>fish!=='tuna'||['saju','ziwei','vedic'].includes(domain)):[];
export const chatProductId=(domain,fish)=>CHAT_DOMAINS.includes(domain)&&(fish===undefined||chatFishForDomain(domain).includes(fish))?'chat_'+domain+(fish?'_'+fish:''):'';
export const CHAT_PRODUCT_IDS=Object.freeze(CHAT_DOMAINS.flatMap(domain=>[chatProductId(domain),...chatFishForDomain(domain).map(fish=>chatProductId(domain,fish))]));
export const chatQuestionFeatureKey = fish => 'fortune-chat-question-' + fish;
export const CHAT_FEATURE_KEYS = Object.freeze([CHAT_FEATURE_KEY, ...CHAT_QUESTION_FISH.map(chatQuestionFeatureKey)]);
export const isChatFeatureKey = key => CHAT_FEATURE_KEYS.includes(key);
