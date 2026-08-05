import { zodResolver } from '@hookform/resolvers/zod';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useContext, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom';

import {
  AuthCtx,
  PermissionAliasEnum,
  PermissionGroupAliasEnum,
} from '../../auth';
import {
  deleteTheme,
  getActiveTheme,
  getThemeDetails,
  getThemes,
  ThemeDetails,
  TUpdateActiveTheme,
  updateActiveTheme,
  updateActiveThemeSchema,
} from './api';
import { changeHtmlColor as changeColor } from './theme-details.hook';

export const useThemeEditor = () => {
  const { data: activeTheme, refetch } = useQuery({
    queryKey: ['GET_ACTIVE_THEME'],
    queryFn: getActiveTheme,
    meta: { toastId: 'GET_ACTIVE_THEME' },
  });

  const { mutate, isPending: isPendingSubmit } = useMutation({
    mutationFn: updateActiveTheme,
    onSuccess: () => refetch(),
    meta: { toastId: 'UPDATE_ACTIVE_THEME' },
  });
  const { setValue, watch, getValues, handleSubmit, control } =
    useForm<TUpdateActiveTheme>({
      values: {
        themeId: activeTheme?.themeId ?? 0,
        logo: undefined,
        deleteLogo: false,
      },
      resolver: zodResolver(updateActiveThemeSchema),
    });
  const onSubmit = handleSubmit(
    (data) => mutate(data),
  );

  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('search') ?? '';
  const {
    data,
    fetchNextPage,
    isLoading,
    refetch: refetchList,
  } = useInfiniteQuery({
    queryKey: [
      'THEME_LIST',
      {
        search,
      },
    ],
    queryFn: ({ pageParam }) => getThemes(search, pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage, _allPages, lastPageParam, _allPageParams) =>
      lastPage.isExtend ? lastPageParam + 1 : null,
    meta: { toastId: 'THEME_LIST' },
  });

  const queryClient = useQueryClient();
  const setActiveTheme = (id: number) => {
    setValue('themeId', id)
  };

  const onPreviewLoaded = () => {
    const id = getValues('themeId');
    if (!id) return;
    queryClient
      .ensureQueryData<ThemeDetails>({
        queryFn: () => getThemeDetails(id),
        queryKey: ['THEME_DETAILS', { id }],
      })
      .then(({ colors }) => {
        Object.keys(colors).forEach((color) =>
          changeColor({
            name: color,
            hexCode: colors[color as keyof typeof colors] ?? '#000000',
          })
        );
      });
  };

  useEffect(() => {
    onPreviewLoaded();
  }, [watch('themeId')]);
  const selectedThemeId = watch('themeId');
  const selectedThemeIsEditable = data?.pages
    ?.flat(1)
    .flatMap((item) => item.data)
    .find((item) => item.id === selectedThemeId)?.isEditable;

  const { mutateAsync: mutateDelete, isPending } = useMutation({
    mutationFn: deleteTheme,
    meta: { toastId: 'DELETE_THEME' },
    onSuccess: () => {
      refetch().then((query) => setValue('themeId', query.data?.themeId ?? 0));
      refetchList();
    },
  });

  const handleSearchChange = (search: string) =>
    setSearchParams((prev) => {
      if (search) prev.set('search', search);
      else prev.delete('search');
      return prev;
    });

  const { mutate: resetTheme, isPending: isPendingReset } = useMutation({
    mutationFn: async () => {
      return await updateActiveTheme({ themeId: 1 });
    },
    meta: { toastId: 'RESET_THEME' },
    onSuccess: () => {
      refetch().then((query) => setValue('themeId', query.data?.themeId ?? 0));
    },
  });

  const onReset = () => {
    resetTheme();
  };

  const { hasPermission } = useContext(AuthCtx);
  const hasEditPermission = hasPermission(
    PermissionGroupAliasEnum.enum.themeeditor,
    PermissionAliasEnum.enum.update
  );
  const hasCreatePermission = hasPermission(
    PermissionGroupAliasEnum.enum.themeeditor,
    PermissionAliasEnum.enum.create
  );
  const hasDeletePermission = hasPermission(
    PermissionGroupAliasEnum.enum.themeeditor,
    PermissionAliasEnum.enum.delete
  );

  return {
    data,
    fetchNextPage,
    selectedThemeId,
    selectedThemeIsEditable,
    setActiveTheme,
    onReset,
    onSubmit,
    control,
    onResetLogo: () => {
      setValue('logo', undefined, { shouldTouch: true });
      setValue('deleteLogo', true);
    },
    onDelete: mutateDelete,
    search,
    handleSearchChange,
    isPending,
    isLoading,
    isPendingReset,
    onPreviewLoaded,
    hasEditPermission,
    hasCreatePermission,
    hasDeletePermission,
    isPendingSubmit,
  };
};
