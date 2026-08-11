import { z } from 'zod';
import { jsRequest } from '@digital-twin/utils';

import { ConditionEnum } from '../../../mapping';

export const timeSeriesDataPoint = z.object({
  value: z.number().nullable(),
  timestamp: z.string().datetime(),
});

export type TimeSeriesDataPoint = z.infer<typeof timeSeriesDataPoint>;

export const markAreaSchema = z.object({
  from: z.union([z.number(), z.literal('min')]),
  to: z.union([z.number(), z.literal('max')]),
  type: ConditionEnum.exclude([ConditionEnum.enum.OFFLINE]),
});

const getParameterDataSchema = z.object({
  data: z.array(
    z.object({
      value: z.number().nullable(),
      timestamp: z.string(),
    })
  ),
  markArea: z.array(markAreaSchema),
  yMax: z.number().nullable().optional(),
  yMin: z.number().nullable().optional()
});
export type TGetParameterData = z.infer<typeof getParameterDataSchema>;

export const getParameterData = async (
  parameterId: number,
  date: string,
  timezoneOffset: number
) => {
  const data = await jsRequest({
    url: `/asset/getparameterdata`,
    data: {
      parameter_id: parameterId,
      date,
      timezone_offset: timezoneOffset,
    },
  });

  return getParameterDataSchema.parse({
    ...data,
    markArea: data.mark_area,
    yMax: data.y_max,
    yMin: data.y_min
  });
};

const threshold = z.object({
  upperLimit: z.number().nullable(),
  lowerLimit: z.number().nullable(),
});

const getLatestDataSchema = z.object({
  value: z.string().nullable(),
  condition: ConditionEnum,
  warningThreshold: threshold,
  criticalThreshold: threshold,
  unit: z.string(),
});

export type TGetLatestData = z.infer<typeof getLatestDataSchema>;

export const getLatestData = async (parameterId: number) => {
  const data = await jsRequest({
    url: `/asset/getlatestparamdata`,
    data: {
      parameter_id: parameterId,
    },
  });

  // const data = {
  //   value: '100',
  //   condition: ConditionEnum.enum.NORMAL,
  //   warning_threshold: {
  //     upper_limit: 135,
  //     lower_limit: 50,
  //   },
  //   critical_threshold: {
  //     upper_limit: 142.5,
  //     lower_limit: 25,
  //   },
  //   unit: 'Ka',
  // };

  return getLatestDataSchema.parse({
    ...data,
    warningThreshold: {
      upperLimit: data.warning_threshold.upper_limit,
      lowerLimit: data.warning_threshold.lower_limit,
    },
    criticalThreshold: {
      upperLimit: data.critical_threshold.upper_limit,
      lowerLimit: data.critical_threshold.lower_limit,
    },
  });
};
