import { getURL, jsRequest, t } from '@digital-twin/utils';
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { z } from 'zod';

import {
  AddEquipmentFormEmType,
  AddEquipmentFormType,
  equipmentEntrySchema,
  EquipmentEntryType,
  equipmentInfoEmSchema,
  equipmentInfoSchema,
  equipmentLicenseSchema,
  equipmentModelSchema,
  equipmentParameterSchema,
  gatewayEntrySchema,
  gatewayTagEntrySchema,
  locationNodeSchema,
  masterDataChildEntrySchema,
  masterDataEntrySchema,
  UpdateEquipmentFormEmType,
  UpdateEquipmentFormType,
  UpdateParameterMappingFormType,
  vtqcsSchema,
} from '../schemas';

// Query keys
const keys = {
  models: 'equipmentModels',
  licenses: 'equipmentLicenses',
  locations: 'equipmentLocations',
  list: 'equipmentList',
  info: 'equipmentInfo',
  infoEm: 'equipmentInfoEm',
  parameters: 'equipmentParameters',
  vtqcs: 'equipmentVtqcs',
  gateways: 'equipmentGateways',
  gatewayTags: 'equipmentGatewayTags',
  powerMeterTypes: 'equipmentPowerMeterTypes',
  sourceTypes: 'equipmentSourceTypes',
  gains: 'equipmentParameterGains',
  costTypesPerSite: 'equipmentCostTypesPerSite',
};

