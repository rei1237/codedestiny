import SunHealingTarot from "../../components/SunHealingTarot";

export default function SunHealingTarotPage() {
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Code Destiny", item: "https://code-destiny.com/" },
      { "@type": "ListItem", position: 2, name: "Tarot Healing", item: "https://code-destiny.com/tarot/healing" },
    ],
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <SunHealingTarot />
    </>
  );
}

