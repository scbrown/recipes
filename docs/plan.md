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
| Package manager | **pnpm** | Fastest install, disk-efficient via content-addressable store, deterministic lockfile. Node version pinned via `.nvmrc`. |
| Data format | **YAML** for ingredients, **Markdown + YAML frontmatter** for recipes | Human-editable, diff-friendly, easy for contributors. |
| Schema validation | **Zod** via Astro Content Collections | Single source of truth for shape of ingredients and recipes; types flow to templates and tests. |
| Styling | **Tailwind CSS** + a small set of CSS custom properties for design tokens | Fast iteration, well-supported in Astro, kills the cascade-debugging tax. Tokens for colors/spacing keep theming centralized. |
| Interactive islands | **Svelte** | Tiny runtime, excellent reactivity for substitution/variant switchers and chart updates. Used only where interactivity is needed. |
| Charts | **Chart.js** (with `svelte-chartjs`) | Lightweight, declarative, no framework lock-in. Observable Plot considered for the comparison page if statistical visuals get richer. |
| Images | **Astro `<Image>`** (sharp under the hood) | Built-in responsive srcsets, WebP/AVIF, lazy loading, no extra service. |
| Icons | **Lucide** via `lucide-svelte`/Astro integration | Clean, consistent, tree-shakeable. |
| Typography | **Inter** (UI/tables) + **Source Serif 4** (body) self-hosted via `@fontsource` | Free, readable in kitchen lighting, no Google Fonts request. |
| Search | **Pagefind** | Static-friendly full-text search with tag/facet filtering; runs as a postbuild step. |
| Hosting | **GitHub Pages** | Free, integrates with the existing repo. Cloudflare Pages noted as a future option if we want PR preview deploys. |
| CI/CD | **GitHub Actions** | Build, validate, test, and deploy from the same place the code lives. |
| Linting/formatting | **ESLint** + **Prettier** + `astro-eslint-parser` | Catches obvious bugs and keeps diffs clean. |
| Type-checking | **TypeScript strict** + `astro check` | Catches schema misuse at build time. |

## Hosting & deployment

### Target

