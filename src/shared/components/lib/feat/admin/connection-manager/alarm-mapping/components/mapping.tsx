
import { Button, COLOR, Container, Loading, PopupDelete } from '@digital-twin/components';
import { SaveFill, Sitemap, TrashDeleteFill } from '@digital-twin/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { deleteSelectedParameters, saveSelectedParameters } from '../api/alarm-mapping';
import { useGetParameterList } from '../hooks';
import { alarmType } from '../schemas';
import styles from './mapping.module.scss';

type MappingProps = {
  alarm: alarmType;
  modelId: number;
  selectedParameterIds: number[];
  reset: () => void;
};
export const Mapping = ({ alarm, modelId, selectedParameterIds, reset }: MappingProps) => {
  const [openDelete, setOpenDelete] = useState(false);
  const queryClient = useQueryClient();

  const { data: allParameters, isLoading } = useGetParameterList({
    model_id: modelId,
    search: '',
    page: 1,
    limit: 1000,
  });

  const selectedParameters =
    allParameters?.filter((param) => selectedParameterIds.includes(param.id)) || [];

  const { mutate: save, isPending: isSaving } = useMutation({
    mutationFn: () =>
      saveSelectedParameters({
        alarm_code_id: alarm.id,
        model_id: modelId,
        parameter_ids: selectedParameterIds.join(','),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['alarmMappingSelectedParameters'],
      });
      queryClient.invalidateQueries({
        queryKey: ['alarmMappingAlarmCodesMapping'],
      });
    },
    meta: {
      toastId: 'save_alarm_mapping',
    },
  });

  const { mutate: deleteMapping } = useMutation({
    mutationFn: () =>
      deleteSelectedParameters({
        alarm_code_id: alarm.id,
        model_id: modelId,
      }),
    onSuccess: () => {
      setOpenDelete(false);
      queryClient.invalidateQueries({
        queryKey: ['alarmMappingSelectedParameters'],
      });
      queryClient.invalidateQueries({
        queryKey: ['alarmMappingAlarmCodesMapping'],
      });
    },
    meta: {
      toastId: 'delete_alarm_mapping',
    },
  });

  return (
    <Container
      title="Alarm Mapping"
      icon={<Sitemap />}
      className={styles['mapping']}
      background="none"
    >
      <Loading isLoading={isLoading} />
      <div className={styles['header']}>
        Alarm Name:
        <span className={styles['name']}>
          {alarm.id > 0 ? `${alarm.code} – ${alarm.name}` : ''}
        </span>
      </div>
      <Container background="none" title="Selected Parameter" className={styles['list-container']}>
        <div className={styles['list']}>
          {selectedParameters.map((param) => (
            <div key={param.id} className={styles['item']}>
              {param.name}
            </div>
          ))}
        </div>
      </Container>
      <div className={styles['action']}>
        <Button
          icon={<TrashDeleteFill />}
          style={{ background: COLOR.conditionCriticalPrimary }}
          onClick={() => setOpenDelete(true)}
        >
          Delete
        </Button>
        <PopupDelete
          open={openDelete}
          onClose={() => setOpenDelete(false)}
          onDelete={() => deleteMapping()}
          entityType="Mapping"
        />
        <div className={styles['save']}>
          <Button style={{ background: COLOR.backgroundHigh }} onClick={reset}>
            Reset
          </Button>
          <Button icon={<SaveFill />} onClick={() => save()} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </Container>
  );
};
