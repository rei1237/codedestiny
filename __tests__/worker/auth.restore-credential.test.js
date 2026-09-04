/**
 * Restore Credentials(Android Zero-Tap Sign-In) 검증 코어.
 *
 * 이 스위트가 지키는 것은 "인증 우회가 안 된다"는 성질 하나다 — /api/auth/restore-credential/assert
 * 는 비인증으로 세션을 발급하므로, 아래 거부 케이스가 하나라도 통과로 뒤집히면 그대로 계정 탈취다.
 * 그래서 목이 아니라 **실제 P-256 키로 서명한 응답**을 만들어 넣는다.
 */

const { createHash, createSign, generateKeyPairSync, webcrypto } = require("node:crypto");

// jest 의 node 환경은 globalThis.crypto 를 항상 채워주지는 않는다. 워커 런타임에서는 전역이다.
if (!globalThis.crypto) globalThis.crypto = webcrypto;

const RP_ID = "code-destiny.com";

let lib;

beforeAll(async () => {
  lib = await import("../../worker/lib/webauthn-restore.js");
});

// ── 최소 CBOR 인코더 (테스트가 인증기 역할을 하려면 필요하다) ──────────────────
function cborHead(major, length) {
  if (length < 24) return Buffer.from([(major << 5) | length]);
  if (length < 0x100) return Buffer.from([(major << 5) | 24, length]);
  if (length < 0x10000) return Buffer.from([(major << 5) | 25, length >> 8, length & 0xff]);
  const head = Buffer.alloc(5);
  head[0] = (major << 5) | 26;
  head.writeUInt32BE(length, 1);
  return head;
}

function cborEncode(value) {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value >= 0 ? cborHead(0, value) : cborHead(1, -1 - value);
  }
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
    return Buffer.concat([cborHead(2, value.length), Buffer.from(value)]);
  }
  if (typeof value === "string") {
    const bytes = Buffer.from(value, "utf8");
    return Buffer.concat([cborHead(3, bytes.length), bytes]);
  }
  if (value instanceof Map) {
    const parts = [cborHead(5, value.size)];
    for (const [key, item] of value.entries()) {
      parts.push(cborEncode(key), cborEncode(item));
    }
    return Buffer.concat(parts);
  }
  throw new Error(`cborEncode: unsupported ${typeof value}`);
}

// ── 가짜 인증기 ────────────────────────────────────────────────────────────────
function makeKeyPair() {
  const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const jwk = publicKey.export({ format: "jwk" });
  return { privateKey, jwk: { kty: "EC", crv: "P-256", x: jwk.x, y: jwk.y } };
}

function coseKeyFrom(jwk) {
  return new Map([
    [1, 2], // kty: EC2
    [3, -7], // alg: ES256
    [-1, 1], // crv: P-256
    [-2, Buffer.from(jwk.x, "base64url")],
    [-3, Buffer.from(jwk.y, "base64url")],
  ]);
}

function buildAuthData({ rpId = RP_ID, signCount = 0, credentialId = null, jwk = null } = {}) {
  const rpIdHash = createHash("sha256").update(rpId).digest();
  const header = Buffer.alloc(5);
  header[0] = credentialId ? 0x41 : 0x01; // UP + (AT)
  header.writeUInt32BE(signCount, 1);
  if (!credentialId) return Buffer.concat([rpIdHash, header]);

  const aaguid = Buffer.alloc(16, 0);
  const credLength = Buffer.alloc(2);
  credLength.writeUInt16BE(credentialId.length, 0);
  return Buffer.concat([rpIdHash, header, aaguid, credLength, credentialId, cborEncode(coseKeyFrom(jwk))]);
}

function buildClientData(type, challenge) {
  return Buffer.from(JSON.stringify({
    type,
    challenge,
    origin: "android:apk-key-hash:c2FtcGxl",
    androidPackageName: "com.codedestiny.app",
  }), "utf8");
}

function buildRegistrationResponse({ challenge, rpId = RP_ID, credentialId, jwk, signCount = 0 }) {
  const authData = buildAuthData({ rpId, signCount, credentialId, jwk });
  const attestationObject = cborEncode(new Map([
    ["fmt", "none"],
    ["attStmt", new Map()],
    ["authData", authData],
  ]));

  return JSON.stringify({
    id: credentialId.toString("base64url"),
    rawId: credentialId.toString("base64url"),
    type: "public-key",
    response: {
      clientDataJSON: buildClientData("webauthn.create", challenge).toString("base64url"),
      attestationObject: attestationObject.toString("base64url"),
    },
  });
}

function buildAssertionResponse({ challenge, rpId = RP_ID, credentialId, privateKey, signCount = 1, tamper = false }) {
  const authData = buildAuthData({ rpId, signCount });
  const clientDataJSON = buildClientData("webauthn.get", challenge);
  const signedData = Buffer.concat([authData, createHash("sha256").update(clientDataJSON).digest()]);

  const signer = createSign("SHA256");
  signer.update(tamper ? Buffer.concat([signedData, Buffer.from("x")]) : signedData);
  const signature = signer.sign(privateKey);

  return JSON.stringify({
    id: credentialId.toString("base64url"),
    rawId: credentialId.toString("base64url"),
    type: "public-key",
    response: {
      clientDataJSON: clientDataJSON.toString("base64url"),
      authenticatorData: authData.toString("base64url"),
      signature: signature.toString("base64url"),
      userHandle: "",
    },
  });
}

