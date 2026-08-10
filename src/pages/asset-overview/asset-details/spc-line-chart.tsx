// import { Button, COLOR, ConditionEnum, Loading, ThemeContext } from '@digital-twin/components';
// import { SettingsPreferences } from '@digital-twin/icons';
// import { addDays, formatStringToObjectDate } from '@digital-twin/utils';
// import { EChartsOption } from 'echarts';
// import { format } from 'echarts/core';
// import { MarkArea2DDataItemOption } from 'echarts/types/src/component/marker/MarkAreaModel';
// import ReactECharts from 'echarts-for-react';
// import { useContext, useRef } from 'react';

// import { TGetSPCData } from '../api';
// import { useSPCLineChart } from './spc-line-chart.hook';
// import styles from './spc-line-chart.module.scss';

// interface SPCLineChartProps {
//   unit: string;
//   parameterName: string;
//   parameterId: number;
//   date: string;
//   onSettingClick?: () => void;
//   fetch?: boolean;
//   dataDummy?: TGetSPCData;
//   showEditButton?: boolean;
//   timestampFrom?: string;
//   timestampTo?: string;
//   onRestore?: () => void;
// }

// export const SPCLineChart = ({
//   unit,
//   parameterName,
//   parameterId,
//   date,
//   onSettingClick,
//   fetch = true,
//   dataDummy,
//   showEditButton,
//   timestampFrom,
//   timestampTo,
//   onRestore,
// }: SPCLineChartProps) => {
//   const { data: dataFetch, isLoading } = useSPCLineChart(parameterId, date, fetch);

//   const data = dataDummy ?? dataFetch;

//   const {
//     colors: {
//       statusUnplanned_downPrimary,
//       statusIdlePrimary,
//       statusRunningPrimary,
//       neutralTextTitleHeading,
//       conditionCriticalPrimary,
//       conditionCriticalSecondary,
//       pelorous500,
//     },
//   } = useContext(ThemeContext);

//   const maxYAxis = data?.yMax ?? undefined;
//   const minYAxis = data?.yMin ?? undefined;

//   const getItemColor = (itemType: string): string => {
//     if (itemType === ConditionEnum.enum.NORMAL) {
//       return statusRunningPrimary;
//     }
//     if (itemType === ConditionEnum.enum.WARNING) {
//       return statusIdlePrimary;
//     }
//     return statusUnplanned_downPrimary;
//   };

//   const markArea: MarkArea2DDataItemOption[] =
//     data?.markArea.map((item) => [
//       {
//         [item.from === 'min' ? 'y' : 'yAxis']: item.from,
//         itemStyle: {
//           opacity: 0.5,
//           color: getItemColor(item.type),
//         },
//       },
//       { [item.to === 'max' ? 'y' : 'yAxis']: item.to },
//     ]) ?? [];

//   if (timestampFrom && timestampTo)
//     markArea.push([
//       {
//         xAxis: +new Date(timestampFrom),
//         itemStyle: {
//           color: conditionCriticalPrimary,
//           opacity: 0.7,
//         },
//       },
//       { xAxis: +new Date(timestampTo) },
//     ]);

//   const chartRef = useRef<ReactECharts>(null);

//   const minXAxis = +formatStringToObjectDate(date);
//   const maxXAxis = +addDays(formatStringToObjectDate(date), 1);

//   const visualMap =
//     timestampFrom && timestampTo
//       ? {
//           show: false,
//           dimension: 0,
//           outOfRange: {
//             color: pelorous500,
//           },
//           pieces: [
//             {
//               min: +new Date(timestampFrom),
//               max: +new Date(timestampTo),
//               color: conditionCriticalSecondary,
//             },
//           ],
//         }
//       : {
//           show: false,
//           dimension: 0,
//           pieces: [
//             {
//               min: minXAxis,
//               max: maxXAxis,
//               color: pelorous500,
//             },
//           ],
//         };

