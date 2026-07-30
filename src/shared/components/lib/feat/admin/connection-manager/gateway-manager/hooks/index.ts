// React builtins
// Reusables
import { jsRequest, t } from '@digital-twin/utils';
// For queries & mutations
import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useContext } from 'react';
// For creating schemas
import { z } from 'zod';

// Contexts
import { PrjCtx } from '../contexts';
// Schemas
import {
  AddGatewayTagsFormType,
  connectedEquipmentsSchema,
  DeleteGatewayTagFormType,
  DeleteGatewayTagsFormType,
  gatewayDetailsSchema,
  GatewayDetailsType,
  gatewayEntrySchema,
  GatewayEntryType,
  gatewayStatusSchema,
  gatewayTagSchema,
  GatewayTagType,
  ReadFormType,
  readResultSchema,
  tagNodeSchema,
  TagNodeType,
  UpdateGatewayTagFormType,
} from '../schemas';

// Query keys
const keys = {
  list: 'gatewayList',
  details: 'gatewayDetails',
  status: 'gatewayStatus',
  tags: 'gatewayTags',
  connectedEquipments: 'gatewayConnectedEquipments',
  browseTags: 'gatewayBrowseTags',
};

// Query factory
const queries = {
  list: (prj: string) =>
    queryOptions({
      queryKey: [keys.list, prj] as const,
      //TODO: remove prj param since it's not used
      queryFn: async ({ queryKey: [, _prj], signal }) =>
        gatewayEntrySchema.array().parse(
          await jsRequest({
            url: `/gateway/getgatewaylist`,
            data: new FormData(),
            signal: signal,
          })
        ),
      meta: {
        toastId: keys.list,
      },
    }),
  details: (prj: string, alias?: string) =>
    queryOptions({
      queryKey: [keys.details, prj, alias] as const,
      //TODO: remove prj param since it's not used
      queryFn: async ({ queryKey: [, _prj, alias], signal }) => {
        if (!alias) {
          throw new Error(t('common.invalid_gateway_alias'));
        }

        const body = new FormData();
        body.append('gateway_alias', alias);

        return gatewayDetailsSchema.parse(
          await jsRequest({
            url: `/gateway/getgatewaydetails`,
            data: body,
            signal: signal,
          })
        );
      },
      enabled: !!alias,
      meta: {
        toastId: keys.details,
      },
    }),
  status: (prj: string, alias?: string) =>
    queryOptions({
      queryKey: [keys.status, prj, alias] as const,
      //TODO: remove prj param since it's not used
      queryFn: async ({ queryKey: [, _prj, alias], signal }) => {
        if (!alias) {
          throw new Error(t('common.invalid_data_source_id'));
        }

        const body = new FormData();
        body.append('gateway_alias', alias);

        return gatewayStatusSchema.parse(
          await jsRequest({
            url: `/gateway/getgatewaystatus`,
            data: body,
            signal: signal,
          })
        );
      },
      enabled: !!alias,
      refetchInterval: 10000,
      meta: {
        toastId: keys.status,
      },
    }),
  tags: (prj: string, alias?: string) =>
    queryOptions({
      queryKey: [keys.tags, prj, alias] as const,
      //TODO: remove prj param since it's not used
      queryFn: async ({ queryKey: [, _prj, alias], signal }) => {
        if (!alias) {
          throw new Error(t('common.invalid_data_source_id'));
        }

        const body = new FormData();
        body.append('gateway_alias', alias);

        return gatewayTagSchema.array().parse(
          await jsRequest({
            url: `/gateway/getgatewaytags`,
            data: body,
            signal: signal,
          })
        );
      },
      enabled: !!alias,
      meta: {
        toastId: keys.tags,
      },
    }),
  connectedEquipments: (prj: string, alias?: string) =>
    queryOptions({
      queryKey: [keys.connectedEquipments, prj, alias] as const,
      //TODO: remove prj param since it's not used
      queryFn: async ({ queryKey: [, _prj, alias], signal }) => {
        if (!alias) {
          throw new Error(t('common.invalid_data_source_id'));
        }

        const body = new FormData();
        body.append('gateway_alias', alias);

        return connectedEquipmentsSchema.parse(
          await jsRequest({
            url: `/gateway/getconnectedequipments`,
            data: body,
            signal: signal,
          })
        );
      },
      enabled: !!alias,
      meta: {
        toastId: keys.connectedEquipments,
      },
    }),
  browseTags: (prj: string, alias?: string, enabled?: boolean) =>
    queryOptions({
      queryKey: [keys.browseTags, prj, alias] as const,
      //TODO: remove prj param since it's not used
      queryFn: async ({ queryKey: [, _prj, alias], signal }) => {
        if (!alias) {
          throw new Error(t('common.invalid_data_source_id'));
        }

        const body = new FormData();
        body.append('gateway_alias', alias);

        return tagNodeSchema.array().parse(
          await jsRequest({
            url: `/gateway/browsegatewaytags`,
            data: body,
            signal: signal,
          })
        );
      },
      enabled: !!alias && !!enabled,
      meta: {
        toastId: keys.browseTags,
      },
      staleTime: 60 * 1000,
    }),
};