// Query factory
const queries = {
  gains: queryOptions({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: [keys.gains],
    queryFn: async ({ signal }) =>
      masterDataEntrySchema.array().parse(
        await jsRequest({
          url: `/equipment_manager/get_parameter_gains`,
          data: new FormData(),
          signal: signal,
        })
      ),
    enabled: false,
    meta: {
      toastId: keys.gains,
    },
  }),
  powerMeterTypes: queryOptions({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: [keys.powerMeterTypes],
    queryFn: async ({ signal }) =>
      masterDataEntrySchema.array().parse(
        await jsRequest({
          url: `/equipment_manager/get_power_meter_types`,
          data: new FormData(),
          signal: signal,
        })
      ),
    enabled: false,
    meta: {
      toastId: keys.powerMeterTypes,
    },
  }),
  sourceTypes: queryOptions({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: [keys.sourceTypes],
    queryFn: async ({ signal }) =>
      masterDataChildEntrySchema.array().parse(
        await jsRequest({
          url: `/equipment_manager/get_source_types`,
          data: new FormData(),
          signal: signal,
        })
      ),
    enabled: false,
    meta: {
      toastId: keys.sourceTypes,
    },
  }),
  models: queryOptions({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: [keys.models],
    queryFn: async ({ signal }) =>
      z.array(equipmentModelSchema).parse(
        await jsRequest({
          url: `/equipment_manager/get_equipment_models`,
          data: new FormData(),
          signal: signal,
        })
      ),
    meta: {
      toastId: keys.models,
    },
  }),
  licenses: queryOptions({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: [keys.licenses],
    queryFn: async ({ signal }) =>
      z.array(equipmentLicenseSchema).parse(
        await jsRequest({
          url: `/equipment_manager/get_equipment_licenses`,
          data: new FormData(),
          signal: signal,
        })
      ),
    meta: {
      toastId: keys.licenses,
    },
  }),
  gateways: queryOptions({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: [keys.gateways],
    queryFn: async ({ signal }) =>
      z.array(gatewayEntrySchema).parse(
        await jsRequest({
          url: `/equipment_manager/get_gateways`,
          data: new FormData(),
          signal: signal,
        })
      ),
    meta: {
      toastId: keys.gateways,
    },
  }),
  list: queryOptions({
    // eslint-disable-next-line @tanstack/query/exhaustive-deps
    queryKey: [keys.list],
    queryFn: async ({ signal }) => {
      const entries = z.array(equipmentEntrySchema).parse(
        await jsRequest({
          url: `/equipment_manager/get_equipment_list`,
          data: new FormData(),
          signal: signal,
        })
      );

      return entries.map((entry) => {
        if (entry.image_path) {
          entry.image_path = getURL() + entry.image_path;
        }

        return entry;
      });
    },
    meta: {
      toastId: keys.list,
    },
  }),
  locations: (search?: string) =>
    queryOptions({
      // eslint-disable-next-line @tanstack/query/exhaustive-deps
      queryKey: [keys.locations, search] as const,
      queryFn: async ({ queryKey: [, search], signal }) => {
        const body = new FormData();

        if (search) {
          body.append('search', search);
        }

        return z.array(locationNodeSchema).parse(
          await jsRequest({
            url: `/equipment_manager/get_location_tree`,
            data: body,
            signal: signal,
          })
        );
      },
      meta: {
        toastId: keys.locations,
      },
    }),
  info: (alias?: string) =>
    queryOptions({
      // eslint-disable-next-line @tanstack/query/exhaustive-deps
      queryKey: [{ key: keys.info, alias }],
      queryFn: async ({ queryKey: [{ alias }], signal }) => {
        if (!alias) {
          throw new Error(t('common.invalid_equipment_id'));
        }

        const body = new FormData();
        body.append('alias', alias);

        const info = equipmentInfoSchema.parse(
          await jsRequest({
            url: `/equipment_manager/get_equipment_info`,
            data: body,
            signal: signal,
          })
        );

        if (info.image_path) {
          info.image_path = getURL() + info.image_path;
        }

        return info;
      },
      enabled: !!alias,
      meta: {
        toastId: keys.info,
      },
    }),
  infoEm: (alias?: string) =>
    queryOptions({
      // eslint-disable-next-line @tanstack/query/exhaustive-deps
      queryKey: [{ key: keys.infoEm, alias }],
      queryFn: async ({ queryKey: [{ alias }], signal }) => {
        if (!alias) {
          throw new Error(t('common.invalid_equipment_id'));
        }

        const body = new FormData();
        body.append('alias', alias);

        const info = equipmentInfoEmSchema.parse(
          await jsRequest({
            url: `/equipment_manager/get_equipment_info`,
            data: body,
            signal: signal,
          })
        );

        if (info.image_path) {
          info.image_path = getURL() + info.image_path;
        }

        return info;
      },
      enabled: false,
      meta: {
        toastId: keys.infoEm,
      },
    }),
  costTypesPerSite: (locationId?: number) =>
    queryOptions({
      // eslint-disable-next-line @tanstack/query/exhaustive-deps
      queryKey: [keys.costTypesPerSite, locationId],
      queryFn: async ({ signal }) => {
        if (!locationId) {
          throw new Error('Invalid location ID');
        }

        const body = new FormData();
        body.append('location_id', locationId.toString());

        return masterDataEntrySchema.array().parse(
          await jsRequest({
            url: `/equipment_manager/get_used_cost_types_per_site`,
            data: body,
            signal: signal,
          })
        );
      },
      enabled: false,
      meta: {
        toastId: keys.costTypesPerSite,
      },
    }),
  parameters: (alias?: string) =>
    queryOptions({
      // eslint-disable-next-line @tanstack/query/exhaustive-deps
      queryKey: [{ key: keys.parameters, alias }],
      queryFn: async ({ queryKey: [{ alias }], signal }) => {
        if (!alias) {
          throw new Error('Invalid equipment ID');
        }

        const body = new FormData();
        body.append('alias', alias);

        return z.array(equipmentParameterSchema).parse(
          await jsRequest({
            url: `/equipment_manager/get_equipment_parameters`,
            data: body,
            signal: signal,
          })
        );
      },
      enabled: !!alias,
      meta: {
        toastId: keys.parameters,
      },
    }),
  gatewayTags: (alias?: string) =>
    queryOptions({
      // eslint-disable-next-line @tanstack/query/exhaustive-deps
      queryKey: [{ key: keys.gatewayTags, alias }],
      queryFn: async ({ queryKey: [{ alias }], signal }) => {
        if (!alias) {
          throw new Error('Invalid data source ID');
        }

        const body = new FormData();
        body.append('alias', alias);

        return z.array(gatewayTagEntrySchema).parse(
          await jsRequest({
            url: `/equipment_manager/get_gateway_tags`,
            data: body,
            signal: signal,
          })
        );
      },
      enabled: !!alias,
      meta: {
        toastId: keys.gatewayTags,
      },
    }),
  vtqcs: (alias?: string, intervalMs?: number) =>
    queryOptions({
      // eslint-disable-next-line @tanstack/query/exhaustive-deps
      queryKey: [{ key: keys.vtqcs, alias }],
      queryFn: async ({ queryKey: [{ alias }], signal }) => {
        if (!alias) {
          throw new Error('Invalid equipment ID');
        }

        const body = new FormData();
        body.append('alias', alias);

        return vtqcsSchema.parse(
          await jsRequest({
            url: `/equipment_manager/get_equipment_parameters_vtqcs`,
            data: body,
            signal: signal,
          })
        );
      },
      enabled: !!alias,
      refetchInterval: intervalMs,
      meta: {
        toastId: keys.vtqcs,
      },
    }),
};

