import { ArrowDown, ArrowUp } from '@digital-twin/icons';
import { CalendarMonthIcon } from '@digital-twin/reusables';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';

import { Popover, PopoverContent, PopoverTrigger } from '../others';
import styles from './month-picker.module.scss';

export type MonthPickerProps = {
  selectedMonth: Date;
  onSelectedMonth: (selected: Date) => void;
  triggerClassName?: string;
  triggerStyle?: React.CSSProperties;
  contentClassName?: string;
  contentStyle?: React.CSSProperties;
  disableFuture?: boolean;
};

const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const MonthPicker = (props: MonthPickerProps) => {
  const {
    selectedMonth,
    onSelectedMonth,
    triggerClassName,
    triggerStyle,
    contentClassName,
    contentStyle,
    disableFuture,
  } = props;
  const [selectedYear, setSelectedYear] = useState(selectedMonth.getFullYear());
  const [direction, setDirection] = useState<'up' | 'down'>('down');

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  const handleYearChange = (newYear: number, dir: 'up' | 'down') => {
    if (disableFuture && newYear > currentYear) return;

    setDirection(dir);
    setSelectedYear(newYear);
  };

  return (
    <Popover offset={10} placement="bottom">
      <PopoverTrigger className={styles['month-picker-trigger-wrapper']}>
        <div
          className={clsx(styles['month-picker-trigger'], triggerClassName)}
          style={triggerStyle}
        >
          <CalendarMonthIcon width={24} height={24} />
          <span>
            {months[selectedMonth.getMonth()]} {selectedMonth.getFullYear()}
          </span>
        </div>
      </PopoverTrigger>
      <PopoverContent
        className={clsx(styles['month-picker-popover'], contentClassName)}
        style={contentStyle}
      >
        <div className={styles['month-picker-content']}>
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
              <div className={clsx(styles['nav-button'], disableFuture && selectedYear === currentYear && styles['disabled'])}>
                <ArrowDown
                  width={32}
                  height={32}
                  onClick={() => handleYearChange(selectedYear + 1, 'down')}
                />
              </div>
            </div>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedYear}
              className={styles['month-grid']}
              initial={{
                opacity: 0.2,
                y: direction === 'up' ? 10 : -10,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0.2,
                y: direction === 'up' ? -10 : 10,
              }}
              transition={{
                duration: 0.05,
                ease: 'easeOut',
              }}
            >
              {months.map((month, idx) => {
                const isSelected =
                  idx === selectedMonth.getMonth() && selectedYear === selectedMonth.getFullYear();

                const isFuture = disableFuture && 
                  (selectedYear > currentYear || (selectedYear === currentYear && idx > currentMonth));

                return (
                  <div
                    key={'month-picker-' + idx}
                    className={clsx(styles['month-item'], isSelected ? styles['selected'] : '', isFuture && styles['disabled'])}
                    onClick={() => {
                      if (isFuture) return;

                      const newDate = new Date(selectedMonth);
                      newDate.setMonth(idx);
                      newDate.setFullYear(selectedYear);
                      onSelectedMonth(newDate);
                    }}
                  >
                    {month.substring(0, 3)}
                  </div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>
      </PopoverContent>
    </Popover>
  );
};
