import type { AmhsNetwork, AmhsPortLot, AmhsSeg, AmhsState, AmhsVehicle } from './twin-amhs';

/**
 * The 'loop' transport animation (AMHS_MOTION): a self-contained schedule on the FAB1 rails, used
 * instead of the simulator's plans. It is a function of time alone, so it runs on without any
 * backend data and every frame follows on from the one before.
 *
 * Every vehicle owns a place on the interbay loop that goes round at the fleet speed, evenly spaced
 * from the others. A vehicle with a bay spur leaves its place where its spur branches off, drops
 * the FOUP it carries at one load port, picks another FOUP at a later port, waits a vehicle length
 * before the end of the spur until its place comes by and merges back into it, then rides at least
 * half a lap before the next visit. The other vehicles just go round. As nobody leaves or joins the
 * loop outside its own place, and every spur has one vehicle, no two vehicles ever meet.
 */

/** The schedule's time origin: cycles are counted from here (any fixed time) */
const LOOP_EPOCH = Date.UTC(2026, 0, 1);
/** A vehicle waits this far before the end of its spur (the simulator's amhsGap) */
const MERGE_GAP = 1.4;
/** A dropped FOUP stays on its port this long (then the tool takes it in); one to pick shows this long before */
const PORT_STAY_MS = 30_000;

const mod = (v: number, m: number) => ((v % m) + m) % m;

type Spur = {
  track: string;
  len: number;
  sIn: number;
  sOut: number;
  ports: { id: string; s: number }[];
};

/** The bay spurs in network order with their load ports along them (at least two each) */
const spursOf = (net: AmhsNetwork): Spur[] =>
  [...net.tracks.values()]
    .filter((t) => !t.closed)
    .map((t) => ({
      track: t.id,
      len: t.len,
      sIn: t.sIn,
      sOut: t.sOut,
      ports: Object.entries(net.ports)
        .filter(([, p]) => p.track === t.id && p.s <= t.len - MERGE_GAP)
        .map(([id, p]) => ({ id, s: p.s }))
        .sort((a, b) => a.s - b.s),
    }))
    .filter((s) => s.ports.length >= 2);

/**
 * The vehicles' plans and the FOUPs on the ports from `from` to `to` (epoch ms), for the vehicles
 * `ids` (the scene's dt_vehicle ids). Every segment is a pure function of time: two calls for
 * overlapping spans give the same segments where they overlap.
 */
export const loopState = (
  net: AmhsNetwork,
  ids: readonly string[],
  from: number,
  to: number
): AmhsState => {
  const hoistS = net.hoistS;
  const ib = net.tracks.get('IB');
  const v = net.speed;
  const vehicles: AmhsVehicle[] = [];
  const ports: AmhsPortLot[] = [];
  if (!ib || !(v > 0)) {
    return { now: from, speed: v, hoistS, vehicles, ports, stockers: {}, moving: 0 };
  }
  const L = ib.len;
  const ms = (m: number) => (m / v) * 1000;
  const H = hoistS * 1000;
  const sorted = [...ids].sort();
  const n = sorted.length;
  const spurs = spursOf(net);
  // the spur vehicles spread over the fleet, the others in between
  const spurOf = new Map<number, Spur>();
  for (let j = 0; j < Math.min(spurs.length, n); j++)
    spurOf.set(Math.floor((j * n) / spurs.length), spurs[j]);
  let moving = 0;
  sorted.forEach((id, i) => {
    const phase = (L * i) / Math.max(1, n);
    /** when the vehicle's place on the loop is next at `s`, at or after `t` */
    const passAt = (s: number, t: number) =>
      t + ms(mod(s - phase - (v * (t - LOOP_EPOCH)) / 1000, L));
    const spur = spurOf.get(i);
    if (!spur) {
      const anchor = { t: LOOP_EPOCH, s: phase };
      vehicles.push({ id, before: anchor, after: anchor, segs: [] });
      moving++;
      return;
    }
    // one cycle from the branch-off: the spur up to the wait (always len - MERGE_GAP of running and
    // two hoist cycles, whichever ports), the wait for its place, the merge, the loop back
    const first = passAt(spur.sIn, LOOP_EPOCH);
    const atWait = ms(spur.len - MERGE_GAP) + 2 * H;
    const merge = passAt(spur.sOut, first + atWait + ms(MERGE_GAP)) - first;
    let back = mod(spur.sIn - spur.sOut, L);
    if (back < L / 2) back += L;
    const period = merge + ms(back);
    const lotOf = (k: number) =>
      `${spur.track.toUpperCase()}-${String(mod(k, 1000)).padStart(3, '0')}`;
    const pairs = spur.ports.length - 1;
    const segs: AmhsSeg[] = [];
    const k0 = Math.floor((from - first) / period);
    const k1 = Math.floor((to - first) / period);
    for (let k = k0; k <= k1; k++) {
      const t0 = first + k * period;
      const a = spur.ports[mod(k, pairs)];
      const b = spur.ports[mod(k, pairs) + 1];
      const carried = lotOf(k);
      const picked = lotOf(k + 1);
      const dropAt = t0 + ms(a.s);
      const pickAt = dropAt + H + ms(b.s - a.s);
      const waitAt = t0 + atWait;
      const mergeAt = t0 + merge;
      const tr = spur.track;
      segs.push(
        { t0, t1: dropAt, track: tr, s0: 0, s1: a.s, lot: carried },
        {
          t0: dropAt,
          t1: dropAt + H,
          track: tr,
          s0: a.s,
          s1: a.s,
          hoist: 'drop',
          port: a.id,
          lot: carried,
        },
        { t0: dropAt + H, t1: pickAt, track: tr, s0: a.s, s1: b.s },
        {
          t0: pickAt,
          t1: pickAt + H,
          track: tr,
          s0: b.s,
          s1: b.s,
          hoist: 'pick',
          port: b.id,
          lot: picked,
        },
        { t0: pickAt + H, t1: waitAt, track: tr, s0: b.s, s1: spur.len - MERGE_GAP, lot: picked },
        {
          t0: waitAt,
          t1: mergeAt - ms(MERGE_GAP),
          track: tr,
          s0: spur.len - MERGE_GAP,
          s1: spur.len - MERGE_GAP,
          lot: picked,
        },
        {
          t0: mergeAt - ms(MERGE_GAP),
          t1: mergeAt,
          track: tr,
          s0: spur.len - MERGE_GAP,
          s1: spur.len,
          lot: picked,
        },
        {
          t0: mergeAt,
          t1: t0 + period,
          track: 'IB',
          s0: spur.sOut,
          s1: spur.sOut + back,
          lot: picked,
        }
      );
      ports.push(
        { port: a.id, lot: carried, from: dropAt + H / 2, until: dropAt + H / 2 + PORT_STAY_MS },
        { port: b.id, lot: picked, from: pickAt + H / 2 - PORT_STAY_MS, until: pickAt + H / 2 }
      );
    }
    const start = first + k0 * period;
    const end = first + (k1 + 1) * period;
    vehicles.push({
      id,
      before: { t: start, s: spur.sIn },
      after: { t: end, s: spur.sIn },
      segs,
    });
    moving++;
  });
  return { now: from, speed: v, hoistS, vehicles, ports, stockers: {}, moving };
};
