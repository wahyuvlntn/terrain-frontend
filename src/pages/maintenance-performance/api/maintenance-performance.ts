import { jsRequest } from '@digital-twin/utils';
import { queryOptions, useQuery } from '@tanstack/react-query';

import {
  FrequentIssuesFilterType,
  frequentIssuesSchema,
  kpiLastUpdatedSchema,
  MaintenanceOrderOverviewFilterType,
  MaintenanceOrderTrendFilterType,
  MTBFAverageFilterType,
  MTBFChartFilterType,
  MTTRAverageFilterType,
  MTTRChartFilterType,
  maintenanceOrderOverviewSchema,
  maintenanceOrderTrendSchema,
  mtbfAverageSchema,
  mtbfChartSchema,
  mttrAverageSchema,
  mttrChartSchema,
  PaginatedFrequentIssuesFilterType,
  PaginatedMTBFMTTRFilterType,
  PaginatedPersonnelOrdersFilterType,
  PersonnelCapacityDistributionFilterType,
  PersonnelOrdersFilterType,
  paginatedFrequentIssuesSchema,
  paginatedMTBFMTTRSchema,
  paginatedPersonnelOrdersSchema,
  personnelCapacityDistributionSchema,
  personnelOrdersSchema,
} from '../type';

// Query keys
const keys = {
  maintenanceOrderOverview: 'MAINTENANCE_ORDER_OVERVIEW',
  maintenanceOrderTrend: 'MAINTENANCE_ORDER_TREND',

  topFrequentIssues: 'TOP_FREQUENT_ISSUES',
  paginatedFrequentIssues: 'PAGINATED_FREQUENT_ISSUES',

  topPersonnelOrders: 'TOP_PERSONNEL_ORDERS',
  paginatedPersonnelOrders: 'PAGINATED_PERSONNEL_ORDERS',

  personnelCapacityDistribution: 'PERSONNEL_CAPACITY_DISTRIBUTION',

  mtbfChart: 'MTBF_CHART',
  mttrChart: 'MTTR_CHART',

  mtbfAverage: 'MTBF_AVERAGE',
  mttrAverage: 'MTTR_AVERAGE',

  kpiLastUpdate: 'KPI_LAST_UPDATE',

  paginatedMTBFMTTR: 'PAGINATED_MTBF_MTTR',
};

const localDateToUTC = (dateString: string) => {
  return new Date(new Date(dateString).setHours(0, 0, 0, 0)).toISOString();
};

