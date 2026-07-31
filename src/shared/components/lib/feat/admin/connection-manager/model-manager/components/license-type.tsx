import { createTranslationKey, t } from '@digital-twin/utils';
import clsx from 'clsx';

import style from './license-type.module.scss';

export const LicenseType = ({
  type,
  width,
}: {
  type?: string | null;
  width?: string | number;
}) => {
  const normalizedType = type
    ? t(`common.${createTranslationKey(type)}`)
    : t('common.not_licensed');

  return (
    <div
      className={clsx(
        style['license-type'],
        type === 'base'
          ? style['license-type--base']
          : type === 'equipment'
          ? style['license-type--equipment']
          : style['license-type--not-licensed']
      )}
      style={{ width }}
    >
      <span className={style['license-type__type']} title={normalizedType}>
        {normalizedType}
      </span>
    </div>
  );
};
