// A small built-in catalog of common peptides/compounds with sensible STARTING
// defaults (vial size, reconstitution, a typical dose + frequency, half-life,
// and a one-line description). Picking one in the Add sheet prefills the form —
// every value stays fully editable. These are community-typical starting points,
// not medical advice.

export type PresetUnit = 'mcg' | 'mg' | 'IU';
export interface SchedulePreset {
  kind: 'weekly' | 'interval' | 'cycle';
  days?: string[];        // weekly
  intervalDays?: number;  // interval
  cycleOn?: number;       // cycle
  cycleOff?: number;      // cycle
}
export interface PeptidePreset {
  name: string;
  /** brand / alternate name → fills the "type" (sub) field. */
  aka?: string;
  category: string;
  route: string;
  /** inject/dose: vial/container amount (mg). */
  vialMg: number;
  /** inject: bacteriostatic water (mL). */
  bacMl?: number;
  /** oral: capsules in container. */
  count?: number;
  dose: number;
  doseUnit: PresetUnit;
  schedule: SchedulePreset;
  /** optional dosing time (HH:mm) for compounds usually taken at a set time. */
  time?: string;
  /** optional course length (weeks) for cycled compounds. */
  courseWeeks?: number;
  halfLife: string;
  /** short, factual one-liner. */
  blurb: string;
  /** grouping for the picker. */
  group: 'Healing & recovery' | 'Growth hormone' | 'Weight & metabolic' | 'Other';
}

const DAILY = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MON_THU = ['Mon', 'Thu'];
const ONCE_WK = ['Mon'];

