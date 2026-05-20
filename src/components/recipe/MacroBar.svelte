<script lang="ts">
  import type { Nutrients } from '../../lib/nutrition/types.ts';

  type Props = { nutrients: Nutrients };
  let { nutrients }: Props = $props();

  // Atwater factors: 4 cal/g for protein and carbs, 9 cal/g for fat.
  const breakdown = $derived.by(() => {
    const protein = (nutrients.protein ?? 0) * 4;
    const carbs = (nutrients.carbohydrate ?? 0) * 4;
    const fat = (nutrients.fat ?? 0) * 9;
    const total = protein + carbs + fat;
    if (total === 0) return null;
    return {
      protein: { calories: protein, pct: (protein / total) * 100 },
      carbs: { calories: carbs, pct: (carbs / total) * 100 },
      fat: { calories: fat, pct: (fat / total) * 100 },
      total,
    };
  });
</script>

{#if breakdown}
  <figure class="macro-bar ui" data-testid="macro-bar">
    <figcaption>Calorie breakdown</figcaption>
    <div
      class="bar"
      role="img"
      aria-label={`Calories from protein ${breakdown.protein.pct.toFixed(0)}%, carbs ${breakdown.carbs.pct.toFixed(0)}%, fat ${breakdown.fat.pct.toFixed(0)}%`}
    >
      <span class="seg seg-protein" style:width={`${breakdown.protein.pct}%`}></span>
      <span class="seg seg-carbs" style:width={`${breakdown.carbs.pct}%`}></span>
      <span class="seg seg-fat" style:width={`${breakdown.fat.pct}%`}></span>
    </div>
    <dl class="legend">
      <div>
        <dt><span class="swatch seg-protein"></span>Protein</dt>
        <dd>{breakdown.protein.pct.toFixed(0)}%</dd>
      </div>
      <div>
        <dt><span class="swatch seg-carbs"></span>Carbs</dt>
        <dd>{breakdown.carbs.pct.toFixed(0)}%</dd>
      </div>
      <div>
        <dt><span class="swatch seg-fat"></span>Fat</dt>
        <dd>{breakdown.fat.pct.toFixed(0)}%</dd>
      </div>
    </dl>
  </figure>
{/if}

<style>
  .macro-bar {
    margin: 0;
    background: var(--color-card);
    border: 1px solid var(--color-rule);
    border-radius: 4px;
    padding: 1.25rem 1.5rem;
  }
  figcaption {
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-muted);
    font-weight: 600;
    margin-bottom: 0.75rem;
  }
  .bar {
    display: flex;
    width: 100%;
    height: 14px;
    border-radius: 3px;
    overflow: hidden;
    background: var(--color-rule);
  }
  .seg {
    display: block;
    height: 100%;
    transition: width 250ms ease;
  }
  .seg-protein {
    background: var(--color-accent);
  }
  .seg-carbs {
    background: #c8a464;
  }
  .seg-fat {
    background: #6b8b5d;
  }
  .legend {
    margin: 0.75rem 0 0;
    display: grid;
    gap: 0.2rem;
    font-size: 0.85rem;
  }
  .legend > div {
    display: flex;
    justify-content: space-between;
  }
  dt {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 400;
  }
  dd {
    margin: 0;
    font-variant-numeric: tabular-nums;
    font-weight: 600;
  }
  .swatch {
    display: inline-block;
    width: 0.7rem;
    height: 0.7rem;
    border-radius: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    .seg {
      transition: none;
    }
  }
</style>
