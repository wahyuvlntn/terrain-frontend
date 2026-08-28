import { Loading, Pagination2 as Pagination, Popup, Search, Table } from '@digital-twin/components';
import { ExclamationRibbon } from '@digital-twin/icons';

import { FREQUENT_ISSUES_PAGE_LIMIT } from '../constant';
import { useFrequentIssueDetails } from './frequent-issue-details.hook';
import styles from './frequent-issue-details.module.scss';

interface FrequentIssueDetailsProps {
  open: boolean;
  onClose: () => void;
}

const FrequentIssueDetails = ({ open, onClose }: FrequentIssueDetailsProps) => {
  const {
    handleSearchInputChange,
    page,
    paginatedFrequentIssues,
    setFilter,

    tableColumns,
    isFetching,
    setTableColumns,
  } = useFrequentIssueDetails(open);

  return (
    <Popup
      title="Frequent Alarms"
      open={open}
      onClose={onClose}
      background="none-without-padding"
      width={793}
      icon={<ExclamationRibbon />}
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
      <div className={styles['frequent-issue-details']}>
        <Table
          columns={tableColumns}
          rows={
            paginatedFrequentIssues?.data.map((el, idx) => ({
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
        <Loading isLoading={isFetching} />
        <Pagination
          count={paginatedFrequentIssues?.count || 0}
          limit={FREQUENT_ISSUES_PAGE_LIMIT}
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

export default FrequentIssueDetails;
