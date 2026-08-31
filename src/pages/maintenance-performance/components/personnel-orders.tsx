import { Container, InfoTooltip, Loading, useExtractFilter } from '@digital-twin/components';
import { ChevronRight, TopRank } from '@digital-twin/icons';
import { t } from 'i18next';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useTopPersonnelOrdersData } from '../api/maintenance-performance';
import { TOP_PERSONNEL_ORDERS_LIMIT } from '../constant';
import { GeneralFilterType, MaintenancePerformanceFilterType } from '../type';
import PersonnelOrderDetails from './personnel-order-details';
import PersonnelOrderItem from './personnel-order-item';
import styles from './personnel-orders.module.scss';

const PersonnelOrders = () => {
  const {
    data,
    filter: { start, end },
    setFilter,
  } = useExtractFilter<GeneralFilterType, MaintenancePerformanceFilterType>();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, setSearchParams] = useSearchParams();
  const { data: topPersonnelOrders, isFetching } = useTopPersonnelOrdersData({
    assetIds: data.assetIds,
    end: end,
    locactionIds: data.locationIds,
    modelIds: data.modelIds,
    start: start,
    typeIds: data.typeIds ? data.typeIds.map((el) => Number(el)) : [],
  });

  const [openDetails, setOpenDetails] = useState(false);

  const [initialSearch, setInitialSearch] = useState('');

  const handleCloseDetails = () => {
    setFilter((prev) => {
      return { ...prev, page: 1 };
    });
    setSearchParams((prev) => {
      prev.delete('page');
      return prev;
    });
    setInitialSearch('');
    setOpenDetails(false);
  };

  const handleOthersClick = () => {
    setOpenDetails(true);
  };

  const handleSelectTechnician = (name: string) => {
    setInitialSearch(name);
    setOpenDetails(true);
  };

  return (
    <>
      <Container
        className={styles['personnel-orders']}
        title="Personnel Orders"
        icon={<TopRank />}
        rightTopComponent={
          <div className={styles['right-top-component']}>
            <InfoTooltip
              title={'Most Personnel Orders'}
              content={
                <>
                  <span>
                    Highlights personnel with the highest number of completed maintenance orders in
                  </span>
                  <br />
                  <span>
                    the selected period, offering insight into workload concentration and team
                  </span>
                  <br />
                  <span>performance.</span>
                </>
              }
            />
          </div>
        }
        contentWrapperProps={{
          style: {
            overflow: 'auto',
            flexDirection: 'column',
            padding: 16,
            boxSizing: 'border-box',
          },
        }}
      >
        <div className={styles['personnel-orders-list']}>
          <Loading isLoading={isFetching} />
          {topPersonnelOrders && topPersonnelOrders.length > 0 ? (
            <>
              {topPersonnelOrders?.map((personnel, index) => (
                <PersonnelOrderItem
                  key={index}
                  description={'Order Count'}
                  title={personnel.personnelName}
                  value={personnel.orderCount}
                  onClick={handleSelectTechnician}
                />
              ))}
              {topPersonnelOrders && topPersonnelOrders.length > TOP_PERSONNEL_ORDERS_LIMIT && (
                <div className={styles.others} onClick={handleOthersClick}>
                  <div className={styles['title-container']}>
                    <span className={styles['title']}>Others</span>
                  </div>
                  <ChevronRight className={styles['chevron-icon']} />
                </div>
              )}
            </>
          ) : (
            <div className={styles['unavailable']}>
              <span>{t('common.no_data_available')}</span>
            </div>
          )}
        </div>
      </Container>
      <PersonnelOrderDetails
        onClose={handleCloseDetails}
        open={openDetails}
        initialSearch={initialSearch}
      />
    </>
  );
};

export default PersonnelOrders;
