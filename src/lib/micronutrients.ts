// Daily Value (DV) reference amounts for adults from the FDA (21 CFR 101.9).
// Used to normalize per-serving micronutrient amounts into a 0–100% coverage
// score for visualization (radar chart, micronutrient columns).

import type { Nutrients } from './nutrition/types.ts';

export type MicroKey =
  | 'fiber'
  | 'calcium_mg'
  | 'iron_mg'
  | 'magnesium_mg'
  | 'potassium_mg'
  | 'zinc_mg'
  | 'vitamin_b12_ug'
  | 'vitamin_d_ug'
  | 'sodium_mg';

export const MICRO_DV: Record<MicroKey, { dv: number; unit: string; label: string }> = {
  fiber: { dv: 28, unit: 'g', label: 'Fiber' },
  calcium_mg: { dv: 1300, unit: 'mg', label: 'Calcium' },
  iron_mg: { dv: 18, unit: 'mg', label: 'Iron' },
  magnesium_mg: { dv: 420, unit: 'mg', label: 'Magnesium' },
  potassium_mg: { dv: 4700, unit: 'mg', label: 'Potassium' },
  zinc_mg: { dv: 11, unit: 'mg', label: 'Zinc' },
  vitamin_b12_ug: { dv: 2.4, unit: 'µg', label: 'B12' },
  vitamin_d_ug: { dv: 20, unit: 'µg', label: 'Vit D' },
  sodium_mg: { dv: 2300, unit: 'mg', label: 'Sodium' },
};

export const MICRO_KEYS: MicroKey[] = [
  'fiber',
  'calcium_mg',
  'iron_mg',
  'magnesium_mg',
  'potassium_mg',
  'zinc_mg',
  'vitamin_b12_ug',
  'vitamin_d_ug',
];

/** Percent of daily value for a single nutrient, clamped at 100 for chart use. */
export function dvPercent(amount: number | undefined, key: MicroKey): number | null {
  if (amount === undefined) return null;
  const ref = MICRO_DV[key];
  return Math.min(100, (amount / ref.dv) * 100);
}

/** Raw percent of daily value (uncapped). Used for compare-table display. */
export function dvPercentRaw(amount: number | undefined, key: MicroKey): number | null {
  if (amount === undefined) return null;
  return (amount / MICRO_DV[key].dv) * 100;
}

/** Build the (label, percent) array a radar chart consumes. */
export function radarSeries(nutrients: Nutrients): { label: string; value: number }[] {
  return MICRO_KEYS.map((key) => ({
    label: MICRO_DV[key].label,
    value: dvPercent(nutrients[key], key) ?? 0,
  }));
}
