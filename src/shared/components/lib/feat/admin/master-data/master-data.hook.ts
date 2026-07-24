import { t } from '@digital-twin/utils';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DatasetCountType, getDatasetCount } from './api/master.api';

export const useMasterData = () => {
  const [searchParams, setSearchparams] = useSearchParams();
  const [dataGroup, setDataGroup] = useState([
    // { id: 1, name: 'Feedback', count: 0, alias: 'feedback' },
    // { id: 2, name: 'Production', count: 0, alias: 'production' },
    { id: 3, name: 'Equipment', count: 0, alias: 'asset' },
  ]);

  const groupId = searchParams.get('group_id');
  // const categoryDragging = searchParams.get('category_dragging');
  // const fieldDragging = searchParams.get('field_dragging');

  const [selectedDataGroup, setSelectedDataGroup] = useState<number | null>(
    groupId ? parseInt(groupId) : null
  );

  const handleSelectDataGroup = (id: number) => {
    setSelectedDataGroup(id);
    const currentGroup = dataGroup.find((group) => group.id === id);
    setSearchparams((searchParams) => {
      searchParams.set('group', dataGroup.find((group) => group.id === id)?.alias ?? '');
      searchParams.set('group_id', dataGroup.find((group) => group.id === id)?.id.toString() ?? '');
      searchParams.delete('category_search');
      searchParams.delete('field_search');

      if (currentGroup?.id !== parseInt(groupId ?? '')) {
        searchParams.delete('category_id');
        searchParams.delete('field_id');
      }

      return searchParams;
    });
  };

  const { data: datagroup, refetch: refreshDataGroup } = useQuery({
    queryKey: ['getDatagroup'] as const,
    queryFn: async (): Promise<null | DatasetCountType[]> => {
      return await getDatasetCount();
    },
    meta: {
      toastId: ['getDatagroup'],
    },
  });

  useEffect(() => {
    if (datagroup) {
      setDataGroup([
        {
          id: 3,
          name: t('common.equipment'),
          count: datagroup.find((dataset) => dataset.group === 'equipment')?.count ?? 0,
          alias: 'asset',
        },
      ]);
    }
  }, [datagroup]);

  return {
    searchParams,
    selectedDataGroup,
    dataGroup,
    datagroup,
    setDataGroup,
    handleSelectDataGroup,
    refreshDataGroup,
  };
};
