/* eslint-disable simple-import-sort/imports */
import { zodResolver } from '@hookform/resolvers/zod';
import { jsRequest, t } from '@digital-twin/utils';
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useContext } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import { z } from 'zod';

import { PrjCtx } from '../contexts';
import {
  AddModelAlarmFormType,
  AddModelDynamicAlarmFormType,
  AddModelFormType,
  baseModelEntrySchema,
  equipmentConnectionEntrySchema,
  ImportModelAlarmsFormType,
  ImportModelDynamicAlarmsFormType,
  ImportModelParametersFormType,
  ModelAlarmEntryType,
  ModelDynamicAlarmEntryType,
  ModelInformationType,
  ModelRunningHourLimitType,
  masterDataEntrySchema,
  modelAlarmEntrySchema,
  modelDynamicAlarmEntrySchema,
  modelInformationSchema,
  modelListSchema,
  modelParameterSchema,
  modelRunningHourLimitSchema,
  modelStatusDefinitionSchema,
  SetModelStatusDefinitionFormType,
  TestFormType,
  testResultSchema,
  UpdateModelAlarmFormType,
  UpdateModelDynamicAlarmFormType,
  UpsertModelParameterFormType,
} from '../schemas';

// Query keys
const keys = {
  bases: 'modelBases',
  list: 'modelList',
  info: 'modelInfo',
  parameters: 'modelParameters',
  equipmentConnections: 'modelEquipmentConnections',
  status: 'modelStatus',
  alarms: 'modelAlarms',
  dynamicAlarms: 'modelDynamicAlarms',
  runningHourLimit: 'modelRunningHourLimit',
  modelDropdowns: 'modelDropdowns',
};

