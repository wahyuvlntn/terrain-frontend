import { COLOR, Loading, Pagination2 as Pagination, Popup, Search, Table } from '@digital-twin/components';
import { TopRank } from '@digital-twin/icons';

import { PERSONNEL_ORDERS_PAGE_LIMITT } from '../constant';
import { usePersonnelOrderDetatils } from './personnel-order-details.hook';
import styles from './personnel-order-details.module.scss';

interface PersonnelOrderDetailsProps {
  open: boolean;
  onClose: () => void;
  initialSearch?: string;
}

const TimeLossText = ({ timeLoss }: { timeLoss: string }) => {
  const isPositive = timeLoss.startsWith('+');
  const isNegative = timeLoss.startsWith('-');

  return (
    <span
      style={{
        color: isPositive
          ? COLOR.conditionNormalSecondary
          : isNegative
            ? COLOR.conditionCriticalSecondary
            : COLOR.neutralTextTitleHeading,
      }}
    >
      {timeLoss}
    </span>
  );
};

const PersonnelOrderDetails = ({ open, onClose, initialSearch }: PersonnelOrderDetailsProps) => {
  const {
    handleSearchInputChange,
    paginatedPersonnelOrders,
    isFetching,
    page,
    setFilter,
    setTableColumns,
    tableColumns,
  } = usePersonnelOrderDetatils(open, initialSearch);

  return (
    <Popup
      title="Personnel Orders"
      open={open}
      icon={<TopRank />}
      onClose={onClose}
      background="none-without-padding"
      width={1080}
      rightTopComponent={
        <Search
          wrapperClassName={styles['search']}
          width={300}
          onChange={handleSearchInputChange}
          background="dark"
          value={initialSearch}
          placeholder="Search..."
        />
      }
    >
      <div className={styles['personnel-order-details']}>
        <Loading isLoading={isFetching} />
        <Table
          columns={tableColumns}
          rows={
            paginatedPersonnelOrders?.data.map((el, idx) => ({
              ...el,
              timeLoss: <TimeLossText timeLoss={el.timeLoss} />,
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
          count={paginatedPersonnelOrders?.count || 0}
          limit={PERSONNEL_ORDERS_PAGE_LIMITT}
          page={page}
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

export default PersonnelOrderDetails;