//   const option: EChartsOption = {
//     xAxis: {
//       min: minXAxis,
//       max: maxXAxis,
//       type: 'time',
//       axisLabel: {
//         showMaxLabel: true,
//         formatter: (value) => (value === maxXAxis ? '24:00' : '{HH}:{mm}'),
//       },
//       axisLine: {
//         show: true,
//         lineStyle: { color: neutralTextTitleHeading },
//       },
//       splitNumber: 10,
//       minorTick: {
//         show: true,
//         splitNumber: 2,
//       },
//       boundaryGap: [0, 0],
//     },
//     yAxis: {
//       type: 'value',
//       max: maxYAxis,
//       min: minYAxis,
//       axisLabel: {
//         color: neutralTextTitleHeading,
//         customValues: [
//           data?.metrics?.ucl,
//           data?.metrics?.lcl,
//           data?.usl,
//           data?.lsl,
//           data?.metrics?.grandMean,
//         ]
//           .filter((data) => typeof data === 'number')
//           .map((data) => Math.round(Number(data))),
//       },
//       splitLine: { show: false },
//     },
//     visualMap,
//     textStyle: {
//       color: neutralTextTitleHeading,
//       fontFamily: 'Roboto',
//     },
//     dataZoom: [{ type: 'inside', filterMode: 'none' }],
//     series: [
//       {
//         type: 'line',
//         data: data?.data.map((dataPoint) => [+new Date(dataPoint.timestamp), dataPoint.value]),
//         symbolSize: 6,
//         lineStyle: { width: 2 },
//         markLine: {
//           silent: true,
//           label: { show: false },
//           animation: false,
//           lineStyle: {
//             type: 'solid',
//             color: neutralTextTitleHeading,
//             opacity: 0.2,
//           },
//           symbol: ['none', 'none'],
//           data: [
//             data?.metrics?.ucl,
//             data?.metrics?.lcl,
//             data?.usl,
//             data?.lsl,
//             data?.metrics?.grandMean,
//           ]
//             .filter((data) => typeof data === 'number')
//             .map((data) => ({
//               yAxis: String(data),
//             })),
//         },
//         markArea: {
//           silent: true,
//           data: markArea,
//         },
//       },
//     ],
//     toolbox: {
//       feature: {
//         myRestore: {
//           show: true,
//           title: 'Restore',
//           icon: 'M3.8,33.4 M47,18.9h9.8V8.7 M56.3,20.1 C52.1,9,40.5,0.6,26.8,2.1C12.6,3.7,1.6,16.2,2.1,30.6 M13,41.1H3.1v10.2 M3.7,39.9c4.2,11.1,15.8,19.5,29.5,18 c14.2-1.6,25.2-14.1,24.7-28.5',
//           onclick: () => {
//             chartRef.current?.getEchartsInstance()?.dispatchAction({
//               type: 'dataZoom',
//               start: 0,
//               end: 100,
//             });
//             onRestore?.();
//           },
//         },
//       },
//       top: 10,
//       right: 18,
//       iconStyle: { borderColor: neutralTextTitleHeading },
//       emphasis: { iconStyle: { borderColor: neutralTextTitleHeading } },
//     },
//     tooltip: {
//       show: true,
//       // params typedef (TopLevelFormatterParams) is not consistent with actual typedef
//       // check this for actual params typedef: https://echarts.apache.org/en/option.html#tooltip.formatter
//       // eslint-disable-next-line @typescript-eslint/no-explicit-any
//       formatter: function (params: any) {
//         const value = params.data[1];
//         const unitSpace = unit.length > 1 ? ' ' : '';

//         return value === null
//           ? ''
//           : `<div style="background:${
//               COLOR.pelorous500
//             };padding:4px 8px;color:white;border-radius: 2px">${value}${unitSpace}${unit} | ${format.formatTime('hh:mm', params.data[0])}</div>`;
//       },
//       padding: 0,
//       borderWidth: 0,
//     },
//     grid: {
//       top: 10,
//       left: 18,
//       right: 18,
//       bottom: 0,
//       containLabel: true,
//     },
//   };

//   return (
//     <div className={styles['spc-line-chart']}>
//       <Loading isLoading={isLoading} />
//       <div className={styles.header}>
//         <h3>{parameterName}</h3>
//         {showEditButton ? (
//           <Button
//             icon={<SettingsPreferences />}
//             className={styles['setting-button']}
//             onClick={onSettingClick}
//           />
//         ) : null}
//       </div>
//       <div className={styles.data}>
//         <div className={styles['stats-list']}>
//           <span className={styles['stats-term']}>UCL</span>
//           <span className={styles['stats-colon']}>:</span>
//           <span className={styles['stats-value']}>{data?.metrics?.ucl ?? '-'}</span>

//           <span className={styles['stats-term']}>LCL</span>
//           <span className={styles['stats-colon']}>:</span>
//           <span className={styles['stats-value']}>{data?.metrics?.lcl ?? '-'}</span>

//           <span className={styles['stats-term']}>X̿</span>
//           <span className={styles['stats-colon']}>:</span>
//           <span className={styles['stats-value']}>{data?.metrics?.grandMean ?? '-'}</span>

//           <span className={styles['stats-term']}>StDev</span>
//           <span className={styles['stats-colon']}>:</span>
//           <span className={styles['stats-value']}>{data?.metrics?.stdDev ?? '-'}</span>

//           <span className={styles['stats-term']}>Cp</span>
//           <span className={styles['stats-colon']}>:</span>
//           <span className={styles['stats-value']}>{data?.metrics?.cp ?? '-'}</span>

//           <span className={styles['stats-term']}>Cpk</span>
//           <span className={styles['stats-colon']}>:</span>
//           <span className={styles['stats-value']}>{data?.metrics?.cpk ?? '-'}</span>
//         </div>
//         <div className={styles.historical}>
//           <ReactECharts ref={chartRef} option={option} style={{ height: '100%', width: '96%' }} />
//         </div>
//       </div>
//     </div>
//   );
// };
