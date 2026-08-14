import './filter.scss';

import { TreeItemProps } from '@mui/x-tree-view/TreeItem';
import { FilterFunnel } from '@digital-twin/icons';
import { t } from '@digital-twin/utils';
import { useQuery } from '@tanstack/react-query';
import React, {
  cloneElement,
  createContext,
  forwardRef,
  ReactElement,
  ReactNode,
  Ref,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useSearchParams } from 'react-router-dom';

import { Button } from '../../input';
import { AuthCtx } from '../auth';
import { getAllLocationsAndAssets } from './filter.api';
import { FILTER_KEY_ASSET, FILTER_KEY_LOCATION } from './filter.location';
import styles from './filter.module.scss';
import { CustomTreeItem, Selector, SelectorWithAll } from './filter--tree-item';
import { CoreFilterProvider, Data } from './filter-data';
import { FilterShortcut } from './filter-shortcut';
import { NodeWithChildren, TOneRootLocationOnly } from './type';

interface CustomTreeProps {
  data: NodeWithChildren[];
}

export const CustomTree = forwardRef(function CustomTreeFn(
  {
    data,
    selectors,
    ...props
  }: TreeItemProps &
    CustomTreeProps & {
      checked?: boolean;
      onCheckedChange: (key: string, checked: boolean) => void;
      selectors?: SelectorWithAll[];
    },
  ref: Ref<HTMLLIElement>
) {
  let parentSelector: Selector | undefined;
  let childrenSelector =
    (selectors?.length ?? 0) > 1 ? selectors?.slice(1) : undefined;

  if (
    selectors?.[0] === 'checkbox' ||
    selectors?.[0] === 'radio' ||
    selectors?.[0] === 'none'
  ) {
    parentSelector = selectors?.[0];
  } else if (selectors?.[0] === 'checkbox-all') {
    parentSelector = 'checkbox' as const;
    childrenSelector = ['checkbox-all'];
  } else if (selectors?.[0] === 'radio-all') {
    parentSelector = 'radio' as const;
    childrenSelector = ['radio-all'];
  } else if (selectors?.[0] === 'none-all') {
    parentSelector = 'none' as const;
    childrenSelector = ['none-all'];
  } else parentSelector = undefined;

  return (
    <CustomTreeItem {...props} selector={parentSelector} ref={ref}>
      {data.map((item) => (
        <CustomTree
          key={item.key}
          nodeId={item.key ?? ''}
          label={item.name}
          data={item.children}
          checked={item.checked}
          onCheckedChange={props.onCheckedChange}
          selectors={childrenSelector}
        />
      ))}
    </CustomTreeItem>
  );
});

type TFilterCtx = {
  open: boolean;
  setOpen: (open: boolean) => void;
  withPermission?: boolean;
  onlyOneRootLocation?: TOneRootLocationOnly;
  isReady: boolean;
  setFilter: React.Dispatch<
    React.SetStateAction<
      { isReady: boolean; data: Data } & Record<string, unknown>
    >
  >;
  data: {
    locationIds: number[] | null;
    assetIds: number[];
  } & TUseGetFilterResult<Record<string, string | number>>;
} & TUseAdditionalFilter<Record<string, unknown>>;

export const FilterCtx = createContext<TFilterCtx | null>(null);

export const useGetAllLocationAssets = () => {
  const { data } = useQuery({
    queryFn: getAllLocationsAndAssets,
    queryKey: ['GET_ALL_LOCATIONS_AND_ASSETS'],
    meta: { toastId: 'FILTER_LOCATIONS_AND_ASSETS' },
  });

  return {
    data,
  };
};

type FilterProps<
  T extends Record<string, string | number>,
  U extends Record<string, unknown>
> = {
  onlyOneRootLocation?: TOneRootLocationOnly;
  children: ReactNode;
  withPermission?: boolean;
  onDataChange: React.Dispatch<React.SetStateAction<Data>>;
  isReady: boolean;
  setFilter: React.Dispatch<
    React.SetStateAction<
      {
        isReady: boolean;
        data: Data;
      } & Omit<
        TUseAdditionalFilter<U>,
        | 'children'
        | 'onDataChange'
        | 'setFilter'
        | 'data'
        | 'onlyOneRootLocation'
      >
    >
  >;
  data: {
    locationIds: number[] | null;
    assetIds: number[];
  } & TUseGetFilterResult<T>;
} & TUseAdditionalFilter<U>;

