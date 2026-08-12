import { toast } from '@digital-twin/reusables';
import { useQuery } from '@tanstack/react-query';
import { ChangeEvent, MouseEventHandler, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useDebounce } from '../../hooks';
import { getLocationTreeInput, TreeNode } from './location-tree-input.api';

export const useLocationTree = (
  initialExpandedItems: string[] | undefined,
  initialSelectedNode: string | undefined,
  initialSelectedParent: string | undefined,
  locationId?: number | null
) => {
  const [expandedItems, setExpandedItems] = useState<string[]>(
    initialExpandedItems ?? []
  );
  const [selectedLocationNode, setSelectedLocationNode] = useState<
    string | null
  >(initialSelectedParent ?? null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [locationSearchInput, setLocationSearchInput] = useState<
    string | number | readonly string[] | undefined
  >('');

  const { debouncedVal: locationSearch } = useDebounce(
    locationSearchInput,
    500
  );

  const { data: locationTree } = useQuery({
    queryKey: [
      'getLocationTreeInput',
      locationSearch,
      initialSelectedNode,
      locationId,
    ] as const,
    queryFn: async (): Promise<TreeNode[] | null> => {
      try {
        // if (variant === 'epm') {
        //   const locationTreeData = await getLocationTreeInput({
        //     excludedId: initialSelectedNode
        //       ? parseInt(initialSelectedNode)
        //       : null,
        //     searchFilter: locationSearch as string,
        //     locationId: null,
        //   });
        //   if (!locationTreeData) return null;
        //   if (initialSelectedNode) {
        //     return locationTreeData.filter((item) =>
        //       item.id ? item.id.toString() : null !== initialSelectedNode
        //     );
        //   } else {
        //     return locationTreeData;
        //   }
        // }

        const locationTreeData = await getLocationTreeInput({
          searchFilter: locationSearch as string,
          excludedId: null,
          locationId: locationId ?? null,
        });

        if (!locationTreeData) return null;

        return locationTreeData;
        // if (initialSelectedNode) {
        //   return locationTreeData.filter((item) =>
        //     item.id ? item.id.toString() : null !== initialSelectedNode
        //   );
        // } else {
        //   return locationTreeData;
        // }
      } catch (err) {
        const error = err as Error;
        toast.error(error.message);
        return null;
      }
    },
    refetchOnWindowFocus: false,
    meta: {
      toastId: [
        'getLocationTreeInput',
        locationSearch,
        initialSelectedNode,
        locationId,
      ],
    },
  });

  const expandNode: MouseEventHandler<SVGSVGElement> = (e) => {
    const targetElement = e.target as HTMLElement;
    if (targetElement) {
      setExpandedItems((prev) =>
        prev.filter((item) => item !== targetElement.id)
      );
    }
  };

  const collapseNode: MouseEventHandler<SVGSVGElement> = (e) => {
    const targetElement = e.target as HTMLElement;
    if (targetElement) {
      setExpandedItems((prev) => [...prev, targetElement.id]);
    }
  };

  const selectedLocationNodeHandler = (
    _event: React.SyntheticEvent<Element, Event>,
    nodeIds: string
  ) => {
    setSearchParams((searchParams) => {
      searchParams.set('location_input', nodeIds);

      return searchParams;
    });
    setSelectedLocationNode(nodeIds);
  };

  const locationSearchInputChangeHandler = (
    e: ChangeEvent<HTMLInputElement>
  ) => {
    setLocationSearchInput(e.target.value);
  };

  useEffect(() => {
    setSearchParams((searchParams) => {
      searchParams.set('location_input', initialSelectedParent ?? '');

      return searchParams;
    });
  }, [initialSelectedParent]);

  return {
    locationSearchInput,
    locationTree,
    selectedLocationNode,
    expandedItems,
    searchParams,
    selectedLocationNodeHandler,
    locationSearchInputChangeHandler,
    expandNode,
    collapseNode,
  };
};
