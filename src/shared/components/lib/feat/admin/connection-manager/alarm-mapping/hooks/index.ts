import { zodResolver } from '@hookform/resolvers/zod';
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import { alarmType, mappingSchema, mappingType } from '../schemas';
import { getModels } from '../../issue-mapping/api/issue-mapping';
import {
  getAlarmCodesMapping,
  getParameterList,
  getSelectedParameters,
} from '../api/alarm-mapping';

export const useSearchAndPaginate = <T>(
  data: T[],
  search: string,
  properties: Array<keyof T>,
  limit: number,
  page: number
) => {
  return useMemo(() => {
    const filteredData = search
      ? data.filter((item) =>
          properties.some((property) =>
            String(item[property]).toLowerCase().includes(search.toLowerCase())
          )
        )
      : data;

    const startIndex = (page - 1) * limit;
    const paginatedData = filteredData.slice(startIndex, startIndex + limit);

    return {
      paginatedData,
    };
  }, [data, search, properties, limit, page]);
};

export const useParams = (key: string): [v: string, s: (v: string) => void] => {
  const [searchParams, setSearchParams] = useSearchParams();
  const value = useMemo(() => {
    return searchParams.get(key) || '';
  }, [searchParams, key]);
  const setValue = useCallback(
    (value: string) => {
      setSearchParams((prev) => {
        prev.set(key, value);
        return new URLSearchParams(prev);
      });
    },
    [setSearchParams, key]
  );
  return [value, setValue];
};

const alarms = [
  { id: 1, code: '5301', name: 'ACCT Sensor Fault', map: true },
  { id: 2, code: '3390', name: 'System Overheat', map: true },
  { id: 3, code: '1154', name: 'Compressor Failure', map: true },
  { id: 4, code: '8832', name: 'Water Pump Overload', map: false },
  { id: 5, code: '2678', name: 'High Discharge Temp', map: true },
  { id: 6, code: '9421', name: 'Low Condenser Pressure', map: false },
  { id: 7, code: '4712', name: 'Refrigerant Leak', map: false },
  { id: 8, code: '6578', name: 'Chiller Vibration', map: true },
  { id: 9, code: '7256', name: 'Low Oil Pressure', map: true },
  { id: 10, code: '1045', name: 'Power Supply Fault', map: true },
  { id: 11, code: '2199', name: 'Fan Motor Failure', map: false },
  { id: 12, code: '3321', name: 'Evaporator Freeze', map: true },
  { id: 13, code: '4487', name: 'Control Board Error', map: true },
  { id: 14, code: '5560', name: 'High Suction Pressure', map: false },
  { id: 15, code: '6013', name: 'Low Ambient Temp', map: true },
  { id: 16, code: '7144', name: 'Phase Imbalance', map: false },
  { id: 17, code: '8290', name: 'Startup Timeout', map: true },
  { id: 18, code: '9066', name: 'Sensor Communication Loss', map: false },
  { id: 19, code: '9782', name: 'Emergency Shutdown Triggered', map: true },
];

const parameters = [
  {
    id: 270,
    name: 'CO2',
  },
  {
    id: 271,
    name: 'Damper Ctrl',
  },
  {
    id: 272,
    name: 'EC1 On Status',
  },
  {
    id: 273,
    name: 'EC1 Trip',
  },
  {
    id: 274,
    name: 'EC2 On Status',
  },
  {
    id: 275,
    name: 'EC2 Trip',
  },
  {
    id: 276,
    name: 'EC3 On Status',
  },
  {
    id: 277,
    name: 'EC3 Trip',
  },
  {
    id: 278,
    name: 'EC5 On Status',
  },
  {
    id: 279,
    name: 'EC5 Trip',
  },
  {
    id: 282,
    name: 'Mode',
  },
  {
    id: 283,
    name: 'RARH',
  },
  {
    id: 284,
    name: 'RA Temp',
  },
  {
    id: 285,
    name: 'SA Flow',
  },
  {
    id: 286,
    name: 'SA Pressure',
  },
  {
    id: 287,
    name: 'SA Temp',
  },
  {
    id: 288,
    name: 'Smoke',
  },
  {
    id: 289,
    name: 'Start Stop',
  },
];

const queryKeys = {
  model: 'alarmMappingModel',
  alarm: 'alarmMappingAlarm',
  alarmCodesMapping: 'alarmMappingAlarmCodesMapping',
  parameter: 'alarmMappingParameter',
  parameterList: 'alarmMappingParameterList',
  selectedParameters: 'alarmMappingSelectedParameters',
  mapping: 'alarmMapping',
};
const queries = {
  model: queryOptions({
    queryKey: [queryKeys.model],
    queryFn: async () => {
      const models = await getModels();
      return models.map((model) => ({
        id: String(model.id),
        name: model.name,
      }));
    },
    meta: {
      toastId: 'issueMappingModel',
    },
    gcTime: 0,
    staleTime: 0,
  }),
  alarm: queryOptions({
    queryKey: [queryKeys.alarm, alarms],
    queryFn: () => {
      return alarms;
    },
    meta: {
      toastId: queryKeys.alarm,
    },
    gcTime: 0,
    staleTime: 0,
  }),
  parameter: (params: { model_id: number; alarm_id: number }) =>
    queryOptions({
      queryKey: [queryKeys.parameter, parameters, params],
      queryFn: () => {
        console.log(params);
        return parameters;
      },
      meta: {
        toastId: queryKeys.parameter,
      },
    }),
  mapping: (params: { model_id: number; alarm_id: number }) =>
    queryOptions({
      queryKey: [queryKeys.mapping, params],
      queryFn: () => {
        console.log(params);
        return [];
      },
      meta: {
        toastId: queryKeys.mapping,
      },
    }),
};

