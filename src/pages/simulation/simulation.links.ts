import { REPLAY_PARAM, TIME_PARAM, VARIANT_PARAM } from '../digital-twin/digital-twin.source';
import { SimJobOrigin, SimJobOriginEnum, SimJobStatus } from './api/simulation.api';

/** Status filters of the job list (`?status=<key>`) */
export const STATUS_FILTERS: { key: string; label: string; statuses: SimJobStatus[] }[] = [
  { key: 'all', label: 'All statuses', statuses: [] },
  { key: 'approval', label: 'Needs approval', statuses: ['PROPOSED'] },
  { key: 'active', label: 'Queued / running', statuses: ['QUEUED', 'RUNNING', 'ANALYZING'] },
  { key: 'succeeded', label: 'Succeeded', statuses: ['SUCCEEDED'] },
  { key: 'failed', label: 'Failed', statuses: ['FAILED'] },
  { key: 'closed', label: 'Rejected / cancelled', statuses: ['REJECTED', 'CANCELLED'] },
];

const STATUS_KEYS = STATUS_FILTERS.map((f) => f.key);

const oneOf = <T extends string>(raw: string | null, values: readonly T[], fallback: T): T =>
  (values as readonly string[]).includes(raw ?? '') ? (raw as T) : fallback;

/** The job list's filters in the URL (`?status=approval&origin=agent`); unknown values: all */
export const jobFilterFromUrl = (params: URLSearchParams) => ({
  statusKey: oneOf(params.get('status'), STATUS_KEYS, 'all'),
  origin: oneOf<SimJobOrigin | ''>(params.get('origin'), SimJobOriginEnum.options, ''),
});

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
