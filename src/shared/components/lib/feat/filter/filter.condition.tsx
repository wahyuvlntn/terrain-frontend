import { t } from '@digital-twin/utils';
import React from 'react';

import { CONDITION_NAME } from '../../mapping';
import { CustomTreeItem } from './filter--tree-item';
import { useCoreFilter, useCoreFilterClient } from './filter-data';
import { FilterItem } from './filter-shortcut';

const KEY = 'conditionIds';

export const ConditionShortcut = () => {
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
      ? `${t('common.condition')}: ${t('common.all')}`
      : `${t('common.condition')}: ${selected
          .map((item) => CONDITION_NAME[item as keyof typeof CONDITION_NAME])
          .join(',')}`;

  return <FilterItem name={name} onRemove={handleRemove} />;
};

export const ConditionTree = () => {
  const { handleNodeChange, handleRootNodeChange, isRootNodeChecked, nodes } =
    useCoreFilter({
      data: Object.keys(CONDITION_NAME).map((key) => ({
        id: key,
        name: CONDITION_NAME[key as keyof typeof CONDITION_NAME],
      })),
      key: KEY,
    });

  return (
    <CustomTreeItem
      nodeId={'condition-root'}
      label={t('common.condition')}
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

export const FILTER_SEARCH_PARAMS_PARSER_CONDITION = (data: string) => data;

export { KEY as FILTER_KEY_CONDITION };