// Query factory
const queries = {
  maintenanceOrderOverview: (filter: MaintenanceOrderOverviewFilterType) =>
    queryOptions({
      queryKey: [keys.maintenanceOrderOverview, filter],
      queryFn: async ({ signal }) => {
        const data = await jsRequest({
          url: `/maintenance_performance/get_maintenance_order_overview`,
          body: {
            start: localDateToUTC(filter.start!),
            end: localDateToUTC(filter.end!),
            asset_ids: parseFilter(filter.assetIds),
            location_ids: parseLocationFilter(filter.locactionIds),
            model_ids: parseFilter(filter.modelIds),
            type_ids: parseFilter(filter.typeIds),
            group_by: filter.groupBy,
          },
          signal: signal,
        });

        const entries = maintenanceOrderOverviewSchema.array().parse(data);

        return entries;
      },
      meta: {
        toastId: keys.maintenanceOrderOverview,
      },
    }),
  maintenanceOrderTrend: (filter: MaintenanceOrderTrendFilterType) =>
    queryOptions({
      queryKey: [keys.maintenanceOrderTrend, filter],
      queryFn: async ({ signal }) => {
        const data = await jsRequest({
          url: `/maintenance_performance/get_maintenance_order_trend`,
          body: {
            start: localDateToUTC(filter.start!),
            end: localDateToUTC(filter.end!),
            asset_ids: parseFilter(filter.assetIds),
            location_ids: parseLocationFilter(filter.locactionIds),
            model_ids: parseFilter(filter.modelIds),
            type_ids: parseFilter(filter.typeIds),
            timezone_offset: new Date().getTimezoneOffset(),
          },
          signal: signal,
        });

        const entries = maintenanceOrderTrendSchema.array().parse(data);

        return entries;
      },
      meta: {
        toastId: keys.maintenanceOrderTrend,
      },
    }),
  topFrequentIssues: (filter: FrequentIssuesFilterType) =>
    queryOptions({
      queryKey: [keys.topFrequentIssues, filter],
      queryFn: async ({ signal }) => {
        const data = await jsRequest({
          url: `/maintenance_performance/get_top_frequent_issues`,
          body: {
            start: localDateToUTC(filter.start!),
            end: localDateToUTC(filter.end!),
            asset_ids: parseFilter(filter.assetIds),
            location_ids: parseLocationFilter(filter.locactionIds),
            model_ids: parseFilter(filter.modelIds),
            type_ids: parseFilter(filter.typeIds),
          },
          signal: signal,
        });

        const entries = frequentIssuesSchema.array().parse(data);

        return entries;
      },
      meta: {
        toastId: keys.topFrequentIssues,
      },
    }),
  paginatedFrequentIssues: (filter: PaginatedFrequentIssuesFilterType, enabled: boolean) =>
    queryOptions({
      queryKey: [keys.paginatedFrequentIssues, filter],
      queryFn: async ({ signal }) => {
        const data = await jsRequest({
          url: `/maintenance_performance/get_paginated_frequent_issues`,
          body: {
            start: localDateToUTC(filter.start!),
            end: localDateToUTC(filter.end!),
            asset_ids: parseFilter(filter.assetIds),
            location_ids: parseLocationFilter(filter.locactionIds),
            model_ids: parseFilter(filter.modelIds),
            type_ids: parseFilter(filter.typeIds),
            page: filter.page,
            limit: filter.limit,
            sort_state: filter.sortState,
            search: filter.search,
          },
          signal: signal,
        });

        const entries = paginatedFrequentIssuesSchema.parse(data);

        return entries;
      },
      enabled,
      meta: {
        toastId: keys.paginatedFrequentIssues,
      },
    }),
  topPersonnelOrders: (filter: PersonnelOrdersFilterType) =>
    queryOptions({
      queryKey: [keys.topPersonnelOrders, filter],
      queryFn: async ({ signal }) => {
        const data = await jsRequest({
          url: `/maintenance_performance/get_top_personnel_order`,
          body: {
            start: localDateToUTC(filter.start!),
            end: localDateToUTC(filter.end!),
            asset_ids: parseFilter(filter.assetIds),
            location_ids: parseLocationFilter(filter.locactionIds),
            model_ids: parseFilter(filter.modelIds),
            type_ids: parseFilter(filter.typeIds),
          },
          signal: signal,
        });

        const entries = personnelOrdersSchema.array().parse(data);

        return entries;
      },
      meta: {
        toastId: keys.topPersonnelOrders,
      },
    }),
  paginatedPersonnelOrders: (filter: PaginatedPersonnelOrdersFilterType, enabled: boolean) =>
    queryOptions({
      queryKey: [keys.paginatedPersonnelOrders, filter],
      queryFn: async ({ signal }) => {
        const data = await jsRequest({
          url: `/maintenance_performance/get_paginated_personnel_orders`,
          body: {
            start: localDateToUTC(filter.start!),
            end: localDateToUTC(filter.end!),
            asset_ids: parseFilter(filter.assetIds),
            location_ids: parseLocationFilter(filter.locactionIds),
            model_ids: parseFilter(filter.modelIds),
            type_ids: parseFilter(filter.typeIds),
            page: filter.page,
            limit: filter.limit,
            sort_state: filter.sortState,
            search: filter.search,
          },
          signal: signal,
        });

        const entries = paginatedPersonnelOrdersSchema.parse(data);

        return entries;
      },
      enabled,
      meta: {
        toastId: keys.paginatedPersonnelOrders,
      },
    }),
  personnelCapacityDistribution: (filter: PersonnelCapacityDistributionFilterType) =>
    queryOptions({
      queryKey: [keys.personnelCapacityDistribution, filter],
      queryFn: async ({ signal }) => {
        const data = await jsRequest({
          url: `/maintenance_performance/get_personnel_capacity_distribution`,
          body: {
            start: localDateToUTC(filter.start!),
            end: localDateToUTC(filter.end!),
            asset_ids: parseFilter(filter.assetIds),
            location_ids: parseLocationFilter(filter.locactionIds),
            model_ids: parseFilter(filter.modelIds),
            type_ids: parseFilter(filter.typeIds),
          },
          signal: signal,
        });

        const entries = personnelCapacityDistributionSchema.array().parse(data);

        return entries;
      },
      meta: {
        toastId: keys.personnelCapacityDistribution,
      },
    }),
  mtbfChart: (filter: MTBFChartFilterType) =>
    queryOptions({
      queryKey: [keys.mtbfChart, filter],
      queryFn: async ({ signal }) => {
        const data = await jsRequest({
          url: `/maintenance_performance/get_mtbf_chart`,
          body: {
            start: localDateToUTC(filter.start!),
            end: localDateToUTC(filter.end!),
            asset: parseFilter(filter.assetIds),
            location: parseFilter(filter.locactionIds),
            asset_model: parseFilter(filter.modelIds),
            asset_type: parseFilter(filter.typeIds),
          },
          signal: signal,
        });
        const entries = mtbfChartSchema.parse(data);

        return entries;
      },
      meta: {
        toastId: keys.mtbfChart,
      },
    }),
  mttrChart: (filter: MTTRChartFilterType) =>
    queryOptions({
      queryKey: [keys.mttrChart, filter],
      queryFn: async ({ signal }) => {
        const data = await jsRequest({
          url: `/maintenance_performance/get_mttr_chart`,
          body: {
            start: localDateToUTC(filter.start!),
            end: localDateToUTC(filter.end!),
            asset: parseFilter(filter.assetIds),
            location: parseFilter(filter.locactionIds),
            asset_model: parseFilter(filter.modelIds),
            asset_type: parseFilter(filter.typeIds),
          },
          signal: signal,
        });
        const entries = mttrChartSchema.parse(data);

        return entries;
      },
      meta: {
        toastId: keys.mttrChart,
      },
    }),
  mtbfAverage: (filter: MTBFAverageFilterType) =>
    queryOptions({
      queryKey: [keys.mtbfAverage, filter],
      queryFn: async ({ signal }) => {
        const data = await jsRequest({
          url: `/maintenance_performance/get_mtbf_average`,
          body: {
            start: localDateToUTC(filter.start!),
            end: localDateToUTC(filter.end!),
            asset: parseFilter(filter.assetIds),
            location: parseFilter(filter.locactionIds),
            asset_model: parseFilter(filter.modelIds),
            asset_type: parseFilter(filter.typeIds),
          },
          signal: signal,
        });
        const entries = mtbfAverageSchema.array().parse(data);

        return entries;
      },
      meta: {
        toastId: keys.mtbfAverage,
      },
    }),
  mttrAverage: (filter: MTTRAverageFilterType) =>
    queryOptions({
      queryKey: [keys.mttrAverage, filter],
      queryFn: async ({ signal }) => {
        const data = await jsRequest({
          url: `/maintenance_performance/get_mttr_average`,
          body: {
            start: localDateToUTC(filter.start!),
            end: localDateToUTC(filter.end!),
            asset: parseFilter(filter.assetIds),
            location: parseFilter(filter.locactionIds),
            asset_model: parseFilter(filter.modelIds),
            asset_type: parseFilter(filter.typeIds),
          },
          signal: signal,
        });
        const entries = mttrAverageSchema.array().parse(data);

        return entries;
      },
      meta: {
        toastId: keys.mttrAverage,
      },
    }),
  kpiLastUpdate: () =>
    queryOptions({
      queryKey: [keys.kpiLastUpdate],
      queryFn: async ({ signal }) => {
        const data = await jsRequest({
          url: `/maintenance_performance/get_mtbf_mttr_lastupdated`,
          body: {},
          signal: signal,
        });
        const entries = kpiLastUpdatedSchema.parse(data);

        return entries;
      },
      meta: {
        toastId: keys.kpiLastUpdate,
      },
    }),
  paginatedMTBFMTTTR: (filter: PaginatedMTBFMTTRFilterType, enabled: boolean) =>
    queryOptions({
      queryKey: [keys.paginatedMTBFMTTR, filter],
      queryFn: async ({ signal }) => {
        const data = await jsRequest({
          url: `/maintenance_performance/get_paginated_mtbf_mttr`,
          body: {
            asset: parseFilter(filter.assetIds),
            location: parseFilter(filter.locactionIds),
            asset_model: parseFilter(filter.modelIds),
            asset_type: parseFilter(filter.typeIds),
            page: filter.page,
            limit: filter.limit,
            sort_state: filter.sortState,
            search: filter.search,
          },
          signal: signal,
        });
        const entries = paginatedMTBFMTTRSchema.parse(data);

        return entries;
      },
      enabled: enabled,
      meta: {
        toastId: keys.paginatedMTBFMTTR,
      },
    }),
};

