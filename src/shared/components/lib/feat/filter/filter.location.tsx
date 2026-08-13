import { filterUnique, t } from '@digital-twin/utils';
import { useQuery } from '@tanstack/react-query';
import React, { useContext, useMemo } from 'react';

import { AuthCtx } from '../auth';
import { CustomTree, FilterCtx, useGetAllLocationAssets } from './filter';
import {
  getLocationAssetNames,
  TGetAllLocationsAndAssets,
  TGetLocationAssetNames,
} from './filter.api';
import { SelectorWithAll } from './filter--tree-item';
import { TCoreFilterContext, useCoreFilterClient } from './filter-data';
import { FilterItem } from './filter-shortcut';
import { Node, NodeWithChildren, TOneRootLocationOnly } from './type';

const hasLocationAncestorChecked = (
  data: TGetAllLocationsAndAssets | undefined,
  selectedLocationIds: number[] | null,
  id: number | null
) => {
  if (!data) return false;

  const nodes = [data.find((loc) => loc.id === id)];

  while (nodes.length) {
    const node = nodes.pop();
    if (!node) return false;

    if (selectedLocationIds?.includes(node.id)) return true;

    const parentNode = data.find((loc) => loc.id === node.parentId);
    if (!parentNode) return false;

    nodes.push(parentNode);
  }

  return false;
};

const hasDescendantChecked = (
  data: TGetAllLocationsAndAssets | undefined,
  selectedLocationIds: number[] | null,
  selectedAssetIds: number[],
  id: number
) => {
  if (!data) return false;

  const nodes = [data.find((loc) => loc.id === id)];
  while (nodes.length) {
    const node = nodes.pop();
    if (!node) return false;

    if (selectedLocationIds?.includes(node.id)) return true;
    for (let i = 0; i < node.assets.length; i++) {
      if (selectedAssetIds.includes(node.assets[i].id)) return true;
    }

    const childrenNodes = data.filter((loc) => loc.parentId === node.id);
    if (!childrenNodes) return false;

    childrenNodes.forEach((childNode) => {
      nodes.push(childNode);
    });
  }

  return false;
};

const makeIndex = <T extends object>(
  items: T[],
  indexer: (item: T) => string | null
) => {
  const append = (r: Map<string | null, T[]>, k: string | null, v: T) =>
    r.set(k, (r.get(k) || []).concat([v]));
  return items.reduce<Map<string | null, T[]>>(
    (r, i) => append(r, indexer(i), i),
    new Map()
  );
};

const makeTree = (
  index: Map<string | null, Node[]>,
  root = 'root',
  accessor: (item: Node) => string | null
) => {
  const many = (all: Node[]) =>
    all.map(one).sort((a, b) => (a.name > b.name ? 1 : -1));
  const one: (node: Node) => NodeWithChildren = (node: Node) => ({
    ...node,
    children: many(index.get(accessor(node)) ?? []),
  });

  return many(index.get(root) ?? []);
};

const extractTypeIdFromKey = (key: string) => {
  if (key === 'root')
    return {
      isLocation: true,
      id: null,
    };

  const split = key.split('-');
  const type = split[0];
  const id = Number(split[1]);

  return {
    isLocation: type === 'locationIds',
    id,
  };
};

const LOCATION_KEY = 'locationIds';
const ASSET_KEY = 'assetIds';

export { ASSET_KEY as FILTER_KEY_ASSET, LOCATION_KEY as FILTER_KEY_LOCATION };

type THandleChangeUncheckDispatchFactoryParams = {
  key: string;
  onlyOneRootLocation?: TOneRootLocationOnly;
  data?: TGetAllLocationsAndAssets;
};