// Hooks
export const useParameterGains = () => {
  const { data, isLoading, isFetching } = useQuery(queries.gains);

  return {
    data,
    isLoading: isLoading || isFetching,
  };
};

export const usePowerMeterTypes = () => {
  const { data, isLoading, isFetching } = useQuery(queries.powerMeterTypes);

  return {
    data,
    isLoading: isLoading || isFetching,
  };
};

export const useSourceTypes = () => {
  const { data, isLoading, isFetching } = useQuery(queries.sourceTypes);

  return {
    data,
    isLoading: isLoading || isFetching,
  };
};

export const useEquipmentModels = () => {
  const { data, isLoading, isFetching } = useQuery(queries.models);

  return {
    data,
    isLoading: isLoading || isFetching,
  };
};

export const useEquipmentLicenses = () => {
  const { data, isLoading, isFetching } = useQuery(queries.licenses);

  return {
    data,
    isLoading: isLoading || isFetching,
  };
};

export const useEquipmentLocations = (search?: string) => {
  const { data, isLoading, isFetching } = useQuery(queries.locations(search));

  return {
    data,
    isLoading: isLoading || isFetching,
  };
};

export const useEquipmentGateways = () => {
  const { data, isLoading, isFetching } = useQuery(queries.gateways);

  return {
    data,
    isLoading: isLoading || isFetching,
  };
};

export const useEquipmentList = () => {
  const { data, isLoading, isFetching } = useQuery(queries.list);

  return {
    data,
    isLoading: isLoading || isFetching,
  };
};

export const useEquipmentInfo = (alias?: string) => {
  const { data, isLoading, isFetching } = useQuery(queries.info(alias));

  return {
    data,
    isLoading: isLoading || isFetching,
  };
};

export const useEquipmentInfoEm = (alias?: string) => {
  const { data, isLoading, isFetching } = useQuery(queries.infoEm(alias));

  return {
    data,
    isLoading: isLoading || isFetching,
  };
};

export const useCostTypesPerSite = (locationId?: number) => {
  const { data, isLoading, isFetching } = useQuery(
    queries.costTypesPerSite(locationId)
  );

  return {
    data,
    isLoading: isLoading || isFetching,
  };
};

export const useEquipmentParameters = (alias?: string) => {
  const { data, isLoading, isFetching } = useQuery(queries.parameters(alias));

  return {
    data,
    isLoading: isLoading || isFetching,
  };
};

export const useEquipmentVtqcs = (alias?: string, intervalMs?: number) => {
  const { data, isLoading, isFetching } = useQuery(
    queries.vtqcs(alias, intervalMs)
  );

  return {
    data,
    isLoading: isLoading || isFetching,
  };
};

export const useGatewayTags = (alias?: string) => {
  const { data, isLoading, isFetching } = useQuery(queries.gatewayTags(alias));

  return {
    data,
    isLoading: isLoading || isFetching,
  };
};

