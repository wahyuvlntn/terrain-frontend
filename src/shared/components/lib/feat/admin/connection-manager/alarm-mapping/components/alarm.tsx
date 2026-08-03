
import { COLOR, Container, Dropdown, Loading, Pagination, Search } from '@digital-twin/components';
import { AlertAlarmFill } from '@digital-twin/icons';
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useGetAlarmCodesMapping, useGetModel, useParams, useResizeObserver } from '../hooks';
import { alarmType } from '../schemas';
import styles from './alarm.module.scss';

type AlarmProps = {
  onAlarmChange: Dispatch<SetStateAction<alarmType>>;
  onModelChange: Dispatch<SetStateAction<number>>;
};

const ITEM_HEIGHT = 55;
const GAP = 8;
const OFFSET = 20;
const DEFAULT_LIMIT = 1;

export const Alarm = ({ onAlarmChange, onModelChange }: AlarmProps) => {
  const { data: models } = useGetModel();

  const [searchParams, setSearchParams] = useSearchParams();
  // const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const { ref, size } = useResizeObserver<HTMLDivElement>();
  // const limit = useVerticalLimit({
  //   container: ref.current,
  //   itemHeight: 55,
  //   itemGap: 8,
  // });
  const [limit, setLimit] = useState(DEFAULT_LIMIT);

  useEffect(() => {
    if (size && ref && ref.current) {
      const divisor = ITEM_HEIGHT + GAP;
      setLimit(
        Math.max(Math.floor((ref.current.clientHeight - OFFSET + GAP) / divisor), DEFAULT_LIMIT)
      );
    }
  }, [size, ref]);

  const search = useMemo(() => {
    return searchParams.get('alarm_search') || '';
  }, [searchParams]);
  const page = useMemo(() => {
    return Number(searchParams.get('alarm_page')) || 1;
  }, [searchParams]);

  const [selectedAlarm, setSelectedAlarm] = useParams('alarm');
  const [selectedModel, setSelectedModel] = useParams('model');

  const {
    data: alarms,
    mappedCount,
    unmappedCount,
    isLoading,
  } = useGetAlarmCodesMapping({
    model_id: Number(selectedModel) || 0,
    search,
    page,
    limit: limit || 1,
  });

  const totalCount = mappedCount + unmappedCount;

  useEffect(() => {
    setTimeout(() => {
      if (models && models.length > 0 && !selectedModel) {
        setSearchParams((prev) => {
          prev.set('model', models[0].id.toString());
          return prev;
        });
      }
    }, 50);
  }, [JSON.stringify(models)]);

  useEffect(() => {
    setTimeout(() => {
      if (alarms && alarms.length > 0 && !selectedAlarm) {
        setSearchParams((prev) => {
          prev.set('alarm', alarms[0].alarm_id.toString());
          return prev;
        });
      }
    }, 50);
  }, [JSON.stringify(alarms)]);

  useEffect(() => {
    const selected = alarms?.find((alarm) => alarm.alarm_id.toString() === selectedAlarm);
    if (selected) {
      onAlarmChange({
        id: selected.alarm_id,
        code: selected.alarm_code,
        name: selected.alarm_name,
        map: selected.is_mapped,
      });
    }
  }, [selectedAlarm, alarms]);

  useEffect(() => {
    if (selectedModel) {
      onModelChange(Number(selectedModel));
    }
  }, [selectedModel]);

  return (
    <Container
      title="Alarm Master Data"
      icon={<AlertAlarmFill />}
      className={styles['alarm']}
      background="none"
    >
      <Loading isLoading={isLoading} />
      <div className={styles['header']}>
        <Dropdown
          label="Equipment Model:"
          options={models?.map((model) => ({
            label: model.name,
            value: model.id.toString(),
          }))}
          value={selectedModel}
          onChange={(v) => setSelectedModel(v)}
          searchable
        />
        <div className={styles['filter']}>
          <Search
            wrapperClassName={styles['search']}
            searchParams={searchParams}
            setSearchParams={setSearchParams}
            searchParamsPrefix="alarm_"
            placeholder="Search..."
          />
          <div className={styles['mapped']}>{`Mapped: ${mappedCount}`}</div>
          <div className={styles['unmapped']}>{`Unmapped: ${unmappedCount}`}</div>
        </div>
      </div>
      <div className={styles['list']} ref={ref}>
        {alarms?.map((alarm) => (
          <div
            key={alarm.alarm_id}
            className={styles['item']}
            onClick={() => setSelectedAlarm(alarm.alarm_id.toString())}
            style={
              Number(selectedAlarm) === alarm.alarm_id
                ? {
                    border: `solid 2px ${COLOR.brandBorderDefaultPrimary}`,
                    background: COLOR.backgroundHighest,
                  }
                : { cursor: 'pointer' }
            }
          >
            <span
              className={styles['label']}
              title={`${alarm.alarm_code} - ${alarm.alarm_name}`}
            >{`${alarm.alarm_code} - ${alarm.alarm_name}`}</span>
            {alarm.is_mapped ? (
              <div className={styles['mapped']}>Mapped</div>
            ) : (
              <div className={styles['unmapped']}>Unmapped</div>
            )}
          </div>
        ))}
      </div>
      <div className={styles['pagination']}>
        <Pagination
          count={totalCount}
          limit={limit || 1}
          searchParams={searchParams}
          setSearchParams={setSearchParams}
          searchParamsPrefix="alarm_"
        />
      </div>
    </Container>
  );
};