const handleChangeUncheckDispatchFactory =
  ({
    key,
    onlyOneRootLocation,
    data,
  }: THandleChangeUncheckDispatchFactoryParams) =>
  (prev: Record<string, (string | number)[] | null>) => {
    const nodes = createNodes({ onlyOneRootLocation, data });
    const index = makeIndex(
      nodes,
      (node: { key: string; parentKey: string }) => node.parentKey
    );

    let parentKey = nodes.find((item) => item.key === key)?.parentKey;

    // When onlyOneRootLocation is 'all-children'
    // only enable deselection if the node has less than 1 sibling
    if (onlyOneRootLocation === 'all-children') {
      if (!parentKey) return prev;

      const siblings = index.get(parentKey);
      if (!siblings) return prev;

      if (siblings.length > 2) return prev;
    }

    const ancestors: (number | null)[] = [];

    while (parentKey) {
      ancestors.unshift(
        parentKey === 'root' ? null : Number(parentKey.split('-')?.[1])
      );

      if (
        (parentKey === 'root' && prev[LOCATION_KEY] === null) ||
        prev[LOCATION_KEY]?.includes(Number(parentKey.split('-')?.[1]))
      )
        break;

      parentKey = nodes.find((item) => item.key === parentKey)?.parentKey;
    }

    const toBeAddedToSelectedLocs: number[] = [];
    const toBeAddedToSelectedAssets: number[] = [];

    if (onlyOneRootLocation === 'semi-sparse-children') {
      const originalParentKey = nodes.find(
        (item) => item.key === key
      )?.parentKey;
      if (!originalParentKey) return prev;

      index
        .get(originalParentKey)
        ?.filter((child) => child.key !== key)
        ?.forEach((child) => {
          const { id, isLocation } = extractTypeIdFromKey(child.key);
          if (id === null) return;

          if (
            (parentKey === 'root' && prev[LOCATION_KEY] === null) ||
            prev[LOCATION_KEY]?.some((loc) =>
              ancestors.includes(Number(loc))
            ) ||
            prev[isLocation ? LOCATION_KEY : ASSET_KEY]?.includes(id)
          )
            (toBeAddedToSelectedLocs
              ? toBeAddedToSelectedLocs
              : toBeAddedToSelectedAssets
            ).push(id);
        });

      return {
        ...prev,
        [LOCATION_KEY]: toBeAddedToSelectedLocs.filter(filterUnique),
        [ASSET_KEY]: toBeAddedToSelectedLocs.filter(filterUnique),
      };
    }

    while (ancestors.length) {
      const parent = ancestors.shift();
      const _child = ancestors[0];
      const child = _child !== undefined ? `${LOCATION_KEY}-${_child}` : key;

      index
        .get(parent === null ? 'root' : `${LOCATION_KEY}-${parent}`)
        ?.filter((node) => node.key !== child)
        ?.forEach((child) => {
          const { id, isLocation } = extractTypeIdFromKey(child.key);
          if (id === null) return;

          if (
            prev[LOCATION_KEY] === null ||
            prev[isLocation ? LOCATION_KEY : ASSET_KEY]?.includes(id) ||
            parentKey !== undefined
          )
            (isLocation
              ? toBeAddedToSelectedLocs
              : toBeAddedToSelectedAssets
            ).push(id);
        });
    }

    const { id: parentId } = extractTypeIdFromKey(parentKey ?? '');

    prev[LOCATION_KEY] = [
      ...(prev[LOCATION_KEY] ?? []),
      ...toBeAddedToSelectedLocs,
    ].filter(filterUnique);
    prev[ASSET_KEY] = [
      ...(prev[ASSET_KEY] ?? []),
      ...toBeAddedToSelectedAssets,
    ].filter(filterUnique);

    prev[LOCATION_KEY] =
      prev[LOCATION_KEY].filter((item) => item !== parentId) ?? [];

    const { id, isLocation } = extractTypeIdFromKey(key);

    prev[isLocation ? LOCATION_KEY : ASSET_KEY] =
      prev[isLocation ? LOCATION_KEY : ASSET_KEY]
        ?.filter((item) => item !== id)
        ?.filter(filterUnique) ?? [];

    return {
      ...prev,
    };
  };

type THandleChangeFactory = {
  coreFilterClient: TCoreFilterContext;
  withPermission?: boolean;
  isRoleBypassPermission: boolean;
  onlyOneRootLocation?: TOneRootLocationOnly;
  data?: TGetAllLocationsAndAssets;
};

