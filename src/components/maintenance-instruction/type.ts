import { z } from "zod";

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