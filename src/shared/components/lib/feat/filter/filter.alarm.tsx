import { t } from '@digital-twin/utils';
import React from 'react';

import { ALARM_TYPE_NAME } from '../../mapping';
import { CustomTreeItem } from './filter--tree-item';
import { useCoreFilter, useCoreFilterClient } from './filter-data';
import { FilterItem } from './filter-shortcut';

const KEY = 'alarmTypeIds';

export { KEY as FILTER_KEY_ALARM };

export const FILTER_SEARCH_PARAMS_PARSER_ALARM = (data: string) => data;

export const AlarmShortcut = () => {
  const { setData, data } = useCoreFilterClient();
  const selected = data[KEY];
  const handleRemove = () =>
    setData((prev) => ({
      ...prev,
      [KEY]: [],
    }));

  const name =
    selected === null
      ? `${t('common.alarm_type')}: ${t('common.all')}`
      : `${t('common.alarm_type')}: ${selected
          .map((item) => ALARM_TYPE_NAME[item as keyof typeof ALARM_TYPE_NAME])
          .join(',')}`;

  return <FilterItem name={name} onRemove={handleRemove} />;
};

export const AlarmTree = () => {
  const { handleNodeChange, handleRootNodeChange, isRootNodeChecked, nodes } =
    useCoreFilter({
      data: Object.keys(ALARM_TYPE_NAME).map((key) => ({
        id: key,
        name: ALARM_TYPE_NAME[key as keyof typeof ALARM_TYPE_NAME],
      })),
      key: KEY,
    });

  return (
    <CustomTreeItem
      nodeId={'alarm-type-root'}
      label={t('common.alarm_type')}
      checked={isRootNodeChecked}
      onCheckedChange={(_key, checked) => handleRootNodeChange(checked)}
    >
      {nodes?.map((alarm) => (
        <CustomTreeItem
          key={alarm.id}
          nodeId={alarm.id}
          label={alarm.name}
          checked={alarm.checked}
          onCheckedChange={handleNodeChange}
        />
      ))}
    </CustomTreeItem>
  );
};
