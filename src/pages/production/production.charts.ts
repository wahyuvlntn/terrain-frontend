import type { DEFAULT_COLOR } from '@digital-twin/components';

/** Resolved theme colours (`ThemeContext.colors`): canvas charts can't read CSS variables */
export type ThemeColors = Record<keyof typeof DEFAULT_COLOR, string>;

/** Chart text sizes (ticks / legend 12-13 px, tooltip 14 px) */
export const CHART_FONT = { tick: 12, legend: 13, tooltip: 14 } as const;

export const chartTooltip = (c: Partial<ThemeColors>) => ({
  confine: true,
  backgroundColor: c.backgroundDefault,
  borderColor: c.borderDefault,
  textStyle: { color: c.neutralTextTitleHeading, fontSize: CHART_FONT.tooltip },
});

export const chartAxis = (c: Partial<ThemeColors>) => ({
  axisLabel: { color: c.neutralTextCaption, fontSize: CHART_FONT.tick, hideOverlap: true },
  axisLine: { lineStyle: { color: c.borderLight } },
  splitLine: { lineStyle: { color: c.borderLight, type: 'dashed' as const, opacity: 0.5 } },
});

export const chartLegend = (c: Partial<ThemeColors>) => ({
  icon: 'roundRect',
  itemWidth: 14,
  itemHeight: 4,
  textStyle: { color: c.neutralTextTitleHeading, fontSize: CHART_FONT.legend },
});

/** Colours of the OEE factors in every chart of the page */
export const factorColors = (c: Partial<ThemeColors>) => ({
  oee: c.brandSurfaceDefaultPrimary ?? '#0f94ed',
  availability: c.statusRunningPrimary ?? '#3cb478',
  operational: c.accentInfoSecondary ?? '#2cb5ff',
  rate: c.conditionWarningPrimary ?? '#ffa432',
  quality: c.conditionAbnormalPrimary ?? '#a46bf5',
});

/** Colours of the E10 time states (the equipment status colours) */
export const stateColors = (c: Partial<ThemeColors>): Record<string, string> => ({
  RUNNING: c.statusRunningPrimary ?? '#3cb478',
  IDLE: c.statusIdlePrimary ?? '#f5c242',
  'UNPLANNED DOWN': (c as Record<string, string>).statusUnplanned_downPrimary ?? '#e5484d',
  'PLANNED DOWN': (c as Record<string, string>).statusPlanned_downPrimary ?? '#7d66d9',
  OFFLINE: c.statusOfflinePrimary ?? '#a8b1b9',
});
