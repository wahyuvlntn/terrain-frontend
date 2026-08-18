import { Button, useExtractFilter } from '@digital-twin/components';
import { ExportNotesIcon, toast } from '@digital-twin/reusables';
import { exportToExcel } from '@digital-twin/utils';
import { useState } from 'react';

import { getEarlyWarningExportData } from '../api/early-warning-and-diagnostics';
import { EarlyWarningFilterType, GeneralFilterType } from '../type';

export const ExportEarlyWarning = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { filter, data } = useExtractFilter<GeneralFilterType, EarlyWarningFilterType>();

  const handleExportEarlyWarning = async () => {
    setIsLoading(true);
    try {
      const startTime = filter.start ? new Date(filter.start) : new Date();
      startTime.setHours(0, 0, 0);

      const endTime = filter.end ? new Date(filter.end) : new Date();
      endTime.setDate(endTime.getDate() + 1);
      endTime.setHours(0, 0, 0);

      const excelEndTime = filter.end ? new Date(filter.end) : new Date();

      const exportData = await getEarlyWarningExportData({
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        filter: JSON.stringify(data),
      });

      const tableData = exportData.map((item, index) => ({
        no: index + 1,
        order_id: item.order_id,
        planned_start: item.planned_start,
        planned_finish: item.planned_finish,
        detected_issue: item.detected_issue,
        other_possible_issue: item.other_possible_issue,
        related_parameter: item.related_parameter,
        diagnostic_result: item.diagnostic_result,
        repair_result: item.repair_result,
        severity: item.severity,
        building: item.building,
        floor: item.floor,
        room: item.room,
        equipment: item.equipment,
        status: item.status,
        technician: item.technician,
      }));

      await exportToExcel({
        fileName: 'early_warning_diagnostics_report',
        start: startTime,
        end: excelEndTime,
        workSheets: [
          {
            sheetName: 'Early Warning Diagnostics',
            skipHeader: false,
            columns: [
              { key: 'no', header: 'No', width: 50 },
              { key: 'order_id', header: 'Order ID' },
              { key: 'planned_start', header: 'Planned Start' },
              { key: 'planned_finish', header: 'Planned Finish' },
              { key: 'detected_issue', header: 'Detected Issue' },
              { key: 'other_possible_issue', header: 'Other Possible Issue' },
              { key: 'related_parameter', header: 'Related Parameter' },
              { key: 'diagnostic_result', header: 'Diagnostic Result' },
              { key: 'repair_result', header: 'Repair Result' },
              { key: 'severity', header: 'Severity' },
              { key: 'building', header: 'Building' },
              { key: 'floor', header: 'Floor' },
              { key: 'room', header: 'Room' },
              { key: 'equipment', header: 'Equipment' },
              { key: 'status', header: 'Status' },
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
    <Button icon={<ExportNotesIcon />} isLoading={isLoading} onClick={handleExportEarlyWarning}>
      Export
    </Button>
  );
};
