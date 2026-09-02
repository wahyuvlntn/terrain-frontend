import clsx from 'clsx';
import styles from './current-maintenance-order.module.scss';

interface CurrentMaintenanceOrderProps {
  orderName: string;
}

export const CurrentMaintenanceOrder = ({ orderName }: CurrentMaintenanceOrderProps) => {
  return (
    <div
      className={clsx(styles['current-maintenance-order'], styles['ellipsis'])}
      title={orderName}
    >
      {orderName}
    </div>
  );
};
