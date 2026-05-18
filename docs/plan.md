# Recipe Site Plan

## Goals

1. **Composable recipes** — recipes are built from a shared ingredient library; adding a new recipe means picking ingredients off the shelf, not retyping nutrition data.
2. **Substitutable ingredients** — within a recipe, an ingredient can have alternatives that play the same role (whey ↔ pea protein, allulose ↔ erythritol). Switching alternative recomputes the nutrition.
3. **Flavor variants** — additive variants layer extra ingredients onto a base recipe (cake batter, malted, vanilla cream) without duplicating the base.
4. **Nutrition display** — per-recipe macro panel, per-ingredient breakdown, and a cross-recipe comparison view with sortable tables and charts.
5. **Extensible data model** — adding micronutrients later means adding fields to ingredient files, not editing recipes.
6. **Shareable** — static site, free hosting (GitHub Pages), printable per-recipe view.

## Non-goals

- Meal planning, shopping lists, calendar integration.
- User accounts, comments, ratings.
- A mobile app.
- Automatic ingredient parsing from natural-language recipes (we author structured data directly).

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Generator | **Astro** with Content Collections | Schema validation catches typos and broken references at build time; MDX lets us embed charts in recipes; static output deploys anywhere. |
| Data format | **YAML** for ingredients, **Markdown + YAML frontmatter** for recipes | Human-editable, diff-friendly, easy for contributors. |
| Charts | **Chart.js** (or Observable Plot) | Lightweight, declarative, no framework lock-in. |
| Hosting | **GitHub Pages** | Free, integrates with the existing repo. |
| Search | **Pagefind** | Static-friendly full-text search with tag/facet filtering. |

## Data model

### Ingredient

One file per ingredient under `data/ingredients/`:

```yaml
# data/ingredients/whey-isolate.yaml
id: whey-isolate
name: Whey Protein Isolate
brand_assumption: "Generic 90% isolate"   # optional, for transparency
roles: [protein]                          # used for substitution matching

units:                                    # how to convert this ingredient to grams
  scoop: 30
  tbsp: 7
  cup: 112

nutrition_per_100g:
  calories: 380
  protein: 90
  carbohydrate: 4
  fat: 1
  fiber: 0
  net_carbs: 4
  sodium_mg: 200
  # micronutrients — optional, add later as needed
  calcium_mg: 150
  vitamin_b12_ug: 1.2

notes: "Brand-dependent; nutrition assumes 90% protein by weight."
sources:
  - "USDA FoodData Central #173420"
```

Required fields: `id`, `name`, `roles`, `units` (at least one), `nutrition_per_100g.calories`.
Everything else is optional, validated against the schema, and added incrementally.

### Recipe

```yaml
# recipes/crepes-pancakes-nougat.md
---
id: crepes-pancakes-nougat
title: Master Crepe, Pancake, and Nougat Mix
tags: [breakfast, high-protein, master-mix]
yields: "6 cups dry mix"

# Base ingredients — used by all variants
ingredients:
  - id: ap-flour
    quantity: { amount: 6, unit: cup }

  - role: protein                                  # substitutable slot
    quantity: { amount: 1, unit: cup }
    default: whey-isolate
    alternatives:
      - id: pea-protein
        quantity: { amount: 1.1, unit: cup }       # density adjustment
      - id: casein
        quantity: { amount: 1, unit: cup }

  - id: potato-starch
    quantity: { amount: 1, unit: cup }
  # ...

# Variants describe how the mix is prepared into servings
variants:
  - id: pancake
    name: Pancake
    serving: "1 pancake (~80 g batter)"
    yields_servings: 12
    additions:
      - id: water
        quantity: { amount: 1, unit: cup }
      - id: butter
        quantity: { amount: 2, unit: tbsp }
      - id: baking-powder
        quantity: { amount: 2, unit: tsp }

  - id: crepe
    name: Crepe
    serving: "1 crepe (~60 g batter)"
    yields_servings: 18
    additions:
      - id: water
        quantity: { amount: 1.25, unit: cup }
      - id: butter
        quantity: { amount: 2, unit: tbsp }

# Flavor variants stack on top of a preparation variant
flavors:
  - id: cake-batter
    name: Cake Batter
    additions:
      - id: butter-extract
        quantity: { amount: 0.5, unit: tsp }
      - id: citric-acid
        quantity: { pinch: true }

  - id: malted
    name: Malted Morning
    additions:
      - id: malted-milk-powder
        quantity: { amount: 1, unit: tbsp }
---

Body of the recipe in Markdown — prose instructions, technique notes, tips.
```

### Three orthogonal axes of variation

1. **Substitutions** (within `ingredients[].alternatives`) — same role, different ingredient, no flavor change. User-selected at view time.
2. **Preparation variants** (`variants[]`) — different ways to use the same base (pancake vs crepe).
3. **Flavor variants** (`flavors[]`) — additive overlays on a preparation variant.

A served portion = (base ingredients) + (one preparation variant) + (zero or more flavor variants), all reconciled by ingredient slots.

## Computation pipeline

