/**
 * LEVO's pixel art (levo.tsx): parts of a 32 x 32 sprite, one character per pixel ('.' is clear),
 * placed at x / y. Expressions and effects are parts shown by mood (levo.module.scss).
 */

/** pixel character -> fill: theme tokens; the antenna bulb follows the mood (--levo-bulb) */
const FILL: Record<string, string> = {
  o: 'var(--afdd-neutral-surface-default)', // outline, pupils
  b: 'var(--afdd-pelorous-400)', // body
  s: 'var(--afdd-pelorous-600)', // body shade
  h: 'var(--afdd-pelorous-300)', // body light
  w: 'var(--afdd-pelorous-100)', // belly, snout
  v: 'var(--afdd-pelorous-200)', // belly scales
  f: 'var(--afdd-lochmara-600)', // fins
  t: 'var(--afdd-lochmara-400)', // fin edges
  a: 'var(--levo-bulb)',
  A: 'var(--levo-bulb-light)',
  W: 'var(--afdd-neutral-text-title-heading)', // eye shine, bubbles
  p: 'var(--afdd-persimmon-300)', // blush
  m: 'var(--afdd-persimmon-700)', // open mouth
  r: 'var(--afdd-persimmon-400)', // tongue
  y: 'var(--afdd-condition-warning-primary)', // !
  R: 'var(--afdd-status-unplanned_down-primary)', // !!
  d: 'var(--afdd-lochmara-300)', // sweat drop
};

type Part = { x: number; y: number; rows: string };

export const PARTS = {
  shadow: {
    x: 10,
    y: 28,
    rows: `
..oooooooo..
oooooooooooo
..oooooooo..`,
  },
  tailA: {
    x: 20,
    y: 17,
    rows: `
.....oo...
....otto..
....ofto..
....obfo..
...obbso..
...obbso..
..obbsso..
oobbsso...
bbbsso....
oooo......`,
  },
  tailB: {
    x: 20,
    y: 17,
    rows: `
.......oo.
......otto
.....oftto
....obbfo.
...obbso..
...obbso..
..obbsso..
oobbsso...
bbbsso....
oooo......`,
  },
  finL: {
    x: 1,
    y: 7,
    rows: `
o......
oto....
otfo...
.otfoo.
ottffo.
.otffo.
otfffo.
.oofffo
...ooo.`,
  },
  finR: {
    x: 24,
    y: 7,
    rows: `
......o
....oto
...ofto
.oofto.
.offtto
.offto.
.offfto
offfoo.
.ooo...`,
  },
  stalk: {
    x: 15,
    y: 4,
    rows: `
oo
oo`,
  },
  bulb: {
    x: 14,
    y: 0,
    rows: `
.oo.
oAao
oaao
.oo.`,
  },
  head: {
    x: 7,
    y: 6,
    rows: `
....oooooooooo....
..oohhhbbbbbbboo..
.ohhhbbbbbbbbbbbo.
ohhbbbbbbbbbbbbbbo
ohbbbbbbbbbbbbbbbo
obbbbbbbbbbbbbbbso
obbbbbbbbbbbbbbbso
obbbbbbbbbbbbbbsso
obbbbwwwwwwwwbbsso
obbbwwwwwwwwwwbsso
.osbwwwwwwwwwwsso.
..ossswwwwwwssso..
...oooooooooooo...`,
  },
  body: {
    x: 10,
    y: 19,
    rows: `
obbwwwwwwbso
obbwwwwwwbso
obbvvvvvvbso
obbwwwwwwbso
obbvvvvvvbso
osbwwwwwwsso
.ossvvvvsso.
..oooooooo..`,
  },
  flipL: {
    x: 8,
    y: 20,
    rows: `
oo
tf
tf
oo`,
  },
  flipR: {
    x: 22,
    y: 20,
    rows: `
oo
fs
fs
oo`,
  },
  eyesOpen: {
    x: 11,
    y: 10,
    rows: `
Wo......Wo
oo......oo
oo......oo`,
  },
  eyesClosed: {
    x: 11,
    y: 12,
    rows: `
oo......oo`,
  },
  eyesHappy: {
    x: 10,
    y: 10,
    rows: `
.o........o.
o.o......o.o`,
  },
  eyesSquint: {
    x: 10,
    y: 10,
    rows: `
o..........o
.oo......oo.
o..........o`,
  },
  eyesWide: {
    x: 10,
    y: 9,
    rows: `
.oo......oo.
oWWo....oWWo
oWWo....oWWo
.oo......oo.`,
  },
  eyesUp: {
    x: 12,
    y: 9,
    rows: `
oW......oW
oo......oo
oo......oo`,
  },
  smile: {
    x: 14,
    y: 15,
    rows: `
o..o
.oo.`,
  },
  grin: {
    x: 14,
    y: 15,
    rows: `
oooo
omro
.oo.`,
  },
  gasp: {
    x: 15,
    y: 15,
    rows: `
oo
oo`,
  },
  scream: {
    x: 14,
    y: 14,
    rows: `
.oo.
omro
omro
.oo.`,
  },
  blush: {
    x: 9,
    y: 14,
    rows: `
pp............pp`,
  },
  sweat: {
    x: 23,
    y: 7,
    rows: `
.o.
odo
odo
.o.`,
  },
  bang: {
    x: 25,
    y: 0,
    rows: `
ooo
oyo
oyo
oyo
ooo
oyo
ooo`,
  },
  bang2: {
    x: 23,
    y: 0,
    rows: `
ooo.ooo
oRo.oRo
oRo.oRo
oRo.oRo
ooo.ooo
oRo.oRo
ooo.ooo`,
  },
  bubble: {
    x: 21,
    y: 0,
    rows: `
.ooooooooo.
oWWWWWWWWWo
oWWWWWWWWWo
oWWWWWWWWWo
.ooooooooo.
..oo.......`,
  },
  signalA: {
    x: 11,
    y: 0,
    rows: `
.A......A.
A........A
.A......A.`,
  },
  signalB: {
    x: 12,
    y: 0,
    rows: `
A......A
A......A`,
  },
  dot1: {
    x: 23,
    y: 2,
    rows: `
o`,
  },
  dot2: {
    x: 26,
    y: 2,
    rows: `
o`,
  },
  dot3: {
    x: 29,
    y: 2,
    rows: `
o`,
  },
} satisfies Record<string, Part>;

export type LevoPart = keyof typeof PARTS;

/** A part as one path per colour, a rectangle per run of pixels */
export const partPaths = ({ x, y, rows }: Part) => {
  const runs = new Map<string, string>();
  rows
    .split('\n')
    .filter(Boolean)
    .forEach((row, dy) => {
      for (let dx = 0; dx < row.length; ) {
        const ch = row[dx];
        let n = 1;
        while (row[dx + n] === ch) n++;
        if (ch !== '.') runs.set(ch, `${runs.get(ch) ?? ''}M${x + dx} ${y + dy}h${n}v1h${-n}z`);
        dx += n;
      }
    });
  return [...runs].map(([ch, d]) => ({ fill: FILL[ch], d }));
};
