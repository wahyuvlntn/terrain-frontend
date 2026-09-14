import { describe, expect, it } from 'vitest';

import {
  actionLabel,
  actionValue,
  assetTag,
  fmtDuration,
  fmtTime,
  humanize,
  modeText,
  timeAgo,
  timeUntil,
} from './ai-insights.utils';

const action = (param: string, value: number, unit: string | null, label: string | null) => ({
  asset: 'CHWS_01',
  param,
  value,
  unit,
  label,
});

describe('recommendation actions', () => {
  it('names known parameters and keeps only the name part of the optimizer label', () => {
    expect(actionLabel(action('chws_sp', 7, '°C', 'CHW Supply Set Point: 6.5 → 7.0 °C'))).toBe(
      'CHW supply set point'
    );
    expect(actionLabel(action('fan_bias', 2, '%', 'Fan Bias: 0 → 2 %'))).toBe('Fan Bias');
    expect(actionLabel(action('fan_bias', 2, '%', null))).toBe('Fan bias');
  });

  it('shows modes by their option and set points with unit and decimals', () => {
    expect(actionValue(action('chws_reset_mode', 1, '', 'CHW Set Point Mode: Manual'))).toBe(
      'Manual'
    );
    expect(actionValue(action('staging_mode', 0, '', null))).toBe('Load');
    expect(actionValue(action('chws_sp', 7, '°C', null))).toBe('7.0 °C');
    expect(actionValue(action('riser_dp_sp', 110, null, null))).toBe('110 kPa');
    expect(actionValue(action('chillers_sp', 2, '', null))).toBe('2');
    expect(modeText('chws_reset_mode', 5)).toBe('5');
  });
});

describe('formatting', () => {
  const now = Date.parse('2026-10-10T06:00:00Z');

  it('formats durations and relative times', () => {
    expect(fmtDuration(3 * 86_400_000 + 4 * 3_600_000)).toBe('3d 4h');
    expect(fmtDuration(2 * 3_600_000 + 5 * 60_000)).toBe('2h 05m');
    expect(fmtDuration(-1)).toBe('0m');
    expect(timeAgo('2026-10-10T05:55:00Z', now)).toBe('5 min ago');
    expect(timeAgo(null, now)).toBe('--');
    expect(timeUntil('2026-10-10T06:12:00Z', now)).toBe('in 12 min');
    expect(timeUntil('2026-10-10T05:00:00Z', now)).toBe('due');
  });

  it('keeps a date-only value on its calendar day', () => {
    expect(fmtTime('2026-09-01', 'dd MMM yyyy')).toBe('01 Sep 2026');
    expect(fmtTime(null)).toBe('--');
    expect(fmtTime('not a date')).toBe('--');
  });

  it('turns keys and aliases into labels', () => {
    expect(humanize('mau_valve_max')).toBe('Mau valve max');
    expect(assetTag('CHWS_01')).toBe('CHWS-01');
    expect(assetTag(null)).toBe('--');
  });
});
