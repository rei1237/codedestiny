// js/core/native-bridge-client.js 의 타입 선언. 런타임 정본은 .js 쪽 하나이고 이 파일은 타입만 제공한다.

export type NativeBridgeError = { code: string; message: string; retryable: boolean };
export type NativeBridgeResult<T = unknown> = { ok: true; result: T } | { ok: false; error: NativeBridgeError };

declare const nativeBridgeClient: {
  /** 계약 5절의 bridgeVersion. v0 는 0. */
  readonly BRIDGE_VERSION: number;
  /** app-context.getPlatform() 위임. */
  getPlatform(): "android" | "ios" | "web";
  /** 앱이면 window.CodeDestinyNative, 웹이거나 아직 주입 전이면 null. */
  getBridge(): Record<string, unknown> | null;
  /** 점 경로("credentials.clear" 등)의 네이티브 메서드가 있는가. */
  has(method: string): boolean;
  /** 메서드를 부르고 v1 형식으로 돌려준다. throw 하지 않는다. 없으면 E_UNSUPPORTED. */
  call<T = unknown>(method: string, params?: unknown): Promise<NativeBridgeResult<T>>;
  getInfo(): { platform: "android" | "ios" | "web"; bridgeVersion: number; available: boolean };
};

export default nativeBridgeClient;
