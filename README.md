# Recipes

A small collection of recipes focused on functional ingredients, modernist
techniques, and high-protein formulations. Built as a static site with a shared
ingredient library, substitutable slots, flavor variants, and nutrition
computed at build time.

The deployed site is hosted on GitHub Pages from the `main` branch.

## Recipes in this collection

- [Master Crepe and Pancake Mix](src/content/recipes/crepes-pancakes-nougat.md)
- [Crepe Nougat Fillings](src/content/recipes/nougat-fillings.md)
- [Cranberry Fluid Gel Topper](src/content/recipes/cranberry-fluid-gel-topper.md)
- [Cranberry Agar Pearls](src/content/recipes/cranberry-agar-pearls.md)
- [Sparkling Cranberry Shrub](src/content/recipes/sparkling-cranberry-shrub.md)
- [Custom Breakfast Shake & Porridge Formulations](src/content/recipes/breakfast-powder-formulations.md)
- [Ultimate Morning Energy & Wellness Shot](src/content/recipes/morning-energy-shot.md)
- [Emulsified Extra-Hot Honey Garlic Wing Sauce](src/content/recipes/honey-garlic-wing-sauce.md)
- [American Yellow Mustard (French's & Annie's Copycat)](src/content/recipes/french-yellow-mustard.md)

## Repository layout

```text
src/
  content/
    ingredients/     # one YAML file per ingredient with nutrition per 100 g
    recipes/         # one Markdown file per recipe with structured frontmatter
  content.config.ts  # Zod schemas for ingredients and recipes
  lib/nutrition/     # pure nutrition computation library (unit-tested)
  pages/             # Astro pages
  layouts/           # Astro layouts
  components/        # Astro and Svelte components
  styles/            # global CSS and design tokens
tests/unit/          # Vitest unit tests for the nutrition library
scripts/             # validation helpers
docs/plan.md         # design document for the site
```

## Development

```bash
pnpm install
pnpm dev              # http://localhost:4321
pnpm build            # produce static site in dist/
pnpm test:unit        # Vitest
pnpm validate         # cross-file ingredient and recipe checks
pnpm lint             # eslint + stylelint + markdownlint + prettier --check
pnpm lint:prose       # cspell
pnpm typecheck        # astro check (TypeScript strict)
```

## Contributing

PRs welcome for new recipes, ingredient additions, technique notes, or photos.
Recipes are licensed under [CC BY 4.0](LICENSE).

A more detailed contributor guide and authoring scaffolders will land in a later
phase. For now: add a YAML ingredient to `src/content/ingredients/`, then a
Markdown recipe to `src/content/recipes/` with structured frontmatter — see the
existing recipes for the shape.