export const PEPTIDE_PRESETS: PeptidePreset[] = [
  // ── Healing & recovery ──────────────────────────────────────
  { name: 'BPC-157', category: 'Peptide', route: 'Subcutaneous', vialMg: 5, bacMl: 2, dose: 250, doseUnit: 'mcg',
    schedule: { kind: 'weekly', days: DAILY }, halfLife: '~4 hrs',
    blurb: 'Body Protection Compound — tissue, tendon & gut repair.', group: 'Healing & recovery' },
  { name: 'TB-500', aka: 'Thymosin β4', category: 'Peptide', route: 'Subcutaneous', vialMg: 5, bacMl: 2, dose: 2, doseUnit: 'mg',
    schedule: { kind: 'weekly', days: MON_THU }, halfLife: '~2–3 days',
    blurb: 'Recovery, flexibility & wound healing; often paired with BPC-157.', group: 'Healing & recovery' },
  { name: 'GHK-Cu', aka: 'Copper peptide', category: 'Peptide', route: 'Subcutaneous', vialMg: 50, bacMl: 5, dose: 2, doseUnit: 'mg',
    schedule: { kind: 'weekly', days: DAILY }, halfLife: '~hours',
    blurb: 'Copper tripeptide — skin, collagen & connective-tissue support.', group: 'Healing & recovery' },
  { name: 'Thymosin Alpha-1', aka: 'Tα1', category: 'Peptide', route: 'Subcutaneous', vialMg: 5, bacMl: 2, dose: 1.5, doseUnit: 'mg',
    schedule: { kind: 'weekly', days: MON_THU }, halfLife: '~2 hrs',
    blurb: 'Immune modulation and resilience.', group: 'Healing & recovery' },
  { name: 'KPV', category: 'Peptide', route: 'Subcutaneous', vialMg: 5, bacMl: 2, dose: 250, doseUnit: 'mcg',
    schedule: { kind: 'weekly', days: DAILY }, halfLife: '~hours',
    blurb: 'Anti-inflammatory tripeptide (α-MSH fragment).', group: 'Healing & recovery' },

  // ── Growth hormone axis ─────────────────────────────────────
  { name: 'Ipamorelin', category: 'Peptide', route: 'Subcutaneous', vialMg: 5, bacMl: 2, dose: 300, doseUnit: 'mcg',
    schedule: { kind: 'weekly', days: DAILY }, halfLife: '~2 hrs',
    blurb: 'Selective, gentle GH secretagogue (ghrelin mimetic).', group: 'Growth hormone' },
  { name: 'CJC-1295 (no DAC)', aka: 'Mod GRF 1-29', category: 'Peptide', route: 'Subcutaneous', vialMg: 5, bacMl: 2, dose: 100, doseUnit: 'mcg',
    schedule: { kind: 'weekly', days: DAILY }, halfLife: '~30 min',
    blurb: 'Short-acting GHRH — boosts the natural GH pulse; pairs with ipamorelin.', group: 'Growth hormone' },
  { name: 'CJC-1295 DAC', category: 'Peptide', route: 'Subcutaneous', vialMg: 5, bacMl: 2, dose: 1, doseUnit: 'mg',
    schedule: { kind: 'weekly', days: MON_THU }, halfLife: '~6–8 days',
    blurb: 'Long-acting GHRH — sustained GH/IGF-1 elevation.', group: 'Growth hormone' },
  { name: 'Tesamorelin', category: 'Peptide', route: 'Subcutaneous', vialMg: 5, bacMl: 2, dose: 2, doseUnit: 'mg',
    schedule: { kind: 'weekly', days: DAILY }, halfLife: '~30 min',
    blurb: 'GHRH analog — clinically reduces visceral fat.', group: 'Growth hormone' },
  { name: 'Sermorelin', category: 'Peptide', route: 'Subcutaneous', vialMg: 5, bacMl: 2, dose: 300, doseUnit: 'mcg',
    schedule: { kind: 'weekly', days: DAILY }, time: '22:00', halfLife: '~10–20 min',
    blurb: 'GHRH — supports GH release and sleep; dosed at night.', group: 'Growth hormone' },
  { name: 'GHRP-2', category: 'Peptide', route: 'Subcutaneous', vialMg: 5, bacMl: 2, dose: 100, doseUnit: 'mcg',
    schedule: { kind: 'weekly', days: DAILY }, halfLife: '~30 min',
    blurb: 'Potent GH-releasing peptide.', group: 'Growth hormone' },
  { name: 'GHRP-6', category: 'Peptide', route: 'Subcutaneous', vialMg: 5, bacMl: 2, dose: 100, doseUnit: 'mcg',
    schedule: { kind: 'weekly', days: DAILY }, halfLife: '~30 min',
    blurb: 'GH-releasing peptide with strong appetite stimulation.', group: 'Growth hormone' },
  { name: 'Hexarelin', category: 'Peptide', route: 'Subcutaneous', vialMg: 5, bacMl: 2, dose: 100, doseUnit: 'mcg',
    schedule: { kind: 'weekly', days: DAILY }, halfLife: '~70 min',
    blurb: 'Strong GH secretagogue; tolerance builds with continuous use.', group: 'Growth hormone' },
  { name: 'MK-677', aka: 'Ibutamoren', category: 'Peptide', route: 'Oral', vialMg: 0, count: 30, dose: 25, doseUnit: 'mg',
    schedule: { kind: 'weekly', days: DAILY }, halfLife: '~24 hrs',
    blurb: 'Oral ghrelin-mimetic GH secretagogue — once daily.', group: 'Growth hormone' },
  { name: 'IGF-1 LR3', category: 'Peptide', route: 'Subcutaneous', vialMg: 1, bacMl: 2, dose: 40, doseUnit: 'mcg',
    schedule: { kind: 'weekly', days: DAILY }, halfLife: '~20–30 hrs',
    blurb: 'Long-acting IGF-1 analog (advanced).', group: 'Growth hormone' },

  // ── Weight & metabolic ──────────────────────────────────────
  { name: 'Semaglutide', aka: 'Ozempic / Wegovy', category: 'Peptide', route: 'Subcutaneous', vialMg: 5, bacMl: 2, dose: 250, doseUnit: 'mcg',
    schedule: { kind: 'weekly', days: ONCE_WK }, halfLife: '~7 days',
    blurb: 'GLP-1 agonist — appetite suppression & weight loss; titrate up slowly.', group: 'Weight & metabolic' },
  { name: 'Tirzepatide', aka: 'Mounjaro / Zepbound', category: 'Peptide', route: 'Subcutaneous', vialMg: 10, bacMl: 2, dose: 2.5, doseUnit: 'mg',
    schedule: { kind: 'weekly', days: ONCE_WK }, halfLife: '~5 days',
    blurb: 'Dual GIP/GLP-1 agonist — strong appetite & weight effects.', group: 'Weight & metabolic' },
  { name: 'Retatrutide', category: 'Peptide', route: 'Subcutaneous', vialMg: 10, bacMl: 2, dose: 2, doseUnit: 'mg',
    schedule: { kind: 'weekly', days: ONCE_WK }, halfLife: '~6 days',
    blurb: 'Triple GIP/GLP-1/glucagon agonist (investigational).', group: 'Weight & metabolic' },
  { name: 'Cagrilintide', category: 'Peptide', route: 'Subcutaneous', vialMg: 5, bacMl: 2, dose: 300, doseUnit: 'mcg',
    schedule: { kind: 'weekly', days: ONCE_WK }, halfLife: '~7 days',
    blurb: 'Long-acting amylin analog — satiety; often stacked with GLP-1s.', group: 'Weight & metabolic' },
  { name: 'AOD-9604', category: 'Peptide', route: 'Subcutaneous', vialMg: 5, bacMl: 2, dose: 300, doseUnit: 'mcg',
    schedule: { kind: 'weekly', days: DAILY }, halfLife: '~30 min',
    blurb: 'GH fragment marketed for fat metabolism.', group: 'Weight & metabolic' },
  { name: '5-Amino-1MQ', category: 'Peptide', route: 'Oral', vialMg: 0, count: 30, dose: 50, doseUnit: 'mg',
    schedule: { kind: 'weekly', days: DAILY }, halfLife: '~hours',
    blurb: 'Oral NNMT inhibitor explored for fat loss.', group: 'Weight & metabolic' },

  // ── Other ───────────────────────────────────────────────────
  { name: 'PT-141', aka: 'Bremelanotide', category: 'Peptide', route: 'Subcutaneous', vialMg: 10, bacMl: 2, dose: 1, doseUnit: 'mg',
    schedule: { kind: 'interval', intervalDays: 3 }, halfLife: '~2–3 hrs',
    blurb: 'Melanocortin agonist for libido; used as needed.', group: 'Other' },
  { name: 'Melanotan II', aka: 'MT-II', category: 'Peptide', route: 'Subcutaneous', vialMg: 10, bacMl: 2, dose: 250, doseUnit: 'mcg',
    schedule: { kind: 'weekly', days: DAILY }, halfLife: '~hours',
    blurb: 'Tanning & libido; start low to gauge nausea.', group: 'Other' },
  { name: 'Selank', category: 'Peptide', route: 'Subcutaneous', vialMg: 5, bacMl: 2, dose: 250, doseUnit: 'mcg',
    schedule: { kind: 'weekly', days: DAILY }, halfLife: '~hours',
    blurb: 'Anxiolytic / focus peptide.', group: 'Other' },
  { name: 'Semax', category: 'Peptide', route: 'Subcutaneous', vialMg: 5, bacMl: 2, dose: 300, doseUnit: 'mcg',
    schedule: { kind: 'weekly', days: DAILY }, halfLife: '~hours',
    blurb: 'Nootropic & neuroprotective peptide.', group: 'Other' },
  { name: 'Epitalon', aka: 'Epithalon', category: 'Peptide', route: 'Subcutaneous', vialMg: 10, bacMl: 2, dose: 5, doseUnit: 'mg',
    schedule: { kind: 'weekly', days: DAILY }, courseWeeks: 3, halfLife: '~hours',
    blurb: 'Telomerase/longevity peptide — run in short cycles.', group: 'Other' },
  { name: 'DSIP', category: 'Peptide', route: 'Subcutaneous', vialMg: 5, bacMl: 2, dose: 250, doseUnit: 'mcg',
    schedule: { kind: 'weekly', days: DAILY }, time: '22:00', halfLife: '~hours',
    blurb: 'Delta sleep-inducing peptide; dosed before bed.', group: 'Other' },
];

export const PRESET_GROUPS: PeptidePreset['group'][] = [
  'Healing & recovery', 'Growth hormone', 'Weight & metabolic', 'Other',
];
