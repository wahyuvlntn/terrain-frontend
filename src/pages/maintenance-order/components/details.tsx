/* eslint-disable simple-import-sort/imports */

import { AuthCtx, useExtractFilter } from '@digital-twin/components';
import {
  QueryObserverResult,
  RefetchOptions,
  UseQueryResult,
  useMutation,
} from '@tanstack/react-query';
import { useContext, useMemo } from 'react';
import { toast } from 'react-toastify';
import {
  DeleteMaintenanceOrderRequest,
  deleteMaintenanceOrder,
  getMaintenanceOrderList,
  MaintenanceNameAndTypeType,
  MaintenanceOrderDetail,
  MaintenanceOrderListType,
  SubmitAction,
  SubmitMaintenanceOrderRequest,
  submitMaintenanceOrder,
} from '../api/maintenance-order';
import { GeneralFilterType, MaintenanceOrderFilterType } from '../type';
import { parseTimestamp } from '../utils/helper';
import styles from './details.module.scss';
import { MaintenanceMetadata } from './maintenance-metadata';
import { FormType, MaintenanceOrderData, RequestForm } from './request-form';

export const Details = ({
  orderId,
  initialData,
  isLoadingInitialData,
  maintenanceNameAndType,
  maintenanceOrderList,
  maintenanceOrderDetail,
  maintenanceStatusRefetch,
  isAdding,
  isPopup,
  onCancelClicked,
  autoSelectAfterDelete,
}: {
  orderId: number;
  initialData?: MaintenanceOrderData;
  isLoadingInitialData: boolean;
  maintenanceNameAndType?: MaintenanceNameAndTypeType;
  maintenanceOrderList?: UseQueryResult<MaintenanceOrderListType, Error>;
  maintenanceOrderDetail: UseQueryResult<MaintenanceOrderDetail, Error>;
  maintenanceStatusRefetch: (
    options?: RefetchOptions | undefined
  ) => Promise<QueryObserverResult<string, Error>>;
  isAdding: boolean;
  isPopup?: boolean;
  onCancelClicked?: () => void;
  autoSelectAfterDelete?: boolean;
}) => {
  const { userData, username } = useContext(AuthCtx);

  const {
    filter,
    setFilter,
    data: filterData,
  } = useExtractFilter<GeneralFilterType, MaintenanceOrderFilterType>();

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

  const viewMode = useMemo(() => {
    const isSPV =
      userData?.permissions.some(
        (permission) =>
          (permission.alias === 'approve' && permission.groupAlias === 'maintenanceorder') ||
          (permission.alias === 'update' && permission.groupAlias === 'maintenanceorder') ||
          (permission.alias === 'delete' && permission.groupAlias === 'maintenanceorder')
      ) || userData?.role !== 'basic';
    return isSPV ? 'spv' : 'technician';
  }, [userData]);

  // Consolidated mutation for all actions
  const submitMutation = useMutation({
    mutationFn: (data: SubmitMaintenanceOrderRequest) => submitMaintenanceOrder(data),
    onSuccess: (data) => {
      toast.success(data.message);
      maintenanceOrderDetail.refetch();
      maintenanceOrderList?.refetch();
      maintenanceStatusRefetch();
      if (Array.isArray(data.result) && data.result.length > 0) {
        const lastId = data.result[0]['maintenance_id'];
        setFilter((prev) => ({
          ...prev,
          selected: String(lastId),
          add: 'false',
        }));
      }
      if (isPopup) {
        onCancelClicked?.();
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (data: DeleteMaintenanceOrderRequest) => deleteMaintenanceOrder(data),
    onSuccess: async () => {
      if (autoSelectAfterDelete) {
        const list = await getMaintenanceOrderList({
          filter: JSON.stringify(filterData),
          page: 1,
          search: filter.search || '',
          start_time: startTime,
          end_time: endTime,
        });
        maintenanceOrderList?.refetch();
        if (list.data.length > 0) {
          setFilter((prev) => ({
            ...prev,
            page: '1',
            selected: String(list.data[0].id),
          }));
        } else {
          setFilter((prev) => ({
            ...prev,
            page: '1',
            selected: '',
          }));
        }
      } else {
        if (filter.page === '1') {
          maintenanceOrderList?.refetch();
          setFilter((prev) => ({
            ...prev,
            selected: '',
          }));
        } else {
          setFilter((prev) => ({
            ...prev,
            page: '1',
            selected: '',
          }));
        }
      }
      if (isPopup) {
        onCancelClicked?.();
      }
    },
    meta: {
      toastId: 'delete-mutation',
    },
  });

  // Handler for form submission (update)
  const handleSubmit = (data: FormType) => {
    console.log(data);
  };

  // Handler for approve action (SPV only)
  const handleApprove = (data: FormType) => {
    // planned start
    const plannedStart = parseTimestamp(data.plannedStartDate, data.plannedStartTime);
    // planned end
    const plannedEnd = parseTimestamp(data.plannedFinishDate, data.plannedFinishTime);
    // planned end
    const repeatEnd = parseTimestamp(data.repeatEndDate, data.repeatEndTime);
    const submitData = {
      approved_by: username || null,
      asset_id: Number(data.equipment),
      description: data.description || null,
      edited_by: username || null,
      id: orderId,
      instructions: data.instructions,
      is_recurring: data.is_recurring,
      maintenance_type_id: Number(data.maintenanceType),
      planned_end: plannedEnd,
      planned_start: plannedStart,
      priority_id: Number(data.priority),
      reject_reason: data.reject_reason || null,
      repeat_end: repeatEnd,
      repeat_type_id: data.repeatBy ? Number(data.repeatBy) : null,
      severity_id: Number(data.severity),
      status_id: 3,
      technicians: data.technicians,
      submit_type: 'APPROVED' as SubmitAction,
      other_alarm_codes: data.otherIssues || null,
      requested_by: null,
    };
    console.log(submitData);
    submitMutation.mutate(submitData);
  };

  // Handler for reject action (SPV only)
  const handleReject = (data: FormType) => {
    // planned start
    const plannedStart = parseTimestamp(
      initialData?.plannedStartDate,
      initialData?.plannedStartTime
    );
    // planned end
    const plannedEnd = parseTimestamp(
      initialData?.plannedFinishDate,
      initialData?.plannedFinishTime
    );
    const submitData = {
      approved_by: username || null,
      asset_id: Number(initialData?.equipment),
      description: initialData?.description || null,
      edited_by: username || null,
      id: orderId,
      instructions: initialData?.instructions || '',
      is_recurring: data.is_recurring,
      maintenance_type_id: Number(initialData?.maintenanceType),
      planned_end: plannedEnd,
      planned_start: plannedStart,
      priority_id: initialData && initialData.priority ? Number(initialData.priority) : null,
      reject_reason: data.reject_reason || null,
      repeat_end: null,
      repeat_type_id: null,
      severity_id: Number(initialData?.severity),
      status_id: 2,
      technicians: initialData?.technicians || '',
      submit_type: 'REJECTED' as SubmitAction,
      requested_by: null,
      other_alarm_codes: initialData?.other_alarm_codes || null,
    };
    console.log(submitData);
    submitMutation.mutate(submitData);
  };

  // Handler for save as draft action (SPV only)
  const handleSaveAsDraft = (data: FormType) => {
    // planned start
    const plannedStart = parseTimestamp(data.plannedStartDate, data.plannedStartTime);
    // planned end
    const plannedEnd = parseTimestamp(data.plannedFinishDate, data.plannedFinishTime);
    // planned end
    const repeatEnd = parseTimestamp(data.repeatEndDate, data.repeatEndTime);
    const submitData = {
      approved_by: username || null,
      asset_id: Number(data.equipment),
      description: data.description || null,
      edited_by: username || null,
      id: orderId,
      instructions: data.instructions,
      is_recurring: data.is_recurring,
      maintenance_type_id: Number(data.maintenanceType),
      planned_end: plannedEnd,
      planned_start: plannedStart,
      priority_id: Number(data.priority),
      reject_reason: data.reject_reason || null,
      repeat_end: repeatEnd,
      repeat_type_id: data.repeatBy ? Number(data.repeatBy) : null,
      severity_id: Number(data.severity),
      status_id: initialData?.status === 'OPEN' ? 3 : 1,
      technicians: data.technicians,
      submit_type: 'SAVED' as SubmitAction,
      requested_by: null,
      other_alarm_codes: data.otherIssues || null,
    };
    console.log(submitData);
    submitMutation.mutate(submitData);
  };

  // Handler for reset - form component handles this internally
  const handleReset = () => {
    // Form will reset to initialData values
  };

  const handleDelete = (data: FormType) => {
    console.log(data.is_recurring);
    console.log(orderId);
    deleteMutation.mutate({
      id: orderId,
      is_recurring: data.is_recurring,
    });
  };

  // Loading state
  const isLoading = submitMutation.isPending;

  // Read-only state
  // Technicians can only view, not edit
  // SPV can edit unless the order is already approved or rejected
  const isReadOnly = useMemo(() => {
    return (
      viewMode !== 'spv' || (initialData?.status !== 'REQUESTED' && initialData?.status !== 'OPEN')
    );
  }, [viewMode, initialData?.status]);

  return (
    <div className={styles['details']}>
      {/* SPV Header with metadata */}
      {initialData && (
        <MaintenanceMetadata
          actualTime={initialData.actualTime || '-'}
          actualTimeStatus={
            initialData.isTimeExceed === null
              ? 'NOT_STARTED'
              : initialData.isTimeExceed
                ? 'EXCEEDED'
                : 'ON_TIME'
          }
          createdAt={initialData.createdAt || ''}
          createdBy={initialData.createdBy || ''}
          estimatedTime={initialData.estimatedTime || ''}
          updatedAt={initialData.updatedAt || ''}
        />
      )}
      <RequestForm
        viewMode={viewMode}
        initialData={initialData}
        onSubmit={handleSubmit}
        onApprove={handleApprove}
        onReject={handleReject}
        onSaveAsDraft={handleSaveAsDraft}
        onReset={handleReset}
        isLoading={isLoading}
        readOnly={isReadOnly}
        isLoadingInitialData={isLoadingInitialData}
        maintenanceNameAndType={maintenanceNameAndType}
        onDelete={handleDelete}
        isAdding={isAdding}
      />
    </div>
  );
};

export default Details;
