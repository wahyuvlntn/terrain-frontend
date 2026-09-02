import { CustomTreeItem, FilterItem, useCoreFilter, useCoreFilterClient } from '@digital-twin/components';
import { t } from '@digital-twin/utils';
import { CAPACITY_NAME } from '../schemas/filter';

const KEY = 'capacityIds';

export { KEY as FILTER_KEY_CAPACITY };

export const FILTER_SEARCH_PARAMS_PARSER_CAPACITY = (data: string) => data;

export const CapacityShortcut = () => {
  const { setData, data } = useCoreFilterClient();
  const selected = data[KEY];
  const handleRemove = () =>
    setData((prev) => ({
      ...prev,
      [KEY]: [],
    }));

  const name =
    selected === null
      ? `${t('common.capacity')}: ${t('common.all')}`
      : `${t('common.capacity')}: ${selected
          .map((item) => CAPACITY_NAME[item as keyof typeof CAPACITY_NAME])
          .join(',')}`;

  return <FilterItem name={name} onRemove={handleRemove} />;
};

export const CapacityTree = () => {
  const { handleNodeChange, handleRootNodeChange, isRootNodeChecked, nodes } = useCoreFilter({
    data: Object.keys(CAPACITY_NAME).map((key) => ({
      id: key,
      name: CAPACITY_NAME[key as keyof typeof CAPACITY_NAME],
    })),
    key: KEY,
  });

  return (
    <CustomTreeItem
      nodeId={'capacity-root'}
      label={t('common.capacity')}
      checked={isRootNodeChecked}
      onCheckedChange={(_key, checked) => handleRootNodeChange(checked)}
    >
      {nodes?.map((alarm) => (
        <CustomTreeItem
          key={alarm.id}
          nodeId={alarm.id}
          label={alarm.name}
          checked={alarm.checked}
          onCheckedChange={handleNodeChange}
        />
      ))}
    </CustomTreeItem>
  );
};
