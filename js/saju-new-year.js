(function () {
  "use strict";

  function openNewYearAiConsultation() {
    window.location.assign("/new-year-ai-consultation");
    return true;
  }

  window.openSajuNewYearModal = openNewYearAiConsultation;
  window.generateSajuNewYear = openNewYearAiConsultation;
  window.confirmSajuNewYearPayment = openNewYearAiConsultation;
  window.downloadSajuNewYearPdf = openNewYearAiConsultation;
  window.closeSajuNewYearModal = function () { return true; };
})();
