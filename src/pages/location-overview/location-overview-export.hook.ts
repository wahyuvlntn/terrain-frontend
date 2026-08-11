import { toast } from '@digital-twin/reusables';
import { exportToExcel, t } from '@digital-twin/utils';
import { useQueryClient } from '@tanstack/react-query';
import excel from 'exceljs';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { getLocationExport } from './api/location-overview.api';

export const addTab = (locationName: string, hierarchy: number) => {
  return '   '.repeat(hierarchy) + locationName;
};

export const useLocationOverviewExport = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const startDate = searchParams.get('start');
  const endDate = searchParams.get('end');
  const locationId = searchParams.get('location_id') ?? null;

  const handleExportFile = async () => {
    const workSheets: {
      sheetName: string;
      rows: unknown[];
      skipHeader?: boolean;
      columns: ({ header?: string } & Omit<Partial<excel.Column>, 'header'>)[];
    }[] = [];

    try {
      setLoading(true);
      const locationOverviewData = await queryClient.ensureQueryData({
        queryKey: [
          'getLocationExport' + 'EXPORT',
          {
            startDate,
            endDate,
            locationId,
          },
        ],
        queryFn: async () => {
          if (!startDate || !endDate) return null;
          return await getLocationExport(
            startDate,
            endDate,
            locationId ? parseInt(locationId) : null,
            new Date().getTimezoneOffset()
          );
        },
        meta: {
          toastId: [
            'getLocationExport' + 'EXPORT',
            {
              startDate,
              endDate,
              locationId,
            },
          ],
        },
      });

      if (locationOverviewData)
        workSheets.push({
          sheetName: t('common.location_overview'),
          columns: [
            { key: 'locationName', header: t('common.location_name') },
            { key: 'equipmentCount', header: t('common.equipment_count') },
            { key: 'oee', header: 'OEE' },
            { key: 'availability', header: t('common.availability') },
            { key: 'performance', header: t('common.performance') },
            { key: 'quality', header: t('common.quality') },
            { key: 'availabilityTh', header: t('common.availability_threshold') },
            { key: 'performanceTh', header: t('common.performance_threshold') },
            { key: 'qualityTh', header: t('common.quality_threshold') },
            { key: 'running', header: t('common.running') },
            { key: 'idle', header: t('common.idle') },
            { key: 'plannedDown', header: t('common.planned_down') },
            { key: 'unplannedDown', header: t('common.unplanned_down') },
            { key: 'offline', header: t('common.offline') },
            { key: 'normal', header: t('common.normal') },
            { key: 'warning', header: t('common.warning') },
            { key: 'critical', header: t('common.critical') },
          ],
          skipHeader: true,
          rows: locationOverviewData.map((locationData) => ({
            locationName: addTab(locationData.name, locationData.hierarchyLevel),
            equipmentCount: locationData.totalAssets,
            oee:
              locationData.totalAvailability === null ||
              locationData.totalQuality === null ||
              locationData.totalPerformance === null
                ? '---'
                : (locationData.totalAvailability *
                    locationData.totalQuality *
                    locationData.totalPerformance) /
                  10000,
            availability: locationData.totalAvailability,
            performance: locationData.totalPerformance,
            quality: locationData.totalQuality,
            availabilityTh: locationData.availabilityTh,
            performanceTh: locationData.performanceTh,
            qualityTh: locationData.qualityTh,
            running: locationData.totalRunning,
            idle: locationData.totalIdle,
            plannedDown: locationData.totalPlannedDown,
            unplannedDown: locationData.totalUnplannedDown,
            offline: locationData.totalOffline,
            normal: locationData.totalNormal,
            warning: locationData.totalWarning,
            critical: locationData.totalCritical,
          })),
        });

      await exportToExcel({
        workSheets: workSheets,
        start: new Date(startDate as string),
        end: new Date(endDate as string),
        fileName: t('common.location_overview_report'),
      });
    } catch (error) {
      const err = error as Error;
      setLoading(false);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { loading, handleExportFile, setSearchParams };
};