GitHub Pages, custom domain optional later. Static build output served from the `gh-pages` branch (or via Actions artifact, depending on the official Astro action's mode).

### CI/CD workflows

Three GitHub Actions workflows under `.github/workflows/`:

1. **`ci.yml`** — runs on every PR and on pushes to non-main branches:
   - `pnpm install --frozen-lockfile`
   - `pnpm lint` (ESLint + Prettier check)
   - `pnpm typecheck` (`astro check`)
   - `pnpm test:unit` (Vitest)
   - `pnpm build` (must succeed, including content schema validation)
   - `pnpm test:e2e` (Playwright against `astro preview`)
   - `pnpm test:a11y` (axe scan)
   - Upload Playwright report and screenshot diffs as artifacts on failure.

2. **`deploy.yml`** — runs on push to `main`:
   - Rebuilds, runs Pagefind to generate search index, deploys to GitHub Pages via the official `actions/deploy-pages` action.
   - Tagged with the commit SHA in the deploy summary.

3. **`lighthouse.yml`** — runs nightly and on label `perf-check`:
   - Lighthouse CI against the live site
   - Thresholds: performance ≥ 90, accessibility ≥ 95, best practices ≥ 90, SEO ≥ 95
   - Fails if any threshold drops more than 5 points week over week.

### Branch policy

- `main` is the deploy branch. Direct pushes allowed but discouraged; PRs preferred so CI runs.
- Branch protection (when configured in GitHub): require status checks (`ci.yml`) to pass before merge.
- Feature branches named `feat/...`, `fix/...`, `docs/...`.

### Preview deploys

GitHub Pages doesn't natively offer per-PR previews. Workable approaches:

- **Artifact-based** — `ci.yml` uploads the built site as an artifact; reviewers download and serve locally. Simple, no extra service.
- **Cloudflare Pages mirror** — connect the same repo to Cloudflare Pages purely for PR previews while keeping production on GitHub Pages. No cost, no domain change. Recommended once PR volume justifies it.

### Dependency hygiene

- **Renovate** or Dependabot configured for weekly minor/patch PRs, monthly major.
- pnpm overrides documented in `pnpm-workspace.yaml` if we ever pin a transitive dep.

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

## Authoring workflow

### Adding an ingredient

1. Look up nutrition: USDA FoodData Central (free JSON API) for whole foods, Open Food Facts for branded products, Cronometer for specialty items.
2. Create `data/ingredients/<id>.yaml` from the template:
   ```bash
   pnpm new:ingredient <id>
   ```
   The scaffolder prompts for required fields and writes a stub with `TODO` markers for nutrition values.
3. Fill in `nutrition_per_100g` (calories required; macros strongly encouraged; micros optional).
4. List units that recipes commonly use (`tbsp`, `cup`, `scoop`, `g`).
5. Add `sources` so the number is auditable later.
6. `pnpm validate` confirms the schema is satisfied.

### Adding a recipe

1. Scaffold: `pnpm new:recipe <id>`. Generates a markdown file with the full frontmatter template and a `TODO` instruction body.
2. Reference ingredients by `id`. Build fails if any `id` doesn't resolve.
3. Define preparation variants (`variants[]`) — required for recipes that yield multiple serving styles.
4. Optionally define flavor variants (`flavors[]`).
5. Optionally declare substitution slots within `ingredients[]`.
6. Write prose body in markdown — instructions, technique notes, tips.
7. Add a hero image to `src/assets/recipes/<id>/hero.{jpg,webp}` (optional but encouraged).
8. `pnpm dev` for live preview. `pnpm validate` for schema-only check.

### Helper scripts under `scripts/`

| Script | Purpose |
|---|---|
| `new-ingredient.mjs` | Interactive prompt → writes a stub ingredient YAML |
| `new-recipe.mjs` | Interactive prompt → writes a stub recipe markdown |
| `validate.mjs` | Resolves all references, checks unit conversions exist, flags orphan ingredients. Runs in CI. |
| `seed-from-usda.mjs` | Pulls a list of FDC IDs from a CSV and emits ingredient YAML stubs |
| `compute-nutrition.mjs` | Pure function library (also called from Astro at build time) — used by tests too |

### Pre-commit

`lint-staged` + `husky`:
- Prettier on staged files
- ESLint on staged JS/TS
- `validate.mjs` if any `data/ingredients/**` or `recipes/**` changed

### Contributor guide

`CONTRIBUTING.md` will document the above workflow plus:
- License expectations (contributions are CC BY 4.0)
- Recipe writing style (units, voice, when to include grams vs volume)
- Photo requirements (alt text, min resolution, licensing)
- PR template with a checklist

## Images

### Storage

- **Phase 1 (now):** in-repo at `src/assets/recipes/<recipe-id>/`. Versioned alongside the recipe.
- **Phase 4+ (if repo bloats past ~100 MB or photo volume grows):** evaluate **Cloudflare Images**, **ImageKit**, or **git LFS**. The data model already keeps image references in frontmatter, so a swap is mechanical.

### Format and sizing

- Source: ≥ 1600 px wide JPG/HEIC straight from camera/phone, committed as-is.
- Output: Astro `<Image>` generates WebP + AVIF + JPG fallback, plus responsive widths (320 / 640 / 1024 / 1600).
- Hero: 16:9 or 4:3, used in recipe header and as the OG/Twitter card.
- Step photos: optional, 1:1 or 4:3.
- Lazy loading by default; eager loading for the hero only.

### Naming convention

```
src/assets/recipes/<recipe-id>/
  hero.jpg             # required if any image is present
  step-01.jpg          # optional process shots
  step-02.jpg
  variant-<id>.jpg     # optional, for variant-specific imagery
```

### Frontmatter

```yaml
images:
  hero:
    src: hero.jpg
    alt: "Stack of pancakes drizzled with nougat filling, top-down view."
    credit: "Photo by <name>"     # optional
  steps:
    - src: step-01.jpg
      alt: "..."
      after_step: 2               # optional — places photo after instruction step N
```

### Placeholder strategy

Recipes without photos render a deterministic placeholder card: recipe initials over a tag-derived accent color. Recipes are publishable without photos.

### Accessibility

- Alt text required by schema for every image (Zod rejects missing `alt`).
- Decorative-only images must use `alt: ""` explicitly; the schema accepts empty strings.

## Look and feel

### Direction

Clean editorial with quiet modernist accents. The site is for reading recipes in a kitchen, comparing ratios, and skimming nutrition data — not a magazine spread. Photography is welcome but not load-bearing.

### Design tokens

Defined as CSS custom properties at `:root`, consumed by Tailwind via `theme.extend`:

```
--color-bg            #fdfcf8  (warm off-white)
--color-fg            #1f1d1a  (near-black, warm)
--color-muted         #6b675f
--color-accent        #8b2a1f  (deep brick — used sparingly, for active states and highlights)
--color-rule          #e7e3d8

--font-body           "Source Serif 4", Georgia, serif
--font-ui             "Inter", system-ui, sans-serif
--font-mono           "JetBrains Mono", ui-monospace, monospace

--measure             64ch        (max line length for prose)
--radius              4px
--shadow-card         0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)
```

### Layout

- Single-column reading layout for recipe pages (max `--measure`), with a sticky right rail for nutrition / variant picker on wide screens.
- Comparison page is full-width: table fills horizontally with sticky header + first column.
- Mobile-first: nutrition card collapses below ingredients; variant picker becomes a top sheet.
- Generous vertical rhythm; section dividers via thin rules rather than heavy boxes.

### Typography rules

- Recipe body: serif at 18–19 px, line-height 1.55, max measure 64 ch.
- Ingredient lists and tables: sans-serif, tabular numerals enabled (`font-variant-numeric: tabular-nums`).
- Quantities and ratios: monospace inline (`<code>` styled) so `1.5 cups` and `4 g` align visually.
- Headings: serif, modest scale (1.25× geometric progression).

### Interactive widgets

Substitution and variant pickers feel like clean form controls, not decorative chips:
- Radio-group semantics under the hood.
- Currently selected option visually emphasized; alternatives clearly tappable.
- Nutrition card animates value changes with a 200 ms tween (no layout shift).

### Dark mode

Phase 6. Tokens are already structured to swap palettes; we just need to wire `prefers-color-scheme` and a manual toggle.

### Accessibility targets

- WCAG 2.1 AA across the site.
- All text contrast ≥ 4.5:1 (≥ 3:1 for large text).
- Focus rings visible and consistent.
- All interactive widgets keyboard-operable.
- `prefers-reduced-motion` respected for chart transitions and value tweens.

## Testing strategy

A static site with a small computation core. The test pyramid skews toward schema validation and end-to-end interaction tests, with a thin unit-test layer for the math.

### Layer 1 — Schema validation (build-time)

The most important layer. Astro Content Collections + Zod schemas mean:

- Every ingredient and recipe is type-checked at build.
- Broken ingredient references fail the build.
- Missing required fields (`alt` on images, `calories` on ingredients, etc.) fail the build.
- Schema is the single source of truth used by both build and tests.

Custom validators in `scripts/validate.mjs` extend this with cross-file checks:

- Every `role` referenced in a substitution slot exists on at least one ingredient.
- Every unit used in a recipe quantity has a conversion entry on the ingredient.
- No orphan ingredients (warned, not failed).
- Allulose-style "0-cal" sweeteners flagged so the convention is consistent across recipes.

### Layer 2 — Unit tests (Vitest)

Targeted at the computation core in `src/lib/nutrition/`:

- `resolveQuantity(ingredient, quantity)` → grams
- `computeRecipeNutrition(recipe, selections)` → per-serving totals + per-ingredient breakdown
- `applyFlavors(base, flavors)` → merged ingredient list
- Edge cases: pinch (0 g), implicit defaults, alternative-with-density-adjustment, missing optional micros propagate as `undefined` (not 0).
- Fast: full unit suite under 1 s, runs on every commit and in CI.

### Layer 3 — Component tests (Vitest + Svelte testing)

The interactive widgets:

- Substitution switcher: changing selection updates the nutrition card with the right numbers (drives a deterministic snapshot of the JSON state).
- Variant picker: changing variant swaps the ingredient list and recomputes.
- Sort controls on the compare table: clicking a header sorts correctly, asc/desc, sticky first column.
- Charts: assert they receive the correct data prop (skip rendering canvas; that's covered in Playwright).

### Layer 4 — End-to-end (Playwright)

Run against `astro preview` (or `astro dev` locally). Projects:

- `chromium-desktop` (1280×800)
- `chromium-mobile` (iPhone 13)
- `webkit-desktop`
- `firefox-desktop`

Test suites under `tests/e2e/`:

| Spec | Covers |
|---|---|
| `home.spec.ts` | Tag cloud renders, recent recipes link out |
| `recipe-page.spec.ts` | All four seed recipes load; substitution swap visibly updates calories and protein; variant picker changes ingredient list |
| `compare.spec.ts` | Sort by protein-per-cal, filter by tag `high-protein`, table reflects expected rows |
| `search.spec.ts` | Pagefind returns expected recipes for keyword and tag queries |
| `navigation.spec.ts` | Header links, breadcrumbs, 404 page |
| `print.spec.ts` | Print stylesheet renders one recipe per page, hides nav |
| `mobile.spec.ts` | Mobile nav drawer, variant picker as bottom sheet, table horizontal scroll |

Configuration notes:

- Playwright browsers cached between Actions runs via `actions/cache`.
- Tests run against the built static output (`pnpm build && pnpm preview`), matching production.
- Trace + video captured on failure and uploaded as artifact.

### Layer 5 — Visual regression (Playwright screenshots)

Snapshot key pages at desktop + mobile widths:

- Home, recipe page (one canonical recipe), compare page, ingredient page.
- Stored as PNGs in `tests/e2e/__snapshots__/`.
- Updated intentionally with `pnpm test:e2e:update-snapshots` and reviewed in the PR.
- Catches unintended layout/style regressions cheaply.

### Layer 6 — Accessibility (axe + Playwright)

`@axe-core/playwright` runs against every page hit by the e2e suite:

- Severity ≥ "serious" fails the build.
- Color contrast, ARIA validity, heading order, image alts, label/control association.
- Keyboard navigation tests live in the relevant spec (e.g. substitution switcher in `recipe-page.spec.ts`).

### Layer 7 — Performance (Lighthouse CI)

In a separate workflow against the deployed site:

- Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 90, SEO ≥ 95.
- Page weight budgets: JS ≤ 80 KB on recipe pages, ≤ 150 KB on compare page (chart-heavy).
- Tracked over time so regressions surface as a trend, not just a fail/pass.

### Test data strategy

The site is small enough that **the real content is the test corpus**. No fake fixtures.

One synthetic recipe lives at `recipes/__fixtures/all-features.md`, excluded from the production build (`draft: true` in frontmatter), used to exercise every edge: three substitution slots, two preparation variants, two flavor variants, recipe-without-photos placeholder, ingredient missing optional micros.

### What we will not test

- Underlying library behavior (Astro, Chart.js, Pagefind) — trust those.
- The nutrition numbers themselves — those are content, not code. Methodology is documented in `/about`.
- Visual identity choices — design system is a deliberate decision, not a regression to guard.

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

### Phase 1 — Foundation (data + rendering + deploy pipeline)
- Astro project scaffolded with TypeScript, Tailwind, Svelte islands, pnpm
- ESLint, Prettier, Husky pre-commit
- Ingredient + recipe Zod schemas via Content Collections
- 20–30 seed ingredients covering the existing 4 recipes
- Convert existing 4 recipes to the structured format
- Per-recipe page renders ingredients, instructions, hero image (or placeholder)
- Design tokens defined; typography and color baseline in place
- `ci.yml` runs lint, typecheck, build, unit tests
- `deploy.yml` ships `main` to GitHub Pages
- Vitest unit tests for unit conversion and ingredient resolution

### Phase 2 — Macro nutrition + interactive switchers
- Macro fields populated for all seed ingredients (calories, protein, carbs, fat, fiber, net carbs, sodium)
- Build-time nutrition computation joins ingredients → recipe → variant
- Per-recipe macro card with active variant selected by default
- Svelte islands for substitution and variant switchers (client-side recomputation)
- Vitest tests for `computeRecipeNutrition` covering substitution and flavor stacking
- First Playwright suite: `recipe-page.spec.ts` (load, switch, recompute) on chromium-desktop + mobile

### Phase 3 — Comparison view + search
- `/compare` page with sortable table across all recipes
- Tag-based filtering, sticky header and first column
- One scatter chart (protein-per-calorie)
- Pagefind index built in CI; `/search` route
- Playwright suites: `compare.spec.ts`, `search.spec.ts`, `navigation.spec.ts`
- Visual regression snapshots for home, recipe, compare

### Phase 4 — Charts + a11y hardening
- Stacked-bar macro chart per recipe
- Per-ingredient contribution donut
- Comparison-page stacked bar across recipes
- `@axe-core/playwright` integrated; serious violations fail CI
- Keyboard-navigation tests for switchers and chart legends
- `prefers-reduced-motion` respected for chart and value transitions

### Phase 5 — Micronutrients
- Extend ingredient schema with micros (B12, iron, calcium, magnesium, potassium, zinc, vitamin D, fiber, sodium)
- Backfill seed ingredients via USDA FDC where possible
- Radar chart on recipe pages
- Micronutrient columns in the compare table
- Lighthouse CI workflow with weekly trend tracking

### Phase 6 — Polish + contribution flow
- Print stylesheet (one recipe per page, no chrome) + `print.spec.ts`
- Dark mode toggle
- `CONTRIBUTING.md`, PR template, recipe and ingredient scaffolder scripts (`pnpm new:recipe`, `pnpm new:ingredient`)
- Per-ingredient pages with reverse lookup ("what uses this?")
- Decision point: stay on GitHub Pages or move PR previews to Cloudflare Pages

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
