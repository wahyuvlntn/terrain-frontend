import { COLOR, ConditionEnum, InfoTooltip, Metric, StatusEnum } from '@digital-twin/components';
import clsx from 'clsx';
import { ReactNode } from 'react';

import styles from './overlay.module.scss';

/**
 * Small building blocks shared by the twin's floating cards: KPI tiles (the app's `Metric`),
 * status / condition badge colours, section titles with an info tooltip and empty states. The
 * card's tabs are in card-tabs.tsx.
 */

type BadgeColor =
  | 'running'
  | 'idle'
  | 'unplanned-down'
  | 'planned-down'
  | 'offline'
  | 'normal'
  | 'warning'
  | 'critical';

const STATUS_BADGE: Record<string, BadgeColor> = {
  [StatusEnum.enum.RUNNING]: 'running',
  [StatusEnum.enum.IDLE]: 'idle',
  [StatusEnum.enum['UNPLANNED DOWN']]: 'unplanned-down',
  [StatusEnum.enum['PLANNED DOWN']]: 'planned-down',
  [StatusEnum.enum.OFFLINE]: 'offline',
  DOWN: 'unplanned-down',
};

const CONDITION_BADGE: Record<string, BadgeColor> = {
  [ConditionEnum.enum.NORMAL]: 'normal',
  [ConditionEnum.enum.WARNING]: 'warning',
  [ConditionEnum.enum.CRITICAL]: 'critical',
  [ConditionEnum.enum.OFFLINE]: 'offline',
};

/** `Badge` colour of an equipment status or a condition (unknown: offline) */
export const stateBadgeColor = (value: string | null | undefined): BadgeColor =>
  (value && (STATUS_BADGE[value] ?? CONDITION_BADGE[value])) || 'offline';

type TwinMetricProps = {
  title: string;
  value: string;
  unit?: string;
  /** fill colour of a tile that signals something (warning, critical); neutral otherwise */
  tone?: string | null;
  /** hover text with the exact figures */
  hint?: string;
};

/** KPI tile: the app's `Metric`, sized for a floating card */
export const TwinMetric = ({ title, value, unit, tone, hint }: TwinMetricProps) => (
  <Metric
    title={title}
    value={value}
    unit={unit}
    borderColor={tone ?? COLOR.backgroundDefault}
    containerClassName={clsx(styles.metric, !tone && styles['metric--neutral'])}
    tooltipText={hint}
  />
);

type SectionTitleProps = {
  title: string;
  /** explanation behind the info icon */
  info?: ReactNode;
  /** right-aligned extras (a badge, a count) */
  children?: ReactNode;
};

export const SectionTitle = ({ title, info, children }: SectionTitleProps) => (
  <div className={styles.section__title}>
    <h4>{title}</h4>
    {info ? <InfoTooltip title={title} content={info} /> : null}
    {children ? <div className={styles.section__extra}>{children}</div> : null}
  </div>
);

export const Empty = ({ children }: { children: ReactNode }) => (
  <div className={styles.empty}>{children}</div>
);
