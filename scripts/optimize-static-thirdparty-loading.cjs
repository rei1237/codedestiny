const fs = require("fs");

const files = [
  "index.html",
  "public/index.html",
  "public/static/index.html",
  "public/en/index.html",
  "public/ja/index.html",
  "public/hi-in/index.html",
  "public/es-es/index.html",
  "public/fr-fr/index.html",
  "public/de-de/index.html",
  "public/nl-nl/index.html",
  "public/ms-my/index.html",
  "public/zh/index.html",
];

const adsScriptTag =
  '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9863227498729828" crossorigin="anonymous"></script>';

const deferredAdsLoader = [
  "<!-- Google AdSense Auto Ads (deferred for mobile stability/perf) -->",
  "<script>",
  "(function(){",
  "  var loaded = false;",
  "  function injectAds(){",
  "    if (loaded) return;",
  "    loaded = true;",
  "    var s = document.createElement('script');",
  "    s.async = true;",
  "    s.crossOrigin = 'anonymous';",
  "    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9863227498729828';",
  "    s.setAttribute('data-cd-adsense','1');",
  "    document.head.appendChild(s);",
  "    window.removeEventListener('pointerdown', injectAds, true);",
  "    window.removeEventListener('touchstart', injectAds, true);",
  "    window.removeEventListener('keydown', injectAds, true);",
  "    window.removeEventListener('scroll', injectAds, true);",
  "  }",
  "  var idleId;",
  "  if ('requestIdleCallback' in window) idleId = window.requestIdleCallback(injectAds, { timeout: 6000 });",
  "  else idleId = window.setTimeout(injectAds, 5000);",
  "  window.addEventListener('pointerdown', injectAds, true);",
  "  window.addEventListener('touchstart', injectAds, true);",
  "  window.addEventListener('keydown', injectAds, true);",
  "  window.addEventListener('scroll', injectAds, true);",
  "})();",
  "</script>",
].join("\n");

const jspdfTagRe = /\n?<script src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/jspdf\/2\.5\.1\/jspdf\.umd\.min\.js" defer crossorigin="anonymous" referrerpolicy="no-referrer"><\/script>/g;

let changed = 0;
for (const file of files) {
  let src = fs.readFileSync(file, "utf8");
  let out = src;
  if (out.includes(adsScriptTag)) {
    out = out.replace(adsScriptTag, deferredAdsLoader);
  }
  out = out.replace(jspdfTagRe, "\n<!-- jsPDF removed from initial bundle; load on demand only if a feature requires it -->");
  if (out !== src) {
    fs.writeFileSync(file, out, "utf8");
    changed += 1;
  }
}

console.log(`changed=${changed}`);
