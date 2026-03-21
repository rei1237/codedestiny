import LocaleShellPage from "./_locale/LocaleShellPage";

// Do not redirect to /index.html: that path is a single segment and is captured by app/[adminHash],
// which returns JSON 404 ("Not found") when ADMIN_SECRET_HASH does not match.
export default function Home() {
  return <LocaleShellPage />;
}
