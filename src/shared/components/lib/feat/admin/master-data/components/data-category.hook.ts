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
  addCategory,
  capitalizeFirstLetter,
  deleteEntry,
  getDataCategories,
  ListType,
  masterItemSchema,
  MasterItemType,
  updateName,
  updateOrder,
} from '../api/master.api';

export const useDataCategory = () => {
  const [searchParams, setSearchparams] = useSearchParams();
  const group = searchParams.get('group');
  const categoryId = searchParams.get('category_id');
  const categorySearchParam = searchParams.get('category_search') ?? '';

  const queryClient = useQueryClient();

  const [categoryList, setCategoryList] = useState<ListType[]>([]);
  const [selectedDragCategory, setSelectedDragCategory] =
    useState<null | ListType>(null);
  const [selectedCategory, setSelectedCategory] = useState<null | number>(
    searchParams.get('category_id')
      ? parseInt(searchParams.get('category_id') ?? '')
      : null
  );
  const [isDragging, setIsDragging] = useState(false);
  const [categorySearch, setCategorySearch] = useState<string>(
    categorySearchParam ?? ''
  );

  const { debouncedVal: categorySearchValue } = useDebounce(
    categorySearch,
    500
  );

  const categoryRef = useRef<HTMLDivElement | null>(null);
  const categoryListRef = useRef<HTMLDivElement | null>(null);
  const [editFormMode, setEditFormMode] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [inputDisabled, setInputDisabled] = useState(true);

  const { hasPermission } = useContext(AuthCtx);

  const { hasCreate, hasRead, hasUpdate, hasDelete } = {
    hasCreate: hasPermission('masterdata', 'create'),
    hasRead: hasPermission('masterdata', 'read'),
    hasUpdate: hasPermission('masterdata', 'update'),
    hasDelete: hasPermission('masterdata', 'delete'),
  };

  const getSchemaAndTable = useMemo(() => {
    let schema, table;

    if (group === 'feedback') {
      schema = 'feedback';
      table = 'feedback_categories';
    } else if (group === 'production') {
      schema = 'production';
      table = 'categories';
    } else {
      schema = 'asset';
      table = '';
    }

    return [schema, table];
  }, [group]);

  const [schema, table] = getSchemaAndTable;

  const { data: categories, refetch: refetchCategories } = useQuery({
    queryKey: [
      'getCategories',
      group,
      categorySearchValue,
      schema,
      table,
    ] as const,
    queryFn: async (): Promise<ListType[] | null> => {
      return await getDataCategories(
        schema,
        table,
        String(categorySearchValue)
      );
    },
    refetchOnWindowFocus: false,
    enabled: !!group,
    staleTime: 0,
    meta: {
      toastId: ['getCategories', group, categorySearchValue],
    },
  });

  const { reset, control, handleSubmit } = useForm<MasterItemType>({
    resolver: zodResolver(masterItemSchema),
  });

  const handleCategoryClick = (
    id: string,
    e: React.MouseEvent<HTMLDivElement, MouseEvent>
  ) => {
    const targetElement = categoryRef.current as HTMLDivElement;
    targetElement.style.display = 'flex';
    setIsDragging(true);

    if (categoryRef.current) {
      targetElement.style.top = `${
        e.clientY - targetElement.getBoundingClientRect().height / 2
      }px`;
      targetElement.style.position = 'absolute';
    }

    const selected = categoryList.find(
      (category) => category.order_id === parseInt(id)
    );
    setCategoryList((prev) =>
      prev.map((category) => {
        if (category.order_id === parseInt(id)) {
          return { ...category, visible: false };
        } else {
          return category;
        }
      })
    );
    if (selected) {
      setSelectedDragCategory(selected);
    }
  };

  const handleChangeOrder = async (orderId: string, id: string) => {
    if (!isDragging) {
      setSelectedCategory(parseInt(id));
      setSearchparams((searchParams) => {
        searchParams.set('category_id', id);
        searchParams.delete('field_id');
        return searchParams;
      });
    } else {
      const targetElement = categoryRef.current as HTMLDivElement;
      targetElement.style.display = 'none';
      setIsDragging(false);

      const targetCategory = categoryList.find(
        (category) => category.order_id === parseInt(orderId)
      );
      const sourceCategory = categoryList.find(
        (category) => category.order_id === selectedDragCategory?.order_id
      );

      if (
        sourceCategory &&
        targetCategory &&
        sourceCategory.id !== targetCategory.id
      ) {
        await updateOrder(
          schema,
          table,
          sourceCategory.id,
          targetCategory.id,
          sourceCategory.order_id,
          targetCategory.order_id
        );

        await refetchCategories();
      }

      setSelectedDragCategory(null);
      setCategoryList((prev) => {
        return prev.map((item) => {
          return { ...item, visible: true };
        });
      });
    }
  };

  const handleCancelSelection = async () => {
    const targetElement = categoryRef.current as HTMLDivElement;
    targetElement.style.display = 'none';
    setIsDragging(false);

    setSelectedDragCategory(null);
    setCategoryList((prev) => {
      return prev.map((item) => {
        return { ...item, visible: true };
      });
    });
    // Remove all text selection caused by dragging
    window.getSelection()?.removeAllRanges();
  };

  const handleSearchInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchparams((searchParams) => {
      searchParams.delete('category_id');
      searchParams.set('category_search', e.target.value);
      return searchParams;
    });
    setCategorySearch(e.target.value);
  };

  const showEditForm = (id: string) => {
    setEditFormMode(true);
    const categoryName = categoryList.find(
      (category) => category.id === parseInt(id)
    )?.name;
    setShowForm((prev) => !prev);
    reset({
      groupName: capitalizeFirstLetter(group ?? '') ?? '',
      categoryName: categoryName,
    });
  };

  const showAddForm = () => {
    setEditFormMode(false);
    setShowForm((prev) => !prev);
    reset({
      groupName: capitalizeFirstLetter(group ?? '') ?? '',
      categoryName: '',
    });
  };

  const { mutate: mutateEdit, isPending } = useMutation({
    mutationKey: ['updateMasterCategory', schema, table] as const,
    mutationFn: async (data: MasterItemType): Promise<string> => {
      await updateName(schema, table, data.categoryName, '', selectedCategory!);
      setShowForm((prev) => !prev);
      return t('common.success');
    },
    meta: {
      toastId: ['updateMasterCategory'],
    },
    onSuccess: async () => {
      await refetchCategories();
    },
  });

  const { mutate: mutateAdd, isPending: isAddPending } = useMutation({
    mutationKey: ['addMasterCategory', schema] as const,
    mutationFn: async (data: MasterItemType): Promise<string> => {
      await addCategory(schema, table, data.categoryName);
      return t('common.success');
    },
    meta: {
      toastId: ['addMasterCategory'],
    },
    onSuccess: async () => {
      setShowForm((prev) => !prev);
      await refetchCategories();
      queryClient.invalidateQueries({ queryKey: ['getDatagroup'] });
    },
  });

  const { mutate: mutateDelete, isPending: isDeletePending } = useMutation({
    mutationKey: ['deleteMasterCategory', schema, table] as const,
    mutationFn: async (): Promise<string> => {
      await deleteEntry(schema, table, selectedCategory!);
      setSearchparams((searchParams) => {
        searchParams.delete('category_id');
        return searchParams;
      });
      return t('common.delete');
    },
    meta: {
      toastId: ['deleteMasterCategory'],
    },
    onSuccess: async () => {
      setShowDelete((prev) => !prev);
      await refetchCategories();
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
      searchParams.set('category_schema', schema);
      searchParams.set('category_table', table);
      return searchParams;
    });
    if (categories) {
      setCategoryList(
        categories.map((item) => {
          return { ...item, visible: true };
        })
      );
    }
  }, [categories, setSearchparams, schema, table]);

  useEffect(() => {
    if (!categoryId) {
      setSelectedCategory(null);
    }
    if (!group) {
      setInputDisabled(true);
    } else {
      setInputDisabled(false);
    }
  }, [categoryId, group]);

  useEffect(() => {
    if (!categorySearchParam) setCategorySearch('');
  }, [group, categorySearchParam]);

  return {
    hasCreate,
    hasRead,
    hasUpdate,
    hasDelete,
    control,
    showForm,
    showDelete,
    searchParams,
    categorySearch,
    isPending,
    isAddPending,
    isDeletePending,
    isDragging,
    selectedCategory,
    categoryList,
    categories,
    selectedDragCategory,
    categoryListRef,
    categoryRef,
    inputDisabled,
    group,
    showAddForm,
    showEditForm,
    showDeleteModal,
    handleCategoryClick,
    handleChangeOrder,
    handleCancelSelection,
    handleSearchInputChange,
    handleFormSubmit,
    setCategoryList,
    setSearchparams,
    setShowForm,
    setShowDelete,
    confirmDelete,
  };
};
