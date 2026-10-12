import { describe, expect, it } from 'vitest';

import {
  lotsFilters,
  lotTwinAsset,
  qualityFilters,
  rating,
  stepBase,
  timelineWindow,
  toolTag,
  trendDays,
  twinLink,
  waterfall,
  withFilters,
} from './production.utils';

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
    expect(twinLink('CVD_02', 7)).toBe(
      '/digital-twin?node=loc-7&asset=CVD_02&view=walk&isolate=0&tags=0&hover=1&tint=1&seethrough=0'
    );
    // the fab's location not known yet: the tool's own scope
    expect(twinLink('CVD_02')).toMatch(/^\/digital-twin\?asset=CVD_02&view=walk&/);
    const lot = { status: 'QUEUED' as const, equipmentAlias: 'SCN_01' };
    expect(lotTwinAsset({ ...lot, location: 'TRK_01:2' })).toBe('TRK_01');
    expect(lotTwinAsset({ ...lot, location: 'FRN_02' })).toBe('FRN_02');
    expect(lotTwinAsset({ ...lot, location: 'STK-03' })).toBe('SCN_01');
    expect(lotTwinAsset({ ...lot, location: null })).toBe('SCN_01');
    expect(lotTwinAsset({ status: 'DONE', location: null, equipmentAlias: 'WAT_01' })).toBeNull();
  });
});

describe('tab filters in the URL', () => {
  const url = (search: string) => new URLSearchParams(search);

  it('reads them, else the defaults', () => {
    expect(lotsFilters(url('lot-status=hold&lot-search=+M26+&lot=M261013.01'))).toEqual({
      filter: 'hold',
      search: 'M26',
      selected: 'M261013.01',
    });
    expect(lotsFilters(url('lot-status=x'))).toEqual({ filter: 'wip', search: '', selected: null });
    expect(lotsFilters(url(`lot=${'M'.repeat(41)}`)).selected).toBeNull();
    expect(qualityFilters(url('char=PADOX.THK&quality-window=720&quality-tool=4'))).toEqual({
      charKey: 'PADOX.THK',
      hours: '720',
      toolId: '4',
    });
    expect(qualityFilters(url('quality-window=5&quality-tool=abc'))).toEqual({
      charKey: '',
      hours: '168',
      toolId: '',
    });
    expect(timelineWindow(url('timeline-window=72'))).toBe('72');
    expect(timelineWindow(url('timeline-window=48'))).toBe('24');
    expect(timelineWindow(url(''))).toBe('24');
  });

  it('writes only their own keys, without the defaults', () => {
    const next = withFilters(url('tab=lots&window=168&section=lot-detail&lot-status=hold&lot=M1'), [
      ['lot-status', 'wip', 'wip'],
      ['lot-search', 'M26', ''],
      ['lot', '', ''],
    ]);
    expect(next?.toString()).toBe('tab=lots&window=168&section=lot-detail&lot-search=M26');
    // nothing to change: no write
    expect(withFilters(url('tab=lots'), [['lot-status', 'wip', 'wip']])).toBeNull();
  });
});