// Query factory
const queries = {
  bases: (prj: string) =>
    queryOptions({
      queryKey: [keys.bases, prj] as const,
      queryFn: async ({ signal }) =>
        baseModelEntrySchema.array().parse(
          await jsRequest({
            url: `/model_manager/get_base_models`,
            data: new FormData(),
            signal: signal,
          })
        ),
      meta: {
        toastId: keys.bases,
      },
    }),
  list: (prj: string) =>
    queryOptions({
      queryKey: [keys.list, prj] as const,
      queryFn: async ({ signal }) => {
        return modelListSchema.parse(
          await jsRequest({
            url: `/model_manager/get_model_list`,
            data: new FormData(),
            signal: signal,
          })
        ).entries;
      },
      meta: {
        toastId: keys.list,
      },
    }),
  info: (prj: string, modelId?: number) =>
    queryOptions({
      queryKey: modelId
        ? ([keys.info, prj, modelId] as const)
        : ([keys.info, prj] as const),
      //TODO: remove prj since it's not used
      queryFn: async ({ queryKey: [, _prj, modelId], signal }) => {
        if (!modelId) {
          throw new Error(t('common.err_invalid_model_id'));
        }

        const body = new FormData();
        body.append('model_id', modelId.toString());

        return modelInformationSchema.parse(
          await jsRequest({
            url: `/model_manager/get_model_info`,
            data: body,
            signal: signal,
          })
        );
      },
      enabled: !!modelId,
      meta: {
        toastId: keys.info,
      },
    }),
  parameters: (prj: string, modelId?: number) =>
    queryOptions({
      queryKey: modelId
        ? ([keys.parameters, prj, modelId] as const)
        : ([keys.parameters, prj] as const),
      //TODO: remove prj since it's not used
      queryFn: async ({ queryKey: [, _prj, modelId], signal }) => {
        if (!modelId) {
          throw new Error(t('common.err_invalid_model_id'));
        }

        const body = new FormData();
        body.append('model_id', modelId.toString());

        return modelParameterSchema.array().parse(
          await jsRequest({
            url: `/model_manager/get_model_parameters`,
            data: body,
            signal: signal,
          })
        );
      },
      enabled: !!modelId,
      meta: {
        toastId: keys.parameters,
      },
    }),
  equipmentConnections: (prj: string, modelId?: number) =>
    queryOptions({
      queryKey: modelId
        ? ([keys.equipmentConnections, prj, modelId] as const)
        : ([keys.equipmentConnections, prj] as const),
      //TODO: remove prj since it's not used
      queryFn: async ({ queryKey: [, _prj, modelId], signal }) => {
        if (!modelId) {
          throw new Error(t('common.err_invalid_model_id'));
        }

        const body = new FormData();
        body.append('model_id', modelId.toString());

        return equipmentConnectionEntrySchema.array().parse(
          await jsRequest({
            url: `/model_manager/get_model_equipment_connection`,
            data: body,
            signal: signal,
          })
        );
      },
      enabled: !!modelId,
      meta: {
        toastId: keys.equipmentConnections,
      },
    }),
  status: (prj: string, modelId?: number) =>
    queryOptions({
      queryKey: modelId
        ? ([keys.status, prj, modelId] as const)
        : ([keys.status, prj] as const),
      //TODO: remove prj since it's not used
      queryFn: async ({ queryKey: [, _prj, modelId], signal }) => {
        if (!modelId) {
          throw new Error(t('common.err_invalid_model_id'));
        }

        const body = new FormData();
        body.append('model_id', modelId.toString());

        return modelStatusDefinitionSchema.parse(
          await jsRequest({
            url: `/model_manager/get_model_status_definitions`,
            data: body,
            signal: signal,
          })
        );
      },
      enabled: !!modelId,
      meta: {
        toastId: keys.status,
      },
    }),
  alarms: (prj: string, modelId?: number) =>
    queryOptions({
      queryKey: modelId
        ? ([keys.alarms, prj, modelId] as const)
        : ([keys.alarms, prj] as const),
      //TODO: remove prj since it's not used
      queryFn: async ({ queryKey: [, _prj, modelId], signal }) => {
        if (!modelId) {
          throw new Error(t('common.err_invalid_model_id'));
        }

        const body = new FormData();
        body.append('model_id', modelId.toString());

        return modelAlarmEntrySchema.array().parse(
          await jsRequest({
            url: `/model_manager/get_model_alarms`,
            data: body,
            signal: signal,
          })
        );
      },
      enabled: !!modelId,
      meta: {
        toastId: keys.alarms,
      },
    }),
  dynamicAlarms: (prj: string, modelId?: number) =>
    queryOptions({
      queryKey: modelId
        ? ([keys.dynamicAlarms, prj, modelId] as const)
        : ([keys.dynamicAlarms, prj] as const),
      //TODO: remove prj since it's not used
      queryFn: async ({ queryKey: [, _prj, modelId], signal }) => {
        if (!modelId) {
          throw new Error(t('common.err_invalid_model_id'));
        }

        const body = new FormData();
        body.append('model_id', modelId.toString());

        return modelDynamicAlarmEntrySchema.array().parse(
          await jsRequest({
            url: `/model_manager/get_model_dynamic_alarms`,
            data: body,
            signal: signal,
          })
        );
      },
      enabled: !!modelId,
      meta: {
        toastId: keys.alarms,
      },
    }),
  runningHourLimit: (modelId: number, enabled?: boolean) =>
    queryOptions({
      queryKey: [keys.runningHourLimit, modelId],
      queryFn: async ({ signal }) => {
        const body = new FormData();
        body.append('model_id', modelId.toString());

        const data = await jsRequest({
          url: `/model_manager/get_running_hour_limit`,
          data: body,
          signal: signal,
        });

        return modelRunningHourLimitSchema.parse({
          warningHour: data.warning_hour,
          criticalHour: data.critical_hour,
          isNotifyWarning: data.is_notify_warning,
          isNotifyCritical: data.is_notify_critical,
          isAutoCreateMaintenance: data.is_auto_create_maintenance,
        });
      },
      enabled,
      meta: {
        toastId: keys.runningHourLimit,
      },
    }),
  models: (enabled?: boolean) =>
    queryOptions({
      queryKey: [keys.modelDropdowns],
      queryFn: async ({ signal }) => {
        const data = await jsRequest({
          url: `/asset/get_models`,
          data: new FormData(),
          signal: signal,
        });
        return masterDataEntrySchema.array().parse(data);
      },
      enabled,
      meta: {
        toastId: keys.modelDropdowns,
      },
    }),
};

export const useModelBases = () => {
  const prj = useContext(PrjCtx);

  const { data, isLoading, isFetching } = useQuery(queries.bases(prj));

  return {
    data,
    isLoading: isLoading || isFetching,
  };
};

export const useModelList = () => {
  const prj = useContext(PrjCtx);

  const { data, isLoading, isFetching } = useQuery(queries.list(prj));

  return {
    data,
    isLoading: isLoading || isFetching,
  };
};

