// Reusables
import { jsRequest, t } from '@digital-twin/utils';
// For queries
import { queryOptions, useQuery } from '@tanstack/react-query';
import { useContext } from 'react';

// Contexts
import { PrjCtx } from '../contexts';
// Custom schemas
import {
  masterDataEntrySchema,
  modelParameterTypeEntrySchema,
} from '../schemas';

// Query keys
const keys = {
  types: 'modelTypes',
  brands: 'modelBrands',
  series: 'modelSeries',
  feedbackCategories: 'modelFeedbackCategories',
  feedbackIssues: 'modelFeedbackIssues',
  gains: 'parameterGains',
  parameterTypes: 'parameterTypes',
};

// Query factory
const queries = {
  types: (prj: string) =>
    queryOptions({
      queryKey: [{ key: keys.types, prj }],
      queryFn: async ({ signal }) =>
        masterDataEntrySchema.array().parse(
          await jsRequest({
            url: `/model_manager/get_model_types`,
            data: new FormData(),
            signal: signal,
          })
        ),
      meta: {
        toastId: keys.types,
      },
    }),
  brands: (prj: string) =>
    queryOptions({
      queryKey: [{ key: keys.brands, prj }],
      queryFn: async ({ signal }) =>
        masterDataEntrySchema.array().parse(
          await jsRequest({
            url: `/model_manager/get_model_brands`,
            data: new FormData(),
            signal: signal,
          })
        ),
      meta: {
        toastId: keys.brands,
      },
    }),
  series: (prj: string) =>
    queryOptions({
      queryKey: [{ key: keys.series, prj }],
      queryFn: async ({ signal }) =>
        masterDataEntrySchema.array().parse(
          await jsRequest({
            url: `/model_manager/get_model_series`,
            data: new FormData(),
            signal: signal,
          })
        ),
      meta: {
        toastId: keys.series,
      },
    }),
  feedbackCategories: (prj: string) =>
    queryOptions({
      queryKey: [{ key: keys.feedbackCategories, prj }],
      queryFn: async ({ signal }) =>
        masterDataEntrySchema.array().parse(
          await jsRequest({
            url: `/model_manager/get_feedback_categories`,
            data: new FormData(),
            signal: signal,
          })
        ),
      meta: {
        toastId: keys.feedbackCategories,
      },
    }),
  feedbackIssues: ({ prj, categoryId }: { prj: string; categoryId?: number }) =>
    queryOptions({
      queryKey: [{ key: keys.feedbackIssues, prj, categoryId }],
      queryFn: async ({ queryKey: [{ categoryId }], signal }) => {
        if (!categoryId || categoryId < 0) {
          throw new Error(t('common.err_invalid_feedback_category_id'));
        }

        const body = new FormData();
        body.append('category_id', categoryId.toString());

        return masterDataEntrySchema.array().parse(
          await jsRequest({
            url: `/model_manager/get_feedback_issues`,
            data: body,
            signal: signal,
          })
        );
      },
      enabled: categoryId != null && categoryId > 0,
      meta: {
        toastId: keys.feedbackIssues,
      },
    }),
  gains: (prj: string) =>
    queryOptions({
      queryKey: [{ key: keys.gains, prj }],
      queryFn: async () => masterDataEntrySchema.array().parse([]),
      meta: {
        toastId: keys.gains,
      },
    }),
  parameterTypes: (prj: string) =>
    queryOptions({
      queryKey: [{ key: keys.parameterTypes, prj }],
      queryFn: async () => modelParameterTypeEntrySchema.array().parse([]),
      meta: {
        toastId: keys.parameterTypes,
      },
    }),
};

export const useModelTypes = () => {
  const prj = useContext(PrjCtx);

  const { data, isLoading, isFetching } = useQuery(queries.types(prj));

  return {
    data,
    isLoading: isLoading || isFetching,
  };
};

export const useModelBrands = () => {
  const prj = useContext(PrjCtx);

  const { data, isLoading, isFetching } = useQuery(queries.brands(prj));

  return {
    data,
    isLoading: isLoading || isFetching,
  };
};

export const useModelSeries = () => {
  const prj = useContext(PrjCtx);

  const { data, isLoading, isFetching } = useQuery(queries.series(prj));

  return {
    data,
    isLoading: isLoading || isFetching,
  };
};

export const useFeedbackCategories = () => {
  const prj = useContext(PrjCtx);

  const { data, isLoading, isFetching } = useQuery(
    queries.feedbackCategories(prj)
  );

  return {
    data,
    isLoading: isLoading || isFetching,
  };
};

export const useFeedbackIssues = (categoryId?: number) => {
  const prj = useContext(PrjCtx);

  const { data, isLoading, isFetching } = useQuery(
    queries.feedbackIssues({ prj, categoryId })
  );

  return {
    data,
    isLoading: isLoading || isFetching,
  };
};

export const useParameterGains = () => {
  const prj = useContext(PrjCtx);

  const { data, isLoading, isFetching } = useQuery(queries.gains(prj));

  return {
    data,
    isLoading: isLoading || isFetching,
  };
};

export const useParameterTypes = () => {
  const prj = useContext(PrjCtx);

  const { data, isLoading, isFetching } = useQuery(queries.parameterTypes(prj));

  return {
    data,
    isLoading: isLoading || isFetching,
  };
};
