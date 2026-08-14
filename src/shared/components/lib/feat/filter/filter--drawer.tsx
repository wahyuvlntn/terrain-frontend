import clsx from 'clsx';
import { TreeView } from '@mui/x-tree-view/TreeView';
import {
  ChevronDownFill,
  ChevronRightFill,
  FilterFunnelFill,
} from '@digital-twin/icons';
import { t } from '@digital-twin/utils';
import React, { ReactNode, useContext, useRef, useState } from 'react';

import { Drawer } from '../../navigation';
import { FilterCtx, useGetAllLocationAssets } from './filter';
import {
  FILTER_KEY_ASSET,
  FILTER_KEY_LOCATION,
  LocationAssetTree,
} from './filter.location';
import styles from './filter--drawer.module.scss';
import {
  CoreFilterProvider,
  CoreFilterProviderRef,
  useCoreFilterClient,
} from './filter-data';

type FilterDrawerContainerProps = {
  children: ReactNode;
};
export const FilterDrawerContainer = ({
  children,
}: FilterDrawerContainerProps) => (
  <div className={styles['filter-drawer']}>{children}</div>
);

type FilterDrawerProps = {
  title?: string;
  children?: ReactNode;
};
export const FilterDrawer = ({ title, children }: FilterDrawerProps) => {
  const ctx = useContext(FilterCtx);
  if (ctx == null) {
    throw new Error(
      'FilterDrawerToggleButton components must be wrapped in <Filter />'
    );
  }

  const { open, setOpen } = ctx;

  const { data, setData } = useCoreFilterClient();

  const ref = useRef<CoreFilterProviderRef>(null);

  const handleApply = () => {
    if (!ref.current) return;

    const data = ref.current.getData();
    setData(data);
  };

  return (
    <Drawer
      title={title ?? t('common.filter_setup')}
      icon={<FilterFunnelFill />}
      open={open}
      onClose={() => setOpen(false)}
      variant={'apply'}
      onSubmit={(e) => {
        e.preventDefault();
        handleApply();
        setOpen(false);
      }}
    >
      <FilterDrawerContainer>
        <CoreFilterProvider data={data} ref={ref}>
          {children}
        </CoreFilterProvider>
      </FilterDrawerContainer>
    </Drawer>
  );
};

type FilterTreeProps = {
  children?: ReactNode;
  className?: string;
};
export const FilterTree = ({ children, className }: FilterTreeProps) => {
  const [expanded, setExpanded] = useState<string[]>([]);
  const handleToggle = (_: React.SyntheticEvent, nodeIds: string[]) => {
    setExpanded(nodeIds);
  };

  return (
    <TreeView
      defaultCollapseIcon={<ChevronDownFill />}
      defaultExpandIcon={<ChevronRightFill />}
      expanded={expanded}
      onNodeToggle={handleToggle}
      className={clsx(styles.tree, className)}
    >
      <LocationAssetTree />
      {children}
    </TreeView>
  );
};

type FilterDrawerShortcutsProps = {
  children: ReactNode;
};
export const FilterDrawerShortcuts = ({
  children,
}: FilterDrawerShortcutsProps) => {
  const ctx = useContext(FilterCtx);
  if (ctx == null) {
    throw new Error(
      'FilterDrawerToggleButton components must be wrapped in <Filter />'
    );
  }

  const { setData } = useCoreFilterClient();

  const { onlyOneRootLocation } = ctx;

  const { data } = useGetAllLocationAssets();

  const handleReset = () =>
    setData((prev) =>
      Object.keys(prev).reduce(
        (acc, curr) => ({
          ...acc,
          [curr]: null,
          [FILTER_KEY_LOCATION]: !onlyOneRootLocation
            ? null
            : [data?.[0]?.id ?? 0],
          [FILTER_KEY_ASSET]: [],
        }),
        {}
      )
    );

  return (
    <>
      <div className={styles.shortcut}>
        <div className={styles.title}>
          <h4>{t('common.selected_filter')}</h4>
          <span className={styles.clear} onClick={handleReset}>
            {t('common.reset')}
          </span>
        </div>
        <div className={styles.list}>{children}</div>
      </div>
      <div className={styles.hr} />
    </>
  );
};
