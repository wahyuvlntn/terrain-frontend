import { t } from '@digital-twin/utils';
import { useQuery } from '@tanstack/react-query';

import { getAllSeries, getSeriesNames } from './filter.api';
import { CustomTreeItem } from './filter--tree-item';
import { useCoreFilter, useCoreFilterClient } from './filter-data';
import { FilterItem } from './filter-shortcut';

const KEY = 'seriesIds';

export { KEY as FILTER_KEY_SERIES };

export const FILTER_SEARCH_PARAMS_PARSER_SERIES = (data: string) =>
  Number(data);

export const SeriesShortcut = () => {
  const { setData, data: filterData } = useCoreFilterClient();
  const _selected = filterData[KEY];
  const selected = _selected === null ? null : _selected.map(Number);
  const handleRemove = () =>
    setData((prev) => ({
      ...prev,
      [KEY]: [],
    }));

  const { data } = useQuery({
    queryFn: () => getSeriesNames(selected ?? []),
    queryKey: ['GET_SERIES_NAMES', { selected }],
    enabled: (selected?.length ?? 0) > 0,
  });

  const name =
    selected === null
      ? `${t('common.series')}: ${t('common.all')}`
      : `${t('common.series')}: ${data?.join(',')}`;

  return <FilterItem name={name} onRemove={handleRemove} />;
};

export const SeriesTree = () => {
  const { data } = useQuery({
    queryFn: getAllSeries,
    queryKey: ['GET_ALL_SERIES'],
    staleTime: Infinity,
    meta: { toastId: 'FILTER_ASSET_SERIES' },
  });

  const { handleNodeChange, handleRootNodeChange, isRootNodeChecked, nodes } =
    useCoreFilter({
      data: data,
      key: KEY,
    });

  return (
    <CustomTreeItem
      nodeId={'series-root'}
      label={t('common.series')}
      checked={isRootNodeChecked}
      onCheckedChange={(_key, checked) => handleRootNodeChange(checked)}
    >
      {nodes?.map((series) => (
        <CustomTreeItem
          key={series.id}
          nodeId={String(series.id)}
          label={series.name}
          checked={series.checked}
          onCheckedChange={(key, checked) =>
            handleNodeChange(Number(key), checked)
          }
        />
      ))}
    </CustomTreeItem>
  );
};
