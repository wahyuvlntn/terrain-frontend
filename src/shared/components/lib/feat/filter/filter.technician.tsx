import { t } from '@digital-twin/utils';
import { useQuery } from '@tanstack/react-query';

import { getAllTechnicians, getTechnicianNames } from './filter.api';
import { CustomTreeItem } from './filter--tree-item';
import { useCoreFilter, useCoreFilterClient } from './filter-data';
import { FilterItem } from './filter-shortcut';

const KEY = 'technicianIds';

export { KEY as FILTER_KEY_TECHNICIAN };

export const useGetTechnicianNames = (selected: string[] | null) => {
  const { data } = useQuery({
    queryFn: () => getTechnicianNames(selected ?? []),
    queryKey: ['GET_TECHNICIAN_NAMES', { selected }],
    enabled: (selected?.length ?? 0) > 0,
  });

  if (selected && selected.length === 0) return null;

  return selected === null ? `${t('common.all')}` : `${data?.join(',')}`;
};

export const TechnicianShortcut = () => {
  const { setData, data: filterData } = useCoreFilterClient();
  const _selected = filterData[KEY];
  const selected = _selected === null ? null : _selected.map(String);
  const handleRemove = () =>
    setData((prev) => ({
      ...prev,
      [KEY]: [],
    }));

  const name = useGetTechnicianNames(selected);

  if (name === null) return null;

  return <FilterItem name={`Technician: ${name}`} onRemove={handleRemove} />;
};

export const TechnicianTree = () => {
  const { data } = useQuery({
    queryFn: getAllTechnicians,
    queryKey: ['GET_ALL_TECHNICIAN'],
    staleTime: Infinity,
    meta: { toastId: 'FILTER_ASSET_TECHNICIANS' },
  });

  const { handleNodeChange, handleRootNodeChange, isRootNodeChecked, nodes } =
    useCoreFilter({
      data: data,
      key: KEY,
    });

  return (
    <CustomTreeItem
      nodeId={'technician-root'}
      label={'Technician'}
      checked={isRootNodeChecked}
      onCheckedChange={(_key, checked) => handleRootNodeChange(checked)}
    >
      {nodes?.map((technician) => (
        <CustomTreeItem
          key={technician.id}
          nodeId={String(technician.id)}
          label={technician.name}
          checked={technician.checked}
          onCheckedChange={(key, checked) =>
            handleNodeChange(String(key), checked)
          }
        />
      ))}
    </CustomTreeItem>
  );
};

export const FILTER_SEARCH_PARAMS_PARSER_TECHNICIAN = (data: string) =>
  String(data);
