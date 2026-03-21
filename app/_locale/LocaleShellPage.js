/**
 * Locale landing: static segment (e.g. app/en-us) wins over app/[adminHash].
 * Shell loads the SPA from /static/index.html (middleware also rewrites /index.html -> /static/index.html).
 */
export default function LocaleShellPage() {
  return (
    <iframe
      src="/static/index.html"
      title="CODE DESTINY"
      style={{ border: "none", width: "100%", minHeight: "100vh", display: "block" }}
    />
  );
}
