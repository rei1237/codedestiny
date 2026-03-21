/**
 * Locale landing: static segment (e.g. app/en-us) wins over app/[adminHash].
 * Shell loads the same SPA as /index.html while keeping the public URL for hreflang/canonical.
 */
export default function LocaleShellPage() {
  return (
    <iframe
      src="/index.html"
      title="CODE DESTINY"
      style={{ border: "none", width: "100%", minHeight: "100vh", display: "block" }}
    />
  );
}
