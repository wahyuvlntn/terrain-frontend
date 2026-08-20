import { FILTER_KEY_MODEL, useGetFilter, useModal } from '@digital-twin/components';
import { useQueries, useQuery } from '@tanstack/react-query';
import { addDays, endOfDay, format, isSameMonth, isSameWeek, parse, subDays } from 'date-fns';
import { useMemo, useState } from 'react';

import { FILTER_KEY_TYPE } from '../../components';
import {
  getEarlyWarningAndDiagnosticTrend,
  getEarlyWarningStatus,
  getEarlyWarningType,
  getErrorCodeOccurrence,
  getIssuePatternChart,
  getIssuePatternDetail,
  getIssuePatternList,
  getParameterWarningOccurrence,
} from './api';

type DateRange = {
  startDate: Date;
  endDate: Date;
  period: string | undefined;
};

export const localDateToUTC = (dateString: string) => {
  return new Date(new Date(dateString).setHours(0, 0, 0, 0)).toISOString();
};

export const useEarlyWarningDashboard = () => {
  const filter = useGetFilter<
    {
      [FILTER_KEY_MODEL]: number;
      [FILTER_KEY_TYPE]: number;
    },
    {
      start: string;
      end: string;
    }
  >({
    keys: [
      {
        key: FILTER_KEY_MODEL,
        searchParamsParser: Number,
      },
      {
        key: FILTER_KEY_TYPE,
        searchParamsParser: Number,
      },
    ],
    additionalFilters: [
      {
        key: 'start',
        searchParamsParser: (data) => data ?? format(subDays(new Date(), 6), 'yyyy-MM-dd'),
      },
      {
        key: 'end',
        searchParamsParser: (data) => data ?? format(new Date(), 'yyyy-MM-dd'),
      },
    ],
    shouldBeResetKeyOnApply: {},
  });

  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(filter.start),
    endDate: new Date(filter.end),
    period: 'daily',
  });

  const handleIssuePatternDetailDateChange = (
    startDate: Date,
    endDate: Date,
    period: string | undefined
  ) => {
    setDateRange({
      endDate,
      startDate,
      period,
    });
  };

  const handleDateChange = (start: Date, end: Date) => {
    setDateRange((prev) => ({ ...prev, startDate: start, endDate: end }));
    filter.setFilter((prev) => ({
      ...prev,
      start: format(start, 'yyyy-MM-dd'),
      end: format(end, 'yyyy-MM-dd'),
    }));
  };

  const {
    data: { assetIds, locationIds, modelIds, typeIds },
    start,
    end,
  } = filter;
  const endDtAddOneDay = addDays(parse(end, 'yyyy-MM-dd', new Date()), 1);
  const endParams = format(endDtAddOneDay, 'yyyy-MM-dd');
  const timezoneOffset = new Date().getTimezoneOffset();
  const queryParams = {
    assetIds,
    locationIds,
    modelIds,
    typeIds,
    start,
    end: endParams,
    timezoneOffset,
  };

  const { data: earlyWarningType, isFetching: isEarlyWarningTypeLoading } = useQuery({
    queryKey: ['get-early-warning-type', queryParams] as const,
    queryFn: ({ queryKey }) => getEarlyWarningType(queryKey[1]),
  });

  const { data: earlyWarningStatus, isFetching: isEarlyWarningStatusLoading } = useQuery({
    queryKey: ['get-early-warning-status', queryParams] as const,
    queryFn: ({ queryKey }) => getEarlyWarningStatus(queryKey[1]),
  });

  const { data: parameterWarningOccurrence, isFetching: isParameterWarningOccurenceLoading } =
    useQuery({
      queryKey: ['get-parameter-warning-occurrence', queryParams] as const,
      queryFn: ({ queryKey }) => getParameterWarningOccurrence(queryKey[1]),
    });

  const { data: errorCodeOccurrence, isFetching: isErrorCodeOccurenceLoading } = useQuery({
    queryKey: ['get-error-code-occurrence', queryParams] as const,
    queryFn: ({ queryKey }) => getErrorCodeOccurrence(queryKey[1]),
  });

  const {
    data: earlyWarningAndDiagnosticTrend,
    isFetching: isEarlyWarningAndDiagnosticTrendLoading,
  } = useQuery({
    queryKey: ['get-early-warning-and-diagnostic-trend', queryParams] as const,
    queryFn: ({ queryKey }) => getEarlyWarningAndDiagnosticTrend(queryKey[1]),
  });

  const [page, setPage] = useState(1);
  const { data: issuePatternList, isFetching: isIssuePatternListLoading } = useQuery({
    queryKey: ['get-issue-pattern-list', { ...queryParams, page }] as const,
    queryFn: ({ queryKey }) => getIssuePatternList(queryKey[1]),
  });

  const [issuePatternId, setIssuePatternId] = useState({
    alarmCodeId: 0,
    issueName: '',
  });
  const { handleClose: _handleClose, handleOpen, open } = useModal();

  const handleIssuePatternClick = (alarmCodeId: number, issueName: string) => {
    handleOpen();
    setIssuePatternId({
      alarmCodeId,
      issueName,
    });
  };

  const { startDt, endDt, isDifferentMonth, isDifferentWeek } = useMemo(() => {
    const s = parse(start, 'yyyy-MM-dd', new Date());
    const e = parse(end, 'yyyy-MM-dd', new Date());
    return {
      startDt: s,
      endDt: e,
      isDifferentMonth: !isSameMonth(s, e),
      isDifferentWeek: !isSameWeek(s, e, { weekStartsOn: 0 }),
    };
  }, [start, end]);

  // const calculateIssueStartDate = useCallback(() => {
  //     const year = format(startDt, 'yyyy');
  //     if (isDifferentMonth) return `${year}-01-01`;

  //     if (isDifferentWeek) {
  //         // 2. Get the 1st day of that month
  //         const firstOfMonth = startOfMonth(startDt);

  //         // 3. Get the start of that week (Default is Sunday, which is 0)
  //         const firstSunday = startOfWeek(firstOfMonth, { weekStartsOn: 0 });

  //         // 4. Format it back to the original string format
  //         return format(firstSunday, 'yyyy-MM-dd');
  //     }

  //     const sunday = startOfWeek(startDt, { weekStartsOn: 0 });
  //     return format(sunday, 'yyyy-MM-dd');
  // }, [startDt, isDifferentMonth, isDifferentWeek]);

  // const [issueStartDate, setIssueStartDate] = useState(calculateIssueStartDate)

  // useEffect(() => {
  //     setIssueStartDate(calculateIssueStartDate());
  // }, [calculateIssueStartDate]);

  const handleClose = () => {
    _handleClose();
    setIssuePatternId({
      alarmCodeId: 0,
      issueName: '',
    });
    // setIssueStartDate(calculateIssueStartDate());
  };

  const getIssuePatternChartParams = {
    start: localDateToUTC(dateRange.startDate.toISOString()),
    end: endOfDay(dateRange.endDate).toISOString(),
    timezoneOffset,
    type: dateRange.period,
  };

  const issuePatternCharts = useQueries({
    queries:
      issuePatternList?.data?.map(({ alarmCodeId, issueName }) => ({
        queryKey: [
          'get-issue-pattern-chart',
          {
            alarmCodeId,
            issueName,
            ...getIssuePatternChartParams,
          },
        ],
        queryFn: () =>
          getIssuePatternChart({
            alarmCodeId,
            issueName,
            ...getIssuePatternChartParams,
          }),
      })) ?? [],
    combine: (results) => results,
  });

  const getIssuePatternDetailParams = {
    alarmCodeId: issuePatternId.alarmCodeId,
    issueName: issuePatternId.issueName,
    ...getIssuePatternChartParams,
  };

  const { data: issuePatternDetail, isFetching: isIssuePatternDetailLoading } = useQuery({
    queryKey: ['get-issue-pattern-detail', getIssuePatternDetailParams] as const,
    queryFn: ({ queryKey }) => getIssuePatternDetail(queryKey[1]),
    enabled: open,
  });

  const { data: issuePatternChart, isFetching: isIssuePatternChartLoading } = useQuery({
    queryKey: ['get-issue-pattern-chart', getIssuePatternDetailParams] as const,
    queryFn: ({ queryKey }) => getIssuePatternChart(queryKey[1]),
    enabled: open,
  });

  return {
    isEarlyWarningTypeLoading,
    earlyWarningType,
    earlyWarningStatus,
    isEarlyWarningStatusLoading,
    parameterWarningOccurrence,
    isParameterWarningOccurenceLoading,
    errorCodeOccurrence,
    isErrorCodeOccurenceLoading,
    earlyWarningAndDiagnosticTrend,
    isEarlyWarningAndDiagnosticTrendLoading,
    page,
    setPage,
    issuePatternList,
    isIssuePatternListLoading,
    handleIssuePatternClick,
    issuePatternDetail,
    isIssuePatternDetailLoading,
    handleClose,
    open,
    handleDateChange,
    isDifferentMonth,
    isDifferentWeek,
    startDt,
    endDt,
    filter,
    issuePatternCharts,
    issuePatternChart,
    isIssuePatternChartLoading,
    dateRange,
    handleIssuePatternDetailDateChange,
  };
};
