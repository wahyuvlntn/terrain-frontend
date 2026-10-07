import { describe, expect, it } from 'vitest';

import { type AmhsState, amhsNetwork, portLotsAt, trackPoint, vehiclePose } from './twin-amhs';
import { loopState } from './twin-amhs-loop';

const NET = amhsNetwork();
const IDS = Array.from({ length: 10 }, (_, i) => `OHT-${String(i + 1).padStart(2, '0')}`);
const T = Date.UTC(2026, 9, 14, 8, 0, 0);

const where = (st: AmhsState, id: string, t: number) => {
  const v = st.vehicles.find((x) => x.id === id);
  if (!v) throw new Error(id);
  const pose = vehiclePose(v, t, NET, st.speed);
  return { ...trackPoint(NET, pose.track, pose.s), pose };
};

describe('loop transport animation', () => {
  it('makes the same plans where two spans overlap', () => {
    const a = loopState(NET, IDS, T, T + 240_000);
    const b = loopState(NET, IDS, T + 120_000, T + 360_000);
    for (let t = T + 125_000; t < T + 235_000; t += 700) {
      IDS.forEach((id) => {
        const p = where(a, id, t);
        const q = where(b, id, t);
        expect(q.x).toBeCloseTo(p.x, 6);
        expect(q.y).toBeCloseTo(p.y, 6);
        expect(q.pose.carry).toBe(p.pose.carry);
      });
    }
  });

  it('moves every vehicle on without a jump, no faster than the fleet speed, six of them through the bays', () => {
    const st = loopState(NET, IDS, T, T + 300_000);
    const bays = new Set<string>();
    IDS.forEach((id) => {
      let prev = where(st, id, T + 1_000);
      for (let t = T + 1_100; t < T + 299_000; t += 100) {
        const p = where(st, id, t);
        expect(Math.hypot(p.x - prev.x, p.y - prev.y)).toBeLessThanOrEqual(NET.speed * 0.1 + 1e-6);
        if (p.pose.track !== 'IB') bays.add(id);
        prev = p;
      }
    });
    expect(bays.size).toBe(6);
  });

  it('keeps every two vehicles apart', () => {
    const st = loopState(NET, IDS, T, T + 300_000);
    const L = NET.tracks.get('IB')?.len ?? 0;
    let min = Number.POSITIVE_INFINITY;
    let alongLoop = Number.POSITIVE_INFINITY;
    for (let t = T + 1_000; t < T + 299_000; t += 200) {
      const ps = IDS.map((id) => where(st, id, t));
      for (let i = 0; i < ps.length; i++)
        for (let j = i + 1; j < ps.length; j++) {
          min = Math.min(min, Math.hypot(ps[i].x - ps[j].x, ps[i].y - ps[j].y));
          if (ps[i].pose.track === 'IB' && ps[j].pose.track === 'IB') {
            const d = (((ps[i].pose.s - ps[j].pose.s) % L) + L) % L;
            alongLoop = Math.min(alongLoop, d, L - d);
          }
        }
    }
    // on the loop every vehicle keeps its own place (a tenth of the loop apart); the closest
    // anyone comes is passing a vehicle on the STK-01 bypass, whose rail runs 0.8 m beside the loop
    expect(alongLoop).toBeGreaterThan(L / IDS.length - 0.01);
    expect(min).toBeGreaterThan(0.79);
  });

  it('hands the FOUP over halfway through a hoist cycle, one FOUP per port at most', () => {
    const st = loopState(NET, IDS, T, T + 300_000);
    for (let t = T; t < T + 300_000; t += 500) {
      const ports = portLotsAt(st.ports, t).map((l) => l.port);
      expect(new Set(ports).size).toBe(ports.length);
    }
    const v = st.vehicles.find((x) => x.segs.length > 0);
    const drop = v?.segs.find((g) => g.hoist === 'drop' && g.t0 > T + 10_000);
    const pick = v?.segs.find((g) => g.hoist === 'pick' && g.t0 > T + 10_000);
    if (!v || !drop || !pick) throw new Error('no hoist cycles');
    const half = (g: typeof drop) => (g.t0 + g.t1) / 2;
    const onPort = (g: typeof drop, t: number) =>
      portLotsAt(st.ports, t).some((l) => l.port === g.port && l.lot === g.lot);
    expect(vehiclePose(v, half(drop) - 100, NET).carry).toBe(drop.lot);
    expect(onPort(drop, half(drop) - 100)).toBe(false);
    expect(vehiclePose(v, half(drop) + 100, NET).carry).toBeNull();
    expect(onPort(drop, half(drop) + 100)).toBe(true);
    expect(onPort(pick, half(pick) - 100)).toBe(true);
    expect(vehiclePose(v, half(pick) + 100, NET).carry).toBe(pick.lot);
    expect(onPort(pick, half(pick) + 100)).toBe(false);
  });
});
