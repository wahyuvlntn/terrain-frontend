import { jsRequest } from '@digital-twin/utils';
import { z } from 'zod';

const instructionSchema = z.object({
  name: z.string(),
  timestamp: z.string().datetime(),
  createdBy: z.string(),
  description: z.string(),
  id: z.number(),
  typeName: z.string(),
});

export type TInstruction = z.infer<typeof instructionSchema>;

type TGetInstructionListParams = {
  page: number;
  search: string;
  typeIds: number[] | null;
  modelIds: number[] | null;
  assetIds: number[];
  locationIds: number[] | null;
  instructionTypeIds: string[] | null;
};

export const getInstructionList = async (params: TGetInstructionListParams) => {
  const data = await jsRequest({
    url: '/maintenance_instruction/get_instructions',
    data: {
      page: params.page,
      search: params.search,
      type_ids: params.typeIds ? params.typeIds.join(',') : null,
      model_ids: params.modelIds ? params.modelIds.join(',') : null,
      asset_ids: params.assetIds.join(','),
      location_ids: params.locationIds ? params.locationIds.join(',') : null,
      instruction_type_ids: params.instructionTypeIds ? params.instructionTypeIds.join(',') : null,
    },
  });

  return z
    .object({
      data: z.array(instructionSchema),
      count: z.number(),
    })
    .parse({
      ...data,
      data: data.data.map((item: { created_by: unknown; type_name: unknown }) => ({
        ...item,
        createdBy: item.created_by,
        typeName: item.type_name,
      })),
    });
};

export const instructionDetailSchema = z.object({
  alarmCodeName: z.string().optional(),
  title: z.string().min(1),
  instructionTypeId: z.coerce.number({
    errorMap: (issue, ctx) => {
      // Check if the error is specifically because the value is NaN
      if (issue.code === z.ZodIssueCode.invalid_type && issue.received === 'nan') {
        return { message: 'Required' };
      }

      // Fallback to default Zod error messages for everything else
      return { message: ctx.defaultError };
    },
  }),
  instructionTypeName: z.string().optional(),
  duration: z.coerce.number({
    errorMap: (issue, ctx) => {
      // Check if the error is specifically because the value is NaN
      if (issue.code === z.ZodIssueCode.invalid_type && issue.received === 'nan') {
        return { message: 'Required' };
      }

      // Fallback to default Zod error messages for everything else
      return { message: ctx.defaultError };
    },
  }),
  modelIds: z.number().array().min(1),
  assetNames: z.string().array(),
  description: z.string().max(160),
  content: z.string().nullable(),
  pdfUrl: z.string().nullable(),
  pdfName: z.string().nullable(),
  isUsingPdf: z.boolean(),
  id: z.number().optional(),
  createdBy: z.string().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().nullable().optional(),
  alarmCodeFullName: z.string(),
  alarmCodeId: z.number().optional(),
});

export type TInstructionDetail = z.infer<typeof instructionDetailSchema>;

export const createInstruction = async (params: TInstructionDetail) => {
  const data = await jsRequest({
    url: '/maintenance_instruction/create_instruction',
    data: {
      alarm_code_id: params.alarmCodeId,
      title: params.title,
      instruction_type_id: params.instructionTypeId,
      duration: params.duration,
      model_ids: params.modelIds.join(','),
      description: params.description,
      content: params.isUsingPdf ? null : params.content,
      pdf_url: params.isUsingPdf ? params.pdfUrl : null,
    },
  });
  return z.number().parse(data);
};

export const getInstructionDetail = async (id: number) => {
  const data = await jsRequest({
    url: '/maintenance_instruction/get_instruction_detail',
    data: {
      id,
    },
  });
  return instructionDetailSchema.parse({
    ...data,
    alarmCodeId: data.alarm_code_id,
    alarmCodeName: data.alarm_code_name,
    instructionTypeId: data.instruction_type_id,
    instructionTypeName: data.instruction_type_name,
    modelIds: data.model_ids,
    assetNames: data.asset_names,
    pdfUrl: data.pdf_url,
    pdfName: data.pdf_name,
    isUsingPdf: data.is_using_pdf,
    createdBy: data.created_by,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    alarmCodeFullName: data.alarm_code_full_name,
  });
};

export const updateInstruction = async (params: TInstructionDetail) => {
  await jsRequest({
    url: '/maintenance_instruction/update_instruction',
    data: {
      alarm_code_id: params.alarmCodeId,
      title: params.title,
      instruction_type_id: params.instructionTypeId,
      duration: params.duration,
      model_ids: params.modelIds.join(','),
      description: params.description,
      content: params.isUsingPdf ? null : params.content,
      pdf_url: params.isUsingPdf ? params.pdfUrl : null,
      id: params.id,
    },
  });
};

export const deleteInstruction = async (id: number) => {
  await jsRequest({
    url: '/maintenance_instruction/delete_instruction',
    data: {
      maintenance_id: id,
    },
  });
};

const instructionTypeSchema = z.object({
  name: z.string(),
  id: z.number(),
});

export type TInstructionType = z.infer<typeof instructionTypeSchema>;

export const getInstructionTypes = async () => {
  const data = await jsRequest({
    url: '/maintenance_instruction/get_instruction_types',
  });
  return instructionTypeSchema.array().parse(data);
};
