import { z } from 'zod';

/**
 * ECharts options received from the assistant are built server-side from real data, but they are
 * still untrusted input to a renderer that can load images and write HTML (tooltips). They pass
 * through an allow-list here before reaching echarts:
 *
 * - only plain JSON (objects, arrays, finite numbers, short strings, booleans, null), bounded depth;
 * - top-level components and series types from an allow-list; everything else is dropped
 *   (graphic, toolbox, media / timeline, custom series with renderItem…);
 * - no rich text, links, image symbols or image backgrounds; tooltip formatters are removed and
 *   other formatters must be plain templates (no markup);
 * - at most MAX_POINTS points per series and MAX_SERIES series; wheel zoom ("inside" data zoom) is
 *   dropped so the chart never captures the chat's scrolling;
 * - line / bar / scatter / boxplot / heatmap series always get an x and a y axis (echarts throws
 *   without them).
 *
 * Then the app theme is applied (text, axes, grid lines, tooltip, palette), so charts read in both
 * light and dark themes.
 */

export const MAX_POINTS = 2000;
const MAX_SERIES = 24;
const MAX_DEPTH = 10;
const MAX_ARRAY = 5000;
const MAX_STRING = 500;

const TOP_LEVEL = new Set([
  'title',
  'legend',
  'grid',
  'xAxis',
  'yAxis',
  'series',
  'tooltip',
  'dataZoom',
  'visualMap',
  'dataset',
  'color',
  'axisPointer',
  'textStyle',
  'animation',
]);

export const SERIES_TYPES = ['line', 'bar', 'scatter', 'pie', 'heatmap', 'boxplot'] as const;
const SERIES_TYPE_SET = new Set<string>(SERIES_TYPES);

/** keys removed wherever they appear */
const BLOCKED_KEYS = new Set([
  'graphic',
  'rich',
  'link',
  'sublink',
  'target',
  'subtarget',
  'toolbox',
  'renderItem',
  'image',
  'html',
  'extraCssText',
  'className',
  'appendTo',
  'appendToBody',
  'renderMode',
  'enterable',
]);

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type JsonObject = { [key: string]: Json };

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isSafeTemplate = (s: string) => !/[<>&]/.test(s) && s.length <= 200;

/** A string that would make echarts fetch something (an `image://` symbol or icon) */
const isResource = (s: string) => /^\s*image:\/\//i.test(s);

const clean = (
  value: unknown,
  key: string,
  depth: number,
  inTooltip: boolean
): Json | undefined => {
  if (depth > MAX_DEPTH) return undefined;
  if (value === null) return null;
  switch (typeof value) {
    case 'number':
      return Number.isFinite(value) ? value : null;
    case 'boolean':
      return value;
    case 'string': {
      if (key === 'formatter') return !inTooltip && isSafeTemplate(value) ? value : undefined;
      if (isResource(value)) return undefined;
      return value.length > MAX_STRING ? value.slice(0, MAX_STRING) : value;
    }
    case 'object': {
      if (Array.isArray(value)) {
        const out: Json[] = [];
        for (const item of value.slice(0, MAX_ARRAY)) {
          const c = clean(item, '', depth + 1, inTooltip);
          out.push(c === undefined ? null : c);
        }
        return out;
      }
      if (!isObject(value)) return undefined;
      // a formatter or background given as an object (callback, image pattern) is never kept
      if (key === 'formatter' || key === 'backgroundColor') return undefined;
      const out: JsonObject = {};
      for (const [k, v] of Object.entries(value)) {
        if (BLOCKED_KEYS.has(k) || k === '__proto__' || k === 'constructor' || k === 'prototype') {
          continue;
        }
        const c = clean(v, k, depth + 1, inTooltip || k === 'tooltip');
        if (c !== undefined) out[k] = c;
      }
      return out;
    }
    default:
      // functions, symbols, bigints, undefined
      return undefined;
  }
};

const asList = (v: Json | undefined): Json[] => (Array.isArray(v) ? v : v === undefined ? [] : [v]);

const cleanSeries = (series: Json | undefined): JsonObject[] =>
  asList(series)
    .filter(
      (s): s is JsonObject =>
        isObject(s) && typeof s.type === 'string' && SERIES_TYPE_SET.has(s.type)
    )
    .slice(0, MAX_SERIES)
    .map((s) => (Array.isArray(s.data) ? { ...s, data: s.data.slice(0, MAX_POINTS) } : s));

