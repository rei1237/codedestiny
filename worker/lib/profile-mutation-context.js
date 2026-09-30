export function profileMutationAction(value) {
  const actions = { create: "create", profile_card_add_extra: "create", profile_card_create: "create", update: "update", profile_card_update: "update", delete: "delete", profile_card_delete: "delete" };
  const key = String(value || "").trim();
  return Object.prototype.hasOwnProperty.call(actions, key) ? actions[key] : "";
}

// New writers bind the operation before charging. Legacy rows must match their original request prefix.
export function profileMutationMetadata({ featureKey, profileId, purchaseId, action }) {
  if (featureKey !== "profile-card-manage") return {};
  const normalized = profileMutationAction(action);
  if (!normalized || !profileId || !purchaseId) return null;
  return { profileAction: normalized, profileId: String(profileId), requestId: String(purchaseId) };
}
