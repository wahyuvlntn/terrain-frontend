import {
  AuthCtx,
  COLOR,
  InfoTooltip,
  PermissionAliasEnum,
  PermissionGroupAliasEnum,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Popup,
} from '@digital-twin/components';
import { Corrective, Preventive } from '@digital-twin/icons';
import clsx from 'clsx';
import { useContext, useState } from 'react';

import { useGetMaintenanceOrderFilter } from '../maintenance-order';
import { useCalendarViewMonth } from './calendar-view.hook';
import styles from './calendar-view.module.scss';
import { MaintenanceDetail } from './list-view';
import { MaintenanceOrderCard, RenderMaintenanceStatus } from './maintenance-order-card';

type CalendarViewMonthProps = {
  dateTime: Date;
};

export const CalendarViewMonth = (props: CalendarViewMonthProps) => {
  const { dateTime } = props;
  const [openViewPopup, setOpenViewPopup] = useState(false);
  const [openPopoverIds, setOpenPopoverIds] = useState<Set<string>>(new Set());

  const { setFilter, ...filter } = useGetMaintenanceOrderFilter();

  const { hasPermission } = useContext(AuthCtx);
  const hasReadPersmission = hasPermission(
    PermissionGroupAliasEnum.enum.maintenanceorder,
    PermissionAliasEnum.enum.read
  );

  const { getCalendarMonthly, getCalendarRowCount } = useCalendarViewMonth(dateTime);

  // just for dummy data, the actual data `dateTime` will show the first day
  const firstDate = new Date(dateTime.getFullYear(), dateTime.getMonth(), 1).getDate();
  const lastDate = new Date(dateTime.getFullYear(), dateTime.getMonth() + 1, 0).getDate();
  const today = new Date();
  const [selectedDayGrid, setSelectedDayGrid] = useState('');

  return (
    <div className={styles['calendar-content-month']}>
      <div className={styles['calendar-header-month']}>
        <div className={styles['header-item']} style={{ borderTopLeftRadius: '4px' }}>
          SUN
        </div>
        <div className={styles['header-item']}>MON</div>
        <div className={styles['header-item']}>TUE</div>
        <div className={styles['header-item']}>WED</div>
        <div className={styles['header-item']}>THU</div>
        <div className={styles['header-item']}>FRI</div>
        <div
          className={styles['header-item']}
          style={{
            borderTopRightRadius: '4px',
            borderRight: 'none',
            paddingRight: '12px',
          }}
        >
          SAT
        </div>
      </div>
      <div className={styles['calendar-body-month']}>
        {Array.from(
          {
            length: getCalendarRowCount(dateTime.getFullYear(), dateTime.getMonth()) * 7,
          },
          (_, i) => {
            const firstDateOffset = new Date(
              dateTime.getFullYear(),
              dateTime.getMonth(),
              1
            ).getDay();
            const dayNumber = i - firstDateOffset + 1;
            const actualDate = new Date(
              dateTime.getFullYear(),
              dateTime.getMonth(),
              -firstDateOffset + i + 1
            );
            const [dayPrefix, monthPrefix, date, year] = actualDate.toDateString().split(' ');

            if (dayNumber < firstDate || dayNumber > lastDate) {
              return (
                <div
                  key={'days-grid-' + i}
                  className={clsx(styles['grid-month'], styles['grid-month-empty'])}
                >
                  <div className={styles['grid-month-header']}>
                    <span>{actualDate.getDate().toString().padStart(2, '0')}</span>
                  </div>
                </div>
              );
            }

            const isToday =
              -firstDateOffset + i + 1 === today.getDate() &&
              dateTime.getMonth() === today.getMonth() &&
              dateTime.getFullYear() === today.getFullYear();
            const dateStr = (-firstDateOffset + i + 1).toString().padStart(2, '0');

            const isMoreThan3 =
              (!getCalendarMonthly.data || !getCalendarMonthly.data[dateStr]
                ? 0
                : getCalendarMonthly.data[dateStr].length) > 3;

            const orderList =
              !getCalendarMonthly.data || !getCalendarMonthly.data[dateStr] || !hasReadPersmission
                ? []
                : getCalendarMonthly.data[dateStr];
            const orderOrderedList = orderList.sort(
              (a, b) => new Date(a.planned_start).getTime() - new Date(b.planned_start).getTime()
            );
            const isAlreadyPast =
              new Date(
                dateTime.getFullYear(),
                dateTime.getMonth(),
                -firstDateOffset + i + 1
              ).valueOf() < today.valueOf() &&
              new Date(
                dateTime.getFullYear(),
                dateTime.getMonth(),
                -firstDateOffset + i + 1
              ).toLocaleDateString() !== today.toLocaleDateString();

            return (
              <div
                key={'days-grid-' + i}
                className={clsx(
                  styles['grid-month'],
                  selectedDayGrid === dateStr ? styles['grid-month-selected'] : ''
                )}
                style={{
                  filter: isAlreadyPast ? 'brightness(0.7)' : 'none',
                }}
                onClick={() => {
                  setSelectedDayGrid(dateStr);
                }}
              >
                <div className={styles['grid-month-header']}>
                  <span className={isToday ? styles['is-today'] : ''}>{dateStr}</span>
                </div>
                <div className={styles['grid-month-content']}>
                  {orderOrderedList.slice(0, 3).map((schedule, i) => {
                    const hour = new Date(schedule.planned_start)
                      .getHours()
                      .toString()
                      .padStart(2, '0');
                    const minute = new Date(schedule.planned_start)
                      .getMinutes()
                      .toString()
                      .padStart(2, '0');
                    return (
                      <MaintenanceOrderCard
                        wrapperClassName={styles['card-monthly']}
                        contentClassName={styles['card-monthly-content']}
                        simple={true}
                        key={'maintenance-calendar-' + i}
                        time={hour + ':' + minute}
                        selected={false}
                        handleDoubleClick={function (): void {
                          // navigateToList(schedule.id, schedule.name);
                          setFilter((prev) => {
                            return {
                              ...prev,
                              selected: schedule.id.toString(),
                              selectedName: schedule.name,
                              tab: 'details',
                              selectedStatus: schedule.status,
                              selectedIsCorrective: schedule.is_corrective ? 'true' : 'false',
                            };
                          });
                          // openView(schedule.id);
                          setOpenViewPopup(true);
                        }}
                        {...schedule}
                      />
                    );
                  })}
                  {isMoreThan3 ? (
                    <Popover
                      offset={0}
                      placement="right"
                      open={openPopoverIds.has(`popover-content-month-${dateStr}`)}
                      onOpenChange={(open) => {
                        const popoverId = `popover-content-month-${dateStr}`;
                        const newSet = new Set(openPopoverIds);
                        if (!open) {
                          newSet.delete(popoverId);
                        }
                        setOpenPopoverIds(newSet);
                      }}
                    >
                      <PopoverTrigger
                        style={{ width: '100%' }}
                        onClick={() => {
                          const popoverId = `popover-content-month-${dateStr}`;
                          const newSet = new Set(openPopoverIds);
                          newSet.add(popoverId);
                          setOpenPopoverIds(newSet);
                        }}
                      >
                        <div className={styles['more-button']}>
                          <span>
                            +
                            {getCalendarMonthly.data
                              ? getCalendarMonthly.data[dateStr].length - 3
                              : 0}
                          </span>
                        </div>
                      </PopoverTrigger>
                      <PopoverContent
                        className={styles['popover-content-month']}
                        id={`popover-content-month-${dateStr}`}
                      >
                        <div
                          style={{
                            background: COLOR.backgroundDefault,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px',
                            overflow: 'auto',
                          }}
                        >
                          <span>
                            {dayPrefix +
                              ', ' +
                              date.toString().padStart(2, '0') +
                              ' ' +
                              monthPrefix +
                              ' ' +
                              year}
                          </span>
                          <div className={styles['grid-month-content']}>
                            {orderOrderedList.map((schedule, i) => {
                              const hour = new Date(schedule.planned_start)
                                .getHours()
                                .toString()
                                .padStart(2, '0');
                              const minute = new Date(schedule.planned_start)
                                .getMinutes()
                                .toString()
                                .padStart(2, '0');
                              return (
                                <MaintenanceOrderCard
                                  wrapperClassName={styles['card-monthly']}
                                  contentClassName={styles['card-monthly-content']}
                                  simple={true}
                                  key={'maintenance-calendar-' + i}
                                  time={hour + ':' + minute}
                                  selected={false}
                                  handleDoubleClick={function (): void {
                                    // navigateToList(schedule.id, schedule.name);
                                    setFilter((prev) => {
                                      return {
                                        ...prev,
                                        selected: schedule.id.toString(),
                                        selectedName: schedule.name,
                                        tab: 'details',
                                        selectedStatus: schedule.status,
                                        selectedIsCorrective: schedule.is_corrective
                                          ? 'true'
                                          : 'false',
                                      };
                                    });
                                    // openView(schedule.id);
                                    setOpenViewPopup(true);

                                    // Closing Popover
                                    const popoverId = `popover-content-month-${dateStr}`;
                                    const newSet = new Set(openPopoverIds);
                                    newSet.delete(popoverId);
                                    setOpenPopoverIds(newSet);
                                  }}
                                  {...schedule}
                                />
                              );
                            })}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  ) : null}
                </div>
              </div>
            );
          }
        )}
      </div>

      {hasReadPersmission && (
        <Popup
          open={openViewPopup}
          onClose={() => {
            setOpenViewPopup(false);
            setFilter((prev) => {
              return {
                ...prev,
                selected: null,
                selectedName: null,
                tab: null,
                add: null,
                selectedStatus: null,
                selectedIsCorrective: null,
              };
            });
          }}
          title={filter.selectedName ?? ''}
          background="none"
          informationIcon={
            <InfoTooltip
              title={'Order Details'}
              content={
                'Create a new maintenance request for preventive tasks or corrective issues. Fields marked with * are mandatory'
              }
            />
          }
          icon={
            filter.selectedIsCorrective === 'true' ? (
              <Corrective width={29} height={29} />
            ) : (
              <Preventive width={29} height={29} />
            )
          }
          rightTopComponent={<RenderMaintenanceStatus status={filter.selectedStatus || ''} />}
        >
          <MaintenanceDetail
            maintenanceId={Number(filter.selected)}
            isAdding={false}
            selectedTab={filter.tab as 'details' | 'work-report' | 'progress'}
            wrapperStyle={{
              width: '60vw',
              height: '70vh',
              padding: '0px',
              backgroundColor: COLOR.backgroundLowest,
            }}
            handleSelectTab={(e) => {
              setFilter((prev) => ({
                ...prev,
                tab: e as 'details' | 'work-report' | 'progress',
              }));
            }}
            onCancelClicked={() => {
              setOpenViewPopup(false);
              getCalendarMonthly.refetch();
            }}
            isPopup={true}
          />
        </Popup>
      )}
    </div>
  );
};
