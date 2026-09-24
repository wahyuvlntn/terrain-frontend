import { describe, expect, it } from 'vitest';

import { rating, stepBase, toolTag, trendDays, twinLink, waterfall } from './production.utils';

describe('waterfall', () => {
  it('takes the losses from the top of the remaining time, down to the good time', () => {
    const bars = waterfall({
      totalH: 100,
      nonScheduledH: 5,
      scheduledDownH: 10,
      unscheduledDownH: 5,
      standbyH: 20,
      rateLossH: 6,
      qualityLossH: 1,
      goodH: 53,
    });
    expect(bars.map((b) => [b.label, b.value, b.base])).toEqual([
      ['Total time', 100, 0],
      ['Non-scheduled', 5, 95],
      ['Scheduled down', 10, 85],
      ['Unscheduled down', 5, 80],
      ['Standby', 20, 60],
      ['Rate loss', 6, 54],
      ['Quality loss', 1, 53],
      ['Good time', 53, 0],
    ]);
  });

  it('never lets a loss go below zero when the hours do not add up (rounding)', () => {
    const bars = waterfall({
      totalH: 10,
      nonScheduledH: 4,
      scheduledDownH: 4,
      unscheduledDownH: 4,
      standbyH: 0,
      rateLossH: 0,
      qualityLossH: 0,
      goodH: 0,
    });
    expect(bars.every((b) => b.base >= 0 && b.value >= 0)).toBe(true);
    expect(bars.find((b) => b.key === 'unscheduledDownH')?.value).toBe(2);
  });
});

describe('helpers', () => {
  it('rates OEE and its factors', () => {
    expect(rating(80, 'oee')).toBe('normal');
    expect(rating(65, 'oee')).toBe('warning');
    expect(rating(50, 'oee')).toBe('critical');
    expect(rating(96)).toBe('normal');
    expect(rating(90)).toBe('warning');
    expect(rating(null)).toBeNull();
  });

  it('shows two weeks of trend, or the window when longer', () => {
    expect(trendDays(12)).toBe(14);
    expect(trendDays(168)).toBe(14);
    expect(trendDays(720)).toBe(30);
  });

  it('formats steps, tools and twin links', () => {
    expect(stepBase('POLY-ET', 'POLY')).toBe('ET');
    expect(stepBase('M3-CMP', 'M3')).toBe('CMP');
    expect(stepBase('WS-CLN', 'START')).toBe('WS-CLN');
    expect(stepBase('DEFECT')).toBe('DEFECT');
    expect(toolTag('ETCH_01')).toBe('ETCH-01');
    expect(twinLink('CVD_02')).toBe('/digital-twin?asset=CVD_02');
  });
});
