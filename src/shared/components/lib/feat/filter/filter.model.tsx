import { t } from '@digital-twin/utils';
import { useQuery } from '@tanstack/react-query';
import React from 'react';

import { getAllModels, getModelNames } from './filter.api';
import { CustomTreeItem } from './filter--tree-item';
import { useCoreFilter, useCoreFilterClient } from './filter-data';
import { FilterItem } from './filter-shortcut';

const KEY = 'modelIds';

export { KEY as FILTER_KEY_MODEL };

export const useGetModelNames = (selected: number[] | null) => {
  const { data } = useQuery({
    queryFn: () => getModelNames(selected ?? []),
    queryKey: ['GET_MODEL_NAMES', { selected }],
    enabled: (selected?.length ?? 0) > 0,
  });

  if (selected && selected.length === 0) return null;

  return selected === null ? `${t('common.all')}` : `${data?.join(',')}`;
};

export const ModelShortcut = () => {
  const { setData, data: filterData } = useCoreFilterClient();
  const _selected = filterData[KEY];
  const selected = _selected === null ? null : _selected.map(Number);
  const handleRemove = () =>
    setData((prev) => ({
      ...prev,
      [KEY]: [],
    }));

  const name = useGetModelNames(selected);

  if (name === null) return null;

  return (
    <FilterItem
      name={`${t('common.model')}: ${name}`}
      onRemove={handleRemove}
    />
  );
};

export const ModelTree = () => {
  const { data } = useQuery({
    queryFn: getAllModels,
    queryKey: ['GET_ALL_MODELS'],
    staleTime: Infinity,
    meta: { toastId: 'FILTER_ASSET_MODELS' },
  });

  const { handleNodeChange, handleRootNodeChange, isRootNodeChecked, nodes } =
    useCoreFilter({
      data: data,
      key: KEY,
    });

  return (
    <CustomTreeItem
      nodeId={'model-root'}
      label={t('common.model')}
      checked={isRootNodeChecked}
      onCheckedChange={(_key, checked) => handleRootNodeChange(checked)}
    >
      {nodes?.map((model) => (
        <CustomTreeItem
          key={model.id}
          nodeId={String(model.id)}
          label={model.name}
          checked={model.checked}
          onCheckedChange={(key, checked) =>
            handleNodeChange(Number(key), checked)
          }
        />
      ))}
    </CustomTreeItem>
  );
};

export const FILTER_SEARCH_PARAMS_PARSER_MODEL = (data: string) => Number(data);
