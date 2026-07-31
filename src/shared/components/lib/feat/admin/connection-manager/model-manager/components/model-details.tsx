// For filtering & paging from url
// For cascading classnames
import clsx from 'clsx';
import { SetURLSearchParams } from 'react-router-dom';

// Hooks
import { useModelParameters } from '../hooks/model';
import { EquipmentConnection } from './model-details.equipment-connection';
// Components
import { ModelInformation } from './model-details.model-information';
// Style
import style from './model-details.module.scss';
import { ParameterSetup } from './model-details.parameter-setup';
import { StatusAlarmDefinition } from './model-details.status-alarm-definition';

export const ModelDetails = ({
  selectedId,
  equipmentConnectionSearch,
  equipmentConnectionPage,
  equipmentConnectionSortKey,
  equipmentConnectionOrder,
  parameterSetupSearch,
  alarmDefinitionSearch,
  alarmDefinitionPage,
  alarmDefinitionSortKey,
  alarmDefinitionOrder,
  dynamicAlarmDefinitionSearch,
  dynamicAlarmDefinitionPage,
  dynamicAlarmDefinitionSortKey,
  dynamicAlarmDefinitionOrder,
  searchParams,
  setSearchParams,
}: {
  selectedId: number | undefined;
  equipmentConnectionSearch: string;
  equipmentConnectionPage: number;
  equipmentConnectionSortKey: string;
  equipmentConnectionOrder: string;
  parameterSetupSearch: string;
  alarmDefinitionSearch: string;
  alarmDefinitionPage: number;
  alarmDefinitionSortKey: string;
  alarmDefinitionOrder: string;
  dynamicAlarmDefinitionSearch: string;
  dynamicAlarmDefinitionPage: number;
  dynamicAlarmDefinitionSortKey: string;
  dynamicAlarmDefinitionOrder: string;
  searchParams: URLSearchParams;
  setSearchParams: SetURLSearchParams;
}) => {
  const parameters = useModelParameters(selectedId);

  return (
    <div className={style['model-details']}>
      <div className={clsx(style['model-details-column'], style['model-details-column--wider'])}>
        <ModelInformation selectedId={selectedId} />
        <EquipmentConnection
          selectedId={selectedId}
          parametersCount={parameters.data?.length}
          search={equipmentConnectionSearch}
          page={equipmentConnectionPage}
          sortKey={equipmentConnectionSortKey}
          order={equipmentConnectionOrder}
          searchParams={searchParams}
          setSearchParams={setSearchParams}
        />
      </div>
      <div className={style['model-details-column']}>
        <ParameterSetup
          modelId={selectedId}
          search={parameterSetupSearch}
          setSearchParams={setSearchParams}
          parameters={parameters.data}
          isLoading={parameters.isLoading}
        />
        <StatusAlarmDefinition
          modelId={selectedId}
          alarmDefinitionSearch={alarmDefinitionSearch}
          alarmDefinitionPage={alarmDefinitionPage}
          alarmDefinitionSortKey={alarmDefinitionSortKey}
          alarmDefinitionOrder={alarmDefinitionOrder}
          dynamicAlarmDefinitionSearch={dynamicAlarmDefinitionSearch}
          dynamicAlarmDefinitionPage={dynamicAlarmDefinitionPage}
          dynamicAlarmDefinitionSortKey={dynamicAlarmDefinitionSortKey}
          dynamicAlarmDefinitionOrder={dynamicAlarmDefinitionOrder}
          searchParams={searchParams}
          setSearchParams={setSearchParams}
          parameters={parameters.data}
        />
      </div>
    </div>
  );
};
