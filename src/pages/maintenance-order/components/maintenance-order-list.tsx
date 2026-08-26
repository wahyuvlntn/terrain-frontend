/* eslint-disable react-hooks/exhaustive-deps */
import { Button, Pagination2 as Pagination, Search, useExtractFilter } from '@digital-twin/components';
import { Plus } from '@digital-twin/icons';
import { UseQueryResult } from '@tanstack/react-query';
import { useEffect } from 'react';

import { MaintenanceOrderListType } from '../api/maintenance-order';
import { GeneralFilterType, MaintenanceOrderFilterType } from '../type';
import { MaintenanceOrderCard } from './maintenance-order-card';
import styles from './maintenance-order-list.module.scss';

export const MaintenanceOrderList = ({
  maintenanceOrderList,
  selected,
}: {
  maintenanceOrderList?: UseQueryResult<MaintenanceOrderListType, Error>;
  selected: string;
}) => {
  const { filter, setFilter } = useExtractFilter<GeneralFilterType, MaintenanceOrderFilterType>();

  const search = filter.search;

  return (
    <div className={styles['maintenance-order-list']}>
      {/* <MaintenanceNotification orderId="CM-1234" createdBy="Ahmad Tino" /> */}
      {maintenanceOrderList?.data && maintenanceOrderList?.data.data.length > 0 && (
        <FirstDataSelector maintenanceOrderList={maintenanceOrderList} selected={selected} />
      )}
      <div className={styles['header']}>
        <Search
          wrapperClassName={styles['search']}
          placeholder="Search..."
          background="dark"
          onChange={(val) => {
            setFilter((prev) => ({
              ...prev,
              search: val,
              page: '1',
            }));
          }}
          value={search || ''}
        />
        <Button
          icon={<Plus width={20} height={20} />}
          onClick={() => {
            setFilter((prev) => ({
              ...prev,
              add: 'true',
            }));
          }}
        >
          New Request
        </Button>
      </div>
      <div className={styles['content']}>
        <div className={styles['maintenance-order-card-list']}>
          {maintenanceOrderList?.data?.data.map((d) => (
            <MaintenanceOrderCard
              {...d}
              key={d.id}
              two_columns={true}
              selected={selected === String(d.id) && filter.add !== 'true'}
              handleClick={() => {
                setFilter((prev) => ({
                  ...prev,
                  selected: String(d.id),
                  add: 'false',
                }));
              }}
              simple={false}
              time="07:00"
            />
          ))}
        </div>
        <div className={styles['pagination']}>
          <Pagination
            count={maintenanceOrderList?.data?.count || 0}
            limit={5}
            page={Number(filter.page || '1')}
            onChange={(page) => {
              setFilter((prev) => ({
                ...prev,
                page: String(page),
              }));
            }}
            variant="arrow"
          />
        </div>
      </div>
    </div>
  );
};

const FirstDataSelector = ({
  maintenanceOrderList,
  selected,
}: {
  maintenanceOrderList?: UseQueryResult<MaintenanceOrderListType, Error>;
  selected: string | null;
}) => {
  const { setFilter } = useExtractFilter<GeneralFilterType, MaintenanceOrderFilterType>();

  useEffect(() => {
    if (maintenanceOrderList?.data && maintenanceOrderList?.data.data.length > 0 && !selected) {
      setTimeout(() => {
        setFilter((prev) => ({
          ...prev,
          selected: String(maintenanceOrderList.data?.data[0].id || ''),
        }));
      }, 100);
      // console.log(selected);
      // console.log(maintenanceOrderList.data?.data[0].id);
    }
  }, []);

  return null;
};
