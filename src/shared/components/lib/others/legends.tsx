import clsx from 'clsx';
import React from 'react';

import styles from './legends.module.scss';

interface LegendsProps {
  wrapperProps?: React.ComponentProps<'div'>;
  itemProps?: React.ComponentProps<'div'>;
  data: { color: string; label: string }[];
}

export const Legends: React.FC<LegendsProps> = ({
  wrapperProps,
  data,
  itemProps,
}) => {
  return (
    <div
      {...wrapperProps}
      className={clsx(styles['legends'], wrapperProps?.className)}
    >
      {data.map((i, id) => (
        <div
          {...itemProps}
          key={id}
          className={clsx(styles['legend'], itemProps?.className)}
        >
          <div
            style={{ color: i.color }}
            className={styles['legend-color']}
          ></div>
          <span title={i.label}>{i.label}</span>
        </div>
      ))}
    </div>
  );
};