export const useGatewayList = () => {
  const prj = useContext(PrjCtx);

  const { data, isLoading, isFetching } = useQuery(queries.list(prj));

  return { data, isLoading: isLoading || isFetching };
};

export const useGatewayDetails = (alias?: string) => {
  const prj = useContext(PrjCtx);

  const { data, isLoading, isFetching } = useQuery(queries.details(prj, alias));

  return { data, isLoading: isLoading || isFetching };
};

export const useGatewayStatus = (alias?: string) => {
  const prj = useContext(PrjCtx);

  const { data, isLoading, isFetching } = useQuery(queries.status(prj, alias));

  return { data, isLoading: isLoading || isFetching };
};

export const useAddGateway = () => {
  const prj = useContext(PrjCtx);
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (details: GatewayDetailsType) => {
      const { alias, name, description, type, params } = details;

      const body = new FormData();
      body.append('alias', alias);
      body.append('name', name);
      body.append('type', type);
      body.append('params', JSON.stringify(params));

      if (description) {
        body.append('description', description);
      }

      await jsRequest({
        url: `/gateway/addgateway`,
        data: body,
      });

      return details;
    },
    onSuccess: (details) => {
      // Don't add to details cache, as we don't have the 'additionals' data

      // Add status cache
      queryClient.setQueryData(queries.status(prj, details.alias).queryKey, {
        is_active: false,
        is_connected: false,
        error: null,
        timestamp: Date.now(),
      });

      // Add tags cache
      queryClient.setQueryData(queries.tags(prj, details.alias).queryKey, []);

      // Add to list cache
      {
        const newEntry: GatewayEntryType = {
          alias: details.alias,
          name: details.name,
          type: details.type,
          description: details.description,
          is_active: false,
          is_connected: false,
        };

        const { queryKey } = queries.list(prj);

        const entries = queryClient.getQueryData(queryKey);

        if (!entries) {
          queryClient.setQueryData(queryKey, [newEntry]);
        } else {
          const newEntries = [...entries, newEntry];
          queryClient.setQueryData(queryKey, newEntries);
        }
      }
    },
  });

  return { mutate, isPending };
};

export const useUpdateGateway = () => {
  const prj = useContext(PrjCtx);
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (details: GatewayDetailsType) => {
      const { alias, name, description, type, params } = details;

      const body = new FormData();
      body.append('alias', alias);
      body.append('name', name);
      body.append('type', type);
      body.append('params', JSON.stringify(params));

      if (description) {
        body.append('description', description);
      }

      await jsRequest({
        url: `/gateway/updategateway`,
        data: body,
      });

      return details;
    },
    onSuccess: (details) => {
      // Update details cache
      queryClient.setQueryData(
        queries.details(prj, details.alias).queryKey,
        details
      );

      // Reset (delete) browsed tags cache as the parameters may change
      queryClient.removeQueries({
        queryKey: queries.browseTags(prj, details.alias).queryKey,
      });

      // Update entry in the list cache
      {
        const { queryKey } = queries.list(prj);

        const entries = queryClient.getQueryData(queryKey);

        if (entries) {
          queryClient.setQueryData(
            queryKey,
            entries.map((entry) => {
              if (entry.alias === details.alias) {
                return {
                  ...entry,
                  name: details.name,
                  type: details.type,
                  description: details.description,
                };
              }

              return entry;
            })
          );
        }
      }
    },
  });

  return { mutate, isPending };
};

