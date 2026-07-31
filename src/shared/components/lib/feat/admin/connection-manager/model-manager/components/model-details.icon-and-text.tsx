// React builtins
// For cascading classnames
import clsx from 'clsx';
import { ReactNode } from 'react';

// Style
import style from './model-details.module.scss';

export const IconAndText = ({
  icon,
  text,
  type,
  disabled,
}: {
  icon: ReactNode;
  text: string;
  type?:
    | 'unplanned-down'
    | 'planned-down'
    | 'idle'
    | 'running'
    | 'property-new'
    | 'property-extended'
    | 'property-override';
  disabled?: boolean;
}) => {
  return (
    <div
      className={clsx(
        style['icon-and-text'],
        type && style[`icon-and-text--${type}`],
        disabled && style['disabled']
      )}
    >
      {icon}
      <span title={text}>{text}</span>
    </div>
  );
};
