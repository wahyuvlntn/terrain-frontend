import { MaintenanceStatusEnum, StatusEnum } from '@digital-twin/components';
import { jsRequest } from '@digital-twin/utils';
import z from 'zod';

const instructionSchema = z.object({
  id: z.number(),
  name: z.string(),
  typeName: z.string(),
  content: z.string().nullable(),
  isUsingPdf: z.boolean(),
  pdfUrl: z.string().nullable(),
  pdfName: z.string().nullable(),
  description: z.string(),
  duration: z.number(),
  createdBy: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().nullable(),
  modelNames: z.string().array(),
  codeName: z.string(),
  isOther: z.boolean(),
  order: z.number(),
  typeId: z.number(),
  codeId: z.number(),
  isValid: z.boolean().nullable(),
});
export type TInstruction = z.infer<typeof instructionSchema>;

const alarmIssueSchema = z.object({
  id: z.number(),
  name: z.string(),
  isOther: z.boolean(),
  isValidDiagnostic: z.boolean().nullable(),
  isValidRepair: z.boolean().nullable(),
});
export type TAlarmIssue = z.infer<typeof alarmIssueSchema>;

const workReportSchema = z.object({
  maintenanceName: z.string(),
  maintenanceTypeName: z.string(),
  createdAt: z.string().datetime(),
  createdBy: z.string().nullable(),
  estimatedTimeMinute: z.number(),
  instructions: instructionSchema.array(),
  personnels: z.string().array(),
  isDegradation: z.boolean(),
  degradationName: z.string().nullable(),
  issues: alarmIssueSchema.array(),
});

export const getWorkReport = async (maintenanceOrderId: number) => {
  const response = await jsRequest({
    url: '/maintenance_order_work_report/get_work_report',
    data: {
      maintenance_id: maintenanceOrderId,
    },
  });

  return workReportSchema.parse({
    maintenanceName: response.maintenance_name,
    maintenanceTypeName: response.maintenance_type_name,
    createdAt: response.created_at,
    createdBy: response.created_by,
    estimatedTimeMinute: response.estimated_time_minute,
    // instructions,
    instructions: response.instructions.map(
      (instruction: {
        type_name: unknown;
        is_using_pdf: unknown;
        pdf_url: unknown;
        pdf_name: unknown;
        created_at: unknown;
        created_by: unknown;
        updated_at: unknown;
        model_names: unknown;
        code_name: unknown;
        is_other: unknown;
        type_id: unknown;
        code_id: unknown;
        is_valid: unknown;
      }) => ({
        ...instruction,
        typeName: instruction.type_name,
        isUsingPdf: instruction.is_using_pdf,
        pdfUrl: instruction.pdf_url,
        pdfName: instruction.pdf_name,
        createdBy: instruction.created_by,
        createdAt: instruction.created_at,
        updatedAt: instruction.updated_at,
        modelNames: instruction.model_names,
        codeName: instruction.code_name,
        isOther: instruction.is_other,
        typeId: instruction.type_id,
        codeId: instruction.code_id,
        isValid: instruction.is_valid,
      })
    ),
    personnels: response.personnels,
    isDegradation: response.is_degradation,
    degradationName: response.degradation_name ?? 'Degradation',
    issues: response.issues.map(
      (issue: { is_other: unknown; is_valid_diagnostic: unknown; is_valid_repair: unknown }) => ({
        ...issue,
        isOther: issue.is_other,
        isValidDiagnostic: issue.is_valid_diagnostic,
        isValidRepair: issue.is_valid_repair,
      })
    ),
  });
};

const workReportStatusSchema = z.object({
  status: MaintenanceStatusEnum,
  updatedAt: z.string().datetime().nullable(),
  hasWorkUpdate: z.boolean(),
});

export const getWorkReportStatus = async (maintenanceOrderId: number) => {
  const response = await jsRequest({
    url: '/maintenance_order_work_report/get_work_report_status',
    data: {
      maintenance_id: maintenanceOrderId,
    },
  });
  return workReportStatusSchema.parse({
    status: response.status,
    updatedAt: response.updated_at,
    hasWorkUpdate: response.has_work_update,
  });
};

const startedStoppedTsSchema = z.object({
  startedAt: z.string().datetime().nullable(),
  stoppedAt: z.string().datetime().nullable(),
});

export const getStartedStoppedTs = async (maintenanceOrderId: number) => {
  const response = await jsRequest({
    url: '/maintenance_order_work_report/get_start_stop_ts',
    data: {
      maintenance_id: maintenanceOrderId,
    },
  });

  return startedStoppedTsSchema.parse({
    startedAt: response.started_at,
    stoppedAt: response.stopped_at,
  });
};

