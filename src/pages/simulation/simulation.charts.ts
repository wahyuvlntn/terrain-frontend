import type { DEFAULT_COLOR } from '@digital-twin/components';

/** Resolved theme colours (`ThemeContext.colors`): canvas charts can't read CSS variables */
export type ThemeColors = Record<keyof typeof DEFAULT_COLOR, string>;

/** Chart text sizes of the simulation charts (ticks / legend 12-13 px, tooltip 14 px) */
export const CHART_FONT = { tick: 12, legend: 13, tooltip: 14 } as const;

/**
 * Colour of each variant, in the job's order: the reference (baseline) neutral, the alternatives
 * in the theme's accent colours. The same slots are used by every chart of a job.
 */
export const variantPalette = (colors: Partial<ThemeColors>): string[] => [
  colors.neutralTextCaption ?? '#a8b1b9',
  colors.accentInfoSecondary ?? '#2cb5ff',
  colors.conditionWarningSecondary ?? '#ffa432',
];

/** Tooltip shared by the simulation charts */
export const chartTooltip = (colors: Partial<ThemeColors>) => ({
  confine: true,
  backgroundColor: colors.backgroundDefault,
  borderColor: colors.borderDefault,
  textStyle: { color: colors.neutralTextTitleHeading, fontSize: CHART_FONT.tooltip },
});

/** Axis label / line styles shared by the simulation charts */
export const chartAxis = (colors: Partial<ThemeColors>) => ({
  label: { color: colors.neutralTextCaption, fontSize: CHART_FONT.tick },
  line: { lineStyle: { color: colors.borderLight } },
  split: { lineStyle: { color: colors.borderLight, type: 'dashed' as const, opacity: 0.5 } },
});

export const chartLegend = (colors: Partial<ThemeColors>) => ({
  icon: 'roundRect',
  itemWidth: 14,
  itemHeight: 4,
  textStyle: { color: colors.neutralTextTitleHeading, fontSize: CHART_FONT.legend },
});