export const Filter = <
  T extends Record<string, string | number>,
  U extends Record<string, unknown>
>({
  children,
  onlyOneRootLocation,
  withPermission = true,
  onDataChange,
  setFilter,
  isReady,
  data,
  ...filter
}: FilterProps<T, U>) => {
  const [open, setOpen] = useState(false);

  return (
    <FilterCtx.Provider
      value={{
        open,
        setOpen,
        withPermission,
        onlyOneRootLocation,
        isReady,
        data,
        ...filter,
        setFilter: setFilter as React.Dispatch<
          React.SetStateAction<
            { isReady: boolean; data: Data } & Record<string, unknown>
          >
        >,
      }}
    >
      <CoreFilterProvider data={data} setData={onDataChange}>
        {children}
      </CoreFilterProvider>
    </FilterCtx.Provider>
  );
};

type FilterShortcutContainer = {
  children: ReactNode;
};

export const FilterShortcutContainer = ({
  children,
}: FilterShortcutContainer) => (
  <div className={styles['filter-shortcut']}>{children}</div>
);

type FilterDrawerToggleButtonProps = {
  children?: ReactElement;
};

export const FilterDrawerToggleButton = ({
  children,
}: FilterDrawerToggleButtonProps) => {
  const ctx = useContext(FilterCtx);
  if (ctx == null) {
    throw new Error(
      'FilterDrawerToggleButton components must be wrapped in <Filter />'
    );
  }

  const { setOpen } = ctx;

  if (children)
    return cloneElement(children as React.ReactElement<{ onClick?: (e: { stopPropagation: () => void }) => void }>, {
      onClick: (e: { stopPropagation: () => void }) => {
        e.stopPropagation();
        setOpen(true);
      },
    });

  return (
    <Button
      onClick={() => setOpen(true)}
      icon={<FilterFunnel />}
      color={'default-secondary'}
    >
      Filters
    </Button>
  );
};

type FilterShortcutWrapperProps = {
  children: ReactNode;
};

export const FilterShortcutWrapper = ({
  children,
}: FilterShortcutWrapperProps) => {
  return <FilterShortcut>{children}</FilterShortcut>;
};

type TUseGetFilterResult<T extends Record<string, number | string>> = {
  [K in keyof T]: null | T[K][];
};

type TUseAdditionalFilter<T extends Record<string, unknown>> = {
  [K in keyof T]: T[K];
};

type TUseGetFilterParams = {
  keys?: {
    key: string;
    searchParamsParser?: (data: string) => number | string;
  }[];
  additionalFilters?: Array<
    | {
        key: string;
        isArray: true;
        searchParamsParser?: (data: string[]) => unknown;
      }
    | {
        key: string;
        isArray?: false;
        searchParamsParser?: (data: string | null) => unknown;
      }
  >;
  shouldBeResetKeyOnApply?: Record<string, unknown>;
  onlyOneRootLocation?: TOneRootLocationOnly;
};

export const useGetFilter = <
  T extends Record<string, string | number>,
  U extends Record<string, unknown>
