export const FOLLOWUP_FEATURE_REGISTRY = Object.freeze([
  Object.freeze({ id: "yeongnyangi", prompt: "warm", context: "continuation", route: "requests/:id/conversation", source: "worker/yeongnyangi/question-followup.ts" }),
  Object.freeze({ id: "fortune-chat", prompt: "warm", context: "continuation", route: "consultations/:id/conversation", source: "worker/routes/fortune-chat-consultations.js" }),
  Object.freeze({ id: "love-secret", prompt: "warm", context: "compact", route: "love-secret-ai/message", source: "worker/lib/love-secret-ai-prompt.js" }),
  Object.freeze({ id: "karma-destiny", prompt: "warm", context: "compact", route: "karma-destiny-ai/message", source: "worker/routes/karma-destiny-ai.js" }),
  Object.freeze({ id: "fortune-tea-house", prompt: "warm", context: "single", route: "fortune-tea-house/results/:id/follow-up", source: "worker/routes/fortune-tea-house.js" }),
  Object.freeze({ id: "neo-operation-room", prompt: "tactical", context: "bounded", route: "neo-operation-room/refine", source: "worker/lib/neo-operation-room-prompt.js" }),
]);

export function followupFeature(id) {
  return FOLLOWUP_FEATURE_REGISTRY.find((entry) => entry.id === id);
}
