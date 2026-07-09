import { InformationCircle } from '@digital-twin/icons';
import { t } from '@digital-twin/utils';
import clsx from 'clsx';
import { ReactNode, useState } from 'react';

import { Popup } from '../navigation';
import styles from './legend.module.scss';

type LegendProps = {
  children: ReactNode;
  className?: string;
};

export const Legend = ({ children, className }: LegendProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <InformationCircle
        onClick={() => setOpen(true)}
        className={styles.button}
        style={{ minWidth: 24 }}
      />
      <Popup
        title={t('common.legend_information')}
        icon={<InformationCircle />}
        open={open}
        onClose={() => setOpen(false)}
        width={1192}
        background={'dark'}
      >
        <div className={clsx(styles.legend, className)}>{children}</div>
      </Popup>
    </>
  );
};
