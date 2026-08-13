import { t } from '@digital-twin/utils';
import React from 'react';

import { STATUS_NAME } from '../../mapping';
import { FilterItem } from '.';
import { CustomTreeItem } from './filter--tree-item';
import { useCoreFilter, useCoreFilterClient } from './filter-data';

const KEY = 'statusIds';

export const StatusShortcut = () => {
  const { setData, data } = useCoreFilterClient();
  const selected = data[KEY];
  const handleRemove = () =>
    setData((prev) => ({
      ...prev,
      [KEY]: [],
    }));

  if (selected && selected.length === 0) return null;

  const name =
    selected === null
      ? `${t('common.status')}: ${t('common.all')}`
      : `${t('common.status')}: ${selected
          .map((item) => STATUS_NAME[item as keyof typeof STATUS_NAME])
          .join(',')}`;

  return <FilterItem name={name} onRemove={handleRemove} />;
};

type StatusTreeProps = {
  data: Record<string, string>;
};

export const StatusTree = ({ data }: StatusTreeProps) => {
  const { handleNodeChange, handleRootNodeChange, isRootNodeChecked, nodes } =
    useCoreFilter({
      data: Object.keys(data).map((key) => ({
        id: key,
        name: data[key as keyof typeof data],
      })),
      key: KEY,
    });

  return (
    <CustomTreeItem
      nodeId={'status-root'}
      label={t('common.status')}
      checked={isRootNodeChecked}
      onCheckedChange={(_key, checked) => handleRootNodeChange(checked)}
    >
      {nodes?.map((status) => (
        <CustomTreeItem
          key={status.id}
          nodeId={status.id}
          label={status.name}
          checked={status.checked}
          onCheckedChange={handleNodeChange}
        />
      ))}
    </CustomTreeItem>
  );
};

export const FILTER_SEARCH_PARAMS_PARSER_STATUS = (data: string) => data;

export { KEY as FILTER_KEY_STATUS };
