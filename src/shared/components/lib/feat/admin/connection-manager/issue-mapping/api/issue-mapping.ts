import { jsRequest } from '@digital-twin/utils';
import { z } from 'zod';

const modelSchema = z.object({
  id: z.number(),
  name: z.string(),
});

export type ModelType = z.infer<typeof modelSchema>;

export const getModels = async (): Promise<ModelType[]> => {
  const response = await jsRequest({
    url: `/issue_mapping/get_models`,
  });

  return modelSchema.array().parse(response);
};

const relationSchema = z.object({
  id: z.number(),
  relation_name: z.string(),
  model_name: z.string(),
});

export type RelationType = z.infer<typeof relationSchema>;

const getRelationListResponseSchema = z.object({
  data: z.array(relationSchema),
  count: z.number(),
});

export const getRelationList = async (input: {
  model_id: number;
  search: string;
  page: number;
  limit: number;
}): Promise<{ data: RelationType[]; count: number }> => {
  const response = await jsRequest({
    url: `/issue_mapping/get_relation_list`,
    data: input,
  });

  return getRelationListResponseSchema.parse(response);
};

const alarmCodeSchema = z.object({
  id: z.number(),
  code: z.string(),
  name: z.string(),
});

export type AlarmCodeType = z.infer<typeof alarmCodeSchema>;

const getAlarmCodesResponseSchema = z.object({
  data: z.array(alarmCodeSchema),
  count: z.number(),
});

export const getAlarmCodes = async (input: {
  search: string;
  page: number;
  limit: number;
}): Promise<{ data: AlarmCodeType[]; count: number }> => {
  const response = await jsRequest({
    url: `/issue_mapping/get_alarm_codes`,
    data: input,
  });

  return getAlarmCodesResponseSchema.parse(response);
};

const parameterSchema = z.object({
  id: z.number(),
  name: z.string(),
});

export type ParameterType = z.infer<typeof parameterSchema>;

const getParametersResponseSchema = z.object({
  data: z.array(parameterSchema),
  count: z.number(),
});

export const getParameters = async (input: {
  model_id: number;
  search: string;
  page: number;
  limit: number;
}): Promise<{ data: ParameterType[]; count: number }> => {
  const response = await jsRequest({
    url: `/issue_mapping/get_parameters`,
    data: input,
  });

  return getParametersResponseSchema.parse(response);
};

const issueRelationNodeSchema = z.object({
  id: z.string(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  data: z.record(z.unknown()),
  type: z.string(),
  draggable: z.boolean(),
});

const issueRelationEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  type: z.string(),
});

const issueRelationsResponseSchema = z.object({
  nodes: z.array(issueRelationNodeSchema),
  edges: z.array(issueRelationEdgeSchema),
});

export type IssueRelationNode = z.infer<typeof issueRelationNodeSchema>;
export type IssueRelationEdge = z.infer<typeof issueRelationEdgeSchema>;

export const addRelation = async (input: {
  model_id: number;
  name: string;
}): Promise<string> => {
  const response = await jsRequest({
    url: `/issue_mapping/add_relation`,
    data: input,
  });

  return response as string;
};

export const getIssueRelations = async (input: {
  relation_id: number;
}): Promise<{ nodes: IssueRelationNode[]; edges: IssueRelationEdge[] }> => {
  const response = await jsRequest({
    url: `/issue_mapping/get_issue_relations`,
    data: input,
  });

  return issueRelationsResponseSchema.parse(response);
};

export const updateIssueRelations = async (input: {
  relation_id: number;
  relation_name: string;
  flow: string;
}): Promise<string> => {
  const response = await jsRequest({
    url: `/issue_mapping/update_issue_relations`,
    data: input,
  });

  return response as string;
};

export const deleteRelation = async (input: {
  relation_id: number;
}): Promise<string> => {
  const response = await jsRequest({
    url: `/issue_mapping/delete_relation`,
    data: input,
  });

  return response as string;
};

export const duplicateFromModel = async (input: {
  source_model_id: number;
  target_model_id: number;
}): Promise<string> => {
  const response = await jsRequest({
    url: `/issue_mapping/duplicate_from_model`,
    data: input,
  });

  return response as string;
};
