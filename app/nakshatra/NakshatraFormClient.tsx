"use client";
import SavedBirthProfilePicker from "@/app/components/SavedBirthProfilePicker";
import BirthTimeInput from "@/app/components/BirthTimeInput";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { readDestinyProfileAccountId, type DestinyProfileCard } from "@/app/_lib/profile-card-storage";
import { Yantra, Spark } from "./NakshatraSymbols";
import styles from "./nakshatra.module.css";
import {
  PLACE_PRESETS,
  ianaOffsetHours,
  cardToFormValues,
} from "./nakshatra-birth";
import { useNakshatraCopy } from "./_lib/copy";
import { NAKSHATRA_RESULT_STORAGE_KEY } from "./_lib/nakshatra-context";
import { useCoinGate } from "@/app/hooks/useCoinGate";
import { packPaidResumeArg, unpackPaidResumeArg, usePaidResume } from "@/app/hooks/usePaidResume";
import { resolveServerFeaturePricing } from "@/lib/payment/server-feature-pricing";

export { NAKSHATRA_RESULT_STORAGE_KEY } from "./_lib/nakshatra-context";

const nowYear = new Date().getFullYear();
const BASIC_READING_FEATURE_KEY = "nakshatra-basic-reading";
const BASIC_READING_PRICING = resolveServerFeaturePricing({ featureKey: BASIC_READING_FEATURE_KEY });

type NakshatraResolveBody = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  timezone: number;
  lat: number;
  lon: number;
  timeUnknown: boolean;
};

function digits(value: string, max: number): string {
  return value.replace(/\D/g, "").slice(0, max);
}