export const useAddEquipment = () => {
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (form: AddEquipmentFormType) => {
      const {
        alias,
        name,
        image,
        model_id,
        created_at,
        location_id,
        license_id,
        is_utility,
      } = form;

      const body = new FormData();

      body.append('alias', alias);
      body.append('name', name);

      if (image.file) {
        body.append('image_file', image.file);
      }

      body.append('model_id', model_id.toString());

      if (created_at) {
        body.append('created_at', created_at.toString());
      }

      body.append('location_id', location_id.toString());

      if (license_id) {
        body.append('license_id', license_id.toString());
      }

      body.append('is_utility', is_utility.toString());

      const id = z.number().parse(
        await jsRequest({
          url: `/equipment_manager/add_equipment`,
          data: body,
        })
      );

      return { id, ...form };
    },
    onSuccess: ({
      id,
      alias,
      name,
      image,
      model_id,
      created_at,
      location_id,
      license_id,
      is_utility,
    }) => {
      // Add info cache
      queryClient.setQueryData(queries.info(alias).queryKey, {
        alias,
        name,
        image_path: image.path || null,
        model_id,
        created_at,
        location_id,
        license_id,
        is_utility,
      });

      // Add entry to the list cache
      const listQueryKey = queries.list.queryKey;

      const newEntry: EquipmentEntryType = {
        id,
        alias,
        name,
        image_path: image.path || null,
        model_id,
        location_id,
        license_id,
      };

      const entries = queryClient.getQueryData(listQueryKey);

      if (!entries) {
        queryClient.setQueryData(listQueryKey, [newEntry]);
      } else {
        const newEntries = [...entries, newEntry];
        newEntries.sort((a, b) => a.name.localeCompare(b.name));
        queryClient.setQueryData(listQueryKey, newEntries);
      }

      // Update license cache
      if (license_id) {
        const { queryKey } = queries.licenses;

        const licenses = queryClient.getQueryData(queryKey);

        if (licenses) {
          queryClient.setQueryData(
            queryKey,
            licenses.map((l) => {
              if (l.id === license_id) {
                return { ...l, used: l.used + 1, available: l.available - 1 };
              } else {
                return l;
              }
            })
          );
        }
      }
    },
  });

  return { mutate, isPending };
};

export const useAddEquipmentEm = () => {
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (form: AddEquipmentFormEmType) => {
      const {
        alias,
        name,
        image,
        model_id,
        installation_date,
        location_id,
        license_id,
        power_meter_type_id,
        source_type_id,
        usage_limit_use,
        usage_limit_rate_kwh,
        usage_limit_interval,
        limit_notification_use,
        limit_notification_warning_percentage,
        limit_notification_critical_percentage,
        rate_limit_use,
        rate_limit_holiday_percentage,
        rate_limit_percentages,
        not_calculate_efficiency,
      } = form;

      const normalized_usage_limit_rate_kwh = normalizeNumber(
        usage_limit_rate_kwh,
        true
      );
      const normalized_limit_notification_warning_percentage = normalizeNumber(
        limit_notification_warning_percentage
      );
      const normalized_limit_notification_critical_percentage = normalizeNumber(
        limit_notification_critical_percentage
      );
      const normalized_rate_limit_holiday_percentage = normalizeNumber(
        rate_limit_holiday_percentage
      );
      const normalized_rate_limit_percentages = rate_limit_percentages.map(
        (x) => {
          return {
            ...x,
            value: normalizeNumberNullable(x.value, false),
          };
        }
      );

      const body = new FormData();

      body.append('alias', alias);
      body.append('name', name);

      if (image.file) {
        body.append('image_file', image.file);
      }

      body.append('model_id', model_id.toString());
      body.append('installation_date', installation_date.toString());

      body.append('location_id', location_id.toString());

      if (license_id) {
        body.append('license_id', license_id.toString());
      }

      body.append('power_meter_type_id', power_meter_type_id.toString());
      body.append('source_type_id', source_type_id.toString());

      body.append('usage_limit_use', usage_limit_use.toString());
      body.append(
        'usage_limit_rate_kwh',
        normalized_usage_limit_rate_kwh.toString()
      );
      body.append('usage_limit_interval', usage_limit_interval);

      body.append('limit_notification_use', limit_notification_use.toString());
      body.append(
        'limit_notification_warning_percentage',
        normalized_limit_notification_warning_percentage.toString()
      );
      body.append(
        'limit_notification_critical_percentage',
        normalized_limit_notification_critical_percentage.toString()
      );

      body.append('rate_limit_use', rate_limit_use.toString());
      body.append(
        'rate_limit_holiday_percentage',
        normalized_rate_limit_holiday_percentage.toString()
      );
      body.append(
        'rate_limit_percentages',
        JSON.stringify(
          normalized_rate_limit_percentages.filter(
            ({ value }) => value !== null
          )
        )
      );

      body.append(
        'not_calculate_efficiency',
        not_calculate_efficiency.toString()
      );

      const id = z.number().parse(
        await jsRequest({
          url: `/equipment_manager/add_equipment`,
          data: body,
        })
      );

      return {
        id,
        ...form,
        usage_limit_rate_kwh: normalized_usage_limit_rate_kwh,
        limit_notification_warning_percentage:
          normalized_limit_notification_warning_percentage,
        limit_notification_critical_percentage:
          normalized_limit_notification_critical_percentage,
        rate_limit_holiday_percentage: normalized_rate_limit_holiday_percentage,
        rate_limit_percentages: normalized_rate_limit_percentages,
      };
    },
    onSuccess: ({ id, image, ...form }) => {
      // Add info cache
      queryClient.setQueryData(queries.infoEm(form.alias).queryKey, {
        ...form,
        image_path: image.path || null,
      });

      // Add entry to the list cache
      const listQueryKey = queries.list.queryKey;

      const newEntry: EquipmentEntryType = {
        id,
        alias: form.alias,
        name: form.name,
        image_path: image.path || null,
        model_id: form.model_id,
        location_id: form.location_id,
        license_id: form.license_id,
        power_meter_type_id: form.power_meter_type_id,
        source_type_id: form.source_type_id,
      };

      const entries = queryClient.getQueryData(listQueryKey);

      if (!entries) {
        queryClient.setQueryData(listQueryKey, [newEntry]);
      } else {
        const newEntries = [...entries, newEntry];
        newEntries.sort((a, b) => a.name.localeCompare(b.name));
        queryClient.setQueryData(listQueryKey, newEntries);
      }

      // Update license cache
      if (form.license_id) {
        const { queryKey } = queries.licenses;

        const licenses = queryClient.getQueryData(queryKey);

        if (licenses) {
          queryClient.setQueryData(
            queryKey,
            licenses.map((l) => {
              if (l.id === form.license_id) {
                return { ...l, used: l.used + 1, available: l.available - 1 };
              } else {
                return l;
              }
            })
          );
        }
      }
    },
  });

  return { mutate, isPending };
};

