import { zodResolver } from '@hookform/resolvers/zod';
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import {
  addRelation,
  getAlarmCodes,
  getIssueRelations,
  getModels,
  getParameters,
  getRelationList,
  updateIssueRelations,
} from '../api/issue-mapping';
import {
  alarmType,
  issueRelationSchema,
  mappingType,
  relationMappingType,
  sourceMappingType,
} from '../schemas';

const queryKeys = {
  model: 'issueMappingModel',
  relation: 'issueMappingRelation',
  alarm: 'issueMappingAlarm',
  parameter: 'issueMappingParameter',
  mapping: 'issueMapping',
  mappingNode: 'issueMappingNodes',
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
  }),
  relation: (params: {
    model_id?: string;
    search: string;
    page: number;
    limit: number;
  }) =>
    queryOptions({
      queryKey: [
        queryKeys.relation,
        params.model_id,
        params.search,
        params.page,
        params.limit,
      ],
      queryFn: async () => {
        if (!params.model_id) return { data: [], count: 0 };
        const response = await getRelationList({
          model_id: Number(params.model_id),
          search: params.search,
          page: params.page,
          limit: params.limit,
        });
        return {
          data: response.data.map((item) => ({
            id: String(item.id),
            name: item.relation_name,
            model_name: item.model_name,
          })),
          count: response.count,
        };
      },
      meta: {
        toastId: 'issueMappingRelation',
      },
    }),
  alarm: (params: { search: string; page: number; limit: number }) =>
    queryOptions({
      queryKey: [queryKeys.alarm, params.search, params.page, params.limit],
      queryFn: async () => {
        const response = await getAlarmCodes({
          search: params.search,
          page: params.page,
          limit: params.limit,
        });
        return {
          data: response.data.map((item) => ({
            id: item.id,
            code: item.code,
            name: item.name,
          })),
          count: response.count,
        };
      },
      meta: {
        toastId: 'issueMappingAlarm',
      },
    }),
  parameter: (params: {
    model_id?: string;
    search: string;
    page: number;
    limit: number;
  }) =>
    queryOptions({
      queryKey: [
        queryKeys.parameter,
        params.model_id,
        params.search,
        params.page,
        params.limit,
      ],
      queryFn: async () => {
        if (!params.model_id) return { data: [], count: 0 };
        const response = await getParameters({
          model_id: Number(params.model_id),
          search: params.search,
          page: params.page,
          limit: params.limit,
        });
        return {
          data: response.data.map((item) => ({
            id: item.id,
            name: item.name,
          })),
          count: response.count,
        };
      },
      meta: {
        toastId: 'issueMappingParameter',
      },
    }),
  mapping: (relation_id?: string) =>
    queryOptions({
      // eslint-disable-next-line @tanstack/query/exhaustive-deps
      queryKey: [{ key: queryKeys.mapping, relation_id }],
      queryFn: () => {
        // TODO: replace with real API when source/target context is needed
        return { source: [] as sourceMappingType[], target: [] as alarmType[] };
      },
      meta: {
        toastId: 'issueMapping',
      },
    }),

  mappingNode: (relation_id?: string) =>
    queryOptions({
      queryKey: [queryKeys.mappingNode, relation_id],
      queryFn: async () => {
        if (!relation_id) return { nodes: [], edges: [] };
        const response = await getIssueRelations({
          relation_id: Number(relation_id),
        });
        return {
          nodes: response.nodes.map((node) => ({
            ...node,
            // positions will be recalculated by ELK layout
            position: node.position,
          })),
          edges: response.edges,
        };
      },
      meta: {
        toastId: queryKeys.mappingNode,
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

export const useGetRelation = (params: {
  model_id?: string;
  search: string;
  page: number;
  limit: number;
}) => {
  const { data, isLoading, isFetching } = useQuery(queries.relation(params));

  return {
    data: data?.data,
    count: data?.count ?? 0,
    isLoading: isLoading || isFetching,
  };
};

export const useGetAlarm = (params: {
  search: string;
  page: number;
  limit: number;
}) => {
  const { data, isLoading, isFetching } = useQuery(queries.alarm(params));

  return {
    data: data?.data,
    count: data?.count ?? 0,
    isLoading: isLoading || isFetching,
  };
};

export const useGetParameter = (params: {
  model_id?: string;
  search: string;
  page: number;
  limit: number;
}) => {
  const { data, isLoading, isFetching } = useQuery(queries.parameter(params));

  return {
    data: data?.data,
    count: data?.count ?? 0,
    isLoading: isLoading || isFetching,
  };
};

export const useGetMapping = (relation_id?: string) => {
  const { data, isLoading, isFetching } = useQuery(
    queries.mapping(relation_id)
  );

  return {
    data,
    isLoading: isLoading || isFetching,
  };
};

export const useGetMappingNodeEdge = (relation_id?: string) => {
  const { data, isLoading, isFetching } = useQuery(
    queries.mappingNode(relation_id)
  );

  return {
    data,
    isLoading: isLoading || isFetching,
  };
};

export const useIssueMappingParams = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  /**
   * params:
   *    - selected model
   *    - selected relation
   *    - search relation
   *    - page relation
   *    - search alarm
   *    - page alarm
   *    - search parameter
   *    - page parameter
   */

  const params = useMemo(() => {
    let relationPage = parseInt(searchParams.get('relation_page') || '1');
    if (isNaN(relationPage) || relationPage <= 0) {
      relationPage = 1;
    }

    let alarmPage = parseInt(searchParams.get('alarm_page') || '1');
    if (isNaN(alarmPage) || alarmPage <= 0) {
      alarmPage = 1;
    }

    let parameterPage = parseInt(searchParams.get('parameter_page') || '1');
    if (isNaN(parameterPage) || parameterPage <= 0) {
      parameterPage = 1;
    }

    return {
      selectedModel: searchParams.get('model') || undefined,
      selectedRelation: searchParams.get('relation') || undefined,
      relationSearch: searchParams.get('relation_search') || '',
      relationPage,
      alarmSearch: searchParams.get('alarm_search') || '',
      alarmPage,
      parameterSearch: searchParams.get('parameter_search') || '',
      parameterPage,
    };
  }, [searchParams]);

  const changeSearchParams = useCallback(
    ({ key, value }: { key: string; value?: string }) => {
      setSearchParams((prev) => {
        if (value) {
          prev.set(key, value);
        } else {
          prev.delete(key);
        }
        return new URLSearchParams(prev);
      });
    },
    [setSearchParams]
  );

  return {
    changeSelectedModel: (value?: string) => {
      changeSearchParams({ key: 'model', value });
    },
    changeSelectedRelation: (value?: string) => {
      changeSearchParams({ key: 'relation', value });
    },
    changeSearchRelation: (value?: string) => {
      changeSearchParams({ key: 'relation_search', value });
    },
    changeSearchAlarm: (value?: string) => {
      changeSearchParams({ key: 'alarm_search', value });
    },
    changeSearchParameter: (value?: string) => {
      changeSearchParams({ key: 'parameter_search', value });
    },
    navigatePageRelation: (value?: string) => {
      changeSearchParams({ key: 'relation_page', value });
    },
    navigatePageAlarm: (value?: string) => {
      changeSearchParams({ key: 'relation_page', value });
    },
    navigatePageParameter: (value?: string) => {
      changeSearchParams({ key: 'relation_page', value });
    },
    ...params,
  };
};

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

export const useAddRelation = (callbacks?: { onSuccess?: () => void }) => {
  const queryClient = useQueryClient();
  const { mutate, isPending } = useMutation({
    mutationFn: addRelation,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [queryKeys.relation],
      });
    },
  });
  const { control, handleSubmit, reset, setValue } = useForm<{
    name: string;
    model_id: number;
  }>({
    defaultValues: {
      name: '',
      model_id: 0,
    },
    resolver: zodResolver(
      issueRelationSchema.omit({ id: true, model_name: true })
    ),
  });

  const onSubmit = handleSubmit(
    (form) => {
      mutate(form, {
        onSuccess: () => {
          toast.success(`Relation ${form.name} successfully added`, {
            toastId: `success_add_relation_${form.name}`,
          });
          setValue('name', '');
          callbacks?.onSuccess?.();
        },
      });
    },
    (e) => {
      console.log(e);
    }
  );

  return { control, onSubmit, reset, setValue, isPending };
};

