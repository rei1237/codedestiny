// Native links are usable on first paint. Navigation never waits for motion.
export default function HomeCardDeck({ children, className, labelledBy = "homeCardTitle" }) {
  return <ul className={className} aria-labelledby={labelledBy}>{children}</ul>;
}