/** series drawn on a cartesian grid: echarts' setOption throws when their axes are missing */
const CARTESIAN = new Set(['line', 'bar', 'scatter', 'boxplot', 'heatmap']);
/** a date-like x value ("2026-10-10", "2026-10-10T06:00:00Z") */
const DATE_TEXT = /^\d{4}-\d{2}-\d{2}/;
/** numbers this large are epoch milliseconds (from 2001 on) */
const EPOCH_MS = 1e12;

/** The type of the first axis given as an object or a list of them */
const axisType = (axis: Json | undefined) => {
  const first = Array.isArray(axis) ? axis[0] : axis;
  return isObject(first) && typeof first.type === 'string' ? first.type : undefined;
};

/** The x axis the data calls for: time stamps → time, numbers → value, else categories */
const xAxisTypeOf = (series: JsonObject[]) => {
  for (const s of series) {
    if (!Array.isArray(s.data)) continue;
    let item = s.data.find((d) => d !== null);
    if (isObject(item)) item = item.value;
    if (item === undefined || item === null) continue;
    // plain values ([6.5, 6.6]) are drawn per category index
    if (!Array.isArray(item)) return 'category';
    const x = item[0];
    if (typeof x === 'number') return x >= EPOCH_MS ? 'time' : 'value';
    if (typeof x === 'string') return DATE_TEXT.test(x) ? 'time' : 'category';
  }
  return 'category';
};

/**
 * Cartesian series need an x and a y axis (echarts throws otherwise): a missing (or empty) axis is
 * added with a type that suits the data, and series pointing at an axis that doesn't exist are
 * moved to the first one.
 */
const withAxes = (top: JsonObject, series: JsonObject[]): JsonObject[] => {
  const cartesian = series.filter((s) => CARTESIAN.has(String(s.type)));
  if (!cartesian.length) return series;
  const axes = (axis: Json | undefined): JsonObject[] =>
    Array.isArray(axis)
      ? (axis.filter(isObject) as JsonObject[])
      : isObject(axis)
        ? [axis as JsonObject]
        : [];
  const heatmap = cartesian.some((s) => s.type === 'heatmap');
  const xCount = axes(top.xAxis).length;
  const yCount = axes(top.yAxis).length;
  if (!xCount) {
    top.xAxis = {
      type: heatmap
        ? 'category'
        : axisType(top.yAxis) === 'category'
          ? 'value'
          : xAxisTypeOf(cartesian),
    };
  } else if (Array.isArray(top.xAxis)) top.xAxis = axes(top.xAxis);
  if (!yCount) top.yAxis = { type: heatmap ? 'category' : 'value' };
  else if (Array.isArray(top.yAxis)) top.yAxis = axes(top.yAxis);
  const inRange = (index: Json | undefined, count: number) =>
    typeof index !== 'number' || (index >= 0 && index < Math.max(count, 1));
  return series.map((s) => {
    if (!CARTESIAN.has(String(s.type))) return s;
    const { xAxisIndex, yAxisIndex, ...rest } = s;
    return {
      ...rest,
      ...(xAxisIndex !== undefined && inRange(xAxisIndex, xCount) ? { xAxisIndex } : {}),
      ...(yAxisIndex !== undefined && inRange(yAxisIndex, yCount) ? { yAxisIndex } : {}),
    };
  });
};

const seriesSchema = z
  .object({ type: z.enum(SERIES_TYPES), data: z.array(z.unknown()).optional() })
  .passthrough();

const optionSchema = z
  .object({ series: z.array(seriesSchema).min(1).max(MAX_SERIES) })
  .passthrough()
  .refine(
    (o) => o.series.some((s) => (s.data?.length ?? 0) > 0) || isObject(o.dataset),
    'The chart has no data'
  );

/** The sanitised option, or null when nothing drawable is left */
export const sanitizeChartOption = (raw: unknown): JsonObject | null => {
  if (!isObject(raw)) return null;
  const top: JsonObject = {};
  for (const [k, v] of Object.entries(raw)) {
    if (!TOP_LEVEL.has(k)) continue;
    const c = clean(v, k, 1, k === 'tooltip');
    if (c !== undefined) top[k] = c;
  }
  top.series = withAxes(top, cleanSeries(top.series));
  if (top.dataZoom !== undefined) {
    const zooms = asList(top.dataZoom).filter((z) => isObject(z) && z.type !== 'inside');
    if (zooms.length) top.dataZoom = zooms;
    else delete top.dataZoom;
  }
  const parsed = optionSchema.safeParse(top);
  return parsed.success ? (parsed.data as JsonObject) : null;
};

