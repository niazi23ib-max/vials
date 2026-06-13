// A built-in catalog of common compounds — peptides, vitamins & minerals,
// supplements, and OTC meds — with sensible STARTING defaults (container/vial
// size, a typical dose + frequency, and a one-line description). Picking one in
// the Add sheet prefills the form; every value stays fully editable. These are
// community-typical starting points, not medical advice.

export type PresetUnit = 'mcg' | 'mg' | 'IU';

export interface SchedulePreset {
  kind: 'weekly' | 'interval' | 'cycle';
  days?: string[];        // weekly
  intervalDays?: number;  // interval
  cycleOn?: number;       // cycle
  cycleOff?: number;      // cycle
}

/** Top-level filter buckets for the picker chips. */
export type LibraryKind = 'Peptides' | 'Blends' | 'Vitamins & minerals' | 'Supplements' | 'Medications';

export interface LibraryItem {
  name: string;
  /** brand / alternate name → fills the "type" (sub) field. */
  aka?: string;
  /** Substance category written to the form — must be a CATEGORIES member.
   *  Use 'Multivitamin' for any multi-ingredient item with no single strength. */
  category: 'Peptide' | 'Vitamin' | 'Multivitamin' | 'Supplement' | 'Medication' | 'Other';
  route: string;
  /** inject/dose: vial/container amount (mg). 0 for oral capsule/tablet items. */
  vialMg: number;
  /** inject: bacteriostatic water (mL). */
  bacMl?: number;
  /** oral: capsules/tablets/servings in the container. */
  count?: number;
  /** inject/dose: dose per administration. oral: strength per cap/serving (0 = no single strength). */
  dose: number;
  doseUnit: PresetUnit;
  schedule: SchedulePreset;
  /** optional dosing time (HH:mm) for items usually taken at a set time. */
  time?: string;
  /** optional course length (weeks) for cycled items. */
  courseWeeks?: number;
  /** optional — meaningful for peptides/meds, omitted for most vitamins. */
  halfLife?: string;
  /** short, factual one-liner. */
  blurb: string;
  /** top-level filter bucket (chips). */
  kind: LibraryKind;
  /** optional finer subhead within a kind, e.g. 'Fat-soluble', 'Growth hormone'. */
  group?: string;
}

export const LIBRARY_KINDS: LibraryKind[] = ['Peptides', 'Blends', 'Vitamins & minerals', 'Supplements', 'Medications'];

const DAILY = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MON_THU = ['Mon', 'Thu'];
const ONCE_WK = ['Mon'];

