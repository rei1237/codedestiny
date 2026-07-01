import { redirect } from "next/navigation";

export const metadata = {
  alternates: {
    canonical: "https://code-destiny.com/saju/animal-destiny",
  },
  robots: {
    index: false,
    follow: true,
    googleBot: {
      index: false,
      follow: true,
    },
  },
};

export default function AnimalTestAliasPage() {
  redirect("/saju/animal-destiny");
}