// ---------------------------------------------------------------------- theme

export type ChartTheme = {
  text: string;
  heading: string;
  label: string;
  caption: string;
  axis: string;
  grid: string;
  tooltipBackground: string;
  tooltipBorder: string;
  palette: string[];
};

/** `defaults` under `value`: value wins, nested plain objects are merged */
const withDefaults = (value: Json | undefined, defaults: JsonObject): JsonObject => {
  if (!isObject(value)) return { ...defaults };
  const out: JsonObject = { ...defaults, ...(value as JsonObject) };
  for (const [k, d] of Object.entries(defaults)) {
    if (isObject(d) && isObject(out[k])) out[k] = withDefaults(out[k], d as JsonObject);
  }
  return out;
};

/** Apply `fn` to an axis / component given as an object or a list of them */
const eachComponent = (v: Json | undefined, fn: (c: Json | undefined) => JsonObject) =>
  Array.isArray(v) ? v.map(fn) : fn(v);

/**
 * The option themed for the app: transparent background, theme text and line colours (these win
 * over the option's own, which cannot know the theme), the palette unless the option sets colours,
 * a confined tooltip, and a grid that leaves room for labels and the legend.
 */
export const themeChartOption = (
  option: JsonObject,
  theme: ChartTheme,
  { hideTitle }: { hideTitle: boolean }
): JsonObject => {
  const series = option.series as JsonObject[];
  const pieOnly = series.every((s) => s.type === 'pie');
  const hasLegend = option.legend !== undefined || series.length > 1;
  const axis = (a: Json | undefined) =>
    withDefaults(a, {
      axisLabel: { color: theme.caption, fontSize: 12, hideOverlap: true },
      axisLine: { lineStyle: { color: theme.axis } },
      axisTick: { lineStyle: { color: theme.axis } },
      splitLine: { lineStyle: { color: theme.grid, type: 'dashed', opacity: 0.6 } },
      nameTextStyle: { color: theme.caption, fontSize: 12 },
    });
  const forceColor = (a: JsonObject, part: string, color: string) => {
    const style = isObject(a[part]) ? (a[part] as JsonObject) : {};
    return { ...a, [part]: { ...style, color } };
  };

  const themed: JsonObject = {
    ...option,
    animation: false,
    backgroundColor: 'transparent',
    color:
      Array.isArray(option.color) && option.color.every((c) => typeof c === 'string')
        ? option.color
        : theme.palette,
    textStyle: withDefaults(option.textStyle, { color: theme.text, fontSize: 12 }),
    tooltip: forceColor(
      withDefaults(option.tooltip, {
        trigger: pieOnly ? 'item' : 'axis',
        confine: true,
        backgroundColor: theme.tooltipBackground,
        borderColor: theme.tooltipBorder,
        textStyle: { color: theme.heading, fontSize: 13 },
      }),
      'textStyle',
      theme.heading
    ),
    grid: withDefaults(option.grid, {
      left: 8,
      right: 12,
      top: hasLegend ? 30 : 12,
      bottom: 8,
      containLabel: true,
    }),
  };
  if (hideTitle) delete themed.title;
  else if (option.title !== undefined) {
    themed.title = eachComponent(option.title, (t) =>
      forceColor(withDefaults(t, { textStyle: { fontSize: 14 } }), 'textStyle', theme.heading)
    );
  }
  if (hasLegend) {
    themed.legend = eachComponent(option.legend, (l) =>
      forceColor(
        withDefaults(l, { type: 'scroll', top: 0, itemWidth: 14, itemHeight: 8 }),
        'textStyle',
        theme.label
      )
    );
  }
  if (!pieOnly) {
    for (const key of ['xAxis', 'yAxis']) {
      if (option[key] === undefined) continue;
      themed[key] = eachComponent(option[key], (a) => {
        const styled = axis(a);
        return forceColor(styled, 'axisLabel', theme.caption);
      });
    }
  }
  themed.series = series.map((s) =>
    s.type === 'pie'
      ? withDefaults(s, {
          label: { color: theme.label },
          labelLine: { lineStyle: { color: theme.axis } },
        })
      : s
  );
  return themed;
};
