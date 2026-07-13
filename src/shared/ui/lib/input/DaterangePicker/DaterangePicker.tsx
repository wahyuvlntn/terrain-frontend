import 'react-date-range/dist/styles.css';
import 'react-date-range/dist/theme/default.css';
import { addYears } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { useMemo, useState } from 'react';
import { DateRange, DateRangePicker, DateRangePickerProps } from 'react-date-range';
import { default as CalendarMonthIcon } from '../../icons/CalendarMonthIcon';
import { Popover, PopoverContent, PopoverTrigger } from '../../others/Popover/popover';
import { cn } from '../../utils';
import { ButtonProduct as Button } from '../Button/Button.product';
import { Dropdown } from '../Dropdown/Dropdown';
import { useDatePicker } from './DaterangePicker.hook';

export interface DatepickerInternationalization {
  dateLists?: string[];
  staticRanges?: {
    custom?: string;
    today?: string;
    yesterday?: string;
    thisWeek?: string;
    lastWeek?: string;
    thisMonth?: string;
    lastMonth?: string;
  };
  months?: {
    january?: string;
    february?: string;
    march?: string;
    april?: string;
    may?: string;
    june?: string;
    july?: string;
    august?: string;
    september?: string;
    october?: string;
    november?: string;
    december?: string;
  };
  buttons?: {
    clear?: string;
    cancel?: string;
    save?: string;
  };
}

interface DatepickerProps {
  /**
   * Initial selected start date.
   * @type {Date}
   */
  startDate?: Date;

  /**
   * Initial selected end date.
   * @type {Date}
   */
  endDate?: Date;

  /**
   * The maximum allowable date that can be selected.
   * @type {Date}
   */
  maxDate?: Date;

  /**
   * The minimum allowable date that can be selected.
   * @type {Date}
   */
  minDate?: Date;

  /**
   * Props to be passed to the DateRangePicker component.
   * @type {DateRangePickerProps}
   */
  DateRangerPickerProps?: DateRangePickerProps;

  /**
   * Number of offset years in the year dropdown. This is useful for customizing the range of years displayed.
   * @type {number}
   */
  yearOffset?: number;

  /**
   * Callback function that is called when the date selection changes.
   * @param {Date} startDate - The newly selected start date.
   * @param {Date} endDate - The newly selected end date.
   */
  onChange: (startDate: Date, endDate: Date, period?: string) => void;

  /**
   * Callback function that is called when the date selection is cleared.
   */
  onClear?: () => void;

  /**
   * Callback function that is called when the date selection is canceled.
   */
  onCancel?: () => void;

  /**
   * For customizing trigger button
   */
  triggerButtonStyle?: React.CSSProperties;

  type: 'date' | 'daterange';

  /**
   * label for trigger
   * @type {string}
   */
  label?: string;

  /**
   * labelPosition for trigger
   * @type {'top' | 'left'}
   */
  labelPosition?: 'top' | 'left';

  /**
   * selected period
   * @type {string}
   */
  selectedPeriod?: string;

  /**
   * period dropdown options
   * @type { value: string; label: string }[]
   */
  periodOptions?: { value: string; label: string }[];

  internationalization?: DatepickerInternationalization;

  contentWrapperStyle?: React.CSSProperties;
  contentWrapperClassName?: string;

  triggerWrapperStyle?: React.CSSProperties;
  triggerWrapperClassName?: string;

  contentStyle?: React.CSSProperties;
  contentClassName?: string;

  triggerButtonClassName?: string;

  selectUntilToday?: boolean;
}