export const useDeleteRelation = () => {
  const queryClient = useQueryClient();
  const { mutate, isPending } = useMutation({
    mutationFn: async (input: { id: string; name: string }) => {
      await console.log('delete - single relation', input);
      return input;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [queryKeys.relation],
      });
    },
  });

  const onSubmit = (data: { id: string; name: string }) => {
    mutate(data, {
      onSuccess: (data) => {
        toast.success(`Deleted Relation ${data.name}`, {
          toastId: `success_delete_relation_${data.id}`,
        });
      },
    });
  };

  return { onSubmit, isPending };
};

export const useAddAlarm = () => {
  const queryClient = useQueryClient();
  const { mutate, isPending } = useMutation({
    mutationFn: async (input: alarmType[]) => {
      await console.log('submit - bulk alarm', input);
      return input;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [queryKeys.alarm],
      });
    },
  });

  const onSubmit = (data: alarmType[]) => {
    mutate(data, {
      onSuccess: (data) => {
        toast.success(`Added ${data.length} alarms`, {
          toastId: `success_add_bulk_alarm`,
        });
      },
    });
  };

  return { onSubmit, isPending };
};

export const useAddBulkRelationMapping = () => {
  const queryClient = useQueryClient();
  const { mutate, isPending } = useMutation({
    mutationFn: async (input: relationMappingType[]) => {
      await console.log('submit - bulk relation', input);
      return input;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [queryKeys.relation],
      });
    },
  });

  const onSubmit = (data: relationMappingType[]) => {
    mutate(data, {
      onSuccess: (data) => {
        toast.success(`Added ${data.length} relations`, {
          toastId: `success_add_bulk_relation_mapping`,
        });
      },
    });
  };

  return { onSubmit, isPending };
};

