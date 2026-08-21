import AppPassStoreClient from "./AppPassStoreClient";

export const metadata = {
  title: "이용권",
  description: "Code Destiny 이용권 구매",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AppPassStorePage() {
  return <AppPassStoreClient />;
}