export const useDeleteGateway = () => {
  const prj = useContext(PrjCtx);
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (alias: string) => {
      const body = new FormData();
      body.append('gateway_alias', alias);

      await jsRequest({
        url: `/gateway/deletegateway`,
        data: body,
      });

      return alias;
    },
    onSuccess: (alias) => {
      // Delete details cache
      queryClient.removeQueries({
        queryKey: queries.details(prj, alias).queryKey,
      });

      // Delete status cache
      queryClient.removeQueries({
        queryKey: queries.status(prj, alias).queryKey,
      });

      // Delete tags cache
      queryClient.removeQueries({
        queryKey: queries.tags(prj, alias).queryKey,
      });

      // Delete browsed tags cache
      queryClient.removeQueries({
        queryKey: queries.browseTags(prj, alias).queryKey,
      });

      // Delete entry in the list cache
      const listQueryKey = queries.list(prj).queryKey;

      const entries = queryClient.getQueryData(listQueryKey);

      if (entries) {
        queryClient.setQueryData(
          listQueryKey,
          entries.filter((entry) => entry.alias !== alias)
        );
      }
    },
  });

  return { mutate, isPending };
};

export const useTurnOnGateway = () => {
  const prj = useContext(PrjCtx);
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (alias: string) => {
      const body = new FormData();
      body.append('gateway_alias', alias);

      await jsRequest({
        url: `/gateway/turnongateway`,
        data: body,
      });

      return alias;
    },
    onSuccess: (alias) => {
      // Update status cache
      {
        const { queryKey } = queries.status(prj, alias);

        queryClient.setQueryData(queryKey, {
          is_active: true,
          is_connected: true,
          error: null,
          timestamp: Date.now(),
        });
      }

      // Update entry status in the list cache
      {
        const { queryKey } = queries.list(prj);

        const entries = queryClient.getQueryData(queryKey);

        if (entries) {
          queryClient.setQueryData(
            queryKey,
            entries.map((entry) => {
              if (entry.alias === alias) {
                return {
                  ...entry,
                  is_active: true,
                  is_connected: true,
                };
              }

              return entry;
            })
          );
        }
      }
    },
  });

  return { mutate, isPending };
};

export const useTurnOffGateway = () => {
  const prj = useContext(PrjCtx);
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (alias: string) => {
      const body = new FormData();
      body.append('gateway_alias', alias);

      await jsRequest({
        url: `/gateway/turnoffgateway`,
        data: body,
      });

      return alias;
    },
    onSuccess: (alias) => {
      // Update status cache
      {
        const { queryKey } = queries.status(prj, alias);

        queryClient.setQueryData(queryKey, {
          is_active: false,
          is_connected: false,
          error: null,
          timestamp: Date.now(),
        });
      }

      // Update entry status in the list cache
      {
        const { queryKey } = queries.list(prj);

        const entries = queryClient.getQueryData(queryKey);

        if (entries) {
          queryClient.setQueryData(
            queryKey,
            entries.map((entry) => {
              if (entry.alias === alias) {
                return {
                  ...entry,
                  is_active: false,
                  is_connected: false,
                };
              }

              return entry;
            })
          );
        }
      }
    },
  });

  return { mutate, isPending };
};

export const useGatewayTags = (alias?: string) => {
  const prj = useContext(PrjCtx);

  const { data, isLoading, isFetching } = useQuery(queries.tags(prj, alias));

  return { data, isLoading: isLoading || isFetching };
};

export const useAddGatewayTags = () => {
  const prj = useContext(PrjCtx);
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (form: AddGatewayTagsFormType) => {
      const { gateway_alias, gateway_tags } = form;

      const body = new FormData();
      body.append('gateway_alias', gateway_alias);
      body.append('gateway_tags', JSON.stringify(gateway_tags));

      await jsRequest({
        url: `/gateway/addgatewaytags`,
        data: body,
      });

      return form;
    },
    onSuccess: (form) => {
      // Add to tags cache
      const { queryKey } = queries.tags(prj, form.gateway_alias);

      const tags = queryClient.getQueryData(queryKey);

      let newTags: GatewayTagType[];

      if (!tags) {
        newTags = [...form.gateway_tags];
      } else {
        newTags = [...tags, ...form.gateway_tags];
      }

      queryClient.setQueryData(queryKey, newTags);
    },
  });

  return { mutate, isPending };
};

