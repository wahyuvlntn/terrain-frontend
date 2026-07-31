import { t } from '@digital-twin/utils';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ChangeEvent, MouseEventHandler, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useDebounce } from '../../../../hooks';
import {
  deleteLocation,
  getLocationDetails,
  getLocationTree,
  getLocationTreeDel,
  LocationDetailsType,
  TreeNode,
  updateLocationParentID,
  UpdateParentInput,
} from './api/location-manager';

export const useLocationManager = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [locationTree, setLocationTree] = useState<TreeNode[] | null>(null);
  const [locationSearchInput, setLocationSearchInput] = useState<
    string | number | readonly string[] | undefined
  >('');
  const [selectedLocationNode, setSelectedLocationNode] = useState<
    string | null
  >(searchParams.get('location_id') ?? null);
  const { debouncedVal: locationSearch } = useDebounce(
    locationSearchInput,
    1000
  );
  const [addDrawerOpen, setAddDrawerOpen] = useState<boolean>(false);
  const [editDrawerOpen, setEditDrawerOpen] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);

  const expandedParams = searchParams.get('expanded_items');
  const [expandedItems, setExpandedItems] = useState<string[]>(
    expandedParams ? JSON.parse(searchParams.get('expanded_items') ?? '') : []
  );
  const [showTargetBox, setShowTargetBox] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const {
    data: location,
    refetch: refetchLocation,
    isFetching: isFetchingLocation,
  } = useQuery({
    queryKey: ['getLocationTree', locationSearch] as const,
    queryFn: async (): Promise<TreeNode[] | null> => {
      return await getLocationTree({
        searchFilter:
          String(locationSearch) === '' ? null : String(locationSearch),
        locationId: null,
      });
    },
    refetchOnWindowFocus: false,
    staleTime: Infinity,
    meta: {
      toastId: ['getLocationTree', locationSearch],
    },
  });

  useEffect(() => {
    if (location) {
      const masterTree: TreeNode[] = [
        { id: -1, name: 'Location', childs: location },
      ];
      setLocationTree(masterTree);
    }
  }, [location]);

  const {
    data: locationDetails,
    refetch: refetchLocationDetails,
    isFetching: isFetchingLocationDetails,
  } = useQuery({
    queryKey: ['getLocationDetails', selectedLocationNode] as const,
    queryFn: async (): Promise<LocationDetailsType | null> => {
      if (parseInt(selectedLocationNode!) === -1 || !selectedLocationNode) {
        return null;
      }
      return await getLocationDetails({
        location_id: parseInt(selectedLocationNode),
      });
    },
    refetchOnWindowFocus: false,
    enabled: !!selectedLocationNode,
    meta: {
      toastId: ['getLocationDetails', selectedLocationNode],
    },
  });

  useEffect(() => {
    setSearchParams((searchParams) => {
      searchParams.set('location_id', selectedLocationNode ?? '');
      return searchParams;
    });
  }, [locationDetails, selectedLocationNode, setSearchParams]);

  const {
    data: selectedLocationChildsDel,
    isFetching: isFetchingSelectedLocationChildsDel,
  } = useQuery({
    queryKey: [
      'getSelectedLocationChildsDel',
      selectedLocationNode,
      locationTree,
      locationSearch,
      locationDetails,
    ] as const,
    queryFn: async (): Promise<string | null> => {
      const childs = await getLocationTreeDel({
        searchFilter:
          String(locationSearch) === '' ? null : String(locationSearch),
        locationId: parseInt(selectedLocationNode ?? '0'),
      });

      if (!childs || !locationDetails) return null;

      const uniqueLocations: string[] = [];

      const exploreLocationTree = (tree: TreeNode, locations: string[]) => {
        if (!tree.childs || tree.childs.length === 0) {
          uniqueLocations.push(tree.name);
          return;
        }

        uniqueLocations.push(tree.name);

        for (const child of tree.childs) {
          exploreLocationTree(child, locations);
        }
      };

      childs.forEach((child) => {
        exploreLocationTree(child, uniqueLocations);
      });

      return uniqueLocations.join(', ');
    },
    refetchOnWindowFocus: false,
    enabled: !!selectedLocationNode && !!locationDetails,
    meta: {
      toastId: [
        'getSelectedLocationChilds',
        selectedLocationNode,
        locationTree,
      ],
    },
  });

  // Delete Location
  const { mutate: refetchDeleteLocation, isPending } = useMutation({
    mutationKey: ['deleteLocationById'] as const,
    mutationFn: async (): Promise<string> => {
      await deleteLocation({
        location_id: parseInt(selectedLocationNode ?? '0'),
      });
      await refetchLocation();
      setShowDeleteModal((prev) => !prev);

      return t('common.deleted_selected_location');
    },
    meta: {
      toastId: ['deleteLocationById'],
    },
  });

  const { mutate: mutateUpdateParentID } = useMutation({
    mutationKey: ['updateLocationById'] as const,
    mutationFn: async (data: UpdateParentInput): Promise<string> => {
      await updateLocationParentID({
        locationId: data.locationId,
        parentId: data.targetParentId,
      });
      await refetchLocationDetails();
      await refetchLocation();

      return t('common.updated_selected_location');
    },
    meta: {
      toastId: ['updateLocationById'],
    },
  });

  const locationSearchInputChangeHandler = (
    e: ChangeEvent<HTMLInputElement>
  ) => {
    setLocationSearchInput(e.target.value);
  };

  const selectedLocationNodeHandler = (
    _event: React.SyntheticEvent<Element, Event>,
    nodeIds: string
  ) => {
    setSearchParams((searchParams) => {
      searchParams.set('location_id', nodeIds);

      return searchParams;
    });
    setSelectedLocationNode(nodeIds);
  };

  const addLocationClickHandler = async () => {
    setAddDrawerOpen((prev) => !prev);
  };

  const editLocationClickHandler = async () => {
    setEditDrawerOpen((prev) => !prev);
  };

  const deleteLocationHandler = () => {
    setShowDeleteModal((prev) => !prev);
  };

  const deleteConfirmHandler = async () => {
    refetchDeleteLocation();
  };

  const onDragStart = async (
    _e: React.MouseEvent<HTMLLIElement, MouseEvent>,
    id: number
  ) => {
    searchParams.delete('page');
    setSelectedLocationNode(id.toString());
    setIsDragging((prev) => !prev);
  };

  const onDrop: React.DragEventHandler<HTMLLIElement> | undefined = async (
    e: React.DragEvent<HTMLLIElement>
  ) => {
    e.stopPropagation();
    e.preventDefault();
    const targetElement = e.target as HTMLElement;
    const currentLocationId = locationDetails?.id;
    const targetParentId = parseInt(targetElement.id);

    if (
      currentLocationId &&
      targetParentId !== currentLocationId &&
      !isNaN(targetParentId)
    ) {
      const data: UpdateParentInput = {
        locationId: currentLocationId,
        targetParentId: targetParentId === -1 ? null : targetParentId,
      };
      mutateUpdateParentID(data);
    }
  };

  const onDragOver = async (e: React.DragEvent<HTMLLIElement>, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const targetElement = e.target as HTMLElement;
    if (targetElement.id === id) {
      //TODO: remove prev since it's not used
      setShowTargetBox((_prev) => [id]);
    } else {
      setShowTargetBox((prev) => prev.filter((item) => item !== id));
      setExpandedItems((prev) => {
        if (prev && !prev.includes(id)) {
          return [...prev, id];
        } else {
          return [...prev];
        }
      });
    }
  };

  const onDragEnd = () => {
    setIsDragging((prev) => !prev);
    setShowTargetBox([]);
  };

  const collapseItem: MouseEventHandler<HTMLSpanElement> = (e) => {
    const targetElement = e.target as HTMLElement;
    if (targetElement) {
      setExpandedItems((prev) =>
        prev.filter((item) => item !== targetElement.id)
      );
    }
  };

  const expandItem: MouseEventHandler<HTMLSpanElement> = (e) => {
    const targetElement = e.target as HTMLElement;
    if (targetElement) {
      setExpandedItems((prev) => [...prev, targetElement.id]);
    }
  };

  useEffect(() => {
    setSearchParams((searchParams) => {
      searchParams.set('expanded_items', JSON.stringify(expandedItems));

      return searchParams;
    });
  }, [expandedItems, setSearchParams]);

  return {
    showDeleteModal,
    locationDetails,
    expandedItems,
    addDrawerOpen,
    editDrawerOpen,
    locationSearchInput,
    locationTree,
    location,
    isDragging,
    selectedLocationNode,
    showTargetBox,
    isPending,
    isFetchingLocation,
    isFetchingLocationDetails,
    locationSearchInputChangeHandler,
    selectedLocationNodeHandler,
    setSelectedLocationNode,
    refetchDeleteLocation,
    refetchLocationDetails,
    addLocationClickHandler,
    editLocationClickHandler,
    setAddDrawerOpen,
    refetchLocation,
    setEditDrawerOpen,
    deleteLocationHandler,
    deleteConfirmHandler,
    onDragStart,
    onDrop,
    onDragOver,
    onDragEnd,
    expandItem,
    collapseItem,
    setExpandedItems,
    setShowDeleteModal,

    selectedLocationChildsDel,
    isFetchingSelectedLocationChildsDel,
  };
};
