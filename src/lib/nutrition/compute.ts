import type {
  ComputedNutrition,
  IngredientContribution,
  IngredientData,
  Nutrients,
  Quantity,
} from './types.ts';

const NUTRIENT_KEYS: readonly (keyof Nutrients)[] = [
  'calories',
  'protein',
  'carbohydrate',
  'fat',
  'fiber',
  'net_carbs',
  'sodium_mg',
  'calcium_mg',
  'iron_mg',
  'potassium_mg',
  'magnesium_mg',
  'zinc_mg',
  'vitamin_b12_ug',
  'vitamin_d_ug',
];

const PINCH_GRAMS = 0.36;

/**
 * Convert a recipe quantity to grams using the ingredient's unit table.
 * Returns 0 for a pinch (or the configured PINCH_GRAMS constant).
 * Throws if the unit is unknown — callers should validate before computing.
 */
export function quantityToGrams(quantity: Quantity, ingredient: IngredientData): number {
  if (quantity.pinch === true) return PINCH_GRAMS;
  if (quantity.amount === undefined || quantity.unit === undefined) {
    throw new Error('Quantity must have amount + unit when not a pinch');
  }
  const unitKey = quantity.unit.toLowerCase();
  if (unitKey === 'g' || unitKey === 'gram' || unitKey === 'grams') {
    return quantity.amount;
  }
  const gramsPerUnit = ingredient.units[unitKey];
  if (gramsPerUnit === undefined) {
    throw new Error(
      `Unknown unit '${quantity.unit}' for ingredient '${ingredient.name}'. ` +
        `Known units: ${Object.keys(ingredient.units).join(', ') || '(none)'}`,
    );
  }
  return quantity.amount * gramsPerUnit;
}

/** Pure addition of nutrient profiles; preserves `undefined` for missing data. */
export function addNutrients(a: Nutrients, b: Nutrients): Nutrients {
  const out: Partial<Nutrients> = {};
  for (const key of NUTRIENT_KEYS) {
    const left = a[key];
    const right = b[key];
    if (left === undefined && right === undefined) continue;
    out[key] = (left ?? 0) + (right ?? 0);
  }
  return out as Nutrients;
}

/** Scale a `per 100g` nutrient profile to an arbitrary mass in grams. */
export function scaleNutrients(per100g: Nutrients, grams: number): Nutrients {
  const factor = grams / 100;
  const out: Partial<Nutrients> = {};
  for (const key of NUTRIENT_KEYS) {
    const value = per100g[key];
    if (value === undefined) continue;
    out[key] = round(value * factor);
  }
  return (out.calories === undefined ? { ...out, calories: 0 } : out) as Nutrients;
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Divide a nutrient profile by a positive number of servings. */
export function perServing(total: Nutrients, servings: number): Nutrients {
  if (servings <= 0) throw new Error('servings must be positive');
  const out: Partial<Nutrients> = {};
  for (const key of NUTRIENT_KEYS) {
    const value = total[key];
    if (value === undefined) continue;
    out[key] = round(value / servings);
  }
  return out as Nutrients;
}

export type ResolvedIngredient = {
  ingredientId: string;
  ingredient: IngredientData;
  quantity: Quantity;
};

/**
 * Compute total nutrition across a list of (ingredient, quantity) pairs.
 * Returns total, per-ingredient breakdown, and (if servings provided) per-serving values.
 */
export function computeNutrition(
  items: ResolvedIngredient[],
  servings?: number,
): ComputedNutrition {
  const contributions: IngredientContribution[] = items.map(
    ({ ingredientId, ingredient, quantity }) => {
      const grams = quantityToGrams(quantity, ingredient);
      const nutrients = scaleNutrients(ingredient.nutrition_per_100g, grams);
      return { ingredientId, grams, nutrients };
    },
  );

  const total = contributions.reduce<Nutrients>((acc, c) => addNutrients(acc, c.nutrients), {
    calories: 0,
  });

  return {
    total,
    perServing: servings !== undefined ? perServing(total, servings) : null,
    contributions,
  };
}
