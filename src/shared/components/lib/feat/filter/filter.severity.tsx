import { t } from '@digital-twin/utils';
import { useQuery } from '@tanstack/react-query';

import { getAllSeverities, getSeverityNames } from './filter.api';
import { CustomTreeItem } from './filter--tree-item';
import { useCoreFilter, useCoreFilterClient } from './filter-data';
import { FilterItem } from './filter-shortcut';

const KEY = 'severityIds';

export { KEY as FILTER_KEY_SEVERITY };

export const useGetSeverityNames = (selected: number[] | null) => {
  const { data } = useQuery({
    queryFn: () => getSeverityNames(selected ?? []),
    queryKey: ['GET_SEVERITY_NAMES', { selected }],
    enabled: (selected?.length ?? 0) > 0,
  });

  if (selected && selected.length === 0) return null;

  return selected === null ? `${t('common.all')}` : `${data?.join(',')}`;
};

export const SeverityShortcut = () => {
  const { setData, data: filterData } = useCoreFilterClient();
  const _selected = filterData[KEY];
  const selected = _selected === null ? null : _selected.map(Number);
  const handleRemove = () =>
    setData((prev) => ({
      ...prev,
      [KEY]: [],
    }));

  const name = useGetSeverityNames(selected);

  if (name === null) return null;

  return <FilterItem name={`Severity: ${name}`} onRemove={handleRemove} />;
};

export const SeverityTree = () => {
  const { data } = useQuery({
    queryFn: getAllSeverities,
    queryKey: ['GET_ALL_SEVERITIES'],
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
      nodeId={'severity-root'}
      label={'Severity'}
      checked={isRootNodeChecked}
      onCheckedChange={(_key, checked) => handleRootNodeChange(checked)}
    >
      {nodes?.map((severity) => (
        <CustomTreeItem
          key={severity.id}
          nodeId={String(severity.id)}
          label={severity.name}
          checked={severity.checked}
          onCheckedChange={(key, checked) =>
            handleNodeChange(Number(key), checked)
          }
        />
      ))}
    </CustomTreeItem>
  );
};

export const FILTER_SEARCH_PARAMS_PARSER_SEVERITY = (data: string) =>
  Number(data);
