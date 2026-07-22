import { jsRequest } from '@digital-twin/utils';
import { z } from 'zod';

export const listSchema = z.object({
  id: z.number(),
  name: z.string(),
  order_id: z.number(),
  visible: z.boolean().optional(),
});

export const datasetCountSchema = z.object({
  count: z.number(),
  group: z.string(),
});

export const masterItemSchema = z.object({
  groupName: z.string(),
  categoryName: z.string(),
  fieldName: z.string().optional(),
  fieldIdName: z.string().optional(),
});

export type MasterItemType = z.infer<typeof masterItemSchema>;

export type ListType = z.infer<typeof listSchema>;
export type DatasetCountType = z.infer<typeof datasetCountSchema>;

export const getDataCategories = async (
  schema: string,
  table: string,
  searchFilter: string
): Promise<ListType[] | null> => {
  const data = await jsRequest({
    url: `/master/getdatacategories`,
    data: { table, schema, search_filter: searchFilter },
  });
  return z.array(listSchema).parse(data);
};

export const getDataFields = async (
  schema: string,
  table: string,
  categoryId: number,
  searchFilter: string
): Promise<ListType[] | null> => {
  const data = await jsRequest({
    url: `/master/getdatafields`,
    data: {
      schema,
      table,
      category_id: categoryId,
      search_filter: searchFilter,
    },
  });

  return z.array(listSchema).parse(data);
};

export const getDatasetCount = async (): Promise<DatasetCountType[] | null> => {
  const data = await jsRequest({
    url: `/master/getdatasetcount`,
    data: {},
  });
  return z.array(datasetCountSchema).parse(data);
};

export const getIssueIdByID = async (id: number): Promise<string | null> => {
  return await jsRequest({
    url: `/master/getissueidbyid`,
    data: {
      id,
    },
  });
};

export const getCategoryName = async (
  schema: string,
  table: string,
  id: number
): Promise<string | null> => {
  return await jsRequest({
    url: `/master/getcategorynamebyid`,
    data: {
      schema,
      table,
      id,
    },
  });
};

export const addCategory = async (
  schema: string,
  table: string,
  categoryName: string
): Promise<null> => {
  return await jsRequest({
    url: `/master/addcategory`,
    data: {
      schema,
      table,
      category_name: categoryName,
    },
  });
};

export const addFeedbackIssue = async (
  categoryId: number,
  fieldName: string,
  issueID: string
): Promise<null> => {
  return await jsRequest({
    url: `/master/addfeedbackissue`,
    data: {
      category_id: categoryId,
      name: fieldName,
      issue_id: issueID,
    },
  });
};

export const addInspectionIssue = async (
  categoryId: number,
  fieldName: string,
  issueID: string
): Promise<null> => {
  return await jsRequest({
    url: `/master/addinspectionissue`,
    data: {
      category_id: categoryId,
      name: fieldName,
      issue_id: issueID,
    },
  });
};

export const addSourceType = async (
  categoryId: number,
  fieldName: string
): Promise<null> => {
  return await jsRequest({
    url: `/master/addsourcetype`,
    data: {
      category_id: categoryId,
      name: fieldName,
    },
  });
};

export const addCostType = async (fieldName: string): Promise<null> => {
  return await jsRequest({
    url: `/master/addcosttype`,
    data: {
      name: fieldName,
    },
  });
};

export const addDefect = async (
  categoryId: number,
  defectName: string
): Promise<null> => {
  return await jsRequest({
    url: `/master/adddefect`,
    data: {
      category_id: categoryId,
      defect_name: defectName,
    },
  });
};

export const addTypeBrandSeries = async (
  table: string,
  fieldName: string
): Promise<null> => {
  return await jsRequest({
    url: `/master/addtypebrandseries`,
    data: {
      table,
      field_name: fieldName,
    },
  });
};

export const updateOrder = async (
  schema: string,
  table: string,
  sourceId: number,
  targetId: number,
  sourceOrderId: number,
  targetOrderId: number
): Promise<null> => {
  return await jsRequest({
    url: `/master/updateorder`,
    data: {
      schema,
      table,
      source_id: sourceId,
      target_id: targetId,
      source_order_id: sourceOrderId,
      target_order_id: targetOrderId,
    },
  });
};

export const updateName = async (
  schema: string,
  table: string,
  updatedName: string,
  updatedIssueID: string,
  id: number
): Promise<null> => {
  return await jsRequest({
    url: `/master/updatename`,
    data: {
      schema,
      table,
      updated_issue_id: updatedIssueID,
      updated_name: updatedName,
      id,
    },
  });
};

export const deleteEntry = async (
  schema: string,
  table: string,
  id: number
): Promise<void> => {
  return await jsRequest({
    url: `/master/deleteentry`,
    data: {
      schema,
      table,
      id,
    },
  });
};

type TSendBulkImport = {
  payload: string;
};
export const sendBulkImport = async ({
  payload,
}: TSendBulkImport): Promise<void> => {
  return await jsRequest({
    url: `/master/bulkimport`,
    data: {
      payload,
    },
  });
};

export const capitalizeFirstLetter = (text: string) => {
  return text.charAt(0).toUpperCase() + text.slice(1);
};
