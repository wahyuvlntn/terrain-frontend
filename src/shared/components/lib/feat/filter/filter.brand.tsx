import { t } from '@digital-twin/utils';
import { useQuery } from '@tanstack/react-query';
import React from 'react';

import { getAllBrands, getBrandNames } from './filter.api';
import { CustomTreeItem } from './filter--tree-item';
import { useCoreFilter, useCoreFilterClient } from './filter-data';
import { FilterItem } from './filter-shortcut';

const KEY = 'brandIds';

export { KEY as FILTER_KEY_BRAND };

export const FILTER_SEARCH_PARAMS_PARSER_BRAND = (data: string) => Number(data);

export const BrandShortcut = () => {
  const { setData, data: filterData } = useCoreFilterClient();
  const _selected = filterData[KEY];
  const selected = _selected === null ? null : _selected.map(Number);
  const handleRemove = () =>
    setData((prev) => ({
      ...prev,
      [KEY]: [],
    }));

  const { data } = useQuery({
    queryFn: () => getBrandNames(selected ?? []),
    queryKey: ['GET_BRAND_NAMES', { selected }],
    enabled: (selected?.length ?? 0) > 0,
  });

  const name =
    selected === null
      ? `${t('common.brand')}: ${t('common.all')}`
      : `${t('common.brand')}: ${data?.join(',')}`;

  return <FilterItem name={name} onRemove={handleRemove} />;
};

export const BrandTree = () => {
  const { data } = useQuery({
    queryFn: getAllBrands,
    queryKey: ['GET_ALL_BRANDS'],
    staleTime: Infinity,
    meta: { toastId: 'FILTER_ASSET_BRANDS' },
  });

  const { handleNodeChange, handleRootNodeChange, isRootNodeChecked, nodes } =
    useCoreFilter({
      data: data,
      key: KEY,
    });

  return (
    <CustomTreeItem
      nodeId={'brand-root'}
      label={t('common.brand')}
      checked={isRootNodeChecked}
      onCheckedChange={(_key, checked) => handleRootNodeChange(checked)}
    >
      {nodes?.map((brand) => (
        <CustomTreeItem
          key={brand.id}
          nodeId={String(brand.id)}
          label={brand.name}
          checked={brand.checked}
          onCheckedChange={(key, checked) =>
            handleNodeChange(Number(key), checked)
          }
        />
      ))}
    </CustomTreeItem>
  );
};
