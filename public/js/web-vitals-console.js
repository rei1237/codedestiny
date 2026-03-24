// node_modules/web-vitals/dist/web-vitals.js
var e;
var o = -1;
var a = function(e2) {
  addEventListener("pageshow", function(n) {
    n.persisted && (o = n.timeStamp, e2(n));
  }, true);
};
var c = function() {
  var e2 = self.performance && performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
  if (e2 && e2.responseStart > 0 && e2.responseStart < performance.now()) return e2;
};
var u = function() {
  var e2 = c();
  return e2 && e2.activationStart || 0;
};
var f = function(e2, n) {
  var t = c(), r = "navigate";
  o >= 0 ? r = "back-forward-cache" : t && (document.prerendering || u() > 0 ? r = "prerender" : document.wasDiscarded ? r = "restore" : t.type && (r = t.type.replace(/_/g, "-")));
  return { name: e2, value: void 0 === n ? -1 : n, rating: "good", delta: 0, entries: [], id: "v4-".concat(Date.now(), "-").concat(Math.floor(8999999999999 * Math.random()) + 1e12), navigationType: r };
};
var s = function(e2, n, t) {
  try {
    if (PerformanceObserver.supportedEntryTypes.includes(e2)) {
      var r = new PerformanceObserver(function(e3) {
        Promise.resolve().then(function() {
          n(e3.getEntries());
        });
      });
      return r.observe(Object.assign({ type: e2, buffered: true }, t || {})), r;
    }
  } catch (e3) {
  }
};
var d = function(e2, n, t, r) {
  var i, o2;
  return function(a2) {
    n.value >= 0 && (a2 || r) && ((o2 = n.value - (i || 0)) || void 0 === i) && (i = n.value, n.delta = o2, n.rating = function(e3, n2) {
      return e3 > n2[1] ? "poor" : e3 > n2[0] ? "needs-improvement" : "good";
    }(n.value, t), e2(n));
  };
};
var l = function(e2) {
  requestAnimationFrame(function() {
    return requestAnimationFrame(function() {
      return e2();
    });
  });
};
var p = function(e2) {
  document.addEventListener("visibilitychange", function() {
    "hidden" === document.visibilityState && e2();
  });
};
var v = function(e2) {
  var n = false;
  return function() {
    n || (e2(), n = true);
  };
};
var m = -1;
var h = function() {
  return "hidden" !== document.visibilityState || document.prerendering ? 1 / 0 : 0;
};
var g = function(e2) {
  "hidden" === document.visibilityState && m > -1 && (m = "visibilitychange" === e2.type ? e2.timeStamp : 0, T());
};
var y = function() {
  addEventListener("visibilitychange", g, true), addEventListener("prerenderingchange", g, true);
};
var T = function() {
  removeEventListener("visibilitychange", g, true), removeEventListener("prerenderingchange", g, true);
};
var E = function() {
  return m < 0 && (m = h(), y(), a(function() {
    setTimeout(function() {
      m = h(), y();
    }, 0);
  })), { get firstHiddenTime() {
    return m;
  } };
};
var C = function(e2) {
  document.prerendering ? addEventListener("prerenderingchange", function() {
    return e2();
  }, true) : e2();
};
var b = [1800, 3e3];
var S = function(e2, n) {
  n = n || {}, C(function() {
    var t, r = E(), i = f("FCP"), o2 = s("paint", function(e3) {
      e3.forEach(function(e4) {
        "first-contentful-paint" === e4.name && (o2.disconnect(), e4.startTime < r.firstHiddenTime && (i.value = Math.max(e4.startTime - u(), 0), i.entries.push(e4), t(true)));
      });
    });
    o2 && (t = d(e2, i, b, n.reportAllChanges), a(function(r2) {
      i = f("FCP"), t = d(e2, i, b, n.reportAllChanges), l(function() {
        i.value = performance.now() - r2.timeStamp, t(true);
      });
    }));
  });
};
var L = [0.1, 0.25];
var w = function(e2, n) {
  n = n || {}, S(v(function() {
    var t, r = f("CLS", 0), i = 0, o2 = [], c2 = function(e3) {
      e3.forEach(function(e4) {
        if (!e4.hadRecentInput) {
          var n2 = o2[0], t2 = o2[o2.length - 1];
          i && e4.startTime - t2.startTime < 1e3 && e4.startTime - n2.startTime < 5e3 ? (i += e4.value, o2.push(e4)) : (i = e4.value, o2 = [e4]);
        }
      }), i > r.value && (r.value = i, r.entries = o2, t());
    }, u2 = s("layout-shift", c2);
    u2 && (t = d(e2, r, L, n.reportAllChanges), p(function() {
      c2(u2.takeRecords()), t(true);
    }), a(function() {
      i = 0, r = f("CLS", 0), t = d(e2, r, L, n.reportAllChanges), l(function() {
        return t();
      });
    }), setTimeout(t, 0));
  }));
};
var A = 0;
var I = 1 / 0;
var P = 0;
var M = function(e2) {
  e2.forEach(function(e3) {
    e3.interactionId && (I = Math.min(I, e3.interactionId), P = Math.max(P, e3.interactionId), A = P ? (P - I) / 7 + 1 : 0);
  });
};
var k = function() {
  return e ? A : performance.interactionCount || 0;
};
var F = function() {
  "interactionCount" in performance || e || (e = s("event", M, { type: "event", buffered: true, durationThreshold: 0 }));
};
var D = [];
var x = /* @__PURE__ */ new Map();
var R = 0;
var B = function() {
  var e2 = Math.min(D.length - 1, Math.floor((k() - R) / 50));
  return D[e2];
};
var H = [];
var q = function(e2) {
  if (H.forEach(function(n2) {
    return n2(e2);
  }), e2.interactionId || "first-input" === e2.entryType) {
    var n = D[D.length - 1], t = x.get(e2.interactionId);
    if (t || D.length < 10 || e2.duration > n.latency) {
      if (t) e2.duration > t.latency ? (t.entries = [e2], t.latency = e2.duration) : e2.duration === t.latency && e2.startTime === t.entries[0].startTime && t.entries.push(e2);
      else {
        var r = { id: e2.interactionId, latency: e2.duration, entries: [e2] };
        x.set(r.id, r), D.push(r);
      }
      D.sort(function(e3, n2) {
        return n2.latency - e3.latency;
      }), D.length > 10 && D.splice(10).forEach(function(e3) {
        return x.delete(e3.id);
      });
    }
  }
};
var O = function(e2) {
  var n = self.requestIdleCallback || self.setTimeout, t = -1;
  return e2 = v(e2), "hidden" === document.visibilityState ? e2() : (t = n(e2), p(e2)), t;
};
var N = [200, 500];
var j = function(e2, n) {
  "PerformanceEventTiming" in self && "interactionId" in PerformanceEventTiming.prototype && (n = n || {}, C(function() {
    var t;
    F();
    var r, i = f("INP"), o2 = function(e3) {
      O(function() {
        e3.forEach(q);
        var n2 = B();
        n2 && n2.latency !== i.value && (i.value = n2.latency, i.entries = n2.entries, r());
      });
    }, c2 = s("event", o2, { durationThreshold: null !== (t = n.durationThreshold) && void 0 !== t ? t : 40 });
    r = d(e2, i, N, n.reportAllChanges), c2 && (c2.observe({ type: "first-input", buffered: true }), p(function() {
      o2(c2.takeRecords()), r(true);
    }), a(function() {
      R = k(), D.length = 0, x.clear(), i = f("INP"), r = d(e2, i, N, n.reportAllChanges);
    }));
  }));
};
var _ = [2500, 4e3];
var z = {};
var G = function(e2, n) {
  n = n || {}, C(function() {
    var t, r = E(), i = f("LCP"), o2 = function(e3) {
      n.reportAllChanges || (e3 = e3.slice(-1)), e3.forEach(function(e4) {
        e4.startTime < r.firstHiddenTime && (i.value = Math.max(e4.startTime - u(), 0), i.entries = [e4], t());
      });
    }, c2 = s("largest-contentful-paint", o2);
    if (c2) {
      t = d(e2, i, _, n.reportAllChanges);
      var m2 = v(function() {
        z[i.id] || (o2(c2.takeRecords()), c2.disconnect(), z[i.id] = true, t(true));
      });
      ["keydown", "click"].forEach(function(e3) {
        addEventListener(e3, function() {
          return O(m2);
        }, { once: true, capture: true });
      }), p(m2), a(function(r2) {
        i = f("LCP"), t = d(e2, i, _, n.reportAllChanges), l(function() {
          i.value = performance.now() - r2.timeStamp, z[i.id] = true, t(true);
        });
      });
    }
  });
};

