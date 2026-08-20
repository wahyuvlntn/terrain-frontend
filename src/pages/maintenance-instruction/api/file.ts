import { jsRequest } from '@digital-twin/utils';
import { z } from 'zod';

export const pdfSchema = z
  .instanceof(File)
  .refine((file) => file?.type === 'application/pdf', 'invalid file type');

export type TPdf = z.infer<typeof pdfSchema>;

export const uploadPdf = async (pdf: TPdf) => {
  const response = await jsRequest({
    url: `/maintenance_instruction/upload_pdf`,
    data: {
      pdf,
    },
  });
  return z
    .object({
      url: z.string(),
      name: z.string(),
    })
    .parse({
      url: response.url,
      name: response.name,
    });
};

const mediaSchema = z.instanceof(File).refine(
  (file) =>
    //TODO: add video
    ['image/jpg', 'image/jpeg', 'image/png', 'image/gif'].includes(file?.type),
  'invalid media type'
);

type TMedia = z.infer<typeof mediaSchema>;

export const uploadMedia = async (media: TMedia) => {
  const response = await jsRequest({
    url: `/maintenance_instruction/upload_media`,
    data: {
      media,
    },
  });
  return z.string().parse(response);
};
