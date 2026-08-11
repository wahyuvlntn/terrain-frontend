import { useDebounce } from '@digital-twin/components';
import { formatDateHTMLInput } from '@digital-twin/utils';
import { useQuery } from '@tanstack/react-query';
import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  getAllLocations,
  getLocationOverview,
  LocationOverviewType,
  LocationType,
} from './api/location-overview.api';

export const useLocationOverview = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const locationIdParam = searchParams.get('location_id');
  const locationHistory = searchParams.get('locations');
  const page = searchParams.get('page');
  const search = searchParams.get('search');

  const [selectedLocation, setSelectedLocation] = useState<number | null>(
    locationIdParam ? parseInt(locationIdParam) : null
  );
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);

  const [selectedStartDate, setSelectedStartDate] = useState<string | undefined>(undefined);
  const [selectedEndDate, setSelectedEndDate] = useState<string | undefined>(undefined);
  const [searchInput, setSearchInput] = useState<string>(search ? search : '');
  const { debouncedVal: locationSearch } = useDebounce(searchInput, 800);

  const { data: allLocations } = useQuery({
    queryKey: ['getAllLocations'] as const,
    queryFn: async (): Promise<LocationType[] | null> => {
      return await getAllLocations();
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
    meta: {
      toastId: ['getAllLocations'],
    },
  });

  const { data: locationDetails, isFetching } = useQuery({
    queryKey: [
      'getLocationOverview',
      {
        locationIdParam,
        page,
        locationSearch,
      },
    ] as const,
    queryFn: async (): Promise<LocationOverviewType | null> => {
      const locationId = locationIdParam ? parseInt(locationIdParam) : null;
      return await getLocationOverview(locationId, Number(page ?? 1), String(locationSearch));
    },
    enabled: !!selectedStartDate && !!selectedEndDate && !!allLocations,
    refetchOnWindowFocus: false,
    refetchInterval: 60000,
    retryDelay: 5000,
    meta: {
      toastId: [
        'getLocationOverview',
        {
          locationIdParam,
          page,
          locationSearch,
          selectedEndDate,
          selectedStartDate,
        },
      ],
    },
  });

  const handleSelectLocation = async (e: string) => {
    setSearchInput('');
    setSearchParams((searchParams) => {
      searchParams.delete('page');
      searchParams.delete('search');
      return searchParams;
    });
    setSelectedLocation(parseInt(e));
    setSelectedLocations((prev) => {
      if (!locationHistory) {
        setSearchParams((searchParams) => {
          searchParams.set('locations', JSON.stringify([e]));
          searchParams.set('location_id', e);
          return searchParams;
        });
      } else {
        setSearchParams((searchParams) => {
          searchParams.set('locations', JSON.stringify([...JSON.parse(locationHistory), e]));
          searchParams.set('location_id', e);
          return searchParams;
        });
      }
      return [...prev, e];
    });
  };

  const handleSelectBreadCrumb = (e: string | null) => {
    setSearchInput('');
    setSearchParams((searchParams) => {
      searchParams.delete('page');
      searchParams.delete('search');
      return searchParams;
    });

    if (e) {
      setSelectedLocation(parseInt(e));
      setSearchParams((searchParams) => {
        searchParams.set('location_id', e);
        if (locationHistory) {
          const sliceIndex = JSON.parse(locationHistory).findIndex((obj: string) => obj === e);
          searchParams.set(
            'locations',
            JSON.stringify(JSON.parse(locationHistory).slice(0, sliceIndex + 1))
          );
        }
        return searchParams;
      });
    } else {
      setSelectedLocation(null);
      setSearchParams((searchParams) => {
        searchParams.delete('location_id');
        searchParams.delete('locations');
        return searchParams;
      });
    }
  };

  const handleDateChange = (startDate: Date, endDate: Date) => {
    setSelectedStartDate(formatDateHTMLInput(startDate));
    setSelectedEndDate(formatDateHTMLInput(endDate));

    setSearchParams((searchParams) => {
      searchParams.set('start', formatDateHTMLInput(startDate));
      searchParams.set('end', formatDateHTMLInput(endDate));
      searchParams.delete('page');
      return searchParams;
    });
  };

  const handleSearchInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
    setSearchParams((searchParams) => {
      searchParams.delete('page');
      searchParams.set('search', e.target.value);
      return searchParams;
    });
  };

  useEffect(() => {
    if (!searchParams.get('start') && !searchParams.get('end')) {
      setSearchParams((searchParams) => {
        searchParams.set('start', new Date(Date.now() - 86400000 * 30).toISOString().slice(0, 10));
        searchParams.set('end', new Date().toISOString().slice(0, 10));
        return searchParams;
      });
    }
    setSelectedStartDate(
      searchParams.get('start') ?? new Date(Date.now() - 86400000 * 30).toISOString().slice(0, 10)
    );
    setSelectedEndDate(searchParams.get('end') ?? new Date().toISOString().slice(0, 10));
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (search) {
      setSearchInput(search);
    }
  }, [search]);

  const locationHistoryParsed: string[] = useMemo(() => {
    return JSON.parse(locationHistory || '[]');
  }, [locationHistory]);

  const [firstBreadcrumbsLoc, breadCrumbsLoc, hiddenBreadcrumbsLoc] = useMemo(() => {
    const rawBreadcrumbs =
      (allLocations &&
        locationHistory &&
        allLocations
          //TODO: remove idx since it's not used
          .filter((location, _idx) =>
            locationHistoryParsed.find((item: string) => parseInt(item) === location.locationId)
          )
          .sort((a, b) => a.hierarchy - b.hierarchy)) ||
      [];

    const firstBreadcrumbs = rawBreadcrumbs.length > 0 ? rawBreadcrumbs[0] : null;
    let filteredBreadcrumbs = rawBreadcrumbs.filter((_, idx) => idx !== 0);
    const hiddenBreadcrumbs: LocationType[] = [];
    if (rawBreadcrumbs.length > 3) {
      const maxBreadcrumbs = rawBreadcrumbs.length - 3;
      filteredBreadcrumbs = rawBreadcrumbs.filter((data, idx) => {
        if (idx - maxBreadcrumbs > 0) {
          return true;
        } else {
          if (idx !== 0) {
            hiddenBreadcrumbs.push(data);
          }
          return false;
        }
      });
    }

    return [firstBreadcrumbs, filteredBreadcrumbs, hiddenBreadcrumbs];
  }, [allLocations, locationHistory, locationHistoryParsed]);

  const [posHiddenParent, setPosHiddenParent] = useState({
    show: false,
    x: 0,
    y: 0,
  });

  const refHiddenParent = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent): void {
      if (refHiddenParent.current && !refHiddenParent.current.contains(e.target as Node)) {
        setPosHiddenParent({
          show: false,
          x: 0,
          y: 0,
        });
      }
    }
    // Bind the event listener
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      // Unbind the event listener on clean up
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return {
    searchInput,
    selectedEndDate,
    selectedStartDate,
    allLocations,
    locationHistory,
    selectedLocations,
    selectedLocation,
    searchParams,
    locationDetails,
    isFetching,
    handleSelectLocation,
    handleSelectBreadCrumb,
    setSearchParams,
    handleDateChange,
    handleSearchInputChange,

    firstBreadcrumbsLoc,
    hiddenBreadcrumbsLoc,
    setPosHiddenParent,
    posHiddenParent,
    refHiddenParent,
    breadCrumbsLoc,
  };
};
