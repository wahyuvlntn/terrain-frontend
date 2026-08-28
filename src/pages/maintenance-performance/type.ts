import { FILTER_KEY_CONDITION, FILTER_KEY_MODEL, FILTER_KEY_STATUS } from '@digital-twin/components';
import { z } from 'zod';

import { FILTER_KEY_TYPE } from '../../components';

export type GeneralFilterType = {
  [FILTER_KEY_MODEL]: number;
  [FILTER_KEY_STATUS]: string;
  [FILTER_KEY_CONDITION]: string;
  [FILTER_KEY_TYPE]: string;
};

export type MaintenancePerformanceFilterType = {
  start: string | null;
  end: string | null;
  groupBy: string | null;
  page: number;
};

export type Column = {
  key: string;
  name: string;
  width?: string | number;
  alignment?: 'left' | 'right' | 'center';
  sortState?: boolean;
  showOrderIcon?: boolean;
};

// Filters
export const generalMaintenancePerformanceFilter = z.object({
  assetIds: z.number().array().nullable(),
  locactionIds: z.number().array().nullable(),
  modelIds: z.number().array().nullable(),
  typeIds: z.number().array().nullable(),
  start: z.string().nullable(),
  end: z.string().nullable(),
});

export const maintenanceOrderOverviewFilter = generalMaintenancePerformanceFilter.extend({
  start: z.string().nullable(),
  end: z.string().nullable(),
  groupBy: z.string(),
});

export const maintenanceOrderTrendFilter = generalMaintenancePerformanceFilter.extend({});

export const frequentIssuesFilter = generalMaintenancePerformanceFilter.extend({});

export const paginatedFrequentIssuesFilter = generalMaintenancePerformanceFilter.extend({
  page: z.number(),
  limit: z.number(),
  sortState: z.string(),
  search: z.string(),
});

export const personnelOrdersFilter = generalMaintenancePerformanceFilter.extend({});

export const paginatedPersonnelOrdersFilter = generalMaintenancePerformanceFilter.extend({
  page: z.number(),
  limit: z.number(),
  sortState: z.string(),
  search: z.string(),
});

export const personnelCapacityDistributionFilter = generalMaintenancePerformanceFilter.extend({});

export const mtbfChartFilter = generalMaintenancePerformanceFilter.extend({});
export const mttrChartFilter = generalMaintenancePerformanceFilter.extend({});
export const mtbfAverageFilter = generalMaintenancePerformanceFilter.extend({});
export const mttrAverageFilter = generalMaintenancePerformanceFilter.extend({});
export const paginatedMTBFMTTRFilter = generalMaintenancePerformanceFilter
  .omit({ start: true, end: true })
  .extend({
    page: z.number(),
    limit: z.number(),
    sortState: z.string(),
    search: z.string(),
  });

// Schema
export const maintenanceOrderOverviewSchema = z.object({
  value: z.number(),
  id: z.number().nullable(),
  name: z.string(),
  percentage: z.string(),
});

export const maintenanceOrderTrendSchema = z.object({
  day: z.string(),
  correctiveCount: z.number(),
  preventiveCount: z.number(),
});

export const frequentIssuesSchema = z.object({
  id: z.number().optional(),
  instructionName: z.string(),
  occurence: z.number(),
});

export const personnelOrdersSchema = z.object({
  id: z.number().optional(),
  personnelName: z.string(),
  orderCount: z.number(),
  capacity: z.number(),
  timeLoss: z.string(),
});

export const paginatedFrequentIssuesSchema = z.object({
  count: z.number(),
  data: z.array(frequentIssuesSchema),
});

export const paginatedPersonnelOrdersSchema = z.object({
  count: z.number(),
  data: z.array(personnelOrdersSchema),
});

export const personnelCapacityDistributionSchema = z.object({
  range: z.string(),
  personnelCount: z.number(),
});

export const mtbfChartSchema = z.object({
  category: z.string().array(),
  unit: z.string(),
  values: z.number().array(),
});

export const mttrChartSchema = z.object({
  category: z.string().array(),
  unit: z.string(),
  values: z.number().array(),
});

export const mtbfAverageSchema = z.object({
  mtbf: z.string(),
  unit: z.string(),
});

export const mttrAverageSchema = z.object({
  mttr: z.string(),
  unit: z.string(),
});

export const kpiLastUpdatedSchema = z.object({
  last_updated: z.string(),
});

export const paginatedMTBFMTTRSchema = z.object({
  count: z.number(),
  data: z.array(
    z.object({
      id: z.number().optional(),
      assetName: z.string(),
      mtbf: z.string(),
      mttr: z.string(),
    })
  ),
});

// Filters
export type MaintenanceOrderOverviewFilterType = z.infer<typeof maintenanceOrderOverviewFilter>;
export type MaintenanceOrderTrendFilterType = z.infer<typeof maintenanceOrderTrendFilter>;
export type FrequentIssuesFilterType = z.infer<typeof frequentIssuesFilter>;
export type MaintenanceOrderOverviewType = z.infer<typeof maintenanceOrderOverviewSchema>;
export type PaginatedFrequentIssuesFilterType = z.infer<typeof paginatedFrequentIssuesFilter>;
export type PersonnelOrdersFilterType = z.infer<typeof personnelOrdersFilter>;
export type PaginatedPersonnelOrdersFilterType = z.infer<typeof paginatedPersonnelOrdersFilter>;
export type PersonnelCapacityDistributionFilterType = z.infer<
  typeof personnelCapacityDistributionFilter
>;
export type MTBFChartFilterType = z.infer<typeof mtbfChartFilter>;
export type MTTRChartFilterType = z.infer<typeof mttrChartFilter>;
export type MTBFAverageFilterType = z.infer<typeof mtbfAverageFilter>;
export type MTTRAverageFilterType = z.infer<typeof mttrAverageFilter>;
export type PaginatedMTBFMTTRFilterType = z.infer<typeof paginatedMTBFMTTRFilter>;

// Schemas
export type MaintenanceOrderType = z.infer<typeof maintenanceOrderTrendSchema>;
export type FrequentIssuesType = z.infer<typeof frequentIssuesSchema>;
export type PaginatedFrequentIssuesType = z.infer<typeof paginatedFrequentIssuesSchema>;
export type PersonnelOrdersType = z.infer<typeof personnelOrdersSchema>;
export type PaginatedPersonnelOrdersType = z.infer<typeof paginatedPersonnelOrdersSchema>;
export type PersonnelCapacityDistributionType = z.infer<typeof personnelCapacityDistributionSchema>;
export type MTBFChartType = z.infer<typeof mtbfChartSchema>;
export type MTTRChartType = z.infer<typeof mttrChartSchema>;
export type MTBFAverageType = z.infer<typeof mtbfAverageSchema>;
export type MTTRAverageType = z.infer<typeof mttrAverageSchema>;
export type KpiLastUpdatedType = z.infer<typeof kpiLastUpdatedSchema>;
export type PaginatedMTBFMTTRType = z.infer<typeof paginatedMTBFMTTRSchema>;