export const useGetModel = () => {
  const { data, isLoading, isFetching } = useQuery(queries.model);

  return {
    data,
    isLoading: isLoading || isFetching,
  };
};
export const useGetAlarm = () => {
  const { data, isLoading, isFetching } = useQuery(queries.alarm);

  return {
    data,
    isLoading: isLoading || isFetching,
  };
};

export const useGetAlarmCodesMapping = (params: {
  model_id: number;
  search: string;
  page: number;
  limit: number;
}) => {
  const { data, isLoading, isFetching } = useQuery({
    queryKey: [queryKeys.alarmCodesMapping, params],
    queryFn: () => getAlarmCodesMapping(params),
    enabled: !!params.model_id && params.limit > 0,
    meta: {
      toastId: queryKeys.alarmCodesMapping,
    },
  });

  return {
    data: data?.data,
    mappedCount: data?.mapped_count ?? 0,
    unmappedCount: data?.unmapped_count ?? 0,
    isLoading: isLoading || isFetching,
  };
};

export const useGetParameterList = (params: {
  model_id: number;
  search: string;
  page: number;
  limit: number;
}) => {
  const { data, isLoading, isFetching } = useQuery({
    queryKey: [queryKeys.parameterList, params],
    queryFn: () => getParameterList(params),
    enabled: !!params.model_id && params.limit > 0,
    meta: {
      toastId: queryKeys.parameterList,
    },
    gcTime: 0,
    staleTime: 0,
  });

  return {
    data: data?.data,
    count: data?.count ?? 0,
    isLoading: isLoading || isFetching,
  };
};

export const useGetSelectedParameters = (params: {
  model_id: number;
  alarm_code_id: number;
}) => {
  const { data, isLoading, isFetching } = useQuery({
    queryKey: [queryKeys.selectedParameters, params],
    queryFn: () => getSelectedParameters(params),
    enabled: !!params.model_id && !!params.alarm_code_id,
    meta: {
      toastId: queryKeys.selectedParameters,
    },
    gcTime: 0,
    staleTime: 0,
  });

  return {
    data,
    isLoading: isLoading || isFetching,
  };
};

export const useGetParameter = (params: {
  model_id: number;
  alarm_id: number;
}) => {
  const { data, isLoading, isFetching } = useQuery(queries.parameter(params));

  return {
    data,
    isLoading: isLoading || isFetching,
  };
};
export const useGetMapping = (params: {
  model_id: number;
  alarm_id: number;
}) => {
  const { data, isLoading, isFetching } = useQuery(queries.mapping(params));

  return {
    data,
    isLoading: isLoading || isFetching,
  };
};

export const useMapping = () => {
  const [selectedAlarm, setSelectedAlarm] = useState<alarmType>({
    id: 0,
    code: '',
    name: '',
    map: false,
  });
  const [selectedmodel, setSelectedModel] = useState<number>(0);
  const { setValue, watch, handleSubmit } = useForm<mappingType>({
    defaultValues: {
      alarm: selectedAlarm.id,
      model: selectedmodel,
      parameter: [],
    },
    resolver: zodResolver(mappingSchema),
  });
  useEffect(() => {
    setValue('alarm', selectedAlarm.id);
  }, [selectedAlarm, setValue]);
  useEffect(() => {
    setValue('model', selectedmodel);
  }, [selectedmodel, setValue]);

  const { data: parameters } = useGetParameter({
    alarm_id: selectedAlarm.id,
    model_id: selectedmodel,
  });
  const { data: mapping } = useGetMapping({
    alarm_id: selectedAlarm.id,
    model_id: selectedmodel,
  });
  useEffect(() => {
    setValue('parameter', mapping || []);
  }, [mapping]);

  const queryClient = useQueryClient();

  const { mutate: deleteMapping } = useMutation({
    mutationFn: async (input: Omit<mappingType, 'parameter'>) => {
      await console.log(input);
      return input;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['alarmMapping'],
      });
    },
  });
  const Delete = useCallback(() => {
    deleteMapping(
      {
        alarm: selectedAlarm.id,
        model: selectedmodel,
      },
      {
        onSuccess: () => {
          toast.success(`Mapping deleted`, {
            toastId: `success_delete_mapping_${selectedAlarm.id}`,
          });
        },
      }
    );
  }, [selectedAlarm, selectedmodel, deleteMapping]);

  const { mutate: saveMapping } = useMutation({
    mutationFn: async (input: mappingType) => {
      await console.log(input);
      return input;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['alarmMapping'],
      });
    },
  });
  const Reset = useCallback(
    () => setValue('parameter', mapping || []),
    [setValue, mapping]
  );
  const Save = handleSubmit(
    (form) => {
      saveMapping(form, {
        onSuccess: () => {
          toast.success(`Mapping saved`, {
            toastId: `success_save_mapping_${form.alarm}`,
          });
        },
      });
    },
    (e) => {
      console.log(e);
    }
  );

  return {
    selectedAlarm,
    setSelectedAlarm,
    selectedModel: selectedmodel,
    setSelectedModel,
    watchForm: watch,
    setValueForm: setValue,
    parameters: parameters || [],
    Delete,
    Reset,
    Save,
  };
};

export function useResizeObserver<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, []);

  return { ref, size };
}
