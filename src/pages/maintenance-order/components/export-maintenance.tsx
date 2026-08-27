import { Button, useExtractFilter } from '@digital-twin/components';
import { ExportNotesIcon, toast } from '@digital-twin/reusables';
import { exportToExcel } from '@digital-twin/utils';
import { format } from 'date-fns';
import { useState } from 'react';

import { getMaintenanceExportData } from '../api/maintenance-order';
import { GeneralFilterType, MaintenanceOrderFilterType } from '../type';

export const ExportMaintenanceButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { filter, data } = useExtractFilter<GeneralFilterType, MaintenanceOrderFilterType>();

  const handleExportMaintenance = async () => {
    setIsLoading(true);
    try {
      const startTime = filter.start ? new Date(filter.start) : new Date();
      startTime.setHours(0, 0, 0);

      const endTime = filter.end ? new Date(filter.end) : new Date();
      endTime.setDate(endTime.getDate() + 1);
      endTime.setHours(0, 0, 0);

      const excelEndTime = filter.end ? new Date(filter.end) : new Date();

      const exportData = await getMaintenanceExportData({
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        filter: JSON.stringify(data),
      });

      const tableData = exportData.map((item) => ({
        no: item.no,
        order_id: item.order_id,
        planned_start: item.planned_start
          ? format(new Date(item.planned_start), 'dd MMM yyyy, HH:mm')
          : '',
        planned_finish: item.planned_end
          ? format(new Date(item.planned_end), 'dd MMM yyyy, HH:mm')
          : '',
        maintenance_type: item.maintenance_type,
        priority: item.priority,
        issue: item.issue ?? '',
        severity: item.severity,
        building: item.building,
        floor: item.floor,
        room: item.room,
        equipment: item.equipment,
        status: item.status,
        requested_by: item.requested_by,
        technician: item.technician,
      }));

      await exportToExcel({
        fileName: 'maintenance_report',
        start: startTime,
        end: excelEndTime,
        workSheets: [
          {
            sheetName: 'Maintenance Report',
            skipHeader: false,
            columns: [
              { key: 'no', header: 'No', width: 50 },
              { key: 'order_id', header: 'Order ID' },
              { key: 'planned_start', header: 'Planned Start' },
              { key: 'planned_finish', header: 'Planned Finish' },
              { key: 'maintenance_type', header: 'Maintenance Type' },
              { key: 'priority', header: 'Maintenance Priority' },
              { key: 'issue', header: 'Issue' },
              { key: 'severity', header: 'Severity' },
              { key: 'building', header: 'Building' },
              { key: 'floor', header: 'Floor' },
              { key: 'room', header: 'Room' },
              { key: 'equipment', header: 'Equipment' },
              { key: 'status', header: 'Status' },
              { key: 'requested_by', header: 'Requested By' },
              { key: 'technician', header: 'Technician' },
            ],
            rows: tableData,
          },
        ],
      });
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button icon={<ExportNotesIcon />} isLoading={isLoading} onClick={handleExportMaintenance}>
      Export
    </Button>
  );
};
