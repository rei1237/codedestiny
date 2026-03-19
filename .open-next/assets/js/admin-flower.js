/* 서비스 화면 하단 “꽃” 관리자 진입 버튼
   - 화면에 "admin"이라는 텍스트를 표시하지 않는다.
   - 하단에 항상 꽃 이모지를 배치하고, 클릭 시 서버 진입 엔드포인트로 이동한다.
   - 실제 관리자 경로(32자리 해시)는 코드에 하드코딩하지 않는다.
*/

function ensureButton() {
  const footer = document.querySelector('footer[role="contentinfo"]') || document.querySelector("footer");
  if (!footer) return;
  if (document.getElementById("cdAdminFlowerBtn")) return;

  const btnWrap = document.createElement("div");
  btnWrap.id = "cdAdminFlowerWrap";
  btnWrap.style.marginTop = "10px";
  btnWrap.style.display = "flex";
  btnWrap.style.justifyContent = "center";
  btnWrap.style.pointerEvents = "auto";

  const btn = document.createElement("button");
  btn.id = "cdAdminFlowerBtn";
  btn.type = "button";
  btn.setAttribute("aria-label", "꽃 버튼");
  btn.style.borderRadius = "999px";
  btn.style.width = "52px";
  btn.style.height = "52px";
  btn.style.border = "1px solid rgba(244,114,182,.18)";
  btn.style.background = "rgba(244,114,182,.04)";
  btn.style.color = "rgba(255,255,255,.82)";
  btn.style.opacity = "0.72";
  btn.style.cursor = "pointer";
  btn.style.display = "flex";
  btn.style.alignItems = "center";
  btn.style.justifyContent = "center";
  btn.style.boxShadow = "0 6px 16px rgba(0,0,0,.18)";
  btn.style.backdropFilter = "blur(8px)";
  btn.style.transition = "transform .12s ease, background .12s ease";
  btn.innerHTML = "🌸";

  btn.addEventListener("mouseover", () => {
    btn.style.transform = "translateY(-1px)";
    btn.style.opacity = "0.9";
  });
  btn.addEventListener("mouseout", () => {
    btn.style.transform = "translateY(0px)";
    btn.style.opacity = "0.72";
  });

  btn.addEventListener("click", () => {
    // secret hash 노출 없이 서버 리다이렉트 수행
    window.location.href = "/api/admin/entry";
  });

  btnWrap.appendChild(btn);
  footer.appendChild(btnWrap);
}

window.addEventListener("DOMContentLoaded", () => {
  try {
    ensureButton();
  } catch (_) {}
});

