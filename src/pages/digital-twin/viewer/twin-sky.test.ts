import { describe, expect, it } from 'vitest';

import { hourIn, skyDirection, skyLook, sunAt } from './twin-sky';

describe('sunAt', () => {
  it('rises in the east about 07:05, stands highest at solar noon and sets in the west', () => {
    const rise = sunAt(7.1);
    expect(rise.elevation).toBeCloseTo(0, 0);
    expect(rise.bearing).toBeCloseTo(90, 0);
    const noon = sunAt(13.1);
    expect(noon.elevation).toBeCloseTo(90);
    expect(noon.bearing).toBeCloseTo(180);
    const set = sunAt(19.1);
    expect(set.elevation).toBeCloseTo(0, 0);
    expect(set.bearing).toBeCloseTo(270, 0);
    expect(sunAt(1.1).elevation).toBeCloseTo(-90);
  });
});

describe('skyLook', () => {
  it('is night well below the horizon, dawn around it and full day higher up', () => {
    const night = skyLook(-30);
    const dawn = skyLook(0);
    const day = skyLook(45);
    // the day sky is brighter than the night sky, the dawn horizon warm (red over blue)
    expect(day.zenith.b).toBeGreaterThan(night.zenith.b);
    expect(dawn.horizon.r).toBeGreaterThan(dawn.horizon.b);
    expect(day.sun).toBeGreaterThan(dawn.sun);
    expect(dawn.sun).toBeGreaterThan(night.sun);
    // nights stay light enough to read the equipment
    expect(night.environment).toBeGreaterThan(0.4);
  });
});

describe('hourIn', () => {
  it('reads the hour in the plant time zone', () => {
    // 05:30 UTC is 13:30 in Singapore (UTC+8)
    expect(hourIn(new Date('2026-10-14T05:30:00Z'), 'Asia/Singapore')).toBeCloseTo(13.5);
  });

  it('falls back to the browser clock for an unknown zone', () => {
    const d = new Date('2026-10-14T05:30:00Z');
    expect(hourIn(d, 'Not/AZone')).toBeCloseTo(d.getHours() + d.getMinutes() / 60);
  });
});

describe('skyDirection', () => {
  it('points north along -Z and east along +X', () => {
    const north = skyDirection(0, 0);
    expect(north.z).toBeCloseTo(-1);
    const east = skyDirection(90, 0);
    expect(east.x).toBeCloseTo(1);
    expect(skyDirection(180, 90).y).toBeCloseTo(1);
  });
});
