import type {Assessment, Disposition, Workflow, HistoricalDate} from '../catalogue';
import type {HistoricalTime} from './time';

export interface RevisionPin {id: string; revision: number; digest: string}
export interface ResearchStatus {
  assessment: Assessment;
  workflow: Workflow;
  visibility: 'private' | 'reader';
  disposition: Disposition;
  reason: string;
}
export type Holding = 'held' | 'not-held' | 'posthumous' | 'unknown';
export type ClaimValue =
  | {type: 'holding'; value: Holding}
  | {type: 'start' | 'end' | 'attestation' | 'event-date'; value: HistoricalTime}
  | {type: 'continuity'; value: 'continuous'}
  | {type: 'legacy-record'; value: {officeName: string; nature: string; polity: string; jurisdiction: string; date: HistoricalDate}};
export interface Claim {
  id: string;
  subject: {kind: 'tenure' | 'event'; id: string};
  content: ClaimValue;
  derivation: 'direct' | 'inferred' | 'uninterpreted';
  assessment: Assessment;
  rationale: string;
  /** Preserves an imported occurrence without converting it into a new fact. */
  origin: RevisionPin | null;
}
/** Stable tenure identities are not appointment events or source occurrences. */
export interface OfficeTenure extends ResearchStatus {
  id: string;
  personId: string;
  officeId: string | null;
  officeNameOriginal: string;
  polityOriginal: string;
  natureOriginal: string;
  jurisdictionOriginal: string;
  legacyOrigin: RevisionPin | null;
  selected: {
    holding: string | null;
    start: string | null;
    end: string | null;
    continuity: string | null;
    attestations: string[];
    rationale: string;
  };
}
export const CAREER_EVENT_TYPES = ['appointment', 'assumption', 'transfer', 'removal', 'restoration', 'decline', 'retirement', 'death', 'capture', 'surrender', 'other'] as const;
export interface CareerEvent {
  id: string;
  personId: string;
  type: typeof CAREER_EVENT_TYPES[number];
  original: string;
  tenureIds: string[];
  dateClaimId: string | null;
  /** Explicit relative chronology; absent dates must not be fabricated. */
  afterEventIds: string[];
}
export interface EvidenceLink {
  id: string;
  claimId: string;
  source: RevisionPin;
  role: 'support' | 'counter' | 'unclassified-variant';
  note: string;
}
export interface FactualConflict {id: string; claimIds: string[]; note: string}
export interface TextualVariant {
  id: string;
  locus: string;
  readings: {source: RevisionPin; text: string}[];
  note: string;
}
export interface ResearchGraph {
  model: 1;
  personId: string;
  tenures: OfficeTenure[];
  events: CareerEvent[];
  claims: Claim[];
  evidence: EvidenceLink[];
  factualConflicts: FactualConflict[];
  textualVariants: TextualVariant[];
}
export interface ResearchWarning {code: string; subjectId: string; note: string}
export type Presence = 'attested' | 'continuous' | 'possible' | 'unknown' | 'not-held' | 'outside' | 'excluded';
export interface PresenceResult {
  tenureId: string;
  year: number;
  status: Presence;
  /** Evidence of holding at some time in this year, NOT every day of the year. */
  definite: boolean;
  claimIds: string[];
  reason: string;
}
