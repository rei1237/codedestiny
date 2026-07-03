/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type TurnstileMode = "managed" | "invisible";

type TurnstileOptions = {
  sitekey: string;
  theme?: "light" | "dark";
  execution?: "render" | "execute";
  callback: (token: string) => void;
  "error-callback": () => void;
  "expired-callback": () => void;
};

type TurnstileGlobal = {
  turnstile?: {
    render: (container: HTMLElement, options: TurnstileOptions) => number;
    reset: (widgetId: number) => void;
    remove: (widgetId: number) => void;
  };
};

declare global {
  interface Window extends TurnstileGlobal {}
}

type TurnstileWidgetProps = {
  siteKey: string;
  onTokenChange: (token: string | null) => void;
  onMessage?: (message: string) => void;
  mode?: TurnstileMode;
  disabled?: boolean;
  resetSignal?: number;
  className?: string;
};

const TURNSTILE_SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const TURNSTILE_SCRIPT_ID = "cf-turnstile-script";
const TURNSTILE_RENDER_TIMEOUT_MS = 7000;
let turnstileLoader: Promise<void> | null = null;

function withTurnstileTimeout(timeoutMs = TURNSTILE_RENDER_TIMEOUT_MS) {
  return new Promise<void>((resolve, reject) => {
    const start = Date.now();
    const timer = setInterval(() => {
      if (typeof window !== "undefined" && window.turnstile?.render) {
        clearInterval(timer);
        resolve();
        return;
      }
      if (Date.now() - start > timeoutMs) {
        clearInterval(timer);
        reject(new Error("Turnstile script did not become ready."));
      }
    }, 70);
  });
}

function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile?.render) return Promise.resolve();

  if (!turnstileLoader) {
    turnstileLoader = new Promise<void>((resolve, reject) => {
      const existingScript = document.getElementById(TURNSTILE_SCRIPT_ID) as HTMLScriptElement | null;
      if (existingScript) {
        const onLoad = () => {
          withTurnstileTimeout().then(resolve).catch(reject);
        };
        const onError = () => {
          reject(new Error("Turnstile script could not be loaded."));
        };
        existingScript.addEventListener("load", onLoad, { once: true });
        existingScript.addEventListener("error", onError, { once: true });
        if (window.turnstile?.render) {
          onLoad();
        }
        return;
      }

      const script = document.createElement("script");
      script.id = TURNSTILE_SCRIPT_ID;
      script.src = TURNSTILE_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.crossOrigin = "anonymous";
      script.onload = () => {
        withTurnstileTimeout().then(resolve).catch(reject);
      };
      script.onerror = () => {
        reject(new Error("Turnstile script could not be loaded."));
      };
      document.head.appendChild(script);
    });
  }

  return turnstileLoader;
}

function readErrorMessage(error?: string) {
  if (!error) return "Turnstile 로딩에 실패했습니다. 잠시 후 다시 시도해주세요.";
  return error;
}

export default function TurnstileWidget({
  siteKey,
  onTokenChange,
  onMessage,
  mode = "managed",
  disabled,
  resetSignal = 0,
  className = "",
}: TurnstileWidgetProps) {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<number | null>(null);

  const clearWidget = useCallback(() => {
    const widgetId = widgetIdRef.current;
    if (!widgetId || typeof window === "undefined" || !window.turnstile?.remove) return;
    try {
      window.turnstile.remove(widgetId);
    } catch (error) {
      void error;
    }
    widgetIdRef.current = null;
  }, []);

  const renderWidget = useCallback(async () => {
    if (!containerRef.current || !siteKey || disabled) {
      setMessage("Turnstile site key is required.");
      onMessage?.("Turnstile site key is required.");
      setIsLoading(false);
      onTokenChange(null);
      return;
    }

    setMessage("");
    onMessage?.("");
    setIsLoading(true);
    onTokenChange(null);
    clearWidget();

    try {
      await loadTurnstileScript();
      const turnstile = window.turnstile;
      if (!turnstile?.render) {
        throw new Error("Turnstile API is not ready.");
      }

      const widgetId = turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: "light",
        execution: mode === "invisible" ? "execute" : "render",
        callback: (token: string) => {
          if (!token) return;
          setMessage("");
          onMessage?.("");
          onTokenChange(token);
        },
        "error-callback": () => {
          onTokenChange(null);
          const message = "Turnstile 위젯에서 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
          setMessage(message);
          onMessage?.(message);
          try {
            turnstile.reset(widgetId);
          } catch (error) {
            void error;
          }
        },
        "expired-callback": () => {
          onTokenChange(null);
          const message = "Turnstile 토큰이 만료되었습니다. 다시 인증해 주세요.";
          setMessage(message);
          onMessage?.(message);
          try {
            turnstile.reset(widgetId);
          } catch (error) {
            void error;
          }
        },
      });
      widgetIdRef.current = widgetId;
      setIsLoading(false);
    } catch (error) {
      const fallback = readErrorMessage(error instanceof Error ? error.message : "");
      setMessage(fallback);
      onMessage?.(fallback);
      onTokenChange(null);
      setIsLoading(false);
    }
  }, [siteKey, disabled, clearWidget, mode, onMessage, onTokenChange]);

  useEffect(() => {
    void renderWidget();
    return () => {
      clearWidget();
    };
  }, [clearWidget, renderWidget, resetSignal]);

  return (
    <div className={className}>
      <div
        ref={containerRef}
        aria-live="polite"
        aria-busy={isLoading || undefined}
        className="overflow-hidden rounded-lg bg-white/85 p-1 [&>iframe]:w-full"
      />
      {message ? <p className="mt-2 text-xs text-rose-200">{message}</p> : null}
    </div>
  );
}

