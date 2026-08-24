import { zodResolver } from '@hookform/resolvers/zod';
import { useModal } from '@digital-twin/components';
import { getURL } from '@digital-twin/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import {
  createInstruction,
  getAlarmCodes,
  getInstructionDetail,
  getInstructionTypes,
  getModels,
  instructionDetailSchema,
  pdfSchema,
  TInstructionDetail,
  TPdf,
  updateInstruction,
  uploadMedia,
  uploadPdf,
} from '../api';

export const useInstructionForm = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    open: cancelOpen,
    handleOpen: handleCancelOpen,
    handleClose: handleCancelClose,
  } = useModal();

  const {
    open: createOpen,
    handleChange: handleCreateOpen,
    handleClose: handleCreateClose,
  } = useModal();

  const {
    open: updateOpen,
    handleChange: handleUpdateOpen,
    handleClose: handleUpdateClose,
  } = useModal();

  const [isOpenImportPdf, setIsOpenImportPdf] = useState(false);
  const handleOpenImportPdf = () => {
    setIsOpenImportPdf(true);
  };

  const { data: alarmCodes } = useQuery({
    queryKey: ['get_alarm_codes'],
    queryFn: getAlarmCodes,
    meta: {
      toastId: ['get_alarm_codes'],
    },
  });

  const { data: instructionTypes } = useQuery({
    queryKey: ['get_instruction_types'],
    queryFn: getInstructionTypes,
    meta: {
      toastId: ['get_instruction_types'],
    },
  });

  const { data: models } = useQuery({
    queryKey: ['get_models'],
    queryFn: getModels,
    meta: {
      toastId: ['get_models'],
    },
  });

  const { instructionId: instructionIdRaw } = useParams<{
    instructionId: string;
  }>();
  const isCreate = !instructionIdRaw;
  const instructionId = isCreate ? null : Number.parseInt(instructionIdRaw ?? '0');

  const {
    data: instructionDetail,
    isLoading: isInstructionDetailLoading,
    refetch: refetchInstructionDetail,
  } = useQuery({
    queryKey: ['get_instruction_detail', { instructionId }] as const,
    queryFn: ({ queryKey }) => getInstructionDetail(queryKey[1].instructionId ?? 0),
    enabled: !!instructionId,
    meta: {
      toastId: ['get_instruction_detail'],
    },
  });

  const {
    reset,
    handleSubmit,
    watch,
    setValue,
    control,
    trigger,
    formState: {
      errors: { modelIds: modelIdsError, alarmCodeId: alarmCodeIdError },
    },
  } = useForm<TInstructionDetail>({
    resolver: zodResolver(
      instructionDetailSchema.extend({
        alarmCodeId: z.coerce.number(),
      })
    ),
    values: instructionDetail,
    defaultValues: {
      // duration: 15,
      updatedAt: null,
      createdBy: '',
      title: '',
      description: '',
      content: '',
      isUsingPdf: false,
      pdfUrl: null,
      assetNames: [],
      id: 0,
      // instructionTypeId: 1,
      modelIds: [],
      createdAt: undefined,
      pdfName: '',
      instructionTypeName: '',
      alarmCodeFullName: '',
      alarmCodeId: undefined,
    },
  });

  const {
    watch: pdfWatch,
    setValue: pdfSetValue,
    reset: pdfReset,
  } = useForm<{
    file: TPdf;
  }>({
    resolver: zodResolver(
      z.object({
        file: pdfSchema,
      })
    ),
  });
  const pdfValue = pdfWatch('file');

  const { mutate: handleCreateInstruction, isPending: isPendingCreateInstruction } = useMutation({
    mutationFn: createInstruction,
    onSuccess: (instructionId) => {
      handleCreateClose();
      queryClient.invalidateQueries({
        queryKey: ['get_instruction_list'],
      });
      navigate(`../${instructionId}`);
    },
  });

  const { mutate: handleUpdateInstruction, isPending: isPendingUpdateInstruction } = useMutation({
    mutationFn: updateInstruction,
    onSuccess: () => {
      handleUpdateClose();
      refetchInstructionDetail();
      queryClient.invalidateQueries({
        queryKey: ['get_instruction_list'],
      });
      navigate('..', { relative: 'path' });
    },
  });

  const { mutate: handleUploadPdf, isPending: isPendingUploadPdf } = useMutation({
    mutationFn: uploadPdf,
    onSuccess: (pdf) => {
      setIsOpenImportPdf(false);
      reset((prev) => ({
        ...prev,
        isUsingPdf: true,
        pdfUrl: pdf.url,
        pdfName: pdf.name,
      }));
    },
  });

  const handleCloseImportPdf = () => {
    setIsOpenImportPdf(false);
    pdfReset();
  };

  const handleSubmitPdf = () => {
    handleUploadPdf(pdfValue);
  };

  const { mutateAsync: handleUploadMedia, isPending: isPendingUploadMedia } = useMutation({
    mutationFn: (data: File) => uploadMedia(data).then((url) => `${getURL()}${url}`),
  });

  const handleCancel = () => {
    handleCancelClose();
    navigate('..', { relative: 'path' });
  };

  return {
    instructionDetail,
    isInstructionDetailLoading,
    handleSubmitUpdate: handleSubmit(
      (data) => handleUpdateInstruction(data),
      (err) => console.log(err)
    ),
    handleSubmitCreate: handleSubmit(
      (data) => handleCreateInstruction(data),
      (err) => console.log(err)
    ),
    handleOpenImportPdf,
    handleCloseImportPdf,
    isOpenImportPdf,
    isPendingUploadPdf,
    handleUploadPdf,
    alarmCodes,
    models,
    instructionTypes,
    isCreate,
    handleUploadMedia,
    isPendingUploadMedia,
    pdfValue,
    handlePdfChange: (file: File) => pdfSetValue('file', file),
    handleSubmitPdf,
    handleCancel,
    handleCreateClose,
    handleCreateOpen: () => trigger().then(handleCreateOpen),
    createOpen,
    cancelOpen,
    handleCancelOpen,
    handleCancelClose,
    handleUpdateClose,
    handleUpdateOpen: () => trigger().then(handleUpdateOpen),
    updateOpen,
    isPendingCreateInstruction,
    isPendingUpdateInstruction,
    watch,
    setValue,
    control,
    modelIdsError,
    alarmCodeIdError,
  };
};