const handleChangeFactory =
  ({
    coreFilterClient,
    isRoleBypassPermission,
    withPermission,
    data,
    onlyOneRootLocation,
  }: THandleChangeFactory) =>
  (key: string, checked: boolean) => {
    if (key === 'root' && !checked)
      return coreFilterClient.setData((prev) => ({
        ...prev,
        [LOCATION_KEY]: [],
        [ASSET_KEY]: [],
      }));

    if (key === 'root')
      return coreFilterClient.setData((prev) => ({
        ...prev,
        [ASSET_KEY]: [],
        [LOCATION_KEY]:
          withPermission && !isRoleBypassPermission
            ? data
                ?.filter((item) => item.parentId === null)
                .map((item) => item.id) ?? []
            : null,
      }));

    if (checked)
      return coreFilterClient.setData((prev) => {
        const nodes = createNodes({ onlyOneRootLocation, data });
        const index = makeIndex(
          nodes,
          (node: { key: string; parentKey: string }) => node.parentKey
        );
        let parentKey = nodes.find((item) => item.key === key)?.parentKey;

        const isAllSiblingsChecked = (parentKey: string, key: string) => {
          if (onlyOneRootLocation && parentKey === 'root') return false;

          return index.get(parentKey)?.every((sibling) => {
            if (sibling.key === key) return true;

            const { isLocation, id } = extractTypeIdFromKey(sibling.key);
            if (id === null) return false;

            return prev[isLocation ? LOCATION_KEY : ASSET_KEY]?.includes(id);
          });
        };

        if (onlyOneRootLocation === 'semi-sparse-children') {
          if (parentKey === 'root') {
            const { id } = extractTypeIdFromKey(key);
            return {
              ...prev,
              [LOCATION_KEY]: [id ?? 0],
              [ASSET_KEY]: [],
            };
          }
          const siblings = index.get(parentKey ?? '');

          const hasNotSiblingLocChecked = prev[LOCATION_KEY]?.some(
            (loc) =>
              !siblings
                ?.filter((sibling) => {
                  const { isLocation } = extractTypeIdFromKey(sibling.key);
                  return isLocation;
                })
                ?.find((sibling) => sibling.key === `${LOCATION_KEY}-${loc}`)
          );

          const hasNotSiblingAssetChecked = prev[ASSET_KEY]?.some(
            (asset) =>
              !siblings
                ?.filter((sibling) => {
                  const { isLocation } = extractTypeIdFromKey(sibling.key);
                  return !isLocation;
                })
                ?.find((sibling) => sibling.key === `${ASSET_KEY}-${asset}`)
          );

          const { isLocation, id } = extractTypeIdFromKey(key);
          if (hasNotSiblingLocChecked || hasNotSiblingAssetChecked)
            return {
              ...prev,
              [LOCATION_KEY]: [],
              [ASSET_KEY]: [],
              [isLocation ? LOCATION_KEY : ASSET_KEY]: [id ?? 0],
            };

          if (isAllSiblingsChecked(parentKey ?? '', key)) {
            const { id } = extractTypeIdFromKey(parentKey ?? '');
            return {
              ...prev,
              [LOCATION_KEY]: [id ?? 0],
              [ASSET_KEY]: [],
            };
          }

          return {
            ...prev,
            [isLocation ? LOCATION_KEY : ASSET_KEY]: [
              ...(prev[isLocation ? LOCATION_KEY : ASSET_KEY] ?? []),
              id ?? 0,
            ].filter(filterUnique),
          };
        }

        const toBeRemovedFromSelectedLocs: number[] = [];
        const toBeRemovedFromSelectedAssets: number[] = [];

        const descendants = index.get(key)?.map((child) => child.key);
        while (descendants?.length) {
          const descendant = descendants.shift();
          if (descendant === undefined) break;

          const { id, isLocation } = extractTypeIdFromKey(descendant);
          if (id === null) break;

          if (isLocation) toBeRemovedFromSelectedLocs.push(id);
          else toBeRemovedFromSelectedAssets.push(id);

          index
            .get(descendant)
            ?.forEach((grandChild) => descendants.push(grandChild.key));
        }

        while (parentKey && isAllSiblingsChecked(parentKey, key)) {
          index.get(parentKey)?.forEach((sibling) => {
            const { isLocation, id } = extractTypeIdFromKey(sibling.key);
            if (id === null) return;

            if (isLocation) toBeRemovedFromSelectedLocs.push(id);
            else toBeRemovedFromSelectedAssets.push(id);
          });

          key = parentKey;
          parentKey = nodes.find((item) => item.key === key)?.parentKey;
        }

        if (parentKey === undefined) {
          return {
            ...prev,
            [LOCATION_KEY]: null,
            [ASSET_KEY]: [],
          };
        }

        const { id, isLocation } = extractTypeIdFromKey(key);

        if (id === null) return prev;

        if (onlyOneRootLocation === 'all-children')
          return {
            ...prev,
            [isLocation ? LOCATION_KEY : ASSET_KEY]: [id],
          };

        if (onlyOneRootLocation === 'sparse-children') {
          while (parentKey && parentKey !== 'root') {
            key = parentKey;
            parentKey = nodes.find((item) => item.key === key)?.parentKey;
          }

          const siblings = index
            .get('root')
            ?.filter((sibling) => sibling.key !== key);
          const descendants = siblings?.map((child) => child.key);
          while (descendants?.length) {
            const descendant = descendants.shift();
            if (descendant === undefined) break;

            const { id, isLocation } = extractTypeIdFromKey(descendant);
            if (id === null) break;

            if (isLocation) toBeRemovedFromSelectedLocs.push(id);
            else toBeRemovedFromSelectedAssets.push(id);

            index
              .get(descendant)
              ?.forEach((grandChild) => descendants.push(grandChild.key));
          }
        }

        prev[LOCATION_KEY] =
          prev[LOCATION_KEY]?.filter(
            (item) => !toBeRemovedFromSelectedLocs.includes(Number(item))
          )?.filter(filterUnique) ?? [];
        prev[ASSET_KEY] =
          prev[ASSET_KEY]?.filter(
            (item) => !toBeRemovedFromSelectedAssets.includes(Number(item))
          )?.filter(filterUnique) ?? [];

        prev[isLocation ? LOCATION_KEY : ASSET_KEY] = [
          ...(prev[isLocation ? LOCATION_KEY : ASSET_KEY] ?? []),
          id,
        ].filter(filterUnique);

        return {
          ...prev,
        };
      });

    const handleChangeUncheckDispatch = handleChangeUncheckDispatchFactory({
      onlyOneRootLocation,
      key,
      data,
    });

    return coreFilterClient.setData(handleChangeUncheckDispatch);
  };

