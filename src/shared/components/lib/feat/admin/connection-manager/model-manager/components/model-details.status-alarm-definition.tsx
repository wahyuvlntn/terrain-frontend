import { zodResolver } from '@hookform/resolvers/zod';
import {
  ClockDowntime,
  CloseDownErrorCircle,
  Code,
  Edit1,
  Open,
  Test,
  TimeEmpty,
  TrashDelete,
  Warning,
  WifiOff,
  Maintenance,
} from '@digital-twin/icons';
import { t, useLanguageSwitcher, useVerticalLimit } from '@digital-twin/utils';
import { toast, ToggleSwitch } from '@digital-twin/reusables';
import clsx from 'clsx';
import {
  Fragment,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Control, Controller, useForm, UseFormWatch } from 'react-hook-form';
import { SetURLSearchParams } from 'react-router-dom';

import { Column, Table } from '../../../../../data';
import { useToggle } from '../../../../../hooks';
import {
  Button,
  Checkbox,
  Dropdown,
  DropdownOption,
  Input,
  Search,
  TextBox,
} from '../../../../../input';
import { Container } from '../../../../../layout';
import {
  ClosedBy,
  Drawer,
  Pagination,
  Pagination2,
  Popup,
} from '../../../../../navigation';
import { AddBulkImport, Loading, PopupDelete } from '../../../../../others';
import {
  AuthCtx,
  PermissionAliasEnum,
  PermissionGroupAliasEnum,
} from '../../../../auth';
import { PrjCtx } from '../contexts';
import { useFeedbackCategories, useFeedbackIssues } from '../hooks/master-data';
import {
  useAddModelAlarm,
  useAddModelDynamicAlarm,
  useDeleteModelAlarm,
  useDeleteModelDynamicAlarm,
  useModelAlarms,
  useModelDynamicAlarms,
  useModelStatus,
  useRestoreModelAlarm,
  useRestoreModelDynamicAlarm,
  useSetModelStatus,
  useTestStatusAndAlarms,
  useUpdateModelAlarm,
  useUpdateModelDynamicAlarm,
} from '../hooks/model';

import { ReactComponent as StatusSelector } from '../icons/status.svg';
import { ReactComponent as AlertAlarm } from '../icons/alarm.svg';
import { ReactComponent as DynamicAlarm } from '../icons/dynamic-alarm.svg';
import { ReactComponent as InsertParameter } from '../icons/insert-parameter.svg';
import { ReactComponent as PropertyExtended } from '../icons/property-extended.svg';
import { ReactComponent as PropertyNew } from '../icons/property-new.svg';
import { ReactComponent as PropertyOverride } from '../icons/property-override.svg';
import {
  addModelAlarmFormSchema,
  AddModelAlarmFormType,
  addModelDynamicAlarmFormSchema,
  AddModelDynamicAlarmFormType,
  ModelAlarmEntryType,
  ModelDynamicAlarmEntryType,
  ModelParameterType,
  ModelStatusDefinitionType,
  setModelStatusDefinitionFormSchema,
  SetModelStatusDefinitionFormType,
  testFormSchema,
  TestFormType,
  TestResultType,
  updateModelAlarmFormSchema,
  UpdateModelAlarmFormType,
  updateModelDynamicAlarmFormSchema,
  UpdateModelDynamicAlarmFormType,
} from '../schemas';
import { BulkImportModelAlarmsDrawer } from './bulk-import-model-alarms-drawer';
import { BulkImportModelDynamicAlarmsDrawer } from './bulk-import-model-dynamic-alarms-drawer';
import {
  MasterDataDropdown,
  MasterDataDropdownEntries,
} from './master-data-dropdown';
import { IconAndText } from './model-details.icon-and-text';
import style from './model-details.module.scss';
import { ModelScript, ModelScriptHandler } from './model-script';

// Constants
const PREFIX = 'alarm_definition_';
const PREFIX_DYNAMIC = 'dynamic_alarm_definition_';
const ITEM_HEIGHT = 40;
const OFFSET = 36;

enum Menu {
  STATUS = 0,
  ALARM = 1,
  DYNAMIC_ALARM = 2,
}

enum Status {
  UNPLANNED_DOWN = 'Unplanned Down',
  PLANNED_DOWN = 'Planned Down',
  RUNNING = 'Running',
}

enum CriticalityId {
  WARNING = 1,
  CRITICAL = 2,
}

enum CriticalityName {
  WARNING = 'Warning',
  CRITICAL = 'Critical',
}

const getStatuses = (): DropdownOption[] => {
  return [
    { value: Status.UNPLANNED_DOWN, label: t('common.unplanned_down') },
    { value: Status.PLANNED_DOWN, label: t('common.planned_down') },
    { value: Status.RUNNING, label: t('common.running') },
  ];
};

const getCriticalities = (): MasterDataDropdownEntries[] => [
  {
    id: CriticalityId.WARNING,
    name: t('common.warning'),
    prefix: (
      <div
        className={clsx(
          style['alarm-definition-popup__criticality__icon'],
          style['alarm-definition-popup__criticality__icon--warning']
        )}
      >
        <Warning />
      </div>
    ),
  },
  {
    id: CriticalityId.CRITICAL,
    name: t('common.critical'),
    prefix: (
      <div
        className={clsx(
          style['alarm-definition-popup__criticality__icon'],
          style['alarm-definition-popup__criticality__icon--critical']
        )}
      >
        <CloseDownErrorCircle />
      </div>
    ),
  },
];

export const StatusAlarmDefinition = ({
  modelId,
  alarmDefinitionSearch,
  alarmDefinitionPage,
  alarmDefinitionSortKey,
  alarmDefinitionOrder,
  dynamicAlarmDefinitionSearch,
  dynamicAlarmDefinitionPage,
  dynamicAlarmDefinitionSortKey,
  dynamicAlarmDefinitionOrder,
  searchParams,
  setSearchParams,
  parameters,
}: {
  modelId: number | undefined;
  alarmDefinitionSearch: string;
  alarmDefinitionPage: number;
  alarmDefinitionSortKey: string;
  alarmDefinitionOrder: string;
  dynamicAlarmDefinitionSearch: string;
  dynamicAlarmDefinitionPage: number;
  dynamicAlarmDefinitionSortKey: string;
  dynamicAlarmDefinitionOrder: string;
  searchParams: URLSearchParams;
  setSearchParams: SetURLSearchParams;
  parameters: ModelParameterType[] | undefined;
}) => {
  useLanguageSwitcher();

  const [menu, setMenu] = useState(Menu.STATUS);

  const [showTestDrawer, toggleShowTestDrawer] = useToggle(false);

  const tsDeclaration = useMemo(() => {
    if (!parameters || parameters.length === 0) {
      return undefined;
    }

    return parameters
      .map(({ alias, data_type }) => {
        return `declare const ${alias}: { v: ${data_type}, t: number, q: boolean };`;
      }, [] as string[])
      .join('\n');
  }, [parameters]);

  return (
    <Container
      icon={<Code />}
      title={t('common.status_alarm_definition')}
      className={style['model-details-cell']}
      contentWrapperProps={{ style: { background: 'transparent' } }}
      rightTopComponent={
        <Button
          icon={<Test />}
          style={{ height: 36 }}
          onClick={(e) => {
            e.stopPropagation();
            toggleShowTestDrawer();
          }}
          disabled={!modelId}
        >
          {t('common.test')}
        </Button>
      }
      background="none"
    >
      <div className={style['status-alarm-definition']}>
        <div className={style['status-alarm-definition__tab']}>
          <div
            className={clsx(
              style['status-alarm-definition__tab-item'],
              menu === Menu.STATUS &&
                style['status-alarm-definition__tab-item--selected']
            )}
            onClick={(e) => {
              e.stopPropagation();
              setMenu(Menu.STATUS);
            }}
          >
            <StatusSelector
              className={clsx(
                style['status-alarm-definition__tab-item__icon'],
                style['status-alarm-definition__tab-item__icon--status']
              )}
            />
            <span title={t('common.status')}>{t('common.status')}</span>
          </div>
          <div
            className={clsx(
              style['status-alarm-definition__tab-item'],
              menu === Menu.ALARM &&
                style['status-alarm-definition__tab-item--selected']
            )}
            onClick={(e) => {
              e.stopPropagation();
              setMenu(Menu.ALARM);
            }}
          >
            <AlertAlarm
              className={clsx(
                style['status-alarm-definition__tab-item__icon'],
                style['status-alarm-definition__tab-item__icon--alarm']
              )}
            />
            <span title={t('common.alarm')}>{t('common.alarm')}</span>
          </div>
          <div
            className={clsx(
              style['status-alarm-definition__tab-item'],
              menu === Menu.DYNAMIC_ALARM &&
                style['status-alarm-definition__tab-item--selected']
            )}
            onClick={(e) => {
              e.stopPropagation();
              setMenu(Menu.DYNAMIC_ALARM);
            }}
          >
            <DynamicAlarm
              className={clsx(
                style['status-alarm-definition__tab-item__icon'],
                style['status-alarm-definition__tab-item__icon--dynamic-alarm']
              )}
            />
            <span title={t('common.dynamic_alarm')}>
              {t('common.dynamic_alarm')}
            </span>
          </div>
          <div className={style['status-alarm-definition__tab-padding']} />
        </div>
        <div className={style['status-alarm-definition__body']}>
          {menu === Menu.STATUS ? (
            <StatusDefinition
              modelId={modelId}
              parameters={parameters}
              tsDeclaration={tsDeclaration}
            />
          ) : menu === Menu.ALARM ? (
            <AlarmDefinition
              modelId={modelId}
              parameters={parameters}
              search={alarmDefinitionSearch}
              page={alarmDefinitionPage}
              sortKey={alarmDefinitionSortKey}
              order={alarmDefinitionOrder}
              searchParams={searchParams}
              setSearchParams={setSearchParams}
              tsDeclaration={tsDeclaration}
            />
          ) : (
            <DynamicAlarmDefinition
              modelId={modelId}
              parameters={parameters}
              search={dynamicAlarmDefinitionSearch}
              page={dynamicAlarmDefinitionPage}
              sortKey={dynamicAlarmDefinitionSortKey}
              order={dynamicAlarmDefinitionOrder}
              searchParams={searchParams}
              setSearchParams={setSearchParams}
              tsDeclaration={tsDeclaration}
            />
          )}
        </div>
      </div>
      <TestStatusAndAlarmsDrawer
        modelId={modelId}
        parameters={parameters}
        open={showTestDrawer}
        onClose={toggleShowTestDrawer}
      />
    </Container>
  );
};

