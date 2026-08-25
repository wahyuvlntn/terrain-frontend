import { AuthCtx, useModal } from '@digital-twin/components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useContext, useState } from 'react';
import { useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom';

import { deleteInstruction, getInstructionDetail } from '../api';

export const useInstructionDetail = () => {
  const { hasPermission } = useContext(AuthCtx);
  const hasUpdatePermission = hasPermission('maintenanceinstruction', 'update');
  const hasDeletePermission = hasPermission('maintenanceinstruction', 'delete');
  //@ts-expect-error undefined context
  const { setFilter } = useOutletContext();

  const {
    open: openDelete,
    handleOpen: handleOpenDelete,
    handleClose: handleCloseDelete,
  } = useModal();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [isFullScreen, setIsFullScreen] = useState(!state?.fromList);

  const { instructionId: instructionIdRaw } = useParams<{
    instructionId: string;
  }>();
  const instructionId = Number.parseInt(instructionIdRaw ?? '0') ?? null;

  const { data: instructionDetail, isLoading: isInstructionDetailLoading } = useQuery({
    queryKey: ['get_instruction_detail', { instructionId }] as const,
    queryFn: ({ queryKey }) => getInstructionDetail(queryKey[1].instructionId ?? 0),
    enabled: !!instructionId,
    meta: {
      toastId: ['get_instruction_detail'],
    },
  });

  const { mutate: handleDeleteInstruction, isPending: isPendingDeleteInstruction } = useMutation({
    mutationFn: () => deleteInstruction(instructionId),
    onSuccess: () => {
      handleCloseDelete();
      queryClient.invalidateQueries({
        queryKey: ['get_instruction_list'],
      });
      navigate('..');
      //@ts-expect-error unknown filter type
      setFilter((prev) => ({
        ...prev,
        page: 1,
      }));
    },
  });

  const handleToggleFullScreenClick = () => {
    setIsFullScreen((prev) => !prev);
  };

  return {
    isInstructionDetailLoading,
    instructionDetail,
    handleToggleFullScreenClick,
    isFullScreen,
    openDelete,
    handleCloseDelete,
    handleOpenDelete,
    handleDeleteInstruction,
    isPendingDeleteInstruction,
    hasUpdatePermission,
    hasDeletePermission,
  };
};
