/* eslint-disable react-hooks/exhaustive-deps */
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AuthCtx,
  Button,
  COLOR,
  DateTimePicker,
  Dropdown,
  DropdownMultipleSelect,
  DropdownOptionCards,
  Popup,
  TextBox,
} from '@digital-twin/components';
import { CloseDownErrorCircle, Plus } from '@digital-twin/icons';
import { CheckCircleIcon, DeleteIcon, SaveFillIcon, SettingsIcon, toast } from '@digital-twin/reusables';
import { useQuery } from '@tanstack/react-query';
import { useContext, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { getDiagnosticsOverview, MaintenanceNameAndTypeType } from '../api/maintenance-order';
import { DegradationIndicator } from './degradation-indicator';
import { DiagnosticOverview } from './diagnostic-overview';
import { IssueMapping } from './issue-mapping';
import {
  calculateFinishDateTime,
  FormType,
  formSchema,
  getDefaultFormValues,
  MaintenanceOrderData,
  PopupContent,
  PopupType,
  useFormQueries,
  ViewMode,
} from './request-form/index';
import styles from './request-form.module.scss';

// Re-export types for backwards compatibility
export {
  type FormType,
  formSchema,
  type MaintenanceOrderData,
  type ViewMode,
} from './request-form/index';

// Props for the RequestForm component
export interface RequestFormProps {
  /** View mode: 'technician' for create view, 'spv' for supervisor detail/edit view */
  viewMode?: ViewMode;
  /** Initial data to populate the form (for editing existing orders) */
  initialData?: MaintenanceOrderData;
  /** Callback when form is submitted (create mode) */
  onSubmit?: (data: FormType) => void;
  /** Callback when cancel is clicked */
  onCancel?: () => void;
  /** Callback when reset is clicked (SPV mode) */
  onReset?: () => void;
  /** Callback when save as draft is clicked (SPV mode) */
  onSaveAsDraft?: (data: FormType) => void;
  /** Callback when reject is clicked (SPV mode) */
  onReject?: (data: FormType) => void;
  /** Callback when approve is clicked (SPV mode) */
  onApprove?: (data: FormType) => void;
  /** Whether the form is in loading state */
  isLoading?: boolean;
  /** Whether the form fields should be read-only */
  readOnly?: boolean;
  isLoadingInitialData: boolean;
  maintenanceNameAndType?: MaintenanceNameAndTypeType;
  onDelete?: (data: FormType) => void;
  isAdding: boolean;
}

export const RequestForm = ({
  viewMode = 'technician',
  initialData,
  onSubmit,
  onCancel,
  onReset,
  onSaveAsDraft,
  onReject,
  onApprove,
  isLoading = false,
  readOnly = false,
  maintenanceNameAndType,
  onDelete,
  isAdding,
}: RequestFormProps) => {
  const isSPVView = useMemo(() => {
    return viewMode === 'spv';
  }, [viewMode]);

  const requestForm = useForm<FormType>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultFormValues(initialData, false),
  });

  const [popupType, setPopupType] = useState<PopupType>(null);

  const isRecurring = useMemo(() => {
    return initialData
      ? initialData.maintenanceId !== null && initialData.status !== 'OPEN'
      : false;
  }, [initialData?.maintenanceId]);

  const handleClosePopup = () => {
    setPopupType(null);
  };

  const handleOpenPopup = (type: PopupType) => {
    setPopupType(type);
  };

  // Reset form when initialData changes (e.g., when loading a different order)
  useEffect(() => {
    requestForm.reset(getDefaultFormValues(initialData, isSPVView));
  }, [JSON.stringify(initialData), isSPVView]);

  // Watch form values
  const building_id = requestForm.watch('building');
  const floor_id = requestForm.watch('floor');
  const room_id = requestForm.watch('room');
  const equipment_id = requestForm.watch('equipment');
  const plannedStartDate = requestForm.watch('plannedStartDate');
  const plannedStartTime = requestForm.watch('plannedStartTime');
  const plannedFinishDate = requestForm.watch('plannedFinishDate');
  const plannedFinishTime = requestForm.watch('plannedFinishTime');
  const instructions = requestForm.watch('instructions');
  const technicians = requestForm.watch('technicians');
  const maintenanceType = requestForm.watch('maintenanceType');
  const repeatBy = requestForm.watch('repeatBy');
  const otherIssues = requestForm.watch('otherIssues');

  // Use the extracted queries hook
  const {
    maintenanceOrderOptions,
    buildingOptions,
    floorOptions,
    roomOptions,
    equipmentOptions,
    repeatByOptions,
    priorityOptions,
    severityOptions,
    instructionOptions,
    instructionDuration,
    technicianOptions,
    allTechnicianOptions,
    instructionsQuery,
  } = useFormQueries({
    buildingId: building_id,
    floorId: floor_id,
    roomId: room_id,
    equipmentId: equipment_id,
    plannedStartDate,
    plannedStartTime,
    plannedFinishDate,
    plannedFinishTime,
    maintenanceId: initialData?.id,
    isAdding,
  });

  const technicianOptionsRefined = useMemo(() => {
    return technicianOptions.filter((tech) => !tech.label.includes('(deleted)'));
  }, [JSON.stringify(technicianOptions)]);

  const diagnosticsOverview = useQuery({
    queryKey: ['get-diagnostics-overview', initialData?.id],
    queryFn: () =>
      getDiagnosticsOverview({
        maintenance_id: Number(initialData?.id),
      }),
    enabled: !!initialData?.id && initialData?.issue_relation_id !== null,
  });

  // Form handlers
  const handleSubmit = requestForm.handleSubmit(
    (data) => {
      onSubmit?.(data);
      handleClosePopup();
    },
    () => {
      toast.error('Some fields are not filled properly');
    }
  );

  const handleReset = () => {
    if (initialData) {
      requestForm.reset(getDefaultFormValues(initialData, false));
    }
    onReset?.();
  };

  const handleSaveAsDraft = requestForm.handleSubmit(
    (data) => {
      onSaveAsDraft?.(data);
      handleClosePopup();
    },
    () => {
      toast.error('Some fields are not filled properly');
    }
  );

  const handleReject = () => {
    const data = requestForm.getValues();
    onReject?.(data);
    handleClosePopup();
  };

  const handleApprove = requestForm.handleSubmit(
    (data) => {
      onApprove?.(data);
      handleClosePopup();
    },
    () => {
      toast.error('Some fields are not filled properly');
    }
  );

  const handleDelete = () => {
    const data = requestForm.getValues();
    onDelete?.(data);
    handleClosePopup();
  };

  useEffect(() => {
    if (plannedStartDate) requestForm.setError('plannedStartDate', {}, { shouldFocus: false });
  }, [plannedStartDate]);

  useEffect(() => {
    if (plannedStartTime) requestForm.setError('plannedStartTime', {}, { shouldFocus: false });
  }, [plannedStartTime]);

  useEffect(() => {
    if (plannedFinishDate) requestForm.setError('plannedFinishDate', {}, { shouldFocus: false });
  }, [plannedFinishDate]);

  useEffect(() => {
    if (plannedFinishTime) requestForm.setError('plannedFinishTime', {}, { shouldFocus: false });
  }, [plannedFinishTime]);

  const { userData } = useContext(AuthCtx);

  const deletePermission =
    userData?.permissions.some(
      (permission) => permission.alias === 'delete' && permission.groupAlias === 'maintenanceorder'
    ) || userData?.role !== 'basic';

  const updatePermission =
    userData?.permissions.some(
      (permission) => permission.alias === 'update' && permission.groupAlias === 'maintenanceorder'
    ) || userData?.role !== 'basic';

  const approvePermission =
    userData?.permissions.some(
      (permission) => permission.alias === 'approve' && permission.groupAlias === 'maintenanceorder'
    ) || userData?.role !== 'basic';

  // Handler for instruction/technician duration calculations
  const handleInstructionChange = (value: string[]) => {
    requestForm.setValue('instructions', value.join(','));
    // requestForm.setValue('technicians', '');
    let duration = 0;
    instructionDuration
      ?.filter((val) => value.includes(val.value))
      .forEach((instruction) => {
        duration += instruction.duration;
      });
    if (duration > 0) {
      const plannedFinish = calculateFinishDateTime(plannedStartDate, plannedStartTime, duration);
      if (
        !(
          plannedFinishDate &&
          plannedFinishTime &&
          new Date(`${plannedFinishDate} ${plannedFinishTime}`).getTime() >
            new Date(`${plannedFinish.finishDate} ${plannedFinish.finishTime}`).getTime()
        )
      ) {
        requestForm.setValue('plannedFinishDate', plannedFinish.finishDate);
        requestForm.setValue('plannedFinishTime', plannedFinish.finishTime);
      }
    }
    requestForm.setError('instructions', {}, { shouldFocus: false });
  };

  const handleInstructionCardChange = (value: string[]) => {
    requestForm.setValue('instructions', value.join(','));
    // requestForm.setValue('technicians', '');
    let duration = 0;
    instructionDuration
      ?.filter((val) => value.includes(val.value))
      .forEach((instruction) => {
        duration += instruction.duration;
      });
    if (duration > 0) {
      const plannedFinish = calculateFinishDateTime(plannedStartDate, plannedStartTime, duration);
      if (
        !(
          plannedFinishDate &&
          plannedFinishTime &&
          new Date(`${plannedFinishDate} ${plannedFinishTime}`).getTime() >
            new Date(`${plannedFinish.finishDate} ${plannedFinish.finishTime}`).getTime()
        )
      ) {
        requestForm.setValue('plannedFinishDate', plannedFinish.finishDate);
        requestForm.setValue('plannedFinishTime', plannedFinish.finishTime);
      }
    }
  };

  const handleOtherIssueChange = (allIssues: string[]) => {
    const mainIssueValues = instructions ? instructions.split(',') : [];
    const otherIssueValues = allIssues.filter((v) => !mainIssueValues.includes(v));
    requestForm.setValue('otherIssues', otherIssueValues.join(','));
    // requestForm.setValue('technicians', '');
    let duration = 0;
    instructionDuration
      ?.filter((val) => allIssues.includes(val.value))
      .forEach((instruction) => {
        duration += instruction.duration;
      });
    if (duration > 0) {
      const plannedFinish = calculateFinishDateTime(plannedStartDate, plannedStartTime, duration);
      if (
        !(
          plannedFinishDate &&
          plannedFinishTime &&
          new Date(`${plannedFinishDate} ${plannedFinishTime}`).getTime() >
            new Date(`${plannedFinish.finishDate} ${plannedFinish.finishTime}`).getTime()
        )
      ) {
        requestForm.setValue('plannedFinishDate', plannedFinish.finishDate);
        requestForm.setValue('plannedFinishTime', plannedFinish.finishTime);
      }
    }
  };

  const [view, setView] = useState(true);

  useEffect(() => {
    setView(false);
  }, [initialData?.id]);

  useEffect(() => {
    if (!view) {
      setTimeout(() => {
        setView(true);
      }, 10);
    }
  }, [view]);

  return (
    <div className={styles['request-form']}>
      <div className={styles['form']}>
        {/* Maintenance Type */}
        <div className={styles['form-group']}>
          <div className={styles['form-field']}>
            <div>
              Maintenance Type: <span className={styles['required']}>*</span>
            </div>
            <Dropdown
              options={maintenanceOrderOptions}
              control={requestForm.control}
              registered="maintenanceType"
              disabled={readOnly || !!initialData?.issue_relation_id}
              placeholder="Select Maintenance Type"
            />
          </div>
        </div>

        {/* Building & Floor */}
        <div className={styles['form-group']}>
          <div className={styles['form-field']}>
            <div>
              Building: <span className={styles['required']}>*</span>
            </div>
            <Dropdown
              options={buildingOptions}
              placeholder="Select building"
              disabled={
                (initialData?.issue_relation_id !== null && !isAdding) ||
                readOnly ||
                buildingOptions.length === 0
              }
              value={building_id}
              onChange={(value) => {
                requestForm.setValue('building', value);
                requestForm.setValue('floor', '');
                requestForm.setValue('room', '');
                requestForm.setValue('equipment', '');
                // requestForm.setValue('instructions', '');
                requestForm.setValue('technicians', '');
                requestForm.setValue('plannedFinishDate', '');
                requestForm.setValue('plannedFinishTime', '');
                requestForm.setError('building', {}, { shouldFocus: false });
              }}
              error={requestForm.formState.errors.building?.message}
            />
          </div>
          <div className={styles['form-field']}>
            <div>
              Floor: <span className={styles['required']}>*</span>
            </div>
            <Dropdown
              options={floorOptions}
              placeholder="Select Floor"
              disabled={
                (initialData?.issue_relation_id !== null && !isAdding) ||
                readOnly ||
                floorOptions.length === 0
              }
              value={floor_id}
              onChange={(value) => {
                requestForm.setValue('floor', value);
                requestForm.setValue('room', '');
                requestForm.setValue('equipment', '');
                // requestForm.setValue('instructions', '');
                // requestForm.setValue('technicians', '');
                requestForm.setValue('plannedFinishDate', '');
                requestForm.setValue('plannedFinishTime', '');
                requestForm.setError('floor', {}, { shouldFocus: false });
              }}
              error={requestForm.formState.errors.floor?.message}
            />
          </div>
        </div>

        {/* Room & Equipment */}
        <div className={styles['form-group']}>
          <div className={styles['form-field']}>
            <div>
              Room: <span className={styles['required']}>*</span>
            </div>
            <Dropdown
              options={roomOptions}
              disabled={
                (initialData?.issue_relation_id !== null && !isAdding) ||
                readOnly ||
                roomOptions.length === 0
              }
              placeholder="Select Room"
              value={room_id}
              onChange={(value) => {
                requestForm.setValue('room', value);
                requestForm.setValue('equipment', '');
                // requestForm.setValue('instructions', '');
                // requestForm.setValue('technicians', '');
                requestForm.setValue('plannedFinishDate', '');
                requestForm.setValue('plannedFinishTime', '');
                requestForm.setError('room', {}, { shouldFocus: false });
              }}
              error={requestForm.formState.errors.room?.message}
            />
          </div>
          <div className={styles['form-field']}>
            <div>
              Equipment ID: <span className={styles['required']}>*</span>
            </div>
            <Dropdown
              options={equipmentOptions}
              disabled={
                (initialData?.issue_relation_id !== null && !isAdding) ||
                readOnly ||
                equipmentOptions.length === 0
              }
              placeholder="Select Equipment ID"
              value={equipment_id}
              onChange={(value) => {
                requestForm.setValue('equipment', value);
                // requestForm.setValue('instructions', '');
                // requestForm.setValue('technicians', '');
                requestForm.setValue('plannedFinishDate', '');
                requestForm.setValue('plannedFinishTime', '');
                requestForm.setError('equipment', {}, { shouldFocus: false });
              }}
              error={requestForm.formState.errors.equipment?.message}
            />
          </div>
        </div>

        {/* Priority & Severity (SPV view shows both) */}
        {!isAdding && (
          <div className={styles['form-group']}>
            <div className={styles['form-field']}>
              <div>
                Priority: <span className={styles['required']}>*</span>
              </div>
              <Dropdown
                options={priorityOptions}
                control={requestForm.control}
                registered="priority"
                disabled={readOnly}
                placeholder="Select Priority"
              />
            </div>
            <div className={styles['form-field']}>
              <div>
                Severity: <span className={styles['required']}>*</span>
              </div>
              <Dropdown
                options={severityOptions}
                control={requestForm.control}
                registered="severity"
                disabled={readOnly}
                placeholder="Select Severity"
              />
            </div>
          </div>
        )}

        {/* Repeat By, Schedule Time & Repeat End Time */}
        {maintenanceType === '2' && (
          <div className={styles['form-group']}>
            <div className={styles['form-field']}>
              <div>Repeat by:</div>
              <Dropdown
                control={requestForm.control}
                registered="repeatBy"
                options={repeatByOptions}
                disabled={readOnly || initialData?.status === 'OPEN'}
                placeholder="Select Repeat by"
              />
            </div>

            <div className={styles['form-field']}>
              <div>Repeat End Time:</div>
              {view && (
                <div className={styles['datetime-picker']}>
                  <DateTimePicker
                    type="date"
                    wrapperClassName={styles['date']}
                    control={requestForm.control}
                    registered="repeatEndDate"
                    min={plannedStartDate}
                    disabled={readOnly || !repeatBy || initialData?.status === 'OPEN'}
                  />
                  <DateTimePicker
                    type="time"
                    wrapperClassName={styles['time']}
                    control={requestForm.control}
                    registered="repeatEndTime"
                    disabled={readOnly || !repeatBy || initialData?.status === 'OPEN'}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Planned Start & Planned Finish (SPV) or Severity (Technician) */}
        <div className={styles['form-group']}>
          <div className={styles['form-field']}>
            <div>
              Planned Start: <span className={styles['required']}>*</span>
            </div>
            {view && (
              <div className={styles['datetime-picker']}>
                <DateTimePicker
                  type="date"
                  wrapperClassName={styles['date']}
                  value={plannedStartDate}
                  onChange={(_, value) => {
                    requestForm.setValue('plannedStartDate', value || '');
                    // requestForm.setValue('technicians', '');
                    requestForm.setError('plannedStartDate', {}, { shouldFocus: false });
                  }}
                  disabled={readOnly}
                  max={plannedFinishDate}
                  error={requestForm.formState.errors.plannedStartDate?.message}
                />
                <DateTimePicker
                  type="time"
                  wrapperClassName={styles['time']}
                  value={plannedStartTime}
                  onChange={(_, value) => {
                    requestForm.setValue('plannedStartTime', value || '');
                    // requestForm.setValue('technicians', '');
                    requestForm.setError('plannedStartTime', {}, { shouldFocus: false });
                  }}
                  disabled={readOnly}
                  error={requestForm.formState.errors.plannedStartTime?.message}
                />
              </div>
            )}
          </div>

          {!isAdding ? (
            <div className={styles['form-field']}>
              <div>
                Planned Finish: <span className={styles['required']}>*</span>
              </div>
              {view && (
                <div className={styles['datetime-picker']}>
                  <DateTimePicker
                    type="date"
                    wrapperClassName={styles['date']}
                    value={plannedFinishDate}
                    onChange={(_, value) => {
                      requestForm.setValue('plannedFinishDate', value || '');
                      // requestForm.setValue('technicians', '');
                      requestForm.setError('plannedFinishDate', {}, { shouldFocus: false });
                    }}
                    disabled={readOnly}
                    min={plannedStartDate}
                    error={requestForm.formState.errors.plannedFinishDate?.message}
                  />
                  <DateTimePicker
                    type="time"
                    wrapperClassName={styles['time']}
                    value={plannedFinishTime}
                    onChange={(_, value) => {
                      requestForm.setValue('plannedFinishTime', value || '');
                      // requestForm.setValue('technicians', '');
                      requestForm.setError('plannedFinishTime', {}, { shouldFocus: false });
                    }}
                    disabled={readOnly}
                    error={requestForm.formState.errors.plannedFinishTime?.message}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className={styles['form-field']}>
              <div>
                Severity: <span className={styles['required']}>*</span>
              </div>
              <Dropdown
                options={severityOptions}
                control={requestForm.control}
                registered="severity"
                disabled={readOnly}
              />
            </div>
          )}
        </div>

        {/* Description */}
        <div className={styles['form-group']}>
          <div className={styles['form-field']}>
            <div>Description:</div>
            <TextBox
              wrapperStyles={{ height: 75 }}
              placeholder="Describe the issue or planned task"
              control={requestForm.control}
              registered="description"
              disabled={readOnly}
            />
          </div>
        </div>

        {!isAdding && (
          <div
            style={{
              width: '100%',
              minHeight: 1,
              backgroundColor: COLOR.neutralTextCaption,
              opacity: 0.6,
            }}
          ></div>
        )}

        {!isAdding && initialData?.issue_relation_id === null && (
          <div className={styles['form-group']}>
            <div className={styles['form-field']}>
              <div>Issue: </div>
              <DropdownMultipleSelect
                options={instructionOptions}
                onChange={handleInstructionChange}
                value={instructions ? instructions.split(',') : []}
                selectedOptionsVariant="number"
                placeholder="Select one or multiple Issue based on description"
                error={requestForm.formState.errors.instructions?.message}
                disabled={readOnly || instructionOptions?.length === 0}
                selectedOptionsPlaceholder="No issues have been selected yet."
                selectedOptionsReorderable={true}
                availableOptionsLabel="Issue List:"
                selectedOptionsLabel="Selected Issue:"
                required={true}
              />
              <DropdownOptionCards
                options={instructionOptions}
                onChange={handleInstructionCardChange}
                value={instructions ? instructions.split(',') : []}
                disabled={readOnly || instructionOptions?.length === 0}
                listType="number"
                textStyles={{ width: 0 }}
              />
            </div>
            <div className={styles['form-field']}>
              <div>Assign Technician: </div>
              <DropdownMultipleSelect
                options={technicianOptionsRefined}
                value={technicians ? technicians.split(',') : []}
                onChange={(value) => {
                  requestForm.setValue('technicians', value.join(','));
                  requestForm.setError('technicians', {}, { shouldFocus: false });
                }}
                selectedOptionsVariant="checkbox"
                placeholder="Select one or multiple Technicians"
                error={requestForm.formState.errors.technicians?.message}
                disabled={readOnly || technicianOptions?.length === 0}
                selectedOptionsPlaceholder="No Technician has been assigned to this request yet."
                availableOptionsLabel="Technician List:"
                selectedOptionsLabel="Selected Technician:"
                required={true}
              />
              <DropdownOptionCards
                options={allTechnicianOptions}
                value={technicians ? technicians.split(',') : []}
                onChange={(value) => {
                  requestForm.setValue('technicians', value.join(','));
                }}
                disabled={readOnly || technicianOptions?.length === 0}
              />
            </div>
          </div>
        )}
        {initialData?.issue_relation_id !== null && !isAdding && (
          <>
            <DiagnosticOverview
              isCompound={diagnosticsOverview.data?.is_compound}
              detectedAt={initialData?.createdAt || ''}
              asset_id={Number(equipment_id)}
              isDeduction={diagnosticsOverview.data?.is_deduction}
            />
            {initialData && (
              <IssueMapping
                issueMasterData={instructionsQuery.data || []}
                onChange={handleOtherIssueChange}
                issues={instructions ? instructions.split(',') : []}
                otherIssues={otherIssues ? otherIssues.split(',') : []}
                disabled={readOnly}
              />
            )}
            {diagnosticsOverview.data?.is_deduction && (
              <DegradationIndicator
                asset_id={Number(equipment_id)}
                initialDate={plannedStartDate}
                maintenance_id={Number(initialData?.id)}
              />
            )}
            <div
              style={{
                width: '100%',
                minHeight: 1,
                backgroundColor: COLOR.neutralTextCaption,
                opacity: 0.6,
              }}
            ></div>
            <div className={styles['form-field']}>
              <div>Assign Technician: </div>
              <DropdownMultipleSelect
                options={technicianOptionsRefined}
                value={technicians ? technicians.split(',') : []}
                onChange={(value) => {
                  requestForm.setValue('technicians', value.join(','));
                  requestForm.setError('technicians', {}, { shouldFocus: false });
                }}
                selectedOptionsVariant="checkbox"
                placeholder="Select one or multiple Technicians"
                error={requestForm.formState.errors.technicians?.message}
                disabled={readOnly || technicianOptions?.length === 0}
                selectedOptionsPlaceholder="No Technician has been assigned to this request yet."
                availableOptionsLabel="Technician List:"
                selectedOptionsLabel="Selected Technician:"
                required={true}
              />
              <DropdownOptionCards
                options={allTechnicianOptions}
                value={technicians ? technicians.split(',') : []}
                onChange={(value) => {
                  requestForm.setValue('technicians', value.join(','));
                }}
                disabled={readOnly || technicianOptions?.length === 0}
              />
            </div>
          </>
        )}
      </div>

      {/* Buttons - different for technician vs SPV view */}
      {!readOnly ? (
        <div className={styles['buttons']}>
          {isSPVView && initialData?.id ? (
            initialData?.status === 'OPEN' ? (
              <>
                <div className={styles['buttons-right']}>
                  <Button color="default-secondary" onClick={handleReset} disabled={isLoading}>
                    Reset
                  </Button>
                  {deletePermission && (
                    <Button
                      color="error"
                      onClick={() => {
                        handleOpenPopup('DELETE');
                      }}
                      disabled={isLoading}
                      icon={<DeleteIcon />}
                    >
                      Delete
                    </Button>
                  )}
                </div>

                <div className={styles['buttons-right']}>
                  {updatePermission && (
                    <Button
                      onClick={() => {
                        handleOpenPopup('EDIT');
                      }}
                      disabled={isLoading}
                      icon={<SaveFillIcon width={20} height={20} />}
                    >
                      Save Changes
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className={styles['buttons-right']}>
                  <Button color="default-secondary" onClick={handleReset} disabled={isLoading}>
                    Reset
                  </Button>
                  {deletePermission && (
                    <Button
                      color="error"
                      onClick={() => {
                        handleOpenPopup('DELETE');
                      }}
                      disabled={isLoading}
                      icon={<DeleteIcon />}
                    >
                      Delete
                    </Button>
                  )}
                </div>

                <div className={styles['buttons-right']}>
                  <Button
                    color="default-secondary"
                    onClick={() => {
                      handleOpenPopup('SAVE_DRAFT');
                    }}
                    disabled={isLoading}
                  >
                    Save as Draft
                  </Button>
                  {approvePermission && (
                    <Button
                      color="error"
                      onClick={() => {
                        handleOpenPopup('REJECT');
                      }}
                      disabled={isLoading}
                      icon={<CloseDownErrorCircle width={20} height={20} />}
                    >
                      Reject
                    </Button>
                  )}
                  {approvePermission && (
                    <Button
                      color="success"
                      onClick={() => {
                        handleOpenPopup('APPROVE');
                      }}
                      disabled={isLoading}
                      icon={<CheckCircleIcon />}
                    >
                      Approve
                    </Button>
                  )}
                </div>
              </>
            )
          ) : (
            <>
              <Button
                color="default-secondary"
                onClick={() => {
                  handleOpenPopup('CANCEL');
                }}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                icon={<Plus width={20} height={20} />}
                onClick={() => {
                  handleOpenPopup('CREATE');
                }}
                disabled={isLoading}
              >
                Create
              </Button>
            </>
          )}
        </div>
      ) : (
        isSPVView &&
        initialData?.id && (
          <div className={styles['buttons-right']}>
            <Button
              color="error"
              onClick={() => {
                handleOpenPopup('DELETE');
              }}
              disabled={isLoading}
              icon={<DeleteIcon />}
            >
              Delete
            </Button>
          </div>
        )
      )}
      <Popup
        wrapperStyle={{
          zIndex: 11,
        }}
        title={
          popupType === 'CREATE'
            ? 'Create Request'
            : popupType === 'CANCEL'
              ? 'Cancel Create Request'
              : popupType === 'APPROVE'
                ? isRecurring
                  ? 'Approve Maintenance Order'
                  : 'Approve Request'
                : popupType === 'REJECT'
                  ? isRecurring
                    ? 'Reject Maintenance Order'
                    : 'Reject Request'
                  : popupType === 'DELETE'
                    ? 'Delete Maintenance Order'
                    : popupType === 'EDIT'
                      ? isRecurring
                        ? 'Edit Maintenance Order'
                        : 'Edit Request'
                      : popupType === 'SAVE_DRAFT'
                        ? 'Save Maintenance Order as Draft'
                        : ''
        }
        open={popupType !== null}
        onClose={handleClosePopup}
        icon={<SettingsIcon width={24} height={24} />}
        background="none"
        variant="custom"
        submitButtonLabel={
          popupType
            ? popupType === 'CANCEL' || popupType === 'EDIT' || popupType === 'SAVE_DRAFT'
              ? 'Yes'
              : popupType.charAt(0) + popupType.slice(1).toLowerCase()
            : ''
        }
        submitButtonIcon={
          popupType === 'CREATE' ? (
            <Plus />
          ) : popupType === 'APPROVE' ? (
            <CheckCircleIcon />
          ) : popupType === 'REJECT' ? (
            <CloseDownErrorCircle width={20} height={20} />
          ) : popupType === 'DELETE' ? (
            <DeleteIcon />
          ) : popupType === 'EDIT' || popupType === 'SAVE_DRAFT' ? (
            <SaveFillIcon />
          ) : (
            ''
          )
        }
        submitButtonColor={
          popupType === 'APPROVE'
            ? 'success'
            : popupType === 'REJECT' || popupType === 'DELETE'
              ? 'error'
              : undefined
        }
        onSubmit={
          popupType === 'CREATE'
            ? handleSubmit
            : popupType === 'CANCEL'
              ? onCancel
              : popupType === 'APPROVE'
                ? handleApprove
                : popupType === 'REJECT'
                  ? handleReject
                  : popupType === 'EDIT'
                    ? handleSaveAsDraft
                    : popupType === 'DELETE'
                      ? handleDelete
                      : popupType === 'SAVE_DRAFT'
                        ? handleSaveAsDraft
                        : () => {}
        }
      >
        <PopupContent
          type={popupType}
          maintenanceNameAndType={
            popupType === 'APPROVE' || popupType === 'REJECT' ? maintenanceNameAndType : undefined
          }
          isRecurring={isRecurring}
          requestForm={requestForm}
        />
      </Popup>
    </div>
  );
};

export default RequestForm;
