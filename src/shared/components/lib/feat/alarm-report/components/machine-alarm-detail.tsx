import {
  AnomalyCircleFill2,
  CloseDownErrorCircleFill,
  ImagePlaceholder,
  WarningFill,
} from '@digital-twin/icons';
import {
  formatDateHTMLInput,
  getDataZoomHandler,
  getURL,
  t,
} from '@digital-twin/utils';
import { Card, CheckCircleFillIcon } from '@digital-twin/reusables';
import { LabelFormatterCallback } from 'echarts';
import ReactECharts, { EChartsOption } from 'echarts-for-react';
import { useContext } from 'react';

import {
  ALARM_COLOR,
  Badge,
  COLOR,
  Input,
  ThemeContext,
} from '../../../../index';
import { AlarmEventCountChartType, formatDate } from '../api/alarm-report';
import { Data, TUseAdditionalFilter } from './alarm-event-list';
import styles from './machine-alarm-detail.module.scss';

interface MachineAlarmDetailProps {
  status: string | null;
  startDate: string;
  endDate: string;
  statusMessage: string | null;
  assetName: string;
  timestamp: string | null;
  modelName: string;
  assetId: number;
  alarmType: string | null;
  alarmData: AlarmEventCountChartType[] | null | undefined;
  alarmName: string | null;
  assetImagePath: string;
  // searchParams: URLSearchParams;
  isPreview: boolean;
  // setSearchParams: SetURLSearchParams;
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
  period?: string;
}

/*
TODO: remove searchParams and setSearchParams since it's not used
 */
