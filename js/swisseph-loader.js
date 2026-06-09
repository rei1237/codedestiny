const SWISS_WASM_MODULE_URL = '/js/vendor/sweph-wasm/index.js';
const SWISS_WASM_BINARY_URL = '/js/vendor/sweph-wasm/wasm/swisseph.wasm';
const SWISS_EPHEMERIS_URL = '/js/vendor/sweph-wasm/ephe/';
const SWISS_EPHEMERIS_FILES = ['seas_18.se1', 'sepl_18.se1', 'semo_18.se1'];

async function loadSwissEphConstructor() {
	var mod = await import(SWISS_WASM_MODULE_URL);
	if (mod && mod.default) return mod.default;
	throw new Error(SWISS_WASM_MODULE_URL + ': missing default export');
}

async function initSwissEph(SwissEphCtor) {
	if (SwissEphCtor && typeof SwissEphCtor.init === 'function') {
		return SwissEphCtor.init(SWISS_WASM_BINARY_URL);
	}
	var swe = new SwissEphCtor();
	if (typeof swe.initSwissEph === 'function') {
		await swe.initSwissEph();
	}
	return swe;
}

async function loadEphemerisFiles(swe) {
	if (!swe || typeof swe.swe_set_ephe_path !== 'function') return;
	await swe.swe_set_ephe_path(SWISS_EPHEMERIS_URL, SWISS_EPHEMERIS_FILES);
}

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
			var calc = (typeof swe.swe_calc_ut === 'function') ? swe.swe_calc_ut.bind(swe) : swe.calc_ut.bind(swe);
			var res = calc(Number(jdUT), Number(planetId), Number(flags || 0));
			if (Array.isArray(res)) return res;
			if (res && typeof res.length === 'number') return Array.from(res);
			return res;
		}

		function sweGetAyanamsaUt(jdUT) {
			if (typeof swe.swe_get_ayanamsa_ut === 'function') {
				return Number(swe.swe_get_ayanamsa_ut(Number(jdUT)));
			}
			if (typeof swe.get_ayanamsa_ut === 'function') {
				return Number(swe.get_ayanamsa_ut(Number(jdUT)));
			}
			return null;
		}

		function sweHouses(jdUT, lat, lon, hsys) {
			var hs = String(hsys || 'P');
			var houses = (typeof swe.swe_houses === 'function') ? swe.swe_houses.bind(swe) : swe.houses.bind(swe);
			var h = houses(Number(jdUT), Number(lat), Number(lon), hs);
			return {
				cusps: toArray(h && h.cusps),
				ascmc: toArray(h && h.ascmc)
			};
		}

		function sweHousesEx(jdUT, iflag, lat, lon, hsys) {
			var hs = String(hsys || 'P');
			var housesEx = (typeof swe.swe_houses_ex === 'function') ? swe.swe_houses_ex.bind(swe) : swe.houses_ex.bind(swe);
			var h = housesEx(Number(jdUT), Number(iflag || 0), Number(lat), Number(lon), hs);
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
			SE_TRUE_NODE: swe.SE_TRUE_NODE,
			SE_MEAN_NODE: swe.SE_MEAN_NODE,
			SE_URANUS: swe.SE_URANUS,
			SE_NEPTUNE: swe.SE_NEPTUNE,
			SE_PLUTO: swe.SE_PLUTO,
			SEFLG_SWIEPH: swe.SEFLG_SWIEPH,
			SEFLG_SPEED: swe.SEFLG_SPEED,
			swe_calc_ut: sweCalcUt,
			calc_ut: sweCalcUt,
			swe_get_ayanamsa_ut: sweGetAyanamsaUt,
			swe_houses: sweHouses,
			swe_houses_ex: sweHousesEx
		};
	}

	(async function start() {
		var SwissEphCtor = await loadSwissEphConstructor();
		var swe = await initSwissEph(SwissEphCtor);
		await loadEphemerisFiles(swe);

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
		window.dispatchEvent(new CustomEvent('swisseph:error', {
			detail: { error: window.__swissephBridge.error }
		}));
		console.warn('[SwissEph] init failed; legacy fallback enabled.', err);
	});
})();
