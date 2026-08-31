import { DropdownOption, ThemeContext, useExtractFilter } from '@digital-twin/components';
import ReactECharts from 'echarts-for-react';
import { useContext, useEffect, useRef, useState } from 'react';

import { useMaintenanceOrderOverviewData } from '../api/maintenance-performance';
import { GeneralFilterType, MaintenancePerformanceFilterType } from '../type';

// Dummy data for legend display
const DUMMY_DATA = {
  status: [
    { name: 'Requested', value: 15, percentage: '10' },
    { name: 'Rejected', value: 8, percentage: '5' },
    { name: 'Open', value: 25, percentage: '17' },
    { name: 'In Progress', value: 40, percentage: '27' },
    { name: 'Done', value: 35, percentage: '23' },
    { name: 'Closed', value: 20, percentage: '13' },
    { name: 'Paused', value: 7, percentage: '5' },
  ],
  priority: [
    { name: 'High', value: 45, percentage: '30' },
    { name: 'Medium', value: 60, percentage: '40' },
    { name: 'Low', value: 45, percentage: '30' },
  ],
  severity: [
    { name: 'Critical', value: 20, percentage: '15' },
    { name: 'High', value: 40, percentage: '30' },
    { name: 'Medium', value: 50, percentage: '38' },
    { name: 'Low', value: 23, percentage: '17' },
  ],
};

export const useMaintenanceOrderOverview = ({
  selectedFilter,
  isLegend,
}: {
  selectedFilter: string;
  isLegend: boolean;
}) => {
  const {
    data,
    filter: { start, end },
  } = useExtractFilter<GeneralFilterType, MaintenancePerformanceFilterType>();

  const { colors } = useContext(ThemeContext);

  const { data: maintenanceOrderOverview, isFetching } = useMaintenanceOrderOverviewData({
    end: end,
    start: start,
    assetIds: data.assetIds,
    locactionIds: data.locationIds,
    modelIds: data.modelIds,
    typeIds: data.typeIds ? data.typeIds.map((el) => Number(el)) : [],
    groupBy: selectedFilter,
  });

  const [chartOption, setChartOption] = useState({});
  const chartRef = useRef<ReactECharts>(null);

  const [filterByDropdown, setFilterByDropdown] = useState<DropdownOption[]>([
    { label: 'Status', value: 'status' },
    { label: 'Priority', value: 'priority' },
    { label: 'Severity', value: 'severity' },
  ]);

  useEffect(() => {
    // Use dummy data if isLegend is true, otherwise use real data
    const rawData = isLegend
      ? DUMMY_DATA[selectedFilter as keyof typeof DUMMY_DATA] || []
      : maintenanceOrderOverview || [];

    const currentData = rawData.map((item) => ({
      value: item.value,
      name: item.name,
      percentage: item.percentage,
    }));

    const MAINTENANCE_OVERVIEW_COLOR_MAP: Record<string, Record<string, string>> = {
      status: {
        Requested: colors.severityTagsStatusRequested,
        Rejected: colors.severityTagsStatusRejected,
        Open: colors.severityTagsStatusOpen,
        'In Progress': colors.severityTagsStatusInProgress,
        Done: colors.severityTagsStatusDone,
        Closed: colors.severityTagsStatusClosed,
        Paused: colors.severityTagsStatusPaused,
      },
      severity: {
        Critical: colors.severityCritical,
        High: colors.severityHigh,
        Medium: colors.severityMedium,
        Low: colors.severityLow,
      },
      priority: {
        High: colors.conditionCriticalSecondary,
        Medium: colors.conditionWarningPrimary,
        Low: colors.conditionNormalPrimary,
      },
    };

    const categoryColorMap = MAINTENANCE_OVERVIEW_COLOR_MAP[selectedFilter] || {};
    const dynamicColors = currentData.map((item) => categoryColorMap[item.name] || '#cccccc');

    const option = {
      color: dynamicColors,
      grid: {
        top: '0%',
        left: '0%',
        right: '0%',
        bottom: '0%',
      },
      legend: {
        orient: 'vertical',
        right: '2%',
        top: 'middle',
        icon: 'circle',
        itemGap: 10,
        itemStyle: {
          borderColor: colors.neutralTextTitleHeading,
          borderWidth: 1,
        },
        textStyle: {
          color: colors.neutralTextTitleHeading,
          fontSize: 14,
          fontWeight: 'bolder',
          rich: {
            name: {
              width: 60,
              fontSize: 14,
              color: colors.neutralTextTitleHeading,
            },
            value: {
              width: 60,
              align: 'center',
              fontSize: 14,
              color: colors.neutralTextTitleHeading,
            },
            percent: {
              width: 50,
              align: 'right',
              fontSize: 14,
              color: colors.neutralTextCaption,
            },
          },
        },
        formatter: function (name: string) {
          const item = currentData.find((i) => i.name === name);
          let percentStr = item?.percentage;

          if (!percentStr && item) {
            const total = currentData.reduce((sum, current) => sum + current.value, 0);
            percentStr = ((item.value / total) * 100).toFixed(0) + '%';
          }

          return `{name|${name}}{value|${item?.value}}{percent|${percentStr}%}`;
        },
        show: rawData.length !== 0,
      },
      series: [
        {
          name: 'Maintenance Overview',
          type: 'pie',
          radius: ['50%', '75%'],
          center: ['27%', '50%'],
          avoidLabelOverlap: false,
          padAngle: rawData.length === 1 ? 0 : 1,
          label: {
            show: false,
            position: 'center',
          },
          labelLine: {
            show: false,
          },
          data: currentData,
        },
      ],
    };

    setChartOption(option);
  }, [selectedFilter, colors, maintenanceOrderOverview, isLegend]);

  return {
    filterByDropdown,
    setFilterByDropdown,
    chartOption,
    chartRef,
    setChartOption,

    maintenanceOrderOverview: isLegend
      ? DUMMY_DATA[selectedFilter as keyof typeof DUMMY_DATA] || []
      : maintenanceOrderOverview || [],
    isFetching: isLegend ? false : isFetching,
  };
};
