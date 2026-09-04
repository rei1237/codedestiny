/**
 * Restore Credentials(Android Zero-Tap Sign-In)의 WebAuthn 응답 검증 — 순수 함수만 둔다.
 *
 * 설계 정본: docs/app-audit/ZERO_TAP_SIGNIN_DESIGN.md §4.
 * 네이티브 뼈대는 CodeDestinyCredentialsPlugin(create/restore/clear)이고, 여기서는 그 플러그인이
 * 돌려준 responseJson 만 다룬다. DB·env·요청 객체를 만지지 않으므로 라우트 없이 단위 테스트가 된다.
 *
 * 🔴 이 파일은 ES256(P-256/ECDSA-SHA256) 한 가지만 받는다. 등록 요청의 pubKeyCredParams 를
 * ES256 하나로 내려보내므로 다른 알고리즘이 오면 그건 우리가 요청한 자격증명이 아니다.
 *
 * 🔴 서명 검증은 node:crypto 가 아니라 WebCrypto(crypto.subtle)로 한다 — Workers 런타임의
 * nodejs_compat 는 createVerify 를 제공하지 않는다.
 *
 * 🔴 origin 은 신뢰 기준이 아니다. Android 네이티브 자격증명의 clientDataJSON.origin 은
 * "android:apk-key-hash:<base64url>" 꼴인데, 그 해시는 Play 앱 서명 키 지문이라 이 레포에서
 * 확인할 수 없다(업로드 키와 다른 값이다). 대신 rpIdHash == sha256(rpId) 를 강제한다 —
 * 이것이 자격증명을 우리 도메인에 묶는 WebAuthn 의 실제 바인딩이다. origin 은 관측용으로만 반환한다.
 */

import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";

const COSE_KTY = 1;
const COSE_ALG = 3;
const COSE_CRV = -1;
const COSE_X = -2;
const COSE_Y = -3;

const COSE_KTY_EC2 = 2;
const COSE_ALG_ES256 = -7;
const COSE_CRV_P256 = 1;

const FLAG_USER_PRESENT = 0x01;
const FLAG_ATTESTED_CREDENTIAL_DATA = 0x40;

const P256_COORDINATE_BYTES = 32;

export function base64urlToBytes(value) {
  const text = String(value || "");
  if (!text) return new Uint8Array(0);
  return new Uint8Array(Buffer.from(text, "base64url"));
}

export function bytesToBase64url(bytes) {
  return Buffer.from(bytes || []).toString("base64url");
}

function sha256(bytes) {
  return new Uint8Array(createHash("sha256").update(Buffer.from(bytes)).digest());
}

/**
 * 최소 CBOR 디코더 — attestationObject 와 COSE 공개키에 실제로 쓰이는 major type 만 지원한다.
 * 부동소수·불확정 길이·bignum 은 이 경로에 나타나지 않으므로 만나면 던진다(조용히 넘기지 않는다).
 */
function decodeCborItem(view, bytes, offset) {
  if (offset >= bytes.length) throw new Error("CBOR_TRUNCATED");
  const initial = bytes[offset];
  const major = initial >> 5;
  const info = initial & 0x1f;
  let pos = offset + 1;
  let length = info;

  if (info === 24) {
    if (pos + 1 > bytes.length) throw new Error("CBOR_TRUNCATED");
    length = view.getUint8(pos);
    pos += 1;
  } else if (info === 25) {
    if (pos + 2 > bytes.length) throw new Error("CBOR_TRUNCATED");
    length = view.getUint16(pos, false);
    pos += 2;
  } else if (info === 26) {
    if (pos + 4 > bytes.length) throw new Error("CBOR_TRUNCATED");
    length = view.getUint32(pos, false);
    pos += 4;
  } else if (info >= 27) {
    throw new Error("CBOR_UNSUPPORTED_LENGTH");
  }

  switch (major) {
    case 0:
      return { value: length, offset: pos };
    case 1:
      return { value: -1 - length, offset: pos };
    case 2: {
      if (pos + length > bytes.length) throw new Error("CBOR_TRUNCATED");
      return { value: bytes.slice(pos, pos + length), offset: pos + length };
    }
    case 3: {
      if (pos + length > bytes.length) throw new Error("CBOR_TRUNCATED");
      return { value: new TextDecoder().decode(bytes.slice(pos, pos + length)), offset: pos + length };
    }
    case 4: {
      const items = [];
      let cursor = pos;
      for (let i = 0; i < length; i += 1) {
        const item = decodeCborItem(view, bytes, cursor);
        items.push(item.value);
        cursor = item.offset;
      }
      return { value: items, offset: cursor };
    }
    case 5: {
      const map = new Map();
      let cursor = pos;
      for (let i = 0; i < length; i += 1) {
        const key = decodeCborItem(view, bytes, cursor);
        const value = decodeCborItem(view, bytes, key.offset);
        map.set(key.value, value.value);
        cursor = value.offset;
      }
      return { value: map, offset: cursor };
    }
    case 6: {
      // 태그는 값을 감싸기만 한다 — 내용만 꺼낸다.
      return decodeCborItem(view, bytes, pos);
    }
    case 7: {
      if (info === 20) return { value: false, offset: pos };
      if (info === 21) return { value: true, offset: pos };
      if (info === 22) return { value: null, offset: pos };
      throw new Error("CBOR_UNSUPPORTED_SIMPLE");
    }
    default:
      throw new Error("CBOR_UNSUPPORTED_MAJOR");
  }
}

