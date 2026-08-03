import { useContext, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useModal } from '../../../../hooks';
import { ProjectCtx } from '../../../project-ctx';
import { ModelDetails } from './components/model-details';
import { ModelList } from './components/model-list';
import { RunningHourLimitPopup } from './components/running-hour-limit-popup';
import {
  BaseModelsCtx,
  BrandsCtx,
  GainsCtx,
  ParameterTypesCtx,
  PrjCtx,
  SeriesCtx,
  TypesCtx,
} from './contexts';
import {
  useModelBrands,
  useModelSeries,
  useModelTypes,
  useParameterGains,
  useParameterTypes,
} from './hooks/master-data';
import { useModelBases } from './hooks/model';
import style from './model-manager.module.scss';
import { ModelParameterTypeEntryType } from './schemas';

export const ModelManager = () => {
  const { projectVariant: prj } = useContext(ProjectCtx);

  return (
    <PrjCtx.Provider value={prj}>
      <div className={style['model-manager']}>
        <ModelManagerContent />
      </div>
    </PrjCtx.Provider>
  );
};

const ModelManagerContent = () => {
  // Master data hooks
  const { data: baseModels, isLoading: isLoadingBaseModels } = useModelBases();
  const { data: types, isLoading: isLoadingTypes } = useModelTypes();
  const { data: brands, isLoading: isLoadingBrands } = useModelBrands();
  const { data: series, isLoading: isLoadingSeries } = useModelSeries();
  const { data: gains, isLoading: isLoadingGains } = useParameterGains();
  const { data: parameterTypes, isLoading: isLoadingParameterTypes } = useParameterTypes();

  // Create a base models records for quick lookup
  const baseModelRecords = useMemo(() => {
    if (!baseModels) {
      return undefined;
    }

    return baseModels.reduce(
      (records, { id, name, type_id, brand_id, series_id }) => {
        records[id] = { name, type_id, brand_id, series_id };
        return records;
      },
      {} as Record<number, { name: string; type_id: number; brand_id: number; series_id: number }>
    );
  }, [baseModels]);

  // Create a gain records for quick lookup
  const gainRecords = useMemo(() => {
    if (!gains) {
      return undefined;
    }

    return gains.reduce(
      (records, { id, name }) => {
        records[id] = name;
        return records;
      },
      {} as Record<number, string>
    );
  }, [gains]);

  // Create a parameter type records for quick lookup
  const parameterTypeRecords = useMemo(() => {
    if (!parameterTypes) {
      return undefined;
    }

    return parameterTypes.reduce(
      (records, { id, ...md }) => {
        records[id] = md;
        return records;
      },
      {} as Record<number, Omit<ModelParameterTypeEntryType, 'id'>>
    );
  }, [parameterTypes]);

  // For filtering & paging from url
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse the search params
  const parsedParams = useMemo(() => {
    let selectedId: number | undefined = parseInt(searchParams.get('model_id') || '0');

    if (isNaN(selectedId) || selectedId <= 0) {
      selectedId = undefined;
    }

    let modelListPage = parseInt(searchParams.get('model_list_page') || '1');

    if (isNaN(modelListPage) || modelListPage <= 0) {
      modelListPage = 1;
    }

    let equipmentConnectionPage = parseInt(searchParams.get('equipment_connection_page') || '1');

    if (isNaN(equipmentConnectionPage) || equipmentConnectionPage <= 0) {
      equipmentConnectionPage = 1;
    }

    let alarmDefinitionPage = parseInt(searchParams.get('alarm_definition_page') || '1');

    if (isNaN(alarmDefinitionPage) || alarmDefinitionPage <= 0) {
      alarmDefinitionPage = 1;
    }

    let dynamicAlarmDefinitionPage = parseInt(
      searchParams.get('dynamic_alarm_definition_page') || '1'
    );

    if (isNaN(dynamicAlarmDefinitionPage) || dynamicAlarmDefinitionPage <= 0) {
      dynamicAlarmDefinitionPage = 1;
    }

    return {
      selectedId,
      modelListSearch: searchParams.get('model_list_search') || '',
      modelListPage,
      equipmentConnectionSearch: searchParams.get('equipment_connection_search') || '',
      equipmentConnectionPage,
      equipmentConnectionSortKey: searchParams.get('equipment_connection_sort_key') || '',
      equipmentConnectionOrder: searchParams.get('equipment_connection_order') || '',
      parameterSetupSearch: searchParams.get('parameter_setup_search') || '',
      alarmDefinitionSearch: searchParams.get('alarm_definition_search') || '',
      alarmDefinitionPage,
      alarmDefinitionSortKey: searchParams.get('alarm_definition_sort_key') || '',
      alarmDefinitionOrder: searchParams.get('alarm_definition_order') || '',
      dynamicAlarmDefinitionSearch: searchParams.get('dynamic_alarm_definition_search') || '',
      dynamicAlarmDefinitionPage,
      dynamicAlarmDefinitionSortKey: searchParams.get('dynamic_alarm_definition_sort_key') || '',
      dynamicAlarmDefinitionOrder: searchParams.get('dynamic_alarm_definition_order') || '',
    };
  }, [searchParams]);

  return (
    <>
      <BaseModelsCtx.Provider
        value={{
          entries: baseModels,
          records: baseModelRecords,
          isLoading: isLoadingBaseModels,
        }}
      >
        <TypesCtx.Provider
          value={{
            entries: types,
            isLoading: isLoadingTypes,
          }}
        >
          <BrandsCtx.Provider
            value={{
              entries: brands,
              isLoading: isLoadingBrands,
            }}
          >
            <SeriesCtx.Provider
              value={{
                entries: series,
                isLoading: isLoadingSeries,
              }}
            >
              <GainsCtx.Provider
                value={{
                  entries: gains,
                  records: gainRecords,
                  isLoading: isLoadingGains,
                }}
              >
                <ParameterTypesCtx.Provider
                  value={{
                    entries: parameterTypes,
                    records: parameterTypeRecords,
                    isLoading: isLoadingParameterTypes,
                  }}
                >
                  <ModelList
                    search={parsedParams.modelListSearch}
                    page={parsedParams.modelListPage}
                    selectedId={parsedParams.selectedId}
                    onSelect={(id) => {
                      setSearchParams((prev) => {
                        if (id) {
                          prev.set('model_id', id.toString());
                        } else {
                          prev.delete('model_id');
                        }
                        return new URLSearchParams(prev);
                      });
                    }}
                    searchParams={searchParams}
                    setSearchParams={setSearchParams}
                  />
                  <ModelDetails
                    selectedId={parsedParams.selectedId}
                    equipmentConnectionSearch={parsedParams.equipmentConnectionSearch}
                    equipmentConnectionPage={parsedParams.equipmentConnectionPage}
                    equipmentConnectionSortKey={parsedParams.equipmentConnectionSortKey}
                    equipmentConnectionOrder={parsedParams.equipmentConnectionOrder}
                    parameterSetupSearch={parsedParams.parameterSetupSearch}
                    alarmDefinitionSearch={parsedParams.alarmDefinitionSearch}
                    alarmDefinitionPage={parsedParams.alarmDefinitionPage}
                    alarmDefinitionSortKey={parsedParams.alarmDefinitionSortKey}
                    alarmDefinitionOrder={parsedParams.alarmDefinitionOrder}
                    dynamicAlarmDefinitionSearch={parsedParams.dynamicAlarmDefinitionSearch}
                    dynamicAlarmDefinitionPage={parsedParams.dynamicAlarmDefinitionPage}
                    dynamicAlarmDefinitionSortKey={parsedParams.dynamicAlarmDefinitionSortKey}
                    dynamicAlarmDefinitionOrder={parsedParams.dynamicAlarmDefinitionOrder}
                    searchParams={searchParams}
                    setSearchParams={setSearchParams}
                  />
                </ParameterTypesCtx.Provider>
              </GainsCtx.Provider>
            </SeriesCtx.Provider>
          </BrandsCtx.Provider>
        </TypesCtx.Provider>
      </BaseModelsCtx.Provider>
    </>
  );
};
