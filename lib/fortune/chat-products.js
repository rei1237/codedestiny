// Shared identity only; prices and access remain server registry responsibilities.
export const CHAT_FEATURE_KEY = 'fortune-chat-consultation';
export const CHAT_QUESTION_FISH = Object.freeze(['mackerel','salmon','flounder','tuna']);
export const chatQuestionFeatureKey = fish => 'fortune-chat-question-' + fish;
export const CHAT_FEATURE_KEYS = Object.freeze([CHAT_FEATURE_KEY, ...CHAT_QUESTION_FISH.map(chatQuestionFeatureKey)]);
export const isChatFeatureKey = key => CHAT_FEATURE_KEYS.includes(key);
