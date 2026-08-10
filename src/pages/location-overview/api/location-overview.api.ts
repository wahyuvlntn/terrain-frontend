import { jsRequest } from '@digital-twin/utils';
import { z } from 'zod';

export const locationDetailSchema = z.object({
  availabilityTh: z.number(),
  locationId: z.number(),
  locationImagePath: z.string(),
  locationName: z.string(),
  performanceTh: z.number(),
  qualityTh: z.number(),
  totalAsset: z.number(),
  totalCriticalAsset: z.number(),
  totalIdleAsset: z.number(),
  totalNormalAsset: z.number(),
  totalPlannedDownAsset: z.number(),
  totalRunningAsset: z.number(),
  totalUnplannedDownAsset: z.number(),
  totalOfflineAsset: z.number(),
  totalWarningAsset: z.number(),
  isLastChild: z.boolean(),
});

export const locationOverviewSchema = z.object({
  count: z.number(),
  data: z.array(locationDetailSchema).nullable(),
});

//TODO: remove this since it's not used anywhere
// export const locationAncestorSchema = z.object({
//   breadCrumbOrder: z.array(z.number()),
//   locationId: z.number(),
// });

export const locationSchema = z.object({
  locationId: z.number().nullable(),
  locationName: z.string(),
  parentId: z.number().nullable(),
  availabilityTh: z.number(),
  performanceTh: z.number(),
  qualityTh: z.number(),
  locationImagePath: z.string(),
  hierarchy: z.number(),
});

export const locationAPQSchema = z.object({
  totalAvailability: z.number().nullable(),
  totalUptime: z.number().nullable(),
  totalPerformance: z.number().nullable(),
  totalQuality: z.number().nullable(),
  performanceGood: z.boolean(),
  availabilityGood: z.boolean(),
  qualityGood: z.boolean(),
});

export const locationExportSchema = z.object({
  availabilityGood: z.boolean(),
  availabilityTh: z.number(),
  hierarchyLevel: z.number(),
  id: z.number(),
  name: z.string(),
  parentId: z.number().nullable(),
  performanceGood: z.boolean(),
  performanceTh: z.number(),
  qualityGood: z.boolean(),
  qualityTh: z.number(),
  totalAssets: z.number(),
  totalAvailability: z.number().nullable(),
  totalCritical: z.number(),
  totalIdle: z.number(),
  totalNormal: z.number(),
  totalOffline: z.number(),
  totalPerformance: z.number().nullable(),
  totalPlannedDown: z.number(),
  totalQuality: z.number().nullable(),
  totalRunning: z.number(),
  totalUnplannedDown: z.number(),
  totalUptime: z.number().nullable(),
  totalWarning: z.number(),
});

export type LocationOverviewType = z.infer<typeof locationOverviewSchema>;
export type LocationAPQType = z.infer<typeof locationAPQSchema>;
export type LocationType = z.infer<typeof locationSchema>;
export type LocationExportType = z.infer<typeof locationExportSchema>;

export const getLocationOverview = async (
  locationId: number | null,
  page: number,
  searchFilter: string
): Promise<LocationOverviewType | null> => {
  const data = await jsRequest({
    url: `/location_overview/getdirectchildbylocationid`,
    data: {
      location_id: locationId,
      page,
      search_filter: searchFilter,
    },
  });
  return locationOverviewSchema.parse(data);
};

export const getLocationAPQ = async (
  locationId: number | null,
  start: string,
  end: string,
  timezoneOffset: number
): Promise<LocationAPQType | null> => {
  const data = await jsRequest({
    url: `/location_overview/getlocationAPQ`,
    data: {
      location_id: locationId,
      start,
      end,
      timezone_offset: timezoneOffset,
    },
  });

  return locationAPQSchema.parse(data);
};

export const getAllLocations = async (): Promise<LocationType[] | null> => {
  const data = await jsRequest({
    url: `/location_overview/getalllocations`,
    data: {},
  });

  return z.array(locationSchema).parse(data);
};

export const getLocationExport = async (
  start: string,
  end: string,
  locationId: number | null,
  timezoneOffset: number
): Promise<LocationExportType[] | null> => {
  const data = await jsRequest({
    url: `/location_overview/getlocationtreeexport`,
    data: {
      start,
      end,
      location_id: locationId,
      timezone_offset: timezoneOffset,
    },
  });

  return z.array(locationExportSchema).parse(data);
};