>({
  keys,
  additionalFilters,
  shouldBeResetKeyOnApply,
  onlyOneRootLocation,
}: TUseGetFilterParams) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { userData } = useContext(AuthCtx);
  const [filter, setFilter] = useState<
    {
      isReady: boolean;
      data: Data;
    } & TUseAdditionalFilter<U>
  >(() => {
    const additionalFilterData: TUseAdditionalFilter<U> =
      {} as TUseAdditionalFilter<U>;
    additionalFilters?.forEach((item) => {
      if (item.isArray) {
        const data = searchParams.getAll(item.key);
        // @ts-expect-error TS2322: Type unknown is not assignable to type U[keyof U]
        additionalFilterData[item.key as keyof typeof additionalFilterData] =
          item.searchParamsParser?.(data) ?? data;
      } else {
        const data = searchParams.get(item.key);
        // @ts-expect-error TS2322: Type unknown is not assignable to type U[keyof U]
        additionalFilterData[item.key as keyof typeof additionalFilterData] =
          item.searchParamsParser?.(data) ?? data;
      }
    });

    const data: Data = {};

    data[FILTER_KEY_ASSET] = searchParams.getAll(FILTER_KEY_ASSET).map(Number);

    [
      ...(keys ?? []),
      {
        key: FILTER_KEY_LOCATION,
        searchParamsParser: (data: string) => Number(data),
      },
    ].forEach((item) => {
      const noFilter = searchParams.get(`no-${item.key}-filter`);
      if (noFilter) {
        data[item.key] = [];
        return;
      }

      const keyData = searchParams.getAll(item.key);
      data[item.key] = keyData.length
        ? keyData.map((data) => item.searchParamsParser?.(data) ?? data)
        : null;
    });
    return {
      isReady: false,
      data,
      ...additionalFilterData,
    };
  });

  const locationIds = filter.data[FILTER_KEY_LOCATION] as number[] | null;
  const assetIds = filter.data[FILTER_KEY_ASSET] as number[];

  const { data: _data, isReady, ..._filter } = filter;
  const data = (keys ?? []).reduce(
    (acc, curr) => ({ ...acc, [curr.key]: _data[curr.key] }),
    {}
  ) as TUseGetFilterResult<T>;

  const handleFilterDataChange: React.Dispatch<React.SetStateAction<Data>> = (
    data
  ) =>
    setFilter((prev) => {
      const shouldBeResetKeyData = Object.keys(
        shouldBeResetKeyOnApply ?? {}
      ).reduce(
        (acc, curr) => ({
          ...acc,
          [curr]: shouldBeResetKeyOnApply?.[curr],
        }),
        {}
      );

      return {
        ...prev,
        ...shouldBeResetKeyData,
        data: typeof data === 'function' ? data({ ...prev.data }) : data,
      };
    });

  useEffect(() => {
    if (!filter.isReady) return;

    setSearchParams((prev) => {
      additionalFilters?.forEach((item) => {
        if (filter[item.key] === null) prev.delete(item.key);
        else if (item.isArray) {
          prev.delete(item.key);
          // @ts-expect-error TS2339: Property forEach does not exist on type NonNullable<U[string]>
          filter[item.key]?.forEach((val) =>
            prev.append(item.key, String(val))
          );
        } else prev.set(item.key, String(filter[item.key]));
      });

      prev.delete(FILTER_KEY_ASSET);
      filter.data[FILTER_KEY_ASSET]?.forEach((item) => {
        prev.append(FILTER_KEY_ASSET, String(item));
      });

      [...(keys ?? []).map((item) => item.key), FILTER_KEY_LOCATION].forEach(
        (key) => {
          prev.delete(key);
          prev.delete(`no-${key}-filter`);

          if (filter.data[key] === null) return;
          if (filter.data[key]?.length === 0)
            return prev.set(`no-${key}-filter`, 'true');

          filter.data[key]?.forEach((item) => prev.append(key, String(item)));
        }
      );

      return prev;
    });
  }, [
    JSON.stringify(filter),
    JSON.stringify(additionalFilters),
    JSON.stringify(keys),
  ]);

  const { data: allLocs } = useGetAllLocationAssets();

  useEffect(() => {
    const handleLocationAuthorization = () => {
      if (userData === undefined) return;
      const isRoleBypassPermission =
        userData.role === 'superuser' || userData.role === 'admin';
      if (isRoleBypassPermission && !onlyOneRootLocation)
        return setFilter((prev) =>
          prev.isReady ? prev : { ...prev, isReady: true }
        );
      if (allLocs === undefined) return;

      return setFilter((prev) => {
        if (prev.isReady) return prev;

        if (
          prev.data[FILTER_KEY_LOCATION]?.length === 0 &&
          prev.data[FILTER_KEY_ASSET]?.length === 0
        )
          return { ...prev, isReady: true };

        const hasUnauthorizedLoc = () =>
          prev.data[FILTER_KEY_LOCATION]?.some(
            (loc) => !allLocs.find((item) => item.id === loc)
          );

        if (prev.data[FILTER_KEY_LOCATION] === null || hasUnauthorizedLoc()) {
          const shouldBeResetKeyData = Object.keys(
            shouldBeResetKeyOnApply ?? {}
          ).reduce(
            (acc, curr) => ({
              ...acc,
              [curr]: shouldBeResetKeyOnApply?.[curr],
            }),
            {}
          );

          const root = allLocs
            .filter((item) => item.parentId === null)
            .map((item) => item.id);

          return {
            ...prev,
            isReady: true,
            ...shouldBeResetKeyData,
            data: {
              ...prev.data,
              [FILTER_KEY_LOCATION]: onlyOneRootLocation
                ? root[0]
                  ? [root[0]]
                  : []
                : root,
              [FILTER_KEY_ASSET]: [],
            },
          };
        }

        if (!onlyOneRootLocation)
          return {
            ...prev,
            isReady: true,
          };

        if (onlyOneRootLocation === 'sparse-children') {
          const checkIsSelectedOneRootLocationOnly = () => {
            if (prev.data[FILTER_KEY_LOCATION] === null)
              return {
                check: false,
                locationRoots: null,
                assetRoots: null,
              };

            const idToRoot = new Map<number, number>();

            const findRoot = (id: number) => {
              if (!idToRoot.has(id)) {
                const item = allLocs.find((item) => item.id === id);
                if (!item || item.parentId === null) idToRoot.set(id, id);
                else idToRoot.set(id, findRoot(item.parentId));
              }
              return idToRoot.get(id) ?? 0;
            };

            const locationRoots = new Map<number, number>();
            const assetRoots = new Map<number, number>();

            let uniqueRoot: number | undefined = undefined;

            allLocs.forEach((item) => {
              const root = findRoot(item.id);
              locationRoots.set(item.id, root);
              item.assets.forEach((asset) => assetRoots.set(asset.id, root));
            });

            for (const item of prev.data[FILTER_KEY_LOCATION]) {
              const root = locationRoots.get(Number(item));

              if (root === undefined)
                return {
                  check: false,
                  locationRoots,
                  assetRoots,
                };
              if (uniqueRoot === undefined) uniqueRoot = root;
              if (uniqueRoot !== root)
                return {
                  check: false,
                  locationRoots,
                  assetRoots,
                };
            }

            for (const item of prev.data[FILTER_KEY_ASSET] ?? []) {
              const root = assetRoots.get(Number(item));

              if (root === undefined)
                return {
                  check: false,
                  locationRoots,
                  assetRoots,
                };
              if (uniqueRoot === undefined) uniqueRoot = root;
              if (uniqueRoot !== root)
                return {
                  check: false,
                  locationRoots,
                  assetRoots,
                };
            }

            return {
              check: true,
              locationRoots,
              assetRoots,
            };
          };

          const { check, locationRoots, assetRoots } =
            checkIsSelectedOneRootLocationOnly();

          if (check)
            return {
              ...prev,
              isReady: true,
            };

          let uniqueRoot: number;
          const newLocs: number[] = [];
          const newAssets: number[] = [];
          prev.data[FILTER_KEY_LOCATION]?.forEach((item) => {
            const root = locationRoots?.get(Number(item));
            if (root && (root === uniqueRoot || uniqueRoot === undefined)) {
              newLocs.push(Number(item));
              uniqueRoot = root;
            }
          });
          prev.data[FILTER_KEY_ASSET]?.forEach((item) => {
            const root = assetRoots?.get(Number(item));
            if (root && (root === uniqueRoot || uniqueRoot === undefined)) {
              newAssets.push(Number(item));
              uniqueRoot = root;
            }
          });

          return {
            ...prev,
            isReady: true,
            data: {
              ...prev.data,
              [FILTER_KEY_LOCATION]: newLocs,
              [FILTER_KEY_ASSET]: newAssets,
            },
          };
        }

        const checkIsSelectedOneParentOnly = () => {
          let parent: number | undefined = undefined;
          for (const loc of prev.data[FILTER_KEY_LOCATION] ?? []) {
            const parentLoc = allLocs?.find(
              (item) => item.id === Number(loc)
            )?.parentId;
            if (parentLoc === undefined) continue;
            if (parentLoc === null) return false;
            if (parent === undefined) parent = parentLoc;
            else if (parentLoc !== parent) return false;
          }

          for (const asset of prev.data[FILTER_KEY_ASSET] ?? []) {
            const parentLoc = allLocs?.find((item) =>
              item.assets.find((item) => item.id === Number(asset))
            )?.id;
            if (parentLoc === undefined) continue;
            if (parent === undefined) parent = parentLoc;
            else if (parentLoc !== parent) return false;
          }
        };

        const getOneOfParent = () =>
          allLocs?.find(
            (item) => item.id === Number(prev.data[FILTER_KEY_LOCATION]?.[0])
          )?.parentId ||
          allLocs?.find((item) =>
            item.assets.find(
              (item) => item.id === Number(prev.data[FILTER_KEY_ASSET]?.[0])
            )
          )?.id;

        if (onlyOneRootLocation === 'semi-sparse-children') {
          if (checkIsSelectedOneParentOnly())
            return {
              ...prev,
              isReady: true,
            };

          let uniqueParent: number | undefined = undefined;
          const newLocs: number[] = [];
          const newAssets: number[] = [];
          prev.data[FILTER_KEY_LOCATION]?.forEach((item) => {
            const parent = allLocs.find(
              (loc) => loc.id === Number(item)
            )?.parentId;
            if (
              parent &&
              (parent === uniqueParent || uniqueParent === undefined)
            ) {
              newLocs.push(Number(item));
              uniqueParent = parent;
            }
          });
          prev.data[FILTER_KEY_ASSET]?.forEach((item) => {
            const parent = allLocs.find((loc) =>
              loc.assets.find((asset) => asset.id === Number(item))
            )?.id;
            if (
              parent &&
              (parent === uniqueParent || uniqueParent === undefined)
            ) {
              newAssets.push(Number(item));
              uniqueParent = parent;
            }
          });

          return {
            ...prev,
            isReady: true,
            data: {
              ...prev.data,
              [FILTER_KEY_LOCATION]: uniqueParent
                ? newLocs
                : prev.data[FILTER_KEY_LOCATION]?.[0]
                ? [prev.data[FILTER_KEY_LOCATION][0]]
                : [],
              [FILTER_KEY_ASSET]: uniqueParent ? newAssets : [],
            },
          };
        }

        const checkIsAllSiblingsSelected = () => {
          if (!checkIsSelectedOneParentOnly()) return false;

          const parent = getOneOfParent();

          const siblingLocs = allLocs?.filter(
            (item) => item.parentId === parent
          );
          const siblingAsses = allLocs?.find(
            (item) => item.id === parent
          )?.assets;

          return (
            siblingLocs?.length + (siblingAsses?.length ?? 0) ===
            (prev.data[FILTER_KEY_LOCATION]?.length ?? 0) +
              (prev.data[FILTER_KEY_ASSET]?.length ?? 0)
          );
        };

        if (
          prev.data[FILTER_KEY_LOCATION]?.length === 1 ||
          checkIsAllSiblingsSelected()
        )
          return {
            ...prev,
            isReady: true,
          };
        const parent = getOneOfParent();

        return {
          ...prev,
          isReady: true,
          data: {
            ...prev.data,
            [FILTER_KEY_LOCATION]: parent
              ? [parent]
              : prev.data[FILTER_KEY_LOCATION]?.[0]
              ? [prev.data[FILTER_KEY_LOCATION][0]]
              : [],
            [FILTER_KEY_ASSET]: [],
          },
        };
      });
    };

    handleLocationAuthorization();
  }, [
    allLocs,
    setFilter,
    userData,
    onlyOneRootLocation,
    JSON.stringify(shouldBeResetKeyOnApply),
  ]);

  return {
    isReady,
    handleFilterDataChange,
    setFilter,
    ..._filter,
    data: {
      locationIds,
      assetIds,
      ...data,
    },
  };
};

export const useExtractFilter = <
  T extends Record<string, string | number>,
  U extends Record<string, unknown>
>() => {
  const ctx = useContext(FilterCtx);
  if (ctx === null)
    throw Error('useExtractFilter must be used inside <Filter></Filter>');

  const {
    isReady,
    data: _data,
    setFilter: _setFilter,
    onlyOneRootLocation,
    withPermission,
    open,
    setOpen,
    ...rest
  } = ctx;
  const filter = rest as TUseAdditionalFilter<U>;
  const data = _data as TUseGetFilterResult<T> & {
    locationIds: number[] | null;
    assetIds: number[];
  };

  const setFilter = _setFilter as React.Dispatch<
    React.SetStateAction<
      { isReady: boolean; data: Data } & TUseAdditionalFilter<U>
    >
  >;

  return {
    isReady,
    data,
    setFilter,
    filter,
  };
};
