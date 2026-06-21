import { redirect } from "next/navigation";

export const metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function AnimalTestAliasPage() {
  redirect("/saju/animal-destiny");
}