export const useImportGatewayTags = () => {
  const prj = useContext(PrjCtx);
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (form: AddGatewayTagsFormType) => {
      const { gateway_alias, gateway_tags } = form;

      const body = new FormData();
      body.append('gateway_alias', gateway_alias);
      body.append('gateway_tags', JSON.stringify(gateway_tags));

      await jsRequest({
        url: `/gateway/importgatewaytags`,
        data: body,
      });

      return form;
    },
    onSuccess: (form) => {
      // Add to tags cache
      const { queryKey } = queries.tags(prj, form.gateway_alias);

      const tags = queryClient.getQueryData(queryKey);

      let newTags: GatewayTagType[];

      if (!tags) {
        newTags = [...form.gateway_tags];
      } else {
        const newTagRecords = form.gateway_tags.reduce((records, current) => {
          records[current.name] = current;
          return records;
        }, {} as Record<string, GatewayTagType>);

        newTags = [
          ...tags.map((tag) => {
            const updated = newTagRecords[tag.name];

            if (updated) {
              delete newTagRecords[tag.name];
              return updated;
            } else {
              return tag;
            }
          }),
          ...Object.values(newTagRecords),
        ];
      }

      queryClient.setQueryData(queryKey, newTags);
    },
  });

  return { mutate, isPending };
};

export const useUpdateGatewayTag = () => {
  const prj = useContext(PrjCtx);
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (form: UpdateGatewayTagFormType) => {
      const {
        gateway_alias,
        current_tag_name,
        tag_name,
        tag_address,
        tag_description,
      } = form;

      const body = new FormData();
      body.append('gateway_alias', gateway_alias);
      body.append('current_tag_name', current_tag_name);
      body.append('tag_name', tag_name);
      body.append('tag_address', tag_address);

      if (tag_description) {
        body.append('tag_description', tag_description);
      }

      await jsRequest({
        url: `/gateway/updategatewaytag`,
        data: body,
      });

      return form;
    },
    onSuccess: (form) => {
      // Update tag in tags cache
      const { queryKey } = queries.tags(prj, form.gateway_alias);

      const tags = queryClient.getQueryData(queryKey);

      if (tags) {
        const newTags = tags.map((tag) => {
          if (tag.name === form.current_tag_name) {
            return {
              ...tag,
              name: form.tag_name,
              address: form.tag_address,
              description: form.tag_description,
            };
          }

          return tag;
        });

        queryClient.setQueryData(
          queryKey,
          newTags.filter(() => true)
        );
      }
    },
  });

  return { mutate, isPending };
};

export const useDeleteGatewayTag = () => {
  const prj = useContext(PrjCtx);
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (form: DeleteGatewayTagFormType) => {
      const { gateway_alias, tag_name } = form;

      const body = new FormData();
      body.append('gateway_alias', gateway_alias);
      body.append('tag_name', tag_name);

      await jsRequest({
        url: `/gateway/deletegatewaytag`,
        data: body,
      });

      return form;
    },
    onSuccess: (form) => {
      // Delete tag from tags cache
      const { queryKey } = queries.tags(prj, form.gateway_alias);

      const tags = queryClient.getQueryData(queryKey);

      if (tags) {
        queryClient.setQueryData(
          queryKey,
          tags.filter((tag) => tag.name !== form.tag_name)
        );
      }
    },
  });

  return { mutate, isPending };
};

export const useDeleteGatewayTags = () => {
  const prj = useContext(PrjCtx);
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (form: DeleteGatewayTagsFormType) => {
      const { gateway_alias, tags } = form;

      const body = new FormData();
      body.append('gateway_alias', gateway_alias);
      body.append('tag_names', JSON.stringify(tags));

      await jsRequest({
        url: `/gateway/deletegatewaytags`,
        data: body,
      });

      return form;
    },
    onSuccess: (form) => {
      // Delete tags from tags cache
      const { queryKey } = queries.tags(prj, form.gateway_alias);

      const tags = queryClient.getQueryData(queryKey);

      if (tags) {
        const deletedTags: Record<string, true> = {};

        form.tags.forEach((tag) => {
          deletedTags[tag] = true;
        });

        queryClient.setQueryData(
          queryKey,
          tags.filter((tag) => !deletedTags[tag.name])
        );
      }
    },
  });

  return { mutate, isPending };
};

export const useUpdateMQTTServerPassword = () => {
  const { mutate, isPending } = useMutation({
    mutationFn: async (gateway_alias: string) => {
      const body = new FormData();
      body.append('gateway_alias', gateway_alias);

      return {
        gateway_alias,
        new_password: z.string().parse(
          await jsRequest({
            url: `/gateway/updatemqttserverpassword`,
            data: body,
          })
        ),
      };
    },
  });

  return { mutate, isPending };
};