export const useAddModel = () => {
  const prj = useContext(PrjCtx);
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (form: AddModelFormType) => {
      const { name, description, type_id, brand_id, series_id, base_model_id } =
        form;

      const body = new FormData();
      body.append('name', name);
      body.append('description', description);
      body.append('type_id', type_id.toString());
      body.append('brand_id', brand_id.toString());
      body.append('series_id', series_id.toString());

      if (base_model_id) {
        body.append('base_model_id', base_model_id.toString());
      }

      const id = z.number().parse(
        await jsRequest({
          url: `/model_manager/add_model`,
          data: body,
        })
      );

      return { id, ...form };
    },
    onSuccess: (form) => {
      // Invalidate list cache
      queryClient.invalidateQueries({
        queryKey: queries.list(prj).queryKey,
      });

      // Add to bases cache
      if (form.base_model_id === null) {
        const newEntry = {
          id: form.id,
          name: form.name,
          type_id: form.type_id,
          brand_id: form.brand_id,
          series_id: form.series_id,
        };

        const { queryKey } = queries.bases(prj);

        const entries = queryClient.getQueryData(queryKey);

        if (!entries) {
          queryClient.setQueryData(queryKey, [newEntry]);
        } else {
          const newEntries = [...entries, newEntry];
          newEntries.sort((a, b) => a.name.localeCompare(b.name));
          queryClient.setQueryData(queryKey, newEntries);
        }
      }
    },
  });

  return { mutate, isPending };
};

export const useDeleteModel = () => {
  const prj = useContext(PrjCtx);
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (modelId: number) => {
      const body = new FormData();
      body.append('model_id', modelId.toString());

      return z.number().parse(
        await jsRequest({
          url: `/model_manager/delete_model`,
          data: body,
        })
      );
    },
    onSuccess: (modelId) => {
      // Invalidate info cache
      queryClient.invalidateQueries({
        queryKey: queries.info(prj, modelId).queryKey,
      });

      // Invalidate list cache
      queryClient.invalidateQueries({
        queryKey: queries.list(prj).queryKey,
      });

      // Delete from bases cache
      {
        const { queryKey } = queries.bases(prj);

        const entries = queryClient.getQueryData(queryKey);

        if (entries) {
          queryClient.setQueryData(
            queryKey,
            entries.filter((entry) => entry.id !== modelId)
          );
        }
      }
    },
  });

  return { mutate, isPending };
};

export const useModelInformation = (modelId?: number) => {
  const prj = useContext(PrjCtx);

  const { data, isLoading, isFetching } = useQuery(queries.info(prj, modelId));

  return {
    data,
    isLoading: isLoading || isFetching,
  };
};

export const useUpdateModelInformation = () => {
  const prj = useContext(PrjCtx);
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (form: ModelInformationType) => {
      const { id, name, description, type_id, brand_id, series_id } = form;

      const body = new FormData();
      body.append('id', id.toString());
      body.append('name', name);
      body.append('description', description);
      body.append('type_id', type_id.toString());
      body.append('brand_id', brand_id.toString());
      body.append('series_id', series_id.toString());

      await jsRequest({
        url: `/model_manager/update_model_info`,
        data: body,
      });

      return form;
    },
    onSuccess: (form) => {
      // Update info cache
      queryClient.setQueryData(queries.info(prj, form.id).queryKey, form);

      // Invalidate list cache
      queryClient.invalidateQueries({
        queryKey: queries.list(prj).queryKey,
      });

      // Update bases cache
      {
        const { queryKey } = queries.bases(prj);

        const entries = queryClient.getQueryData(queryKey);

        if (entries) {
          queryClient.setQueryData(
            queryKey,
            entries.map((entry) =>
              entry.id === form.id
                ? {
                    ...entry,
                    name: form.name,
                    type_id: form.type_id,
                    brand_id: form.brand_id,
                    series_id: form.series_id,
                  }
                : entry
            )
          );
        }
      }
    },
  });

  return { mutate, isPending };
};

export const useEquipmentConnections = (modelId?: number) => {
  const prj = useContext(PrjCtx);

  const { data, isLoading, isFetching } = useQuery(
    queries.equipmentConnections(prj, modelId)
  );

  return {
    data,
    isLoading: isLoading || isFetching,
  };
};

