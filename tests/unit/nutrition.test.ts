import { describe, it, expect } from 'vitest';
import {
  addNutrients,
  computeNutrition,
  perServing,
  quantityToGrams,
  scaleNutrients,
} from '../../src/lib/nutrition/compute.ts';
import type { IngredientData } from '../../src/lib/nutrition/types.ts';

const whey: IngredientData = {
  name: 'Whey Protein Isolate',
  units: { tbsp: 7, scoop: 30, cup: 112 },
  nutrition_per_100g: {
    calories: 380,
    protein: 90,
    carbohydrate: 4,
    fat: 1,
    fiber: 0,
    net_carbs: 4,
    sodium_mg: 200,
  },
};

const allulose: IngredientData = {
  name: 'Allulose',
  units: { tbsp: 12, cup: 192, tsp: 4 },
  nutrition_per_100g: {
    calories: 0,
    carbohydrate: 100,
    net_carbs: 0,
    fiber: 0,
  },
};

describe('quantityToGrams', () => {
  it('converts a known unit to grams', () => {
    expect(quantityToGrams({ amount: 2, unit: 'tbsp' }, whey)).toBe(14);
  });

  it('treats `g` as an identity unit', () => {
    expect(quantityToGrams({ amount: 50, unit: 'g' }, whey)).toBe(50);
  });

  it('returns the pinch constant for pinch quantities', () => {
    expect(quantityToGrams({ pinch: true }, whey)).toBeCloseTo(0.36, 2);
  });

  it('throws for an unknown unit', () => {
    expect(() => quantityToGrams({ amount: 1, unit: 'gallon' }, whey)).toThrow(/Unknown unit/);
  });

  it('throws when amount + unit are missing without pinch', () => {
    expect(() => quantityToGrams({}, whey)).toThrow();
  });
});

describe('scaleNutrients', () => {
  it('scales linearly with mass', () => {
    const out = scaleNutrients(whey.nutrition_per_100g, 30);
    expect(out.calories).toBe(114);
    expect(out.protein).toBe(27);
  });

  it('omits undefined nutrients', () => {
    const out = scaleNutrients(allulose.nutrition_per_100g, 12);
    expect(out.sodium_mg).toBeUndefined();
    expect(out.calories).toBe(0);
  });
});

describe('addNutrients', () => {
  it('sums values that exist in either operand', () => {
    const a = { calories: 100, protein: 5 };
    const b = { calories: 50, fat: 2 };
    expect(addNutrients(a, b)).toEqual({ calories: 150, protein: 5, fat: 2 });
  });

  it('preserves undefined when both operands lack a nutrient', () => {
    const out = addNutrients({ calories: 0 }, { calories: 0 });
    expect(out.protein).toBeUndefined();
  });
});

describe('perServing', () => {
  it('divides every defined nutrient by the serving count', () => {
    const out = perServing({ calories: 600, protein: 30 }, 4);
    expect(out.calories).toBe(150);
    expect(out.protein).toBe(7.5);
  });

  it('throws for zero or negative servings', () => {
    expect(() => perServing({ calories: 100 }, 0)).toThrow();
    expect(() => perServing({ calories: 100 }, -1)).toThrow();
  });
});

describe('computeNutrition', () => {
  it('sums contributions across ingredients', () => {
    const result = computeNutrition([
      { ingredientId: 'whey', ingredient: whey, quantity: { amount: 1, unit: 'scoop' } },
      { ingredientId: 'allulose', ingredient: allulose, quantity: { amount: 1, unit: 'tbsp' } },
    ]);
    expect(result.total.calories).toBe(114);
    expect(result.total.protein).toBe(27);
    expect(result.contributions).toHaveLength(2);
    const [first, second] = result.contributions;
    expect(first?.grams).toBe(30);
    expect(second?.grams).toBe(12);
  });

  it('returns per-serving values when servings provided', () => {
    const result = computeNutrition(
      [{ ingredientId: 'whey', ingredient: whey, quantity: { amount: 2, unit: 'scoop' } }],
      4,
    );
    expect(result.perServing).not.toBeNull();
    expect(result.perServing?.calories).toBe(57);
  });

  it('returns null perServing when servings omitted', () => {
    const result = computeNutrition([
      { ingredientId: 'whey', ingredient: whey, quantity: { amount: 1, unit: 'scoop' } },
    ]);
    expect(result.perServing).toBeNull();
  });

  it('nets a reduction against the matching contribution', () => {
    const result = computeNutrition(
      [{ ingredientId: 'whey', ingredient: whey, quantity: { amount: 2, unit: 'scoop' } }],
      undefined,
      [{ ingredientId: 'whey', ingredient: whey, quantity: { amount: 1, unit: 'scoop' } }],
    );
    // 60g - 30g = 30g of whey → 114 cal, 27 protein.
    expect(result.contributions[0]?.grams).toBe(30);
    expect(result.total.calories).toBe(114);
    expect(result.total.protein).toBe(27);
  });

  it('clamps a reduction larger than what is present to zero', () => {
    const result = computeNutrition(
      [{ ingredientId: 'whey', ingredient: whey, quantity: { amount: 1, unit: 'scoop' } }],
      undefined,
      [{ ingredientId: 'whey', ingredient: whey, quantity: { amount: 5, unit: 'scoop' } }],
    );
    expect(result.contributions[0]?.grams).toBe(0);
    expect(result.total.calories).toBe(0);
  });

  it('ignores a reduction with no matching ingredient', () => {
    const result = computeNutrition(
      [{ ingredientId: 'whey', ingredient: whey, quantity: { amount: 1, unit: 'scoop' } }],
      undefined,
      [{ ingredientId: 'allulose', ingredient: allulose, quantity: { amount: 1, unit: 'tbsp' } }],
    );
    expect(result.total.calories).toBe(114);
  });
});
