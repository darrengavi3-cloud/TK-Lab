/** A pinned legacy revision must not authenticate silently rewritten original text. */
export interface LegacyTenureText {
  officeNameOriginal: string;
  natureOriginal: string;
  polityOriginal: string;
  jurisdictionOriginal: string;
}
export interface AppointmentOriginalText {
  officeName: string;
  nature: string;
  polity: string;
  jurisdiction: string;
}
export function matchesLegacyOriginal(tenure: LegacyTenureText, appointment: AppointmentOriginalText): boolean {
  if (!tenure || !appointment) return false;
  const pairs = [
    [tenure.officeNameOriginal, appointment.officeName],
    [tenure.natureOriginal, appointment.nature],
    [tenure.polityOriginal, appointment.polity],
    [tenure.jurisdictionOriginal, appointment.jurisdiction],
  ];
  // Do not trim, normalize Unicode, replace period labels, or interpret titles here.
  // Corrected interpretations belong in separately evidenced claims, not original fields.
  return pairs.every(([left, right]) => typeof left === 'string' && typeof right === 'string' && left === right);
}
