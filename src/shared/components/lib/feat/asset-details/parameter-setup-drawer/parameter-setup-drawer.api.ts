import { jsRequest } from '@digital-twin/utils';
import { z } from 'zod';

import {
  ThresholdEnum,
  ThresholdGreaterThanEnum,
  ThresholdLessThanEnum,
} from '../../type';

const getParameterConfigSchema = z.object({
  warningLowerLimit: z.number(),
  warningUpperLimit: z.number(),
  warningThresholdType: ThresholdEnum,
  criticalLowerLimit: z.number(),
  criticalUpperLimit: z.number(),
  criticalThresholdType: ThresholdEnum,
});

//TODO: remove this since it's not used anywhere
//export type getParameterConfigType = z.infer<typeof getParameterConfigSchema>;

export const getParameterConfig = async (parameterId: number) => {
  const data = await jsRequest({
    url: `/asset/getthreshold`,
    data: { parameter_id: parameterId },
  });

  return getParameterConfigSchema.parse({
    warningLowerLimit: data.warning_lower_limit,
    warningUpperLimit: data.warning_upper_limit,
    warningThresholdType: data.warning_threshold_type,
    criticalLowerLimit: data.critical_lower_limit,
    criticalUpperLimit: data.critical_upper_limit,
    criticalThresholdType: data.critical_threshold_type,
  });
};

export const updateParameterConfigSchema = getParameterConfigSchema
  .extend({
    parameterId: z.number(),
    warningUpperLimitEnabled: z.boolean(),
    warningLowerLimitEnabled: z.boolean(),
    warningUpperLimitThresholdType: ThresholdGreaterThanEnum,
    warningLowerLimitThresholdType: ThresholdLessThanEnum,
    criticalLowerLimitEnabled: z.boolean(),
    criticalUpperLimitEnabled: z.boolean(),
    criticalUpperLimitThresholdType: ThresholdGreaterThanEnum,
    criticalLowerLimitThresholdType: ThresholdLessThanEnum,
  })
  .omit({
    warningThresholdType: true,
    criticalThresholdType: true,
  })
  .refine(
    (schema) =>
      !schema.criticalUpperLimitEnabled ||
      !schema.criticalLowerLimitEnabled ||
      schema.criticalUpperLimit >= schema.criticalLowerLimit,
    {
      message: 'common.err_upper_limit_must_be_greater_than_lower_limit',
      path: ['criticalUpperLimit'],
    }
  )
  .refine(
    (schema) =>
      !schema.warningUpperLimitEnabled ||
      !schema.warningLowerLimitEnabled ||
      schema.warningUpperLimit >= schema.warningLowerLimit,
    {
      message: 'common.err_upper_limit_must_be_greater_than_lower_limit',
      path: ['warningUpperLimit'],
    }
  )
  .refine(
    (schema) =>
      !schema.criticalUpperLimitEnabled ||
      !schema.warningUpperLimitEnabled ||
      schema.criticalUpperLimit >= schema.warningUpperLimit,
    {
      message:
        'common.err_critical_upper_limit_must_be_greater_than_warning_upper_limit',
      path: ['criticalUpperLimit'],
    }
  )
  .refine(
    (schema) =>
      !schema.criticalLowerLimitEnabled ||
      !schema.warningLowerLimitEnabled ||
      schema.criticalLowerLimit <= schema.warningLowerLimit,
    {
      message:
        'common.err_critical_lower_limit_must_be_less_than_warning_lower_limit',
      path: ['criticalLowerLimit'],
    }
  );

export type UpdateParameterConfig = z.infer<typeof updateParameterConfigSchema>;

const mutateParameterConfigSchema = getParameterConfigSchema.extend({
  parameterId: z.number(),
});

export type MutateParameterConfigSchema = z.infer<
  typeof mutateParameterConfigSchema
>;

export const updateParameterConfig = async (
  data: MutateParameterConfigSchema
) => {
  const response = await jsRequest({
    url: `/asset/updatethreshold`,
    data: {
      parameter_id: data.parameterId,
      warning_upper_limit: data.warningUpperLimit,
      warning_lower_limit: data.warningLowerLimit,
      warning_threshold_type: data.warningThresholdType,
      critical_upper_limit: data.criticalUpperLimit,
      critical_lower_limit: data.criticalLowerLimit,
      critical_threshold_type: data.criticalThresholdType,
    },
  });

  return z.string().parse(response);
};
