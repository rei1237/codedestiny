const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const source = fs.readFileSync(path.join(root, "js/pwa-install-prompt.js"), "utf8");

function loadPrompt({ native = false, standalone = false, mobile = false } = {}) {
  const listeners = new Map();
  let ctaClick;
  const cta = {
    addEventListener: (name, listener) => {
      if (name === "click") ctaClick = listener;
    },
  };
  const card = {
    hidden: true,
    querySelector: () => cta,
  };
  const sandbox = {
    Promise,
    console,
    document: {
      documentElement: { getAttribute: () => null },
      getElementById: (id) => (id === "cdAppInstall" ? card : null),
    },
    window: {
      navigator: { standalone },
      matchMedia: (query) => ({
        matches: query === "(display-mode: standalone)" ? standalone : query === "(max-width:720px)" && mobile,
      }),
      addEventListener: (name, listener) => listeners.set(name, listener),
      __cdAppContext: native ? { isApp: () => true } : undefined,
    },
  };
  vm.runInNewContext(source, sandbox, { filename: "pwa-install-prompt.js" });
  return {
    card,
    listeners,
    get ctaClick() {
      return ctaClick;
    },
  };
}

function makePromptEvent(userChoice) {
  let promptCalls = 0;
  return {
    preventDefaultCalled: false,
    preventDefault() {
      this.preventDefaultCalled = true;
    },
    prompt() {
      promptCalls += 1;
    },
    get promptCalls() {
      return promptCalls;
    },
    userChoice,
  };
}

test("does not expose a dead install card when beforeinstallprompt is absent on mobile", () => {
  const { card, ctaClick } = loadPrompt({ mobile: true });
  assert.equal(card.hidden, true);
  assert.equal(ctaClick, undefined);
});

test("shows the card only for a valid install event and keeps it visible until accepted", async () => {
  let resolveChoice;
  const userChoice = new Promise((resolve) => {
    resolveChoice = resolve;
  });
  const event = makePromptEvent(userChoice);
  const controls = loadPrompt();
  const { card, listeners } = controls;

  listeners.get("beforeinstallprompt")(event);
  assert.equal(event.preventDefaultCalled, true);
  assert.equal(card.hidden, false);

  controls.ctaClick();
  assert.equal(event.promptCalls, 1);
  assert.equal(card.hidden, false);

  resolveChoice({ outcome: "accepted" });
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(card.hidden, true);
});

test("hides the consumed card after dismissal and waits for a fresh event", async () => {
  const event = makePromptEvent(Promise.resolve({ outcome: "dismissed" }));
  const controls = loadPrompt();
  const { card, listeners } = controls;

  listeners.get("beforeinstallprompt")(event);
  controls.ctaClick();
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(card.hidden, true);
  controls.ctaClick();
  assert.equal(event.promptCalls, 1);
});

test("keeps the card visible when prompt invocation fails", () => {
  const event = makePromptEvent(Promise.resolve({ outcome: "accepted" }));
  event.prompt = () => {
    throw new Error("prompt unavailable");
  };
  const controls = loadPrompt();
  const { card, listeners } = controls;

  listeners.get("beforeinstallprompt")(event);
  controls.ctaClick();

  assert.equal(card.hidden, false);
});

test("ignores install events in native and standalone runtimes", () => {
  for (const options of [{ native: true }, { standalone: true }]) {
    const event = makePromptEvent(Promise.resolve({ outcome: "accepted" }));
    const { card, listeners } = loadPrompt(options);
    listeners.get("beforeinstallprompt")(event);
    assert.equal(card.hidden, true);
    assert.equal(event.promptCalls, 0);
  }
});

test("appinstalled clears and hides the card", () => {
  const event = makePromptEvent(Promise.resolve({ outcome: "accepted" }));
  const { card, listeners } = loadPrompt();
  listeners.get("beforeinstallprompt")(event);
  assert.equal(card.hidden, false);
  listeners.get("appinstalled")();
  assert.equal(card.hidden, true);
});
