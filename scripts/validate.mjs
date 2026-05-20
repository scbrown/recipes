#!/usr/bin/env node
// Cross-file validation for the ingredient and recipe libraries.
// Runs in addition to Astro's Zod schemas — checks ingredient references
// resolve, units are convertible, and substitution slots are valid.

import { readdir, readFile } from 'node:fs/promises';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import matter from 'gray-matter';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const ingredientsDir = join(repoRoot, 'src/content/ingredients');
const recipesDir = join(repoRoot, 'src/content/recipes');

let errors = 0;
let warnings = 0;

function err(msg) {
  console.error(`ERROR: ${msg}`);
  errors++;
}
function warn(msg) {
  console.warn(`WARN:  ${msg}`);
  warnings++;
}

async function loadIngredients() {
  const files = await readdir(ingredientsDir);
  const out = new Map();
  for (const f of files) {
    if (!f.endsWith('.yaml') && !f.endsWith('.yml')) continue;
    const id = basename(f, f.endsWith('.yaml') ? '.yaml' : '.yml');
    const raw = await readFile(join(ingredientsDir, f), 'utf8');
    const data = parseYaml(raw);
    out.set(id, data);
  }
  return out;
}

async function loadRecipes() {
  const files = await readdir(recipesDir);
  const out = [];
  for (const f of files) {
    if (!f.endsWith('.md')) continue;
    const id = basename(f, '.md');
    const raw = await readFile(join(recipesDir, f), 'utf8');
    const { data } = matter(raw);
    out.push({ id, data, file: f });
  }
  return out;
}

function checkUnit(ingredient, ingredientId, quantity, context) {
  if (quantity?.pinch === true) return;
  const unit = quantity?.unit?.toLowerCase();
  if (!unit) {
    err(`${context}: missing unit on quantity for "${ingredientId}"`);
    return;
  }
  if (['g', 'gram', 'grams'].includes(unit)) return;
  if (!ingredient.units || !(unit in ingredient.units)) {
    err(
      `${context}: ingredient "${ingredientId}" has no entry for unit "${unit}". ` +
        `Known units: ${Object.keys(ingredient.units ?? {}).join(', ') || '(none)'}`,
    );
  }
}

function checkRecipeIngredient(item, recipeId, ingredients, locationLabel) {
  const ctx = `recipe "${recipeId}" › ${locationLabel}`;
  if ('id' in item) {
    const ing = ingredients.get(item.id);
    if (!ing) {
      err(`${ctx}: unknown ingredient id "${item.id}"`);
      return;
    }
    checkUnit(ing, item.id, item.quantity, ctx);
    return;
  }
  if ('role' in item) {
    const def = ingredients.get(item.default);
    if (!def) {
      err(`${ctx}: unknown default ingredient "${item.default}" for role "${item.role}"`);
      return;
    }
    if (!def.roles?.includes(item.role)) {
      warn(
        `${ctx}: default "${item.default}" does not list role "${item.role}" (roles: ${(
          def.roles ?? []
        ).join(', ')})`,
      );
    }
    checkUnit(def, item.default, item.quantity, ctx);
    for (const alt of item.alternatives ?? []) {
      const altIng = ingredients.get(alt.id);
      if (!altIng) {
        err(`${ctx}: unknown alternative ingredient "${alt.id}"`);
        continue;
      }
      if (!altIng.roles?.includes(item.role)) {
        warn(
          `${ctx}: alternative "${alt.id}" does not list role "${item.role}" (roles: ${(
            altIng.roles ?? []
          ).join(', ')})`,
        );
      }
      if (alt.quantity) checkUnit(altIng, alt.id, alt.quantity, ctx);
    }
  }
}

function main() {
  return Promise.all([loadIngredients(), loadRecipes()]).then(([ingredients, recipes]) => {
    console.log(`Loaded ${ingredients.size} ingredients and ${recipes.length} recipes.`);

    // Check ingredient role coverage
    const referencedIds = new Set();
    for (const recipe of recipes) {
      for (const [idx, item] of (recipe.data.ingredients ?? []).entries()) {
        checkRecipeIngredient(item, recipe.id, ingredients, `ingredients[${idx}]`);
        if ('id' in item) referencedIds.add(item.id);
        if ('default' in item) {
          referencedIds.add(item.default);
          for (const alt of item.alternatives ?? []) referencedIds.add(alt.id);
        }
      }
      for (const [vi, variant] of (recipe.data.variants ?? []).entries()) {
        for (const [ai, addition] of (variant.additions ?? []).entries()) {
          checkRecipeIngredient(
            addition,
            recipe.id,
            ingredients,
            `variants[${vi}].additions[${ai}]`,
          );
          if ('id' in addition) referencedIds.add(addition.id);
        }
      }
      for (const [fi, flavor] of (recipe.data.flavors ?? []).entries()) {
        for (const [ai, addition] of (flavor.additions ?? []).entries()) {
          checkRecipeIngredient(
            addition,
            recipe.id,
            ingredients,
            `flavors[${fi}].additions[${ai}]`,
          );
          if ('id' in addition) referencedIds.add(addition.id);
        }
      }
    }

    // Orphan ingredients (warning only)
    for (const id of ingredients.keys()) {
      if (!referencedIds.has(id)) warn(`Orphan ingredient "${id}" — no recipe uses it.`);
    }

    console.log(`\n${errors} error(s), ${warnings} warning(s).`);
    if (errors > 0) process.exit(1);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
