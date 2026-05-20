<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Chart, DoughnutController, ArcElement, Tooltip } from 'chart.js';
  import type { IngredientContribution, Nutrients } from '../../lib/nutrition/types.ts';
  import type { IngredientSummary } from '../../lib/recipe-payload.ts';

  type NutrientKey = 'protein' | 'carbohydrate' | 'fat' | 'fiber' | 'sodium_mg';

  type Props = {
    contributions: IngredientContribution[];
    library: Record<string, IngredientSummary>;
  };
  let { contributions, library }: Props = $props();

  let nutrient: NutrientKey = $state('protein');

  const PALETTE = [
    '#8b2a1f', // accent (brick)
    '#c8a464', // amber
    '#6b8b5d', // olive
    '#3f6b8b', // slate blue
    '#a37cae', // dusty lavender
    '#d68b5b', // terracotta
    '#7a7065', // taupe
    '#4f7a78', // teal
    '#b56c6c', // muted rose
    '#5d6b3f', // dark olive
  ];

  const NUTRIENT_LABEL: Record<NutrientKey, string> = {
    protein: 'Protein',
    carbohydrate: 'Carbs',
    fat: 'Fat',
    fiber: 'Fiber',
    sodium_mg: 'Sodium',
  };

  const UNIT: Record<NutrientKey, string> = {
    protein: 'g',
    carbohydrate: 'g',
    fat: 'g',
    fiber: 'g',
    sodium_mg: 'mg',
  };

  type Slice = { id: string; name: string; value: number };

  const slices = $derived.by<Slice[]>(() => {
    // Aggregate by ingredientId (a recipe can use the same ingredient in
    // multiple lines, e.g. butter for sauté vs finishing).
    const totals: Record<string, number> = {};
    for (const c of contributions) {
      const v = c.nutrients[nutrient as keyof Nutrients] ?? 0;
      if (v <= 0) continue;
      totals[c.ingredientId] = (totals[c.ingredientId] ?? 0) + v;
    }
    return Object.entries(totals)
      .map(([id, value]) => ({ id, name: library[id]?.name ?? id, value }))
      .sort((a, b) => b.value - a.value);
  });

  let canvas: HTMLCanvasElement | null = $state(null);
  let chart: Chart<'doughnut'> | null = null;
  let prefersReducedMotion = false;

  function buildData(s: Slice[]) {
    return {
      labels: s.map((x) => x.name),
      datasets: [
        {
          data: s.map((x) => Math.round(x.value * 10) / 10),
          backgroundColor: s.map((_, i) => PALETTE[i % PALETTE.length] ?? '#888'),
          borderColor: '#ffffff',
          borderWidth: 2,
        },
      ],
    };
  }

  onMount(() => {
    if (!canvas) return;
    if (typeof window !== 'undefined' && 'matchMedia' in window) {
      prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    Chart.register(DoughnutController, ArcElement, Tooltip);
    chart = new Chart(canvas, {
      type: 'doughnut',
      data: buildData(slices),
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '60%',
        animation: prefersReducedMotion ? false : { duration: 250 },
        plugins: {
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const v = ctx.parsed;
                return `${ctx.label}: ${String(v)} ${UNIT[nutrient]}`;
              },
            },
          },
        },
      },
    });
  });

  $effect(() => {
    if (chart) {
      chart.data = buildData(slices);
      chart.update();
    }
  });

  onDestroy(() => {
    chart?.destroy();
    chart = null;
  });

  const total = $derived(slices.reduce((sum, s) => sum + s.value, 0));
</script>

<section class="contribution-card ui" data-testid="contribution-donut">
  <header>
    <h3>Contribution by ingredient</h3>
    <label class="picker">
      <span class="sr-only">Nutrient</span>
      <select bind:value={nutrient} data-testid="contribution-nutrient">
        {#each Object.keys(NUTRIENT_LABEL) as key (key)}
          <option value={key}>{NUTRIENT_LABEL[key as NutrientKey]}</option>
        {/each}
      </select>
    </label>
  </header>

  {#if total > 0}
    <div class="chart-wrap">
      <canvas
        bind:this={canvas}
        aria-label={`${NUTRIENT_LABEL[nutrient]} contribution by ingredient`}
      ></canvas>
    </div>
    <ol class="ranked">
      {#each slices.slice(0, 6) as s, i (s.id)}
        <li>
          <span class="swatch" style:background={PALETTE[i % PALETTE.length]}></span>
          <span class="name">{s.name}</span>
          <span class="value mono">{s.value.toFixed(1)} {UNIT[nutrient]}</span>
        </li>
      {/each}
    </ol>
  {:else}
    <p class="muted empty">
      No measurable {NUTRIENT_LABEL[nutrient].toLowerCase()} in this recipe.
    </p>
  {/if}
</section>

<style>
  .contribution-card {
    background: var(--color-card);
    border: 1px solid var(--color-rule);
    border-radius: 4px;
    padding: 1.25rem 1.5rem;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }
  h3 {
    margin: 0;
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-muted);
    font-weight: 600;
  }
  .picker select {
    font-family: var(--font-ui);
    font-size: 0.85rem;
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--color-rule);
    border-radius: 3px;
    background: var(--color-bg);
  }
  .chart-wrap {
    width: 100%;
    max-width: 220px;
    margin: 0 auto;
  }
  .ranked {
    list-style: none;
    padding: 0;
    margin: 1rem 0 0;
    display: grid;
    gap: 0.35rem;
    font-size: 0.85rem;
  }
  .ranked li {
    display: grid;
    grid-template-columns: 0.75rem 1fr auto;
    align-items: center;
    gap: 0.5rem;
  }
  .swatch {
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 2px;
    display: inline-block;
  }
  .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .value {
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .empty {
    text-align: center;
    margin: 1rem 0 0;
    font-size: 0.85rem;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