export const LIBRARY: LibraryItem[] = [
  // ══════════════ PEPTIDES ══════════════
  // ── Healing & recovery ──
  { name: 'BPC-157', category: 'Peptide', route: 'Subcutaneous', vialMg: 5, bacMl: 2, dose: 250, doseUnit: 'mcg',
    schedule: { kind: 'weekly', days: DAILY }, halfLife: '~4 hrs',
    blurb: 'Body Protection Compound — tissue, tendon & gut repair.', kind: 'Peptides', group: 'Healing & recovery' },
  { name: 'TB-500', aka: 'Thymosin β4', category: 'Peptide', route: 'Subcutaneous', vialMg: 5, bacMl: 2, dose: 2, doseUnit: 'mg',
    schedule: { kind: 'weekly', days: MON_THU }, halfLife: '~2–3 days',
    blurb: 'Recovery, flexibility & wound healing; often paired with BPC-157.', kind: 'Peptides', group: 'Healing & recovery' },
  { name: 'GHK-Cu', aka: 'Copper peptide', category: 'Peptide', route: 'Subcutaneous', vialMg: 50, bacMl: 5, dose: 2, doseUnit: 'mg',
    schedule: { kind: 'weekly', days: DAILY }, halfLife: '~hours',
    blurb: 'Copper tripeptide — skin, collagen & connective-tissue support.', kind: 'Peptides', group: 'Healing & recovery' },
  { name: 'Thymosin Alpha-1', aka: 'Tα1', category: 'Peptide', route: 'Subcutaneous', vialMg: 5, bacMl: 2, dose: 1.5, doseUnit: 'mg',
    schedule: { kind: 'weekly', days: MON_THU }, halfLife: '~2 hrs',
    blurb: 'Immune modulation and resilience.', kind: 'Peptides', group: 'Healing & recovery' },
  { name: 'KPV', category: 'Peptide', route: 'Subcutaneous', vialMg: 5, bacMl: 2, dose: 250, doseUnit: 'mcg',
    schedule: { kind: 'weekly', days: DAILY }, halfLife: '~hours',
    blurb: 'Anti-inflammatory tripeptide (α-MSH fragment).', kind: 'Peptides', group: 'Healing & recovery' },

  // ── Growth hormone ──
  { name: 'Ipamorelin', category: 'Peptide', route: 'Subcutaneous', vialMg: 5, bacMl: 2, dose: 300, doseUnit: 'mcg',
    schedule: { kind: 'weekly', days: DAILY }, halfLife: '~2 hrs',
    blurb: 'Selective, gentle GH secretagogue (ghrelin mimetic).', kind: 'Peptides', group: 'Growth hormone' },
  { name: 'CJC-1295 (no DAC)', aka: 'Mod GRF 1-29', category: 'Peptide', route: 'Subcutaneous', vialMg: 5, bacMl: 2, dose: 100, doseUnit: 'mcg',
    schedule: { kind: 'weekly', days: DAILY }, halfLife: '~30 min',
    blurb: 'Short-acting GHRH — boosts the natural GH pulse; pairs with ipamorelin.', kind: 'Peptides', group: 'Growth hormone' },
  { name: 'CJC-1295 DAC', category: 'Peptide', route: 'Subcutaneous', vialMg: 5, bacMl: 2, dose: 1, doseUnit: 'mg',
    schedule: { kind: 'weekly', days: MON_THU }, halfLife: '~6–8 days',
    blurb: 'Long-acting GHRH — sustained GH/IGF-1 elevation.', kind: 'Peptides', group: 'Growth hormone' },
  { name: 'Tesamorelin', category: 'Peptide', route: 'Subcutaneous', vialMg: 5, bacMl: 2, dose: 2, doseUnit: 'mg',
    schedule: { kind: 'weekly', days: DAILY }, halfLife: '~30 min',
    blurb: 'GHRH analog — clinically reduces visceral fat.', kind: 'Peptides', group: 'Growth hormone' },
  { name: 'Sermorelin', category: 'Peptide', route: 'Subcutaneous', vialMg: 5, bacMl: 2, dose: 300, doseUnit: 'mcg',
    schedule: { kind: 'weekly', days: DAILY }, time: '22:00', halfLife: '~10–20 min',
    blurb: 'GHRH — supports GH release and sleep; dosed at night.', kind: 'Peptides', group: 'Growth hormone' },
  { name: 'GHRP-2', category: 'Peptide', route: 'Subcutaneous', vialMg: 5, bacMl: 2, dose: 100, doseUnit: 'mcg',
    schedule: { kind: 'weekly', days: DAILY }, halfLife: '~30 min',
    blurb: 'Potent GH-releasing peptide.', kind: 'Peptides', group: 'Growth hormone' },
  { name: 'GHRP-6', category: 'Peptide', route: 'Subcutaneous', vialMg: 5, bacMl: 2, dose: 100, doseUnit: 'mcg',
    schedule: { kind: 'weekly', days: DAILY }, halfLife: '~30 min',
    blurb: 'GH-releasing peptide with strong appetite stimulation.', kind: 'Peptides', group: 'Growth hormone' },
  { name: 'Hexarelin', category: 'Peptide', route: 'Subcutaneous', vialMg: 5, bacMl: 2, dose: 100, doseUnit: 'mcg',
    schedule: { kind: 'weekly', days: DAILY }, halfLife: '~70 min',
    blurb: 'Strong GH secretagogue; tolerance builds with continuous use.', kind: 'Peptides', group: 'Growth hormone' },
  { name: 'MK-677', aka: 'Ibutamoren', category: 'Peptide', route: 'Oral', vialMg: 0, count: 30, dose: 25, doseUnit: 'mg',
    schedule: { kind: 'weekly', days: DAILY }, halfLife: '~24 hrs',
    blurb: 'Oral ghrelin-mimetic GH secretagogue — once daily.', kind: 'Peptides', group: 'Growth hormone' },
  { name: 'IGF-1 LR3', category: 'Peptide', route: 'Subcutaneous', vialMg: 1, bacMl: 2, dose: 40, doseUnit: 'mcg',
    schedule: { kind: 'weekly', days: DAILY }, halfLife: '~20–30 hrs',
    blurb: 'Long-acting IGF-1 analog (advanced).', kind: 'Peptides', group: 'Growth hormone' },

  // ── Weight & metabolic ──
  { name: 'Semaglutide', aka: 'Ozempic / Wegovy', category: 'Peptide', route: 'Subcutaneous', vialMg: 5, bacMl: 2, dose: 250, doseUnit: 'mcg',
    schedule: { kind: 'weekly', days: ONCE_WK }, halfLife: '~7 days',
    blurb: 'GLP-1 agonist — appetite suppression & weight loss; titrate up slowly.', kind: 'Peptides', group: 'Weight & metabolic' },
  { name: 'Tirzepatide', aka: 'Mounjaro / Zepbound', category: 'Peptide', route: 'Subcutaneous', vialMg: 10, bacMl: 2, dose: 2.5, doseUnit: 'mg',
    schedule: { kind: 'weekly', days: ONCE_WK }, halfLife: '~5 days',
    blurb: 'Dual GIP/GLP-1 agonist — strong appetite & weight effects.', kind: 'Peptides', group: 'Weight & metabolic' },
  { name: 'Retatrutide', category: 'Peptide', route: 'Subcutaneous', vialMg: 10, bacMl: 2, dose: 2, doseUnit: 'mg',
    schedule: { kind: 'weekly', days: ONCE_WK }, halfLife: '~6 days',
    blurb: 'Triple GIP/GLP-1/glucagon agonist (investigational).', kind: 'Peptides', group: 'Weight & metabolic' },
  { name: 'Cagrilintide', category: 'Peptide', route: 'Subcutaneous', vialMg: 5, bacMl: 2, dose: 300, doseUnit: 'mcg',
    schedule: { kind: 'weekly', days: ONCE_WK }, halfLife: '~7 days',
    blurb: 'Long-acting amylin analog — satiety; often stacked with GLP-1s.', kind: 'Peptides', group: 'Weight & metabolic' },
  { name: 'AOD-9604', category: 'Peptide', route: 'Subcutaneous', vialMg: 5, bacMl: 2, dose: 300, doseUnit: 'mcg',
    schedule: { kind: 'weekly', days: DAILY }, halfLife: '~30 min',
    blurb: 'GH fragment marketed for fat metabolism.', kind: 'Peptides', group: 'Weight & metabolic' },
  { name: '5-Amino-1MQ', category: 'Peptide', route: 'Oral', vialMg: 0, count: 30, dose: 50, doseUnit: 'mg',
    schedule: { kind: 'weekly', days: DAILY }, halfLife: '~hours',
    blurb: 'Oral NNMT inhibitor explored for fat loss.', kind: 'Peptides', group: 'Weight & metabolic' },

  // ── Other peptides ──
  { name: 'PT-141', aka: 'Bremelanotide', category: 'Peptide', route: 'Subcutaneous', vialMg: 10, bacMl: 2, dose: 1, doseUnit: 'mg',
    schedule: { kind: 'interval', intervalDays: 3 }, halfLife: '~2–3 hrs',
    blurb: 'Melanocortin agonist for libido; used as needed.', kind: 'Peptides', group: 'Other' },
  { name: 'Melanotan II', aka: 'MT-II', category: 'Peptide', route: 'Subcutaneous', vialMg: 10, bacMl: 2, dose: 250, doseUnit: 'mcg',
    schedule: { kind: 'weekly', days: DAILY }, halfLife: '~hours',
    blurb: 'Tanning & libido; start low to gauge nausea.', kind: 'Peptides', group: 'Other' },
  { name: 'Selank', category: 'Peptide', route: 'Subcutaneous', vialMg: 5, bacMl: 2, dose: 250, doseUnit: 'mcg',
    schedule: { kind: 'weekly', days: DAILY }, halfLife: '~hours',
    blurb: 'Anxiolytic / focus peptide.', kind: 'Peptides', group: 'Other' },
  { name: 'Semax', category: 'Peptide', route: 'Subcutaneous', vialMg: 5, bacMl: 2, dose: 300, doseUnit: 'mcg',
    schedule: { kind: 'weekly', days: DAILY }, halfLife: '~hours',
    blurb: 'Nootropic & neuroprotective peptide.', kind: 'Peptides', group: 'Other' },
  { name: 'Epitalon', aka: 'Epithalon', category: 'Peptide', route: 'Subcutaneous', vialMg: 10, bacMl: 2, dose: 5, doseUnit: 'mg',
    schedule: { kind: 'weekly', days: DAILY }, courseWeeks: 3, halfLife: '~hours',
    blurb: 'Telomerase/longevity peptide — run in short cycles.', kind: 'Peptides', group: 'Other' },
  { name: 'DSIP', category: 'Peptide', route: 'Subcutaneous', vialMg: 5, bacMl: 2, dose: 250, doseUnit: 'mcg',
    schedule: { kind: 'weekly', days: DAILY }, time: '22:00', halfLife: '~hours',
    blurb: 'Delta sleep-inducing peptide; dosed before bed.', kind: 'Peptides', group: 'Other' },

  // ══════════════ BLENDS (peptide combos) ══════════════
  // One vial holds two actives in a fixed ratio. vialMg = the COMBINED mg, and the
  // dose is the combined per-injection amount — so a single draw delivers both in
  // proportion. Ratios shown are typical; edit mg / dose to match your exact vial.
  { name: 'BPC-157 / TB-500', aka: '≈ 5 mg + 5 mg', category: 'Peptide', route: 'Subcutaneous', vialMg: 10, bacMl: 2, dose: 500, doseUnit: 'mcg',
    schedule: { kind: 'weekly', days: DAILY },
    blurb: 'Recovery “Wolverine” blend — BPC-157 + TB-500 for tissue, tendon, gut & joint repair. One draw delivers both.', kind: 'Blends', group: 'Healing & recovery' },
  { name: 'CJC-1295 / Ipamorelin', aka: 'no-DAC · ≈ 5 mg + 5 mg', category: 'Peptide', route: 'Subcutaneous', vialMg: 10, bacMl: 2, dose: 300, doseUnit: 'mcg',
    schedule: { kind: 'weekly', days: DAILY }, time: '22:00',
    blurb: 'The classic GH blend — short-acting GHRH + a selective secretagogue. Best on an empty stomach / before bed.', kind: 'Blends', group: 'Growth hormone' },
  { name: 'CJC-1295 DAC / Ipamorelin', aka: '≈ 5 mg + 5 mg', category: 'Peptide', route: 'Subcutaneous', vialMg: 10, bacMl: 2, dose: 300, doseUnit: 'mcg',
    schedule: { kind: 'weekly', days: MON_THU },
    blurb: 'Long-acting (DAC) GH blend — sustained GH release means fewer injections per week.', kind: 'Blends', group: 'Growth hormone' },
  { name: 'GHRP-2 / CJC-1295', aka: 'no-DAC · ≈ 5 mg + 5 mg', category: 'Peptide', route: 'Subcutaneous', vialMg: 10, bacMl: 2, dose: 200, doseUnit: 'mcg',
    schedule: { kind: 'weekly', days: DAILY },
    blurb: 'GH blend — a potent releaser (GHRP-2) paired with a GHRH for a stronger pulse.', kind: 'Blends', group: 'Growth hormone' },
  { name: 'GHRP-6 / CJC-1295', aka: 'no-DAC · ≈ 5 mg + 5 mg', category: 'Peptide', route: 'Subcutaneous', vialMg: 10, bacMl: 2, dose: 200, doseUnit: 'mcg',
    schedule: { kind: 'weekly', days: DAILY },
    blurb: 'GH blend with marked appetite stimulation — GHRP-6 + a GHRH.', kind: 'Blends', group: 'Growth hormone' },
  { name: 'Sermorelin / Ipamorelin', aka: '≈ 5 mg + 5 mg', category: 'Peptide', route: 'Subcutaneous', vialMg: 10, bacMl: 2, dose: 300, doseUnit: 'mcg',
    schedule: { kind: 'weekly', days: DAILY }, time: '22:00',
    blurb: 'Gentle night-time GH blend — GHRH + selective secretagogue; supports sleep.', kind: 'Blends', group: 'Growth hormone' },

  // ══════════════ VITAMINS & MINERALS ══════════════
  { name: 'Vitamin D3', aka: 'Cholecalciferol', category: 'Vitamin', route: 'Oral', vialMg: 0, count: 120, dose: 5000, doseUnit: 'IU',
    schedule: { kind: 'weekly', days: DAILY },
    blurb: 'Supports bone health, immunity & mood. Fat-soluble — take with food.', kind: 'Vitamins & minerals', group: 'Fat-soluble' },
  { name: 'Vitamin D3 + K2', category: 'Vitamin', route: 'Oral', vialMg: 0, count: 60, dose: 5000, doseUnit: 'IU',
    schedule: { kind: 'weekly', days: DAILY },
    blurb: 'D3 paired with K2 to direct calcium to bone.', kind: 'Vitamins & minerals', group: 'Fat-soluble' },
  { name: 'Vitamin K2 (MK-7)', category: 'Vitamin', route: 'Oral', vialMg: 0, count: 60, dose: 100, doseUnit: 'mcg',
    schedule: { kind: 'weekly', days: DAILY },
    blurb: 'Supports calcium metabolism & arterial health.', kind: 'Vitamins & minerals', group: 'Fat-soluble' },
  { name: 'Vitamin A', category: 'Vitamin', route: 'Oral', vialMg: 0, count: 90, dose: 3000, doseUnit: 'IU',
    schedule: { kind: 'weekly', days: DAILY },
    blurb: 'Vision, skin & immune support. Fat-soluble.', kind: 'Vitamins & minerals', group: 'Fat-soluble' },
  { name: 'Vitamin E', category: 'Vitamin', route: 'Oral', vialMg: 0, count: 60, dose: 400, doseUnit: 'IU',
    schedule: { kind: 'weekly', days: DAILY },
    blurb: 'Antioxidant; protects cell membranes. Fat-soluble.', kind: 'Vitamins & minerals', group: 'Fat-soluble' },
  { name: 'Vitamin C', aka: 'Ascorbic acid', category: 'Vitamin', route: 'Oral', vialMg: 0, count: 120, dose: 1000, doseUnit: 'mg',
    schedule: { kind: 'weekly', days: DAILY },
    blurb: 'Antioxidant & immune support; aids collagen synthesis.', kind: 'Vitamins & minerals', group: 'Water-soluble' },
  { name: 'Vitamin B12', aka: 'Methylcobalamin', category: 'Vitamin', route: 'Oral', vialMg: 0, count: 60, dose: 1000, doseUnit: 'mcg',
    schedule: { kind: 'weekly', days: DAILY },
    blurb: 'Energy, nerve function & red-blood-cell formation.', kind: 'Vitamins & minerals', group: 'B vitamins' },
  { name: 'B-Complex', category: 'Multivitamin', route: 'Oral', vialMg: 0, count: 60, dose: 0, doseUnit: 'mg',
    schedule: { kind: 'weekly', days: DAILY },
    blurb: 'Full spectrum of B vitamins for energy metabolism.', kind: 'Vitamins & minerals', group: 'B vitamins' },
  { name: 'Folate (B9)', aka: 'Methylfolate', category: 'Vitamin', route: 'Oral', vialMg: 0, count: 90, dose: 400, doseUnit: 'mcg',
    schedule: { kind: 'weekly', days: DAILY },
    blurb: 'Cell division & methylation; important in pregnancy.', kind: 'Vitamins & minerals', group: 'B vitamins' },
  { name: 'Magnesium glycinate', category: 'Vitamin', route: 'Oral', vialMg: 0, count: 120, dose: 200, doseUnit: 'mg',
    schedule: { kind: 'weekly', days: DAILY }, time: '21:00',
    blurb: 'Gentle, well-absorbed magnesium; supports sleep & muscle.', kind: 'Vitamins & minerals', group: 'Minerals' },
  { name: 'Zinc', aka: 'Picolinate', category: 'Vitamin', route: 'Oral', vialMg: 0, count: 60, dose: 30, doseUnit: 'mg',
    schedule: { kind: 'weekly', days: DAILY },
    blurb: 'Immune function & hormone support. Take with food.', kind: 'Vitamins & minerals', group: 'Minerals' },
  { name: 'Iron', aka: 'Bisglycinate', category: 'Vitamin', route: 'Oral', vialMg: 0, count: 60, dose: 25, doseUnit: 'mg',
    schedule: { kind: 'weekly', days: DAILY },
    blurb: 'Gentle iron for oxygen transport; pairs with vitamin C.', kind: 'Vitamins & minerals', group: 'Minerals' },
  { name: 'Calcium + D3', category: 'Vitamin', route: 'Oral', vialMg: 0, count: 90, dose: 600, doseUnit: 'mg',
    schedule: { kind: 'weekly', days: DAILY },
    blurb: 'Bone support; calcium with D3 for absorption.', kind: 'Vitamins & minerals', group: 'Minerals' },
  { name: 'Selenium', category: 'Vitamin', route: 'Oral', vialMg: 0, count: 90, dose: 200, doseUnit: 'mcg',
    schedule: { kind: 'weekly', days: DAILY },
    blurb: 'Antioxidant trace mineral; thyroid support.', kind: 'Vitamins & minerals', group: 'Minerals' },
  { name: 'Iodine', aka: 'Kelp', category: 'Vitamin', route: 'Oral', vialMg: 0, count: 90, dose: 150, doseUnit: 'mcg',
    schedule: { kind: 'weekly', days: DAILY },
    blurb: 'Essential for thyroid hormone production.', kind: 'Vitamins & minerals', group: 'Minerals' },
  { name: 'Daily Multivitamin', category: 'Multivitamin', route: 'Oral', vialMg: 0, count: 60, dose: 0, doseUnit: 'mg',
    schedule: { kind: 'weekly', days: DAILY },
    blurb: 'Broad daily coverage of vitamins & minerals.', kind: 'Vitamins & minerals', group: 'Multivitamins' },
  { name: 'Greens powder', category: 'Multivitamin', route: 'Oral', vialMg: 0, count: 30, dose: 0, doseUnit: 'mg',
    schedule: { kind: 'weekly', days: DAILY },
    blurb: 'Greens, adaptogens & micronutrients in one scoop.', kind: 'Vitamins & minerals', group: 'Multivitamins' },

  // ══════════════ SUPPLEMENTS ══════════════
  { name: 'Omega-3', aka: 'Fish oil', category: 'Supplement', route: 'Oral', vialMg: 0, count: 120, dose: 1000, doseUnit: 'mg',
    schedule: { kind: 'weekly', days: DAILY },
    blurb: 'EPA/DHA for heart, brain & joint health.', kind: 'Supplements', group: 'Essential fats' },
  { name: 'Creatine monohydrate', category: 'Supplement', route: 'Oral', vialMg: 0, count: 120, dose: 5000, doseUnit: 'mg',
    schedule: { kind: 'weekly', days: DAILY },
    blurb: 'Strength, power & muscle output; 5 g daily.', kind: 'Supplements', group: 'Performance' },
  { name: 'Collagen peptides', category: 'Supplement', route: 'Oral', vialMg: 0, count: 90, dose: 10000, doseUnit: 'mg',
    schedule: { kind: 'weekly', days: DAILY },
    blurb: 'Skin, hair, joint & connective-tissue support.', kind: 'Supplements', group: 'Joint & skin' },
  { name: 'Ashwagandha', aka: 'KSM-66', category: 'Supplement', route: 'Oral', vialMg: 0, count: 60, dose: 600, doseUnit: 'mg',
    schedule: { kind: 'weekly', days: DAILY },
    blurb: 'Adaptogen for stress, cortisol & sleep.', kind: 'Supplements', group: 'Adaptogens' },
  { name: 'Berberine', category: 'Supplement', route: 'Oral', vialMg: 0, count: 90, dose: 500, doseUnit: 'mg',
    schedule: { kind: 'weekly', days: DAILY },
    blurb: 'Supports glucose metabolism & lipids.', kind: 'Supplements', group: 'Metabolic' },
  { name: 'NAC', aka: 'N-acetylcysteine', category: 'Supplement', route: 'Oral', vialMg: 0, count: 90, dose: 600, doseUnit: 'mg',
    schedule: { kind: 'weekly', days: DAILY },
    blurb: 'Glutathione precursor; antioxidant & liver support.', kind: 'Supplements', group: 'Antioxidants' },
  { name: 'CoQ10', aka: 'Ubiquinol', category: 'Supplement', route: 'Oral', vialMg: 0, count: 60, dose: 100, doseUnit: 'mg',
    schedule: { kind: 'weekly', days: DAILY },
    blurb: 'Mitochondrial energy & heart support.', kind: 'Supplements', group: 'Antioxidants' },
  { name: 'Curcumin', aka: 'Turmeric', category: 'Supplement', route: 'Oral', vialMg: 0, count: 90, dose: 500, doseUnit: 'mg',
    schedule: { kind: 'weekly', days: DAILY },
    blurb: 'Anti-inflammatory; take with black pepper for uptake.', kind: 'Supplements', group: 'Anti-inflammatory' },
  { name: 'L-Theanine', category: 'Supplement', route: 'Oral', vialMg: 0, count: 60, dose: 200, doseUnit: 'mg',
    schedule: { kind: 'weekly', days: DAILY },
    blurb: 'Calm focus; smooths caffeine. Non-drowsy.', kind: 'Supplements', group: 'Nootropics' },
  { name: 'Glycine', category: 'Supplement', route: 'Oral', vialMg: 0, count: 90, dose: 3000, doseUnit: 'mg',
    schedule: { kind: 'weekly', days: DAILY }, time: '21:00',
    blurb: 'Amino acid that supports sleep quality.', kind: 'Supplements', group: 'Sleep' },
  { name: 'Psyllium fiber', category: 'Supplement', route: 'Oral', vialMg: 0, count: 120, dose: 1450, doseUnit: 'mg',
    schedule: { kind: 'weekly', days: DAILY },
    blurb: 'Soluble fiber for digestion & cholesterol.', kind: 'Supplements', group: 'Gut' },
  { name: 'Probiotic', category: 'Multivitamin', route: 'Oral', vialMg: 0, count: 30, dose: 0, doseUnit: 'mg',
    schedule: { kind: 'weekly', days: DAILY },
    blurb: 'Live cultures (CFU) for gut flora — no single mg strength.', kind: 'Supplements', group: 'Gut' },

  // ══════════════ MEDICATIONS (OTC) ══════════════
  { name: 'Melatonin', category: 'Medication', route: 'Oral', vialMg: 0, count: 60, dose: 3, doseUnit: 'mg',
    schedule: { kind: 'weekly', days: DAILY }, time: '22:00', halfLife: '~1–2 hrs',
    blurb: 'Sleep onset; take ~30 min before bed.', kind: 'Medications', group: 'Sleep' },
  { name: 'Ibuprofen', category: 'Medication', route: 'Oral', vialMg: 0, count: 50, dose: 200, doseUnit: 'mg',
    schedule: { kind: 'weekly', days: DAILY }, halfLife: '~2 hrs',
    blurb: 'NSAID for pain & inflammation; take as needed with food.', kind: 'Medications', group: 'Pain & fever' },
  { name: 'Aspirin (low-dose)', category: 'Medication', route: 'Oral', vialMg: 0, count: 100, dose: 81, doseUnit: 'mg',
    schedule: { kind: 'weekly', days: DAILY }, halfLife: '~20 min',
    blurb: 'Low-dose aspirin; cardioprotective (per clinician).', kind: 'Medications', group: 'Cardiovascular' },
  { name: 'Famotidine', aka: 'Pepcid', category: 'Medication', route: 'Oral', vialMg: 0, count: 50, dose: 20, doseUnit: 'mg',
    schedule: { kind: 'weekly', days: DAILY }, halfLife: '~3 hrs',
    blurb: 'H2 blocker for acid reflux & heartburn.', kind: 'Medications', group: 'Digestive' },
  { name: 'Loratadine', aka: 'Claritin', category: 'Medication', route: 'Oral', vialMg: 0, count: 30, dose: 10, doseUnit: 'mg',
    schedule: { kind: 'weekly', days: DAILY }, halfLife: '~8 hrs',
    blurb: 'Non-drowsy antihistamine for allergies.', kind: 'Medications', group: 'Allergy' },
  { name: 'Cetirizine', aka: 'Zyrtec', category: 'Medication', route: 'Oral', vialMg: 0, count: 30, dose: 10, doseUnit: 'mg',
    schedule: { kind: 'weekly', days: DAILY }, halfLife: '~8 hrs',
    blurb: 'Antihistamine for allergies; mild drowsiness possible.', kind: 'Medications', group: 'Allergy' },
];
