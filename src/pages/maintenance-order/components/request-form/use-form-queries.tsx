import { COLOR } from '@digital-twin/components';
import { Corrective, Preventive } from '@digital-twin/icons';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  getBuildings,
  getEquipments,
  getFloors,
  getMaintenanceInstructions,
  getMaintenanceOrderTypes,
  getPriorities,
  getRepeatBy,
  getRooms,
  getSeverities,
  getTechnicians,
} from '../../api/maintenance-order';
import { RenderMaintenanceSeverity } from '../maintenance-order-card';

interface UseFormQueriesParams {
  buildingId: string;
  floorId: string;
  roomId: string;
  equipmentId: string;
  plannedStartDate: string;
  plannedStartTime: string;
  plannedFinishDate: string;
  plannedFinishTime: string;
  maintenanceId?: string | number;
  isAdding: boolean;
}

export const useFormQueries = ({
  buildingId,
  floorId,
  roomId,
  equipmentId,
  plannedStartDate,
  plannedStartTime,
  plannedFinishDate,
  plannedFinishTime,
  maintenanceId,
  isAdding,
}: UseFormQueriesParams) => {
  // MAINTENANCE ORDER TYPES
  const maintenanceOrderTypeQuery = useQuery({
    queryKey: ['get-maintenance-order-type'],
    queryFn: () => {
      return getMaintenanceOrderTypes();
    },
  });

  const maintenanceOrderOptions = useMemo(() => {
    return (
      maintenanceOrderTypeQuery.data?.map((data) => {
        return {
          value: data.value,
          label: data.label[0] + data.label.slice(1).toLowerCase(),
          prefix:
            data.label === 'CORRECTIVE' ? (
              <Corrective width={20} height={20} />
            ) : (
              <Preventive width={20} height={20} />
            ),
        };
      }) || []
    );
  }, [maintenanceOrderTypeQuery.data]);

  // BUILDINGS
  const buildingQuery = useQuery({
    queryKey: ['get-buildings'],
    queryFn: () => {
      return getBuildings();
    },
  });

  const buildingOptions = useMemo(() => {
    return buildingQuery.data || [];
  }, [buildingQuery.data]);

  // FLOORS
  const floorQuery = useQuery({
    queryKey: ['get-floors', buildingId],
    queryFn: () => {
      return getFloors({
        building_id: Number(buildingId),
      });
    },
  });

  const floorOptions = useMemo(() => {
    return floorQuery.data || [];
  }, [floorQuery.data]);

  // ROOMS
  const roomQuery = useQuery({
    queryKey: ['get-rooms', floorId],
    queryFn: () => {
      return getRooms({
        floor_id: Number(floorId),
      });
    },
  });

  const roomOptions = useMemo(() => {
    return roomQuery.data || [];
  }, [roomQuery.data]);

  // EQUIPMENTS
  const equipmentQuery = useQuery({
    queryKey: ['get-equipments', roomId],
    queryFn: () => {
      return getEquipments({
        room_id: Number(roomId),
      });
    },
  });

  const equipmentOptions = useMemo(() => {
    return equipmentQuery.data || [];
  }, [equipmentQuery.data]);

  // REPEAT BY
  const repeatByQuery = useQuery({
    queryKey: ['get-repeat-by'],
    queryFn: () => {
      return getRepeatBy();
    },
  });

  const repeatByOptions = useMemo(() => {
    const options =
      repeatByQuery.data?.map((data) => {
        return {
          value: data.value,
          label: data.label[0] + data.label.slice(1).toLowerCase(),
        };
      }) || [];
    return [{ value: '', label: 'Not Repeat' }, ...options];
  }, [repeatByQuery.data]);

  // PRIORITIES (for SPV view)
  const priorityQuery = useQuery({
    queryKey: ['get-priorities'],
    queryFn: () => {
      return getPriorities();
    },
    enabled: !isAdding,
  });

  const priorityOptions = useMemo(() => {
    return (
      priorityQuery.data?.map((data) => ({
        label: data.label[0] + data.label.slice(1).toLowerCase(),
        value: data.value,
        prefix: (
          <div
            style={{
              width: 12,
              height: 12,
              border: `1px solid ${COLOR.neutralTextTitleHeading}`,
              borderRadius: '50%',
              backgroundColor:
                data.label === 'HIGH'
                  ? COLOR.conditionCriticalSecondary
                  : data.label === 'MEDIUM'
                    ? COLOR.conditionWarningPrimary
                    : data.label === 'LOW'
                      ? COLOR.conditionNormalPrimary
                      : 'transparent',
            }}
          ></div>
        ),
      })) || []
    );
  }, [priorityQuery.data]);

  // SEVERITIES
  const severityQuery = useQuery({
    queryKey: ['get-severities'],
    queryFn: () => {
      return getSeverities();
    },
  });

  const severityOptions = useMemo(() => {
    return severityQuery.data?.map((data) => ({
      label: data.label[0] + data.label.slice(1).toLowerCase(),
      value: data.value,
      prefix: (
        <RenderMaintenanceSeverity
          severity={data.label as 'HIGH' | 'MEDIUM' | 'LOW' | 'CRITICAL'}
          simple={true}
        />
      ),
    }));
  }, [severityQuery.data]);

  // INSTRUCTIONS
  const instructionsQuery = useQuery({
    queryKey: ['get-instructions', equipmentId],
    queryFn: () => {
      return getMaintenanceInstructions({
        asset_id: equipmentId ? Number(equipmentId) : 0,
      });
    },
  });

  const instructionOptions = useMemo(() => {
    return (
      instructionsQuery.data?.map((data) => ({
        label: data.label,
        value: data.value,
      })) || []
    );
  }, [instructionsQuery.data]);

  const instructionDuration = useMemo(() => {
    return instructionsQuery.data?.map((data) => ({
      duration: data.estimated_time_minute,
      value: data.value,
    }));
  }, [instructionsQuery.data]);

  // TECHNICIANS
  const techniciansQuery = useQuery({
    queryKey: [
      'get-technicians',
      buildingId,
      equipmentId,
      plannedStartDate,
      plannedStartTime,
      plannedFinishDate,
      plannedFinishTime,
    ],
    queryFn: () => {
      return getTechnicians({
        building_id: Number(buildingId),
        equipment_id: Number(equipmentId),
        maintenance_id: maintenanceId ? Number(maintenanceId) : 0,
        planned_start:
          plannedStartDate && plannedStartTime
            ? new Date(`${plannedStartDate} ${plannedStartTime}`).toISOString()
            : null,
        planned_end:
          plannedFinishDate && plannedFinishTime
            ? new Date(`${plannedFinishDate} ${plannedFinishTime}`).toISOString()
            : null,
      });
    },
  });

  const allTechniciansQuery = useQuery({
    queryKey: [
      'get-all-technicians',
      buildingId,
      equipmentId,
      plannedStartDate,
      plannedStartTime,
      plannedFinishDate,
      plannedFinishTime,
    ],
    queryFn: () => {
      return getTechnicians({
        building_id: null,
        equipment_id: Number(equipmentId),
        maintenance_id: maintenanceId ? Number(maintenanceId) : 0,
        planned_start:
          plannedStartDate && plannedStartTime
            ? new Date(`${plannedStartDate} ${plannedStartTime}`).toISOString()
            : null,
        planned_end:
          plannedFinishDate && plannedFinishTime
            ? new Date(`${plannedFinishDate} ${plannedFinishTime}`).toISOString()
            : null,
      });
    },
  });

  const technicianOptions = useMemo(() => {
    return (
      techniciansQuery.data?.map((data) => ({
        label: data.label,
        value: data.value,
      })) || []
    );
  }, [techniciansQuery.data]);

  const allTechnicianOptions = useMemo(() => {
    return (
      allTechniciansQuery.data?.map((data) => ({
        label: data.label,
        value: data.value,
      })) || []
    );
  }, [techniciansQuery.data]);

  return {
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
    instructionsQuery,
    allTechnicianOptions,
  };
};
