import AppHomeClient from "./AppHomeClient";

export const metadata = {
  title: "꿀꿀 운세 App",
  description: "꿀꿀 운세 Android app shell",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CodeDestinyMobileAppPage() {
  return <AppHomeClient />;
}
