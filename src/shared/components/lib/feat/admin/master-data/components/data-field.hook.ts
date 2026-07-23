import { zodResolver } from '@hookform/resolvers/zod';
import { t } from '@digital-twin/utils';
import { toast } from '@digital-twin/reusables';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChangeEvent,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom';

import { AuthCtx, useDebounce } from '../../../../../index';
import {
  addCostType,
  addDefect,
  addFeedbackIssue,
  addSourceType,
  addTypeBrandSeries,
  capitalizeFirstLetter,
  deleteEntry,
  getCategoryName,
  getDataFields,
  getIssueIdByID,
  ListType,
  masterItemSchema,
  MasterItemType,
  updateName,
  updateOrder,
} from '../api/master.api';

export const useDataField = () => {
  const [searchParams, setSearchparams] = useSearchParams();
  const group = searchParams.get('group');
  const categoryId = searchParams.get('category_id');
  const fieldId = searchParams.get('field_id');
  const fieldSearchParam = searchParams.get('field_search');

  const queryClient = useQueryClient();

  const [fieldList, setFieldList] = useState<ListType[]>([]);
  const fieldRef = useRef<HTMLDivElement | null>(null);
  const fieldListRef = useRef<HTMLDivElement | null>(null);
  const [selectedField, setSelectedField] = useState<null | number>(
    fieldId ? parseInt(fieldId) : null
  );
  const [selectedDragField, setSelectedDragField] = useState<null | ListType>(
    null
  );
  const [isDragging, setIsDragging] = useState(false);
  const [fieldSearch, setFieldSearch] = useState<string>(
    fieldSearchParam ?? ''
  );
  const [editFormMode, setEditFormMode] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [inputDisabled, setInputDisabled] = useState(true);

  const { debouncedVal: fieldSearchValue } = useDebounce(fieldSearch, 500);

  const { hasPermission } = useContext(AuthCtx);
  const { hasCreate, hasRead, hasUpdate, hasDelete } = {
    hasCreate: hasPermission('masterdata', 'create'),
    hasRead: hasPermission('masterdata', 'read'),
    hasUpdate: hasPermission('masterdata', 'update'),
    hasDelete: hasPermission('masterdata', 'delete'),
  };

  const getSchemaAndTable = useMemo(() => {
    let schema = '',
      table = '';

    if (group === 'feedback') {
      schema = 'feedback';
      table = 'feedback_issues';
    } else if (group === 'production') {
      schema = 'production';
      table = 'defects';
    } else if (group === 'asset') {
      schema = 'asset';
      if (categoryId === '1') {
        table = 'types';
      } else if (categoryId === '2') {
        table = 'brands';
      } else if (categoryId === '3') {
        table = 'series';
      } else if (categoryId === '4') {
        schema = 'dm';
        table = 'alarms';
      }
    }

    return [schema, table];
  }, [group, categoryId]);

  const [schema, table] = getSchemaAndTable;

  const { data: fields, refetch: refetchFields } = useQuery({
    queryKey: [
      'getFields',
      categoryId,
      group,
      fieldSearchValue,
      schema,
      table,
    ] as const,
    queryFn: async (): Promise<ListType[] | null> => {
      if (!group || !categoryId) return null;
      return await getDataFields(
        schema,
        table,
        parseInt(categoryId),
        String(fieldSearchValue)
      );
    },
    meta: {
      toastId: [
        'getFields',
        categoryId,
        group,
        fieldSearchValue,
        schema,
        table,
      ],
    },
  });

  const handleFieldDrag = (
    id: string,
    e: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    const targetElement = fieldRef.current as HTMLDivElement;
    targetElement.style.display = 'flex';
    setIsDragging(true);

    if (fieldRef.current) {
      targetElement.style.top = `${
        e.clientY - targetElement.getBoundingClientRect().height / 2
      }px`;
      targetElement.style.position = 'absolute';
    }

    const selected = fieldList.find(
      (category) => category.order_id === parseInt(id)
    );
    setFieldList((prev) =>
      prev.map((category) => {
        if (category.order_id === parseInt(id)) {
          return { ...category, visible: false };
        } else {
          return category;
        }
      })
    );
    if (selected) {
      setSelectedDragField(selected);
    }
  };

  const { reset, control, handleSubmit } = useForm<MasterItemType>({
    resolver: zodResolver(masterItemSchema),
  });

  const handleChangeOrder = async (orderId: string, id: string) => {
    if (!isDragging) {
      setSelectedField(parseInt(id));
      setSearchparams((searchParams) => {
        searchParams.set('field_id', id);

        return searchParams;
      });
    } else {
      const targetElement = fieldRef.current as HTMLDivElement;
      targetElement.style.display = 'none';
      setIsDragging(false);

      const targetField = fieldList.find(
        (category) => category.order_id === parseInt(orderId)
      );
      const sourceField = fieldList.find(
        (category) => category.order_id === selectedDragField?.order_id
      );

      if (sourceField && targetField && sourceField.id !== targetField.id) {
        await updateOrder(
          schema,
          table,
          sourceField.id,
          targetField.id,
          sourceField.order_id,
          targetField.order_id
        );

        await refetchFields();
      }
      setSelectedDragField(null);

      setFieldList((prev) => {
        return prev.map((item) => {
          return { ...item, visible: true };
        });
      });
    }
  };

  const handleCancelSelection = async () => {
    const targetElement = fieldRef.current as HTMLDivElement;
    targetElement.style.display = 'none';
    setIsDragging(false);
    setFieldList((prev) => {
      return prev.map((item) => {
        return { ...item, visible: true };
      });
    });
    // Remove all text selection caused by dragging
    window.getSelection()?.removeAllRanges();
    setSelectedDragField(null);
  };

  const handleFieldInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchparams((searchParams) => {
      searchParams.set('field_search', e.target.value);
      return searchParams;
    });
    setFieldSearch(e.target.value);
  };

  const showEditForm = async (id: string) => {
    setShowForm((prev) => !prev);
    setEditFormMode(true);
  };

  const showAddForm = async () => {
    setShowForm((prev) => !prev);
    setEditFormMode(false);
  };

  const { mutate: mutateEdit, isPending } = useMutation({
    mutationKey: ['updateMasterField'] as const,
    mutationFn: async (data: MasterItemType): Promise<string> => {
      await updateName(
        schema,
        table,
        data.fieldName ?? '',
        data.fieldIdName ?? '',
        selectedField!
      );

      return t('common.success');
    },
    meta: {
      toastId: ['updateMasterField'],
    },
    onSuccess: async () => {
      setShowForm((prev) => !prev);
      await refetchFields();
    },
  });

  const { mutate: mutateDelete, isPending: isDeletePending } = useMutation({
    mutationKey: ['deleteMasterField'] as const,
    mutationFn: async (): Promise<string> => {
      await deleteEntry(schema, table, selectedField!);
      setSearchparams((searchParams) => {
        searchParams.delete('field_id');
        return searchParams;
      });

      return t('common.delete');
    },
    meta: {
      toastId: ['deleteMasterField'],
    },
    onSuccess: async () => {
      await refetchFields();
      queryClient.invalidateQueries({ queryKey: ['getDatagroup'] });
      setShowDelete((prev) => !prev);
    },
  });

  const { mutate: mutateAdd, isPending: isAddPending } = useMutation({
    mutationKey: ['addMasterField'] as const,
    mutationFn: async (data: MasterItemType): Promise<string> => {
      if (group === 'feedback') {
        await addFeedbackIssue(
          parseInt(categoryId!),
          data.fieldName ?? '',
          data.fieldIdName ?? ''
        );
      } else if (group === 'electricity') {
        // categoryId 4 in electricity is Cost, therefore mutate on cost_types table
        if (categoryId === '4') {
          await addCostType(data.fieldName ?? '');
        } else {
          await addSourceType(parseInt(categoryId!), data.fieldName ?? '');
        }
      } else if (group === 'production') {
        await addDefect(parseInt(categoryId!), data.fieldName ?? '');
      } else {
        await addTypeBrandSeries(table, data.fieldName ?? '');
      }

      return t('common.success');
    },
    meta: {
      toastId: ['addMasterField'],
    },
    onSuccess: async () => {
      await refetchFields();
      queryClient.invalidateQueries({ queryKey: ['getDatagroup'] });
      setShowForm((prev) => !prev);
    },
  });

  const handleFormSubmit = handleSubmit(
    (data) => {
      if (editFormMode) {
        mutateEdit(data);
      } else {
        mutateAdd(data);
      }
    },
    (errors) => toast.info(t('please_fill_form_correctly'))
  );

  const showDeleteModal = (_id: string) => {
    setShowDelete((prev) => !prev);
  };

  const confirmDelete = async () => {
    mutateDelete();
  };

  useEffect(() => {
    setSearchparams((searchParams) => {
      searchParams.set('field_schema', schema);
      searchParams.set('field_table', table);
      return searchParams;
    });
    if (fields) {
      setFieldList(
        fields.map((item) => {
          return { ...item, visible: true };
        })
      );
    }
  }, [fields, setSearchparams, schema, table]);

  useEffect(() => {
    if (!fieldId) {
      setSelectedField(null);
    }
    if (categoryId) {
      setInputDisabled(false);
    } else {
      setInputDisabled(true);
    }
  }, [fieldId, group, categoryId]);

  useEffect(() => {
    const getTable = () => {
      switch (group) {
        case 'feedback':
          return { schema: 'feedback', table: 'feedback_categories' };
        case 'production':
          return { schema: 'production', table: 'categories' };
        case 'electricity':
          switch (categoryId) {
            case '4':
              return { schema: 'cost', table: 'cost_types' };
            default:
              return { schema: 'asset', table: 'power_meter_types' };
          }
        case 'asset':
          switch (categoryId) {
            case '1':
              return { schema: 'asset', table: 'types' };
            case '2':
              return { schema: 'asset', table: 'brands' };
            case '3':
              return { schema: 'asset', table: 'series' };
            case '4':
              return { schema: 'dm', table: 'alarms' };
            default:
              return { schema: '', table: '' };
          }
        default:
          return { schema: '', table: '' };
      }
    };

    const { schema, table } = getTable();

    const resetForm = async (
      categoryName: string,
      fieldIdName: string,
      fieldName: string
    ) => {
      reset({
        groupName: capitalizeFirstLetter(group ?? ''),
        categoryName: capitalizeFirstLetter(categoryName),
        fieldName: editFormMode ? fieldName : '',
        fieldIdName: editFormMode ? fieldIdName : '',
      });
    };

    if (!categoryId) {
      return;
    }

    if (fieldId) {
      const fieldName =
        fieldList.find((field) => field.id === parseInt(fieldId))?.name ?? '';

      (async () => {
        if (group !== 'asset') {
          const categoryName = await getCategoryName(
            schema,
            table,
            parseInt(categoryId!)
          );
          const fieldIdName =
            group === 'feedback' ? await getIssueIdByID(parseInt(fieldId)) : '';
          await resetForm(categoryName ?? '', fieldIdName ?? '', fieldName);
        } else {
          await resetForm(table, '', fieldName);
        }
      })();
    } else {
      (async () => {
        if (group !== 'asset') {
          const categoryName = await getCategoryName(
            schema,
            table,
            parseInt(categoryId!)
          );

          await resetForm(categoryName ?? '', '', '');
        } else {
          await resetForm(table, '', '');
        }
      })();
    }
  }, [fieldId, categoryId, editFormMode, fieldList, group, reset]);

  useEffect(() => {
    if (!categoryId) {
      setFieldList([]);
    }
  }, [group, categoryId]);

  useEffect(() => {
    if (!fieldSearchParam) {
      setFieldSearch('');
    }
  }, [group, fieldSearchParam]);

  return {
    hasCreate,
    hasRead,
    hasUpdate,
    hasDelete,
    control,
    showForm,
    showDelete,
    fields,
    fieldList,
    fieldRef,
    fieldListRef,
    fieldSearch,
    selectedField,
    selectedDragField,
    isDragging,
    isPending,
    isDeletePending,
    isAddPending,
    inputDisabled,
    group,
    setSearchparams,
    showEditForm,
    setShowForm,
    setShowDelete,
    refetchFields,
    handleFieldDrag,
    handleChangeOrder,
    handleFieldInputChange,
    handleFormSubmit,
    showDeleteModal,
    showAddForm,
    confirmDelete,
    handleCancelSelection,
  };
};
