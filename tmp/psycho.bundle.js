(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // js/psycho-dream-analyzer-freuds-study.js
  var require_psycho_dream_analyzer_freuds_study = __commonJS({
    "js/psycho-dream-analyzer-freuds-study.js"() {
      (function() {
        var OVERLAY_ID = "psychoDreamModalOverlay";
        var TEXTAREA_ID = "psychoDreamInput";
        var INPUT_SCREEN_ID = "psychoDreamInputScreen";
        var LOADING_SCREEN_ID = "psychoDreamLoadingScreen";
        var RESULT_SCREEN_ID = "psychoDreamResultScreen";
        var LOADER_TEXT_ID = "psychoDreamLoaderText";
        var ERROR_ID = "psychoDreamError";
        var RESULT_MARKDOWN_ID = "psychoDreamResultMarkdown";
        var REPORT_META_ID = "psychoDreamReportMeta";
        var WIZARD_LINE_ID = "psychoDreamWizardLine";
        var PSYCHO_DREAM_TEXT_TRANSLATIONS = {
          ko: {
            loadingMessages: ["\uBB34\uC758\uC2DD\uC758 \uBC29\uC744 \uD0D0\uC0C9 \uC911\uC785\uB2C8\uB2E4...", "\uBC15\uC0AC\uC758 \uC18C\uACAC\uC744 \uC815\uB9AC\uD558\uACE0 \uC788\uC2B5\uB2C8\uB2E4...", "\uC0C1\uC9D5\uC744 \uB514\uCF54\uB529 \uC911\uC785\uB2C8\uB2E4..."],
            freudQuotes: [
              "\uAFC8\uC740 \uBB34\uC758\uC2DD\uC73C\uB85C \uAC00\uB294 \uC655\uB3C4\uC785\uB2C8\uB2E4.",
              "\uC5B5\uC555\uB41C \uAC10\uC815\uC740 \uC0AC\uB77C\uC9C0\uC9C0 \uC54A\uACE0 \uB2E4\uB978 \uD615\uD0DC\uB85C \uB418\uB3CC\uC544\uC635\uB2C8\uB2E4.",
              "\uC790\uC544\uB294 \uC790\uC2E0\uC758 \uC9D1\uC5D0\uC11C\uB3C4 \uC8FC\uC778\uC774 \uC544\uB2D9\uB2C8\uB2E4.",
              "\uC0AC\uB791\uD558\uACE0 \uC77C\uD558\uB294 \uB2A5\uB825\uC740 \uC131\uC219\uD568\uC758 \uD45C\uC9C0\uC785\uB2C8\uB2E4.",
              "\uC6B0\uB9AC\uB294 \uACE0\uD1B5\uC744 \uAE30\uC5B5\uBCF4\uB2E4 \uBC18\uBCF5\uC73C\uB85C \uB354 \uBD84\uBA85\uD788 \uB4DC\uB7EC\uB0C5\uB2C8\uB2E4.",
              "\uB9D0\uD574\uC9C0\uC9C0 \uBABB\uD55C \uAC10\uC815\uC740 \uC99D\uC0C1\uC73C\uB85C \uB9D0\uD558\uB824 \uD569\uB2C8\uB2E4."
            ],
            resultTitle: "\uBD84\uC11D \uACB0\uACFC",
            validationRequired: "\uAFC8 \uB0B4\uC6A9\uC744 \uC785\uB825\uD574 \uC8FC\uC138\uC694.",
            validationMin: "\uC870\uAE08 \uB354 \uC790\uC138\uD788 \uC801\uC5B4 \uC8FC\uC138\uC694. (\uCD5C\uC18C 8\uC790)",
            serviceNotFound: "\uBD84\uC11D \uC11C\uBE44\uC2A4 \uACBD\uB85C\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uBC30\uD3EC\xB7\uB3C4\uBA54\uC778 \uC124\uC815\uC744 \uD655\uC778\uD574 \uC8FC\uC138\uC694.",
            serverNoResponse: "\uC11C\uBC84 \uC751\uB2F5\uC744 \uBC1B\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uB124\uD2B8\uC6CC\uD06C \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.",
            analysisFailed: "\uBD84\uC11D\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.",
            cached: "\uCE90\uC2DC\uB428",
            reportMeta: "\uC815\uC2E0\uBD84\uC11D \uB370\uC774\uD130 \uBD84\uC11D",
            formatWarning: "\uC139\uC158 \uD615\uC2DD\uC740 \uC77C\uBD80 \uC790\uB3D9 \uC815\uB9AC\uB428",
            networkFailed: "\uB124\uD2B8\uC6CC\uD06C \uC624\uB958\uB85C \uBD84\uC11D\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.",
            timeout: "\uBD84\uC11D \uC694\uCCAD\uC774 \uC9C0\uC5F0\uB418\uC5B4 \uC2DC\uAC04\uC774 \uCD08\uACFC\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.",
            wizardHint: "\uD504\uB85C\uC774\uD2B8 \uBC15\uC0AC\uC758 \uC18C\uACAC\uC744 \uBC1B\uC744 \uC900\uBE44\uAC00 \uB418\uC168\uB098\uC694?",
            shareMissing: "\uACF5\uC720\uD560 \uBD84\uC11D \uACB0\uACFC\uAC00 \uC544\uC9C1 \uC5C6\uC2B5\uB2C8\uB2E4.",
            shareTitle: "\uC815\uC2E0\uBD84\uC11D \uD574\uBABD \uACB0\uACFC",
            clipboardCopied: "\uBD84\uC11D \uD14D\uC2A4\uD2B8\uB97C \uD074\uB9BD\uBCF4\uB4DC\uC5D0 \uBCF5\uC0AC\uD588\uC2B5\uB2C8\uB2E4.",
            copyPrompt: "\uC544\uB798 \uD14D\uC2A4\uD2B8\uB97C \uBCF5\uC0AC\uD558\uC138\uC694.",
            copyPromptOpened: "\uD14D\uC2A4\uD2B8 \uBCF5\uC0AC \uCC3D\uC744 \uC5F4\uC5C8\uC2B5\uB2C8\uB2E4.",
            shareUnavailable: "\uACF5\uC720 \uAE30\uB2A5\uC744 \uC0AC\uC6A9\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4."
          },
          en: {
            loadingMessages: ["Opening the room of the unconscious...", "Arranging the doctor's notes...", "Decoding the dream symbols..."],
            freudQuotes: [
              "Dreams open a royal road toward the unconscious.",
              "Repressed feelings return in another form.",
              "The self is not always master in its own house.",
              "The ability to love and work marks maturity.",
              "Pain often reveals itself through repetition.",
              "Unspoken emotion tries to speak through symptoms."
            ],
            resultTitle: "Analysis Result",
            validationRequired: "Please enter the dream you want to explore.",
            validationMin: "Please write a little more. (At least 8 characters)",
            serviceNotFound: "The analysis service path could not be found. Please check the deployment or domain settings.",
            serverNoResponse: "We could not read the server response. Please check the network and try again.",
            analysisFailed: "The analysis could not be completed.",
            cached: "cached",
            reportMeta: "Psychoanalytic dream data analysis",
            formatWarning: "Some section formatting was adjusted automatically",
            networkFailed: "The analysis failed because of a network error.",
            timeout: "The analysis request took too long. Please try again in a moment.",
            wizardHint: "Are you ready to receive the doctor's note?",
            shareMissing: "There is no analysis result to share yet.",
            shareTitle: "Psychoanalytic Dream Result",
            clipboardCopied: "The analysis text has been copied to the clipboard.",
            copyPrompt: "Copy the text below.",
            copyPromptOpened: "A copy window has been opened.",
            shareUnavailable: "Sharing is unavailable in this browser."
          },
          ja: {
            loadingMessages: ["\u7121\u610F\u8B58\u306E\u90E8\u5C4B\u3092\u305F\u3069\u3063\u3066\u3044\u307E\u3059...", "\u535A\u58EB\u306E\u6240\u898B\u3092\u6574\u3048\u3066\u3044\u307E\u3059...", "\u5922\u306E\u8C61\u5FB4\u3092\u8AAD\u307F\u89E3\u3044\u3066\u3044\u307E\u3059..."],
            freudQuotes: [
              "\u5922\u306F\u7121\u610F\u8B58\u3078\u5411\u304B\u3046\u738B\u9053\u3067\u3059\u3002",
              "\u6291\u5727\u3055\u308C\u305F\u611F\u60C5\u306F\u5225\u306E\u59FF\u3067\u623B\u3063\u3066\u304D\u307E\u3059\u3002",
              "\u81EA\u6211\u306F\u81EA\u5206\u306E\u5BB6\u3067\u3082\u5B8C\u5168\u306A\u4E3B\u4EBA\u3067\u306F\u3042\u308A\u307E\u305B\u3093\u3002",
              "\u611B\u3057\u50CD\u304F\u529B\u306F\u6210\u719F\u306E\u3057\u308B\u3057\u3067\u3059\u3002",
              "\u75DB\u307F\u306F\u8A18\u61B6\u3088\u308A\u53CD\u5FA9\u306E\u4E2D\u3067\u59FF\u3092\u898B\u305B\u307E\u3059\u3002",
              "\u8A9E\u3089\u308C\u306A\u304B\u3063\u305F\u611F\u60C5\u306F\u75C7\u72B6\u3068\u3057\u3066\u8A9E\u308D\u3046\u3068\u3057\u307E\u3059\u3002"
            ],
            resultTitle: "\u5206\u6790\u7D50\u679C",
            validationRequired: "\u5922\u306E\u5185\u5BB9\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
            validationMin: "\u3082\u3046\u5C11\u3057\u8A73\u3057\u304F\u66F8\u3044\u3066\u304F\u3060\u3055\u3044\u3002\uFF088\u6587\u5B57\u4EE5\u4E0A\uFF09",
            serviceNotFound: "\u5206\u6790\u30B5\u30FC\u30D3\u30B9\u306E\u7D4C\u8DEF\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3002\u30C7\u30D7\u30ED\u30A4\u307E\u305F\u306F\u30C9\u30E1\u30A4\u30F3\u8A2D\u5B9A\u3092\u3054\u78BA\u8A8D\u304F\u3060\u3055\u3044\u3002",
            serverNoResponse: "\u30B5\u30FC\u30D0\u30FC\u5FDC\u7B54\u3092\u53D7\u3051\u53D6\u308C\u307E\u305B\u3093\u3067\u3057\u305F\u3002\u901A\u4FE1\u72B6\u6CC1\u3092\u78BA\u8A8D\u3057\u3066\u3082\u3046\u4E00\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002",
            analysisFailed: "\u5206\u6790\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002",
            cached: "\u30AD\u30E3\u30C3\u30B7\u30E5\u6E08\u307F",
            reportMeta: "\u7CBE\u795E\u5206\u6790\u30C7\u30FC\u30BF\u89E3\u6790",
            formatWarning: "\u4E00\u90E8\u306E\u30BB\u30AF\u30B7\u30E7\u30F3\u5F62\u5F0F\u3092\u81EA\u52D5\u3067\u6574\u3048\u307E\u3057\u305F",
            networkFailed: "\u30CD\u30C3\u30C8\u30EF\u30FC\u30AF\u30A8\u30E9\u30FC\u306B\u3088\u308A\u5206\u6790\u306B\u5931\u6557\u3057\u307E\u3057\u305F\u3002",
            timeout: "\u5206\u6790\u30EA\u30AF\u30A8\u30B9\u30C8\u306B\u6642\u9593\u304C\u304B\u304B\u308A\u3059\u304E\u307E\u3057\u305F\u3002\u3057\u3070\u3089\u304F\u3057\u3066\u304B\u3089\u3082\u3046\u4E00\u5EA6\u304A\u8A66\u3057\u304F\u3060\u3055\u3044\u3002",
            wizardHint: "\u535A\u58EB\u306E\u6240\u898B\u3092\u53D7\u3051\u53D6\u308B\u6E96\u5099\u306F\u3067\u304D\u3066\u3044\u307E\u3059\u304B\uFF1F",
            shareMissing: "\u5171\u6709\u3067\u304D\u308B\u5206\u6790\u7D50\u679C\u304C\u307E\u3060\u3042\u308A\u307E\u305B\u3093\u3002",
            shareTitle: "\u7CBE\u795E\u5206\u6790\u5922\u8A3A\u65AD\u7D50\u679C",
            clipboardCopied: "\u5206\u6790\u30C6\u30AD\u30B9\u30C8\u3092\u30AF\u30EA\u30C3\u30D7\u30DC\u30FC\u30C9\u306B\u30B3\u30D4\u30FC\u3057\u307E\u3057\u305F\u3002",
            copyPrompt: "\u4E0B\u306E\u30C6\u30AD\u30B9\u30C8\u3092\u30B3\u30D4\u30FC\u3057\u3066\u304F\u3060\u3055\u3044\u3002",
            copyPromptOpened: "\u30B3\u30D4\u30FC\u7528\u306E\u30A6\u30A3\u30F3\u30C9\u30A6\u3092\u958B\u304D\u307E\u3057\u305F\u3002",
            shareUnavailable: "\u3053\u306E\u30D6\u30E9\u30A6\u30B6\u3067\u306F\u5171\u6709\u6A5F\u80FD\u3092\u4F7F\u7528\u3067\u304D\u307E\u305B\u3093\u3002"
          },
          "zh-CN": {
            loadingMessages: ["\u6B63\u5728\u63A2\u8BBF\u6F5C\u610F\u8BC6\u7684\u623F\u95F4...", "\u6B63\u5728\u6574\u7406\u535A\u58EB\u7684\u610F\u89C1...", "\u6B63\u5728\u89E3\u8BFB\u68A6\u4E2D\u7684\u8C61\u5F81..."],
            freudQuotes: [
              "\u68A6\u662F\u901A\u5F80\u6F5C\u610F\u8BC6\u7684\u738B\u9053\u3002",
              "\u88AB\u538B\u6291\u7684\u60C5\u7EEA\u4F1A\u4EE5\u53E6\u4E00\u79CD\u5F62\u6001\u56DE\u6765\u3002",
              "\u81EA\u6211\u5E76\u4E0D\u603B\u662F\u81EA\u5DF1\u5C4B\u4E2D\u7684\u4E3B\u4EBA\u3002",
              "\u7231\u4E0E\u5DE5\u4F5C\u7684\u80FD\u529B\uFF0C\u662F\u6210\u719F\u7684\u6807\u8BB0\u3002",
              "\u75DB\u82E6\u5E38\u5E38\u901A\u8FC7\u91CD\u590D\u663E\u9732\u51FA\u6765\u3002",
              "\u672A\u88AB\u8BF4\u51FA\u53E3\u7684\u60C5\u7EEA\uFF0C\u4F1A\u8BD5\u7740\u4EE5\u75C7\u72B6\u53D1\u58F0\u3002"
            ],
            resultTitle: "\u5206\u6790\u7ED3\u679C",
            validationRequired: "\u8BF7\u8F93\u5165\u68A6\u5883\u5185\u5BB9\u3002",
            validationMin: "\u8BF7\u518D\u5199\u5F97\u8BE6\u7EC6\u4E00\u4E9B\u3002\uFF08\u81F3\u5C11 8 \u4E2A\u5B57\u7B26\uFF09",
            serviceNotFound: "\u627E\u4E0D\u5230\u5206\u6790\u670D\u52A1\u8DEF\u5F84\u3002\u8BF7\u68C0\u67E5\u90E8\u7F72\u6216\u57DF\u540D\u8BBE\u7F6E\u3002",
            serverNoResponse: "\u672A\u80FD\u8BFB\u53D6\u670D\u52A1\u5668\u54CD\u5E94\u3002\u8BF7\u68C0\u67E5\u7F51\u7EDC\u540E\u91CD\u8BD5\u3002",
            analysisFailed: "\u5206\u6790\u672A\u80FD\u5B8C\u6210\u3002",
            cached: "\u5DF2\u7F13\u5B58",
            reportMeta: "\u7CBE\u795E\u5206\u6790\u6570\u636E\u89E3\u8BFB",
            formatWarning: "\u90E8\u5206\u7AE0\u8282\u683C\u5F0F\u5DF2\u81EA\u52A8\u6574\u7406",
            networkFailed: "\u56E0\u7F51\u7EDC\u9519\u8BEF\uFF0C\u5206\u6790\u672A\u80FD\u5B8C\u6210\u3002",
            timeout: "\u5206\u6790\u8BF7\u6C42\u7B49\u5F85\u65F6\u95F4\u8FC7\u957F\u3002\u8BF7\u7A0D\u540E\u518D\u8BD5\u3002",
            wizardHint: "\u51C6\u5907\u597D\u63A5\u6536\u535A\u58EB\u7684\u610F\u89C1\u4E86\u5417\uFF1F",
            shareMissing: "\u76EE\u524D\u8FD8\u6CA1\u6709\u53EF\u5206\u4EAB\u7684\u5206\u6790\u7ED3\u679C\u3002",
            shareTitle: "\u7CBE\u795E\u5206\u6790\u89E3\u68A6\u7ED3\u679C",
            clipboardCopied: "\u5206\u6790\u6587\u672C\u5DF2\u590D\u5236\u5230\u526A\u8D34\u677F\u3002",
            copyPrompt: "\u8BF7\u590D\u5236\u4E0B\u65B9\u6587\u672C\u3002",
            copyPromptOpened: "\u5DF2\u6253\u5F00\u6587\u672C\u590D\u5236\u7A97\u53E3\u3002",
            shareUnavailable: "\u5F53\u524D\u6D4F\u89C8\u5668\u65E0\u6CD5\u4F7F\u7528\u5206\u4EAB\u529F\u80FD\u3002"
          },
          "zh-TW": {
            loadingMessages: ["\u6B63\u5728\u63A2\u8A2A\u6F5B\u610F\u8B58\u7684\u623F\u9593...", "\u6B63\u5728\u6574\u7406\u535A\u58EB\u7684\u610F\u898B...", "\u6B63\u5728\u89E3\u8B80\u5922\u4E2D\u7684\u8C61\u5FB5..."],
            freudQuotes: [
              "\u5922\u662F\u901A\u5F80\u6F5B\u610F\u8B58\u7684\u738B\u9053\u3002",
              "\u88AB\u58D3\u6291\u7684\u60C5\u7DD2\u6703\u4EE5\u53E6\u4E00\u7A2E\u5F62\u614B\u56DE\u4F86\u3002",
              "\u81EA\u6211\u4E26\u4E0D\u7E3D\u662F\u81EA\u5DF1\u5C4B\u4E2D\u7684\u4E3B\u4EBA\u3002",
              "\u611B\u8207\u5DE5\u4F5C\u7684\u80FD\u529B\uFF0C\u662F\u6210\u719F\u7684\u6A19\u8A18\u3002",
              "\u75DB\u82E6\u5E38\u5E38\u900F\u904E\u91CD\u8907\u986F\u9732\u51FA\u4F86\u3002",
              "\u672A\u88AB\u8AAA\u51FA\u53E3\u7684\u60C5\u7DD2\uFF0C\u6703\u8A66\u8457\u4EE5\u75C7\u72C0\u767C\u8072\u3002"
            ],
            resultTitle: "\u5206\u6790\u7D50\u679C",
            validationRequired: "\u8ACB\u8F38\u5165\u5922\u5883\u5167\u5BB9\u3002",
            validationMin: "\u8ACB\u518D\u5BEB\u5F97\u8A73\u7D30\u4E00\u4E9B\u3002\uFF08\u81F3\u5C11 8 \u500B\u5B57\u5143\uFF09",
            serviceNotFound: "\u627E\u4E0D\u5230\u5206\u6790\u670D\u52D9\u8DEF\u5F91\u3002\u8ACB\u6AA2\u67E5\u90E8\u7F72\u6216\u7DB2\u57DF\u8A2D\u5B9A\u3002",
            serverNoResponse: "\u672A\u80FD\u8B80\u53D6\u4F3A\u670D\u5668\u56DE\u61C9\u3002\u8ACB\u78BA\u8A8D\u7DB2\u8DEF\u5F8C\u91CD\u8A66\u3002",
            analysisFailed: "\u5206\u6790\u672A\u80FD\u5B8C\u6210\u3002",
            cached: "\u5DF2\u5FEB\u53D6",
            reportMeta: "\u7CBE\u795E\u5206\u6790\u8CC7\u6599\u89E3\u8B80",
            formatWarning: "\u90E8\u5206\u6BB5\u843D\u683C\u5F0F\u5DF2\u81EA\u52D5\u6574\u7406",
            networkFailed: "\u56E0\u7DB2\u8DEF\u932F\u8AA4\uFF0C\u5206\u6790\u672A\u80FD\u5B8C\u6210\u3002",
            timeout: "\u5206\u6790\u8ACB\u6C42\u7B49\u5F85\u6642\u9593\u904E\u9577\u3002\u8ACB\u7A0D\u5F8C\u518D\u8A66\u3002",
            wizardHint: "\u6E96\u5099\u597D\u63A5\u6536\u535A\u58EB\u7684\u610F\u898B\u4E86\u55CE\uFF1F",
            shareMissing: "\u76EE\u524D\u9084\u6C92\u6709\u53EF\u5206\u4EAB\u7684\u5206\u6790\u7D50\u679C\u3002",
            shareTitle: "\u7CBE\u795E\u5206\u6790\u89E3\u5922\u7D50\u679C",
            clipboardCopied: "\u5206\u6790\u6587\u5B57\u5DF2\u8907\u88FD\u5230\u526A\u8CBC\u7C3F\u3002",
            copyPrompt: "\u8ACB\u8907\u88FD\u4E0B\u65B9\u6587\u5B57\u3002",
            copyPromptOpened: "\u5DF2\u958B\u555F\u6587\u5B57\u8907\u88FD\u8996\u7A97\u3002",
            shareUnavailable: "\u76EE\u524D\u700F\u89BD\u5668\u7121\u6CD5\u4F7F\u7528\u5206\u4EAB\u529F\u80FD\u3002"
          }
        };
        var state = {
          uiLocked: false,
          currentRecordId: "",
          currentMarkdown: "",
          loadingTimer: null,
          loadingIdx: 0,
          lastInkPulseAt: 0,
          typingTimer: null,
          typingActive: false
        };
        function normalizePsychoDreamLocale(value) {
          var lang = String(value || "").trim().replace("_", "-");
          var lower = lang.toLowerCase();
          if (lower === "zh" || lower === "zh-cn" || lower === "zh-hans") return "zh-CN";
          if (lower === "zh-tw" || lower === "zh-hant" || lower === "zh-hk") return "zh-TW";
          if (lower.indexOf("ja") === 0) return "ja";
          if (lower.indexOf("en") === 0) return "en";
          return "ko";
        }
        function getPsychoDreamLocale() {
          try {
            if (window.cdGetCurrentLanguage) return normalizePsychoDreamLocale(window.cdGetCurrentLanguage());
          } catch (_) {
          }
          try {
            var stored = localStorage.getItem("cd_locale") || localStorage.getItem("codeDestinyLocale") || localStorage.getItem("lang");
            if (stored) return normalizePsychoDreamLocale(stored);
          } catch (_) {
          }
          try {
            var cookieLang = getCookie("cd_locale") || getCookie("NEXT_LOCALE") || getCookie("lang");
            if (cookieLang) return normalizePsychoDreamLocale(cookieLang);
          } catch (_) {
          }
          return "ko";
        }
        function psychoDreamText(key) {
          var locale = getPsychoDreamLocale();
          var table = PSYCHO_DREAM_TEXT_TRANSLATIONS[locale] || PSYCHO_DREAM_TEXT_TRANSLATIONS.ko;
          return table[key] || PSYCHO_DREAM_TEXT_TRANSLATIONS.ko[key] || "";
        }
        function psychoDreamList(key) {
          var value = psychoDreamText(key);
          return Array.isArray(value) ? value : [];
        }
        function syncPsychoViewportHeight() {
          var root = document.documentElement;
          if (!root) return;
          var h = 0;
          if (window.visualViewport && Number(window.visualViewport.height) > 0) h = window.visualViewport.height;
          else if (Number(window.innerHeight) > 0) h = window.innerHeight;
          if (h > 0) root.style.setProperty("--ps-safe-vh", h + "px");
        }
        function getPsychoApiBase() {
          try {
            if (typeof window !== "undefined" && window.CODE_DESTINY_API_BASE_URL) {
              return String(window.CODE_DESTINY_API_BASE_URL).replace(/\/+$/, "");
            }
          } catch (_) {
          }
          var host = "";
          try {
            host = String(location.hostname || "").toLowerCase();
          } catch (_) {
          }
          if (host === "localhost" || host === "127.0.0.1") {
            return "http://localhost:3000";
          }
          if (host.endsWith(".pages.dev")) {
            return "https://code-destiny.com";
          }
          return "";
        }
        function getPsychoAnalysisUrl() {
          var base = getPsychoApiBase();
          var path = "/api/dream/psycho-analysis";
          return base ? base + path : path;
        }
        function $(id) {
          return document.getElementById(id);
        }
        function escapeHtml(s) {
          return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
        }
        function setBodyLock(locked) {
          if (locked) {
            document.body.dataset.cdBodyLockPrevOverflow = document.body.style.overflow || "";
            document.body.style.overflow = "hidden";
            return;
          }
          var prev = document.body.dataset.cdBodyLockPrevOverflow || "";
          document.body.style.overflow = prev;
          delete document.body.dataset.cdBodyLockPrevOverflow;
        }
        function getCookie(name) {
          var m = String(document.cookie || "").match(new RegExp("(^| )" + name + "=([^;]+)"));
          return m ? decodeURIComponent(m[2]) : "";
        }
        function getOrCreateAnonKey() {
          var key = "";
          try {
            key = localStorage.getItem("cd_anon_key") || "";
          } catch (_) {
          }
          if (key) return String(key);
          var created = "";
          try {
            created = window.crypto && window.crypto.randomUUID && window.crypto.randomUUID() || "";
          } catch (_) {
          }
          if (!created) created = String(Date.now()) + "-" + Math.random().toString(16).slice(2);
          key = "anon:" + created;
          try {
            localStorage.setItem("cd_anon_key", key);
          } catch (_) {
          }
          return key;
        }
        function getAuthToken() {
          try {
            var t = localStorage.getItem("fortune_auth_token") || "";
            if (t) return t;
          } catch (_) {
          }
          return getCookie("fortune_auth_token") || "";
        }
        function clearLoadingTimer() {
          if (!state.loadingTimer) return;
          clearInterval(state.loadingTimer);
          state.loadingTimer = null;
        }
        function composeLoadingLine(idx) {
          var messages = psychoDreamList("loadingMessages");
          var quotes = psychoDreamList("freudQuotes");
          var msg = messages[idx % Math.max(messages.length, 1)] || "";
          var quote = quotes[idx % Math.max(quotes.length, 1)] || "";
          return quote ? msg + " " + quote : msg;
        }
        function startLoading() {
          var el = $(LOADER_TEXT_ID);
          if (el) el.textContent = composeLoadingLine(0);
          state.loadingIdx = 0;
          clearLoadingTimer();
          state.loadingTimer = setInterval(function() {
            state.loadingIdx = (state.loadingIdx + 1) % Math.max(psychoDreamList("loadingMessages").length, 1);
            var lt = $(LOADER_TEXT_ID);
            if (lt) lt.textContent = composeLoadingLine(state.loadingIdx);
          }, 1400);
        }
        function stopLoading() {
          clearLoadingTimer();
        }
        function stopTyping() {
          state.typingActive = false;
          if (state.typingTimer) {
            clearInterval(state.typingTimer);
            state.typingTimer = null;
          }
        }
        function ensurePsychoCloseZFix() {
          var FIX_ID = "ps-freuds-close-z-fix";
          if (document.getElementById(FIX_ID)) return;
          var st = document.createElement("style");
          st.id = FIX_ID;
          st.textContent = "#" + OVERLAY_ID + " .ps-close{z-index:50!important;position:absolute!important;touch-action:manipulation;-webkit-tap-highlight-color:transparent;}";
          document.head.appendChild(st);
        }
        function injectFreudsStudyStyles() {
          ensurePsychoCloseZFix();
          var STYLE_ID = "ps-freuds-study-style-v3";
          if (document.getElementById(STYLE_ID)) return;
          var style = document.createElement("style");
          style.id = STYLE_ID;
          style.textContent = ":root{--ps-bg1:#1A252F;--ps-bg2:#2C3E50;--ps-gold:#D4AF37;--ps-burg:#A52A2A;--ps-cream:#FDF4D8;--ps-cream2:#F4E9C7;--ps-text:#FDFDFD;--ps-muted:rgba(253,253,253,.78);--ps-paper:#FDF4D8;--ps-paperEdge:rgba(212,175,37,.30);--ps-borderGold:rgba(212,175,37,.55);--ps-font-sans:var(--font-body,'Apple SD Gothic Neo','Malgun Gothic','Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif);--ps-font-display:var(--font-display,'Apple SD Gothic Neo','Malgun Gothic',Georgia,serif);}\n" + "#".concat(OVERLAY_ID, "{position:fixed;inset:0;display:none;z-index:9999;overflow:auto;overflow-x:hidden;min-height:100vh;min-height:100dvh;max-height:none;-webkit-overflow-scrolling:touch;background:\nradial-gradient(1000px 600px at 15% 10%, rgba(212,175,37,.10), transparent 55%),\nradial-gradient(900px 540px at 85% 25%, rgba(165,42,42,.10), transparent 60%),\nlinear-gradient(180deg,var(--ps-bg1),var(--ps-bg2));}\n") + "#".concat(OVERLAY_ID, '::before{content:"";position:fixed;inset:0;pointer-events:none;z-index:0;opacity:.92;background:radial-gradient(ellipse 130% 85% at 50% 115%,rgba(0,0,0,.55),transparent 58%);}\n') + "#".concat(OVERLAY_ID, ".ps-overlay--show{display:block;}\n") + "#".concat(OVERLAY_ID, ".ps-overlay--keyboard-open::before{opacity:1;}\n") + "#".concat(OVERLAY_ID, " .ps-dialog{max-width:980px;margin:44px auto calc(26px + env(safe-area-inset-bottom));position:relative;z-index:2;padding:24px 22px 26px;border-radius:18px;background:rgba(0,0,0,.12);\nbox-shadow:0 22px 60px rgba(0,0,0,.35);border:1px solid rgba(212,175,37,.28);}\n") + "#".concat(OVERLAY_ID, " .ps-close{position:absolute;top:16px;right:16px;z-index:50;width:42px;height:42px;border-radius:12px;border:1px solid rgba(212,175,37,.34);\nbackground:rgba(15,20,27,.45);color:rgba(253,253,253,.95);font-size:18px;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;}\n") + "#".concat(OVERLAY_ID, " .ps-close:hover{border-color:rgba(212,175,37,.70);transform:translateY(-1px);}\n") + "#".concat(OVERLAY_ID, " .ps-bg-ornament{position:absolute;inset:0;border-radius:18px;pointer-events:none;opacity:.9;\nbackground:\nrepeating-linear-gradient(90deg, rgba(255,255,255,.03) 0 1px, transparent 1px 9px),\nrepeating-linear-gradient(0deg, rgba(212,175,37,.02) 0 1px, transparent 1px 11px),\nradial-gradient(700px 420px at 50% 0%, rgba(212,175,37,.11), transparent 62%);\n") + "}\n" + "#".concat(OVERLAY_ID, " .ps-bg-ornament svg{position:absolute;opacity:.22;pointer-events:none;filter:drop-shadow(0 14px 24px rgba(0,0,0,.35));}\n") + "#".concat(OVERLAY_ID, " .ps-decor-inkwell{top:98px;left:58px;width:72px;height:72px;transform:rotate(-6deg);}\n") + "#".concat(OVERLAY_ID, " .ps-decor-pipe{bottom:34px;left:32px;width:160px;height:auto;transform:rotate(-8deg);}\n") + "#".concat(OVERLAY_ID, " .ps-decor-books{top:66px;right:14px;width:240px;height:auto;transform:rotate(3deg);}\n") + "#".concat(OVERLAY_ID, " .ps-header{position:relative;z-index:1;display:flex;flex-direction:column;gap:8px;margin-top:6px;padding:8px 4px 12px;}\n") + "#".concat(OVERLAY_ID, " .ps-badge{display:inline-flex;align-items:center;gap:10px;letter-spacing:.12em;text-transform:uppercase;\nfont-size:.78rem;color:rgba(212,175,37,.95);font-family:var(--ps-font-sans);font-weight:700;}\n") + "#".concat(OVERLAY_ID, " .ps-header h2{font-family:var(--ps-font-display);font-weight:700;color:var(--ps-text);font-size:2.1rem;line-height:1.14;margin:0;}\n") + "#".concat(OVERLAY_ID, " .ps-sub{font-family:var(--ps-font-sans);color:var(--ps-muted);font-size:1rem;margin:0;}\n") + "#".concat(OVERLAY_ID, " .ps-wizard{position:relative;z-index:1;display:flex;align-items:flex-start;gap:18px;padding:16px 8px 8px;}\n") + "#".concat(OVERLAY_ID, " .ps-wizard-medallion{width:92px;height:92px;border-radius:50%;border:1px solid rgba(212,175,37,.45);\nbackground:rgba(212,175,37,.06);display:flex;align-items:center;justify-content:center;}\n") + "#".concat(OVERLAY_ID, " .ps-wizard-text p{margin:0;}\n") + "#".concat(OVERLAY_ID, " #psychoDreamWizardLine{display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;background:linear-gradient(135deg,rgba(253,244,216,.24),rgba(212,175,37,.14));border:1px solid rgba(255,230,171,.52);color:rgba(255,250,236,.99);font-size:1.06rem;line-height:1.46;font-weight:700;letter-spacing:-0.01em;text-shadow:0 1px 2px rgba(20,26,34,.22),0 0 16px rgba(255,232,180,.22);box-shadow:0 10px 24px rgba(8,12,18,.22),inset 0 1px 0 rgba(255,255,255,.24);}\n") + "#".concat(OVERLAY_ID, " #psychoDreamEntrancePrompt.ps-wizard-prompt{margin-top:8px;color:rgba(255,252,238,.98);font-size:1.01rem;line-height:1.62;font-weight:600;letter-spacing:-0.01em;padding:10px 14px;border-radius:12px;background:linear-gradient(135deg,rgba(212,175,37,.16),rgba(255,255,255,.06));border:1px solid rgba(212,175,37,.45);box-shadow:0 8px 20px rgba(0,0,0,.20),inset 0 1px 0 rgba(255,255,255,.24);text-shadow:0 1px 2px rgba(0,0,0,.42);}\n") + "#".concat(OVERLAY_ID, " .ps-screen{position:relative;z-index:1;}\n") + "#".concat(OVERLAY_ID, " .ps-journal{margin:10px auto 0;max-width:860px;}\n") + "#".concat(OVERLAY_ID, " .ps-journal-title{display:flex;align-items:center;gap:12px;color:rgba(253,253,253,.93);font-family:var(--ps-font-display);font-weight:700;font-size:1.25rem;\n") + "padding:10px 6px 12px;}\n" + "#".concat(OVERLAY_ID, " .ps-journal-ink{color:rgba(212,175,37,.95);font-size:1.05rem;}\n") + "#".concat(OVERLAY_ID, " .ps-journal-paper{position:relative;background:linear-gradient(180deg,rgba(253,244,216,.98),rgba(244,233,199,.94));\nborder:1px solid rgba(212,175,37,.42);border-radius:16px;padding:18px 18px 14px;box-shadow:0 18px 38px rgba(0,0,0,.22);overflow:hidden;}\n") + "#".concat(OVERLAY_ID, " .ps-journal-paper:before{content:'';position:absolute;inset:-40px -60px auto -60px;height:120px;\nbackground:radial-gradient(closest-side, rgba(212,175,37,.14), transparent 65%);pointer-events:none;}\n") + "#".concat(OVERLAY_ID, " .ps-ink-layer{position:absolute;inset:0;pointer-events:none;}\n") + "#".concat(OVERLAY_ID, " .ps-ink-pulse{position:absolute;width:26px;height:26px;border-radius:50%;\nbackground:radial-gradient(circle at 30% 30%, rgba(25,25,30,.18), rgba(10,10,12,.35), rgba(0,0,0,0) 65%);\nfilter:blur(.3px);transform:translate(-50%,-50%) scale(.7);opacity:.95;animation:psInkPulse .85s ease-out forwards;}\n") + "@keyframes psInkPulse{0%{opacity:.95;transform:translate(-50%,-50%) scale(.55)}60%{opacity:.55;transform:translate(-50%,-50%) scale(1.15)}100%{opacity:0;transform:translate(-50%,-50%) scale(1.55)}}\n" + "#".concat(OVERLAY_ID, " .ps-textarea{position:relative;width:100%;min-height:190px;max-height:min(52dvh,calc(var(--ps-safe-vh,100vh) * 0.48));resize:vertical;background:transparent;border:none;outline:none;\nfont-family:var(--ps-font-sans);font-size:1.06rem;line-height:1.85;letter-spacing:-0.01em;color:#141a22;padding:10px 4px 8px;caret-color:rgba(90,44,18,.85);\n-webkit-font-smoothing:antialiased;\n}\n") + "#".concat(OVERLAY_ID, " .ps-textarea::placeholder{color:rgba(28,33,40,.44);}\n") + "#".concat(OVERLAY_ID, " .ps-journal-paper.ps-journal--writing{box-shadow:0 22px 48px rgba(0,0,0,.26);}\n") + "#".concat(OVERLAY_ID, " .ps-journal-paper.ps-journal--writing:after{content:'';position:absolute;left:-10%;top:-25%;width:120%;height:70%;\nbackground:radial-gradient(closest-side, rgba(212,175,37,.14), transparent 62%);\nanimation:psNibGlow .55s ease-out;pointer-events:none;}\n") + "@keyframes psNibGlow{0%{opacity:0;transform:scale(.98)}100%{opacity:1;transform:scale(1.01)}}\n" + "#".concat(OVERLAY_ID, " .ps-input-footer{display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:center;margin-top:10px;padding:0 4px;}\n") + "#".concat(OVERLAY_ID, " .ps-error{width:100%;text-align:center;min-height:20px;color:rgba(165,42,42,.95);font-family:var(--ps-font-sans);font-weight:700;font-size:.92rem;}\n") + "#".concat(OVERLAY_ID, " .ps-btn{appearance:none;border-radius:14px;border:1px solid rgba(212,175,37,.42);background:rgba(255,255,255,.06);color:rgba(253,253,253,.95);\npadding:12px 16px;font-family:var(--ps-font-sans);font-weight:700;cursor:pointer;}\n") + "#".concat(OVERLAY_ID, " .ps-btn:hover{border-color:rgba(212,175,37,.75);transform:translateY(-1px)}\n") + "#".concat(OVERLAY_ID, " .ps-btn-primary{background:linear-gradient(135deg, rgba(212,175,37,.22), rgba(165,42,42,.14));border-color:rgba(212,175,37,.60)}\n") + "#".concat(OVERLAY_ID, " .ps-btn-mini{padding:8px 12px;border-radius:12px;font-size:.9rem}\n") + "#".concat(OVERLAY_ID, " .ps-loading{padding:26px 0 6px;}\n") + "#".concat(OVERLAY_ID, " .ps-ink-scene{margin:6px auto 0;width:300px;height:300px;position:relative;}\n") + "#".concat(OVERLAY_ID, " .ps-paper-circle{position:absolute;inset:44px 44px 44px 44px;border-radius:50%;background:\nradial-gradient(circle at 35% 25%, rgba(253,244,216,.95), rgba(253,244,216,.70));border:1px solid rgba(212,175,37,.35);}\n") + "#".concat(OVERLAY_ID, " .ps-ink-blob{position:absolute;left:50%;top:50%;width:68px;height:68px;border-radius:50%;\ntransform:translate(-50%,-50%);background:radial-gradient(circle at 30% 30%, rgba(0,0,0,.0), rgba(10,10,12,.35), rgba(10,10,12,.60));\nfilter:blur(1.2px);opacity:.0;animation:psInkSoak 2.8s ease-in-out infinite;}\n") + "@keyframes psInkSoak{0%{opacity:0;transform:translate(-50%,-50%) scale(.65)}20%{opacity:.95}55%{opacity:.45;transform:translate(-50%,-50%) scale(1.35)}100%{opacity:0;transform:translate(-50%,-50%) scale(1.65)}}\n" + "#".concat(OVERLAY_ID, " .ps-profile-lens{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:122px;height:122px;border-radius:50%;\nborder:1px solid rgba(212,175,37,.55);background:rgba(212,175,37,.06);opacity:.0;animation:psLensFade 2.8s ease-in-out infinite;}\n") + "@keyframes psLensFade{0%{opacity:0;transform:translate(-50%,-50%) scale(.85)}18%{opacity:.0}35%{opacity:.9;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-50%) scale(1.06)}}\n" + "#".concat(OVERLAY_ID, " .ps-lens-ring{position:absolute;inset:10px;border-radius:50%;border:1px solid rgba(212,175,37,.38)}\n") + "#".concat(OVERLAY_ID, " .ps-lens-symbols{position:absolute;inset:16px;border-radius:50%;\nbackground:\nradial-gradient(circle at 30% 30%, rgba(212,175,37,.30), transparent 55%),\nconic-gradient(from 30deg, rgba(212,175,37,.35), rgba(253,253,253,.0), rgba(212,175,37,.35));\nfilter:blur(.2px);opacity:.55;animation:psSymbols 1.55s ease-in-out infinite;}\n") + "@keyframes psSymbols{0%{transform:rotate(0deg) scale(.98)}50%{transform:rotate(20deg) scale(1.02)}100%{transform:rotate(0deg) scale(.98)}}\n" + "#".concat(OVERLAY_ID, " .ps-loading-text{margin:18px auto 0;text-align:center;font-family:var(--ps-font-display);color:rgba(253,253,253,.92);font-weight:700;font-size:1.08rem;}\n") + "#".concat(OVERLAY_ID, " .ps-result-actions{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin:22px 0 10px;padding-top:4px;}\n") + "#".concat(OVERLAY_ID, " .ps-report{margin:8px auto 0;max-width:860px;}\n") + "#".concat(OVERLAY_ID, " .ps-report-head{display:flex;flex-direction:column;gap:10px;margin-bottom:16px;padding:4px 8px 14px;border-bottom:1px solid rgba(212,175,37,.22);}\n") + "#".concat(OVERLAY_ID, " .ps-report-title{font-family:var(--ps-font-display);font-size:1.55rem;font-weight:700;color:rgba(253,253,253,.96);letter-spacing:-0.02em;line-height:1.25;}\n") + "#".concat(OVERLAY_ID, " .ps-report-meta{font-family:var(--ps-font-sans);color:rgba(253,253,253,.68);font-size:.86rem;line-height:1.55;padding:8px 12px;border-radius:12px;background:rgba(0,0,0,.22);border:1px solid rgba(212,175,37,.28);max-width:100%;word-break:keep-all;}\n") + "#".concat(OVERLAY_ID, " .ps-report-body{position:relative;background:linear-gradient(180deg,rgba(255,250,240,.98),rgba(244,233,199,.94));border:1px solid rgba(212,175,37,.42);border-radius:18px;padding:0;box-shadow:0 24px 52px rgba(0,0,0,.24),inset 0 1px 0 rgba(255,255,255,.45);max-height:min(68vh,640px);overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;counter-reset:ps-sec;scrollbar-width:thin;scrollbar-color:rgba(212,175,37,.55) rgba(212,175,37,.10);}\n") + "#".concat(OVERLAY_ID, " .ps-report-body::-webkit-scrollbar{width:9px;}\n") + "#".concat(OVERLAY_ID, " .ps-report-body::-webkit-scrollbar-track{background:rgba(212,175,37,.08);border-radius:0 18px 18px 0;}\n") + "#".concat(OVERLAY_ID, " .ps-report-body::-webkit-scrollbar-thumb{background:linear-gradient(180deg,rgba(212,175,37,.55),rgba(165,42,42,.35));border-radius:8px;border:2px solid rgba(253,244,216,.5);}\n") + "#".concat(OVERLAY_ID, " .ps-report-body:before{content:'';position:sticky;top:0;left:0;right:0;height:3px;z-index:1;display:block;background:linear-gradient(90deg,transparent,rgba(212,175,37,.55),rgba(165,42,42,.35),rgba(212,175,37,.55),transparent);pointer-events:none;border-radius:18px 18px 0 0;}\n") + "#".concat(OVERLAY_ID, " .ps-report-body .ps-report-section{padding:16px 18px 14px;margin:0;border-bottom:1px solid rgba(212,175,37,.22);background:linear-gradient(180deg,rgba(255,252,245,.15),transparent);}\n") + "#".concat(OVERLAY_ID, " .ps-report-body .ps-report-section:last-child{border-bottom:none;border-radius:0 0 16px 16px;padding-bottom:18px;}\n") + "#".concat(OVERLAY_ID, " .ps-report-body .ps-report-section:nth-child(even){background:linear-gradient(180deg,rgba(212,175,37,.06),rgba(253,250,236,.25));}\n") + "#".concat(OVERLAY_ID, " .ps-report-section{counter-increment:ps-sec;}\n") + "#".concat(OVERLAY_ID, " .ps-report-section-title{font-family:var(--ps-font-display);font-weight:700;color:rgba(88,62,18,.98);font-size:1.06rem;margin:0 0 12px;padding-bottom:10px;display:flex;align-items:flex-start;gap:12px;line-height:1.35;letter-spacing:-0.02em;border-bottom:1px solid rgba(212,175,37,.28);}\n") + "#".concat(OVERLAY_ID, " .ps-report-section-title:before{content:counter(ps-sec,decimal-leading-zero);flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;min-width:2.1rem;padding:5px 9px;border-radius:10px;font-size:.78rem;font-weight:700;font-family:var(--ps-font-sans);letter-spacing:.08em;color:rgba(212,175,37,.98);background:linear-gradient(145deg,rgba(212,175,37,.20),rgba(26,32,40,.12));border:1px solid rgba(212,175,37,.45);box-shadow:0 2px 8px rgba(0,0,0,.08);}\n") + "#".concat(OVERLAY_ID, " .ps-report-section-body{font-family:var(--ps-font-sans);color:rgba(18,24,32,.96);line-height:2.08;font-size:1.03rem;letter-spacing:-0.015em;-webkit-font-smoothing:antialiased;word-break:keep-all;overflow-wrap:break-word;}\n") + "#".concat(OVERLAY_ID, " .ps-report-section-body p{margin:0 0 1rem}\n") + "#".concat(OVERLAY_ID, " .ps-report-section-body p:last-child{margin-bottom:0}\n") + "#".concat(OVERLAY_ID, " .ps-report-list{margin:.35rem 0 1rem 0;padding:0 0 0 1.15rem;list-style-position:outside;}\n") + "#".concat(OVERLAY_ID, " .ps-report-list li{margin:.45rem 0;padding-left:.2rem;line-height:1.85;position:relative;}\n") + "#".concat(OVERLAY_ID, " .ps-report-list li::marker{color:rgba(165,90,42,.88);font-weight:700;}\n") + "#".concat(OVERLAY_ID, " .ps-result-actions .ps-btn{min-width:220px}\n") + "#".concat(OVERLAY_ID, " .ps-stamp{margin:16px auto 0;display:flex;justify-content:center;}\n") + "@media (max-width: 768px){#" + OVERLAY_ID + " .ps-dialog{margin:10px 10px calc(14px + env(safe-area-inset-bottom));padding:16px 14px 18px;border-radius:14px;position:relative;z-index:1;}#" + OVERLAY_ID + " .ps-header h2{font-size:1.4rem;}#" + OVERLAY_ID + " .ps-wizard{gap:10px;padding:10px 4px 6px;}#" + OVERLAY_ID + " .ps-wizard-medallion{width:64px;height:64px;}#" + OVERLAY_ID + " .ps-textarea{min-height:148px;max-height:min(46dvh,calc(var(--ps-safe-vh,100vh) * 0.42));font-size:1.04rem;line-height:1.82;}#" + OVERLAY_ID + " .ps-result-actions .ps-btn{min-width:100%;}#" + OVERLAY_ID + " .ps-report-title{font-size:1.35rem;}#" + OVERLAY_ID + " .ps-report-meta{font-size:.82rem;padding:8px 10px;}#" + OVERLAY_ID + " .ps-report-body{max-height:min(52vh,520px);border-radius:16px;}#" + OVERLAY_ID + " .ps-report-body .ps-report-section{padding:14px 14px 12px;}#" + OVERLAY_ID + " .ps-report-section-body{font-size:1rem;line-height:2.02;}#" + OVERLAY_ID + " .ps-report-section-title{font-size:1rem;gap:10px;}}\n";
          document.head.appendChild(style);
        }
        function setWizardHint(msg) {
          var el = $(WIZARD_LINE_ID);
          if (el) el.textContent = msg || "";
        }
        function setScreen(screen) {
          var inputScreen = $(INPUT_SCREEN_ID);
          var loadingScreen = $(LOADING_SCREEN_ID);
          var resultScreen = $(RESULT_SCREEN_ID);
          var wizard = document.querySelector("#" + OVERLAY_ID + " .ps-wizard");
          if (wizard) wizard.style.display = "";
          if (inputScreen) inputScreen.style.display = "none";
          if (loadingScreen) loadingScreen.style.display = "none";
          if (resultScreen) resultScreen.style.display = "none";
          if ($(ERROR_ID)) $(ERROR_ID).textContent = "";
          if (screen === "input") {
            if (inputScreen) inputScreen.style.display = "block";
            if (wizard) wizard.style.display = "flex";
          }
          if (screen === "loading") {
            if (loadingScreen) loadingScreen.style.display = "block";
            if (wizard) wizard.style.display = "none";
          }
          if (screen === "result") {
            if (resultScreen) resultScreen.style.display = "block";
            if (wizard) wizard.style.display = "none";
            ensureResultHomeButton();
          }
        }
        function setError(msg) {
          var el = $(ERROR_ID);
          if (el) el.textContent = msg || "";
        }
        function setOverlayVisible(visible) {
          var overlay2 = $(OVERLAY_ID);
          if (!overlay2) return;
          if (visible) {
            overlay2.style.display = "block";
            overlay2.classList.add("ps-overlay--show");
            overlay2.scrollTop = 0;
          } else {
            overlay2.classList.remove("ps-overlay--show");
            window.setTimeout(function() {
              if (!overlay2.classList.contains("ps-overlay--show")) overlay2.style.display = "none";
            }, 160);
          }
        }
        function resetUI() {
          state.uiLocked = false;
          state.currentRecordId = "";
          state.currentMarkdown = "";
          stopLoading();
          stopTyping();
          setError("");
          var input = $(TEXTAREA_ID);
          if (input) input.value = "";
          setScreen("input");
        }
        function triggerInkPulse() {
          var now = Date.now();
          if (now - state.lastInkPulseAt < 55) return;
          state.lastInkPulseAt = now;
          var layer = $("psychoDreamInkLayer");
          if (!layer) return;
          var pulse = document.createElement("span");
          pulse.className = "ps-ink-pulse";
          var rect = layer.getBoundingClientRect();
          var x = rect.width * (0.08 + Math.random() * 0.84);
          var y = rect.height * (0.08 + Math.random() * 0.78);
          pulse.style.left = x + "px";
          pulse.style.top = y + "px";
          var s = 0.75 + Math.random() * 0.7;
          pulse.style.transform = "translate(-50%,-50%) scale(" + s.toFixed(2) + ")";
          layer.appendChild(pulse);
          window.setTimeout(function() {
            try {
              pulse.remove();
            } catch (_) {
            }
          }, 920);
        }
        function setPsychoKeyboardVeil(active) {
          var ov = $(OVERLAY_ID);
          if (!ov) return;
          if (active) ov.classList.add("ps-overlay--keyboard-open");
          else ov.classList.remove("ps-overlay--keyboard-open");
        }
        function attachJournalMicroInteractions() {
          var ta = $(TEXTAREA_ID);
          if (!ta) return;
          var journalPaper = ta.closest(".ps-journal-paper") || null;
          var mqMobile = typeof window.matchMedia === "function" ? window.matchMedia("(max-width: 768px)") : null;
          ta.addEventListener("focus", function() {
            if (journalPaper) journalPaper.classList.add("ps-journal--writing");
            syncPsychoViewportHeight();
            if (mqMobile && mqMobile.matches) setPsychoKeyboardVeil(true);
            window.setTimeout(function() {
              try {
                ta.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
              } catch (_) {
              }
            }, 120);
          });
          ta.addEventListener("blur", function() {
            if (journalPaper) journalPaper.classList.remove("ps-journal--writing");
            setPsychoKeyboardVeil(false);
          });
          ta.addEventListener("input", function() {
            if (journalPaper) {
              journalPaper.classList.add("ps-journal--writing");
              window.setTimeout(function() {
                try {
                  journalPaper.classList.remove("ps-journal--writing");
                } catch (_) {
                }
              }, 520);
            }
            triggerInkPulse();
          });
        }
        function renderPsychoDreamMarkdown(md) {
          var text = String(md || "").replace(/\r\n/g, "\n");
          if (!text.trim()) {
            return '<div class="ps-report-section"><div class="ps-report-section-title">\uBD84\uC11D</div><div class="ps-report-section-body"><p>\uD45C\uC2DC\uD560 \uBD84\uC11D \uB0B4\uC6A9\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.</p></div></div>';
          }
          var lines = text.split("\n");
          var html = "";
          var currentTitle = null;
          var paragraph = [];
          var listItems = [];
          var sectionOpen = false;
          function flushParagraph() {
            if (!paragraph.length) return;
            var joined = paragraph.join(" ").trim();
            paragraph = [];
            if (!joined) return;
            html += "<p>" + escapeHtml(joined) + "</p>";
          }
          function flushList() {
            if (!listItems.length) return;
            var items = listItems.slice();
            listItems = [];
            html += '<ul class="ps-report-list">' + items.map(function(it) {
              return "<li>" + escapeHtml(it) + "</li>";
            }).join("") + "</ul>";
          }
          function closeSection() {
            flushParagraph();
            flushList();
            if (sectionOpen) {
              html += "</div></div>";
            }
            sectionOpen = false;
            currentTitle = null;
          }
          function openSection(title2) {
            closeSection();
            currentTitle = title2;
            sectionOpen = true;
            html += '<div class="ps-report-section"><div class="ps-report-section-title">' + escapeHtml(title2) + '</div><div class="ps-report-section-body">';
          }
          var headingRe = /^\s*\[(.+?)\]\s*:\s*$/;
          var headingRe2 = /^\s*\[(.+?)\]\s*:\s*(.*)$/;
          var markdownHeadingRe = /^\s{0,3}#{2,6}\s+(.+?)\s*$/;
          for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            if (line == null) continue;
            var raw = String(line);
            var trimmed = raw.trim();
            if (!trimmed) {
              flushParagraph();
              flushList();
              continue;
            }
            var m = raw.match(headingRe) || raw.match(headingRe2);
            if (m) {
              var title = m[1] || "";
              openSection(title);
              if (m[2]) {
                paragraph.push(String(m[2]).trim());
              }
              continue;
            }
            var mdHeading = raw.match(markdownHeadingRe);
            if (mdHeading) {
              openSection(mdHeading[1] || "");
              continue;
            }
            var bullet = raw.match(/^\-\s+(.*)$/) || raw.match(/^\*\s+(.*)$/);
            if (bullet) {
              flushParagraph();
              listItems.push(bullet[1] || "");
              continue;
            }
            paragraph.push(trimmed);
          }
          closeSection();
          if (!html.trim()) {
            html = '<div class="ps-report-section"><div class="ps-report-section-title">' + escapeHtml(psychoDreamText("resultTitle")) + '</div><div class="ps-report-section-body">' + escapeHtml(text).replace(/\n/g, "<br/>") + "</div></div>";
          }
          return html;
        }
        async function analyzeDream() {
          if (state.uiLocked) return;
          var dreamText = ($(TEXTAREA_ID) && $(TEXTAREA_ID).value ? $(TEXTAREA_ID).value : "").trim();
          if (!dreamText) {
            setError(psychoDreamText("validationRequired"));
            return;
          }
          if (dreamText.length < 8) {
            setError(psychoDreamText("validationMin"));
            return;
          }
          var overlay2 = $(OVERLAY_ID);
          if (!overlay2) return;
          var analyzeBtn2 = $("psychoDreamAnalyzeBtn");
          if (analyzeBtn2 && analyzeBtn2.getAttribute("data-pvw-bypass") !== "1" && typeof window.__cdRunPerUseCoinGateFromTile === "function") {
            if (window.__cdRunPerUseCoinGateFromTile(analyzeBtn2)) return;
          }
          state.uiLocked = true;
          stopLoading();
          setError("");
          setScreen("loading");
          startLoading();
          var anonKey = getOrCreateAnonKey();
          var token = getAuthToken();
          try {
            var headers = {
              "Content-Type": "application/json",
              "x-cd-anon-key": anonKey
            };
            if (token) headers["Authorization"] = "Bearer " + token;
            var controller = typeof AbortController === "function" ? new AbortController() : null;
            var timeoutMs = 45e3;
            var timeoutId = null;
            if (controller) {
              timeoutId = setTimeout(function() {
                try {
                  controller.abort();
                } catch (_) {
                }
              }, timeoutMs);
            }
            var res = null;
            try {
              res = await fetch(getPsychoAnalysisUrl(), {
                method: "POST",
                headers,
                body: JSON.stringify({ dreamText }),
                signal: controller ? controller.signal : void 0
              });
            } finally {
              if (timeoutId) clearTimeout(timeoutId);
            }
            var data = null;
            try {
              var ct = res.headers && res.headers.get && res.headers.get("content-type") || "";
              if (ct.indexOf("application/json") === -1) {
                throw new Error("non-json");
              }
              data = await res.json();
            } catch (_) {
              data = null;
            }
            if (!data || typeof data !== "object") {
              stopTyping();
              var hint = res.status === 404 ? psychoDreamText("serviceNotFound") : psychoDreamText("serverNoResponse");
              setError(hint);
              setScreen("input");
              return;
            }
            if (!res.ok || !data.ok) {
              var msg = getPsychoDreamLocale() === "ko" && data && data.message ? data.message : psychoDreamText("analysisFailed");
              stopTyping();
              setError(msg);
              setScreen("input");
              return;
            }
            state.currentRecordId = data.record && data.record.id || "";
            state.currentMarkdown = data.record && data.record.markdown || "";
            var metaEl = $(REPORT_META_ID);
            if (metaEl) {
              var cachedTag = data.cached ? " (" + psychoDreamText("cached") + ")" : "";
              var dateStr = (/* @__PURE__ */ new Date()).toLocaleString();
              var bits = [dateStr, psychoDreamText("reportMeta")];
              if (data.formatWarning) bits.push(psychoDreamText("formatWarning"));
              metaEl.textContent = bits.join(" \xB7 ") + cachedTag;
            }
            var mdEl = $(RESULT_MARKDOWN_ID);
            if (mdEl) {
              stopTyping();
              state.typingActive = true;
              mdEl.innerHTML = "";
              var fullMd = state.currentMarkdown || "";
              var total = fullMd.length;
              var reveal = 0;
              var charsPerTick = total < 800 ? 3 : total < 1600 ? 2 : 1;
              var tickMs = total < 800 ? 18 : 14;
              state.typingTimer = setInterval(function() {
                if (!state.typingActive) return;
                reveal = Math.min(total, reveal + charsPerTick);
                var part = fullMd.slice(0, reveal);
                mdEl.innerHTML = renderPsychoDreamMarkdown(part);
                if (reveal >= total) {
                  stopTyping();
                  mdEl.innerHTML = renderPsychoDreamMarkdown(fullMd);
                }
              }, tickMs);
            }
            stopLoading();
            setScreen("result");
          } catch (e) {
            stopLoading();
            stopTyping();
            var rawErrorMessage = e && e.message || "";
            var msg = psychoDreamText("networkFailed");
            if (e && (e.name === "AbortError" || String(rawErrorMessage || "").toLowerCase().includes("abort"))) {
              msg = psychoDreamText("timeout");
            }
            setError(msg);
            setScreen("input");
            try {
              setPsychoKeyboardVeil(false);
            } catch (_) {
            }
          } finally {
            state.uiLocked = false;
          }
        }
        window.openPsychoDreamModal = function openPsychoDreamModal() {
          injectFreudsStudyStyles();
          resetUI();
          setOverlayVisible(true);
          setBodyLock(true);
          syncPsychoViewportHeight();
          setWizardHint(psychoDreamText("wizardHint"));
        };
        window.closePsychoDreamModal = function closePsychoDreamModal() {
          stopLoading();
          stopTyping();
          setBodyLock(false);
          setOverlayVisible(false);
        };
        window.psychoDreamGoHome = function psychoDreamGoHome() {
          if (typeof window.closePsychoDreamModal === "function") window.closePsychoDreamModal();
          try {
            window.scrollTo({ top: 0, behavior: "smooth" });
          } catch (_) {
            try {
              window.scrollTo(0, 0);
            } catch (e2) {
            }
          }
        };
        window.psychoDreamStartAnalysis = function psychoDreamStartAnalysis() {
          analyzeDream();
        };
        window.psychoDreamReset = function psychoDreamReset() {
          resetUI();
          setOverlayVisible(true);
          setBodyLock(true);
        };
        window.psychoDreamShareText = async function psychoDreamShareText() {
          var text = String(state.currentMarkdown || "").trim();
          if (!text) {
            setError(psychoDreamText("shareMissing"));
            return;
          }
          var shareTitle = psychoDreamText("shareTitle");
          try {
            if (navigator.share) {
              await navigator.share({ title: shareTitle, text });
              return;
            }
          } catch (_) {
          }
          try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
              await navigator.clipboard.writeText(text);
              setError(psychoDreamText("clipboardCopied"));
              return;
            }
          } catch (_) {
          }
          try {
            window.prompt(psychoDreamText("copyPrompt"), text.slice(0, 5e3));
            setError(psychoDreamText("copyPromptOpened"));
          } catch (_) {
            setError(psychoDreamText("shareUnavailable"));
          }
        };
        syncPsychoViewportHeight();
        window.addEventListener("resize", syncPsychoViewportHeight, { passive: true });
        window.addEventListener("orientationchange", syncPsychoViewportHeight, { passive: true });
        if (window.visualViewport) {
          window.visualViewport.addEventListener("resize", syncPsychoViewportHeight, { passive: true });
          window.visualViewport.addEventListener("scroll", syncPsychoViewportHeight, { passive: true });
        }
        injectFreudsStudyStyles();
        ensureResultHomeButton();
        attachPsychoCloseGuards();
        attachJournalMicroInteractions();
        var analyzeBtn = $("psychoDreamAnalyzeBtn");
        if (analyzeBtn) {
          analyzeBtn.addEventListener("click", function() {
            analyzeDream();
          });
        }
        function ensureResultHomeButton() {
          var actions = document.querySelector("#" + RESULT_SCREEN_ID + " .ps-result-actions");
          if (!actions || actions.querySelector('[data-action="psychoDreamGoHome"]')) return;
          var btn = document.createElement("button");
          btn.type = "button";
          btn.className = "ps-btn ps-btn-primary";
          btn.setAttribute("data-action", "psychoDreamGoHome");
          btn.setAttribute("aria-label", "\uD648 \uD654\uBA74\uC73C\uB85C \uBC14\uB85C\uAC00\uAE30");
          btn.textContent = "\u{1F3E0} \uD648\uC73C\uB85C \uBC14\uB85C\uAC00\uAE30";
          if (actions.firstChild) actions.insertBefore(btn, actions.firstChild);
          else actions.appendChild(btn);
        }
        function attachPsychoCloseGuards() {
          var ov = $(OVERLAY_ID);
          if (!ov || ov.dataset.cdPsychoCloseGuard === "1") return;
          ov.dataset.cdPsychoCloseGuard = "1";
          function tryClose(ev) {
            var closeBtn = ev.target && ev.target.closest && ev.target.closest(".ps-close");
            if (!closeBtn || !ov.contains(closeBtn)) return;
            if (ev.cancelable) ev.preventDefault();
            ev.stopPropagation();
            if (typeof window.closePsychoDreamModal === "function") window.closePsychoDreamModal();
          }
          ov.addEventListener("click", tryClose, true);
          ov.addEventListener(
            "touchend",
            function(e) {
              var closeBtn = e.target && e.target.closest && e.target.closest(".ps-close");
              if (!closeBtn || !ov.contains(closeBtn)) return;
              if (e.cancelable) e.preventDefault();
              e.stopPropagation();
              if (typeof window.closePsychoDreamModal === "function") window.closePsychoDreamModal();
            },
            { passive: false, capture: true }
          );
        }
        function bindDirectTapAction(selector, handler) {
          var nodes = document.querySelectorAll(selector);
          if (!nodes || !nodes.length) return;
          nodes.forEach(function(node) {
            if (!node || node.dataset.cdTapBound === "1") return;
            node.dataset.cdTapBound = "1";
            var firedAt = 0;
            function fire(ev) {
              var now = Date.now();
              if (now - firedAt < 260) return;
              firedAt = now;
              if (ev && ev.cancelable) ev.preventDefault();
              if (ev) ev.stopPropagation();
              handler(ev);
            }
            node.addEventListener("click", fire, { passive: false });
            node.addEventListener("touchend", fire, { passive: false });
            node.addEventListener("pointerup", function(ev) {
              if (ev.pointerType && ev.pointerType !== "touch") return;
              fire(ev);
            }, { passive: false });
          });
        }
        bindDirectTapAction('[data-action="openPsychoDreamModal"]', function() {
          if (typeof window.openPsychoDreamModal === "function") window.openPsychoDreamModal();
        });
        bindDirectTapAction("#" + OVERLAY_ID + ' [data-action="closePsychoDreamModal"]:not(.ps-close)', function() {
          if (typeof window.closePsychoDreamModal === "function") window.closePsychoDreamModal();
        });
        bindDirectTapAction("#" + OVERLAY_ID + ' [data-action="psychoDreamGoHome"]', function() {
          if (typeof window.psychoDreamGoHome === "function") window.psychoDreamGoHome();
        });
        bindDirectTapAction("#" + OVERLAY_ID + " #psychoDreamAnalyzeBtn, #" + OVERLAY_ID + ' [data-action="psychoDreamStartAnalysis"]', function() {
          if (typeof window.psychoDreamStartAnalysis === "function") window.psychoDreamStartAnalysis();
        });
        var overlay = $(OVERLAY_ID);
        if (overlay && !overlay.dataset.cdDelegationBound) {
          overlay.dataset.cdDelegationBound = "1";
          overlay.addEventListener("click", function(ev) {
            var target = ev.target && ev.target.closest ? ev.target.closest("[data-action]") : null;
            if (!target) return;
            var action = target.getAttribute("data-action");
            if (action === "psychoDreamGoHome" && typeof window.psychoDreamGoHome === "function") {
              ev.preventDefault();
              ev.stopPropagation();
              window.psychoDreamGoHome();
            } else if (action === "closePsychoDreamModal" && typeof window.closePsychoDreamModal === "function") {
              ev.preventDefault();
              ev.stopPropagation();
              window.closePsychoDreamModal();
            } else if (action === "psychoDreamStartAnalysis" && typeof window.psychoDreamStartAnalysis === "function") {
              ev.preventDefault();
              ev.stopPropagation();
              window.psychoDreamStartAnalysis();
            } else if (action === "psychoDreamReset" && typeof window.psychoDreamReset === "function") {
              ev.preventDefault();
              ev.stopPropagation();
              window.psychoDreamReset();
            } else if (action === "psychoDreamShareText" && typeof window.psychoDreamShareText === "function") {
              ev.preventDefault();
              ev.stopPropagation();
              window.psychoDreamShareText();
            }
          }, { capture: false });
        }
        setScreen("input");
      })();
    }
  });
  require_psycho_dream_analyzer_freuds_study();
})();
