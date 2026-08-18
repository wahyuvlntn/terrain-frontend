/* eslint-disable simple-import-sort/imports */
import {
  AlarmLog as AlarmLogListIcon,
  IFrame,
  Search,
} from '@digital-twin/icons';
import { t } from '@digital-twin/utils';

import {
  Button,
  COLOR,
  Container,
  InfoTooltip,
  Input,
  Loading,
  Pagination,
} from '../../../../index';
import { AlarmDataLogsType } from './alarm-report-view.hooks';
import styles from './alarm-table.module.scss';
import { Table, TableColumn, TableData } from '@digital-twin/reusables';
import { SetURLSearchParams } from 'react-router-dom';

interface AlarmTableProps {
  maxPage: number;
  limit: number;
  columnData: TableColumn<TableData>[];
  alarmTableData: AlarmDataLogsType[] | null | undefined;
  searchInput: string | number | readonly string[] | undefined;
  isFetching: boolean;
  isPreview: boolean;
  changeView: () => void;
  handleSearchInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSortColumn: (
    field:
      | 'timestamp'
      | 'assetName'
      | 'alarmType'
      | 'alarmStatus'
      | 'alarmMessage',
    order: boolean | null
  ) => void;
  columnOrder: {
    timestamp: boolean | null;
    assetName: boolean | null;
    alarmType: boolean | null;
    alarmStatus: boolean | null;
    alarmMessage: boolean | null;
  };
  searchParams: URLSearchParams;
  setSearchParams: SetURLSearchParams;
}

export default function AlarmTable({
  maxPage,
  columnData,
  alarmTableData,
  limit,
  searchInput,
  isFetching,
  isPreview,
  searchParams,
  changeView,
  handleSearchInputChange,
  handleSortColumn,
  setSearchParams,
  columnOrder,
}: AlarmTableProps) {
  return (
    <Container
      className={styles['alarm-logs-panel']}
      style={{ height: isPreview ? 400 : undefined }}
      title={t('common.alarm_log')}
      rightTopComponent={
        <div className={styles['right-top-component']}>
          <div>
            <InfoTooltip
              title={t('common.alarm_logs')}
              content={
                <span>
                  {t('common.alarm_log_info')}
                  {/* List of alarms recorded from the selected equipment. */}
                </span>
              }
            />
          </div>
          <div className={styles['alarm-logs-action']}>
            <Input
              value={searchInput}
              onChange={handleSearchInputChange}
              placeholder={t('common.search')}
              wrapperProps={{
                className: styles.search,
              }}
              suffix={<Search />}
            ></Input>
            <Button
              icon={<IFrame />}
              onClick={() => changeView()}
              color={'default-primary'}
            >
              <span style={{ color: COLOR.neutralTextTitleHeading }}>
                {t('common.alarm_events')}
              </span>
            </Button>
          </div>
        </div>
      }
      icon={<AlarmLogListIcon />}
      contentWrapperProps={{
        style: {
          alignSelf: 'stretch',
          overflow: 'auto',
          flexDirection: 'column',
          background: 'unset',
        },
      }}
      titleProps={{
        style: {
          fontWeight: 600,
          fontSize: 22,
        },
      }}
    >
      <Loading isLoading={isFetching} />
      <div
        style={{ pointerEvents: isFetching ? 'none' : 'auto' }}
        className={styles['alarm-table-wrapper']}
      >
        <Table
          columns={columnData}
          rows={alarmTableData ?? []}
          onOrderChange={(field, order) => {
            handleSortColumn(field, order);
          }}
          orders={columnOrder}
        />
      </div>
      <div
        className={styles['alarm-table-pagination']}
        style={{ pointerEvents: isPreview ? 'none' : 'auto' }}
      >
        <Pagination
          searchParams={searchParams}
          setSearchParams={setSearchParams}
          count={maxPage}
          limit={limit}
          variant="arrow"
        />
      </div>
    </Container>
  );
}
