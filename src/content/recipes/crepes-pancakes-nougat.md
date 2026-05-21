---
title: Master Crepe and Pancake Mix
tags: [breakfast, high-protein, master-mix, modernist]
summary: A shelf-stable master mix that produces both pancakes and crepes from the same base, with flavor variants and a separate set of nougat fillings.
yields: '6 cups dry mix'

ingredients:
  - id: ap-flour
    quantity: { amount: 6, unit: cup }
  - id: potato-starch
    quantity: { amount: 1, unit: cup }
  - role: protein
    quantity: { amount: 1, unit: cup }
    default: whey-protein-isolate
    alternatives:
      - id: pea-protein-isolate
        quantity: { amount: 1.1, unit: cup }
        note: 'Pea isolate is less dense; scale up slightly to match protein content.'
      - id: casein-protein
        quantity: { amount: 1, unit: cup }
  - id: non-fat-dry-milk
    quantity: { amount: 1.5, unit: cup }
  - role: sweetener
    quantity: { amount: 0.5, unit: cup }
    default: allulose
    alternatives:
      - id: brown-sugar
        quantity: { amount: 0.5, unit: cup }
  - id: mct-powder
    quantity: { amount: 0.25, unit: cup }
  - id: salt
    quantity: { amount: 2, unit: tsp }
  - id: xanthan-gum
    quantity: { amount: 0.5, unit: tsp }

variants:
  - id: pancake
    name: Pancake
    serving: '1 pancake (~80 g batter)'
    yields_servings: 12
    additions:
      - id: water
        quantity: { amount: 1, unit: cup }
      - id: butter
        quantity: { amount: 2, unit: tbsp }
      - id: baking-powder
        quantity: { amount: 2, unit: tsp }
      - id: baking-soda
        quantity: { amount: 0.5, unit: tsp }
  - id: crepe
    name: Crepe
    serving: '1 crepe (~60 g batter)'
    yields_servings: 18
    additions:
      - id: water
        quantity: { amount: 1.25, unit: cup }
      - id: butter
        quantity: { amount: 2, unit: tbsp }
      - id: egg-powder
        quantity: { amount: 2, unit: tbsp }

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
  - id: vanilla-cream
    name: Vanilla Cream
    additions:
      - id: vanilla-extract
        quantity: { amount: 0.5, unit: tsp }
---

The master mix below is shelf-stable and yields both pancakes and crepes from
the same base. Choose a preparation variant for the wet ingredients and
optionally stack a flavor variant on top.

## Technique notes

- **Anti-rubbery texture.** Do not overmix. Let the batter sit for 5 minutes so
  the potato starch and xanthan gum hydrate.
- **Consistency.** Crepe batter should be thin, close to water or very light cream.
- **Masking whey.** Adding 0.25 to 0.5 tsp vanilla extract to the wet ingredients
  covers the protein scent.

## Nougat fillings (optional)

The nougat fillings — dense-and-fudgy and quick-fluff styles, plus a fresh
peanut-butter or yogurt variant — live in their own recipe with full nutrition:
[Crepe Nougat Fillings](/recipes/nougat-fillings).