export function decodeCbor(bytes) {
  const input = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  const view = new DataView(input.buffer, input.byteOffset, input.byteLength);
  const { value } = decodeCborItem(view, input, 0);
  return value;
}

/**
 * authenticatorData 파싱.
 * 레이아웃: rpIdHash(32) | flags(1) | signCount(4, BE) | [aaguid(16) credIdLen(2) credId COSE키]
 */
export function parseAuthenticatorData(bytes) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
  if (data.length < 37) throw new Error("AUTH_DATA_TOO_SHORT");

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const rpIdHash = data.slice(0, 32);
  const flags = data[32];
  const signCount = view.getUint32(33, false);

  const parsed = {
    rpIdHash,
    flags,
    signCount,
    userPresent: (flags & FLAG_USER_PRESENT) !== 0,
    credentialId: null,
    coseKey: null,
  };

  if ((flags & FLAG_ATTESTED_CREDENTIAL_DATA) === 0) return parsed;

  if (data.length < 55) throw new Error("ATTESTED_DATA_TOO_SHORT");
  const credentialIdLength = view.getUint16(53, false);
  const credentialIdEnd = 55 + credentialIdLength;
  if (data.length < credentialIdEnd) throw new Error("CREDENTIAL_ID_TRUNCATED");

  parsed.credentialId = data.slice(55, credentialIdEnd);
  parsed.coseKey = decodeCbor(data.slice(credentialIdEnd));
  return parsed;
}

/** COSE_Key(EC2/ES256/P-256)를 WebCrypto 가 받는 JWK 로. 다른 조합은 전부 거부한다. */
export function coseKeyToJwk(coseKey) {
  if (!(coseKey instanceof Map)) throw new Error("COSE_KEY_NOT_A_MAP");
  if (Number(coseKey.get(COSE_KTY)) !== COSE_KTY_EC2) throw new Error("COSE_KTY_UNSUPPORTED");
  if (Number(coseKey.get(COSE_ALG)) !== COSE_ALG_ES256) throw new Error("COSE_ALG_UNSUPPORTED");
  if (Number(coseKey.get(COSE_CRV)) !== COSE_CRV_P256) throw new Error("COSE_CRV_UNSUPPORTED");

  const x = coseKey.get(COSE_X);
  const y = coseKey.get(COSE_Y);
  if (!(x instanceof Uint8Array) || x.length !== P256_COORDINATE_BYTES) throw new Error("COSE_X_INVALID");
  if (!(y instanceof Uint8Array) || y.length !== P256_COORDINATE_BYTES) throw new Error("COSE_Y_INVALID");

  return {
    kty: "EC",
    crv: "P-256",
    x: bytesToBase64url(x),
    y: bytesToBase64url(y),
  };
}

/**
 * WebAuthn 서명은 DER(SEQUENCE{INTEGER r, INTEGER s})인데 WebCrypto ECDSA 는 r|s 고정폭 64바이트를
 * 요구한다. DER INTEGER 는 최상위 비트가 서면 0x00 을 앞에 붙이므로 그 패딩을 걷고 32바이트로 다시 맞춘다.
 */
