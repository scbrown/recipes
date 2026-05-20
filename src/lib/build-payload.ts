import { getEntry } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import type {
  RecipePayload,
  IngredientLine,
  VariantPayload,
  FlavorPayload,
  IngredientSummary,
} from './recipe-payload.ts';

type RecipeEntry = CollectionEntry<'recipes'>;
type RecipeIngredient = RecipeEntry['data']['ingredients'][number];

async function lookup(id: string): Promise<IngredientSummary | null> {
  const entry = await getEntry('ingredients', id);
  if (!entry) return null;
  return { id: entry.id, name: entry.data.name, data: entry.data };
}

function lineIngredientIds(item: RecipeIngredient): string[] {
  if ('id' in item) return [item.id.id];
  return [item.default.id, ...(item.alternatives ?? []).map((a) => a.id.id)];
}

function toLine(item: RecipeIngredient): IngredientLine {
  if ('id' in item) {
    return {
      kind: 'literal',
      ingredientId: item.id.id,
      quantity: item.quantity,
      ...(item.note !== undefined && { note: item.note }),
    };
  }
  return {
    kind: 'slot',
    role: item.role,
    quantity: item.quantity,
    defaultId: item.default.id,
    alternatives: (item.alternatives ?? []).map((a) => ({
      ingredientId: a.id.id,
      ...(a.quantity !== undefined && { quantity: a.quantity }),
      ...(a.note !== undefined && { note: a.note }),
    })),
    ...(item.note !== undefined && { note: item.note }),
  };
}

export async function buildRecipePayload(recipe: RecipeEntry): Promise<RecipePayload> {
  const baseLines = recipe.data.ingredients.map(toLine);
  const variants: VariantPayload[] = (recipe.data.variants ?? []).map((v) => ({
    id: v.id,
    name: v.name,
    serving: v.serving,
    ...(v.yields_servings !== undefined && { yields_servings: v.yields_servings }),
    additions: (v.additions ?? []).map(toLine),
  }));
  const flavors: FlavorPayload[] = (recipe.data.flavors ?? []).map((f) => ({
    id: f.id,
    name: f.name,
    additions: f.additions.map(toLine),
  }));

  const referencedIds = new Set<string>();
  for (const item of recipe.data.ingredients)
    for (const id of lineIngredientIds(item)) referencedIds.add(id);
  for (const v of recipe.data.variants ?? [])
    for (const a of v.additions ?? []) for (const id of lineIngredientIds(a)) referencedIds.add(id);
  for (const f of recipe.data.flavors ?? [])
    for (const a of f.additions) for (const id of lineIngredientIds(a)) referencedIds.add(id);

  const library: Record<string, IngredientSummary> = {};
  for (const id of referencedIds) {
    const entry = await lookup(id);
    if (entry) library[id] = entry;
  }

  return {
    id: recipe.id,
    title: recipe.data.title,
    tags: recipe.data.tags,
    ...(recipe.data.yields !== undefined && { yields: recipe.data.yields }),
    ingredients: baseLines,
    variants,
    flavors,
    library,
  };
}
