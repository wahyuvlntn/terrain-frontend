import { useExtractFilter } from '@digital-twin/components';
import { useQuery } from '@tanstack/react-query';

import {
  getMaintenanceCalendarMonthly,
  getMaintenanceCalendarWeekly,
  MaintenanceCalendarWeeklyType,
} from '../api/maintenance-order-calendar';
import { GeneralFilterType, MaintenanceOrderFilterType } from '../type';

export type MaintenanceCalendarItem = MaintenanceCalendarWeeklyType[0];

export type PositionedEvent = {
  event: MaintenanceCalendarItem;
  left: number;
  width: number;
};

export interface EventWithPosition extends MaintenanceCalendarItem {
  column: number;
  maxColumns: number;
}

export const useCalendarViewMonth = (dateTime: Date) => {
  const { data: filterData, setFilter } = useExtractFilter<
    GeneralFilterType,
    MaintenanceOrderFilterType
  >();

  const selectedYear = dateTime.getFullYear();
  const selectedMonth = dateTime.getMonth();

  const getCalendarMonthly = useQuery({
    queryKey: ['GET-CALENDAR-MONTHLY', selectedYear, selectedMonth, JSON.stringify(filterData)],
    queryFn: async () => {
      const result = await getMaintenanceCalendarMonthly(
        selectedMonth,
        selectedYear,
        JSON.stringify(filterData)
      );
      const daysMapping: Record<string, (typeof result)[0][]> = {};
      result.forEach((data) => {
        const plannedStartDate = new Date(data.planned_start);
        const plannedStartDateStr = plannedStartDate.getDate().toString().padStart(2, '0');

        if (!daysMapping[plannedStartDateStr]) {
          daysMapping[plannedStartDateStr] = [];
        }
        daysMapping[plannedStartDateStr].push(data);
      });

      return daysMapping;
    },
  });

  const getCalendarRowCount = (year: number, month: number, weekStartsOn = 0) => {
    // month: 0 = January, 11 = December
    // weekStartsOn: 0 = Sunday, 1 = Monday

    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Normalize start day based on week start
    const startDay = (firstDayOfMonth.getDay() - weekStartsOn + 7) % 7;

    const totalCells = startDay + daysInMonth;

    return Math.ceil(totalCells / 7);
  };

  const navigateToList = (selectedId: number, selectedName: string) => {
    setFilter((prev) => {
      return {
        ...prev,
        // search: selectedName,
        tab: 'details',
        view: 'list',
        // selected: selectedId.toString(),
        // page: '1',
        // add: 'false',
      };
    });
    setTimeout(() => {
      setFilter((prev) => {
        return {
          ...prev,
          // search: selectedName,
          // tab: 'details',
          // view: 'list',
          selected: selectedId.toString(),
          // page: '1',
          add: 'false',
        };
      });
    }, 100);
  };

  return {
    getCalendarMonthly,
    getCalendarRowCount,
    navigateToList,
  };
};