export const useUpdateEquipment = () => {
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (form: UpdateEquipmentFormType) => {
      const {
        alias,
        name,
        image,
        model_id,
        created_at,
        location_id,
        license_id,
      } = form;

      const body = new FormData();

      body.append('alias', alias);
      body.append('name', name);

      if (image.file) {
        body.append('image_file', image.file);
      }

      // undefined -> do not change the image; null -> remove the image
      body.append('delete_image', (image.file === null).toString());

      body.append('model_id', model_id.toString());

      if (created_at) {
        body.append('created_at', created_at.toString());
      }

      body.append('location_id', location_id.toString());

      if (license_id) {
        body.append('license_id', license_id.toString());
      }

      await jsRequest({
        url: `/equipment_manager/update_equipment_temp`,
        data: body,
      });

      return form;
    },
    onSuccess: ({
      alias,
      name,
      image,
      model_id,
      prev_model_id,
      created_at,
      location_id,
      license_id,
      prev_license_id,
    }) => {
      // Update info cache (if it exists)
      const infoQueryKey = queries.info(alias).queryKey;

      const info = queryClient.getQueryData(infoQueryKey);

      if (info) {
        queryClient.setQueryData(infoQueryKey, {
          ...info,
          name,
          image_path: image.path || null,
          model_id,
          created_at,
          location_id,
          license_id,
        });
      }

      // Update entry in the list cache
      const listQueryKey = queries.list.queryKey;

      const entries = queryClient.getQueryData(listQueryKey);

      if (!entries) {
        return;
      }

      queryClient.setQueryData(
        listQueryKey,
        entries.map((entry) =>
          entry.alias === alias
            ? {
                ...entry,
                name,
                image_path: image.path || null,
                model_id,
                license_id,
                location_id,
              }
            : entry
        )
      );

      // Update license cache
      if (license_id !== prev_license_id) {
        const { queryKey } = queries.licenses;

        const licenses = queryClient.getQueryData(queryKey);

        if (licenses) {
          queryClient.setQueryData(
            queryKey,
            licenses.map((l) => {
              if (l.id === license_id) {
                return { ...l, used: l.used + 1, available: l.available - 1 };
              } else if (l.id === prev_license_id) {
                return { ...l, used: l.used - 1, available: l.available + 1 };
              } else {
                return l;
              }
            })
          );
        }
      }

      // Invalidate parameters cache if the model changes
      if (model_id !== prev_model_id) {
        queryClient.invalidateQueries({
          queryKey: queries.parameters(alias).queryKey,
        });
        queryClient.invalidateQueries({
          queryKey: queries.vtqcs(alias).queryKey,
        });
      }
    },
  });

  return { mutate, isPending };
};

