import { timeSeriesDataPoint } from '@digital-twin/components';
import { jsRequest } from '@digital-twin/utils';
import { z } from 'zod';

import { spcDataSchema, spcMetricSchema } from '../../../components';

const parameterSchema = z.object({
  name: z.string(),
  id: z.number(),
});

const getParametersSchema = z.object({
  parameters: z.array(
    parameterSchema.extend({
      unit: z.string(),
    })
  ),
  counts: z.number(),
});

export const getParameters = async (assetId: number, skip: number, search: string) => {
  const data = await jsRequest({
    url: `/asset/getparameters`,
    data: { asset_id: assetId, search, skip, limit: 2 },
  });

  return getParametersSchema.parse(data);
};

export const getSPCData = async (parameterId: number, date: string, timezoneOffset: number) => {
  const data = await jsRequest({
    url: `/asset/get_spc_data_v2`,
    data: {
      parameter_id: parameterId,
      date,
      timezone_offset: timezoneOffset,
    },
  });

  return spcDataSchema.parse({
    ...data,
    yMin: data.y_min,
    yMax: data.y_max,
    markArea: data.mark_area,
    metrics: data.metrics
      ? {
          ...data.metrics,
          grandMean: data.metrics.grand_mean,
          stdDev: data.metrics.std_dev,
        }
      : null,
    offlineRanges: data.offline_ranges,
  });
};

const getSPCConfigSchema = z.object({
  usl: z
    .number()
    .nullable()
    .transform((val) => (val === null ? '' : String(val))),
  lsl: z
    .number()
    .nullable()
    .transform((val) => (val === null ? '' : String(val))),
  ucl: z
    .number()
    .nullable()
    .transform((val) => (val === null ? '' : String(val))),
  lcl: z
    .number()
    .nullable()
    .transform((val) => (val === null ? '' : String(val))),
  centerLine: z
    .number()
    .nullable()
    .transform((val) => (val === null ? '' : String(val))),
  sigma: z
    .number()
    .nullable()
    .transform((val) => (val === null ? '' : String(val))),
});

export const getSPCConfig = async (parameterId: number) => {
  const data = await jsRequest({
    url: `/asset/get_spc_config`,
    data: {
      parameter_id: parameterId,
    },
  });

  return getSPCConfigSchema.parse({
    usl: data.usl,
    lsl: data.lsl,
    ucl: data.ucl,
    lcl: data.lcl,
    centerLine: data.center_line,
    sigma: data.sigma,
  });
};

export const updateSPCConfigSchema = z
  .object({
    usl: z.preprocess(
      (val) => (val === '' ? null : val),
      z.union([z.number(), z.string()]).nullable()
    ),
    lsl: z.preprocess(
      (val) => (val === '' ? null : val),
      z.union([z.number(), z.string()]).nullable()
    ),
    ucl: z.preprocess(
      (val) => (val === '' ? null : val),
      z.union([z.number(), z.string()]).nullable()
    ),
    lcl: z.preprocess(
      (val) => (val === '' ? null : val),
      z.union([z.number(), z.string()]).nullable()
    ),
    centerLine: z.preprocess(
      (val) => (val === '' ? null : val),
      z.union([z.number(), z.string()]).nullable()
    ),
    sigma: z.preprocess(
      (val) => (val === '' ? null : val),
      z.union([z.number(), z.string()]).nullable()
    ),
    parameterId: z.number(),
  })
  .refine((schema) => schema.lsl === null || schema.usl === null || schema.lsl < schema.usl, {
    message: 'common.err_fe_usl_must_be_greater_than_lsl',
    path: ['usl'],
  })
  .refine((schema) => schema.lcl === null || schema.ucl === null || schema.lcl < schema.ucl, {
    message: 'UCL Must be greater than LCL',
    path: ['ucl'],
  });

export type UpdateSPCConfig = z.infer<typeof updateSPCConfigSchema>;

export const updateSPCConfig = async (data: UpdateSPCConfig) => {
  const response = await jsRequest({
    url: `/asset/updatespcconfig`,
    data: {
      ...data,
      parameter_id: data.parameterId,
      x_bar_bar: data.centerLine,
      std_dev: data.sigma,
    },
  });

  return z.string().parse(response);
};

const getParametersDataSchema = z.object({
  realTime: z.array(
    z.object({
      name: z.string(),
      data: z.array(timeSeriesDataPoint),
    })
  ),
  spc: z.array(
    z.object({
      name: z.string(),
      data: z.array(
        timeSeriesDataPoint.merge(
          spcMetricSchema.omit({
            lsl: true,
            usl: true,
          })
        )
      ),
    })
  ),
});
export type TGetParametersData = z.infer<typeof getParametersDataSchema>;
export const getParametersData = async (
  parameterIds: number[],
  date: string,
  timezoneOffset: number
) => {
  const data = await jsRequest({
    url: `/asset/getmultiparameterdata`,
    data: {
      date,
      parameter_ids: parameterIds.join(','),
      timezone_offset: timezoneOffset,
    },
  });

  return getParametersDataSchema.parse({
    realTime: data.real_time,
    spc: data.spc.map((item: { data: { grand_mean: unknown; std_dev: unknown }[] }) => ({
      ...item,
      data: item.data.map((item) => ({
        ...item,
        grandMean: item.grand_mean,
        stdDev: item.std_dev,
      })),
    })),
  });
};

export const calculateSpcMetricsSchema = z
  .object({
    startDate: z.string(),
    endDate: z.string(),
  })
  .refine(
    (data) => {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      return start <= end;
    },
    {
      message: 'Must be greater than or equal to start time',
      path: ['endDate'], // This attaches the error to the endDate field specifically
    }
  );

export type TCalculateSpcMetrics = z.infer<typeof calculateSpcMetricsSchema>;

export const calculateSpcMetrics = async ({
  endDate,
  parameterId,
  startDate,
}: TCalculateSpcMetrics & { parameterId: number; timezoneOffset: number }) => {
  const data = await jsRequest({
    url: `/asset/calculate_spc_metrics`,
    data: {
      parameter_id: parameterId,
      start_date: startDate,
      end_date: endDate,
    },
  });

  return getSPCConfigSchema
    .omit({
      usl: true,
      lsl: true,
    })
    .parse({
      ucl: data.ucl,
      lcl: data.lcl,
      centerLine: data.center_line,
      sigma: data.sigma,
    });
};
