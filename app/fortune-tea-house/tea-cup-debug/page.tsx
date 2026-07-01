import TeaCupDebugRouteClient from "./TeaCupDebugRouteClient";

export const metadata = {
  title: "운명의 찻집 찻잔 Crop Debug | Code Destiny",
  robots: {
    index: false,
    follow: false,
  },
};

export default function Page() {
  return <TeaCupDebugRouteClient />;
}