export default function NakshatraFormClient() {
  const copy = useNakshatraCopy();
  const router = useRouter();
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [birthPlace, setBirthPlace] = useState("서울, 한국");
  const [latitude, setLatitude] = useState("37.5665");
  const [longitude, setLongitude] = useState("126.9780");
  const [timezone, setTimezone] = useState("Asia/Seoul");
  const [geoStatus, setGeoStatus] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const placeRequest = useRef(0);
  useEffect(() => () => { placeRequest.current += 1; }, []);


  const [, setSelectedCardId] = useState<string | null>(null);
  const [lunarNote, setLunarNote] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { ensurePaidAccess, isPaying } = useCoinGate();

  const resolveReading = useCallback(async (body: NakshatraResolveBody) => {
    setLoading(true);
    try {
      const res = await fetch("/api/nakshatra/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || !data.ok) {
        setError(data && data.message ? data.message : copy.formResolveFailedError);
        return false;
      }
      try {
        sessionStorage.setItem(NAKSHATRA_RESULT_STORAGE_KEY, JSON.stringify(data));
      } catch {
        // sessionStorage 불가(사생활 모드 등) — 결과 화면에서 재입력 안내로 폴백.
      }
      router.push("/nakshatra/result");
      return true;
    } catch {
      setError(copy.formNetworkError);
      return false;
    } finally {
      setLoading(false);
    }
  }, [copy.formNetworkError, copy.formResolveFailedError, router]);

  const buildResolveResume = usePaidResume(BASIC_READING_FEATURE_KEY, async (args) => {
    const body = unpackPaidResumeArg<NakshatraResolveBody>(args.body);
    if (!body) return false;
    return resolveReading(body);
  });



  async function selectCard(card: DestinyProfileCard) {
    const selection = ++placeRequest.current;
    const owner = readDestinyProfileAccountId();
    const values = await cardToFormValues(card);
    if(selection !== placeRequest.current || owner !== readDestinyProfileAccountId()) return;
    if (!values) {
      setError(copy.formCardReadError);
      return;
    }
    setError(null);
    setYear(values.year);
    setMonth(values.month);
    setDay(values.day);
    setHour(values.hour);
    setMinute(values.minute);
    setTimeUnknown(values.timeUnknown);
    placeRequest.current += 1;
    setGeocoding(false);
    setBirthPlace(values.birthPlace || "");
    setLatitude(values.latitude || "");
    setLongitude(values.longitude || "");
    setTimezone(values.timezone || "");
    setSelectedCardId(card.id || card.profileId || values.name);
    setLunarNote(values.lunarConverted);
    setGeoStatus(values.birthPlace ? `✓ ${values.birthPlace}` : "");
  }

  function applyPlaceValue(value: string) {
    placeRequest.current += 1;
    setGeocoding(false);
    setBirthPlace(value);
    setSelectedCardId(null);
    const preset = PLACE_PRESETS.find((place) => place.label === value);
    setLatitude(""); setLongitude(""); setTimezone(""); setGeoStatus("");
    if (preset) {
      setLatitude(preset.latitude);
      setLongitude(preset.longitude);
      setTimezone(preset.timezone);
      setGeoStatus(`✓ ${preset.label}`);
    }
  }

  async function handlePlaceBlur() {
    const place = birthPlace.trim();
    if (!place || PLACE_PRESETS.some((preset) => preset.label === place) || geocoding) return;
    setGeocoding(true);
    const request = ++placeRequest.current;
    try {
      const response = await fetch(`/api/geocode?place=${encodeURIComponent(place)}`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (request !== placeRequest.current) return;
      const lat = data && data.lat != null ? String(data.lat) : "";
      const lng = data && data.lng != null ? String(data.lng) : "";
      if (!response.ok || data.fallback || !lat || !lng || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng)) || !data.timezone) throw new Error("LOCATION_UNAVAILABLE");
      setLatitude(lat);
      setLongitude(lng);
      setTimezone(data.timezone);
      setGeoStatus(data && data.fallback === true ? copy.formGeoNotFoundMessage : `✓ ${(data && data.name) || place}`);
    } catch {
      if (request !== placeRequest.current) return;
      setLatitude(""); setLongitude(""); setTimezone("");
      setGeoStatus(copy.formGeoUnstableMessage);
    } finally {
      if (request === placeRequest.current) setGeocoding(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const y = Number(year);
    const m = Number(month);
    const d = Number(day);
    if (!y || !m || !d || m < 1 || m > 12 || d < 1 || d > 31) {
      setError(copy.formInvalidDateError);
      return;
    }

    if (!latitude.trim() || !longitude.trim() || !timezone || !Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) { setError("태어난 도시와 국가를 다시 입력하고 출생지를 확인해 주세요."); document.getElementById("nk-place")?.focus(); return; }
    const effectiveTimeUnknown = timeUnknown || hour.trim() === "";
    const hh = effectiveTimeUnknown ? 12 : Number(hour);
    const mm = effectiveTimeUnknown ? 0 : Number(minute || 0);
    const body = {
      year: y,
      month: m,
      day: d,
      hour: hh,
      minute: mm,
      timezone: ianaOffsetHours(y, m, d, hh, mm, timezone, 9),
      lat: Number.isFinite(Number(latitude)) ? Number(latitude) : 37.5665,
      lon: Number.isFinite(Number(longitude)) ? Number(longitude) : 126.978,
      timeUnknown: effectiveTimeUnknown,
    };

    if (!BASIC_READING_PRICING || isPaying) return;
    const paid = await ensurePaidAccess({
      resume: buildResolveResume({ body: packPaidResumeArg(body) }),
      featureKey: BASIC_READING_FEATURE_KEY,
      coinPrice: BASIC_READING_PRICING.cost,
      cost: BASIC_READING_PRICING.cost,
      amountKRW: BASIC_READING_PRICING.amountKRW,
      reason: "나크샤트라 기본 리딩",
      requestId: `${BASIC_READING_FEATURE_KEY}:${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    });
    if (paid.ok) await resolveReading(body);
    else if (paid.code !== "PAYMENT_CANCELLED") setError(paid.message || "결제를 완료하지 못했어요. 잠시 후 다시 시도해 주세요.");
  }

  return (
    <form data-moonlit-form="" onSubmit={handleSubmit} className={`${styles.vars} ${styles.formCard}`} aria-label={copy.formAriaLabel}>
      <div className={styles.formHead}>
        <Yantra className={styles.fhSym} />
        <h2>{copy.formHeading}</h2>
        <p>{copy.formSub}</p>
      </div>

      <SavedBirthProfilePicker disabled={loading || isPaying} onSelect={(_seed,card)=>selectCard(card)} />

      <fieldset className={styles.fieldset}>
        <div className={styles.legend}>{copy.formBirthLegend} <span className={styles.tag}>{copy.formSolarTag}</span></div>
        <div className={styles.grid3}>
          <div className={styles.fld}>
            <label htmlFor="nk-year">{copy.formYearLabel}</label>
            <input id="nk-year" inputMode="numeric" placeholder={String(nowYear - 30)} value={year}
              onChange={(e) => { setYear(digits(e.target.value, 4)); setSelectedCardId(null); }} />
          </div>
          <div className={styles.fld}>
            <label htmlFor="nk-month">{copy.formMonthLabel}</label>
            <input id="nk-month" inputMode="numeric" placeholder="1~12" value={month}
              onChange={(e) => { setMonth(digits(e.target.value, 2)); setSelectedCardId(null); }} />
          </div>
          <div className={styles.fld}>
            <label htmlFor="nk-day">{copy.formDayLabel}</label>
            <input id="nk-day" inputMode="numeric" placeholder="1~31" value={day}
              onChange={(e) => { setDay(digits(e.target.value, 2)); setSelectedCardId(null); }} />
          </div>
        </div>
        {lunarNote && <div className={styles.note}>{copy.formLunarNote}</div>}
      </fieldset>

      <fieldset className={styles.fieldset}>
        <div className={styles.legend}>{copy.formTimeLegend} <span className={styles.tag}>{copy.formTimeHint}</span></div>
        <BirthTimeInput id="nk-hour" disabled={timeUnknown} value={hour === "" ? "" : hour.padStart(2, "0") + ":" + (minute || "0").padStart(2, "0")}
          onChange={event => { const [h = "", m = ""] = event.target.value.split(":"); setHour(h); setMinute(m); }} />
        <label className={styles.check}>
          <input type="checkbox" checked={timeUnknown} onChange={(e) => setTimeUnknown(e.target.checked)} />
          {copy.formTimeUnknownCheckbox}
        </label>
      </fieldset>

      <fieldset className={styles.fieldset}>
        <div className={styles.legend}>{copy.formPlaceLegend}</div>
        <div className={styles.fld}>
          <input id="nk-place" list="nk-place-presets" value={birthPlace}
            onChange={(e) => applyPlaceValue(e.target.value)} onBlur={() => void handlePlaceBlur()}
            placeholder={copy.formPlacePlaceholder} />
          <datalist id="nk-place-presets">
            {PLACE_PRESETS.map((place) => <option key={place.label} value={place.label} />)}
          </datalist>
          <small className={styles.geoStatus}>
            {geocoding ? copy.formGeocodingText : geoStatus || copy.formGeoHintDefault}
          </small>
        </div>
        <div className={styles.note}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></svg>
          {copy.formPreciseNote}
        </div>
      </fieldset>

      {error && <p role="alert" className={styles.errorBox}>{error}</p>}

      <button type="submit" disabled={loading || isPaying || !BASIC_READING_PRICING} className={styles.submit}>
        <Spark className={styles.spark} />
        {loading || isPaying ? "이용권 확인 중" : `${copy.formSubmitButton} · 3,000원`}
      </button>
      <p className={styles.disclaimer}>{copy.formDisclaimer}</p>
    </form>
  );
}
