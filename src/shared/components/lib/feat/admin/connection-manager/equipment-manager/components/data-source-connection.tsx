import { FlowsheetFill, Wifi } from '@digital-twin/icons';
import { t, useLanguageSwitcher } from '@digital-twin/utils';
import clsx from 'clsx';
import { useContext, useEffect, useMemo, useState } from 'react';
import { SetURLSearchParams } from 'react-router-dom';

import {
  Column,
  Container,
  Dropdown,
  DropdownOption,
  Loading,
  Search,
  Table,
} from '../../../../../..';
import { EquipmentGatewaysCtx } from '../contexts';
import { useEquipmentParameters } from '../hooks';
import style from './data-source-connection.module.scss';

// Constants
const PREFIX = 'data_source_connection_';

type DataSourceEntry = {
  name: string;
  protocol_alias: string;
  protocol_name: string;
  parameter_tags: Set<string | null>;
  status: boolean | null;
};

export const DataSourceConnection = ({
  alias,
  search,
  sortKey,
  order,
  setSearchParams,
}: {
  alias: string | undefined;
  search: string;
  sortKey: string;
  order: string;
  setSearchParams: SetURLSearchParams;
}) => {
  const { currentLanguage } = useLanguageSwitcher();

  const ALL_OPTION: DropdownOption = useMemo(
    () => ({
      value: 'all',
      label: t('common.all'),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentLanguage]
  );

  const [dataSourceTypeFilter, setDataSourceTypeFilter] = useState<string>(
    ALL_OPTION.value
  );

  // Reset type filter whenever alias changes
  useEffect(() => {
    setDataSourceTypeFilter(ALL_OPTION.value);
  }, [alias, ALL_OPTION.value]);

  const { records, isLoading: isLoadingGateways } =
    useContext(EquipmentGatewaysCtx);

  const { data, isLoading: isLoadingParameters } =
    useEquipmentParameters(alias);

  // Get all distinct gateways & protocols mapped to the parameters
  const [dataSources, dataSourceTypes] = useMemo(() => {
    if (!alias || !data || !records) {
      return [undefined, [ALL_OPTION] as DropdownOption[]] as const;
    }

    // Collect distinct dataSources to this records
    const localDataSources: Record<
      string,
      {
        name: string;
        protocol_alias: string;
        protocol_name: string;
        parameter_tags: Set<string | null>;
        status: boolean | null;
      }
    > = {};

    // Collect distinct protocols to this records
    const localProtocols: Record<string, { alias: string; name: string }> = {};

    data.forEach(({ gateway_alias, tag }) => {
      if (!gateway_alias || !tag) {
        return;
      }

      const metadata = records[gateway_alias];

      if (!metadata) {
        return;
      }

      const dataSource = localDataSources[gateway_alias];

      if (!dataSource) {
        const tags = new Set<string | null>();
        tags.add(tag);

        localDataSources[gateway_alias] = {
          ...metadata,
          parameter_tags: tags,
        };
      } else {
        dataSource.parameter_tags.add(tag);
      }

      localProtocols[metadata.protocol_alias] = {
        alias: metadata.protocol_alias,
        name: metadata.protocol_name,
      };
    });

    const dataSources: DataSourceEntry[] = [];

    for (const dataSource in localDataSources) {
      dataSources.push(localDataSources[dataSource]);
    }

    const dataSourceTypes: DropdownOption[] = [];

    for (const protocol in localProtocols) {
      const { alias, name } = localProtocols[protocol];
      dataSourceTypes.push({ value: alias, label: name });
    }

    dataSourceTypes.sort((a, b) => a.label.localeCompare(b.label));
    dataSourceTypes.unshift(ALL_OPTION);
    return [dataSources, dataSourceTypes] as const;
  }, [alias, data, records, ALL_OPTION]);

  // Filter data sources based on filter
  const filteredDataSources = useMemo(() => {
    if (!dataSources) {
      return undefined;
    }

    const normalizedSearch = search.toLowerCase();

    return dataSources.filter(({ name, protocol_alias }) => {
      const condition1 =
        !normalizedSearch || name.toLowerCase().includes(normalizedSearch);

      const condition2 =
        dataSourceTypeFilter === ALL_OPTION.value ||
        protocol_alias === dataSourceTypeFilter;

      return condition1 && condition2;
    });
  }, [dataSources, search, dataSourceTypeFilter, ALL_OPTION.value]);

  // Order data sources
  const orderedDataSources = useMemo(() => {
    if (!filteredDataSources) {
      return undefined;
    }

    const copied = [...filteredDataSources];

    let compareFn: (a: DataSourceEntry, b: DataSourceEntry) => number;

    if (sortKey === 'type' && order === 'desc') {
      compareFn = (a, b) => -1 * a.protocol_name.localeCompare(b.protocol_name);
    } else if (sortKey === 'type' && order === 'asc') {
      compareFn = (a, b) => a.protocol_name.localeCompare(b.protocol_name);
    } else if (sortKey === 'mapped_tags' && order === 'desc') {
      compareFn = (a, b) => b.parameter_tags.size - a.parameter_tags.size;
    } else if (sortKey === 'mapped_tags' && order === 'asc') {
      compareFn = (a, b) => a.parameter_tags.size - b.parameter_tags.size;
    } else if (sortKey === 'name' && order === 'desc') {
      compareFn = (a, b) => -1 * a.name.localeCompare(b.name);
    } else {
      compareFn = (a, b) => a.name.localeCompare(b.name);
    }

    copied.sort(compareFn);
    return copied;
  }, [filteredDataSources, sortKey, order]);

  // Create table rows from parameters and gateway protocols data
  const rows = useMemo(() => {
    if (!orderedDataSources) {
      return [];
    }

    return orderedDataSources.map(
      ({ name, protocol_name, parameter_tags, status }) => ({
        id: name,
        status: (
          <div className={style['data-source-connection__status-container']}>
            <div
              className={clsx(
                style['data-source-connection__status'],
                status === null
                  ? style['data-source-connection__status--disconnected']
                  : status
                  ? style['data-source-connection__status--connected']
                  : style['data-source-connection__status--error']
              )}
              title={
                status === null
                  ? t('common.disconnected')
                  : status
                  ? t('common.connected')
                  : t('common.error')
              }
            />
          </div>
        ),
        name: name,
        type: protocol_name,
        mapped_tags: `${parameter_tags.size} ${t('common.tags')}`,
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderedDataSources, currentLanguage]);

  const columns: Column[] = useMemo(
    () => [
      {
        key: 'status',
        name: (
          <div className={style['equipment-connection__table__icon']}>
            <Wifi style={{ height: 20 }} />
          </div>
        ),
        width: 50,
      },
      {
        key: 'name',
        name: t('common.name'),
        width: 230,
        showOrderIcon: true,
        sortState:
          sortKey === 'name' && order === 'asc'
            ? true
            : sortKey === 'name' && order === 'desc'
            ? false
            : undefined,
      },
      {
        key: 'type',
        name: t('common.type'),
        width: 140,
        showOrderIcon: true,
        sortState:
          sortKey === 'type' && order === 'asc'
            ? true
            : sortKey === 'type' && order === 'desc'
            ? false
            : undefined,
      },
      {
        key: 'mapped_tags',
        name: t('common.mapped_tags'),
        width: 160,
        showOrderIcon: true,
        sortState:
          sortKey === 'mapped_tags' && order === 'asc'
            ? true
            : sortKey === 'mapped_tags' && order === 'desc'
            ? false
            : undefined,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sortKey, order, currentLanguage]
  );

  return (
    <Container
      icon={<FlowsheetFill />}
      title={t('common.data_source_connection')}
      className={style['container']}
      background={'none'}
    >
      <div className={style['data-source-connection']}>
        <div className={style['data-source-connection__filter']}>
          <div className={style['data-source-connection__filter__search']}>
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
              background="dark"
            />
          </div>
          <div className={style['data-source-connection__filter__type']}>
            <Dropdown
              label={t('common.type') + ':'}
              value={dataSourceTypeFilter}
              options={dataSourceTypes}
              onChange={setDataSourceTypeFilter}
              labelPosition="left"
              background="dark"
            />
          </div>
        </div>
        <div className={style['data-source-connection__table']}>
          <Loading isLoading={isLoadingGateways || isLoadingParameters} />
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
      </div>
    </Container>
  );
};
