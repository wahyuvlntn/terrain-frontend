import { jsRequest } from '@digital-twin/utils';
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { PersonnelListFilterType, UpdatePersonnelDetailsFormType } from '../schemas/personnel';
import { personnelDetailsSchema, personnelListSchema } from '../schemas/personnel';

// Query keys
const keys = {
  personnelList: 'PERSONNEL_MANAGEMENT_PERSONNEL_LIST',
  personnelDetails: 'PERSONNEL_MANAGEMENT_PERSONNEL_DETAILS',
};

// Query factory
const queries = {
  personnelList: (filter: PersonnelListFilterType) =>
    queryOptions({
      queryKey: [keys.personnelList, filter] as const,
      queryFn: async ({ queryKey: [, filter], signal }) => {
        const data = await jsRequest({
          url: `/personnel_management/get_personnel_list`,
          data: {
            buildingIds: convertIds(filter.buildingIds),
            equipmentTypeIds: convertIds(filter.equipmentTypeIds),
            capacityIds: convertIds(filter.capacityIds),
            start: convertDate(filter.start, new Date(Date.now() - 86400000 * 7)),
            end: convertDate(filter.end, new Date()),
            search: filter.search,
            page: filter.page,
            limit: filter.limit,
            timezoneOffset: new Date().getTimezoneOffset(),
          },
          signal: signal,
        });

        return personnelListSchema.parse(data);

        // Utility functions only used in this function
        function convertIds(ids: string[] | null) {
          if (!ids) {
            return null;
          }
          return JSON.stringify(ids);
        }
        // Notes: defaultDate should be synced with defaultDate in pm-input-duration
        function convertDate(date: string | null, defaultDate?: Date) {
          if (!date) {
            return defaultDate?.getTime() ?? null;
          }
          return new Date(date + 'T00:00:00.000').getTime();
        }
      },
      meta: {
        toastId: keys.personnelList,
      },
    }),
  personnelDetails: (personnelId?: string | null) =>
    queryOptions({
      queryKey: [keys.personnelDetails, personnelId] as const,
      queryFn: async ({ queryKey: [, personnelId], signal }) => {
        const data = await jsRequest({
          url: `/personnel_management/get_personnel_details`,
          data: { id: personnelId },
          signal: signal,
        });
        return personnelDetailsSchema.parse(data);
      },
      meta: {
        toastId: keys.personnelDetails,
      },
      enabled: personnelId != null,
    }),
};

export const usePersonnelList = (filter: PersonnelListFilterType) =>
  useQuery(queries.personnelList(filter));

export const usePersonnelDetails = (personnelId?: string | null) =>
  useQuery(queries.personnelDetails(personnelId));

export const useUpdatePersonnelDetails = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (form: UpdatePersonnelDetailsFormType) => {
      await jsRequest({
        url: `/personnel_management/update_personnel_details`,
        data: {
          ...form,
          assignedBuildingIds: JSON.stringify(form.assignedBuildingIds),
          assignedEquipmentTypeIds: JSON.stringify(form.assignedEquipmentTypeIds),
        },
      });
      return form;
    },
    onSuccess: (form) => {
      // Invalidate list & details cache
      queryClient.invalidateQueries({
        queryKey: [keys.personnelList],
      });
      queryClient.invalidateQueries({
        queryKey: queries.personnelDetails(form.id).queryKey,
      });
    },
  });
};
