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
import { useContext, useEffect, useRef, useState } from 'react';

import { useGetMaintenanceOrderFilter } from '../maintenance-order';
import { MaintenanceCalendarItem, useCalendarViewWeek } from './calendar-view.hook';
import styles from './calendar-view.module.scss';
import { MaintenanceDetail } from './list-view';
import { MaintenanceOrderCard, RenderMaintenanceStatus } from './maintenance-order-card';

type CalendarViewWeekProps = {
  selectedStartDate: Date;
  selectedEndDate: Date;
};

export const CalendarViewWeek = (props: CalendarViewWeekProps) => {
  const { selectedStartDate, selectedEndDate } = props;

  const { calculateEventPositions, daysArr, getCalendarWeekly } = useCalendarViewWeek(
    selectedStartDate,
    selectedEndDate
  );
  const { hasPermission } = useContext(AuthCtx);
  const hasReadPersmission = hasPermission(
    PermissionGroupAliasEnum.enum.maintenanceorder,
    PermissionAliasEnum.enum.read
  );

  const { setFilter, ...filter } = useGetMaintenanceOrderFilter();
  const [openPopoverIds, setOpenPopoverIds] = useState<Set<string>>(new Set());

  const [openViewPopup, setOpenViewPopup] = useState(false);

  const dayMapping = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const dataRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const firstColRef = useRef<HTMLDivElement>(null);
  const [selectedItemId, setSelectedItemId] = useState('');

  const onDataScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    const scrollTop = e.currentTarget.scrollTop;
    if (headerRef.current) {
      headerRef.current.scrollLeft = scrollLeft;
    }
    if (firstColRef.current) {
      firstColRef.current.scrollTop = scrollTop;
    }
  };

  useEffect(() => {
    if (dataRef.current) {
      // Scroll vertically to center
      // dataRef.current.scrollTop =
      //     dataRef.current.scrollHeight / 2 - dataRef.current.clientHeight / 2

      dataRef.current.scrollTop = (new Date().getHours() + new Date().getMinutes() / 60) * 111 - 70;

      // Scroll horizontally to center (if needed)
      // dataRef.current.scrollLeft = dataRef.current.scrollWidth / 2 - dataRef.current.clientWidth / 2;
    }
  }, []);

  const timeZoneOffset = new Date().getTimezoneOffset();
  const today = new Date();

  // TODO: currently disabled
  const hasTodayInRange =
    today >= selectedStartDate &&
    today <= selectedEndDate &&
    today.valueOf() !== selectedEndDate.valueOf();

  return (
    <div className={styles['calendar-content']}>
      <div className={styles['calendar-header']}>
        <div className={clsx(styles['time'], styles['time-zone'])}>
          <span>
            GMT {-timeZoneOffset > 0 ? '+' : ''}
            {-(timeZoneOffset / 60)}
          </span>
        </div>
        {/* Column headers from column 2 onward (non-scrollable) */}
        <div className={styles['cell-header-container']} ref={headerRef}>
          <div className={styles['cell-header-list']}>
            {daysArr(selectedStartDate, selectedEndDate).map((day, i, arr) => {
              const isAlreadyPast =
                day.date.valueOf() < today.valueOf() &&
                day.date.toLocaleDateString() !== today.toLocaleDateString();
              const dateKey = `${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, '0')}-${String(day.date.getDate()).padStart(2, '0')}`;
              const totalData = (
                getCalendarWeekly.data?.[dateKey] ?? ([] as MaintenanceCalendarItem[])
              ).length;
              return (
                <div
                  key={'dayArr-' + i}
                  className={clsx(
                    styles['cell-header'],
                    i === arr.length - 1 ? styles['cell-top-right'] : ''
                  )}
                >
                  {isAlreadyPast ? <div className={styles['overlay-past']}></div> : null}
                  <span style={{ padding: '0 16px' }}>{dayMapping[day.date.getDay()]}</span>
                  <div style={{ padding: '0 16px', boxSizing: 'border-box' }}>
                    <h3>{day.date.getDate()}</h3>
                    <span>Total: {totalData}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className={styles['calendar-grid']}>
        {/* Row headers (non-scrollable) */}
        <div className={styles['calendar-grid-time']} ref={firstColRef}>
          {Array.from({ length: 24 }, (_, i) => (
            <div
              key={i}
              className={i === 23 ? clsx(styles['time'], styles['time-last']) : styles['time']}
            >
              {String(i).padStart(2, '0')}:00
            </div>
          ))}
        </div>
        <div ref={dataRef} onScroll={onDataScroll} className={styles['calendar-grid-content']}>
          <div className={styles['grid-col-container']}>
            {daysArr(selectedStartDate, selectedEndDate).map((day, i1) => {
              const isAlreadyPast =
                day.date.valueOf() < today.valueOf() &&
                day.date.toLocaleDateString() !== today.toLocaleDateString();
              // TODO: currently disabled
              const isNotToday =
                day.date.valueOf() > today.valueOf() &&
                day.date.toLocaleDateString() !== today.toLocaleDateString();
              const dateKey = `${day.date.getFullYear()}-${String(day.date.getMonth() + 1).padStart(2, '0')}-${String(day.date.getDate()).padStart(2, '0')}`;
              const [positioned, othersEvent] = !hasReadPersmission
                ? []
                : calculateEventPositions(
                    getCalendarWeekly.data?.[dateKey] ?? ([] as MaintenanceCalendarItem[])
                  );

              const [dayPrefix, monthPrefix, date, year] = day.date.toDateString().split(' ');

              return (
                <div key={'daysArrCell-' + i1} className={styles['grid-col-wrapper']}>
                  <div
                    className={styles['time-line-horizontal']}
                    style={{
                      top: `${(new Date().getHours() + new Date().getMinutes() / 60) * 111}px`,
                      // TODO: currently disabled
                      display:
                        (isNotToday && !isAlreadyPast) || !hasTodayInRange ? 'none' : undefined,
                      // display: 'none',
                      // borderStyle: isAlreadyPast ? 'dashed' : undefined
                      borderBottom: isAlreadyPast
                        ? `2px dashed ${COLOR.brandBorderLightPrimary}`
                        : `3px solid ${COLOR.brandBorderLightPrimary}`,
                    }}
                  ></div>
                  {isAlreadyPast ? <div className={styles['overlay-past']}></div> : null}

                  {(positioned ?? []).map((eventData, idx) => {
                    const { left, width, event } = eventData;
                    const {
                      planned_start,
                      planned_end,
                      id,
                      name,
                      planned_start_sc,
                      planned_end_sc,
                      status,
                      is_corrective,
                    } = event;

                    const heightPerHour = 111; //
                    const eventStart = new Date(planned_start);
                    const eventEnd = new Date(planned_end);
                    const eventStartSC = new Date(planned_start_sc);
                    const eventEndSC = new Date(planned_end_sc);
                    const topPosition =
                      (eventStart.getHours() + eventStart.getMinutes() / 60) * heightPerHour;
                    const eventHeight =
                      ((eventEnd.getTime() - eventStart.getTime()) / (1000 * 60 * 60)) *
                      heightPerHour;
                    const leftPosition = (left * 2) / 10;

                    const widthCss =
                      !othersEvent || Object.keys(othersEvent).length === 0
                        ? `calc(${(width * 2) / 10}vw - 10px)`
                        : `calc(${10 * (Math.floor(width / 100) + 1)}vw - 25px)`;
                    const heightCss = `calc(${eventHeight}px - 5px)`;
                    const topCss = `${topPosition}px`;
                    const leftCss =
                      !othersEvent || Object.keys(othersEvent).length === 0
                        ? `calc(${leftPosition}vw + 5px)`
                        : `calc(${Math.ceil(left / 100) * 9}vw + 5px)`;

                    const [, monthPrefix, date, year] = eventStartSC.toDateString().split(' ');
                    const startHour = eventStartSC.getHours().toString().padStart(2, '0');
                    const startMinute = eventStartSC.getMinutes().toString().padStart(2, '0');

                    const [, monthPrefixEnd, dateEnd, yearEnd] = eventEndSC
                      .toDateString()
                      .split(' ');
                    const startHourEnd = eventEndSC.getHours().toString().padStart(2, '0');
                    const startMinuteEnd = eventEndSC.getMinutes().toString().padStart(2, '0');
                    const dateStr = day.date.getDate().toString().padStart(2, '0');

                    return (
                      <Popover
                        placement="right"
                        offset={10}
                        key={'weekly-popover-' + idx}
                        onOpenChangeCallback={(open) => {
                          if (!open) setSelectedItemId('');
                        }}
                        open={openPopoverIds.has(`popover-content-detail-${dateStr}-${idx}`)}
                        onOpenChange={(open) => {
                          const popoverId = `popover-content-detail-${dateStr}-${idx}`;
                          const newSet = new Set(openPopoverIds);
                          if (!open) {
                            newSet.delete(popoverId);
                          }
                          setOpenPopoverIds(newSet);
                        }}
                      >
                        <PopoverTrigger
                          className={styles['event-card-week']}
                          style={{
                            width: widthCss,
                            height: heightCss,
                            top: topCss,
                            left: leftCss,
                          }}
                          onClick={() => {
                            const popoverId = `popover-content-detail-${dateStr}-${idx}`;
                            const newSet = new Set(openPopoverIds);
                            newSet.add(popoverId);
                            setOpenPopoverIds(newSet);
                          }}
                        >
                          <MaintenanceOrderCard
                            key={'event-cadr-idx-' + idx}
                            // wrapperClassName={styles['event-card-week']}
                            maxWidthTitle="80px"
                            shrinkMode={width < 100}
                            contentClassName={styles['event-card-week-content']}
                            {...event}
                            planned_end={undefined}
                            selected={selectedItemId === id.toString() + '-' + idx + '-' + i1}
                            wrapperStyle={{
                              width: widthCss,
                              height: heightCss,
                              filter: isAlreadyPast ? 'brightness(0.7)' : 'none',
                            }}
                            handleClick={function (): void {
                              setSelectedItemId(id.toString() + '-' + idx + '-' + i1);
                            }}
                            // handleDoubleClick={() => navigateToList(id, name)}
                            handleDoubleClick={function (): void {
                              // navigateToList(schedule.id, schedule.name);
                              setFilter((prev) => {
                                return {
                                  ...prev,
                                  selected: id.toString(),
                                  selectedName: name,
                                  tab: 'details',
                                  selectedStatus: status,
                                  selectedIsCorrective: is_corrective ? 'true' : 'false',
                                };
                              });

                              setOpenViewPopup(true);

                              // Close any open popovers
                              setOpenPopoverIds(new Set());
                            }}
                          />
                        </PopoverTrigger>
                        <PopoverContent
                          style={{
                            minWidth: 'none',
                            background: COLOR.backgroundDefault,
                          }}
                        >
                          <div className={styles['week-popover-content']}>
                            <div>
                              <span>Status: </span>
                              <strong>Open</strong>
                            </div>
                            <div>
                              <span>Type: </span>
                              <strong>{event.is_corrective ? 'Corrective' : 'Preventive'}</strong>
                            </div>
                            <div>
                              <span>Severity: </span>
                              <strong>{event.severity || '-'}</strong>
                            </div>
                            <div>
                              <span>Priority: </span>
                              <strong>{event.priority || '-'}</strong>
                            </div>
                            <div>
                              <span>Order ID: </span>
                              <strong>{event.name || '-'}</strong>
                            </div>
                            <div>
                              <span>Equipment ID: </span>
                              <strong>{event.equipment_id || '-'}</strong>
                            </div>
                            <div>
                              <span>Planned Start: </span>
                              <strong>
                                {date +
                                  ' ' +
                                  monthPrefix +
                                  ' ' +
                                  year +
                                  ', ' +
                                  startHour +
                                  ':' +
                                  startMinute || '-'}
                              </strong>
                            </div>
                            <div>
                              <span>Planned End: </span>
                              <strong>
                                {dateEnd +
                                  ' ' +
                                  monthPrefixEnd +
                                  ' ' +
                                  yearEnd +
                                  ', ' +
                                  startHourEnd +
                                  ':' +
                                  startMinuteEnd || '-'}
                              </strong>
                            </div>
                            <div>
                              <span>Requested By: </span>
                              <strong>{event.requested_by || '-'}</strong>
                            </div>
                            <div>
                              <span>Assignee: </span>
                              <strong>{event.assignee || '-'}</strong>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    );
                  })}
                  {Object.keys(othersEvent ?? {}).map((key, index) => {
                    const eventList = othersEvent?.[key] || [];
                    const widthCss = `30px`;
                    const heightCss = `106px`;
                    const topCss = `${(Number(key) - 1) * 111}px`;
                    const rightCss = `5px`;

                    const dateStr = day.date.getDate().toString().padStart(2, '0');

                    return (
                      <Popover
                        offset={10}
                        placement="right"
                        key={'week-popover-' + index}
                        open={openPopoverIds.has(`popover-content-week-${dateStr}-${index}`)}
                        onOpenChange={(open) => {
                          const popoverId = `popover-content-week-${dateStr}-${index}`;
                          const newSet = new Set(openPopoverIds);
                          if (!open) {
                            newSet.delete(popoverId);
                          }
                          setOpenPopoverIds(newSet);
                        }}
                      >
                        <PopoverTrigger
                          className={styles['event-card-week']}
                          style={{
                            width: widthCss,
                            height: heightCss,
                            top: topCss,
                            right: rightCss,
                          }}
                          onClick={() => {
                            const popoverId = `popover-content-week-${dateStr}-${index}`;
                            const newSet = new Set(openPopoverIds);
                            newSet.add(popoverId);
                            setOpenPopoverIds(newSet);
                          }}
                        >
                          <div className={styles['other-card']}>
                            <span>+{eventList.length}</span>
                          </div>
                        </PopoverTrigger>
                        <PopoverContent
                          className={styles['popover-content-week']}
                          id={`popover-content-week-${dateStr}-${index}`}
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
                            <div className={styles['grid-week-content']}>
                              {eventList.map((schedule, i) => {
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
                                    wrapperClassName={styles['card-weekly']}
                                    contentClassName={styles['card-weekly-content']}
                                    key={'maintenance-calendar-' + i}
                                    time={hour + ':' + minute}
                                    selected={false}
                                    // handleClick={function (): void {
                                    //     navigateToList(schedule.id, schedule.name);

                                    // }}

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

                                      setOpenViewPopup(true);

                                      // Close any open popovers
                                      setOpenPopoverIds(new Set());
                                      // Closing Popover
                                      const popoverId = `popover-content-week-${dateStr}-${index}`;
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
                    );
                  })}
                  <div className={styles['grid-col']}>
                    {Array.from({ length: 24 }, (_, i2) => (
                      <div key={i2} className={styles['cell']}></div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
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
          wrapperStyle={{
            zIndex: 5,
          }}
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
              getCalendarWeekly.refetch();
            }}
            isPopup={true}
          />
        </Popup>
      )}
    </div>
  );
};
