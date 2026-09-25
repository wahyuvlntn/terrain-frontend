import { Badge, COLOR, InfoTooltip, Metric } from '@digital-twin/components';
import clsx from 'clsx';
import { ReactNode } from 'react';

import styles from '../production.module.scss';
import { BadgeColor, fmtPct, rating } from '../production.utils';

/** Compact status badge */
export const Pill = ({
  color,
  children,
  title,
}: {
  color: BadgeColor;
  children: ReactNode;
  title?: string;
}) => (
  <Badge color={color} variant="pill" className={styles.pill} title={title}>
    {children}
  </Badge>
);

/** Centred empty / loading state */
export const Empty = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={clsx(styles.empty, className)}>{children}</div>
);

/** Label / value pairs in a compact grid */
export const Facts = ({ items }: { items: { label: string; value: ReactNode }[] }) => (
  <dl className={styles.facts}>
    {items.map((it) => (
      <div key={it.label}>
        <dt>{it.label}</dt>
        <dd>{it.value}</dd>
      </div>
    ))}
  </dl>
);

export const RATING_COLOR = {
  normal: COLOR.conditionNormalPrimary,
  warning: COLOR.conditionWarningPrimary,
  critical: COLOR.conditionCriticalPrimary,
} as const;

/** A KPI tile (the shared `Metric`) with a bottom accent and an optional sub line */
export const Tile = ({
  title,
  value,
  unit,
  accent,
  sub,
  info,
}: {
  title: string;
  value: string;
  unit?: ReactNode;
  accent: string;
  sub?: ReactNode;
  info?: string;
}) => (
  <div className={styles.kpi__wrap} title={info}>
    <Metric
      title={title}
      titleIcon={info ? <InfoTooltip title={title} content={info} /> : undefined}
      value={value}
      unit={unit}
      borderColor={COLOR.backgroundLow}
      containerClassName={styles.kpi}
      containerStyle={{ borderBottom: `4px solid ${accent}` }}
    />
    {sub ? <div className={styles.kpi__sub}>{sub}</div> : null}
  </div>
);

/** A percentage with a small bar coloured by its rating */
export const FactorBar = ({
  value,
  kind = 'factor',
}: {
  value: number | null;
  kind?: 'oee' | 'factor';
}) => {
  const r = rating(value, kind);
  return (
    <div className={styles.bar}>
      <div className={styles.bar__track}>
        <div
          className={styles.bar__fill}
          style={{
            width: `${Math.max(0, Math.min(100, value ?? 0))}%`,
            background: r ? RATING_COLOR[r] : COLOR.borderDefault,
          }}
        />
      </div>
      <span className={styles.bar__value}>{fmtPct(value)}</span>
    </div>
  );
};
