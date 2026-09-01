import { z } from 'zod';

export const masterDataEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
});

export type MasterDataEntryType = z.infer<typeof masterDataEntrySchema>;
