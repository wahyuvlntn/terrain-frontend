import {
  addDays,
  addMonths,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { useCallback, useEffect, useState } from 'react';
import { DateRangePickerProps, Range, RangeKeyDict, StaticRange } from 'react-date-range';
import { DatepickerInternationalization } from './DaterangePicker';

const MONTH_LIST = [
  { label: 'Jan', value: '0' },
  { label: 'Feb', value: '1' },
  { label: 'Mar', value: '2' },
  { label: 'Apr', value: '3' },
  { label: 'May', value: '4' },
  { label: 'Jun', value: '5' },
  { label: 'Jul', value: '6' },
  { label: 'Aug', value: '7' },
  { label: 'Sep', value: '8' },
  { label: 'Oct', value: '9' },
  { label: 'Nov', value: '10' },
  { label: 'Dec', value: '11' },
];

type DropdownOptions = { label: string; value: string }[];

interface TUseDatePicker {
  startDate?: Date;
  endDate?: Date;
  minDate?: Date;
  maxDate?: Date;
  selectedPeriod?: string;
  yearOffset?: number;
  type: 'date' | 'daterange';
  onChange: (startDate: Date, endDate: Date, period?: string) => void;
  internationalization?: DatepickerInternationalization;
  DateRangerPickerProps?: DateRangePickerProps;
  selectUntilToday?: boolean;
}

export const useDatePicker = ({
  startDate,
  endDate,
  minDate,
  maxDate,
  selectedPeriod,
  type,
  DateRangerPickerProps,
  yearOffset = 2,
  onChange,
  internationalization = {},
  selectUntilToday,
}: TUseDatePicker) => {
  function getDatesInMonth(year: number, month: number): string[] {
    const dates: string[] = [];

    const date = new Date(year, month, 1);

    while (date.getMonth() === month) {
      dates.push(new Date(date).getDate().toString());
      date.setDate(date.getDate() + 1);
    }

    return dates;
  }

  function getYearRange(year: number, offset: number): string[] {
    const yearList: string[] = [];

    for (let k = offset; k > 0; k--) {
      yearList.push(String(year - k));
    }

    yearList.push(year.toString());

    for (let k = 1; k <= offset; k++) {
      yearList.push(String(year + k));
    }

    return yearList;
  }

  const [period, setPeriod] = useState<string | undefined>(selectedPeriod);

  // State for selected start date
  const [startDateDropdown, setCurrentStartDateDropdown] = useState<DropdownOptions>(
    (startDate
      ? getDatesInMonth(startDate.getFullYear(), startDate.getMonth())
      : getDatesInMonth(new Date().getFullYear(), new Date().getMonth())
    )
      .filter((item) => {
        if (type === 'daterange') {
          if (maxDate && maxDate.getFullYear() === startDate?.getFullYear()) {
            return parseInt(item) <= maxDate.getDate();
          }
        }

        return item;
      })
      .map((date) => ({ label: date, value: date }))
  );
  const [endDateDropdown, setCurrentEndDateDropdown] = useState<DropdownOptions>(
    (endDate
      ? getDatesInMonth(endDate.getFullYear(), endDate.getMonth())
      : getDatesInMonth(new Date().getFullYear(), new Date().getMonth())
    )
      .filter((item) => {
        if (startDate) {
          if (maxDate && maxDate.getFullYear() === endDate?.getFullYear()) {
            return parseInt(item) >= startDate.getDate() && parseInt(item) <= maxDate.getDate();
          }
          return parseInt(item) >= startDate.getDate();
        }
      })
      .map((date) => ({ label: date, value: date }))
  );

  const [startMonthDropdown, setStartMonthDropdown] = useState<DropdownOptions>(
    [
      { label: internationalization.months?.january ?? 'January', value: '0' },
      {
        label: internationalization.months?.february ?? 'February',
        value: '1',
      },
      { label: internationalization.months?.march ?? 'March', value: '2' },
      { label: internationalization.months?.april ?? 'April', value: '3' },
      { label: internationalization.months?.may ?? 'May', value: '4' },
      { label: internationalization.months?.june ?? 'June', value: '5' },
      { label: internationalization.months?.july ?? 'July', value: '6' },
      { label: internationalization.months?.august ?? 'August', value: '7' },
      {
        label: internationalization.months?.september ?? 'September',
        value: '8',
      },
      { label: internationalization.months?.october ?? 'October', value: '9' },
      {
        label: internationalization.months?.november ?? 'November',
        value: '10',
      },
      {
        label: internationalization.months?.december ?? 'December',
        value: '11',
      },
    ].filter((month) => {
      if (type === 'daterange') {
        if (endDate) return parseInt(month.value) <= endDate.getMonth();
      }
      return month;
    })
  );

  useEffect(() => {
    setStartMonthDropdown(
      [
        {
          label: internationalization.months?.january ?? 'January',
          value: '0',
        },
        {
          label: internationalization.months?.february ?? 'February',
          value: '1',
        },
        { label: internationalization.months?.march ?? 'March', value: '2' },
        { label: internationalization.months?.april ?? 'April', value: '3' },
        { label: internationalization.months?.may ?? 'May', value: '4' },
        { label: internationalization.months?.june ?? 'June', value: '5' },
        { label: internationalization.months?.july ?? 'July', value: '6' },
        { label: internationalization.months?.august ?? 'August', value: '7' },
        {
          label: internationalization.months?.september ?? 'September',
          value: '8',
        },
        {
          label: internationalization.months?.october ?? 'October',
          value: '9',
        },
        {
          label: internationalization.months?.november ?? 'November',
          value: '10',
        },
        {
          label: internationalization.months?.december ?? 'December',
          value: '11',
        },
      ].filter((month) => {
        if (type === 'daterange') {
          if (endDate) return parseInt(month.value) <= endDate.getMonth();
        }
        return month;
      })
    );
  }, [internationalization.months, endDate, type]);

  const [endMonthDropdown, setEndMonthDropdown] = useState<DropdownOptions>(
    [
      { label: internationalization.months?.january ?? 'January', value: '0' },
      {
        label: internationalization.months?.february ?? 'February',
        value: '1',
      },
      { label: internationalization.months?.march ?? 'March', value: '2' },
      { label: internationalization.months?.april ?? 'April', value: '3' },
      { label: internationalization.months?.may ?? 'May', value: '4' },
      { label: internationalization.months?.june ?? 'June', value: '5' },
      { label: internationalization.months?.july ?? 'July', value: '6' },
      { label: internationalization.months?.august ?? 'August', value: '7' },
      {
        label: internationalization.months?.september ?? 'September',
        value: '8',
      },
      { label: internationalization.months?.october ?? 'October', value: '9' },
      {
        label: internationalization.months?.november ?? 'November',
        value: '10',
      },
      {
        label: internationalization.months?.december ?? 'December',
        value: '11',
      },
    ].filter((month) => {
      if (startDate) {
        if (maxDate) {
          return (
            parseInt(month.value) >= startDate.getMonth() &&
            parseInt(month.value) <= maxDate.getMonth()
          );
        }
        return parseInt(month.value) >= startDate.getMonth();
      }
    })
  );

  useEffect(() => {
    setEndMonthDropdown(
      [
        {
          label: internationalization.months?.january ?? 'January',
          value: '0',
        },
        {
          label: internationalization.months?.february ?? 'February',
          value: '1',
        },
        { label: internationalization.months?.march ?? 'March', value: '2' },
        { label: internationalization.months?.april ?? 'April', value: '3' },
        { label: internationalization.months?.may ?? 'May', value: '4' },
        { label: internationalization.months?.june ?? 'June', value: '5' },
        { label: internationalization.months?.july ?? 'July', value: '6' },
        { label: internationalization.months?.august ?? 'August', value: '7' },
        {
          label: internationalization.months?.september ?? 'September',
          value: '8',
        },
        {
          label: internationalization.months?.october ?? 'October',
          value: '9',
        },
        {
          label: internationalization.months?.november ?? 'November',
          value: '10',
        },
        {
          label: internationalization.months?.december ?? 'December',
          value: '11',
        },
      ].filter((month) => {
        if (startDate) {
          if (maxDate) {
            return (
              parseInt(month.value) >= startDate.getMonth() &&
              parseInt(month.value) <= maxDate.getMonth()
            );
          }
          return parseInt(month.value) >= startDate.getMonth();
        }
      })
    );
  }, [internationalization.months, maxDate, startDate]);

  const [startYearDropdown, setStartYearDropdown] = useState<DropdownOptions>(
    (startDate
      ? getYearRange(startDate.getFullYear(), yearOffset)
      : getYearRange(new Date().getFullYear(), yearOffset)
    )
      .filter((year) => {
        if (minDate && maxDate) {
          return parseInt(year) >= minDate.getFullYear() && parseInt(year) <= maxDate.getFullYear();
        }

        return year;
      })
      .map((year) => ({ label: year, value: year }))
  );
  const [endYearDropdown, setEndYearDropdown] = useState<DropdownOptions>(
    (endDate
      ? getYearRange(endDate.getFullYear(), yearOffset)
      : getYearRange(new Date().getFullYear(), yearOffset)
    )
      .filter((year) => {
        if (startDate) {
          if (maxDate && maxDate.getFullYear() === endDate?.getFullYear()) {
            return (
              parseInt(year) >= startDate.getFullYear() && parseInt(year) <= maxDate.getFullYear()
            );
          }
          return parseInt(year) >= startDate.getFullYear();
        }

        return year;
      })
      .map((year) => ({ label: year, value: year }))
  );

  const [currentStartDate, setCurrentStartDate] = useState(String(startDate?.getDate()));
  const [startMonth, setStartMonth] = useState(String(startDate?.getMonth()));
  const [startYear, setStartYear] = useState(String(startDate?.getFullYear()));

  // State for  end date
  const [currentEndDate, setCurrentEndDate] = useState(String(endDate?.getDate()));
  const [endMonth, setEndMonth] = useState(String(endDate?.getMonth()));
  const [endYear, setEndYear] = useState(String(endDate?.getFullYear()));

  const getDefaultDateRange = useCallback(() => {
    const endD = endDate ?? new Date();
    const startD = endDate ?? new Date(endD.getTime() - 1000 * 3600 * 24 * 7);

    return {
      startDate: startD,
      endDate: endD,
      key: 'selection' as const,
    };
  }, [endDate]);

  const [dateRange, setDateRange] = useState<{
    startDate: Date;
    endDate: Date;
    key: 'selection';
  }>(
    startDate && endDate
      ? { startDate: startDate, endDate: endDate, key: 'selection' }
      : getDefaultDateRange
  );
  const setToDefaultDateRange = () => {
    setDateRange(getDefaultDateRange());
  };

  const handleSelect = (ranges: RangeKeyDict) => {
    if (type === 'date') {
      setDateRange((prev) => {
        if (prev.startDate === ranges.selection.startDate) {
          return {
            ...prev,
            startDate: ranges.selection.endDate ?? new Date(),
            endDate: ranges.selection.endDate ?? new Date(),
          };
        }
        return {
          ...prev,
          startDate: ranges.selection.startDate ?? new Date(),
          endDate: ranges.selection.startDate ?? new Date(),
        };
      });
    } else {
      setDateRange((prev) => ({
        ...prev,
        startDate: ranges.selection.startDate ?? new Date(),
        endDate: ranges.selection.endDate ?? new Date(),
      }));
    }
  };

  useEffect(() => {
    const start = dateRange.startDate;
    const end = dateRange.endDate;

    if (type === 'daterange') {
      const isSameYearSameMonth =
        start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();

      const isSameYearDifferentMonth =
        start.getFullYear() === end.getFullYear() && start.getMonth() !== end.getMonth();

      const isDifferentYear = start.getFullYear() !== end.getFullYear();

      const isMaxDateInSelection =
        (start.getFullYear() === maxDate?.getFullYear() &&
          start.getMonth() === maxDate.getMonth()) ||
        (end.getFullYear() === maxDate?.getFullYear() && end.getMonth() === maxDate.getMonth());

      const isMaxDateInEndSelection =
        end.getFullYear() === maxDate?.getFullYear() && end.getMonth() === maxDate.getMonth();

      const isMinDateInSelection =
        (start.getFullYear() === minDate?.getFullYear() &&
          start.getMonth() === minDate.getMonth()) ||
        (end.getFullYear() === minDate?.getFullYear() && end.getMonth() === minDate.getMonth());

      const isMinDateInStartSelection =
        start.getFullYear() === minDate?.getFullYear() && start.getMonth() === minDate.getMonth();

      setCurrentStartDate(start.getDate().toString());
      setCurrentEndDate(end.getDate().toString());
      setStartMonth(start.getMonth().toString());
      setEndMonth(end.getMonth().toString());
      setStartYear(start.getFullYear().toString());
      setEndYear(end.getFullYear().toString());

      if (isSameYearSameMonth) {
        setCurrentStartDateDropdown(
          getDatesInMonth(start.getFullYear(), start.getMonth())
            .filter((item) => {
              if (isMaxDateInSelection) {
                return parseInt(item) <= end.getDate() && parseInt(item) <= maxDate.getDate();
              }

              if (isMinDateInSelection) {
                return (
                  parseInt(item) >= start.getDate() &&
                  parseInt(item) >= minDate.getDate() &&
                  parseInt(item) <= end.getDate()
                );
              }

              return parseInt(item) <= end.getDate();
            })
            .map((item) => ({ label: item, value: item }))
        );

        setCurrentEndDateDropdown(
          getDatesInMonth(start.getFullYear(), start.getMonth())
            .filter((item) => {
              if (isMinDateInSelection) {
                return parseInt(item) >= minDate.getDate() && parseInt(item) >= start.getDate();
              }

              if (isMaxDateInSelection) {
                return parseInt(item) >= start.getDate() && parseInt(item) <= maxDate.getDate();
              }

              return parseInt(item) >= start.getDate();
            })
            .map((item) => ({ label: item, value: item }))
        );

        setStartMonthDropdown(
          MONTH_LIST.filter((month) => {
            if (
              minDate &&
              (minDate.getFullYear() === start.getFullYear() ||
                minDate.getFullYear() === end.getFullYear())
            ) {
              return (
                parseInt(month.value) <= end.getMonth() &&
                parseInt(month.value) >= minDate.getMonth()
              );
            }

            if (
              maxDate &&
              (maxDate.getFullYear() === start.getFullYear() ||
                maxDate.getFullYear() === end.getFullYear())
            ) {
              return (
                parseInt(month.value) <= end.getMonth() &&
                parseInt(month.value) <= maxDate.getMonth()
              );
            }

            return parseInt(month.value) <= end.getMonth();
          })
        );
        setEndMonthDropdown(
          MONTH_LIST.filter((month) => {
            if (
              minDate &&
              (minDate.getFullYear() === start.getFullYear() ||
                minDate.getFullYear() === end.getFullYear())
            ) {
              return (
                parseInt(month.value) >= start.getMonth() &&
                parseInt(month.value) >= minDate.getMonth()
              );
            }
            if (
              maxDate &&
              (maxDate.getFullYear() === start.getFullYear() ||
                maxDate.getFullYear() === end.getFullYear())
            ) {
              return (
                parseInt(month.value) >= start.getMonth() &&
                parseInt(month.value) <= maxDate.getMonth()
              );
            }

            return parseInt(month.value) >= start.getMonth();
          })
        );
      } else if (isSameYearDifferentMonth) {
        setCurrentStartDateDropdown(
          getDatesInMonth(start.getFullYear(), start.getMonth())
            .filter((item) => {
              if (isMinDateInSelection) {
                return parseInt(item) >= minDate.getDate();
              }
              return item;
            })
            .map((item) => ({ label: item, value: item }))
        );

        setCurrentEndDateDropdown(
          getDatesInMonth(end.getFullYear(), end.getMonth())
            .filter((item) => {
              if (isMaxDateInSelection) {
                return parseInt(item) <= maxDate.getDate();
              }
              return item;
            })
            .map((item) => ({ label: item, value: item }))
        );

        setStartMonthDropdown(
          MONTH_LIST.filter((month) => {
            if (
              minDate &&
              (minDate.getFullYear() === start.getFullYear() ||
                minDate.getFullYear() === end.getFullYear())
            ) {
              return (
                parseInt(month.value) <= end.getMonth() &&
                parseInt(month.value) >= minDate.getMonth()
              );
            }

            if (
              maxDate &&
              (maxDate.getFullYear() === start.getFullYear() ||
                maxDate.getFullYear() === end.getFullYear())
            ) {
              return (
                parseInt(month.value) <= end.getMonth() &&
                parseInt(month.value) <= maxDate.getMonth()
              );
            }

            return parseInt(month.value) <= end.getMonth();
          })
        );
        setEndMonthDropdown(
          MONTH_LIST.filter((month) => {
            if (
              maxDate &&
              (maxDate.getFullYear() === start.getFullYear() ||
                maxDate.getFullYear() === end.getFullYear())
            ) {
              return (
                parseInt(month.value) >= start.getMonth() &&
                parseInt(month.value) <= maxDate.getMonth()
              );
            }
            return parseInt(month.value) >= start.getMonth();
          })
        );
      } else if (isDifferentYear) {
        setCurrentStartDateDropdown(
          getDatesInMonth(start.getFullYear(), start.getMonth())
            .filter((item) => {
              if (isMinDateInStartSelection) {
                return parseInt(item) >= minDate.getDate();
              }
              return item;
            })
            .map((item) => ({ label: item, value: item }))
        );

        setCurrentEndDateDropdown(
          getDatesInMonth(end.getFullYear(), end.getMonth())
            .filter((item) => {
              if (maxDate && isMaxDateInEndSelection) {
                return parseInt(item) <= maxDate.getDate();
              }
              return item;
            })
            .map((item) => ({ label: item, value: item }))
        );

        setStartMonthDropdown(
          MONTH_LIST.filter((month) => {
            if (
              minDate &&
              (minDate.getFullYear() === start.getFullYear() ||
                minDate.getFullYear() === end.getFullYear())
            ) {
              return parseInt(month.value) >= minDate.getMonth();
            }

            if (maxDate && maxDate.getFullYear() === start.getFullYear()) {
              return parseInt(month.value) <= maxDate.getMonth();
            }
            return month;
          })
        );
        setEndMonthDropdown(
          MONTH_LIST.filter((month) => {
            if (maxDate && maxDate.getFullYear() === end.getFullYear()) {
              return parseInt(month.value) <= maxDate.getMonth();
            }
            return month;
          })
        );
      }

      setStartYearDropdown(
        getYearRange(start.getFullYear(), yearOffset)
          .filter((item) => {
            if (minDate) {
              return parseInt(item) >= minDate.getFullYear() && parseInt(item) <= end.getFullYear();
            }
            return parseInt(item) <= end.getFullYear();
          })
          .map((item) => ({
            label: item,
            value: item,
          }))
      );

      setEndYearDropdown(
        getYearRange(end.getFullYear(), yearOffset)
          .filter((item) => {
            if (maxDate) {
              return (
                parseInt(item) >= start.getFullYear() && parseInt(item) <= maxDate.getFullYear()
              );
            }
            return parseInt(item) >= start.getFullYear();
          })
          .map((item) => ({
            label: item,
            value: item,
          }))
      );
    } else {
      setCurrentStartDate(start.getDate().toString());
      setCurrentEndDate(start.getDate().toString());
      setStartMonth(start.getMonth().toString());
      setEndMonth(start.getMonth().toString());
      setStartYear(start.getFullYear().toString());
      setEndYear(start.getFullYear().toString());

      setStartMonthDropdown(
        MONTH_LIST.filter((month) => {
          if (maxDate && maxDate.getFullYear() === start.getFullYear()) {
            return parseInt(month.value) <= maxDate.getMonth();
          }

          if (minDate && minDate.getFullYear() === start.getFullYear()) {
            return parseInt(month.value) >= minDate.getMonth();
          }
          return month;
        })
      );

      setStartYearDropdown(
        getYearRange(start.getFullYear(), yearOffset)
          .filter((item) => {
            if (minDate && maxDate) {
              return (
                parseInt(item) >= minDate.getFullYear() && parseInt(item) <= maxDate.getFullYear()
              );
            }
            return item;
          })
          .map((item) => ({
            label: item,
            value: item,
          }))
      );
    }
  }, [dateRange, maxDate, yearOffset, minDate, type, startDate, endDate]);

  useEffect(() => {
    const start = startDate ?? new Date();
    const end = endDate ?? new Date();
    if (type === 'daterange') {
      const isSameYearSameMonth =
        start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();

      const isSameYearDifferentMonth =
        start.getFullYear() === end.getFullYear() && start.getMonth() !== end.getMonth();

      const isDifferentYear = start.getFullYear() !== end.getFullYear();

      const isMaxDateInSelection =
        (start.getFullYear() === maxDate?.getFullYear() &&
          start.getMonth() === maxDate.getMonth()) ||
        (end.getFullYear() === maxDate?.getFullYear() && end.getMonth() === maxDate.getMonth());

      const isMaxDateInEndSelection =
        end.getFullYear() === maxDate?.getFullYear() && end.getMonth() === maxDate.getMonth();

      const isMinDateInSelection =
        (start.getFullYear() === minDate?.getFullYear() &&
          start.getMonth() === minDate.getMonth()) ||
        (end.getFullYear() === minDate?.getFullYear() && end.getMonth() === minDate.getMonth());

      const isMinDateInStartSelection =
        start.getFullYear() === minDate?.getFullYear() && start.getMonth() === minDate.getMonth();

      setCurrentStartDate(start.getDate().toString());
      setCurrentEndDate(end.getDate().toString());
      setStartMonth(start.getMonth().toString());
      setEndMonth(end.getMonth().toString());
      setStartYear(start.getFullYear().toString());
      setEndYear(end.getFullYear().toString());

      if (isSameYearSameMonth) {
        setCurrentStartDateDropdown(
          getDatesInMonth(start.getFullYear(), start.getMonth())
            .filter((item) => {
              if (isMaxDateInSelection) {
                return parseInt(item) <= end.getDate() && parseInt(item) <= maxDate.getDate();
              }

              if (isMinDateInSelection) {
                return (
                  parseInt(item) >= start.getDate() &&
                  parseInt(item) >= minDate.getDate() &&
                  parseInt(item) <= end.getDate()
                );
              }

              return parseInt(item) <= end.getDate();
            })
            .map((item) => ({ label: item, value: item }))
        );

        setCurrentEndDateDropdown(
          getDatesInMonth(start.getFullYear(), start.getMonth())
            .filter((item) => {
              if (isMinDateInSelection) {
                return parseInt(item) >= minDate.getDate() && parseInt(item) >= start.getDate();
              }

              if (isMaxDateInSelection) {
                return parseInt(item) >= start.getDate() && parseInt(item) <= maxDate.getDate();
              }

              return parseInt(item) >= start.getDate();
            })
            .map((item) => ({ label: item, value: item }))
        );

        setStartMonthDropdown(
          MONTH_LIST.filter((month) => {
            if (
              minDate &&
              (minDate.getFullYear() === start.getFullYear() ||
                minDate.getFullYear() === end.getFullYear())
            ) {
              return (
                parseInt(month.value) <= end.getMonth() &&
                parseInt(month.value) >= minDate.getMonth()
              );
            }

            if (
              maxDate &&
              (maxDate.getFullYear() === start.getFullYear() ||
                maxDate.getFullYear() === end.getFullYear())
            ) {
              return (
                parseInt(month.value) <= end.getMonth() &&
                parseInt(month.value) <= maxDate.getMonth()
              );
            }

            return parseInt(month.value) <= end.getMonth();
          })
        );
        setEndMonthDropdown(
          MONTH_LIST.filter((month) => {
            if (
              minDate &&
              (minDate.getFullYear() === start.getFullYear() ||
                minDate.getFullYear() === end.getFullYear())
            ) {
              return (
                parseInt(month.value) >= start.getMonth() &&
                parseInt(month.value) >= minDate.getMonth()
              );
            }
            if (
              maxDate &&
              (maxDate.getFullYear() === start.getFullYear() ||
                maxDate.getFullYear() === end.getFullYear())
            ) {
              return (
                parseInt(month.value) >= start.getMonth() &&
                parseInt(month.value) <= maxDate.getMonth()
              );
            }

            return parseInt(month.value) >= start.getMonth();
          })
        );
      } else if (isSameYearDifferentMonth) {
        setCurrentStartDateDropdown(
          getDatesInMonth(start.getFullYear(), start.getMonth())
            .filter((item) => {
              if (isMinDateInSelection) {
                return parseInt(item) >= minDate.getDate();
              }
              return item;
            })
            .map((item) => ({ label: item, value: item }))
        );

        setCurrentEndDateDropdown(
          getDatesInMonth(end.getFullYear(), end.getMonth())
            .filter((item) => {
              if (isMaxDateInSelection) {
                return parseInt(item) <= maxDate.getDate();
              }
              return item;
            })
            .map((item) => ({ label: item, value: item }))
        );

        setStartMonthDropdown(
          MONTH_LIST.filter((month) => {
            if (
              minDate &&
              (minDate.getFullYear() === start.getFullYear() ||
                minDate.getFullYear() === end.getFullYear())
            ) {
              return (
                parseInt(month.value) <= end.getMonth() &&
                parseInt(month.value) >= minDate.getMonth()
              );
            }

            if (
              maxDate &&
              (maxDate.getFullYear() === start.getFullYear() ||
                maxDate.getFullYear() === end.getFullYear())
            ) {
              return (
                parseInt(month.value) <= end.getMonth() &&
                parseInt(month.value) <= maxDate.getMonth()
              );
            }

            return parseInt(month.value) <= end.getMonth();
          })
        );
        setEndMonthDropdown(
          MONTH_LIST.filter((month) => {
            if (
              maxDate &&
              (maxDate.getFullYear() === start.getFullYear() ||
                maxDate.getFullYear() === end.getFullYear())
            ) {
              return (
                parseInt(month.value) >= start.getMonth() &&
                parseInt(month.value) <= maxDate.getMonth()
              );
            }
            return parseInt(month.value) >= start.getMonth();
          })
        );
      } else if (isDifferentYear) {
        setCurrentStartDateDropdown(
          getDatesInMonth(start.getFullYear(), start.getMonth())
            .filter((item) => {
              if (isMinDateInStartSelection) {
                return parseInt(item) >= minDate.getDate();
              }
              return item;
            })
            .map((item) => ({ label: item, value: item }))
        );

        setCurrentEndDateDropdown(
          getDatesInMonth(end.getFullYear(), end.getMonth())
            .filter((item) => {
              if (maxDate && isMaxDateInEndSelection) {
                return parseInt(item) <= maxDate.getDate();
              }
              return item;
            })
            .map((item) => ({ label: item, value: item }))
        );

        setStartMonthDropdown(
          MONTH_LIST.filter((month) => {
            if (
              minDate &&
              (minDate.getFullYear() === start.getFullYear() ||
                minDate.getFullYear() === end.getFullYear())
            ) {
              return parseInt(month.value) >= minDate.getMonth();
            }

            if (maxDate && maxDate.getFullYear() === start.getFullYear()) {
              return parseInt(month.value) <= maxDate.getMonth();
            }
            return month;
          })
        );
        setEndMonthDropdown(
          MONTH_LIST.filter((month) => {
            if (maxDate && maxDate.getFullYear() === end.getFullYear()) {
              return parseInt(month.value) <= maxDate.getMonth();
            }
            return month;
          })
        );
      }

      setStartYearDropdown(
        getYearRange(start.getFullYear(), yearOffset)
          .filter((item) => {
            if (minDate) {
              return parseInt(item) >= minDate.getFullYear() && parseInt(item) <= end.getFullYear();
            }
            return parseInt(item) <= end.getFullYear();
          })
          .map((item) => ({
            label: item,
            value: item,
          }))
      );

      setEndYearDropdown(
        getYearRange(end.getFullYear(), yearOffset)
          .filter((item) => {
            if (maxDate) {
              return (
                parseInt(item) >= start.getFullYear() && parseInt(item) <= maxDate.getFullYear()
              );
            }
            return parseInt(item) >= start.getFullYear();
          })
          .map((item) => ({
            label: item,
            value: item,
          }))
      );
    } else {
      setCurrentStartDate(start.getDate().toString());
      setCurrentEndDate(start.getDate().toString());
      setStartMonth(start.getMonth().toString());
      setEndMonth(start.getMonth().toString());
      setStartYear(start.getFullYear().toString());
      setEndYear(start.getFullYear().toString());

      setStartMonthDropdown(
        MONTH_LIST.filter((month) => {
          if (maxDate && maxDate.getFullYear() === start.getFullYear()) {
            return parseInt(month.value) <= maxDate.getMonth();
          }

          if (minDate && minDate.getFullYear() === start.getFullYear()) {
            return parseInt(month.value) >= minDate.getMonth();
          }
          return month;
        })
      );

      setStartYearDropdown(
        getYearRange(start.getFullYear(), yearOffset)
          .filter((item) => {
            if (minDate && maxDate) {
              return (
                parseInt(item) >= minDate.getFullYear() && parseInt(item) <= maxDate.getFullYear()
              );
            }
            return item;
          })
          .map((item) => ({
            label: item,
            value: item,
          }))
      );
    }

    setCurrentStartDate(String(startDate?.getDate()));
    setStartMonth(String(startDate?.getMonth()));
    setStartYear(String(startDate?.getFullYear()));

    setCurrentEndDate(String(endDate?.getDate()));
    setEndMonth(String(endDate?.getMonth()));
    setEndYear(String(endDate?.getFullYear()));

    setDateRange(
      startDate && endDate
        ? { startDate: startDate, endDate: endDate, key: 'selection' }
        : getDefaultDateRange
    );
  }, [startDate, endDate, getDefaultDateRange, maxDate, minDate, type, yearOffset]);

  const defineds = {
    startOfWeek: startOfWeek(new Date()),
    endOfWeek: endOfWeek(new Date()),
    startOfLastWeek: startOfWeek(addDays(new Date(), -7)),
    endOfLastWeek: endOfWeek(addDays(new Date(), -7)),
    startOfToday: startOfDay(new Date()),
    endOfToday: endOfDay(new Date()),
    startOfYesterday: startOfDay(addDays(new Date(), -1)),
    endOfYesterday: endOfDay(addDays(new Date(), -1)),
    startOfMonth: startOfMonth(new Date()),
    endOfMonth: endOfMonth(new Date()),
    startOfLastMonth: startOfMonth(addMonths(new Date(), -1)),
    endOfLastMonth: endOfMonth(addMonths(new Date(), -1)),
  };

  const onSubmit = () => {
    onChange(dateRange.startDate, dateRange.endDate, period);
  };

  const handleChangeCurrentStartDate = (e: string) => {
    const date = e;
    setCurrentStartDate(date);
    setDateRange({
      startDate: new Date(parseInt(startYear), parseInt(startMonth), parseInt(date)),
      endDate: new Date(parseInt(endYear), parseInt(endMonth), parseInt(currentEndDate)),
      key: 'selection',
    });
  };

  const handleChangeStartMonth = (e: string) => {
    const month = e;
    setStartMonth(month);

    const listDayInMonth = getDatesInMonth(parseInt(startYear), parseInt(month));

    const getEligibleStartDate = () => {
      if (listDayInMonth.includes(currentStartDate)) {
        // When the selected month is the same with current end month,
        // and current start date is greater than current end date, set the value to first date
        if (month === endMonth && parseInt(currentStartDate) > parseInt(currentEndDate)) {
          return '1';
        }

        // When the selected month is equal to min date month
        // and current start year is equal to min date year
        // and current date is less than min date, set the value to min date
        if (
          parseInt(month) === minDate?.getMonth() &&
          parseInt(startYear) === minDate.getFullYear() &&
          parseInt(currentStartDate) <= minDate.getDate()
        ) {
          return minDate.getDate().toString();
        }

        // When the selected month is equal to current end month
        // and current end month is equal to max date month
        // and current date is greater than max date, set the value to first date
        if (
          month === endMonth &&
          parseInt(endMonth) === maxDate?.getMonth() &&
          parseInt(currentStartDate) >= maxDate.getDate()
        ) {
          return '1';
        } else {
          return currentStartDate;
        }
      } else {
        return '1';
      }
    };

    const eligibleStartDate = getEligibleStartDate();

    setCurrentStartDate(eligibleStartDate);

    if (type === 'daterange') {
      setDateRange({
        startDate: new Date(parseInt(startYear), parseInt(month), parseInt(eligibleStartDate)),
        endDate: new Date(parseInt(endYear), parseInt(endMonth), parseInt(currentEndDate)),
        key: 'selection',
      });
    } else {
      setDateRange({
        startDate: new Date(parseInt(startYear), parseInt(month), parseInt(eligibleStartDate)),
        endDate: new Date(parseInt(startYear), parseInt(month), parseInt(eligibleStartDate)),
        key: 'selection',
      });
    }
  };

  const handleChangeStartYear = (e: string) => {
    const year = e;
    const startYearNumber = parseInt(year);
    const endYearNumber = parseInt(endYear);
    const startMonthNumber = parseInt(startMonth);
    const endMonthNumber = parseInt(endMonth);
    setStartYear(year);
    const getEligibleStartMonth = () => {
      if (startYearNumber === endYearNumber) {
        if (startMonthNumber > endMonthNumber) {
          return endMonth;
        } else {
          return startMonth;
        }
      } else if (startYearNumber < endYearNumber) {
        if (
          minDate &&
          minDate.getFullYear() === startYearNumber &&
          startMonthNumber < minDate.getMonth()
        ) {
          return minDate.getMonth().toString();
        } else {
          return startMonth;
        }
      } else {
        return startMonth;
      }
    };

    const eligibleStartMonth = getEligibleStartMonth();

    const listDayInMonth = getDatesInMonth(parseInt(year), parseInt(eligibleStartMonth));

    const getEligibleStartDate = () => {
      const daysInMonth = listDayInMonth.length;

      let eligibleDate =
        parseInt(currentStartDate) <= daysInMonth ? currentStartDate : daysInMonth.toString();

      if (
        parseInt(year) === parseInt(endYear) &&
        parseInt(eligibleStartMonth) === parseInt(endMonth) &&
        parseInt(eligibleDate) >= parseInt(currentEndDate)
      ) {
        return '1';
      }

      if (
        minDate &&
        parseInt(year) === minDate.getFullYear() &&
        parseInt(eligibleStartMonth) === minDate.getMonth() &&
        parseInt(eligibleDate) < minDate.getDate()
      ) {
        eligibleDate = minDate.getDate().toString();
      }

      if (
        maxDate &&
        parseInt(year) === maxDate.getFullYear() &&
        parseInt(eligibleStartMonth) === maxDate.getMonth() &&
        parseInt(eligibleDate) > maxDate.getDate()
      ) {
        eligibleDate = maxDate.getDate().toString();
      }

      return eligibleDate;
    };

    const eligibleStartDate = getEligibleStartDate();

    setCurrentStartDate(eligibleStartDate);

    if (type === 'daterange') {
      setDateRange({
        startDate: new Date(
          parseInt(year),
          parseInt(eligibleStartMonth),
          parseInt(eligibleStartDate)
        ),
        endDate: new Date(parseInt(endYear), parseInt(endMonth), parseInt(currentEndDate)),
        key: 'selection',
      });
    } else {
      setDateRange({
        startDate: new Date(
          parseInt(year),
          parseInt(eligibleStartMonth),
          parseInt(eligibleStartDate)
        ),
        endDate: new Date(
          parseInt(year),
          parseInt(eligibleStartMonth),
          parseInt(eligibleStartDate)
        ),
        key: 'selection',
      });
    }
  };

  const handleChangeCurrentEndDate = (e: string) => {
    const date = e;
    setCurrentEndDate(date);
    setDateRange({
      startDate: new Date(parseInt(startYear), parseInt(startMonth), parseInt(currentStartDate)),
      endDate: new Date(parseInt(endYear), parseInt(endMonth), parseInt(date)),
      key: 'selection',
    });
  };

  const handleChangeEndMonth = (e: string) => {
    const month = e;
    setEndMonth(month);
    const listDayInMonth = getDatesInMonth(parseInt(endYear), parseInt(month));

    const getEligibleEndDate = () => {
      if (maxDate) {
        const isCurrentEndDateInList = listDayInMonth.includes(currentEndDate);
        const isMaxDateInCurrentMonth =
          parseInt(month) === maxDate.getMonth() && parseInt(endYear) === maxDate.getFullYear();
        const isCurrentEndDateAfterMaxDate = parseInt(currentEndDate) >= maxDate.getDate();
        const isCurrentStartDateAfterCurrentEndDate =
          parseInt(currentStartDate) > parseInt(currentEndDate);

        if (isCurrentEndDateInList) {
          if (month === startMonth && isCurrentStartDateAfterCurrentEndDate) {
            return listDayInMonth[listDayInMonth.length - 1];
          }
          if (isMaxDateInCurrentMonth && isCurrentEndDateAfterMaxDate) {
            return maxDate.getDate().toString();
          }
          return currentEndDate;
        } else {
          if (isMaxDateInCurrentMonth && isCurrentEndDateAfterMaxDate) {
            return maxDate.getDate().toString();
          }
          return listDayInMonth[listDayInMonth.length - 1];
        }
      } else {
        return currentEndDate;
      }
    };
    const eligibleEndDate = getEligibleEndDate();
    setCurrentEndDate(eligibleEndDate);

    setDateRange({
      startDate: new Date(parseInt(startYear), parseInt(startMonth), parseInt(currentStartDate)),
      endDate: new Date(parseInt(endYear), parseInt(month), parseInt(eligibleEndDate)),
      key: 'selection',
    });
  };

  const handleChangeEndYear = (e: string) => {
    const year = e;
    setEndYear(year);

    const getEligibleEndMonth = () => {
      const endYearNumber = parseInt(year);
      const startYearNumber = parseInt(startYear);
      const endMonthNumber = parseInt(endMonth);

      if (endYearNumber === startYearNumber && endMonthNumber < parseInt(startMonth)) {
        return startMonth;
      }

      if (
        minDate &&
        endYearNumber === minDate.getFullYear() &&
        endMonthNumber < minDate.getMonth()
      ) {
        return minDate.getMonth().toString();
      }

      if (
        maxDate &&
        endYearNumber === maxDate.getFullYear() &&
        endMonthNumber > maxDate.getMonth()
      ) {
        return maxDate.getMonth().toString();
      }

      return endMonth;
    };

    const eligibleEndMonth = getEligibleEndMonth();

    const listDayInMonth = getDatesInMonth(parseInt(year), parseInt(eligibleEndMonth));

    const getEligibleEndDate = () => {
      const daysInMonth = listDayInMonth.length;
      let eligibleDate =
        parseInt(currentEndDate) <= daysInMonth ? currentEndDate : daysInMonth.toString();

      if (
        parseInt(year) === parseInt(startYear) &&
        parseInt(eligibleEndMonth) === parseInt(startMonth) &&
        parseInt(eligibleDate) < parseInt(currentStartDate)
      ) {
        eligibleDate = currentStartDate;
      }

      if (
        minDate &&
        parseInt(year) === minDate.getFullYear() &&
        parseInt(eligibleEndMonth) === minDate.getMonth() &&
        parseInt(eligibleDate) < minDate.getDate()
      ) {
        eligibleDate = minDate.getDate().toString();
      }

      if (
        maxDate &&
        parseInt(year) === maxDate.getFullYear() &&
        parseInt(eligibleEndMonth) === maxDate.getMonth() &&
        parseInt(eligibleDate) > maxDate.getDate()
      ) {
        eligibleDate = maxDate.getDate().toString();
      }

      return eligibleDate;
    };

    const eligibleEndDate = getEligibleEndDate();

    setCurrentEndDate(eligibleEndDate);
    setEndMonth(eligibleEndMonth);

    setDateRange({
      startDate: new Date(parseInt(startYear), parseInt(startMonth), parseInt(currentStartDate)),
      endDate: new Date(parseInt(year), parseInt(eligibleEndMonth), parseInt(eligibleEndDate)),
      key: 'selection',
    });
  };

  const handleSelectPeriod = (e: string) => {
    const period = e as 'daily' | 'monthly';
    setPeriod(period);
  };

  const staticRanges: StaticRange[] = [
    {
      label: internationalization.staticRanges?.custom ?? 'Custom',
      range: () => ({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      }),
      isSelected: () => false,
    },
    {
      label: internationalization.staticRanges?.today ?? 'Today',
      range: () => ({
        startDate: defineds.startOfToday,
        endDate: defineds.endOfToday,
      }),
      isSelected: () => false,
    },
    {
      label: internationalization.staticRanges?.yesterday ?? 'Yesterday',
      range: () => ({
        startDate: defineds.startOfYesterday,
        endDate: defineds.endOfYesterday,
      }),
      isSelected: () => false,
    },
    {
      label: internationalization.staticRanges?.thisWeek ?? 'This Week',
      range: () => ({
        startDate: defineds.startOfWeek,
        endDate: selectUntilToday
          ? defineds.endOfToday
          : maxDate && defineds.endOfWeek <= maxDate
            ? defineds.endOfWeek
            : defineds.endOfToday,
      }),
      isSelected: () => false,
    },
    {
      label: internationalization.staticRanges?.lastWeek ?? 'Last Week',
      range: () => ({
        startDate: defineds.startOfLastWeek,
        endDate: defineds.endOfLastWeek,
      }),
      isSelected: () => false,
    },
    {
      label: internationalization.staticRanges?.thisMonth ?? 'This Month',
      range: () => ({
        startDate: defineds.startOfMonth,
        endDate: selectUntilToday
          ? defineds.endOfToday
          : maxDate && defineds.endOfMonth <= maxDate
            ? defineds.endOfMonth
            : defineds.endOfToday,
      }),
      isSelected: () => false,
    },
    {
      label: internationalization.staticRanges?.lastMonth ?? 'Last Month',
      range: () => ({
        startDate: defineds.startOfLastMonth,
        endDate: defineds.endOfLastMonth,
      }),
      isSelected: () => false,
    },
  ];

  const mappedStaticRanges = staticRanges.map((item, _index, array) => {
    const definedRange = item.range();
    return {
      ...item,
      isSelected: (range: Range) => {
        if (item.label === 'Custom') {
          return !array.slice(1).some((otherItem) => {
            const otherRange = otherItem.range();
            return (
              isSameDay(range.startDate ?? new Date(), otherRange.startDate ?? new Date()) &&
              isSameDay(range.endDate ?? new Date(), otherRange.endDate ?? new Date())
            );
          });
        }
        return (
          isSameDay(range.startDate ?? new Date(), definedRange.startDate ?? new Date()) &&
          isSameDay(range.endDate ?? new Date(), definedRange.endDate ?? new Date())
        );
      },
    };
  });

  const getLabelText = () => {
    const formatToken = DateRangerPickerProps?.dateDisplayFormat ?? 'MMM dd, yyyy';

    const startString = startDate
      ? format(startDate, formatToken, {
          locale: DateRangerPickerProps?.locale,
        })
      : formatToken;

    const endString = endDate
      ? format(endDate, formatToken, {
          locale: DateRangerPickerProps?.locale,
        })
      : formatToken;

    if (type === 'daterange') return `${startString} - ${endString}`;
    return startString;
  };

  return {
    dateRange,
    startDateDropdown,
    endDateDropdown,
    startMonthDropdown,
    endMonthDropdown,
    startYearDropdown,
    endYearDropdown,
    currentStartDate,
    currentEndDate,
    startMonth,
    endMonth,
    startYear,
    endYear,
    mappedStaticRanges,
    period,
    handleSelectPeriod,
    onSubmit,
    handleSelect,
    handleChangeCurrentStartDate,
    handleChangeCurrentEndDate,
    handleChangeStartMonth,
    handleChangeEndMonth,
    handleChangeStartYear,
    handleChangeEndYear,
    dateLabel: getLabelText(),
    setToDefaultDateRange,
  };
};
