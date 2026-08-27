import { zodResolver } from '@hookform/resolvers/zod';
import { AuthCtx, useModal } from '@digital-twin/components';
import { toast } from '@digital-twin/reusables';
import { getURLExplicit } from '@digital-twin/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useContext, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom';

import { GroupedInstruction } from '../../../components';
import {
  addWorkUpdate,
  addWorkUpdateSchema,
  closeWorkReport,
  deleteImage,
  getAssetStatus,
  getStartedStoppedTs,
  getWorkReport,
  getWorkReportStatus,
  pauseWorkReport,
  pauseWorkReportSchema,
  resumeWorkReport,
  setStatusToDone,
  startWorkReport,
  TAddWorkUpdate,
  TAlarmIssue,
  TImage,
  TInstruction,
  TPauseWorkReport,
  TUpdateIssueValidity,
  updateIssueValidity,
  uploadImage,
} from '../api/work-report';
import { getMaintenanceOrderStatusQueryKey } from './list-view';
import { TIssue } from './work-report.dialogs';

const MAINTENANCE_ORDER_ID_SEARCH_PARAMS = 'selected';

export const useWorkReport = () => {
  const {
    open: setValidityOpen,
    handleOpen: handleSetValidityOpen,
    handleClose: _handleSetValidityClose,
  } = useModal();
  const {
    open: startOpen,
    handleOpen: _handleStartOpen,
    handleClose: handleStartClose,
  } = useModal();
  const {
    open: pauseOpen,
    handleOpen: handlePauseOpen,
    handleClose: handlePauseClose,
  } = useModal();
  const {
    open: resumeOpen,
    handleOpen: handleResumeOpen,
    handleClose: handleResumeClose,
  } = useModal();
  const {
    open: markAsDoneOpen,
    handleOpen: handleMarkAsDoneOpen,
    handleClose: _handleMarkAsDoneClose,
  } = useModal();
  const {
    open: closeOpen,
    handleOpen: handleCloseOpen,
    handleClose: _handleCloseClose,
  } = useModal();

  const [searchParams] = useSearchParams();
  const maintenanceOrderIdRaw = searchParams.get(MAINTENANCE_ORDER_ID_SEARCH_PARAMS);
  const maintenanceOrderId = maintenanceOrderIdRaw ? Number.parseInt(maintenanceOrderIdRaw) : 0;

  const { data: assetStatus, refetch: refetchAssetStatus } = useQuery({
    queryKey: ['get_asset_status', { maintenanceOrderId }] as const,
    queryFn: ({ queryKey }) => getAssetStatus(queryKey[1].maintenanceOrderId),
    enabled: Boolean(maintenanceOrderId),
    meta: {
      toastId: 'get_asset_status',
    },
  });
  const handleStartOpen = () => {
    refetchAssetStatus();
    _handleStartOpen();
  };

  const {
    data: workReport,
    isLoading: isWorkReportLoading,
    refetch: refetchWorkReport,
  } = useQuery({
    queryKey: ['get_work_report', { maintenanceOrderId }] as const,
    queryFn: ({ queryKey }) => getWorkReport(queryKey[1].maintenanceOrderId),
    select: (workReport) => ({
      ...workReport,
      instructions: workReport.instructions.map((instruction) => ({
        ...instruction,
        pdfUrl: instruction.pdfUrl ? getURLExplicit() + instruction.pdfUrl : instruction.pdfUrl,
      })),
    }),
    enabled: Boolean(maintenanceOrderId),
    meta: {
      toastId: 'get_work_report',
    },
  });

  const { data: status, refetch: refetchStatus } = useQuery({
    queryKey: ['get_work_report_status', { maintenanceOrderId }] as const,
    queryFn: ({ queryKey }) => getWorkReportStatus(queryKey[1].maintenanceOrderId),
    enabled: Boolean(maintenanceOrderId),
    meta: {
      toastId: 'get_work_report_status',
    },
  });

  const { data: startedStoppedTs, refetch: refetchStartedStoppedTs } = useQuery({
    queryKey: ['get_work_report_started_stopped_ts', { maintenanceOrderId }] as const,
    queryFn: ({ queryKey }) => getStartedStoppedTs(queryKey[1].maintenanceOrderId),
    enabled: Boolean(maintenanceOrderId),
    meta: {
      toastId: 'get_work_report_started_stopped_ts',
    },
  });

  const queryClient = useQueryClient();
  const invalidateQueries = () => {
    queryClient.invalidateQueries({
      queryKey: getMaintenanceOrderStatusQueryKey(maintenanceOrderId),
    });
    queryClient.invalidateQueries({
      queryKey: ['get-maintenance-order-list'],
    });
  };

  const { mutate: handleStartWorkReport, isPending: isPendingStartWorkReport } = useMutation({
    mutationFn: (isStatusChange: boolean) => startWorkReport(maintenanceOrderId, isStatusChange),
    onSuccess: () => {
      refetchStatus();
      invalidateQueries();
      handleStartClose();
      toast.info(
        `Order #${workReport?.maintenanceName} has been started at ${format(new Date(), 'HH:mm')}.`
      );
    },
  });

  const {
    control: controlPauseWorkReport,
    reset: resetPauseWorkReport,
    handleSubmit: handleSubmitPauseWorkReport,
  } = useForm<TPauseWorkReport>({
    resolver: zodResolver(pauseWorkReportSchema),
    values: {
      maintenanceOrderId,
      reason: '',
    },
  });

  const { mutate: handlePauseWorkReport, isPending: isPendingPauseWorkReport } = useMutation({
    mutationFn: pauseWorkReport,
    onSuccess: () => {
      refetchStatus();
      invalidateQueries();
      handlePauseClose();
      resetPauseWorkReport({
        maintenanceOrderId,
        reason: '',
      });
    },
  });

  const { mutate: handleResumeWorkReport, isPending: isPendingResumeWorkReport } = useMutation({
    mutationFn: () => resumeWorkReport(maintenanceOrderId),
    onSuccess: () => {
      refetchStatus();
      invalidateQueries();
      handleResumeClose();
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    setValue,
    formState: {
      errors: { issueIds: issueIdsError },
    },
  } = useForm<TAddWorkUpdate>({
    resolver: zodResolver(addWorkUpdateSchema),
    values: {
      maintenanceOrderId,
      note: '',
      imageUrls: [],
      issueIds: [],
    },
  });
  const { mutate: handleAddWorkUpdate, isPending: isPendingAddWorkUpdate } = useMutation({
    mutationFn: addWorkUpdate,
    onSuccess: () => {
      refetchStatus();
      reset({
        maintenanceOrderId,
        note: '',
        imageUrls: [],
        issueIds: [],
      });
      toast.success('Your work update has been saved.');
    },
  });
  const handleSubmitAddWorkUpdate = handleSubmit((data) => handleAddWorkUpdate(data));

  const [uploadingImages, setUploadingImages] = useState<
    Record<string, { file: File; progress: number }>
  >({});
  const { mutate: handleUploadImage, isPending: isPendingUploadImage } = useMutation({
    mutationFn: (image: TImage) =>
      uploadImage(image, (progress) => {
        setUploadingImages((prev) => ({
          ...prev,
          [image.name]: { ...prev[image.name], progress },
        }));
      }),
    onSuccess: (imageUrl, variables) => {
      reset((prev) => ({
        ...prev,
        imageUrls: [...prev.imageUrls, imageUrl],
      }));
      setUploadingImages((prev) => {
        const newState = { ...prev };
        delete newState[variables.name];
        return newState;
      });
    },
    onMutate: (variables) => {
      setUploadingImages((prev) => ({
        ...prev,
        [variables.name]: { file: variables, progress: 0 },
      }));
    },
    onError: (_err, variables) => {
      setUploadingImages((prev) => {
        const newState = { ...prev };
        delete newState[variables.name];
        return newState;
      });
    },
  });

  const handleUploadMultipleImages = (images: File[]) => {
    images.forEach((image) => {
      handleUploadImage(image);
    });
  };

  const { mutate: handleDeleteImage } = useMutation({
    mutationFn: deleteImage,
    onSuccess: (data, variables, context) => {
      reset((prev) => ({
        ...prev,
        imageUrls: prev.imageUrls.filter((image) => image.location !== variables),
      }));
    },
  });

  const { hasPermission, username, userData } = useContext(AuthCtx);
  const hasClosePermission = hasPermission('maintenanceorder', 'approve');
  const hasUpdatePermission =
    hasPermission('maintenanceorder', 'report') &&
    (userData?.role === 'superuser' || (workReport?.personnels?.includes(username ?? '') ?? false));

  const { currentIssues, otherIssues } = useMemo(() => {
    const currentIssues = workReport?.issues?.filter((issue) => !issue.isOther) ?? [];
    const otherIssues = workReport?.issues?.filter((issue) => issue.isOther) ?? [];
    return {
      currentIssues,
      otherIssues,
    };
  }, [workReport?.issues]);

  const { currentInstructions, otherInstructions } = useMemo(() => {
    const currentInstructions =
      workReport?.instructions?.filter((instruction) => !instruction.isOther) ?? [];
    const otherInstructions =
      workReport?.instructions?.filter((instruction) => instruction.isOther) ?? [];
    return {
      currentInstructions,
      otherInstructions,
    };
  }, [workReport?.instructions]);

  const [instructions, setInstructions] = useState<{
    currentInstructions: GroupedInstruction[];
    otherInstructions: GroupedInstruction[];
  }>({
    currentInstructions: [],
    otherInstructions: [],
  });
  const [dialogInstructions, setDialogInstructions] = useState<{
    currentInstructions: TIssue[];
    otherInstructions: TIssue[];
  }>({
    currentInstructions: [],
    otherInstructions: [],
  });

  useEffect(() => {
    setInstructions({
      currentInstructions: transformArray(currentInstructions, currentIssues),
      otherInstructions: transformArray(otherInstructions, otherIssues),
    });
  }, [currentInstructions, otherInstructions, currentIssues, otherIssues]);

  useEffect(() => {
    setDialogInstructions({
      currentInstructions: currentIssues
        .map((issue) => [
          {
            codeId: issue.id,
            codeName: issue.name,
            typeId: 1,
            typeName: 'Diagnosis',
            isValid: issue.isValidDiagnostic,
          },
          {
            codeId: issue.id,
            codeName: issue.name,
            typeId: 2,
            typeName: 'Repair',
            isValid: issue.isValidRepair,
          },
        ])
        .flat(1),
      otherInstructions: otherIssues
        .map((issue) => [
          {
            codeId: issue.id,
            codeName: issue.name,
            typeId: 1,
            typeName: 'Diagnosis',
            isValid: issue.isValidDiagnostic,
          },
          {
            codeId: issue.id,
            codeName: issue.name,
            typeId: 2,
            typeName: 'Repair',
            isValid: issue.isValidRepair,
          },
        ])
        .flat(1),
    });
  }, [currentIssues, otherIssues]);

  const [toBeUpdatedIssueValidity, setToBeUpdatedIssueValidity] = useState({
    alarmCodeId: 0,
    instructionTypeId: 0,
    isValid: false,
  });
  const { mutate: mutateUpdateIssueValidity } = useMutation({
    mutationFn: (data: Omit<TUpdateIssueValidity, 'maintenanceOrderId'>) =>
      updateIssueValidity({
        ...data,
        maintenanceOrderId,
      }),
    onSuccess: () => {
      refetchStatus();
      refetchWorkReport();
      handleSetValidityClose();
      setToBeUpdatedIssueValidity({
        alarmCodeId: 0,
        instructionTypeId: 0,
        isValid: false,
      });
    },
  });
  const handleValidityChange = (
    isOther: boolean,
    codeId: number,
    typeId: number,
    isValid: boolean | null
  ) => {
    if (isValid === null) {
      mutateUpdateIssueValidity({
        alarmCodeId: codeId,
        instructionTypeId: typeId,
        isValid: isValid,
      });
    } else {
      setToBeUpdatedIssueValidity({
        alarmCodeId: codeId,
        instructionTypeId: typeId,
        isValid,
      });
      handleSetValidityOpen();
    }
  };
  const handleSubmitValidityChange = () => {
    mutateUpdateIssueValidity(toBeUpdatedIssueValidity);
  };
  const handleSetValidityClose = () => {
    _handleSetValidityClose();
    setToBeUpdatedIssueValidity({
      alarmCodeId: 0,
      instructionTypeId: 0,
      isValid: false,
    });
  };

  const toBeUpdatedIssue = workReport?.issues?.find(
    (issue) => issue.id === toBeUpdatedIssueValidity.alarmCodeId
  );
  const toBeUpdateIssueValidityCodeName = toBeUpdatedIssue?.name;

  const isToBeUpdateIssueValidityDiagnosis = toBeUpdatedIssueValidity.instructionTypeId === 1;

  const isToBeUpdateIssueValidityValid = toBeUpdatedIssueValidity.isValid;

  const [isDialogEdit, setIsDialogEdit] = useState(false);

  const handleDialogValidityChange = (
    isOther: boolean,
    codeId: number,
    typeId: number,
    isValid: boolean | null
  ) => {
    setDialogInstructions((prev) => {
      const key = isOther ? 'otherInstructions' : 'currentInstructions';

      return {
        ...prev,
        [key]: prev[key].map((instruction) => {
          if (instruction.codeId !== codeId) return instruction;

          if (instruction.typeId === typeId)
            return {
              ...instruction,
              isValid,
            };

          //Diagnostic
          if (!isValid && typeId === 1)
            return {
              ...instruction,
              isValid: null,
            };

          if (isValid && typeId === 1 && instruction.typeId === 2)
            return {
              ...instruction,
              isValid: false,
            };

          return instruction;
        }),
      };
    });
  };
  const handleDialogDiscard = () => {
    setIsDialogEdit(false);
    setDialogInstructions({
      currentInstructions: currentIssues
        .map((issue) => [
          {
            codeId: issue.id,
            codeName: issue.name,
            typeId: 1,
            typeName: 'Diagnosis',
            isValid: issue.isValidDiagnostic,
          },
          {
            codeId: issue.id,
            codeName: issue.name,
            typeId: 2,
            typeName: 'Repair',
            isValid: issue.isValidRepair,
          },
        ])
        .flat(1),
      otherInstructions: otherIssues
        .map((issue) => [
          {
            codeId: issue.id,
            codeName: issue.name,
            typeId: 1,
            typeName: 'Diagnosis',
            isValid: issue.isValidDiagnostic,
          },
          {
            codeId: issue.id,
            codeName: issue.name,
            typeId: 2,
            typeName: 'Repair',
            isValid: issue.isValidRepair,
          },
        ])
        .flat(1),
    });
  };

  const handleMarkAsDoneClose = () => {
    _handleMarkAsDoneClose();
    setIsDialogEdit(false);
    setDialogInstructions({
      currentInstructions: currentIssues
        .map((issue) => [
          {
            codeId: issue.id,
            codeName: issue.name,
            typeId: 1,
            typeName: 'Diagnosis',
            isValid: issue.isValidDiagnostic,
          },
          {
            codeId: issue.id,
            codeName: issue.name,
            typeId: 2,
            typeName: 'Repair',
            isValid: issue.isValidRepair,
          },
        ])
        .flat(1),
      otherInstructions: otherIssues
        .map((issue) => [
          {
            codeId: issue.id,
            codeName: issue.name,
            typeId: 1,
            typeName: 'Diagnosis',
            isValid: issue.isValidDiagnostic,
          },
          {
            codeId: issue.id,
            codeName: issue.name,
            typeId: 2,
            typeName: 'Repair',
            isValid: issue.isValidRepair,
          },
        ])
        .flat(1),
    });
  };

  const handleCloseClose = () => {
    _handleCloseClose();
    setIsDialogEdit(false);
    setDialogInstructions({
      currentInstructions: currentIssues
        .map((issue) => [
          {
            codeId: issue.id,
            codeName: issue.name,
            typeId: 1,
            typeName: 'Diagnosis',
            isValid: issue.isValidDiagnostic,
          },
          {
            codeId: issue.id,
            codeName: issue.name,
            typeId: 2,
            typeName: 'Repair',
            isValid: issue.isValidRepair,
          },
        ])
        .flat(1),
      otherInstructions: otherIssues
        .map((issue) => [
          {
            codeId: issue.id,
            codeName: issue.name,
            typeId: 1,
            typeName: 'Diagnosis',
            isValid: issue.isValidDiagnostic,
          },
          {
            codeId: issue.id,
            codeName: issue.name,
            typeId: 2,
            typeName: 'Repair',
            isValid: issue.isValidRepair,
          },
        ])
        .flat(1),
    });
  };

  const { mutate: handleSetStatusToDone, isPending: isPendingSetStatusToDone } = useMutation({
    mutationFn: () =>
      setStatusToDone(maintenanceOrderId, [
        ...dialogInstructions.currentInstructions,
        ...dialogInstructions.otherInstructions,
      ]),
    onSuccess: () => {
      refetchWorkReport();
      refetchStatus();
      invalidateQueries();
      handleMarkAsDoneClose();
      refetchStartedStoppedTs();
      toast.success(
        `Your reports has been submitted at ${format(new Date(), 'HH:mm')}. Nice work!`
      );
    },
  });

  const { mutate: handleCloseWorkReport, isPending: isPendingCloseWorkReport } = useMutation({
    mutationFn: () =>
      closeWorkReport(maintenanceOrderId, [
        ...dialogInstructions.currentInstructions,
        ...dialogInstructions.otherInstructions,
      ]),
    onSuccess: () => {
      refetchWorkReport();
      refetchStatus();
      invalidateQueries();
      handleCloseClose();
      refetchStartedStoppedTs();
      toast.success(`Order #${workReport?.maintenanceName} has been closed.`);
    },
  });

  return {
    workReport,
    status,
    startedStoppedTs,
    startOpen,
    handleStartOpen,
    handleStartClose,
    pauseOpen,
    handlePauseOpen,
    handlePauseClose,
    resumeOpen,
    handleResumeOpen,
    handleResumeClose,
    markAsDoneOpen,
    handleMarkAsDoneOpen,
    handleMarkAsDoneClose,
    closeOpen,
    handleCloseOpen,
    handleCloseClose,
    handleSetStatusToDone,
    handleCloseWorkReport,
    handleStartWorkReport,
    handlePauseWorkReport: handleSubmitPauseWorkReport((data) => handlePauseWorkReport(data)),
    handleResumeWorkReport,
    // handleAddWorkUpdate,
    // workUpdateNote,
    // setWorkUpdateNote,
    handleUploadImage: handleUploadMultipleImages,
    isPendingUploadImage,
    // workUpdateImageUrls,
    handleDeleteImage,
    register,
    handleSubmitAddWorkUpdate,
    isPendingPauseWorkReport,
    isPendingCloseWorkReport,
    isPendingStartWorkReport,
    isPendingSetStatusToDone,
    isPendingResumeWorkReport,
    isPendingAddWorkUpdate,
    watch,
    control,
    controlPauseWorkReport,
    hasClosePermission,
    hasUpdatePermission,
    uploadingImages,
    assetStatus,
    handleChangeIssues: (issueIds: string[]) =>
      setValue(
        'issueIds',
        issueIds.map((issueId) => Number.parseInt(issueId))
      ),
    issueIdsError,
    maintenanceOrderId,
    handleValidityChange,
    currentIssues,
    otherIssues,
    currentInstructions: instructions.currentInstructions,
    otherInstructions: instructions.otherInstructions,
    setValidityOpen,
    handleSetValidityClose,
    toBeUpdateIssueValidityCodeName,
    isToBeUpdateIssueValidityDiagnosis,
    isToBeUpdateIssueValidityValid,
    handleSubmitValidityChange,
    dialogCurrentInstructions: dialogInstructions.currentInstructions,
    dialogOtherInstructions: dialogInstructions.otherInstructions,
    handleDialogValidityChange,
    handleDialogEdit: () => setIsDialogEdit(true),
    handleDialogDiscard,
    handleDialogSave: () => setIsDialogEdit(false),
    isDialogEdit,
  };
};

interface TypeGroup<T> {
  typeName: string;
  typeId: number;
  isValid: boolean | null;
  data: T[];
}

interface CodeGroup<T> {
  codeName: string;
  codeId: number;
  data: TypeGroup<T>[];
}

/**
 * Transforms and sorts the array into a nested structure.
 * @param instructions The source array
 * @returns The nested and ordered array
 */
function transformArray<T extends TInstruction>(
  instructions: T[],
  issues: Omit<TAlarmIssue, 'isOther'>[]
): CodeGroup<Omit<T, 'codeName' | 'typeName' | 'order'>>[] {
  // 1. Sort by order ascending
  const sortedArray = [...instructions].sort((a, b) => a.order - b.order);

  const result = issues.map((issue) => ({
    codeName: issue.name,
    codeId: issue.id,
    data: [
      {
        typeName: 'Diagnosis',
        typeId: 1,
        isValid: issue.isValidDiagnostic,
        data: sortedArray.filter(
          (instruction) => instruction.codeId === issue.id && instruction.typeId === 1
        ),
      },
      {
        typeName: 'Repair',
        typeId: 2,
        isValid: issue.isValidRepair,
        data: sortedArray.filter(
          (instruction) => instruction.codeId === issue.id && instruction.typeId === 2
        ),
      },
    ],
  }));

  return result;
}