export const useModelParameters = (modelId?: number) => {
  const prj = useContext(PrjCtx);

  const { data, isLoading, isFetching } = useQuery(
    queries.parameters(prj, modelId)
  );

  return {
    data,
    isLoading: isLoading || isFetching,
  };
};

export const useAddModelParameter = () => {
  const prj = useContext(PrjCtx);
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (form: UpsertModelParameterFormType) => {
      const {
        model_id,
        alias,
        name,
        unit,
        data_type,
        scale,
        gain_id,
        model_parameter_type_id,
      } = form;

      // Validate alias
      if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(alias)) {
        throw new Error(
          t('common.parameter_only_contains_alphanumerics_underscores')
        );
      }

      const body = new FormData();
      body.append('model_id', model_id.toString());
      body.append('parameter_alias', alias);
      body.append('parameter_name', name);
      body.append('parameter_unit', unit);
      body.append('parameter_data_type', data_type);

      if (scale != null) {
        body.append('parameter_scale', scale.toString());
      }

      if (gain_id != null) {
        body.append('parameter_gain_id', gain_id.toString());
      }

      if (model_parameter_type_id != null) {
        body.append('parameter_type_id', model_parameter_type_id.toString());
      }

      await jsRequest({
        url: `/model_manager/add_model_parameter`,
        data: body,
      });

      return form;
    },
    onSuccess: ({ model_id, ...newParameter }) => {
      // Update parameters cache
      const { queryKey } = queries.parameters(prj, model_id);

      const parameters = queryClient.getQueryData(queryKey);

      if (!parameters) {
        queryClient.setQueryData(queryKey, [newParameter]);
      } else {
        const newParameters = [...parameters, newParameter];
        newParameters.sort((a, b) => a.name.localeCompare(b.name));
        queryClient.setQueryData(queryKey, newParameters);
      }
    },
  });

  return { mutate, isPending };
};

export const useUpdateModelParameter = () => {
  const prj = useContext(PrjCtx);
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (form: UpsertModelParameterFormType) => {
      const {
        model_id,
        alias,
        name,
        unit,
        data_type,
        scale,
        gain_id,
        model_parameter_type_id,
      } = form;

      const body = new FormData();
      body.append('model_id', model_id.toString());
      body.append('parameter_alias', alias);
      body.append('parameter_name', name);
      body.append('parameter_unit', unit);
      body.append('parameter_data_type', data_type);

      if (scale != null) {
        body.append('parameter_scale', scale.toString());
      }

      if (gain_id != null) {
        body.append('parameter_gain_id', gain_id.toString());
      }

      if (model_parameter_type_id != null) {
        body.append('parameter_type_id', model_parameter_type_id.toString());
      }

      await jsRequest({
        url: `/model_manager/update_model_parameter`,
        data: body,
      });

      return form;
    },
    onSuccess: ({ model_id, ...newParameter }) => {
      // Update parameters cache
      const { queryKey } = queries.parameters(prj, model_id);

      const parameters = queryClient.getQueryData(queryKey);

      if (parameters) {
        queryClient.setQueryData(
          queryKey,
          parameters.map((parameter) =>
            parameter.alias === newParameter.alias ? newParameter : parameter
          )
        );
      }
    },
  });

  return { mutate, isPending };
};

export const useDeleteModelParameter = () => {
  const prj = useContext(PrjCtx);
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (form: { modelId: number; parameterAlias: string }) => {
      const { modelId, parameterAlias } = form;

      const body = new FormData();
      body.append('model_id', modelId.toString());
      body.append('parameter_alias', parameterAlias);

      await jsRequest({
        url: `/model_manager/delete_model_parameter`,
        data: body,
      });

      return form;
    },
    onSuccess: (form) => {
      // Update parameters cache
      const { queryKey } = queries.parameters(prj, form.modelId);

      const parameters = queryClient.getQueryData(queryKey);

      if (parameters) {
        queryClient.setQueryData(
          queryKey,
          parameters.filter(
            (parameter) => parameter.alias !== form.parameterAlias
          )
        );
      }
    },
  });

  return { mutate, isPending };
};

export const useModelStatus = (modelId?: number) => {
  const prj = useContext(PrjCtx);

  const { data, isLoading, isFetching } = useQuery(
    queries.status(prj, modelId)
  );

  return {
    data,
    isLoading: isLoading || isFetching,
  };
};

