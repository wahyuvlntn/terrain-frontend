import { t } from '@digital-twin/utils';
import { useQuery } from '@tanstack/react-query';

import { getAllMaintenanceTypes, getMaintenanceTypeNames } from './filter.api';
import { CustomTreeItem } from './filter--tree-item';
import { useCoreFilter, useCoreFilterClient } from './filter-data';
import { FilterItem } from './filter-shortcut';

const KEY = 'maintenanceTypeIds';

export { KEY as FILTER_KEY_MAINTENANCE_TYPE };

export const useGetMaintenanceTypeNames = (selected: number[] | null) => {
  const { data } = useQuery({
    queryFn: () => getMaintenanceTypeNames(selected ?? []),
    queryKey: ['GET_MAINTENANCE_TYPE_NAMES', { selected }],
    enabled: (selected?.length ?? 0) > 0,
  });

  if (selected && selected.length === 0) return null;

  return selected === null ? `${t('common.all')}` : `${data?.join(',')}`;
};

export const MaintenanceTypeShortcut = () => {
  const { setData, data: filterData } = useCoreFilterClient();
  const _selected = filterData[KEY];
  const selected = _selected === null ? null : _selected.map(Number);
  const handleRemove = () =>
    setData((prev) => ({
      ...prev,
      [KEY]: [],
    }));

  const name = useGetMaintenanceTypeNames(selected);

  if (name === null) return null;

  return (
    <FilterItem name={`Maintenance Type: ${name}`} onRemove={handleRemove} />
  );
};

export const MaintenanceTypeTree = () => {
  const { data } = useQuery({
    queryFn: getAllMaintenanceTypes,
    queryKey: ['GET_ALL_MAINTENANCE_TYPES'],
    staleTime: Infinity,
    meta: { toastId: 'FILTER_ASSET_SEVERITIES' },
  });

  const { handleNodeChange, handleRootNodeChange, isRootNodeChecked, nodes } =
    useCoreFilter({
      data: data,
      key: KEY,
    });

  return (
    <CustomTreeItem
      nodeId={'maintenance-type-root'}
      label={'Maintenance Type'}
      checked={isRootNodeChecked}
      onCheckedChange={(_key, checked) => handleRootNodeChange(checked)}
    >
      {nodes?.map((maintenanceType) => (
        <CustomTreeItem
          key={maintenanceType.id}
          nodeId={String(maintenanceType.id)}
          label={maintenanceType.name}
          checked={maintenanceType.checked}
          onCheckedChange={(key, checked) =>
            handleNodeChange(Number(key), checked)
          }
        />
      ))}
    </CustomTreeItem>
  );
};

export const FILTER_SEARCH_PARAMS_PARSER_MAINTENANCE_TYPE = (data: string) =>
  Number(data);
