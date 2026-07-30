/* eslint-disable simple-import-sort/imports */
import { ReactFlowProvider } from '@xyflow/react';
import { createContext, Dispatch, SetStateAction, useState } from 'react';
import { MappingV2 } from './components/mapping-v2';
import { RelationListV2 } from './components/relation-list-v2';
import { SourceListV2 } from './components/source-list-v2';
import styles from './issue-mapping.module.scss';
import { alarmType, sourceMappingType } from './schemas';

// TODO: remove unused variable
export const MappingCtx = createContext<{
  relation: string | undefined;
  setRelation: Dispatch<SetStateAction<string | undefined>>;
  source: sourceMappingType[] | undefined;
  setSource: Dispatch<SetStateAction<sourceMappingType[] | undefined>>;
  target: alarmType[] | undefined;
  setTarget: Dispatch<SetStateAction<alarmType[] | undefined>>;
  defaultSource: sourceMappingType[] | undefined;
  setDefaultSource: Dispatch<SetStateAction<sourceMappingType[] | undefined>>;
  defaultTarget: alarmType[] | undefined;
  setDefaultTarget: Dispatch<SetStateAction<alarmType[] | undefined>>;
} | null>(null);

export const IssueMapping = () => {
  const [source, setSource] = useState<sourceMappingType[]>();
  const [target, setTarget] = useState<alarmType[]>();
  const [defaultSource, setDefaultSource] = useState<sourceMappingType[]>();
  const [defaultTarget, setDefaultTarget] = useState<alarmType[]>();
  const [relation, setRelation] = useState<string>();
  return (
    <MappingCtx.Provider
      value={{
        relation,
        setRelation,
        source,
        setSource,
        defaultSource,
        setDefaultSource,
        target,
        setTarget,
        defaultTarget,
        setDefaultTarget,
      }}
    >
      <div className={styles['issue-mapping']}>
        <RelationListV2 />
        <ReactFlowProvider>
          <MappingV2 />
        </ReactFlowProvider>
        {/* <Container className={styles['mapping']} background="none">
          <SourceList />
          <div className={styles['separator']}>
            <div>
              <DoubleArrowRight />
            </div>
          </div>
          <Mapping />
        </Container> */}
        <SourceListV2 />
      </div>
    </MappingCtx.Provider>
  );
};
