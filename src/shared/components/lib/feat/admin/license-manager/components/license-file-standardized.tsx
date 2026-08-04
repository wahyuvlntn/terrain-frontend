import {
  CheckDoneCircleFill,
  CloudUploadFill,
  FolderOpenFill,
  SuccessNormalCheckCircleFill,
  TrashDeleteFill,
} from '@digital-twin/icons';
import { t } from '@digital-twin/utils';
import { FileFillIcon } from '@digital-twin/reusables';
import clsx from 'clsx';
import { useEffect, useId, useMemo, useState } from 'react';

import { COLOR } from '../../../../../index';
import { useToggle } from '../../../../hooks';
import { Popup } from '../../../../navigation';
import { useVerifyLicense } from '../hooks';
import { LicenseContentType } from '../schemas';
import styles from './license-file-standardized.module.scss';

export const LicenseFileStandardized = ({
  label,
  value,
  onChange,
  required,
}: {
  label?: string;
  value?: File | null;
  onChange: (value: File | null) => void;
  required?: boolean;
}) => {
  // Generate id for the file input
  const id = useId();

  // For verifying license file
  const verifyLicense = useVerifyLicense();

  // For displaying verification result
  const [result, setResult] = useState<LicenseContentType>();
  const [showResultPopup, toggleResultPopup] = useToggle(false);

  // Reset result whenever the file changes
  useEffect(() => {
    setResult(undefined);
  }, [value]);

  // Normalize result
  const normalizedResult = useMemo(() => {
    if (!result) {
      return null;
    }

    // Capitalize first letter of the license type
    const licenseType = result.type[0].toUpperCase() + result.type.slice(1);

    // Calculate remaining days
    let expiredAt = '---';
    let remainingDays: number | string = '---';

    if (result.expired_at) {
      expiredAt = new Date(result.expired_at).toLocaleString();

      const remainingMs = result.expired_at - Date.now();

      if (remainingMs > 0) {
        remainingDays =
          Math.round((remainingMs / (24 * 3600 * 1000)) * 100) / 100;
      }
    }

    return (
      <div className={styles['license-information']}>
        <div className={styles['license-information__result']}>
          <div className={styles['license-information__result__kv']}>
            <b>{t('common.license_key') + ':'}</b>
            <span>{result.key}</span>
          </div>
          <div className={styles['license-information__result__kv']}>
            <b>{t('common.expiry') + ':'}</b>
            <span>{expiredAt}</span>
          </div>
          <div className={styles['license-information__result__kv']}>
            <b>{t('common.remaining_days') + ':'}</b>
            <span>{remainingDays}</span>
          </div>
          <div className={styles['license-information__result__kv']}>
            <b>{t('common.type') + ':'}</b>
            <span>{licenseType}</span>
          </div>
          <div className={styles['license-information__result__kv']}>
            <b>{t('common.description') + ':'}</b>
            <span>{result.description}</span>
          </div>
          <div className={styles['license-information__result__kv']}>
            <b>{t('common.total_equipment') + ':'}</b>
            <span>{result.asset_keys.length.toLocaleString()}</span>
          </div>
        </div>
      </div>
    );
  }, [result]);

  return (
    <div className={styles['license-file']}>
      {label ? (
        <span className={styles['license-file__label']}>{label}</span>
      ) : null}
      <div className={styles['license-file__input']}>
        <div className={styles.wrapper}>
          <input
            id={id}
            type="file"
            accept=".bin"
            value=""
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onChange(file);
              }
            }}
            className={styles.fileInput}
            required={required}
          />
          <div className={clsx(styles.icon, value ? styles.icon__filled : '')}>
            {!value ? (
              <CloudUploadFill color={COLOR.neutralTextTitleHeading} />
            ) : (
              <FileFillIcon />
            )}
          </div>
          <div className={styles.upload__text}>
            <span>{t('common.upload_license_text')}</span>
          </div>
          {!value ? (
            <span className={styles.filetype__text}>
              {t('common.file_type')} (.bin)
            </span>
          ) : (
            <div className={styles.description__text}>
              <span>{value.name}</span>
              <span>{formatFileSizeText(value.size)}</span>
            </div>
          )}
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
            <div className={styles.input__label}>
              {!value && (
                <label htmlFor={id} className={styles.action__button}>
                  <FolderOpenFill />
                  <span>{t('common.browse')}</span>
                </label>
              )}
              {value && (
                <div
                  className={styles.action__button}
                  onClick={(e) => {
                    e.preventDefault();
                    onChange(null);
                  }}
                >
                  <TrashDeleteFill />
                  <span>{t('common.remove')}</span>
                </div>
              )}
            </div>
            {value ? (
              <div className={styles.input__label}>
                <div
                  className={styles.action__button}
                  onClick={(e) => {
                    e.preventDefault();

                    if (verifyLicense.isPending) {
                      return;
                    }

                    verifyLicense.mutate(
                      { license_file: value },
                      {
                        onSuccess: (result) => {
                          setResult(result);
                          toggleResultPopup();
                        },
                      }
                    );
                  }}
                >
                  <SuccessNormalCheckCircleFill />
                  <span>{t('common.verify')}</span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <Popup
        icon={<CheckDoneCircleFill />}
        title={t('common.license_verified')}
        open={!!value && showResultPopup}
        onClose={toggleResultPopup}
        variant="none"
        background="none"
      >
        {normalizedResult}
      </Popup>
    </div>
  );
};

function formatFileSizeText(bytes: number): string {
  if (bytes < 1024 * 1024) {
    // Less than 1 MB, show in KB
    return `${(bytes / 1024).toFixed(2)} KB`;
  } else {
    // 1 MB or greater, show in MB
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}