type TCreateNodesParams = {
  onlyOneRootLocation?: TOneRootLocationOnly;
  data?: TGetAllLocationsAndAssets;
};
const createNodes = ({ data, onlyOneRootLocation }: TCreateNodesParams) => {
  const nodes: { key: string; parentKey: string }[] = [];

  data?.forEach((loc) => {
    nodes.push({
      key: `${LOCATION_KEY}-${loc.id}`,
      parentKey: loc.parentId ? `${LOCATION_KEY}-${loc.parentId}` : 'root',
    });

    if (onlyOneRootLocation === 'all-children') return;

    loc.assets.forEach((asset) => {
      nodes.push({
        parentKey: `${LOCATION_KEY}-${loc.id}`,
        key: `${ASSET_KEY}-${asset.id}`,
      });
    });
  });

  return nodes;
};

type TUseGetNodesIndexParams = {
  onlyOneRootLocation?: TOneRootLocationOnly;
  data?: TGetAllLocationsAndAssets;
  selectedLocationIds: number[] | null;
  selectedAssetIds: number[];
};
const useGetNodesIndex = ({
  data,
  onlyOneRootLocation,
  selectedAssetIds,
  selectedLocationIds,
}: TUseGetNodesIndexParams) => {
  const { nodes, index } = useMemo(() => {
    const nodes: Node[] = [];

    data?.forEach((loc) => {
      nodes.push({
        ...loc,
        key: `${LOCATION_KEY}-${loc.id}`,
        parentKey: loc.parentId ? `${LOCATION_KEY}-${loc.parentId}` : 'root',
        checked:
          selectedLocationIds === null
            ? true
            : selectedLocationIds.includes(loc.id)
            ? true
            : hasLocationAncestorChecked(
                data,
                selectedLocationIds,
                loc.parentId
              )
            ? true
            : hasDescendantChecked(
                data,
                selectedLocationIds,
                selectedAssetIds,
                loc.id
              )
            ? undefined
            : false,
      });

      if (onlyOneRootLocation === 'all-children') return;

      loc.assets.forEach((asset) => {
        nodes.push({
          parentKey: `${LOCATION_KEY}-${loc.id}`,
          key: `${ASSET_KEY}-${asset.id}`,
          name: asset.name,
          checked:
            selectedLocationIds === null
              ? true
              : hasLocationAncestorChecked(data, selectedLocationIds, loc.id)
              ? true
              : selectedAssetIds.includes(asset.id),
        });
      });
    });

    const index = makeIndex(nodes, (node: Node) => node.parentKey);

    return { nodes, index };
  }, [data, selectedLocationIds, selectedAssetIds, onlyOneRootLocation]);

  return {
    nodes,
    index,
  };
};

