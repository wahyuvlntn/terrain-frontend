import clsx from 'clsx';

import styles from '../ai-assistant.module.scss';

type BudgetMeterProps = { budget: { todayUsd: number; limitUsd: number | null } | null };

/** Today's AI spend against the daily limit (from the latest answer's usage report) */
export const BudgetMeter = ({ budget }: BudgetMeterProps) => {
  // the "answers can be wrong" note is behind the header's info icon
  if (!budget) return null;
  const { todayUsd, limitUsd } = budget;
  const share = limitUsd && limitUsd > 0 ? Math.min(todayUsd / limitUsd, 1) : null;
  return (
    <div className={clsx(styles.budget, share !== null && share >= 0.8 && styles['budget--high'])}>
      <span>
        AI budget today: ${todayUsd.toFixed(2)}
        {limitUsd ? ` of $${limitUsd.toFixed(2)}` : ''}
      </span>
      {share !== null ? (
        <div
          className={styles.budget__bar}
          role="meter"
          aria-label="AI budget used today"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(share * 100)}
        >
          <span style={{ width: `${share * 100}%` }} />
        </div>
      ) : null}
    </div>
  );
};
