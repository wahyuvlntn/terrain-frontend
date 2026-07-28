import { useLanguageSwitcher, useVerticalLimit } from '@digital-twin/utils';
import { t } from '@digital-twin/utils';
import { useEffect, useMemo, useState } from 'react';
import { SetURLSearchParams } from 'react-router-dom';

import { Column, Table } from '../../../../../data';
import { Dropdown, DropdownOption, Search } from '../../../../../input';
import { Pagination } from '../../../../../navigation';
import { Loading } from '../../../../../others';
import { useConnectedEquipments } from '../hooks';
import { ConnectedEquipmentEntryType } from '../schemas';
import style from './connected-equipments.module.scss';

// Constants
const PREFIX = 'connected_equipments_';
const ITEM_HEIGHT = 40;
const OFFSET = 44;

export const ConnectedEquipments = ({
  gatewayAlias,
  search,
  page,
  sortKey,
  order,
  searchParams,
  setSearchParams,
}: {
  gatewayAlias?: string;
  search: string;
  page: number;
  sortKey: string;
  order: string;
  searchParams: URLSearchParams;
  setSearchParams: SetURLSearchParams;
}) => {
  const { currentLanguage } = useLanguageSwitcher();

  const ALL_OPTION: DropdownOption = useMemo(
    () => ({ value: '', label: t('common.all') }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentLanguage]
  );

  // States
  const [filterModel, setFilterModel] = useState('');
  const [filterLocation, setFilterLocation] = useState('');

  // Reset filters whenever the gatewayAlias changes
  useEffect(() => {
    setFilterModel('');
    setFilterLocation('');
  }, [gatewayAlias]);

  // Hooks
  const { data, isLoading } = useConnectedEquipments(gatewayAlias);

  // For responsive limit
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  const limit = useVerticalLimit({
    container,
    itemHeight: ITEM_HEIGHT,
    offset: OFFSET,
  });

  // Derived values
  const modelOptions = useMemo(() => {
    if (!gatewayAlias || !data?.models) {
      return [ALL_OPTION];
    }

    const modelOptions: DropdownOption[] = [];

    for (const modelId in data.models) {
      const modelName = data.models[modelId];
      modelOptions.push({ value: modelId, label: modelName });
    }

    modelOptions.sort((a, b) => a.label.localeCompare(b.label));
    modelOptions.unshift(ALL_OPTION);

    return modelOptions;
  }, [gatewayAlias, data?.models, ALL_OPTION]);

  const locationNames = useMemo(() => {
    if (!gatewayAlias || !data?.locations) {
      return undefined;
    }

    const locationNames: Record<string, string> = {};

    for (const locationId in data.locations) {
      locationNames[locationId] = displayLocationNames(
        data.locations[locationId]
      );
    }

    return locationNames;
  }, [gatewayAlias, data?.locations]);

  const locationOptions = useMemo(() => {
    if (!locationNames) {
      return [ALL_OPTION];
    }

    const locationOptions: DropdownOption[] = [];

    for (const locationId in locationNames) {
      const locationName = locationNames[locationId];
      locationOptions.push({
        value: locationId,
        label: locationName,
      });
    }

    locationOptions.sort((a, b) => a.label.localeCompare(b.label));
    locationOptions.unshift(ALL_OPTION);

    return locationOptions;
  }, [locationNames, ALL_OPTION]);

  const filteredEquipments = useMemo(() => {
    if (!gatewayAlias || !data?.equipments) {
      return undefined;
    }

    const normalizedSearch = search.toLowerCase();

    return data.equipments.filter(({ name, model_id, location_id }) => {
      const condition1 =
        !normalizedSearch || name.toLowerCase().includes(normalizedSearch);
      const condition2 = !filterModel || model_id === parseInt(filterModel);
      const condition3 =
        !filterLocation || location_id === parseInt(filterLocation);

      return condition1 && condition2 && condition3;
    });
  }, [gatewayAlias, data?.equipments, search, filterModel, filterLocation]);

  const orderedEquipments = useMemo(() => {
    if (!filteredEquipments) {
      return undefined;
    }

    const copied = [...filteredEquipments];

    let compareFn: (
      a: ConnectedEquipmentEntryType,
      b: ConnectedEquipmentEntryType
    ) => number;

    if (sortKey === 'model' && order === 'desc') {
      compareFn = (a, b) => {
        const aModelName = (data?.models && data.models[a.model_id]) || '';
        const bModelName = (data?.models && data.models[b.model_id]) || '';
        return -1 * aModelName.localeCompare(bModelName);
      };
    } else if (sortKey === 'model' && order === 'asc') {
      compareFn = (a, b) => {
        const aModelName = (data?.models && data.models[a.model_id]) || '';
        const bModelName = (data?.models && data.models[b.model_id]) || '';
        return aModelName.localeCompare(bModelName);
      };
    } else if (sortKey === 'location' && order === 'desc') {
      compareFn = (a, b) => {
        const aLocationName =
          (locationNames && locationNames[a.location_id]) || '';
        const bLocationName =
          (locationNames && locationNames[b.location_id]) || '';
        return -1 * aLocationName.localeCompare(bLocationName);
      };
    } else if (sortKey === 'location' && order === 'asc') {
      compareFn = (a, b) => {
        const aLocationName =
          (locationNames && locationNames[a.location_id]) || '';
        const bLocationName =
          (locationNames && locationNames[b.location_id]) || '';
        return aLocationName.localeCompare(bLocationName);
      };
    } else if (sortKey === 'active_tags' && order === 'desc') {
      compareFn = (a, b) => b.active_tags - a.active_tags;
    } else if (sortKey === 'active_tags' && order === 'asc') {
      compareFn = (a, b) => a.active_tags - b.active_tags;
    } else if (sortKey === 'equipment' && order === 'desc') {
      compareFn = (a, b) => -1 * a.name.localeCompare(b.name);
    } else {
      compareFn = (a, b) => a.name.localeCompare(b.name);
    }

    copied.sort(compareFn);
    return copied;
  }, [filteredEquipments, data?.models, locationNames, sortKey, order]);

  useEffect(() => {
    if (filteredEquipments == null || !limit) {
      return;
    }

    const totalPage = Math.ceil(filteredEquipments.length / limit);

    if (page > totalPage) {
      setSearchParams((prev) => {
        prev.delete(`${PREFIX}page`);
        return new URLSearchParams(prev);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredEquipments?.length, limit, page]);

  const pagedEquipments = useMemo(() => {
    if (!limit || !orderedEquipments) {
      return undefined;
    }

    return orderedEquipments.slice((page - 1) * limit, page * limit);
  }, [orderedEquipments, page, limit]);

  const rows = useMemo(() => {
    if (!pagedEquipments) {
      return [];
    }

    return pagedEquipments.map(
      ({ id, name, model_id, location_id, active_tags }) => {
        const modelName = (data?.models && data.models[model_id]) || '---';
        const locationName =
          (locationNames && locationNames[location_id]) || '---';

        return {
          id: id.toString(),
          equipment: name,
          model: modelName,
          location: locationName,
          active_tags: active_tags.toLocaleString(),
        };
      }
    );
  }, [pagedEquipments, data?.models, locationNames]);

  const columns: Column[] = useMemo(
    () => [
      {
        key: 'equipment',
        name: t('common.equipment'),
        width: 140,
        showOrderIcon: true,
        sortState:
          sortKey === 'equipment' && order === 'asc'
            ? true
            : sortKey === 'equipment' && order === 'desc'
            ? false
            : undefined,
      },
      {
        key: 'model',
        name: t('common.model'),
        width: 200,
        showOrderIcon: true,
        sortState:
          sortKey === 'model' && order === 'asc'
            ? true
            : sortKey === 'model' && order === 'desc'
            ? false
            : undefined,
      },
      {
        key: 'location',
        name: t('common.location'),
        width: 213,
        showOrderIcon: true,
        sortState:
          sortKey === 'location' && order === 'asc'
            ? true
            : sortKey === 'location' && order === 'desc'
            ? false
            : undefined,
      },
      {
        key: 'active_tags',
        name: t('common.active_tags'),
        alignment: 'center',
        width: 130,
        showOrderIcon: true,
        sortState:
          sortKey === 'active_tags' && order === 'asc'
            ? true
            : sortKey === 'active_tags' && order === 'desc'
            ? false
            : undefined,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sortKey, order, currentLanguage]
  );

  return (
    <div className={style['container']}>
      <div className={style['header']}>
        <Search
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
          placeholder={t('common.search')}
          width="100%"
          label={t('common.equipment') + ':'}
          background="dark"
          wrapperClassName={style['header__search']}
        />
        <Dropdown
          label={t('common.model') + ':'}
          options={modelOptions}
          value={filterModel}
          onChange={setFilterModel}
          searchable
          background="dark"
          wrapperClassName={style['header__model']}
          wrapperStyles={{ width: 0 }}
        />
        <Dropdown
          label={t('common.location') + ':'}
          options={locationOptions}
          value={filterLocation}
          onChange={setFilterLocation}
          searchable
          background="dark"
          wrapperClassName={style['header__location']}
          wrapperStyles={{ width: 0 }}
        />
      </div>
      <div className={style['table']} ref={setContainer}>
        <Loading isLoading={isLoading} />
        <Table
          width="100%"
          columns={columns}
          rows={rows}
          sortable
          handleSortColumn={(sortKey, isAscending) => {
            setSearchParams((prev) => {
              if (isAscending == null) {
                prev.delete('connected_equipments_sort_key');
                prev.delete('connected_equipments_order');
              } else {
                prev.set('connected_equipments_sort_key', sortKey);
                prev.set(
                  'connected_equipments_order',
                  isAscending ? 'asc' : 'desc'
                );
              }
              return new URLSearchParams(prev);
            });
          }}
        />
      </div>
      <Pagination
        searchParams={searchParams}
        setSearchParams={setSearchParams}
        count={filteredEquipments?.length || 0}
        limit={limit || 1}
        variant="arrow"
        searchParamsPrefix={PREFIX}
      />
    </div>
  );
};

const displayLocationNames = (names: string[]) => names.join(' > ');
