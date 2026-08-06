import { CloudUpload, ImagePlaceholder, Pencil } from '@digital-twin/icons';
import appIcon from '@digital-twin/images/app-icon.svg';
import { getURL, t } from '@digital-twin/utils';
import { useContext, useId } from 'react';
import { Control, Controller, FieldValues, Path } from 'react-hook-form';

import { ThemeContext } from '../../../..';
import styles from './upload-logo.module.scss';

type UploadLogoProps<T extends FieldValues> = {
  control: Control<T>;
  registered: Path<T>;
  onResetLogo: () => void;
  hasEditPermission: boolean;
};

export const UploadLogo = <T extends FieldValues>({
  registered,
  control,
  onResetLogo,
  hasEditPermission,
}: UploadLogoProps<T>) => {
  const {
    colors: { backgroundLowest },
  } = useContext(ThemeContext);

  const id = useId();

  const { logo } = useContext(ThemeContext);

  return (
    <Controller
      render={({ field: { value, onChange, ...field }, fieldState }) => {
        const logoSrc = value?.[0]
          ? URL.createObjectURL(value?.[0])
          : logo === null
          ? appIcon
          : `${getURL()}${logo}`;

        return (
          <div className={styles['upload-logo']}>
            <input
              {...field}
              value={value?.[0]?.fileName}
              onChange={(event) => onChange(event.target.files)}
              id={id}
              type={'file'}
              accept={'image/png, image/gif, image/jpeg, image/jpg'}
              style={{
                width: value ? 0 : '100%',
                height: value ? 0 : '100%',
              }}
            />
            {!fieldState.isTouched || (value?.[0] && fieldState.isTouched) ? (
              <>
                <img
                  alt={'Logo'}
                  src={logoSrc}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = ImagePlaceholder(backgroundLowest);
                  }}
                />
                {fieldState.error ? (
                  <div className={styles['error-message']}>
                    {fieldState.error.message}
                  </div>
                ) : null}
                {hasEditPermission ? (
                  <div className={styles['update-container']}>
                    <Pencil />
                    <div className={styles['update-buttons']}>
                      <label htmlFor={id}>
                        {/*TODO: missing translation*/}
                        <span>{t('common.change')}</span>
                      </label>
                      <span onClick={onResetLogo}>{t('common.remove')}</span>
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <label htmlFor={id} className={styles['upload-button']}>
                  <CloudUpload />
                  <span>{t('common.upload')}</span>
                </label>
                <span className={styles['text-title']}>
                  {t('common.upload_logo_text')}
                </span>
                <span className={styles['text-desc']}>
                  {t('common.max')} 270 x 100 Pixels
                </span>
              </>
            )}
          </div>
        );
      }}
      name={registered}
      control={control}
    />
  );
};