export const useCalendarViewWeek = (startTime: Date, endTime: Date) => {
  // const [, setSearchParams] = useSearchParams();
  const { data: filterData, setFilter } = useExtractFilter<
    GeneralFilterType,
    MaintenanceOrderFilterType
  >();

  const calculateEventPositions = (
    events: MaintenanceCalendarItem[]
  ): [PositionedEvent[], Record<string, MaintenanceCalendarItem[]>] => {
    function eventsOverlap(
      event1: MaintenanceCalendarItem,
      event2: MaintenanceCalendarItem
    ): boolean {
      const start1 = new Date(event1.planned_start).getTime();
      const end1 = new Date(event1.planned_end).getTime();
      const start2 = new Date(event2.planned_start).getTime();
      const end2 = new Date(event2.planned_end).getTime();

      return start1 < end2 && start2 < end1;
    }

    function findOverlappingGroups(events: MaintenanceCalendarItem[]): MaintenanceCalendarItem[][] {
      if (events.length === 0) return [];

      const sortedEvents = [...events].sort(
        (a, b) => new Date(a.planned_start).getTime() - new Date(b.planned_start).getTime()
      );

      const groups: MaintenanceCalendarItem[][] = [];
      let currentGroup: MaintenanceCalendarItem[] = [sortedEvents[0]];

      for (let i = 1; i < sortedEvents.length; i++) {
        const event = sortedEvents[i];
        const overlapsWithGroup = currentGroup.some((groupEvent) =>
          eventsOverlap(event, groupEvent)
        );

        if (overlapsWithGroup) {
          currentGroup.push(event);
        } else {
          groups.push(currentGroup);
          currentGroup = [event];
        }
      }

      groups.push(currentGroup);
      return groups;
    }

    const assignColumns = (events: MaintenanceCalendarItem[]): EventWithPosition[] => {
      const sortedEvents = [...events].sort(
        (a, b) => new Date(a.planned_start).getTime() - new Date(b.planned_start).getTime()
      );

      const columns: MaintenanceCalendarItem[][] = [];
      const eventPositions: EventWithPosition[] = [];

      for (const event of sortedEvents) {
        let placed = false;

        for (let colIndex = 0; colIndex < columns.length; colIndex++) {
          const column = columns[colIndex];
          const hasOverlap = column.some((colEvent) => eventsOverlap(event, colEvent));

          if (!hasOverlap) {
            column.push(event);
            eventPositions.push({
              ...event,
              column: colIndex,
              maxColumns: 0,
            });
            placed = true;
            break;
          }
        }

        if (!placed) {
          columns.push([event]);
          eventPositions.push({
            ...event,
            column: columns.length - 1,
            maxColumns: 0,
          });
        }
      }

      const maxColumns = columns.length;
      eventPositions.forEach((ep) => {
        ep.maxColumns = maxColumns;
      });

      return eventPositions;
    };

    // Special mapping for shown at popup instead of in week column
    const othersEventMapping: Record<string, MaintenanceCalendarItem[]> = {};

    // Main logic starts here
    if (events.length === 0) return [[], othersEventMapping];

    const groups = findOverlappingGroups(events);
    const allPositionedEvents: PositionedEvent[] = [];

    for (const group of groups) {
      const eventsWithColumns = assignColumns(group);

      for (const eventWithPosition of eventsWithColumns) {
        const width = 100 / eventWithPosition.maxColumns;
        const left = eventWithPosition.column * width;

        //    allPositionedEvents.push({
        //         event: eventWithPosition,
        //         left,
        //         width,
        //     })

        if (eventWithPosition.maxColumns >= 3 && eventWithPosition.column >= 2) {
          const startTime =
            new Date(eventWithPosition.planned_start).getHours() +
            new Date(eventWithPosition.planned_start).getMinutes() / 60;

          const key =
            Math.ceil(startTime) === new Date(eventWithPosition.planned_start).getHours()
              ? Math.ceil(startTime) + 1
              : Math.ceil(startTime);
          if (!othersEventMapping[key]) {
            othersEventMapping[key] = [];
          }
          othersEventMapping[key].push(eventWithPosition);
        } else {
          allPositionedEvents.push({
            event: eventWithPosition,
            left,
            width,
          });
        }
      }
    }

    return [allPositionedEvents, othersEventMapping];
  };

  const daysArr = (startDate: Date, endDate: Date) => {
    const dayMapping = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

    const result: Array<{ date: Date; dayName: string }> = [];
    const currentDate = new Date(startDate);

    while (currentDate.valueOf() <= endDate.valueOf()) {
      result.push({
        date: new Date(currentDate),
        dayName: dayMapping[currentDate.getDay()],
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return result;
  };

  const getCalendarWeekly = useQuery({
    queryKey: [
      'GET-CALENDAR-WEEKLY',
      startTime.toISOString(),
      endTime.toISOString(),
      JSON.stringify(filterData),
    ],
    // switching from the list (a one-day range) renders once before the week range is set
    enabled: endTime.getTime() > startTime.getTime(),
    queryFn: async () => {
      const data = await getMaintenanceCalendarWeekly(
        startTime.toISOString(),
        endTime.toISOString(),
        JSON.stringify(filterData)
      );

      const result = data;

      const dateMapping: Record<string, typeof result> = {};
      result.forEach((data) => {
        const plannedStartDate = new Date(data.planned_start);
        const plannedEndDate = new Date(data.planned_end);
        // Handling case for select range that different year
        if (
          Math.abs(plannedEndDate.getMonth() - plannedStartDate.getMonth()) > 10 ||
          plannedEndDate.getFullYear() - plannedStartDate.getFullYear() !== 0
        ) {
          plannedEndDate.setMonth(plannedStartDate.getMonth());
          plannedEndDate.setFullYear(plannedStartDate.getFullYear());
          data.planned_end = plannedEndDate.toISOString();
        }
        const year = plannedStartDate.getFullYear();
        const month = String(plannedStartDate.getMonth() + 1).padStart(2, '0');
        const date = String(plannedStartDate.getDate()).padStart(2, '0');
        const dateKey = `${year}-${month}-${date}`;

        if (!dateMapping[dateKey]) {
          dateMapping[dateKey] = [];
        }
        dateMapping[dateKey].push(data);
      });

      return dateMapping;
    },
  });

  const navigateToList = (selectedId: number, selectedName: string) => {
    setFilter((prev) => {
      return {
        ...prev,
        // search: selectedName,
        tab: 'details',
        view: 'list',
        // selected: selectedId.toString(),
        // page: '1',
        add: 'false',
      };
    });
    setTimeout(() => {
      setFilter((prev) => {
        return {
          ...prev,
          // search: selectedName,
          // tab: 'details',
          // view: 'list',
          selected: selectedId.toString(),
          // page: '1',
          // add: 'false',
        };
      });
    }, 100);
  };

  return {
    calculateEventPositions,
    daysArr,
    getCalendarWeekly,
    navigateToList,
  };
};
