import { jsRequest } from '@digital-twin/utils';
import { queryOptions, useQuery } from '@tanstack/react-query';

import { MasterDataEntryType, masterDataEntrySchema } from '../schemas/master-data';

// Query keys
const keys = {
  buildings: 'PERSONNEL_MANAGEMENT_BUILDINGS',
  equipmentTypes: 'PERSONNEL_MANAGEMENT_EQUIPMENT_TYPES',
};

// Query factory
const queries = {
  buildings: () =>
    queryOptions({
      queryKey: [keys.buildings],
      queryFn: async ({ signal }) => {
        const data = await jsRequest({
          url: `/personnel_management/get_all_buildings`,
          signal: signal,
        });
        const entries = masterDataEntrySchema.array().parse(data);
        const names = namesFromEntries(entries);
        return { entries, names };
      },
      meta: {
        toastId: keys.buildings,
      },
      staleTime: Infinity,
    }),
  equipmentTypes: () =>
    queryOptions({
      queryKey: [keys.equipmentTypes],
      queryFn: async ({ signal }) => {
        const data = await jsRequest({
          url: `/personnel_management/get_all_equipment_types`,
          signal: signal,
        });
        const entries = masterDataEntrySchema.array().parse(data);
        const names = namesFromEntries(entries);
        return { entries, names };
      },
      meta: {
        toastId: keys.equipmentTypes,
      },
      staleTime: Infinity,
    }),
};

export const useBuildings = () => useQuery(queries.buildings());
export const useEquipmentTypes = () => useQuery(queries.equipmentTypes());

function namesFromEntries(entries: MasterDataEntryType[]) {
  const names: Record<string, string> = {};
  entries.forEach((entry) => {
    names[entry.id] = entry.name;
  });
  return names;
}
