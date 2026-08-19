import { AuthCtx, Loading } from '@digital-twin/components';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useContext, useEffect, useMemo, useState } from 'react';
import { GroupedInstruction, MaintenanceInstructionList } from '../../../components';
import {
  changeAlarmValidity,
  getInstructionList,
  MaintenanceOrderOverview,
} from '../api/early-warning-and-diagnostics';

export const MaintenanceInstructionSection = ({
  maintenanceOrder,
}: {
  maintenanceOrder: MaintenanceOrderOverview;
}) => {
  const { data: instructionData, isFetching } = useQuery({
    queryKey: ['getInstructionList', maintenanceOrder.id] as const,
    queryFn: () => getInstructionList(maintenanceOrder.id),
    enabled: !!maintenanceOrder.id,
    meta: {
      toastId: 'getInstructionList',
    },
  });

  const [instructions, setInstructions] = useState<GroupedInstruction[]>([]);
  const [otherInstructions, setOtherInstructions] = useState<GroupedInstruction[]>([]);

  useEffect(() => {
    if (instructionData?.instructions) {
      setInstructions(instructionData.instructions);
    }
  }, [instructionData?.instructions]);

  useEffect(() => {
    if (instructionData?.otherInstructions) {
      setOtherInstructions(instructionData.otherInstructions);
    }
  }, [instructionData?.otherInstructions]);

  const handleValidityChange = (
    isOther: boolean,
    codeId: number,
    typeId: number,
    isValid: boolean | null
  ) => {
    const updateInstructions = (prev: GroupedInstruction[]) =>
      prev.map((group) =>
        group.codeId === codeId
          ? {
              ...group,
              data: group.data.map((type) =>
                type.typeId === typeId ? { ...type, isValid } : type
              ),
            }
          : group
      );

    if (isOther) {
      setOtherInstructions(updateInstructions);
    } else {
      setInstructions(updateInstructions);
    }
  };

  const { username: created_by } = useContext(AuthCtx);
  const queryClient = useQueryClient();

  const { mutate } = useMutation({
    mutationKey: ['changeAlarmValidity'],
    mutationFn: changeAlarmValidity,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['getInstructionList', maintenanceOrder.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['get-maintenance-order-progress', maintenanceOrder.id],
      });
    },
    meta: {
      toastId: 'changeAlarmValidity',
    },
  });

  const handleSave = () => {
    const allGroups = [...instructions, ...otherInstructions];

    const initialGroups = [
      ...(instructionData?.instructions ?? []),
      ...(instructionData?.otherInstructions ?? []),
    ];
    const initialMap = new Map(initialGroups.map((g) => [g.codeId, g]));

    const changedValidities: {
      maintenance_id: number;
      event: string;
      attributes: Record<string, unknown>;
    }[] = [];

    const alarmCodes = allGroups.map((group, i) => {
      const diagnosis = group.data.find((d) => d.typeName === 'Diagnosis');
      const repair = group.data.find((d) => d.typeName === 'Repair');

      const initialGroup = initialMap.get(group.codeId);
      const initialDiagnosis = initialGroup?.data.find((d) => d.typeName === 'Diagnosis');
      const initialRepair = initialGroup?.data.find((d) => d.typeName === 'Repair');

      if (diagnosis?.isValid !== initialDiagnosis?.isValid) {
        changedValidities.push({
          maintenance_id: maintenanceOrder.id,
          event: `Diagnostic | ${group.codeName}`,
          attributes: {
            Issue: [{ no: i + 1, label: group.codeName }],
            diagnosis: diagnosis?.isValid || null,
            is_other: otherInstructions.some((inst) => inst.codeId === group.codeId),
          },
        });
      }

      if (repair?.isValid !== initialRepair?.isValid) {
        changedValidities.push({
          maintenance_id: maintenanceOrder.id,
          event: `Repair | ${group.codeName}`,
          attributes: {
            Issue: [{ no: i + 1, label: group.codeName }],
            repair: repair?.isValid || null,
            is_other: otherInstructions.some((inst) => inst.codeId === group.codeId),
          },
        });
      }

      return {
        id: group.codeId,
        name: group.codeName,
        is_valid_diagnostic: diagnosis?.isValid ?? null,
        is_valid_repair: repair?.isValid ?? null,
      };
    });

    mutate({
      maintenance_id: maintenanceOrder.id,
      alarm_codes: JSON.stringify(alarmCodes),
      changed_validities: JSON.stringify(changedValidities),
      created_by: created_by ?? '',
    });
  };

  const { username, userData } = useContext(AuthCtx);

  const isMaintenanceSPV = useMemo(() => {
    return username === maintenanceOrder.approved_by;
  }, [JSON.stringify(maintenanceOrder), username]);

  const isMaintenanceTech = useMemo(() => {
    if (userData) return maintenanceOrder.assignee.split(', ').includes(userData?.fullName);
  }, [JSON.stringify(maintenanceOrder), JSON.stringify(userData)]);

  const disableEdit = useMemo(() => {
    return maintenanceOrder.status === 'REQUESTED' || maintenanceOrder.status === 'OPEN';
  }, [JSON.stringify(maintenanceOrder)]);

  const enableEdit = useMemo(() => {
    return (
      isMaintenanceSPV ||
      ((maintenanceOrder.status === 'IN_PROGRESS' || maintenanceOrder.status === 'PAUSED') &&
        isMaintenanceTech)
    );
  }, [JSON.stringify(maintenanceOrder)]);

  const disabled = disableEdit || !enableEdit;

  return (
    <>
      <Loading isLoading={isFetching} />
      <MaintenanceInstructionList
        instructions={instructions}
        otherInstructions={otherInstructions}
        hasOtherInstructions={instructionData?.hasOtherInstructions ?? false}
        onValidityChange={handleValidityChange}
        estimatedTime={instructionData?.estimatedTime ?? undefined}
        showSaveBtn={!disabled}
        onSave={handleSave}
        useDropdownAsValidityInput
        useIconForTitle
        disabled={disableEdit || !enableEdit}
      />
    </>
  );
};
