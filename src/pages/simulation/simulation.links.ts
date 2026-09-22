import { REPLAY_PARAM, TIME_PARAM, VARIANT_PARAM } from '../digital-twin/digital-twin.source';

/** Page of the simulation jobs; `jobId` opens a job's details */
export const simulationLink = (jobId?: number) =>
  jobId === undefined ? '/simulation' : `/simulation?job=${jobId}`;

/**
 * Digital twin replaying a simulation job: a variant (default the job's first) from a moment of
 * the run (UTC ISO; default its start).
 */
export const replayLink = (jobId: number, variant?: string | null, at?: string | null) => {
  const params = new URLSearchParams({ [REPLAY_PARAM]: String(jobId) });
  if (variant) params.set(VARIANT_PARAM, variant);
  if (at) params.set(TIME_PARAM, at);
  return `/digital-twin?${params.toString()}`;
};
