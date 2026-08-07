import {
  CustomTreeItem,
  FilterItem,
  useCoreFilter,
  useCoreFilterClient,
} from '@digital-twin/components';
import { t } from '@digital-twin/utils';
import { useQuery } from '@tanstack/react-query';
import React from 'react';

import { getTypeNames, getTypes } from './api';

const KEY = 'typeIds';

export { KEY as FILTER_KEY_TYPE };

export const FILTER_SEARCH_PARAMS_PARSER_TYPE = (data: string) => Number(data);

export const getTypeNamesQueryKey = (selected: number[] | null) => [
  'GET_TYPE_NAMES',
  { selected },
];

export const TypeShortcut = () => {
  const { setData, data: filterData } = useCoreFilterClient();
  const _selected = filterData[KEY];
  const selected = _selected === null ? null : _selected.map(Number);
  const handleRemove = () =>
    setData((prev) => ({
      ...prev,
      [KEY]: [],
    }));

  const { data } = useQuery({
    queryFn: () => getTypeNames(selected ?? []),
    queryKey: getTypeNamesQueryKey(selected),
    enabled: (selected?.length ?? 0) > 0,
  });

  if (selected && selected.length === 0) return null;

  const name =
    selected === null
      ? `${t('common.type')}: ${t('common.all')}`
      : `${t('common.type')}: ${data?.join(',')}`;

  return <FilterItem name={name} onRemove={handleRemove} />;
};

export const TypeTree = () => {
  const { data } = useQuery({
    queryFn: getTypes,
    queryKey: ['GET_ALL_TYPES'],
    staleTime: Infinity,
    meta: { toastId: 'FILTER_ASSET_TYPES' },
  });

  const { handleNodeChange, handleRootNodeChange, isRootNodeChecked, nodes } =
    useCoreFilter({
      data: data,
      key: KEY,
    });

  return (
    <CustomTreeItem
      nodeId={'type-root'}
      label={t('common.type')}
      checked={isRootNodeChecked}
      onCheckedChange={(_key, checked) => handleRootNodeChange(checked)}
    >
      {nodes?.map((type) => (
        <CustomTreeItem
          key={type.id}
          nodeId={String(type.id)}
          label={type.name}
          checked={type.checked}
          onCheckedChange={(key, checked) =>
            handleNodeChange(Number(key), checked)
          }
        />
      ))}
    </CustomTreeItem>
  );
};
