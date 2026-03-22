(function initSwissEphBridge() {
	if (typeof window === 'undefined') return;

	window.__swissephBridge = {
		ready: false,
		precision: 'loading',
		error: null,
		source: null,
		attempts: []
	};
	window.ASTRO_STRICT_PRECISION = true;

	function getSwissEphModuleCandidates() {
		var candidates = [];
		var custom = String(window.SWISSEPH_WASM_URL || '').trim();
		if (custom) candidates.push(custom);
		candidates.push('/js/vendor/swisseph.js');
		candidates.push('https://cdn.jsdelivr.net/gh/prolaxu/swisseph-wasm@main/src/swisseph.js');
		candidates.push('https://unpkg.com/swisseph-wasm@latest/src/swisseph.js');
		// Deduplicate while preserving order.
		var seen = {};
		return candidates.filter(function(url) {
			if (!url || seen[url]) return false;
			seen[url] = true;
			return true;
		});
	}

	async function loadSwissEphCtor() {
		var urls = getSwissEphModuleCandidates();
		var errors = [];
		for (var i = 0; i < urls.length; i++) {
			var url = urls[i];
			try {
				var mod = await import(/* @vite-ignore */ url);
				var Ctor = (mod && (mod.default || mod.SwissEph || mod)) || null;
				if (typeof Ctor === 'function') {
					window.__swissephBridge.attempts = errors.slice();
					window.__swissephBridge.source = url;
					return Ctor;
				}
				errors.push({ url: url, message: 'module loaded but constructor missing' });
			} catch (e) {
				errors.push({ url: url, message: String((e && e.message) || e || 'import failed') });
			}
		}
		window.__swissephBridge.attempts = errors;
		throw new Error('SwissEph module load failed from all candidates');
	}

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
		var SwissEphCtor = await loadSwissEphCtor();
		var swe = new SwissEphCtor();
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
		window.__swissephBridge.precision = 'unavailable';
		window.__swissephBridge.error = String((err && err.message) || err || 'SwissEph init failed');
		window.ASTRO_STRICT_PRECISION = true;
		try {
			window.dispatchEvent(new CustomEvent('swisseph:error', {
				detail: { error: window.__swissephBridge.error }
			}));
		} catch (_e) {}
		console.error('[SwissEph] init failed; strict precision keeps service-loading state.', err);
	});
})();
