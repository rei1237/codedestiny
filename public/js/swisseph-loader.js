import SwissEph from 'https://cdn.jsdelivr.net/gh/prolaxu/swisseph-wasm@main/src/swisseph.js';

(function initSwissEphBridge() {
	if (typeof window === 'undefined') return;

	window.__swissephBridge = {
		ready: false,
		precision: 'legacy',
		error: null
	};

	function toArray(v) {
		if (!v) return null;
		if (Array.isArray(v)) return v;
		if (typeof v.length === 'number') return Array.from(v);
		return null;
	}

	function buildBridge(swe) {
		function sweCalcUt(jdUT, planetId, flags) {
			var res = swe.calc_ut(Number(jdUT), Number(planetId), Number(flags || 0));
			if (Array.isArray(res)) return res;
			if (res && typeof res.length === 'number') return Array.from(res);
			return res;
		}

		function sweHouses(jdUT, lat, lon, hsys) {
			var hs = String(hsys || 'P');
			var h = swe.houses(Number(jdUT), Number(lat), Number(lon), hs);
			return {
				cusps: toArray(h && h.cusps),
				ascmc: toArray(h && h.ascmc)
			};
		}

		function sweHousesEx(jdUT, iflag, lat, lon, hsys) {
			var hs = String(hsys || 'P');
			var h = swe.houses_ex(Number(jdUT), Number(iflag || 0), Number(lat), Number(lon), hs);
			return {
				cusps: toArray(h && h.cusps),
				ascmc: toArray(h && h.ascmc)
			};
		}

		return {
			SE_SUN: swe.SE_SUN,
			SE_MOON: swe.SE_MOON,
			SE_MERCURY: swe.SE_MERCURY,
			SE_VENUS: swe.SE_VENUS,
			SE_MARS: swe.SE_MARS,
			SE_JUPITER: swe.SE_JUPITER,
			SE_SATURN: swe.SE_SATURN,
			SE_URANUS: swe.SE_URANUS,
			SE_NEPTUNE: swe.SE_NEPTUNE,
			SE_PLUTO: swe.SE_PLUTO,
			SEFLG_SWIEPH: swe.SEFLG_SWIEPH,
			SEFLG_SPEED: swe.SEFLG_SPEED,
			swe_calc_ut: sweCalcUt,
			calc_ut: sweCalcUt,
			swe_houses: sweHouses,
			swe_houses_ex: sweHousesEx
		};
	}

	(async function start() {
		var swe = new SwissEph();
		await swe.initSwissEph();

		var bridge = buildBridge(swe);
		window.swisseph = bridge;
		window.Swe = bridge;
		window.swe = bridge;

		window.__swissephBridge.ready = true;
		window.__swissephBridge.precision = 'swisseph-wasm';
		window.__swissephBridge.error = null;
		window.ASTRO_STRICT_PRECISION = true;

		window.dispatchEvent(new CustomEvent('swisseph:ready', {
			detail: { precision: 'swisseph-wasm' }
		}));
	})().catch(function onError(err) {
		window.__swissephBridge.ready = false;
		window.__swissephBridge.precision = 'legacy';
		window.__swissephBridge.error = String((err && err.message) || err || 'SwissEph init failed');
		window.ASTRO_STRICT_PRECISION = false;
		console.warn('[SwissEph] init failed; legacy fallback remains active.', err);
	});
})();
