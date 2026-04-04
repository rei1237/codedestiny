import { writeFileSync } from 'fs';
const content = `/* \uc11c\ube44\uc2a4 \ud398\uc774\uc9c0 \ud558\ub2e8 footer "\uaf43" \uad00\ub9ac\uc790 \uc9c4\uc785 \ubc84\ud2bc
   - index.html footer\uc5d0 #cdAdminFlowerBtn \uc774 \uc774\ubbf8 \uc9c1\uc811 \uc0bd\uc785\ub418\uc5b4 \uc788\uc74c.
   - \uc774 \uc2a4\ud06c\ub9bd\ud2b8\ub294 \ubc84\ud2bc\uc774 \uc5c6\ub294 \uacbd\uc6b0(\ub2e4\uad6d\uc5b4 \ud398\uc774\uc9c0 \ub4f1)\ub97c \uc704\ud55c \ud3f4\ubc31 \uc5ed\ud560\ub9cc \ud568.
   - \ud654\uba74\uc5d0 "admin"\uc774\ub77c\ub294 \ud14d\uc2a4\ud2b8\ub97c \ub178\ucd9c\ud558\uc9c0 \uc54a\uc74c.
*/

(function () {
  function injectButton() {
    if (document.getElementById("cdAdminFlowerBtn")) return;
    const footer =
      document.querySelector('footer[role="contentinfo"]') ||
      document.querySelector("footer");
    if (!footer) return;
    const btnWrap = document.createElement("div");
    btnWrap.id = "cdAdminFlowerWrap";
    btnWrap.style.cssText = "margin-top:16px;display:flex;justify-content:center;";
    const btn = document.createElement("button");
    btn.id = "cdAdminFlowerBtn";
    btn.type = "button";
    btn.setAttribute("aria-label", "\uaf43 \ubc84\ud2bc");
    btn.setAttribute("data-action", "openAdminFlowerGate");
    btn.style.cssText =
      "width:44px;height:44px;border:1px solid rgba(244,114,182,.18);border-radius:999px;" +
      "background:rgba(244,114,182,.04);color:rgba(255,255,255,.82);opacity:0.55;" +
      "cursor:pointer;display:inline-flex;align-items:center;justify-content:center;" +
      "font-size:18px;line-height:1;box-shadow:0 4px 12px rgba(0,0,0,.16);" +
      "backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);" +
      "transition:transform .12s ease,opacity .12s ease;";
    btn.innerHTML = "\\uD83C\\uDF38";
    btn.addEventListener("mouseover", function () { btn.style.opacity = "0.9"; btn.style.transform = "translateY(-1px)"; });
    btn.addEventListener("mouseout", function () { btn.style.opacity = "0.55"; btn.style.transform = "translateY(0)"; });
    btnWrap.appendChild(btn);
    footer.appendChild(btnWrap);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { try { injectButton(); } catch (_) {} });
  } else {
    try { injectButton(); } catch (_) {}
  }
})();
`;
writeFileSync('public/js/admin-flower.js', content, 'utf8');
console.log('admin-flower.js written OK');
