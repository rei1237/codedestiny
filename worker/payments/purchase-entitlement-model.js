import mongoose from "mongoose";

// Purchase rights and service-specific execution rows have different identities.
// The built-in _id index is sufficient: every lookup is by the verified order.
const schema = new mongoose.Schema({
  entitlementId: { type: String, required: true },
  userId: { type: String, required: true },
  productId: { type: String, required: true },
  featureKey: { type: String, required: true },
  orderId: { type: String, required: true },
  paymentId: { type: String, required: true },
  requestId: { type: String, required: true },
  type: { type: String, enum: ["service_run"], required: true },
  status: { type: String, enum: ["granted", "refunded"], required: true },
  grantedAt: { type: Date, required: true },
  updatedAt: { type: Date, required: true },
}, { collection: "payment_entitlements", autoIndex: false, autoCreate: false });

export const PurchaseEntitlement = mongoose.models.PurchaseEntitlement
  || mongoose.model("PurchaseEntitlement", schema);
