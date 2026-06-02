import type { Substance, LogMap, DoseStatus } from '@/lib/substances';
import type { BodyMetric } from '@/lib/metrics';

/** The shared controller passed to every screen (mirrors the prototype's `app`). */
export interface AppApi {
  substances: Substance[];
  taken: Set<string>;
  /** All loaded dose logs, keyed `${subId}|${iso}` (for history, the week view, and stats). */
  logs: LogMap;
  /** Injection site per logged dose, keyed `${subId}|${iso}`. */
  sites: Record<string, string>;
  /** Status of a dose on a given date, if logged. */
  statusOf: (subId: string, iso: string, slot?: string) => DoseStatus | undefined;
  /** Set (or clear, with null) a dose's status on a date + slot — adjusts remaining + persists.
   *  `slot` is '' for single-dose substances, or the HH:MM time on multi-dose days.
   *  `affectInventory` (default true) controls whether a "taken" dose pulls from the current vial. */
  setStatus: (subId: string, iso: string, slot: string, status: DoseStatus | null, site?: string | null, affectInventory?: boolean) => void;
  /** Most recent injection site logged for a substance (for rotation defaults). */
  lastSiteFor: (subId: string) => string | undefined;
  /** Toggle a today-event id (e.g. "reta-today"). */
  toggle: (eid: string) => void;
  /** Open a substance's detail screen. */
  open: (subId: string) => void;
  /** Open the log sheet, optionally pre-selecting a substance. */
  log: (subId?: string) => void;
  openLog: () => void;
  /** Confirm today's dose for a substance + slot (optionally recording an injection site). */
  confirmLog: (subId: string, slot?: string, site?: string | null) => void;
  skipLog: (subId?: string, slot?: string) => void;
  /** Add a new vial/substance to the inventory. */
  addSubstance: (s: Substance) => void;
  /** Open the "add vial" sheet. */
  openAddVial: () => void;
  /** Open the edit sheet pre-filled with an existing vial. */
  editVial: (sub: Substance) => void;
  /** Save edits to an existing vial. */
  updateSubstance: (id: string, s: Substance) => void;
  /** Delete a vial from the inventory. */
  deleteSubstance: (id: string) => void;

  /** Body-metric entries (weight/waist/body-fat), oldest → newest. */
  metrics: BodyMetric[];
  /** Insert or update the body-metric entry for a day (one per date). */
  saveMetric: (date: string, fields: { weight: number | null; waist: number | null; bodyFat: number | null; note: string }) => void;
  /** Remove the body-metric entry for a day. */
  removeMetric: (date: string) => void;
}