Build-time, written once in TypeScript inside Astro:

1. **Load** all ingredient YAML files into a typed registry.
2. **Validate** every recipe references real ingredient IDs and has all required slots filled.
3. **Resolve quantities to grams** using each ingredient's `units` table.
4. **Compute** totals per recipe × preparation variant × flavor combination:
   - Sum nutrient totals across ingredients
   - Divide by `yields_servings` for per-serving values
   - Compute derived fields (calories from protein, % daily value, etc.)
5. **Emit** a JSON blob per recipe page so client-side JS can recompute on substitution swaps without a rebuild.

Output is consumed by:
- Per-recipe page (nutrition card + ingredient breakdown chart)
- Comparison page (table + scatter/bar charts across all recipes)
- Search index (Pagefind)

## Site structure

```
/                       Home: tag cloud + recent recipes
/recipes/               Index, filterable by tag/role
/recipes/<id>           Recipe page with interactive substitution + nutrition panel
/compare                Sortable table + charts across all recipes
/ingredients/           Browse the ingredient library
/ingredients/<id>       Per-ingredient page: nutrition + recipes that use it
/about                  License, contribution guide, methodology
```

## Charts (initial set)

| Chart | Where | What it shows |
|---|---|---|
| Stacked bar | Recipe page | Calories from protein / carbs / fat for the selected variant |
| Donut | Recipe page | Per-ingredient contribution to selected nutrient (e.g. "where's the protein from?") |
| Sortable table | Compare page | All recipes × all nutrients |
| Scatter | Compare page | Protein-per-calorie vs total calories |
| Radar | Recipe page (Phase 5) | Micronutrient coverage vs RDA |

## Phases

Each phase is shippable on its own. Stop wherever the value caps out.

### Phase 1 — Foundation (data + rendering)
- Astro project scaffolded on the repo
- Ingredient schema + 20–30 seed ingredients covering the existing 4 recipes
- Recipe schema with substitution slots, variants, flavors
- Convert existing 4 recipes to the structured format
- Per-recipe page renders ingredients, instructions, and a placeholder nutrition card
- Build passes schema validation

### Phase 2 — Macro nutrition
- Macro fields populated for all seed ingredients (calories, protein, carbs, fat, fiber, net carbs, sodium)
- Compute step joins ingredients → recipe → variant
- Per-recipe macro card with the active variant selected by default
- Interactive variant + substitution switcher (client-side recomputation)

### Phase 3 — Comparison view
- `/compare` page with sortable table across all recipes
- Tag-based filtering
- One scatter chart (protein-per-calorie)
- Deployed to GitHub Pages

### Phase 4 — Charts
- Stacked-bar macro chart per recipe
- Per-ingredient contribution donut
- Comparison-page stacked bar across recipes

### Phase 5 — Micronutrients
- Extend ingredient schema with the micros that matter to you (likely: B12, iron, calcium, magnesium, potassium, zinc, vitamin D, fiber, sodium)
- Backfill seed ingredients
- Radar chart on recipe pages
- Micronutrient columns in the compare table

### Phase 6 — Polish
- Pagefind search with tag facets
- Print stylesheet (one recipe per page, no chrome)
- Contributor guide and PR template
- Per-ingredient pages with reverse lookup ("what uses this?")

## Open questions

1. **Serving size definition for components.** The fluid gel and agar pearls aren't standalone foods. Default: 2 tbsp / 1 tbsp respectively, with a note explaining the assumption. Do you want a "typical application" field per component recipe instead?
2. **Brand specificity.** PB2, whey isolate, etc. shift nutrition ~10–20% between brands. Plan is to pick one representative per ingredient and document the assumption. Acceptable?
3. **Allulose calorie accounting.** US labeling counts it as 0 cal, but it has ~0.4 cal/g actual metabolic energy. Pick a convention (likely 0 cal/g to match labels) and document it.
4. **Substitution UI default.** When a recipe has a substitutable slot, what's shown by default? Proposal: `default` value from the slot, with a switcher inline.
5. **Versioned recipes.** Do you want historical versions browsable (V1 vs V2 of a recipe in the compare table)? Or does git history suffice? Proposal: git only, with optional `supersedes` frontmatter that hides archived files from the index.
6. **Ingredient sourcing.** Seed from USDA FoodData Central (free, JSON) where possible; manual entry from Cronometer for specialty items. Acceptable starting point?

## Risks

- **Ingredient library quality is the bottleneck.** Nutrition numbers are only as good as the underlying data. Budget for documenting assumptions clearly so users can audit.
- **Schema churn.** Adding fields to ingredients later is easy; *renaming or restructuring* is painful once recipes reference IDs. Stabilize the ingredient schema before scaling up.
- **Combinatorial UI complexity.** A recipe with 3 substitutable slots × 3 variants × 4 flavors = 108 combinations. Don't pre-render them — compute client-side and surface the active combination cleanly.

## Decision: tech stack lock-in

If you agree with Astro + Chart.js, this plan is the implementation target. If you'd rather use Eleventy or Quarto, the data model and phases stay the same; only the generator and template language change.
