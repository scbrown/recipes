---
title: Custom Breakfast Shake & Porridge Formulations
tags: [breakfast, high-protein, sugar-free, modernist]
summary: Low-GI, high-protein powdered breakfasts with a milk-like mouthfeel using water and espresso.

ingredients:
  - role: protein
    quantity: { amount: 1, unit: scoop }
    default: whey-protein-isolate
    alternatives:
      - id: pea-protein-isolate
        quantity: { amount: 1.1, unit: scoop }
      - id: casein-protein
        quantity: { amount: 1, unit: scoop }
  - id: misugaru
    quantity: { amount: 2, unit: tbsp }
  - id: creatine-monohydrate
    quantity: { amount: 1, unit: tsp }
  - id: banana-flower-powder
    quantity: { amount: 1, unit: tbsp }
  - id: salt
    quantity: { pinch: true }

variants:
  - id: travel-shake
    name: Toasted Espresso Travel Shake
    serving: '1 shake (10–12 oz)'
    yields_servings: 1
    additions:
      - id: egg-white-powder
        quantity: { amount: 1, unit: tbsp }
      - id: pb2
        quantity: { amount: 2, unit: tbsp }
      - id: mct-powder
        quantity: { amount: 1, unit: tbsp }
      - id: chia-seeds
        quantity: { amount: 1, unit: tbsp }
      - id: sunflower-lecithin
        quantity: { amount: 0.5, unit: tsp }
      - id: xanthan-gum
        quantity: { amount: 0.25, unit: tsp }
      - id: inulin
        quantity: { amount: 1, unit: tsp }
      - id: water
        quantity: { amount: 11, unit: oz }
  - id: drinkable-porridge
    name: Drinkable Porridge
    serving: '1 bowl'
    yields_servings: 1
    additions:
      - id: cream-of-rice
        quantity: { amount: 1.5, unit: tbsp }
      - id: mct-powder
        quantity: { amount: 1, unit: tbsp }
      - id: sunflower-lecithin
        quantity: { amount: 0.5, unit: tsp }
      - id: water
        quantity: { amount: 10, unit: oz }

flavors:
  - id: cake-batter
    name: Cake Batter
    additions:
      - id: butter-extract
        quantity: { amount: 0.25, unit: tsp }
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

Two preparations from a shared core: a travel shake optimized for portability
and a drinkable porridge with a heavier, meal-replacement consistency.

## Travel shake preparation

- **Dry blend.** Whisk all powders thoroughly. Use a blade grinder for the chia
  in short pulses to avoid heat.
- **Liquid.** Mix with 10 to 12 oz of water plus a fresh espresso shot.
- **Temperature note.** If using egg white powder, keep the liquid below 60°C
  to prevent partial cooking.

## Drinkable porridge preparation

- Heat water and espresso to 65°C.
- Whisk Cream of Rice, misugaru, and banana flower powder into the liquid first.
- Let sit in a thermal flask for 3 to 5 minutes to soften the rice.
- Add remaining protein and thickeners last to maintain smoothness.

## Flavor modification matrix

- **Cake batter.** Add butter extract and a pinch of citric acid.
- **Malted morning.** Add malted milk powder.
- **Vanilla cream.** Mix vanilla extract into the dry base blend.
