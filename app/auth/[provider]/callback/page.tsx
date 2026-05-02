import { redirect } from "next/navigation";

type CallbackPageProps = {
  params: { provider: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

const SUPPORTED_PROVIDERS = new Set(["google", "naver", "kakao"]);

function toQueryString(searchParams: Record<string, string | string[] | undefined> = {}): string {
  const params = new URLSearchParams();

  for (const [key, raw] of Object.entries(searchParams)) {
    if (Array.isArray(raw)) {
      for (const value of raw) {
        if (typeof value === "string") params.append(key, value);
      }
      continue;
    }

    if (typeof raw === "string") params.set(key, raw);
  }

  return params.toString();
}

export default function SocialCallbackBridgePage({ params, searchParams }: CallbackPageProps) {
  const provider = String(params?.provider || "").toLowerCase();
  if (!SUPPORTED_PROVIDERS.has(provider)) {
    redirect("/login?social_error=unsupported_provider");
  }

  const query = toQueryString(searchParams || {});
  const target = `/api/auth/oauth/${provider}/callback${query ? `?${query}` : ""}`;
  redirect(target);
}