// ── 테스트 ────────────────────────────────────────────────────────────────────
describe("restore credential registration", () => {
  test("정상 등록 응답에서 credentialId 와 ES256 공개키를 뽑는다", async () => {
    const { jwk } = makeKeyPair();
    const credentialId = Buffer.from("restore-credential-id-0001", "utf8");
    const responseJson = buildRegistrationResponse({ challenge: "Q0hBTExFTkdF", credentialId, jwk });

    const result = await lib.verifyRestoreRegistration({
      responseJson,
      expectedChallenge: "Q0hBTExFTkdF",
      expectedRpId: RP_ID,
    });

    expect(result.ok).toBe(true);
    expect(result.credentialId).toBe(credentialId.toString("base64url"));
    expect(result.algorithm).toBe("ES256");
    expect(result.publicKeyJwk).toEqual({ kty: "EC", crv: "P-256", x: jwk.x, y: jwk.y });
  });

  test("다른 rp.id 로 만들어진 자격증명은 거부한다", async () => {
    const { jwk } = makeKeyPair();
    const responseJson = buildRegistrationResponse({
      challenge: "Q0hBTExFTkdF",
      rpId: "evil.example",
      credentialId: Buffer.from("id", "utf8"),
      jwk,
    });

    const result = await lib.verifyRestoreRegistration({
      responseJson,
      expectedChallenge: "Q0hBTExFTkdF",
      expectedRpId: RP_ID,
    });

    expect(result).toEqual({ ok: false, code: "RP_ID_MISMATCH" });
  });
});

describe("restore credential assertion", () => {
  test("등록된 공개키로 서명된 응답을 통과시키고 signCount 를 읽는다", async () => {
    const { privateKey, jwk } = makeKeyPair();
    const credentialId = Buffer.from("restore-credential-id-0002", "utf8");
    const responseJson = buildAssertionResponse({
      challenge: "QVNTRVJU",
      credentialId,
      privateKey,
      signCount: 7,
    });

    const result = await lib.verifyRestoreAssertion({
      responseJson,
      expectedChallenge: "QVNTRVJU",
      expectedRpId: RP_ID,
      publicKeyJwk: jwk,
    });

    expect(result.ok).toBe(true);
    expect(result.signCount).toBe(7);
  });

  test("서명이 다른 데이터에 대한 것이면 거부한다", async () => {
    const { privateKey, jwk } = makeKeyPair();
    const responseJson = buildAssertionResponse({
      challenge: "QVNTRVJU",
      credentialId: Buffer.from("id", "utf8"),
      privateKey,
      tamper: true,
    });

    const result = await lib.verifyRestoreAssertion({
      responseJson,
      expectedChallenge: "QVNTRVJU",
      expectedRpId: RP_ID,
      publicKeyJwk: jwk,
    });

    expect(result).toEqual({ ok: false, code: "SIGNATURE_INVALID" });
  });

  test("다른 키쌍의 공개키로는 통과하지 못한다", async () => {
    const { privateKey } = makeKeyPair();
    const other = makeKeyPair();
    const responseJson = buildAssertionResponse({
      challenge: "QVNTRVJU",
      credentialId: Buffer.from("id", "utf8"),
      privateKey,
    });

    const result = await lib.verifyRestoreAssertion({
      responseJson,
      expectedChallenge: "QVNTRVJU",
      expectedRpId: RP_ID,
      publicKeyJwk: other.jwk,
    });

    expect(result).toEqual({ ok: false, code: "SIGNATURE_INVALID" });
  });

  test("서버가 발급한 것과 다른 challenge 는 서명이 유효해도 거부한다", async () => {
    const { privateKey, jwk } = makeKeyPair();
    const responseJson = buildAssertionResponse({
      challenge: "UkVQTEFZ",
      credentialId: Buffer.from("id", "utf8"),
      privateKey,
    });

    const result = await lib.verifyRestoreAssertion({
      responseJson,
      expectedChallenge: "QVNTRVJU",
      expectedRpId: RP_ID,
      publicKeyJwk: jwk,
    });

    expect(result).toEqual({ ok: false, code: "CHALLENGE_MISMATCH" });
  });
});

describe("보조 파서", () => {
  test("readResponseChallenge 는 서명 검증 전에 challenge 만 꺼낸다", () => {
    const { jwk } = makeKeyPair();
    const responseJson = buildRegistrationResponse({
      challenge: "UEVFSw",
      credentialId: Buffer.from("id", "utf8"),
      jwk,
    });

    expect(lib.readResponseChallenge(responseJson)).toBe("UEVFSw");
    expect(lib.readResponseChallenge("not json")).toBe("");
  });

  test("derSignatureToRaw 는 DER 선행 0 패딩을 걷고 64바이트로 맞춘다", () => {
    // r 은 33바이트(선행 0x00 포함), s 는 31바이트 — 양쪽 다 32바이트로 정규화돼야 한다.
    const r = Buffer.concat([Buffer.from([0x00, 0xff]), Buffer.alloc(31, 0x11)]);
    const s = Buffer.alloc(31, 0x22);
    const der = Buffer.concat([
      Buffer.from([0x30, 4 + r.length + s.length, 0x02, r.length]),
      r,
      Buffer.from([0x02, s.length]),
      s,
    ]);

    const raw = lib.derSignatureToRaw(new Uint8Array(der));

    expect(raw.length).toBe(64);
    expect(Buffer.from(raw.slice(0, 32)).toString("hex")).toBe(Buffer.concat([Buffer.from([0xff]), Buffer.alloc(31, 0x11)]).toString("hex"));
    expect(Buffer.from(raw.slice(32)).toString("hex")).toBe(Buffer.concat([Buffer.from([0x00]), Buffer.alloc(31, 0x22)]).toString("hex"));
  });

  test("ES256 이 아닌 COSE 키는 거부한다", () => {
    const rsaLike = new Map([[1, 3], [3, -257]]);
    expect(() => lib.coseKeyToJwk(rsaLike)).toThrow("COSE_KTY_UNSUPPORTED");
  });
});