export const useMaintenanceOrderOverviewData = (filter: MaintenanceOrderOverviewFilterType) =>
  useQuery(queries.maintenanceOrderOverview(filter));

export const useMaintenanceOrderTrendData = (filter: MaintenanceOrderTrendFilterType) =>
  useQuery(queries.maintenanceOrderTrend(filter));

export const useTopFrequentIssuesData = (filter: FrequentIssuesFilterType) =>
  useQuery(queries.topFrequentIssues(filter));

export const usePaginatedFrequentIssuesData = (
  filter: PaginatedFrequentIssuesFilterType,
  enabled: boolean
) => useQuery(queries.paginatedFrequentIssues(filter, enabled));

export const useTopPersonnelOrdersData = (filter: PersonnelOrdersFilterType) =>
  useQuery(queries.topPersonnelOrders(filter));

export const usePaginatedPersonnelOrdersData = (
  filter: PaginatedPersonnelOrdersFilterType,
  enabled: boolean
) => useQuery(queries.paginatedPersonnelOrders(filter, enabled));

export const usePersonnelCapacityDistributionData = (
  filter: PersonnelCapacityDistributionFilterType
) => useQuery(queries.personnelCapacityDistribution(filter));

export const useMTBFChartData = (filter: MTBFChartFilterType) =>
  useQuery(queries.mtbfChart(filter));

export const useMTTRChartData = (filter: MTTRChartFilterType) =>
  useQuery(queries.mttrChart(filter));

export const useMTBFAverageData = (filter: MTBFAverageFilterType) =>
  useQuery(queries.mtbfAverage(filter));

export const useMTTRAverageData = (filter: MTTRAverageFilterType) =>
  useQuery(queries.mttrAverage(filter));

export const useKPILastUpdateData = () => useQuery(queries.kpiLastUpdate());

export const usePaginatedMTBFMTTRData = (filter: PaginatedMTBFMTTRFilterType, enabled: boolean) =>
  useQuery(queries.paginatedMTBFMTTTR(filter, enabled));

// Helper
function parseFilter(filter: number[] | null) {
  return filter && filter.length > 0 ? '{' + filter.join(',') + '}' : null;
}
function parseLocationFilter(filter: number[] | null) {
  return filter ? '{' + filter.join(',') + '}' : null;
}
