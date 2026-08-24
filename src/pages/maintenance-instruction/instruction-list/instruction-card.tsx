import { clsx } from 'clsx';
import { format } from 'date-fns';
import { NavLink, useLocation } from 'react-router-dom';

import { TInstruction } from '../api';
import styles from './instruction-card.module.scss';

export const InstructionCard = ({
  description,
  name,
  id,
  timestamp,
  createdBy,
  // TODO: remove not use
  // typeName,
}: TInstruction) => {
  const location = useLocation();
  return (
    <NavLink
      to={{
        pathname: id.toString(),
        search: location.search,
      }}
      state={{
        fromList: true,
      }}
      className={({ isActive }) => clsx(styles.InstructionCard, isActive && styles.active)}
    >
      <div className={styles.InstructionCard__Header}>
        <div className={styles.InstructionCard__NameTypeContainer}>
          <span className={styles.InstructionCard__Name}>{name}</span>
        </div>
        <span className={styles.InstructionCard__Timestamp}>
          {format(new Date(timestamp), 'dd MMMM yyyy')}
        </span>
      </div>
      <span className={styles.InstructionCard__Author}>{`by ${createdBy}`}</span>
      <div className={styles.InstructionCard__Description}>{description || '-'}</div>
    </NavLink>
  );
};
