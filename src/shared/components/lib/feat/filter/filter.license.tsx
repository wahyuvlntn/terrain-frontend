import { t } from '@digital-twin/utils';
import React from 'react';

import { LICENSE_STATUS_NAME } from '../../mapping';
import { CustomTreeItem } from './filter--tree-item';
import { useCoreFilter, useCoreFilterClient } from './filter-data';
import { FilterItem } from './filter-shortcut';

const KEY = 'licenseStatusIds';

export { KEY as FILTER_KEY_LICENSE };

export const FILTER_SEARCH_PARAMS_PARSER_LICENSE = (data: string) => data;

export const LicenseShortcut = () => {
  const { setData, data } = useCoreFilterClient();
  const selected = data[KEY];
  const handleRemove = () =>
    setData((prev) => ({
      ...prev,
      [KEY]: [],
    }));

  const name =
    selected === null
      ? `${t('common.license_status')}: ${t('common.all')}`
      : `${t('common.license_status')}: ${selected
          .map(
            (item) =>
              LICENSE_STATUS_NAME[item as keyof typeof LICENSE_STATUS_NAME]
          )
          .join(',')}`;

  return <FilterItem name={name} onRemove={handleRemove} />;
};

export const LicenseTree = () => {
  const { handleNodeChange, handleRootNodeChange, isRootNodeChecked, nodes } =
    useCoreFilter({
      data: Object.keys(LICENSE_STATUS_NAME).map((key) => ({
        id: key,
        name: LICENSE_STATUS_NAME[key as keyof typeof LICENSE_STATUS_NAME],
      })),
      key: KEY,
    });

  return (
    <CustomTreeItem
      nodeId={'license-status-root'}
      label={t('common.license_status')}
      checked={isRootNodeChecked}
      onCheckedChange={(_key, checked) => handleRootNodeChange(checked)}
    >
      {nodes?.map((licenseStatus) => (
        <CustomTreeItem
          key={licenseStatus.id}
          nodeId={licenseStatus.id}
          label={licenseStatus.name}
          checked={licenseStatus.checked}
          onCheckedChange={handleNodeChange}
        />
      ))}
    </CustomTreeItem>
  );
};