export const useUpdateEquipmentEm = () => {
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (form: UpdateEquipmentFormEmType) => {
      const {
        alias,
        name,
        image,
        model_id,
        installation_date,
        location_id,
        license_id,
        power_meter_type_id,
        source_type_id,
        usage_limit_use,
        usage_limit_rate_kwh,
        usage_limit_interval,
        limit_notification_use,
        limit_notification_warning_percentage,
        limit_notification_critical_percentage,
        rate_limit_use,
        rate_limit_holiday_percentage,
        rate_limit_percentages,
        not_calculate_efficiency,
      } = form;

      const normalized_usage_limit_rate_kwh = normalizeNumber(
        usage_limit_rate_kwh,
        true
      );
      const normalized_limit_notification_warning_percentage = normalizeNumber(
        limit_notification_warning_percentage
      );
      const normalized_limit_notification_critical_percentage = normalizeNumber(
        limit_notification_critical_percentage
      );
      const normalized_rate_limit_holiday_percentage = normalizeNumber(
        rate_limit_holiday_percentage
      );
      const normalized_rate_limit_percentages = rate_limit_percentages.map(
        (x) => {
          return {
            ...x,
            value: normalizeNumberNullable(x.value, false),
          };
        }
      );

      const body = new FormData();

      body.append('alias', alias);
      body.append('name', name);

      if (image.file) {
        body.append('image_file', image.file);
      }

      // undefined -> do not change the image; null -> remove the image
      body.append('delete_image', (image.file === null).toString());

      body.append('model_id', model_id.toString());
      body.append('installation_date', installation_date.toString());

      body.append('location_id', location_id.toString());

      if (license_id) {
        body.append('license_id', license_id.toString());
      }

      body.append('power_meter_type_id', power_meter_type_id.toString());
      body.append('source_type_id', source_type_id.toString());

      body.append('usage_limit_use', usage_limit_use.toString());
      body.append(
        'usage_limit_rate_kwh',
        normalized_usage_limit_rate_kwh.toString()
      );
      body.append('usage_limit_interval', usage_limit_interval);

      body.append('limit_notification_use', limit_notification_use.toString());
      body.append(
        'limit_notification_warning_percentage',
        normalized_limit_notification_warning_percentage.toString()
      );
      body.append(
        'limit_notification_critical_percentage',
        normalized_limit_notification_critical_percentage.toString()
      );

      body.append('rate_limit_use', rate_limit_use.toString());
      body.append(
        'rate_limit_holiday_percentage',
        normalized_rate_limit_holiday_percentage.toString()
      );
      body.append(
        'rate_limit_percentages',
        JSON.stringify(
          normalized_rate_limit_percentages.filter(
            ({ value }) => value !== null
          )
        )
      );

      body.append(
        'not_calculate_efficiency',
        not_calculate_efficiency.toString()
      );

      await jsRequest({
        url: `/equipment_manager/update_equipment_temp`,
        data: body,
      });

      return {
        ...form,
        usage_limit_rate_kwh: normalized_usage_limit_rate_kwh,
        limit_notification_warning_percentage:
          normalized_limit_notification_warning_percentage,
        limit_notification_critical_percentage:
          normalized_limit_notification_critical_percentage,
        rate_limit_holiday_percentage: normalized_rate_limit_holiday_percentage,
        rate_limit_percentages: normalized_rate_limit_percentages,
      };
    },
    onSuccess: ({ prev_model_id, prev_license_id, image, ...form }) => {
      // Update info cache (if it exists)
      const infoQueryKey = queries.infoEm(form.alias).queryKey;

      const info = queryClient.getQueryData(infoQueryKey);

      if (info) {
        queryClient.setQueryData(infoQueryKey, {
          ...info,
          ...form,
          image_path: image.path || null,
        });
      }

      // Update entry in the list cache
      const listQueryKey = queries.list.queryKey;

      const entries = queryClient.getQueryData(listQueryKey);

      if (!entries) {
        return;
      }

      queryClient.setQueryData(
        listQueryKey,
        entries.map((entry) =>
          entry.alias === form.alias
            ? {
                ...entry,
                name: form.name,
                image_path: image.path || null,
                model_id: form.model_id,
                license_id: form.license_id,
                location_id: form.location_id,
                power_meter_type_id: form.power_meter_type_id,
                source_type_id: form.source_type_id,
              }
            : entry
        )
      );

      // Update license cache
      if (form.license_id !== prev_license_id) {
        const { queryKey } = queries.licenses;

        const licenses = queryClient.getQueryData(queryKey);

        if (licenses) {
          queryClient.setQueryData(
            queryKey,
            licenses.map((l) => {
              if (l.id === form.license_id) {
                return { ...l, used: l.used + 1, available: l.available - 1 };
              } else if (l.id === prev_license_id) {
                return { ...l, used: l.used - 1, available: l.available + 1 };
              } else {
                return l;
              }
            })
          );
        }
      }

      // Invalidate parameters cache if the model changes
      if (form.model_id !== prev_model_id) {
        queryClient.invalidateQueries({
          queryKey: queries.parameters(form.alias).queryKey,
        });
        queryClient.invalidateQueries({
          queryKey: queries.vtqcs(form.alias).queryKey,
        });
      }
    },
  });

  return { mutate, isPending };
};

