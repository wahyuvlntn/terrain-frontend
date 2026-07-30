/* eslint-disable simple-import-sort/imports */
import { Button, Container, PopupDelete, useToggle } from '@digital-twin/components';
import { Close, Save, Sitemap, TrashDeleteFill } from '@digital-twin/icons';
import { useContext } from 'react';
import { useAddRelationMapping, useDeleteRelation, useIssueMappingParams } from '../hooks';
import { MappingCtx } from '../issue-mapping';
import { alarmSchema, alarmType, parameterSchema, parameterType } from '../schemas';
import styles from './mapping.module.scss';

const Alarm = ({ alarm, onDelete }: { alarm: alarmType; onDelete: () => void }) => {
  return (
    <div className={styles['item']}>
      <span className={styles['warning']}>!</span>
      <span>{alarm.code}</span>
      <span>-</span>
      <span className={styles['name']}>{alarm.name}</span>
      <Close style={{ cursor: 'pointer' }} onClick={onDelete} />
    </div>
  );
};

const Parameter = ({ parameter, onDelete }: { parameter: parameterType; onDelete: () => void }) => {
  return (
    <div className={styles['item']}>
      <span className={styles['name']}>{parameter.name}</span>
      <Close style={{ cursor: 'pointer' }} onClick={onDelete} />
    </div>
  );
};

export const Mapping = () => {
  const [showDelete, toogleShowDelete] = useToggle(false);
  const { onSubmit: deleteRelation } = useDeleteRelation();
  const { onSubmit: saveRelation } = useAddRelationMapping();
  const { selectedRelation } = useIssueMappingParams();
  const mappingCtx = useContext(MappingCtx);
  if (!mappingCtx) {
    return;
  }
  const {
    source: sourceList,
    target: issueList,
    defaultSource,
    defaultTarget,
    setSource,
    setTarget,
    relation,
  } = mappingCtx;
  return (
    <Container
      title="Issue Mapping"
      className={styles['target-list']}
      background={'none'}
      icon={<Sitemap />}
    >
      <div className={styles['header']}>
        <span>Relation Name:</span>
        <span className={styles['name']}>{relation}</span>
      </div>
      <Container title="Source" className={styles['container']} background="none">
        <div
          className={styles['target']}
          onDragOver={(e) => {
            e.preventDefault();
          }}
          onDrop={(e) => {
            const type = e.dataTransfer.types;
            if (type.includes('alarm')) {
              const data = e.dataTransfer.getData('alarm');
              const parsedData = alarmSchema.safeParse(JSON.parse(data));
              if (parsedData.success) {
                if (sourceList) {
                  setSource([...sourceList, { type: 'alarm', meta: parsedData.data }]);
                } else {
                  setSource([{ type: 'alarm', meta: parsedData.data }]);
                }
              }
            } else if (type.includes('parameter')) {
              const data = e.dataTransfer.getData('parameter');
              const parsedData = parameterSchema.safeParse(JSON.parse(data));
              if (parsedData.success) {
                if (sourceList) {
                  setSource([...sourceList, { type: 'parameter', meta: parsedData.data }]);
                } else {
                  setSource([{ type: 'parameter', meta: parsedData.data }]);
                }
              }
            }
          }}
        >
          {sourceList?.map((source) => (
            <>
              {source.type === 'alarm' && (
                <Alarm
                  alarm={source.meta}
                  onDelete={() => {
                    setSource(
                      sourceList.filter((existing) => {
                        return existing.type !== 'alarm' || existing.meta.code !== source.meta.code;
                      })
                    );
                  }}
                />
              )}
              {source.type === 'parameter' && (
                <Parameter
                  parameter={source.meta}
                  onDelete={() => {
                    setSource(
                      sourceList.filter((existing) => {
                        return (
                          existing.type !== 'parameter' || existing.meta.name !== source.meta.name
                        );
                      })
                    );
                  }}
                />
              )}
            </>
          ))}
        </div>
      </Container>
      <Container title="Other Possible Issues" className={styles['container']} background="none">
        <div
          className={styles['target']}
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes('alarm')) {
              e.preventDefault();
            }
          }}
          onDrop={(e) => {
            const type = e.dataTransfer.types;
            if (type.includes('alarm')) {
              const data = e.dataTransfer.getData('alarm');
              const parsedData = alarmSchema.safeParse(JSON.parse(data));
              if (parsedData.success) {
                if (issueList) {
                  setTarget([...issueList, parsedData.data]);
                } else {
                  setTarget([parsedData.data]);
                }
              }
            }
          }}
        >
          {issueList?.map((issue) => (
            <Alarm
              alarm={issue}
              onDelete={() => {
                setTarget(
                  issueList.filter((existing) => {
                    return existing.code !== issue.code;
                  })
                );
              }}
            />
          ))}
        </div>
      </Container>
      <div className={styles['action']}>
        <Button
          icon={<TrashDeleteFill />}
          className={styles['delete']}
          onClick={(e) => {
            e.stopPropagation();
            toogleShowDelete();
          }}
        >
          Delete
        </Button>
        {showDelete && (
          <PopupDelete
            open={showDelete}
            entityName={relation}
            onClose={toogleShowDelete}
            onDelete={() => {
              toogleShowDelete();
              if (selectedRelation && relation) {
                deleteRelation({ id: selectedRelation, name: relation });
              }
            }}
            entityType="Relation"
          />
        )}
        <div className={styles['right']}>
          <Button
            className={styles['reset']}
            onClick={() => {
              setSource(defaultSource);
              setTarget(defaultTarget);
            }}
          >
            Reset
          </Button>
          <Button
            icon={<Save />}
            onClick={() => {
              if (relation) {
                saveRelation({
                  id: selectedRelation,
                  name: relation,
                  source_parameter:
                    sourceList
                      ?.filter((source) => {
                        return source.type === 'parameter';
                      })
                      .map((parameter) => parameter.meta.name)
                      .join(',') || '',
                  source_alarm_code:
                    sourceList
                      ?.filter((source) => {
                        return source.type === 'alarm';
                      })
                      .map((alarm) => alarm.meta.code)
                      .join(',') || '',
                  target_alarm_code: issueList?.map((alarm) => alarm.code).join(',') || '',
                });
              }
            }}
          >
            Save
          </Button>
        </div>
      </div>
    </Container>
  );
};