export const useAddRelationMapping = () => {
  const queryClient = useQueryClient();
  const { mutate, isPending } = useMutation({
    mutationFn: async (input: relationMappingType) => {
      await console.log('submit - single relation', input);
      return input;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [queryKeys.relation],
      });
    },
  });

  const onSubmit = (data: relationMappingType) => {
    mutate(data, {
      onSuccess: (data) => {
        toast.success(`Updated relation ${data.name}`, {
          toastId: `success_add_relation_mapping`,
        });
      },
    });
  };

  return { onSubmit, isPending };
};

export const useSaveRelationMapping = () => {
  const queryClient = useQueryClient();
  const { mutate, isPending } = useMutation({
    mutationFn: async (input: {
      data: mappingType;
      relation: string;
      id: string;
    }) => {
      await updateIssueRelations({
        relation_id: Number(input.id),
        relation_name: input.relation,
        flow: JSON.stringify(input.data),
      });
      return input;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [queryKeys.mappingNode],
      });
      queryClient.invalidateQueries({
        queryKey: [queryKeys.relation],
      });
    },
  });

  const onSubmit = (data: {
    data: mappingType;
    relation: string;
    id: string;
  }) => {
    mutate(data, {
      onSuccess: (data) => {
        toast.success(`Updated relation ${data.relation}`, {
          toastId: `success_add_relation_mapping`,
        });
      },
    });
  };

  return { onSubmit, isPending };
};
