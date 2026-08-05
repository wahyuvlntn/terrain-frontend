import { TrashDeleteFill } from '@digital-twin/icons';
import clsx from 'clsx';

import styles from './theme-card.module.scss';

type ThemeCardProps = {
  name: string;
  colors: string[];
  onClick: () => void;
  selected: boolean;
  onDelete?: () => void;
  hasDeletePermission: boolean;
};

export const ThemeCard = ({
  name,
  colors,
  onClick,
  selected,
  onDelete,
  hasDeletePermission,
}: ThemeCardProps) => {
  return (
    <div
      className={clsx(styles['theme-card'], selected && styles.selected)}
      onClick={onClick}
    >
      <div className={styles['title-container']}>
        <span className={styles.title} title={name}>
          {name}
        </span>
        {selected && onDelete && hasDeletePermission ? (
          <TrashDeleteFill onClick={onDelete} />
        ) : null}
      </div>

      <div className={styles.colors}>
        {colors.map((color, index) => (
          <div
            key={index}
            className={styles.color}
            style={{ background: color }}
          />
        ))}
      </div>
    </div>
  );
};