export default function MachineAlarmDetail({
  status,
  startDate,
  endDate,
  statusMessage,
  assetName,
  timestamp,
  modelName,
  alarmType,
  alarmData,
  alarmName,
  assetImagePath,
  // searchParams,
  isPreview,
  period,
  // setSearchParams,
  setFilter,
}: MachineAlarmDetailProps) {
  const {
    colors: {
      neutralTextTitleHeading,
      conditionWarningSecondary,
      conditionCriticalSecondary,
      conditionAbnormalPrimary,
      backgroundLow,
      backgroundLowest,
      backgroundHighest,
      borderDefault,
      backgroundDefault
    },
  } = useContext(ThemeContext);
  function createDateRange(monthYearStr: string) {
    const date = new Date(monthYearStr);

    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    return { start, end };
  }

  return (
    <div className={styles['asset-detail']}>
      <Card
        className={styles['asset-detail-card']}
        type="strip-status-thumbnail"
        thumbnailContent={
          <div className={styles['asset-image']}>
            <img
              src={`${getURL()}${assetImagePath}`}
              alt="test.png"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = ImagePlaceholder(backgroundLowest);
              }}
            ></img>
          </div>
        }
        thumbnailProps={{
          style: {
            background: backgroundDefault,
          },
        }}
        contentWrapperProps={{
          style: {
            background: backgroundDefault,
          },
        }}
        stripColor={
          !status
            ? ALARM_COLOR.NORMAL
            : status === 'CRITICAL'
            ? ALARM_COLOR.CRITICAL
            : ALARM_COLOR.WARNING
        }
      >
        <div title={assetName} className={styles['asset-status-card']}>
          <div className={styles['asset-status-header']}>
            <span className={styles['header-title']}>{assetName}</span>
            <Badge
              title={alarmType === 'ABNORMAL' ? alarmType : status!}
              className={styles['asset-status-badge']}
              style={{
                width: 'fit-content',
                display: 'flex',
                justifyContent: 'center',
                backgroundColor: !status
                  ? ALARM_COLOR.NORMAL
                  : alarmType === 'ABNORMAL'
                  ? COLOR.conditionAbnormalPrimary
                  : status === 'CRITICAL'
                  ? ALARM_COLOR.CRITICAL
                  : ALARM_COLOR.WARNING,
              }}
              leftIcon={
                !status ? <CheckCircleFillIcon/> : alarmType === 'ABNORMAL' ? <AnomalyCircleFill2/> : status ===
                  'CRITICAL' ? (
                  <CloseDownErrorCircleFill />
                ) : (
                  <WarningFill />
                )
              }
            >
              <span>
                {!status
                  ? t('common.normal')
                  : alarmType === 'ABNORMAL'
                  ? t('common.abnormal')
                  : status === 'CRITICAL'
                  ? t('common.critical')
                  : t('common.warning')}
              </span>
            </Badge>
          </div>
          <div className={styles['asset-status-content']}>
            <Input
              label={`${t('common.model')}:`}
              value={modelName}
              labelPosition="top"
              background="dark"
              inputProps={{
                style: { textOverflow: 'ellipsis', overflow: 'hidden' },
                title: modelName,
              }}
              inputWrapperProps={{
                style: { border: 'none', opacity: 1 },
                title: modelName,
              }}
            />
            <Input
              label={`${t('common.alarm')}:`}
              value={alarmName ?? '-'}
              labelPosition="top"
              background="dark"
              inputProps={{
                style: { textOverflow: 'ellipsis', overflow: 'hidden' },
                title: alarmName ?? '-',
              }}
              inputWrapperProps={{
                style: { border: 'none', opacity: 1 },
                title: alarmName ?? '-',
              }}
            />
            <Input
              label={`${t('common.timestamp')}:`}
              value={formatDate(timestamp ? new Date(timestamp) : null)}
              labelPosition="top"
              background="dark"
              inputProps={{
                style: { textOverflow: 'ellipsis', overflow: 'hidden' },
                title: formatDate(timestamp ? new Date(timestamp) : null),
              }}
              inputWrapperProps={{
                style: { border: 'none', opacity: 1 },
              }}
            />
          </div>
          <div className={styles['asset-status-description']}>
            <Input
              label={`${t('common.description')}:`}
              value={statusMessage === '' ? '-' : statusMessage ?? ''}
              labelPosition="top"
              background="dark"
              inputProps={{
                style: {
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  width: '100%',
                },
              }}
              inputWrapperProps={{
                style: { border: 'none', opacity: 1, width: '100%' },
                title: statusMessage === '' ? '-' : statusMessage ?? '',
              }}
            />
          </div>
        </div>
      </Card>

      <div className={styles['chart-container']}>
        {alarmData && alarmData.length > 0 ? (
          <ReactECharts
            onEvents={{
              click: (e: EChartsOption) => {
                setFilter((prev) => {
                  if (period && period === 'monthly') {
                    const { start, end } = createDateRange(e.data[2]);
                    const minDate = new Date(
                      Math.max(start.getTime(), new Date(startDate).getTime())
                    );
                    const maxDate = new Date(
                      Math.min(end.getTime(), new Date(endDate).getTime())
                    );
                    return {
                      ...prev,
                      start: formatDateHTMLInput(minDate),
                      end: formatDateHTMLInput(maxDate),
                      search: assetName,
                      eventview: false,
                      page: 1,
                    };
                  } else {
                    return {
                      ...prev,
                      start: formatDateHTMLInput(new Date(e.data[2])),
                      end: formatDateHTMLInput(new Date(e.data[2])),
                      search: assetName,
                      eventview: false,
                      page: 1,
                    };
                  }
                });
              },
            }}
            key={assetName}
            option={{
              animation: false,
              grid: {
                show: true,
                backgroundColor: 'transparent',
                borderWidth: 2,
                borderColor: neutralTextTitleHeading,
                top: '10%',
                left: isPreview ? '10%' : '2%',
                bottom: alarmData.length > 31 ? "25%" : "33",
                right: '2%',
              },
              dataZoom: getDataZoomHandler({
                bottomPadding: '10%',
                maxValue: 31,
                minValue: 0,
                show:  alarmData.length > 31 ? true  : false,
                colors: {
                  primary: backgroundHighest,
                  secondary: borderDefault,
                },
              }),
              xAxis: {
                data: alarmData?.map((item) => item.timestamp),
                axisLabel: {
                  color: neutralTextTitleHeading,
                  fontSize: '16px',
                  fontWeight: 600,
                  interval: 'auto',
                  formatter: function (value: string) {
                    return value;
                  },
                },
                axisTick: {
                  show: false,
                },
                axisLine: {
                  show: true,
                },

                z: 10,
              },
              yAxis: {
                name: t('common.occurrence'),
                nameLocation: 'middle',
                show:false,
                nameTextStyle: {
                  color: neutralTextTitleHeading,
                  fontSize: 16,
                  fontFamily: 'Roboto',
                  fontStyle: 'normal',
                },
                nameGap: 40,
                axisLabel: {
                  color: neutralTextTitleHeading,
                  fontSize: '12px',
                  formatter: function (value: LabelFormatterCallback) {
                    const suffixes = ['', 'k', 'm', 'b', 't'];
                    const val = value as unknown as number;

                    if (val < 1000) {
                      return value.toString();
                    }

                    const exp = Math.floor(Math.log(val) / Math.log(1000));
                    const formattedValue = (val / Math.pow(1000, exp)).toFixed(
                      1
                    );

                    return formattedValue.replace(/\.0$/, '') + suffixes[exp];
                  },
                },
                axisTick: {
                  show: true,
                },
                splitNumber: 4,
                splitLine: {
                  show: true,
                  lineStyle: {
                    color: neutralTextTitleHeading,
                    opacity: 0.3,
                  },
                },
                minInterval: 1,
              },
              tooltip: {
                trigger: 'axis',
                axisPointer: {
                  type: 'shadow',
                },
                confine: true,
                backgroundColor: COLOR.backgroundDefault,
                borderColor: COLOR.borderDefault,
                textStyle: {
                  color: COLOR.neutralTextTitleHeading,
                },
                formatter:
                  //@ts-expect-error unknown param type
                  (e) => {
                    let tooltipHTML = `<div style='display: flex; flex-direction: column; gap: 6px; color: ${neutralTextTitleHeading}; font-weight: 500; font-size: 16px; padding: 4px;'>`;
                    tooltipHTML += `<div style='border-bottom: 1px solid white; padding-bottom: 4px; text-align: left;'>${e[0].data[2]}</div>`;

                    tooltipHTML += `<div style='display: flex; flex-direction: column; align-items: flex-start; gap: 6px; font-size: 16px;'>`;

                    tooltipHTML += `<div style='display: flex; align-items: center; gap: 6px;'>`;
                    tooltipHTML += `<div style='width: 10px; height: 10px; border-radius: 50%; background-color: ${COLOR.conditionAbnormalPrimary};'></div>`;
                    tooltipHTML += `<div>${t('common.abnormal')}:</div>`;
                    tooltipHTML += `<div>${e[2].data[1].toLocaleString()}</div>`;
                    tooltipHTML += `</div>`;

                    tooltipHTML += `<div style='display: flex; align-items: center; gap: 6px;'>`;
                    tooltipHTML += `<div style='width: 10px; height: 10px; border-radius: 50%; background-color: ${ALARM_COLOR.CRITICAL};'></div>`;
                    tooltipHTML += `<div>${t('common.critical')}:</div>`;
                    tooltipHTML += `<div>${e[1].data[1].toLocaleString()}</div>`;
                    tooltipHTML += `</div>`;

                    tooltipHTML += `<div style='display: flex; align-items: center; gap: 6px;'>`;
                    tooltipHTML += `<div style='width: 10px; height: 10px; border-radius: 50%; background-color: ${ALARM_COLOR.WARNING};'></div>`;
                    tooltipHTML += `<div>${t('common.warning')}:</div>`;
                    tooltipHTML += `<div>${e[0].data[1].toLocaleString()}</div>`;
                    tooltipHTML += `</div>`;

                    tooltipHTML += `</div>`;
                    tooltipHTML += `</div>`;
                    return tooltipHTML;
                  },
              },
              series: [
                {
                  name: t('common.warning'),
                  type: 'bar',
                  stack: 'alarm',
                  barMinWidth : 31,
                  color: conditionWarningSecondary,
                  showBackground: true,
                  backgroundStyle: {
                    color: backgroundLow,
                    borderColor: neutralTextTitleHeading,
                    borderWidth: 1,
                  },
                  barCategoryGap: '1px',

                  data: alarmData?.map((item, idx) => [
                    idx,
                    item.warningCount,
                    item.dateAlt,
                  ]),
                },
                {
                  name: t('common.critical'),
                  type: 'bar',
                  stack: 'alarm',
                  color: conditionCriticalSecondary,
                  showBackground: true,
                  backgroundStyle: {
                    color: backgroundLow,
                    borderColor: neutralTextTitleHeading,
                    borderWidth: 1,
                  },
                  barCategoryGap: '1px',

                  data: alarmData?.map((item, idx) => [
                    idx,
                    item.criticalCount,
                    item.dateAlt,
                  ]),
                },
                {
                  name: t('common.abnormal'),
                  type: 'bar',
                  stack: 'alarm',
                  color: conditionAbnormalPrimary,
                  showBackground: true,
                  backgroundStyle: {
                    color: backgroundLow,
                    borderColor: neutralTextTitleHeading,
                    borderWidth: 1,
                  },
                  barCategoryGap: '1px',

                  data: alarmData?.map((item, idx) => [
                    idx,
                    item.abnormalCount,
                    item.dateAlt,
                  ]),
                },
              ],
            }}
            style={{
              height: '100%',
              width: '100%',
              padding: 0,
              margin: 0,
              borderRadius: '5px',
            }}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              width: '100%',
              height: '100%',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <span>{t('common.no_data_available')}</span>
          </div>
        )}
      </div>
    </div>
  );
}
