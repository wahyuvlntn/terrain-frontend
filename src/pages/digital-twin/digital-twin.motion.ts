/**
 * How the overhead hoist vehicles (OHT) and their FOUPs move in the FAB1 cleanroom. Change the
 * value and reload the twin page:
 *
 * - 'parametric': the vehicles follow the simulator's transport plans (digital_twin/getamhs every
 *   3 s): every pick, carry and drop is a simulated lot moving between a stocker and a tool.
 * - 'loop': a self-contained animation on the same rails, without backend data (nothing is
 *   fetched): one vehicle per bay spur drops the FOUP it carries at a load port, picks another one
 *   further along, waits at the end of the spur for its place on the interbay loop and rides round
 *   to its spur again; the other vehicles circulate on the loop (viewer/twin-amhs-loop.ts).
 */
export type AmhsMotion = 'parametric' | 'loop';

export const AMHS_MOTION: AmhsMotion = 'parametric';

/**
 * A late plan correction (the vehicle would jump) is shown as a glide of about this long instead
 * of a teleport; a correction farther than AMHS_GLIDE_MAX_M is taken at once.
 */
export const AMHS_GLIDE_S = 0.4;
export const AMHS_GLIDE_MAX_M = 8;

/**
 * The client clock the transport runs on (epoch ms): the page's monotonic clock, the one the
 * animation frames are stamped with. The server clock offset is measured on it too: Date.now() can
 * be set, drift away from it or count a computer's sleep differently, which would move the shown
 * time out of the plans the snapshots hold.
 */
export const amhsClock = () => performance.timeOrigin + performance.now();
