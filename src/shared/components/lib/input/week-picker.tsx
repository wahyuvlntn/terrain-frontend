/* eslint-disable react-hooks/exhaustive-deps */
import { Dropdown } from '@digital-twin/components';
import { ArrowDown, ArrowUp } from '@digital-twin/icons';
import { CalendarMonthIcon } from '@digital-twin/reusables';
import clsx from 'clsx';
import { addWeeks, format, getISOWeek, startOfISOWeek } from 'date-fns';
import { useEffect, useState } from 'react';

import { Popover, PopoverContent, PopoverTrigger } from '../others';
import styles from './week-picker.module.scss';

type WeekPickerProps = {
  selectedStartDate: Date;
  selectedEndDate: Date;
  onSelectedWeek: (startDate: Date, endDate: Date) => void;
  onInitialLoad?: () => void;
  triggerClassName?: string;
  triggerStyle?: React.CSSProperties;
  contentClassName?: string;
  contentStyle?: React.CSSProperties;
  disableAutoFirstWeek?: boolean;
  maxDate?: Date;
};
export default WeekPickerProps;

export const WeekPicker = (props: WeekPickerProps) => {
  const {
    selectedStartDate,
    selectedEndDate,
    triggerClassName,
    triggerStyle,
    contentClassName,
    contentStyle,
    onInitialLoad,
    onSelectedWeek,
    disableAutoFirstWeek,
    maxDate,
  } = props;

  const [selectedYear, setSelectedYear] = useState(
    selectedStartDate.getFullYear() !== selectedEndDate.getFullYear()
      ? selectedEndDate.getFullYear()
      : selectedStartDate.getFullYear()
  );
  const [selectedWeek, setSelectedWeek] = useState('');

  const generateISOWeeks = (year: number) => {
    const start = startOfISOWeek(new Date(year, 0, 4));
    const end = startOfISOWeek(new Date(year, 11, 28));

    const weeks = [];
    for (let d = start; d <= end; d = addWeeks(d, 1)) {
      const dAdjusted = new Date(d);
      dAdjusted.setDate(dAdjusted.getDate() - 1);
      const [, monthPrefix, datePrefix, year] = dAdjusted
        .toDateString()
        .split(' ');
      const [, monthPrefixEnd, datePrefixEnd, yearEnd] = new Date(
        dAdjusted.getTime() + 6 * 86400000
      )
        .toDateString()
        .split(' ');
      const label = `${datePrefix.padStart(
        2,
        '0'
      )} ${monthPrefix} ${year} - ${datePrefixEnd.padStart(
        2,
        '0'
      )} ${monthPrefixEnd} ${yearEnd}`;
      weeks.push({
        label: `Week ${getISOWeek(d)}: ${label}`,
        week_number: getISOWeek(d),
        week_start_date: dAdjusted,
        week_end_date: new Date(dAdjusted.getTime() + 6 * 86400000),
      });
    }

    if (maxDate) {
      return weeks.filter((week) => week.week_start_date <= maxDate);
    }

    return weeks;
  };

  const handleYearChange = (newYear: number, dir: 'up' | 'down') => {
    setSelectedYear(newYear);
  };

  const convertDate = (date: Date) => {
    const [, monthPrefix, datePrefix, year] = date.toDateString().split(' ');

    return `${datePrefix.padStart(2, '0')} ${monthPrefix} ${year}`;
  };

  useEffect(() => {
    onInitialLoad?.();
  }, [onInitialLoad]);

  const getISOWeekList = generateISOWeeks(selectedYear);

  const selectWeekFirst = () => {
    const findWeek = getISOWeekList.find((week) => {
      return (
        week.week_start_date.getTime() <=
        selectedStartDate.getTime() + 86400000 &&
        week.week_end_date.getTime() >= selectedStartDate.getTime() + 86400000
      );
    });

    if (findWeek) {
      setSelectedWeek(
        `${findWeek.week_number}:${format(
          findWeek.week_start_date,
          'yyyy-MM-dd'
        )}:${format(findWeek.week_end_date, 'yyyy-MM-dd')}`
      );

      onSelectedWeek(findWeek.week_start_date, findWeek.week_end_date);
    } else if (getISOWeekList.length > 0 && !disableAutoFirstWeek) {
      const { week_start_date, week_end_date } = getISOWeekList[0];
      setSelectedWeek(
        `1:${format(week_start_date, 'yyyy-MM-dd')}:${format(
          week_end_date,
          'yyyy-MM-dd'
        )}`
      );
      week_start_date.setDate(week_start_date.getDate() - 1);
      week_end_date.setDate(week_end_date.getDate() - 1);
      onSelectedWeek(week_start_date, week_end_date);
    }

  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: ASDASD
  useEffect(() => {
    selectWeekFirst();
  }, [disableAutoFirstWeek, selectedYear]);

  return (
    <Popover offset={10} placement="bottom">
      <PopoverTrigger className={styles['week-picker-trigger-wrapper']}>
        <div
          className={clsx(styles['week-picker-trigger'], triggerClassName)}
          style={triggerStyle}
        >
          <CalendarMonthIcon width={24} height={24} />
          <span>
            Week {selectedWeek.split(':')[0]}: {convertDate(selectedStartDate)}{' '}
            - {convertDate(selectedEndDate)}
          </span>
        </div>
      </PopoverTrigger>
      <PopoverContent
        className={clsx(styles['week-picker-popover'], contentClassName)}
        style={contentStyle}
      >
        <div className={styles['week-picker-content']}>
          <div className={styles['year-navigation']}>
            <span>{selectedYear}</span>
            <div className={styles['nav-buttons']}>
              <div className={styles['nav-button']}>
                <ArrowUp
                  width={32}
                  height={32}
                  onClick={() => handleYearChange(selectedYear - 1, 'up')}
                />
              </div>
              <div className={styles['nav-button']}>
                <ArrowDown
                  width={32}
                  height={32}
                  onClick={() => handleYearChange(selectedYear + 1, 'down')}
                />
              </div>
            </div>
          </div>
          <div>
            <Dropdown
              options={getISOWeekList.map((e) => ({
                label: e.label,
                value: `${e.week_number}:${format(
                  e.week_start_date,
                  'yyyy-MM-dd'
                )}:${format(e.week_end_date, 'yyyy-MM-dd')}`,
              }))}
              onChange={(value) => {
                const [, start, end] = value.split(':');
                const startAdjusted = new Date(start);
                startAdjusted.setDate(startAdjusted.getDate() - 1);

                const endAdjusted = new Date(end);
                endAdjusted.setDate(endAdjusted.getDate() - 1);

                onSelectedWeek(startAdjusted, endAdjusted);
                setSelectedWeek(value);
              }}
              value={selectedWeek}
              background="default"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
