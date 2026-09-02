import { CustomTreeItem, FilterItem, useCoreFilter, useCoreFilterClient } from '@digital-twin/components';
import { t } from '@digital-twin/utils';
import { useEquipmentTypes } from '../api/master-data';

const KEY = 'equipmentTypeIds';

export { KEY as FILTER_KEY_EQUIPMENT_TYPE };

export const FILTER_SEARCH_PARAMS_PARSER_EQUIPMENT_TYPE = (data: string) => data;

export const useGetEquipmentTypeNames = (selected: string[] | null) => {
  const { data } = useEquipmentTypes();

  if (selected && selected.length === 0) {
    return null;
  } else if (selected === null) {
    return t('common.all');
  } else {
    const names: string[] = [];
    if (data) {
      selected.forEach((id) => {
        names.push(data.names[id]);
      });
    }
    return names.join(',');
  }
};

export const EquipmentTypeShortcut = () => {
  const { setData, data: filterData } = useCoreFilterClient();
  const _selected = filterData[KEY];
  const selected = _selected === null ? null : _selected.map(String);
  const handleRemove = () =>
    setData((prev) => ({
      ...prev,
      [KEY]: [],
    }));

  const name = useGetEquipmentTypeNames(selected);

  if (name === null) {
    return null;
  }
  return <FilterItem name={`${t('common.equipment_type')}: ${name}`} onRemove={handleRemove} />;
};

export const EquipmentTypeTree = () => {
  const { data } = useEquipmentTypes();

  const { handleNodeChange, handleRootNodeChange, isRootNodeChecked, nodes } = useCoreFilter({
    data: data?.entries,
    key: KEY,
  });

  return (
    <CustomTreeItem
      nodeId={'equipmentType-root'}
      label={t('common.equipment_type')}
      checked={isRootNodeChecked}
      onCheckedChange={(_key, checked) => handleRootNodeChange(checked)}
    >
      {nodes?.map((equipmentType) => (
        <CustomTreeItem
          key={equipmentType.id}
          nodeId={equipmentType.id}
          label={equipmentType.name}
          checked={equipmentType.checked}
          onCheckedChange={(key, checked) => handleNodeChange(key, checked)}
        />
      ))}
    </CustomTreeItem>
  );
};
