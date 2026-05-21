<script lang="ts">
  import type { ComputedNutrition } from '../../lib/nutrition/types.ts';

  type Props = { nutrition: ComputedNutrition; serving?: string | undefined };
  let { nutrition, serving }: Props = $props();

  let display = $derived(nutrition.perServing ?? nutrition.total);
  let heading = $derived(
    nutrition.perServing
      ? `Per serving (${serving ?? 'estimated'})`
      : 'Total (no serving size set)',
  );

  function fmt(n: number | undefined): string {
    if (n === undefined) return '—';
    return n.toFixed(n < 10 ? 1 : 0);
  }
</script>

<aside class="nutrition-card ui" data-testid="nutrition-panel">
  <h3>{heading}</h3>
  <dl>
    <div>
      <dt>Calories</dt>
      <dd data-testid="nutr-calories">{fmt(display.calories)}</dd>
    </div>
    <div>
      <dt>Protein</dt>
      <dd data-testid="nutr-protein">{fmt(display.protein)} g</dd>
    </div>
    <div>
      <dt>Carbs</dt>
      <dd>{fmt(display.carbohydrate)} g</dd>
    </div>
    <div>
      <dt>Net carbs</dt>
      <dd>{fmt(display.net_carbs)} g</dd>
    </div>
    <div>
      <dt>Fat</dt>
      <dd>{fmt(display.fat)} g</dd>
    </div>
    <div>
      <dt>Fiber</dt>
      <dd>{fmt(display.fiber)} g</dd>
    </div>
    <div>
      <dt>Sodium</dt>
      <dd>{fmt(display.sodium_mg)} mg</dd>
    </div>
  </dl>
  <p class="footnote muted">
    Computed live from the ingredient library. Brand-dependent and approximate.
  </p>
</aside>

<style>
  .nutrition-card {
    background: var(--color-card);
    border: 1px solid var(--color-rule);
    border-radius: 0;
    padding: 1.1rem 1.25rem;
    box-shadow: inset 0 1px 0 rgb(255 255 255 / 4%);
    font-family: var(--font-mono);
    position: relative;
  }
  .nutrition-card::before {
    content: 'NTR / PANEL';
    position: absolute;
    top: -0.6rem;
    left: 1rem;
    background: var(--color-bg);
    padding: 0 0.4rem;
    font-size: 0.65rem;
    letter-spacing: 0.14em;
    color: var(--color-accent);
  }
  h3 {
    margin-block: 0 0.75rem;
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--color-steel-300);
    font-weight: 600;
    border-bottom: 1px solid var(--color-rule);
    padding-bottom: 0.5rem;
  }
  dl {
    margin: 0;
    display: grid;
    gap: 0.25rem 1rem;
  }
  dl > div {
    display: flex;
    justify-content: space-between;
    border-bottom: 1px solid var(--color-rule);
    padding: 0.35rem 0;
  }
  dl > div:last-of-type {
    border-bottom: 0;
  }
  dd {
    margin: 0;
    font-variant-numeric: tabular-nums;
    font-weight: 600;
  }
  .footnote {
    font-size: 0.75rem;
    margin-block: 1rem 0;
    line-height: 1.4;
  }
</style>
