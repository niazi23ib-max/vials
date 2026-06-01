import type { Substance } from '@/lib/substances';

/** The shared controller passed to every screen (mirrors the prototype's `app`). */
export interface AppApi {
  substances: Substance[];
  taken: Set<string>;
  /** Toggle a today-event id (e.g. "reta-today"). */
  toggle: (eid: string) => void;
  /** Open a substance's detail screen. */
  open: (subId: string) => void;
  /** Open the log sheet, optionally pre-selecting a substance. */
  log: (subId?: string) => void;
  openLog: () => void;
  /** Confirm today's dose for a substance. */
  confirmLog: (subId: string) => void;
  skipLog: (subId?: string) => void;
}
