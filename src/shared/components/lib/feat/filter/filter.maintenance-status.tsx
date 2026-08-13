import { t } from '@digital-twin/utils';

import { CustomTreeItem } from './filter--tree-item';
import { useCoreFilter, useCoreFilterClient } from './filter-data';
import { FilterItem } from './filter-shortcut';

const KEY = 'maintenanceStatusIds';

export { KEY as FILTER_KEY_MAINTENANCE_STATUS };

const MAINTENANCE_STATUS_DATA: Record<string, string> = {
  1: 'Requested',
  2: 'Rejected',
  3: 'Open',
  4: 'In Progress',
  5: 'Done',
  6: 'Closed',
};

type MaintenanceStatusShortcutProps = {
  filterKey?: string;
};

export const MaintenanceStatusShortcut = ({
  filterKey,
}: MaintenanceStatusShortcutProps) => {
  const key = filterKey ?? KEY;
  const { setData, data: filterData } = useCoreFilterClient();
  const selected = filterData[key];
  const handleRemove = () =>
    setData((prev) => ({
      ...prev,
      [key]: [],
    }));

  if (selected && selected.length === 0) return null;

  const name =
    selected === null
      ? `${t('common.all')}`
      : `${selected.map((item) => MAINTENANCE_STATUS_DATA[item]).join(',')}`;

  return (
    <FilterItem
      name={`${'Maintenance Status'}: ${name}`}
      onRemove={handleRemove}
    />
  );
};

type MaintenanceStatusTreeProps = {
  filterKey?: string;
};

export const MaintenanceStatusTree = ({
  filterKey,
}: MaintenanceStatusTreeProps) => {
  const key = filterKey ?? KEY;
  const { handleNodeChange, handleRootNodeChange, isRootNodeChecked, nodes } =
    useCoreFilter({
      data: Object.keys(MAINTENANCE_STATUS_DATA).map((k) => ({
        id: k,
        name: MAINTENANCE_STATUS_DATA[k],
      })),
      key,
    });

  return (
    <CustomTreeItem
      nodeId={'maintenance-status-root'}
      label={'Maintenance Status'}
      checked={isRootNodeChecked}
      onCheckedChange={(_key, checked) => handleRootNodeChange(checked)}
    >
      {nodes?.map((status) => (
        <CustomTreeItem
          key={status.id}
          nodeId={String(status.id)}
          label={status.name}
          checked={status.checked}
          onCheckedChange={handleNodeChange}
        />
      ))}
    </CustomTreeItem>
  );
};

export const FILTER_SEARCH_PARAMS_PARSER_MAINTENANCE_STATUS = (data: string) =>
  String(data);
