import { t, useLanguageSwitcher } from '@digital-twin/utils';
import { useContext, useMemo } from 'react';

import { Dropdown, DropdownOption, Input } from '../../../../../..';
import { EquipmentLicensesCtx } from '../contexts';
import style from './license-dropdown.module.scss';
import { LicenseStatus } from './license-status';

// Constants
const UNSELECTED_OPTION: DropdownOption = {
  value: '',
  label: '---',
};

export const LicenseDropdown = ({
  value,
  onChange,
  assignedLicenseId,
  error,
  noData,
  background = 'default',
  readOnly,
}: {
  value: number | null;
  onChange?: (value: number | null) => void;
  assignedLicenseId?: number | null;
  error?: string;
  noData?: boolean;
  background?: 'dark' | 'default';
  readOnly?: boolean;
}) => {
  // Contexts
  const { options, records, ids } = useContext(EquipmentLicensesCtx);
  const { currentLanguage } = useLanguageSwitcher();

  // Add UNSELECTED option and
  const normalizedOptions = useMemo(() => {
    if (!options || !records) {
      return [UNSELECTED_OPTION];
    }

    // Add the assigned license id if it is not in the option
    if (assignedLicenseId) {
      const metadata = records[assignedLicenseId];

      if (metadata) {
        const option = options.find(
          ({ value }) => parseInt(value) === assignedLicenseId
        );

        if (!option) {
          const normalized = [
            ...options,
            {
              value: assignedLicenseId.toString(),
              label: metadata.name,
            },
          ];

          normalized.sort((a, b) => a.label.localeCompare(b.label));
          return [UNSELECTED_OPTION, ...normalized];
        }
      }
    }

    return [UNSELECTED_OPTION, ...options];
  }, [options, assignedLicenseId, records]);

  // Get the selected license's status
  const { id, name, isActive, status } = useMemo(() => {
    if (noData) {
      return {
        id: '',
        name: '',
        isActive: false,
        // status: 'Not Licensed',
        status: t('common.not_licensed'),
      };
    }

    if (!value || !records) {
      return {
        id: value == null ? '' : value.toString(),
        name: '---',
        isActive: false,
        status: value == null ? t('common.not_licensed') : t('common.invalid'),
      };
    }

    const metadata = records[value];

    if (!metadata) {
      return {
        id: value == null ? '' : value.toString(),
        name: '---',
        isActive: false,
        status: t('common.not_found'),
      };
    }

    return {
      id: value.toString(),
      name: metadata.name,
      isActive: metadata.l_active,
      // status: metadata.l_status, // TODO: need to modify backend response
      status: t(`common.${metadata.l_status.toLowerCase()}`), // transform to lower case and replace ' ' with '_'. Still need further check
    };
  }, [noData, value, records, currentLanguage]);

  return (
    <div className={style['license-dropdown']}>
      <div className={style['license-dropdown__dropdown']}>
        {noData ? (
          <Input
            label={t('common.license') + ':'}
            value="---"
            background={background}
            readOnly
          />
        ) : onChange ? (
          <Dropdown
            label={t('common.license') + ':'}
            options={normalizedOptions}
            value={id}
            onChange={(value) => {
              if (!value) {
                onChange(null);
              } else {
                onChange(Number(value));
              }
            }}
            disabled={!ids}
            error={error}
            searchable
            background={background}
            readOnly={readOnly}
          />
        ) : (
          <Input
            label={t('common.license') + ':'}
            value={name || '---'}
            background={background}
            readOnly
          />
        )}
      </div>
      <div className={style['license-dropdown__status']}>
        <LicenseStatus isActive={isActive} status={status} />
      </div>
    </div>
  );
};
