// Back-compat shim. The catalog moved to ./library and now covers all item
// types (peptides, vitamins, supplements, meds). Prefer importing from
// '@/lib/library'. These aliases keep any older imports working.
export * from './library';
import { LIBRARY, type LibraryItem } from './library';

export type PeptidePreset = LibraryItem;
export const PEPTIDE_PRESETS = LIBRARY;