export const LocationAssetTree = () => {
  const { userData } = useContext(AuthCtx);
  const isRoleBypassPermission =
    userData?.role === 'superuser' || userData?.role === 'admin';

  const ctx = useContext(FilterCtx);
  if (ctx == null) {
    throw new Error(
      'LocationAssetTree components must be wrapped in <Filter></Filter>'
    );
  }

  const { onlyOneRootLocation, withPermission } = ctx;

  const coreFilterClient = useCoreFilterClient();
  const selectedLocationIds = useMemo(
    () => coreFilterClient.data[LOCATION_KEY] as number[] | null,
    [JSON.stringify(coreFilterClient.data[LOCATION_KEY])]
  );
  const selectedAssetIds = useMemo(
    () => (coreFilterClient.data[ASSET_KEY] ?? []) as number[],
    [JSON.stringify(coreFilterClient.data[ASSET_KEY])]
  );

  const { data } = useGetAllLocationAssets();

  const { index } = useGetNodesIndex({
    selectedLocationIds,
    selectedAssetIds,
    onlyOneRootLocation,
    data,
  });

  const { locTree, rootLocationChecked } = useMemo(() => {
    const locTree = makeTree(index, 'root', (node: Node) => node.key);

    const rootLocationChecked = (() => {
      if (selectedLocationIds === null) return true;

      if (locTree.every((item) => item.checked)) return true;
      if (locTree.every((item) => item.checked === false)) return false;
      return undefined;

      // if (!isRoleBypassPermission) {
      //   if (locTree.every((item) => item.checked)) return true;
      //   if (locTree.every((item) => !item.checked)) return false;
      //   return undefined;
      // }

      // if (selectedLocationIds.length + selectedAssetIds.length > 0)
      //   return undefined;

      // return false;
    })();

    return { locTree, rootLocationChecked };
  }, [index, selectedLocationIds, selectedAssetIds, isRoleBypassPermission]);

  const selectors: SelectorWithAll[] | undefined = (() => {
    switch (onlyOneRootLocation) {
      case 'sparse-children':
        return ['none', 'radio', 'checkbox-all'];
      case 'all-children':
        return ['none', 'radio-all'];
      case 'semi-sparse-children':
        return ['none', 'radio', 'checkbox-all'];
      default:
        return undefined;
    }
  })();

  return (
    <CustomTree
      nodeId={'root'}
      label={t('common.locations')}
      checked={rootLocationChecked}
      data={locTree}
      onCheckedChange={handleChangeFactory({
        coreFilterClient,
        onlyOneRootLocation,
        data,
        isRoleBypassPermission,
        withPermission,
      })}
      selectors={selectors}
    />
  );
};

