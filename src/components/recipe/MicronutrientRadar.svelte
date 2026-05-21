<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    Chart,
    RadarController,
    PointElement,
    LineElement,
    Filler,
    RadialLinearScale,
    Tooltip,
  } from 'chart.js';
  import type { Nutrients } from '../../lib/nutrition/types.ts';
  import { MICRO_DV, MICRO_KEYS, radarSeries } from '../../lib/micronutrients.ts';

  type Props = { nutrients: Nutrients };
  let { nutrients }: Props = $props();

  const series = $derived(radarSeries(nutrients));
  const anyValue = $derived(series.some((s) => s.value > 0));

  let canvas: HTMLCanvasElement | null = $state(null);
  let chart: Chart<'radar'> | null = null;
  let prefersReducedMotion = false;

  function buildData(s: { label: string; value: number }[]) {
    return {
      labels: s.map((x) => x.label),
      datasets: [
        {
          label: '% Daily Value',
          data: s.map((x) => Math.round(x.value)),
          backgroundColor: 'rgb(255 79 0 / 18%)',
          borderColor: 'rgb(255 79 0)',
          pointBackgroundColor: 'rgb(255 79 0)',
          pointRadius: 3,
        },
      ],
    };
  }

  onMount(() => {
    if (!canvas) return;
    if (typeof window !== 'undefined' && 'matchMedia' in window) {
      prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    Chart.register(RadarController, PointElement, LineElement, Filler, RadialLinearScale, Tooltip);
    chart = new Chart(canvas, {
      type: 'radar',
      data: buildData(series),
      options: {
        responsive: true,
        maintainAspectRatio: true,
        animation: prefersReducedMotion ? false : { duration: 250 },
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
            ticks: { stepSize: 25, color: 'rgb(122 128 133)', backdropColor: 'transparent' },
            grid: { color: 'rgb(58 62 66)' },
            angleLines: { color: 'rgb(58 62 66)' },
            pointLabels: {
              font: { size: 11, family: "'Intel One Mono', ui-monospace, monospace" },
              color: 'rgb(207 211 215)',
            },
          },
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const key = MICRO_KEYS[ctx.dataIndex];
                if (!key) return '';
                const raw = nutrients[key];
                const ref = MICRO_DV[key];
                if (raw === undefined) return `${ref.label}: no data`;
                const pct = Math.round((raw / ref.dv) * 100);
                return `${ref.label}: ${raw.toFixed(1)} ${ref.unit} (${pct}% DV)`;
              },
            },
          },
        },
      },
    });
  });

  $effect(() => {
    if (chart) {
      chart.data = buildData(series);
      chart.update();
    }
  });

  onDestroy(() => {
    chart?.destroy();
    chart = null;
  });
</script>

<section class="radar-card ui" data-testid="micronutrient-radar">
  <header>
    <h3>Micronutrient coverage</h3>
    <p class="muted small">Per serving, as a percent of the FDA Daily Value.</p>
  </header>
  {#if anyValue}
    <div class="chart-wrap">
      <canvas bind:this={canvas} aria-label="Micronutrient coverage radar chart"></canvas>
    </div>
    <details class="data-table">
      <summary class="ui muted">Show values</summary>
      <table>
        <thead>
          <tr><th>Nutrient</th><th>Per serving</th><th>% DV</th></tr>
        </thead>
        <tbody>
          {#each MICRO_KEYS as key (key)}
            {@const ref = MICRO_DV[key]}
            {@const raw = nutrients[key]}
            {@const pct = raw === undefined ? null : Math.round((raw / ref.dv) * 100)}
            <tr>
              <td>{ref.label}</td>
              <td class="mono">{raw === undefined ? '—' : `${raw.toFixed(1)} ${ref.unit}`}</td>
              <td class="mono">{pct === null ? '—' : `${pct}%`}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </details>
  {:else}
    <p class="muted empty">
      No micronutrient data available for the current selection. Add values to the relevant
      ingredient files to populate this chart.
    </p>
  {/if}
</section>

<style>
  .radar-card {
    background: var(--color-card);
    border: 1px solid var(--color-rule);
    border-radius: 0;
    padding: 1.5rem;
  }
  header {
    margin-bottom: 1rem;
  }
  h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
  }
  .small {
    font-size: 0.85rem;
    margin: 0.25rem 0 0;
  }
  .chart-wrap {
    width: 100%;
    max-width: 360px;
    margin: 0 auto;
  }
  .data-table {
    margin-top: 1.5rem;
  }
  summary {
    cursor: pointer;
    font-size: 0.85rem;
  }
  table {
    width: 100%;
    margin-top: 0.75rem;
    border-collapse: collapse;
    font-family: var(--font-ui);
    font-variant-numeric: tabular-nums;
  }
  th,
  td {
    text-align: left;
    padding: 0.4rem 0.6rem;
    border-bottom: 1px solid var(--color-rule);
  }
  th {
    color: var(--color-muted);
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  td.mono {
    text-align: right;
    white-space: nowrap;
  }
  .empty {
    margin: 0;
    text-align: center;
    font-size: 0.9rem;
  }
</style>
