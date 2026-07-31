// For conditional styling
// Reusables
import { CheckDoneCircleFill, CloseDownErrorCircleFill } from '@digital-twin/icons';
import { t } from '@digital-twin/utils';
import clsx from 'clsx';

// Style
import style from './license-status.module.scss';

export const LicenseStatus = ({
  isActive,
  status,
  width,
}: {
  isActive?: boolean | null;
  status?: string | null;
  width?: string | number;
}) => {
  return (
    <div
      className={clsx(
        style['license-status'],
        isActive
          ? style['license-status--active']
          : style['license-status--inactive']
      )}
      style={{ width }}
    >
      {isActive ? (
        <CheckDoneCircleFill style={{ flexShrink: 0 }} />
      ) : (
        <CloseDownErrorCircleFill style={{ flexShrink: 0 }} />
      )}
      <span
        className={style['license-status__status']}
        title={status || t('common.not_licensed')}
      >
        {status || t('common.not_licensed')}
      </span>
    </div>
  );
};
