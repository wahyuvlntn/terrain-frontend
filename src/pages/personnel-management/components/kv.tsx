import clsx from 'clsx';
import type { ReactNode } from 'react';
import styles from './kv.module.scss';

interface KVProps {
  k: string;
  v: ReactNode;
  textClassName?: string;
}

export const KV = ({ k, v, textClassName }: KVProps) => {
  return (
    <div className={styles['kv']}>
      <span
        className={clsx(
          styles['kv__text'],
          styles['kv__text--k'],
          styles['ellipsis'],
          textClassName
        )}
        title={k}
      >
        {k}
      </span>
      <span
        className={clsx(
          styles['kv__text'],
          typeof v === 'string' && styles['kv__text--v'],
          styles['ellipsis'],
          textClassName
        )}
        title={typeof v === 'string' ? v : undefined}
      >
        {v}
      </span>
    </div>
  );
};
