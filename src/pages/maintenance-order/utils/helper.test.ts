import { describe, expect, it } from 'vitest';

import { validDay } from './helper';

describe('validDay', () => {
  it('keeps dates and absent values, blanks what is not a date', () => {
    expect(validDay('2026-10-15')).toBe('2026-10-15');
    expect(validDay(null)).toBeNull();
    expect(validDay('Invalid Date')).toBe('');
  });
});
