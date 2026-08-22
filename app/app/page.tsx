import AppHomeClient from "./AppHomeClient";

export const metadata = {
  title: "Code Destiny App",
  description: "Code Destiny Android app shell",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CodeDestinyMobileAppPage() {
  return <AppHomeClient />;
}
