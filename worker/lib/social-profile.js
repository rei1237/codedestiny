// Pure provider profile mapping; no OAuth, database, or runtime dependencies.
export function normalizeKoreanPhoneNumber(value) {
  const digits = String(value || "").replace(/\D/g, "");
  const localDigits = digits.startsWith("82") && /^821\d{8,9}$/.test(digits) ? `0${digits.slice(2)}` : digits;
  if (!/^01\d{8,9}$/.test(localDigits)) return "";
  return localDigits;
}

export function mapSocialProfile(provider, payload) {
  if (provider === "google") {
    return {
      providerId: String(payload?.sub || ""),
      email: payload?.email ? String(payload.email).toLowerCase() : "",
      emailVerified: payload?.email_verified === false ? false : (payload?.email_verified === true ? true : null),
      name: String(payload?.name || payload?.given_name || "Google user"),
      image: String(payload?.picture || ""),
      phoneNumber: normalizeKoreanPhoneNumber(payload?.phone_number || payload?.phoneNumber || ""),
    };
  }

  if (provider === "naver") {
    const profile = payload?.response || {};
    return {
      providerId: String(profile?.id || ""),
      email: profile?.email ? String(profile.email).toLowerCase() : "",
      emailVerified: profile?.email_verified === false ? false : (profile?.email_verified === true ? true : null),
      name: String(profile?.name || profile?.nickname || "Naver user"),
      image: String(profile?.profile_image || ""),
      phoneNumber: normalizeKoreanPhoneNumber(profile?.mobile || profile?.mobile_e164 || profile?.phone || profile?.phoneNumber || ""),
      // 제공 항목 "출생연도" 가 켜져 있을 때만 온다(YYYY). 없으면 가입 화면이 직접 묻는다.
      birthYear: String(profile?.birthyear || "").trim(),
    };
  }

  if (provider === "kakao") {
    const account = payload?.kakao_account || {};
    const profile = account?.profile || {};
    return {
      providerId: String(payload?.id || ""),
      email: account?.email ? String(account.email).toLowerCase() : "",
      emailVerified: account?.is_email_verified === false ? false : (account?.is_email_verified === true ? true : null),
      name: String(profile?.nickname || "Kakao user"),
      image: String(profile?.profile_image_url || profile?.thumbnail_image_url || ""),
      phoneNumber: normalizeKoreanPhoneNumber(account?.phone_number || account?.phoneNumber || account?.phone || ""),
    };
  }

  return { providerId: "", email: "", emailVerified: null, name: "", image: "" };
}

