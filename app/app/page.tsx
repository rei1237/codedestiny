import AppHomeClient from "./AppHomeClient";

export const metadata = {
  title: "꿀꿀운세 App",
  description: "꿀꿀운세 Android app shell",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CodeDestinyMobileAppPage() {
  return <AppHomeClient />;
}