export const useReadTagsOnDemand = () => {
  const { mutate, isPending } = useMutation({
    mutationFn: async ({
      gateway_alias,
      gateway_tag_addresses,
    }: ReadFormType) => {
      const body = new FormData();
      body.append('gateway_alias', gateway_alias);
      body.append(
        'gateway_tag_addresses',
        JSON.stringify(gateway_tag_addresses)
      );

      return readResultSchema.parse(
        await jsRequest({
          url: `/gateway/readtagsondemand`,
          data: body,
        })
      );
    },
  });

  return { mutate, isPending };
};

export const useConnectedEquipments = (alias?: string) => {
  const prj = useContext(PrjCtx);

  const { data, isLoading, isFetching } = useQuery(
    queries.connectedEquipments(prj, alias)
  );

  return { data, isLoading: isLoading || isFetching };
};

export const useBrowseTags = (alias?: string, enabled?: boolean) => {
  const prj = useContext(PrjCtx);

  const { data, isLoading, isFetching } = useQuery(
    queries.browseTags(prj, alias, enabled)
  );

  return { data, isLoading: isLoading || isFetching };
};

export const useBrowseTagsPerLevel = () => {
  const prj = useContext(PrjCtx);
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async ({
      gateway_alias,
      node_id,
    }: {
      gateway_alias: string;
      node_id?: string;
    }) => {
      const body = new FormData();
      body.append('gateway_alias', gateway_alias);

      if (node_id) {
        body.append('node_id', node_id);
      }

      return {
        gateway_alias,
        node_id,
        children: tagNodeSchema.array().parse(
          await jsRequest({
            url: `/gateway/browsegatewaytags`,
            data: body,
          })
        ),
      };
    },
    onSuccess: ({ gateway_alias, node_id, children }) => {
      if (!node_id) {
        return;
      }

      const { queryKey } = queries.browseTags(prj, gateway_alias);

      const tags = queryClient.getQueryData(queryKey);

      if (!tags) {
        return;
      }

      function mapTag(tag: TagNodeType): TagNodeType {
        if (tag.address === node_id) {
          if (tag.children && tag.children.length > 0) {
            const childrenRecords = {} as Record<string, TagNodeType[]>;

            tag.children.forEach((child) => {
              if (child.children) {
                childrenRecords[child.address] = child.children;
              }
            });

            return {
              ...tag,
              children: children.map((child) => {
                const prevChildren = childrenRecords[child.address];

                if (prevChildren) {
                  return {
                    ...child,
                    children: prevChildren,
                  };
                } else {
                  return child;
                }
              }),
            };
          } else {
            return { ...tag, children };
          }
        }

        if (tag.children) {
          return {
            ...tag,
            children: [...tag.children].map(mapTag),
          };
        } else {
          return tag;
        }
      }

      const newTags = [...tags].map(mapTag);

      queryClient.setQueryData(queryKey, newTags);
    },
  });

  return { mutate, isPending };
};

export const useBrowseAllTags = () => {
  const prj = useContext(PrjCtx);
  const queryClient = useQueryClient();

  const { mutate, isPending } = useMutation({
    mutationFn: async (gateway_alias: string) => {
      const body = new FormData();
      body.append('gateway_alias', gateway_alias);
      body.append('depth', '0');

      return {
        gateway_alias,
        tags: tagNodeSchema.array().parse(
          await jsRequest({
            url: `/gateway/browsegatewaytags`,
            data: body,
          })
        ),
      };
    },
    onSuccess: ({ gateway_alias, tags }) => {
      const { queryKey } = queries.browseTags(prj, gateway_alias);
      queryClient.setQueryData(queryKey, tags);
    },
  });

  return { mutate, isPending };
};

export const useExecuteExpression = () => {
  const { mutate, isPending } = useMutation({
    mutationFn: async ({
      expression,
      input_response,
    }: {
      expression: string;
      input_response: string;
    }) => {
      const body = new FormData();
      body.append('expression', expression);
      body.append('input_response', input_response);

      return JSON.stringify(
        await jsRequest({
          url: `/gateway/executeexpression`,
          data: body,
        }),
        null,
        2
      );
    },
  });

  return { mutate, isPending };
};
