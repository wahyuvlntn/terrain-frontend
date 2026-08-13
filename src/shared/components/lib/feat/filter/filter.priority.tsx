import { t } from '@digital-twin/utils';
import { useQuery } from '@tanstack/react-query';

import { getAllPriorities, getPriorityNames } from './filter.api';
import { CustomTreeItem } from './filter--tree-item';
import { useCoreFilter, useCoreFilterClient } from './filter-data';
import { FilterItem } from './filter-shortcut';

const KEY = 'priorityIds';

export { KEY as FILTER_KEY_PRIORITY };

export const useGetPriorityNames = (selected: number[] | null) => {
  const { data } = useQuery({
    queryFn: () => getPriorityNames(selected ?? []),
    queryKey: ['GET_PRIORITY_NAMES', { selected }],
    enabled: (selected?.length ?? 0) > 0,
  });

  if (selected && selected.length === 0) return null;

  return selected === null ? `${t('common.all')}` : `${data?.join(',')}`;
};

export const PriorityShortcut = () => {
  const { setData, data: filterData } = useCoreFilterClient();
  const _selected = filterData[KEY];
  const selected = _selected === null ? null : _selected.map(Number);
  const handleRemove = () =>
    setData((prev) => ({
      ...prev,
      [KEY]: [],
    }));

  const name = useGetPriorityNames(selected);

  if (name === null) return null;

  return <FilterItem name={`Priority: ${name}`} onRemove={handleRemove} />;
};

export const PriorityTree = () => {
  const { data } = useQuery({
    queryFn: getAllPriorities,
    queryKey: ['GET_ALL_PRIORITIES'],
    staleTime: Infinity,
    meta: { toastId: 'FILTER_ASSET_PRIORITIES' },
  });

  const { handleNodeChange, handleRootNodeChange, isRootNodeChecked, nodes } =
    useCoreFilter({
      data: data,
      key: KEY,
    });

  return (
    <CustomTreeItem
      nodeId={'priority-root'}
      label={'Priority'}
      checked={isRootNodeChecked}
      onCheckedChange={(_key, checked) => handleRootNodeChange(checked)}
    >
      {nodes?.map((priority) => (
        <CustomTreeItem
          key={priority.id}
          nodeId={String(priority.id)}
          label={priority.name}
          checked={priority.checked}
          onCheckedChange={(key, checked) =>
            handleNodeChange(Number(key), checked)
          }
        />
      ))}
    </CustomTreeItem>
  );
};

export const FILTER_SEARCH_PARAMS_PARSER_PRIORITY = (data: string) =>
  Number(data);
