
import {
  Checkbox,
  COLOR,
  Container,
  Loading,
  Pagination,
  Search,
} from '@digital-twin/components';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import {
  useGetParameterList,
  useGetSelectedParameters,
  useResizeObserver,
} from '../hooks';
import { ListAltFill } from '../icons';
import styles from './parameter.module.scss';

type ParameterProps = {
  modelId: number;
  alarmCodeId: number;
  selectedParameter: number[];
  setSelectedParameter: (parameter: number[]) => void;
};

const ITEM_HEIGHT = 36;
const GAP = 8;
const OFFSET = 40;
const DEFAULT_LIMIT = 1;

export const Parameter = ({
  modelId,
  alarmCodeId,
  selectedParameter,
  setSelectedParameter,
}: ParameterProps) => {
  const [searchParams, setSearchParams] = useSearchParams();
  // const [container, setContainer] = useState<HTMLDivElement | null>(null);
  // const limit = useVerticalLimit({ container, itemHeight: 36, itemGap: 8 });
  const { ref, size } = useResizeObserver<HTMLDivElement>();
  // const limit = useVerticalLimit({ container: ref.current, itemHeight: 55, itemGap: 8 });
  const [limit, setLimit] = useState(DEFAULT_LIMIT);

  useEffect(() => {
    if (size && ref && ref.current) {
      const divisor = ITEM_HEIGHT + GAP;
      setLimit(
        Math.max(
          Math.floor((ref.current.clientHeight - OFFSET + GAP) / divisor),
          DEFAULT_LIMIT
        )
      );
    }
  }, [size, ref]);

  const page = useMemo(() => {
    return Number(searchParams.get('parameter_page')) || 1;
  }, [searchParams]);
  const search = useMemo(() => {
    return searchParams.get('parameter_search') || '';
  }, [searchParams]);

  const {
    data: parameters,
    count: totalCount,
    isLoading,
  } = useGetParameterList({
    model_id: modelId,
    search,
    page,
    limit: limit || 1,
  });

  const { data: initialSelectedParameters } = useGetSelectedParameters({
    model_id: modelId,
    alarm_code_id: alarmCodeId,
  });

  useEffect(() => {
    if (initialSelectedParameters) {
      setSelectedParameter(initialSelectedParameters.map((p) => Number(p.id)));
    }
  }, [initialSelectedParameters]);

  return (
    <Container
      title="Parameter List"
      icon={<ListAltFill />}
      className={styles['parameter']}
      background="none"
      rightTopComponent={
        <div
          className={styles['rightTop']}
        >{`Selected Parameter: ${selectedParameter.length}/${totalCount}`}</div>
      }
    >
      <Loading isLoading={isLoading} />
      <div>
        <Search
          wrapperClassName={styles['search']}
          searchParams={searchParams}
          setSearchParams={setSearchParams}
          searchParamsPrefix="parameter_"
          placeholder="Search..."
        />
      </div>
      <div className={styles['list']} ref={ref}>
        {parameters?.map((param) => (
          <div key={param.id} className={styles['item']}
            style={selectedParameter.includes(param.id) ? {
              border: `solid 2px ${COLOR.brandBorderDefaultPrimary}`,
              background: COLOR.backgroundHighest
            } : undefined}>
            <Checkbox
              label={param.name}
              value={selectedParameter.includes(param.id)}
              onChange={(_, checked) => {
                if (checked) {
                  setSelectedParameter([...selectedParameter, param.id]);
                } else {
                  setSelectedParameter(
                    selectedParameter.filter((id) => id !== param.id)
                  );
                }
              }}
            />
          </div>
        ))}
      </div>
      <div className={styles['pagination']}>
        <Pagination
          count={totalCount}
          limit={limit || 1}
          searchParams={searchParams}
          setSearchParams={setSearchParams}
          searchParamsPrefix="parameter_"
        />
      </div>
    </Container>
  );
};
