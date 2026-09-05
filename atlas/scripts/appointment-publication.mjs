import crypto from 'node:crypto';

// Identity resolution is independent of the assertion that a person held office.
// A source edit invalidates its review; unknown rows never publish by default.
export function sourceDigest(row) {
  return crypto.createHash('sha256').update(JSON.stringify(row)).digest('hex');
}

export function reviewedAppointments(sourceRows, review, canonicalPersonId = value => value) {
  const byId = new Map(sourceRows.map(row => [row.id, row]));
  const seen = new Set();
  const result = [];
  for (const decision of review.records) {
    if (seen.has(decision.appointmentId)) throw new Error(`Duplicate appointment review: ${decision.appointmentId}`);
    seen.add(decision.appointmentId);
    const source = byId.get(decision.appointmentId);
    if (!source || sourceDigest(source) !== decision.sourceSha256) {
      throw new Error(`Appointment source changed; review required: ${decision.appointmentId}`);
    }
    if (!['verified', 'review-only', 'suppressed'].includes(decision.status) || !decision.reason) {
      throw new Error(`Incomplete appointment review: ${decision.appointmentId}`);
    }
    if (decision.status !== 'verified') continue;
    const corrected = { ...source, ...decision.correction };
    result.push({
      ...corrected,
      personId: canonicalPersonId(corrected.personId),
      citations: [{
        title: source.sourceLocator,
        url: source.sourceUrl,
        quote: source.sourceExcerpt,
        ...(decision.readerNote ? { note: decision.readerNote } : {})
      }]
    });
  }
  return result;
}