export const DaterangePicker = ({
  startDate,
  endDate,
  maxDate,
  minDate,
  DateRangerPickerProps,
  triggerButtonStyle,
  yearOffset = 2,
  label,
  labelPosition,
  selectedPeriod,
  periodOptions,
  type,
  onChange,
  onClear,
  onCancel,
  internationalization,
  contentWrapperStyle,
  contentWrapperClassName,
  triggerButtonClassName,
  contentClassName,
  contentStyle,
  triggerWrapperClassName,
  triggerWrapperStyle,
  selectUntilToday = true,
}: DatepickerProps) => {
  const {
    dateRange,
    currentStartDate,
    currentEndDate,
    endDateDropdown,
    endMonth,
    endMonthDropdown,
    endYear,
    endYearDropdown,
    startDateDropdown,
    startMonth,
    startMonthDropdown,
    startYear,
    startYearDropdown,
    mappedStaticRanges,
    dateLabel,
    period,
    handleChangeCurrentEndDate,
    handleChangeCurrentStartDate,
    handleChangeEndMonth,
    handleChangeEndYear,
    handleChangeStartMonth,
    handleChangeStartYear,
    handleSelect,
    handleSelectPeriod,
    onSubmit,
    setToDefaultDateRange,
  } = useDatePicker({
    startDate: startDate,
    endDate: endDate,
    minDate: minDate,
    maxDate: maxDate,
    type: type,
    yearOffset: yearOffset,
    selectedPeriod,
    onChange: onChange,
    internationalization,
    DateRangerPickerProps,
    selectUntilToday,
  });

  const [isOpen, setIsOpen] = useState(false);

  const mergedDateRangerPickerProps = useMemo<DateRangePickerProps>(
    () => ({
      locale: enUS,
      ...DateRangerPickerProps,
    }),
    [DateRangerPickerProps]
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen} placement={'bottom-end'}>
      <PopoverTrigger
        style={triggerWrapperStyle}
        className={triggerWrapperClassName}
        onClick={() => {
          setIsOpen((v) => !v);
        }}
        asChild
      >
        <div
          className={cn('flex gap-1.5', triggerButtonClassName)}
          style={{
            flexDirection: labelPosition === 'top' ? 'column' : 'row',
            alignItems: labelPosition === 'left' ? 'center' : 'flex-start',
            ...triggerButtonStyle,
          }}
        >
          {label && <span>{label}</span>}
          <div className="flex flex-[1_1_0] flex-row gap-2 items-center justify-between px-[9.5px] py-1.25 pl-2.75 bg-(--afdd-background-low) rounded border border-(--afdd-border-default) text-(--afdd-neutral-text-title-heading) text-base leading-5.5 font-medium cursor-pointer [&>svg]:w-6 [&>svg]:h-6">
            <span>{dateLabel}</span>
            <CalendarMonthIcon />
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent style={contentWrapperStyle} className={contentWrapperClassName}>
        <div
          style={{ display: 'flex', height: '100%', ...contentStyle }}
          className={contentClassName}
        >
          <div className="flex flex-col p-2 bg-(--afdd-background-low) rounded border border-(--afdd-border-default)">
            {type === 'daterange' ? (
              <>
                <div className="flex justify-between p-3 gap-1.5 bg-(--afdd-background-lowest) items-center">
                  <div className="flex gap-2 [&>div]:flex-1">
                    <Dropdown
                      wrapperStyles={{ width: 20 }}
                      value={currentStartDate}
                      options={startDateDropdown.map((item) => ({
                        value: item.value,
                        label: item.label,
                      }))}
                      onChange={(e) => {
                        handleChangeCurrentStartDate(e);
                      }}
                      placeholder="dd"
                    />
                    <Dropdown
                      value={startMonth}
                      wrapperStyles={{ width: 80 }}
                      options={startMonthDropdown.map((item) => ({
                        value: item.value,
                        label: item.label,
                      }))}
                      onChange={(e) => {
                        handleChangeStartMonth(e);
                      }}
                      placeholder="MMMM"
                    />
                    <Dropdown
                      wrapperStyles={{ width: 135 }}
                      value={startYear}
                      options={startYearDropdown.map((item) => ({
                        value: item.value,
                        label: item.label,
                      }))}
                      onChange={(e) => {
                        handleChangeStartYear(e);
                      }}
                      placeholder="YYYY"
                    />
                  </div>
                  <svg
                    className="text-(--afdd-neutral-text-title-heading)"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M2.11325 12L5 14.8868L7.88675 12L5 9.11325L2.11325 12ZM22.3868 12L19.5 9.11325L16.6132 12L19.5 14.8868L22.3868 12ZM5 12.5H19.5V11.5H5V12.5Z"
                      fill="currentColor"
                    />
                  </svg>
                  <div className="flex gap-2 [&>div]:flex-1">
                    <Dropdown
                      wrapperStyles={{ width: 20 }}
                      value={currentEndDate}
                      options={endDateDropdown.map((item) => ({
                        value: item.value,
                        label: item.label,
                      }))}
                      onChange={(e) => {
                        handleChangeCurrentEndDate(e);
                      }}
                      placeholder="dd"
                    />
                    <Dropdown
                      value={endMonth}
                      wrapperStyles={{ width: 80 }}
                      options={endMonthDropdown.map((item) => ({
                        value: item.value,
                        label: item.label,
                      }))}
                      onChange={(e) => {
                        handleChangeEndMonth(e);
                      }}
                      placeholder="MMMM"
                    />
                    <Dropdown
                      wrapperStyles={{ width: 135 }}
                      value={endYear}
                      options={endYearDropdown.map((item) => ({
                        value: item.value,
                        label: item.label,
                      }))}
                      onChange={(e) => {
                        handleChangeEndYear(e);
                      }}
                      placeholder="YYYY"
                    />
                  </div>
                  {selectedPeriod && periodOptions && (
                    <div>
                      <Dropdown
                        value={period}
                        wrapperStyles={{ width: 97 }}
                        options={periodOptions}
                        onChange={handleSelectPeriod}
                      />
                    </div>
                  )}
                </div>
                <DateRangePicker
                  editableDateInputs={true}
                  moveRangeOnFirstSelection={false}
                  minDate={
                    minDate ??
                    (endYearDropdown.length > 0
                      ? new Date(`${endYearDropdown[0].label}-01-01`)
                      : undefined)
                  }
                  maxDate={maxDate ?? new Date()}
                  locale={mergedDateRangerPickerProps.locale}
                  onChange={handleSelect}
                  ranges={[dateRange]}
                  showDateDisplay={false}
                  showMonthAndYearPickers={false}
                  showMonthArrow={false}
                  showPreview={false}
                  direction="vertical"
                  scroll={{
                    enabled: true,
                  }}
                  inputRanges={[]}
                  weekdayDisplayFormat="EEEEE"
                  weekStartsOn={0}
                  staticRanges={mappedStaticRanges}
                  {...mergedDateRangerPickerProps}
                />
              </>
            ) : (
              <>
                <div className="flex justify-between p-3 gap-1.5 bg-(--afdd-background-lowest) items-center">
                  <div style={{ width: '100%' }} className="flex gap-2 [&>div]:flex-1">
                    <Dropdown
                      value={startMonth}
                      options={startMonthDropdown.map((item) => ({
                        value: item.value,
                        label: item.label,
                      }))}
                      onChange={(e) => {
                        handleChangeStartMonth(e);
                      }}
                      placeholder="MMMM"
                    />
                    <Dropdown
                      wrapperStyles={{ width: 100 }}
                      value={startYear}
                      options={startYearDropdown.map((item) => ({
                        value: item.value,
                        label: item.label,
                      }))}
                      onChange={(e) => {
                        handleChangeStartYear(e);
                      }}
                      placeholder="YYYY"
                    />
                  </div>
                </div>
                <DateRange
                  showDateDisplay={false}
                  dragSelectionEnabled={false}
                  showMonthAndYearPickers={false}
                  showMonthArrow={false}
                  showPreview={false}
                  editableDateInputs={true}
                  direction="vertical"
                  scroll={{ enabled: true }}
                  weekdayDisplayFormat="EEEEE"
                  locale={mergedDateRangerPickerProps.locale}
                  onChange={handleSelect}
                  weekStartsOn={0}
                  moveRangeOnFirstSelection={false}
                  ranges={[dateRange]}
                  minDate={minDate ?? addYears(new Date(), -1)}
                  maxDate={maxDate ?? new Date()}
                  {...mergedDateRangerPickerProps}
                />
              </>
            )}
            <div className="flex justify-between">
              <div>
                <Button
                  onClick={onClear}
                  className="text-(--afdd-neutral-text-title-heading)"
                  style={{ backgroundColor: 'transparent' }}
                >
                  {internationalization?.buttons?.clear ?? 'Clear'}
                </Button>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <Button
                  onClick={() => {
                    onCancel?.();
                    setIsOpen(false);
                    setToDefaultDateRange();
                  }}
                  className="text-(--afdd-neutral-text-title-heading)"
                  style={{ backgroundColor: 'transparent' }}
                >
                  {internationalization?.buttons?.cancel ?? 'Cancel'}
                </Button>
                <Button
                  onClick={() => {
                    onSubmit();
                    setIsOpen(false);
                  }}
                  className="text-(--afdd-neutral-text-body-light)"
                >
                  {internationalization?.buttons?.save ?? 'Save'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

DaterangePicker.displayName = 'DaterangePicker';
