import { describe, it, expect } from 'vitest';
import {
  computeForSelection,
  defaultSelection,
  resolvedIngredientLines,
  type RecipePayload,
} from '../../src/lib/recipe-payload.ts';

const payload: RecipePayload = {
  id: 'test',
  title: 'Test Recipe',
  tags: ['test'],
  ingredients: [
    { kind: 'literal', ingredientId: 'flour', quantity: { amount: 100, unit: 'g' } },
    {
      kind: 'slot',
      role: 'protein',
      quantity: { amount: 30, unit: 'g' },
      defaultId: 'whey',
      alternatives: [{ ingredientId: 'pea', quantity: { amount: 33, unit: 'g' } }],
    },
    { kind: 'literal', ingredientId: 'water', quantity: { amount: 30, unit: 'g' } },
  ],
  variants: [
    {
      id: 'v1',
      name: 'Standard',
      serving: '1 serving',
      yields_servings: 2,
      additions: [{ kind: 'literal', ingredientId: 'butter', quantity: { amount: 10, unit: 'g' } }],
    },
  ],
  flavors: [
    {
      id: 'sweet',
      name: 'Sweet',
      additions: [{ kind: 'literal', ingredientId: 'sugar', quantity: { amount: 20, unit: 'g' } }],
    },
    {
      id: 'fruity',
      name: 'Fruity',
      additions: [{ kind: 'literal', ingredientId: 'juice', quantity: { amount: 30, unit: 'g' } }],
      reductions: [{ ingredientId: 'water', quantity: { amount: 30, unit: 'g' } }],
    },
  ],
  library: {
    water: {
      id: 'water',
      name: 'Water',
      data: { name: 'Water', units: { g: 1 }, nutrition_per_100g: { calories: 0 } },
    },
    juice: {
      id: 'juice',
      name: 'Juice',
      data: {
        name: 'Juice',
        units: { g: 1 },
        nutrition_per_100g: { calories: 46, carbohydrate: 12 },
      },
    },
    flour: {
      id: 'flour',
      name: 'Flour',
      data: { name: 'Flour', units: { g: 1 }, nutrition_per_100g: { calories: 360, protein: 10 } },
    },
    whey: {
      id: 'whey',
      name: 'Whey',
      data: { name: 'Whey', units: { g: 1 }, nutrition_per_100g: { calories: 380, protein: 90 } },
    },
    pea: {
      id: 'pea',
      name: 'Pea',
      data: { name: 'Pea', units: { g: 1 }, nutrition_per_100g: { calories: 370, protein: 80 } },
    },
    butter: {
      id: 'butter',
      name: 'Butter',
      data: { name: 'Butter', units: { g: 1 }, nutrition_per_100g: { calories: 720, fat: 81 } },
    },
    sugar: {
      id: 'sugar',
      name: 'Sugar',
      data: {
        name: 'Sugar',
        units: { g: 1 },
        nutrition_per_100g: { calories: 380, carbohydrate: 100 },
      },
    },
  },
};

describe('defaultSelection', () => {
  it('picks the first variant and the default for each slot', () => {
    const s = defaultSelection(payload);
    expect(s.variantId).toBe('v1');
    expect(s.substitutions['protein']).toBe('whey');
    expect(s.flavorIds).toEqual([]);
  });
});

describe('computeForSelection', () => {
  it('computes totals with default selection', () => {
    const s = defaultSelection(payload);
    const result = computeForSelection(payload, s);
    // flour 100g: 360 cal, 10 protein; whey 30g: 114 cal, 27 protein; butter 10g: 72 cal, 0 protein
    expect(result.total.calories).toBe(546);
    expect(result.total.protein).toBe(37);
    expect(result.perServing?.calories).toBe(273);
  });

  it('swaps protein when substitution changes', () => {
    const s = { ...defaultSelection(payload), substitutions: { protein: 'pea' } };
    const result = computeForSelection(payload, s);
    // pea 33g (alt quantity): 122.1 cal, 26.4 protein
    expect(result.total.protein).toBeCloseTo(36.4, 1);
  });

  it('adds flavor additions to total', () => {
    const base = computeForSelection(payload, defaultSelection(payload));
    const withFlavor = computeForSelection(payload, {
      ...defaultSelection(payload),
      flavorIds: ['sweet'],
    });
    expect(withFlavor.total.calories).toBe(base.total.calories + 76);
  });

  it('nets a reduction against the matching base ingredient', () => {
    const result = computeForSelection(payload, {
      ...defaultSelection(payload),
      flavorIds: ['fruity'],
    });
    // juice 30g adds 13.8 cal; water (0 cal) is reduced from 30g to 0g.
    const water = result.contributions.find((c) => c.ingredientId === 'water');
    const juice = result.contributions.find((c) => c.ingredientId === 'juice');
    expect(water?.grams).toBe(0);
    expect(juice?.grams).toBe(30);
    // 546 base + 13.8 juice (water swap is calorie-neutral here).
    expect(result.total.calories).toBeCloseTo(559.8, 1);
  });

  it('returns null perServing when variant has no yields_servings', () => {
    const altPayload: RecipePayload = {
      ...payload,
      variants: [{ ...payload.variants[0]!, additions: payload.variants[0]!.additions }],
    };
    delete (altPayload.variants[0] as { yields_servings?: number }).yields_servings;
    const result = computeForSelection(altPayload, defaultSelection(altPayload));
    expect(result.perServing).toBeNull();
  });
});

describe('resolvedIngredientLines', () => {
  it('returns base, variant, and active flavor lines', () => {
    const s = { ...defaultSelection(payload), flavorIds: ['sweet'] };
    const out = resolvedIngredientLines(payload, s);
    expect(out.base).toHaveLength(3);
    expect(out.base[1]?.name).toBe('Whey');
    expect(out.variant).toHaveLength(1);
    expect(out.variant[0]?.name).toBe('Butter');
    expect(out.flavors).toHaveLength(1);
    expect(out.flavors[0]?.additions[0]?.name).toBe('Sugar');
  });

  it('exposes reductions on an active flavor for display', () => {
    const s = { ...defaultSelection(payload), flavorIds: ['fruity'] };
    const out = resolvedIngredientLines(payload, s);
    expect(out.flavors[0]?.additions[0]?.name).toBe('Juice');
    expect(out.flavors[0]?.reductions).toHaveLength(1);
    expect(out.flavors[0]?.reductions[0]?.name).toBe('Water');
    expect(out.flavors[0]?.reductions[0]?.quantityDisplay).toBe('30 g');
  });

  it('reflects substitution choice in slot rows', () => {
    const s = { ...defaultSelection(payload), substitutions: { protein: 'pea' } };
    const out = resolvedIngredientLines(payload, s);
    expect(out.base[1]?.name).toBe('Pea');
    expect(out.base[1]?.quantityDisplay).toBe('33 g');
  });

  it('excludes flavors not selected', () => {
    const out = resolvedIngredientLines(payload, defaultSelection(payload));
    expect(out.flavors).toHaveLength(0);
  });
});
