const express = require("express");

const router = express.Router();

const DEPRECATED_PAYMENT_MESSAGE =
  "Legacy server-side PortOne V1 payment routes are deprecated. " +
  "Use the Worker-native /api/payments/* endpoints.";

router.all("*", (req, res) => {
  return res.status(410).json({
    code: "PAYMENTS_V1_LEGACY_DEPRECATED",
    message: DEPRECATED_PAYMENT_MESSAGE,
    requestPath: req.path,
  });
});

module.exports = router;
