import { z } from 'zod';

export const capacityEnum = z.enum(['0_20', '20_40', '40_60', '60_80', '80_100']);

export type Capacity = z.infer<typeof capacityEnum>;

export const CAPACITY_NAME = {
  [capacityEnum.enum['0_20']]: '0 - 20%',
  [capacityEnum.enum['20_40']]: '20 - 40%',
  [capacityEnum.enum['40_60']]: '40 - 60%',
  [capacityEnum.enum['60_80']]: '60 - 80%',
  [capacityEnum.enum['80_100']]: '80 - 100%',
};
