# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common commands

```bash
pnpm install                       # required before anything else
pnpm dev                           # astro dev on http://localhost:4321
pnpm build                         # astro build + pagefind search index
pnpm preview                       # serve the built site (used by e2e)

pnpm validate                      # cross-file content checks (see scripts/validate.mjs)
pnpm typecheck                     # astro check (TypeScript strict)
pnpm lint                          # eslint + stylelint + markdownlint + prettier --check
pnpm lint:prose                    # cspell against md/yaml under src/content
pnpm fix                           # auto-fix counterparts of the lint suite

pnpm test:unit                     # vitest run
pnpm test:unit:watch               # vitest watch
pnpm vitest run tests/unit/nutrition.test.ts        # single file
pnpm vitest run -t "quantityToGrams"                # single test by name
pnpm test:e2e                      # playwright (builds + previews automatically)
pnpm test:e2e -- tests/e2e/recipe-page.spec.ts      # single spec
```

Pre-commit (husky + lint-staged) runs the relevant lint/format/validate steps on staged files only. `pnpm validate` is invoked automatically when any `src/content/ingredients/*.yaml` or `src/content/recipes/*.md` is staged.

Node version is pinned in `.nvmrc` (Node 22). Package manager is pnpm 10 (see `packageManager` in `package.json`).

## Architecture

This is a static site built with **Astro Content Collections** where the data model — ingredients and recipes — is the product. Everything else (rendering, charts, search, compare page) is derived from it.

### Content as the source of truth

- **`src/content/ingredients/*.yaml`** — one ingredient per file. Required: `name`, `roles`, `units` (gram conversions), `nutrition_per_100g`. The filename (minus extension) is the canonical `id`.
- **`src/content/recipes/*.md`** — Markdown body + structured YAML frontmatter. Frontmatter lists `ingredients`, optional `variants` (preparation styles, e.g. pancake vs crepe), and optional `flavors` (additive overlays like "cake batter").
- **`src/content.config.ts`** — Zod schemas for both collections. This is the **single source of truth** for the data shape; Astro generates types from it that flow into `src/lib/*` and components. It also declares branded `IngredientId` / `RecipeId` types to prevent ID mix-ups.

### Three axes of variation in a recipe

Any served portion = base `ingredients` + one selected `variant` + zero-or-more selected `flavors`. The frontmatter has three corresponding shapes:

1. **Substitutions** — an ingredient line can be either `{ id, quantity }` (literal) or `{ role, quantity, default, alternatives[] }` (substitutable slot). Alternatives may override `quantity` for density adjustment.
2. **Preparation variants** (`variants[]`) — additions layered on the base; each has its own `yields_servings` used to compute per-serving nutrition.
3. **Flavor variants** (`flavors[]`) — purely additive overlays; any subset may be active.

### Validation has two layers

1. **Zod via Astro Content Collections** (`src/content.config.ts`) — runs on every build / `astro check`. Catches missing fields, bad references via `reference('ingredients')`, malformed quantities.
2. **`scripts/validate.mjs`** — cross-file checks that Zod can't express alone: every unit used in a recipe quantity has a conversion entry on the referenced ingredient; slot alternatives actually list the slot's `role`; orphan ingredients warn (not fail). Treat this as part of "did my change work" alongside typecheck.

### Computation pipeline

The nutrition math is pure TypeScript in `src/lib/nutrition/` and reused on both build and client:

1. `src/lib/build-payload.ts` runs at build time — loads each recipe entry plus every referenced ingredient into a self-contained `RecipePayload` (recipe data + an `IngredientSummary` library for every referenced ID, including alternatives).
2. The payload is embedded in the recipe page so a Svelte island (`src/components/recipe/RecipeInteractive.svelte`) can recompute on substitution/variant/flavor changes without a network round-trip.
3. `src/lib/recipe-payload.ts` exposes `computeForSelection(payload, selection)` and `resolvedIngredientLines(payload, selection)` — used identically by the server-rendered page and the client island.
4. `src/lib/nutrition/compute.ts` is the lowest layer (`quantityToGrams`, `scaleNutrients`, `addNutrients`, `perServing`, `computeNutrition`). It preserves `undefined` for missing nutrient data — do **not** coerce to 0, that's how we distinguish "no micronutrient data" from "zero of this nutrient".

### Site layout

- `src/pages/index.astro`, `compare.astro`, `search.astro` — top-level pages.
- `src/pages/recipes/[id].astro`, `src/pages/ingredients/[id].astro` — dynamic per-entry pages.
- `src/components/recipe/` — Svelte islands for the per-recipe interactive panel (substitution switcher, macro bar, contribution donut, micronutrient radar).
- `src/components/compare/` — sortable table + scatter chart across all recipes.
- Astro config sets `base: '/recipes'` (overridable via `BASE_PATH` env var that GitHub Pages CI sets). When linking internally, respect that base — Playwright tests hit `/recipes/...`.

## Authoring recipes and ingredients

To add a recipe that uses a new ingredient, **add the ingredient YAML first**, then reference it in the recipe — otherwise `pnpm validate` and the build will fail on the broken reference. If you introduce a new specialty term (brand, technique, plant name) into prose or ingredient names, add it to `.cspell/cooking.txt` or `pnpm lint:prose` will fail.

When editing a recipe's structured slots: a unit used in a `quantity` must exist either as `g`/`gram`/`grams` (built-in) or as a key in the ingredient's `units` map. Add missing units to the ingredient file rather than rewriting the recipe.

## Testing

- **Vitest** (`tests/unit/`) covers the nutrition library and payload computation. Keep the math pure and unit-test it directly.
- **Playwright** (`tests/e2e/`) runs against the built site via `pnpm preview` on port 4322. It expects the `/recipes/` base path.
- E2E suite covers a11y (axe), navigation, recipe interactivity, compare table sorting, and Pagefind search.

## Notes

- Branded `IngredientId` / `RecipeId` types in `content.config.ts` mean ingredient and recipe IDs are not interchangeable at the type level — don't widen them to `string` in new APIs.
- `astro:content` types are generated into `.astro/`; if types look wrong after a content edit, `pnpm typecheck` regenerates them.
- The deploy branch is `main`; CI on every non-main branch runs the full lint/typecheck/validate/build/test pipeline.
