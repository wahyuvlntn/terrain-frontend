/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable simple-import-sort/imports */
import {
  AuthCtx,
  COLOR,
  Container,
  InfoTooltip,
  Loading,
  useExtractFilter,
} from '@digital-twin/components';
import { Assigment, Corrective, ListAlt, Preventive } from '@digital-twin/icons';
import {
  TabProduct as Tab,
  TabListProduct as TabList,
  TabPanelProduct as TabPanel,
  TabProvider,
  toast,
} from '@digital-twin/reusables';
import { UseQueryResult, useMutation, useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { CSSProperties, useContext, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getMaintenanceNameAndType,
  getMaintenanceOrderDetail,
  getMaintenanceOrderList,
  getMaintenanceOrderStatus,
  MaintenanceOrderListType,
  SubmitAction,
  SubmitMaintenanceOrderRequest,
  submitMaintenanceOrder,
} from '../api/maintenance-order';
import { GeneralFilterType, MaintenanceOrderFilterType } from '../type';
import { parseTimestamp } from '../utils/helper';
import { Details } from './details';
import styles from './list-view.module.scss';
import { RenderMaintenanceStatus } from './maintenance-order-card';
import { MaintenanceOrderList } from './maintenance-order-list';
import { Progress } from './progress';
import RequestForm, { FormType, MaintenanceOrderData } from './request-form';
import { WorkReport } from './work-report';

export const ListView = () => {
  const { filter, setFilter, data } = useExtractFilter<
    GeneralFilterType,
    MaintenanceOrderFilterType
  >();
  const startTime = useMemo(() => {
    const time = filter.start ? new Date(filter.start) : new Date();
    time.setHours(0, 0, 0);
    return time.toISOString();
  }, [filter.start]);

  const endTime = useMemo(() => {
    const time = filter.end ? new Date(filter.end) : new Date();
    time.setDate(time.getDate() + 1);
    time.setHours(0, 0, 0);
    return time.toISOString();
  }, [filter.end]);

  const { username } = useContext(AuthCtx);

  console.log(filter.add);

  const maintenanceOrderList = useQuery({
    queryKey: [
      'get-maintenance-order-list',
      filter.search,
      filter.page,
      JSON.stringify(data),
      startTime,
      endTime,
    ],
    queryFn: () => {
      return getMaintenanceOrderList({
        filter: JSON.stringify(data),
        page: Number(filter.page || 1),
        search: filter.search || '',
        start_time: startTime,
        end_time: endTime,
      });
    },
  });

  const submitMutation = useMutation({
    mutationFn: (data: SubmitMaintenanceOrderRequest) => submitMaintenanceOrder(data),
    onSuccess: (data) => {
      toast.success(data.message);
      maintenanceOrderList.refetch();
      if (Array.isArray(data.result) && data.result.length > 0) {
        const lastId = data.result[0]['maintenance_id'];
        setFilter((prev) => ({
          ...prev,
          selected: String(lastId),
          add: 'false',
        }));
      }
    },
  });

  // useEffect(() => {
  //   setFilter((prev) => ({
  //     ...prev,
  //     view: 'list',
  //   }));
  // }, [filter]);

  const [searchParams] = useSearchParams();

  const selected = searchParams.get('selected');

  useEffect(() => {
    setFilter((prev) => ({
      ...prev,
      selected: selected,
    }));
  }, [selected]);

  const startDate = searchParams.get('start');

  useEffect(() => {
    setFilter((prev) => ({
      ...prev,
      start: startDate,
    }));
  }, [startDate]);

  const endDate = searchParams.get('end');

  useEffect(() => {
    setFilter((prev) => ({
      ...prev,
      end: endDate,
    }));
  }, [endDate]);

  const add = searchParams.get('add');

  useEffect(() => {
    setFilter((prev) => ({
      ...prev,
      add: add,
    }));
  }, [add]);

  // Auto-navigate to the correct page when a selected item exists
  useQuery({
    queryKey: ['get-maintenance-order-page-finder', selected, startTime, endTime],
    queryFn: async () => {
      const res = await getMaintenanceOrderList({
        filter: JSON.stringify(data),
        page: 1,
        search: filter.search || '',
        start_time: startTime,
        end_time: endTime,
      });
      const index = res.all_data_ids.indexOf(Number(selected));
      if (index !== -1) {
        const page = Math.floor(index / 5) + 1;
        setFilter((prev) => ({
          ...prev,
          page: String(page),
        }));
      } else {
        setFilter((prev) => ({
          ...prev,
          page: '1',
        }));
      }
      return res;
    },
    enabled: !!selected,
  });

  return (
    <div className={styles['list-view']}>
      <Container
        title={'Maintenance Order List'}
        className={styles['maintenance-order-list']}
        icon={<ListAlt width={24} height={24} />}
        background="none"
        rightTopComponent={
          <div className={styles['right-top-component']}>
            <InfoTooltip
              title="Maintenance Order List"
              content={'Browse and track all maintenance orders within the selected period'}
            />
          </div>
        }
      >
        <Loading isLoading={maintenanceOrderList.isFetching} />
        <MaintenanceOrderList
          maintenanceOrderList={maintenanceOrderList}
          selected={selected || ''}
        />
      </Container>
      <MaintenanceDetail
        maintenanceId={Number(selected)}
        autoSelectAfterDelete={true}
        isAdding={filter.add === 'true'}
        selectedTab={filter.tab as 'details' | 'work-report' | 'progress'}
        handleSelectTab={(e) => {
          setFilter((prev) => ({
            ...prev,
            tab: e as 'details' | 'work-report' | 'progress',
          }));
        }}
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
        onCancelClicked={() => {
          setFilter((prev) => ({
            ...prev,
            add: 'false',
            page: '1',
          }));
        }}
        maintenanceOrderList={maintenanceOrderList}
      />
    </div>
  );
};

export const getMaintenanceOrderStatusQueryKey = (id: number) =>
  ['get-maintenance-status', id] as const;

export const MaintenanceDetail = ({
  maintenanceId,
  isAdding,
  selectedTab,
  handleSelectTab,
  wrapperClassName,
  wrapperStyle,
  onSubmitClicked,
  onCancelClicked,
  maintenanceOrderList,
  autoSelectAfterDelete,
  isPopup,
}: {
  maintenanceId: number;
  isAdding: boolean;
  wrapperClassName?: string;
  wrapperStyle?: CSSProperties;
  selectedTab: 'details' | 'work-report' | 'progress';
  handleSelectTab: (tab: string) => void;
  onSubmitClicked?: (data: FormType) => void;
  onCancelClicked?: () => void;
  maintenanceOrderList?: UseQueryResult<MaintenanceOrderListType, Error>;
  autoSelectAfterDelete?: boolean;
  isPopup?: boolean;
}) => {
  const maintenanceNameAndType = useQuery({
    queryKey: ['get-maintenance-name-and-type', maintenanceId],
    queryFn: () => {
      return getMaintenanceNameAndType({
        maintenance_id: maintenanceId,
      });
    },
    enabled: !isAdding,
  });

  const { data: maintenanceStatus, refetch: maintenanceStatusRefetch } = useQuery({
    queryKey: getMaintenanceOrderStatusQueryKey(maintenanceId),
    queryFn: ({ queryKey }) => getMaintenanceOrderStatus(queryKey[1]),
    enabled: !isAdding,
  });

  const selectedMaintenanceName = useMemo(() => {
    return maintenanceNameAndType.data?.name;
  }, [maintenanceNameAndType.data]);

  const selectedMaintenanceIsCorrective = useMemo(() => {
    return maintenanceNameAndType.data?.is_corrective;
  }, [maintenanceNameAndType.data]);

  // Fetch order details
  const orderQuery = useQuery({
    queryKey: ['maintenance-order-detail', maintenanceId],
    queryFn: () => getMaintenanceOrderDetail({ order_id: maintenanceId }),
    enabled: !!maintenanceId,
    gcTime: 0,
    staleTime: 0,
  });

  // Map order data to form data
  const initialData: MaintenanceOrderData | undefined = orderQuery.data
    ? {
        id: orderQuery.data.id,
        maintenanceType: orderQuery.data.maintenanceType,
        building: orderQuery.data.building,
        floor: orderQuery.data.floor,
        room: orderQuery.data.room,
        equipment: orderQuery.data.equipment,
        repeatBy: orderQuery.data.repeatBy,
        repeatEndDate: orderQuery.data.repeatEndDate,
        repeatEndTime: orderQuery.data.repeatEndTime,
        plannedStartDate: orderQuery.data.plannedStartDate,
        plannedStartTime: orderQuery.data.plannedStartTime,
        plannedFinishDate: orderQuery.data.plannedFinishDate,
        plannedFinishTime: orderQuery.data.plannedFinishTime,
        priority: orderQuery.data.priority,
        severity: orderQuery.data.severity,
        description: orderQuery.data.description,
        createdAt: orderQuery.data.createdAt,
        createdBy: orderQuery.data.createdBy,
        updatedAt: orderQuery.data.updatedAt,
        estimatedTime: orderQuery.data.estimatedTime,
        actualTime: orderQuery.data.actualTime,
        status: orderQuery.data.status,
        maintenanceId: orderQuery.data.maintenanceId,
        instructions: orderQuery.data.instructions,
        technicians: orderQuery.data.technicians,
        approved_by: orderQuery.data.approved_by,
        edited_by: orderQuery.data.edited_by,
        reject_reason: orderQuery.data.reject_reason,
        isTimeExceed: orderQuery.data.isTimeExceed,
        issue_relation_id: orderQuery.data.issue_relation_id,
        other_alarm_codes: orderQuery.data.other_alarm_codes,
      }
    : undefined;

  const { userData } = useContext(AuthCtx);

  // const viewMode = useMemo(() => {
  //   const isSPV =
  //     userData?.permissions.some(
  //       (permission) =>
  //         (permission.alias === 'approve' &&
  //           permission.groupAlias === 'maintenanceorder') ||
  //         (permission.alias === 'update' &&
  //           permission.groupAlias === 'maintenanceorder') ||
  //         (permission.alias === 'delete' &&
  //           permission.groupAlias === 'maintenanceorder')
  //     ) || userData?.role !== 'basic';
  //   return isSPV ? 'spv' : 'technician';
  // }, [userData]);

  return (
    (maintenanceNameAndType.data || isAdding) && (
      <Container
        title={isPopup ? '' : isAdding ? 'Create Request' : selectedMaintenanceName}
        className={clsx(styles['maintenance-detail'], wrapperClassName)}
        contentWrapperProps={{
          style: {
            padding: isPopup ? 0 : '',
            backgroundColor: COLOR.backgroundLow,
          },
        }}
        icon={
          isPopup ? (
            ''
          ) : isAdding ? (
            <Assigment width={24} height={24} />
          ) : selectedMaintenanceIsCorrective ? (
            <Corrective width={24} height={24} />
          ) : (
            <Preventive width={24} height={24} />
          )
        }
        style={wrapperStyle}
        background="none"
        rightTopComponent={
          isPopup ? (
            ''
          ) : (
            <div className={styles['right-top-component']}>
              <InfoTooltip
                title={isAdding ? 'Create Request' : 'Order Details'}
                content={
                  isAdding
                    ? 'Create a new maintenance request for preventive tasks or corrective issues. Fields marked with * are mandatory'
                    : 'Some information may be read‑only depending on your role and the order’s current status. Supervisors can approve or reject the submitted request.'
                }
              />
              {!isAdding && <RenderMaintenanceStatus status={maintenanceStatus ?? ''} />}
            </div>
          )
        }
      >
        {isAdding ? (
          <RequestForm
            onSubmit={onSubmitClicked}
            onCancel={onCancelClicked}
            isLoadingInitialData={false}
            isAdding={isAdding}
          />
        ) : (
          <TabProvider
            style={{ height: '100%' }}
            value={selectedTab}
            onChange={handleSelectTab}
            type="1"
            className={styles['tab-provider']}
          >
            <TabList className={styles['tab-list']}>
              <Tab value="details" label="Details" className={styles['tab']} />
              <Tab value="work-report" label="Work Report" className={styles['tab']} />
              <Tab value="progress" label="Progress" className={styles['tab']} />
            </TabList>
            {maintenanceId ? (
              <>
                <TabPanel value="details" className={styles['tab-panel']}>
                  <Details
                    orderId={maintenanceId}
                    initialData={initialData}
                    isLoadingInitialData={orderQuery.isFetching}
                    maintenanceNameAndType={maintenanceNameAndType.data}
                    maintenanceStatusRefetch={maintenanceStatusRefetch}
                    maintenanceOrderDetail={orderQuery}
                    maintenanceOrderList={maintenanceOrderList}
                    isAdding={false}
                    isPopup={isPopup}
                    onCancelClicked={onCancelClicked}
                    autoSelectAfterDelete={autoSelectAfterDelete}
                  />
                </TabPanel>
                <TabPanel
                  value="work-report"
                  className={styles['tab-panel']}
                  style={{ borderTopLeftRadius: '8px' }}
                >
                  <WorkReport />
                </TabPanel>
                <TabPanel
                  value="progress"
                  className={styles['tab-panel']}
                  style={{ borderTopLeftRadius: '8px' }}
                >
                  <Progress orderId={maintenanceId} initialData={initialData} />
                </TabPanel>
                <Loading isLoading={orderQuery.isFetching} />
              </>
            ) : (
              ''
            )}
          </TabProvider>
        )}
      </Container>
    )
  );
};
