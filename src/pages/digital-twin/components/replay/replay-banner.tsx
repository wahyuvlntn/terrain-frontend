import { Badge, Button, Dropdown } from '@digital-twin/components';
// `Exit` is exported by two icon sets (an ambiguous export at runtime): use Close
import { Close } from '@digital-twin/icons';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

import { ReplayClock, TwinReplay, useReplayTime } from '../../digital-twin.source';
import styles from './replay.module.scss';

/** Simulated time at the playhead (re-renders on every tick on its own) */
const ReplayTime = ({ clock }: { clock: ReplayClock }) => {
  const time = useReplayTime(clock);
  return <strong>{time ? format(time, 'dd MMM yyyy HH:mm:ss') : '--'}</strong>;
};

/** What the replay shows, or why it can't */
const statusText = (replay: TwinReplay) => {
  if (replay.error) return `Replay unavailable: ${replay.error}`;
  if (replay.isLoading) {
    return replay.index ? `Loading variant ${replay.variant ?? ''}…` : 'Loading the recorded run…';
  }
  const status = replay.job?.status;
  if (status === 'ANALYZING') return 'Recorded run · analysis still running';
  if (status === 'FAILED') return 'Run failed · frames recorded before the failure';
  if (status && status !== 'SUCCEEDED') return `Simulation ${status.toLowerCase()}`;
  return 'Recorded run · not live data';
};

/**
 * Banner over the twin while a simulation is replayed, so a replay is never mistaken for the live
 * plant: job, variant (switchable), simulated time, and the way back to live.
 */
export const ReplayBanner = ({ replay }: { replay: TwinReplay }) => {
  const navigate = useNavigate();
  const variants = replay.job?.variants ?? [];
  const title = `${replay.jobId !== null ? `Simulation #${replay.jobId}` : 'Simulation'}${
    replay.job ? ` · ${replay.job.title}` : ''
  }`;
  return (
    <section
      className={styles['replay-banner']}
      aria-label="Simulation replay"
      data-error={replay.error ? 'true' : undefined}
    >
      <Badge color="abnormal" className={styles['replay-banner__tag']}>
        Replay
      </Badge>
      <div className={styles['replay-banner__titles']}>
        <strong title={title}>{title}</strong>
        <span>{statusText(replay)}</span>
      </div>
      {variants.length > 1 ? (
        <div className={styles['replay-banner__field']}>
          <Dropdown
            label="Variant"
            labelPosition="left"
            value={replay.variant ?? ''}
            options={variants.map((v) => ({ value: v, label: v }))}
            onChange={replay.setVariant}
            variant="small"
            background="dark"
            wrapperStyles={{ width: 250 }}
            wrapperClassName={styles['replay-banner__dropdown']}
          />
        </div>
      ) : replay.variant ? (
        <div className={styles['replay-banner__field']}>
          <span>Variant</span>
          <b>{replay.variant}</b>
        </div>
      ) : null}
      {replay.index ? (
        <div className={styles['replay-banner__field']}>
          <span>Sim time</span>
          <ReplayTime clock={replay.clock} />
        </div>
      ) : null}
      <div className={styles['replay-banner__actions']}>
        {replay.jobId !== null ? (
          <Button
            color="default-secondary"
            className={styles['replay-banner__btn']}
            onClick={() => navigate(`/simulation?job=${replay.jobId}`)}
          >
            Simulation details
          </Button>
        ) : null}
        <Button icon={<Close />} className={styles['replay-banner__btn']} onClick={replay.exit}>
          Exit replay
        </Button>
      </div>
    </section>
  );
};
