import styles from './alarm-mapping.module.scss';
import { Alarm } from './components/alarm';
import { Mapping } from './components/mapping';
import { Parameter } from './components/parameter';
import { useMapping } from './hooks';

export const AlarmMapping = () => {
  const {
    selectedAlarm,
    setSelectedAlarm,
    selectedModel,
    setSelectedModel,
    watchForm,
    setValueForm,
    Reset,
  } = useMapping();

  return (
    <div className={styles['alarm-mapping']}>
      <Alarm onAlarmChange={setSelectedAlarm} onModelChange={setSelectedModel} />
      <Parameter
        modelId={selectedModel}
        alarmCodeId={selectedAlarm.id}
        selectedParameter={watchForm('parameter')}
        setSelectedParameter={(param) => setValueForm('parameter', param)}
      />
      <Mapping
        alarm={selectedAlarm}
        modelId={selectedModel}
        selectedParameterIds={watchForm('parameter')}
        reset={Reset}
      />
    </div>
  );
};
