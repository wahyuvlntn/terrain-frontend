import { Container, Loading } from '@digital-twin/components';
import { ListAlt } from '@digital-twin/icons';
import { t } from '@digital-twin/utils';
import clsx from 'clsx';
import { usePersonnelList } from '../api/personnel';
import { useExtractFilterPM } from '../filter/filter.extract';
import { PMInfoTooltip } from './pm-info-tooltip';
import styles from './pm-list.module.scss';
import { PMListCard } from './pm-list-card';
import { PMListPagination } from './pm-list-pagination';
import { PMListSearch } from './pm-list-search';

// Constants
const LIMIT = 12;

interface PMListProps {
  className?: string;
}

export const PMList = ({ className }: PMListProps) => {
  const filter = useExtractFilterPM();

  const { data: list, isLoading } = usePersonnelList({
    buildingIds: filter.data.buildingIds,
    equipmentTypeIds: filter.data.equipmentTypeIds,
    capacityIds: filter.data.capacityIds,
    start: filter.filter.start,
    end: filter.filter.end,
    search: filter.filter.search,
    page: filter.filter.page,
    limit: LIMIT,
  });

  return (
    <Container
      className={clsx(styles['container'], className)}
      background="none"
      icon={<ListAlt />}
      title={t('common.personnel_management_list')}
      titleSuffixIcon={
        <PMInfoTooltip
          title={t('common.personnel_management_list')}
          content={t('common.personnel_management_list_info')}
        />
      }
      rightTopComponent={
        <>
          <div className={styles['right-top-component-padding']} />
          <PMListSearch className={styles['search']} />
        </>
      }
      contentWrapperProps={{
        className: styles['content'],
      }}
    >
      <div className={styles['list-container']}>
        <Loading isLoading={isLoading} />
        {list?.entries.map((entry) => (
          <PMListCard
            entry={entry}
            selected={entry.id === filter.filter.selected}
            onSelect={(entry) => {
              filter.setFilter((prev) => ({ ...prev, selected: entry.id }));
            }}
          />
        ))}
      </div>
      <div className={styles['pagination-container']}>
        <PMListPagination count={list?.total ?? 0} limit={LIMIT} />
      </div>
    </Container>
  );
};