export const useDeleteEquipment = () => {
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (alias: string) => {
      const body = new FormData();
      body.append('alias', alias);

      await jsRequest({
        url: `/equipment_manager/delete_equipment`,
        data: body,
      });

      return alias;
    },
    onSuccess: (alias) => {
      // Delete info cache
      queryClient.removeQueries({ queryKey: queries.info(alias).queryKey });

      // Delete entry in the list cache
      const listQueryKey = queries.list.queryKey;

      const entries = queryClient.getQueryData(listQueryKey);

      if (!entries) {
        return;
      }

      const newEntries: EquipmentEntryType[] = [];
      let deletedLicenseId: number | null = null;

      entries.forEach((entry) => {
        if (entry.alias === alias) {
          // Skip this entry
          deletedLicenseId = entry.license_id;
          return;
        }

        newEntries.push(entry);
      });

      queryClient.setQueryData(listQueryKey, newEntries);

      // Update license cache
      if (deletedLicenseId) {
        const { queryKey } = queries.licenses;

        const licenses = queryClient.getQueryData(queryKey);

        if (licenses) {
          queryClient.setQueryData(
            queryKey,
            licenses.map((l) => {
              if (l.id === deletedLicenseId) {
                return { ...l, used: l.used - 1, available: l.available + 1 };
              } else {
                return l;
              }
            })
          );
        }
      }
    },
  });

  return { mutate, isPending };
};

export const useUpdateParameterMapping = () => {
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (form: UpdateParameterMappingFormType) => {
      const { alias, mappings } = form;

      const body = new FormData();

      body.append('alias', alias);
      body.append('mappings', JSON.stringify(mappings));

      await jsRequest({
        url: `/equipment_manager/update_equipment_parameter_mapping`,
        data: body,
      });

      return form;
    },
    onSuccess: ({ alias, mappings }) => {
      // Update parameters cache
      const { queryKey } = queries.parameters(alias);

      const parameters = queryClient.getQueryData(queryKey);

      if (!parameters) {
        return;
      }

      queryClient.setQueryData(
        queryKey,
        parameters.map(
          ({
            alias,
            name,
            unit,
            gateway_alias,
            tag,
            is_logged,
            is_displayed,
            data_type,
            scale,
            gain_id,
            model_parameter_type_id,
          }) => {
            const mapping = mappings[alias];

            if (mapping) {
              if (mapping.gateway_alias && mapping.tag) {
                gateway_alias = mapping.gateway_alias;
                tag = mapping.tag;
              } else {
                gateway_alias = null;
                tag = null;
              }

              is_logged = mapping.is_logged;
              is_displayed = mapping.is_displayed;

              if (
                model_parameter_type_id &&
                ![9, 10, 11, 12, 13, 14, 16, 99].includes(
                  model_parameter_type_id
                )
              ) {
                gain_id = mapping.gain_id;
              }
            }

            return {
              alias,
              name,
              unit,
              gateway_alias,
              tag,
              is_logged,
              is_displayed,
              data_type,
              scale,
              gain_id,
              model_parameter_type_id,
            };
          }
        )
      );
    },
  });

  return { mutate, isPending };
};

function normalizeNumber(value: number | string | null, noMax?: boolean) {
  if (value === null || typeof value === 'string') {
    return 0;
  }

  if (!noMax && value > 100) {
    return 100;
  }

  if (value < 0) {
    return 0;
  }

  return value;
}

function normalizeNumberNullable(
  value: number | string | null,
  noMax?: boolean
) {
  if (value === null || typeof value === 'string') {
    return null;
  }

  if (!noMax && value > 100) {
    return 100;
  }

  if (value < 0) {
    return 0;
  }

  return value;
}
