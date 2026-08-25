/* eslint-disable react-hooks/exhaustive-deps */
import {
  AuthCtx,
  Button,
  COLOR,
  InfoTooltip,
  PermissionAliasEnum,
  PermissionGroupAliasEnum,
  Popup,
} from '@digital-twin/components';
import { Add, Assigment, Calendar } from '@digital-twin/icons';
import { Container, toast } from '@digital-twin/reusables';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useContext, useEffect, useRef, useState } from 'react';

import {
  SubmitAction,
  SubmitMaintenanceOrderRequest,
  submitMaintenanceOrder,
} from '../api/maintenance-order';
import { useGetMaintenanceOrderFilter } from '../maintenance-order';
import { parseTimestamp } from '../utils/helper';
import styles from './calendar-view.module.scss';
import { CalendarViewMonth } from './calendar-view-month';
import { CalendarViewWeek } from './calendar-view-week';
import { MaintenanceDetail } from './list-view';
import { FormType } from './request-form';

export const CalendarView = ({
  selectedStartDate,
  selectedEndDate,
  selectedDatetime,
  filterView,
  setFilterView,
}: {
  selectedStartDate: Date;
  selectedEndDate: Date;
  selectedDatetime: Date;
  filterView: 'week' | 'month';
  setFilterView: React.Dispatch<React.SetStateAction<'week' | 'month'>>;
}) => {
  const { setFilter, ...filter } = useGetMaintenanceOrderFilter();
  const { hasPermission } = useContext(AuthCtx);

  const queryClient = useQueryClient();

  const [openNewPopup, setOpenNewPopup] = useState(false);
  const dataRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (dataRef.current) {
      // Scroll vertically to center
      dataRef.current.scrollTop =
        dataRef.current.scrollHeight / 2 - dataRef.current.clientHeight / 2;
      // Scroll horizontally to center (if needed)
      // dataRef.current.scrollLeft = dataRef.current.scrollWidth / 2 - dataRef.current.clientWidth / 2;
    }
  }, []);

  const hasCreatePermission = hasPermission(
    PermissionGroupAliasEnum.enum.maintenanceorder,
    PermissionAliasEnum.enum.create
  );

  // const [searchParams] = useSearchParams();

  // const view = searchParams.get('view');

  // useEffect(() => {
  //   setFilter((prev) => ({
  //     ...prev,
  //     view: view as 'calendar' | 'list',
  //   }));
  // }, [view]);

  // useEffect(() => {
  //   setFilter((prev) => ({
  //     ...prev,
  //     view: 'calendar'
  //   }))
  // }, [filter])

  const submitMutation = useMutation({
    mutationFn: (data: SubmitMaintenanceOrderRequest) => submitMaintenanceOrder(data),
    onSuccess: (data) => {
      toast.success(data.message);
      if (filterView === 'week') {
        // getCalendarWeekly.refetch();
        queryClient.refetchQueries({
          queryKey: ['GET-CALENDAR-WEEKLY'],
        });
      } else {
        queryClient.refetchQueries({
          queryKey: ['GET-CALENDAR-MONTHLY'],
        });
      }
      setOpenNewPopup(false);
    },
  });

  const { username } = useContext(AuthCtx);

  return (
    <Container
      title="Maintenance Order Calendar"
      icon={<Calendar />}
      className={styles['maintenance-calendar-container']}
      titleProps={{
        style: { fontWeight: 600, fontSize: 22 },
      }}
      contentWrapperProps={{
        style: { overflow: 'auto' },
      }}
      rightTopComponent={
        <div className={styles['right-top-component']}>
          <InfoTooltip
            title={'Maintenance Order Calendar'}
            content={<span>{'List of maintenance activities in weekly or monthly view'}</span>}
          />
          <div className={styles['action']}>
            <div className={styles['view-options']}>
              <div
                className={styles['option']}
                style={{
                  backgroundColor:
                    filterView === 'week'
                      ? COLOR.brandSurfaceDefaultPrimary
                      : COLOR.backgroundLowest,
                  opacity: filterView === 'week' ? 1 : 0.6,
                  borderTopLeftRadius: 8,
                  borderBottomLeftRadius: 8,
                }}
                onClick={() => setFilterView('week')}
              >
                <div>Weekly</div>
              </div>
              <div
                className={styles['option']}
                style={{
                  backgroundColor:
                    filterView === 'month'
                      ? COLOR.brandSurfaceDefaultPrimary
                      : COLOR.backgroundLowest,
                  opacity: filterView === 'month' ? 1 : 0.6,
                  borderTopRightRadius: 8,
                  borderBottomRightRadius: 8,
                }}
                onClick={() => setFilterView('month')}
              >
                <div>Monthly</div>
              </div>
            </div>
            <Button
              icon={<Add />}
              onClick={() => {
                setOpenNewPopup(true);
                setFilter((prev) => ({
                  ...prev,
                  add: 'true',
                }));
              }}
            >
              <span>Create New</span>
            </Button>
          </div>
        </div>
      }
    >
      {hasCreatePermission ? (
        <Popup
          open={openNewPopup}
          onClose={() => setOpenNewPopup(false)}
          title={'Create Request'}
          background="none"
          wrapperStyle={{
            zIndex: '10',
          }}
          informationIcon={
            <InfoTooltip
              title={'Order Details'}
              content={
                'Create a new maintenance request for preventive tasks or corrective issues. Fields marked with * are mandatory'
              }
            />
          }
          icon={<Assigment width={24} height={24} />}
        >
          <MaintenanceDetail
            maintenanceId={Number(filter.selected)}
            isAdding={filter.add === 'true'}
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
            onCancelClicked={() => setOpenNewPopup(false)}
            onSubmitClicked={(data: FormType) => {
              // planned start
              const plannedStart = parseTimestamp(data.plannedStartDate, data.plannedStartTime);
              // repeat end
              const repeatEnd = parseTimestamp(data.repeatEndDate, data.repeatEndTime);
              const submitData = {
                approved_by: null,
                asset_id: Number(data.equipment),
                description: data.description || null,
                edited_by: null,
                id: null,
                instructions: null,
                is_recurring: null,
                maintenance_type_id: Number(data.maintenanceType),
                planned_end: null,
                planned_start: plannedStart,
                priority_id: null,
                reject_reason: null,
                repeat_end: repeatEnd,
                repeat_type_id: data.repeatBy ? Number(data.repeatBy) : null,
                severity_id: Number(data.severity),
                status_id: 1,
                technicians: null,
                submit_type: 'CREATED' as SubmitAction,
                requested_by: username || null,
                other_alarm_codes: null,
              };
              submitMutation.mutate(submitData);
            }}
            isPopup={true}
          />
        </Popup>
      ) : null}
      {filterView === 'week' ? (
        <CalendarViewWeek selectedStartDate={selectedStartDate} selectedEndDate={selectedEndDate} />
      ) : (
        <CalendarViewMonth dateTime={selectedDatetime} />
      )}
    </Container>
  );
};
