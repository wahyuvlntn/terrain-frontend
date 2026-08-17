import { AlertAlarmFill, FactoryMachine, Search } from '@digital-twin/icons';
import { t } from '@digital-twin/utils';
import { ChangeEventHandler } from 'react';
import { SetURLSearchParams } from 'react-router-dom';

import {
  ALARM_COLOR,
  Button,
  COLOR,
  Container,
  InfoTooltip,
  Input,
  Legends,
  Pagination,
} from '../../../../index';
import { AlarmtEventDataSchema } from '../api/alarm-report';
import styles from './alarm-event-list.module.scss';
import MachineAlarmDetail from './machine-alarm-detail';

export type TUseAdditionalFilter<T extends Record<string, unknown>> = {
  [K in keyof T]: T[K];
};

export type Data = Record<string, (string | number)[] | null>;

interface AlarmEventList {
  startDate: string;
  endDate: string;
  searchInput?: string | number | readonly string[] | undefined;
  machineAlarmData: AlarmtEventDataSchema[] | null;
  searchParams: URLSearchParams;
  isPreview: boolean;
  count: number;
  period?: string;
  // page: number;
  handleSearchInputChange?: ChangeEventHandler<HTMLInputElement> | undefined;
  changeView: () => void;
  // onPageChange: (page: number) => void;
  setSearchParams: SetURLSearchParams;
  setFilter: React.Dispatch<
    React.SetStateAction<
      {
        isReady: boolean;
        data: Data;
      } & TUseAdditionalFilter<{
        start: string | null;
        end: string | null;
        eventview: boolean;
        search: string;
        page: number;
        orderBy: string | null;
        orderType: string | null;
      }>
    >
  >;
}

const AlarmEventList = ({
  searchParams,
  startDate,
  endDate,
  searchInput,
  isPreview,
  machineAlarmData,
  count,
  period,
  //TODO: remove page props since it's not used
  // page,
  setSearchParams,
  handleSearchInputChange,
  //TODO: remove onPageChange props since it's not used
  // onPageChange,
  changeView,
  setFilter,
}: AlarmEventList) => {
  return (
    <Container
      className={styles['alarm-event-panel']}
      style={{
        height: isPreview ? '750px' : undefined,
        translate: isPreview ? '0%' : undefined,
      }}
      titleSuffixIcon={
        <InfoTooltip
          title={t('common.alarm_events')}
          content={
            <span>
              {t('common.alarm_event_info')}
              {/* Daily alarm occurrence for each selected equipment. */}
            </span>
          }
        />
      }
      title={t('common.alarm_event')}
      icon={<FactoryMachine />}
      contentWrapperProps={{
        style: {
          background: COLOR.backgroundLow,
        },
      }}
      rightTopComponent={
        <div className={styles['alarm-logs-action']}>
          <Input
            background="dark"
            wrapperProps={{
              style: {
                width: 218,
              },
            }}
            value={searchInput}
            onChange={handleSearchInputChange}
            placeholder={t('common.search')}
            suffix={<Search />}
          ></Input>
          <Button
            color="default-primary"
            icon={<AlertAlarmFill />}
            onClick={() => changeView()}
          >
            <span>{t('common.alarm_reports')}</span>
          </Button>
          <Legends
            wrapperProps={{ style: { overflow: 'auto' } }}
            data={[
              {
                color: ALARM_COLOR.CRITICAL,
                label: t('common.critical'),
              },
              { color: ALARM_COLOR.WARNING, label: t('common.warning') },
              {
                color: COLOR.conditionAbnormalPrimary,
                label: t('common.abnormal'),
              },
            ]}
          />
        </div>
      }
    >
      <div
        className={styles['asset-main-container']}
        style={{ height: isPreview ? 'unset' : undefined }}
      >
        <div className={styles['asset-container']}>
          {machineAlarmData?.map((machineAlarm, idx) => {
            return (
              <MachineAlarmDetail
                key={idx}
                startDate={startDate}
                endDate={endDate}
                assetId={machineAlarm.assetId}
                assetName={machineAlarm.assetName}
                modelName={machineAlarm.modelName}
                timestamp={machineAlarm.lastAlarmTimestamp}
                status={machineAlarm.lastAlarmStatus ?? ''}
                statusMessage={machineAlarm.lastAlarmMessage ?? ''}
                alarmType={machineAlarm.lastAlarmType ?? ''}
                alarmData={machineAlarm.data}
                alarmName={machineAlarm.lastAlarmName}
                assetImagePath={machineAlarm.assetImagePath ?? ''}
                //TODO: remove searchParams since it's not used
                // searchParams={searchParams}
                //TODO: remove setSearchParams since it's not used
                // setSearchParams={setSearchParams}
                isPreview={isPreview}
                period={period}
                setFilter={setFilter}
              />
            );
          })}
        </div>
      </div>
      <div
        className={styles['alarm-event-pagination']}
        style={{ pointerEvents: isPreview ? 'none' : undefined }}
      >
        <Pagination
          count={count}
          limit={3}
          searchParams={searchParams}
          setSearchParams={setSearchParams}
          variant="arrow"
        />
      </div>
    </Container>
  );
};

export default AlarmEventList;
