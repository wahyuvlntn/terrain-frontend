import {
  Loading,
  Pagination2 as Pagination,
  Popup,
  Search,
  Table,
  useExtractFilter,
} from '@digital-twin/components';
import { BarChartH } from '@digital-twin/icons';
import { useEffect, useState } from 'react';

import { usePaginatedMTBFMTTRData } from '../api/maintenance-performance';
import { MTBF_MTTR_PAGE_LIMIT } from '../constant';
import { Column, GeneralFilterType, MaintenancePerformanceFilterType } from '../type';
import styles from './kpi-details.module.scss';
import { useSearchFilter } from './use-search-filter';

interface KPIDetailsProps {
  open: boolean;
  onClose: () => void;
}

const KPIDetails = ({ open, onClose }: KPIDetailsProps) => {
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
      key: 'assetName',
      name: 'Equipment Name',
      width: 280,
      alignment: 'left',
      showOrderIcon: true,
      sortState: undefined,
    },
    {
      key: 'mtbf',
      name: 'MTBF',
      width: 200,
      alignment: 'left',
      showOrderIcon: true,
      sortState: false,
    },
    {
      key: 'mttr',
      name: 'MTTR',
      width: 200,
      alignment: 'left',
      showOrderIcon: true,
      sortState: undefined,
    },
  ]);
  const { data, filter, setFilter } = useExtractFilter<
    GeneralFilterType,
    MaintenancePerformanceFilterType
  >();

  const { handleSearchInputChange, searchFilter } = useSearchFilter({});

  const { data: paginatedMTBFMTTR, isFetching } = usePaginatedMTBFMTTRData(
    {
      assetIds: data.assetIds,
      locactionIds: data.locationIds,
      modelIds: data.modelIds,
      typeIds: data.typeIds ? data.typeIds.map((el) => Number(el)) : [],
      sortState: JSON.stringify(tableColumns),
      limit: MTBF_MTTR_PAGE_LIMIT,
      page: filter.page,
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

  return (
    <Popup
      icon={<BarChartH />}
      title="Equipment MTBF & MTTR"
      open={open}
      onClose={onClose}
      background="none-without-padding"
      width={793}
      rightTopComponent={
        <Search
          wrapperClassName={styles['search']}
          width={300}
          onChange={handleSearchInputChange}
          background="dark"
          placeholder="Search..."
        />
      }
    >
      <div className={styles['kpi-details']}>
        <Loading isLoading={isFetching} />
        <Table
          columns={tableColumns}
          rows={
            paginatedMTBFMTTR?.data.map((el, idx) => ({
              ...el,
              id: String(el.id),
            })) || []
          }
          handleSortColumn={(columnKey, sort) => {
            setTableColumns((prev) => {
              return prev.map((item) => {
                if (item.key === columnKey) {
                  return { ...item, sortState: sort };
                } else {
                  return { ...item, sortState: undefined };
                }
              });
            });
          }}
          sortable
        />
        <Pagination
          count={paginatedMTBFMTTR?.count || 0}
          limit={MTBF_MTTR_PAGE_LIMIT}
          page={filter.page}
          onChange={(page) => {
            setFilter((prev) => ({
              ...prev,
              page: page,
            }));
          }}
          variant="arrow"
        />
      </div>
    </Popup>
  );
};

export default KPIDetails;