type TUseGetLocationNamesParams = {
  isReady: boolean;
  queryParams: {
    locationIds: number[] | null;
    assetIds: number[] | null;
  };
};
export const useGetLocationNames = ({
  isReady,
  queryParams,
}: TUseGetLocationNamesParams) => {
  const enabledQuery =
    isReady &&
    (queryParams.locationIds === null ||
      Boolean(
        (queryParams.locationIds?.length ?? 0) +
          (queryParams.assetIds?.length ?? 0)
      ));
  const { data: names } = useQuery({
    queryFn: () =>
      getLocationAssetNames(
        queryParams.locationIds,
        queryParams.assetIds ?? []
      ),
    queryKey: ['GET_LOCATION_ASSET_NAMES', queryParams],
    enabled: enabledQuery,
  });

  return { names, enabledQuery };
};

export const LocationShortcut = () => {
  const { userData } = useContext(AuthCtx);
  const isRoleBypassPermission =
    userData?.role === 'superuser' || userData?.role === 'admin';

  const ctx = useContext(FilterCtx);
  if (ctx == null) {
    throw new Error(
      'LocationAssetTree components must be wrapped in <Filter></Filter>'
    );
  }

  const { isReady, onlyOneRootLocation, withPermission } = ctx;

  const coreFilterClient = useCoreFilterClient();

  const queryParams = {
    locationIds: coreFilterClient.data[LOCATION_KEY] as number[] | null,
    assetIds: coreFilterClient.data[ASSET_KEY] as number[] | null,
  };

  const { data } = useGetAllLocationAssets();

  const { names, enabledQuery } = useGetLocationNames({
    isReady,
    queryParams,
  });

  if (!enabledQuery) return null;

  const handleChange = handleChangeFactory({
    data,
    isRoleBypassPermission,
    onlyOneRootLocation,
    withPermission,
    coreFilterClient,
  });

  const handleRemove = (filter: TGetLocationAssetNames) => {
    if (!filter.isLocation)
      //TODO: refactor handleChange to handle multiple ids
      return filter.data.forEach((item) =>
        handleChange(`${ASSET_KEY}-${item.id}`, false)
      );

    const key = `${LOCATION_KEY}-${filter.data[0]?.id}`;

    coreFilterClient.setData((prev) => {
      const nodes = createNodes({ onlyOneRootLocation, data });
      const index = makeIndex(
        nodes,
        (node: { key: string; parentKey: string }) => node.parentKey
      );

      const hasDescendantChecked = () => {
        const children = [...(index.get(key) ?? [])];
        while (children?.length) {
          const child = children.shift();
          if (!child) return false;

          const { id, isLocation } = extractTypeIdFromKey(child.key);
          if (id === null) return false;

          if (prev[isLocation ? LOCATION_KEY : ASSET_KEY]?.includes(id))
            return true;

          if (isLocation) children.push(...(index.get(child.key) ?? []));
        }

        return false;
      };

      if (prev[LOCATION_KEY]?.includes(key) || !hasDescendantChecked()) {
        const dispatch = handleChangeUncheckDispatchFactory({
          key,
          onlyOneRootLocation,
          data,
        });
        return dispatch(prev);
      }

      const children = [...(index.get(key) ?? [])];
      while (children?.length) {
        const child = children.shift();
        if (!child) break;

        const { id, isLocation } = extractTypeIdFromKey(child.key);
        if (id === null) break;

        if (prev[isLocation ? LOCATION_KEY : ASSET_KEY]?.includes(id))
          prev[isLocation ? LOCATION_KEY : ASSET_KEY] =
            prev[isLocation ? LOCATION_KEY : ASSET_KEY]?.filter(
              (item) => item !== id
            ) ?? [];

        if (isLocation) children.push(...(index.get(child.key) ?? []));
      }

      prev[LOCATION_KEY]?.push(filter.data[0]?.id);

      const dispatch = handleChangeUncheckDispatchFactory({
        key,
        onlyOneRootLocation,
        data,
      });
      return dispatch(prev);
    });
  };

  return names
    ?.filter((filter) => filter.data.length)
    ?.map((filter) => (
      <FilterItem
        key={filter.isLocation + filter.data.map((item) => item.id).join(',')}
        name={`${
          filter.isLocation ? '' : `${t('common.equipment')}: `
        }${filter.data.map((item) => item.name).join(',')}`}
        onRemove={() => handleRemove(filter)}
      />
    ));
};
