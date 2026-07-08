import { t, useLanguageSwitcher } from '@digital-twin/utils';
import { DaterangePicker } from '@digital-twin/reusables';
import { enUS, zhCN } from 'date-fns/locale';
import { useMemo } from 'react';
import { DateRangePickerProps } from 'react-date-range';

import styles from './input-duration.module.scss';

type PropsInputDurationType = {
  startDate?: Date;
  endDate?: Date;
  selectedPeriod?: string | 'daily' | 'monthly';
  periodOptions?: {
    value: string;
    label: string;
  }[];
  maxDate?: Date;
  minDate?: Date;
  width?: string | number;
  type?: 'daterange' | 'date';
  label?: string;
  labelPosition?: 'top' | 'left';
  yearOffset?: number;
  DaterangePickerProps?: DateRangePickerProps;
  triggerButtonStyle?: React.CSSProperties;
  onChange: (startDate: Date, endDate: Date, period?: string) => void;
  onCancel?: () => void;
  onClear?: () => void;
  onInitRender?: (startDate: Date, endDate: Date) => void;
  contentWrapperStyle?: React.CSSProperties;
  contentWrapperClassName?: string;
  triggerWrapperStyle?: React.CSSProperties;
  triggerWrapperClassName?: string;
  contentStyle?: React.CSSProperties;
  contentClassName?: string;
  triggerButtonClassName?: string;
  selectUntilToday?: boolean;
};

export const InputDuration = ({
  startDate,
  endDate,
  maxDate,
  minDate,
  selectedPeriod,
  //TODO: remove width props since it's not used
  // width,
  type = 'daterange',
  yearOffset = 5,
  DaterangePickerProps,
  periodOptions,
  triggerButtonStyle,
  label,
  labelPosition,
  onChange,
  //TODO: remove onInitRender props since it's not used
  // onInitRender,
  onCancel,
  onClear,
  contentWrapperStyle,
  contentWrapperClassName,
  triggerButtonClassName,
  contentClassName,
  contentStyle,
  triggerWrapperClassName,
  triggerWrapperStyle,
  selectUntilToday = true,
}: PropsInputDurationType) => {
  const { currentLanguage } = useLanguageSwitcher();

  // NOTE: add more case according to localization
  const locale = useMemo(() => {
    switch (currentLanguage) {
      case 'cn':
        return zhCN;
      default:
        return enUS;
    }
  }, [currentLanguage]);

  // const containerRef = useRef<HTMLDivElement | null>(null);

  // useEffect(() => {
  //   const dateSpan = containerRef.current
  //     ?.querySelector('div')
  //     ?.querySelector('div')
  //     ?.querySelector('span');

  //   if (dateSpan && startDate && endDate) {
  //     dateSpan.innerHTML = `<div>${format(startDate, 'dd MMM yyyy')}</div>${
  //       type === 'daterange'
  //         ? `<div style="width: 12px; height: 2px; background-color: white;"></div><div>${format(
  //             endDate,
  //             'dd MMM yyyy'
  //           )}</div>`
  //         : ``
  //     }  `;
  //   }
  // }, [startDate, endDate, type]);

  return (
    <div className={styles['input-duration-container']}>
      <DaterangePicker
        type={type}
        startDate={startDate}
        contentWrapperClassName={contentWrapperClassName}
        contentWrapperStyle={{ ...contentWrapperStyle, zIndex: 0 }}
        triggerWrapperClassName={triggerWrapperClassName}
        triggerWrapperStyle={triggerWrapperStyle}
        triggerButtonClassName={triggerButtonClassName}
        contentClassName={contentClassName}
        contentStyle={contentStyle}
        endDate={endDate}
        onChange={onChange}
        onCancel={onCancel}
        onClear={onClear}
        selectUntilToday={selectUntilToday}
        yearOffset={yearOffset}
        maxDate={maxDate ?? new Date()}
        label={label}
        labelPosition={labelPosition}
        minDate={minDate}
        DateRangerPickerProps={{
          dateDisplayFormat: 'dd MMM yyyy',
          locale,
        }}
        triggerButtonStyle={{
          width: 250,
          height: 36,
          borderRadius: 8,
          ...triggerButtonStyle,
        }}
        selectedPeriod={selectedPeriod}
        periodOptions={
          periodOptions ?? [
            { value: 'daily', label: t('common.daily') },
            { value: 'monthly', label: t('common.monthly') },
          ]
        }
        internationalization={{
          buttons: {
            clear: t('common.clear'),
            cancel: t('common.cancel'),
            save: t('common.save'),
          },
          staticRanges: {
            custom: t('common.custom'),
            today: t('common.today'),
            yesterday: t('common.yesterday'),
            thisWeek: t('common.this_week'),
            lastWeek: t('common.last_week'),
            thisMonth: t('common.this_month'),
            lastMonth: t('common.last_month'),
          },
        }}
      />
    </div>
  );
};
