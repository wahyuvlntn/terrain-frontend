import { useExtractFilter } from '@digital-twin/components';
import { useEffect, useState } from 'react';

import { usePaginatedFrequentIssuesData } from '../api/maintenance-performance';
import { FREQUENT_ISSUES_PAGE_LIMIT } from '../constant';
import { Column, GeneralFilterType, MaintenancePerformanceFilterType } from '../type';
import { useSearchFilter } from './use-search-filter';

export const useFrequentIssueDetails = (open: boolean) => {
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
    },
    {
      key: 'instructionName',
      name: 'Issues',
      width: 480,
      alignment: 'left',
      showOrderIcon: true,
      sortState: undefined,
    },
    {
      key: 'occurence',
      name: 'Order Count',
      width: 200,
      alignment: 'center',
      showOrderIcon: true,
      sortState: false,
    },
  ]);

  const { handleSearchInputChange, searchFilter } = useSearchFilter({});

  const { data: paginatedFrequentIssues, isFetching } = usePaginatedFrequentIssuesData(
    {
      end: end,
      start: start,
      assetIds: data.assetIds,
      locactionIds: data.locationIds,
      modelIds: data.modelIds,
      typeIds: data.typeIds ? data.typeIds.map((el) => Number(el)) : [],
      page: page,
      limit: FREQUENT_ISSUES_PAGE_LIMIT,
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
    tableColumns,
    setTableColumns,

    paginatedFrequentIssues,
    isFetching,
    handleSearchInputChange,

    page,
    setFilter,
  };
};
