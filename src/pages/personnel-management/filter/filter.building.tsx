import { CustomTreeItem, FilterItem, useCoreFilter, useCoreFilterClient } from '@digital-twin/components';
import { t } from '@digital-twin/utils';
import { useBuildings } from '../api/master-data';

const KEY = 'buildingIds';

export { KEY as FILTER_KEY_BUILDING };

export const FILTER_SEARCH_PARAMS_PARSER_BUILDING = (data: string) => data;

export const useGetBuildingNames = (selected: string[] | null) => {
  const { data } = useBuildings();

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

export const BuildingShortcut = () => {
  const { setData, data: filterData } = useCoreFilterClient();
  const _selected = filterData[KEY];
  const selected = _selected === null ? null : _selected.map(String);
  const handleRemove = () =>
    setData((prev) => ({
      ...prev,
      [KEY]: [],
    }));

  const name = useGetBuildingNames(selected);

  if (name === null) {
    return null;
  }
  return <FilterItem name={`${t('common.building')}: ${name}`} onRemove={handleRemove} />;
};

export const BuildingTree = () => {
  const { data } = useBuildings();

  const { handleNodeChange, handleRootNodeChange, isRootNodeChecked, nodes } = useCoreFilter({
    data: data?.entries,
    key: KEY,
  });

  return (
    <CustomTreeItem
      nodeId={'building-root'}
      label={t('common.building')}
      checked={isRootNodeChecked}
      onCheckedChange={(_key, checked) => handleRootNodeChange(checked)}
    >
      {nodes?.map((building) => (
        <CustomTreeItem
          key={building.id}
          nodeId={building.id}
          label={building.name}
          checked={building.checked}
          onCheckedChange={(key, checked) => handleNodeChange(key, checked)}
        />
      ))}
    </CustomTreeItem>
  );
};
