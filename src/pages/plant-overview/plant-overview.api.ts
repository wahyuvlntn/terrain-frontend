import { jsRequest } from '@digital-twin/utils';
import { z } from 'zod';

const equipmentSchema = z.object({
  total: z.number(),
  running: z.number(),
  idle: z.number(),
  plannedDown: z.number(),
  unplannedDown: z.number(),
  offline: z.number(),
  normal: z.number(),
  warning: z.number(),
  critical: z.number(),
});

const alarmsSchema = z.object({
  alarmCritical: z.number(),
  alarmWarning: z.number(),
  abnormalCritical: z.number(),
  abnormalWarning: z.number(),
  activeAlarm: z.number(),
  activeAbnormal: z.number(),
});

const maintenanceSchema = z.object({
  requested: z.number(),
  open: z.number(),
  inProgress: z.number(),
  paused: z.number(),
  done: z.number(),
  closed: z.number(),
  rejected: z.number(),
  total: z.number(),
});

const countsSchema = z.object({
  equipment: equipmentSchema,
  alarms: alarmsSchema,
  maintenance: maintenanceSchema,
});

const plantOverviewSchema = z.object({
  path: z.array(z.object({ locationId: z.number(), locationName: z.string() })),
  summary: countsSchema,
  data: z.array(
    countsSchema.extend({
      locationId: z.number(),
      locationName: z.string(),
      locationImagePath: z.string(),
      childCount: z.number(),
    })
  ),
});

export type PlantCounts = z.infer<typeof countsSchema>;
export type PlantOverview = z.infer<typeof plantOverviewSchema>;
export type PlantLocation = PlantOverview['data'][number];

/**
 * Current equipment statuses / conditions, alarms of the period (by type and severity, plus the
 * open ones) and maintenance orders planned in the period (by status) of a location and each of
 * its children. No location: the top-most locations of the plant.
 */
export const getPlantOverview = async (params: {
  locationId: number | null;
  start: string;
  end: string;
  search: string;
}): Promise<PlantOverview> => {
  const data = await jsRequest({
    url: '/location_overview/getplantoverview',
    data: {
      location_id: params.locationId,
      start: params.start,
      end: params.end,
      search_filter: params.search,
      timezone_offset: new Date().getTimezoneOffset(),
    },
  });
  return plantOverviewSchema.parse(data);
};