export const startWorkReport = async (maintenanceOrderId: number, isStatusChange: boolean) => {
  await jsRequest({
    url: '/maintenance_order_work_report/start_work_report',
    data: {
      maintenance_id: maintenanceOrderId,
      is_status_change: isStatusChange,
    },
  });
};

export const pauseWorkReportSchema = z.object({
  maintenanceOrderId: z.number(),
  reason: z.string().min(1),
});
export type TPauseWorkReport = z.infer<typeof pauseWorkReportSchema>;

export const pauseWorkReport = async (params: TPauseWorkReport) => {
  await jsRequest({
    url: '/maintenance_order_work_report/pause_work_report',
    data: {
      maintenance_id: params.maintenanceOrderId,
      reason: params.reason,
    },
  });
};

export const resumeWorkReport = async (maintenanceOrderId: number) => {
  await jsRequest({
    url: '/maintenance_order_work_report/resume_work_report',
    data: {
      maintenance_id: maintenanceOrderId,
    },
  });
};

type TIssue = {
  codeId: number;
  typeId: number;
  isValid: boolean | null;
};

export const setStatusToDone = async (maintenanceOrderId: number, issues: TIssue[]) => {
  await jsRequest({
    url: '/maintenance_order_work_report/set_work_report_status_to_done',
    data: {
      maintenance_id: maintenanceOrderId,
      issues: JSON.stringify(
        issues.map((issue) => ({
          alarm_code_id: issue.codeId,
          instruction_type_id: issue.typeId,
          is_valid: issue.isValid,
        }))
      ),
    },
  });
};

export const closeWorkReport = async (maintenanceOrderId: number, issues: TIssue[]) => {
  await jsRequest({
    url: '/maintenance_order_work_report/close_work_report',
    data: {
      maintenance_id: maintenanceOrderId,
      issues: JSON.stringify(
        issues.map((issue) => ({
          alarm_code_id: issue.codeId,
          instruction_type_id: issue.typeId,
          is_valid: issue.isValid,
        }))
      ),
    },
  });
};

export const imageSchema = z
  .instanceof(File)
  .refine(
    (file) => ['image/jpg', 'image/jpeg', 'image/png', 'image/gif'].includes(file?.type),
    'invalid media type'
  );
export type TImage = z.infer<typeof imageSchema>;

const uploadedImageSchema = z.object({
  url: z.string(),
  location: z.string(),
});
export type TUploadedImage = z.infer<typeof uploadedImageSchema>;
export const uploadImage = async (image: TImage, onProgress: (percent: number) => void) => {
  const response = await jsRequest({
    url: `/maintenance_order_work_report/upload_image`,
    data: {
      image,
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percentCompleted);
      }
    },
  });
  return uploadedImageSchema.parse(response);
};

export const deleteImage = async (location: string) => {
  await jsRequest({
    url: '/maintenance_order_work_report/delete_image',
    data: {
      image_location: location,
    },
  });
};

export const addWorkUpdateSchema = z.object({
  maintenanceOrderId: z.number(),
  note: z.string().min(1).max(110),
  imageUrls: uploadedImageSchema.array(),
  issueIds: z.coerce.number().array().min(1),
});
export type TAddWorkUpdate = z.infer<typeof addWorkUpdateSchema>;

export const addWorkUpdate = async (params: TAddWorkUpdate) => {
  await jsRequest({
    url: '/maintenance_order_work_report/add_work_update',
    data: {
      image_urls: params.imageUrls.map((imageUrl) => imageUrl.url).join(','),
      note: params.note,
      maintenance_id: params.maintenanceOrderId,
      issue_ids: params.issueIds.join(','),
    },
  });
};

export const getAssetStatus = async (maintenanceOrderId: number) => {
  const response = await jsRequest({
    url: `/maintenance_order_work_report/get_asset_status`,
    data: {
      maintenance_id: maintenanceOrderId,
    },
  });

  return StatusEnum.parse(response.asset_status);
};

export type TUpdateIssueValidity = {
  maintenanceOrderId: number;
  alarmCodeId: number;
  instructionTypeId: number;
  isValid: boolean | null;
};

export const updateIssueValidity = async ({
  maintenanceOrderId,
  alarmCodeId,
  instructionTypeId,
  isValid,
}: TUpdateIssueValidity) => {
  await jsRequest({
    url: `/maintenance_order_work_report/update_issue_validity`,
    data: {
      maintenance_id: maintenanceOrderId,
      alarm_code_id: alarmCodeId,
      instruction_type_id: instructionTypeId,
      is_valid: isValid,
    },
  });
};
