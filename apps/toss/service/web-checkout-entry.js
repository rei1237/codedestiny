// Toss review forbids external payment, so the web checkout runtime
// (js/core/checkout-entry.js: PortOne direct payment, pass store, payment
// choice UI) is never bundled here. billing-client and usePayment are already
// Toss adapters; shared hooks only reach the three members below.
// - Paid resume handlers run only after a web PG redirect, which never
//   returns to this shell, so registration has nothing to resume.
// - Paid grant receipts are written only by the web direct-payment flow,
//   so this shell never holds one to consume.
// Add a member only after confirming its Toss behavior; never re-export the web module.
const checkoutEntry=Object.freeze({
 registerPaidResumeHandler:()=>false,
 unregisterPaidResumeHandler:()=>false,
 consumePaidGrantReceipt:()=>null,
});
export default checkoutEntry;