export function derSignatureToRaw(derBytes) {
  const der = derBytes instanceof Uint8Array ? derBytes : new Uint8Array(derBytes || []);
  if (der.length < 8 || der[0] !== 0x30) throw new Error("DER_NOT_A_SEQUENCE");

  let pos = 2;
  if (der[1] & 0x80) {
    // 길이가 장형(long form)이면 그 바이트 수만큼 건너뛴다.
    pos = 2 + (der[1] & 0x7f);
  }

  const readInteger = () => {
    if (der[pos] !== 0x02) throw new Error("DER_NOT_AN_INTEGER");
    const length = der[pos + 1];
    const start = pos + 2;
    const end = start + length;
    if (end > der.length) throw new Error("DER_TRUNCATED");
    pos = end;

    let value = der.slice(start, end);
    while (value.length > P256_COORDINATE_BYTES && value[0] === 0x00) value = value.slice(1);
    if (value.length > P256_COORDINATE_BYTES) throw new Error("DER_INTEGER_TOO_LONG");

    const padded = new Uint8Array(P256_COORDINATE_BYTES);
    padded.set(value, P256_COORDINATE_BYTES - value.length);
    return padded;
  };

  const r = readInteger();
  const s = readInteger();

  const raw = new Uint8Array(P256_COORDINATE_BYTES * 2);
  raw.set(r, 0);
  raw.set(s, P256_COORDINATE_BYTES);
  return raw;
}

export async function verifyEs256Signature({ jwk, signature, data }) {
  const key = await crypto.subtle.importKey(
    "jwk",
    { ...jwk, ext: true, key_ops: ["verify"] },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"],
  );

  return crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    signature,
    data,
  );
}

function parseClientData(clientDataBytes, expectedType, expectedChallenge) {
  let clientData;
  try {
    clientData = JSON.parse(new TextDecoder().decode(clientDataBytes));
  } catch (e) {
    return { ok: false, code: "CLIENT_DATA_NOT_JSON" };
  }

  if (String(clientData?.type || "") !== expectedType) {
    return { ok: false, code: "CLIENT_DATA_TYPE_MISMATCH" };
  }
  // challenge 는 base64url 문자열이다. 서버가 발급한 값과 정확히 같아야 한다(재생 방지).
  if (String(clientData?.challenge || "") !== String(expectedChallenge || "")) {
    return { ok: false, code: "CHALLENGE_MISMATCH" };
  }

  return { ok: true, origin: String(clientData?.origin || ""), crossOrigin: clientData?.crossOrigin === true };
}

