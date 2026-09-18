import { describe, expect, it } from 'vitest';

import { ChartTheme, MAX_POINTS, sanitizeChartOption, themeChartOption } from './chart-option';

const THEME: ChartTheme = {
  text: '#111',
  heading: '#000',
  label: '#222',
  caption: '#333',
  axis: '#444',
  grid: '#555',
  tooltipBackground: '#fff',
  tooltipBorder: '#666',
  palette: ['#a00', '#0a0'],
};

describe('sanitizeChartOption', () => {
  it('keeps a plain line chart', () => {
    const option = {
      xAxis: { type: 'time' },
      yAxis: { type: 'value', name: '°C', axisLabel: { formatter: '{value} °C' } },
      series: [
        {
          type: 'line',
          name: 'CHWST',
          data: [
            [1, 6.5],
            [2, 6.6],
          ],
        },
      ],
    };
    expect(sanitizeChartOption(option)).toEqual(option);
  });

  it('drops unsafe components, keys and values', () => {
    const safe = sanitizeChartOption({
      graphic: [{ type: 'image', style: { image: 'https://evil/x.png' } }],
      toolbox: { feature: { saveAsImage: {} } },
      title: {
        text: 'T',
        link: 'javascript:alert(1)',
        textStyle: { rich: { a: { backgroundColor: { image: 'x' } } } },
      },
      tooltip: { formatter: '<img src=x onerror=alert(1)>', trigger: 'axis' },
      series: [
        {
          type: 'line',
          symbol: 'image://https://evil/x.png',
          data: [1, 2, Number.NaN],
          label: { formatter: '<b>{c}</b>' },
          tooltip: { formatter: '{b}' },
        },
        { type: 'custom', renderItem: 'x', data: [1] },
      ],
      dataZoom: [{ type: 'inside' }, { type: 'slider' }],
    });
    expect(safe).not.toBeNull();
    expect(safe).not.toHaveProperty('graphic');
    expect(safe).not.toHaveProperty('toolbox');
    expect(safe?.title).toEqual({ text: 'T', textStyle: {} });
    expect(safe?.tooltip).toEqual({ trigger: 'axis' });
    expect(safe?.series).toEqual([{ type: 'line', data: [1, 2, null], label: {}, tooltip: {} }]);
    expect(safe?.dataZoom).toEqual([{ type: 'slider' }]);
  });

  it('never copies prototype keys', () => {
    const raw = JSON.parse(
      '{"series":[{"type":"line","data":[1],"__proto__":{"polluted":true}}],"__proto__":{"x":1}}'
    );
    const safe = sanitizeChartOption(raw);
    const series = (safe?.series as Record<string, unknown>[])[0];
    expect(Object.getPrototypeOf(series)).toBe(Object.prototype);
    expect(series.polluted).toBeUndefined();
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('caps the points of a series', () => {
    const safe = sanitizeChartOption({
      series: [{ type: 'bar', data: Array.from({ length: MAX_POINTS + 500 }, (_, i) => i) }],
    });
    expect((safe?.series as { data: unknown[] }[])[0].data).toHaveLength(MAX_POINTS);
  });

  it('adds the axes cartesian series need, typed for their data', () => {
    const axesOf = (option: Record<string, unknown>) => {
      const safe = sanitizeChartOption(option);
      return { x: safe?.xAxis, y: safe?.yAxis };
    };
    expect(axesOf({ series: [{ type: 'line', data: [6.5, 6.6] }] })).toEqual({
      x: { type: 'category' },
      y: { type: 'value' },
    });
    expect(axesOf({ series: [{ type: 'line', data: [[1_791_612_000_000, 6.5]] }] }).x).toEqual({
      type: 'time',
    });
    expect(axesOf({ series: [{ type: 'line', data: [['2026-10-10T06:00:00Z', 6.5]] }] }).x).toEqual(
      { type: 'time' }
    );
    expect(axesOf({ series: [{ type: 'scatter', data: [[0.5, 0.56]] }] })).toEqual({
      x: { type: 'value' },
      y: { type: 'value' },
    });
    expect(
      axesOf({ series: [{ type: 'bar', data: [{ name: 'CH_01', value: 3 }] }], xAxis: [] })
    ).toEqual({ x: { type: 'category' }, y: { type: 'value' } });
    // horizontal bars: the categories are on the given y axis
    expect(
      axesOf({ yAxis: { type: 'category', data: ['a'] }, series: [{ type: 'bar', data: [3] }] })
    ).toEqual({ x: { type: 'value' }, y: { type: 'category', data: ['a'] } });
    expect(axesOf({ series: [{ type: 'heatmap', data: [[0, 0, 1]] }] })).toEqual({
      x: { type: 'category' },
      y: { type: 'category' },
    });
    // pies need none
    expect(axesOf({ series: [{ type: 'pie', data: [{ name: 'a', value: 1 }] }] })).toEqual({
      x: undefined,
      y: undefined,
    });
  });

  it('moves series off axes that do not exist', () => {
    const safe = sanitizeChartOption({
      xAxis: { type: 'category' },
      yAxis: [{ type: 'value' }, { type: 'value' }],
      series: [
        { type: 'line', data: [1], xAxisIndex: 2, yAxisIndex: 1 },
        { type: 'bar', data: [2], yAxisIndex: 5 },
      ],
    });
    expect(safe?.series).toEqual([
      { type: 'line', data: [1], yAxisIndex: 1 },
      { type: 'bar', data: [2] },
    ]);
  });

  it('rejects options with nothing drawable', () => {
    expect(sanitizeChartOption(null)).toBeNull();
    expect(sanitizeChartOption('chart')).toBeNull();
    expect(sanitizeChartOption({ series: [] })).toBeNull();
    expect(sanitizeChartOption({ series: [{ type: 'custom', data: [1] }] })).toBeNull();
    expect(sanitizeChartOption({ series: [{ type: 'line', data: [] }] })).toBeNull();
  });
});

describe('themeChartOption', () => {
  it('applies theme colours, palette and a confined tooltip', () => {
    const safe = sanitizeChartOption({
      title: { text: 'T' },
      xAxis: [{ type: 'category', axisLabel: { color: '#fff', rotate: 30 } }],
      yAxis: { type: 'value' },
      series: [
        { type: 'line', data: [1, 2] },
        { type: 'bar', data: [3, 4] },
      ],
    });
    expect(safe).not.toBeNull();
    const themed = themeChartOption(safe as NonNullable<typeof safe>, THEME, { hideTitle: true });
    expect(themed.title).toBeUndefined();
    expect(themed.backgroundColor).toBe('transparent');
    expect(themed.color).toEqual(THEME.palette);
    expect(themed.tooltip).toMatchObject({ trigger: 'axis', confine: true });
    expect(themed.legend).toMatchObject({ textStyle: { color: THEME.label } });
    expect(themed.xAxis).toEqual([
      expect.objectContaining({
        axisLabel: expect.objectContaining({ color: THEME.caption, rotate: 30 }),
      }),
    ]);
  });

  it('uses item tooltips for pie charts', () => {
    const safe = sanitizeChartOption({
      series: [{ type: 'pie', data: [{ name: 'a', value: 1 }] }],
    });
    const themed = themeChartOption(safe as NonNullable<typeof safe>, THEME, { hideTitle: false });
    expect(themed.tooltip).toMatchObject({ trigger: 'item' });
  });
});
