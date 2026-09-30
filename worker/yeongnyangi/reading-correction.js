// Operator-authored correction overlays presentation only. Original purchase/generation evidence stays immutable.
export function correctedFortune(row) {
  const correction = row.correction;
  if (!correction || row.state !== "COMPLETED" || correction.version !== 1 || correction.status !== "approved"
    || correction.requestId !== String(row._id) || correction.profileId !== row.profileId
    || correction.fingerprint !== row.fingerprint || !correction.analysis?.contexts
    || !Array.isArray(correction.chapters) || correction.chapters.length !== row.chapters.length
    || correction.chapters.length !== row.snapshot.manifest.length) return row;
  return { ...row, snapshot: { ...row.snapshot, analysis: correction.analysis }, chapters: correction.chapters };
}
