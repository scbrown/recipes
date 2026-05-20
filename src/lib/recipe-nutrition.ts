import { getEntry } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import {
  computeNutrition,
  type ComputedNutrition,
  type ResolvedIngredient,
} from './nutrition/index.ts';

type IngredientEntry = CollectionEntry<'ingredients'>;
type RecipeEntry = CollectionEntry<'recipes'>;
type RecipeIngredient = RecipeEntry['data']['ingredients'][number];
type Variant = NonNullable<RecipeEntry['data']['variants']>[number];

async function resolveIngredient(item: RecipeIngredient): Promise<ResolvedIngredient | null> {
  const ingredientId = 'id' in item ? item.id.id : item.default.id;
  const entry: IngredientEntry | undefined = await getEntry('ingredients', ingredientId);
  if (!entry) return null;
  return {
    ingredientId: entry.id,
    ingredient: entry.data,
    quantity: item.quantity,
  };
}

export async function computeRecipeNutrition(
  recipe: RecipeEntry,
  variantId?: string,
): Promise<ComputedNutrition> {
  const baseItems = await Promise.all(recipe.data.ingredients.map(resolveIngredient));

  let variantItems: (ResolvedIngredient | null)[] = [];
  let servings: number | undefined;

  if (variantId && recipe.data.variants) {
    const variant: Variant | undefined = recipe.data.variants.find((v) => v.id === variantId);
    if (variant) {
      variantItems = await Promise.all((variant.additions ?? []).map(resolveIngredient));
      servings = variant.yields_servings;
    }
  } else if (recipe.data.variants && recipe.data.variants.length > 0) {
    const first = recipe.data.variants[0];
    if (first) {
      variantItems = await Promise.all((first.additions ?? []).map(resolveIngredient));
      servings = first.yields_servings;
    }
  }

  const all = [...baseItems, ...variantItems].filter((x): x is ResolvedIngredient => x !== null);

  return computeNutrition(all, servings);
}

export function getDefaultVariant(recipe: RecipeEntry): Variant | undefined {
  return recipe.data.variants?.[0];
}
