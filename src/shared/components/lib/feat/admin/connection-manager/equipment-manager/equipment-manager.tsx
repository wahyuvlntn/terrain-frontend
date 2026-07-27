import { ImagePlaceholder } from '@digital-twin/icons';
import { ReactNode, useContext, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { ThemeContext } from '../../..';
import { DropdownOption } from '../../../../input';
import { DataSourceConnection } from './components/data-source-connection';
import { EquipmentInformation } from './components/equipment-information';
import { EquipmentList } from './components/equipment-list';
import { ParameterMapping } from './components/parameter-mapping';
import {
  EquipmentGatewaysCtx,
  EquipmentLicensesCtx,
  EquipmentLocationsCtx,
  EquipmentModelsCtx,
  ImagePlaceholderCtx,
} from './contexts';
import style from './equipment-manager.module.scss';
import {
  useEquipmentGateways,
  useEquipmentLicenses,
  useEquipmentLocations,
  useEquipmentModels,
} from './hooks';
import { LocationNodeType } from './schemas';

export type EquipmentManagerProps = {
  filterTypeTree: ReactNode;
  filterTypeShortcut: ReactNode;
  filterTypeKey: string;
};

export const EquipmentManager = ({
  filterTypeKey,
  filterTypeShortcut,
  filterTypeTree,
}: EquipmentManagerProps) => {
  // For filtering & paging from url
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse the search params
  const {
    selected,
    search,
    page,
    dataSourceConnectionSearch,
    dataSourceConnectionSortKey,
    dataSourceConnectionOrder,
    parameterSetupSortKey,
    parameterSetupOrder,
  } = useMemo(() => {
    let page = parseInt(searchParams.get('page') || '1');

    if (isNaN(page) || page <= 0) {
      page = 1;
    }

    return {
      selected: searchParams.get('selected') || undefined,
      search: searchParams.get('search') || '',
      page,
      dataSourceConnectionSearch:
        searchParams.get('data_source_connection_search') || '',
      dataSourceConnectionSortKey:
        searchParams.get('data_source_connection_sort_key') || '',
      dataSourceConnectionOrder:
        searchParams.get('data_source_connection_order') || '',
      parameterSetupSortKey: searchParams.get('parameter_setup_sort_key') || '',
      parameterSetupOrder: searchParams.get('parameter_setup_order') || '',
    };
  }, [searchParams]);

  // useEffect(() => {
  //   const timer = setTimeout(() => {
  //     setSearchParams((prev) => {
  //       prev.delete('selected');
  //       return new URLSearchParams(prev);
  //     });
  //   }, 5000);

  //   return () => {
  //     clearTimeout(timer);
  //   };
  // }, [selected]);

  // These data will be passed via context
  const { data: models, isLoading: isLoadingModels } = useEquipmentModels();

  // Convert models to DropdownOptions
  const modelOptions = useMemo(() => {
    if (!models) {
      return undefined;
    }

    return models.map(
      ({ id, name }): DropdownOption => ({
        value: id.toString(),
        label: name,
      })
    );
  }, [models]);

  // Convert models to Record
  const { records: modelRecords, ids: modelIds } = useMemo(() => {
    if (!models) {
      return { records: undefined, ids: undefined };
    }

    const records: Record<
      number,
      {
        name: string;
        type_id: number;
        type: string;
        brand_id: number;
        brand: string;
        series_id: number;
        series: string;
      }
    > = {};
    const ids: Record<string, number> = {};

    for (const { id, ...metadata } of models) {
      records[id] = metadata;
      ids[metadata.name] = id;
    }

    return { records, ids };
  }, [models]);

  const { data: licenses, isLoading: isLoadingLicenses } =
    useEquipmentLicenses();

  // Convert licenses to DropdownOptions
  const licenseOptions = useMemo(() => {
    if (!licenses) {
      return undefined;
    }

    const options: DropdownOption[] = [];

    licenses.forEach(({ id, name, available }) => {
      if (available > 0) {
        options.push({
          value: id.toString(),
          label: name,
        });
      }
    });

    return options;
  }, [licenses]);

  // Convert licenses to Record
  const { records: licenseRecords, ids: licenseIds } = useMemo(() => {
    if (!licenses) {
      return { records: undefined, ids: undefined };
    }

    const records: Record<
      number,
      {
        name: string;
        used: number;
        available: number;
        l_active: boolean;
        l_status: string;
      }
    > = {};
    const ids: Record<string, number> = {};

    for (const { id, name, used, available, l_active, l_status } of licenses) {
      records[id] = { name, used, available, l_active, l_status };
      ids[name] = id;
    }

    return { records, ids };
  }, [licenses]);

  const { data: gateways, isLoading: isLoadingGateways } =
    useEquipmentGateways();

  // Convert gateways to DropdownOptions
  const gatewayOptions = useMemo(() => {
    if (!gateways) {
      return undefined;
    }

    return [
      { value: '---', label: '---' },
      ...gateways.map(
        ({ alias, name }): DropdownOption => ({
          value: alias,
          label: name,
        })
      ),
    ];
  }, [gateways]);

  // Convert gateways to Record
  const gatewayRecords = useMemo(() => {
    if (!gateways) {
      return undefined;
    }

    return gateways.reduce(
      (records, { alias, name, protocol_alias, protocol_name, status }) => {
        records[alias] = { name, protocol_alias, protocol_name, status };
        return records;
      },
      {} as Record<
        string,
        {
          name: string;
          protocol_alias: string;
          protocol_name: string;
          status: boolean | null;
        }
      >
    );
  }, [gateways]);

  // Convert gateways to Map[name] -> alias
  const gatewayAliases = useMemo(() => {
    if (!gateways) {
      return undefined;
    }

    return gateways.reduce((records, { alias, name }) => {
      records[name] = alias;
      return records;
    }, {} as Record<string, string>);
  }, [gateways]);

  const { data: locations, isLoading: isLoadingLocations } =
    useEquipmentLocations();

  // Recursively find all childIds for a given location
  const childIds = useMemo(() => {
    if (!locations) {
      return undefined;
    }

    const records: Record<number, number[]> = {};

    function fillChildIds(
      records: Record<number, number[]>,
      parents: LocationNodeType[] | null,
      childs: LocationNodeType[]
    ) {
      for (const node of childs) {
        records[node.id] = [];

        if (parents) {
          for (const parentNode of parents) {
            records[parentNode.id].push(node.id);
          }
        }

        if (node.childs) {
          fillChildIds(
            records,
            parents ? [...parents, node] : [node],
            node.childs
          );
        }
      }
    }

    fillChildIds(records, null, locations);
    return records;
  }, [locations]);

  const {
    colors: { backgroundLowest },
  } = useContext(ThemeContext);

  const placeholder = useMemo(
    () => ImagePlaceholder(backgroundLowest),
    [backgroundLowest]
  );

  return (
    <EquipmentModelsCtx.Provider
      value={{
        models: models,
        options: modelOptions,
        ids: modelIds,
        records: modelRecords,
        isLoading: isLoadingModels,
      }}
    >
      <EquipmentLicensesCtx.Provider
        value={{
          licenses: licenses,
          options: licenseOptions,
          ids: licenseIds,
          records: licenseRecords,
          isLoading: isLoadingLicenses,
        }}
      >
        <EquipmentGatewaysCtx.Provider
          value={{
            entries: gateways,
            options: gatewayOptions,
            records: gatewayRecords,
            aliases: gatewayAliases,
            isLoading: isLoadingGateways,
          }}
        >
          <EquipmentLocationsCtx.Provider
            value={{
              tree: locations,
              childIds: childIds,
              isLoading: isLoadingLocations,
            }}
          >
            <ImagePlaceholderCtx.Provider value={placeholder}>
              <div className={style['equipment-manager']}>
                <EquipmentList
                  selected={selected}
                  search={search}
                  page={page}
                  searchParams={searchParams}
                  setSearchParams={setSearchParams}
                  filterTypeTree={filterTypeTree}
                  filterTypeShortcut={filterTypeShortcut}
                  filterTypeKey={filterTypeKey}
                />
                <div className={style['equipment-manager__middle-column']}>
                  <EquipmentInformation alias={selected} />
                  <DataSourceConnection
                    alias={selected}
                    search={dataSourceConnectionSearch}
                    sortKey={dataSourceConnectionSortKey}
                    order={dataSourceConnectionOrder}
                    setSearchParams={setSearchParams}
                  />
                </div>
                <ParameterMapping
                  alias={selected}
                  sortKey={parameterSetupSortKey}
                  order={parameterSetupOrder}
                  setSearchParams={setSearchParams}
                />
              </div>
            </ImagePlaceholderCtx.Provider>
          </EquipmentLocationsCtx.Provider>
        </EquipmentGatewaysCtx.Provider>
      </EquipmentLicensesCtx.Provider>
    </EquipmentModelsCtx.Provider>
  );
};