const TestStatusAndAlarmsDrawer = ({
  modelId,
  parameters,
  open,
  onClose,
}: {
  modelId: number | undefined;
  parameters: ModelParameterType[] | undefined;
  open: boolean;
  onClose: () => void;
}) => {
  useLanguageSwitcher();

  const [result, setResult] = useState<TestResultType>();
  const [menu, setMenu] = useState<Menu>(Menu.ALARM);
  const [page, setPage] = useState(1);
  const [dynamicPage, setDynamicPage] = useState(1);

  // For responsive limit
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  const limit = useVerticalLimit({
    container,
    itemHeight: ITEM_HEIGHT,
    offset: OFFSET,
  });

  const test = useTestStatusAndAlarms();

  const { control, handleSubmit, reset, watch } = useForm<TestFormType>({
    defaultValues: {
      model_id: modelId,
      values: {},
    },
    resolver: zodResolver(testFormSchema),
  });

  const resetForm = (modelId?: number, parameters?: ModelParameterType[]) => {
    if (!parameters || !modelId) {
      return;
    }

    const values = parameters.reduce((values, { alias, data_type, unit }) => {
      if (data_type === 'number') {
        values[alias] = { v: 0, q: true, unit };
      } else if (data_type === 'string') {
        values[alias] = { v: '', q: true, unit };
      } else {
        values[alias] = { v: false, q: true, unit };
      }

      return values;
    }, {} as Record<string, { v: number | string | boolean; q: boolean; unit: string | null | undefined }>);

    reset({ model_id: modelId, values });
    setResult(undefined);
    setPage(1);
    setDynamicPage(1);
  };

  useEffect(() => {
    resetForm(modelId, parameters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parameters, modelId]);

  const onSubmit = handleSubmit((form) => {
    test.mutate(form, {
      onSuccess: (data) => {
        setResult(data);
      },
    });
  });

  // Reset page when it is outside of range
  useEffect(() => {
    if (test.isPending || result?.alarms?.length == null || !limit) {
      return;
    }

    const totalPage = Math.ceil(result.alarms.length / limit);

    if (page > totalPage) {
      setPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.alarms?.length, page, limit, test.isPending]);

  useEffect(() => {
    if (test.isPending || result?.dynamic_alarms?.length == null || !limit) {
      return;
    }

    const totalPage = Math.ceil(result.dynamic_alarms.length / limit);

    if (dynamicPage > totalPage) {
      setDynamicPage(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.dynamic_alarms?.length, dynamicPage, limit, test.isPending]);

  // Create a table rows from alarms
  const alarmRows = useMemo(() => {
    if (!result?.alarms || !limit) {
      return [];
    }

    return result.alarms.slice((page - 1) * limit, page * limit).map((al) => ({
      id: al.name,
      alarm_name: (
        <span className={style['alarm-definition__preview']} title={al.name}>
          {al.name}
        </span>
      ),
      severity: (
        <IconAndText
          icon={
            al.criticality === CriticalityId.WARNING ? (
              <Warning />
            ) : (
              <CloseDownErrorCircle />
            )
          }
          text={
            al.criticality === CriticalityId.WARNING
              ? t('common.warning')
              : t('common.critical')
          }
          type={
            al.criticality === CriticalityId.WARNING ? 'idle' : 'unplanned-down'
          }
        />
      ),
      message: (
        <span
          className={style['alarm-definition__preview']}
          title={al.message || undefined}
        >
          {al.message || '---'}
        </span>
      ),
    }));
  }, [result?.alarms, page, limit]);

  // Create a table rows from dynamic alarms
  const dynamicAlarmRows = useMemo(() => {
    if (!result?.dynamic_alarms || !limit) {
      return [];
    }

    return result.dynamic_alarms
      .slice((dynamicPage - 1) * limit, dynamicPage * limit)
      .map((al) => ({
        id: al.name,
        name: (
          <span
            className={style['alarm-definition__preview']}
            title={al.name || undefined}
          >
            {al.name || '---'}
          </span>
        ),
        alarm_name: (
          <span
            className={style['alarm-definition__preview']}
            title={al.alarm_name || undefined}
          >
            {al.alarm_name || '---'}
          </span>
        ),
        severity: (
          <IconAndText
            icon={
              al.criticality === CriticalityId.WARNING ? (
                <Warning />
              ) : (
                <CloseDownErrorCircle />
              )
            }
            text={
              al.criticality === CriticalityId.WARNING
                ? t('common.warning')
                : t('common.critical')
            }
            type={
              al.criticality === CriticalityId.WARNING
                ? 'idle'
                : 'unplanned-down'
            }
          />
        ),
        message: (
          <span
            className={style['alarm-definition__preview']}
            title={al.message || undefined}
          >
            {al.message || '---'}
          </span>
        ),
      }));
  }, [result?.dynamic_alarms, dynamicPage, limit]);

  return (
    <Drawer
      icon={<Test />}
      title={t('common.test')}
      open={open}
      onClose={onClose}
      afterClose={(closedBy) => {
        if (closedBy === ClosedBy.CANCEL) {
          resetForm(modelId, parameters);
        }
      }}
      onSubmit={onSubmit}
      submitting={test.isPending}
      variant="execute"
      background={'none'}
    >
      <div className={style['test-alarm-and-status-drawer']}>
        <div className={style['test-alarm-and-status-drawer__inputs']}>
          <div
            className={style['test-alarm-and-status-drawer__inputs__header']}
          >
            <span
              className={
                style['test-alarm-and-status-drawer__inputs__header__p']
              }
            >
              {t('common.variable')}
            </span>
            <span
              className={
                style['test-alarm-and-status-drawer__inputs__header__v']
              }
            >
              {t('common.value')}
            </span>
            <span
              className={
                style['test-alarm-and-status-drawer__inputs__header__q']
              }
            >
              {t('common.quality')}
            </span>
          </div>
          <div
            className={
              style['test-alarm-and-status-drawer__inputs__parameters']
            }
          >
            {parameters
              ? parameters.map((parameter) => (
                  <ParameterValue
                    key={parameter.alias}
                    parameter={parameter}
                    control={control}
                    watch={watch}
                  />
                ))
              : null}
          </div>
        </div>
        <div className={style['test-alarm-and-status-drawer__result']}>
          <div
            className={style['test-alarm-and-status-drawer__result__status']}
          >
            <span>{t('common.status')}:</span>
            {result?.status === 1 ? (
              <IconAndText
                icon={<ClockDowntime />}
                text={t('common.running')}
                type="running"
              />
            ) : result?.status === 5 ? (
              <IconAndText
                icon={<Maintenance />}
                text={t('common.planned_down')}
                type="planned-down"
              />
            ) : result?.status === 3 ? (
              <IconAndText
                icon={<CloseDownErrorCircle />}
                text={t('common.unplanned_down')}
                type="unplanned-down"
              />
            ) : result?.status === 4 ? (
              <IconAndText icon={<WifiOff />} text={t('common.off_offline')} />
            ) : (
              '---'
            )}
          </div>
          <div className={style['status-alarm-definition']}>
            <div className={style['status-alarm-definition__tab']}>
              <div
                className={clsx(
                  style['status-alarm-definition__tab-item'],
                  menu === Menu.ALARM &&
                    style['status-alarm-definition__tab-item--selected']
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setMenu(Menu.ALARM);
                }}
              >
                <AlertAlarm
                  className={clsx(
                    style['status-alarm-definition__tab-item__icon'],
                    style['status-alarm-definition__tab-item__icon--alarm']
                  )}
                />
                <span>{t('common.alarm')}</span>
              </div>
              <div
                className={clsx(
                  style['status-alarm-definition__tab-item'],
                  menu === Menu.DYNAMIC_ALARM &&
                    style['status-alarm-definition__tab-item--selected']
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setMenu(Menu.DYNAMIC_ALARM);
                }}
              >
                <DynamicAlarm
                  className={clsx(
                    style['status-alarm-definition__tab-item__icon'],
                    style[
                      'status-alarm-definition__tab-item__icon--dynamic-alarm'
                    ]
                  )}
                />
                <span>{t('common.dynamic_alarm')}</span>
              </div>
              <div className={style['status-alarm-definition__tab-padding']} />
            </div>
            <div className={style['status-alarm-definition__body']}>
              <div
                className={
                  style['test-alarm-and-status-drawer__result__alarms']
                }
              >
                <div
                  className={
                    style['test-alarm-and-status-drawer__result__alarms__table']
                  }
                  ref={setContainer}
                >
                  <Loading isLoading={test.isPending} />
                  {menu === Menu.ALARM ? (
                    <Table
                      width="100%"
                      columns={[
                        {
                          key: 'alarm_name',
                          name: t('common.alarm_name'),
                          width: 175,
                        },
                        {
                          key: 'severity',
                          name: t('common.severity'),
                          width: 150,
                        },
                        {
                          key: 'message',
                          name: t('common.message'),
                          width: 200,
                        },
                      ]}
                      rows={alarmRows}
                    />
                  ) : (
                    <Table
                      width="100%"
                      columns={[
                        { key: 'name', name: t('common.group'), width: 100 },
                        {
                          key: 'alarm_name',
                          name: t('common.alarm'),
                          width: 100,
                        },
                        {
                          key: 'severity',
                          name: t('common.severity'),
                          width: 150,
                        },
                        {
                          key: 'message',
                          name: t('common.message'),
                          width: 150,
                        },
                      ]}
                      rows={dynamicAlarmRows}
                    />
                  )}
                </div>
                {menu === Menu.ALARM ? (
                  <Pagination2
                    count={result?.alarms.length || 0}
                    limit={limit || 1}
                    page={page}
                    onChange={setPage}
                    variant="arrow"
                  />
                ) : (
                  <Pagination2
                    count={result?.dynamic_alarms.length || 0}
                    limit={limit || 1}
                    page={dynamicPage}
                    onChange={setDynamicPage}
                    variant="arrow"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Drawer>
  );
};

const ParameterValue = ({
  parameter,
  control,
  watch,
}: {
  parameter: ModelParameterType;
  control: Control<TestFormType>;
  watch: UseFormWatch<TestFormType>;
}) => {
  const unit = watch(`values.${parameter.alias}.unit`);

  return (
    <div className={style['parameter-value']}>
      <span
        className={style['parameter-value__name']}
        title={parameter.name}
      >{`${parameter.name}:`}</span>
      <div className={style['parameter-value__value']}>
        <Controller
          name={`values.${parameter.alias}.v`}
          control={control}
          render={({ field: { value, onChange } }) =>
            parameter.data_type === 'boolean' ? (
              <Checkbox
                value={Boolean(value)}
                onChange={(_name, checked) => {
                  onChange(checked);
                }}
                wrapperStyle={{
                  flex: '0 0 0',
                }}
              />
            ) : parameter.data_type === 'number' ? (
              <NumberInput
                value={Number(value)}
                onChange={onChange}
                suffix={unit}
              />
            ) : (
              <Input
                wrapperProps={{
                  className: style['parameter-value__value__input'],
                }}
                suffix={unit}
                value={value.toString()}
                onChange={(e) => {
                  onChange(e.target.value);
                }}
                background="dark"
              />
            )
          }
        />
        {parameter.data_type === 'boolean' && unit ? (
          <span
            className={clsx(
              style['parameter-value__value__unit'],
              parameter.data_type === 'boolean' &&
                style['parameter-value__value__unit--boolean']
            )}
            title={unit}
          >
            {unit}
          </span>
        ) : null}
      </div>
      <div className={style['parameter-value__quality']}>
        <Controller
          name={`values.${parameter.alias}.q`}
          control={control}
          render={({ field: { value, onChange } }) => (
            <Checkbox
              value={value}
              onChange={(_name, checked) => {
                onChange(checked);
              }}
            />
          )}
        />
      </div>
    </div>
  );
};

const NumberInput = ({
  value,
  onChange,
  disabled,
  suffix,
}: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  suffix?: string | null;
}) => {
  const [strValue, setStrValue] = useState(value.toString());

  return (
    <Input
      wrapperProps={{
        className: style['parameter-value__value__input'],
      }}
      value={strValue}
      onChange={(e) => {
        setStrValue(e.target.value);
        if (e.target.value) {
          onChange(Number(e.target.value));
        }
      }}
      inputProps={{ step: 'any' }}
      type="number"
      suffix={suffix}
      disabled={disabled}
      background="dark"
    />
  );
};

const StatusDefinition = ({
  modelId,
  parameters,
  tsDeclaration,
}: {
  modelId: number | undefined;
  parameters: ModelParameterType[] | undefined;
  tsDeclaration?: string;
}) => {
  const { currentLanguage } = useLanguageSwitcher();

  const prj = useContext(PrjCtx);

  const [status, setStatus] = useState(Status.RUNNING);

  const [showUpsertPopup, toggleShowUpsertPopup] = useToggle(false);

  const { data, isLoading } = useModelStatus(modelId);

  const rows = useMemo(
    () => {
      const isDisabled = !modelId || isLoading;

      return [
        {
          id: 'unplanned-down',
          property: modelId ? (
            <StatusProperty
              isExtended={data?.is_extended}
              script={data?.unplanned_down_script}
            />
          ) : (
            <span className={style['status-definition__preview']}>---</span>
          ),
          status: (
            <IconAndText
              icon={<CloseDownErrorCircle />}
              text={t('common.unplanned_down')}
              type="unplanned-down"
            />
          ),
          script: (
            <span className={style['status-definition__preview']}>
              {isLoading
                ? 'Loading...'
                : !modelId
                ? '---'
                : data?.unplanned_down_script ||
                  data?.base_unplanned_down_script ||
                  '---'}
            </span>
          ),
          action: (
            <div className={style['status-definition__action-container']}>
              <div
                className={clsx(
                  style['status-definition__action'],
                  isDisabled && style['status-definition__action--disabled']
                )}
                onClick={
                  !isDisabled
                    ? (e) => {
                        e.stopPropagation();
                        setStatus(Status.UNPLANNED_DOWN);
                        toggleShowUpsertPopup();
                      }
                    : undefined
                }
              >
                <Edit1 />
              </div>
            </div>
          ),
        },
        {
          id: 'planned-down',
          property: modelId ? (
            <StatusProperty
              isExtended={data?.is_extended}
              script={data?.planned_down_script}
            />
          ) : (
            <span className={style['status-definition__preview']}>---</span>
          ),
          status: (
            <IconAndText
              icon={<Maintenance />}
              text={t('common.planned_down')}
              type="planned-down"
            />
          ),
          script: (
            <span className={style['status-definition__preview']}>
              {isLoading
                ? 'Loading...'
                : !modelId
                ? '---'
                : data?.planned_down_script ||
                  data?.base_planned_down_script ||
                  '---'}
            </span>
          ),
          action: (
            <div className={style['status-definition__action-container']}>
              <div
                className={clsx(
                  style['status-definition__action'],
                  isDisabled && style['status-definition__action--disabled']
                )}
                onClick={
                  !isDisabled
                    ? (e) => {
                        e.stopPropagation();
                        setStatus(Status.PLANNED_DOWN);
                        toggleShowUpsertPopup();
                      }
                    : undefined
                }
              >
                <Edit1 />
              </div>
            </div>
          ),
        },
        {
          id: 'running',
          property: modelId ? (
            <StatusProperty
              isExtended={data?.is_extended}
              script={data?.running_script}
            />
          ) : (
            <span className={style['status-definition__preview']}>---</span>
          ),
          status: (
            <IconAndText
              icon={<ClockDowntime />}
              text={t('common.running')}
              type="running"
            />
          ),
          script: (
            <span className={style['status-definition__preview']}>
              {isLoading
                ? 'Loading...'
                : !modelId
                ? '---'
                : data?.running_script || data?.base_running_script || '---'}
            </span>
          ),
          action: (
            <div className={style['status-definition__action-container']}>
              <div
                className={clsx(
                  style['status-definition__action'],
                  isDisabled && style['status-definition__action--disabled']
                )}
                onClick={
                  !isDisabled
                    ? (e) => {
                        e.stopPropagation();
                        setStatus(Status.RUNNING);
                        toggleShowUpsertPopup();
                      }
                    : undefined
                }
              >
                <Edit1 />
              </div>
            </div>
          ),
        },
        {
          id: 'offline',
          property: (
            <span className={style['status-definition__preview']}>---</span>
          ),
          status: (
            <IconAndText icon={<WifiOff />} text={t('common.off_offline')} />
          ),
          script: (
            <span className={style['status-definition__preview']}>---</span>
          ),
        },
      ];
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [prj, modelId, data, isLoading, currentLanguage]
  );

  return (
    <div className={style['status-definition']}>
      <Table
        width="100%"
        columns={[
          { key: 'property', name: t('common.property'), width: 120 },
          { key: 'status', name: t('common.status'), width: 150 },
          {
            key: 'script',
            name: t('common.script'),
            width: 180,
          },
          {
            key: 'action',
            name: t('common.action'),
            alignment: 'center',
            width: 70,
          },
        ]}
        rows={rows}
      />
      <SetModelStatusDefinitionPopup
        modelId={modelId}
        parameters={parameters}
        open={showUpsertPopup}
        onClose={toggleShowUpsertPopup}
        status={status}
        onChangeStatus={setStatus}
        definition={data}
        tsDeclaration={tsDeclaration}
      />
    </div>
  );
};

const SetModelStatusDefinitionPopup = ({
  modelId,
  parameters,
  open,
  onClose,
  status,
  onChangeStatus,
  definition,
  tsDeclaration,
}: {
  modelId: number | undefined;
  parameters: ModelParameterType[] | undefined;
  open: boolean;
  onClose: () => void;
  status: Status;
  onChangeStatus: (status: Status) => void;
  definition?: ModelStatusDefinitionType;
  tsDeclaration?: string;
}) => {
  // Contexts
  const { hasPermission } = useContext(AuthCtx);

  // UAC
  const hasUpdatePermission = hasPermission(
    PermissionGroupAliasEnum.enum.modelmanager,
    PermissionAliasEnum.enum.update
  );

  const unplannedDownScriptRef = useRef<ModelScriptHandler>(null);
  const plannedDownScriptRef = useRef<ModelScriptHandler>(null);
  const runningScriptRef = useRef<ModelScriptHandler>(null);

  const setStatus = useSetModelStatus();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { isDirty },
  } = useForm<SetModelStatusDefinitionFormType>({
    defaultValues: {
      model_id: undefined,
      is_extended: undefined,
      unplanned_down: {
        is_overriden: undefined,
        script: undefined,
      },
      planned_down: {
        is_overriden: undefined,
        script: undefined,
      },
      running: {
        is_overriden: undefined,
        script: undefined,
      },
    },
    resolver: zodResolver(setModelStatusDefinitionFormSchema),
  });

  const resetForm = (
    modelId?: number | undefined,
    definition?: ModelStatusDefinitionType
  ) => {
    if (!modelId || !definition) {
      return;
    }

    reset({
      model_id: modelId,
      is_extended: definition.is_extended,
      unplanned_down: {
        is_overriden:
          definition.is_extended && !!definition.unplanned_down_script,
        script:
          definition.unplanned_down_script ||
          definition.base_unplanned_down_script,
      },
      planned_down: {
        is_overriden:
          definition.is_extended && !!definition.planned_down_script,
        script:
          definition.planned_down_script || definition.base_planned_down_script,
      },
      running: {
        is_overriden: definition.is_extended && !!definition.running_script,
        script: definition.running_script || definition.base_running_script,
      },
    });
  };

  useEffect(() => {
    resetForm(modelId, definition);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelId, definition]);

  const onSubmit = handleSubmit((form) => {
    if (!hasUpdatePermission) {
      return;
    }

    if (
      (!form.is_extended || form.unplanned_down.is_overriden) &&
      !form.unplanned_down.script
    ) {
      toast.error(t('common.unplanned_down_script_must_not_empty'), {
        toastId: 'error_set_model_status',
      });
      return;
    }

    if (
      (!form.is_extended || form.planned_down.is_overriden) &&
      !form.planned_down.script
    ) {
      toast.error(t('common.planned_down_script_must_not_empty'), {
        toastId: 'error_set_model_status',
      });
      return;
    }

    if (
      (!form.is_extended || form.running.is_overriden) &&
      !form.running.script
    ) {
      toast.error(t('common.running_script_must_not_empty'), {
        toastId: 'error_set_model_status',
      });
      return;
    }

    setStatus.mutate(form, {
      onSuccess: (form) => {
        toast.success(t('common.model_status_successfully_updated'), {
          toastId: `success_set_model_status_${form.model_id}`,
        });
      },
    });
  });

  const isExtended = watch('is_extended');

  return (
    <Popup
      icon={<Code />}
      title={t('common.update_status_definition')}
      open={open}
      onClose={onClose}
      afterClose={(closedBy) => {
        if (closedBy === ClosedBy.CANCEL) {
          resetForm(modelId, definition);
        }
      }}
      onSubmit={onSubmit}
      submitting={setStatus.isPending}
      disableSubmit={!hasUpdatePermission || !isDirty}
      variant="save"
      background="none"
    >
      <div className={style['status-definition-popup']}>
        <div className={style['status-definition-popup__left']}>
          <Dropdown
            label={t('common.status') + ':'}
            options={getStatuses()}
            value={status}
            onChange={(value: string) => {
              onChangeStatus(value as Status);
            }}
            background={'dark'}
          />
          <ParameterInserter
            parameters={parameters}
            onInsert={({ alias }) => {
              if (status === Status.UNPLANNED_DOWN) {
                unplannedDownScriptRef.current?.appendText(alias);
              } else if (status === Status.PLANNED_DOWN) {
                plannedDownScriptRef.current?.appendText(alias);
              } else {
                runningScriptRef.current?.appendText(alias);
              }
            }}
          />
        </div>
        <div className={style['status-definition-popup__right']}>
          <Controller
            name="unplanned_down"
            control={control}
            render={({ field: { value, onChange } }) => {
              if (status !== Status.UNPLANNED_DOWN) {
                return <></>;
              }

              const readOnly = isExtended && !value?.is_overriden;

              return (
                <ModelScript
                  ref={unplannedDownScriptRef}
                  label={t('common.script') + ':'}
                  value={
                    (readOnly
                      ? definition?.base_unplanned_down_script
                      : value.script) || ''
                  }
                  onChange={(script) => {
                    onChange({ ...value, script });
                  }}
                  onSave={onSubmit}
                  tsDeclaration={tsDeclaration}
                  isOverride={value?.is_overriden}
                  onChangeOverride={
                    isExtended
                      ? (is_overriden) => {
                          onChange({ ...value, is_overriden });
                        }
                      : undefined
                  }
                  readOnly={readOnly}
                />
              );
            }}
          />
          <Controller
            name="planned_down"
            control={control}
            render={({ field: { value, onChange } }) => {
              if (status !== Status.PLANNED_DOWN) {
                return <></>;
              }

              const readOnly = isExtended && !value?.is_overriden;

              return (
                <ModelScript
                  ref={plannedDownScriptRef}
                  label={t('common.script') + ':'}
                  value={
                    (readOnly
                      ? definition?.base_planned_down_script
                      : value.script) || ''
                  }
                  onChange={(script) => {
                    onChange({ ...value, script });
                  }}
                  onSave={onSubmit}
                  tsDeclaration={tsDeclaration}
                  isOverride={value?.is_overriden}
                  onChangeOverride={
                    isExtended
                      ? (is_overriden) => {
                          onChange({ ...value, is_overriden });
                        }
                      : undefined
                  }
                  readOnly={readOnly}
                />
              );
            }}
          />
          <Controller
            name="running"
            control={control}
            render={({ field: { value, onChange } }) => {
              if (status !== Status.RUNNING) {
                return <></>;
              }

              const readOnly = isExtended && !value?.is_overriden;

              return (
                <ModelScript
                  ref={runningScriptRef}
                  label={t('common.script') + ':'}
                  value={
                    (readOnly
                      ? definition?.base_running_script
                      : value?.script) || ''
                  }
                  onChange={(script) => {
                    onChange({ ...value, script });
                  }}
                  onSave={onSubmit}
                  tsDeclaration={tsDeclaration}
                  isOverride={value?.is_overriden}
                  onChangeOverride={
                    isExtended
                      ? (is_overriden) => {
                          onChange({ ...value, is_overriden });
                        }
                      : undefined
                  }
                  readOnly={readOnly}
                />
              );
            }}
          />
        </div>
      </div>
    </Popup>
  );
};

const AlarmDefinition = ({
  modelId,
  parameters,
  search,
  page,
  sortKey,
  order,
  searchParams,
  setSearchParams,
  tsDeclaration,
}: {
  modelId: number | undefined;
  parameters: ModelParameterType[] | undefined;
  search: string;
  page: number;
  sortKey: string;
  order: string;
  searchParams: URLSearchParams;
  setSearchParams: SetURLSearchParams;
  tsDeclaration?: string;
}) => {
  const [open, toggle] = useToggle(false);

  return (
    <>
      <AlarmDefinitionContent
        modelId={modelId}
        parameters={parameters}
        search={search}
        page={page}
        sortKey={sortKey}
        order={order}
        searchParams={searchParams}
        setSearchParams={setSearchParams}
        tsDeclaration={tsDeclaration}
        expand={
          <Open
            className={style['alarm-definition__expand']}
            onClick={(e) => {
              e.stopPropagation();
              toggle();
            }}
          />
        }
      />
      <AlarmDefinitionExpanded
        open={open}
        onClose={toggle}
        modelId={modelId}
        parameters={parameters}
        search={search}
        page={page}
        sortKey={sortKey}
        order={order}
        searchParams={searchParams}
        setSearchParams={setSearchParams}
        tsDeclaration={tsDeclaration}
      />
    </>
  );
};

const AlarmDefinitionContent = ({
  modelId,
  parameters,
  search,
  page,
  sortKey,
  order,
  searchParams,
  setSearchParams,
  tsDeclaration,
  expand,
  isPopup,
}: {
  modelId: number | undefined;
  parameters: ModelParameterType[] | undefined;
  search: string;
  page: number;
  sortKey: string;
  order: string;
  searchParams: URLSearchParams;
  setSearchParams: SetURLSearchParams;
  tsDeclaration?: string;
  expand?: ReactNode;
  isPopup?: boolean;
}) => {
  // Contexts
  const { hasPermission } = useContext(AuthCtx);
  const { currentLanguage } = useLanguageSwitcher();

  // UAC
  const hasCreatePermission = hasPermission(
    PermissionGroupAliasEnum.enum.modelmanager,
    PermissionAliasEnum.enum.create
  );

  const hasUpdatePermission = hasPermission(
    PermissionGroupAliasEnum.enum.modelmanager,
    PermissionAliasEnum.enum.update
  );

  const hasDeletePermission = hasPermission(
    PermissionGroupAliasEnum.enum.modelmanager,
    PermissionAliasEnum.enum.delete
  );

  // For responsive limit
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  const limit = useVerticalLimit({
    container,
    itemHeight: ITEM_HEIGHT,
    offset: OFFSET,
  });

  // For bulk import alarms
  const [showBulkImport, toggleShowBulkImport] = useToggle(false);

  // For adding alarms
  const [showAddPopup, toggleShowAddPopup] = useToggle(false);

  // For updating alarms
  const [updatedAlarm, setUpdatedAlarm] = useState<ModelAlarmEntryType>();
  const [showUpdatePopup, toggleShowUpdatePopup] = useToggle(false);

  // For deleting (and disabling) alarms
  const [deletedAlarm, setDeletedAlarm] = useState<ModelAlarmEntryType>();
  const [showDeleteConfirm, toggleShowDeleteConfirm] = useToggle(false);
  const deleteAlarm = useDeleteModelAlarm();

  // For enabling alarms
  const restoreAlarm = useRestoreModelAlarm();

  // Fetched alarms
  const { data, isLoading } = useModelAlarms(modelId);

  // Filter out alarms based on search
  const filtered = useMemo(() => {
    if (!modelId || !data) {
      return undefined;
    }

    return data.filter((al) => {
      const criticalityName =
        al.criticality === CriticalityId.WARNING
          ? CriticalityName.WARNING
          : CriticalityName.CRITICAL;

      return (
        al.name.toLowerCase().includes(search.toLowerCase()) ||
        criticalityName.toLowerCase().includes(search.toLowerCase()) ||
        al.message.toLowerCase().includes(search.toLowerCase())
      );
    });
  }, [modelId, data, search]);

  const ordered = useMemo(() => {
    if (!modelId || !filtered) {
      return undefined;
    }

    const copied = [...filtered];

    let compareFn: (a: ModelAlarmEntryType, b: ModelAlarmEntryType) => number;

    if (sortKey === 'property' && order === 'desc') {
      compareFn = (a, b) => {
        const aValue = a.model_id !== modelId ? (a.script ? 2 : 1) : 0;
        const bValue = b.model_id !== modelId ? (b.script ? 2 : 1) : 0;
        return bValue - aValue;
      };
    } else if (sortKey === 'property' && order === 'asc') {
      compareFn = (a, b) => {
        const aValue = a.model_id !== modelId ? (a.script ? 2 : 1) : 0;
        const bValue = b.model_id !== modelId ? (b.script ? 2 : 1) : 0;
        return aValue - bValue;
      };
    } else if (sortKey === 'severity' && order === 'desc') {
      compareFn = (a, b) => b.criticality - a.criticality;
    } else if (sortKey === 'severity' && order === 'asc') {
      compareFn = (a, b) => a.criticality - b.criticality;
    } else if (sortKey === 'message' && order === 'desc') {
      compareFn = (a, b) => -1 * a.message.localeCompare(b.message);
    } else if (sortKey === 'message' && order === 'asc') {
      compareFn = (a, b) => a.message.localeCompare(b.message);
    } else if (sortKey === 'name' && order === 'desc') {
      compareFn = (a, b) => -1 * a.name.localeCompare(b.name);
    } else {
      compareFn = (a, b) => a.name.localeCompare(b.name);
    }

    copied.sort(compareFn);
    return copied;
  }, [modelId, filtered, sortKey, order]);

  useEffect(() => {
    if (isLoading || limit == null || filtered == null) {
      return;
    }

    const totalPage = Math.ceil(filtered.length / limit);

    if (page > totalPage) {
      setSearchParams((prev) => {
        prev.delete(`${PREFIX}page`);
        return new URLSearchParams(prev);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filtered, limit, isLoading]);

  // Apply paging
  const paged = useMemo(() => {
    if (!ordered || !limit) {
      return undefined;
    }

    return ordered.slice((page - 1) * limit, page * limit);
  }, [ordered, page, limit]);

  // Create a table rows from filtered alarms
  const rows = useMemo(() => {
    if (!paged) {
      return [];
    }

    return paged.map((al) => ({
      id: al.alarm_id.toString(),
      property: (
        <StatusProperty
          isExtended={al.model_id !== modelId}
          script={al.script}
          disabled={al.is_disabled}
        />
      ),
      name: (
        <span
          className={clsx(
            style['alarm-definition__preview'],
            al.is_disabled && style['disabled']
          )}
          title={al.name || undefined}
        >
          {al.name || '---'}
        </span>
      ),
      severity: (
        <IconAndText
          icon={
            al.criticality === CriticalityId.WARNING ? (
              <Warning />
            ) : (
              <CloseDownErrorCircle />
            )
          }
          text={
            al.criticality === CriticalityId.WARNING
              ? t('common.warning')
              : t('common.critical')
          }
          type={
            al.criticality === CriticalityId.WARNING ? 'idle' : 'unplanned-down'
          }
          disabled={al.is_disabled}
        />
      ),
      message: (
        <span
          className={clsx(
            style['alarm-definition__preview'],
            al.is_disabled && style['disabled']
          )}
          title={al.message || undefined}
        >
          {al.message || '---'}
        </span>
      ),
      action: (
        <div className={style['alarm-definition__action-container']}>
          <div
            className={style['alarm-definition__action']}
            onClick={(e) => {
              e.stopPropagation();
              setUpdatedAlarm(al);
              toggleShowUpdatePopup();
            }}
          >
            <Edit1 />
          </div>
          {al.model_id !== modelId ? (
            al.is_disabled ? (
              <div
                className={style['alarm-definition__action']}
                onClick={(e) => {
                  e.stopPropagation();

                  if (!modelId || !hasUpdatePermission) {
                    return;
                  }

                  restoreAlarm.mutate(
                    { modelId, alarmId: al.alarm_id },
                    {
                      onSuccess: () => {
                        toast.success(
                          t('common.alarm_enabled_successfully', al.name),
                          {
                            toastId: `success_enable_model_alarm_${modelId}_${al.alarm_id}`,
                          }
                        );
                      },
                    }
                  );
                }}
              >
                <ToggleSwitch checked={false} />
                {/* <ToggleOff width={24} /> */}
              </div>
            ) : (
              <div
                className={style['alarm-definition__action']}
                onClick={(e) => {
                  e.stopPropagation();

                  if (!modelId || !hasUpdatePermission) {
                    return;
                  }

                  deleteAlarm.mutate(
                    { modelId, alarmId: al.alarm_id },
                    {
                      onSuccess: () => {
                        toast.success(
                          t('common.alarm_disabled_successfully', al.name),
                          {
                            toastId: `success_disable_model_alarm_${modelId}_${al.alarm_id}`,
                          }
                        );
                      },
                    }
                  );
                }}
              >
                <ToggleSwitch checked={true} />
                {/* <ToggleOn className={style['toggle-on']} width={24} /> */}
              </div>
            )
          ) : hasDeletePermission ? (
            <div
              className={style['alarm-definition__action']}
              onClick={(e) => {
                e.stopPropagation();
                setDeletedAlarm(al);
                toggleShowDeleteConfirm();
              }}
            >
              <TrashDelete />
            </div>
          ) : null}
        </div>
      ),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    paged,
    modelId,
    hasUpdatePermission,
    hasDeletePermission,
    currentLanguage,
  ]);

  const columns: Column[] = useMemo(
    () => [
      {
        key: 'property',
        name: t('common.property'),
        width: 125,
        showOrderIcon: true,
        sortState:
          sortKey === 'property' && order === 'asc'
            ? true
            : sortKey === 'property' && order === 'desc'
            ? false
            : undefined,
      },
      {
        key: 'name',
        name: t('common.name'),
        width: 150,
        showOrderIcon: true,
        sortState:
          sortKey === 'name' && order === 'asc'
            ? true
            : sortKey === 'name' && order === 'desc'
            ? false
            : undefined,
      },
      {
        key: 'severity',
        name: t('common.severity'),
        width: 120,
        showOrderIcon: true,
        sortState:
          sortKey === 'severity' && order === 'asc'
            ? true
            : sortKey === 'severity' && order === 'desc'
            ? false
            : undefined,
      },
      {
        key: 'message',
        name: t('common.message'),
        width: 130,
        showOrderIcon: true,
        sortState:
          sortKey === 'message' && order === 'asc'
            ? true
            : sortKey === 'message' && order === 'desc'
            ? false
            : undefined,
      },
      {
        key: 'action',
        name: t('common.action'),
        alignment: 'center',
        width: 90,
      },
    ],
    [sortKey, order, currentLanguage]
  );

  return (
    <Fragment>
      <div
        className={style['alarm-definition']}
        style={isPopup ? { padding: '16px 0px', boxSizing: 'border-box' } : {}}
      >
        <div className={style['alarm-definition__header']}>
          <Search
            value={search}
            onChange={(search) => {
              setSearchParams((prev) => {
                if (search) {
                  prev.set(`${PREFIX}search`, search);
                } else {
                  prev.delete(`${PREFIX}search`);
                }
                return new URLSearchParams(prev);
              });
            }}
            placeholder={t('common.search')}
            width="100%"
            background="dark"
          />
          {hasCreatePermission ? (
            <AddBulkImport
              onAdd={toggleShowAddPopup}
              onBulkImport={toggleShowBulkImport}
              disabled={!modelId}
            />
          ) : null}
          {expand}
        </div>
        <div className={style['alarm-definition__table']} ref={setContainer}>
          <Loading isLoading={isLoading} />
          <Table
            width="100%"
            columns={columns}
            rows={rows}
            sortable
            handleSortColumn={(sortKey, isAscending) => {
              setSearchParams((prev) => {
                if (isAscending == null) {
                  prev.delete(`${PREFIX}sort_key`);
                  prev.delete(`${PREFIX}order`);
                } else {
                  prev.set(`${PREFIX}sort_key`, sortKey);
                  prev.set(`${PREFIX}order`, isAscending ? 'asc' : 'desc');
                }
                return new URLSearchParams(prev);
              });
            }}
          />
        </div>
        {!isPopup && (
          <Pagination
            searchParams={searchParams}
            setSearchParams={setSearchParams}
            count={filtered?.length || 0}
            limit={limit || 1}
            variant="arrow"
            searchParamsPrefix={PREFIX}
          />
        )}
        {hasCreatePermission ? (
          <>
            <AddModelAlarmDefinitionPopup
              modelId={modelId}
              parameters={parameters}
              open={showAddPopup}
              onClose={toggleShowAddPopup}
              tsDeclaration={tsDeclaration}
            />
            <BulkImportModelAlarmsDrawer
              modelId={modelId}
              open={showBulkImport}
              onClose={toggleShowBulkImport}
            />
          </>
        ) : null}
        <UpdateModelAlarmDefinitionPopup
          modelId={modelId}
          updated={updatedAlarm}
          parameters={parameters}
          open={showUpdatePopup}
          onClose={toggleShowUpdatePopup}
          tsDeclaration={tsDeclaration}
        />
        {hasDeletePermission ? (
          <PopupDelete
            entityType="Alarm"
            entityName={deletedAlarm?.name || '---'}
            open={showDeleteConfirm}
            onClose={toggleShowDeleteConfirm}
            onDelete={() => {
              if (!modelId || !deletedAlarm) {
                return;
              }

              deleteAlarm.mutate(
                { modelId, alarmId: deletedAlarm.alarm_id },
                {
                  onSuccess: () => {
                    toast.success(
                      t('common.alarm_successfully_deleted', deletedAlarm.name),
                      {
                        toastId: `success_delete_model_alarm_${modelId}_${deletedAlarm.alarm_id}`,
                      }
                    );
                    toggleShowDeleteConfirm();
                  },
                }
              );
            }}
            deleting={deleteAlarm.isPending}
          />
        ) : null}
      </div>
      {isPopup && (
        <div
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Pagination
            searchParams={searchParams}
            setSearchParams={setSearchParams}
            count={filtered?.length || 0}
            limit={limit || 1}
            variant="arrow"
            searchParamsPrefix={PREFIX}
          />
        </div>
      )}
    </Fragment>
  );
};

const AlarmDefinitionExpanded = ({
  open,
  onClose,
  modelId,
  parameters,
  search,
  page,
  sortKey,
  order,
  searchParams,
  setSearchParams,
  tsDeclaration,
}: {
  open: boolean;
  onClose: () => void;
  modelId: number | undefined;
  parameters: ModelParameterType[] | undefined;
  search: string;
  page: number;
  sortKey: string;
  order: string;
  searchParams: URLSearchParams;
  setSearchParams: SetURLSearchParams;
  tsDeclaration?: string;
}) => {
  return (
    <Popup
      icon={<Code />}
      title={t('common.alarm_list')}
      open={open}
      onClose={onClose}
      variant="none"
      background="none-without-padding"
    >
      <div
        className={style['alarm-definition-expanded']}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          justifyContent: 'space-between',
        }}
      >
        <AlarmDefinitionContent
          modelId={modelId}
          parameters={parameters}
          search={search}
          page={page}
          sortKey={sortKey}
          order={order}
          searchParams={searchParams}
          setSearchParams={setSearchParams}
          tsDeclaration={tsDeclaration}
          isPopup
        />
      </div>
    </Popup>
  );
};

const UpdateModelAlarmDefinitionPopup = ({
  modelId,
  updated,
  parameters,
  open,
  onClose,
  tsDeclaration,
}: {
  modelId: number | undefined;
  updated: ModelAlarmEntryType | undefined;
  parameters: ModelParameterType[] | undefined;
  open: boolean;
  onClose: () => void;
  tsDeclaration?: string;
}) => {
  // Contexts
  const { hasPermission } = useContext(AuthCtx);
  const { currentLanguage } = useLanguageSwitcher();

  // UAC
  const hasUpdatePermission = hasPermission(
    PermissionGroupAliasEnum.enum.modelmanager,
    PermissionAliasEnum.enum.update
  );

  const scriptRef = useRef<ModelScriptHandler>(null);

  const updateAlarm = useUpdateModelAlarm();

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { isDirty },
  } = useForm<UpdateModelAlarmFormType>({
    resolver: zodResolver(updateModelAlarmFormSchema),
  });

  const resetForm = (modelId?: number, updated?: ModelAlarmEntryType) => {
    if (!updated || !modelId) {
      return;
    }

    const is_extended = updated.model_id !== modelId;

    reset({
      model_id: modelId,
      alarm_id: updated.alarm_id,
      name: updated.name,
      criticality: updated.criticality,
      issue_category_id: updated.issue_category_id,
      issue_id: updated.issue_id,
      message: updated.message,
      is_extended,
      script: {
        is_overriden: is_extended && !!updated.script,
        script: updated.script || updated.base_script,
      },
    });
  };

  useEffect(() => {
    resetForm(modelId, updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelId, updated]);

  const onSubmit = handleSubmit((form) => {
    if (!hasUpdatePermission) {
      return;
    }

    if (
      (!form.is_extended || form.script.is_overriden) &&
      !form.script.script
    ) {
      toast.error(t('common.alarm_script_must_not_empty'), {
        toastId: 'error_update_model_alarm',
      });
      return;
    }

    updateAlarm.mutate(form, {
      onSuccess: (form) => {
        toast.success(t('common.alarm_successfully_updated', form.name), {
          toastId: `success_update_model_alarm_${form.model_id}_${form.alarm_id}`,
        });
        onClose();
      },
    });
  });

  const isExtended = watch('is_extended');
  const categoryId = watch('issue_category_id');

  const { data: categories, isLoading: isLoadingCategories } =
    useFeedbackCategories();

  const { data: issues, isLoading: isLoadingIssues } =
    useFeedbackIssues(categoryId);

  const categoryName = useMemo(() => {
    if (!categories || !updated || !isExtended) {
      return undefined;
    }

    return categories.find(({ id }) => id === updated.issue_category_id)?.name;
  }, [categories, updated, isExtended]);

  const issueName = useMemo(() => {
    if (!issues || !updated || !isExtended) {
      return undefined;
    }

    return issues.find(({ id }) => id === updated.issue_id)?.name;
  }, [issues, updated, isExtended]);

  const criticalityName = updated
    ? updated.criticality === CriticalityId.WARNING
      ? CriticalityName.WARNING
      : CriticalityName.CRITICAL
    : undefined;

  const criticalities = useMemo(() => {
    return getCriticalities();
  }, [currentLanguage]);

  return (
    <Popup
      icon={<Code />}
      title={t('common.update_alarm_definition')}
      open={open}
      onClose={onClose}
      afterClose={(closedBy) => {
        if (closedBy === ClosedBy.CANCEL) {
          resetForm(modelId, updated);
        }
      }}
      onSubmit={onSubmit}
      submitting={updateAlarm.isPending}
      disableSubmit={!hasUpdatePermission || !isDirty}
      variant={'save'}
      background="none"
    >
      <div className={style['alarm-definition-popup']}>
        <div className={style['alarm-definition-popup__left']}>
          <Controller
            name="name"
            control={control}
            render={({ field: { value, onChange } }) => (
              <Input
                label={t('common.alarm_name') + ':'}
                value={value || ''}
                onChange={onChange}
                inputProps={{ required: true }}
                readOnly={isExtended}
                background="dark"
              />
            )}
          />
          <Controller
            name="criticality"
            control={control}
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <div className={style['alarm-definition-popup__criticality']}>
                <div
                  className={
                    style['alarm-definition-popup__criticality__input']
                  }
                >
                  {isExtended ? (
                    <Input
                      label={t('common.criticality') + ':'}
                      value={criticalityName || '---'}
                      readOnly
                    />
                  ) : (
                    <MasterDataDropdown
                      label={t('common.criticality') + ':'}
                      entries={criticalities}
                      value={value}
                      onChange={onChange}
                      error={error?.message}
                      disableDefault
                      searchable={false}
                    />
                  )}
                </div>
              </div>
            )}
          />
          <>
            <Controller
              name="issue_category_id"
              control={control}
              render={({ field: { value, onChange }, fieldState: { error } }) =>
                isExtended ? (
                  <Input
                    label="Category:"
                    value={categoryName || '---'}
                    readOnly
                    wrapperProps={{ style: { display: 'none' } }}
                  />
                ) : (
                  <MasterDataDropdown
                    label="Category:"
                    entries={categories}
                    value={value}
                    onChange={(value) => {
                      onChange(value);
                      setValue('issue_id', -1);
                    }}
                    error={error?.message}
                    disabled={isLoadingCategories}
                    disableDefault
                    style={{ display: 'none' }}
                  />
                )
              }
            />
            <Controller
              name="issue_id"
              control={control}
              render={({ field: { value, onChange }, fieldState: { error } }) =>
                isExtended ? (
                  <Input
                    label="Issue:"
                    value={issueName || '---'}
                    readOnly
                    wrapperProps={{ style: { display: 'none' } }}
                  />
                ) : (
                  <MasterDataDropdown
                    label="Issue:"
                    entries={issues || undefined}
                    value={value}
                    onChange={onChange}
                    error={error?.message}
                    disabled={
                      issues == null ||
                      !categoryId ||
                      categoryId < 0 ||
                      isLoadingIssues
                    }
                    disableDefault={!isDirty}
                    style={{ display: 'none' }}
                  />
                )
              }
            />
          </>

          <Controller
            name="message"
            control={control}
            render={({ field: { value, onChange } }) => (
              <TextBox
                label={t('common.alarm_message') + ':'}
                value={value || ''}
                placeholder={t('common.message_to_display_alarm_occurred')}
                onChange={onChange}
                wrapperStyles={{ height: 0, flex: '1 0 0' }}
                required={true}
                readOnly={isExtended}
                background="dark"
              />
            )}
          />
        </div>
        <div className={style['alarm-definition-popup__middle']}>
          <ParameterInserter
            parameters={parameters}
            onInsert={({ alias }) => {
              scriptRef.current?.appendText(alias);
            }}
          />
        </div>
        <div className={style['alarm-definition-popup__right']}>
          <Controller
            name="script"
            control={control}
            render={({ field: { value, onChange } }) => {
              const readOnly = isExtended && !value?.is_overriden;

              return (
                <ModelScript
                  ref={scriptRef}
                  label={t('common.script') + ':'}
                  value={
                    (readOnly ? updated?.base_script : value?.script) || ''
                  }
                  onChange={(script) => {
                    onChange({ ...value, script });
                  }}
                  onSave={onSubmit}
                  tsDeclaration={tsDeclaration}
                  isOverride={value?.is_overriden}
                  onChangeOverride={
                    isExtended
                      ? (is_overriden) => {
                          onChange({ ...value, is_overriden });
                        }
                      : undefined
                  }
                  readOnly={readOnly}
                />
              );
            }}
          />
        </div>
      </div>
    </Popup>
  );
};

const AddModelAlarmDefinitionPopup = ({
  modelId,
  parameters,
  open,
  onClose,
  tsDeclaration,
}: {
  modelId: number | undefined;
  parameters: ModelParameterType[] | undefined;
  open: boolean;
  onClose: () => void;
  tsDeclaration?: string;
}) => {
  const { currentLanguage } = useLanguageSwitcher();

  const scriptRef = useRef<ModelScriptHandler>(null);

  const addAlarm = useAddModelAlarm();

  const { control, handleSubmit, reset, setValue, watch } =
    useForm<AddModelAlarmFormType>({
      defaultValues: {
        model_id: undefined,
        name: '',
        criticality: CriticalityId.WARNING,
        issue_category_id: undefined,
        issue_id: undefined,
        message: '',
        script: 'return false',
      },
      resolver: zodResolver(addModelAlarmFormSchema),
    });

  const resetForm = (modelId?: number) => {
    reset({
      model_id: modelId,
      name: '',
      criticality: CriticalityId.WARNING,
      issue_category_id: undefined,
      issue_id: undefined,
      message: '',
      script: 'return false',
    });
  };

  useEffect(() => {
    resetForm(modelId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelId]);

  const onSubmit = handleSubmit((form) => {
    addAlarm.mutate(form, {
      onSuccess: (form) => {
        toast.success(t('common.alarm_successfully_added', form.name), {
          toastId: `success_add_model_alarm_${form.model_id}_${form.alarm_id}`,
        });
        onClose();
      },
    });
  });

  const categoryId = watch('issue_category_id');

  const { data: categories, isLoading: isLoadingCategories } =
    useFeedbackCategories();

  const { data: issues, isLoading: isLoadingIssues } =
    useFeedbackIssues(categoryId);

  const criticalities = useMemo(() => {
    return getCriticalities();
  }, [currentLanguage]);

  return (
    <Popup
      icon={<Code />}
      title={t('common.add_alarm_definition')}
      open={open}
      onClose={onClose}
      afterClose={() => {
        resetForm(modelId);
      }}
      onSubmit={onSubmit}
      submitting={addAlarm.isPending}
      variant={'add'}
      background="none"
    >
      <div className={style['alarm-definition-popup']}>
        <div className={style['alarm-definition-popup__left']}>
          <Controller
            name="name"
            control={control}
            render={({ field: { value, onChange } }) => (
              <Input
                label={t('common.alarm_name') + ':'}
                value={value || ''}
                onChange={onChange}
                inputProps={{ required: true }}
                background="dark"
              />
            )}
          />
          <Controller
            name="criticality"
            control={control}
            render={({ field: { value, onChange }, fieldState: { error } }) => (
              <div className={style['alarm-definition-popup__criticality']}>
                <div
                  className={
                    style['alarm-definition-popup__criticality__input']
                  }
                >
                  <MasterDataDropdown
                    label={t('common.criticality') + ':'}
                    entries={criticalities}
                    value={value}
                    onChange={onChange}
                    error={error?.message}
                  />
                </div>
              </div>
            )}
          />
          <>
            <Controller
              name="issue_category_id"
              control={control}
              render={({
                field: { value, onChange },
                fieldState: { error },
              }) => (
                <MasterDataDropdown
                  label={t('common.category') + ':'}
                  entries={categories}
                  value={value}
                  onChange={(value) => {
                    onChange(value);
                    setValue('issue_id', -1);
                  }}
                  error={error?.message}
                  disabled={isLoadingCategories}
                  style={{ display: 'none' }}
                />
              )}
            />
            <Controller
              name="issue_id"
              control={control}
              render={({
                field: { value, onChange },
                fieldState: { error },
              }) => (
                <MasterDataDropdown
                  label={t('common.issue') + ':'}
                  entries={issues || undefined}
                  value={value}
                  onChange={onChange}
                  error={error?.message}
                  disabled={
                    issues == null ||
                    !categoryId ||
                    categoryId < 0 ||
                    isLoadingIssues
                  }
                  style={{ display: 'none' }}
                />
              )}
            />
          </>
          <Controller
            name="message"
            control={control}
            render={({ field: { value, onChange } }) => (
              <TextBox
                label={t('common.alarm_message') + ':'}
                value={value || ''}
                placeholder={t('common.message_to_display_alarm_occurred')}
                onChange={onChange}
                wrapperStyles={{ height: 0, flex: '1 0 0' }}
                required={true}
                background="dark"
              />
            )}
          />
        </div>
        <div className={style['alarm-definition-popup__middle']}>
          <ParameterInserter
            parameters={parameters}
            onInsert={({ alias }) => {
              scriptRef.current?.appendText(alias);
            }}
          />
        </div>
        <div className={style['alarm-definition-popup__right']}>
          <Controller
            name="script"
            control={control}
            render={({ field: { value, onChange } }) => (
              <ModelScript
                ref={scriptRef}
                label={t('common.script') + ':'}
                value={value}
                onChange={onChange}
                onSave={onSubmit}
                tsDeclaration={tsDeclaration}
              />
            )}
          />
        </div>
      </div>
    </Popup>
  );
};

const DynamicAlarmDefinition = ({
  modelId,
  parameters,
  search,
  page,
  sortKey,
  order,
  searchParams,
  setSearchParams,
  tsDeclaration,
}: {
  modelId: number | undefined;
  parameters: ModelParameterType[] | undefined;
  search: string;
  page: number;
  sortKey: string;
  order: string;
  searchParams: URLSearchParams;
  setSearchParams: SetURLSearchParams;
  tsDeclaration?: string;
}) => {
  const [open, toggle] = useToggle(false);

  return (
    <>
      <DynamicAlarmDefinitionContent
        modelId={modelId}
        parameters={parameters}
        search={search}
        page={page}
        sortKey={sortKey}
        order={order}
        searchParams={searchParams}
        setSearchParams={setSearchParams}
        tsDeclaration={tsDeclaration}
        expand={
          <Open
            className={style['alarm-definition__expand']}
            onClick={(e) => {
              e.stopPropagation();
              toggle();
            }}
          />
        }
      />
      <DynamicAlarmDefinitionExpanded
        open={open}
        onClose={toggle}
        modelId={modelId}
        parameters={parameters}
        search={search}
        page={page}
        sortKey={sortKey}
        order={order}
        searchParams={searchParams}
        setSearchParams={setSearchParams}
        tsDeclaration={tsDeclaration}
      />
    </>
  );
};

const DynamicAlarmDefinitionContent = ({
  modelId,
  parameters,
  search,
  page,
  sortKey,
  order,
  searchParams,
  setSearchParams,
  tsDeclaration,
  expand,
  isPopup,
}: {
  modelId: number | undefined;
  parameters: ModelParameterType[] | undefined;
  search: string;
  page: number;
  sortKey: string;
  order: string;
  searchParams: URLSearchParams;
  setSearchParams: SetURLSearchParams;
  tsDeclaration?: string;
  expand?: ReactNode;
  isPopup?: boolean;
}) => {
  // Contexts
  const { hasPermission } = useContext(AuthCtx);
  const { currentLanguage } = useLanguageSwitcher();

  // UAC
  const hasCreatePermission = hasPermission(
    PermissionGroupAliasEnum.enum.modelmanager,
    PermissionAliasEnum.enum.create
  );

  const hasUpdatePermission = hasPermission(
    PermissionGroupAliasEnum.enum.modelmanager,
    PermissionAliasEnum.enum.update
  );

  const hasDeletePermission = hasPermission(
    PermissionGroupAliasEnum.enum.modelmanager,
    PermissionAliasEnum.enum.delete
  );

  // For responsive limit
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  const limit = useVerticalLimit({
    container,
    itemHeight: 36,
    offset: OFFSET,
  });

  // For bulk import alarms
  const [showBulkImport, toggleShowBulkImport] = useToggle(false);

  // For adding alarms
  const [showAddPopup, toggleShowAddPopup] = useToggle(false);

  // For updating alarms
  const [updatedAlarm, setUpdatedAlarm] =
    useState<ModelDynamicAlarmEntryType>();
  const [showUpdatePopup, toggleShowUpdatePopup] = useToggle(false);

  // For deleting (and disabling) alarms
  const [deletedAlarm, setDeletedAlarm] =
    useState<ModelDynamicAlarmEntryType>();
  const [showDeleteConfirm, toggleShowDeleteConfirm] = useToggle(false);
  const deleteAlarm = useDeleteModelDynamicAlarm();

  // For enabling alarms
  const restoreAlarm = useRestoreModelDynamicAlarm();

  // Fetched alarms
  const { data, isLoading } = useModelDynamicAlarms(modelId);

  // Filter out alarms based on search
  const filtered = useMemo(() => {
    if (!modelId || !data) {
      return undefined;
    }

    const normalizedSearch = search.toLowerCase();

    return data.filter((al) =>
      al.name.toLowerCase().includes(normalizedSearch)
    );
  }, [modelId, data, search]);

  const ordered = useMemo(() => {
    if (!modelId || !filtered) {
      return undefined;
    }

    const copied = [...filtered];

    let compareFn: (
      a: ModelDynamicAlarmEntryType,
      b: ModelDynamicAlarmEntryType
    ) => number;

    if (sortKey === 'property' && order === 'desc') {
      compareFn = (a, b) => {
        const aValue = a.model_id !== modelId ? (a.script ? 2 : 1) : 0;
        const bValue = b.model_id !== modelId ? (b.script ? 2 : 1) : 0;
        return bValue - aValue;
      };
    } else if (sortKey === 'property' && order === 'asc') {
      compareFn = (a, b) => {
        const aValue = a.model_id !== modelId ? (a.script ? 2 : 1) : 0;
        const bValue = b.model_id !== modelId ? (b.script ? 2 : 1) : 0;
        return aValue - bValue;
      };
    } else if (sortKey === 'alarm_group' && order === 'desc') {
      compareFn = (a, b) => -1 * a.name.localeCompare(b.name);
    } else {
      compareFn = (a, b) => a.name.localeCompare(b.name);
    }

    copied.sort(compareFn);
    return copied;
  }, [modelId, filtered, sortKey, order]);

  useEffect(() => {
    if (isLoading || limit == null || filtered == null) {
      return;
    }

    const totalPage = Math.ceil(filtered.length / limit);

    if (page > totalPage) {
      setSearchParams((prev) => {
        prev.delete(`${PREFIX_DYNAMIC}page`);
        return new URLSearchParams(prev);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filtered, limit, isLoading]);

  // Apply paging
  const paged = useMemo(() => {
    if (!ordered || !limit) {
      return undefined;
    }

    return ordered.slice((page - 1) * limit, page * limit);
  }, [ordered, page, limit]);

  // Create a table rows from filtered alarms
  const rows = useMemo(() => {
    if (!paged) {
      return [];
    }

    return paged.map((al) => ({
      id: al.alarm_id.toString(),
      property: (
        <StatusProperty
          isExtended={al.model_id !== modelId}
          script={al.script}
          disabled={al.is_disabled}
        />
      ),
      alarm_group: (
        <span
          className={clsx(
            style['alarm-definition__preview'],
            al.is_disabled && style['disabled']
          )}
          title={al.name || undefined}
        >
          {al.name || '---'}
        </span>
      ),
      action: (
        <div className={style['alarm-definition__action-container']}>
          <div
            className={style['alarm-definition__action']}
            onClick={(e) => {
              e.stopPropagation();
              setUpdatedAlarm(al);
              toggleShowUpdatePopup();
            }}
          >
            <Edit1 />
          </div>
          {al.model_id !== modelId ? (
            al.is_disabled ? (
              <div
                className={style['alarm-definition__action']}
                onClick={(e) => {
                  e.stopPropagation();

                  if (!modelId || !hasUpdatePermission) {
                    return;
                  }

                  restoreAlarm.mutate(
                    { modelId, alarmId: al.alarm_id },
                    {
                      onSuccess: () => {
                        toast.success(
                          t(
                            'common.dynamic_alarm_enabled_successfully',
                            al.name
                          ),
                          {
                            toastId: `success_enable_model_dynamic_alarm_${modelId}_${al.alarm_id}`,
                          }
                        );
                      },
                    }
                  );
                }}
              >
                <ToggleSwitch checked={false} />
                {/* <ToggleOff width={24} /> */}
              </div>
            ) : (
              <div
                className={style['alarm-definition__action']}
                onClick={(e) => {
                  e.stopPropagation();

                  if (!modelId || !hasUpdatePermission) {
                    return;
                  }

                  deleteAlarm.mutate(
                    { modelId, alarmId: al.alarm_id },
                    {
                      onSuccess: () => {
                        toast.success(
                          t(
                            'common.dynamic_alarm_disabled_successfully',
                            al.name
                          ),
                          {
                            toastId: `success_disable_model_dynamic_alarm_${modelId}_${al.alarm_id}`,
                          }
                        );
                      },
                    }
                  );
                }}
              >
                <ToggleSwitch checked={true} />
                {/* <ToggleOn className={style['toggle-on']} width={24} /> */}
              </div>
            )
          ) : hasDeletePermission ? (
            <div
              className={style['alarm-definition__action']}
              onClick={(e) => {
                e.stopPropagation();
                setDeletedAlarm(al);
                toggleShowDeleteConfirm();
              }}
            >
              <TrashDelete />
            </div>
          ) : null}
        </div>
      ),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    paged,
    modelId,
    hasUpdatePermission,
    hasDeletePermission,
    currentLanguage,
  ]);

  const columns: Column[] = useMemo(
    () => [
      {
        key: 'property',
        name: t('common.property'),
        width: 125,
        showOrderIcon: true,
        sortState:
          sortKey === 'property' && order === 'asc'
            ? true
            : sortKey === 'property' && order === 'desc'
            ? false
            : undefined,
      },
      {
        key: 'alarm_group',
        name: t('common.alarm_group'),
        width: 200,
        showOrderIcon: true,
        sortState:
          sortKey === 'alarm_group' && order === 'asc'
            ? true
            : sortKey === 'alarm_group' && order === 'desc'
            ? false
            : undefined,
      },
      {
        key: 'action',
        name: t('common.action'),
        alignment: 'center',
        width: 70,
      },
    ],
    [sortKey, order, currentLanguage]
  );

  return (
    <Fragment>
      <div
        className={style['alarm-definition']}
        style={isPopup ? { padding: '16px 0px', boxSizing: 'border-box' } : {}}
      >
        <div className={style['alarm-definition__header']}>
          <Search
            value={search}
            onChange={(search) => {
              setSearchParams((prev) => {
                if (search) {
                  prev.set(`${PREFIX_DYNAMIC}search`, search);
                } else {
                  prev.delete(`${PREFIX_DYNAMIC}search`);
                }
                return new URLSearchParams(prev);
              });
            }}
            placeholder={t('common.search')}
            width="100%"
            background="dark"
          />
          {hasCreatePermission ? (
            <AddBulkImport
              onAdd={toggleShowAddPopup}
              onBulkImport={toggleShowBulkImport}
              disabled={!modelId}
            />
          ) : null}
          {expand}
        </div>
        <div className={style['alarm-definition__table']} ref={setContainer}>
          <Loading isLoading={isLoading} />
          <Table
            width="100%"
            columns={columns}
            rows={rows}
            sortable
            handleSortColumn={(sortKey, isAscending) => {
              setSearchParams((prev) => {
                if (isAscending == null) {
                  prev.delete(`${PREFIX_DYNAMIC}sort_key`);
                  prev.delete(`${PREFIX_DYNAMIC}order`);
                } else {
                  prev.set(`${PREFIX_DYNAMIC}sort_key`, sortKey);
                  prev.set(
                    `${PREFIX_DYNAMIC}order`,
                    isAscending ? 'asc' : 'desc'
                  );
                }
                return new URLSearchParams(prev);
              });
            }}
          />
        </div>
        {!isPopup && (
          <Pagination
            searchParams={searchParams}
            setSearchParams={setSearchParams}
            count={filtered?.length || 0}
            limit={limit || 1}
            variant="arrow"
            searchParamsPrefix={PREFIX_DYNAMIC}
          />
        )}
        {hasCreatePermission ? (
          <>
            <AddModelDynamicAlarmDefinitionPopup
              modelId={modelId}
              parameters={parameters}
              open={showAddPopup}
              onClose={toggleShowAddPopup}
              tsDeclaration={tsDeclaration}
            />
            <BulkImportModelDynamicAlarmsDrawer
              modelId={modelId}
              open={showBulkImport}
              onClose={toggleShowBulkImport}
            />
          </>
        ) : null}
        <UpdateModelDynamicAlarmDefinitionPopup
          modelId={modelId}
          updated={updatedAlarm}
          parameters={parameters}
          open={showUpdatePopup}
          onClose={toggleShowUpdatePopup}
          tsDeclaration={tsDeclaration}
        />
        {hasDeletePermission ? (
          <PopupDelete
            entityType={t('common.dynamic_alarm')}
            entityName={deletedAlarm?.name || '---'}
            open={showDeleteConfirm}
            onClose={toggleShowDeleteConfirm}
            onDelete={() => {
              if (!modelId || !deletedAlarm) {
                return;
              }

              deleteAlarm.mutate(
                { modelId, alarmId: deletedAlarm.alarm_id },
                {
                  onSuccess: () => {
                    toast.success(
                      t(
                        'common.dynamic_alarm_successfully_deleted',
                        deletedAlarm.name
                      ),
                      {
                        toastId: `success_delete_model_dynamic_alarm_${modelId}_${deletedAlarm.alarm_id}`,
                      }
                    );
                    toggleShowDeleteConfirm();
                  },
                }
              );
            }}
            deleting={deleteAlarm.isPending}
          />
        ) : null}
      </div>

      {isPopup && (
        <div
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Pagination
            searchParams={searchParams}
            setSearchParams={setSearchParams}
            count={filtered?.length || 0}
            limit={limit || 1}
            variant="arrow"
            searchParamsPrefix={PREFIX}
          />
        </div>
      )}
    </Fragment>
  );
};

const DynamicAlarmDefinitionExpanded = ({
  open,
  onClose,
  modelId,
  parameters,
  search,
  page,
  sortKey,
  order,
  searchParams,
  setSearchParams,
  tsDeclaration,
}: {
  open: boolean;
  onClose: () => void;
  modelId: number | undefined;
  parameters: ModelParameterType[] | undefined;
  search: string;
  page: number;
  sortKey: string;
  order: string;
  searchParams: URLSearchParams;
  setSearchParams: SetURLSearchParams;
  tsDeclaration?: string;
}) => {
  return (
    <Popup
      icon={<Code />}
      title={t('common.dynamic_alarm_list')}
      open={open}
      onClose={onClose}
      variant="none"
      background="none-without-padding"
    >
      <div
        className={style['alarm-definition-expanded']}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          justifyContent: 'space-between',
        }}
      >
        <DynamicAlarmDefinitionContent
          modelId={modelId}
          parameters={parameters}
          search={search}
          page={page}
          sortKey={sortKey}
          order={order}
          searchParams={searchParams}
          setSearchParams={setSearchParams}
          tsDeclaration={tsDeclaration}
          isPopup
        />
      </div>
    </Popup>
  );
};

const UpdateModelDynamicAlarmDefinitionPopup = ({
  modelId,
  updated,
  parameters,
  open,
  onClose,
  tsDeclaration,
}: {
  modelId: number | undefined;
  updated: ModelDynamicAlarmEntryType | undefined;
  parameters: ModelParameterType[] | undefined;
  open: boolean;
  onClose: () => void;
  tsDeclaration?: string;
}) => {
  // Contexts
  const { hasPermission } = useContext(AuthCtx);

  // UAC
  const hasUpdatePermission = hasPermission(
    PermissionGroupAliasEnum.enum.modelmanager,
    PermissionAliasEnum.enum.update
  );

  const scriptRef = useRef<ModelScriptHandler>(null);

  const updateDynamicAlarm = useUpdateModelDynamicAlarm();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { isDirty },
  } = useForm<UpdateModelDynamicAlarmFormType>({
    resolver: zodResolver(updateModelDynamicAlarmFormSchema),
  });

  const resetForm = (
    modelId?: number,
    updated?: ModelDynamicAlarmEntryType
  ) => {
    if (!updated || !modelId) {
      return;
    }

    const is_extended = updated.model_id !== modelId;

    reset({
      model_id: modelId,
      alarm_id: updated.alarm_id,
      name: updated.name,
      is_extended,
      script: {
        is_overriden: is_extended && !!updated.script,
        script: updated.script || updated.base_script,
      },
    });
  };

  useEffect(() => {
    resetForm(modelId, updated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelId, updated]);

  const onSubmit = handleSubmit((form) => {
    if (!hasUpdatePermission) {
      return;
    }

    if (
      (!form.is_extended || form.script.is_overriden) &&
      !form.script.script
    ) {
      toast.error(t('common.dynamic_alarm_script_must_not_empty'), {
        toastId: 'error_update_model_dynamic_alarm',
      });
      return;
    }

    updateDynamicAlarm.mutate(form, {
      onSuccess: (form) => {
        toast.success(
          t('common.dynamic_alarm_successfully_updated', form.name),
          {
            toastId: `success_update_model_dynamic_alarm_${form.model_id}_${form.alarm_id}`,
          }
        );
        onClose();
      },
    });
  });

  const isExtended = watch('is_extended');

  return (
    <Popup
      icon={<Code />}
      title={t('common.update_dynamic_alarm_definition')}
      open={open}
      onClose={onClose}
      afterClose={(closedBy) => {
        if (closedBy === ClosedBy.CANCEL) {
          resetForm(modelId, updated);
        }
      }}
      onSubmit={onSubmit}
      submitting={updateDynamicAlarm.isPending}
      disableSubmit={!hasUpdatePermission || !isDirty}
      variant={'save'}
      background="none"
    >
      <div className={style['alarm-definition-popup']}>
        <div className={style['alarm-definition-popup__left']}>
          <Controller
            name="name"
            control={control}
            render={({ field: { value, onChange } }) => (
              <Input
                label={t('common.alarm_group') + ':'}
                value={value || ''}
                onChange={onChange}
                inputProps={{ required: true }}
                readOnly={isExtended}
                background="dark"
              />
            )}
          />
          <ParameterInserter
            parameters={parameters}
            onInsert={({ alias }) => {
              scriptRef.current?.appendText(alias);
            }}
          />
        </div>
        <div className={style['alarm-definition-popup__right']}>
          <Controller
            name="script"
            control={control}
            render={({ field: { value, onChange } }) => {
              const readOnly = isExtended && !value?.is_overriden;

              return (
                <ModelScript
                  ref={scriptRef}
                  label={t('common.script') + ':'}
                  value={
                    (readOnly ? updated?.base_script : value?.script) || ''
                  }
                  onChange={(script) => {
                    onChange({ ...value, script });
                  }}
                  onSave={onSubmit}
                  tsDeclaration={tsDeclaration}
                  isOverride={value?.is_overriden}
                  onChangeOverride={
                    isExtended
                      ? (is_overriden) => {
                          onChange({ ...value, is_overriden });
                        }
                      : undefined
                  }
                  readOnly={readOnly}
                  type="dynamic_alarm"
                />
              );
            }}
          />
        </div>
      </div>
    </Popup>
  );
};

const AddModelDynamicAlarmDefinitionPopup = ({
  modelId,
  parameters,
  open,
  onClose,
  tsDeclaration,
}: {
  modelId: number | undefined;
  parameters: ModelParameterType[] | undefined;
  open: boolean;
  onClose: () => void;
  tsDeclaration?: string;
}) => {
  const scriptRef = useRef<ModelScriptHandler>(null);

  const addDynamicAlarm = useAddModelDynamicAlarm();

  const { control, handleSubmit, reset } =
    useForm<AddModelDynamicAlarmFormType>({
      defaultValues: {
        model_id: undefined,
        name: '',
        script: 'return false',
      },
      resolver: zodResolver(addModelDynamicAlarmFormSchema),
    });

  const resetForm = (modelId?: number) => {
    reset({
      model_id: modelId,
      name: '',
      script: 'return false',
    });
  };

  useEffect(() => {
    resetForm(modelId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelId]);

  const onSubmit = handleSubmit((form) => {
    addDynamicAlarm.mutate(form, {
      onSuccess: (form) => {
        toast.success(t('common.dynamic_alarm_successfully_added', form.name), {
          toastId: `success_add_model_dynamic_alarm_${form.model_id}_${form.alarm_id}`,
        });
        onClose();
      },
    });
  });

  return (
    <Popup
      icon={<Code />}
      title={t('common.add_dynamic_alarm_definition')}
      open={open}
      onClose={onClose}
      afterClose={() => {
        resetForm(modelId);
      }}
      onSubmit={onSubmit}
      submitting={addDynamicAlarm.isPending}
      variant={'add'}
      background="none"
    >
      <div className={style['alarm-definition-popup']}>
        <div className={style['alarm-definition-popup__left']}>
          <Controller
            name="name"
            control={control}
            render={({ field: { value, onChange } }) => (
              <Input
                label={t('common.alarm_group') + ':'}
                value={value || ''}
                onChange={onChange}
                inputProps={{ required: true }}
                background="dark"
              />
            )}
          />
          <ParameterInserter
            parameters={parameters}
            onInsert={({ alias }) => {
              scriptRef.current?.appendText(alias);
            }}
          />
        </div>
        <div className={style['alarm-definition-popup__right']}>
          <Controller
            name="script"
            control={control}
            render={({ field: { value, onChange } }) => (
              <ModelScript
                ref={scriptRef}
                label={t('common.script') + ':'}
                value={value}
                onChange={onChange}
                onSave={onSubmit}
                tsDeclaration={tsDeclaration}
                type="dynamic_alarm"
              />
            )}
          />
        </div>
      </div>
    </Popup>
  );
};

const ParameterInserter = ({
  parameters,
  onInsert,
}: {
  parameters?: ModelParameterType[];
  onInsert: (parameter: ModelParameterType) => void;
}) => {
  const [selectedParameter, setSelectedParameter] =
    useState<ModelParameterType>();

  return (
    <div className={style['parameter-inserter']}>
      <span className={style['parameter-inserter__label']}>
        {t('common.insert_variable_to_script')}:
      </span>
      <div className={style['parameter-inserter__body']}>
        <div className={style['parameter-inserter__parameters']}>
          {parameters
            ? parameters.map((parameter) => (
                <div
                  className={clsx(
                    style['parameter-inserter__parameter'],
                    selectedParameter?.alias === parameter.alias &&
                      style['parameter-inserter__parameter--selected']
                  )}
                  key={parameter.alias}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedParameter(parameter);
                  }}
                >
                  <span title={parameter.name}>{parameter.name}</span>
                </div>
              ))
            : null}
        </div>
        <div
          className={style['parameter-inserter__inserter']}
          onClick={(e) => {
            e.stopPropagation();
            if (selectedParameter) {
              onInsert(selectedParameter);
            }
          }}
        >
          <InsertParameter />
        </div>
      </div>
    </div>
  );
};

const StatusProperty = ({
  isExtended,
  script,
  disabled,
}: {
  isExtended?: boolean;
  script?: string | null;
  disabled?: boolean;
}) => {
  if (!isExtended) {
    return (
      <IconAndText
        icon={<PropertyNew />}
        text={t('common.new')}
        type="property-new"
        disabled={disabled}
      />
    );
  } else if (script) {
    return (
      <IconAndText
        icon={<PropertyOverride />}
        text={t('common.override')}
        type="property-override"
        disabled={disabled}
      />
    );
  } else {
    return (
      <IconAndText
        icon={<PropertyExtended />}
        text={t('common.extended')}
        type="property-extended"
        disabled={disabled}
      />
    );
  }
};