export const useSetModelStatus = () => {
  const prj = useContext(PrjCtx);
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (form: SetModelStatusDefinitionFormType) => {
      const { model_id, is_extended, unplanned_down, planned_down, running } =
        form;

      const body = new FormData();
      body.append('model_id', model_id.toString());

      let unplanned_down_script = null;
      if (
        (!is_extended || unplanned_down.is_overriden) &&
        unplanned_down.script
      ) {
        body.append('unplanned_down_script', unplanned_down.script);
        unplanned_down_script = unplanned_down.script;
      }

      let planned_down_script = null;
      if ((!is_extended || planned_down.is_overriden) && planned_down.script) {
        body.append('planned_down_script', planned_down.script);
        planned_down_script = planned_down.script;
      }

      let running_script = null;
      if ((!is_extended || running.is_overriden) && running.script) {
        body.append('running_script', running.script);
        running_script = running.script;
      }

      await jsRequest({
        url: `/model_manager/upsert_model_status_definitions`,
        data: body,
      });

      return {
        model_id: form.model_id,
        unplanned_down_script,
        planned_down_script,
        running_script,
      };
    },
    onSuccess: (form) => {
      // Update status cache
      const { queryKey } = queries.status(prj, form.model_id);

      const status = queryClient.getQueryData(queryKey);

      if (status) {
        queryClient.setQueryData(queryKey, {
          ...status,
          unplanned_down_script: form.unplanned_down_script,
          planned_down_script: form.planned_down_script,
          running_script: form.running_script,
        });
      }
    },
  });

  return { mutate, isPending };
};

export const useModelAlarms = (modelId?: number) => {
  const prj = useContext(PrjCtx);

  const { data, isLoading, isFetching } = useQuery(
    queries.alarms(prj, modelId)
  );

  return {
    data,
    isLoading: isLoading || isFetching,
  };
};

export const useAddModelAlarm = () => {
  const prj = useContext(PrjCtx);
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (form: AddModelAlarmFormType) => {
      const { model_id, name, criticality, issue_id, message, script } = form;

      if (!script) {
        throw new Error(t('common.alarm_script_must_not_empty'));
      }

      const body = new FormData();
      body.append('model_id', model_id.toString());
      body.append('name', name);
      body.append('criticality', criticality.toString());
      body.append('issue_id', issue_id.toString());
      body.append('message', message);
      body.append('script', script);

      const alarm_id = z.number().parse(
        await jsRequest({
          url: `/model_manager/add_model_alarm`,
          data: body,
        })
      );

      return { alarm_id, ...form };
    },
    onSuccess: (form) => {
      const newAlarm = {
        ...form,
        is_disabled: false,
        base_script: null,
      };

      // Update alarms cache
      const { queryKey } = queries.alarms(prj, form.model_id);

      const alarms = queryClient.getQueryData(queryKey);

      if (!alarms) {
        queryClient.setQueryData(queryKey, [newAlarm]);
      } else {
        const newAlarms = [...alarms, newAlarm];
        newAlarms.sort((a, b) => a.name.localeCompare(b.name));
        queryClient.setQueryData(queryKey, newAlarms);
      }
    },
  });

  return { mutate, isPending };
};

export const useUpdateModelAlarm = () => {
  const prj = useContext(PrjCtx);
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (form: UpdateModelAlarmFormType) => {
      const {
        model_id,
        alarm_id,
        name,
        criticality,
        issue_category_id,
        issue_id,
        message,
        is_extended,
        script,
      } = form;

      const body = new FormData();
      body.append('model_id', model_id.toString());
      body.append('alarm_id', alarm_id.toString());
      body.append('name', name);
      body.append('criticality', criticality.toString());
      body.append('issue_id', issue_id.toString());
      body.append('message', message);

      let script_value = null;

      if ((!is_extended || script.is_overriden) && script.script) {
        body.append('script', script.script);
        script_value = script.script;
      }

      await jsRequest({
        url: `/model_manager/update_model_alarm`,
        data: body,
      });

      return {
        model_id: model_id,
        alarm_id: alarm_id,
        name: name,
        criticality: criticality,
        issue_category_id: issue_category_id,
        issue_id: issue_id,
        message: message,
        script: script_value,
      };
    },
    onSuccess: (form) => {
      // Update alarms cache
      const { queryKey } = queries.alarms(prj, form.model_id);

      const alarms = queryClient.getQueryData(queryKey);

      if (alarms) {
        queryClient.setQueryData(
          queryKey,
          alarms.map((alarm) =>
            alarm.alarm_id === form.alarm_id
              ? {
                  ...alarm,
                  name: form.name,
                  criticality: form.criticality,
                  issue_category_id: form.issue_category_id,
                  issue_id: form.issue_id,
                  message: form.message,
                  script: form.script,
                }
              : alarm
          )
        );
      }
    },
  });

  return { mutate, isPending };
};

