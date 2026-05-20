import { defineCollection, reference } from 'astro:content';
import { z } from 'zod';
import { glob } from 'astro/loaders';

// Branded ID types — recipe and ingredient identifiers are not interchangeable.
declare const IngredientIdBrand: unique symbol;
declare const RecipeIdBrand: unique symbol;
export type IngredientId = string & { readonly [IngredientIdBrand]: true };
export type RecipeId = string & { readonly [RecipeIdBrand]: true };

const slug = z
  .string()
  .min(1)
  .regex(/^[a-z0-9][a-z0-9-]*$/, 'Must be lowercase kebab-case');

const quantity = z
  .object({
    amount: z.number().nonnegative().optional(),
    unit: z.string().min(1).optional(),
    pinch: z.boolean().optional(),
    note: z.string().optional(),
  })
  .refine(
    (q) => q.pinch === true || (q.amount !== undefined && q.unit !== undefined),
    'Quantity needs either { amount + unit } or { pinch: true }',
  );

const nutritionPer100g = z
  .object({
    calories: z.number().nonnegative(),
    protein: z.number().nonnegative().optional(),
    carbohydrate: z.number().nonnegative().optional(),
    fat: z.number().nonnegative().optional(),
    fiber: z.number().nonnegative().optional(),
    net_carbs: z.number().nonnegative().optional(),
    sodium_mg: z.number().nonnegative().optional(),
    calcium_mg: z.number().nonnegative().optional(),
    iron_mg: z.number().nonnegative().optional(),
    potassium_mg: z.number().nonnegative().optional(),
    magnesium_mg: z.number().nonnegative().optional(),
    zinc_mg: z.number().nonnegative().optional(),
    vitamin_b12_ug: z.number().nonnegative().optional(),
    vitamin_d_ug: z.number().nonnegative().optional(),
  })
  .strict();

const ingredients = defineCollection({
  loader: glob({ pattern: '**/*.{yml,yaml}', base: './src/content/ingredients' }),
  schema: z
    .object({
      name: z.string().min(1),
      brand_assumption: z.string().optional(),
      roles: z.array(z.string().min(1)).min(1),
      units: z.record(z.string().min(1), z.number().positive()),
      nutrition_per_100g: nutritionPer100g,
      notes: z.string().optional(),
      sources: z.array(z.string()).optional(),
    })
    .strict(),
});

const recipeQuantity = quantity;

const recipeIngredient = z
  .union([
    z
      .object({
        id: reference('ingredients'),
        quantity: recipeQuantity,
        note: z.string().optional(),
      })
      .strict(),
    z
      .object({
        role: z.string().min(1),
        quantity: recipeQuantity,
        default: reference('ingredients'),
        alternatives: z
          .array(
            z
              .object({
                id: reference('ingredients'),
                quantity: recipeQuantity.optional(),
                note: z.string().optional(),
              })
              .strict(),
          )
          .optional(),
        note: z.string().optional(),
      })
      .strict(),
  ])
  .describe('Either a literal ingredient reference or a substitutable role slot');

const variant = z
  .object({
    id: slug,
    name: z.string().min(1),
    serving: z.string().min(1),
    yields_servings: z.number().positive().optional(),
    additions: z.array(recipeIngredient).optional(),
  })
  .strict();

const flavor = z
  .object({
    id: slug,
    name: z.string().min(1),
    additions: z.array(recipeIngredient).min(1),
  })
  .strict();

const recipeImage = z
  .object({
    src: z.string().min(1),
    alt: z.string(),
    credit: z.string().optional(),
  })
  .strict();

const recipes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/recipes' }),
  schema: z
    .object({
      title: z.string().min(1),
      tags: z.array(z.string().min(1)).default([]),
      summary: z.string().optional(),
      yields: z.string().optional(),
      ingredients: z.array(recipeIngredient),
      variants: z.array(variant).optional(),
      flavors: z.array(flavor).optional(),
      images: z
        .object({
          hero: recipeImage.optional(),
          steps: z.array(recipeImage).optional(),
        })
        .strict()
        .optional(),
      draft: z.boolean().default(false),
    })
    .strict(),
});

export const collections = { ingredients, recipes };
