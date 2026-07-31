import { FlowsheetFill } from '@digital-twin/icons';
import {
  createTranslationKey,
  t,
  useLanguageSwitcher,
  useVerticalLimit,
} from '@digital-twin/utils';
import { useEffect, useMemo, useState } from 'react';
import { SetURLSearchParams } from 'react-router-dom';
import { Link } from 'react-router-dom';

import { Column, Table } from '../../../../../data';
import { Dropdown, DropdownOption, Search } from '../../../../../input';
import { Container } from '../../../../../layout';
import { Pagination } from '../../../../../navigation';
import { Loading } from '../../../../../others';
import { useEquipmentConnections } from '../hooks/model';
import { EquipmentConnectionEntryType } from '../schemas';
import { LicenseStatus as LicenseStatusComponent } from './license-status';
import { LicenseType as LicenseTypeComponent } from './license-type';
import style from './model-details.module.scss';

// Constants
const PREFIX = 'equipment_connection_';
const ITEM_HEIGHT = 45;
const OFFSET = 36;

enum LicenseType {
  BASE = 'Base',
  EQUIPMENT = 'Equipment',
  UNLICENSED = 'Not Licensed',
}

enum LicenseStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
}

export const EquipmentConnection = ({
  selectedId,
  parametersCount,
  search,
  page,
  sortKey,
  order,
  searchParams,
  setSearchParams,
}: {
  selectedId: number | undefined;
  parametersCount: number | undefined;
  search: string;
  page: number;
  sortKey: string;
  order: string;
  searchParams: URLSearchParams;
  setSearchParams: SetURLSearchParams;
}) => {
  const { currentLanguage } = useLanguageSwitcher();

  const ALL_OPTION: DropdownOption = { value: 'all', label: t('common.all') };

  const licenseTypes: DropdownOption[] = [
    ALL_OPTION,
    { value: LicenseType.BASE, label: t('common.base') },
    { value: LicenseType.EQUIPMENT, label: t('common.equipment') },
    { value: LicenseType.UNLICENSED, label: t('common.not_licensed') },
  ];

  const licenseStatuses: DropdownOption[] = [
    ALL_OPTION,
    { value: LicenseStatus.ACTIVE, label: t('common.active') },
    { value: LicenseStatus.INACTIVE, label: t('common.inactive') },
  ];

  // For responsive limit
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  const limit = useVerticalLimit({
    container,
    itemHeight: ITEM_HEIGHT,
    offset: OFFSET,
  });

  const { data, isLoading } = useEquipmentConnections(selectedId);

  const [filter, setFilter] = useState({
    licenseType: ALL_OPTION.value,
    licenseStatus: ALL_OPTION.value,
  });

  const filteredEntries = useMemo(() => {
    if (!selectedId || !data) {
      return undefined;
    }

    return data.filter(({ name, license_type, license_is_active }) => {
      const condition1 = name.toLowerCase().includes(search.toLowerCase());

      const condition2 =
        filter.licenseType === ALL_OPTION.value ||
        (filter.licenseType === LicenseType.BASE && license_type === 'base') ||
        (filter.licenseType === LicenseType.EQUIPMENT &&
          license_type === 'equipment') ||
        (filter.licenseType === LicenseType.UNLICENSED && license_type == null);

      const condition3 =
        filter.licenseStatus === ALL_OPTION.value ||
        (filter.licenseStatus === LicenseStatus.ACTIVE && license_is_active) ||
        (filter.licenseStatus === LicenseStatus.INACTIVE && !license_is_active);

      return condition1 && condition2 && condition3;
    });
  }, [
    selectedId,
    data,
    search,
    filter.licenseType,
    filter.licenseStatus,
    ALL_OPTION.value,
  ]);

  const orderedEntries = useMemo(() => {
    if (!filteredEntries) {
      return undefined;
    }

    const copied = [...filteredEntries];

    let compareFn: (
      a: EquipmentConnectionEntryType,
      b: EquipmentConnectionEntryType
    ) => number;

    if (sortKey === 'license_type' && order === 'desc') {
      compareFn = (a, b) => {
        const aValue = a.license_type ? (a.license_type === 'base' ? 0 : 1) : 2;
        const bValue = b.license_type ? (b.license_type === 'base' ? 0 : 1) : 2;
        return bValue - aValue;
      };
    } else if (sortKey === 'license_type' && order === 'asc') {
      compareFn = (a, b) => {
        const aValue = a.license_type ? (a.license_type === 'base' ? 0 : 1) : 2;
        const bValue = b.license_type ? (b.license_type === 'base' ? 0 : 1) : 2;
        return aValue - bValue;
      };
    } else if (sortKey === 'license_status' && order === 'desc') {
      compareFn = (a, b) => {
        const aValue = a.license_is_active ? 0 : 1;
        const bValue = b.license_is_active ? 0 : 1;
        return bValue - aValue;
      };
    } else if (sortKey === 'license_status' && order === 'asc') {
      compareFn = (a, b) => {
        const aValue = a.license_is_active ? 0 : 1;
        const bValue = b.license_is_active ? 0 : 1;
        return aValue - bValue;
      };
    } else if (sortKey === 'parameter_used' && order === 'desc') {
      compareFn = (a, b) => b.mapped_params - a.mapped_params;
    } else if (sortKey === 'parameter_used' && order === 'asc') {
      compareFn = (a, b) => a.mapped_params - b.mapped_params;
    } else if (sortKey === 'equipment' && order === 'desc') {
      compareFn = (a, b) => -1 * a.name.localeCompare(b.name);
    } else {
      compareFn = (a, b) => a.name.localeCompare(b.name);
    }

    copied.sort(compareFn);
    return copied;
  }, [filteredEntries, sortKey, order]);

  useEffect(() => {
    if (filteredEntries == null || !limit) {
      return;
    }

    const totalPage = Math.ceil(filteredEntries.length / limit);

    if (page > totalPage) {
      setSearchParams((prev) => {
        prev.delete(`${PREFIX}page`);
        return new URLSearchParams(prev);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredEntries?.length, limit, page]);

  const rows = useMemo(() => {
    if (!orderedEntries || !limit) {
      return [];
    }

    const max = parametersCount || 0;

    return orderedEntries
      .slice((page - 1) * limit, page * limit)
      .map(
        ({
          alias,
          name,
          license_type,
          license_is_active,
          license_status,
          mapped_params,
        }) => {
          return {
            id: alias,
            equipment: (
              <Link
                className={style['equipment-name']}
                to={`../equipment-manager?selected=${alias}`}
              >
                {name}
              </Link>
            ),
            license_type: (
              <div className={style['equipment-connection__license-item']}>
                <LicenseTypeComponent type={license_type} width="fit-content" />
              </div>
            ),
            license_status: (
              <div className={style['equipment-connection__license-item']}>
                <LicenseStatusComponent
                  isActive={license_is_active}
                  status={t(
                    `common.${
                      license_status
                        ? createTranslationKey(license_status)
                        : 'not_found'
                    }`
                  )}
                  width="fit-content"
                />
              </div>
            ),
            parameter_used: `${Math.min(
              mapped_params,
              max
            ).toLocaleString()} / ${max.toLocaleString()}`,
          };
        }
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderedEntries, page, parametersCount, limit, currentLanguage]);

  const columns: Column[] = useMemo(
    () => [
      {
        key: 'equipment',
        name: t('common.equipment'),
        width: 150,
        showOrderIcon: true,
        sortState:
          sortKey === 'equipment' && order === 'asc'
            ? true
            : sortKey === 'equipment' && order === 'desc'
            ? false
            : undefined,
      },
      {
        key: 'license_type',
        name: t('common.license'),
        alignment: 'center',
        width: 150,
        showOrderIcon: true,
        sortState:
          sortKey === 'license_type' && order === 'asc'
            ? true
            : sortKey === 'license_type' && order === 'desc'
            ? false
            : undefined,
      },
      {
        key: 'license_status',
        name: t('common.license_status'),
        alignment: 'center',
        width: 150,
        showOrderIcon: true,
        sortState:
          sortKey === 'license_status' && order === 'asc'
            ? true
            : sortKey === 'license_status' && order === 'desc'
            ? false
            : undefined,
      },
      {
        key: 'parameter_used',
        name: t('common.parameter_used'),
        alignment: 'center',
        width: 170,
        showOrderIcon: true,
        sortState:
          sortKey === 'parameter_used' && order === 'asc'
            ? true
            : sortKey === 'parameter_used' && order === 'desc'
            ? false
            : undefined,
      },
    ],
    [sortKey, order, currentLanguage]
  );

  return (
    <Container
      icon={<FlowsheetFill />}
      title={t('common.equipment_connection')}
      className={style['model-details-cell']}
      background={'none'}
    >
      <div className={style['equipment-connection']}>
        <div className={style['equipment-connection__filters']}>
          <Search
            label={t('common.equipment')}
            value={search}
            onChange={(search) => {
              setSearchParams((prev) => {
                if (search) {
                  prev.set(`${PREFIX}search`, search);
                } else {
                  prev.delete(`${PREFIX}search`);
                }
                return new URLSearchParams(prev);
              });
            }}
            placeholder="Search..."
            width="0"
            flex="200 0 0"
            background={'dark'}
          />
          <Dropdown
            label={t('common.license_type')}
            value={filter.licenseType}
            options={licenseTypes}
            onChange={(licenseType) => {
              setFilter((prev) => ({ ...prev, licenseType }));
            }}
            wrapperStyles={{
              flex: '70 0 0',
            }}
            background={'dark'}
          />
          <Dropdown
            label={t('common.license_status')}
            value={filter.licenseStatus}
            options={licenseStatuses}
            onChange={(licenseStatus) => {
              setFilter((prev) => ({ ...prev, licenseStatus }));
            }}
            wrapperStyles={{
              flex: '70 0 0',
            }}
            background={'dark'}
          />
        </div>
        <div
          className={style['equipment-connection__table']}
          ref={setContainer}
        >
          <Loading isLoading={isLoading} />
          <Table
            width="100%"
            columns={columns}
            rows={rows}
            sortable
            handleSortColumn={(sortKey, isAscending) => {
              setSearchParams((prev) => {
                if (isAscending == null) {
                  prev.delete(`${PREFIX}sort_key`);
                  prev.delete(`${PREFIX}order`);
                } else {
                  prev.set(`${PREFIX}sort_key`, sortKey);
                  prev.set(`${PREFIX}order`, isAscending ? 'asc' : 'desc');
                }
                return new URLSearchParams(prev);
              });
            }}
          />
        </div>
        <div className={style['equipment-connection__pagination']}>
          <Pagination
            searchParams={searchParams}
            setSearchParams={setSearchParams}
            count={filteredEntries?.length || 0}
            limit={limit || 1}
            variant="arrow"
            searchParamsPrefix={PREFIX}
          />
        </div>
      </div>
    </Container>
  );
};
