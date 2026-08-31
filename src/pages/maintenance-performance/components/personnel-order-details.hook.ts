import { useExtractFilter } from '@digital-twin/components';
import { useEffect, useState } from 'react';

import { usePaginatedPersonnelOrdersData } from '../api/maintenance-performance';
import { PERSONNEL_ORDERS_PAGE_LIMITT } from '../constant';
import { Column, GeneralFilterType, MaintenancePerformanceFilterType } from '../type';
import { useSearchFilter } from './use-search-filter';

export const usePersonnelOrderDetatils = (open: boolean, initialSearch?: string) => {
  const {
    data,
    filter: { start, end, page },
    setFilter,
  } = useExtractFilter<GeneralFilterType, MaintenancePerformanceFilterType>();

  const [tableColumns, setTableColumns] = useState<Column[]>([
    {
      key: 'id',
      name: 'No',
      width: 82,
      alignment: 'center',
      showOrderIcon: false,
      sortState: undefined,
    },
    {
      key: 'personnelName',
      name: 'Personnel Name',
      width: 480,
      alignment: 'left',
      showOrderIcon: true,
      sortState: undefined,
    },
    {
      key: 'orderCount',
      name: 'Order Count',
      width: 148,
      alignment: 'center',
      showOrderIcon: true,
      sortState: false,
    },
    {
      key: 'capacity',
      name: 'Capacity(%)',
      width: 150,
      alignment: 'center',
      showOrderIcon: true,
      sortState: undefined,
    },
    {
      key: 'timeLoss',
      name: 'Time Loss',
      width: 189,
      alignment: 'left',
      showOrderIcon: true,
      sortState: undefined,
    },
  ]);

  const { handleSearchInputChange, searchFilter } = useSearchFilter({
    initialSearch,
  });

  const { data: paginatedPersonnelOrders, isFetching } = usePaginatedPersonnelOrdersData(
    {
      end: end,
      start: start,
      assetIds: data.assetIds,
      locactionIds: data.locationIds,
      modelIds: data.modelIds,
      typeIds: data.typeIds ? data.typeIds.map((el) => Number(el)) : [],
      page: page,
      limit: PERSONNEL_ORDERS_PAGE_LIMITT,
      sortState: JSON.stringify(tableColumns),
      search: searchFilter as string,
    },
    open
  );

  useEffect(() => {
    if (!open) {
      handleSearchInputChange('');
    }
  }, [open, handleSearchInputChange]);

  useEffect(() => {
    if (searchFilter) {
      setFilter((prev) => ({
        ...prev,
        page: 1,
      }));
    }
  }, [searchFilter]);

  return {
    setTableColumns,
    tableColumns,
    searchFilter,

    paginatedPersonnelOrders,
    isFetching,
    handleSearchInputChange,

    page,
    setFilter,
  };
};