export const useDeleteModelAlarm = () => {
  const prj = useContext(PrjCtx);
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (form: { modelId: number; alarmId: number }) => {
      const { modelId, alarmId } = form;

      const body = new FormData();
      body.append('model_id', modelId.toString());
      body.append('alarm_id', alarmId.toString());

      await jsRequest({
        url: `/model_manager/delete_model_alarm`,
        data: body,
      });

      return form;
    },
    onSuccess: (form) => {
      // Update alarms cache
      const { queryKey } = queries.alarms(prj, form.modelId);

      const alarms = queryClient.getQueryData(queryKey);

      if (alarms) {
        const newAlarms: ModelAlarmEntryType[] = [];

        alarms.forEach((alarm) => {
          if (alarm.alarm_id !== form.alarmId) {
            newAlarms.push(alarm);
            return;
          }

          if (alarm.model_id === form.modelId) {
            // Alarm is not extended, so skip this alarms (delete)
          } else {
            // Alarm is extended, so disable this alarm
            newAlarms.push({ ...alarm, is_disabled: true });
          }
        });

        queryClient.setQueryData(queryKey, newAlarms);
      }
    },
  });

  return { mutate, isPending };
};

export const useRestoreModelAlarm = () => {
  const prj = useContext(PrjCtx);
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (form: { modelId: number; alarmId: number }) => {
      const { modelId, alarmId } = form;

      const body = new FormData();
      body.append('model_id', modelId.toString());
      body.append('alarm_id', alarmId.toString());

      await jsRequest({
        url: `/model_manager/restore_model_alarm`,
        data: body,
      });

      return form;
    },
    onSuccess: (form) => {
      // Update alarms cache
      const { queryKey } = queries.alarms(prj, form.modelId);

      const alarms = queryClient.getQueryData(queryKey);

      if (alarms) {
        queryClient.setQueryData(
          queryKey,
          alarms.map((alarm) =>
            alarm.alarm_id === form.alarmId
              ? { ...alarm, is_disabled: false }
              : alarm
          )
        );
      }
    },
  });

  return { mutate, isPending };
};

export const useTestStatusAndAlarms = () => {
  const { mutate, isPending } = useMutation({
    mutationFn: async (form: TestFormType) => {
      const { model_id, values } = form;

      // Normalize values
      const normalizedValues = {} as Record<
        string,
        { v: number | string | boolean; t: number; q: boolean }
      >;

      for (const key in values) {
        normalizedValues[key] = {
          v: values[key].v,
          t: Date.now(),
          q: values[key].q,
        };
      }

      const body = new FormData();
      body.append('model_id', model_id.toString());
      body.append('values', JSON.stringify(normalizedValues));

      return testResultSchema.parse(
        await jsRequest({
          url: `/model_manager/test_status_and_alarms`,
          data: body,
        })
      );
    },
  });

  return { mutate, isPending };
};

export const useSyncBaseModelParameters = () => {
  const prj = useContext(PrjCtx);
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (model_id: number) => {
      const body = new FormData();
      body.append('model_id', model_id.toString());

      return z
        .number()
        .array()
        .parse(
          await jsRequest({
            url: `/model_manager/sync_base_model_parameters`,
            data: body,
          })
        );
    },
    onSuccess: (affectedModelIds) => {
      // Invalidate parameter cache for all affected model ids
      affectedModelIds.forEach((modelId) => {
        queryClient.invalidateQueries({
          queryKey: queries.parameters(prj, modelId).queryKey,
        });
      });
    },
  });

  return { mutate, isPending };
};

