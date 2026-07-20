import { dbRequest } from '@digital-twin/utils';
import { z } from 'zod';

export const getLastParamTimestamp = async () => {
  const data = await dbRequest({
    url: `/misc/getlastparamts`,
    dbType: 'machine',
  });

  return z.string().datetime().nullable().parse(data[0].last_ts);
};