// scripts/web-vitals-console.mjs
var THRESHOLDS = { LCP: 2500, CLS: 0.1, INP: 200 };
function shouldLogVitalsToConsole() {
  if (window.__ENABLE_WEB_VITALS_CONSOLE__ === true) return true;
  try {
    var q = new URLSearchParams(location.search || '');
    return q.get('debugVitals') === '1' || localStorage.getItem('debug.vitals') === '1';
  } catch (e2) {
    return false;
  }
}
function report(name, metric) {
  if (!shouldLogVitalsToConsole()) return;
  const v2 = metric.value;
  let pass = true;
  if (name === "LCP") pass = v2 <= THRESHOLDS.LCP;
  else if (name === "CLS") pass = v2 <= THRESHOLDS.CLS;
  else if (name === "INP") pass = v2 <= THRESHOLDS.INP;
  const payload = {
    value: v2,
    rating: metric.rating,
    threshold: THRESHOLDS[name],
    pass,
    id: metric.id,
    navigationType: metric.navigationType
  };
  if (pass) {
    console.log("[web-vitals]", name, payload);
  } else {
    console.warn("[web-vitals] THRESHOLD EXCEEDED", name, payload);
  }
}
w((m2) => report("CLS", m2));
j((m2) => report("INP", m2));
G((m2) => report("LCP", m2));
