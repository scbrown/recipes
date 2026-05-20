import type { CollectionEntry } from 'astro:content';
import type { Nutrients } from './nutrition/types.ts';
import { buildRecipePayload } from './build-payload.ts';
import { computeForSelection, defaultSelection } from './recipe-payload.ts';

export type CompareRow = {
  id: string;
  title: string;
  tags: string[];
  serving: string | null;
  yields_servings: number | null;
  perServing: Nutrients | null;
  total: Nutrients;
  /** Protein per 100 calories, useful for comparing across recipes of different sizes. */
  proteinPerHundredCal: number | null;
};

/**
 * Build a comparison row for a single recipe using its default selection
 * (first variant, default substitutions, no flavor overlays).
 */
export async function buildCompareRow(recipe: CollectionEntry<'recipes'>): Promise<CompareRow> {
  const payload = await buildRecipePayload(recipe);
  const selection = defaultSelection(payload);
  const variant = payload.variants.find((v) => v.id === selection.variantId);
  const nutrition = computeForSelection(payload, selection);

  const display = nutrition.perServing ?? nutrition.total;
  const proteinPerHundredCal =
    display.calories > 0 && display.protein !== undefined
      ? Math.round((display.protein / display.calories) * 100 * 10) / 10
      : null;

  return {
    id: recipe.id,
    title: recipe.data.title,
    tags: recipe.data.tags,
    serving: variant?.serving ?? null,
    yields_servings: variant?.yields_servings ?? null,
    perServing: nutrition.perServing,
    total: nutrition.total,
    proteinPerHundredCal,
  };
}
