import { jsRequest } from '@digital-twin/utils';
import { z } from 'zod';

const alarmCodeMappingSchema = z.object({
  alarm_id: z.number(),
  alarm_code: z.string(),
  alarm_name: z.string(),
  is_mapped: z.boolean(),
});

export type AlarmCodeMappingType = z.infer<typeof alarmCodeMappingSchema>;

const getAlarmCodesMappingResponseSchema = z.object({
  data: z.array(alarmCodeMappingSchema),
  mapped_count: z.number(),
  unmapped_count: z.number(),
});

export type GetAlarmCodesMappingResponse = z.infer<
  typeof getAlarmCodesMappingResponseSchema
>;

export const getAlarmCodesMapping = async (input: {
  limit: number;
  model_id: number;
  page: number;
  search: string;
}): Promise<GetAlarmCodesMappingResponse> => {
  const response = await jsRequest({
    url: `/alarm_mapping/get_alarm_codes_mapping`,
    data: input,
  });

  return getAlarmCodesMappingResponseSchema.parse(response);
};

const parameterSchema = z.object({
  id: z.number(),
  name: z.string(),
});

export type ParameterType = z.infer<typeof parameterSchema>;

const getParameterListResponseSchema = z.object({
  data: z.array(parameterSchema),
  count: z.number(),
});

export type GetParameterListResponse = z.infer<
  typeof getParameterListResponseSchema
>;

export const getParameterList = async (input: {
  limit: number;
  model_id: number;
  page: number;
  search: string;
}): Promise<GetParameterListResponse> => {
  const response = await jsRequest({
    url: `/alarm_mapping/get_parameter_list`,
    data: input,
  });

  return getParameterListResponseSchema.parse(response);
};

const selectedParameterSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export type SelectedParameterType = z.infer<typeof selectedParameterSchema>;

export const getSelectedParameters = async (input: {
  alarm_code_id: number;
  model_id: number;
}): Promise<SelectedParameterType[]> => {
  const response = await jsRequest({
    url: `/alarm_mapping/get_selected_parameters`,
    data: input,
  });

  return selectedParameterSchema.array().parse(response);
};

export const saveSelectedParameters = async (input: {
  alarm_code_id: number;
  model_id: number;
  parameter_ids: string;
}): Promise<string> => {
  const response = await jsRequest({
    url: `/alarm_mapping/save_selected_parameters`,
    data: input,
  });

  return response as string;
};

export const deleteSelectedParameters = async (input: {
  alarm_code_id: number;
  model_id: number;
}): Promise<string> => {
  const response = await jsRequest({
    url: `/alarm_mapping/delete_selected_parameters`,
    data: input,
  });

  return response as string;
};