export const useImportModelAlarms = () => {
  const prj = useContext(PrjCtx);
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (form: ImportModelAlarmsFormType) => {
      const { model_id, alarms } = form;

      if (alarms.length === 0) {
        throw new Error('Empty alarms');
      }

      const body = new FormData();
      body.append('model_id', model_id.toString());
      body.append('alarms', JSON.stringify(alarms));

      await jsRequest({
        url: `/model_manager/import_model_alarms`,
        data: body,
      });

      return model_id;
    },
    onSuccess: (model_id) => {
      // Invalidate alarms cache
      queryClient.invalidateQueries({
        queryKey: queries.alarms(prj, model_id).queryKey,
      });
    },
  });

  return { mutate, isPending };
};

export const useModelDynamicAlarms = (modelId?: number) => {
  const prj = useContext(PrjCtx);

  const { data, isLoading, isFetching } = useQuery(
    queries.dynamicAlarms(prj, modelId)
  );

  return {
    data,
    isLoading: isLoading || isFetching,
  };
};

export const useAddModelDynamicAlarm = () => {
  const prj = useContext(PrjCtx);
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (form: AddModelDynamicAlarmFormType) => {
      const { model_id, name, script } = form;

      if (!script) {
        throw new Error(t('common.alarm_script_must_not_empty'));
      }

      const body = new FormData();
      body.append('model_id', model_id.toString());
      body.append('name', name);
      body.append('script', script);

      const alarm_id = z.number().parse(
        await jsRequest({
          url: `/model_manager/add_model_dynamic_alarm`,
          data: body,
        })
      );

      return { alarm_id, ...form };
    },
    onSuccess: (form) => {
      const newAlarm = {
        ...form,
        is_disabled: false,
        base_script: null,
      };

      // Update alarms cache
      const { queryKey } = queries.dynamicAlarms(prj, form.model_id);

      const alarms = queryClient.getQueryData(queryKey);

      if (!alarms) {
        queryClient.setQueryData(queryKey, [newAlarm]);
      } else {
        const newAlarms = [...alarms, newAlarm];
        newAlarms.sort((a, b) => a.name.localeCompare(b.name));
        queryClient.setQueryData(queryKey, newAlarms);
      }
    },
  });

  return { mutate, isPending };
};

export const useUpdateModelDynamicAlarm = () => {
  const prj = useContext(PrjCtx);
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (form: UpdateModelDynamicAlarmFormType) => {
      const { model_id, alarm_id, name, is_extended, script } = form;

      const body = new FormData();
      body.append('model_id', model_id.toString());
      body.append('alarm_id', alarm_id.toString());
      body.append('name', name);

      let script_value = null;

      if ((!is_extended || script.is_overriden) && script.script) {
        body.append('script', script.script);
        script_value = script.script;
      }

      await jsRequest({
        url: `/model_manager/update_model_dynamic_alarm`,
        data: body,
      });

      return {
        model_id: model_id,
        alarm_id: alarm_id,
        name: name,
        script: script_value,
      };
    },
    onSuccess: (form) => {
      // Update alarms cache
      const { queryKey } = queries.dynamicAlarms(prj, form.model_id);

      const alarms = queryClient.getQueryData(queryKey);

      if (alarms) {
        queryClient.setQueryData(
          queryKey,
          alarms.map((alarm) =>
            alarm.alarm_id === form.alarm_id
              ? {
                  ...alarm,
                  name: form.name,
                  script: form.script,
                }
              : alarm
          )
        );
      }
    },
  });

  return { mutate, isPending };
};

export const useDeleteModelDynamicAlarm = () => {
  const prj = useContext(PrjCtx);
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (form: { modelId: number; alarmId: number }) => {
      const { modelId, alarmId } = form;

      const body = new FormData();
      body.append('model_id', modelId.toString());
      body.append('alarm_id', alarmId.toString());

      await jsRequest({
        url: `/model_manager/delete_model_dynamic_alarm`,
        data: body,
      });

      return form;
    },
    onSuccess: (form) => {
      // Update alarms cache
      const { queryKey } = queries.dynamicAlarms(prj, form.modelId);

      const alarms = queryClient.getQueryData(queryKey);

      if (alarms) {
        const newAlarms: ModelDynamicAlarmEntryType[] = [];

        alarms.forEach((alarm) => {
          if (alarm.alarm_id !== form.alarmId) {
            newAlarms.push(alarm);
            return;
          }

          if (alarm.model_id === form.modelId) {
            // Alarm is not extended, so skip this alarms (delete)
          } else {
            // Alarm is extended, so disable this alarm
            newAlarms.push({ ...alarm, is_disabled: true });
          }
        });

        queryClient.setQueryData(queryKey, newAlarms);
      }
    },
  });

  return { mutate, isPending };
};

