import { SERVICES, resolveServiceId } from "./services/service-registry.js";

const STYLE_ID = "static-service-runner-style";
const ROOT_ID = "static-service-runner";

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${ROOT_ID} {
      margin: 20px 12px 8px;
      border: 1px solid rgba(167, 139, 250, 0.35);
      border-radius: 16px;
      background: linear-gradient(135deg, rgba(17, 24, 39, 0.95), rgba(30, 41, 59, 0.95));
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.28);
      color: #f8fafc;
      overflow: hidden;
    }
    #${ROOT_ID}[hidden] { display: none !important; }
    .static-service-runner__head {
      display: flex;
      gap: 8px;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.3);
      flex-wrap: wrap;
    }
    .static-service-runner__title { font-weight: 700; font-size: 15px; }
    .static-service-runner__actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .static-service-runner__btn {
      border: 1px solid rgba(148, 163, 184, 0.4);
      background: rgba(15, 23, 42, 0.7);
      color: #f8fafc;
      border-radius: 10px;
      padding: 8px 10px;
      cursor: pointer;
      font-size: 13px;
    }
    .static-service-runner__body { padding: 12px; }
    .static-service-panel { display: grid; gap: 10px; }
    .static-service-panel__title { margin: 0; font-size: 18px; }
    .static-service-panel__desc { margin: 0; color: #cbd5e1; }
    .static-service-panel__btn {
      width: fit-content;
      border: 0;
      border-radius: 10px;
      padding: 8px 12px;
      background: linear-gradient(135deg, #7c3aed, #db2777);
      color: #fff;
      cursor: pointer;
      font-weight: 600;
    }
    .static-service-result {
      border: 1px solid rgba(125, 211, 252, 0.35);
      border-radius: 12px;
      padding: 10px;
      background: rgba(15, 23, 42, 0.6);
    }
    .static-service-result strong { display: block; margin-bottom: 6px; }
  `;
  document.head.appendChild(style);
}

function ensureRoot() {
  let root = document.getElementById(ROOT_ID);
  if (root) return root;

  root = document.createElement("section");
  root.id = ROOT_ID;
  root.hidden = true;
  root.innerHTML = `
    <div class="static-service-runner__head">
      <div class="static-service-runner__title">/static 서비스 실행 영역</div>
      <div class="static-service-runner__actions">
        <button type="button" class="static-service-runner__btn" data-service-nav="tarot">타로</button>
        <button type="button" class="static-service-runner__btn" data-service-nav="hwatu-life">화투 인생 패</button>
        <button type="button" class="static-service-runner__btn" data-service-nav="stonehenge-rune">스톤헨지 룬</button>
        <button type="button" class="static-service-runner__btn" data-service-nav="pig-oracle">돼지 주석점</button>
        <button type="button" class="static-service-runner__btn" data-service-close>닫기</button>
      </div>
    </div>
    <div class="static-service-runner__body" data-service-body></div>
  `;

  const anchor = document.querySelector("main") || document.body;
  anchor.prepend(root);
  return root;
}

function setServiceQuery(serviceId) {
  const url = new URL(window.location.href);
  url.searchParams.set("service", serviceId);
  url.searchParams.delete("action");
  url.hash = "";
  window.history.replaceState({}, "", url.toString());
}

function clearServiceQuery() {
  const url = new URL(window.location.href);
  url.searchParams.delete("service");
  url.searchParams.delete("action");
  url.hash = "";
  window.history.replaceState({}, "", url.toString());
}

function resolveLegacyServiceHint() {
  const url = new URL(window.location.href);
  const params = url.searchParams;
  const action = String(params.get("action") || "").trim();
  const hash = String(url.hash || "").replace(/^#/, "").trim();

  const actionMap = {
    openTarotModal: "tarot",
    openRuneOracle: "stonehenge-rune",
    openHwatuModal: "hwatu-life",
  };

  if (action && actionMap[action]) {
    return actionMap[action];
  }

  if (hash) {
    return resolveServiceId(hash);
  }

  return "";
}

function renderService(serviceId) {
  const root = ensureRoot();
  const body = root.querySelector("[data-service-body]");
  const service = SERVICES[serviceId];
  if (!body || !service) return;

  body.innerHTML = "";
  service.entry(body);
  root.hidden = false;
  setServiceQuery(serviceId);
  root.scrollIntoView({ behavior: "smooth", block: "start" });
}

function bindRootEvents(root) {
  root.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const nav = target.closest("[data-service-nav]");
    if (nav instanceof HTMLElement) {
      const next = resolveServiceId(nav.getAttribute("data-service-nav"));
      if (SERVICES[next]) renderService(next);
      return;
    }

    if (target.closest("[data-service-close]")) {
      root.hidden = true;
      clearServiceQuery();
    }
  });
}

function bindTileEntrypoints() {
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const trigger = target.closest("[data-static-service]");
    if (!(trigger instanceof HTMLElement)) return;

    const serviceId = resolveServiceId(trigger.getAttribute("data-static-service"));
    if (!SERVICES[serviceId]) return;

    event.preventDefault();
    renderService(serviceId);
  });
}

function initFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = resolveServiceId(params.get("service"));
  const fromLegacy = resolveLegacyServiceHint();
  const serviceId = fromQuery || fromLegacy;
  if (!SERVICES[serviceId]) return;
  renderService(serviceId);
}

function init() {
  ensureStyle();
  const root = ensureRoot();
  bindRootEvents(root);
  bindTileEntrypoints();
  initFromQuery();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}

// 전역 함수: coin gate에서 _cdInvokeActionDirect("openRuneOracle") 호출 시 사용
window.openRuneOracle = function () {
  renderService("stonehenge-rune");
};
