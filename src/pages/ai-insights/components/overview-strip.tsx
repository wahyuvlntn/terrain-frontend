import { COLOR, InfoTooltip, Metric } from '@digital-twin/components';
import { ReactNode } from 'react';
import type { InsightTab } from '../ai-insights.hook';
import styles from '../ai-insights.module.scss';
import { fmtNum, RECOMMENDATION_STATUS, timeAgo, timeUntil, useNow } from '../ai-insights.utils';
import type { AiOverview } from '../api/ai-insights.api';
import { Pill } from './shared';

type TileProps = {
  title: string;
  value: string;
  unit?: ReactNode;
  /** bottom accent colour */
  accent: string;
  badge?: ReactNode;
  onClick?: () => void;
  hint?: string;
};

/** A KPI tile (the shared `Metric`); clickable tiles open their tab */
const Tile = ({ title, value, unit, accent, badge, onClick, hint }: TileProps) => {
  const metric = (
    <Metric
      title={title}
      titleIcon={badge}
      value={value}
      unit={unit}
      borderColor={COLOR.backgroundLow}
      containerClassName={styles.kpi}
      containerStyle={{ borderBottom: `4px solid ${accent}` }}
    />
  );
  return onClick ? (
    <button type="button" className={styles.kpi__button} onClick={onClick} title={hint}>
      {metric}
    </button>
  ) : (
    <div className={styles.kpi__button} title={hint}>
      {metric}
    </div>
  );
};

const OPTIMIZER_STATUS: Record<string, string> = {
  PENDING: 'Queued',
  RUNNING: 'Running',
  SUCCEEDED: 'Succeeded',
  FAILED: 'Failed',
  SKIPPED: 'Skipped',
};

type OverviewStripProps = {
  data?: AiOverview;
  isError: boolean;
  onOpen: (tab: InsightTab, selection?: number) => void;
};

/**
 * Headline numbers of the AI services: the latest recommendation, active faults and anomalies,
 * the document library, the optimizer schedule and today's Gemini spend. Tiles open their tab.
 */
export const OverviewStrip = ({ data, isError, onOpen }: OverviewStripProps) => {
  const now = useNow(30_000);

  if (!data) {
    const placeholder = isError ? 'n/a' : '…';
    return (
      <div className={styles.strip} aria-busy={!isError}>
        {['Recommendation', 'Active faults', 'Active anomalies', 'Documents', 'Optimizer'].map(
          (title) => (
            <Tile key={title} title={title} value={placeholder} accent={COLOR.borderLight} />
          )
        )}
        <Tile title="AI budget today" value={placeholder} accent={COLOR.borderLight} />
      </div>
    );
  }

  const rec = data.recommendation;
  const recStatus = rec ? RECOMMENDATION_STATUS[rec.status] : null;
  const { todayUsd, limitUsd } = data.budget;
  const used = todayUsd !== null && limitUsd ? Math.min(todayUsd / limitUsd, 1) : null;
  const budgetColor =
    used === null
      ? COLOR.borderLight
      : used >= 1
        ? COLOR.conditionCriticalPrimary
        : used >= 0.8
          ? COLOR.conditionWarningPrimary
          : COLOR.conditionNormalPrimary;
  const optimizer = data.optimizer;

  return (
    <div className={styles.strip}>
      <Tile
        title="Recommendation"
        badge={recStatus ? <Pill color={recStatus.color}>{recStatus.text}</Pill> : undefined}
        value={
          rec ? (rec.savingsKw !== null ? `−${fmtNum(rec.savingsKw, 0)}` : `#${rec.id}`) : 'None'
        }
        unit={
          rec?.savingsKw !== null && rec
            ? `kW${rec.savingsPct !== null ? ` · ${fmtNum(rec.savingsPct, 1)} %` : ''}`
            : undefined
        }
        accent={rec ? COLOR.brandSurfaceDefaultPrimary : COLOR.borderLight}
        onClick={() => onOpen('recommendations', rec?.id)}
        hint={rec ? `Recommendation #${rec.id} · ${timeAgo(rec.createdAt, now)}` : undefined}
      />
      <Tile
        title="Active faults"
        value={String(data.faults.active)}
        unit={`· ${data.faults.last24h} in 24 h`}
        accent={data.faults.active ? COLOR.conditionCriticalPrimary : COLOR.conditionNormalPrimary}
        onClick={() => onOpen('faults')}
      />
      <Tile
        title="Active anomalies"
        value={String(data.anomalies.active)}
        unit={`· ${data.anomalies.last24h} in 24 h`}
        accent={
          data.anomalies.active ? COLOR.conditionWarningPrimary : COLOR.conditionNormalPrimary
        }
        onClick={() => onOpen('anomalies')}
      />
      <Tile
        title="Documents"
        value={String(data.documents.ready)}
        unit={
          data.documents.failed
            ? `ready · ${data.documents.failed} failed`
            : data.documents.pending
              ? `ready · ${data.documents.pending} indexing`
              : 'ready'
        }
        accent={data.documents.failed ? COLOR.conditionWarningPrimary : COLOR.accentInfoPrimary}
        onClick={() => onOpen('documents')}
      />
      <Tile
        title="Optimizer"
        value={
          optimizer.status ? (OPTIMIZER_STATUS[optimizer.status] ?? optimizer.status) : 'Not run'
        }
        accent={
          optimizer.status === 'FAILED' ? COLOR.conditionWarningPrimary : COLOR.accentInfoPrimary
        }
        onClick={() => onOpen('recommendations')}
        hint={
          [
            optimizer.lastRunAt ? `Last run ${timeAgo(optimizer.lastRunAt, now)}` : '',
            optimizer.nextRunAt ? `next ${timeUntil(optimizer.nextRunAt, now)}` : '',
          ]
            .filter(Boolean)
            .join(', ') || undefined
        }
      />
      <div className={styles.kpi__budget}>
        <Tile
          title="AI budget today"
          value={`$${fmtNum(todayUsd, 2)}`}
          unit={limitUsd ? `of $${fmtNum(limitUsd, 2)}` : 'no limit'}
          accent={budgetColor}
        />
        <span className={styles.kpi__info}>
          <InfoTooltip
            title="AI budget"
            content={`Gemini spend today (assistant and maintenance instructions)${limitUsd ? ' against the daily budget' : '; no daily limit is set'}.`}
          />
        </span>
      </div>
    </div>
  );
};