function readResponseEnvelope(responseJson) {
  let parsed;
  try {
    parsed = typeof responseJson === "string" ? JSON.parse(responseJson) : responseJson;
  } catch (e) {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  if (!parsed.response || typeof parsed.response !== "object") return null;
  return parsed;
}

/**
 * 서명 검증 **전에** clientDataJSON 의 challenge 만 꺼낸다.
 *
 * 🔴 순서가 중요하다. 라우트는 이 값으로 저장소의 1회용 challenge 를 원자적으로 소비한 뒤에야
 * 서명을 검증한다 — "우리가 발급했고 아직 안 쓴 challenge 인가"가 실제 재생 방지 관문이고,
 * verify* 의 challenge 비교는 그 뒤에 오는 이중 확인이다.
 */
export function readResponseChallenge(responseJson) {
  const envelope = readResponseEnvelope(responseJson);
  if (!envelope) return "";
  try {
    const clientData = JSON.parse(new TextDecoder().decode(base64urlToBytes(envelope.response.clientDataJSON)));
    return String(clientData?.challenge || "");
  } catch (e) {
    return "";
  }
}

/** 응답 봉투의 자격증명 식별자(base64url). id 가 없으면 rawId 를 본다. */
export function readResponseCredentialId(responseJson) {
  const envelope = readResponseEnvelope(responseJson);
  if (!envelope) return "";
  return String(envelope.id || envelope.rawId || "");
}

/**
 * 등록(create) 응답 검증. 성공하면 저장할 공개키 재료를 돌려준다.
 * 실패는 전부 { ok:false, code } — 던지지 않는다(호출부가 사용자 문구를 고르게).
 */
export async function verifyRestoreRegistration({ responseJson, expectedChallenge, expectedRpId }) {
  const envelope = readResponseEnvelope(responseJson);
  if (!envelope) return { ok: false, code: "RESPONSE_MALFORMED" };

  let authData;
  let attestationFormat = "";
  try {
    const clientDataBytes = base64urlToBytes(envelope.response.clientDataJSON);
    const clientData = parseClientData(clientDataBytes, "webauthn.create", expectedChallenge);
    if (!clientData.ok) return clientData;

    const attestation = decodeCbor(base64urlToBytes(envelope.response.attestationObject));
    if (!(attestation instanceof Map)) return { ok: false, code: "ATTESTATION_MALFORMED" };
    attestationFormat = String(attestation.get("fmt") || "");

    const rawAuthData = attestation.get("authData");
    if (!(rawAuthData instanceof Uint8Array)) return { ok: false, code: "AUTH_DATA_MISSING" };
    authData = parseAuthenticatorData(rawAuthData);

    if (!bytesEqual(authData.rpIdHash, sha256(new TextEncoder().encode(String(expectedRpId || ""))))) {
      return { ok: false, code: "RP_ID_MISMATCH" };
    }
    if (!authData.credentialId || !authData.credentialId.length) {
      return { ok: false, code: "CREDENTIAL_ID_MISSING" };
    }

    const publicKeyJwk = coseKeyToJwk(authData.coseKey);

    return {
      ok: true,
      credentialId: bytesToBase64url(authData.credentialId),
      publicKeyJwk,
      algorithm: "ES256",
      signCount: authData.signCount,
      attestationFormat,
      origin: clientData.origin,
    };
  } catch (error) {
    return { ok: false, code: String(error?.message || "REGISTRATION_PARSE_FAILED") };
  }
}

/**
 * 복원(restore) 응답 검증. 서명 대상은 WebAuthn 규격대로 authenticatorData || sha256(clientDataJSON).
 * signCount 단조 증가 검사는 저장값이 필요하므로 호출부(라우트)가 한다 — 여기서는 읽은 값만 돌려준다.
 */
export async function verifyRestoreAssertion({ responseJson, expectedChallenge, expectedRpId, publicKeyJwk }) {
  const envelope = readResponseEnvelope(responseJson);
  if (!envelope) return { ok: false, code: "RESPONSE_MALFORMED" };

  try {
    const clientDataBytes = base64urlToBytes(envelope.response.clientDataJSON);
    const clientData = parseClientData(clientDataBytes, "webauthn.get", expectedChallenge);
    if (!clientData.ok) return clientData;

    const rawAuthData = base64urlToBytes(envelope.response.authenticatorData);
    const authData = parseAuthenticatorData(rawAuthData);

    if (!bytesEqual(authData.rpIdHash, sha256(new TextEncoder().encode(String(expectedRpId || ""))))) {
      return { ok: false, code: "RP_ID_MISMATCH" };
    }

    const signature = derSignatureToRaw(base64urlToBytes(envelope.response.signature));
    const signedData = concatBytes(rawAuthData, sha256(clientDataBytes));

    const verified = await verifyEs256Signature({ jwk: publicKeyJwk, signature, data: signedData });
    if (!verified) return { ok: false, code: "SIGNATURE_INVALID" };

    return {
      ok: true,
      signCount: authData.signCount,
      userHandle: String(envelope.response.userHandle || ""),
      origin: clientData.origin,
    };
  } catch (error) {
    return { ok: false, code: String(error?.message || "ASSERTION_PARSE_FAILED") };
  }
}

/** 등록 요청 옵션(PublicKeyCredentialCreationOptionsJSON). 플러그인이 그대로 CredentialManager 에 넘긴다. */
export function buildCreationOptionsJson({ rpId, rpName, userId, userName, userDisplayName, challenge, timeoutMs }) {
  return JSON.stringify({
    rp: { id: rpId, name: rpName },
    user: {
      id: bytesToBase64url(new TextEncoder().encode(String(userId || ""))),
      name: String(userName || ""),
      displayName: String(userDisplayName || userName || ""),
    },
    challenge,
    pubKeyCredParams: [{ type: "public-key", alg: COSE_ALG_ES256 }],
    timeout: timeoutMs,
    attestation: "none",
    // 🔴 Restore Credential 은 userVerification 이 discouraged 로 고정이고 다른 옵션과 섞을 수 없다.
    authenticatorSelection: { userVerification: "discouraged" },
  });
}

/** 복원 요청 옵션(PublicKeyCredentialRequestOptionsJSON). */
export function buildRequestOptionsJson({ rpId, challenge, timeoutMs }) {
  return JSON.stringify({
    rpId,
    challenge,
    timeout: timeoutMs,
    userVerification: "discouraged",
  });
}

function bytesEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

function concatBytes(a, b) {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}