export const useRestoreModelDynamicAlarm = () => {
  const prj = useContext(PrjCtx);
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (form: { modelId: number; alarmId: number }) => {
      const { modelId, alarmId } = form;

      const body = new FormData();
      body.append('model_id', modelId.toString());
      body.append('alarm_id', alarmId.toString());

      await jsRequest({
        url: `/model_manager/restore_model_dynamic_alarm`,
        data: body,
      });

      return form;
    },
    onSuccess: (form) => {
      // Update alarms cache
      const { queryKey } = queries.dynamicAlarms(prj, form.modelId);

      const alarms = queryClient.getQueryData(queryKey);

      if (alarms) {
        queryClient.setQueryData(
          queryKey,
          alarms.map((alarm) =>
            alarm.alarm_id === form.alarmId
              ? { ...alarm, is_disabled: false }
              : alarm
          )
        );
      }
    },
  });

  return { mutate, isPending };
};

export const useImportModelDynamicAlarms = () => {
  const prj = useContext(PrjCtx);
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (form: ImportModelDynamicAlarmsFormType) => {
      const { model_id, alarms } = form;

      if (alarms.length === 0) {
        throw new Error(t('common.empty_alarms'));
      }

      const body = new FormData();
      body.append('model_id', model_id.toString());
      body.append('alarms', JSON.stringify(alarms));

      await jsRequest({
        url: `/model_manager/import_model_dynamic_alarms`,
        data: body,
      });

      return model_id;
    },
    onSuccess: (model_id) => {
      // Invalidate alarms cache
      queryClient.invalidateQueries({
        queryKey: queries.dynamicAlarms(prj, model_id).queryKey,
      });
    },
  });

  return { mutate, isPending };
};

export const useImportModelParameters = () => {
  const prj = useContext(PrjCtx);
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (form: ImportModelParametersFormType) => {
      const { model_id, parameters } = form;

      if (parameters.length === 0) {
        throw new Error(t('common.empty_parameters'));
      }

      const body = new FormData();
      body.append('model_id', model_id.toString());
      body.append(
        'parameters',
        JSON.stringify(
          parameters.map((parameter) => {
            const { decimals, ...x } = parameter;

            if (parameter.data_type === 'number' && decimals) {
              const parsed = parseInt(decimals);
              return { ...x, scale: isNaN(parsed) ? null : parsed };
            } else {
              return { ...x, scale: null };
            }
          })
        )
      );

      await jsRequest({
        url: `/model_manager/import_model_parameters`,
        data: body,
      });

      return model_id;
    },
    onSuccess: (model_id) => {
      // Invalidate parameters cache
      queryClient.invalidateQueries({
        queryKey: queries.parameters(prj, model_id).queryKey,
      });
    },
  });

  return { mutate, isPending };
};

export const useModelRunningHourLimit = (modelId: number | undefined) => {
  const { data } = useQuery(
    queries.runningHourLimit(modelId ?? 0, modelId != null)
  );

  const { control, handleSubmit } = useForm<ModelRunningHourLimitType>({
    resolver: zodResolver(modelRunningHourLimitSchema),
    values: data,
  });

  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: ModelRunningHourLimitType) => {
      const body = new FormData();

      body.append('model_id', (modelId ?? 0).toString());
      body.append('warning_hour', data.warningHour.toString());
      body.append('critical_hour', data.criticalHour.toString());
      body.append('is_notify_warning', data.isNotifyWarning.toString());
      body.append('is_notify_critical', data.isNotifyCritical.toString());
      body.append(
        'is_auto_create_maintenance',
        data.isAutoCreateMaintenance.toString()
      );

      await jsRequest({
        url: `/model_manager/update_running_hour_limit`,
        data: body,
      });
    },
    onSuccess: () => {
      toast.success('Success');
      queryClient.invalidateQueries({
        queryKey: queries.runningHourLimit(modelId ?? 0).queryKey,
      });
    },
  });

  return {
    control,
    isPending,
    handleSubmit: handleSubmit((data) => mutate(data)),
  };
};

export const useModelDropdowns = () => {
  const { data, isLoading, isFetching } = useQuery(queries.models());
  return {
    data,
    isLoading: isLoading || isFetching,
  };
};
