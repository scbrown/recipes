import type { Nutrients, IngredientData, Quantity, ComputedNutrition } from './nutrition/types.ts';
import { computeNutrition } from './nutrition/compute.ts';

export type IngredientLine =
  | { kind: 'literal'; ingredientId: string; quantity: Quantity; note?: string }
  | {
      kind: 'slot';
      role: string;
      quantity: Quantity;
      defaultId: string;
      alternatives: { ingredientId: string; quantity?: Quantity; note?: string }[];
      note?: string;
    };

export type ReductionLine = { ingredientId: string; quantity: Quantity };

export type VariantPayload = {
  id: string;
  name: string;
  serving: string;
  yields_servings?: number;
  additions: IngredientLine[];
  reductions?: ReductionLine[];
};

export type FlavorPayload = {
  id: string;
  name: string;
  additions: IngredientLine[];
  reductions?: ReductionLine[];
};

export type IngredientSummary = {
  id: string;
  name: string;
  data: IngredientData;
};

export type RecipePayload = {
  id: string;
  title: string;
  tags: string[];
  yields?: string;
  variants: VariantPayload[];
  flavors: FlavorPayload[];
  ingredients: IngredientLine[];
  library: Record<string, IngredientSummary>;
};

export type Selection = {
  variantId: string;
  substitutions: Record<string, string>;
  flavorIds: string[];
};

export function defaultSelection(payload: RecipePayload): Selection {
  const substitutions: Record<string, string> = {};
  const collectSlots = (lines: IngredientLine[]) => {
    for (const line of lines) {
      if (line.kind === 'slot') substitutions[line.role] = line.defaultId;
    }
  };
  collectSlots(payload.ingredients);
  const variant = payload.variants[0];
  if (variant) collectSlots(variant.additions);
  return {
    variantId: variant?.id ?? '',
    substitutions,
    flavorIds: [],
  };
}

type ResolvedItem = {
  ingredientId: string;
  ingredient: IngredientData;
  quantity: Quantity;
};

function resolveLine(
  line: IngredientLine,
  selection: Selection,
  library: Record<string, IngredientSummary>,
): ResolvedItem | null {
  if (line.kind === 'literal') {
    const entry = library[line.ingredientId];
    if (!entry) return null;
    return { ingredientId: entry.id, ingredient: entry.data, quantity: line.quantity };
  }
  const chosenId = selection.substitutions[line.role] ?? line.defaultId;
  const entry = library[chosenId];
  if (!entry) return null;
  const altQty = line.alternatives.find((a) => a.ingredientId === chosenId)?.quantity;
  return {
    ingredientId: entry.id,
    ingredient: entry.data,
    quantity: altQty ?? line.quantity,
  };
}

function resolveReduction(
  reduction: ReductionLine,
  library: Record<string, IngredientSummary>,
): ResolvedItem | null {
  const entry = library[reduction.ingredientId];
  if (!entry) return null;
  return { ingredientId: entry.id, ingredient: entry.data, quantity: reduction.quantity };
}

export function computeForSelection(
  payload: RecipePayload,
  selection: Selection,
): ComputedNutrition {
  const variant = payload.variants.find((v) => v.id === selection.variantId);
  const flavors = payload.flavors.filter((f) => selection.flavorIds.includes(f.id));
  const lines: IngredientLine[] = [
    ...payload.ingredients,
    ...(variant?.additions ?? []),
    ...flavors.flatMap((f) => f.additions),
  ];
  const resolved = lines
    .map((line) => resolveLine(line, selection, payload.library))
    .filter((r): r is ResolvedItem => r !== null);
  const reductions = [...(variant?.reductions ?? []), ...flavors.flatMap((f) => f.reductions ?? [])]
    .map((r) => resolveReduction(r, payload.library))
    .filter((r): r is ResolvedItem => r !== null);
  return computeNutrition(resolved, variant?.yields_servings, reductions);
}

export type ResolvedIngredientLine = {
  line: IngredientLine;
  ingredientId: string;
  name: string;
  quantityDisplay: string;
};

export type ResolvedReduction = {
  ingredientId: string;
  name: string;
  quantityDisplay: string;
};

function formatQuantity(q: Quantity): string {
  if (q.pinch === true) return 'pinch';
  return `${q.amount ?? ''} ${q.unit ?? ''}`.trim();
}

export function resolvedIngredientLines(
  payload: RecipePayload,
  selection: Selection,
): {
  base: ResolvedIngredientLine[];
  variant: ResolvedIngredientLine[];
  variantReductions: ResolvedReduction[];
  flavors: {
    flavorId: string;
    flavorName: string;
    additions: ResolvedIngredientLine[];
    reductions: ResolvedReduction[];
  }[];
} {
  const resolveReductionDisplay = (r: ReductionLine): ResolvedReduction | null => {
    const entry = payload.library[r.ingredientId];
    if (!entry) return null;
    return {
      ingredientId: entry.id,
      name: entry.name,
      quantityDisplay: formatQuantity(r.quantity),
    };
  };
  const resolveOne = (line: IngredientLine): ResolvedIngredientLine | null => {
    if (line.kind === 'literal') {
      const entry = payload.library[line.ingredientId];
      if (!entry) return null;
      return {
        line,
        ingredientId: entry.id,
        name: entry.name,
        quantityDisplay: formatQuantity(line.quantity),
      };
    }
    const chosenId = selection.substitutions[line.role] ?? line.defaultId;
    const entry = payload.library[chosenId];
    if (!entry) return null;
    const altQty = line.alternatives.find((a) => a.ingredientId === chosenId)?.quantity;
    return {
      line,
      ingredientId: entry.id,
      name: entry.name,
      quantityDisplay: formatQuantity(altQty ?? line.quantity),
    };
  };
  const base = payload.ingredients
    .map(resolveOne)
    .filter((r): r is ResolvedIngredientLine => r !== null);
  const variant = payload.variants.find((v) => v.id === selection.variantId);
  const variantLines = (variant?.additions ?? [])
    .map(resolveOne)
    .filter((r): r is ResolvedIngredientLine => r !== null);
  const variantReductions = (variant?.reductions ?? [])
    .map(resolveReductionDisplay)
    .filter((r): r is ResolvedReduction => r !== null);
  const flavorLines = payload.flavors
    .filter((f) => selection.flavorIds.includes(f.id))
    .map((f) => ({
      flavorId: f.id,
      flavorName: f.name,
      additions: f.additions.map(resolveOne).filter((r): r is ResolvedIngredientLine => r !== null),
      reductions: (f.reductions ?? [])
        .map(resolveReductionDisplay)
        .filter((r): r is ResolvedReduction => r !== null),
    }));
  return { base, variant: variantLines, variantReductions, flavors: flavorLines };
}

export type { Nutrients };
