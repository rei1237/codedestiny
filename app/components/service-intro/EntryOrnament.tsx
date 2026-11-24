import styles from "./EntryOrnament.module.css";

export default function EntryOrnament({fish = false}: {fish?: boolean}) {
  if (fish) return <span className={styles.school} aria-hidden="true">
    {["anchovy", "mackerel", "flounder", "salmon", "tuna"].map(species =>
      <img key={species} src={species === "anchovy" ? "/assets/yeongnyangi/fish/anchovy.webp" : "/assets/yeongnyangi/fish/" + species + "-ornament.webp"} alt="" loading="lazy" />
    )}
  </span>;
  return <span className={styles.blossoms} aria-hidden="true">
    <img className={styles.branch} src="/images/home/mv/ornament-lotus-branch-320.webp" alt="" />
    <img className={styles.crest} src="/images/home/mv/ornament-lotus-crest-160.webp" alt="" />
    <img className={styles.branch} src="/images/home/mv/ornament-lotus-branch-320.webp" alt="" />
  </span>;
}
